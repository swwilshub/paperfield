// Store adapter interface. Every backend (local.js now, firebase.js in M2) implements:
//
//   connect()            -> Promise<{uid, mode, canWrite, limit}>
//                           mode: 'local' | 'firebase'; canWrite false = read-only viewer;
//                           limit false = no hourly cooldown (local dev only).
//   me()                 -> the signed-in pilot doc {score, planes, last, pbDist, pbTime} or null
//   onPilots(cb)         -> unsubscribe fn. cb({pilots: {uid: pilotDoc}}) with the full current map.
//   onPlanes(cb)         -> unsubscribe fn. cb({added: [plane], initial: bool}).
//                           Each plane is the prototype's plane doc plus {id, pid}. `initial` is true
//                           for the first delivery, false for planes that arrive live afterwards.
//   savePlane(id, doc, pilot) -> Promise<void>. Writes the plane and the updated pilot doc together.
//                           Rejects with an Error whose `code` is one of
//                           'quota_exceeded' | 'permission_denied' | 'cooldown' | other.
//   nameOf(uid)          -> display name string, or '' if unknown.
//
// The UI only talks to this interface. When no backend is reachable it falls back to local play.

import {createLocalStore} from './local.js';

export async function openStore(){
  try{
    const {firebaseConfig}=await import('./firebase-config.js');
    if(firebaseConfig){const {createFirebaseStore}=await import('./firebase.js');const s=createFirebaseStore(firebaseConfig);const info=await s.connect();return{store:s,info};}
  }catch(e){console.warn('Shared field unavailable, playing locally.',e&&e.message);}
  const s=createLocalStore();const info=await s.connect();return{store:s,info};
}
