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

  const getLastCompletedOverBowler = (): string | null => {
    if (!innings || !match.ballHistory) return null;
    const currentOver = Math.floor(innings.balls / 6);
    if (currentOver === 0) return null;

    for (let i = match.ballHistory.length - 1; i >= 0; i--) {
      const entry = match.ballHistory[i];
      if (entry.overNum === currentOver - 1) {
        return entry.bowler;
      }
    }
    return null;
  };

  const handleSelectBatsman = (type: "striker" | "nonstriker", name: string) => {
    if (type === "striker") {
      if (name === nonStrikerName && name !== "") {
        alert("The striker cannot be the same as the non-striker.");
        return;
      }
      setStrikerName(name);
      addBatsmanToScorecard(name);
    } else {
      if (name === strikerName && name !== "") {
        alert("The non-striker cannot be the same as the striker.");
        return;
      }
      setNonStrikerName(name);
      addBatsmanToScorecard(name);
    }
  };

  const handleSelectBowler = (name: string) => {
    const lastBowler = getLastCompletedOverBowler();
    if (lastBowler && name === lastBowler && name !== "") {
      alert(`The bowler "${name}" just bowled the previous over. A bowler cannot bowl consecutive overs!`);
      return;
    }
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
        <div className="bg-brand-surface p-5 rounded-xl border border-soft text-center space-y-4 max-w-sm mx-auto shadow-xl">
          <AlertTriangle className="w-10 h-10 text-sky-500 mx-auto" />
          <h2 className="text-base font-extrabold text-white">Security PIN Requested</h2>
          <p className="text-[11px] text-slate-400">This match is score-locked. Enter the scorer PIN code below to continue registering plays.</p>
          <input
            type="password"
            maxLength={6}
            className="w-full text-center bg-slate-950 border border-soft text-xl font-bold font-mono py-2 rounded-lg text-sky-455 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 placeholder-slate-705"
            placeholder="• • • •"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value.replace(/\D/g,""))}
          />
          <div className="flex gap-2 pt-1">
            <button
              onClick={onBack}
              className="flex-1 bg-brand-action hover:bg-slate-750 border border-soft text-slate-300 py-1.5 rounded text-xs font-bold cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={handleVerifyPin}
              className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-extrabold py-1.5 rounded text-xs cursor-pointer"
            >
              Verify PIN
            </button>
          </div>
        </div>
      )}

      {/* Main Scoring Board (Visible if authorized) */}
      {isScorerAuthorized() && innings && (
        <div className="space-y-5">
          {/* Header Controls */}
          <div className="flex items-center justify-between border-b border-soft pb-3.5">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Match center
            </button>

            <div className="flex items-center gap-2">
              <span className={`text-[9px] px-2 py-0.5 rounded font-bold font-mono border uppercase tracking-wider ${match.status === "completed" ? "bg-slate-900 text-slate-400 border-soft" : "bg-rose-500/10 text-rose-350 border-rose-500/20"}`}>
                {match.status}
              </span>
              <button
                onClick={() => setShowFullScorecard(!showFullScorecard)}
                className="bg-brand-action hover:bg-slate-755 text-slate-200 text-xs px-3 py-1.5 border border-soft rounded font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4 text-sky-400" /> {showFullScorecard ? "Hide Full Scorecard" : "View Scorecard"}
              </button>
            </div>
          </div>

          {/* Quick Score card summary banner */}
          <div className="bg-brand-surface p-4 rounded-xl border border-soft flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden shadow-lg">
            <div className="absolute right-3 top-[-10px] text-5xl font-black text-white/[0.03] pointer-events-none font-mono tracking-tighter select-none">
              LIVE SCORECARD
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold tracking-widest text-sky-400 font-mono">Innings {activeInningsNum} - Batting: {innings.battingTeam}</span>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <span className="text-4xl font-extrabold text-white font-mono leading-none tracking-tight">{innings.runs}</span>
                <span className="text-2xl font-bold text-slate-550 font-mono">/</span>
                <span className="text-3.5xl font-black text-rose-455 font-mono leading-none">{innings.wickets}</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-1.5">
                Overs: {ballsToOvers(innings.balls)} / {match.overs}
              </p>
            </div>

            {/* Target and Chase text for Second innings */}
            {activeInningsNum === 2 && match.innings1 && (
              <div className="bg-slate-950/65 p-3.5 py-2.5 border border-soft/80 rounded-lg text-center md:text-right shrink-0">
                <span className="text-[9px] block uppercase text-slate-450 font-bold tracking-wider">Target Chase</span>
                <span className="text-xl font-extrabold text-sky-400 font-mono">Need {Math.max(0, (match.innings1.runs + 1) - innings.runs)} runs</span>
                <span className="block text-[10px] text-slate-500 mt-0.5 font-mono">from {Math.max(0, (match.overs * 6) - innings.balls)} balls remaining</span>
              </div>
            )}
          </div>

          {/* Scoring Controls panel (Only if match is live/scheduled and we are in current innings) */}
          {match.status !== "completed" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Squad selections striker, non striker, bowler */}
              <div className="bg-brand-surface p-4 rounded-xl border border-soft space-y-3.5 shadow-lg">
                <h3 className="font-extrabold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5 border-b border-soft pb-2">
                  <UserPlus className="w-4 h-4 text-sky-400" /> Active Roster Setup
                </h3>

                {/* Striker selector */}
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Striker (Active Bat)</label>
                  {strikerName ? (
                    <div className="bg-slate-950/80 px-3 py-1.5 rounded-lg border border-sky-450/35 flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{strikerName} ★</span>
                      <button onClick={() => setStrikerName("")} className="text-[9px] font-bold uppercase tracking-wide hover:underline hover:text-sky-400 text-slate-500 cursor-pointer">Change</button>
                    </div>
                  ) : (
                    <select
                      className="w-full bg-slate-950/80 border border-soft rounded-lg py-1.5 px-2.5 text-xs text-slate-200 font-sans focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      value={strikerName}
                      onChange={(e) => handleSelectBatsman("striker", e.target.value)}
                    >
                      <option value="">Select Striker</option>
                      {availableBatsmen.filter(name => name !== nonStrikerName).map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                  )}
                </div>

                {/* Non Striker selector */}
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Non Striker</label>
                  {nonStrikerName ? (
                    <div className="bg-slate-950/80 px-3 py-1.5 rounded-lg border border-soft flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">{nonStrikerName}</span>
                      <button onClick={() => setNonStrikerName("")} className="text-[9px] font-bold uppercase tracking-wide hover:underline hover:text-sky-400 text-slate-500 cursor-pointer">Change</button>
                    </div>
                  ) : (
                    <select
                      className="w-full bg-slate-950/80 border border-soft rounded-lg py-1.5 px-2.5 text-xs text-slate-200 font-sans focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      value={nonStrikerName}
                      onChange={(e) => handleSelectBatsman("nonstriker", e.target.value)}
                    >
                      <option value="">Select Non Strk</option>
                      {availableBatsmen.filter(name => name !== strikerName).map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                  )}
                </div>

                {/* Bowler selector */}
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Bowler</label>
                  {bowlerName ? (
                    <div className="bg-slate-950/80 px-3 py-1.5 rounded-lg border border-soft flex items-center justify-between">
                      <span className="text-xs font-bold font-mono text-sky-400">{bowlerName} 🥎</span>
                      <button onClick={() => setBowlerName("")} className="text-[9px] font-bold uppercase tracking-wide hover:underline hover:text-sky-400 text-slate-500 cursor-pointer">Change</button>
                    </div>
                  ) : (
                    <select
                      className="w-full bg-slate-950/80 border border-soft rounded-lg py-1.5 px-2.5 text-xs text-slate-200 font-sans focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 animate-pulse"
                      value={bowlerName}
                      onChange={(e) => handleSelectBowler(e.target.value)}
                    >
                      <option value="">Select Bowler</option>
                      {availableBowlers.filter(name => name !== getLastCompletedOverBowler()).map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                  )}
                </div>

                {/* Manual rotation */}
                <button
                  type="button"
                  onClick={handleSwapStrike}
                  title="Manually switch strike in batsman mismatch"
                  className="w-full bg-slate-950/75 hover:bg-slate-800 border border-soft py-1.5 rounded text-[10px] font-bold flex items-center justify-center gap-1.5 text-slate-300 transition cursor-pointer"
                >
                  <RotateCw className="w-3 h-3 text-sky-450" /> Swap Batting Strike
                </button>
              </div>

              {/* Core Clicker scoring buttons */}
              <div className="lg:col-span-2 bg-brand-surface p-4 rounded-xl border border-soft flex flex-col justify-between shadow-lg">
                <div>
                  <h3 className="font-extrabold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5 border-b border-soft pb-2 mb-3.5">
                    <Swords className="w-4 h-4 text-sky-400" /> Scorer keypad panels
                  </h3>

                  {!strikerName || !nonStrikerName || !bowlerName ? (
                    <div className="bg-slate-950/45 rounded-lg p-6 border border-soft text-center space-y-1.55">
                      <AlertTriangle className="w-6 h-6 text-sky-500 mx-auto" />
                      <p className="font-bold text-xs text-slate-205">Scoring Controls Locked</p>
                      <p className="text-[10px] text-slate-500 max-w-sm mx-auto">Please assign an active striker, non-striker, and bowler in the roster setup to unlock scoring controls.</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {/* Runs keys */}
                      <p className="text-[9px] text-slate-500 uppercase font-extrabold tracking-widest font-mono">Normal runs scoring</p>
                      <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                        {[0, 1, 2, 3, 4, 5, 6].map((num) => (
                          <button
                            key={num}
                            onClick={() => recordRuns(num)}
                            className="bg-slate-950/80 border border-soft hover:bg-sky-600 hover:text-white hover:border-sky-550 text-slate-200 font-extrabold font-mono py-2.5 rounded transition duration-150 cursor-pointer flex items-center justify-center text-sm"
                          >
                            {num === 0 ? "Dot" : num}
                          </button>
                        ))}
                      </div>

                      {/* Specialist keys */}
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <button
                          onClick={() => {
                            setWicketType("bowled");
                            setDismissedBatsman(strikerName);
                            setShowWicketModal(true);
                          }}
                          className="bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/20 text-rose-300 font-bold py-2 rounded-lg transition duration-155 cursor-pointer text-xs flex items-center justify-center gap-1 font-mono uppercase tracking-wider"
                        >
                          Wicket Dismissal +
                        </button>
                        <button
                          onClick={() => {
                            setExtraType("wide");
                            setExtraBoundaryRuns(0);
                            setShowExtraModal(true);
                          }}
                          className="bg-sky-950/30 hover:bg-sky-900/40 border border-sky-500/20 text-sky-355 font-bold py-2 rounded-lg transition duration-155 cursor-pointer text-xs flex items-center justify-center gap-1 font-mono uppercase tracking-wider"
                        >
                          Record Extras +
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Over completions & innings ender */}
                <div className="mt-4 pt-3 border-t border-soft flex items-center justify-between text-[10px]">
                  <div className="text-slate-450 font-mono">
                    Overs format: {Math.floor(innings.balls / 6)} ov and {innings.balls % 6} balls
                  </div>
                  {activeInningsNum === 1 && (
                    <button
                      onClick={handleSwitchInnings}
                      className="bg-sky-600 hover:bg-sky-500 text-white font-extrabold px-3 py-1.5 rounded transition text-xs cursor-pointer inline-flex items-center gap-1 shadow-lg"
                    >
                      Switch Innings (Chase) &rarr;
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Current Ball-by-ball timeline grouped by over */}
          <div className="bg-brand-surface p-3.5 border border-soft rounded-xl space-y-3">
            <span className="text-[9px] uppercase font-bold text-slate-450 tracking-wider font-mono block">Over-by-Over Ball Timeline</span>
            <div className="space-y-2.5">
              {(() => {
                // Group the balls by overNum
                const oversMap: { [key: number]: typeof match.ballHistory } = {};
                match.ballHistory.forEach((ball) => {
                  const ovStr = ball.overNum;
                  if (!oversMap[ovStr]) {
                    oversMap[ovStr] = [];
                  }
                  oversMap[ovStr].push(ball);
                });

                const sortedOverNums = Object.keys(oversMap).map(Number).sort((a, b) => a - b);

                if (sortedOverNums.length === 0) {
                  return (
                    <div className="text-[10px] text-slate-500 italic">
                      Pre-play match setup. Deliver first ball to start timeline.
                    </div>
                  );
                }

                return sortedOverNums.map((ov) => {
                  const balls = oversMap[ov];
                  // Calculate total runs in this over
                  const overRuns = balls.reduce((total, b) => total + b.runs + b.extraRuns, 0);
                  const isCurrentOver = ov === Math.floor((innings?.balls || 0) / 6);
                  return (
                    <div key={ov} className={`flex items-center gap-3 p-2 rounded-lg border ${isCurrentOver ? 'bg-sky-950/25 border-sky-500/25' : 'bg-slate-950/40 border-soft/50'}`}>
                      <div className="shrink-0 flex flex-col min-w-[55px]">
                        <span className="text-[10px] font-extrabold text-slate-300 font-mono">OVER {ov + 1}</span>
                        <span className="text-[9px] text-slate-500 font-mono">{overRuns} runs</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {balls.map((b, bIdx) => (
                          <div
                            key={bIdx}
                            title={b.description}
                            className={`min-w-7 h-7 rounded border flex items-center justify-center font-bold text-[10px] select-none ${
                              b.isWicket 
                                ? "bg-rose-500/20 text-rose-300 border-rose-500/40" 
                                : b.extrasType 
                                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30" 
                                  : b.runs === 4 
                                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                                    : b.runs === 6 
                                      ? "bg-sky-500/20 text-sky-300 border-sky-450/40" 
                                      : "bg-slate-900 text-slate-400 border-soft"
                            }`}
                          >
                            {b.isWicket ? "W" : b.extrasType === "wide" ? "WD" : b.extrasType === "noball" ? "NB" : b.extrasType === "bye" ? `${b.extraRuns}B` : b.extrasType === "legbye" ? `${b.extraRuns}L` : b.runs === 0 ? "•" : b.runs}
                          </div>
                        ))}
                      </div>
                      <span className="text-[9px] text-slate-450 ml-auto font-mono max-w-[150px] truncate text-right hidden sm:block">
                        Bowler: {balls[0]?.bowler || "Unknown"}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Scorecard Tab Lists Toggle */}
          {(showFullScorecard || match.status === "completed") && (
            <div className="bg-brand-surface p-4 rounded-xl border border-soft space-y-5">
              {/* Selector Innings tabs */}
              <div className="flex border-b border-soft mb-2 gap-1.5">
                <button
                  onClick={() => setActiveInningsTab(1)}
                  className={`px-3 py-1.5 font-extrabold text-[10px] uppercase tracking-wider transition border-b-2 ${activeInningsTab === 1 ? "border-sky-500 text-sky-400" : "border-transparent text-slate-450 hover:text-slate-205"}`}
                >
                  Innings 1: {match.innings1?.battingTeam || "Home"}
                </button>
                {match.innings2?.battingTeam && (
                  <button
                    onClick={() => setActiveInningsTab(2)}
                    className={`px-3 py-1.5 font-extrabold text-[10px] uppercase tracking-wider transition border-b-2 ${activeInningsTab === 2 ? "border-sky-500 text-sky-400" : "border-transparent text-slate-455 hover:text-slate-205"}`}
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
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-brand-surface border border-soft p-5 rounded-xl max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-extrabold text-sm text-rose-450 border-b border-soft pb-1.5 uppercase tracking-wider font-mono">Record Out Batsman</h3>

            <div className="space-y-3.5 text-xs text-slate-200">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 mb-1 uppercase tracking-wider font-mono">Dismissal Type</label>
                <select
                  className="w-full bg-slate-950 border border-soft rounded-lg py-1.5 px-3 text-slate-200 text-xs focus:outline-none focus:border-sky-500 font-sans"
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
                <label className="block text-[10px] font-bold text-slate-450 mb-1 uppercase tracking-wider font-mono">Batsman Dismissed</label>
                <select
                  className="w-full bg-slate-950 border border-soft rounded-lg py-1.5 px-3 text-slate-200 text-xs focus:outline-none focus:border-sky-500 font-sans"
                  value={dismissedBatsman}
                  onChange={(e) => setDismissedBatsman(e.target.value)}
                >
                  <option value={strikerName}>{strikerName} (Active Striker)</option>
                  <option value={nonStrikerName}>{nonStrikerName} (Non-Striker)</option>
                </select>
              </div>

              {(wicketType === "caught" || wicketType === "runout" || wicketType === "stumped") && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 mb-1 uppercase tracking-wider font-mono">Fielder Involved Name</label>
                  <select
                    className="w-full bg-slate-950 border border-soft rounded-lg py-1.5 px-3 text-slate-200 text-xs focus:outline-none focus:border-sky-500 font-sans"
                    value={fielderName}
                    onChange={(e) => setFielderName(e.target.value)}
                  >
                    <option value="">Select Fielder Name</option>
                    {bowlingSquad.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowWicketModal(false)}
                className="flex-1 bg-brand-action hover:bg-slate-755 text-slate-350 border border-soft py-1.5 rounded-lg text-xs font-bold cursor-pointer font-mono"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordWicket}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-1.5 rounded-lg cursor-pointer text-xs uppercase tracking-wider"
              >
                Confirm Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD EXTRAS POPUP MODAL */}
      {showExtraModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans">
          <div className="bg-brand-surface border border-soft p-5 rounded-xl max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-extrabold text-sm text-sky-455 border-b border-soft pb-1.5 uppercase tracking-wider font-mono">Record Extras</h3>

            <div className="space-y-3.5 text-xs text-slate-200">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 mb-1.5 uppercase tracking-wider font-mono">Extras Type</label>
                <div className="grid grid-cols-2 gap-2 font-sans">
                  {(["wide", "noball", "bye", "legbye"] as const).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setExtraType(t)}
                      className={`py-1.5 rounded border font-bold text-[10px] uppercase tracking-wider transition cursor-pointer ${extraType === t ? "bg-sky-500/10 border-sky-450 text-sky-400 shadow-sm" : "bg-slate-950 border-soft text-slate-450 hover:bg-slate-800"}`}
                    >
                      {t === "noball" ? "No Ball" : t === "legbye" ? "Leg Bye" : t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 mb-1.5 uppercase tracking-wider font-mono">Additional Conceded Runs (E.g. byed boundaries)</label>
                <div className="grid grid-cols-5 gap-1.5 font-sans">
                  {[0, 1, 2, 3, 4].map((num) => (
                    <button
                      type="button"
                      key={num}
                      onClick={() => setExtraBoundaryRuns(num)}
                      className={`py-1.5 font-bold font-mono rounded border text-xs cursor-pointer ${extraBoundaryRuns === num ? "bg-sky-500/10 border-sky-450 text-sky-400" : "bg-slate-950 border-soft text-slate-405 hover:bg-slate-800"}`}
                    >
                      +{num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowExtraModal(false)}
                className="flex-1 bg-brand-action hover:bg-slate-755 text-slate-355 border border-soft py-1.5 rounded-lg cursor-pointer text-xs font-bold font-mono"
              >
                Close
              </button>
              <button
                onClick={handleRecordExtras}
                className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-extrabold py-1.5 rounded-lg cursor-pointer text-xs uppercase tracking-wider"
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
    <div className="space-y-4">
      {/* Batting Card table */}
      <div>
        <h4 className="text-white font-extrabold text-xs mb-2 uppercase tracking-wider text-sky-405 font-mono">Batting Card</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] divide-y divide-soft/50">
            <thead>
              <tr className="text-slate-450 font-bold uppercase tracking-wider text-[9px] font-mono">
                <th className="py-2">Batsman</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-center">Runs</th>
                <th className="py-2 text-center font-mono text-[9px]">Balls</th>
                <th className="py-2 text-center">4s</th>
                <th className="py-2 text-center">6s</th>
                <th className="py-2 text-right">SR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soft/40 text-slate-200">
              {inningsData.batsmen.map((b, i) => (
                <tr key={i} className="hover:bg-slate-800/15 font-sans">
                  <td className="py-2 font-bold text-slate-105">{b.name}</td>
                  <td className="py-2 text-slate-450 text-[10px]">
                    {b.howOut === "notout" 
                      ? "not out" 
                      : b.howOut === "caught" 
                        ? `c ${b.fielderName || "fielder"} b ${b.dismissedBy}` 
                        : b.howOut === "runout" 
                          ? `run out (${b.fielderName || "fielder"})` 
                          : b.howOut}
                  </td>
                  <td className="py-2 text-center font-extrabold text-sky-400 font-mono text-xs">{b.runs}</td>
                  <td className="py-2 text-center text-slate-400 font-mono text-[10.5px]">{b.balls}</td>
                  <td className="py-2 text-center font-mono text-[10px]">{b.fours}</td>
                  <td className="py-2 text-center font-mono text-[10px]">{b.sixes}</td>
                  <td className="py-2 text-right font-mono text-[10px] text-slate-455">{calcStrikeRate(b.runs, b.balls)}</td>
                </tr>
              ))}
              {inningsData.batsmen.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-3 text-center text-slate-500 italic font-mono text-[10px]">No batsmen faced deliveries yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Extras line */}
        <div className="mt-2.5 p-2 bg-slate-950/40 rounded-lg flex items-center justify-between text-[10px] text-slate-305 border border-soft/50">
          <span className="font-sans text-slate-450">
            <strong className="font-mono text-slate-400 text-[9px] uppercase tracking-wider">Extras:</strong> {inningsData.extras?.total || 0} <span className="font-mono text-[9px] text-slate-550">(w {inningsData.extras?.wides || 0}, nb {inningsData.extras?.noBalls || 0}, b {inningsData.extras?.byes || 0}, lb {inningsData.extras?.legByes || 0})</span>
          </span>
          <span className="font-extrabold text-white font-mono uppercase tracking-wide text-[9px]">
            Total Runs: {inningsData.runs} / {inningsData.wickets}
          </span>
        </div>
      </div>

      {/* Bowling Card table */}
      <div>
        <h4 className="text-white font-extrabold text-xs mb-2 uppercase tracking-wider text-sky-405 font-mono">Bowling Card</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] divide-y divide-soft/50">
            <thead>
              <tr className="text-slate-455 font-bold uppercase tracking-wider text-[9px] font-mono">
                <th className="py-2">Bowler</th>
                <th className="py-2 text-center">Overs</th>
                <th className="py-2 text-center">Maidens</th>
                <th className="py-2 text-center">Runs</th>
                <th className="py-2 text-center text-sky-400 font-mono">Wickets</th>
                <th className="py-2 text-right">Econ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soft/40 text-slate-205 font-sans">
              {inningsData.bowlers.map((bowl, i) => (
                <tr key={i} className="hover:bg-slate-800/15">
                  <td className="py-2 font-bold text-slate-105">{bowl.name}</td>
                  <td className="py-2 text-center font-mono text-[10px]">{ballsToOvers(bowl.balls)}</td>
                  <td className="py-2 text-center font-mono text-[10px]">{bowl.maidens}</td>
                  <td className="py-2 text-center font-mono text-[10px] text-rose-450">{bowl.runs}</td>
                  <td className="py-2 text-center font-extrabold text-sky-400 font-mono text-xs">{bowl.wickets}</td>
                  <td className="py-2 text-right font-mono text-[10px] text-slate-455">{calcEconomy(bowl.runs, bowl.balls)}</td>
                </tr>
              ))}
              {inningsData.bowlers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-3 text-center text-slate-500 italic font-mono text-[10px]">No bowlers assigned yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fall of wicket details */}
      {inningsData.fallOfWickets && inningsData.fallOfWickets.length > 0 && (
        <div className="p-3 bg-slate-950/40 border border-soft/50 rounded-lg space-y-1">
          <h4 className="text-[9px] uppercase font-bold tracking-wider text-slate-500 font-mono">Fall of Wickets</h4>
          <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[10px] text-slate-350 font-mono">
            {inningsData.fallOfWickets.map((fow, idx) => (
              <span key={idx}>
                <strong>{fow.wicketNum}-{fow.score}</strong> <span className="text-slate-450">({fow.batsmanName}, {fow.overs} ov)</span>
                {idx < inningsData.fallOfWickets.length - 1 && <span className="ml-3 text-slate-700">|</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
