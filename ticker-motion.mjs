export function initTickerMotion(ticker){
 if(!ticker)return;
 ticker.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')ticker.classList.add('is-held')});
 for(const type of ['pointerup','pointercancel','pointerleave'])ticker.addEventListener(type,()=>ticker.classList.remove('is-held'));
}
