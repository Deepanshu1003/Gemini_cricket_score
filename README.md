# Century Scorer 🏏

**Century Scorer** is a high-density, real-time Cricket scoring hub, live match-day manager, tournament organizer, and comprehensive roster center. This application allows scorers to input precise play-by-play actions, trace match sequences, calculate dynamic batsman and bowler stats, organize teams, and coordinate championship events smoothly.

---

## 🚀 Key Features & Code Updates

- **Unified Roster Rules (New)**:
  - **Striker & Non-Striker Uniqueness**: Prevents selecting the same batsman at both ends simultaneously. The dropdown selections automatically filter out the other active batsman.
  - **Consecutive Over Prevention**: Enforces official cricket rules by blocking a bowler from bowling consecutive overs. Options are dynamically filtered, and validation blocks consecutive over assignments.
- **Over-by-Over Ball Timeline (New)**:
  - Replaced the continuous raw horizontal list of deliveries with an elegant, grouped **Over-by-Over Ball Timeline**.
  - Displays specific runs conceded per over, boundary highlighting (emerald for 4s, sky blue for 6s), wicket highlights (rose badge), custom extra scores (WD/NB/B/L), and the active bowler's name.
- **Dual-Storage Synchronization Engine**:
  - Automatically defaults to **Cloud Firestore** and **Firebase Auth** in live environments.
  - Features an **Offline Browser Storage Bypass** (saving complete match, player career cards, tournament tables in secure `localStorage` sandbox) for zero-setup local dev runs.
  - Optimized offline logout flow reloads the sandboxed context cleanly without blocking or throwing database handler exceptions.
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

## 🔒 Security Hardening

The application is secured with custom Zero-Trust Firestore security rules in `firestore.rules` to prevent identity spoofing and payload poisoning:
- **Default Deny Rule**: All paths default to block unless explicitly matched.
- **Identity Integrity**: All profile writes must match the authenticated `request.auth.uid`.
- **Public Visibility / Private Scoring**: Matches, Tournaments, and Rosters are viewable publicly (`allow read: if true`), but writing/updating controls are restricted to the verified creator.
