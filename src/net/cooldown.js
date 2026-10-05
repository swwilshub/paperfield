// How long a pilot waits between planes. A quiet field allows one a minute; the wait only grows
// once the field gets busy, and stretches towards an hour when it's packed.
//
//   pilots   = distinct pilots who threw in the last hour (including you)
//   airborne = planes thrown in the last 10 minutes (still "in the air" for the field)
//   load     = pilots + airborne / 2
//   wait     = (load − 2) minutes, clamped to 1..60 min
//
// e.g. 1–3 pilots: 1–2 min; 10 pilots and 8 fresh planes: 12 min; 40 pilots: ~45 min.
// It's recomputed every time it's checked, so the wait shrinks again when the field goes quiet.
// The Firestore rules enforce a 50-second floor (rules can't count documents; the slack covers clock skew).
export const MIN_WAIT=60e3,MAX_WAIT=60*60e3,PER_LOAD=60e3,FREE_LOAD=2;
export const ACTIVE_WINDOW=60*60e3,AIR_WINDOW=10*60e3;

export function fieldActivity(planes,now){const pilots=new Set();let airborne=0;
  for(const p of planes){const age=now-p.at;if(!(age>=0&&age<ACTIVE_WINDOW))continue;pilots.add(p.pid||p.uid);if(age<AIR_WINDOW)airborne++;}
  return{pilots:pilots.size,airborne};}

export function waitMs(activity){const load=activity.pilots+activity.airborne/2;
  return Math.max(MIN_WAIT,Math.min(MAX_WAIT,Math.round(load-FREE_LOAD)*PER_LOAD));}

// Milliseconds until this pilot may throw again (0 = now).
export function cooldownLeft(lastAt,planes,now){if(!lastAt)return 0;return Math.max(0,lastAt+waitMs(fieldActivity(planes,now))-now);}
