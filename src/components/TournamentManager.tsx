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
      const [tList, teamList, mList] = await Promise.all([
        firebaseService.getTournaments(),
        firebaseService.getTeams(),
        firebaseService.getMatches()
      ]);
      setTournaments(tList);
      setTeams(teamList);
      setMatches(mList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    window.addEventListener("local-db-updated", loadData);
    return () => {
      window.removeEventListener("local-db-updated", loadData);
    };
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
      <div className="bg-brand-surface p-5 rounded-xl border border-soft flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-sky-400" /> Tournaments Control
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Build leagues, add team pools, and view automated live score point tables.
          </p>
        </div>
        <div className="flex gap-2">
          {selectedTourneyId && (
            <button
              onClick={() => setSelectedTourneyId(null)}
              className="bg-brand-action hover:bg-slate-700 border border-soft text-slate-200 text-xs font-bold px-4 py-2 rounded-lg transition shrink-0 cursor-pointer"
            >
              Back to Overview
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
        </div>
      ) : !selectedTourneyId ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create League */}
          <div className="bg-brand-surface p-5 rounded-xl border border-soft shadow-md">
            <h2 className="text-sm font-extrabold text-white mb-5 uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-sky-400" /> Start Tournament
            </h2>

            <form onSubmit={handleCreateTournament} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Tournament / League Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-950/80 border border-soft rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-sans"
                  placeholder="e.g. Summer T20 Blast"
                  value={tourneyName}
                  onChange={(e) => setTourneyName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Category / Description
                </label>
                <textarea
                  className="w-full bg-slate-950/80 border border-soft rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 h-20"
                  placeholder="Local weekend cricket championship..."
                  value={tourneyDesc}
                  onChange={(e) => setTourneyDesc(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Select Participating Squads
                </label>
                {teams.length === 0 ? (
                  <div className="p-3 bg-slate-900/50 rounded-lg border border-soft text-center text-xs text-slate-500">
                    No teams available. Register teams in the Teams tab first!
                    <button
                      type="button"
                      onClick={() => onNavigateToTab("teams")}
                      className="text-sky-400 font-bold block mt-1 hover:underline mx-auto"
                    >
                      Go to Teams Tab
                    </button>
                  </div>
                ) : (
                  <div className="max-h-44 overflow-y-auto space-y-1 bg-slate-950/50 p-2 rounded-lg border border-soft">
                    {teams.map((team) => (
                      <label key={team.id} className="flex items-center gap-2 bg-slate-900/40 hover:bg-slate-800/40 p-2 rounded cursor-pointer border border-soft/50">
                        <input
                          type="checkbox"
                          checked={selectedTeams.includes(team.id)}
                          onChange={() => handleToggleTeamSelection(team.id)}
                          className="rounded text-sky-500 focus:ring-sky-500 bg-slate-900 border-soft"
                        />
                        <span className="text-xs font-semibold text-slate-200">{team.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={creating || selectedTeams.length < 2 || teams.length === 0}
                className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-extrabold text-sm py-2 rounded-lg transition duration-150 flex items-center justify-center gap-2 cursor-pointer border border-sky-450/20 shadow-lg shadow-sky-900/20"
              >
                {creating ? "Launching..." : "Launch Tournament"}
              </button>
            </form>
          </div>

          {/* Active Tournament Cards */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-extrabold text-white mb-2 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-400" /> Active Tournaments ({tournaments.length})
            </h2>

            {tournaments.length === 0 ? (
              <div className="bg-brand-surface border border-soft py-16 rounded-xl text-center text-slate-400">
                No active tournaments launched. Complete the quick setup to starting scoring!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tournaments.map((tourney) => (
                  <div
                    key={tourney.id}
                    onClick={() => handleSelectTournament(tourney)}
                    className="bg-brand-surface hover:bg-slate-800/50 transition p-4 rounded-xl border border-soft flex flex-col justify-between cursor-pointer group shadow-lg"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-extrabold text-sky-400 text-base group-hover:text-sky-350 transition">{tourney.name}</h3>
                        <span className={`text-[9px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded border ${tourney.status === "completed" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-sky-500/10 text-sky-400 border border-sky-500/20"}`}>
                          {tourney.status}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs line-clamp-2 mb-4 leading-relaxed">{tourney.description || "Local premier cricket championship"}</p>
                      
                      <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-soft pt-3 font-mono font-bold uppercase tracking-wider">
                        <div className="text-slate-400 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-500" /> {tourney.teamIds.length} Teams
                        </div>
                        <div className="text-slate-400 flex items-center gap-1 text-right justify-end">
                          <Swords className="w-3.5 h-3.5 text-slate-500" /> {tourney.matchesList?.length || 0} Fixtures
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-sky-400 font-bold mt-4 justify-end">
                      Standings & Matches <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition" />
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
            <div className="lg:col-span-2 bg-brand-surface p-5 rounded-xl border border-soft shadow-lg">
              <h2 className="text-sm font-extrabold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
                <Medal className="w-4 h-4 text-amber-500 animate-pulse" /> Point Table Standings
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-soft text-slate-450 text-[10px] font-bold uppercase tracking-widest">
                      <th className="py-2.5 px-4">Club Team</th>
                      <th className="py-2.5 px-4 text-center">Played</th>
                      <th className="py-2.5 px-4 text-center text-sky-450">Wins</th>
                      <th className="py-2.5 px-4 text-center text-rose-450">Losses</th>
                      <th className="py-2.5 px-4 text-center text-sky-400">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-soft/50 text-slate-200">
                    {pointTable.map((row, index) => (
                      <tr key={index} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-bold flex items-center gap-3 text-sm">
                          <span className={`w-5 h-5 text-xs rounded flex items-center justify-center font-bold ${index === 0 ? "bg-amber-400 text-slate-950 font-black" : index === 1 ? "bg-slate-300 text-slate-950 font-bold" : "bg-brand-action text-slate-300 font-bold"}`}>
                            {index + 1}
                          </span>
                          {row.teamName}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-xs">{row.played}</td>
                        <td className="py-3 px-4 text-center font-bold text-sky-400 font-mono text-xs">{row.won}</td>
                        <td className="py-3 px-4 text-center font-bold text-rose-400 font-mono text-xs">{row.lost}</td>
                        <td className="py-3 px-4 text-center font-extrabold text-sky-450 font-mono text-sm">{row.points}</td>
                      </tr>
                    ))}
                    {pointTable.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500 italic text-xs font-mono">No teams registered or active</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tournament Info */}
            <div className="bg-brand-surface p-5 rounded-xl border border-soft flex flex-col justify-between shadow-lg">
              <div>
                <h3 className="text-[9px] uppercase font-bold tracking-widest text-slate-500 mb-1.5">Selected League</h3>
                <h2 className="text-xl font-black text-white">{activeTourney?.name}</h2>
                <p className="text-slate-400 text-xs mt-3 leading-relaxed">{activeTourney?.description || "Local premier grand-championship organized in the district."}</p>
                
                <h4 className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-6 mb-3">Competing Teams ({activeTourney?.teamNames.length})</h4>
                <div className="flex flex-wrap gap-1.5">
                  {activeTourney?.teamNames.map((n, i) => (
                    <span key={i} className="bg-slate-950/80 px-2.5 py-1 text-[10px] rounded border border-soft font-mono font-bold text-slate-300">
                      {n}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-soft">
                <button
                  onClick={() => onNavigateToTab("live")}
                  className="w-full bg-sky-600 hover:bg-sky-500 text-white font-extrabold py-2.5 rounded-lg transition border border-sky-450/20 shadow-lg shadow-sky-900/20 flex items-center justify-center gap-1.5 cursor-pointer text-xs uppercase tracking-wider font-mono"
                >
                  <Swords className="w-4 h-4 shadow-sm" /> Schedule Match Now
                </button>
              </div>
            </div>
          </div>

          {/* Tournament Fixtures / Matches */}
          <div className="bg-brand-surface p-5 rounded-xl border border-soft shadow-lg">
            <h3 className="text-sm font-extrabold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
              <Swords className="w-4 h-4 text-sky-400" /> Matches / Fixtures list
            </h3>

            {tourneyMatches.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-mono text-xs">
                No matches scheduled for this tournament yet. Create one in the Match Control panel.
              </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tourneyMatches.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => onSelectMatch(m.id)}
                      className="bg-slate-950/40 hover:bg-slate-850 p-4 rounded-xl border border-soft flex items-center justify-between cursor-pointer group shadow-sm"
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border ${m.status === "completed" ? "bg-slate-800 text-slate-400 border-soft" : m.status === "live" ? "bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse" : "bg-sky-500/10 text-sky-400 border border-sky-500/20"}`}>
                            {m.status}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono font-semibold">{new Date(m.createdAt).toLocaleDateString()}</span>
                        </div>

                        <div className="flex items-center justify-between mt-3 mb-1">
                          <div className="font-bold text-sm text-slate-100">{m.teamAName}</div>
                          {m.status !== "scheduled" && (
                            <div className="font-bold text-sm text-sky-400 font-mono">{m.innings1?.runs} / {m.innings1?.wickets}</div>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="font-bold text-sm text-slate-100">{m.teamBName}</div>
                          {m.status === "completed" && m.innings2 && (
                            <div className="font-bold text-sm text-sky-400 font-mono">{m.innings2?.runs} / {m.innings2?.wickets}</div>
                          )}
                          {m.status === "live" && m.currentInnings === 2 && m.innings2 && (
                            <div className="font-bold text-sm text-sky-400 font-mono">{m.innings2?.runs} / {m.innings2?.wickets}</div>
                          )}
                        </div>

                        {m.resultSummary && (
                          <p className="text-xs text-amber-300 font-semibold mt-3 italic">{m.resultSummary}</p>
                        )}
                      </div>
                      
                      <div className="ml-4 shrink-0 bg-slate-800/80 border border-soft p-2 rounded-lg group-hover:bg-sky-500/15 group-hover:text-sky-350 transition text-slate-400">
                        <ArrowRight className="w-5 h-5 animate-pulse" />
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
