// QA runner — drives agent-browser via child_process. Not part of game code.
const { spawnSync } = require('child_process');

function ab(args, opts = {}) {
  const r = spawnSync('agent-browser', args, {
    encoding: 'utf8',
    timeout: opts.timeout ?? 60000,
    maxBuffer: 50 * 1024 * 1024,
  });
  return { stdout: r.stdout ?? '', stderr: r.stderr ?? '', status: r.status };
}

function run(label, args, opts) {
  const r = ab(args, opts);
  console.log(`\n=== ${label} ===`);
  if (r.stdout) console.log(r.stdout);
  if (r.stderr) console.log('STDERR:', r.stderr);
  console.log('STATUS:', r.status);
  return r;
}

module.exports = { ab, run };
