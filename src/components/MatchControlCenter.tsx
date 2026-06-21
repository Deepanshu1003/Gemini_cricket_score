import React, { useState, useEffect } from "react";
import { firebaseService } from "../firebaseService";
import { Team, Tournament, Match } from "../types";
import { collection, onSnapshot, query, doc } from "firebase/firestore";
import { db } from "../firebase";
import { Swords, Plus, Calendar, Pin, Play, Trophy, Users, Shield, ArrowUpRight, CheckCircle2, Trash2 } from "lucide-react";
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

  useEffect(() => {
    // 1. Fetch static lists
    const fetchDeps = async () => {
      try {
        const [teamList, tourneyList] = await Promise.all([
          firebaseService.getTeams(),
          firebaseService.getTournaments()
        ]);
        setTeams(teamList);
        setTournaments(tourneyList);
      } catch (e) {
        console.error(e);
      }
    };
    fetchDeps();

    // 2. Real-time Subscription to Matches List (for real-time updates across screens!)
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
        <div className="flex border-b border-slate-700/80 mb-6 gap-2">
          <button
            onClick={() => setActiveTab("list")}
            className={`px-5 py-3 font-bold text-sm border-b-2 transition ${activeTab === "list" ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          >
            Match Fixtures ({matches.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("create");
              setErrorText("");
            }}
            className={`px-5 py-3 font-bold text-sm border-b-2 transition ${activeTab === "create" ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          >
            + Create New Fixture / Match
          </button>
        </div>
      )}

      {errorText && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm p-3 rounded-lg mb-6 max-w-lg">
          {errorText}
        </div>
      )}

      {activeTab === "list" && (
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading matchups...</div>
          ) : matches.length === 0 ? (
            <div className="bg-slate-800/20 border border-slate-700 py-16 rounded-xl text-center text-slate-400 max-w-xl mx-auto mt-6">
              <Swords className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="font-semibold text-lg">No cricket matches scheduled yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Create players/teams and then hit the "+" tab above to schedule local tournament games!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matches.map((m) => {
                const totalInnings = m.currentInnings;
                return (
                  <div
                    key={m.id}
                    onClick={() => handleSelectMatch(m)}
                    className="bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/60 p-5 rounded-2xl transition cursor-pointer flex flex-col justify-between group h-full"
                  >
                    <div>
                      {/* Match Status Strip */}
                      <div className="flex items-center justify-between mb-4">
                        <span className={`text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full border ${m.status === "completed" ? "bg-slate-700/20 text-slate-400 border-slate-700" : m.status === "live" ? "bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                          {m.status}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(m.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Opponents and Runs display */}
                      <div className="space-y-3 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-100">{m.teamAName}</span>
                          {m.status !== "scheduled" && m.innings1 && (
                            <span className="font-extrabold text-base text-emerald-400 font-sans">
                              {m.innings1.runs} / {m.innings1.wickets} <span className="text-[10px] text-slate-500 font-mono">({Math.floor(m.innings1.balls/6)}.{m.innings1.balls%6} ov)</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-100">{m.teamBName}</span>
                          {m.status === "completed" && m.innings2 && (
                            <span className="font-extrabold text-base text-emerald-400 font-sans">
                              {m.innings2.runs} / {m.innings2.wickets} <span className="text-[10px] text-slate-500 font-mono">({Math.floor(m.innings2.balls/6)}.{m.innings2.balls%6} ov)</span>
                            </span>
                          )}
                          {m.status === "live" && m.currentInnings === 2 && m.innings2 && (
                            <span className="font-extrabold text-base text-emerald-400 font-sans">
                              {m.innings2.runs} / {m.innings2.wickets} <span className="text-[10px] text-slate-500 font-mono">({Math.floor(m.innings2.balls/6)}.{m.innings2.balls%6} ov)</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Tournament indicator & outcomes */}
                      <div className="mt-4 pt-3 border-t border-slate-700/30 flex items-center justify-between">
                        <div>
                          {m.tournamentName ? (
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-lime-400">
                              <Trophy className="w-3 h-3" /> {m.tournamentName}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">Friendly Match</span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 font-mono">{m.overs} Overs Match</span>
                      </div>
                    </div>

                    {/* Footer outcomes info */}
                    <div className="mt-4 pt-3 border-t border-slate-700/30 flex items-center justify-between">
                      {m.resultSummary ? (
                        <p className="text-xs text-amber-300 font-bold italic line-clamp-1 flex-1">{m.resultSummary}</p>
                      ) : m.status === "live" ? (
                        <p className="text-xs text-rose-400 font-black tracking-wide animate-pulse flex-grow flex items-center gap-1.5"><Play className="w-3.5 h-3.5 fill-rose-400" /> LIVE INNINGS {totalInnings}</p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Scheduled - Scorer setup ready</p>
                      )}
                      
                      <div className="flex items-center gap-2 ml-4">
                        {m.createdBy === userId && (
                          <button
                            onClick={(e) => handleDeleteMatch(m.id, e)}
                            className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition cursor-pointer"
                            title="Delete Match Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <span className="text-xs font-bold text-emerald-400 group-hover:underline flex items-center gap-0.5 shrink-0">
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
        <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700 max-w-3xl">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Swords className="w-5 h-5 text-emerald-400" /> Schedule Amateur Matchup
          </h2>

          <form onSubmit={handleCreateMatch} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Team A (Home Squad)
                </label>
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
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
                    className="text-xs text-emerald-400 font-bold underline mt-1.5"
                  >
                    Please register custom teams in Teams tab first
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Team B (Away Squad)
                </label>
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
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
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Overs Count (Legitimate Overs)
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  value={overs}
                  onChange={(e) => setOvers(parseInt(e.target.value) || 20)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Toss Winner
                </label>
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-2 text-slate-200 text-sm"
                  value={tossWinner}
                  onChange={(e) => setTossWinner(e.target.value)}
                >
                  <option value="">Toss Champion</option>
                  {teamAId && <option value={teamAId}>{teams.find(t=>t.id===teamAId)?.name}</option>}
                  {teamBId && <option value={teamBId}>{teams.find(t=>t.id===teamBId)?.name}</option>}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Toss Choice
                </label>
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-2 text-slate-200 text-sm"
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
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Link with Live Tournament (Optional)
                </label>
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-3 text-slate-200 text-sm focus:outline-none"
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
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Scorer Security PIN (Optional)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Pin className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    maxLength={6}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-slate-200 text-sm placeholder-slate-600 focus:outline-none"
                    placeholder="e.g. 1234 (Anyone can edit if blank)"
                    value={scorerPin}
                    onChange={(e) => setScorerPin(e.target.value.replace(/\D/g,""))}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-bold py-3 rounded-lg transition shadow-lg shadow-emerald-500/10 cursor-pointer"
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
