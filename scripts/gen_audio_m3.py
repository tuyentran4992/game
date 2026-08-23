#!/usr/bin/env python3
"""Gen 6 audio cho M3 Juicy Merge (numpy synth -> mp3) vào assets/raw + game/public/raw.
SFX: sfx_drop, sfx_merge, sfx_merge_big, sfx_danger, sfx_gameover + BGM bgm_main."""
import numpy as np, wave, subprocess
from pathlib import Path
SR = 44100
RAW = Path("/data/youtube-playables/M3-Juicy-Merge/assets/raw")
PUB = Path("/data/youtube-playables/M3-Juicy-Merge/game/public/raw")
RAW.mkdir(parents=True, exist_ok=True); PUB.mkdir(parents=True, exist_ok=True)

def tone(f, dur, vol=0.5, fade=0.01):
    n=int(SR*dur); t=np.linspace(0,dur,n,endpoint=False); x=np.sin(2*np.pi*f*t)*vol
    fg=int(SR*fade)
    if fg>0: x[:fg]*=np.linspace(0,1,fg); x[-fg:]*=np.linspace(1,0,fg)
    return x
def gliss(f0,f1,dur,vol=0.4,fade=0.01):
    n=int(SR*dur); t=np.linspace(0,dur,n,endpoint=False)
    f=np.linspace(f0,f1,n); phase=2*np.pi*np.cumsum(f)/SR*(SR/2)
    x=np.sin(phase)*vol
    fg=int(SR*fade)
    if fg>0: x[:fg]*=np.linspace(0,1,fg); x[-fg:]*=np.linspace(1,0,fg)
    return x
def noise(dur, vol=0.18, fade=0.01, cutoff=2200):
    n=int(SR*dur); x=np.random.randn(n)*vol
    k=int(SR/cutoff); x=np.convolve(x,np.ones(k)/k,mode='same') if k>1 else x
    fg=int(SR*fade)
    if fg>0: x[:fg]*=np.linspace(0,1,fg); x[-fg:]*=np.linspace(1,0,fg)
    return x
def env_arr(x, a=0.01, r=0.06):
    x=np.array(x,dtype=float); n=len(x); ai,ri=min(int(a*SR),n//2),min(int(r*SR),n//2)
    if ai: x[:ai]*=np.linspace(0,1,ai)
    if ri: x[-ri:]*=np.linspace(1,0,ri)
    return x
def mix(*xs):
    L=max(len(x) for x in xs); out=np.zeros(L)
    for x in xs: out[:len(x)]+=x
    return out/np.max(np.abs(out))*0.8
def write(name, x):
    x=np.clip(x,-1,1); x16=(x*32767).astype('<i2')
    wav=f"/tmp/{name}.wav"
    with wave.open(wav,'w') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(x16.tobytes())
    for d in (RAW,PUB):
        subprocess.run(["ffmpeg","-y","-loglevel","error","-i",wav,"-codec:a","libmp3lame","-q:a","5",str(d/(name+".mp3"))],check=True)

# SFX
write("sfx_drop",      env_arr(mix(noise(0.08,0.18,0.005,3000),tone(160,0.08,0.15)),0.003,0.06))        # thả trái "plop"
write("sfx_merge",     env_arr(mix(noise(0.14,0.20,0.005,2500),gliss(400,900,0.16,0.25)),0.005,0.10))  # merge pop lên
write("sfx_merge_big", np.concatenate([env_arr(mix(noise(0.18,0.22,0.005,2000),gliss(300,1200,0.20,0.3)),0.005,0.12),
                                       np.zeros(int(SR*0.05)),
                                       tone(880,0.15,0.28),np.zeros(int(SR*0.03)),tone(1320,0.25,0.26)]))  # merge lớn fanfare
write("sfx_danger",    env_arr(mix(np.sin(2*np.pi*520*np.linspace(0,0.3,int(SR*0.3)))*0.3, noise(0.3,0.12,0.005,900)),0.01,0.15))  # cảnh báo rung
write("sfx_gameover",  env_arr(mix(tone(330,0.35,0.25), np.zeros(int(SR*0.05)), tone(220,0.5,0.25)),0.02,0.2))  # thấp dần

# BGM jovial lặp (4 nốt vui, arpeggio C-G-Am-F)
t=np.linspace(0,12,int(SR*12),endpoint=False)
chords=[(261.6,329.6,392.0),(196.0,246.9,293.7),(220.0,261.6,329.6),(174.6,220.0,261.6)]
bgm=np.zeros_like(t)
for i,(f1,f2,f3) in enumerate(chords):
    s=int(i*3*SR); e=min(int((i*3+3)*SR),len(t))
    seg=(np.sin(2*np.pi*f1*t[s:e])+np.sin(2*np.pi*f2*t[s:e])+np.sin(2*np.pi*f3*t[s:e]))/3 * (0.07*np.linspace(1,0.5,e-s)**0.6)
    bgm[s:e]+=seg
write("bgm_main", np.clip(bgm*0.8,-1,1))
print("M3 audio OK:", sorted(p.name for p in RAW.glob("*.mp3")))