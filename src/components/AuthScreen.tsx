import React, { useState } from "react";
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from "../firebase";
import { Shield, Mail, Lock, User, Sparkles, Trophy } from "lucide-react";

interface AuthScreenProps {
  onSuccess: () => void;
}

export default function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [errCode, setErrCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError("");
    setErrCode("");
    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setErrCode(err.code || "");
      setError(err.message || "Authentication failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError("");
    setErrCode("");
    setLoading(true);
    try {
      await signInAnonymously(auth);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setErrCode(err.code || "");
      setError(err.message || "Guest authentication failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLocalStorageBypass = () => {
    setError("");
    setErrCode("");
    const mockUser = {
      uid: "offline_scorer",
      email: "local_offline_scorer@centuryscorer.local",
      isAnonymous: true,
      isOffline: true
    };
    try {
      localStorage.setItem("offline_local_user", JSON.stringify(mockUser));
      onSuccess();
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setError("Failed to initialize offline local session storage.");
    }
  };

  return (
    <div id="auth-screen-container" className="min-h-screen bg-brand-bg text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Decorative high-tech telemetry rings */}
      <div className="absolute w-[600px] h-[600px] rounded-full border border-sky-500/5 -top-40 -left-40 pointer-events-none animate-pulse"></div>
      <div className="absolute w-[800px] h-[800px] rounded-full border border-sky-500/5 -bottom-80 -right-80 pointer-events-none"></div>

      <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-md rounded-2xl border border-soft p-8 shadow-2xl relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center bg-sky-500/10 text-sky-400 p-3 rounded-xl mb-4 border border-sky-500/20">
            <Trophy className="w-8 h-8 text-sky-400" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">
            CENTURY <span className="text-sky-400">SCORER</span>
          </h1>
          <p className="text-slate-400 text-xs font-mono uppercase tracking-wider mt-2">
            HIGH DENSITY • CRICKET SCORING HUB
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs p-4 rounded-xl mb-6 shadow-md">
            {errCode === "auth/operation-not-allowed" ? (
              <div className="space-y-3 font-sans">
                <span className="font-extrabold text-[11px] text-rose-450 uppercase tracking-wider block font-mono">
                  🚨 Sign-In Config Required in Firebase Console
                </span>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Email/Password and Guest Sign-in methods are currently disabled for this Firebase project. You can enable them with a few clicks:
                </p>
                <div className="space-y-1 text-[11px] list-decimal pl-4 text-slate-400">
                  <div className="mb-2">
                    <strong className="text-sky-400">Step 1:</strong> Click the direct console link below to open your auth settings:
                    <a
                      href="https://console.firebase.google.com/project/lucid-lodge-c8kj5/authentication/providers"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-1 font-mono text-[10px] text-sky-400 hover:underline bg-slate-950 p-2 rounded border border-soft truncate select-all"
                    >
                      console.firebase.google.com/.../providers
                    </a>
                  </div>
                  <div>
                    <strong className="text-sky-400">Step 2:</strong> Click the <strong className="text-slate-200">"Add new provider"</strong> button under Native providers, select <strong className="text-slate-200">Email/Password</strong>, toggle <strong>Enable</strong>, and save.
                  </div>
                  <div className="mt-1">
                    <strong className="text-sky-400">Step 3:</strong> Click <strong className="text-slate-200">"Add new provider"</strong> again, select <strong className="text-slate-200">Anonymous</strong>, toggle <strong>Enable</strong>, and save.
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 italic mt-2 border-t border-soft/50 pt-1.5 font-mono">
                  No code changes needed! Once saved in the Console, login and guest modes will instantly work.
                </p>

                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg mt-3 text-amber-300">
                  <span className="font-extrabold text-[10px] uppercase tracking-wider block font-mono text-yellow-450">
                    ⚠️ PROJECT RESTRICTED BY OWNER?
                  </span>
                  <p className="text-[10px] text-slate-300 mt-1 leading-normal">
                    If you don't have access or see security alerts, you can bypass authentication and save matches locally using secure browser Local Storage:
                  </p>
                  <button
                    type="button"
                    onClick={handleLocalStorageBypass}
                    className="w-full mt-2 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white border border-amber-500/30 text-[10px] font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer font-sans transition"
                  >
                    <Sparkles className="w-3 h-3 text-yellow-300" />
                    BYPASS & USE OFFLINE LOCAL STORAGE
                  </button>
                </div>
              </div>
            ) : (
              <p className="font-mono leading-relaxed">{error}</p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Your Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required={isSignUp}
                  className="w-full bg-slate-950/80 border border-soft rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-sans"
                  placeholder="Steve Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                className="w-full bg-slate-950/80 border border-soft rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-sans"
                placeholder="scorer@localclub.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                className="w-full bg-slate-950/80 border border-soft rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-sans"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-extrabold text-sm py-2.5 rounded-lg transition duration-200 shadow-lg shadow-sky-900/20 flex items-center justify-center gap-2 cursor-pointer border border-sky-400/20"
          >
            {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In to Scorer Hub"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="hover:text-sky-450 underline transition duration-150 cursor-pointer text-sky-400"
          >
            {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
          </button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-soft"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-[#121c2e] px-3 text-slate-500 font-bold tracking-widest">
              Or Go Fast
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleGuestLogin}
            disabled={loading}
            className="w-full bg-[#b71b1b] hover:bg-[#b71b1b]/90 text-slate-200 border border-soft hover:border-sky-500/50 text-xs font-bold py-2 rounded-lg transition duration-200 flex items-center justify-center gap-2 cursor-pointer font-mono"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            CONTINUE AS GUEST (CLOUDFIREBASE)
          </button>

          <button
            onClick={handleLocalStorageBypass}
            disabled={loading}
            className="w-full bg-amber-600/20 hover:bg-amber-600/35 text-amber-300 border border-amber-650/40 hover:border-amber-400/60 text-xs font-bold py-2 rounded-lg transition duration-200 flex items-center justify-center gap-2 cursor-pointer font-mono"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
            BYPASS REGISTRATION (OFFLINE STORAGE)
          </button>
        </div>
        
        <div className="mt-6 flex flex-col items-center gap-1 justify-center text-[10px] text-slate-500 font-mono uppercase tracking-wider text-center">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Flexible storage (Local Storage of browser fallback available)
          </div>
        </div>
      </div>
    </div>
  );
}
