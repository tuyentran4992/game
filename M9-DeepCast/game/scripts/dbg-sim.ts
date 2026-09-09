// debug wrapper: SIM_DEBUG on, 3 seeds, per-dive money trail
process.env.SIM_DEBUG = '1';
const { runAllSeeds, summarize } = await import('./sim.ts');
const runs = runAllSeeds(3);
console.log(summarize(runs));
for (const r of runs) {
  console.log(
    `seed ${r.seed}: ${r.outcome} ${r.sessionS.toFixed(0)}s dives=${r.dives.map((d) => `${d.durationS.toFixed(0)}s/$${d.sold}`).join(' ')}`,
  );
}
export {}; // keep tsc happy: top-level await needs module scope
