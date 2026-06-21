import { db } from "./firebase";
import { collection, doc, setDoc, addDoc, updateDoc, getDoc, getDocs, query, where, deleteDoc } from "firebase/firestore";
import { Match, Team, Tournament, Player, PlayerStats } from "./types";
import { generateId } from "./utils/cricket";

const MATCH_COLL = "matches";
const TEAM_COLL = "teams";
const TOURNEY_COLL = "tournaments";
const PLAYER_COLL = "players";

// Empty base stats structure
export const emptyPlayerStats = (): PlayerStats => ({
  matches: 0,
  innings: 0,
  runs: 0,
  ballsFaced: 0,
  fours: 0,
  sixes: 0,
  notOuts: 0,
  highScore: 0,
  fifties: 0,
  hundreds: 0,
  oversBowled: 0,
  ballsBowled: 0,
  maidens: 0,
  wickets: 0,
  runsConceded: 0,
  bestBowlingWickets: 0,
  bestBowlingRuns: 0,
  fiveWickets: 0,
  catches: 0,
  stumpings: 0,
  runOuts: 0,
});

// Helper to check if offline guest mode is active
const OFFLINE_TEAMS_KEY = "century_scorer_offline_teams";
const OFFLINE_TOURNEY_KEY = "century_scorer_offline_tournaments";
const OFFLINE_PLAYERS_KEY = "century_scorer_offline_players";
const OFFLINE_MATCHES_KEY = "century_scorer_offline_matches";

export const isOfflineMode = (): boolean => {
  const userStr = localStorage.getItem("offline_local_user");
  if (userStr) {
    try {
      const u = JSON.parse(userStr);
      return !!(u && u.uid && u.uid.startsWith("offline_"));
    } catch (e) {
      return false;
    }
  }
  return false;
};

const getLocalCollection = <T>(key: string): T[] => {
  const str = localStorage.getItem(key);
  if (!str) return [];
  try {
    return JSON.parse(str);
  } catch (e) {
    return [];
  }
};

const saveLocalCollection = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
  // Dispatch dynamic custom event so components re-sync state immediately
  window.dispatchEvent(new Event("local-db-updated"));
};

export const firebaseService = {
  // Teams
  async createTeam(name: string, playerNames: string[], createdBy: string): Promise<string> {
    const id = generateId();
    const finalTeam: Team = {
      id,
      name,
      playerNames,
      createdBy,
      createdAt: new Date().toISOString()
    };

    if (isOfflineMode()) {
      const list = getLocalCollection<Team>(OFFLINE_TEAMS_KEY);
      list.push(finalTeam);
      saveLocalCollection(OFFLINE_TEAMS_KEY, list);

      // Proactively initialize entries in players collection
      for (const pName of playerNames) {
        await this.initializePlayer(pName, id, name, createdBy);
      }
      return id;
    }

    await setDoc(doc(db, TEAM_COLL, id), finalTeam);

    // Proactively initialize entries in players collection
    for (const pName of playerNames) {
      await this.initializePlayer(pName, id, name, createdBy);
    }
    return id;
  },

  async getTeams(): Promise<Team[]> {
    if (isOfflineMode()) {
      return getLocalCollection<Team>(OFFLINE_TEAMS_KEY);
    }
    const snap = await getDocs(collection(db, TEAM_COLL));
    const teams: Team[] = [];
    snap.forEach((doc) => {
      teams.push(doc.data() as Team);
    });
    return teams;
  },

  // Tournaments
  async createTournament(name: string, description: string, teamIds: string[], teamNames: string[], createdBy: string, creatorName: string): Promise<string> {
    const id = generateId();
    const tourney: Tournament = {
      id,
      name,
      description,
      teamIds,
      teamNames,
      matchesList: [],
      status: "ongoing",
      createdBy,
      creatorName,
      createdAt: new Date().toISOString()
    };

    if (isOfflineMode()) {
      const list = getLocalCollection<Tournament>(OFFLINE_TOURNEY_KEY);
      list.push(tourney);
      saveLocalCollection(OFFLINE_TOURNEY_KEY, list);
      return id;
    }

    await setDoc(doc(db, TOURNEY_COLL, id), tourney);
    return id;
  },

  async getTournaments(): Promise<Tournament[]> {
    if (isOfflineMode()) {
      return getLocalCollection<Tournament>(OFFLINE_TOURNEY_KEY);
    }
    const snap = await getDocs(collection(db, TOURNEY_COLL));
    const list: Tournament[] = [];
    snap.forEach((doc) => {
      list.push(doc.data() as Tournament);
    });
    return list;
  },

  async updateTournament(tourneyId: string, updates: Partial<Tournament>) {
    if (isOfflineMode()) {
      const list = getLocalCollection<Tournament>(OFFLINE_TOURNEY_KEY);
      const idx = list.findIndex(t => t.id === tourneyId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        saveLocalCollection(OFFLINE_TOURNEY_KEY, list);
      }
      return;
    }
    await updateDoc(doc(db, TOURNEY_COLL, tourneyId), updates);
  },

  // Players
  async initializePlayer(name: string, teamId: string, teamName: string, createdBy: string) {
    const playerCleanId = `${teamId}_${name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`;
    const newPr: Player = {
      id: playerCleanId,
      name,
      teamId,
      teamName,
      createdBy,
      stats: emptyPlayerStats()
    };

    if (isOfflineMode()) {
      const list = getLocalCollection<Player>(OFFLINE_PLAYERS_KEY);
      if (!list.some(p => p.id === playerCleanId)) {
        list.push(newPr);
        saveLocalCollection(OFFLINE_PLAYERS_KEY, list);
      }
      return;
    }

    const dRef = doc(db, PLAYER_COLL, playerCleanId);
    const snap = await getDoc(dRef);
    if (!snap.exists()) {
      await setDoc(dRef, newPr);
    }
  },

  async getPlayers(): Promise<Player[]> {
    if (isOfflineMode()) {
      return getLocalCollection<Player>(OFFLINE_PLAYERS_KEY);
    }
    const snap = await getDocs(collection(db, PLAYER_COLL));
    const list: Player[] = [];
    snap.forEach((doc) => {
      list.push(doc.data() as Player);
    });
    return list;
  },

  // Matches
  async createMatch(matchData: Partial<Match>): Promise<string> {
    const id = generateId();
    const finalMatch: Match = {
      id,
      createdBy: matchData.createdBy || "",
      tournamentId: matchData.tournamentId || "",
      tournamentName: matchData.tournamentName || "",
      teamAId: matchData.teamAId || "",
      teamAName: matchData.teamAName || "",
      teamBId: matchData.teamBId || "",
      teamBName: matchData.teamBName || "",
      overs: matchData.overs || 20,
      status: "scheduled",
      tossWinner: matchData.tossWinner || "",
      tossDecision: matchData.tossDecision || "bat",
      currentInnings: 1,
      selectedSquads: matchData.selectedSquads || { teamA: [], teamB: [] },
      ballHistory: [],
      scorerPin: matchData.scorerPin || "",
      createdAt: new Date().toISOString(),
      innings1: {
        battingTeam: matchData.tossDecision === "bat" ? (matchData.tossWinner === matchData.teamAId ? matchData.teamAName : matchData.teamBName) : (matchData.tossWinner === matchData.teamAId ? matchData.teamBName : matchData.teamAName),
        bowlingTeam: matchData.tossDecision === "bat" ? (matchData.tossWinner === matchData.teamAId ? matchData.teamBName : matchData.teamAName) : (matchData.tossWinner === matchData.teamAId ? matchData.teamAName : matchData.teamBName),
        runs: 0,
        wickets: 0,
        balls: 0,
        extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0, total: 0 },
        batsmen: [],
        bowlers: [],
        fallOfWickets: []
      },
      innings2: {
        battingTeam: matchData.tossDecision === "bat" ? (matchData.tossWinner === matchData.teamAId ? matchData.teamBName : matchData.teamAName) : (matchData.tossWinner === matchData.teamAId ? matchData.teamAName : matchData.teamBName),
        bowlingTeam: matchData.tossDecision === "bat" ? (matchData.tossWinner === matchData.teamAId ? matchData.teamAName : matchData.teamBName) : (matchData.tossWinner === matchData.teamAId ? matchData.teamBName : matchData.teamAName),
        runs: 0,
        wickets: 0,
        balls: 0,
        extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0, total: 0 },
        batsmen: [],
        bowlers: [],
        fallOfWickets: []
      }
    };

    if (isOfflineMode()) {
      const list = getLocalCollection<Match>(OFFLINE_MATCHES_KEY);
      list.push(finalMatch);
      saveLocalCollection(OFFLINE_MATCHES_KEY, list);

      if (matchData.tournamentId) {
        const tList = getLocalCollection<Tournament>(OFFLINE_TOURNEY_KEY);
        const tIdx = tList.findIndex(t => t.id === matchData.tournamentId);
        if (tIdx !== -1) {
          const curList = tList[tIdx].matchesList || [];
          tList[tIdx].matchesList = [...curList, id];
          saveLocalCollection(OFFLINE_TOURNEY_KEY, tList);
        }
      }
      return id;
    }

    await setDoc(doc(db, MATCH_COLL, id), finalMatch);

    // If part of a tournament, register it there
    if (matchData.tournamentId) {
      const tRef = doc(db, TOURNEY_COLL, matchData.tournamentId);
      const tSnap = await getDoc(tRef);
      if (tSnap.exists()) {
        const curList = tSnap.data().matchesList || [];
        await updateDoc(tRef, {
          matchesList: [...curList, id]
        });
      }
    }

    return id;
  },

  async getMatches(): Promise<Match[]> {
    if (isOfflineMode()) {
      return getLocalCollection<Match>(OFFLINE_MATCHES_KEY);
    }
    const snap = await getDocs(collection(db, MATCH_COLL));
    const list: Match[] = [];
    snap.forEach((doc) => {
      list.push(doc.data() as Match);
    });
    return list;
  },

  async updateMatch(matchId: string, updates: Partial<Match>) {
    if (isOfflineMode()) {
      const list = getLocalCollection<Match>(OFFLINE_MATCHES_KEY);
      const idx = list.findIndex(m => m.id === matchId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        saveLocalCollection(OFFLINE_MATCHES_KEY, list);
      }
      return;
    }
    await updateDoc(doc(db, MATCH_COLL, matchId), updates);
  },

  async deleteMatch(matchId: string) {
    if (isOfflineMode()) {
      const list = getLocalCollection<Match>(OFFLINE_MATCHES_KEY);
      const updatedList = list.filter(m => m.id !== matchId);
      saveLocalCollection(OFFLINE_MATCHES_KEY, updatedList);
      return;
    }
    await deleteDoc(doc(db, MATCH_COLL, matchId));
  },

  // Compile individual stats and update when a match is marked completed!
  async finishMatchAndSaveStats(match: Match) {
    // 1. Mark status completed
    await this.updateMatch(match.id, {
      status: "completed",
      resultSummary: match.resultSummary
    });

    // 2. Compile stats to push to the players collection
    const teamAId = match.teamAId;
    const teamBId = match.teamBId;

    const processInningsStats = async (innings: any, battingTeamId: string, bowlingTeamId: string, battingTeamName: string, bowlingTeamName: string) => {
      if (!innings) return;

      // Batting stats
      const batsmen = innings.batsmen || [];
      for (const bat of batsmen) {
        const playerCleanId = `${battingTeamId}_${bat.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`;
        
        let existingStats = emptyPlayerStats();
        let existingPlayer: Player | null = null;

        if (isOfflineMode()) {
          const localList = getLocalCollection<Player>(OFFLINE_PLAYERS_KEY);
          existingPlayer = localList.find(p => p.id === playerCleanId) || null;
          if (existingPlayer) {
            existingStats = existingPlayer.stats || emptyPlayerStats();
          }
        } else {
          const pRef = doc(db, PLAYER_COLL, playerCleanId);
          const pSnap = await getDoc(pRef);
          if (pSnap.exists()) {
            existingPlayer = pSnap.data() as Player;
            existingStats = existingPlayer.stats || emptyPlayerStats();
          }
        }

        const isNotOut = bat.howOut === "notout";

        // Increment stats
        const updatedStats: PlayerStats = {
          ...existingStats,
          matches: (existingStats.matches || 0) + 1,
          innings: (existingStats.innings || 0) + (bat.balls > 0 ? 1 : 0),
          runs: (existingStats.runs || 0) + bat.runs,
          ballsFaced: (existingStats.ballsFaced || 0) + bat.balls,
          fours: (existingStats.fours || 0) + bat.fours,
          sixes: (existingStats.sixes || 0) + bat.sixes,
          notOuts: (existingStats.notOuts || 0) + (isNotOut ? 1 : 0),
          highScore: Math.max(existingStats.highScore || 0, bat.runs),
          fifties: (existingStats.fifties || 0) + (bat.runs >= 50 && bat.runs < 100 ? 1 : 0),
          hundreds: (existingStats.hundreds || 0) + (bat.runs >= 100 ? 1 : 0),
        };

        const finalPr: Player = {
          id: playerCleanId,
          name: bat.name,
          teamId: battingTeamId,
          teamName: battingTeamName,
          createdBy: match.createdBy,
          stats: updatedStats
        };

        if (isOfflineMode()) {
          const localList = getLocalCollection<Player>(OFFLINE_PLAYERS_KEY);
          const idx = localList.findIndex(p => p.id === playerCleanId);
          if (idx !== -1) {
            localList[idx] = finalPr;
          } else {
            localList.push(finalPr);
          }
          saveLocalCollection(OFFLINE_PLAYERS_KEY, localList);
        } else {
          const pRef = doc(db, PLAYER_COLL, playerCleanId);
          await setDoc(pRef, finalPr, { merge: true });
        }
      }

      // Bowling stats
      const bowlers = innings.bowlers || [];
      for (const bowl of bowlers) {
        const playerCleanId = `${bowlingTeamId}_${bowl.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`;
        
        let existingStats = emptyPlayerStats();
        let existingPlayer: Player | null = null;

        if (isOfflineMode()) {
          const localList = getLocalCollection<Player>(OFFLINE_PLAYERS_KEY);
          existingPlayer = localList.find(p => p.id === playerCleanId) || null;
          if (existingPlayer) {
            existingStats = existingPlayer.stats || emptyPlayerStats();
          }
        } else {
          const pRef = doc(db, PLAYER_COLL, playerCleanId);
          const pSnap = await getDoc(pRef);
          if (pSnap.exists()) {
            existingPlayer = pSnap.data() as Player;
            existingStats = existingPlayer.stats || emptyPlayerStats();
          }
        }

        const isFiveWickets = bowl.wickets >= 5;

        // Best bowling calculations
        let isNewBest = false;
        if (bowl.wickets > (existingStats.bestBowlingWickets || 0)) {
          isNewBest = true;
        } else if (bowl.wickets === (existingStats.bestBowlingWickets || 0)) {
          if (bowl.runs < (existingStats.bestBowlingRuns || 999) && bowl.wickets > 0) {
            isNewBest = true;
          }
        }

        const updatedStats: PlayerStats = {
          ...existingStats,
          matches: (existingStats.matches || 0) + 1,
          ballsBowled: (existingStats.ballsBowled || 0) + bowl.balls,
          oversBowled: (existingStats.oversBowled || 0) + (bowl.balls / 6),
          maidens: (existingStats.maidens || 0) + bowl.maidens,
          wickets: (existingStats.wickets || 0) + bowl.wickets,
          runsConceded: (existingStats.runsConceded || 0) + bowl.runs,
          fiveWickets: (existingStats.fiveWickets || 0) + (isFiveWickets ? 1 : 0),
          bestBowlingWickets: isNewBest ? bowl.wickets : (existingStats.bestBowlingWickets || 0),
          bestBowlingRuns: isNewBest ? bowl.runs : (existingStats.bestBowlingRuns || 0),
        };

        const finalPr: Player = {
          id: playerCleanId,
          name: bowl.name,
          teamId: bowlingTeamId,
          teamName: bowlingTeamName,
          createdBy: match.createdBy,
          stats: updatedStats
        };

        if (isOfflineMode()) {
          const localList = getLocalCollection<Player>(OFFLINE_PLAYERS_KEY);
          const idx = localList.findIndex(p => p.id === playerCleanId);
          if (idx !== -1) {
            localList[idx] = finalPr;
          } else {
            localList.push(finalPr);
          }
          saveLocalCollection(OFFLINE_PLAYERS_KEY, localList);
        } else {
          const pRef = doc(db, PLAYER_COLL, playerCleanId);
          await setDoc(pRef, finalPr, { merge: true });
        }
      }

      // Fielding stats compiled from wickets in ball history
      const history = match.ballHistory || [];
      const dismissalsWithFielders = history.filter(b => b.isWicket && b.fielderName);

      for (const dis of dismissalsWithFielders) {
        const playerCleanId = `${bowlingTeamId}_${dis.fielderName!.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`;
        
        let existingStats = emptyPlayerStats();
        let existingPlayer: Player | null = null;

        if (isOfflineMode()) {
          const localList = getLocalCollection<Player>(OFFLINE_PLAYERS_KEY);
          existingPlayer = localList.find(p => p.id === playerCleanId) || null;
          if (existingPlayer) {
            existingStats = existingPlayer.stats || emptyPlayerStats();
          }
        } else {
          const pRef = doc(db, PLAYER_COLL, playerCleanId);
          const pSnap = await getDoc(pRef);
          if (pSnap.exists()) {
            existingPlayer = pSnap.data() as Player;
            existingStats = existingPlayer.stats || emptyPlayerStats();
          }
        }

        const isCatch = dis.wicketType?.toLowerCase() === "caught";
        const isStumping = dis.wicketType?.toLowerCase() === "stumped";
        const isRunOut = dis.wicketType?.toLowerCase() === "runout";

        const updatedStats: PlayerStats = {
          ...existingStats,
          catches: (existingStats.catches || 0) + (isCatch ? 1 : 0),
          stumpings: (existingStats.stumpings || 0) + (isStumping ? 1 : 0),
          runOuts: (existingStats.runOuts || 0) + (isRunOut ? 1 : 0),
        };

        const finalPr: Player = {
          id: playerCleanId,
          name: dis.fielderName!,
          teamId: bowlingTeamId,
          teamName: bowlingTeamName,
          createdBy: match.createdBy,
          stats: updatedStats
        };

        if (isOfflineMode()) {
          const localList = getLocalCollection<Player>(OFFLINE_PLAYERS_KEY);
          const idx = localList.findIndex(p => p.id === playerCleanId);
          if (idx !== -1) {
            localList[idx] = finalPr;
          } else {
            localList.push(finalPr);
          }
          saveLocalCollection(OFFLINE_PLAYERS_KEY, localList);
        } else {
          const pRef = doc(db, PLAYER_COLL, playerCleanId);
          await setDoc(pRef, finalPr, { merge: true });
        }
      }
    };

    // Process Innings 1 (batting Team A or B)
    if (match.innings1) {
      const batTeamId = match.innings1.battingTeam === match.teamAName ? teamAId : teamBId;
      const bowlTeamId = match.innings1.bowlingTeam === match.teamAName ? teamAId : teamBId;
      await processInningsStats(match.innings1, batTeamId, bowlTeamId, match.innings1.battingTeam, match.innings1.bowlingTeam);
    }

    // Process Innings 2 (batting Team B or A)
    if (match.innings2) {
      const batTeamId = match.innings2.battingTeam === match.teamAName ? teamAId : teamBId;
      const bowlTeamId = match.innings2.bowlingTeam === match.teamAName ? teamAId : teamBId;
      await processInningsStats(match.innings2, batTeamId, bowlTeamId, match.innings2.battingTeam, match.innings2.bowlingTeam);
    }
  }
};
