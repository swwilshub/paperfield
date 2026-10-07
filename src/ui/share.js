// ===== share: a link to a plane on the ground, and a photo of it =====
// A link only names the plane (?plane=<id>); opening it flies the camera to where that plane landed.
// Nothing about the design travels in the link, and the photo is the plane as it lies in the field.
import {app,net,planeLabel} from './state.js';
import {pilotName} from '../net/pilots.js';

const ID=/^[A-Za-z0-9_-]{1,64}$/;
// The plane id a shared link points at, if any.
export function linkedPlane(){const id=new URLSearchParams(location.search).get('plane');return id&&ID.test(id)?id:null;}
// Keeps ?local / ?emulator so links work in the same mode they were made in.
export function planeUrl(id){const u=new URL(location.pathname,location.origin),q=new URLSearchParams(location.search);
  for(const k of ['local','emulator'])if(q.has(k))u.searchParams.set(k,'');u.searchParams.set('plane',id);return u.href.replace(/=(?=&|$)/g,'');}
function blurb(p){return `${planeLabel(p)} flew ${p.dist.toFixed(1)} m in Paperfield.`;}

const aborted=e=>e&&e.name==='AbortError';

export async function sharePlane(p){const url=planeUrl(p.id);
  if(navigator.share)try{await navigator.share({title:'Paperfield',text:blurb(p),url});return 'shared';}catch(e){if(aborted(e))return 'cancelled';}
  try{await navigator.clipboard.writeText(url);return 'copied';}
  catch(e){prompt('Copy this link',url);return 'shown';}}

// The field frame plus a caption band: plane, distance, pilot (by generated name, never "You": the photo is for others).
export function photo(p){const shot=app.world.snapshot&&app.world.snapshot(p.id);if(!shot)return null;
  const w=shot.width,h=shot.height,x=shot.getContext('2d'),u=Math.max(1,w/400),band=64*u;
  const g=x.createLinearGradient(0,h-band*1.6,0,h);g.addColorStop(0,'rgba(21,36,58,0)');g.addColorStop(0.45,'rgba(21,36,58,.72)');g.addColorStop(1,'rgba(21,36,58,.85)');
  x.fillStyle=g;x.fillRect(0,h-band*1.6,w,band*1.6);x.fillStyle='#fff';x.textBaseline='alphabetic';
  x.font=`800 ${20*u}px Archivo, sans-serif`;x.fillText(`${planeLabel(p)} · ${p.dist.toFixed(1)} m`,14*u,h-band+22*u);
  x.font=`500 ${13*u}px Archivo, sans-serif`;x.fillText(`by ${(net.store&&net.store.nameOf(p.pid))||pilotName(p.pid)||'a pilot'} · ${p.time.toFixed(1)} s in the air`,14*u,h-band+42*u);
  x.textAlign='right';x.font=`800 ${13*u}px Archivo, sans-serif`;x.fillText('Paperfield',w-14*u,h-band+42*u);x.textAlign='left';
  return shot;}

export async function sharePhoto(p){const c=photo(p);if(!c)return 'none';
  const blob=await new Promise(r=>c.toBlob(r,'image/png'));const name=`paperfield-${planeLabel(p).toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png`;
  const file=new File([blob],name,{type:'image/png'});
  if(navigator.canShare&&navigator.canShare({files:[file]}))try{await navigator.share({files:[file],title:'Paperfield',text:blurb(p)+' '+planeUrl(p.id)});return 'shared';}catch(e){if(aborted(e))return 'cancelled';}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),10e3);return 'saved';}

// Wire a button to an action; it says what happened for a moment ("Link copied", "Photo saved").
const SAID={copied:'Link copied',saved:'Photo saved',none:'No 3D view'};
export function shareButton(btn,action){const label=btn.textContent;btn.onclick=async()=>{app.audio&&app.audio.unlock();btn.disabled=true;
  let r;try{r=await action();}catch(e){r=null;}btn.disabled=false;if(SAID[r]){btn.textContent=SAID[r];setTimeout(()=>{btn.textContent=label;},2200);}};}
