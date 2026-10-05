// How long a pilot waits between planes. It scales with how busy the field is, so a quiet field
// lets the few people there keep throwing, and a busy one slows everyone to about one an hour.
//
//   pilots   = distinct pilots who threw in the last hour (including you)
//   airborne = planes thrown in the last 10 minutes (still "in the air" for the field)
//   wait     = 3 min × (pilots + airborne / 2), clamped to 2..60 min
//
// e.g. alone: ~5 min; 5 pilots: ~17 min; 10 pilots and 8 fresh planes: ~42 min; 20 pilots: 60 min.
// It's recomputed every time it's checked, so the wait shrinks again when the field goes quiet.
// The Firestore rules enforce the 2-minute floor (rules can't count documents).
export const MIN_WAIT=2*60e3,MAX_WAIT=60*60e3,PER_LOAD=3*60e3;
export const ACTIVE_WINDOW=60*60e3,AIR_WINDOW=10*60e3;

export function fieldActivity(planes,now){const pilots=new Set();let airborne=0;
  for(const p of planes){const age=now-p.at;if(!(age>=0&&age<ACTIVE_WINDOW))continue;pilots.add(p.pid||p.uid);if(age<AIR_WINDOW)airborne++;}
  return{pilots:pilots.size,airborne};}

export function waitMs(activity){const load=activity.pilots+activity.airborne/2;
  return Math.max(MIN_WAIT,Math.min(MAX_WAIT,Math.round(load*PER_LOAD/60e3)*60e3));}

// Milliseconds until this pilot may throw again (0 = now).
export function cooldownLeft(lastAt,planes,now){if(!lastAt)return 0;return Math.max(0,lastAt+waitMs(fieldActivity(planes,now))-now);}
