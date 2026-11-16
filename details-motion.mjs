// Native details remain usable without JavaScript. When WAAPI is available,
// keep content mounted through exit motion and cancel/reverse an in-flight toggle.
const states=new WeakMap();
const enter={duration:210,easing:'cubic-bezier(0.22,1,0.36,1)'};
const exit={duration:150,easing:'cubic-bezier(0.4,0,0.2,1)'};
const supportsMotion=()=>typeof Element.prototype.animate==='function';
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const stateFor=details=>{let state=states.get(details);if(!state){state={targetOpen:details.open,animation:null};states.set(details,state);}return state;};

function finishInstant(details,want){
 const state=stateFor(details);state.animation?.cancel();state.animation=null;state.targetOpen=want;
 details.classList.add('js-disclosure');details.classList.toggle('is-expanded',want);details.open=want;
 const content=details.classList.contains('match-card')?details.querySelector(':scope > .match-panel'):details.querySelector(':scope > .calendar-options');
 for(const property of ['height','opacity','overflow','visibility','pointer-events','transform'])content?.style.removeProperty(property);
}

function animateCard(details,want){
 const state=stateFor(details),panel=details.querySelector(':scope > .match-panel');
 const from=details.open?panel.getBoundingClientRect().height:0;
 const fromOpacity=details.open?Number(getComputedStyle(panel).opacity):0;
 state.animation?.cancel();state.animation=null;
 details.classList.add('js-disclosure');details.open=true;
 panel.style.height='auto';const full=panel.scrollHeight;
 panel.style.height=`${from}px`;panel.style.opacity=String(fromOpacity);panel.style.overflow='hidden';
 details.classList.toggle('is-expanded',want);state.targetOpen=want;
 if(reduced()){finishInstant(details,want);return;}
 const animation=panel.animate([{height:`${from}px`,opacity:fromOpacity},{height:`${want?full:0}px`,opacity:want?1:0}],{...(want?enter:exit),fill:'forwards'});
 state.animation=animation;
 animation.onfinish=()=>{if(state.animation!==animation)return;state.animation=null;if(!want)details.open=false;for(const property of ['height','opacity','overflow'])panel.style.removeProperty(property);};
}

function animateMenu(details,want){
 const state=stateFor(details),menu=details.querySelector(':scope > .calendar-options');
 const fromOpacity=details.open?Number(getComputedStyle(menu).opacity):0;
 const fromTransform=details.open?getComputedStyle(menu).transform:'translateY(-4px) scale(0.96)';
 state.animation?.cancel();state.animation=null;
 details.classList.add('js-disclosure');details.open=true;
 details.classList.toggle('is-expanded',want);state.targetOpen=want;
 menu.style.visibility='visible';menu.style.pointerEvents=want?'auto':'none';
 if(reduced()){finishInstant(details,want);return;}
 const animation=menu.animate([{opacity:fromOpacity,transform:fromTransform},{opacity:want?1:0,transform:want?'none':'translateY(-4px) scale(0.96)'}],{...(want?enter:exit),fill:'forwards'});
 state.animation=animation;
 animation.onfinish=()=>{if(state.animation!==animation)return;state.animation=null;if(!want)details.open=false;for(const property of ['visibility','pointer-events','opacity','transform'])menu.style.removeProperty(property);};
}

function setExpanded(details,want){
 if(!supportsMotion()){details.open=want;return;}
 const state=stateFor(details);
 if(state.targetOpen===want&&(state.animation||details.open===want))return;
 if(details.classList.contains('match-card')){
  if(!want)for(const menu of details.querySelectorAll('.calendar-disclosure[open]'))setExpanded(menu,false);
  animateCard(details,want);
 }else animateMenu(details,want);
}

export function initDetailsMotion(){
 document.addEventListener('click',event=>{
  const summary=event.target instanceof Element?event.target.closest('summary'):null;
  const details=summary?.parentElement;
  const valid=details instanceof HTMLDetailsElement&&summary===details.querySelector(':scope > summary')&&(details.classList.contains('match-card')||details.classList.contains('calendar-disclosure'));
  if(valid){
   if(details.classList.contains('calendar-disclosure'))for(const other of document.querySelectorAll('.calendar-disclosure[open]'))if(other!==details)setExpanded(other,false);
   if(supportsMotion()){event.preventDefault();const state=stateFor(details);setExpanded(details,!state.targetOpen);}
  }
  for(const menu of document.querySelectorAll('.calendar-disclosure[open]'))if(!menu.contains(event.target))setExpanded(menu,false);
 });
 document.addEventListener('toggle',event=>{
  const opened=event.target;
  if(!(opened instanceof HTMLDetailsElement)||!opened.classList.contains('calendar-disclosure')||!opened.open)return;
  for(const other of document.querySelectorAll('.calendar-disclosure[open]'))if(other!==opened)setExpanded(other,false);
 },true);
 document.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  const menu=[...document.querySelectorAll('.calendar-disclosure[open]')].at(-1);
  if(!menu)return;
  setExpanded(menu,false);menu.querySelector(':scope > summary').focus();event.stopPropagation();
 });
}
