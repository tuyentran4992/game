#!/usr/bin/env python3
"""Sinh SFX + BGM cho game Cứu Mèo (numpy synth WAV -> ffmpeg mp3). Lưu vào assets/raw/ + game/public/raw/."""
import numpy as np, wave, subprocess, os
from pathlib import Path

SR = 44100
RAW = Path("/data/youtube-playables/M1-Rescue-Dodge/assets/raw")
PUB = Path("/data/youtube-playables/M1-Rescue-Dodge/game/public/raw")
RAW.mkdir(parents=True, exist_ok=True); PUB.mkdir(parents=True, exist_ok=True)

def env(n, a=0.005, r=0.08, curve=5):
    e = np.ones(n)
    ai, ri = min(int(a*SR), n//2), min(int(r*SR), n//2)
    if ai: e[:ai] = np.linspace(0, 1, ai)
    if ri: e[-ri:] *= np.linspace(1, 0, ri)**(1/curve)
    return e

def tone(freq, dur, vol=0.4, wave='sine', vib=None, decay=None):
    t = np.linspace(0, dur, int(SR*dur), False)
    if wave=='square': s = np.sign(np.sin(2*np.pi*freq*t))
    elif wave=='saw': s = 2*((freq*t)%1)-1
    elif wave=='triangle': s = 2*np.abs(2*(freq*t-np.floor(freq*t+0.5)))-1
    else: s = np.sin(2*np.pi*freq*t)
    if vib: s *= 1+0.4*np.sin(2*np.pi*vib*t)  # vibrato buzzy
    x = s*env(len(s))*vol
    if decay: x *= np.exp(-decay*t)
    return x

def noise(dur, vol=0.3, lp=2000):
    n = np.random.randn(int(SR*dur))
    # low-pass đơn giản
    b = np.ones(int(SR/lp)); n = np.convolve(n, b, 'same')/len(b)
    return n*env(len(n), curve=2)*vol

def mix(*parts, dur=None):
    L = max(len(p) for p in parts if p is not None)
    if dur: L = int(dur*SR)
    out = np.zeros(L)
    for p in parts:
        if p is None: continue
        out[:len(p)] += p
    return out/ max(1.0, np.abs(out).max()*1.3)  # normalize

def sweep(f0, f1, dur, vol=0.35):
    t = np.linspace(0, dur, int(SR*dur), False)
    f = np.linspace(f0, f1, len(t))
    phase = 2*np.pi*np.cumsum(f)/SR
    return np.sin(phase)*env(len(t), curve=3)*vol

def save(name, x):
    x = (x*32767).astype(np.int16)
    wav = f"/tmp/{name}.wav"
    with wave.open(wav, 'w') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(x.tobytes())
    out = f"/tmp/{name}.mp3"
    subprocess.run(["ffmpeg","-y","-loglevel","error","-i",wav,"-b:a","128k",out], check=True)
    for d in (RAW, PUB):
        shutil_put(out, d/name if name.endswith('.mp3') else d/(name+'.mp3'))
    print(f"{name}.mp3 -> {os.path.getsize(out)}B")

def shutil_put(src, dst):
    with open(src,'rb') as f: data=f.read()
    dst.write_bytes(data)

def bgm():
    # melody vui nhộn (C major, arpeggio + bass), ~9s loop
    notes = { 'C4':261.63,'D4':293.66,'E4':329.63,'F4':349.23,'G4':392.0,'A4':440.0,'B4':493.88,
              'C5':523.25,'D5':587.33,'E5':659.25,'G5':783.99,'A5':880.0 }
    bass=[('C3',0.5),('A2',0.5),('F2',0.5),('G2',0.5)]
    mel = [('C4',.25),('E4',.25),('G4',.25),('E4',.25),('D4',.25),('F4',.25),('A4',.25),('F4',.25),
           ('C4',.25),('E4',.25),('G5',.25),('E4',.25),('D4',.5),('C4',.5)]
    out=[]; vtum=0
    bar=0.5
    for n,d in bass:
        b=tone(notes.get(n,220), bar, vol=0.22, wave='sine')
        out.append(b)
    out.append(np.zeros(SR*1))
    for n,d in mel:
        out.append(tone(notes.get(n,440), d, vol=0.30, wave='triangle'))
        out.append(np.zeros(int(SR*d*0.55)))
    x=mix(*out)
    return x[:int(SR*9)]  # ~9s loop

import shutil
SWS = {
  'sfx_dodge':   sweep(900, 300, 0.14, 0.30),
  'sfx_score':   mix(tone(880, 0.09, 0.30), np.zeros(int(SR*0.02)), tone(1318, 0.12, 0.22)),
  'sfx_combo':   mix(tone(1046,0.10,0.30), np.zeros(int(SR*0.05)), tone(1318,0.10,0.30), np.zeros(int(SR*0.05)), tone(1568,0.14,0.30)),
  'sfx_hit':     mix(tone(110,0.35,0.45,wave='saw',vib=20), sweep(400,80,0.35,0.3)),
  'sfx_levelup': mix(tone(523,0.12,0.30,'square'), np.zeros(int(SR*0.04)), tone(659,0.12,0.30,'square'), np.zeros(int(SR*0.04)), tone(784,0.20,0.32,'square')),
  'sfx_click':   tone(600,0.05,0.28,'square'),
  'sfx_gameover': mix(tone(392,0.18,0.30), np.zeros(int(SR*0.05)), tone(330,0.18,0.30), np.zeros(int(SR*0.05)), tone(262,0.40,0.34)),
}
for name,x in SWS.items(): save(name, x)
save('bgm_main', bgm())
print("DONE audio")