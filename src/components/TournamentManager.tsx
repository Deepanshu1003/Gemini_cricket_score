import React, { useState, useEffect } from "react";
import { firebaseService } from "../firebaseService";
import { Tournament, Team, Match } from "../types";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Trophy, Plus, Calendar, Medal, Users, Swords, Loader2, ArrowRight } from "lucide-react";

interface TournamentManagerProps {
  userId: string;
  onSelectMatch: (matchId: string) => void;
  onNavigateToTab: (tab: string) => void;
}

interface TeamRow {
  teamName: string;
  played: number;
  won: number;
  lost: number;
  points: number;
}

export default function TournamentManager({ userId, onSelectMatch, onNavigateToTab }: TournamentManagerProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [tourneyName, setTourneyName] = useState("");
  const [tourneyDesc, setTourneyDesc] = useState("");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  
  const [selectedTourneyId, setSelectedTourneyId] = useState<string | null>(null);
  const [pointTable, setPointTable] = useState<TeamRow[]>([]);
  const [tourneyMatches, setTourneyMatches] = useState<Match[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tList, teamList] = await Promise.all([
        firebaseService.getTournaments(),
        firebaseService.getTeams()
      ]);
      setTournaments(tList);
      setTeams(teamList);

      // Load all matches to calculate tables on the fly
      const matchesSnap = await getDocs(collection(db, "matches"));
      const mList: Match[] = [];
      matchesSnap.forEach((doc) => {
        mList.push(doc.data() as Match);
      });
      setMatches(mList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectTournament = (tourney: Tournament) => {
    setSelectedTourneyId(tourney.id);
    computePointTable(tourney, matches);
  };

  const computePointTable = (tourney: Tournament, allMatches: Match[]) => {
    // Collect all completed matches belonging to this tournament
    const finishedMatches = allMatches.filter(m => m.tournamentId === tourney.id && m.status === "completed");
    setTourneyMatches(allMatches.filter(m => m.tournamentId === tourney.id));

    const rows: { [teamName: string]: TeamRow } = {};

    // Initialize rows for each team in the tournament
    tourney.teamNames.forEach((tName) => {
      rows[tName] = {
        teamName: tName,
        played: 0,
        won: 0,
        lost: 0,
        points: 0
      };
    });

    // Populate stats
    finishedMatches.forEach((m) => {
      const teamA = m.innings1?.battingTeam || m.teamAName;
      const teamB = m.innings1?.bowlingTeam || m.teamBName;

      // In case user deleted team or named it differently, ensure they are initialized
      if (!rows[teamA]) rows[teamA] = { teamName: teamA, played: 0, won: 0, lost: 0, points: 0 };
      if (!rows[teamB]) rows[teamB] = { teamName: teamB, played: 0, won: 0, lost: 0, points: 0 };

      rows[teamA].played += 1;
      rows[teamB].played += 1;

      if (m.resultSummary?.includes("won by") || m.resultSummary) {
        // Simple logic to find winner team name in resultSummary
        let winner: string | null = null;
        if (m.resultSummary.includes(teamA)) {
          winner = teamA;
        } else if (m.resultSummary.includes(teamB)) {
          winner = teamB;
        }

        if (winner) {
          const loser = winner === teamA ? teamB : teamA;
          rows[winner].won += 1;
          rows[winner].points += 2;
          rows[loser].lost += 1;
        } else {
          // Tie or no outcome
          rows[teamA].points += 1;
          rows[teamB].points += 1;
        }
      } else {
        // No result listed
        rows[teamA].points += 1;
        rows[teamB].points += 1;
      }
    });

    // Convert to sorted array
    const sorted = Object.values(rows).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.won - a.won; // secondary tie-breaker
    });

    setPointTable(sorted);
  };

  const handleToggleTeamSelection = (teamId: string) => {
    if (selectedTeams.includes(teamId)) {
      setSelectedTeams(selectedTeams.filter(id => id !== teamId));
    } else {
      setSelectedTeams([...selectedTeams, teamId]);
    }
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tourneyName.trim() || selectedTeams.length < 2) return;

    setCreating(true);
    try {
      const selectedModels = teams.filter(t => selectedTeams.includes(t.id));
      const teamNames = selectedModels.map(t => t.name);

      await firebaseService.createTournament(
        tourneyName.trim(),
        tourneyDesc.trim(),
        selectedTeams,
        teamNames,
        userId,
        authNameLabel()
      );

      setTourneyName("");
      setTourneyDesc("");
      setSelectedTeams([]);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const authNameLabel = () => {
    return "Club Admin";
  };

  const activeTourney = tournaments.find(t => t.id === selectedTourneyId);

  return (
    <div id="tournament-manager-section" className="space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-900/40 via-slate-800/60 to-slate-800/30 p-6 rounded-2xl border border-emerald-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-emerald-400" /> Tournaments Control
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Build leagues, add team pools, and view automated live score point tables.
          </p>
        </div>
        <div className="flex gap-2">
          {selectedTourneyId && (
            <button
              onClick={() => setSelectedTourneyId(null)}
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold px-4 py-2 rounded-lg transition shrink-0 cursor-pointer"
            >
              Back to Overview
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : !selectedTourneyId ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create League */}
          <div className="bg-slate-800/60 p-6 rounded-xl border border-slate-700/80 shadow-md">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" /> Start Tournament
            </h2>

            <form onSubmit={handleCreateTournament} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Tournament / League Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Summer T20 Blast"
                  value={tourneyName}
                  onChange={(e) => setTourneyName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Category / Description
                </label>
                <textarea
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-emerald-500 h-20"
                  placeholder="Local weekend cricket championship..."
                  value={tourneyDesc}
                  onChange={(e) => setTourneyDesc(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Select Participating Squads
                </label>
                {teams.length === 0 ? (
                  <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/60 text-center text-xs text-slate-500">
                    No teams available. Register teams in the Teams tab first!
                    <button
                      type="button"
                      onClick={() => onNavigateToTab("teams")}
                      className="text-emerald-400 font-bold block mt-1 hover:underline mx-auto"
                    >
                      Go to Teams Tab
                    </button>
                  </div>
                ) : (
                  <div className="max-h-44 overflow-y-auto space-y-1 bg-slate-900/50 p-2 rounded-lg border border-slate-700">
                    {teams.map((team) => (
                      <label key={team.id} className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-800 p-2 rounded cursor-pointer border border-slate-700/30">
                        <input
                          type="checkbox"
                          checked={selectedTeams.includes(team.id)}
                          onChange={() => handleToggleTeamSelection(team.id)}
                          className="rounded text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                        />
                        <span className="text-sm font-medium text-slate-200">{team.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={creating || selectedTeams.length < 2 || teams.length === 0}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold py-2.5 rounded-lg transition duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/10"
              >
                {creating ? "Launching..." : "Launch Tournament"}
              </button>
            </form>
          </div>

          {/* Active Tournament Cards */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" /> Active Tournaments ({tournaments.length})
            </h2>

            {tournaments.length === 0 ? (
              <div className="bg-slate-800/30 border border-slate-700 py-16 rounded-xl text-center text-slate-400">
                No active tournaments launched. Complete the quick setup to starting scoring!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tournaments.map((tourney) => (
                  <div
                    key={tourney.id}
                    onClick={() => handleSelectTournament(tourney)}
                    className="bg-slate-800/40 hover:bg-slate-800/60 transition p-5 rounded-xl border border-slate-700/60 flex flex-col justify-between cursor-pointer group"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-extrabold text-lime-400 text-lg group-hover:text-emerald-400 transition">{tourney.name}</h3>
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${tourney.status === "completed" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
                          {tourney.status}
                        </span>
                      </div>
                      <p className="text-slate-400 text-sm line-clamp-2 mb-4">{tourney.description || "Local premier cricket championship"}</p>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-700/40 pt-3">
                        <div className="text-slate-400 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-500" /> {tourney.teamIds.length} Teams
                        </div>
                        <div className="text-slate-400 flex items-center gap-1 text-right justify-end">
                          <Swords className="w-3.5 h-3.5 text-slate-500" /> {tourney.matchesList?.length || 0} Fixtures
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mt-4 justify-end">
                      View Standings & Matches <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Tournament Dashboard View */
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* standings Table */}
            <div className="lg:col-span-2 bg-slate-800/60 p-6 rounded-2xl border border-slate-700 shadow-md">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Medal className="w-5 h-5 text-amber-400" /> Point Table Standings
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Club Team</th>
                      <th className="py-3 px-4 text-center">Played</th>
                      <th className="py-3 px-4 text-center text-emerald-400">Wins</th>
                      <th className="py-3 px-4 text-center text-rose-400">Losses</th>
                      <th className="py-3 px-4 text-center text-amber-300">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/40 text-slate-200">
                    {pointTable.map((row, index) => (
                      <tr key={index} className="hover:bg-slate-700/30 transition">
                        <td className="py-3.5 px-4 font-bold flex items-center gap-3">
                          <span className={`w-5 h-5 text-xs rounded-full flex items-center justify-center font-bold ${index === 0 ? "bg-amber-400 text-slate-900" : index === 1 ? "bg-slate-300 text-slate-900" : "bg-slate-700 text-slate-300"}`}>
                            {index + 1}
                          </span>
                          {row.teamName}
                        </td>
                        <td className="py-3.5 px-4 text-center">{row.played}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-emerald-400">{row.won}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-rose-400">{row.lost}</td>
                        <td className="py-3.5 px-4 text-center font-extrabold text-amber-300 text-base">{row.points}</td>
                      </tr>
                    ))}
                    {pointTable.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500 italic">No teams registered or active</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tournament Info */}
            <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700 flex flex-col justify-between">
              <div>
                <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 mb-2">Selected League</h3>
                <h2 className="text-2xl font-black text-white">{activeTourney?.name}</h2>
                <p className="text-slate-400 text-sm mt-3 leading-relaxed">{activeTourney?.description || "Local premier grand-championship organized in the district."}</p>
                
                <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 mt-6 mb-3">Competing Teams ({activeTourney?.teamNames.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {activeTourney?.teamNames.map((n, i) => (
                    <span key={i} className="bg-slate-900/80 px-2.5 py-1 text-xs rounded-lg border border-slate-700 font-medium text-slate-300">
                      {n}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-700/40">
                <button
                  onClick={() => onNavigateToTab("live")}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 active:from-emerald-600 hover:scale-[1.01] text-slate-950 font-bold py-2.5 rounded-lg transition dynamic-shadow flex items-center justify-center gap-1.5 cursor-pointer text-sm"
                >
                  <Swords className="w-4 h-4 shadow-sm" /> Schedule Match Now
                </button>
              </div>
            </div>
          </div>

          {/* Tournament Fixtures / Matches */}
          <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Swords className="w-5 h-5 text-emerald-400" /> Matches / Fixtures list
            </h3>

            {tourneyMatches.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                No matches scheduled for this tournament yet. Create one in the Match Control panel.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tourneyMatches.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => onSelectMatch(m.id)}
                    className="bg-slate-800/80 hover:bg-slate-800 transition p-4 rounded-xl border border-slate-700/80 flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] uppercase tracking-widest font-black px-2 py-0.5 rounded ${m.status === "completed" ? "bg-slate-700/80 text-slate-300" : m.status === "live" ? "bg-rose-500/20 text-rose-300 animate-pulse" : "bg-emerald-500/10 text-emerald-400"}`}>
                          {m.status}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{new Date(m.createdAt).toLocaleDateString()}</span>
                      </div>

                      <div className="flex items-center justify-between mt-3 mb-1">
                        <div className="font-extrabold text-sm text-slate-100">{m.teamAName}</div>
                        {m.status !== "scheduled" && (
                          <div className="font-black text-sm text-teal-400">{m.innings1?.runs} / {m.innings1?.wickets}</div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="font-extrabold text-sm text-slate-100">{m.teamBName}</div>
                        {m.status === "completed" && m.innings2 && (
                          <div className="font-black text-sm text-teal-400">{m.innings2?.runs} / {m.innings2?.wickets}</div>
                        )}
                        {m.status === "live" && m.currentInnings === 2 && m.innings2 && (
                          <div className="font-black text-sm text-teal-400">{m.innings2?.runs} / {m.innings2?.wickets}</div>
                        )}
                      </div>

                      {m.resultSummary && (
                        <p className="text-xs text-amber-300 font-semibold mt-3 italic">{m.resultSummary}</p>
                      )}
                    </div>
                    
                    <div className="ml-4 shrink-0 bg-slate-700/60 p-2 rounded-lg group-hover:bg-emerald-500/20 transition group-hover:text-emerald-300 text-slate-400">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
