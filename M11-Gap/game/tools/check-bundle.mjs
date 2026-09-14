#!/usr/bin/env node
/**
 * check-bundle.mjs — CỔNG KIỂM BUNDLE NỘP (B5).
 *
 * Chạy: node tools/check-bundle.mjs <dir> --channel <ytgame|playgama|standalone> [--samples N]
 * Mã thoát: 0 = sạch · 1 = có vi phạm · 2 = gọi sai (thư mục/kênh không hợp lệ).
 *
 * Kiến trúc: MỌI luật là dòng trong BẢNG DỮ LIỆU (CHANNELS, SIZE_BUDGET, RULES) và mỗi loại
 * luật có ĐÚNG MỘT handler trong HANDLERS (registry theo `kind`). Thêm luật = thêm dòng bảng
 * + handler nếu là kind mới; không có if/else dây theo tên kênh.
 *
 * Nguồn luật: PC-15 (bundle không tự phát động call mạng) · SPEC §5.4 (4 debug hook chỉ ở
 * standalone/dev) · SPEC §5.2 (bundle <5MB; validate.py đòi mỗi file <512KB) · DoD §8.8 (tên
 * phát hành Paper Crease, hết tên cũ "GẤP") · án lệ M8 G8b/R2 (bản playgama phải có ĐÚNG 1
 * script bridge + playbook config `playgama-bridge-config.json`).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

// --------------------------------------------------------------------------- luật: dữ liệu

/** URL bridge Playgama — chuỗi duy nhất được phép còn ở bundle nộp kênh playgama. */
const PLAYGAMA_BRIDGE_URL = 'https://bridge.playgama.com/v2/stable/playgama-bridge.js';

/**
 * Hồ sơ kênh nộp. `submission` ⇒ bị luật debug-hook; `urlAllow` = whitelist URL tuyệt đối
 * (null = kênh dev không ràng buộc); `requiredFiles` = file bắt buộc có trong bundle.
 */
const CHANNELS = {
  ytgame: { submission: true, urlAllow: [], requiredFiles: [] },
  playgama: { submission: true, urlAllow: [PLAYGAMA_BRIDGE_URL], requiredFiles: ['playgama-bridge-config.json'] },
  standalone: { submission: false, urlAllow: null, requiredFiles: [] },
};

/**
 * Vùng THƯ VIỆN NHÚNG. vite.config.ts tách engine thành chunk `assets/vendor-*.js` (manualChunks)
 * để cổng phân xử được hai chuyện khác nhau:
 *   - CODE CỦA TA (own): PC-15 & SPEC §5.4 ⇒ trần 0 khớp, tuyệt đối.
 *   - THÂN ENGINE (vendor): Phaser bắt buộc chứa XMLHttpRequest (FileLoader nạp asset cùng
 *     origin) và banner license MIT ⇒ đếm + in ra, chốt bằng VENDOR.budget cho API mạng; URL thì
 *     phân loại theo prefix để người đọc thấy ngay host nào quen, host nào mới — host MỚI KHÔNG
 *     FAIL (luật URL chỉ đánh code của ta) mà in thành dòng AUDIT, không giấu số hit. Chunk tự
 *     xưng vendor mà không có dấu hiệu engine (identityRe) vẫn FAIL — đổi tên file để trót lọt
 *     không được.
 * Baseline đo trên build ngày 2026-09-14: vendor-phaser 1.684.925 B · XMLHttpRequest 1 ·
 * fetch( 0 · WebSocket 0 · sendBeacon 0 · URL 1691, trong đó 1676 thuộc 3 prefix dưới và 15 là
 * chuỗi NỘI BỘ engine (namespace svg/xhtml của XMLSerializer, banner license MIT của dependency
 * nhúng) ⇒ chỉ in AUDIT: `w3.org`, `steffe.se`, `prunegames.com`, `niklasvh/base64-arraybuffer`.
 */
const VENDOR = {
  chunkRe: /^assets\/vendor-[^/]+\.js$/,
  identityRe: /phaser/i,
  urlAllowPrefixes: [
    'https://phaser.io',
    'https://opensource.org/licenses/MIT',
    'https://github.com/photonstorm/phaser',
  ],
  budget: { 'fetch(': 0, 'XMLHttpRequest': 1, 'WebSocket': 0, 'sendBeacon': 0, 'importScripts(': 0, 'new EventSource': 0 },
};

/** Trần kích thước (byte) theo vùng. Zip nộp ≤1.6MB là việc của scripts/verify_game.sh (rào ③). */
const SIZE_BUDGET = { totalBytes: 5_242_880, ownFileBytes: 524_288, vendorFileBytes: 2_097_152 };

/** Phần đuôi được đọc làm text để quét chuỗi (asset nhị phân chỉ vào bảng kích thước). */
const TEXT_EXTS = ['.js', '.mjs', '.cjs', '.html', '.htm', '.css', '.json', '.svg', '.txt', '.webmanifest'];

/**
 * Bảng luật quét. kind:
 *  forbid-text  : mỗi pattern phải 0 khớp trên `scope` (own|all) ở các kênh liệt kê; nếu
 *                 `scope:'own'` thì in thêm dòng audit cho vùng vendor, chốt bằng VENDOR.budget.
 *  remote-url   : URL tuyệt đối. own ⇒ đúng `channel.urlAllow` (ytgame: rỗng) — trần 0, tuyệt đối.
 *                 vendor ⇒ theo `vendorScope`: 'audit' (mặc định) = ĐẾM + in host lạ nhưng KHÔNG
 *                 xử, vì luật này sinh ra để bắt URL do code của MÌNH thêm, còn chuỗi trong thân
 *                 engine (namespace XMLSerializer, banner license của dependency nhúng…) là nội bộ
 *                 thư viện; 'fail' = vẫn xử. Chunk đổi tên để thành vendor bị vendor-shape chặn.
 *  entry-*      : kiểm index.html (đường dẫn dev + tham chiếu trỏ file có thật).
 *  size         : tổng thư mục + trần file theo vùng.
 *  required-file: file bắt buộc có mặt.
 *  forbidden-ext: phần đuôi cấm trong bundle nộp.
 *  vendor-shape : chunk vendor phải thật là engine (identityRe) — chặn đổi tên để lách cổng.
 */
const RULES = [
  {
    kind: 'forbid-text', id: 'debug-hook', scope: 'own',
    why: 'SPEC §5.4 — 4 debug hook (?debug=1 ?level=NN ?seed= ?ad=mock) chỉ được ở standalone/dev',
    channels: ['ytgame', 'playgama'],
    patterns: [
      { label: '?debug', re: /\?debug/g },
      { label: '?level=', re: /\?level=/g },
      { label: '?seed=', re: /\?seed=/g },
      { label: 'ad=mock', re: /ad=mock/g },
      { label: 'debug=1', re: /debug=1/g },
    ],
  },
  {
    // Luật chữ-nghĩa của SPEC có thể RỖNG cả khi máy parse hook vẫn còn trong bundle (debug.ts
    // giữ khoá là chuỗi 'level'/'seed', không phải '?level='). Nên cổng soi thêm DẤU VẾT HÌNH VI
    // của chính parser: code của ta đọc location.search / khai khoá query. Còn khớp ⇒ hook còn
    // đường chạy ⇒ bundle nộp chưa đạt §5.4.
    kind: 'forbid-text', id: 'debug-surface', scope: 'own',
    why: 'SPEC §5.4 (đọc sát) — parser debug hook không được lọt vào bundle nộp',
    channels: ['ytgame', 'playgama'],
    patterns: [
      { label: 'global(location)', re: /\("location"\)/g },
      { label: '.search', re: /\.search\b/g },
      { label: 'URLSearchParams', re: /URLSearchParams/g },
      { label: 'query-key(debug|seed)', re: /"(?:debug|seed)"/g },
      { label: 'ad-value("mock")', re: /"mock"/g },
    ],
  },
  {
    kind: 'forbid-text', id: 'network', scope: 'own',
    why: 'PC-15 — bundle nộp không tự phát động call mạng',
    channels: ['ytgame', 'playgama'],
    patterns: [
      { label: 'fetch(', re: /\bfetch\s*\(/g },
      { label: 'XMLHttpRequest', re: /XMLHttpRequest/g },
      { label: 'WebSocket', re: /WebSocket/g },
      { label: 'sendBeacon', re: /sendBeacon/g },
      { label: 'importScripts(', re: /importScripts\s*\(/g },
      { label: 'new EventSource', re: /new\s+EventSource/g },
    ],
  },
  {
    kind: 'remote-url', id: 'remote-url',
    why: 'PC-15 + án lệ M8 G8b — code của ta 0 URL; playgama được ĐÚNG 1 script bridge',
    channels: ['ytgame', 'playgama'],
    // Vùng engine chỉ ĐẾM (xem khối "Vùng THƯ VIỆN NHÚNG"): đổi thành 'fail' nếu muốn xử cả vendor.
    vendorScope: 'audit',
  },
  { kind: 'entry-no-src', id: 'entry-dev-path', why: 'index.html đã build phải trỏ asset hashed, không còn /src/' },
  { kind: 'entry-refs-exist', id: 'entry-refs-exist', why: 'mọi src=/href= trong index.html trỏ file CÓ THẬT' },
  {
    kind: 'forbid-text', id: 'legacy-name', scope: 'all', why: 'DoD §8.8 — tên phát hành là Paper Crease',
    channels: ['ytgame', 'playgama', 'standalone'],
    patterns: [
      { label: 'GẤP', re: /GẤP/g },
      { label: 'Gấp', re: /Gấp/g },
    ],
  },
  { kind: 'size', id: 'size', why: 'SPEC §5.2 + validate.py (mỗi file nộp <512KB)' },
  { kind: 'required-file', id: 'required-file', why: 'án lệ M8 R2 — config bridge phải đi kèm bundle' },
  { kind: 'vendor-shape', id: 'vendor-shape', why: 'chunk vendor phải thật là engine (chặn đổi tên để lách cổng)' },
  {
    kind: 'forbidden-ext', id: 'no-sourcemap', scope: 'all',
    why: 'sourcemap rò source + phình zip nộp',
    channels: ['ytgame', 'playgama'], exts: ['.map'],
  },
];

// --------------------------------------------------------------------------- nhập CLI

const argv = process.argv.slice(2);
const flagOf = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : dflt; };
const POSITIONAL = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--channel' && argv[i - 1] !== '--samples');
const CHANNEL = flagOf('--channel', '');
const SAMPLES = Number(flagOf('--samples', '3'));
const USAGE = 'DÙNG: node tools/check-bundle.mjs <dir> --channel <' + Object.keys(CHANNELS).join('|') + '> [--samples N]';

if (CHANNEL === '--help' || CHANNEL === '-h') { console.log(USAGE); process.exit(0); }
if (POSITIONAL.length !== 1) bail(USAGE, 'cần đúng 1 thư mục bundle, ví dụ: build/ytgame');
if (!Object.hasOwn(CHANNELS, CHANNEL)) bail(USAGE, '--channel phải là một trong ' + Object.keys(CHANNELS).join('|') + ' (nhận: "' + CHANNEL + '")');
const ROOT = resolve(POSITIONAL[0]);
if (!statSync(ROOT, { throwIfNoEntry: false })?.isDirectory()) bail(USAGE, 'không phải thư mục: ' + ROOT);
function bail(usage, msg) { console.error(usage); console.error('LỖI: ' + msg); process.exit(2); }

// --------------------------------------------------------------------------- đọc bundle

const channel = CHANNELS[CHANNEL];
const FILES = walk(ROOT).sort();
const SIZES = FILES.map((f) => ({ file: f, bytes: statSync(join(ROOT, f)).size }));
const TOTAL_BYTES = SIZES.reduce((n, s) => n + s.bytes, 0);
const BIGGEST = SIZES.reduce((a, b) => (b.bytes > a.bytes ? b : a), { file: '-', bytes: 0 });
const TEXTS = SIZES.filter((s) => TEXT_EXTS.includes(extOf(s.file)))
  .map((s) => ({ file: s.file, text: readFileSync(join(ROOT, s.file), 'utf8') }));

function walk(dir, base = '') {
  const out = [];
  for (const e of readdirSync(join(dir, base), { withFileTypes: true })) {
    const rel = base === '' ? e.name : base + '/' + e.name;
    if (e.isDirectory()) out.push(...walk(dir, rel));
    else out.push(rel);
  }
  return out;
}
function extOf(path) { const i = path.lastIndexOf('.'); return i < 0 ? '' : path.slice(i).toLowerCase(); }

// --------------------------------------------------------------------------- handler theo kind

const WINDOW = 120;
const URL_RE = /https?:\/\/[^\s"'`)<>]*/g;

/** Vùng của một file: 'vendor' nếu là chunk engine đã tách, ngược lại 'own' (code của ta). */
function scopeOf(file) { return VENDOR.chunkRe.test(file) ? 'vendor' : 'own'; }

/** Đếm khớp của một regex trong các file text thuộc `scope` ('own' | 'vendor' | 'all'). */
function countIn(scope, re) {
  let hits = 0;
  const samples = [];
  const rx = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  for (const { file, text } of TEXTS) {
    if (scope !== 'all' && scopeOf(file) !== scope) continue;
    for (const m of text.matchAll(rx)) {
      hits += 1;
      if (samples.length < SAMPLES) {
        const ctx = text.slice(Math.max(0, m.index - WINDOW), m.index + m[0].length + WINDOW).replace(/\s+/g, ' ').trim();
        samples.push(file + ' @' + m.index + ' ⟂ ' + ctx.slice(0, 150));
      }
    }
  }
  return { hits, samples };
}

/** Danh sách URL tuyệt đối trong một vùng. */
function urlsIn(scope) {
  const out = [];
  for (const { file, text } of TEXTS) {
    if (scope !== 'all' && scopeOf(file) !== scope) continue;
    for (const m of text.matchAll(URL_RE)) out.push({ file, url: m[0], at: m.index });
  }
  return out;
}
const uniqUrls = (list, max = Math.max(SAMPLES, 1)) => [...new Set(list.map((u) => u.url.slice(0, 90)))].slice(0, Math.max(max, 1));
const biggestOf = (scope) => SIZES.filter((s) => scopeOf(s.file) === scope).reduce((a, b) => (b.bytes > a.bytes ? b : a), { file: '-', bytes: 0 });

const HANDLERS = {
  'forbid-text': (rule) => {
    const bound = rule.channels.includes(CHANNEL);
    const rows = [];
    for (const { label, re } of rule.patterns) {
      const own = countIn(rule.scope, re);
      rows.push({
        check: rule.id + ':' + label, limit: bound ? 0 : 'miễn (kênh dev)', hits: own.hits,
        ok: own.hits === 0, exempt: !bound, samples: own.hits > 0 ? own.samples : [],
      });
      if (rule.scope !== 'own') continue; // chỉ code của ta mới có vùng vendor để đối chiếu
      const v = countIn('vendor', re);
      const cap = VENDOR.budget[label];
      rows.push({
        check: rule.id + ':' + label + '@vendor', limit: cap ?? 'audit', hits: v.hits,
        ok: cap === undefined || v.hits <= cap, audit: cap === undefined, samples: v.samples,
      });
    }
    return rows;
  },

  'remote-url': (rule) => {
    const allow = channel.urlAllow;
    if (allow === null) return [{ check: rule.id, limit: 'miễn (kênh dev)', hits: 0, ok: true, exempt: true, samples: [] }];
    const own = urlsIn('own');
    const vendor = urlsIn('vendor');
    const rows = allow.map((url) => {
      const n = own.filter((u) => u.url === url).length;
      return { check: rule.id + ':' + url, limit: 'đúng 1', hits: n, ok: n === 1, samples: [] };
    });
    const ownOut = own.filter((u) => !allow.includes(u.url));
    rows.push({ check: rule.id + ':own-code', limit: 0, hits: ownOut.length, ok: ownOut.length === 0, samples: uniqUrls(ownOut) });
    // Vendor: cùng bộ đếm, khác bản án — `vendorScope:'audit'` ⇒ chỉ in, không xử (xem khối
    // VENDOR + doc RULES). own-code ở trên VẪN tuyệt đối 0: nới luật chỉ cho thân engine.
    const vendorOut = vendor.filter((u) => !VENDOR.urlAllowPrefixes.some((p) => u.url.startsWith(p)));
    const vendorBound = (rule.vendorScope ?? 'fail') === 'fail';
    rows.push({
      check: rule.id + ':vendor-hosts-ngoai-prefix', limit: vendorBound ? 0 : 'audit', hits: vendorOut.length,
      ok: !vendorBound || vendorOut.length === 0, audit: !vendorBound, samples: uniqUrls(vendorOut, 10),
    });
    rows.push({ check: rule.id + ':vendor-known', limit: 'audit', hits: vendor.length - vendorOut.length, ok: true, audit: true, samples: [] });
    return rows;
  },

  'entry-no-src': (rule) => {
    const host = TEXTS.find((t) => t.file === 'index.html');
    if (!host) return [{ check: rule.id, limit: 'có index.html', hits: 0, ok: false, samples: ['bundle thiếu index.html'] }];
    const hits = [...host.text.matchAll(/["']\/src\//g)].length;
    return [{ check: rule.id, limit: 0, hits, ok: hits === 0, samples: hits ? ['index.html còn đường dẫn dev "/src/..."'] : [] }];
  },

  'entry-refs-exist': (rule) => {
    const host = TEXTS.find((t) => t.file === 'index.html');
    if (!host) return [{ check: rule.id, limit: 'có index.html', hits: 0, ok: false, samples: ['bundle thiếu index.html'] }];
    const missing = [];
    let checked = 0;
    for (const m of host.text.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)) {
      const raw = m[1];
      if (/^(?:https?:|data:|mailto:|#|\/\/)/.test(raw)) continue;
      checked += 1;
      const rel = decodeURIComponent(raw.split(/[?#]/)[0]);
      if (!existsSync(join(ROOT, rel))) missing.push('index.html → ' + raw);
    }
    return [{ check: rule.id, limit: 0, hits: missing.length, ok: missing.length === 0, note: 'đã kiểm ' + checked + ' tham chiếu nội', samples: missing.slice(0, Math.max(SAMPLES, 1)) }];
  },

  size: (rule) => {
    const own = biggestOf('own');
    const vendor = biggestOf('vendor');
    const overOwn = SIZES.filter((s) => scopeOf(s.file) === 'own' && s.bytes > SIZE_BUDGET.ownFileBytes);
    const overVendor = SIZES.filter((s) => scopeOf(s.file) === 'vendor' && s.bytes > SIZE_BUDGET.vendorFileBytes);
    return [
      { check: rule.id + ':total', limit: SIZE_BUDGET.totalBytes, hits: TOTAL_BYTES, ok: TOTAL_BYTES <= SIZE_BUDGET.totalBytes, note: 'files=' + SIZES.length, samples: [] },
      { check: rule.id + ':own-code-file', limit: SIZE_BUDGET.ownFileBytes, hits: own.bytes, ok: overOwn.length === 0, note: own.file, samples: overOwn.map((s) => s.file + ' = ' + s.bytes + ' B') },
      { check: rule.id + ':engine-chunk-file', limit: SIZE_BUDGET.vendorFileBytes, hits: vendor.bytes, ok: overVendor.length === 0, note: vendor.file, samples: overVendor.map((s) => s.file + ' = ' + s.bytes + ' B') },
    ];
  },

  'required-file': (rule) => channel.requiredFiles.map((f) => {
    const n = FILES.filter((x) => x === f || x.endsWith('/' + f)).length;
    return { check: rule.id + ':' + f, limit: 'phải có', hits: n, ok: !channel.submission || n >= 1, samples: n === 0 ? ['thiếu ' + f + ' trong bundle'] : [] };
  }),

  'vendor-shape': (rule) => {
    const chunks = TEXTS.filter((t) => VENDOR.chunkRe.test(t.file));
    if (chunks.length === 0) {
      return [{ check: rule.id, limit: 'audit', hits: 0, ok: true, audit: true, note: 'không có chunk vendor ⇒ mọi code là own, luật 0 áp dụng toàn bundle', samples: [] }];
    }
    return chunks.map((c) => ({
      check: rule.id + ':' + c.file, limit: 'là engine thật', hits: VENDOR.identityRe.test(c.text) ? 1 : 0,
      ok: VENDOR.identityRe.test(c.text), note: VENDOR.identityRe.test(c.text) ? 'dấu hiệu engine: có' : 'tự xưng vendor mà không phải engine', samples: [],
    }));
  },

  'forbidden-ext': (rule) => {
    const bound = rule.channels.includes(CHANNEL);
    const hits = bound ? FILES.filter((f) => rule.exts.includes(extOf(f))) : [];
    return [{ check: rule.id, limit: 0, hits: hits.length, ok: hits.length === 0, samples: hits.slice(0, Math.max(SAMPLES, 1)) }];
  },
};

// --------------------------------------------------------------------------- chạy + in báo cáo

const MARKS = { ok: 'ok  ', bad: 'FAIL', audit: 'AUDT', exempt: 'mien' };

/** Số THÔ cả bundle (không chia vùng) — để đối chiếu trực tiếp với lệnh grep trong SPEC §5.4/PC-15. */
const RAW_PROBES = [
  ['?debug', /\?debug/g], ['?level=', /\?level=/g], ['?seed=', /\?seed=/g], ['ad=mock', /ad=mock/g],
  ['fetch(', /\bfetch\s*\(/g], ['XMLHttpRequest', /XMLHttpRequest/g], ['WebSocket', /WebSocket/g], ['sendBeacon', /sendBeacon/g],
  ['https?://', URL_RE],
];

const ROWS = RULES.flatMap((rule) => {
  const handler = HANDLERS[rule.kind];
  if (!handler) throw new Error('luật không có handler: ' + rule.kind);
  return handler(rule).map((row) => ({ ...row, why: rule.why ?? '' }));
});

console.log('CHECK-BUNDLE ' + POSITIONAL[0] + '  channel=' + CHANNEL + '  submission=' + channel.submission);
console.log('files=' + FILES.length + '  total=' + TOTAL_BYTES + ' B  largest=' + BIGGEST.file + ' (' + BIGGEST.bytes + ' B)');
console.log('raw(cả bundle, không chia vùng): ' + RAW_PROBES.map(([label, re]) => label + '=' + countIn('all', re).hits).join('  '));
let bad = 0;
for (const row of ROWS) {
  // audit/exempt ĐƯA TRƯỚC ok: dòng vendor và dòng kênh dev vẫn phải in ra dấu (AUDT/mien) để
  // người đọc không lẫn "0 vi phạm" với "có hit nhưng được miễn luật" — không giấu số hit.
  const severity = row.audit ? 'audit' : row.exempt ? 'exempt' : row.ok ? 'ok' : 'bad';
  if (severity === 'bad') bad += 1;
  console.log('  ' + MARKS[severity] + ' ' + pad(row.check, 66) + ' limit=' + String(row.limit).padStart(14) + '  hits=' + String(row.hits).padStart(6) + (row.note ? '  (' + row.note + ')' : ''));
  for (const s of row.samples ?? []) console.log('         · ' + s);
}
console.log('KẾT QUẢ: ' + (bad === 0 ? 'PASS (0 vi phạm)' : 'FAIL (' + bad + ' vi phạm)'));
process.exit(bad === 0 ? 0 : 1);

function pad(s, n) { return s.length >= n ? s : s + ' '.repeat(n - s.length); }