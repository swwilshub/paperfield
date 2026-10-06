// Music theory for the procedural soundtrack: keys, lo-fi chord progressions, scales.
// Pure and seeded, so the same seed gives the same song everywhere (and it runs in Node tests).
import {mulberry,hashStr} from '../core/thrower.js';

// Chord shapes (semitones above the chord root). Lots of 7ths and 9ths for a soft, jazzy colour.
export const SHAPES={maj7:[0,4,7,11],maj9:[0,4,7,11,14],m7:[0,3,7,10],m9:[0,3,7,10,14],dom9:[0,4,7,10,14],sus9:[0,5,7,10,14],add9:[0,4,7,14]};
// Progressions as [scale-degree semitones from the key, shape], one chord per bar.
export const PROGS=[
  [[0,'maj9'],[9,'m9'],[2,'m9'],[7,'sus9']],    // I  vi ii V
  [[2,'m9'],[7,'dom9'],[0,'maj9'],[0,'maj7']],   // ii V I I
  [[5,'maj9'],[4,'m7'],[2,'m9'],[0,'add9']],     // IV iii ii I
  [[0,'maj7'],[5,'maj9'],[9,'m7'],[7,'sus9']],   // I IV vi V
  [[9,'m9'],[5,'maj7'],[0,'add9'],[7,'sus9']],   // vi IV I V
];
// Calm keys (MIDI note of the tonic around the bass register): F, G, Ab, Bb, C, D, Eb.
const KEYS=[41,43,44,46,48,50,51];
const MAJOR=[0,2,4,5,7,9,11];
export const PENTA=[0,2,4,7,9];

export function makeSong(seed){const r=mulberry(hashStr('song:'+String(seed)));
  const key=KEYS[Math.floor(r()*KEYS.length)],prog=PROGS[Math.floor(r()*PROGS.length)];
  return{seed:String(seed),key,prog,bpm:70+Math.floor(r()*15),swing:0.12+r()*0.1,
    // per-song melodic contour: which pentatonic steps the melody leans on
    contour:Array.from({length:8},()=>Math.floor(r()*5))};}

// The chord for a bar: root MIDI note and its tones.
export function chordAt(song,bar){const [deg,shape]=song.prog[((bar%song.prog.length)+song.prog.length)%song.prog.length];
  const root=song.key+deg;return{root,shape,tones:SHAPES[shape].map(s=>root+s)};}

// A deterministic random stream for one bar of one layer, so arrangements repeat exactly per seed.
export function barRandom(song,bar,layer){return mulberry(hashStr(song.seed+'|'+bar+'|'+layer));}

// Note in the major pentatonic of the key: degree can run over several octaves.
export function pentaNote(song,degree,octave){const d=((degree%5)+5)%5,o=Math.floor(degree/5);return song.key+24+12*(octave+o)+PENTA[d];}

// True if a MIDI note belongs to the song's key (major scale).
export function inKey(song,midi){return MAJOR.includes(((midi-song.key)%12+12)%12);}

export const mtof=m=>440*Math.pow(2,(m-69)/12);
