import React, { useState, useEffect } from "react";
import { firebaseService, isOfflineMode } from "../firebaseService";
import { Team, Tournament, Match } from "../types";
import { collection, onSnapshot, query, doc } from "firebase/firestore";
import { db } from "../firebase";
import { Swords, Plus, Calendar, Pin, Play, Trophy, Users, Shield, ArrowUpRight, CheckCircle2, Trash2, Info, RefreshCw } from "lucide-react";
import MatchScorer from "./MatchScorer";

interface MatchControlCenterProps {
  userId: string;
  externalSelectedMatchId: string | null;
  onClearExternalMatchId: () => void;
}

export default function MatchControlCenter({ userId, externalSelectedMatchId, onClearExternalMatchId }: MatchControlCenterProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"list" | "create" | "score">("list");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  // Creator state
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [overs, setOvers] = useState(20);
  const [tossWinner, setTossWinner] = useState("");
  const [tossDecision, setTossDecision] = useState<"bat" | "bowl">("bat");
  const [selectedTourneyId, setSelectedTourneyId] = useState("");
  const [scorerPin, setScorerPin] = useState("");
  const [errorText, setErrorText] = useState("");
  const [refreshNotice, setRefreshNotice] = useState(false);

  useEffect(() => {
    // 1. Fetch static lists and initial matches
    const fetchDeps = async () => {
      try {
        const [teamList, tourneyList, matchList] = await Promise.all([
          firebaseService.getTeams(),
          firebaseService.getTournaments(),
          firebaseService.getMatches()
        ]);
        setTeams(teamList);
        setTournaments(tourneyList);
        
        const sorted = matchList.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setMatches(sorted);
        setLoading(false);
      } catch (e) {
        console.error(e);
      }
    };
    fetchDeps();

    // 2. Setup subscription
    if (isOfflineMode()) {
      const handleLocalUpdate = async () => {
        try {
          const list = await firebaseService.getMatches();
          const sorted = list.sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
          setMatches(sorted);
          
          // Also sync teams and tournaments in case of updates
          const [teamList, tourneyList] = await Promise.all([
            firebaseService.getTeams(),
            firebaseService.getTournaments()
          ]);
          setTeams(teamList);
          setTournaments(tourneyList);
        } catch (err) {
          console.error(err);
        }
      };

      window.addEventListener("local-db-updated", handleLocalUpdate);
      return () => {
        window.removeEventListener("local-db-updated", handleLocalUpdate);
      };
    } else {
      // Real-time Subscription to Matches List (for real-time updates across screens!)
      const q = query(collection(db, "matches"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: Match[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as Match);
        });
        // Sort: Scheduled -> Live -> Completed, with newest created first
        const sorted = list.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setMatches(sorted);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, []);

  // Sync to external selection if changed
  useEffect(() => {
    if (externalSelectedMatchId) {
      const match = matches.find(m => m.id === externalSelectedMatchId);
      if (match) {
        setSelectedMatch(match);
        setActiveTab("score");
      }
    }
  }, [externalSelectedMatchId, matches]);

  // Keep selected match live with subscription or matching from list
  useEffect(() => {
    if (selectedMatch) {
      const updated = matches.find(m => m.id === selectedMatch.id);
      if (updated) {
        setSelectedMatch(updated);
      }
    }
  }, [matches]);

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText("");

    if (!teamAId || !teamBId) {
      setErrorText("Please select both opposing teams");
      return;
    }
    if (teamAId === teamBId) {
      setErrorText("Opposing teams must be distinct local clubs");
      return;
    }
    if (!tossWinner) {
      setErrorText("Please specify who won the toss");
      return;
    }

    const teamAModel = teams.find(t => t.id === teamAId);
    const teamBModel = teams.find(t => t.id === teamBId);
    
    if (!teamAModel || !teamBModel) return;

    const tourneyModel = tournaments.find(t => t.id === selectedTourneyId);

    try {
      const newMatchId = await firebaseService.createMatch({
        createdBy: userId,
        teamAId,
        teamAName: teamAModel.name,
        teamBId,
        teamBName: teamBModel.name,
        overs,
        tossWinner,
        tossDecision,
        scorerPin,
        tournamentId: selectedTourneyId || "",
        tournamentName: tourneyModel ? tourneyModel.name : "",
        selectedSquads: {
          teamA: teamAModel.playerNames,
          teamB: teamBModel.playerNames
        }
      });

      // Clear states and view newly created scorers
      setTeamAId("");
      setTeamBId("");
      setTossWinner("");
      setSelectedTourneyId("");
      setScorerPin("");
      
      const createdMatch = matches.find(m => m.id === newMatchId);
      if (createdMatch) {
        setSelectedMatch(createdMatch);
      }
      setActiveTab("list");
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "Failed to schedule live match.");
    }
  };

  const handleSelectMatch = (match: Match) => {
    setSelectedMatch(match);
    setActiveTab("score");
  };

  const handleDeleteMatch = async (matchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this match record?")) {
      try {
        await firebaseService.deleteMatch(matchId);
        if (selectedMatch?.id === matchId) {
          setSelectedMatch(null);
          onClearExternalMatchId();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleBackToOverview = () => {
    setSelectedMatch(null);
    onClearExternalMatchId();
    setActiveTab("list");
  };

  return (
    <div id="match-scoring-center">
      {/* Sub tabs navigation */}
      {activeTab !== "score" && (
        <div className="flex border-b border-soft mb-6 gap-2">
          <button
            onClick={() => setActiveTab("list")}
            className={`px-5 py-3 font-extrabold text-xs uppercase tracking-wider border-b-2 transition ${activeTab === "list" ? "border-sky-500 text-sky-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          >
            Match Fixtures ({matches.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("create");
              setErrorText("");
            }}
            className={`px-5 py-3 font-extrabold text-xs uppercase tracking-wider border-b-2 transition ${activeTab === "create" ? "border-sky-500 text-sky-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          >
            + Create New Fixture / Match
          </button>
        </div>
      )}

      {errorText && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs p-3 rounded-lg mb-6 max-w-lg font-mono">
          {errorText}
        </div>
      )}

      {activeTab === "list" && (
        <div className="space-y-6">
          {/* Offline Mode Local Database Inspector */}
          {isOfflineMode() && (
            <div className="bg-gradient-to-r from-slate-900/40 to-indigo-950/20 p-4 sm:p-5 border border-soft rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-sky-400 rounded-full animate-pulse"></span>
                  <span className="text-xs uppercase font-extrabold tracking-wider text-sky-400 font-mono">Offline Storage Active</span>
                </div>
                <h3 className="text-sm font-extrabold text-white">Full Cricket Scorer Database Sandbox</h3>
                <p className="text-[11px] text-slate-400 max-w-xl leading-relaxed">
                  Every squad, tournament fixtures list, registered players career stat sheet, and match scorer setup is kept in your browser's persistent key-value engine. Completely self-contained for Release 1!
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 font-mono text-[10px] text-slate-400">
                  <span>🏏 Local Matches: <strong className="text-white">{matches.length}</strong></span>
                  <span>🛡️ Squad Clubs: <strong className="text-white">{teams.length}</strong></span>
                  <span>🏆 Tournaments: <strong className="text-white">{tournaments.length}</strong></span>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2 pr-1 font-mono">
                <button
                  onClick={() => {
                    window.dispatchEvent(new Event("local-db-updated"));
                    setRefreshNotice(true);
                    setTimeout(() => setRefreshNotice(false), 3000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition cursor-pointer font-bold text-xs flex items-center gap-1.5 font-sans shadow-md"
                  title="Force refresh database in local"
                >
                  <Info className="w-3.5 h-3.5 text-white animate-pulse" />
                  <span>{refreshNotice ? "Refreshed!" : "Refresh Local"}</span>
                </button>
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to completely purge your Offline Database? This deletes all local teams, players, tournaments, and match histories irreversibly!")) {
                      localStorage.removeItem("century_scorer_offline_teams");
                      localStorage.removeItem("century_scorer_offline_tournaments");
                      localStorage.removeItem("century_scorer_offline_players");
                      localStorage.removeItem("century_scorer_offline_matches");
                      window.location.reload();
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg border border-soft hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition cursor-pointer font-bold text-xs font-mono"
                  title="Wipe Local database"
                >
                  Clear Local DB
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-slate-400 font-mono text-xs">Loading matchups...</div>
          ) : matches.length === 0 ? (
            <div className="bg-brand-surface border border-soft py-16 rounded-xl text-center text-slate-400 max-w-xl mx-auto mt-6">
              <Swords className="w-12 h-12 text-slate-650 mx-auto mb-3" />
              <p className="font-extrabold text-lg">No cricket matches scheduled yet</p>
              <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto">Create players/teams and then hit the "+" tab above to schedule local tournament games!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matches.map((m) => {
                const totalInnings = m.currentInnings;
                return (
                  <div
                    key={m.id}
                    onClick={() => handleSelectMatch(m)}
                    className="bg-brand-surface border border-soft hover:bg-slate-800/50 p-4 rounded-xl transition cursor-pointer flex flex-col justify-between group h-full shadow-lg relative overflow-hidden"
                  >
                    <div>
                      {/* Match Status Strip */}
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-[9px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded border ${m.status === "completed" ? "bg-slate-855 text-slate-400 border-soft" : m.status === "live" ? "bg-sky-500/10 text-sky-400 border-sky-500/20 animate-pulse" : "bg-slate-800 text-slate-400 border-soft"}`}>
                          {m.status}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono font-bold">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(m.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Opponents and Runs display */}
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-100">{m.teamAName}</span>
                          {m.status !== "scheduled" && m.innings1 && (
                            <span className="font-bold text-sm text-sky-400 font-mono">
                              {m.innings1.runs} / {m.innings1.wickets} <span className="text-[10px] text-slate-500 font-mono">({Math.floor(m.innings1.balls/6)}.{m.innings1.balls%6} ov)</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-100">{m.teamBName}</span>
                          {m.status === "completed" && m.innings2 && (
                            <span className="font-bold text-sm text-sky-400 font-mono">
                              {m.innings2.runs} / {m.innings2.wickets} <span className="text-[10px] text-slate-500 font-mono">({Math.floor(m.innings2.balls/6)}.{m.innings2.balls%6} ov)</span>
                            </span>
                          )}
                          {m.status === "live" && m.currentInnings === 2 && m.innings2 && (
                            <span className="font-bold text-sm text-sky-400 font-mono">
                              {m.innings2.runs} / {m.innings2.wickets} <span className="text-[10px] text-slate-500 font-mono">({Math.floor(m.innings2.balls/6)}.{m.innings2.balls%6} ov)</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Tournament indicator & outcomes */}
                      <div className="mt-3 pt-2.5 border-t border-soft flex items-center justify-between">
                        <div>
                          {m.tournamentName ? (
                            <div className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wide text-sky-400">
                              <Trophy className="w-3.5 h-3.5" /> {m.tournamentName}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">Friendly Match</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{m.overs} Overs Match</span>
                      </div>
                    </div>

                    {/* Footer outcomes info */}
                    <div className="mt-3 pt-2.5 border-t border-soft flex items-center justify-between">
                      {m.resultSummary ? (
                        <p className="text-xs text-amber-300 font-bold italic line-clamp-1 flex-1">{m.resultSummary}</p>
                      ) : m.status === "live" ? (
                        <p className="text-xs text-sky-400 font-black tracking-wide animate-pulse flex-grow flex items-center gap-1.5"><Play className="w-3.5 h-3.5 fill-sky-400" /> LIVE INNINGS {totalInnings}</p>
                      ) : (
                        <p className="text-xs text-slate-500 italic font-mono uppercase tracking-wide">Scheduled - Score setup ready</p>
                      )}
                      
                      <div className="flex items-center gap-2 ml-4">
                        {m.createdBy === userId && (
                          <button
                            onClick={(e) => handleDeleteMatch(m.id, e)}
                            className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 hover:text-rose-350 transition cursor-pointer border border-transparent hover:border-soft"
                            title="Delete Match Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <span className="text-xs font-bold text-sky-400 group-hover:underline flex items-center gap-0.5 shrink-0">
                          {m.status === "completed" ? "Scorecard" : "Score Match"} <ArrowUpRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "create" && (
        <div className="bg-brand-surface p-5 rounded-xl border border-soft max-w-3xl shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Swords className="w-5 h-5 text-sky-400" /> Schedule Amateur Matchup
          </h2>

          <form onSubmit={handleCreateMatch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Team A (Home Squad)
                </label>
                <select
                  className="w-full bg-slate-950/80 border border-soft rounded-lg py-2 px-3 text-slate-200 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-sans"
                  value={teamAId}
                  onChange={(e) => {
                    setTeamAId(e.target.value);
                    if (tossWinner === "") setTossWinner(e.target.value);
                  }}
                >
                  <option value="">Select Home Club</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {teams.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("list")}
                    className="text-xs text-sky-400 font-bold underline mt-1.5"
                  >
                    Please register custom teams in Teams tab first
                  </button>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Team B (Away Squad)
                </label>
                <select
                  className="w-full bg-slate-950/80 border border-soft rounded-lg py-2 px-3 text-slate-200 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-sans"
                  value={teamBId}
                  onChange={(e) => setTeamBId(e.target.value)}
                >
                  <option value="">Select Away Club</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Overs Count (Legitimate Overs)
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  className="w-full bg-slate-950/80 border border-soft rounded-lg py-1.5 px-3 text-slate-200 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono font-bold"
                  value={overs}
                  onChange={(e) => setOvers(parseInt(e.target.value) || 20)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Toss Winner
                </label>
                <select
                  className="w-full bg-slate-950/80 border border-soft rounded-lg py-2 px-2 text-slate-200 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-sans"
                  value={tossWinner}
                  onChange={(e) => setTossWinner(e.target.value)}
                >
                  <option value="">Toss Champion</option>
                  {teamAId && <option value={teamAId}>{teams.find(t=>t.id===teamAId)?.name}</option>}
                  {teamBId && <option value={teamBId}>{teams.find(t=>t.id===teamBId)?.name}</option>}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Toss Choice
                </label>
                <select
                  className="w-full bg-slate-950/80 border border-soft rounded-lg py-2 px-2 text-slate-200 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-sans"
                  value={tossDecision}
                  onChange={(e) => setTossDecision(e.target.value as "bat" | "bowl")}
                >
                  <option value="bat">Batting First</option>
                  <option value="bowl">Bowling First</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Link with Live Tournament (Optional)
                </label>
                <select
                  className="w-full bg-slate-950/80 border border-soft rounded-lg py-2 px-3 text-slate-200 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-sans"
                  value={selectedTourneyId}
                  onChange={(e) => setSelectedTourneyId(e.target.value)}
                >
                  <option value="">Friendly Match (No League)</option>
                  {tournaments.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Scorer Security PIN (Optional)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Pin className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    maxLength={6}
                    className="w-full bg-slate-950/80 border border-soft rounded-lg py-1.5 pl-9 pr-3 text-slate-200 text-sm placeholder-slate-650 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono"
                    placeholder="e.g. 1234 (Anyone can edit if blank)"
                    value={scorerPin}
                    onChange={(e) => setScorerPin(e.target.value.replace(/\D/g,""))}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-sm py-2.5 rounded-lg transition border border-sky-450/20 shadow-lg shadow-sky-900/20 cursor-pointer"
            >
              Launch Live Scorecard / Match
            </button>
          </form>
        </div>
      )}

      {activeTab === "score" && selectedMatch && (
        <MatchScorer
          userId={userId}
          match={selectedMatch}
          onBack={handleBackToOverview}
        />
      )}
    </div>
  );
}
