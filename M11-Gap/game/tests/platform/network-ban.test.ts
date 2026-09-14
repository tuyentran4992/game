// ============================================================================
// Pattern: Machine Gate (cổng kiểm bằng máy — pack B2 §7, PC-15 "cứng, không ngoại lệ")
// TRÁCH NHIỆM: chứng minh game không có đường ra mạng, bằng HAI đường:
//   (A) TEXT — quét THÔ mọi src/**/*.ts tìm 8 chữ ký API mạng, KỂ CẢ comment. Bài học ngược
//       B1a: gate-smell phải strip comment vì JSDoc từng bị bắt oan; ở đây TA CỐT bắt cả
//       comment, vì một URL hay một dòng `fetch(...)` bị comment tạm vẫn là thứ phải sạch
//       khỏi bundle nộp (pack §7: "kể cả trong comment", không có ngoại lệ nào).
//   (B) RUNTIME — boot null adapter + 5 lượt vòng lặp màn với globalThis.fetch bị thay bằng
//       hàm GHI LẠI ⇒ 0 lời gọi được ghi (TC-NET-05 đi đường khác, bắt cả code động sinh).
// Quét thêm (chống hồi quy ADR-01): src/logic/** không được import/đọc phaser · @game/sdk ·
//   platform · window · document. PHẦN NÀY CÓ strip comment — JSDoc tầng logic đang kể tên
//   cái bị cấm (src/logic/economy.ts:5 "tầng platform đọc file rồi bơm vào đây") nên quét
//   text thô là bắt oan; luật cấm là về CODE.
// RÀNG BUỘC: môi trường node (pack §8). Đọc source bằng `import.meta.glob(..., '?raw')` của
//   vite — KHÔNG dùng node:fs (tsconfig đặt types: [] ⇒ không có @types/node, mọi lệnh import
//   'node:*' thành lỗi typecheck mà tầng code không sửa được). 0 mạng thật, 0 browser.
// TÊN chốt ở test này cho ca runtime: src/platform/nullAdapter.ts :: createNullAdapter().
// ============================================================================

import { describe, expect, it } from 'vitest';
// Tên chốt ở test này (pack B2 §2: nullAdapter.ts = Null Object "standalone: localStorage, không ad").
// Import ĐỘNG ngay trong case runtime — các case quét text phải CHẠY THẬT (xanh, vì src chưa có
// code mạng) thay vì chết cả file; file vẫn ĐỎ ở đúng case runtime cho tới khi có adapter.
import { installFetchRecorder, runScreenLoops } from './helpers/fakes';
import type { AnyAdapter } from './helpers/fakes';

declare global {
  interface ImportMeta {
    glob(pattern: string, options: Record<string, unknown>): Record<string, string>;
  }
}

// Toàn bộ file .ts dưới src, nội dung THÔ, khoá là đường dẫn gốc-project. import.meta.glob được
// vite biến thành object tĩnh lúc transform ⇒ test đọc được source mà không cần fs.
// Khai báo tối thiểu cho ImportMeta.glob: tsconfig đặt types: [] nên KHÔNG có vite/client.
const TS_SOURCE_FILES: Record<string, string> = import.meta.glob('/src/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Số file tối thiểu máy quét PHẢI thấy — chống "0 kết quả vì quét hụt thư mục rỗng". */
const MIN_SRC_FILES = 20;
/** Tiền tố đường dẫn của tầng logic thuần (ADR-01). */
const LOGIC_PREFIX = '/src/logic/';

type Ban = { readonly label: string; readonly pattern: RegExp };
type Hit = { readonly where: string; readonly text: string };

/** Chữ ký API mạng cấm tuyệt đối trong src (pack B2 §7, nguyên văn danh sách). */
const NETWORK_BANS: readonly Ban[] = [
  { label: 'fetch(', pattern: /\bfetch\s*\(/ },
  { label: 'XMLHttpRequest', pattern: /\bXMLHttpRequest\b/ },
  { label: 'WebSocket | EventSource | sendBeacon | importScripts', pattern: /\b(WebSocket|EventSource|sendBeacon|importScripts)\b/ },
  { label: 'navigator.connection', pattern: /\bnavigator\.connection\b/ },
  { label: 'URL http(s)://', pattern: /https?:\/\// },
];

/** ADR-01: lõi logic cấm biết nền tảng (chỉ tính CODE, đã strip comment). */
const LOGIC_BANS: readonly Ban[] = [
  { label: 'import phaser', pattern: /from\s+['"]phaser/ },
  { label: 'import @game/sdk', pattern: /['"]@game\/sdk['"]/ },
  { label: 'import platform/', pattern: /['"][^'"]*platform(\/|['"])/ },
  { label: 'window', pattern: /\bwindow\b/ },
  { label: 'document', pattern: /\bdocument\b/ },
];

function filesUnder(prefix: string): string[] {
  return Object.keys(TS_SOURCE_FILES).filter((path) => path.startsWith(prefix));
}

/** Trả comment về khoảng trắng NHƯNG giữ số dòng để `where:line` vẫn chỉ đúng chỗ. */
function withoutComments(source: string): string {
  const blank = (chunk: string): string => chunk.replace(/[^\n]/g, ' ');
  return source
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, blank))
    .join('\n');
}

function scan(paths: readonly string[], pattern: RegExp, stripComments: boolean): Hit[] {
  const hits: Hit[] = [];
  for (const path of paths) {
    const raw = TS_SOURCE_FILES[path];
    const lines = (stripComments ? withoutComments(raw) : raw).split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      if (pattern.test(lines[i])) {
        hits.push({ where: path.slice(1) + ':' + (i + 1), text: lines[i].trim().slice(0, 100) });
      }
    }
  }
  return hits;
}

function report(hits: readonly Hit[]): string {
  return hits.length + ' noi vi pham -> ' + hits.map((hit) => hit.where + ' [' + hit.text + ']').join(' | ');
}

describe('PC-15 cổng TEXT: src/**/*.ts không chứa chữ ký API mạng (kể cả comment)', () => {
  it.each(NETWORK_BANS)('%label ⇒ 0 kết quả', ({ label, pattern }) => {
    const hits = scan(filesUnder('/src/'), pattern, false);
    expect(hits, label + ': ' + report(hits)).toEqual([]);
  });

  it('máy quét không rỗng: thấy >= ' + MIN_SRC_FILES + ' file .ts trong src (0 kết quả ở trên là thật)', () => {
    expect(filesUnder('/src/').length).toBeGreaterThanOrEqual(MIN_SRC_FILES);
    expect(filesUnder(LOGIC_PREFIX).length).toBeGreaterThanOrEqual(MIN_SRC_FILES);
  });
});

describe('ADR-01: src/logic/** là logic thuần', () => {
  it('0 import phaser / @game/sdk / platform, 0 tham chiếu window / document trong CODE', () => {
    const found: string[] = [];
    for (const ban of LOGIC_BANS) {
      for (const hit of scan(filesUnder(LOGIC_PREFIX), ban.pattern, true)) {
        found.push(ban.label + ' @ ' + hit.where + ' [' + hit.text + ']');
      }
    }
    expect(found, found.length + ' noi: ' + found.join(' | ')).toEqual([]);
  });
});

describe('PC-15 cổng RUNTIME: TC-NET-05 bằng đường khác (không chỉ đọc text)', () => {
  it('boot null adapter + 5 lượt vòng lặp màn ⇒ 0 lời gọi fetch bị ghi lại', async () => {
    // src/platform/nullAdapter.ts CHƯA tồn tại ⇒ case NÀY là chỗ đỏ có chủ đích.
    const { createNullAdapter } = await import('../../src/platform/nullAdapter');
    const recorder = installFetchRecorder();
    try {
      const adapter: AnyAdapter = createNullAdapter();
      // pack §3 + A6: không có cổng hỏi "có ad không" — standalone báo hết ad ngay trong kết quả gọi
      expect(await adapter.ads.showRewarded('hint')).toEqual({ status: 'unavailable', place: 'hint' });
      await runScreenLoops(adapter, 5); // mọi promise phải settle — không được treo (PC-20)
      expect(recorder.called, 'goi mang that: ' + recorder.called.join(', ')).toEqual([]);
    } finally {
      recorder.restore();
    }
  });
});
