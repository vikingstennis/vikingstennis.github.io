export const SITE_URL='https://vikingstennis.github.io/';
export const SEASON_FEED=SITE_URL+'season-2027.ics';
export const SEASON_WEBCAL='webcal://vikingstennis.github.io/season-2027.ics';
export const GOOGLE_SUBSCRIBE_URL='https://calendar.google.com/calendar/u/0/r/settings/addbyurl';
import {seasonMatches} from './schedule.mjs';
const pad=n=>String(n).padStart(2,'0');
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export function fixtureFile(match){return `calendar/${match.team}-${match.date}-${slug(match.opponent)}.ics`;}
export function staticFixtureAvailable(match){
 const fields=['team','date','opponent','time','timeZone','timeStatus','locationStatus','venue','venueName','address','status','rescheduledDate','statusReason'];
 return seasonMatches.some(original=>fields.every(field=>(original[field]??'')===(match[field]??'')));
}
export function fixtureDownload(match){
 if(typeof document==='undefined')return staticFixtureAvailable(match)?fixtureFile(match):null;
 if(typeof document!=='undefined'&&document.documentElement.dataset.public==='true')return staticFixtureAvailable(match)?fixtureFile(match):null;
 return 'data:text/calendar;charset=utf-8,'+encodeURIComponent(calendarICS([match]));
}
export function calendarPlatform(userAgent='',platform=''){
 const value=`${platform} ${userAgent}`;
 if(/iPhone|iPad|iPod|Macintosh|MacIntel|MacPPC|Mac68K/i.test(value))return 'apple';
 if(/Android|Windows|Linux|CrOS/i.test(value))return 'google';
 return 'unknown';
}
export function directionsURL(match){return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(match.address);}
export function localStart(match){return match.date.replaceAll('-','')+'T'+match.time.replace(':','')+'00';}
export function localEnd(match){const [hour,minute]=match.time.split(':').map(Number);return match.date.replaceAll('-','')+'T'+pad(hour+2)+pad(minute)+'00';}
export function startUTC(match){
 const [y,m,d]=match.date.split('-').map(Number),[h,min]=match.time.split(':').map(Number);
 if(match.timeZone!=='America/Chicago')throw new Error('Unsupported time zone');
 const formatter=new Intl.DateTimeFormat('en-US',{timeZone:match.timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const requested=`${y}-${pad(m)}-${pad(d)} ${pad(h)}:${pad(min)}`;
 const candidates=[-5,-6].map(offset=>new Date(Date.UTC(y,m-1,d,h,min)-offset*3_600_000)).filter(candidate=>{
  const p=Object.fromEntries(formatter.formatToParts(candidate).map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`===requested;
 });
 if(!candidates.length)throw new Error('Nonexistent Chicago local time');
 // In the fall overlap, use the first (daylight) occurrence consistently.
 return candidates[0];
}
export function eventTitle(match){return `Northwest Tennis ${match.venue==='Away'?'at':'vs.'} ${match.opponent}${match.timeStatus==='tentative'||match.locationStatus==='tentative'?' (tentative)':''}`;}
export function applyCalendarRevisions(matches,previous={},stamp=new Date()){
 const revisions={};
 const updated=matches.map(match=>{
  const key=`${match.team}|${match.date}|${match.opponent}`;
  const signature=JSON.stringify([match.time,match.timeZone,match.timeStatus,match.locationStatus,match.venue,match.venueName,match.address,match.status]);
  const old=previous[key];
  const sequence=old&&old.signature!==signature?old.sequence+1:old?.sequence??0;
  const lastModified=old&&old.signature===signature?old.lastModified:stamp.toISOString();
  revisions[key]={signature,sequence,lastModified};
  return {...match,sequence,lastModified};
 });
 return {matches:updated,revisions};
}
export function googleCalendarURL(match){
 const query=new URLSearchParams({action:'TEMPLATE',text:eventTitle(match),dates:`${localStart(match)}/${localEnd(match)}`,ctz:match.timeZone,details:`Time and location tentative until confirmed. Latest schedule: ${SITE_URL}#schedule`,location:`${match.venueName}, ${match.address}`});
 return 'https://calendar.google.com/calendar/render?'+query.toString();
}
const esc=s=>String(s).replace(/\r\n|\r|\n/g,' ').replace(/\\/g,'\\\\').replace(/,/g,'\\,').replace(/;/g,'\\;');
const fold=s=>{const bytes=new TextEncoder();let lines=[''];for(const char of s){const last=lines.length-1;if(bytes.encode(lines[last]+char).length>75){const space=lines[last].endsWith(' ')?' ':'';if(space)lines[last]=lines[last].slice(0,-1);lines.push(' '+space+char);}else lines[last]+=char;}return lines.join('\r\n');};
const zone=['BEGIN:VTIMEZONE','TZID:America/Chicago','BEGIN:DAYLIGHT','DTSTART:19700308T020000','RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU','TZOFFSETFROM:-0600','TZOFFSETTO:-0500','TZNAME:CDT','END:DAYLIGHT','BEGIN:STANDARD','DTSTART:19701101T020000','RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU','TZOFFSETFROM:-0500','TZOFFSETTO:-0600','TZNAME:CST','END:STANDARD','END:VTIMEZONE'];
export function calendarICS(matches,stamp=new Date()){
 const dtstamp=stamp.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Northwest Tennis//Schedule 2027//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH',...zone];
 for(const match of matches){const id=slug(`${match.team}-${match.date}-${match.opponent}`);const modified=(match.lastModified?new Date(match.lastModified):stamp).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');lines.push('BEGIN:VEVENT',`UID:${id}@vikingstennis.github.io`,`DTSTAMP:${dtstamp}`,`LAST-MODIFIED:${modified}`,`SEQUENCE:${match.sequence??0}`,`DTSTART;TZID=America/Chicago:${localStart(match)}`,`DTEND;TZID=America/Chicago:${localEnd(match)}`,`SUMMARY:${esc(eventTitle(match))}`,`LOCATION:${esc(`${match.venueName}, ${match.address}`)}`,`DESCRIPTION:${esc(`Time and location tentative until confirmed. Latest schedule: ${SITE_URL}#schedule`)}`,`STATUS:${match.timeStatus==='confirmed'&&match.locationStatus==='confirmed'?'CONFIRMED':'TENTATIVE'}`,'END:VEVENT');}
 lines.push('END:VCALENDAR');return lines.map(fold).join('\r\n')+'\r\n';
}
