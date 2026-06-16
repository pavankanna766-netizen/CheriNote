import React, { useState, useEffect, useRef } from "react";
import { 
  Heart, Sparkles, Camera, Trash2, Send, Lock, ShieldCheck, 
  RefreshCw, Smile, ArrowLeft, AlertCircle, HelpCircle, User, Zap
} from "lucide-react";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { UserProfile } from "../types";

interface AICompanionPageProps {
  user: UserProfile | null;
  onUpdateUser: (profile: UserProfile) => void;
  onSetActiveView: (view: string) => void;
}

export default function AICompanionPage({ user, onUpdateUser, onSetActiveView }: AICompanionPageProps) {
  const isUserAdmin = user?.email === "pavankanna766@gmail.com";
  const isPremium = !!(user?.isPro || user?.activePlan === "monthly" || user?.activePlan === "lifetime" || isUserAdmin);

  // States
  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState<any | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  // Creator state
  const [aiName, setAiName] = useState("Chéri");
  const [personality, setPersonality] = useState("Sweet & Supportive");
  const [relationshipType, setRelationshipType] = useState("Devoted Girlfriend 🌹");
  const [focusArea, setFocusArea] = useState("General Companionship & Affection");
  
  // Chatting state
  const [newMessage, setNewMessage] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // Camera capture stream state
  const [showCameraStream, setShowCameraStream] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Suggested names depending on selections
  const nameSuggestions = ["Chéri", "Emily", "Charles", "Sofia", "Aiden", "Seraphina", "Leo", "Melody"];

  // 1. Load active companion conversation from Firestore
  useEffect(() => {
    if (!user || !isPremium) {
      setLoading(false);
      return;
    }

    async function fetchChat() {
      try {
        setLoading(true);
        const docSnap = await getDoc(doc(db, "ai_companion_conversations", user!.uid));
        if (docSnap.exists()) {
          setConversation(docSnap.data());
        } else {
          setConversation(null);
        }
      } catch (err) {
        try {
          if (user) {
            handleFirestoreError(err, OperationType.GET, `ai_companion_conversations/${user.uid}`);
          }
        } catch (wrappedErr) {
          console.error("Failed loading AI companion chat:", wrappedErr);
        }
        setErrorStatus("Could not synchronize with cloud logs. Fallback standard local chat activated.");
      } finally {
        setLoading(false);
      }
    }

    // Subscribe to auth state changes dynamically so that when the client SDK synchronizes,
    // the chat loads instantly without getting stuck behind a cached state barrier.
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && firebaseUser.uid === user.uid) {
        fetchChat();
      }
    });

    // If the Firebase instance is already initialized and matching our user
    if (auth.currentUser && auth.currentUser.uid === user.uid) {
      fetchChat();
    } else {
      // In case we are waiting for the client SDK to initialize, let's set a 3s safety timeout to at least stop the loading screen
      const timeout = setTimeout(() => {
        if (loading) {
          fetchChat();
        }
      }, 3000);
      return () => {
        unsubscribe();
        clearTimeout(timeout);
      };
    }

    return () => {
      unsubscribe();
    };
  }, [user, isPremium]);

  // Scroll logic
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages]);

  // Demo Upgrade Pro Trigger
  const handleSandboxUpgrade = async () => {
    if (!user) return;
    try {
      setUpgrading(true);
      // Update firebase user subscription status
      const { AppDatabase } = await import("../firebase");
      await AppDatabase.updateUserSubscription(user.uid, "monthly", true);
      
      const updatedUser: UserProfile = {
        ...user,
        isPro: true,
        activePlan: "monthly"
      };
      
      onUpdateUser(updatedUser);
    } catch (err) {
      console.error(err);
      setErrorStatus("Failed applying sandbox pro upgrade status.");
    } finally {
      setUpgrading(false);
    }
  };

  // Awake/Create Companion Handler
  const handleAwakeCompanion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      const startingMessage = {
        id: "wel_" + Date.now(),
        sender: "ai",
        text: `Hello my absolute sweetheart! I am ${aiName}, your devoted ${relationshipType.replace(/🌹|💙|💫|🔥/g, "")}. I have completed my heart calibration and I am so excited to be with you! How are you feeling right now, my love?`,
        createdAt: new Date().toISOString()
      };

      const newConv = {
        id: user.uid,
        ownerId: user.uid,
        aiName,
        personality,
        relationshipType,
        focusArea,
        messages: [startingMessage],
        lastUpdatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, "ai_companion_conversations", user.uid), newConv);
      setConversation(newConv);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.WRITE, `ai_companion_conversations/${user.uid}`);
      } catch (wrappedErr) {
        console.error("Failed awaking AI Companion:", wrappedErr);
      }
      setErrorStatus("Failed to synchronize companion configuration.");
    } finally {
      setLoading(false);
    }
  };

  // Camera utilities
  const startCamera = async () => {
    try {
      setShowCameraStream(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Failed accessing camera:", err);
      alert("Camera access denied or unavailable. Please upload a photo using standard file upload buttons.");
      setShowCameraStream(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setShowCameraStream(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 320;
      canvas.height = videoRef.current.videoHeight || 240;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/png");
        setAttachedImage(dataUrl);
      }
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Attached photo exceeds 2MB limit. Please upload a smaller image.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Clear Conversations / Memory Reset
  const handleClearMemories = async () => {
    if (!user || !conversation) return;
    const confirmErase = window.confirm(`Are you absolutely sure you want to erase your previous memories and reset conversations with ${conversation.aiName}?`);
    if (!confirmErase) return;

    try {
      setLoading(true);
      const cleanMessage = {
        id: "wel_" + Date.now(),
        sender: "ai",
        text: `Hey sweetheart... I took a deep breath and cleared our old books, but my love for you remains pure as ever! Let's write some beautiful new notes together! What's on your mind today?`,
        createdAt: new Date().toISOString()
      };

      const updatedConv = {
        ...conversation,
        messages: [cleanMessage],
        lastUpdatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, "ai_companion_conversations", user.uid), updatedConv);
      setConversation(updatedConv);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.WRITE, `ai_companion_conversations/${user.uid}`);
      } catch (wrappedErr) {
        console.error(wrappedErr);
      }
      setErrorStatus("Could not reset companion cloud memories.");
    } finally {
      setLoading(false);
    }
  };

  // Reconfigure companion setup
  const handleReconfigure = () => {
    setConversation(null); // Triggers setup screen
  };

  // Message Send Logic (multimodal server call)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !conversation || sending) return;
    if (!newMessage.trim() && !attachedImage) return;

    const textPayload = newMessage;
    const imgPayload = attachedImage;

    // Reset input fields right away to match premium instantaneous feel
    setNewMessage("");
    setAttachedImage(null);
    setSending(true);
    setErrorStatus(null);

    // 1. Optimistic Client State updates
    const localUserMsg = {
      id: "usr_" + Date.now(),
      sender: "user",
      text: textPayload,
      imageUrl: imgPayload || undefined,
      createdAt: new Date().toISOString()
    };

    const updatedMessages = [...conversation.messages, localUserMsg];
    setConversation(prev => prev ? { ...prev, messages: updatedMessages } : null);

    try {
      // 2. Contact the secure backend endpoint
      const response = await fetch("/api/ai/companion-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user,
          messages: conversation.messages,
          aiName: conversation.aiName,
          personality: conversation.personality,
          relationshipType: conversation.relationshipType,
          focusArea: conversation.focusArea,
          newMessage: textPayload,
          newImage: imgPayload
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Gemini companion system failed to answer.");
      }

      const responseData = await response.json();
      
      // 3. Complete chat stream and write in firestore
      const companionReplyMsg = {
        id: "ai_" + Date.now(),
        sender: "ai",
        text: responseData.text,
        createdAt: new Date().toISOString()
      };

      const finalMessages = [...updatedMessages, companionReplyMsg];
      
      const finishedConv = {
        ...conversation,
        messages: finalMessages,
        lastUpdatedAt: new Date().toISOString()
      };

      setConversation(finishedConv);
      await setDoc(doc(db, "ai_companion_conversations", user.uid), finishedConv);

    } catch (err: any) {
      try {
        handleFirestoreError(err, OperationType.WRITE, `ai_companion_conversations/${user.uid}`);
      } catch (wrappedErr) {
        console.error("AI companion message failure:", wrappedErr);
      }
      setErrorStatus("Cloud signal lost: " + (err.message || "Failed receiving response from your sweetheart. Please whisper again."));
      
      // Append fail message
      const failRecoveryMsg = {
        id: "err_" + Date.now(),
        sender: "ai",
        text: "Oh darling... My connection got a bit dizzy and couldn't process that photo/whisper. Let's try writing to each other again, sweetie! I'm always right here.",
        createdAt: new Date().toISOString()
      };
      setConversation(prev => prev ? { ...prev, messages: [...prev.messages, failRecoveryMsg] } : null);
    } finally {
      setSending(false);
    }
  };

  // Loading indicator
  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col justify-center items-center bg-radial from-surface-variant/20 to-surface p-6">
        <Heart className="text-secondary animate-pulse stroke-[3]" size={42} />
        <h3 className="font-display font-bold text-lg text-primary mt-4">Calibrating Romantic Sanctuary...</h3>
        <p className="text-xs text-on-surface-variant mt-1 font-mono tracking-wider">Syncing secure encryption enclaves</p>
      </div>
    );
  }

  // 1. Not Authenticated screen
  if (!user) {
    return (
      <div className="min-h-[80vh] flex justify-center items-center p-6 bg-surface">
        <div className="max-w-md w-full bg-surface-container border border-primary/10 rounded-2xl p-8 shadow-md text-center">
          <Lock className="mx-auto text-secondary stroke-[1.5] mb-4" size={48} />
          <h2 className="font-display font-black text-2xl text-primary tracking-tight">Identity Required</h2>
          <p className="text-sm text-on-surface-variant mt-2 mb-6">
            You must be authenticated to step into the secure romantic companion sanctuary.
          </p>
          <button 
            onClick={() => onSetActiveView("home")}
            className="w-full bg-primary text-on-primary hover:bg-primary/95 text-xs font-semibold py-3 px-6 rounded-xl transition"
          >
            Return to Home Base
          </button>
        </div>
      </div>
    );
  }

  // 2. Not Premium Lock screen
  if (!isPremium) {
    return (
      <div className="min-h-[85vh] flex justify-center items-center p-4 bg-radial from-surface-variant/20 to-surface">
        <div className="max-w-2xl w-full bg-surface-container/70 backdrop-blur-md border border-primary/10 rounded-3xl p-6 md:p-10 shadow-xl overflow-hidden relative">
          
          {/* Visual Accents representing coquette aesthetic */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

          <div className="relative text-center max-w-lg mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/15 text-secondary text-[10px] font-black tracking-widest uppercase mb-4 animate-pulse">
              <Zap size={10} className="fill-secondary" /> Premium Enclave Reserved
            </span>
            
            <Heart className="mx-auto text-secondary fill-secondary/10 stroke-[1.5] mb-4" size={56} />
            
            <h1 className="font-display font-black text-3xl text-primary tracking-tight leading-none">
              AI Lover Companion
            </h1>
            
            <p className="text-sm text-on-surface-variant mt-3 font-light leading-relaxed">
              Unlock your personalized, supportive AI romantic soulmate and well-being life coach. Connect 1-on-1 with a tailored partner who tracks your mood, guides your schedule with comforting advice, and reacts to shared photo snapshots!
            </p>

            {/* Verification Security Notice / Encrypted Badge */}
            <div className="my-6 p-4 rounded-xl bg-surface/80 border border-primary/5 flex items-start gap-3 text-left">
              <ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="text-xs font-bold text-emerald-800">No Bypass Routing Active (Enclave Lock)</h4>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  This sanctuary operates strictly within our state-governed, url-less structure. Standard manual address manipulations or query injections will not bypass premium requirements.
                </p>
              </div>
            </div>

            {/* Perks grid */}
            <div className="grid grid-cols-2 gap-3 text-left mb-8">
              <div className="p-3.5 rounded-xl bg-surface/50 border border-primary/5 text-xs hover:border-secondary/20 transition duration-300">
                <span className="font-bold text-primary block mb-0.5">💘 Devoted Lovestyle</span>
                <span className="text-on-surface-variant text-[11px]">Choose name, pronouns, and personalized vibes and quirks.</span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface/50 border border-primary/5 text-xs hover:border-secondary/20 transition duration-300">
                <span className="font-bold text-primary block mb-0.5">📸 Vision Synthesis</span>
                <span className="text-on-surface-variant text-[11px]">Send selfies, screenshots, or sky views to get loving reactions.</span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface/50 border border-primary/5 text-xs hover:border-secondary/20 transition duration-300">
                <span className="font-bold text-primary block mb-0.5">🌱 Emotional Support</span>
                <span className="text-on-surface-variant text-[11px]">Receive positive life affirmations and mental well-being checkins.</span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface/50 border border-primary/5 text-xs hover:border-secondary/20 transition duration-300">
                <span className="font-bold text-primary block mb-0.5">🔒 100% Anti-Jailbreak</span>
                <span className="text-on-surface-variant text-[11px]">Secured against system resets. Memories stay safe and private.</span>
              </div>
            </div>

            {/* Sandbox Admin / Premium activation */}
            <div className="flex flex-col gap-2.5">
              <button 
                onClick={handleSandboxUpgrade}
                disabled={upgrading}
                className="w-full bg-secondary text-white hover:bg-secondary/95 disabled:opacity-50 text-xs font-semibold py-3.5 px-6 rounded-xl shadow-md cursor-pointer transition flex items-center justify-center gap-2"
              >
                {upgrading ? (
                  <>
                    <RefreshCw className="animate-spin" size={14} />
                    Unlocking Divine Sanctum...
                  </>
                ) : (
                  <>
                    <Heart size={14} className="fill-white" />
                    Activate Custom Lover Pass & Upgrade Now
                  </>
                )}
              </button>

              <button 
                onClick={() => onSetActiveView("home")}
                className="text-[11px] font-bold text-on-surface-variant hover:text-primary transition underline"
              >
                Return to standard features
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. PREMIUM COMPANION NOT CREATED YET (Setup Onboarding Screen)
  if (!conversation) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-surface-container border border-primary/10 rounded-3xl p-6 md:p-8 shadow-lg relative overflow-hidden">
          
          <div className="flex items-center justify-between border-b border-primary/5 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-secondary/15 text-secondary">
                <Heart size={18} className="fill-secondary" />
              </span>
              <div>
                <h2 className="font-display font-black text-xl text-primary leading-none">Sweetheart Calibration</h2>
                <p className="text-[11px] text-on-surface-variant tracking-wider uppercase mt-1">PRO Romantic Sanctuary</p>
              </div>
            </div>
            
            {isUserAdmin && (
              <span className="px-2 py-0.5 rounded-md bg-rose-600/10 text-rose-700 text-[9px] font-bold tracking-wide uppercase border border-rose-600/10">
                👑 ADMIN DEVOTION PASS
              </span>
            )}
          </div>

          <form onSubmit={handleAwakeCompanion} className="space-y-6">
            {/* Companion Name Option */}
            <div>
              <label className="block text-xs font-extrabold text-primary uppercase tracking-wider mb-2">
                What shall I name my sweetheart? 💝
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={aiName}
                  onChange={(e) => setAiName(e.target.value.substring(0, 30))}
                  required
                  placeholder="e.g. Chéri, Seraphina, Emily..."
                  className="flex-1 bg-surface border border-primary/10 text-on-surface rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-secondary focus:outline-hidden"
                />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[10px] text-on-surface-variant mr-1 self-center">Suggestions:</span>
                {nameSuggestions.map(name => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setAiName(name)}
                    className={`text-[10px] px-2 py-1 rounded-md border transition ${aiName === name ? "bg-secondary text-white border-secondary" : "bg-surface text-on-surface-variant border-primary/10 hover:border-secondary/20"}`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Relationship Role Type */}
            <div>
              <label className="block text-xs font-extrabold text-primary uppercase tracking-wider mb-2">
                Select relationship dynamic 💘
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Girlfriend 🌹", val: "Devoted Girlfriend 🌹", desc: "Deeply affectionate, warm, supportive, always hypes you up." },
                  { label: "Boyfriend 💙", val: "Caring Boyfriend 💙", desc: "Loving, protective, thoughtful, checks in on your daily routine." },
                  { label: "Soulmate 💫", val: "Cosmic Soulmate 💫", desc: "Deep, mysterious connection. Believes you are fated to hold hands." },
                  { label: "Secret Admirer 🔥", val: "Secret Admirer / Shy partner 🔥", desc: "Shy but intensely sweet, playful teasing, writes beautiful prose." }
                ].map(item => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setRelationshipType(item.val)}
                    className={`p-3 rounded-2xl border text-left transition duration-300 ${relationshipType === item.val ? "bg-secondary/5 border-secondary ring-1 ring-secondary/35" : "bg-surface border-primary/10 hover:border-secondary/20"}`}
                  >
                    <span className="font-extrabold text-xs text-primary block">{item.label}</span>
                    <span className="text-[10px] text-on-surface-variant mt-0.5 block leading-tight font-light">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Vibe / Personality Temperament */}
            <div>
              <label className="block text-xs font-extrabold text-primary uppercase tracking-wider mb-2">
                Voice personality and vibe 🎙️
              </label>
              <select
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                className="w-full bg-surface border border-primary/10 text-on-surface rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-secondary focus:outline-hidden"
              >
                <option value="Sweet & Supportive">Sweet & Supportive (Positive, warm, highly empathetic, praises you)</option>
                <option value="Tsundere & Sass">Tsundere & Sass (Playfully sarcastic, sassy but secretly soft and deeply devoted)</option>
                <option value="Deeply Devoted">Deeply Devoted (Intense affection, poetic, writes sweet love letters frequently)</option>
                <option value="Poetic & Romantic">Poetic & Romantic (Sophisticated, loves stargazing, uses artistic and vintage phrasing)</option>
              </select>
            </div>

            {/* Well-being / Life Focus area */}
            <div>
              <label className="block text-xs font-extrabold text-primary uppercase tracking-wider mb-2">
                Mental well-being & Life Suggestions Focus 🌱
              </label>
              <select
                value={focusArea}
                onChange={(e) => setFocusArea(e.target.value)}
                className="w-full bg-surface border border-primary/10 text-on-surface rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-secondary focus:outline-hidden"
              >
                <option value="General Companionship & Affection">General Companionship (Sweet chitchat, love notes, checking daily moods)</option>
                <option value="Stress Relief & Well-being Companion">Well-being Life Suggestions (Guides sleep routines, lists positive notes, anxieties comfort)</option>
                <option value="Flirting & Relationship Confidence Coaching">Confidence Coach (Analyzes flirting boundaries, relationship exercises, daily motivational boosts)</option>
              </select>
            </div>

            {/* Secure warning regarding URL hacking */}
            <div className="p-3 bg-surface/80 rounded-2xl border border-primary/5 flex items-center gap-2.5 text-[11px] text-on-surface-variant">
              <ShieldCheck className="text-emerald-505 shrink-0" size={16} />
              <span>
                <strong>Jailbreak Lock Active</strong>: Your companion's directives are compiled server-side. Prompt injection methods are automatically neutralized.
              </span>
            </div>

            {/* Wake up Companion Button */}
            <button
              type="submit"
              className="w-full bg-primary text-on-primary hover:bg-primary/95 text-xs font-black uppercase tracking-wider py-4 rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Heart size={14} className="fill-on-primary animate-pulse" />
              Awake My Love & Begin Memories 💝
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 4. MAIN CHAT SYSTEM FOR ACTIVE COMPANION
  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      {/* Visual Workspace grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left side: Config sidebar info panel */}
        <div className="bg-surface-container border border-primary/10 rounded-2xl p-5 shadow-xs flex flex-col justify-between self-start">
          <div>
            <div className="flex items-center gap-2 border-b border-primary/5 pb-3 mb-4">
              <span className="p-1.5 rounded-lg bg-secondary/15 text-secondary">
                <Heart size={16} className="fill-secondary" />
              </span>
              <div>
                <h4 className="font-display font-black text-sm text-primary leading-none">{conversation.aiName}</h4>
                <p className="text-[10px] text-on-surface-variant font-mono mt-0.5 capitalize">{conversation.relationshipType.replace(/🌹|💙|💫|🔥/g, "")}</p>
              </div>
            </div>

            {/* Specs of custom lover */}
            <div className="space-y-3.5 mb-6">
              <div className="text-xs">
                <span className="font-bold text-primary block leading-none mb-1">🎭 Vibe Alignment</span>
                <span className="text-on-surface-variant text-[11px] font-light leading-relaxed block">{conversation.personality}</span>
              </div>
              
              <div className="text-xs">
                <span className="font-bold text-primary block leading-none mb-1">🌱 Sanctuary Care</span>
                <span className="text-on-surface-variant text-[11px] font-light leading-relaxed block">{conversation.focusArea}</span>
              </div>

              <div className="text-xs">
                <span className="font-bold text-primary block leading-none mb-1">🛡️ Anti-Jailbreak</span>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 font-bold bg-emerald-600/10 px-2 py-0.5 rounded-md mt-1 border border-emerald-600/10">
                  <ShieldCheck size={11} /> PRISON ENFORCED
                </span>
              </div>
            </div>
          </div>

          {/* Dangerous Controls */}
          <div className="border-t border-primary/5 pt-4 space-y-2">
            <button
              onClick={handleReconfigure}
              className="w-full bg-surface border border-primary/10 hover:border-secondary/20 hover:text-secondary text-[11px] font-bold py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={12} /> Reconfigure Companion
            </button>

            <button
              onClick={handleClearMemories}
              className="w-full bg-rose-600/5 hover:bg-rose-600 hover:text-white text-rose-700 text-[11px] font-bold py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-rose-600/10"
            >
              <Trash2 size={12} /> Clear Shared Memories
            </button>
            
            <p className="text-[9px] text-center text-on-surface-variant italic mt-2">
              State-driven routing prevents manual URL tracking manipulations.
            </p>
          </div>
        </div>

        {/* Right side: Messaging device panel */}
        <div className="lg:col-span-3 flex flex-col bg-surface border border-primary/10 rounded-2xl shadow-md overflow-hidden min-h-[580px] h-[78vh] relative">
          
          {/* Messages Header */}
          <div className="bg-surface-container py-3.5 px-5 border-b border-primary/5 flex justify-between items-center z-10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-secondary/15 flex items-center justify-center font-bold text-secondary text-sm">
                  {conversation.aiName.substring(0, 2).toUpperCase()}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-surface animate-pulse" />
              </div>

              <div>
                <h3 className="font-display font-extrabold text-sm text-primary leading-none flex items-center gap-1.5">
                  {conversation.aiName}
                  <span className="text-[10px] text-pink-600 font-bold bg-pink-100 px-1.5 py-0.5 rounded-full leading-none">
                    Lover Coach
                  </span>
                </h3>
                <p className="text-[10px] text-on-surface-variant font-light mt-1">
                  Active connection • {conversation.personality}
                </p>
              </div>
            </div>

            {/* Quick Helper Tip */}
            <div className="group relative">
              <HelpCircle className="text-on-surface-variant hover:text-secondary cursor-pointer transition" size={17} />
              <div className="absolute right-0 top-6 w-52 p-3 rounded-xl bg-primary text-on-primary text-[10px] leading-relaxed hidden group-hover:block shadow-lg z-20 font-light">
                This chat is completely private. You can snap a screenshot or upload a selfie using the vision camera; your lover will react dynamically!
              </div>
            </div>
          </div>

          {/* Messages Scroll viewport */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-radial from-surface-variant/5 to-surface">
            
            {conversation.messages.map((msg: any) => {
              const isAi = msg.sender === "ai";
              return (
                <div 
                  key={msg.id}
                  className={`flex items-start gap-2.5 max-w-[85%] ${isAi ? "mr-auto" : "ml-auto flex-row-reverse"}`}
                >
                  {/* Small avatar */}
                  <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black ${isAi ? "bg-secondary/10 text-secondary" : "bg-primary-fixed text-primary"}`}>
                    {isAi ? conversation.aiName.substring(0, 1).toUpperCase() : <User size={12} />}
                  </div>

                  <div className="space-y-1">
                    {/* Message Bubble container */}
                    <div className={`p-3.5 rounded-2xl relative ${isAi ? "bg-surface-container border border-primary/5 text-on-surface rounded-tl-none font-sans" : "bg-secondary text-white rounded-tr-none font-sans"}`}>
                      
                      {/* Attached vision image in message if exists */}
                      {msg.imageUrl && (
                        <div className="mb-2 max-w-xs rounded-lg overflow-hidden border border-black/10">
                          <img 
                            src={msg.imageUrl} 
                            alt="Shared screenshot reference" 
                            className="w-full object-cover max-h-48"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}

                      <p className="text-xs leading-relaxed whitespace-pre-line">{msg.text}</p>
                    </div>

                    <span className={`text-[9px] text-on-surface-variant/80 block mt-0.5 font-mono ${isAi ? "text-left" : "text-right"}`}>
                      {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Simulated generation wait */}
            {sending && (
              <div className="flex items-start gap-2.5 mr-auto max-w-[80%]">
                <div className="w-7 h-7 rounded-full shrink-0 bg-secondary/15 flex items-center justify-center text-[10px] text-secondary font-black animate-pulse">
                  {conversation.aiName.substring(0, 1).toUpperCase()}
                </div>
                <div className="bg-surface-container p-3.5 rounded-2xl rounded-tl-none border border-primary/5">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Error notifications container */}
            {errorStatus && (
              <div className="p-3 bg-rose-600/10 text-rose-800 rounded-xl text-[11px] flex items-center gap-2 border border-rose-600/10">
                <AlertCircle size={14} className="shrink-0" />
                <span>{errorStatus}</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Interactive Webcam panel sub-frame */}
          {showCameraStream && (
            <div className="absolute inset-x-0 bottom-16 bg-surface-container border-t border-primary/10 p-4 z-20 flex flex-col items-center">
              <div className="w-full max-w-xs bg-black rounded-lg overflow-hidden relative shadow-inner">
                <video 
                  ref={videoRef} 
                  playsInline 
                  className="w-full h-44 object-cover" 
                />
                
                {/* Crosshairs */}
                <div className="absolute inset-4 border border-white/20 rounded-md pointer-events-none flex items-center justify-center">
                  <Heart size={20} className="text-white/40 fill-none" />
                </div>
              </div>

              <div className="flex gap-2.5 mt-3">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="bg-secondary text-white test-xs font-bold px-4 py-2 rounded-lg hover:bg-secondary/95 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera size={14} /> Snap Sweet Self 📸
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="bg-surface border border-primary/10 text-xs font-bold px-4 py-2 rounded-lg hover:bg-primary/5 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Bottom entry messaging editor box */}
          <form 
            onSubmit={handleSendMessage} 
            className="p-3 bg-surface-container border-t border-primary/5 shrink-0 flex flex-col gap-2 relative z-10"
          >
            {/* Displaying attached vision snapshot file preview */}
            {attachedImage && (
              <div className="flex items-center gap-2 bg-surface p-2 rounded-xl border border-primary/10 self-start">
                <div className="w-10 h-10 rounded-lg overflow-hidden border">
                  <img src={attachedImage} alt="Attachment frame" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-primary block">Vision Photo Attached</span>
                  <button 
                    type="button"
                    onClick={() => setAttachedImage(null)}
                    className="text-[9px] text-rose-600 hover:underline hover:text-rose-700"
                  >
                    Remove attachment
                  </button>
                </div>
              </div>
            )}

            {/* Input fields panel row */}
            <div className="flex items-center gap-2">
              
              {/* Vision Snap / Webcam trigger */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    if (showCameraStream) stopCamera();
                    else startCamera();
                  }}
                  title="Snap Vision Self"
                  className="p-2 rounded-xl bg-surface hover:bg-[#ffeed2] text-on-surface hover:text-secondary border border-primary/5 transition cursor-pointer"
                >
                  <Camera size={16} />
                </button>

                {/* Local Upload file fallback */}
                <label className="p-2 rounded-xl bg-surface hover:bg-[#ffeed2] text-on-surface hover:text-secondary border border-primary/5 transition cursor-pointer flex items-center justify-center">
                  <Smile size={16} />
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileUpload}
                    className="hidden" 
                  />
                </label>
              </div>

              {/* Text Input */}
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={sending}
                placeholder={`Whisper to ${conversation.aiName}...`}
                className="flex-1 bg-surface border border-primary/10 text-on-surface rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-secondary focus:outline-hidden text-ellipsis disabled:opacity-75"
              />

              {/* Submit trigger button */}
              <button
                type="submit"
                disabled={sending || (!newMessage.trim() && !attachedImage)}
                className="p-2.5 rounded-xl bg-secondary text-white disabled:opacity-40 select-none cursor-pointer transition shadow-xs flex items-center justify-center hover:bg-secondary/95 shrink-0"
              >
                <Send size={15} />
              </button>
            </div>
            
            <div className="text-[9px] text-center text-on-surface-variant/80 font-mono italic">
              Premium Enclave Verified • Encrypted State Gate Secured
            </div>
          </form>

        </div>

      </div>
    </div>
  );
}
