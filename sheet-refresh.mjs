// Ignore the Sheet's internal ID when comparing it with the built-in schedule.
function snapshot(matches){
 return JSON.stringify(matches,(key,value)=>{
  if(key==='matchId')return undefined;
  if(value&&typeof value==='object'&&!Array.isArray(value)){
   return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)));
  }
  return value;
 });
}

export function createSheetRefresh(initialMatches,load,apply){
 let current=snapshot(initialMatches),inFlight=null;
 function check(){
  if(inFlight)return inFlight;
  inFlight=(async()=>{
   try{
    const matches=await load();
    if(!matches)return false;
    const next=snapshot(matches);
    if(next===current)return false;
    apply(matches);
    current=next;
    return true;
   }catch{return false;}
   finally{inFlight=null;}
  })();
  return inFlight;
 }
 return {check};
}
