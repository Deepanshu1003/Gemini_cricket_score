import React, { useState, useEffect } from "react";
import { auth, onAuthStateChanged, signOut } from "./firebase";
import AuthScreen from "./components/AuthScreen";
import MatchControlCenter from "./components/MatchControlCenter";
import TournamentManager from "./components/TournamentManager";
import TeamsList from "./components/TeamsList";
import PlayerStats from "./components/PlayerStats";
import { Trophy, Swords, Share2, LogOut, CircleUser, Sparkles, Star, Users } from "lucide-react";

type TabId = "matches" | "tournaments" | "teams" | "player_stats";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("matches");
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  // Deep Link helper to jump back into a match
  const handleSelectMatchFromTournament = (matchId: string) => {
    setSelectedMatchId(matchId);
    setActiveTab("matches");
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || "Guest Scorer",
          isAnonymous: firebaseUser.isAnonymous
        });
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    if (window.confirm("Do you want to log out of the Scorer Hub?")) {
      await signOut(auth);
    }
  };

  if (authLoading) {
    return (
      <div id="landing-loading" className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-mono tracking-widest text-slate-500 uppercase">Centuryscorer Connecting...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onSuccess={() => {}} />;
  }

  return (
    <div id="matchday-root" className="min-h-screen bg-slate-950 text-slate-150 flex flex-col font-sans select-none antialiased">
      {/* Dynamic Background Turf Mesh */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-emerald-950/20 to-transparent pointer-events-none -z-10"></div>
      
      {/* Hub Top Navigation Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 flex items-center justify-center rounded-xl font-black shadow-lg shadow-emerald-500/15">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="font-sans font-black text-white text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-200">
                CenturyScorer
              </span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-widest block -mt-1">Match Center</span>
            </div>
          </div>

          {/* User profile actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-200">{user.email}</span>
              <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest flex items-center gap-1 justify-end font-bold">
                {user.isAnonymous ? (
                  <>
                    <Sparkles className="w-2.5 h-2.5 text-amber-500" /> Fast Guest Access
                  </>
                ) : (
                  <>
                    <Star className="w-2.5 h-2.5 text-teal-400" /> Verified Scorer
                  </>
                )}
              </span>
            </div>

            <div className="h-4 w-px bg-slate-800"></div>

            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body Containers */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col">
        {/* Core Sub navigation Tabs */}
        <div className="flex items-center overflow-x-auto gap-2 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800/80 mb-8 shrink-0">
          {[
            { id: "matches", label: "Match Control", icon: Swords },
            { id: "tournaments", label: "Tournaments", icon: Trophy },
            { id: "teams", label: "Teams / Squads", icon: Users },
            { id: "player_stats", label: "Player stats", icon: Star }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as TabId);
                  setSelectedMatchId(null);
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-extrabold tracking-wider uppercase transition font-sans cursor-pointer shrink-0 ${activeTab === tab.id ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md shadow-emerald-500/5" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/20"}`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Contents View Panels */}
        <div className="flex-1 flex flex-col justify-stretch">
          {activeTab === "matches" && (
            <MatchControlCenter
              userId={user.uid}
              externalSelectedMatchId={selectedMatchId}
              onClearExternalMatchId={() => setSelectedMatchId(null)}
            />
          )}

          {activeTab === "tournaments" && (
            <TournamentManager
              userId={user.uid}
              onSelectMatch={handleSelectMatchFromTournament}
              onNavigateToTab={(tab) => setActiveTab(tab as TabId)}
            />
          )}

          {activeTab === "teams" && (
            <TeamsList userId={user.uid} />
          )}

          {activeTab === "player_stats" && (
            <PlayerStats />
          )}
        </div>
      </main>

      {/* Sports footer copyright info */}
      <footer className="py-6 border-t border-slate-900 bg-slate-950 text-center text-slate-500 font-sans text-[10px] uppercase tracking-widest shrink-0 mt-8">
        &copy; 2026 CenturyScorer Inc. Built beautifully for grass-root tournament cricket matches.
      </footer>
    </div>
  );
}
