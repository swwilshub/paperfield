#!/usr/bin/env python3
"""Cut the "Fade to Wind" stems into phrase files for the dynamic music mixer.

Usage: python3 tools/build-music.py <stems.zip> [out_dir=assets/music]
Needs ffmpeg and numpy. Writes <out_dir>/<phrase>-<stem>.mp3 and manifest.json.

The song is 120 BPM (2 s bars). Bar 1 starts at 0 s; after a 5-bar intro, phrases are
8 bars (16 s) long. Each phrase file carries a 2 s release tail that the mixer fades out
when it moves on, so notes ring naturally into the next phrase. Silent stem/phrase pairs
are skipped. Per-bar chroma decides which jumps are harmonically safe.
"""
import json, os, subprocess, sys, tempfile, zipfile
import numpy as np

BAR = 2.0
TAIL = 2.0
SR = 22050
STEMS = ['drums', 'bass', 'guitar', 'keys', 'perc', 'strings', 'synth', 'air', 'brass']
SRC = ['0 Drums', '1 Bass', '2 Guitar', '3 Keyboard', '4 Percussion', '5 Strings', '6 Synth', '7 Other', '8 Brass']
SILENT_DB = -55.0
MONO = {'drums', 'perc', 'bass'}  # mono halves decoded memory; little stereo width to lose

def decode(path, sr=SR):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)

def db(x):
    return float(20 * np.log10(np.sqrt(np.mean(x * x)) + 1e-9)) if len(x) else -180.0

def chroma_per_bar(x, nbars):
    n = 4096; hop = 2048
    frames = np.lib.stride_tricks.sliding_window_view(x, n)[::hop] * np.hanning(n)
    mag = np.abs(np.fft.rfft(frames, axis=1))
    freqs = np.fft.rfftfreq(n, 1 / SR)
    ok = (freqs > 55) & (freqs < 2000)
    pc = (np.round(12 * np.log2(freqs[ok] / 440.0)) + 9) % 12
    C = np.zeros((len(frames), 12))
    for k in range(12):
        C[:, k] = mag[:, ok][:, pc == k].sum(1)
    t = (np.arange(len(frames)) * hop + n / 2) / SR
    out = np.zeros((nbars, 12))
    for b in range(nbars):
        m = (t >= b * BAR) & (t < (b + 1) * BAR)
        if m.any():
            v = C[m].sum(0); out[b] = v / (np.linalg.norm(v) + 1e-9)
    return out

def key_of(ch):
    major = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
    minor = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
    names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    best = max(((np.corrcoef(np.roll(p, k), ch)[0, 1], names[k] + (' major' if p is major else ' minor'), k, p is major)
                for p in (major, minor) for k in range(12)))
    return {'name': best[1], 'tonic': best[2], 'major': bool(best[3])}

def main():
    zpath = sys.argv[1]; out = sys.argv[2] if len(sys.argv) > 2 else 'assets/music'
    os.makedirs(out, exist_ok=True)
    tmp = tempfile.mkdtemp()
    with zipfile.ZipFile(zpath) as z: z.extractall(tmp)
    src = {s: os.path.join(tmp, f + '.mp3') for s, f in zip(STEMS, SRC)}
    pcm = {s: decode(p) for s, p in src.items()}
    dur = min(len(v) for v in pcm.values()) / SR
    nbars = int(dur // BAR)
    mix = sum(pcm.values())
    chroma = chroma_per_bar(mix, nbars)
    key = key_of(chroma.sum(0))

    # Phrases: intro bars 0-4, then 8-bar phrases from bar 5. The last one may be short.
    bounds = [(0, 5)] + [(b, min(b + 8, nbars)) for b in range(5, nbars, 8)]
    bounds = [(a, b) for a, b in bounds if b - a >= 4]
    phrases = []
    for i, (a, b) in enumerate(bounds):
        pid = 'p%02d' % i
        t0, t1 = a * BAR, b * BAR
        act, files = {}, {}
        for s in STEMS:
            seg = pcm[s][int(t0 * SR):int(t1 * SR)]
            act[s] = round(db(seg), 1)
            if act[s] < SILENT_DB and float(np.abs(seg).max(initial=0)) < 10 ** (-40 / 20):
                continue
            name = f'{pid}-{s}.mp3'; files[s] = name
            length = min(t1 + TAIL, dur) - t0
            # Seek on the input so the cut (and the fades) start at t=0.
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t0:.3f}', '-t', f'{length:.3f}', '-i', src[s],
                            '-af', f'afade=t=in:st=0:d=0.005,afade=t=out:st={t1 - t0:.3f}:d={max(0.05, length - (t1 - t0)):.3f}',
                            '-ar', '44100', '-ac', '1' if s in MONO else '2', '-c:a', 'libmp3lame', '-q:a', '5', os.path.join(out, name)], check=True)
        phrases.append({'id': pid, 'bar': a, 'bars': b - a, 'start': t0, 'activity': act, 'files': files})

    # Harmonic fit of jumping from bar `x` into phrase `p`: how much bar x sounds like the bar that
    # really comes before p (its natural predecessor). 1.0 = the original continuation.
    for p in phrases:
        prev = chroma[p['bar'] - 1] if p['bar'] > 0 else chroma[nbars - 1]
        p['fit'] = [round(float(np.dot(chroma[x], prev)), 3) for x in range(nbars)]

    manifest = {'title': 'Fade to Wind', 'artist': 'palettedisk', 'bpm': 120, 'bar': BAR, 'tail': TAIL,
                'bars': nbars, 'duration': round(dur, 3), 'key': key, 'stems': STEMS, 'phrases': phrases}
    with open(os.path.join(out, 'manifest.json'), 'w') as f:
        json.dump(manifest, f, separators=(',', ':'))
    tot = sum(os.path.getsize(os.path.join(out, n)) for n in os.listdir(out))
    print(f'key {key["name"]}, {len(phrases)} phrases, {sum(len(p["files"]) for p in phrases)} files, {tot / 1e6:.1f} MB')
    for p in phrases:
        print(p['id'], f"{p['start']:6.1f}s", p['bars'], 'bars', ' '.join(f"{s}:{p['activity'][s]:.0f}" for s in STEMS))

if __name__ == '__main__':
    main()
