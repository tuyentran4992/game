#!/usr/bin/env node
/**
 * GATE V2 — cổng máy cho "smell cơ học" (để phiên review không phải đếm tay).
 * Chạy: node tools/gate-smell.mjs [--max-lines 250] [--dup-lines 6]
 * Mã thoát: 0 = PASS, 1 = FAIL.
 *
 * Kiểm 4 nhóm (tất định, không dùng LLM):
 *  G1. Giới hạn dòng/file trong src/logic (mặc định 250; file bảng dữ liệu được MIỄN nếu tên khớp --data-files)
 *  G2. Khối lệnh trùng lặp ≥ N dòng liên tiếp giữa 2 vị trí bất kỳ trong src/logic
 *  G3. Hằng số/số bị khai trùng ở ≥2 file (cùng tên khác giá trị, hoặc cùng giá trị khác tên trong 2 file)
 *  G4. Cấm trong src/logic: Math.random  Date.now  performance.now  console.log  any  @ts-ignore  document/window  fetch
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';

const args = process.argv.slice(2);
const getArg = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const MAX_LINES = Number(getArg('--max-lines', 250));
const DUP_LINES = Number(getArg('--dup-lines', 6));
const DATA_FILE_RE = new RegExp(getArg('--data-files', '^(themes|chapters|dictionary)\\.ts$'));
// Quét CẢ src (bài học B3a: chỉ quét src/logic nên src/render lọt trần dòng & console.log)
const SRC_DIRS = ['src/logic', 'src/render', 'src/platform'];
const LINE_LIMIT = { 'src/logic': 250, 'src/render': 350, 'src/platform': 250 };

const files = [];
for (const dir of SRC_DIRS) {
  if (!existsSync(dir)) continue;
  for (const f of walk(dir)) if (f.endsWith('.ts')) files.push(f);
}
function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
function limitFor(file) {
  for (const d of SRC_DIRS) if (file.startsWith(d)) return LINE_LIMIT[d] || MAX_LINES;
  return MAX_LINES;
}
const rel = (p) => p.replace(process.cwd() + '/', '');
/** Bỏ comment KHỐI và DÒNG nhưng GIỮ nguyên số dòng (thay bằng khoảng trắng) — bài học: bản đầu bắt oan
 *  "Math.random" nằm trong JSDoc của generator.ts:85. */
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/\/\/.*$/gm, (m) => ' '.repeat(m.length));

// nợ kiến trúc đã khai báo (không giấu): đọc tools/gate-allow.json
const allow = (() => { try { return JSON.parse(readFileSync('tools/gate-allow.json', 'utf8')); } catch { return {}; } })();
const isAllowed = (msg) => Object.entries(allow).some(([code, pats]) => msg.startsWith(code) && (pats || []).some((pt) => msg.includes(pt)));
const allowHit = [];
const fails = [];
const notes = [];

// ---------- G1: giới hạn dòng ----------
for (const f of files) {
  const n = stripComments(readFileSync(f, 'utf8')).split('\n').length;
  const lim = limitFor(f);
  if (n > lim) {
    if (DATA_FILE_RE.test(basename(f))) notes.push(`G1 miễn (bảng dữ liệu): ${rel(f)} ${n} dòng`);
    else fails.push(`G1 ${rel(f)} = ${n} dòng > ${lim} (tách trách nhiệm hoặc khai báo là file dữ liệu)`);
  }
}

// ---------- G2: khối trùng lặp ----------
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const seen = new Map();
for (const f of files) {
  const lines = stripComments(readFileSync(f, 'utf8')).split('\n').map(norm);
  for (let i = 0; i + DUP_LINES <= lines.length; i++) {
    const block = lines.slice(i, i + DUP_LINES).join('\n');
    if (block.replace(/[^\w]/g, '').length < DUP_LINES * 8) continue; // bỏ khối quá ngắn/nhiều dấu
    const key = block;
    if (seen.has(key)) {
      const prev = seen.get(key);
      if (prev.file !== f) fails.push(`G2 khối ${DUP_LINES} dòng trùng: ${rel(prev.file)}:${prev.line} ↔ ${rel(f)}:${i + 1}`);
    } else seen.set(key, { file: f, line: i + 1 });
  }
}

// ---------- G3: hằng số khai trùng ----------
const constDecl = /(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*(?::[^=]+)?=\s*([0-9]+)\b/g;
const byName = new Map(), byValue = new Map();
for (const f of files) {
  const src = stripComments(readFileSync(f, 'utf8'));
  for (const m of src.matchAll(constDecl)) {
    const [, name, val] = m;
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push({ file: f, val });
    if (!byValue.has(val)) byValue.set(val, []);
    byValue.get(val).push({ file: f, name });
  }
}
for (const [name, list] of byName) {
  const vals = new Set(list.map((x) => x.val));
  const fs = new Set(list.map((x) => rel(x.file)));
  if (list.length > 1 && (vals.size > 1 || fs.size > 1))
    fails.push(`G3 hằng ${name} khai ở ${[...fs].join(' + ')} với giá trị {${[...vals].join(', ')}} — phải 1 nguồn`);
}
for (const [val, list] of byValue) {
  const names = new Set(list.map((x) => x.name));
  const fs = new Set(list.map((x) => rel(x.file)));
  if (names.size > 1 && fs.size > 1)
    fails.push(`G3 giá trị ${val} được đặt tên ${[...names].join(' / ')} ở ${[...fs].join(' + ')} — nghi cùng một luật, 2 hằng`);
}

// ---------- G4: cấm ----------
const BANS = [
  [/\bMath\.random\b/, 'Math.random'], [/\bDate\.now\b/, 'Date.now'], [/\bperformance\.now\b/, 'performance.now'],
  [/\bconsole\.(log|debug|info)\b/, 'console.log'], [/:\s*any\b/, ': any'], [/@ts-ignore/, '@ts-ignore'],
  [/\bdocument\b/, 'document'], [/\bwindow\b/, 'window'], [/\bfetch\s*\(/, 'fetch'],
];
for (const f of files) {
  const lines = stripComments(readFileSync(f, 'utf8')).split('\n');
  lines.forEach((l, i) => {
    const code = l;
    for (const [re, name] of BANS) if (re.test(code)) fails.push(`G4 ${rel(f)}:${i + 1} có ${name}`);
  });
}

// ---------- phân loại: vi phạm thật vs NỢ đã khai báo ----------
const allowed = fails.filter(isAllowed);
const real = fails.filter((f) => !isAllowed(f));
if (allowed.length) for (const a of allowed) allowHit.push(a);

// ---------- in ----------
console.log(`GATE V2 — ${files.length} file trong ${SRC_DIRS.join(', ')} · trần: ${JSON.stringify(LINE_LIMIT)} · dup-lines=${DUP_LINES}`);
for (const n of notes) console.log(`  (miễn) ${n}`);
if (allowHit.length) {
  console.log(`  NỢ ĐÃ KHAI (tools/gate-allow.json — phải trả, không tính là fail): ${allowHit.length}`);
  for (const a of allowHit) console.log('    ~ ' + a);
}
if (real.length === 0) { console.log(`KẾT QUẢ: PASS (0 vi phạm thật${allowHit.length ? `, ${allowHit.length} mục nợ` : ''})`); process.exit(0); }
console.log(`KẾT QUẢ: FAIL (${real.length} vi phạm thật)`);
for (const f of real) console.log('  ✗ ' + f);
process.exit(1);
