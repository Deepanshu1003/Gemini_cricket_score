# Century Scorer 🏏

**Century Scorer** is a high-density, real-time Cricket scoring hub, live match-day manager, tournament organizer, and comprehensive roster center. This application allows scorers to input precise play-by-play actions, trace match sequences, calculate dynamic batsman and bowler stats, organize teams, and coordinate championship events smoothly.

---

## 🚀 Key Features & Code Updates

- **Active Batsmen & Bowler cockpit panel (New)**:
  - Added a highly informative live active play section in the scorer's dashboard. Shows the active striker (with a glowing strike indicator) and non-striker showing personal runs and balls faced.
  - Displays the active bowler's spell including overs, maidens, runs conceded, wickets taken, and economy rates, updating immediately in real-time!
- **Total Overs Limit Lockdown Safeguards (New)**:
  - Implemented automatic locks that block any scoring action once an innings is completed (runs target chased, all wickets down, or overs maximum reached).
  - Replaces buttons with a friendly, instructive block notice guiding the scorer to "Switch Innings" or "Finish Match". This mathematically prevents "total over more than max over" bugs.
- **Local Storage manual info & refresh ("I") controls (New)**:
  - Added interactive Info (`Info` / "I" icon) buttons located in the Scorer Header and the Match Control banner.
  - Allows scorers to manually force key-value cache fetches or invoke storage synchronization in a single click, popping up dynamic feedback notices.
- **Consecutive Over & Multi-Inning Ball Timelines (Release 1)**:
  - Fixed the "why over has 12 balls" issue where deliveries from different innings were overlapping.
  - Implemented the `inningsNum` tag on each recorded delivery, seamlessly filtering the grouped timeline representation to the active batting innings.
- **Dynamic Session Control & Bypass Alerts (New)**:
  - Completely resolved the "Logout button not working" issue caused by iframe container blocks on synchronous browser dialogs (e.g. `window.confirm`). Introduced a stateful, interactive double-click verification countdown inside `/src/App.tsx`.
  - Replaced all blocking browser `alert()` triggers inside `/src/components/MatchScorer.tsx` with high-contrast, responsive inline error and success banner alerts.
- **Offline Roster & Sandbox Manager (Release 1)**:
  - Added an **Offline Local Storage Sandbox Inspector** at the top of the Match Control fixtures list. Displays counts for saved matches, teams, and tournament elements, and features an interactive secure purge option to clear local databases cleanly.
- **Unified Roster Rules**:
  - **Striker & Non-Striker Uniqueness**: Prevents selecting the same batsman at both ends simultaneously. The dropdown selections automatically filter out the other active batsman.
  - **Consecutive Over Prevention**: Enforces official cricket rules by blocking a bowler from bowling consecutive overs. Options are dynamically filtered, and validation blocks consecutive over assignments.
- **Tournament Brackets**: Auto-generated schedules, ongoing group stages, and tables updated on-the-fly.

---

## 💻 Local Installation & Setup

If you want to clone this project and run indeed beautifully in your local environment, follow this guide:

### Prerequisite Checklist
Ensure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (Version 18.0.0 or higher is recommended)
* [npm](https://www.npmjs.com/) (usually comes packaged with Node.js)

### Step 1: Clone the Repository
Clone the codebase to your local environment:
```bash
git clone <repository-url>
cd century-scorer
```

### Step 2: Install Dependencies
Run npm install in the project root to download and install all frontend libraries:
```bash
npm install
```

### Step 3: Run the Development Server
Launch the high-speed Vite development server locally:
```bash
npm run dev
```
Once the dev server starts, open your browser and head to:
👉 `http://localhost:3000` (or the port specified in terminal output)

### Step 4: Build for Production
To bundle and optimize the application for production hosting/deployment:
```bash
npm run build
```

---

## 📁 Repository Structure

```tree
├── firebase-applet-config.json    # Contains app-specific Firebase API keys
├── firebase-blueprint.json        # Data schemas / intermediate blueprint configuration
├── firestore.rules                # Hardened attribute-based Firestore security rules
├── package.json                   # Project scripts and library dependencies
├── src/
│   ├── App.tsx                    # Main app coordinator and tab manager
│   ├── firebase.ts                # Firebase initializing file (Auth / Firestore)
│   ├── index.css                  # Tailwinds CSS directives and font structures
│   ├── components/                # Specialized modular UI components
│   │   ├── AuthScreen.tsx         # Secure user onboarding & error guides (includes local bypass button)
│   │   ├── MatchControlCenter.tsx # Live match planner and setup wizard
│   │   ├── MatchScorer.tsx        # High-precision ball scorer keypad & grouped over scorecards
│   │   ├── PlayerStats.tsx        # Dynamic individual career statistics
│   │   ├── TeamsList.tsx          # Team profiles & rosters
│   │   └── TournamentManager.tsx  # Dynamic brackets and tournament coordinators
```

---

## 📱 Android & Mobile Deployment Solutions

We have configured **two powerful options** to run and install this application natively on Android devices:

### Option A: Native Android App (via Capacitor)
The project comes with a fully initialized **Capacitor Android native app wrapper** inside the `/android` folder. This is a real Android Studio project! 

To run or build it locally:
1. Make sure you have [Android Studio](https://developer.android.com/studio) installed on your machine.
2. Build the web app assets first:
   ```bash
   npm run build
   ```
3. Sync the compiled static assets into the native Android folder:
   ```bash
   npx cap sync
   ```
4. Open the project in Android Studio:
   ```bash
   npx cap open android
   ```
5. From Android Studio, you can immediately:
   - Run the app on an Android Emulator or your connected physical phone!
   - Select **Build > Build Bundle(s) / APK(s) > Build APK(s)** to generate a standalone `.apk` you can share and install on on-field devices.

---

### Option B: Progressive Web App (PWA) Install
The app is engineered with a **Chrome-compliant Web App Manifest** (`manifest.json`):
1. Simply deploy the web application or host it on your local network/cloud.
2. Open the application's URL in **Google Chrome** on your Android device.
3. Tap the **three-dot menu icon** in the top-right corner.
4. Select **"Add to Home Screen"** or **"Install App"**.
5. The CenturyScorer will be installed directly on your Android phone's launcher, featuring an immersive full-screen design, its own splash screen, adaptive orientation support, and local caching!

---

## 🔒 Security Hardening

The application is secured with custom Zero-Trust Firestore security rules in `firestore.rules` to prevent identity spoofing and payload poisoning:
- **Default Deny Rule**: All paths default to block unless explicitly matched.
- **Identity Integrity**: All profile writes must match the authenticated `request.auth.uid`.
- **Public Visibility / Private Scoring**: Matches, Tournaments, and Rosters are viewable publicly (`allow read: if true`), but writing/updating controls are restricted to the verified creator.
