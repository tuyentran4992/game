#!/usr/bin/env python3
"""Gen SFX + BGM cho M2 Neon Sort (numpy synth -> mp3) vào assets/raw + game/public/raw."""
import numpy as np, wave, subprocess, os
from pathlib import Path
SR = 44100
RAW, PUB = Path("assets/raw"), Path("game/public/raw")
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
    n=int(SR*dur); t=np.linspace(0,dur,n,endpoint=False)
    x=np.random.randn(n)*vol
    # lowpass đơn giản bằng rollung average lớn plugin: dùng freq sweep soft
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

# SFX M2
write("sfx_pour",   env_arr(noise(0.28,0.20,0.02,1800)+gliss(300,700,0.28,0.25)))       # đổ chất lỏng mượt
write("sfx_error",  env_arr(mix(noise(0.22,0.22,0.01,700),tone(180,0.20,0.22)),0.01,0.10))    # không hợp lệ
write("sfx_clear",  mix(tone(660,0.15,0.30),np.zeros(int(SR*0.03)),tone(880,0.18,0.30),np.zeros(int(SR*0.03)),tone(1320,0.35,0.28)))  # fanfare 3 nốt
write("sfx_click",  env_arr(mix(noise(0.06,0.22,0.005,4000),tone(1200,0.06,0.15)),0.003,0.05))
# BGM lo-fi space loop (2 vòng 4 nốt mềm + pad)
t=np.linspace(0,8,int(SR*8),endpoint=False)
seq=[220.0,261.6,293.7,329.6, 220.0,293.7,329.6,392.0, 220.0,261.6,329.6,392.0, 196.0,261.6,329.6,392.0]
pad=np.zeros_like(t)
for i,f in enumerate(seq):
    s=int(i*0.5*SR); e=min(int((i*0.5+1.8)*SR),len(t)); seg=np.sin(2*np.pi*f*t[s:e])*(0.06*np.linspace(1,0.4,e-s)**0.5); pad[s:e]+=seg
write("bgm_main", np.clip(pad*0.8,-1,1))
print("M2 audio OK:", sorted(p.name for p in RAW.glob("*.mp3")))