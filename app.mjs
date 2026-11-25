import { seasonMatches, schedulesIdentical } from './schedule.mjs';
import { calendarPlatform, SEASON_FEED } from './calendar.mjs';
import { players } from './players.mjs';
import { nextMatch, sharedMatchLabel, matchDetails, tickerMarkup, escapeHTML as e, scheduleOrder } from './model.mjs';
import {nextMarkup,rowMarkup} from './match-markup.mjs';
import {initScrollEffects} from './scroll-effects.mjs';
import {initTickerMotion} from './ticker-motion.mjs';
import {initDetailsMotion} from './details-motion.mjs';
import {SHEET_CSV_URLS} from './sheet-config.mjs';
import {configuredURLs,loadSheetMatches} from './sheet-data.mjs';
import {createSheetRefresh} from './sheet-refresh.mjs';
import {SHOW_SCORES} from './approval-runtime.mjs';
const KEY='northwest-tennis-2027-v2';
const PUBLIC=true;
const defaults={matches:seasonMatches};
let data=structuredClone(defaults),rosterTeam='boys',scheduleTeam='boys';

const fmt=(date,options)=>new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',...options}).format(new Date(/^\d{4}-\d{2}-\d{2}$/.test(date)?date+'T12:00:00Z':date));

function render({updateRoster=true}={}){
 const shared=schedulesIdentical(data.matches);
 document.querySelector('#schedule-tabs').hidden=shared;
 document.querySelector('#schedule-shared-label').hidden=!shared;

 document.querySelectorAll('[data-schedule-team]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.scheduleTeam===scheduleTeam));
 document.querySelectorAll('[data-roster-team]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.rosterTeam===rosterTeam));
 const next=nextMatch(data.matches,shared?'boys':scheduleTeam);
 document.querySelector('#next-match').innerHTML=nextMarkup(next,data.matches);
 const rows=scheduleOrder(data.matches.filter(m=>m.team===(shared?'boys':scheduleTeam)));
 document.querySelector('#match-list').innerHTML=rows.map(rowMarkup).join('');
 document.querySelector('.ticker-track').innerHTML=tickerMarkup(data.matches);
 document.querySelector('.ticker-announcement').textContent=[...document.querySelectorAll('.ticker-group:first-child span')].map(item=>item.textContent).join(' · ');
 document.querySelector('#team-name').textContent=rosterTeam==='boys'?'Vikings':'Lady Vikings';
 if(updateRoster)document.querySelector('#player-list').innerHTML=players.filter(p=>p.team===rosterTeam).map(p=>`<article class="player-card reveal"><div class="player-photo"><span class="player-placeholder" aria-hidden="true">${p.initials}</span>${p.image?`<picture><source srcset="${e(p.image.replace(/\.jpg$/,'.webp'))}" type="image/webp"><img class="athlete-image" src="${e(p.image)}" width="${p.width??1200}" height="${p.height??800}" loading="lazy" alt="${e(p.name)} playing tennis" style="object-position:${e(p.focus)}"></picture>`:''}<span class="pill">${p.captain?'TEAM CAPTAIN':'VARSITY'}</span></div><div class="player-info"><div><h3>${e(p.name.toUpperCase())}</h3><p>${rosterTeam==='boys'?'BOYS TENNIS':'GIRLS TENNIS'}</p></div></div></article>`).join('');
 const appleOnly=calendarPlatform(navigator.userAgent,navigator.userAgentData?.platform??navigator.platform??'')==='google';
 document.querySelectorAll('[data-calendar-apple]').forEach(link=>link.hidden=appleOnly);
 if(updateRoster)document.querySelectorAll('.athlete-image').forEach(img=>img.addEventListener('error',()=>{img.hidden=true;},{once:true}));
 observe();
 window.dispatchEvent(new Event('northwest:layout'));
}
let observer;
function observe(){if(!observer)return;document.querySelectorAll('.reveal:not(.visible)').forEach(el=>observer.observe(el));}
if('IntersectionObserver'in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.classList.add('js-motion');observer=new IntersectionObserver(entries=>entries.forEach(x=>{if(x.isIntersecting){x.target.classList.add('visible');observer.unobserve(x.target)}}),{threshold:.08});}
document.querySelectorAll('[data-roster-team]').forEach(b=>b.addEventListener('click',()=>{rosterTeam=b.dataset.rosterTeam;render()}));
document.querySelectorAll('[data-schedule-team]').forEach(b=>b.addEventListener('click',()=>{scheduleTeam=b.dataset.scheduleTeam;render()}));
document.addEventListener('click',event=>{const button=event.target instanceof Element?event.target.closest('[data-result-team]'):null;if(!button)return;const group=button.closest('.shared-results');if(!group)return;for(const tab of group.querySelectorAll('[data-result-team]'))tab.setAttribute('aria-pressed',String(tab===button));for(const panel of group.querySelectorAll('[data-result-panel]'))panel.hidden=panel.dataset.resultPanel!==button.dataset.resultTeam;});
document.querySelector('#copy-calendar-url').addEventListener('click',async event=>{try{await navigator.clipboard.writeText(SEASON_FEED);event.currentTarget.textContent='Link copied';}catch{event.currentTarget.textContent=SEASON_FEED;}});
const menu=document.querySelector('#menu'),nav=document.querySelector('#nav');menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',open);nav.classList.toggle('open',open)});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false')}));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',event=>{if(event.target===d){const r=d.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)d.close();}}));
initTickerMotion(document.querySelector('.ticker'));
document.addEventListener('toggle',event=>{const card=event.target;if(!(card instanceof HTMLDetailsElement)||!card.classList.contains('match-card')||!card.open||matchMedia('(prefers-reduced-motion: reduce)').matches)return;for(const score of card.querySelectorAll('.score-number[data-score]')){const end=Number(score.dataset.score);if(!Number.isInteger(end))continue;score.textContent='0';const start=performance.now();function tick(now){if(!card.open)return;const fraction=Math.min(1,(now-start)/500);score.textContent=String(Math.round(end*(1-Math.pow(1-fraction,3))));if(fraction<1)requestAnimationFrame(tick)}requestAnimationFrame(tick)}},true);

render();
initScrollEffects();
initDetailsMotion();
function applySheetMatches(matches){
 if(!SHOW_SCORES)matches=matches.map(match=>{const {teamResults,result,...fixture}=match;return fixture.status==='final'?{...fixture,status:'scheduled'}:fixture;});
 const list=document.querySelector('#match-list');
 const opened=new Set([...list.querySelectorAll('.match-card[open]')].map(card=>card.dataset.matchKey));
 const selected=new Map([...list.querySelectorAll('.match-card')].map(card=>[
  card.dataset.matchKey,card.querySelector('[data-result-team][aria-pressed="true"]')?.dataset.resultTeam
 ]));
 const focused=document.activeElement?.closest('#match-list .match-card')?.dataset.matchKey;
 list.style.minHeight=`${list.getBoundingClientRect().height}px`;
 data.matches=matches;
 render({updateRoster:false});
 for(const card of list.querySelectorAll('.match-card')){
  if(opened.has(card.dataset.matchKey))card.open=true;
  const team=selected.get(card.dataset.matchKey);
  if(team)card.querySelector(`[data-result-team="${team}"]`)?.click();
  if(card.dataset.matchKey===focused)card.querySelector('summary')?.focus({preventScroll:true});
 }
 requestAnimationFrame(()=>{list.style.minHeight='';});
}
if(configuredURLs(SHEET_CSV_URLS)){
 const refresh=createSheetRefresh(data.matches,()=>loadSheetMatches(SHEET_CSV_URLS),applySheetMatches);
 const check=()=>{if(!document.hidden)void refresh.check();};
 check();
 setInterval(check,60_000);
 document.addEventListener('visibilitychange',check);
 window.addEventListener('focus',check);
 window.addEventListener('online',check);
}
