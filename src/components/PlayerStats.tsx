import React, { useState, useEffect } from "react";
import { firebaseService } from "../firebaseService";
import { Player } from "../types";
import { calcStrikeRate, calcAverage, calcEconomy, ballsToOvers } from "../utils/cricket";
import { Search, Trophy, Medal, Star, ShieldAlert, Swords, CircleUser, Sparkles, X } from "lucide-react";

export default function PlayerStats() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<"all" | "batsman" | "bowler" | "fielder">("all");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        setLoading(true);
        const list = await firebaseService.getPlayers();
        setPlayers(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadPlayers();

    window.addEventListener("local-db-updated", loadPlayers);
    return () => {
      window.removeEventListener("local-db-updated", loadPlayers);
    };
  }, []);

  const filteredPlayers = players.filter((player) => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (player.teamName || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    // Optional filters based on primary skills
    if (selectedRoleFilter === "batsman") {
      return (player.stats.runs || 0) > 0;
    }
    if (selectedRoleFilter === "bowler") {
      return (player.stats.wickets || 0) > 0;
    }
    if (selectedRoleFilter === "fielder") {
      return (player.stats.catches || player.stats.stumpings || player.stats.runOuts || 0) > 0;
    }
    return true;
  });

  return (
    <div id="player-statistics-container" className="space-y-6">
      {/* Search and Filters Header */}
      <div className="bg-brand-surface p-4 rounded-xl border border-soft flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="relative w-full md:w-96">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            className="w-full bg-slate-950/80 border border-soft rounded-lg py-1.5 pl-10 pr-4 text-slate-200 text-xs focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-sans"
            placeholder="Search players or local clubs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
          {(["all", "batsman", "bowler", "fielder"] as const).map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRoleFilter(role)}
              className={`text-[10px] px-3.5 py-1.5 rounded font-bold border transition shrink-0 uppercase tracking-widest cursor-pointer ${selectedRoleFilter === role ? "bg-sky-600 text-white border-sky-550 shadow-sm" : "bg-slate-950/65 text-slate-300 border-soft hover:bg-slate-800 hover:text-white"}`}
            >
              {role === "all" ? "All Players" : `${role}s`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 font-mono text-xs">Loading comprehensive player pool...</div>
      ) : filteredPlayers.length === 0 ? (
        <div className="bg-brand-surface border border-soft py-16 rounded-xl text-center text-slate-400 max-w-xl mx-auto font-mono text-xs">
          No players match your active search terms. Use matches to record stats!
        </div>
      ) : (
        /* Players Stats Grid Table */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlayers.map((player) => {
            return (
              <div
                key={player.id}
                onClick={() => setSelectedPlayer(player)}
                className="bg-brand-surface hover:bg-slate-800/50 transition p-4 rounded-xl border border-soft cursor-pointer flex flex-col justify-between group shadow-lg relative overflow-hidden"
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center text-sky-450 border border-soft font-bold group-hover:scale-105 duration-200">
                      <CircleUser className="w-5 h-5 text-sky-400" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-white text-sm group-hover:text-sky-350 transition">{player.name}</h3>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400">{player.teamName || "Free Agent"}</span>
                    </div>
                  </div>

                  {/* Career Metrics Preview */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-t border-soft">
                    <div className="text-center bg-slate-950/40 p-2 rounded border border-soft/30">
                      <span className="block text-[8px] text-slate-500 uppercase tracking-widest font-bold">Runs</span>
                      <span className="block font-bold text-sky-400 font-mono text-sm leading-tight mt-0.5">{player.stats.runs || 0}</span>
                    </div>
                    <div className="text-center bg-slate-950/40 p-2 rounded border border-soft/30">
                      <span className="block text-[8px] text-slate-500 uppercase tracking-widest font-bold">Wickets</span>
                      <span className="block font-bold text-sky-400 font-mono text-sm leading-tight mt-0.5">{player.stats.wickets || 0}</span>
                    </div>
                    <div className="text-center bg-slate-950/40 p-2 rounded border border-soft/30">
                      <span className="block text-[8px] text-slate-500 uppercase tracking-widest font-bold">Matches</span>
                      <span className="block font-bold text-slate-300 font-mono text-sm leading-tight mt-0.5">{player.stats.matches || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="text-[9px] mt-2 group-hover:underline text-sky-400 text-right font-bold uppercase tracking-widest">
                  View Detailed Breakdown &rarr;
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comprehensive individual player breakdown overlay modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-brand-surface border border-soft rounded-xl max-w-2xl w-full p-5 relative shadow-inner overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setSelectedPlayer(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded border border-soft bg-slate-950/40 hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-full bg-slate-950 border border-soft flex items-center justify-center text-sky-450">
                <Trophy className="w-6 h-6 text-sky-450" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-white">{selectedPlayer.name}</h2>
                <span className="text-xs text-sky-400 font-mono font-bold uppercase tracking-wider">{selectedPlayer.teamName || "Unattached player"}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Batting metrics */}
              <div className="bg-slate-950/55 p-4 rounded-lg border border-soft/50">
                <h3 className="text-[10px] font-bold text-sky-400 uppercase tracking-widest border-b border-soft pb-2 mb-3 flex items-center gap-1.5">
                  <Swords className="w-4 h-4 text-sky-400" /> Batting Statistics
                </h3>
                <div className="space-y-2 text-xs text-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-medium">Innings</span>
                    <span className="font-bold font-mono">{selectedPlayer.stats.innings}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-medium font-sans">Runs Scored</span>
                    <span className="font-extrabold text-sky-400 font-mono">{selectedPlayer.stats.runs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-medium">Balls Faced</span>
                    <span className="font-bold font-mono">{selectedPlayer.stats.ballsFaced}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-medium">Strike Rate</span>
                    <span className="font-bold text-sky-400 font-mono">
                      {calcStrikeRate(selectedPlayer.stats.runs, selectedPlayer.stats.ballsFaced)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-medium">Batting Average</span>
                    <span className="font-bold font-mono">
                      {calcAverage(selectedPlayer.stats.runs, selectedPlayer.stats.innings - selectedPlayer.stats.notOuts)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-medium">High Score</span>
                    <span className="font-bold font-mono">{selectedPlayer.stats.highScore}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-medium">Not Outs</span>
                    <span className="font-bold font-mono">{selectedPlayer.stats.notOuts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-medium">Fifties / Hundreds</span>
                    <span className="font-bold font-mono">{selectedPlayer.stats.fifties} / {selectedPlayer.stats.hundreds}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-medium">Fours / Sixes</span>
                    <span className="font-bold font-mono text-sky-450">{selectedPlayer.stats.fours} / {selectedPlayer.stats.sixes}</span>
                  </div>
                </div>
              </div>

              {/* Bowling metrics */}
              <div className="bg-slate-950/55 p-4 rounded-lg border border-soft/50">
                <h3 className="text-[10px] font-bold text-sky-400 uppercase tracking-widest border-b border-soft pb-2 mb-3 flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-sky-400" /> Bowling Statistics
                </h3>
                <div className="space-y-2 text-xs text-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-medium">Overs Bowled</span>
                    <span className="font-bold font-mono">{ballsToOvers(selectedPlayer.stats.ballsBowled || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-medium font-sans">Wickets Taken</span>
                    <span className="font-extrabold text-sky-400 font-mono">{selectedPlayer.stats.wickets}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-medium">Runs Conceded</span>
                    <span className="font-bold text-rose-450 font-mono">{selectedPlayer.stats.runsConceded}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-medium">Economy Rate</span>
                    <span className="font-bold font-mono">
                      {calcEconomy(selectedPlayer.stats.runsConceded, selectedPlayer.stats.ballsBowled)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-medium">Bowling Average</span>
                    <span className="font-bold font-mono">
                      {selectedPlayer.stats.wickets > 0 ? (selectedPlayer.stats.runsConceded / selectedPlayer.stats.wickets).toFixed(2) : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-medium">Maidens</span>
                    <span className="font-bold font-mono">{selectedPlayer.stats.maidens}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-medium">Best Bowling</span>
                    <span className="font-bold font-mono font-bold text-sky-450">
                      {selectedPlayer.stats.bestBowlingWickets > 0 ? `${selectedPlayer.stats.bestBowlingWickets}/${selectedPlayer.stats.bestBowlingRuns}` : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-medium">5-wickets (5w)</span>
                    <span className="font-bold font-mono text-sky-455">{selectedPlayer.stats.fiveWickets}</span>
                  </div>
                </div>
              </div>

              {/* Fielding metrics */}
              <div className="bg-slate-950/55 p-4 rounded-lg border border-soft/50 md:col-span-2">
                <h3 className="text-[10px] font-bold text-sky-400 uppercase tracking-widest border-b border-soft pb-2 mb-3 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-sky-400" /> Fielding Statistics
                </h3>
                <div className="grid grid-cols-3 gap-3 text-center mt-2 text-xs text-slate-200">
                  <div className="bg-slate-900/60 p-2 rounded border border-soft/50">
                    <span className="block text-[8px] uppercase tracking-widest font-mono text-slate-450">Catches</span>
                    <span className="block font-bold font-mono text-sm text-sky-400 mt-1">{selectedPlayer.stats.catches || 0}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded border border-soft/50">
                    <span className="block text-[8px] uppercase tracking-widest font-mono text-slate-450">Stumpings</span>
                    <span className="block font-bold font-mono text-sm text-sky-400 mt-1">{selectedPlayer.stats.stumpings || 0}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded border border-soft/50">
                    <span className="block text-[8px] uppercase tracking-widest font-mono text-slate-450">Run Outs</span>
                    <span className="block font-bold font-mono text-sm text-sky-400 mt-1">{selectedPlayer.stats.runOuts || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
