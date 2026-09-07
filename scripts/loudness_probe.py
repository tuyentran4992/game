"""Measure actual loudness of the plop synth graph (replica of deployed plopSynth buildGraph/playLayer/play).

FUN2-C1 (card t_22349993) — UPDATED replica of the NEW graph/params (audioMapper + plopSynth
as of this card):
  - 3 tonal layers (fundamental 180-320Hz) + 1 SLAP layer (1.5-4kHz, level HIGHEST) — slap
    goes through its OWN bandpass straight to the compressor (bypasses lowpass + reverb wet),
    faithful to playSlap().
  - Master envelope total 150-250ms, masterGain 0.5-0.9.
  - Tonal path: master -> reverb feedback delay -> wet -> lowpass 3.2kHz -> master (loop),
    master -> comp -> destination — faithful to buildGraph().

Speaker models (small-device reproduction check):
  mobile: highpass 300Hz (tiny phone speaker cannot reproduce lows)
  laptop: highpass 120Hz
Gate per card: peak >= -12 dBFS AND spectral centroid >= 600Hz for soft/mid/strong/splash,
on BOTH speaker models. Calibration: 440Hz sine at gain 0.3 = -10.5 dBFS +-1dB every run.

Renders via headless Chromium OfflineAudioContext at 48kHz; reports peak dBFS + RMS + centroid.
"""
import json
from playwright.sync_api import sync_playwright

JS = """
async () => {
  // ---- faithful replica of the NEW plopSynth graph + audioMapper params (FUN2-C1) ----
  function plopParams(ev) {
    const OCT = 12;
    const base = 180 + Math.min(1, Math.max(0, ev.impact)) * 140; // 180..320Hz fundamental
    const semi = ((ev.bounces % OCT) + OCT) % OCT;
    const pb = ev.perfect ? 3 : 0;
    const freq0 = base * Math.pow(2, ((semi + pb) % OCT) / OCT);
    const types = ev.hit ? ['sine','triangle','sine'] : ['triangle','sine','square'];
    const detune = ev.hit ? 1 : 0.5;
    const levels = ev.hit ? [0.7, 0.42, 0.3] : [0.6, 0.4, 0.36];
    const layers = [0,1,2].map(i => ({
      freqHz: i === 0 ? freq0 : freq0 * (i === 1 ? 2*detune : 3*detune),
      durationS: 0.16 - i*0.015, // 0.16/0.145/0.13
      type: types[i],
      level: levels[i],
    }));
    const i = Math.min(1, Math.max(0, ev.impact));
    const slap = {
      freqHz: ev.hit ? 1500 + i*1700 : 1800 + i*2200, // 1500..3200 hit, 1800..4000 miss
      durationS: 0.055 + i*0.02, // 55..75ms transient
      level: ev.hit ? 0.9 : 0.85, // HIGHEST of all layers (probe: no digital clip)
    };
    return { layers, slap, masterGain: 0.55 + i*0.25, totalDurationS: 0.15 + i*0.1 };
  }
  function playTonalLayer(ctx, layer, t0, out) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = layer.type;
    osc.frequency.setValueAtTime(layer.freqHz, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, layer.freqHz*0.72), t0 + layer.durationS);
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(layer.level, t0 + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + layer.durationS);
    osc.connect(env); env.connect(out);
    osc.start(t0); osc.stop(t0 + layer.durationS);
  }
  function playSlap(ctx, slap, t0, comp) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(slap.freqHz, t0);
    osc.type = 'square';
    osc.frequency.setValueAtTime(slap.freqHz, t0);
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(slap.level, t0 + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + slap.durationS);
    osc.connect(env); env.connect(bp); bp.connect(comp);
    osc.start(t0); osc.stop(t0 + slap.durationS);
  }
  function buildGraph(ctx) {
    const master = ctx.createGain();
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass'; lowpass.frequency.setValueAtTime(3200, ctx.currentTime); // widened 2200 -> 3200
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-18, ctx.currentTime);
    const delay = ctx.createDelay(); delay.delayTime.setValueAtTime(0.14, ctx.currentTime);
    const feedback = ctx.createGain(); feedback.gain.setValueAtTime(0.35, ctx.currentTime);
    const wet = ctx.createGain(); wet.gain.setValueAtTime(0.22, ctx.currentTime);
    delay.connect(feedback); feedback.connect(delay);
    master.connect(delay); delay.connect(wet); wet.connect(lowpass); lowpass.connect(master);
    master.connect(comp); comp.connect(ctx.destination);
    return { master, comp };
  }
  function renderOne(ev, hpfHz) {
    return new Promise((resolve) => {
      const sr = 48000, len = 0.5 * sr;
      const ctx = new OfflineAudioContext(1, len, sr);
      // speaker model: highpass on the way out
      const speaker = ctx.createBiquadFilter();
      speaker.type = 'highpass'; speaker.frequency.setValueAtTime(hpfHz, ctx.currentTime);
      speaker.connect(ctx.destination);
      // graph renders into speaker instead of raw destination
      const realDest = ctx.destination;
      const { master, comp } = buildGraph(ctx);
      comp.disconnect();
      comp.connect(speaker);
      const p = plopParams(ev);
      const t0 = 0.05;
      master.gain.cancelScheduledValues(t0);
      master.gain.setValueAtTime(0.0001, t0);
      master.gain.linearRampToValueAtTime(p.masterGain, t0 + 0.006);
      master.gain.setValueAtTime(p.masterGain, t0 + p.totalDurationS);
      master.gain.linearRampToValueAtTime(0.0001, t0 + p.totalDurationS + 0.06);
      for (const layer of p.layers) playTonalLayer(ctx, layer, t0, master);
      playSlap(ctx, p.slap, t0, comp);
      ctx.startRendering().then(buf => {
        const d = buf.getChannelData(0);
        let peak = 0, sum = 0;
        for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; sum += d[i]*d[i]; }
        const rms = Math.sqrt(sum / d.length);
        // spectral centroid via Goertzel over bins 40..8000Hz
        let num = 0, den = 0;
        for (let f = 40; f <= 8000; f += 20) {
          const w = 2*Math.PI*f/sr;
          let re = 0, im = 0;
          for (let i = 0; i < d.length; i += 2) { re += d[i]*Math.cos(w*i); im -= d[i]*Math.sin(w*i); }
          const mag = Math.sqrt(re*re + im*im);
          num += f*mag; den += mag;
        }
        resolve({ peakDbfs: 20*Math.log10(peak || 1e-9), rmsDbfs: 20*Math.log10(rms || 1e-9), centroid: den ? num/den : 0 });
      });
      void realDest;
    });
  }
  const scenarios = {};
  const defs = {
    'soft (impact 0.2, hit)': { bounces: 0, impact: 0.2, hit: true },
    'mid (impact 0.5, hit, bounce 2)': { bounces: 2, impact: 0.5, hit: true },
    'strong (impact 0.85, hit, bounce 5)': { bounces: 5, impact: 0.85, hit: true },
    'splash (miss)': { bounces: 7, impact: 0.4, hit: false },
  };
  const speakers = { mobile: 300, laptop: 120 };
  for (const [sp, hpf] of Object.entries(speakers)) {
    scenarios[sp] = {};
    for (const [name, ev] of Object.entries(defs)) {
      scenarios[sp][name] = await renderOne(ev, hpf);
    }
  }
  // Calibration reference: 440Hz sine at gain 0.3 for 100ms — must be -10.5 dBFS +-1dB
  const ref = await new Promise((resolve) => {
    const sr = 48000, len = 0.5*sr;
    const ctx = new OfflineAudioContext(1, len, sr);
    const g = ctx.createGain(); g.gain.value = 0.3; g.connect(ctx.destination);
    const o = ctx.createOscillator(); o.frequency.value = 440; o.connect(g);
    o.start(0.05); o.stop(0.15);
    ctx.startRendering().then(buf => {
      const d = buf.getChannelData(0); let peak = 0;
      for (const v of d) { const a = Math.abs(v); if (a > peak) peak = a; }
      resolve({ peakDbfs: 20*Math.log10(peak || 1e-9) });
    });
  });
  return { scenarios, reference: ref };
}
"""

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/google-chrome", headless=True, args=["--no-sandbox"])
    page = browser.new_page()
    res = page.evaluate(JS)
    browser.close()

PASS = True
print("Calibration 440Hz gain 0.3:", json.dumps(res["reference"]), "(target -10.5 dBFS ±1dB)")
ref_peak = res["reference"]["peakDbfs"]
if not (-11.5 <= ref_peak <= -9.5):
    print("  !! CALIBRATION OUT OF RANGE")
    PASS = False
for sp, rows in res["scenarios"].items():
    print(f"\n[{sp}]")
    for name, m in rows.items():
        ok_peak = m["peakDbfs"] >= -12
        ok_cent = m["centroid"] >= 600
        if not (ok_peak and ok_cent):
            PASS = False
        print(f"  {name:38s} peak {m['peakDbfs']:7.2f} dBFS  rms {m['rmsDbfs']:7.2f}  centroid {m['centroid']:7.1f} Hz  {'OK' if ok_peak and ok_cent else 'FAIL'}")
print("\nGATE:", "PASS" if PASS else "FAIL")
