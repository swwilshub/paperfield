// Firebase store adapter: anonymous Auth + Firestore, same interface as local.js (see store.js).
//
//   pilots/{uid}  {score, planes, last, lastPlane, pbDist, pbTime}
//   planes/{id}   the plane doc (see release.js) plus uid; `at` is a server timestamp
//
// The SDK comes from the gstatic CDN at a pinned version. Tests pass the npm SDK in `sdk` instead.
import {pilotName} from './pilots.js';

export const SDK_VERSION='12.19.0';
const CDN=`https://www.gstatic.com/firebasejs/${SDK_VERSION}/`;
const PLANES_LIMIT=500,CONNECT_TIMEOUT=12e3,SAVE_TIMEOUT=12e3;

const withTimeout=(p,ms,what)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(Object.assign(new Error(what+' timed out'),{code:'timeout'})),ms))]);
const millis=v=>v&&typeof v.toMillis==='function'?v.toMillis():(typeof v==='number'?v:Date.now());

// Firestore can't store arrays inside arrays, so `throws` ([[dist,time],…]) travels as maps.
export function toFirestore(doc){const d=Object.assign({},doc);d.throws=(doc.throws||[]).map(([dist,time])=>({dist,time}));return d;}
export function fromFirestore(id,data){const p=Object.assign({},data,{id,pid:data.uid});p.at=millis(data.at);p.throws=(data.throws||[]).map(t=>[t.dist,t.time]);return p;}

async function loadSdk(){const [app,auth,fs]=await Promise.all(['firebase-app.js','firebase-auth.js','firebase-firestore.js'].map(f=>import(CDN+f)));return{app,auth,fs};}

export function createFirebaseStore(config,opts){opts=opts||{};
  let F,db,uid=null,mine=null;const planeSubs=new Set(),pilotSubs=new Set();
  const emitPilots=()=>{const all={};if(mine)all[uid]=mine;for(const cb of pilotSubs)cb({pilots:all});};
  const err=(e)=>{const c=e&&e.code||'';const out=new Error(e&&e.message||String(e));
    out.code=c==='permission-denied'?'permission_denied':c==='resource-exhausted'?'quota_exceeded':c||'error';return out;};

  return{
    // One overall deadline, so a blocked or misconfigured backend falls back to local play quickly.
    connect(){return withTimeout(this._connect(),CONNECT_TIMEOUT,'Connecting to Firebase');},
    async _connect(){
      F=opts.sdk||await loadSdk();
      const app=F.app.initializeApp(config,opts.appName);
      // initializeAuth without a popup/redirect resolver: anonymous sign-in only, so the browser
      // doesn't load Firebase's auth helper iframe (and its extra requests). Tests use getAuth.
      const auth=opts.sdk?F.auth.getAuth(app):F.auth.initializeAuth(app,{persistence:[F.auth.indexedDBLocalPersistence,F.auth.browserLocalPersistence]});
      if(opts.authEmulator)F.auth.connectAuthEmulator(auth,opts.authEmulator,{disableWarnings:true});
      // Keep a local copy so return visits only fetch what changed; fall back to memory if IndexedDB is unavailable.
      try{db=F.fs.initializeFirestore(app,opts.firestoreEmulator?{}:{localCache:F.fs.persistentLocalCache({tabManager:F.fs.persistentMultipleTabManager()})});}
      catch(e){db=F.fs.getFirestore(app);}
      if(opts.firestoreEmulator)F.fs.connectFirestoreEmulator(db,opts.firestoreEmulator.host,opts.firestoreEmulator.port);
      // Wait for a saved session to be restored first, so a returning pilot keeps their identity.
      await auth.authStateReady();
      const user=auth.currentUser||(await F.auth.signInAnonymously(auth)).user;
      uid=user.uid;
      // Our own pilot doc, which may not be in the top-50 leaderboard query.
      F.fs.onSnapshot(F.fs.doc(db,'pilots',uid),s=>{mine=s.exists()?Object.assign({},s.data({serverTimestamps:'estimate'}),{last:millis(s.data({serverTimestamps:'estimate'}).last)}):null;emitPilots();},()=>{});
      return{uid,mode:'firebase',canWrite:true,limit:true};},
    me(){return mine;},
    // Reads are what the free tier runs out of, so only your own pilot doc is read. The leaderboard is
    // worked out from the planes already loaded (ui/board.js), not from a pilots query.
    onPilots(cb){pilotSubs.add(cb);emitPilots();return()=>pilotSubs.delete(cb);},
    // The field: first whatever this browser already has (Firestore's cache, no reads), then from the server
    // only planes newer than the newest cached one, live from then on. A first visit reads the newest 500;
    // a return visit reads just what was thrown since. (A plain listener re-reads all 500 after 30 minutes away.)
    // Everything counts as `initial` until the first snapshot from the server.
    onPlanes(cb){planeSubs.add(cb);let un=()=>{},stopped=false;const col=F.fs.collection(db,'planes');
      const toPlane=d=>fromFirestore(d.id,d.data({serverTimestamps:'estimate'}));
      (async()=>{let newest=null;
        try{const s=await F.fs.getDocsFromCache(F.fs.query(col,F.fs.orderBy('at','desc'),F.fs.limit(PLANES_LIMIT)));
          if(!s.empty){newest=s.docs[0].data({serverTimestamps:'estimate'}).at;cb({added:s.docs.map(toPlane).reverse(),initial:true});}}catch(e){}
        if(stopped)return;
        const q=newest?F.fs.query(col,F.fs.where('at','>',newest),F.fs.orderBy('at','desc'),F.fs.limit(PLANES_LIMIT)):F.fs.query(col,F.fs.orderBy('at','desc'),F.fs.limit(PLANES_LIMIT));
        let synced=false;
        un=F.fs.onSnapshot(q,snap=>{const added=[];
            for(const ch of snap.docChanges())if(ch.type==='added')added.push(toPlane(ch.doc));
            added.reverse();cb({added,initial:!synced});if(!snap.metadata.fromCache)synced=true;},
          e=>console.warn('Planes feed stopped:',e.code||e.message));})();
      return()=>{stopped=true;planeSubs.delete(cb);un();};},
    // Plane and pilot doc in one batch, so the rules can check them against each other.
    async savePlane(id,doc,pilot){const b=F.fs.writeBatch(db);const now=F.fs.serverTimestamp();
      b.set(F.fs.doc(db,'planes',id),Object.assign(toFirestore(doc),{uid,at:now}));
      b.set(F.fs.doc(db,'pilots',uid),{score:pilot.score,planes:pilot.planes,last:now,lastPlane:id,pbDist:pilot.pbDist,pbTime:pilot.pbTime});
      try{await withTimeout(b.commit(),SAVE_TIMEOUT,'Saving');}
      catch(e){if(e.code==='timeout')return;throw err(e);}},   // offline: the SDK keeps it and syncs later
    // One plane by id, for shared links to planes older than the newest 500.
    async getPlane(id){const s=await F.fs.getDoc(F.fs.doc(db,'planes',id));return s.exists()?fromFirestore(id,s.data({serverTimestamps:'estimate'})):null;},
    nameOf(id){return pilotName(id);},
    uid:()=>uid,
  };
}
