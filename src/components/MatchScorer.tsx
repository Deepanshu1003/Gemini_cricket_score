import React, { useState } from "react";
import { Match, InningsState, BatsmanMatchStats, BowlerMatchStats, ExtraStats, BallHistoryEntry } from "../types";
import { firebaseService } from "../firebaseService";
import { ballsToOvers, calcStrikeRate, calcEconomy } from "../utils/cricket";
import { Swords, RotateCw, UserPlus, FileSpreadsheet, ArrowLeft, Plus, Check, Play, Settings, AlertTriangle, ShieldCheck } from "lucide-react";

interface MatchScorerProps {
  userId: string;
  match: Match;
  onBack: () => void;
}

export default function MatchScorer({ userId, match, onBack }: MatchScorerProps) {
  const [pinInput, setPinInput] = useState("");
  const [pinVerified, setPinVerified] = useState(false);
  const [activeInningsTab, setActiveInningsTab] = useState<1 | 2>(1);
  const [showFullScorecard, setShowFullScorecard] = useState(false);

  // Selector controls
  const [strikerName, setStrikerName] = useState("");
  const [nonStrikerName, setNonStrikerName] = useState("");
  const [bowlerName, setBowlerName] = useState("");

  // Dialogue modals
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketType, setWicketType] = useState("bowled");
  const [dismissedBatsman, setDismissedBatsman] = useState("");
  const [fielderName, setFielderName] = useState("");

  // Extral runs modal selection
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [extraType, setExtraType] = useState<"wide" | "noball" | "bye" | "legbye">("wide");
  const [extraBoundaryRuns, setExtraBoundaryRuns] = useState(0);

  // Custom states
  const [showSettings, setShowSettings] = useState(false);

  const isScorerAuthorized = () => {
    if (!match.scorerPin) return true;
    if (match.createdBy === userId) return true;
    return pinVerified;
  };

  const handleVerifyPin = () => {
    if (pinInput === match.scorerPin) {
      setPinVerified(true);
    } else {
      alert("Invalid Security PIN entered");
    }
  };

  // Helper selectors
  const activeInningsNum = match.currentInnings;
  const innings = activeInningsNum === 1 ? match.innings1 : match.innings2;

  // Sync squad rosters
  const battingSquad = innings?.battingTeam === match.teamAName 
    ? (match.selectedSquads?.teamA || []) 
    : (match.selectedSquads?.teamB || []);

  const bowlingSquad = innings?.bowlingTeam === match.teamAName
    ? (match.selectedSquads?.teamA || [])
    : (match.selectedSquads?.teamB || []);

  // Update current batsmen / bowlers selectors if not defined or if they got out
  const availableBatsmen = battingSquad.filter(
    (name) => !innings?.batsmen.some((b) => b.name === name && b.howOut !== "notout")
  );

  const availableBowlers = bowlingSquad;

  const handleSelectBatsman = (type: "striker" | "nonstriker", name: string) => {
    if (type === "striker") {
      setStrikerName(name);
      addBatsmanToScorecard(name);
    } else {
      setNonStrikerName(name);
      addBatsmanToScorecard(name);
    }
  };

  const handleSelectBowler = (name: string) => {
    setBowlerName(name);
    addBowlerToScorecard(name);
  };

  const addBatsmanToScorecard = (name: string) => {
    if (!innings) return;
    const exists = innings.batsmen.some(b => b.name === name);
    if (!exists) {
      const updatedBatsmen = [...innings.batsmen, {
        name,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        howOut: "notout",
        position: innings.batsmen.length + 1,
        isBatting: true
      }];
      saveInningsState({ ...innings, batsmen: updatedBatsmen });
    }
  };

  const addBowlerToScorecard = (name: string) => {
    if (!innings) return;
    const exists = innings.bowlers.some(b => b.name === name);
    if (!exists) {
      const updatedBowlers = [...innings.bowlers, {
        name,
        balls: 0,
        overs: "0.0",
        maidens: 0,
        runs: 0,
        wickets: 0
      }];
      saveInningsState({ ...innings, bowlers: updatedBowlers });
    }
  };

  const saveInningsState = async (updatedInnings: InningsState) => {
    const field = activeInningsNum === 1 ? "innings1" : "innings2";
    await firebaseService.updateMatch(match.id, {
      [field]: updatedInnings,
      currentStriker: strikerName,
      currentNonStriker: nonStrikerName,
      currentBowler: bowlerName
    });
  };

  // Switch Strike manually
  const handleSwapStrike = async () => {
    if (!strikerName || !nonStrikerName) return;
    const temp = strikerName;
    setStrikerName(nonStrikerName);
    setNonStrikerName(temp);
    await firebaseService.updateMatch(match.id, {
      currentStriker: nonStrikerName,
      currentNonStriker: strikerName
    });
  };

  // Ball logic handlers
  const recordRuns = async (runValue: number) => {
    if (!innings || !strikerName || !bowlerName) return;

    // 1. Update batsman runs and balls faced
    const updatedBatsmen = innings.batsmen.map((b) => {
      if (b.name === strikerName) {
        return {
          ...b,
          runs: b.runs + runValue,
          balls: b.balls + 1,
          fours: b.fours + (runValue === 4 ? 1 : 0),
          sixes: b.sixes + (runValue === 6 ? 1 : 0),
        };
      }
      return b;
    });

    // 2. Update bowler runs and balls
    const updatedBowlers = innings.bowlers.map((b) => {
      if (b.name === bowlerName) {
        return {
          ...b,
          runs: b.runs + runValue,
          balls: b.balls + 1,
          overs: ballsToOvers(b.balls + 1),
        };
      }
      return b;
    });

    // 3. Update innings score, balls, history
    const isWicket = false;
    const legBalls = innings.balls + 1;
    const totalRuns = innings.runs + runValue;

    const entry: BallHistoryEntry = {
      overNum: Math.floor(innings.balls / 6),
      ballNum: (innings.balls % 6) + 1,
      bowler: bowlerName,
      batsman: strikerName,
      runs: runValue,
      extraRuns: 0,
      isWicket: false,
      description: `${strikerName} scores ${runValue} against ${bowlerName}`
    };

    const updatedHistory = [...match.ballHistory, entry];

    // Strike rotation for odd runs
    let nextStriker = strikerName;
    let nextNonStriker = nonStrikerName;
    if (runValue % 2 === 1) {
      nextStriker = nonStrikerName;
      nextNonStriker = strikerName;
    }

    // Check for over completed
    let overCompleted = false;
    if (legBalls % 6 === 0) {
      overCompleted = true;
      // Rotate strike on over end
      const temp = nextStriker;
      nextStriker = nextNonStriker;
      nextNonStriker = temp;
      setBowlerName(""); // require selecting next bowler
    }

    setStrikerName(nextStriker);
    setNonStrikerName(nextNonStriker);

    await firebaseService.updateMatch(match.id, {
      [`innings${activeInningsNum}`]: {
        ...innings,
        runs: totalRuns,
        balls: legBalls,
        batsmen: updatedBatsmen,
        bowlers: updatedBowlers,
      },
      currentStriker: nextStriker,
      currentNonStriker: nextNonStriker,
      ballHistory: updatedHistory,
      currentBowler: overCompleted ? "" : bowlerName
    });

    checkMatchEndDynamics(totalRuns, innings.wickets, legBalls);
  };

  // Record extras: Wide, No Ball, Bye, Leg Bye
  const handleRecordExtras = async () => {
    if (!innings || !strikerName || !bowlerName) return;
    setShowExtraModal(false);

    let batsmanRunAdd = 0;
    let bowlerRunAdd = 0;
    let inningsRunAdd = 0;
    let ballAdd = 0; // standard balls count

    let subWides = innings.extras.wides;
    let subNoBalls = innings.extras.noBalls;
    let subByes = innings.extras.byes;
    let subLegByes = innings.extras.legByes;

    if (extraType === "wide") {
      inningsRunAdd = 1 + extraBoundaryRuns;
      bowlerRunAdd = 1 + extraBoundaryRuns;
      subWides += (1 + extraBoundaryRuns);
    } else if (extraType === "noball") {
      inningsRunAdd = 1 + extraBoundaryRuns;
      bowlerRunAdd = 1 + extraBoundaryRuns;
      batsmanRunAdd = extraBoundaryRuns; // counts as batsman score if they hit it!
      subNoBalls += 1;
    } else if (extraType === "bye") {
      inningsRunAdd = extraBoundaryRuns;
      ballAdd = 1;
      subByes += extraBoundaryRuns;
    } else if (extraType === "legbye") {
      inningsRunAdd = extraBoundaryRuns;
      ballAdd = 1;
      subLegByes += extraBoundaryRuns;
    }

    // Update batsman balls if legitimate or No Ball
    const updatedBatsmen = innings.batsmen.map((b) => {
      if (b.name === strikerName) {
        const addedBall = (extraType === "noball" || extraType === "bye" || extraType === "legbye") ? 1 : 0;
        return {
          ...b,
          runs: b.runs + batsmanRunAdd,
          balls: b.balls + addedBall,
          fours: b.fours + (batsmanRunAdd === 4 ? 1 : 0),
          sixes: b.sixes + (batsmanRunAdd === 6 ? 1 : 0)
        };
      }
      return b;
    });

    // Update bowler runs / balls
    const updatedBowlers = innings.bowlers.map((b) => {
      if (b.name === bowlerName) {
        return {
          ...b,
          runs: b.runs + bowlerRunAdd,
          balls: b.balls + ballAdd,
          overs: ballsToOvers(b.balls + ballAdd),
        };
      }
      return b;
    });

    const currentTotalExtras = innings.extras.total + inningsRunAdd;
    const totalRuns = innings.runs + inningsRunAdd;
    const legBalls = innings.balls + ballAdd;

    const entry: BallHistoryEntry = {
      overNum: Math.floor(innings.balls / 6),
      ballNum: (innings.balls % 6) + 1,
      bowler: bowlerName,
      batsman: strikerName,
      runs: batsmanRunAdd,
      extrasType: extraType,
      extraRuns: inningsRunAdd,
      isWicket: false,
      description: `${extraType.toUpperCase()} extra adjoined! +${inningsRunAdd} runs`
    };

    // Strike rotation if runs were run odd
    let nextStriker = strikerName;
    let nextNonStriker = nonStrikerName;
    if (inningsRunAdd % 2 === 1) {
      nextStriker = nonStrikerName;
      nextNonStriker = strikerName;
    }

    // Over completed check
    let overCompleted = false;
    if (ballAdd === 1 && legBalls % 6 === 0) {
      overCompleted = true;
      const temp = nextStriker;
      nextStriker = nextNonStriker;
      nextNonStriker = temp;
      setBowlerName("");
    }

    setStrikerName(nextStriker);
    setNonStrikerName(nextNonStriker);

    await firebaseService.updateMatch(match.id, {
      [`innings${activeInningsNum}`]: {
        ...innings,
        runs: totalRuns,
        balls: legBalls,
        extras: {
          wides: subWides,
          noBalls: subNoBalls,
          byes: subByes,
          legByes: subLegByes,
          penalty: innings.extras.penalty,
          total: currentTotalExtras
        },
        batsmen: updatedBatsmen,
        bowlers: updatedBowlers,
      },
      currentStriker: nextStriker,
      currentNonStriker: nextNonStriker,
      ballHistory: [...match.ballHistory, entry],
      currentBowler: overCompleted ? "" : bowlerName
    });

    checkMatchEndDynamics(totalRuns, innings.wickets, legBalls);
  };

  // Record Wicket
  const handleRecordWicket = async () => {
    if (!innings || !strikerName || !bowlerName) return;
    setShowWicketModal(false);

    const targetOut = dismissedBatsman || strikerName;

    // 1. Update batsman dismissal row
    const updatedBatsmen = innings.batsmen.map((b) => {
      if (b.name === targetOut) {
        return {
          ...b,
          balls: b.balls + (wicketType !== "runout" ? 1 : 0), // run-out on crease doesn't add faced if bowled did it, bowler handles
          isBatting: false,
          howOut: wicketType,
          dismissedBy: bowlerName,
          fielderName: fielderName || ""
        };
      }
      return b;
    });

    // 2. Update bowler wickets
    const isBowlerWicket = wicketType === "bowled" || wicketType === "caught" || wicketType === "lbw" || wicketType === "stumped";
    const updatedBowlers = innings.bowlers.map((b) => {
      if (b.name === bowlerName) {
        return {
          ...b,
          balls: b.balls + 1,
          overs: ballsToOvers(b.balls + 1),
          wickets: b.wickets + (isBowlerWicket ? 1 : 0)
        };
      }
      return b;
    });

    const newWicketCount = innings.wickets + 1;
    const legBalls = innings.balls + 1;

    // Fall of wicket entry
    const fowEntry = {
      wicketNum: newWicketCount,
      score: innings.runs,
      overs: ballsToOvers(legBalls),
      batsmanName: targetOut
    };

    const updatedFow = [...(innings.fallOfWickets || []), fowEntry];

    // History log
    const entry: BallHistoryEntry = {
      overNum: Math.floor(innings.balls / 6),
      ballNum: (innings.balls % 6) + 1,
      bowler: bowlerName,
      batsman: strikerName,
      runs: 0,
      extraRuns: 0,
      isWicket: true,
      wicketType,
      dismissedBatsman: targetOut,
      fielderName,
      description: `WICKET! ${targetOut} dismissed: ${wicketType} by ${bowlerName}`
    };

    // Clear the out batsman state
    if (targetOut === strikerName) {
      setStrikerName("");
    } else {
      setNonStrikerName("");
    }

    let nextStriker = strikerName === targetOut ? "" : strikerName;
    let nextNonStriker = nonStrikerName === targetOut ? "" : nonStrikerName;

    // Over completed check
    let overCompleted = false;
    if (legBalls % 6 === 0) {
      overCompleted = true;
      // Rotate if possible, else clear bowler
      if (nextStriker && nextNonStriker) {
        const temp = nextStriker;
        nextStriker = nextNonStriker;
        nextNonStriker = temp;
      }
      setBowlerName("");
    }

    setStrikerName(nextStriker);
    setNonStrikerName(nextNonStriker);

    await firebaseService.updateMatch(match.id, {
      [`innings${activeInningsNum}`]: {
        ...innings,
        wickets: newWicketCount,
        balls: legBalls,
        batsmen: updatedBatsmen,
        bowlers: updatedBowlers,
        fallOfWickets: updatedFow
      },
      currentStriker: nextStriker,
      currentNonStriker: nextNonStriker,
      ballHistory: [...match.ballHistory, entry],
      currentBowler: overCompleted ? "" : bowlerName
    });

    setFielderName("");
    checkMatchEndDynamics(innings.runs, newWicketCount, legBalls);
  };

  // Handle innings/match ending
  const checkMatchEndDynamics = (runs: number, wickets: number, balls: number) => {
    const maxBalls = match.overs * 6;

    if (activeInningsNum === 1) {
      // Innings 1 ends if 10 wickets are down or overs run out
      if (wickets >= 10 || balls >= maxBalls) {
        alert("Innings 1 Completed! Please trigger Switch Innings starting target run chase.");
      }
    } else {
      // Innings 2 ends if wickets down, max overs reached, or target runs chased down!
      const targetRuns = (match.innings1?.runs || 0) + 1;
      if (runs >= targetRuns) {
        triggerMatchCompletion(runs, wickets, true);
      } else if (wickets >= 10 || balls >= maxBalls) {
        triggerMatchCompletion(runs, wickets, false);
      }
    }
  };

  const handleSwitchInnings = async () => {
    if (activeInningsNum === 1) {
      await firebaseService.updateMatch(match.id, {
        currentInnings: 2,
        currentStriker: "",
        currentNonStriker: "",
        currentBowler: ""
      });
      setStrikerName("");
      setNonStrikerName("");
      setBowlerName("");
      setActiveInningsTab(2);
    }
  };

  const triggerMatchCompletion = async (inn2Runs: number, inn2Wickets: number, chasedSuccessfully: boolean) => {
    const batTeam = match.innings2?.battingTeam || match.teamBName;
    const bowlTeam = match.innings2?.bowlingTeam || match.teamAName;

    let resultSummary = "";
    if (chasedSuccessfully) {
      const remainingWickets = 10 - inn2Wickets;
      resultSummary = `${batTeam} won by ${remainingWickets} wickets!`;
    } else {
      const target = (match.innings1?.runs || 0) + 1;
      const difference = target - 1 - inn2Runs;
      resultSummary = `${bowlTeam} won by ${difference} runs!`;
    }

    try {
      const finalMatchModel: Match = {
        ...match,
        status: "completed",
        resultSummary
      };
      await firebaseService.finishMatchAndSaveStats(finalMatchModel);
      alert(`Match Ended! ${resultSummary}. Player careers updated.`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div id="match-scorer-dashboard" className="space-y-6">
      {/* Verify Scorer Pin if needed */}
      {!isScorerAuthorized() && (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-center space-y-4 max-w-md mx-auto">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-white">Security PIN Requested</h2>
          <p className="text-xs text-slate-400">This match has been locked. Enter the 4-6 digit PIN to start scoring scoreboards.</p>
          <input
            type="password"
            maxLength={6}
            className="w-full text-center bg-slate-900 border border-slate-700 text-xl font-bold py-2 rounded-lg text-amber-300 focus:outline-none"
            placeholder="PIN"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value.replace(/\D/g,""))}
          />
          <div className="flex gap-2 pt-2">
            <button
              onClick={onBack}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded-lg text-sm cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={handleVerifyPin}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 rounded-lg text-sm cursor-pointer"
            >
              Verify PIN
            </button>
          </div>
        </div>
      )}

      {/* Main Scoring Board (Visible if authorized) */}
      {isScorerAuthorized() && innings && (
        <div className="space-y-6">
          {/* Header Controls */}
          <div className="flex items-center justify-between border-b border-slate-700 pb-4">
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-slate-400 hover:text-white font-bold text-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Match center
            </button>

            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${match.status === "completed" ? "bg-slate-800 text-slate-400 border-slate-700" : "bg-rose-500/20 text-rose-300 border-rose-500/30"}`}>
                {match.status.toUpperCase()}
              </span>
              <button
                onClick={() => setShowFullScorecard(!showFullScorecard)}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1"
              >
                <FileSpreadsheet className="w-4 h-4" /> {showFullScorecard ? "Hide Full Scorecard" : "View Scorecard"}
              </button>
            </div>
          </div>

          {/* Quick Score card summary banner */}
          <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-emerald-900/20 p-6 rounded-2xl border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
            <div className="absolute right-0 top-0 text-[100px] font-black text-white/5 pointer-events-none tracking-tighter select-none">
              OVERS
            </div>
            <div>
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-emerald-400">Innings {activeInningsNum} - Batting: {innings.battingTeam}</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-5xl font-black text-white">{innings.runs}</span>
                <span className="text-3xl font-bold text-slate-400">/</span>
                <span className="text-4xl font-extrabold text-rose-400">{innings.wickets}</span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-2">
                Overs: {ballsToOvers(innings.balls)} / {match.overs}
              </p>
            </div>

            {/* Target and Chase text for Second innings */}
            {activeInningsNum === 2 && match.innings1 && (
              <div className="bg-slate-900/60 p-4 border border-slate-700/60 rounded-xl text-center md:text-right shrink-0">
                <span className="text-[10px] block uppercase text-slate-400 font-bold">Target Chase</span>
                <span className="text-2xl font-black text-amber-300">Need {Math.max(0, (match.innings1.runs + 1) - innings.runs)} runs</span>
                <span className="block text-xs text-slate-500 mt-1">from {Math.max(0, (match.overs * 6) - innings.balls)} balls remaining</span>
              </div>
            )}
          </div>

          {/* Scoring Controls panel (Only if match is live/scheduled and we are in current innings) */}
          {match.status !== "completed" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Squad selections striker, non striker, bowler */}
              <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700 space-y-4">
                <h3 className="font-extrabold text-white text-sm uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-700 pb-2">
                  <UserPlus className="w-4 h-4 text-emerald-400" /> Active Roster Setup
                </h3>

                {/* Striker selector */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Striker (Active Bat)</label>
                  {strikerName ? (
                    <div className="bg-slate-900 px-3 py-2 rounded-lg border border-emerald-500/30 flex items-center justify-between">
                      <span className="text-sm font-extrabold text-white">{strikerName} ★</span>
                      <button onClick={() => setStrikerName("")} className="text-[10px] hover:underline text-rose-400 cursor-pointer">Change</button>
                    </div>
                  ) : (
                    <select
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200"
                      value={strikerName}
                      onChange={(e) => handleSelectBatsman("striker", e.target.value)}
                    >
                      <option value="">Select Striker</option>
                      {availableBatsmen.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                  )}
                </div>

                {/* Non Striker selector */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Non Striker</label>
                  {nonStrikerName ? (
                    <div className="bg-slate-900 px-3 py-2 rounded-lg border border-slate-700 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-300">{nonStrikerName}</span>
                      <button onClick={() => setNonStrikerName("")} className="text-[10px] hover:underline text-rose-400 cursor-pointer">Change</button>
                    </div>
                  ) : (
                    <select
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200"
                      value={nonStrikerName}
                      onChange={(e) => handleSelectBatsman("nonstriker", e.target.value)}
                    >
                      <option value="">Select Non Strk</option>
                      {availableBatsmen.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                  )}
                </div>

                {/* Bowler selector */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Current Bowler</label>
                  {bowlerName ? (
                    <div className="bg-slate-900 px-3 py-2 rounded-lg border border-slate-700 flex items-center justify-between">
                      <span className="text-sm font-semibold text-teal-400">{bowlerName} 🥎</span>
                      <button onClick={() => setBowlerName("")} className="text-[10px] hover:underline text-rose-400 cursor-pointer">Change</button>
                    </div>
                  ) : (
                    <select
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 animate-pulse border-amber-500/50"
                      value={bowlerName}
                      onChange={(e) => handleSelectBowler(e.target.value)}
                    >
                      <option value="">Select Bowler</option>
                      {availableBowlers.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                  )}
                </div>

                {/* Manual rotation */}
                <button
                  type="button"
                  onClick={handleSwapStrike}
                  title="Manually switch strike in batsman mismatch"
                  className="w-full bg-slate-900 hover:bg-slate-900/60 border border-slate-700 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 text-slate-300 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5 text-amber-500" /> Swap Batting Strike
                </button>
              </div>

              {/* Core Clicker scoring buttons */}
              <div className="lg:col-span-2 bg-slate-800/60 p-5 rounded-2xl border border-slate-700 flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-white text-sm uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-700 pb-2 mb-4">
                    <Swords className="w-4 h-4 text-emerald-400" /> Scorer keypad panels
                  </h3>

                  {!strikerName || !nonStrikerName || !bowlerName ? (
                    <div className="bg-slate-900/60 rounded-xl p-8 border border-amber-500/10 text-center space-y-2">
                      <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                      <p className="font-semibold text-slate-200">Scoring Paused</p>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">Please assign an active striker, non-striker, and bowler in the roster setup to unlock scoring controls.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Runs keys */}
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Normal Runs</p>
                      <div className="grid grid-cols-4 md:grid-cols-7 gap-2.5">
                        {[0, 1, 2, 3, 4, 5, 6].map((num) => (
                          <button
                            key={num}
                            onClick={() => recordRuns(num)}
                            className="bg-slate-900 border border-slate-700 hover:bg-emerald-500 hover:text-slate-950 hover:border-emerald-500 text-slate-100 font-black py-4 rounded-xl text-lg transition duration-150 cursor-pointer flex items-center justify-center"
                          >
                            {num === 0 ? "• Dot" : num}
                          </button>
                        ))}
                      </div>

                      {/* Specialist keys */}
                      <div className="grid grid-cols-2 gap-3 pt-3">
                        <button
                          onClick={() => {
                            setWicketType("bowled");
                            setDismissedBatsman(strikerName);
                            setShowWicketModal(true);
                          }}
                          className="bg-rose-950/40 hover:bg-rose-950/80 border border-rose-500/40 text-rose-300 font-extrabold py-3.5 rounded-xl transition duration-150 cursor-pointer text-sm flex items-center justify-center gap-1"
                        >
                          Wicket Dismissal +
                        </button>
                        <button
                          onClick={() => {
                            setExtraType("wide");
                            setExtraBoundaryRuns(0);
                            setShowExtraModal(true);
                          }}
                          className="bg-sky-950/40 hover:bg-sky-950/80 border border-sky-500/40 text-sky-300 font-extrabold py-3.5 rounded-xl transition duration-150 cursor-pointer text-sm flex items-center justify-center gap-1"
                        >
                          Record Extras / Sundries +
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Over completions & innings ender */}
                <div className="mt-6 pt-4 border-t border-slate-700/30 flex items-center justify-between text-xs">
                  <div className="text-slate-400">
                    Overs format: {Math.floor(innings.balls / 6)} overs and {innings.balls % 6} balls
                  </div>
                  {activeInningsNum === 1 && (
                    <button
                      onClick={handleSwitchInnings}
                      className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-lg transition overflow-hidden text-xs cursor-pointer inline-flex items-center gap-1"
                    >
                      Switch Innings (Chase target) &rarr;
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Current Ball-by-ball timeline of current over */}
          <div className="bg-slate-800/40 p-4 border border-slate-700/80 rounded-xl space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ball timeline log queue</span>
            <div className="flex flex-wrap gap-2 pt-1 font-sans">
              {match.ballHistory.slice(-12).map((b, idx) => (
                <div
                  key={idx}
                  title={b.description}
                  className={`min-w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs select-none ${b.isWicket ? "bg-rose-600/20 text-rose-400 border-rose-500/40" : b.extrasType ? "bg-sky-600/20 text-sky-400 border-sky-500/30" : b.runs === 4 || b.runs === 6 ? "bg-amber-500/20 text-amber-300 border-amber-500/30 font-blackScale" : "bg-slate-900 text-slate-400 border-slate-800"}`}
                >
                  {b.isWicket ? "W" : b.extrasType === "wide" ? `WD` : b.extrasType === "noball" ? `NB` : b.extrasType === "bye" ? `${b.extraRuns}B` : b.extrasType === "legbye" ? `${b.extraRuns}L` : b.runs === 0 ? "•" : b.runs}
                </div>
              ))}
              {match.ballHistory.length === 0 && (
                <span className="text-xs text-slate-500 italic">Pre-play match setup. Deliever first ball to start timeline.</span>
              )}
            </div>
          </div>

          {/* Scorecard Tab Lists Toggle */}
          {(showFullScorecard || match.status === "completed") && (
            <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/80 space-y-8">
              {/* Selector Innings tabs */}
              <div className="flex border-b border-slate-700 mb-4 gap-2">
                <button
                  onClick={() => setActiveInningsTab(1)}
                  className={`px-4 py-2 font-bold text-xs transition border-b-2 ${activeInningsTab === 1 ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
                >
                  Innings 1: {match.innings1?.battingTeam || "Home"}
                </button>
                {match.innings2?.battingTeam && (
                  <button
                    onClick={() => setActiveInningsTab(2)}
                    className={`px-4 py-2 font-bold text-xs transition border-b-2 ${activeInningsTab === 2 ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
                  >
                    Innings 2: {match.innings2?.battingTeam}
                  </button>
                )}
              </div>

              {/* Innings detailed scorecard table */}
              {activeInningsTab === 1 && match.innings1 && (
                <ScorecardTable inningsData={match.innings1} />
              )}
              {activeInningsTab === 2 && match.innings2 && (
                <ScorecardTable inningsData={match.innings2} />
              )}
            </div>
          )}
        </div>
      )}

      {/* DISMISSAL WICKET POPUP MODAL */}
      {showWicketModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-750 p-6 rounded-2xl max-w-md w-full space-y-4">
            <h3 className="font-extrabold text-lg text-rose-400 border-b border-slate-705 pb-2">Record Out Batsman</h3>

            <div className="space-y-4 text-sm text-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-450 mb-1">Dismissal Type</label>
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-slate-200"
                  value={wicketType}
                  onChange={(e) => setWicketType(e.target.value)}
                >
                  <option value="bowled">Bowled</option>
                  <option value="caught">Caught</option>
                  <option value="lbw">LBW</option>
                  <option value="runout">Run Out</option>
                  <option value="stumped">Stumped</option>
                  <option value="retired">Retired / Absent Out</option>
                  <option value="hitwicket">Hit Wicket</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-450 mb-1">Batsman Dismissed</label>
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-slate-200"
                  value={dismissedBatsman}
                  onChange={(e) => setDismissedBatsman(e.target.value)}
                >
                  <option value={strikerName}>{strikerName} (Active Striker)</option>
                  <option value={nonStrikerName}>{nonStrikerName} (Non-Striker)</option>
                </select>
              </div>

              {(wicketType === "caught" || wicketType === "runout" || wicketType === "stumped") && (
                <div>
                  <label className="block text-xs font-semibold text-slate-450 mb-1">Fielder Involved Name</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-slate-200"
                    value={fielderName}
                    onChange={(e) => setFielderName(e.target.value)}
                  >
                    <option value="">Select Fielder Name</option>
                    {bowlingSquad.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={() => setShowWicketModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-650 text-slate-300 font-bold py-2 rounded-lg cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordWicket}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-slate-950 font-black py-2 rounded-lg cursor-pointer text-xs"
              >
                Submit Out Dismissal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD EXTRAS POPUP MODAL */}
      {showExtraModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-750 p-6 rounded-2xl max-w-md w-full space-y-4">
            <h3 className="font-extrabold text-lg text-sky-400 border-b border-slate-705 pb-2">Record Extras / Sundries</h3>

            <div className="space-y-4 text-sm text-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-450 mb-1">Extras Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["wide", "noball", "bye", "legbye"] as const).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setExtraType(t)}
                      className={`py-2 rounded-lg border font-bold text-xs uppercase tracking-wider transition cursor-pointer ${extraType === t ? "bg-sky-500/10 border-sky-400 text-sky-350" : "bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800"}`}
                    >
                      {t === "noball" ? "No Ball" : t === "legbye" ? "Leg Bye" : t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-450 mb-1.5">Additional Conceded Runs (E.g. byed boundaries)</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[0, 1, 2, 3, 4].map((num) => (
                    <button
                      type="button"
                      key={num}
                      onClick={() => setExtraBoundaryRuns(num)}
                      className={`py-2 font-bold rounded-lg border text-xs cursor-pointer ${extraBoundaryRuns === num ? "bg-amber-500/10 border-amber-500 text-amber-300" : "bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800"}`}
                    >
                      +{num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={() => setShowExtraModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-650 text-slate-300 font-bold py-2 rounded-lg cursor-pointer text-xs"
              >
                Close
              </button>
              <button
                onClick={handleRecordExtras}
                className="flex-1 bg-sky-550 bg-sky-500 hover:bg-sky-600 text-slate-950 font-black py-2 rounded-lg cursor-pointer text-xs"
              >
                Add Extras
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Innings Detailed scorecard sub-component
function ScorecardTable({ inningsData }: { inningsData: InningsState }) {
  return (
    <div className="space-y-6">
      {/* Batting Card table */}
      <div>
        <h4 className="text-white font-extrabold text-sm mb-3 uppercase tracking-wider text-emerald-400">Batting Card</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-700/50">
            <thead>
              <tr className="text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-2.5">Batsman</th>
                <th className="py-2.5">Status</th>
                <th className="py-2.5 text-center">Runs</th>
                <th className="py-2.5 text-center">Balls</th>
                <th className="py-2.5 text-center">4s</th>
                <th className="py-2.5 text-center">6s</th>
                <th className="py-2.5 text-right">SR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-750/30 text-slate-200">
              {inningsData.batsmen.map((b, i) => (
                <tr key={i} className="hover:bg-slate-750/20">
                  <td className="py-3 font-semibold text-sm">{b.name}</td>
                  <td className="py-3 text-slate-400">
                    {b.howOut === "notout" 
                      ? "not out" 
                      : b.howOut === "caught" 
                        ? `c ${b.fielderName || "fielder"} b ${b.dismissedBy}` 
                        : b.howOut === "runout" 
                          ? `run out (${b.fielderName || "fielder"})` 
                          : b.howOut}
                  </td>
                  <td className="py-3 text-center font-bold text-base text-amber-300">{b.runs}</td>
                  <td className="py-3 text-center text-slate-350">{b.balls}</td>
                  <td className="py-3 text-center">{b.fours}</td>
                  <td className="py-3 text-center">{b.sixes}</td>
                  <td className="py-3 text-right font-mono text-slate-400">{calcStrikeRate(b.runs, b.balls)}</td>
                </tr>
              ))}
              {inningsData.batsmen.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-slate-500 italic">No batsmen face delieveries yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Extras line */}
        <div className="mt-3 p-3 bg-slate-900/40 rounded-xl flex items-center justify-between text-xs text-slate-300 border border-slate-750">
          <span>
            <strong>Extras:</strong> {inningsData.extras?.total || 0} (w {inningsData.extras?.wides || 0}, nb {inningsData.extras?.noBalls || 0}, b {inningsData.extras?.byes || 0}, lb {inningsData.extras?.legByes || 0})
          </span>
          <span className="font-bold text-white">
            Total Innings Runs: {inningsData.runs} / {inningsData.wickets}
          </span>
        </div>
      </div>

      {/* Bowling Card table */}
      <div>
        <h4 className="text-white font-extrabold text-sm mb-3 uppercase tracking-wider text-teal-400">Bowling Card</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-700/50">
            <thead>
              <tr className="text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-2.5">Bowler</th>
                <th className="py-2.5 text-center">Overs</th>
                <th className="py-2.5 text-center">Maidens</th>
                <th className="py-2.5 text-center">Runs</th>
                <th className="py-2.5 text-center text-teal-300">Wickets</th>
                <th className="py-2.5 text-right">Econ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-750/30 text-slate-200">
              {inningsData.bowlers.map((bowl, i) => (
                <tr key={i} className="hover:bg-slate-755/20">
                  <td className="py-3 font-semibold text-sm">{bowl.name}</td>
                  <td className="py-3 text-center">{ballsToOvers(bowl.balls)}</td>
                  <td className="py-3 text-center">{bowl.maidens}</td>
                  <td className="py-3 text-center font-bold text-rose-300">{bowl.runs}</td>
                  <td className="py-3 text-center font-black text-emerald-400 text-sm">{bowl.wickets}</td>
                  <td className="py-3 text-right font-mono text-slate-400">{calcEconomy(bowl.runs, bowl.balls)}</td>
                </tr>
              ))}
              {inningsData.bowlers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-slate-500 italic">No bowlers assigned yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fall of wicket details */}
      {inningsData.fallOfWickets && inningsData.fallOfWickets.length > 0 && (
        <div className="p-4 bg-slate-900/30 border border-slate-750 rounded-xl space-y-1.5">
          <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400">Fall of Wickets</h4>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
            {inningsData.fallOfWickets.map((fow, idx) => (
              <span key={idx}>
                <strong>{fow.wicketNum}-{fow.score}</strong> ({fow.batsmanName}, {fow.overs} ov)
                {idx < inningsData.fallOfWickets.length - 1 && <span className="ml-4 text-slate-600">|</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
