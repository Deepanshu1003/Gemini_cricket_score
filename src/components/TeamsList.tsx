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
      <div className="bg-brand-surface p-5 rounded-xl border border-soft shadow-md">
        <h2 className="text-sm font-extrabold text-white mb-5 uppercase tracking-wider flex items-center gap-2">
          <Plus className="w-4 h-4 text-sky-400" /> Register Local Team
        </h2>

        {errorCode && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs p-3 rounded-lg mb-4 flex items-center gap-1.5 font-mono">
            <ShieldAlert className="w-4 h-4 text-rose-450" />
            {errorCode}
          </div>
        )}

        <form onSubmit={handleCreateTeam} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Team Name
            </label>
            <input
              type="text"
              className="w-full bg-slate-950/80 border border-soft rounded-lg py-2 px-3 text-slate-200 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-sans"
              placeholder="e.g. Melbourne Stars"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Squad Players ({playersList.length} Added)
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                className="flex-1 bg-slate-950/80 border border-soft rounded-lg py-1.5 px-3 text-slate-200 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-sans"
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
                className="bg-brand-action hover:bg-slate-750 border border-soft text-slate-200 p-2 rounded-lg transition shrink-0 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>

            {playersList.length > 0 ? (
              <div className="max-h-56 overflow-y-auto bg-slate-950/50 rounded-lg border border-soft p-2 space-y-1">
                {playersList.map((player, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-900/40 px-3 py-1.5 rounded border border-soft/50">
                    <span className="text-xs text-slate-200 font-semibold font-mono">
                      {idx + 1}. {player}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePlayer(idx)}
                      className="text-slate-500 hover:text-rose-400 transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-slate-500 italic">No players registered yet. Add at least 5 players.</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-sm py-2 rounded-lg transition duration-150 flex items-center justify-center gap-2 cursor-pointer border border-sky-450/20 shadow-lg"
          >
            Create Team Squad
          </button>
        </form>
      </div>

      {/* Teams Grid List */}
      <div className="lg:col-span-2">
        <h2 className="text-sm font-extrabold text-white mb-5 uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4 text-sky-400" /> Registered Teams ({teams.length})
        </h2>

        {loading ? (
          <div className="text-center py-12 text-slate-400 font-mono text-xs">Loading teams...</div>
        ) : teams.length === 0 ? (
          <div className="bg-brand-surface border border-soft py-12 rounded-xl text-center text-slate-400 text-xs font-mono">
            No teams registered yet. Be the first to create one!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.map((team) => (
              <div key={team.id} className="bg-brand-surface p-4 rounded-xl border border-soft flex flex-col justify-between shadow-lg">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-extrabold text-base text-sky-400">{team.name}</h3>
                    <span className="bg-sky-500/10 text-sky-450 text-[10px] px-2.5 py-1 rounded border border-sky-500/20 font-bold font-mono">
                      {team.playerNames.length} Players
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto mb-4">
                    {team.playerNames.map((p, pIdx) => (
                      <span key={pIdx} className="bg-slate-950/85 text-[10px] text-slate-300 px-2 py-0.5 rounded border border-soft">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-[9px] text-slate-500 font-mono flex items-center justify-between pt-2.5 border-t border-soft uppercase tracking-wide">
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
