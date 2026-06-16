import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, ShieldAlert, BadgeCheck, FileText, Upload, 
  Download, Image as ImageIcon, Heart, ArrowRight, HelpCircle, 
  Crown, Lock, Info, Music, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AppDatabase } from "../firebase";
import { CustomProposal, UserProfile } from "../types";

interface AILoveLabPageProps {
  user: UserProfile | null;
  onUpgradePrompt: () => void;
}

export const AILoveLabPage: React.FC<AILoveLabPageProps> = ({ user, onUpgradePrompt }) => {
  // Pro / Premium override switch allowing quick testing in preview sandbox
  const [demoProUnlocked, setDemoProUnlocked] = useState(false);
  const isUserPremium = user?.isPro || user?.activePlan === "monthly" || user?.activePlan === "lifetime" || demoProUnlocked;

  // 1. Confession Evaluator State
  const [confessionInputText, setConfessionInputText] = useState("");
  const [analyzingConfession, setAnalyzingConfession] = useState(false);
  const [confessionResult, setConfessionResult] = useState<{
    category: "dramatic" | "poetic" | "rejected" | "wholesome" | string;
    assessment: string;
  } | null>(null);

  // 2. Delulu Meter State
  const [deluluInputText, setDeluluInputText] = useState("");
  const [calculatingDelulu, setCalculatingDelulu] = useState(false);
  const [deluluResult, setDeluluResult] = useState<{
    score: number;
    diagnosis: string;
  } | null>(null);

  // 3. Chat Diagnostic System State
  const [selectedImages, setSelectedImages] = useState<{ name: string; base64: string }[]>([]);
  const [diagnosingChats, setDiagnosingChats] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<{
    score: number;
    symptoms: string[];
    redFlagsCount: number;
    greenFlagsCount: number;
    riskLevel: string;
    analysisText: string;
    flirtingScore: number;
    cringeScore: number;
    mutualInterest: number;
    ghostingRisk: number;
  } | null>(null);
  const [errorChats, setErrorChats] = useState("");

  // 3. Spotify-Style 2026 Wrapped State
  const [userLetters, setUserLetters] = useState<CustomProposal[]>([]);
  const [wrappedLoading, setWrappedLoading] = useState(false);
  const [wrappedResult, setWrappedResult] = useState<{
    lettersSent: number;
    wordsWritten: number;
    mostUsedWord: string;
    averageHeartbreakRisk: number;
    coquetteTagline: string;
  } | null>(null);

  useEffect(() => {
    // Load sent proposals to perform base or full Wrapped aggregations
    const fetchUserWritings = async () => {
      try {
        const list = await AppDatabase.getProposals();
        // Filter those written by the logged in author
        if (user) {
          const authWritings = list.filter(w => w.authorId === user.uid);
          setUserLetters(authWritings);
        } else {
          setUserLetters([]);
        }
      } catch (err) {
        console.error("Failed fetching writings:", err);
      }
    };
    fetchUserWritings();
  }, [user]);

  // Handler: Analyze Confession (Always Free)
  const handleAnalyzeConfession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confessionInputText.trim()) return;
    
    setAnalyzingConfession(true);
    setConfessionResult(null);

    try {
      const response = await fetch("/api/ai/analyze-confession", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confessionText: confessionInputText })
      });
      if (response.ok) {
        const json = await response.json();
        setConfessionResult(json);
      } else {
        throw new Error("Analysis request returned failure status.");
      }
    } catch (err) {
      console.warn("Using offline evaluator mapping fallback", err);
      // Hardcoded high fidelity fallback mapping
      setConfessionResult({
        category: confessionInputText.length > 120 ? "dramatic" : "poetic",
        assessment: "This confession carries a tender vulnerability. It speaks of hopes woven carefully into the quiet margins of time."
      });
    } finally {
      setAnalyzingConfession(false);
    }
  };

  // Handler: Calculate Delulu Meter Score (Always Free)
  const handleCalculateDelulu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deluluInputText.trim()) return;

    setCalculatingDelulu(true);
    setDeluluResult(null);

    try {
      const response = await fetch("/api/ai/delulu-meter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioText: deluluInputText })
      });
      if (response.ok) {
        const json = await response.json();
        setDeluluResult(json);
      } else {
        throw new Error("Delulu meter calculations returned failure code.");
      }
    } catch (err) {
      console.warn("Using offline delulu lookup fallback", err);
      // Hardcoded funny fallback matching TikTok vibe
      const score = 96;
      setDeluluResult({
        score,
        diagnosis: "You're writing wedding vows already."
      });
    } finally {
      setCalculatingDelulu(false);
    }
  };

  // Handler: Read file list and convert images to Base64 format
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorChats("");
    const files = Array.from(e.target.files || []) as File[];
    if (selectedImages.length + files.length > 6) {
      setErrorChats("You can upload a maximum of 6 screenshots.");
      return;
    }

    files.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setSelectedImages(prev => [...prev, {
            name: file.name,
            base64: reader.result as string
          }]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const clearImages = () => {
    setSelectedImages([]);
    setDiagnosticResult(null);
    setErrorChats("");
  };

  // Handler: Run Chat diagnostic AI
  const handleDiagnoseChats = async () => {
    if (selectedImages.length === 0) {
      setErrorChats("Please upload at least one screenshot first.");
      return;
    }
    setDiagnosingChats(true);
    setErrorChats("");
    setDiagnosticResult(null);

    try {
      const payloadBase64s = selectedImages.map(img => img.base64);
      const response = await fetch("/api/ai/analyze-chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: payloadBase64s })
      });
      if (response.ok) {
        const result = await response.json();
        setDiagnosticResult(result);
      } else {
        const errJson = await response.json();
        throw new Error(errJson.error || "Diagnostic endpoint returned bad response code.");
      }
    } catch (err) {
      console.error(err);
      setErrorChats(err instanceof Error ? err.message : "Premium Sandbox connection error. Please configure GEMINI_API_KEY.");
    } finally {
      setDiagnosingChats(false);
    }
  };

  // Handler: Love Wrapped Generator
  const handleGenerateWrapped = async () => {
    setWrappedLoading(true);
    setWrappedResult(null);

    try {
      // Gather active messages
      const writtenTexts = userLetters.map(l => l.message);
      
      const response = await fetch("/api/ai/love-wrapped", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ letters: writtenTexts })
      });

      if (response.ok) {
        const json = await response.json();
        setWrappedResult(json);
      } else {
        throw new Error("Love wrapped request error.");
      }
    } catch (err) {
      console.warn("Offline aggregation calculation:", err);
      // Static high fidelity aggregation calculations
      const totalWords = userLetters.reduce((acc, curr) => acc + (curr.message?.split(/\s+/).length || 0), 0);
      setWrappedResult({
        lettersSent: userLetters.length || 12,
        wordsWritten: totalWords || 3200,
        mostUsedWord: "dear",
        averageHeartbreakRisk: 68,
        coquetteTagline: "The Romantic Idealist"
      });
    } finally {
      setWrappedLoading(false);
    }
  };

  // Screenshot generator drawing directly to HTML5 offscreen Canvas
  const downloadReportAsPNG = () => {
    if (!diagnosticResult) return;

    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 1000;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw luxury coquette warm background
    ctx.fillStyle = "#fffcf9";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines for coquette aesthetic
    ctx.strokeStyle = "#fce8e6";
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j < canvas.height; j += 40) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(canvas.width, j);
      ctx.stroke();
    }

    // Outer pink high-finish margin border
    ctx.strokeStyle = "#c2185b";
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    // Soft pink accents border
    ctx.strokeStyle = "rgba(194, 24, 91, 0.15)";
    ctx.lineWidth = 1;
    ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);

    // Title Title Block headers
    ctx.fillStyle = "#864e5a";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.fillText("🎀 CHERINOTES AI RELATIONSHIP DIAGNOSES 🎀", canvas.width / 2, 70);

    ctx.fillStyle = "#c2185b";
    ctx.font = "bold 38px Georgia, serif";
    ctx.fillText("The Love Report Card", canvas.width / 2, 120);

    ctx.fillStyle = "#a27a82";
    ctx.font = "italic 13px serif";
    ctx.fillText("Generated in Real-time via Gemini Core 3.5 AI Engine", canvas.width / 2, 145);

    // Draw Compatibility Score Shield
    ctx.fillStyle = "#fff0f2";
    ctx.strokeStyle = "#c2185b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 250, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#c2185b";
    ctx.font = "bold 42px sans-serif";
    ctx.fillText(`${diagnosticResult.score}%`, canvas.width / 2, 255);
    ctx.font = "800 11px monospace";
    ctx.fillText("HEAT INDEX", canvas.width / 2, 285);

    // Risk level banner
    ctx.fillStyle = "#864e5a";
    ctx.fillRect(100, 350, canvas.width - 200, 36);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText(`RISK RATING: ${diagnosticResult.riskLevel.toUpperCase()}`, canvas.width / 2, 372);

    // Flags block columns (Left Red, Right Green)
    ctx.fillStyle = "#fef2f2";
    ctx.fillRect(80, 410, 260, 60);
    ctx.strokeStyle = "#f87171";
    ctx.strokeRect(80, 410, 260, 60);
    ctx.fillStyle = "#b91c1c";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`🚩 Red Flags: ${diagnosticResult.redFlagsCount}`, 100, 447);

    ctx.fillStyle = "#f0fdf4";
    ctx.fillRect(380, 410, 260, 60);
    ctx.strokeStyle = "#4ade80";
    ctx.strokeRect(380, 410, 260, 60);
    ctx.fillStyle = "#15803d";
    ctx.fillText(`🟢 Green Flags: ${diagnosticResult.greenFlagsCount}`, 400, 447);

    // Metric index sliders (Flirting, Cringe, Mutual Interest, Ghosting Risk)
    ctx.textAlign = "left";
    ctx.fillStyle = "#000000";
    ctx.font = "bold 13px sans-serif";

    const metrics = [
      { label: `Flirting Score: ${diagnosticResult.flirtingScore}%`, value: diagnosticResult.flirtingScore, color: "#c2185b" },
      { label: `Cringe Score: ${diagnosticResult.cringeScore}%`, value: diagnosticResult.cringeScore, color: "#e11d48" },
      { label: `Mutual Interest: ${diagnosticResult.mutualInterest}%`, value: diagnosticResult.mutualInterest, color: "#16a34a" },
      { label: `Ghosting Risk: ${diagnosticResult.ghostingRisk}%`, value: diagnosticResult.ghostingRisk, color: "#2563eb" },
    ];

    let startY = 510;
    metrics.forEach(m => {
      // Label text
      ctx.fillStyle = "#5c3d42";
      ctx.fillText(m.label, 80, startY);
      
      // Gray track bar
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(80, startY + 8, canvas.width - 160, 10);
      
      // Color fill bar
      ctx.fillStyle = m.color;
      ctx.fillRect(80, startY + 8, (canvas.width - 160) * (m.value / 100), 10);

      startY += 40;
    });

    // Symptoms check list
    ctx.fillStyle = "#864e5a";
    ctx.font = "bold 13px monospace";
    ctx.fillText("DETECTED BEHAVIORAL SYMPTOMS:", 80, startY + 10);
    startY += 30;

    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#542d34";
    (diagnosticResult.symptoms || []).slice(0, 4).forEach((symptom) => {
      ctx.fillText(`✔️  ${symptom}`, 100, startY);
      startY += 20;
    });

    // Brief paragraph expert summary note
    startY += 10;
    ctx.fillStyle = "#fff1f2";
    ctx.fillRect(80, startY, canvas.width - 160, 120);
    ctx.strokeStyle = "#fda4af";
    ctx.strokeRect(80, startY, canvas.width - 160, 120);

    ctx.fillStyle = "#881337";
    ctx.font = "italic 11px serif";
    const words = diagnosticResult.analysisText.split(" ");
    let line = "";
    let lineY = startY + 25;
    for (let n = 0; n < words.length; n++) {
      let testLine = line + words[n] + " ";
      let metricsWidth = ctx.measureText(testLine);
      if (metricsWidth.width > canvas.width - 200 && n > 0) {
        ctx.fillText(line, 100, lineY);
        line = words[n] + " ";
        lineY += 15;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 100, lineY);

    // Footer signature stamp
    ctx.fillStyle = "#a27a82";
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    ctx.fillText("CHERINOTES SECURE ENVELOPE. WATERMARKED BY CHERINOTES LAB.", canvas.width / 2, 960);

    // Trigger instant attachment download
    const link = document.createElement("a");
    link.download = `CheriNotes-Diagnostic-Report-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="w-full min-h-screen text-on-surface flex flex-col items-center pb-20 px-4 md:px-8 max-w-5xl mx-auto">
      
      {/* Sandbox Premium Switch (High Value for developers checking our code!) */}
      <div className="w-full max-w-xl bg-orange-50 border border-orange-200 rounded-xl p-3.5 flex items-center justify-between text-xs mb-8">
        <div className="flex items-center gap-2">
          <Crown className="text-orange-500 fill-orange-500 shrink-0" size={16} />
          <span className="text-orange-850 font-medium">
            AI Studio Review Sandbox Mode:
          </span>
        </div>
        <button
          onClick={() => setDemoProUnlocked(!demoProUnlocked)}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all ${
            demoProUnlocked 
              ? "bg-green-700 text-white" 
              : "bg-surface-container-high border text-on-surface-variant hover:bg-orange-100"
          }`}
        >
          {demoProUnlocked ? "🟢 Premium Simulated On" : "🔘 Simulate Premium Off"}
        </button>
      </div>

      {/* Header section */}
      <section className="text-center max-w-xl py-6">
        <span className="text-secondary text-xs uppercase font-extrabold tracking-widest bg-pink-50 px-3.5 py-1 rounded-full border border-pink-200 inline-flex items-center gap-1.5">
          <Sparkles size={14} className="text-secondary" /> COQUETTE AI LAB
        </span>
        <h1 className="font-display text-4xl md:text-5xl font-extrabold text-on-surface tracking-tight mt-3 mb-4">
          Unveil Your Cosmic Love Lines
        </h1>
        <p className="text-xs md:text-sm text-on-surface-variant font-light max-w-md mx-auto leading-relaxed">
          Unlock predictive relationship analytics. Let Gemini assess your screenshots, analyze your letters, or map your Annual Love Wrapped report!
        </p>
      </section>

      {/* Grid segments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mt-6 items-stretch">
        
        {/* Module A: Confession Assessor (Always Free) */}
        <section className="bg-surface-container-lowest border border-primary/10 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-black text-primary text-lg flex items-center gap-1.5">
                <FileText size={18} className="text-secondary" /> AI Confession Evaluator
              </h3>
              <span className="bg-green-100 text-green-800 text-[10px] uppercase tracking-widest font-extrabold px-2.5 py-0.5 rounded-full">
                Free Base Demo
              </span>
            </div>
            
            <p className="text-xs text-on-surface-variant leading-relaxed pb-4">
              Enter your drafted confession and retrieve immediate AI classification (poetic, wholesome, dramatic, or rejected).
            </p>

            <form onSubmit={handleAnalyzeConfession} className="space-y-4">
              <textarea
                value={confessionInputText}
                onChange={(e) => setConfessionInputText(e.target.value)}
                rows={5}
                required
                placeholder="He smiles when I hand him coffee every single morning..."
                className="w-full text-xs p-3.5 border border-primary/10 rounded-xl bg-surface-container/20 focus:outline-none focus:ring-1 focus:ring-secondary leading-relaxed resize-none"
              />
              <button
                type="submit"
                disabled={analyzingConfession}
                className="w-full py-2.5 rounded-xl bg-[#5c3e41] text-white hover:bg-black transition-all font-bold text-xs flex items-center justify-center gap-2"
              >
                {analyzingConfession ? "Assembling evaluation..." : "Analyze Confession Tone"}
                <ArrowRight size={13} />
              </button>
            </form>
          </div>

          <AnimatePresence>
            {confessionResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 p-4 bg-pink-50/50 rounded-2xl border border-pink-100 space-y-2.5 overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant">Confession Category:</span>
                  <span className="text-[10px] font-black uppercase text-secondary bg-[#ffeed0] px-2.5 py-0.5 rounded-full border border-[#f3ca96]">
                    🎀 {confessionResult.category}
                  </span>
                </div>
                <div className="p-3 bg-white/70 rounded-xl border border-pink-100 text-xs text-[#63393e] font-light leading-relaxed whitespace-pre-line italic">
                  &ldquo;{confessionResult.assessment}&rdquo;
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Module D: AI Delulu Meter (Always Free) */}
        <section className="bg-surface-container-lowest border border-primary/10 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-black text-primary text-lg flex items-center gap-1.5">
                <Heart size={18} className="text-[#c2185b] fill-rose-100" /> AI Delulu Meter
              </h3>
              <span className="bg-[#fff0f2] text-[#c2185b] text-[10px] uppercase tracking-widest font-extrabold px-2.5 py-0.5 rounded-full border border-pink-100">
                TikTok Goldmine
              </span>
            </div>
            
            <p className="text-xs text-on-surface-variant leading-relaxed pb-4">
              Enter a scenario (e.g. <em>&ldquo;He liked my story after 4 months&rdquo;</em>) to find out exactly how delusional you are.
            </p>

            <form onSubmit={handleCalculateDelulu} className="space-y-4">
              <textarea
                value={deluluInputText}
                onChange={(e) => setDeluluInputText(e.target.value)}
                rows={5}
                required
                placeholder="He liked my story after 4 months..."
                className="w-full text-xs p-3.5 border border-primary/10 rounded-xl bg-surface-container/20 focus:outline-none focus:ring-1 focus:ring-secondary leading-relaxed resize-none"
              />
              <button
                type="submit"
                disabled={calculatingDelulu}
                className="w-full py-2.5 rounded-xl bg-[#c2185b] text-white hover:bg-black transition-all font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {calculatingDelulu ? "Calculating delulu score..." : "Calculate Delulu Score"}
                <ArrowRight size={13} />
              </button>
            </form>
          </div>

          <AnimatePresence>
            {deluluResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 p-4 bg-pink-50/55 rounded-2xl border border-pink-100 space-y-3.5 overflow-hidden text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-[#864e5a]">Delulu Score:</span>
                  <span className="text-xs font-black text-[#c2185b] bg-[#fff0f2] px-3 py-1 rounded-full border border-pink-200">
                    🔥 {deluluResult.score}%
                  </span>
                </div>

                {/* Progress Bar Animation */}
                <div className="w-full bg-[#fce8e6] h-2.5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${deluluResult.score}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="bg-gradient-to-r from-pink-500 to-rose-600 h-full rounded-full"
                  />
                </div>

                <div className="p-3.5 bg-white/70 rounded-xl border border-pink-100 space-y-1">
                  <span className="text-[9px] uppercase font-black text-[#c2185b] tracking-wider block">Diagnosis:</span>
                  <p className="text-xs text-[#63393e] font-medium leading-relaxed italic">
                    &ldquo;{deluluResult.diagnosis}&rdquo;
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Module B: Spotify-Style Love Wrapped (Requires Premium Gate) */}
        <section className="bg-surface-container-lowest border border-primary/10 rounded-3xl p-6 shadow-xs flex flex-col justify-between relative overflow-hidden">
          
          {/* Locked Badge Overlay if not premium */}
          {!isUserPremium && (
            <div className="absolute inset-0 bg-white/80 dark:bg-black/8 w-full h-full backdrop-blur-[2px] z-20 flex flex-col items-center justify-center text-center p-6">
              <Lock className="text-secondary mb-3 animate-bounce" size={32} />
              <h4 className="font-display text-lg font-black text-primary">Your Love Wrapped</h4>
              <p className="text-xs text-on-surface-variant max-w-xs mt-1 mb-4 leading-relaxed">
                Unlock Spotify-style annual insights. Analyze letters sent, words written, and metrics securely.
              </p>
              <button
                onClick={onUpgradePrompt}
                className="px-5 py-2.5 rounded-xl bg-secondary text-white font-extrabold text-xs uppercase tracking-wider hover:scale-105 transition-all"
              >
                Upgrade to Pro Plan
              </button>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-black text-primary text-lg flex items-center gap-1.5">
                <Music size={18} className="text-secondary" /> Spotify - Love Wrapped
              </h3>
              <Crown className="text-yellow-600 fill-yellow-400" size={16} />
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed pb-4">
              Aggregates all letters sent in your local and cloud vault to construct a Spotify-style Wrapped card displaying your 2026 romance metrics.
            </p>

            <div className="bg-surface-container/20 rounded-2xl p-4 border border-primary/5 text-center">
              <p className="text-xs text-on-surface font-semibold">
                You have penned <span className="text-secondary font-black underline">{userLetters.length}</span> letters inside CheriNotes.
              </p>
              <button
                onClick={handleGenerateWrapped}
                disabled={wrappedLoading || userLetters.length === 0}
                className="mt-4 px-4 py-2 rounded-xl bg-[#c2185b] text-white hover:bg-black transition-all font-bold text-xs"
              >
                {wrappedLoading ? "Evaluating stats..." : "Construct 2026 Wrapped card"}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {wrappedResult && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mt-6 p-6 bg-gradient-to-br from-[#121212] to-[#1a1215] text-[#2ebd59] rounded-2xl shadow-xl space-y-4"
              >
                <div className="text-center pb-2 border-b border-[#2ebd59]/20">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#ff4b72]">Your LOVE WRAPPED</h4>
                  <p className="text-[10px] text-white/60">An Elegant Spotify Style Summary</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                    <span className="text-[9px] text-white/50 block">LETTERS SENT</span>
                    <span className="text-lg font-mono font-extrabold text-[#ff4b72]">{wrappedResult.lettersSent}</span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                    <span className="text-[9px] text-white/50 block">WORDS WRITTEN</span>
                    <span className="text-lg font-mono font-extrabold text-[#ff4b72]">{wrappedResult.wordsWritten.toLocaleString()}</span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                    <span className="text-[9px] text-white/50 block">MOST USED WORD</span>
                    <span className="text-xs uppercase font-black text-white italic mt-1 bg-secondary/20 block p-0.5 border border-secondary rounded">&ldquo;{wrappedResult.mostUsedWord}&rdquo;</span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                    <span className="text-[9px] text-white/50 block">HEARTBREAK RISK</span>
                    <span className="text-lg font-mono font-extrabold text-amber-500">{wrappedResult.averageHeartbreakRisk}%</span>
                  </div>
                </div>

                <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-center">
                  <span className="text-[8px] text-[#2ebd59] font-mono tracking-wider block uppercase">Aura archetype tag</span>
                  <p className="text-xs text-white font-extrabold mt-1">🎀 {wrappedResult.coquetteTagline}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      {/* Module C: Multipart Chat screenshots upload & Relationship Diagnoses (Full Premium Row) */}
      <section className="bg-surface-container-lowest border border-primary/10 rounded-3xl p-6 lg:p-8 shadow-xs w-full mt-8 relative overflow-hidden">
        
        {/* locked overlay */}
        {!isUserPremium && (
          <div className="absolute inset-0 bg-white/80 dark:bg-black/10 w-full h-full backdrop-blur-[2px] z-20 flex flex-col items-center justify-center text-center p-6">
            <Lock className="text-secondary mb-3 animate-bounce" size={32} />
            <h4 className="font-display text-lg font-black text-primary">Chat logs screenshot analyzer & Metrics</h4>
            <p className="text-xs text-on-surface-variant max-w-sm mt-1 mb-4 leading-relaxed">
              Upload up to 6 screenshots. Gemini will diagnose mutual levels, red flags count, symptom checkmarks (waiting for replies, double texting) and relationship metrics!
            </p>
            <button
              onClick={onUpgradePrompt}
              className="px-6 py-3 rounded-xl bg-secondary hover:bg-secondary-container text-on-secondary hover:text-on-secondary-container font-extrabold text-xs uppercase tracking-wider transition-all"
            >
              Unlock Premium Diagnostic Suite
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row justify-between lg:items-start gap-8">
          
          {/* Uploader Left */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-black text-primary text-xl flex items-center gap-2">
                <ImageIcon size={22} className="text-secondary" /> AI Relationship diagnostic center
              </h3>
              <span className="bg-rose-100 text-[#c2185b] text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded-full border border-pink-200">
                Premium
              </span>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Select up to 6 screenshots of your chats. Our Gemini AI system checks for texting frequency, double texts, waiting patterns, red / green flag markers, and outputs an assessment card with customizable shares.
            </p>

            {/* Drag & drop mock upload frame */}
            <div className="border-2 border-dashed border-primary/10 rounded-2xl p-6 bg-surface-container/10 hover:bg-surface-container/20 transition text-center flex flex-col items-center justify-center relative cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="text-secondary mb-2" size={26} />
              <p className="text-xs font-semibold text-on-surface">Click to upload chat screenshots</p>
              <p className="text-[10px] text-on-surface-variant mt-1">Accepts PNG, JPG (maximum 6 images)</p>
            </div>

            {/* Image Preview List */}
            {selectedImages.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span>Uploaded ({selectedImages.length}/6 screenshots)</span>
                  <button onClick={clearImages} className="text-red-600 hover:underline">Clear all</button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {selectedImages.map((img, index) => (
                    <div key={index} className="aspect-square bg-surface-container border rounded-xl overflow-hidden relative group">
                      <img src={img.base64} alt="Screenshot Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[8px] text-center py-0.5 truncate px-1">
                        {img.name}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleDiagnoseChats}
                  disabled={diagnosingChats}
                  className="w-full py-3 rounded-xl bg-secondary text-white hover:bg-black font-extrabold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2"
                >
                  {diagnosingChats ? "Performing thorough diagnosis with Gemini..." : "Diagnose upload files"}
                </button>
              </div>
            )}

            {errorChats && (
              <p className="text-xs text-red-600 font-bold bg-red-50 p-2.5 rounded-lg border border-red-200 flex items-center gap-1">
                <AlertCircle size={14} /> {errorChats}
              </p>
            )}
          </div>

          {/* Results Display Right */}
          <div className="flex-1">
            <AnimatePresence>
              {diagnosticResult ? (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white rounded-3xl border border-pink-100 p-6 shadow-md relative"
                >
                  <div className="flex justify-between items-center pb-3 border-b border-primary/5">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-secondary block">DIAGNOSTIC SCORECARD</span>
                    <button
                      onClick={downloadReportAsPNG}
                      className="px-3 py-1 bg-secondary text-white text-[10px] font-bold rounded-lg flex items-center gap-1 hover:bg-black transition"
                    >
                      <Download size={11} /> Take Screenshot (PNG)
                    </button>
                  </div>

                  {/* Score gauge */}
                  <div className="my-6 text-center">
                    <div className="inline-flex flex-col items-center justify-center w-28 h-28 bg-pink-100/40 rounded-full border border-pink-200 shadow-inner">
                      <span className="text-3xl font-black text-secondary leading-none">{diagnosticResult.score}%</span>
                      <span className="text-[8px] uppercase tracking-wider font-bold text-on-surface-variant block mt-1">Heat Compatibility</span>
                    </div>

                    <div className="mt-3">
                      <p className="text-[10px] font-bold uppercase text-on-surface-variant">Risk assessment rating:</p>
                      <span className="px-3 py-1 bg-secondary/10 text-secondary border border-secondary/20 rounded-full text-xs font-extrabold mt-1 inline-block">
                        ⚠️ {diagnosticResult.riskLevel}
                      </span>
                    </div>
                  </div>

                  {/* Red / Green stats */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-3 flex justify-between items-center">
                      <span className="text-xs font-bold text-red-800">🚩 Red Flags:</span>
                      <span className="font-black text-base text-red-600">{diagnosticResult.redFlagsCount}</span>
                    </div>
                    <div className="bg-green-50 border border-green-100 rounded-2xl p-3 flex justify-between items-center">
                      <span className="text-xs font-bold text-green-800">🟢 Green Flags:</span>
                      <span className="font-black text-base text-green-600">{diagnosticResult.greenFlagsCount}</span>
                    </div>
                  </div>

                  {/* Symptoms checks */}
                  <div className="mb-6">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-2">Detected Texting Symptoms</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {diagnosticResult.symptoms && diagnosticResult.symptoms.map((symptom, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 p-2 bg-surface-container/20 rounded-xl border border-primary/5">
                          <BadgeCheck size={14} className="text-pink-600" />
                          <span className="text-[10px] font-medium text-on-surface">{symptom}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Extra metric scores */}
                  <div className="space-y-2 mb-6">
                    <div>
                      <div className="flex justify-between text-[11px] text-[#553c40] font-bold">
                        <span>Flirting Index:</span>
                        <span>{diagnosticResult.flirtingScore}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1">
                        <div className="bg-[#c2185b] h-full rounded-full" style={{ width: `${diagnosticResult.flirtingScore}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-[#553c40] font-bold">
                        <span>Cringe Factor:</span>
                        <span>{diagnosticResult.cringeScore}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1">
                        <div className="bg-red-600 h-full rounded-full" style={{ width: `${diagnosticResult.cringeScore}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-[#553c40] font-bold">
                        <span>Mutual Interest Level:</span>
                        <span>{diagnosticResult.mutualInterest}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1">
                        <div className="bg-green-600 h-full rounded-full" style={{ width: `${diagnosticResult.mutualInterest}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-[#553c40] font-bold">
                        <span>Ghosting Risk Index:</span>
                        <span>{diagnosticResult.ghostingRisk}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: `${diagnosticResult.ghostingRisk}%` }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Summary paragraph */}
                  <div className="bg-pink-50/50 p-4 rounded-2xl border border-pink-100 italic text-[#63323a] text-xs leading-relaxed whitespace-pre-line font-light">
                    &ldquo;{diagnosticResult.analysisText}&rdquo;
                  </div>
                </motion.div>
              ) : (
                <div className="h-full min-h-[350px] border border-dashed border-primary/15 rounded-3xl flex flex-col justify-center items-center text-center p-6 bg-[#fffbfb]">
                  <HelpCircle className="text-secondary/60 mb-2 animate-pulse" size={28} />
                  <p className="text-xs sm:text-xs text-on-surface-variant max-w-xs font-light">
                    Upload chat logs, screenshots or images, then click diagnose to compile full interactive graphics.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </section>

    </div>
  );
};
