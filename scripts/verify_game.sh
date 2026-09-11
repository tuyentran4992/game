#!/usr/bin/env bash
# ============================================================
# verify_game.sh — Quality gates for a YT Playables Phaser game
# Rào ① type-check + test logic · Rào ② build + asset manifest
# Rào ③ bundle gate: zip dist ≤1.6MB + diff -r zip≡dist
# Usage: bash scripts/verify_game.sh <game-dir-relative>   (vd M2-Color-Sort)
#   (chạy từ /data/youtube-playables)
# Exit ≠ 0 nếu lỗi -> dùng làm gate trước khi bàn giao/nộp.
# ============================================================
set -u
GAME="$1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GAME_DIR="$ROOT/$GAME"
CODE_DIR="$GAME_DIR/game"
HASH_FMT='\033[1;36m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; RED='\033[0;31m'; NC='\033[0m'
echo -e "\n${HASH_FMT}===== VERIFY $GAME =====${NC}"

# ---------- Rào ①a : TYPE CHECK (tsc --noEmit) ----------
echo -e "\n${HASH_FMT}[1/5] Type check (tsc --noEmit)${NC}"
(cd "$CODE_DIR" && npx tsc --noEmit) 2>&1 | grep -v "npm\|deprecated\|^>" | head -40
if [ "${PIPESTATUS[0]}" != "0" ]; then
  echo -e "${RED}✗ TYPE CHECK FAIL — fix tsc errors (Rào ① đang chặn)${NC}"; exit 1
fi
echo -e "${GREEN}✓ type check PASS${NC}"

# ---------- Rào ①b : LOGIC TESTS (vitest) ----------
echo -e "\n${HASH_FMT}[2/5] Logic tests (vitest run)${NC}"
(cd "$CODE_DIR" && npx vitest run) 2>&1 | tail -8
if [ "${PIPESTATUS[0]}" != "0" ] || ! (cd "$CODE_DIR" && npx vitest run) 2>&1 | grep -q "passed"; then
  # re-run để grep chính xác (detect fail)
  if ! (cd "$CODE_DIR" && npx vitest run) 2>&1 | grep -qE "Test Files.*passed.*Tests.*passed"; then
    echo -e "${RED}✗ LOGIC TESTS FAIL${NC}"; exit 1
  fi
fi
echo -e "${GREEN}✓ logic tests PASS${NC}"

# ---------- Rào ②a : BUILD ----------
echo -e "\n${HASH_FMT}[3/5] Build (npm run build)${NC}"
(cd "$CODE_DIR" && npm run build) 2>&1 | tail -6
if [ "${PIPESTATUS[0]}" != "0" ]; then
  echo -e "${RED}✗ BUILD FAIL${NC}"; exit 1
fi
echo -e "${GREEN}✓ build PASS${NC}"

# ---------- Rào ②b : ASSET MANIFEST CHECK ----------
#  Mỗi `this.load.image/audio/spritesheet('key', 'file')` trong src phải có file tương ứng trong dist/raw
echo -e "\n${HASH_FMT}[4/5] Asset manifest check (code load keys vs raw files)${NC}"
RAW_DIR="$CODE_DIR/dist/raw"; [ -d "$RAW_DIR" ] || RAW_DIR="$CODE_DIR/dist"
load_hits=0; problem=0
while read -r key; do
  [ -z "$key" ] && continue
  load_hits=$((load_hits+1))
  if [ ! -e "$RAW_DIR/$key" ]; then
    echo -e "${YELLOW}  ⚠ load '$key' — KHÔNG có $RAW_DIR/$key (fallback geometric? check propt quá)${NC}"
    problem=$((problem+1))
  fi
done < <(grep -rhoE "this\\.load\\.(image|audio|spritesheet|bitmapFont)\\([^,]+,\\s*'[^']+'" "$CODE_DIR/src" 2>/dev/null | sed -E "s/.*,\\s*'([^']+)'.*/\\1/" | sort -u)
echo -e "  (quét $load_hits asset keys từ code vs raw files)"
if [ "$problem" -gt 0 ]; then
  echo -e "${YELLOW}⚠ có $problem asset load không khớp file raw — xem lại (không chặn nhưng cần chắc)${NC}"
else
  echo -e "${GREEN}✓ tất cả asset load keys đều có file${NC}"
fi

# ---------- Rào ③ : BUNDLE GATE — zip dist ≤1.6MB + zip ≡ dist ----------
#  Đóng gói y như bản nộp kênh (zip từ dist, giữ raw/ runtime assets — án lệ REPACK-2)
#  rồi đo budget + đối chiếu nội dung zip khớp dist nguyên trạng.
echo -e "\n${HASH_FMT}[5/5] Bundle gate (zip ≤1.6MB + diff -r zip≡dist)${NC}"
DIST_DIR="$CODE_DIR/dist"
if [ ! -d "$DIST_DIR" ] || [ ! -f "$DIST_DIR/index.html" ]; then
  echo -e "${RED}✗ BUNDLE GATE FAIL — không tìm thấy $DIST_DIR/index.html (build chưa ra dist?)${NC}"
  exit 1
fi
GATE_DIR=""
trap '[ -n "$GATE_DIR" ] && rm -rf "$GATE_DIR"' EXIT
GATE_DIR="$(mktemp -d /tmp/verify_bundle.XXXXXX)"
ZIP_PATH="$GATE_DIR/bundle.zip"
UNZIP_DIR="$GATE_DIR/unzipped"
LIMIT=1677721   # 1.6MB = 1.6 * 1024 * 1024 = 1,677,721.6 B → sàn

ZIP_EXIT=0
python3 - "$DIST_DIR" "$ZIP_PATH" <<'PYEOF' || ZIP_EXIT=$?
import os, sys, zipfile
src, dst = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
    for root, dirs, files in os.walk(src):
        dirs.sort(); files.sort()
        for name in files:
            path = os.path.join(root, name)
            zf.write(path, os.path.relpath(path, src))
PYEOF
if [ "$ZIP_EXIT" != "0" ]; then
  echo -e "${RED}✗ BUNDLE GATE FAIL — zip dist thất bại (python3 zipfile)${NC}"; exit 1
fi

ZIP_BYTES=$(stat -c%s "$ZIP_PATH")
if [ "$ZIP_BYTES" -gt "$LIMIT" ]; then
  echo -e "${RED}✗ BUNDLE GATE FAIL — zip ${ZIP_BYTES} B > giới hạn ${LIMIT} B (1.6MB). Cắt/tối ưu asset trước khi nộp.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ zip size OK: ${ZIP_BYTES} B ≤ ${LIMIT} B (1.6MB)${NC}"

mkdir -p "$UNZIP_DIR"
if ! unzip -q "$ZIP_PATH" -d "$UNZIP_DIR"; then
  echo -e "${RED}✗ BUNDLE GATE FAIL — giải nén zip lỗi (zip hỏng?)${NC}"
  exit 1
fi
DIFFS="$(diff -r "$DIST_DIR" "$UNZIP_DIR")"
if [ -n "$DIFFS" ]; then
  echo -e "${RED}✗ BUNDLE GATE FAIL — zip ≠ dist, khác lệch:${NC}"
  echo "$DIFFS" | head -20
  exit 1
fi
echo -e "${GREEN}✓ zip ≡ dist (diff -r: 0 khác lệch)${NC}"

echo -e "\n${GREEN}═════ VERIFY $GAME PASSED (type + logic + build + asset + bundle) ═════${NC}"
