// src/bridge.ts — @game/sdk pattern M3 (an lei BR-11): logic layer khong import SDK truc tiep,
// chi scene boot goi vao day. sendScore = tong tips; saveData `banhmi.best`.
import { sdk } from '@game/sdk'
import { sfx } from './audio.ts'

interface BanhMiSave {
  banhmi?: { best?: number }
}

let best = 0
let initialized = false

export const bridge = {
  async init(): Promise<void> {
    if (initialized) return
    initialized = true
    try {
      await sdk.initialize()
      const data = (await sdk.loadData()) as BanhMiSave | null
      best = data?.banhmi?.best ?? 0
    } catch (e) {
      console.warn('[bridge] init failed — cho offline:', e)
    }
    try {
      sdk.onAudioChange?.((enabled: boolean) => sfx.setMuted(!enabled))
    } catch {
      /* platform khong ho tro */
    }
  },

  get best(): number {
    return best
  },

  /** Cuoi ca: sendScore = tips, luu best = max qua cac ca (DATA-MODEL §6). */
  reportShift(tips: number): void {
    try {
      sdk.sendScore(tips)
    } catch (e) {
      console.warn('[bridge] sendScore:', e)
    }
    if (tips > best) {
      best = tips
      void sdk.saveData({ banhmi: { best } }).catch(() => undefined)
    }
  },

  /** Rewarded ad (HINT + continue). Mock local luon grant de cho duoc offline. */
  async showRewarded(placement: 'hint' | 'continue'): Promise<boolean> {
    try {
      return await sdk.showRewarded(placement)
    } catch (e) {
      console.warn('[bridge] rewarded:', e)
      return true // mock fallback
    }
  },

  /** Interstitial giua khach #4/#5 — SPEC §7 goi la "interstitial MOCK". */
  showInterstitial(): void {
    try {
      void sdk.showInterstitial()
    } catch (e) {
      console.warn('[bridge] interstitial:', e)
    }
  },

  ready(): void {
    try {
      sdk.gameReady()
    } catch {
      /* khong co platform */
    }
  },

  onPause(cb: () => void): void {
    try {
      sdk.onPause(cb)
    } catch {
      /* ok */
    }
  },

  onResume(cb: () => void): void {
    try {
      sdk.onResume(cb)
    } catch {
      /* ok */
    }
  }
}
