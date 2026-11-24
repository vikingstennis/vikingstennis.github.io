import {seasonMatches,validateFixture} from './schedule.mjs';
import {validateMatchResult} from './match-result.mjs';
import {startUTC} from './calendar.mjs';

const headers={
 fixtures:['match_id','date','start_time','time_status','opponent','home_away','venue_name','address','location_status','status','new_date','reason','last_updated'],
 results:['match_id','team','northwest_score','opponent_score','status','approved','recap_text','recap_approved','last_updated'],
 lines:['match_id','team','line_type','line_number','set_scores','result','approved']
};
const maxBytes=512000,maxRows=300,maxCell=3000;
const dateOK=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;};
const stampOK=s=>!s||(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(s)&&Number.isFinite(Date.parse(s)));
const safe=s=>typeof s==='string'&&s.length<=maxCell&&!/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/u.test(s)&&!/^(?:[=+\-@]|javascript:|data:)/i.test(s.trim());
const small=(s,n)=>safe(s)&&s.length<=n;
const score=s=>/^\d{1,2}$/.test(s)&&Number(s)<=20;
const key=s=>/^20\d{2}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)&&s.length<=80;
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const districtIds=new Set(seasonMatches.filter(match=>match.matchType==='district').map(match=>`${match.date}-${slug(match.opponent)}`));

export function parseCSV(text){
 if(typeof text!=='string'||text.length>maxBytes||!text.trim())throw new Error('CSV unavailable');
 const rows=[];let row=[],cell='',quoted=false,afterQuote=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){
   if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;afterQuote=true;}}
   else cell+=c;
  }else if(afterQuote){
   if(c===','){row.push(cell);cell='';afterQuote=false;}
   else if(c==='\n'||c==='\r'){row.push(cell);rows.push(row);row=[];cell='';afterQuote=false;if(c==='\r'&&text[i+1]==='\n')i++;}
   else throw new Error('Malformed CSV');
  }else if(c==='"'){
   if(cell)throw new Error('Malformed CSV');
   quoted=true;
  }else if(c===','){row.push(cell);cell='';}
  else if(c==='\n'||c==='\r'){row.push(cell);rows.push(row);row=[];cell='';if(c==='\r'&&text[i+1]==='\n')i++;}
  else cell+=c;
  // Keep parsing a bounded file so one oversized cell drops only its row.
 }
 if(quoted)throw new Error('Malformed CSV');
 if(cell||row.length||afterQuote){row.push(cell);rows.push(row);}
 if(rows.length>maxRows+1)throw new Error('Too many rows');
 return rows;
}
export function csvObjects(text,kind){
 const rows=parseCSV(text),head=rows.shift()?.map((x,i)=>i===0?x.replace(/^\uFEFF/,'').trim():x.trim());
 if(!head||new Set(head).size!==head.length||!headers[kind]?.every(x=>head.includes(x)))throw new Error('Missing CSV columns');
 const out=[];
 for(const row of rows){
  if(row.length!==head.length||row.every(x=>!x))continue;
  if(row.some(x=>!safe(x.trim())))continue;
  out.push(Object.fromEntries(head.map((h,i)=>[h,row[i].trim()])));
 }
 return out;
}
function unique(rows,makeKey){
 const seen=new Map(),bad=new Set();
 for(const row of rows){const k=makeKey(row);if(bad.has(k))continue;if(seen.has(k)){seen.delete(k);bad.add(k);}else seen.set(k,row);}
 return [...seen.values()];
}
function fixture(row){
 if(!key(row.match_id)||!dateOK(row.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(row.start_time)||!small(row.opponent,80)||!row.opponent.trim()||!small(row.venue_name,100)||!row.venue_name.trim()||!small(row.address,180)||!row.address.trim()||!small(row.reason,240)||!stampOK(row.last_updated)||!['scheduled','postponed','canceled'].includes(row.status)||!['Home','Away'].includes(row.home_away)||!['tentative','confirmed'].includes(row.time_status)||!['tentative','confirmed'].includes(row.location_status)||(row.match_type&&!['district','non-district'].includes(row.match_type))||row.new_date&&!dateOK(row.new_date))return null;
 const base={matchId:row.match_id,opponent:row.opponent,venue:row.home_away,date:row.date,time:row.start_time,timeZone:'America/Chicago',timeStatus:row.time_status,locationStatus:row.location_status,matchType:row.match_type|| (districtIds.has(row.match_id)?'district':'non-district'),venueName:row.venue_name,address:row.address,status:row.status};
 if(row.new_date)base.rescheduledDate=row.new_date;
 if(row.reason)base.statusReason=row.reason;
 if(row.last_updated)base.lastModified=row.last_updated;
 try{return validateFixture({...base,team:'boys'}),startUTC(base),base;}catch{return null;}
}
function result(row,fixtureIDs){
 if(!key(row.match_id)||!fixtureIDs.has(row.match_id)||!['boys','girls'].includes(row.team)||row.status!=='final'||!score(row.northwest_score)||!score(row.opponent_score)||Number(row.northwest_score)===Number(row.opponent_score)||!['TRUE','FALSE',''].includes(row.approved)||!['TRUE','FALSE',''].includes(row.recap_approved)||!small(row.recap_text,3000)||!stampOK(row.last_updated))return null;
 return row;
}
function line(row,fixtureIDs){
 if(!key(row.match_id)||!fixtureIDs.has(row.match_id)||!['boys','girls'].includes(row.team)||!['singles','doubles'].includes(row.line_type)||!/^\d+$/.test(row.line_number)||Number(row.line_number)<1||Number(row.line_number)>(row.line_type==='singles'?6:3)||!/^\d{1,2}[-–]\d{1,2}(?:,\s*\d{1,2}[-–]\d{1,2}){1,2}$/.test(row.set_scores)||!['W','L'].includes(row.result)||!['TRUE','FALSE',''].includes(row.approved))return null;
 return row;
}
export function buildSheetMatches(csv){
 const fixtureRows=unique(csvObjects(csv.fixtures,'fixtures').map(fixture).filter(Boolean),x=>x.matchId);
 if(!fixtureRows.length)throw new Error('No valid fixtures');
 const ids=new Set(fixtureRows.map(x=>x.matchId));
 const results=unique(csvObjects(csv.results,'results').filter(x=>result(x,ids)),x=>x.match_id+'|'+x.team);
 const lines=unique(csvObjects(csv.lines,'lines').filter(x=>line(x,ids)),x=>x.match_id+'|'+x.team+'|'+x.line_type+'|'+x.line_number);
 return ['boys','girls'].flatMap(team=>fixtureRows.map(base=>{
  const m={...base,team},approvedResults={};
  for(const t of ['boys','girls']){
   const r=results.find(x=>x.match_id===m.matchId&&x.team===t&&x.approved==='TRUE');
   if(!r)continue;
   const detail={approved:true,teamScore:Number(r.northwest_score),opponentScore:Number(r.opponent_score),lines:lines.filter(x=>x.match_id===m.matchId&&x.team===t&&x.approved==='TRUE').map(x=>({type:x.line_type,number:Number(x.line_number),setScores:x.set_scores,outcome:x.result}))};
   if(r.recap_approved==='TRUE'&&r.recap_text)detail.recap=r.recap_text;
   if(r.last_updated)detail.lastUpdated=r.last_updated;
   try{validateMatchResult({...m,status:'final',result:detail});approvedResults[t]=detail;}catch{/* Drop invalid result only. */}
  }
  if(Object.keys(approvedResults).length){m.teamResults=approvedResults;m.status='final';}
  return m;
 }));
}
export function configuredURLs(urls){
 if(typeof urls?.fixtures!=='string'||!urls.fixtures.trim())return false;
 return ['fixtures','results','lines'].every(kind=>{
  const value=urls[kind];
  if(typeof value!=='string')return false;
  if(kind!=='fixtures'&&!value.trim())return true;
  try{return new URL(value).protocol==='https:';}catch{return false;}
 });
}
export async function loadSheetMatches(urls,fetcher=fetch){
 if(!configuredURLs(urls))return null;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3000);
 try{
  const entries=await Promise.all(['fixtures','results','lines'].map(async kind=>{
   if(!urls[kind].trim())return [kind,headers[kind].join(',')+'\n'];
   const response=await fetcher(urls[kind],{mode:'cors',signal:controller.signal,cache:'no-store'});
   if(!response.ok)throw new Error('CSV request failed');
   const text=await response.text();if(text.length>maxBytes)throw new Error('CSV too large');
   return [kind,text];
  }));
  return buildSheetMatches(Object.fromEntries(entries));
 }catch{return null;}finally{clearTimeout(timer);}
}
