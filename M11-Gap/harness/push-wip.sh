#!/usr/bin/env bash
# Chờ batch B2 kết thúc rồi đẩy 1 bản WIP lên nhánh (CHỈ M11-Gap — không đụng việc M10 của anh).
set -u
REPO=/data/youtube-playables
BASE=$REPO/M11-Gap
BRANCH=m11/b1a-core-geometry
LOG=$BASE/logs/push-wip.log
cd "$REPO" || exit 1

echo "[$(date -u '+%F %T')] chờ B2 xong…" >> "$LOG"
for i in $(seq 1 240); do          # tối đa 60 phút
  [ -f "$BASE/logs/NIGHT-B2.md" ] && break
  sleep 15
done
if [ ! -f "$BASE/logs/NIGHT-B2.md" ]; then echo "[$(date -u '+%F %T')] B2 chưa xong sau 60 phút — bỏ" >> "$LOG"; exit 1; fi

# ảnh chụp: chỉ thêm M11-Gap (M10 đang sửa dở của anh KHÔNG bị đụng)
git add M11-Gap >> "$LOG" 2>&1
n_files=$(git diff --cached --name-only | wc -l)
echo "[$(date -u '+%F %T')] staged $n_files file (chỉ M11-Gap)" >> "$LOG"
git -c user.name=tuyentran4992 -c user.email=tuyentran4992@users.noreply.github.com commit -q \
  -m "M11 WIP (đang chạy đêm): B1a lõi hình học 213 test · B1b levelState+progression (0 review FAIL) · B1c economy/save/records/telemetry/i18n 361 test (10 mục review treo) · B2 platform adapters · harness SSOT + asset giấy procedural (8 skin/14 album/6 badge/icon/preview) + 8 SFX numpy + prompt/ledger cho 7 batch" >> "$LOG" 2>&1
sha=$(git rev-parse --short HEAD)
TOKEN=$(cat /data/scripts/gh_token.txt)
git push "https://x-access-token:${TOKEN}@github.com/tuyentran4992/game.git" HEAD:${BRANCH} 2>&1 | sed "s/$TOKEN/***/g" >> "$LOG"
echo "[$(date -u '+%F %T')] pushed $sha → $BRANCH" >> "$LOG"
