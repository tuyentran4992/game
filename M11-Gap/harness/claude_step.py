#!/usr/bin/env python3
"""Chạy 1 bước Claude Code theo HARNESS.yaml + ghi metrics. In ra: METRICS {...}"""
import argparse, json, os, shlex, subprocess, sys, time, datetime
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAME = os.path.join(BASE, "game")
TEXT_KEYS = ("text",)

def load_harness():
    import yaml
    return yaml.safe_load(open(os.path.join(BASE, "HARNESS.yaml"), encoding="utf-8"))

def build_prompt_file(pack_path, rules_path, batch):
    """Ghép luật phiên + gói ngữ cảnh thành 1 file để bơm qua --append-system-prompt-file."""
    parts = []
    for p in (rules_path, pack_path):
        if p and os.path.exists(p):
            parts.append(open(p, encoding="utf-8").read())
    if not parts:
        return None
    d = os.path.join(BASE, "logs", "packs"); os.makedirs(d, exist_ok=True)
    out = os.path.join(d, f"{batch}-syspack.md")
    open(out, "w", encoding="utf-8").write("\n\n---\n\n".join(parts))
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--batch", required=True)
    ap.add_argument("--step", required=True)
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--variant", default=None)
    ap.add_argument("--model", default=None)
    ap.add_argument("--max-turns", type=int, default=None)
    ap.add_argument("--resume", default=None)
    ap.add_argument("--mode", default="edit", choices=["edit", "readonly"])
    ap.add_argument("--pack", default=None, help="đường dẫn gói ngữ cảnh (mặc định harness/packs/<batch>.md)")
    a = ap.parse_args()
    H = load_harness()
    vname = a.variant or H["default_variant"]
    V = H["variants"][vname]
    model = a.model or H["model"]
    maxt = a.max_turns or H["max_turns"].get(a.step.split("-")[-1], 60)
    pfile = os.path.join(BASE, "prompts", a.prompt)
    if not os.path.exists(pfile):
        sys.exit(f"thiếu prompt: {pfile}")
    pack = None
    if a.pack:
        cand = os.path.join(BASE, a.pack) if not os.path.isabs(a.pack) else a.pack
        pack = cand if os.path.exists(cand) else None
    elif V.get("pack"):
        cand = os.path.join(BASE, "harness", "packs", f"{a.batch}.md")
        pack = cand if os.path.exists(cand) else None
    rules = os.path.join(BASE, H["variants"][vname]["rules"]) if V.get("rules") else None
    syspack = build_prompt_file(pack, rules, a.batch)

    cmd = ["claude", "--bare", "-p", open(pfile, encoding="utf-8").read(),
           "--model", model, "--max-turns", str(maxt),
           "--output-format", "stream-json", "--verbose"]
    if syspack:
        cmd += ["--append-system-prompt-file", syspack]
    if V.get("tools", True) is not False and H.get("tools_disallow"):
        cmd += ["--disallowedTools", ",".join(H["tools_disallow"])]
    if a.resume:
        cmd += ["--resume", a.resume]
    if a.mode == "readonly":
        cmd += ["--allowedTools", "Read,Grep,Glob,Bash", "--disallowedTools", "Edit,Write,NotebookEdit"]

    env = dict(os.environ)
    env["PATH"] = "/data/.local/share/pnpm/bin:" + env.get("PATH", "")
    creds = os.environ.get("CLAUDE_ENV_FILE", "/data/scripts/claude-env.sh")
    if os.path.exists(creds):
        # source trong shell con để không phụ thuộc env của tiến trình gọi (shell nền không có credential)
        cmd = ["bash", "-c", f"source {shlex.quote(creds)} >/dev/null 2>&1; exec " + shlex.join(cmd)]
    logs = os.path.join(BASE, "logs"); os.makedirs(logs, exist_ok=True)
    stream_p = os.path.join(logs, f"{a.batch}-{a.step}.stream.jsonl")
    text_p = os.path.join(logs, f"{a.batch}-{a.step}.log")
    t0 = time.time(); turns = 0
    u = dict(input_tokens=0, output_tokens=0, cache_read=0, cache_creation=0)
    res = {}          # dòng 'result': nguồn số CHÍNH (usage luỹ kế, num_turns, cost, ttft)
    turn_ctx = []     # ngữ cảnh mỗi lượt (input_tokens của từng assistant msg)
    rc = None; err = None
    with open(stream_p, "w", encoding="utf-8") as sf, open(text_p, "w", encoding="utf-8") as tf:
        pr = subprocess.Popen(cmd, cwd=GAME, stdout=sf, stderr=subprocess.STDOUT, env=env, start_new_session=True)
        try:
            rc = pr.wait(timeout=float(os.environ.get("STEP_TIMEOUT", 3600)))
        except subprocess.TimeoutExpired:
            os.killpg(pr.pid, 9); rc = 124; err = "timeout"
        dur = time.time() - t0
    # parse stream: usage từng lượt + text người đọc được
    with open(stream_p, encoding="utf-8", errors="replace") as sf, open(text_p, "w", encoding="utf-8") as tf:
        for line in sf:
            try: o = json.loads(line)
            except Exception: continue
            m = o.get("message") or {}
            us = m.get("usage") or {}
            if us and o.get("type") == "assistant":
                turns += 1
                turn_ctx.append(us.get("input_tokens", 0) or 0)
            for c in (m.get("content") or []) if isinstance(m.get("content"), list) else []:
                if c.get("type") == "text" and c.get("text", "").strip():
                    tf.write(c["text"].strip() + "\n")
                elif c.get("type") == "tool_use":
                    tf.write(f"\n[tool] {c.get('name')}: {str(c.get('input'))[:180]}\n")
            if o.get("type") == "result":
                res = o
                tf.write(f"\n[result] is_error={o.get('is_error')} num_turns={o.get('num_turns')} "
                         f"duration_ms={o.get('duration_ms')} cost_usd={o.get('total_cost_usd')}\n")
    ru = (res.get("usage") or {})
    if ru:
        u = dict(input_tokens=ru.get("input_tokens", 0) or 0,
                 output_tokens=ru.get("output_tokens", 0) or 0,
                 cache_read=ru.get("cache_read_input_tokens", 0) or 0,
                 cache_creation=ru.get("cache_creation_input_tokens", 0) or 0)
    row = dict(ts=datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ"), variant=vname, batch=a.batch,
               step=a.step, model=model, max_turns=maxt,
               turns=res.get("num_turns") or turns, duration_s=round(dur, 1),
               api_ms=res.get("duration_api_ms"), ttft_ms=res.get("ttft_ms"),
               cost_usd=round(res.get("total_cost_usd") or 0, 4),
               session_id=res.get("session_id"), resume_from=a.resume,
               ctx_per_turn_avg=round(sum(turn_ctx)/len(turn_ctx)) if turn_ctx else None,
               ctx_per_turn_max=max(turn_ctx) if turn_ctx else None,
               syspack=batch_basename(syspack), exit=rc, timeout=err, **u)
    with open(os.path.join(BASE, "logs", "metrics.jsonl"), "a", encoding="utf-8") as mf:
        mf.write(json.dumps(row, ensure_ascii=False) + "\n")
    print("METRICS " + json.dumps(row, ensure_ascii=False))
    print(f"[{a.batch}/{a.step}] {row['turns']} lượt · {row['duration_s']}s · vào {row['input_tokens']:,} "
          f"· cache {row['cache_read']:,} · ra {row['output_tokens']:,} · ${row['cost_usd']} · {err or 'ok'}")
    return 0 if rc == 0 else 1

def batch_basename(p):
    return os.path.basename(p) if p else None

if __name__ == "__main__":
    sys.exit(main())
