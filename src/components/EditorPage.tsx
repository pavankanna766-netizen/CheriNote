import React, { useState, useEffect, useRef } from "react";
import { Share2, Sparkles, Heart, Copy, Check, Eye, Trash2, Globe, Lock, ArrowLeft, RefreshCw, X, MessageCircle, Instagram, Send, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AppDatabase, generateSecureLink } from "../firebase";
import { CustomProposal } from "../types";

// Dynamic Themes presets for custom letter styling
const LETTER_THEMES = [
  {
    name: "Coquette Satin",
    bgClass: "bg-[#fff8f7] border-pink-200 text-[#5a383d]",
    accentClass: "text-[#bb0026] fill-[#bb0026]/10",
    ribbonClass: "bg-[#ffd9df]",
    cardStyle: { fontStyle: "normal" }
  },
  {
    name: "Nostalgic Typewriter",
    bgClass: "bg-[#faf6eb] border-[#d2c2ad] text-[#42312b] font-serif",
    accentClass: "text-[#805030] fill-[#805030]/10",
    ribbonClass: "bg-[#eadecc]",
    cardStyle: { fontFamily: "Georgia, serif" }
  },
  {
    name: "Spooky Gothic",
    bgClass: "bg-[#251e20] border-[#502e34] text-[#ffd0d6]",
    accentClass: "text-[#ff3850] fill-[#ff3850]/20",
    ribbonClass: "bg-[#451f25]",
    cardStyle: { fontFamily: "var(--font-display)" }
  },
  {
    name: "Retro Valentine",
    bgClass: "bg-[#fff0f3] border-red-300 text-red-900",
    accentClass: "text-red-600 fill-red-100",
    ribbonClass: "bg-red-200",
    cardStyle: {}
  }
];

interface EditorPageProps {
  selectedTemplateId: string | null;
  onClearTemplate: () => void;
  uid: string | null;
  userName?: string;
  onNavigate: (view: string) => void;
}

export const EditorPage: React.FC<EditorPageProps> = ({
  selectedTemplateId,
  onClearTemplate,
  uid,
  userName,
  onNavigate
}) => {
  // Check if we are viewing a specific note from the URL
  const [recipientMode, setRecipientMode] = useState(false);
  const [activeNote, setActiveNote] = useState<CustomProposal | null>(null);

  // Editor states
  const [receiverName, setReceiverName] = useState("");
  const [senderName, setSenderName] = useState(userName || "");
  const [message, setMessage] = useState("Dearest,\n\nI think you are absolutely marvelous. Will you be my Valentine?");
  const [themeIndex, setThemeIndex] = useState(0);
  const [viralEffects, setViralEffects] = useState(true);
  const [isPrivate, setIsPrivate] = useState(true);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(selectedTemplateId);
  const [currentTemplateImageUrl, setCurrentTemplateImageUrl] = useState<string>("");

  // Helper to design an background tint overlay preserving legibility & aesthetics
  const getBackgroundStyle = (imageUrl: string | undefined, pThemeIndex: number) => {
    if (!imageUrl) {
      return LETTER_THEMES[pThemeIndex]?.cardStyle || {};
    }
    
    // Select custom transparent tints based on active letter themes
    let overlay = "rgba(255, 248, 247, 0.88)"; // default pink/red Coquette Satin
    if (pThemeIndex === 1) overlay = "rgba(250, 246, 235, 0.88)"; // typewriter warm vintage beige
    if (pThemeIndex === 2) overlay = "rgba(37, 30, 32, 0.90)"; // goth deep charcoal velvet
    if (pThemeIndex === 3) overlay = "rgba(255, 240, 243, 0.88)"; // retro valentine candy-pink

    return {
      ...(LETTER_THEMES[pThemeIndex]?.cardStyle || {}),
      backgroundImage: `linear-gradient(${overlay}, ${overlay}), url(${imageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat"
    };
  };

  // Result States
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Recipient interaction states
  const [yesClicked, setYesClicked] = useState(false);
  const [noHoverCount, setNoHoverCount] = useState(0);
  const [noPosition, setNoPosition] = useState({ x: 0, y: 0 });

  // Floating heart animations container
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; left: number; delay: number; scale: number }[]>([]);

  // Track the bounding container of the No button to avoid boundaries
  const containerRef = useRef<HTMLDivElement>(null);
  const noBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Check URL queries directly
    const urlParams = new URLSearchParams(window.location.search);
    const noteToken = urlParams.get("note") || urlParams.get("id");
    if (noteToken) {
      const loadNote = async () => {
        try {
          const decodedVal = await AppDatabase.getProposalById(noteToken);
          if (decodedVal) {
            setActiveNote(decodedVal);
            setRecipientMode(true);
            setThemeIndex(decodedVal.themeIndex);
            setViralEffects(decodedVal.viralEffects);
            // Increment view count
            await AppDatabase.triggerViewCount(decodedVal.id);
          }
        } catch (e) {
          console.error("Failed to load note:", e);
        }
      };
      loadNote();
    }
  }, []);

  // Sync templates if custom template index chosen
  useEffect(() => {
    if (selectedTemplateId) {
      setCurrentTemplateId(selectedTemplateId);
      const templates = AppDatabase.getTemplates();
      const match = templates.find(t => t.id === selectedTemplateId);
      if (match) {
        if (match.category === "Spooky") setThemeIndex(2); // Gothic
        else if (match.tag === "Trending") setThemeIndex(1); // Typewriter
        else setThemeIndex(0); // Standard Satin
        setMessage(`My sweetest love,\n\nYou capture my heart like a ${match.title}.\n\nWill you align your universe to mine?`);
        setCurrentTemplateImageUrl(match.imageUrl);
      }
    } else {
      setCurrentTemplateId(null);
      setCurrentTemplateImageUrl("");
    }
  }, [selectedTemplateId]);

  // Effect to continuously breed sparkles/hearts when Viral Effects is active
  useEffect(() => {
    if (viralEffects) {
      const interval = setInterval(() => {
        setFloatingHearts(prev => [
          ...prev.slice(-20),
          {
            id: Date.now() + Math.random(),
            left: Math.random() * 95,
            delay: Math.random() * 2,
            scale: 0.5 + Math.random() * 1.2
          }
        ]);
      }, yesClicked ? 150 : 800);
      return () => clearInterval(interval);
    }
  }, [viralEffects, yesClicked]);

  // Handle Playful NO evasion mechanics!
  // Relative placement change on hover within the card
  const handleNoButtonEvade = () => {
    if (!containerRef.current) return;
    setNoHoverCount(prev => prev + 1);

    const containerRect = containerRef.current.getBoundingClientRect();
    // Generate randomized position coordinates within safe relative bounds
    // Keep width and boundaries optimized for mobile view widths
    const maxRelX = containerRect.width - (noBtnRef.current?.getBoundingClientRect().width || 100) - 20;
    const maxRelY = containerRect.height - (noBtnRef.current?.getBoundingClientRect().height || 50) - 100;

    const randomX = Math.max(10, Math.random() * maxRelX - (containerRect.width / 4));
    const randomY = Math.max(10, Math.random() * maxRelY - (containerRect.height / 4));

    setNoPosition({
      x: randomX,
      y: randomY
    });

    if (viralEffects) {
      // Small sparkle notification trigger on target evasion
      AppDatabase.addNotification({
        id: "evade-" + Date.now(),
        title: "Evaded cursor!",
        message: `Recipient successfully hovered 'No' ${noHoverCount + 1} times, evading rejection!`,
        type: "system",
        isRead: false,
        createdAt: new Date().toISOString()
      }, activeNote?.authorId);
    }
  };

  const handleInputSanitize = (val: string) => {
    // Regex filtering allowed character blocks to shield inputs
    return val.replace(/[<>'"\\/]/g, "");
  };

  const handleGenerateLink = async () => {
    const cleanReceiver = handleInputSanitize(receiverName).trim() || "My Dearest Muse";
    const cleanSender = handleInputSanitize(senderName).trim() || "Secret Lover";

    if (!cleanReceiver || !cleanSender) return;

    setErrorMessage("");
    const mockId = "prop-" + Date.now();
    const proposalData: CustomProposal = {
      id: mockId,
      receiverName: cleanReceiver,
      senderName: cleanSender,
      message: message,
      themeIndex: themeIndex,
      viralEffects: viralEffects,
      yesClicked: false,
      noAttempts: 0,
      isPrivate: isPrivate,
      likesList: [],
      likesCount: 0,
      viewsCount: 1,
      authorId: uid,
      authorName: cleanSender,
      createdAt: new Date().toISOString(),
      templateId: currentTemplateId || undefined,
      templateImageUrl: currentTemplateImageUrl || undefined
    };

    try {
      // Save to transparent database layer
      await AppDatabase.saveProposal(proposalData);
    } catch (e) {
      console.warn("Firestore sync failed, generating offline-safe self-contained secure link instead:", e);
      // Let the user know, but don't block them!
      setErrorMessage("Letter saved locally and sealed inside your share link (Real-time database sync was bypassed).");
    }

    try {
      // Generate secure cryptographically obfuscated link
      const secureShareUrl = generateSecureLink(proposalData);
      setGeneratedLink(secureShareUrl);
      setDraftSaved(true);
      setShowShareModal(true);
    } catch (e) {
      console.error("Failed to generate link:", e);
      setErrorMessage("Could not generate secure link: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentTheme = LETTER_THEMES[themeIndex];

  // Recipient positive affirmation trigger
  const handleRecipientYes = async () => {
    setYesClicked(true);
    if (activeNote) {
      const updatedNote = { ...activeNote, yesClicked: true, noAttempts: noHoverCount };
      try {
        await AppDatabase.saveProposal(updatedNote);
        await AppDatabase.addNotification({
          id: "deal-" + Date.now(),
          title: "Proposal Sealed!",
          message: `${updatedNote.receiverName} said YES to ${updatedNote.senderName}!`,
          type: "seal",
          isRead: false,
          createdAt: new Date().toISOString()
        }, updatedNote.authorId);
      } catch (e) {
        console.error("Failed to complete seal action:", e);
      }
    }
  };

  return (
    <div className="w-full min-h-screen pb-20 px-4 md:px-8 relative overflow-hidden" ref={containerRef}>
      {/* Falling hearts backdrop when enabled */}
      <AnimatePresence>
        {viralEffects && (
          <div className="absolute inset-0 pointer-events-none z-0">
            {floatingHearts.map((heart) => (
              <motion.div
                key={heart.id}
                initial={{ opacity: 0.8, y: "110vh", x: 0 }}
                animate={{ opacity: 0, y: "-10vh", x: Math.sin(heart.id) * 40 }}
                exit={{ opacity: 0 }}
                transition={{ duration: yesClicked ? 2 : 4.5, delay: heart.delay, ease: "linear" }}
                className="absolute text-secondary/40 select-none"
                style={{
                  left: `${heart.left}%`,
                  transform: `scale(${heart.scale})`
                }}
              >
                <Heart size={yesClicked ? 28 : 18} fill="currentColor" />
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto z-10 relative">
        {/* Recipient Mode / Presentation Layout */}
        {recipientMode ? (
          <div className="flex flex-col items-center justify-center min-h-[75vh]">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`w-full max-w-2xl rounded-3xl border shadow-2xl p-10 md:p-14 transition duration-500 relative ${currentTheme.bgClass}`}
              style={getBackgroundStyle(activeNote?.templateImageUrl, themeIndex)}
            >
              {/* Top vintage ribbon bookmark */}
              <div className={`absolute top-0 right-10 w-8 h-16 rounded-b-md ${currentTheme.ribbonClass} flex items-center justify-center text-secondary border-b border-r border-l border-primary/5 shadow-xs`}>
                <Heart size={14} fill="currentColor" />
              </div>

              {yesClicked ? (
                <div className="text-center py-8 flex flex-col items-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ duration: 0.6 }}
                    className="w-20 h-20 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center mb-6 shadow-md"
                  >
                    <Heart size={44} fill="currentColor" className="animate-pulse" />
                  </motion.div>
                  <h2 className="font-display text-3xl md:text-5xl font-extrabold text-secondary italic mb-4">
                    It&apos;s Sealed! 🌹
                  </h2>
                  <p className="text-sm md:text-base font-light opacity-90 max-w-md leading-relaxed">
                    Dearest {activeNote?.receiverName || "Lovely"}, your affirmation of &quot;YES&quot; has been logged into the record vaults. {activeNote?.senderName || "Your Admirer"} has been notified of your tender bond.
                  </p>
                  
                  <button
                    onClick={() => {
                      // Redirect back or let them clear view
                      window.history.pushState({}, "", window.location.pathname);
                      setRecipientMode(false);
                      setActiveNote(null);
                      setYesClicked(false);
                    }}
                    className="mt-8 px-6 py-2.5 rounded-xl border border-primary/20 text-xs font-semibold hover:bg-white/20 transition cursor-pointer"
                  >
                    Create Your Own Card
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#bb0026]/85">Incoming Confession</span>
                    <h3 className="font-display font-medium text-xl opacity-75">
                      To: <span className="font-extrabold italic underline decoration-wavy text-secondary">{activeNote?.receiverName}</span>
                    </h3>
                  </div>

                  <p className="whitespace-pre-line leading-relaxed pb-6 text-sm sm:text-base border-b border-primary/10">
                    {activeNote?.message}
                  </p>

                  <div className="flex flex-col items-end pt-4">
                    <span className="text-xs opacity-70">Forever Yours,</span>
                    <span className="font-display font-bold text-lg text-secondary italic">
                      — {activeNote?.senderName}
                    </span>
                  </div>

                  {/* Yes and No buttons, where NO evade cursor */}
                  <div className="pt-10 flex flex-col items-center justify-center relative min-h-[120px] gap-4 w-full">
                    <button
                      onClick={handleRecipientYes}
                      className="px-10 py-4 rounded-xl bg-secondary hover:bg-secondary-container text-on-secondary hover:text-on-secondary-container text-sm font-bold tracking-widest uppercase transition duration-300 shadow-md cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
                      id="recipient-yes-btn"
                    >
                      🌹 YES, I DO!
                    </button>

                    {/* Evading NO button */}
                    <button
                      ref={noBtnRef}
                      onMouseEnter={handleNoButtonEvade}
                      onTouchStart={handleNoButtonEvade}
                      onClick={handleNoButtonEvade}
                      className="px-6 py-2 rounded-lg border border-primary/25 text-xs font-medium cursor-pointer transition-all duration-300 absolute ease-out"
                      style={{
                        transform: `translate(${noPosition.x}px, ${noPosition.y}px)`,
                        zIndex: 20
                      }}
                      id="recipient-no-btn"
                    >
                      No
                    </button>
                  </div>
                  
                  {noHoverCount > 0 && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-[10px] opacity-60 font-mono italic">
                      No attempted evasions: {noHoverCount} times... Rejection is not a valid terminal option!
                    </motion.p>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Editor Input Controls */}
            <div className="lg:col-span-5 bg-surface-container-lowest border border-primary/10 rounded-2xl p-6 md:p-8 space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-on-surface">Letter Sculpting Desk</h2>
                <p className="text-xs text-on-surface-variant font-light mt-1">
                  Draft elegant keepsakes, select styles, and generate secure keys.
                </p>
              </div>

              {currentTemplateId && currentTemplateImageUrl && (
                <div className="flex items-center justify-between p-3.5 bg-secondary/10 rounded-xl border border-secondary/20">
                  <div className="flex items-center gap-3">
                    <img 
                      src={currentTemplateImageUrl} 
                      alt="Template background thumbnail" 
                      className="w-10 h-10 rounded-lg object-cover border border-secondary/30"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-secondary">Active Photo backdrop</h4>
                      <p className="text-[9px] text-on-surface-variant">The photo will appear behind the letter</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClearTemplate();
                      setCurrentTemplateId(null);
                      setCurrentTemplateImageUrl("");
                    }}
                    className="p-1 px-2.5 text-[9px] font-bold bg-[#bb0026] hover:bg-[#a00020] text-white rounded-md transition cursor-pointer"
                  >
                    Clear Template
                  </button>
                </div>
              )}

              <div className="space-y-4">
                {/* Receiver name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">To (Recipient Name)</label>
                  <input
                    type="text"
                    maxLength={32}
                    value={receiverName}
                    onChange={(e) => setReceiverName(handleInputSanitize(e.target.value))}
                    placeholder="Anastasia Romanova"
                    className="w-full px-4 py-3 bg-surface-container rounded-xl border border-primary/5 text-xs text-on-surface focus:border-secondary focus:outline-hidden transition"
                  />
                </div>

                {/* Sender Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">From (Sender Name)</label>
                  <input
                    type="text"
                    maxLength={32}
                    value={senderName}
                    onChange={(e) => setSenderName(handleInputSanitize(e.target.value))}
                    placeholder="Your Secret Admirer"
                    className="w-full px-4 py-3 bg-surface-container rounded-xl border border-primary/5 text-xs text-on-surface focus:border-secondary focus:outline-hidden transition"
                  />
                </div>

                {/* Message block */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Confession Message</label>
                  <textarea
                    rows={4}
                    maxLength={250}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Your deepest words..."
                    className="w-full px-4 py-3 bg-surface-container rounded-xl border border-primary/5 text-xs text-on-surface focus:border-secondary focus:outline-hidden transition resize-none leading-relaxed"
                  />
                  <div className="flex justify-between items-center text-[10px] text-on-surface-variant font-mono">
                    <span>Character Limit: {message.length}/250</span>
                  </div>
                </div>

                {/* Theme Selector */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block">Aesthetic Preset</label>
                  <div className="grid grid-cols-2 gap-2">
                    {LETTER_THEMES.map((theme, idx) => (
                      <button
                        key={theme.name}
                        onClick={() => setThemeIndex(idx)}
                        className={`py-2 px-3 text-left rounded-xl text-xs border transition ${
                          themeIndex === idx ? "border-secondary bg-primary-fixed text-on-primary-fixed" : "border-primary/5 bg-surface-container hover:bg-surface-container-high"
                        }`}
                      >
                        <span className="font-medium text-[11px]">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Viral Effects Toggles */}
                <div className="flex items-center justify-between p-3.5 bg-surface-container rounded-xl border border-primary/5">
                  <div>
                    <h4 className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                      <Sparkles size={14} className="text-secondary" />
                      Viral Visual Effects
                    </h4>
                    <p className="text-[10px] text-on-surface-variant font-light">Spawns cascade hearts and sparkle loops</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={viralEffects}
                    onChange={(e) => setViralEffects(e.target.checked)}
                    className="w-4 h-4 accent-secondary rounded"
                  />
                </div>

                {/* Privacy Toggle */}
                <div className="flex items-center justify-between p-3.5 bg-surface-container rounded-xl border border-primary/5">
                  <div>
                    <h4 className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                      {isPrivate ? <Lock size={14} className="text-secondary" /> : <Globe size={14} className="text-secondary" />}
                      Confession Visibility
                    </h4>
                    <p className="text-[10px] text-on-surface-variant font-light">Public boards encourage reach likeness</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={!isPrivate}
                    onChange={(e) => setIsPrivate(!e.target.checked)}
                    className="w-4 h-4 accent-secondary rounded"
                  />
                </div>

                {/* Submit Action */}
                <button
                  onClick={handleGenerateLink}
                  className="w-full py-4 mt-2 bg-secondary hover:bg-secondary-container text-on-secondary hover:text-on-secondary-container rounded-xl font-bold tracking-wider text-xs uppercase shadow-xs flex items-center justify-center gap-2 cursor-pointer transition duration-300"
                  id="generate-link-btn"
                >
                  <Share2 size={16} /> Seal & Generate Secured Link
                </button>
              </div>
            </div>

            {/* Live Interactive Preview */}
            <div className="lg:col-span-7 space-y-6">
              <span className="text-xs uppercase font-bold tracking-widest text-[#bb0026]/85 block select-none">Live Canvas Preview</span>
              <div
                className={`w-full rounded-2xl border p-8 md:p-12 relative flex flex-col justify-between shadow-lg transition-transform duration-300 min-h-[400px] ${currentTheme.bgClass}`}
                style={getBackgroundStyle(currentTemplateImageUrl, themeIndex)}
              >
                {/* Stamp/Ribbon details */}
                <div className={`absolute top-0 right-8 w-6 h-12 rounded-b-md ${currentTheme.ribbonClass} flex items-center justify-center text-secondary border border-t-0 border-primary/5 shadow-2xs`}>
                  <Heart size={12} fill="currentColor" />
                </div>

                <div className="space-y-4">
                  <div className="pb-1">
                    <span className="text-[10px] opacity-80 uppercase tracking-widest">Confession Receipt</span>
                    <h3 className="font-display font-medium text-lg text-on-surface/90">
                      To: <span className="font-bold underline text-secondary">{receiverName || "Anastasia Romanova"}</span>
                    </h3>
                  </div>

                  <p className="whitespace-pre-line text-sm leading-relaxed border-b border-primary/10 pb-6 min-h-[140px]">
                    {message}
                  </p>
                </div>

                <div className="flex flex-col items-end pt-4">
                  <span className="text-xs opacity-75">Lovingly Yours,</span>
                  <span className="font-display font-bold text-base text-secondary italic">
                    — {senderName || "Your Secret Admirer"}
                  </span>
                </div>
              </div>

              {/* Error or warning notices */}
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-orange-50 border border-orange-200 text-orange-950 rounded-xl text-xs flex items-start gap-2.5 shadow-2xs"
                >
                  <span className="font-bold text-orange-850">📝 Note:</span>
                  <p className="font-light">{errorMessage}</p>
                </motion.div>
              )}

              {/* Secure Link Modal/Card */}
              {draftSaved && generatedLink && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-[#ffeed0] border border-orange-200 rounded-2xl flex flex-col gap-4 shadow-sm"
                >
                  <div>
                    <h3 className="font-display font-bold text-orange-950 text-sm flex items-center gap-2">
                      <Sparkles size={16} className="text-amber-600" /> Secure Link Sealed Successfully!
                    </h3>
                    <p className="text-xs text-orange-900/80 font-light mt-1">
                      Share this unique encrypted token URL with your Muse. It bypasses conventional logs to guarantee maximum coquette privacy.
                    </p>
                  </div>

                  <div className="flex gap-2 bg-white/70 p-2.5 rounded-xl border border-orange-200/50 items-center justify-between">
                    <span className="text-xs text-orange-950 truncate max-w-sm md:max-w-lg font-mono tracking-tight select-all">
                      {generatedLink}
                    </span>
                    <button
                      onClick={handleCopyLink}
                      className="px-4 py-2 rounded-lg bg-orange-950 hover:bg-orange-900 text-white font-semibold text-xs transition shrink-0 flex items-center gap-1.5 cursor-pointer"
                    >
                      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Instagram-style Share Sheet Popup Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setShowShareModal(false)}
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="w-full max-w-sm bg-[#fffdfa] border border-[#f0e1d2] rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col font-sans"
            >
              {/* Header with Close */}
              <div className="p-4 border-b border-[#eadecc]/40 flex items-center justify-between bg-[#fffcf5]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#fde8e9] flex items-center justify-center text-[#bb0026]">
                    <Heart size={15} fill="currentColor" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-[#2b201d]">Share Confession</h3>
                    <p className="text-[10px] text-neutral-500 font-light">Choose how to deliver your love letter</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="p-1.5 rounded-full hover:bg-neutral-200/50 text-[#80706a] cursor-pointer transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Share Options Grid */}
              <div className="p-5 space-y-4">
                {/* Apps Grid */}
                <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block mb-3">Send directly to other apps</span>
                  <div className="grid grid-cols-4 gap-3 text-center">
                    {/* WhatsApp */}
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                        `My sweetest love, I left you a confidential confession letter. See it here 🌹: ${generatedLink}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1.5 group cursor-pointer"
                    >
                      <div className="w-11 h-11 rounded-full bg-[#eafaf1] text-[#2ebd59] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform animate-none">
                        <MessageCircle size={20} fill="currentColor" className="text-[#2ebd59]" />
                      </div>
                      <span className="text-[10px] font-medium text-neutral-700">WhatsApp</span>
                    </a>

                    {/* Instagram DM Explanation */}
                    <button
                      onClick={() => {
                        handleCopyLink();
                        alert("Confession link copied to clipboard!\n\nOpen Instagram DMs or stories and paste the copied link to surprise them 💖");
                      }}
                      className="flex flex-col items-center gap-1.5 group cursor-pointer border-none bg-transparent outline-none"
                    >
                      <div className="w-11 h-11 rounded-full bg-[#fdf2f8] text-[#db2777] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                        <Instagram size={20} className="text-[#db2777]" />
                      </div>
                      <span className="text-[10px] font-medium text-neutral-700">Insta DM</span>
                    </button>

                    {/* Telegram */}
                    <a
                      href={`https://telegram.me/share/url?url=${encodeURIComponent(generatedLink)}&text=${encodeURIComponent(
                        "I left you a secret confession letter, please seal your reply 💌"
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1.5 group cursor-pointer"
                    >
                      <div className="w-11 h-11 rounded-full bg-[#f0f9ff] text-[#0284c7] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                        <Send size={18} className="text-[#0284c7] translate-x-[-1px] translate-y-[1px]" />
                      </div>
                      <span className="text-[10px] font-medium text-neutral-700">Telegram</span>
                    </a>

                    {/* SMS */}
                    <a
                      href={`sms:?&body=${encodeURIComponent(
                        `I left you a confidential confession letter. Open it here 💝: ${generatedLink}`
                      )}`}
                      className="flex flex-col items-center gap-1.5 group cursor-pointer"
                    >
                      <div className="w-11 h-11 rounded-full bg-[#faf5ff] text-[#9333ea] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                        <Smartphone size={18} className="text-[#9333ea]" />
                      </div>
                      <span className="text-[10px] font-medium text-neutral-700">SMS Text</span>
                    </a>
                  </div>
                </div>

                {/* Copy Link Section (Instagram Style) */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">Copy shareable link</span>
                  <div className="flex gap-2 bg-[#fcf9f5] p-2 border border-[#f0e1d2] rounded-xl items-center justify-between">
                    <span className="text-[11px] text-neutral-700 truncate max-w-[200px] select-all px-1 tracking-tight font-mono">
                      {generatedLink}
                    </span>
                    <button
                      onClick={handleCopyLink}
                      className="px-3.5 py-1.5 rounded-lg bg-[#bb0026] hover:bg-[#a00020] text-white font-bold text-[10px] tracking-wider uppercase transition shrink-0 flex items-center gap-1 cursor-pointer border-none"
                    >
                      {copied ? <Check size={11} className="text-green-300" /> : <Copy size={11} />} {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* System Dialog button if supported */}
                {typeof navigator !== "undefined" && navigator.share && (
                  <button
                    onClick={async () => {
                      try {
                        await navigator.share({
                          title: "Confession Letter",
                          text: `I left you a beautiful confidential confession letter. Open it here 🌹:`,
                          url: generatedLink
                        });
                      } catch (err) {
                        console.log("System share failed or dismissed", err);
                      }
                    }}
                    className="w-full py-2.5 px-4 rounded-xl border border-dashed border-[#d8c5b2] hover:bg-neutral-50 text-neutral-600 text-[11px] font-medium flex items-center justify-center gap-2 cursor-pointer transition"
                  >
                    <Share2 size={12} /> Open Native System Share
                  </button>
                )}

                {/* Stamp detail */}
                <div className="pt-2 border-t border-neutral-100 text-center text-rose-800/50 text-[10px] tracking-wide italic">
                  Sealed with Coquette Heart Encryption &bull; Private
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
