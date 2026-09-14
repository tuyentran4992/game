#!/usr/bin/env bash
# =============================================================================
# build-channels.sh — QUY TRÌNH BUILD 3 NỀN TẢNG (pack B5 §"Quy trình build").
#   ./scripts/build-channels.sh [--local] [--no-zip]
#
# Thứ tự CỨNG (bẫy lớn nhất: cả 3 mode vite đều ghi vào CÙNG dist/, ra lệnh cấm đổi outDir):
#   gate → build:ytgame    → copy file kênh → snapshot dist→build/ytgame    → check-bundle ytgame
#        → build:playgama  → copy file kênh → snapshot dist→build/playgama  → check-bundle playgama
#        → build:standalone (dist còn lại = bản dev, KHÔNG nộp, KHÔNG bị luật debug)
#        → zip từng bản nộp + diff -r zip ≡ thư mục nguồn (án lệ REPACK-2: giữ raw/ trong zip)
#   Một bước FAIL là dừng ở đó (set -e) — không cho đi tiếp tới bước đóng zip.
#
# --local: gọi THẲNG binary mà script npm gọi (tsc/vitest/vite) — dùng khi sandbox chặn `npm run`,
#          vẫn đúng 100% định nghĩa scripts trong package.json.
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."   # → thư mục game/

LOCAL=0
MAKE_ZIP=1
for arg in "$@"; do
  case "$arg" in
    --local) LOCAL=1 ;;
    --no-zip) MAKE_ZIP=0 ;;
    *) echo "đối số lạ: $arg (chỉ nhận --local|--no-zip)" >&2; exit 2 ;;
  esac
done

# --- bảng chạy lệnh: một script npm = một dòng bảng, không rải if -------------------------
# Cột "--local" là lệnh tương đương từng chữ theo package.json.
run_script() {
  local name="$1"; shift
  case "$name" in
    typecheck) if [ "$LOCAL" = 1 ]; then node node_modules/typescript/bin/tsc --noEmit "$@"; else npm run typecheck; fi ;;
    test:logic) if [ "$LOCAL" = 1 ]; then node node_modules/vitest/vitest.mjs run tests/logic tests/platform "$@"; else npm run test:logic; fi ;;
    *) echo "script '$name' chưa có lệnh --local tương đương — sửa bảng run_script()" >&2; exit 2 ;;
  esac
}
build_mode() {
  local mode="$1"
  echo "--- vite build --mode $mode"
  if [ "$LOCAL" = 1 ]; then node node_modules/vite/bin/vite.js build --mode "$mode"
  else npm run "build:$mode"; fi
}

# --- file cấu hình RIÊNG KÊNH: danh sách là DỮ LIỆU ở scripts/channels/<mode>.files -----------
# Copy vào GỐC bundle (dist/) TRƯỚC snapshot + check-bundle để luật required-file thấy được
# (án lệ M8 R2: bản playgama thiếu playgama-bridge-config.json là rớt game_ready). Kênh không có
# manifest ⇒ 0 file, không phải sửa script khi thêm kênh. File khai mà thiếu ⇒ FAIL tại chỗ.
copy_channel_files() {
  local mode="$1" manifest dir entry src dest
  manifest="scripts/channels/$mode.files"
  if [ ! -f "$manifest" ]; then
    echo "    kênh $mode: 0 file cấu hình thêm ($manifest không tồn tại)"
    return 0
  fi
  dir="scripts/channels/$mode"
  while IFS= read -r entry; do
    src="$dir/${entry%%=*}"
    dest="${entry#*=}"
    [ "$dest" = "$entry" ] && dest="$(basename "$src")"
    case "$dest" in
      '') echo "FAIL: dòng rỗng bất thường trong $manifest" >&2; exit 1 ;;
      */*) echo "FAIL: tên trong bundle phải là basename, không có đường dẫn: '$entry' ($manifest)" >&2; exit 1 ;;
    esac
    if [ ! -f "$src" ]; then
      echo "FAIL: $manifest khai '$entry' nhưng không có file nguồn $src" >&2; exit 1
    fi
    cp "$src" "dist/$dest"
    echo "    + $src → dist/$dest ($(stat -c%s "dist/$dest") B)"
  done < <(grep -Ev '^[[:space:]]*(#|$)' "$manifest")
}

# --- version: package.json là NGUỒN DUY NHẤT,_stamp_ vào 2 hồ sơ nộp ---------------------
stamp_version() {
  local v
  v=$(node -p "require('./package.json').version")
  echo "--- stamp version $v → metadata/metadata.json + games/paper-crease.yaml"
  node -e '
    const fs = require("node:fs");
    const v = process.argv[1];
    const m = "metadata/metadata.json";
    const j = JSON.parse(fs.readFileSync(m, "utf8"));
    j.version = v;
    fs.writeFileSync(m, JSON.stringify(j, null, 2) + "\n");
    const y = "../games/paper-crease.yaml";
    fs.writeFileSync(y, fs.readFileSync(y, "utf8").replace(/^version: .*$/m, "version: " + v));
  ' "$v"
}

# --- snapshot + cổng kiểm ---------------------------------------------------------------
snapshot() {
  local mode="$1"
  rm -rf "build/$mode"
  mkdir -p build
  cp -r dist "build/$mode"
  echo "    snapshot dist → build/$mode ($(find "build/$mode" -type f | wc -l) file, $(du -sb "build/$mode" | cut -f1) B)"
}
check() {
  local mode="$1"
  node tools/check-bundle.mjs "build/$mode" --channel "$mode"
}

# --- zip bản nộp + đối chiếu zip ≡ thư mục ----------------------------------------------
zip_channel() {
  local mode="$1"
  local date out
  date=$(date +%Y%m%d)
  out="build/paper-crease-$mode-$date.zip"
  rm -f "$out"
  python3 - "$mode" "$out" <<'PY'
import os, sys, zipfile
mode, dst = sys.argv[1], sys.argv[2]
src = os.path.join("build", mode)
with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
    for root, dirs, files in os.walk(src):
        dirs.sort(); files.sort()
        for name in dirs:
            # MỤC RỖNG cũng là một phần của cây nộp (public/raw/ đang trống mà vẫn phải có mặt
            # trong zip — REPACK-2 soi bằng `diff -r`, thiếu là FAIL). ZipInfo không timestamp
            # ⇒ mục thư mục deterministic (1980-01-01), chỉ file mới mang mtime nguồn.
            rel = os.path.relpath(os.path.join(root, name), src).replace(os.sep, "/")
            info = zipfile.ZipInfo(rel + "/")
            info.external_attr = 0o40755 << 16
            zf.writestr(info, "")
        for name in files:
            p = os.path.join(root, name)
            zf.write(p, os.path.relpath(p, src))   # giữ nguyên cây, kể cả raw/ (REPACK-2)
PY
  rm -rf /tmp/unchannel && mkdir -p /tmp/unchannel
  # MỞ khoá bằng python3 `zipfile` (công cụ đã dùng ở bước đóng zip) thay vì binary `unzip`:
  # môi trường build tối thiểu có thể không có `unzip` — rào REPACK-2 phải CHẠY ĐƯỢC, không SKIP.
  python3 -c 'import sys, zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])' "$out" "/tmp/unchannel"
  if diff -r "build/$mode" /tmp/unchannel > /tmp/unchannel.diff 2>&1; then
    echo "    zip $out = $(stat -c%s "$out") B · diff -r zip≡build/$mode: 0 khác lệch"
  else
    echo "    FAIL: zip ≠ thư mục nguồn:" >&2; head -20 /tmp/unchannel.diff >&2; exit 1
  fi
  rm -rf /tmp/unchannel /tmp/unchannel.diff
}

# --- chạy -------------------------------------------------------------------------------
echo "===== 1/5 cổng gate (typecheck + test:logic + gate-smell) ====="
run_script typecheck
run_script test:logic
node tools/gate-smell.mjs

stamp_version

echo "===== 2/5 ytgame: build → copy file kênh → snapshot → check ====="
build_mode ytgame
copy_channel_files ytgame
snapshot ytgame
check ytgame

echo "===== 3/5 playgama: build → copy file kênh → snapshot → check ====="
build_mode playgama
copy_channel_files playgama
snapshot playgama
check playgama

echo "===== 4/5 standalone (bản dev, còn lại trong dist/, không nộp) ====="
build_mode standalone

if [ "$MAKE_ZIP" = 1 ]; then
  echo "===== 5/5 zip 2 bản nộp + đối chiếu ====="
  zip_channel ytgame
  zip_channel playgama
else
  echo "===== 5/5 BỎ QUA zip (--no-zip) ====="
fi
echo "XONG: build/ytgame + build/playgama là 2 bản nộp; dist/ = bản standalone (dev)."
