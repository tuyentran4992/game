import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
const siteDir = path.join(rootDir, '_site');

console.log('🚀 [Game Factory] Bắt đầu đóng gói Game Hub Portal...');

// 1. Tạo thư mục _site sạch
if (fs.existsSync(siteDir)) {
  fs.rmSync(siteDir, { recursive: true, force: true });
}
fs.mkdirSync(siteDir, { recursive: true });

// 2. Build và copy M1 (Buzz Blitz)
console.log('📦 [1/3] Đang build game M1 (Buzz Blitz)...');
try {
  execSync('pnpm --filter buzz-blitz build', { stdio: 'inherit', cwd: rootDir });
  const m1Dist = path.join(rootDir, 'M1-Rescue-Dodge', 'game', 'dist');
  const m1Dest = path.join(siteDir, 'm1');
  if (fs.existsSync(m1Dist)) {
    fs.cpSync(m1Dist, m1Dest, { recursive: true });
    console.log('✅ Đã copy M1 vào _site/m1');
  }
} catch (err) {
  console.error('⚠️ Không thể build M1 qua pnpm, thử copy dist hiện tại nếu có...', err.message);
  const m1Dist = path.join(rootDir, 'M1-Rescue-Dodge', 'game', 'dist');
  if (fs.existsSync(m1Dist)) {
    fs.cpSync(m1Dist, path.join(siteDir, 'm1'), { recursive: true });
    console.log('✅ Đã copy dist M1 có sẵn vào _site/m1');
  }
}

// 3. Copy M2 (Neon Sort) nếu có
console.log('📦 [2/3] Kiểm tra game M2 (Neon Sort)...');
const m2Dist = path.join(rootDir, 'M2-Color-Sort', 'game', 'dist');
if (fs.existsSync(m2Dist)) {
  fs.cpSync(m2Dist, path.join(siteDir, 'm2'), { recursive: true });
  console.log('✅ Đã copy M2 vào _site/m2');
}

// 4. Copy M3 (Juicy Merge) nếu có
console.log('📦 [3/3] Kiểm tra game M3 (Juicy Merge)...');
const m3Dist = path.join(rootDir, 'M3-Juicy-Merge', 'game', 'dist');
if (fs.existsSync(m3Dist)) {
  fs.cpSync(m3Dist, path.join(siteDir, 'm3'), { recursive: true });
  console.log('✅ Đã copy M3 vào _site/m3');
}

// 5. Tạo file index.html cho trang Game Hub Portal
console.log('🎨 [4/4] Đang tạo giao diện Game Hub Portal (index.html)...');
const portalHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Game Factory — Playable Games Showcase & Portal</title>
  <meta name="description" content="Danh mục game playable đa nền tảng tối ưu cho YouTube Playables, Playgama, Reddit và Mobile Web.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0A0E17;
      --card-bg: rgba(18, 24, 38, 0.75);
      --card-border: rgba(255, 255, 255, 0.1);
      --text-main: #F8FAFC;
      --text-muted: #94A3B8;
      --primary: #FF9F1C;
      --primary-glow: rgba(255, 159, 28, 0.35);
      --neon-blue: #38BDF8;
      --neon-purple: #A855F7;
      --neon-green: #10B981;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg);
      background-image: 
        radial-gradient(at 0% 0%, rgba(56, 189, 248, 0.12) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(168, 85, 247, 0.12) 0px, transparent 50%),
        radial-gradient(at 50% 50%, rgba(255, 159, 28, 0.06) 0px, transparent 60%);
      background-attachment: fixed;
      color: var(--text-main);
      font-family: 'Plus Jakarta Sans', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2.5rem 1.25rem 4rem;
    }

    .container {
      width: 100%;
      max-width: 1100px;
    }

    /* Header */
    header {
      text-align: center;
      margin-bottom: 3.2rem;
    }

    .studio-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(12px);
      padding: 0.45rem 1.1rem;
      border-radius: 9999px;
      font-family: 'Outfit', sans-serif;
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--neon-blue);
      margin-bottom: 1.2rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--neon-green);
      box-shadow: 0 0 10px var(--neon-green);
      animation: pulse-dot 2s infinite ease-in-out;
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }

    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: clamp(2.2rem, 5vw, 3.6rem);
      font-weight: 900;
      line-height: 1.15;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, #FFFFFF 30%, #CBD5E1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.85rem;
    }

    .subtitle {
      font-size: 1.05rem;
      color: var(--text-muted);
      max-width: 640px;
      margin: 0 auto;
      line-height: 1.6;
    }

    /* Game Grid */
    .game-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.8rem;
    }

    /* Game Card */
    .game-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 1.5rem;
      padding: 1.8rem;
      backdrop-filter: blur(16px);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }

    .game-card:hover {
      transform: translateY(-6px);
      border-color: rgba(255, 255, 255, 0.25);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5), 0 0 30px -10px var(--card-glow, rgba(56, 189, 248, 0.2));
    }

    .game-card.featured {
      --card-glow: var(--primary-glow);
      border-color: rgba(255, 159, 28, 0.4);
      background: linear-gradient(180deg, rgba(255, 159, 28, 0.08) 0%, rgba(18, 24, 38, 0.85) 40%);
    }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.2rem;
    }

    .game-icon-box {
      width: 64px;
      height: 64px;
      border-radius: 1.1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.2rem;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: inset 0 2px 6px rgba(255, 255, 255, 0.15);
    }

    .badge-tag {
      font-family: 'Outfit', sans-serif;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text-muted);
    }

    .badge-tag.highlight {
      background: rgba(255, 159, 28, 0.18);
      border-color: rgba(255, 159, 28, 0.5);
      color: #FDBA74;
    }

    .badge-tag.live {
      background: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.4);
      color: #6EE7B7;
    }

    .game-title {
      font-family: 'Outfit', sans-serif;
      font-size: 1.55rem;
      font-weight: 800;
      margin-bottom: 0.4rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .game-meta {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-bottom: 0.9rem;
      font-weight: 500;
    }

    .game-desc {
      font-size: 0.93rem;
      color: #CBD5E1;
      line-height: 1.55;
      margin-bottom: 1.4rem;
      flex-grow: 1;
    }

    .tags-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      margin-bottom: 1.6rem;
    }

    .tag-chip {
      font-size: 0.74rem;
      font-weight: 600;
      color: #94A3B8;
      background: rgba(255, 255, 255, 0.05);
      padding: 0.25rem 0.6rem;
      border-radius: 0.4rem;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .play-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.55rem;
      width: 100%;
      padding: 0.95rem 1.4rem;
      border-radius: 0.9rem;
      font-family: 'Outfit', sans-serif;
      font-size: 1.05rem;
      font-weight: 800;
      text-decoration: none;
      transition: all 0.25s ease;
      cursor: pointer;
      border: none;
    }

    .play-btn.primary {
      background: linear-gradient(135deg, #FF9F1C 0%, #F59E0B 100%);
      color: #1E1202;
      box-shadow: 0 4px 18px var(--primary-glow);
    }

    .play-btn.primary:hover {
      background: linear-gradient(135deg, #FFA933 0%, #D97706 100%);
      box-shadow: 0 6px 24px rgba(255, 159, 28, 0.55);
      transform: scale(1.02);
    }

    .play-btn.secondary {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: var(--text-main);
    }

    .play-btn.secondary:hover {
      background: rgba(255, 255, 255, 0.14);
      border-color: rgba(255, 255, 255, 0.3);
      transform: scale(1.02);
    }

    /* Footer */
    footer {
      margin-top: 4.5rem;
      text-align: center;
      color: #64748B;
      font-size: 0.85rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 2rem;
      width: 100%;
      max-width: 1100px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="studio-badge">
        <span class="status-dot"></span>
        Game Factory · Playable Games Hub
      </div>
      <h1>Playable Games Showcase</h1>
      <p class="subtitle">Trang trải nghiệm trực tiếp các tựa game Playable đa nền tảng tối ưu cho YouTube Playables, Playgama, Reddit và Mobile Web.</p>
    </header>

    <main class="game-grid">
      <!-- M1: Buzz Blitz -->
      <article class="game-card featured">
        <div class="card-top">
          <div class="game-icon-box" style="background: rgba(255, 159, 28, 0.15); border-color: rgba(255, 159, 28, 0.35);">
            🐱
          </div>
          <span class="badge-tag highlight">Stage-Based Clear ⭐</span>
        </div>
        <h2 class="game-title">M1 · Buzz Blitz</h2>
        <p class="game-meta">Rescue Dodge · Portrait 9:16 · Phaser 4</p>
        <p class="game-desc">
          Một chạm né bầy ong hung hãn để bảo vệ mèo cưng! Cấu trúc 3 Stage (30 Level), kẻ thù đa dạng gồm Ong Đỏ tốc độ, Ong Lượn Zigzag và Ong Săn Mồi Stalker ngắm bắn laser. Hệ thống đánh giá 1-3 sao & màn hình Victory hoàn chỉnh.
        </p>
        <div class="tags-list">
          <span class="tag-chip">🎮 3 Stages (30 Lvs)</span>
          <span class="tag-chip">⭐ Star Rating</span>
          <span class="tag-chip">🎯 Stalker Bee</span>
          <span class="tag-chip">🌀 Zigzag Bee</span>
          <span class="tag-chip">📺 YouTube Ready</span>
        </div>
        <a href="./m1/" class="play-btn primary" id="play-m1">
          Chơi M1 (Buzz Blitz) ➔
        </a>
      </article>

      <!-- M2: Neon Color Sort -->
      <article class="game-card">
        <div class="card-top">
          <div class="game-icon-box" style="background: rgba(56, 189, 248, 0.15); border-color: rgba(56, 189, 248, 0.35);">
            🧪
          </div>
          <span class="badge-tag live">Playable Demo</span>
        </div>
        <h2 class="game-title">M2 · Neon Sort</h2>
        <p class="game-meta">Liquid Puzzle · Portrait 9:16 · Phaser 4</p>
        <p class="game-desc">
          Xếp chất lỏng neon cùng màu vào các ống nghiệm phát sáng. Trò chơi giải đố thư giãn với cơ chế chuyển chất lỏng mượt mà và giao diện Cyberpunk rực rỡ.
        </p>
        <div class="tags-list">
          <span class="tag-chip">🧩 Physics Sort</span>
          <span class="tag-chip">✨ Neon Glow</span>
          <span class="tag-chip">💆 Relaxing</span>
          <span class="tag-chip">📱 Mobile Friendly</span>
        </div>
        <a href="./m2/" class="play-btn secondary" id="play-m2">
          Chơi M2 (Neon Sort) ➔
        </a>
      </article>

      <!-- M3: Juicy Merge -->
      <article class="game-card">
        <div class="card-top">
          <div class="game-icon-box" style="background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.35);">
            🍉
          </div>
          <span class="badge-tag live">Cross-Platform</span>
        </div>
        <h2 class="game-title">M3 · Juicy Merge</h2>
        <p class="game-meta">Fruit Pop · Physics Puzzle · Universal SDK</p>
        <p class="game-desc">
          Trò chơi hợp nhất hoa quả nảy tưng bừng theo phong cách Suika Game. Tích hợp Universal SDK chạy mượt mà trên Reddit Devvit, Playgama và Web.
        </p>
        <div class="tags-list">
          <span class="tag-chip">🍉 Fruit Merge</span>
          <span class="tag-chip">⚙️ Matter.js</span>
          <span class="tag-chip">🚀 Reddit Devvit</span>
          <span class="tag-chip">🌐 Playgama</span>
        </div>
        <a href="./m3/" class="play-btn secondary" id="play-m3">
          Chơi M3 (Juicy Merge) ➔
        </a>
      </article>
    </main>

    <footer>
      <p>© 2026 Game Factory. Built with Phaser & TypeScript. Single Source, Multi-Platform Architecture.</p>
    </footer>
  </div>
</body>
</html>
`;

fs.writeFileSync(path.join(siteDir, 'index.html'), portalHtml, 'utf8');
console.log('🎉 Hoàn tất! Đã xuất bản toàn bộ Game Hub Portal vào thư mục: _site/');
