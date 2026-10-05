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

// Local development only: `?emulator` on localhost uses the Firebase emulators (npm run emulators).
function emulatorSetup(){const local=/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if(!local||!new URLSearchParams(location.search).has('emulator'))return null;
  return{config:{apiKey:'demo-key',authDomain:'demo-one-sheet.firebaseapp.com',projectId:'demo-one-sheet',appId:'1:1:web:1'},
    opts:{authEmulator:'http://127.0.0.1:9099',firestoreEmulator:{host:'127.0.0.1',port:8085}}};}

export async function openStore(){
  // `?local` skips the backend entirely (tests, or offline play by choice).
  if(new URLSearchParams(location.search).has('local')){const s=createLocalStore();return{store:s,info:await s.connect()};}
  try{
    const emu=emulatorSetup();
    const {firebaseConfig}=emu?{firebaseConfig:emu.config}:await import('./firebase-config.js');
    if(firebaseConfig){const {createFirebaseStore}=await import('./firebase.js');const s=createFirebaseStore(firebaseConfig,emu?emu.opts:{});const info=await s.connect();return{store:s,info};}
  }catch(e){console.warn('Shared field unavailable, playing locally.',e&&e.message);}
  const s=createLocalStore();const info=await s.connect();return{store:s,info};
}
