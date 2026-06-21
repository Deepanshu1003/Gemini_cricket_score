import React, { useState, useEffect } from "react";
import { firebaseService } from "../firebaseService";
import { Team } from "../types";
import { Users, Plus, UserPlus, X, ShieldAlert } from "lucide-react";

interface TeamsListProps {
  userId: string;
}

export default function TeamsList({ userId }: TeamsListProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [playersInput, setPlayersInput] = useState("");
  const [playersList, setPlayersList] = useState<string[]>([]);
  const [singlePlayerName, setSinglePlayerName] = useState("");
  const [errorCode, setErrorCode] = useState("");

  const loadTeams = async () => {
    try {
      setLoading(true);
      const list = await firebaseService.getTeams();
      setTeams(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = singlePlayerName.trim();
    if (!clean) return;
    if (playersList.some((p) => p.toLowerCase() === clean.toLowerCase())) {
      setErrorCode("Player already added to list");
      return;
    }
    setPlayersList([...playersList, clean]);
    setSinglePlayerName("");
    setErrorCode("");
  };

  const handleRemovePlayer = (index: number) => {
    setPlayersList(playersList.filter((_, i) => i !== index));
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorCode("");
    const nameClean = teamName.trim();
    if (!nameClean) {
      setErrorCode("Team name is required");
      return;
    }
    if (playersList.length < 5) {
      setErrorCode("A cricket team needs at least 5 players to start registering");
      return;
    }

    try {
      await firebaseService.createTeam(nameClean, playersList, userId);
      setTeamName("");
      setPlayersList([]);
      loadTeams();
    } catch (err: any) {
      console.error(err);
      setErrorCode(err.message || "Failed to create team.");
    }
  };

  return (
    <div id="teams-list-section" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Create Team Form */}
      <div className="bg-slate-800/60 p-6 rounded-xl border border-slate-700/80 shadow-md">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Plus className="w-5 h-5 text-emerald-400" /> Register Local Team
        </h2>

        {errorCode && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm p-3 rounded-lg mb-4 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4" />
            {errorCode}
          </div>
        )}

        <form onSubmit={handleCreateTeam} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Team Name
            </label>
            <input
              type="text"
              className="w-full bg-slate-900/90 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-emerald-500"
              placeholder="e.g. Melbourne Stars"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Squad Players ({playersList.length} Added)
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                className="flex-1 bg-slate-900/90 border border-slate-700 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-emerald-500"
                placeholder="e.g. Mitchell Starc"
                value={singlePlayerName}
                onChange={(e) => setSinglePlayerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddPlayer(e);
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddPlayer}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 p-2 rounded-lg transition shrink-0 cursor-pointer"
              >
                <UserPlus className="w-5 h-5" />
              </button>
            </div>

            {playersList.length > 0 ? (
              <div className="max-h-56 overflow-y-auto bg-slate-900/50 rounded-lg border border-slate-700 p-2 space-y-1">
                {playersList.map((player, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700/50">
                    <span className="text-sm text-slate-200 font-medium">
                      {idx + 1}. {player}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePlayer(idx)}
                      className="text-slate-400 hover:text-rose-400 transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No players registered yet. Add at least 5 players.</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-bold py-2.5 rounded-lg transition duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/10"
          >
            Create Team Squad
          </button>
        </form>
      </div>

      {/* Teams Grid List */}
      <div className="lg:col-span-2">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-400" /> Registered Teams ({teams.length})
        </h2>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading teams...</div>
        ) : teams.length === 0 ? (
          <div className="bg-slate-800/40 border border-slate-700 py-12 rounded-xl text-center text-slate-400">
            No teams registered yet. Be the first to create one!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.map((team) => (
              <div key={team.id} className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-lg text-emerald-300">{team.name}</h3>
                    <span className="bg-teal-500/10 text-teal-300 text-xs px-2.5 py-1 rounded-full border border-teal-500/20 font-semibold">
                      {team.playerNames.length} Players
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto mb-4">
                    {team.playerNames.map((p, pIdx) => (
                      <span key={pIdx} className="bg-slate-900/80 text-xs text-slate-300 px-2 py-1 rounded border border-slate-700/50">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between pt-3 border-t border-slate-700/30">
                  <span>ID: {team.id}</span>
                  <span>Created: {new Date(team.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
