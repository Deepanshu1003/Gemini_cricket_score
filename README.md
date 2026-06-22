# CenturyScorer Match Hub 🏏

[![Built with React](https://img.shields.io/badge/Vite-React%2019-0284c7?style=flat&logo=react)](https://react.dev)
[![Styles with Tailwind](https://img.shields.io/badge/Tailwind-CSS%204.0--alpha-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com)
[![Database Firestore](https://img.shields.io/badge/Cloud%20Database-Firebase%2012-f59e0b?style=flat&logo=firebase)](https://firebase.google.com)
[![Mobile Ready Capacitor](https://img.shields.io/badge/Mobile-Capacitor--Ready-10b981?style=flat&logo=capacitor)](https://capacitorjs.com)

**CenturyScorer Match Hub** is an elite, high-fidelity cricket play-by-play scoring, dynamic team management, and tourney coordination panel. Engineered for cricket enthusiasts, local league coaches, and amateur tournament operators, CenturyScorer translates complex cricket laws and telemetry into an intuitive, responsive, and aesthetically stunning user experience.

---

## 🎨 Visual Identity & Design Paradigm

CenturyScorer balances extreme information density with high-contrast, eye-safe aesthetics utilizing:
- **The Obsidian Cobalt Slate Theme**: Styled with a deep obsidian-colored canvas (`#0b1329`) accented with neon emerald strikers, sapphire dividers, and warm golden badges.
- **Rhythmic Typography Layouts**: Incorporates clean headers crafted in variable display typography, paired with monospace typography (`Fira Code` / `JetBrains Mono`) for real-time statistical readouts, overs ticks, and batsman strike-rate telemetry.
- **Fluid Micro-Animations**: Native page switches, batsman swaps, ball dismissals, and timeline updates are driven on dynamic spring-physics scales via `motion`.

---

## 🚀 Key Architectural Features

### 1. High-Density Live Match Cockpit
* **In-Play Control Deck**: Scorer keypad with responsive fast-buttons for standard plays (`0`, `1`, `2`, `3`, `4`, `6` runs, and `Wide`, `No Ball`, `Bye`, `Wicket` conditions).
* **Striker/Bowler Multi-Innings Telemetry**:
  - Live batsmen cards with active strike highlights, current individual runs, and balls faced.
  - Active bowler panel displaying spell-by-spell analysis (Overs, Maidens, Runs conceded, Wickets taken, and live economy rate calculations).
* **Safety Lockdown Mechanics**: Automatic lock systems shut down inputs when an innings targets are achieved, wickets fall completely, or overs limit is reached—mathematically preventing overlapping timelines and over-count overflows.

### 2. Multi-Tiered Championship Coordinator
* **Dynamic Tournaments**: Seamlessly construct tournaments, define group stages, assign tournament rules, and generate automated fixtures.
* **Auto-Recalculating League Tables**: Wins, losses, runs-difference, and point totals translate instantly upon live match validation and closure.
* **Roster Builder**: Build active playing rosters, map dynamic statistics profiles, and select unique batting/bowling combinations with double-selection restrictions strictly in-place.

---

## 🔒 Security & Data Integrity

The application features a strict layered data architectural configuration:
* **Attribute-Based Access Controls (ABAC)**: Enabled in Firestore (`firestore.rules`). Matches, tournaments, and rosters remain publicly viewable (`read: true`), whereas updates/writes are locked exclusively to the authenticated creator via verification matching.
* **Local Offline Local Storage Sandbox Inspector**: Includes a dedicated offline panel at the top of the Match List to inspect local cache, monitor stored games/tournaments count, and invoke a safe offline purge of database states.
* **Synchronous Alert Safety Bypass**: Standard blocks in embedded browser environments are completely resolved via double-click sign-out verification timers and high-contrast in-page toast headers, removing frozen iFrame alerts entirely.

---

## 💻 Technical Setup & Installation

Get CenturyScorer running in your local sandbox in under three minutes:

### Prerequisites
Make sure you have [Node.js Node v18+](https://nodejs.org) and [npm v10+](https://npmjs.com) installed.

### Step 1: Clone & Navigate
```bash
git clone https://github.com/your-username/century-scorer.git
cd century-scorer
```

### Step 2: Configure Environment Variables
Create a `.env` file in the project root (or replicate the `.env.example` structure):
```bash
cp .env.example .env
```
Populate your Firebase configuration details:
```env
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-app.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
VITE_FIREBASE_DATABASE_ID="default"
```

### Step 3: Install Frontend Dependencies
```bash
npm install
```

### Step 4: Run Development Environment
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your desktop browser to watch the real-time scoring engine in action!

### Step 5: Build optimized production bundle
```bash
npm run build
```
Static builds compile cleanly into the `/dist` output folder.

---

## 📱 Mobile Native Build Guide

### Progressive Web App (PWA)
CenturyScorer includes an fully styled Manifest file (`manifest.json`):
1. Navigate to the hosting link on your Android or iOS device in **Google Chrome / Safari**.
2. Tap the browser menu and select **"Add to Home Screen"** or **"Install App"**.
3. Launch CenturyScorer natively with standard launch icon, splash card animations, dynamic landscape lockers, and standalone full-screen viewports.

### Capacitor Mobile Integration
The project is engineered to work cleanly with **CapacitorJS** (configuration files included inside the codebase structure). To sync static assets and run natively matching mobile apps:
```bash
# Add native android dependencies
npm install @capacitor/core @capacitor/cli

# Sync compiled codes to Capacitor native Android layout folder
npx cap sync

# Open instantly inside Android Studio for Gradle bundles or manual compilations
npx cap open android
```

---

## 👥 Contributing

We love open-source contributions! Follow these steps to submit edits:
1. Fork the Project Repository.
2. Create your Feature Branch (`git checkout -b feature/glorious-cricket-feature`).
3. Commit changes (`git commit -m "feat: Add dynamic super-over ruleset"`).
4. Push to Branch (`git push origin feature/glorious-cricket-feature`).
5. Open a Pull Request detailing your enhancements.

Designed with 🏏 for cricket organizers world-wide.
