// src/context.ts — chia sẻ Match giua GameScene va HudScene (pattern M3 context).
import type { Match } from './core/match.ts'
import { createMatch } from './core/match.ts'

export const ctx: { match: Match | null } = { match: null }

/** Seed moi cho moi ca (TB-04 chi cam Math.random trong core/data — day o ngoai core, OK). */
export function freshSeed(): number {
  const dbg = new URLSearchParams(window.location.search).get('seed')
  if (dbg) return (Number(dbg) >>> 0) || 42
  return (Date.now() ^ ((Math.random() * 0x7fffffff) | 0)) >>> 0
}

export function newShift(): Match {
  ctx.match = createMatch(freshSeed())
  return ctx.match
}
