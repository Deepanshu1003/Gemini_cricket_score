# Century Scorer 🏏

**Century Scorer** is a high-density, real-time Cricket scoring hub, live matched-day manager, tournament organizer, and comprehensive roster center. This applet allows scorers to input precise play-by-play actions, trace match sequences, calculate dynamic batsman and bowler stats, organize teams, and coordinate championship events securely.

---

## 🚀 Key Features

- **Dynamic Match Scorer**: Interactive balls/over keypads, auto-striker rotating loops, boundary selectors, specialist sundries/extras panel, complete fall of wickets list, and ball-by-ball timeline queue.
- **Tournament Orchestrator**: Create full bracket tournaments, schedule games, coordinate tournament groups, and rank performance within an elegant dashboard.
- **Unified Team Roster Management**: Custom team creators, player profiles, and direct roster assignment.
- **Career & Match Statistic Trackers**: Tracking dynamic batsman milestones (runs, balls faced, strike-rates, fours, sixes) and bowler metrics (overs bowled, runs conceded, wickets taken, maidens, economy rates).
- **Real-Time Database Engines**: Fast, lightweight query architectures powered by Google Firebase Firestore.

---

## 🛠️ Technical Stack

- **Frontend Core**: React 18, TypeScript, Vite.
- **Aesthetic Styling**: Tailwind CSS (sleek dark cosmic mode paired with clean Inter and JetBrains Mono typography).
- **Icons**: Lucide React.
- **Backend Infrastructure**: Google Firebase (Firestore DB for durable cloud storage, Firebase Auth for security credentials).

---

## 🔑 Firebase Configuration Guide & Troubshooting

Both the **Guest Sign-In** and the **Email/Password Hub Login** routes require active Authentication Providers inside the Google Firebase console. Follow these steps to enable them:

### Step 1: Open the Firebase Authentication Settings
Navigate directly to your project's authentication providers manager:
👉 **[Firebase Console - Sign-in Providers](https://console.firebase.google.com/project/lucid-lodge-c8kj5/authentication/providers)**

### Step 2: Enable "Email/Password" Sign-In
1. On the **Sign-in method** tab, click **Add new provider** on the right.
2. Select **Email/Password** from the Native providers list.
3. Toggle the **Enable** switch to **ON** (leave "Email link" disabled unless desired).
4. Click **Save**.

### Step 3: Enable "Anonymous" (Guest Mode) Sign-In
1. Click **Add new provider** again.
2. Select **Anonymous** from the list.
3. Toggle the **Enable** switch to **ON**.
4. Click **Save**.

*Once these steps are completed, your credentials will register securely, and both guest scorers and standard email logins will connect to the scoring hub instantly!*

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
│   │   ├── AuthScreen.tsx         # Secure user onboarding & error guides
│   │   ├── MatchControlCenter.tsx # Live match planner and setup wizard
│   │   ├── MatchScorer.tsx        # High-precision ball scorer keypad & tabular scorecard
│   │   ├── PlayerStats.tsx        # Dynamic individual metric calculators
│   │   ├── TeamsList.tsx          # Team profiles & rosters
│   │   └── TournamentManager.tsx  # Dynamic brackets and tournament coordinators
```

---

## 🔒 Security & Rules Hardening

The application is secured with custom Zero-Trust Firestore security rules in `firestore.rules` to prevent identity spoofing and payload poisoning:
- **Default Deny Rule**: All paths default to block unless explicitly matched.
- **Identity Integrity**: All profile writes must match the authenticated `request.auth.uid`.
- **Public Visibility / Private Scoring**: Matches, Tournaments, and Rosters are viewable publicly (`allow read: if true`), but writing/updating controls are restricted to the verified creator.
