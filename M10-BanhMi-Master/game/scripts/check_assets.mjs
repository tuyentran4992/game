// TB-03 script: so sha manifest vs file that. Chay: node scripts/check_assets.mjs
import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'

const dir = new URL('..', import.meta.url).pathname // game/
const root = new URL('../..', import.meta.url).pathname // M10-BanhMi-Master/
const manifest = JSON.parse(readFileSync(root + 'assets/manifest.json', 'utf8'))

let ok = 0
const bad = []
const miss = []
let tot = 0
for (const [key, e] of Object.entries(manifest.files)) {
  const candidates = [dir + 'public/' + e.file, root + 'assets/' + key + '.png', dir + e.file]
  const p = candidates.find((c) => existsSync(c))
  if (!p) { miss.push(e.file); continue }
  const buf = readFileSync(p)
  const sha = createHash('sha256').update(buf).digest('hex')
  if (sha.startsWith(e.sha) && buf.length === e.bytes) { ok++; tot += buf.length }
  else bad.push(`${key}: sha=${sha.startsWith(e.sha) ? 'OK' : 'MISMATCH'} bytes=${buf.length}/${e.bytes}`)
}
console.log(`manifest key khop: ${ok}/${Object.keys(manifest.files).length}`)
console.log(`tong bytes: ${(tot / 1048576).toFixed(3)}MB | gate TB-03 <4MB: ${tot < 4 * 1048576 ? 'DAT' : 'KHONG DAT'}`)
if (miss.length) console.log('THIEU FILE:', miss.join(', '))
if (bad.length) console.log('LECH:', bad.join(' ; '))
process.exit(ok === Object.keys(manifest.files).length && !miss.length && !bad.length ? 0 : 1)
