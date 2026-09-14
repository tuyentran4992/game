#!/usr/bin/env python3
"""NIGHT RUN — chạy nhiều batch M11-Gap tự động qua đêm.

Luồng mỗi batch:
  1) TEST swarm (1a + 1b song song, nếu có prompt)
  2) CODE (1 tác giả)
  3) CỔNG máy (npm run gate) — đỏ thì tự sinh prompt fix từ log cổng, fix ≤3 vòng
  4) REVIEW 3 phiên song song (chỉ-đọc) — FAIL thì tự sinh prompt fix từ đúng các dòng FAIL, fix ≤2 vòng, gate lại, review lại 1 lần
  5) Ghi logs/NIGHT-<batch>.md + append logs/night.log; batch nào không cứu được ⇒ NIGHT-<batch>-NEEDS-HUMAN.md

Dùng: python3 harness/night_run.py B1b B1c B2 B3a B3b B5
Mọi số đo đi vào logs/metrics.jsonl qua claude_step.py (không đo tay).
"""
import json, os, re, subprocess, sys, time, datetime

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAME = os.path.join(BASE, "game")
LOG = os.path.join(BASE, "logs")
NIGHT = os.path.join(LOG, "night.log")
PY = sys.executable

def sh(cmd, cwd=None, timeout=3600, env=None):
    e = dict(os.environ); e.update(env or {})
    p = subprocess.run(cmd, cwd=cwd or BASE, shell=isinstance(cmd, str), env=e,
                       stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, timeout=timeout)
    return p.returncode, p.stdout

def log(msg):
    line = f"[{datetime.datetime.now(datetime.UTC).strftime('%F %T')}] {msg}"
    print(line, flush=True)
    with open(NIGHT, "a", encoding="utf-8") as f:
        f.write(line + "\n")

def step(batch, name, prompt, turns, mode="edit", timeout=2400):
    if not os.path.exists(os.path.join(BASE, "prompts", prompt)):
        log(f"  ! thiếu prompt {prompt} — bỏ qua bước {name}")
        return 1
    cmd = [PY, "harness/claude_step.py", "--batch", batch, "--step", name,
           "--prompt", prompt, "--max-turns", str(turns), "--mode", mode]
    if mode == "readonly":
        cmd += ["--pack", "harness/packs/review-general.md"]
    rc, out = sh(cmd, timeout=timeout)
    m = [l for l in out.splitlines() if l.startswith("[")]
    log(f"  {name}: rc={rc} " + (m[-1] if m else out.strip().splitlines()[-1][:140] if out.strip() else ""))
    return rc

def step_parallel(jobs, timeout=3000):
    """jobs = [(batch, name, prompt, turns, mode)] chạy song song."""
    procs = []
    for batch, name, prompt, turns, mode in jobs:
        if not os.path.exists(os.path.join(BASE, "prompts", prompt)):
            log(f"  ! thiếu prompt {prompt} — bỏ qua {name}"); continue
        cmd = [PY, "harness/claude_step.py", "--batch", batch, "--step", name,
               "--prompt", prompt, "--max-turns", str(turns), "--mode", mode]
        if mode == "readonly":
            cmd += ["--pack", "harness/packs/review-general.md"]
        procs.append((name, subprocess.Popen(cmd, cwd=BASE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)))
    for name, pr in procs:
        try:
            out, _ = pr.communicate(timeout=timeout)
        except subprocess.TimeoutExpired:
            pr.kill(); out = "TIMEOUT"; log(f"  {name}: TIMEOUT")
        last = [l for l in out.splitlines() if l.startswith("[")]
        log(f"  {name}: rc={pr.returncode} " + (last[-1][:160] if last else ""))

def cleanup_tmp():
    """Dọn script tạm mồ côi sau mỗi phiên review (bài học: fz*.js thoát ra ngoài ăn CPU 12h)."""
    try:
        subprocess.run(["bash", "harness/cleanup-tmp-scripts.sh"], cwd=BASE,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=60)
    except Exception:
        pass


def gate(batch):
    rc, out = sh("npm run gate", cwd=GAME, timeout=900)
    with open(os.path.join(LOG, f"{batch}-gate.log"), "w", encoding="utf-8") as f:
        f.write(out)
    ok = rc == 0
    log(f"  CỔNG {'PASS' if ok else 'FAIL'} (rc={rc})")
    return ok, out

FAIL_ROW = re.compile(r"^\|\s*([CAF]\d+)\s*\|\s*FAIL", re.I)

# Bộ review theo batch (tiết kiệm: batch render/art/build không cần 3 góc)
REVIEW_SET = {
    "B1b": ["3a-code", "3b-stress", "3c-arch"],
    "B1c": ["3a-code", "3b-stress", "3c-arch"],
    "B2":  ["3a-code", "3b-stress", "3c-arch"],
    "B3a": ["3a-code", "3b-stress"],
    "B3b": ["3a-code", "3b-stress"],
    "B4":  ["3a-code", "3b-stress"],
    "B5":  ["3a-code", "3b-stress"],
}

# Siết cho các batch cuối (anh chốt 14/09: đỡ tốn thời gian) — 1 vòng sửa, KHÔNG kiểm lại
REV_FIX_MAX = {"B3b": 1, "B4": 1, "B5": 1}
RECHECK = {"B3b": False, "B4": False, "B5": False}


def reviews_for(batch):
    return REVIEW_SET.get(batch, ["3a-code", "3b-stress", "3c-arch"])

def review_fails(batch):
    rows = []
    for name in reviews_for(batch):
        p = os.path.join(LOG, f"{batch}-{name}.log")
        if not os.path.exists(p):
            continue
        for line in open(p, encoding="utf-8", errors="replace"):
            s = line.strip()
            if FAIL_ROW.match(s):
                rows.append(f"[{name}] {s}")
    return rows

def make_fix_prompt(batch, rnd, kind):
    out = os.path.join(BASE, "prompts", f"{batch}-autofix-{kind}-{rnd}.md")
    if kind == "gate":
        g = os.path.join(LOG, f"{batch}-gate.log")
        tail = "\n".join(open(g, encoding="utf-8", errors="replace").read().splitlines()[-120:])
        body = f"""Cổng máy `npm run gate` của batch {batch} ĐANG ĐỎ. Output thật (cuối):
```
{tail}
```
Sửa cho cổng XANH. Chỉ sửa nguyên nhân gây đỏ (lỗi biên dịch, test đỏ, hoặc vi phạm gate-smell THẬT — mục "NỢ ĐÃ KHAI" thì bỏ qua)."""
    else:
        rows = review_fails(batch)
        body = ("Review độc lập báo FAIL đúng các mục sau (kèm bằng chứng sẵn). Sửa ĐÚNG các mục này, "
                "giữ nguyên thứ đã PASS:\n\n" + "\n".join(rows))
    open(out, "w", encoding="utf-8").write(f"""Bạn là dev TypeScript. **VÒNG TỰ SỬA** cho batch {batch} (đợt {rnd}).

{body}

LUẬT: chỉ sửa `game/src/**` + `game/tests/**` · KHÔNG đổi hợp đồng hàm công khai · KHÔNG đọc lan man (môi trường + hợp đồng đã ở system prompt) · KHÔNG commit/push · chạy `npm run gate` ĐÚNG 1 LẦN ở cuối rồi dán output thật.
THANG ƯU TIÊN khi sắp hết lượt: (1) typecheck XANH → (2) test XANH → (3) báo cáo ngắn.
BÁO CÁO: mỗi mục → file:dòng + 1 câu cách sửa · output gate · việc không làm được.
""")
    return os.path.basename(out)

def night_batch(batch):
    log(f"=== BATCH {batch} ===")
    t0 = time.time()
    # 1) test swarm
    jobs = []
    for half in ("1a-tests", "1b-tests"):
        pr = f"{batch}-{half}.md"
        if os.path.exists(os.path.join(BASE, "prompts", pr)):
            jobs.append((batch, half, pr, 90, "edit"))
    if jobs:
        log(f"BƯỚC TEST: {len(jobs)} con song song")
        step_parallel(jobs)
    else:
        pr = f"{batch}-1-tests.md"
        if os.path.exists(os.path.join(BASE, "prompts", pr)):
            step(batch, "1-tests", pr, 90)
        else:
            log("  ! không có prompt test — bỏ qua bước test")

    # 2) code
    done_code = step(batch, "2-code", f"{batch}-2-code.md", 90)

    # 3) gate + vòng tự sửa theo cổng
    ok, _ = gate(batch)
    rnd = 0
    while not ok and rnd < 3:
        rnd += 1
        fx = make_fix_prompt(batch, f"gate{rnd}", "gate")
        log(f"  tự sửa theo cổng đợt {rnd}: {fx}")
        step(batch, f"fix-gate{rnd}", fx, 90)
        ok, _ = gate(batch)

    # 4) review swarm
    rows = []
    if ok:
        step_parallel([(batch, n, f"{batch}-{n}.md", 30, "readonly") for n in reviews_for(batch)])
        cleanup_tmp()
        rows = review_fails(batch)
        log(f"  review FAIL: {len(rows)} mục")
        rnd = 0
        while rows and rnd < REV_FIX_MAX.get(batch, 2):
            rnd += 1
            fx = make_fix_prompt(batch, f"rev{rnd}", "review")
            log(f"  tự sửa theo review đợt {rnd}: {fx}")
            step(batch, f"fix-rev{rnd}", fx, 90)
            ok2, _ = gate(batch)
            if not ok2:
                fx2 = make_fix_prompt(batch, f"gate-after-rev{rnd}", "gate")
                step(batch, f"fix-gate-after-rev{rnd}", fx2, 90)
                gate(batch)
            if RECHECK.get(batch, True):
                step_parallel([(batch, n, f"{batch}-{n}.md", 30, "readonly") for n in reviews_for(batch)])
                rows = review_fails(batch)
                log(f"  review FAIL sau đợt {rnd}: {len(rows)} mục")
            else:
                log("  (cấu hình siết) KHÔNG kiểm lại sau khi sửa — các mục trên đã sửa, chưa xác nhận")
                break

    mins = (time.time() - t0) / 60
    summary = [f"# NIGHT — batch {batch}", f"- Thời gian: {mins:.1f} phút",
               f"- Cổng cuối: {'PASS' if ok else 'FAIL'}",
               f"- Review FAIL còn lại: {len(rows) if ok else 'n/a'}"]
    if ok and rows:
        summary += ["", "## Mục review còn FAIL (cần Hermes xử)", ""] + [f"- {r}" for r in rows]
    if not ok:
        summary += ["", "## CẦN NGƯỜI XỬ: cổng vẫn đỏ sau 3 vòng tự sửa", "",
                    "Xem `logs/%s-gate.log`." % batch]
    open(os.path.join(LOG, f"NIGHT-{batch}.md"), "w", encoding="utf-8").write("\n".join(summary) + "\n")
    if (not ok) or rows:
        open(os.path.join(LOG, f"NIGHT-{batch}-NEEDS-HUMAN.md"), "w", encoding="utf-8").write("\n".join(summary) + "\n")
    log(f"=== HẾT {batch}: {mins:.1f} phút · {'PASS' if ok else 'FAIL'} · review FAIL {len(rows) if ok else 'n/a'} ===")
    return ok, rows, mins

if __name__ == "__main__":
    batches = sys.argv[1:] or ["B1b"]
    log(f"##### NIGHT RUN bắt đầu: {batches} #####")
    report = []
    for b in batches:
        try:
            report.append((b,) + night_batch(b))
        except Exception as e:
            log(f"!!! lỗi ở batch {b}: {e}")
            report.append((b, False, [f"exception: {e}"], 0))
    log("##### TỔNG HỢP ĐÊM #####")
    for b, ok, rows, mins in report:
        log(f"  {b}: {'PASS' if ok else 'FAIL'} · {mins:.0f} phút · {len(rows)} mục review FAIL")
    open(os.path.join(LOG, "NIGHT-TONG-HOP.md"), "w", encoding="utf-8").write(
        "# NIGHT RUN — tổng hợp\n\n| batch | cổng | phút | mục review FAIL |\n|---|---|---|---|\n" +
        "\n".join(f"| {b} | {'PASS' if ok else 'FAIL'} | {mins:.0f} | {len(rows)} |" for b, ok, rows, mins in report) + "\n")
