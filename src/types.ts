export interface PlayerStats {
  matches: number;
  innings: number;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  notOuts: number;
  highScore: number;
  fifties: number;
  hundreds: number;
  // Bowling
  oversBowled: number;
  ballsBowled: number;
  maidens: number;
  wickets: number;
  runsConceded: number;
  bestBowlingWickets: number;
  bestBowlingRuns: number;
  fiveWickets: number;
  // Fielding
  catches: number;
  stumpings: number;
  runOuts: number;
}

export interface Player {
  id: string;
  name: string;
  teamId?: string;
  teamName?: string;
  stats: PlayerStats;
  createdBy: string;
}

export interface Team {
  id: string;
  name: string;
  playerNames: string[];
  createdBy: string;
  createdAt: string;
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  teamIds: string[];
  teamNames: string[];
  matchesList: string[]; // match IDs
  status: "ongoing" | "completed";
  winnerTeamId?: string;
  winnerTeamName?: string;
  createdBy: string;
  creatorName: string;
  createdAt: string;
}

export interface BatsmanMatchStats {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  howOut: "notout" | "bowled" | "caught" | "lbw" | "runout" | "stumped" | "retired" | "hitwicket" | string;
  dismissedBy?: string; // bowler name
  fielderName?: string; // catcher or runner out
  position: number;
  isBatting: boolean;
}

export interface BowlerMatchStats {
  name: string;
  balls: number;
  overs: string; // e.g. "3.2"
  maidens: number;
  runs: number;
  wickets: number;
}

export interface ExtraStats {
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  penalty: number;
  total: number;
}

export interface InningsState {
  battingTeam: string;
  bowlingTeam: string;
  runs: number;
  wickets: number;
  balls: number; // total legitimate + some extra balls depending on type
  extras: ExtraStats;
  batsmen: BatsmanMatchStats[];
  bowlers: BowlerMatchStats[];
  fallOfWickets: {
    wicketNum: number;
    score: number;
    overs: string;
    batsmanName: string;
  }[];
}

export interface BallHistoryEntry {
  overNum: number;
  ballNum: number;
  bowler: string;
  batsman: string;
  runs: number;
  extrasType?: "wide" | "noball" | "bye" | "legbye";
  extraRuns: number;
  isWicket: boolean;
  wicketType?: string;
  dismissedBatsman?: string;
  fielderName?: string;
  description: string;
  inningsNum?: number;
}

export interface Match {
  id: string;
  createdBy: string;
  tournamentId?: string;
  tournamentName?: string;
  teamAId: string;
  teamAName: string;
  teamBId: string;
  teamBName: string;
  overs: number;
  status: "scheduled" | "live" | "completed";
  tossWinner?: string; // Team ID or name
  tossDecision?: "bat" | "bowl";
  currentInnings: 1 | 2;
  innings1?: InningsState;
  innings2?: InningsState;
  // Real-time ongoing scoring help
  currentStriker?: string;
  currentNonStriker?: string;
  currentBowler?: string;
  scorerPin?: string;
  createdAt: string;
  selectedSquads?: {
    teamA: string[];
    teamB: string[];
  };
  ballHistory: BallHistoryEntry[];
  resultSummary?: string;
}
