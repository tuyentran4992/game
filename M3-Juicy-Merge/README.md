# 🍉 Juicy Merge — Fruit Drop & Physics Merge Puzzle

Welcome to **Juicy Merge**, an interactive physics-based fruit merge puzzle game built natively for Reddit communities! 

---

## 🌟 App Overview

### What is Juicy Merge?
**Juicy Merge** is a casual, engaging physics puzzle game inspired by the popular Suika / watermelon merge mechanics. Players aim and drop cute kawaii fruits into a container. When two identical fruits collide, they merge into a bigger, higher-tier fruit with satisfying animations and sound effects. The goal is to create combos, unlock the giant Watermelon, and score as high as possible without overflowing the container past the danger line!

### Who is it for?
- **Subreddit Communities & Moderators:** Perfect for community building, weekly competitions, and engaging subreddit members with interactive posts.
- **Reddit Players:** Anyone looking for a relaxing, quick-to-play, and highly addictive puzzle game directly in their Reddit feed on both Desktop and Mobile (iOS & Android).

### Critical Operational Notes & Privacy
- **Native Devvit Web Integration:** Powered by Phaser 3 WebGL/Canvas and Reddit's secure Devvit Web backend.
- **Safe & Private:** No external network tracking, zero third-party ads, and no personal data collection.
- **Persistent Storage:** High scores, player usernames, and community leaderboards are safely stored using Reddit's built-in Redis database.
- **Cross-Platform:** Responsive 9:16 portrait layout optimized for touch screens and mouse controls.

---

## 🚀 Moderator & Community Setup Guide

### 1. Installing the App
Moderators can install **Juicy Merge** directly to their subreddit from the **Reddit App Directory**.

### 2. Creating an Interactive Game Post
Once installed, moderators can easily generate a playable game post:
1. Navigate to your subreddit home page.
2. Open the **Mod Tools** or the Subreddit action menu (three dots / menu bar).
3. Click on **"Play Juicy Merge"**.
4. An official custom game post titled `🍉 Juicy Merge — Drop • Merge • Grow!` will be published to your subreddit immediately.
5. Pin or highlight the post to host a community competition!

---

## 🎮 How to Play & Full Feature Set

### 1. Core Mechanics & Controls
- **Aim & Drop:** Drag your mouse or finger across the top of the container to position the fruit dropper. Release to drop the fruit into the bucket.
- **Physics & Collisions:** Fruits bounce, roll, and settle dynamically based on realistic 2D physics.
- **Danger Line:** Avoid letting fruits pile up and settle above the top danger line, which triggers Game Over.

### 2. Fruit Evolution Chain (12 Tiers)
Merge matching fruits to evolve through 12 delicious tiers:
1. 🍒 **Cherry**
2. 🍓 **Strawberry**
3. 🍇 **Grape**
4. 🍊 **Dekopon**
5. 🍎 **Pomegranate**
6. 🍊 **Orange**
7. 🍏 **Apple**
8. 🍐 **Pear**
9. 🍑 **Peach**
10. 🍍 **Pineapple**
11. 🍈 **Melon**
12. 🍉 **Giant Watermelon (Grand Jackpot!)**

### 3. Combos & High Scores
- Consecutive merges in quick succession trigger **Combo Multipliers** (x2, x3, x4...), boosting your total score.
- Strive to achieve new personal bests and set community records.

### 4. Real-Time Community Leaderboard
- Top scores from all community members are tracked in real-time via Redis.
- Check the Leaderboard tab to see the top 10 players in your subreddit.

### 5. Fruit Encyclopedia & Daily Streaks
- **Fruit Album:** Track which fruits you have successfully discovered and merged.
- **Daily Streak:** Log in daily to build your streak and earn bragging rights.

### 6. Sound & Haptics
- Built-in sound synthesizers provide juicy pop and merge sound effects.
- Easily toggle sound on or off using the in-game volume button.

---

## 🛠️ Technical Specifications
- **Client Framework:** Phaser 3 + TypeScript
- **Server Framework:** Devvit Web + Hono + Reddit Redis
- **Permissions:** Custom Post Creation (`submitCustomPost`), Redis Data Storage (`redis.zAdd`, `redis.get`, `redis.set`)

---

## 💬 Support & Feedback
- **Official Subreddit:** [r/JuicyMerge](https://www.reddit.com/r/JuicyMerge/)
- For feature requests, bug reports, or feedback, please visit our community subreddit.
