#!/usr/bin/env python3
"""Append 1 dòng JSON vào board.jsonl an toàn khi nhiều agent chạy song song.
Dùng: python3 /data/youtube-playables/M11-Gap/board_post.py '{"agent":"R1",...}'
"""
import sys, json, os, fcntl
BOARD = "/data/youtube-playables/M11-Gap/board.jsonl"
row = json.loads(sys.argv[1])
with open(BOARD, "a", encoding="utf-8") as f:
    fcntl.flock(f, fcntl.LOCK_EX)
    f.write(json.dumps(row, ensure_ascii=False) + "\n")
print("posted")
