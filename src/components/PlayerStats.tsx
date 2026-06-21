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
      <div className="bg-slate-800/60 p-5 rounded-xl border border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
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
              className={`text-xs px-4 py-2 rounded-lg font-semibold border transition shrink-0 uppercase tracking-widest cursor-pointer ${selectedRoleFilter === role ? "bg-emerald-500 text-slate-950 border-emerald-500" : "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800"}`}
            >
              {role === "all" ? "All Players" : `${role}s`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading comprehensive player pool...</div>
      ) : filteredPlayers.length === 0 ? (
        <div className="bg-slate-800/40 border border-slate-700 py-16 rounded-xl text-center text-slate-400">
          No players match your active search terms. Use matches to record stats!
        </div>
      ) : (
        /* Players Stats Grid Table */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlayers.map((player) => {
            const battingAvg = calcAverage(player.stats.runs, player.stats.innings - player.stats.notOuts);
            const striking = calcStrikeRate(player.stats.runs, player.stats.ballsFaced);
            const bowlingEcon = calcEconomy(player.stats.runsConceded, player.stats.ballsBowled);

            return (
              <div
                key={player.id}
                onClick={() => setSelectedPlayer(player)}
                className="bg-slate-800/40 hover:bg-slate-800/80 transition p-5 rounded-2xl border border-slate-700/80 cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-emerald-400 border border-slate-700 font-bold group-hover:scale-105 duration-200">
                      <CircleUser className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-white text-base group-hover:text-emerald-300 transition">{player.name}</h3>
                      <span className="text-xs text-lime-400 font-medium">{player.teamName || "Free Agent"}</span>
                    </div>
                  </div>

                  {/* Career Metrics Preview */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-t border-slate-700/40">
                    <div className="text-center bg-slate-900/40 p-2 rounded-lg">
                      <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-black">Runs</span>
                      <span className="block font-black text-amber-300 text-lg">{player.stats.runs || 0}</span>
                    </div>
                    <div className="text-center bg-slate-900/40 p-2 rounded-lg">
                      <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-black">Wickets</span>
                      <span className="block font-black text-teal-300 text-lg">{player.stats.wickets || 0}</span>
                    </div>
                    <div className="text-center bg-slate-900/40 p-2 rounded-lg">
                      <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-black">Matches</span>
                      <span className="block font-black text-slate-300 text-lg">{player.stats.matches || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] mt-3 hover:underline text-emerald-400 text-right font-semibold tracking-wider">
                  View Detailed Breakdown &rarr;
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comprehensive individual player breakdown overlay modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 relative shadow-2xl overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setSelectedPlayer(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-teal-400">
                <Trophy className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">{selectedPlayer.name}</h2>
                <span className="text-sm text-amber-300 font-semibold">{selectedPlayer.teamName || "Unattached player"}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Batting metrics */}
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-700/50">
                <h3 className="text-sm font-extrabold text-emerald-400 uppercase tracking-widest border-b border-slate-700 pb-2 mb-3 flex items-center gap-1.5">
                  <Swords className="w-4 h-4" /> Batting Statistics
                </h3>
                <div className="space-y-2.5 text-sm text-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Innings</span>
                    <span className="font-bold">{selectedPlayer.stats.innings}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Runs Scored</span>
                    <span className="font-bold text-amber-300">{selectedPlayer.stats.runs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Balls Faced</span>
                    <span className="font-bold">{selectedPlayer.stats.ballsFaced}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Strike Rate</span>
                    <span className="font-bold">
                      {calcStrikeRate(selectedPlayer.stats.runs, selectedPlayer.stats.ballsFaced)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Batting Average</span>
                    <span className="font-bold">
                      {calcAverage(selectedPlayer.stats.runs, selectedPlayer.stats.innings - selectedPlayer.stats.notOuts)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">High Score</span>
                    <span className="font-bold">{selectedPlayer.stats.highScore}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Not Outs</span>
                    <span className="font-bold">{selectedPlayer.stats.notOuts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fifties / Hundreds</span>
                    <span className="font-bold">{selectedPlayer.stats.fifties} / {selectedPlayer.stats.hundreds}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fours / Sixes</span>
                    <span className="font-bold font-mono text-emerald-300">{selectedPlayer.stats.fours} / {selectedPlayer.stats.sixes}</span>
                  </div>
                </div>
              </div>

              {/* Bowling metrics */}
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-700/50">
                <h3 className="text-sm font-extrabold text-teal-400 uppercase tracking-widest border-b border-slate-700 pb-2 mb-3 flex items-center gap-1.5">
                  <Star className="w-4 h-4" /> Bowling Statistics
                </h3>
                <div className="space-y-2.5 text-sm text-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-400">OversBowled</span>
                    <span className="font-bold">{ballsToOvers(selectedPlayer.stats.ballsBowled || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Wickets Taken</span>
                    <span className="font-bold text-teal-300">{selectedPlayer.stats.wickets}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Runs Conceded</span>
                    <span className="font-bold text-rose-300">{selectedPlayer.stats.runsConceded}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Economy Rate</span>
                    <span className="font-bold">
                      {calcEconomy(selectedPlayer.stats.runsConceded, selectedPlayer.stats.ballsBowled)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bowling Average</span>
                    <span className="font-bold">
                      {selectedPlayer.stats.wickets > 0 ? (selectedPlayer.stats.runsConceded / selectedPlayer.stats.wickets).toFixed(2) : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Maidens</span>
                    <span className="font-bold">{selectedPlayer.stats.maidens}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Best Bowling</span>
                    <span className="font-bold">
                      {selectedPlayer.stats.bestBowlingWickets > 0 ? `${selectedPlayer.stats.bestBowlingWickets}/${selectedPlayer.stats.bestBowlingRuns}` : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">5-wickets (5w)</span>
                    <span className="font-bold text-teal-400">{selectedPlayer.stats.fiveWickets}</span>
                  </div>
                </div>
              </div>

              {/* Fielding metrics */}
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-700/50 md:col-span-2">
                <h3 className="text-sm font-extrabold text-amber-400 uppercase tracking-widest border-b border-slate-700 pb-2 mb-3 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4" /> Fielding Statistics
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center mt-2 text-sm text-slate-200">
                  <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700/60">
                    <span className="block text-xs text-slate-400">Catches</span>
                    <span className="block text-lg font-extrabold mt-1">{selectedPlayer.stats.catches || 0}</span>
                  </div>
                  <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700/60">
                    <span className="block text-xs text-slate-400">Stumpings</span>
                    <span className="block text-lg font-extrabold mt-1">{selectedPlayer.stats.stumpings || 0}</span>
                  </div>
                  <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700/60">
                    <span className="block text-xs text-slate-400">Run Outs</span>
                    <span className="block text-lg font-extrabold mt-1">{selectedPlayer.stats.runOuts || 0}</span>
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
