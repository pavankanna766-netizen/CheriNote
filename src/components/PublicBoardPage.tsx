import React, { useState, useEffect } from "react";
import { Award, Heart, Sparkles, MessageCircle, ExternalLink, Flame, Plus, Send, Search, Crown, ArrowRight, UserCheck } from "lucide-react";
import { AppDatabase, generateSecureLink } from "../firebase";
import { CustomProposal, CrushLetter, CrushReply } from "../types";

// Mock public database declarations to ensure a vibrant leaderboard is populated
const DUMMY_PUBLIC_PROPOSALS: CustomProposal[] = [
  {
    id: "prop-public-1",
    receiverName: "Lady Guinevere",
    senderName: "Lancelot Du Lac",
    message: "Dearest Lady,\n\nI shall brave ten thousand storms and standard crusades just to seek your approval. Will you align your stars to mine, and seal our eternal covenant?",
    themeIndex: 1,
    viralEffects: true,
    yesClicked: true,
    noAttempts: 4,
    isPrivate: false,
    likesList: ["user-1", "user-2"],
    likesCount: 5410,
    viewsCount: 12940,
    authorId: "user-lancelot",
    authorName: "Lancelot Du Lac",
    createdAt: new Date(Date.now() - 36000000).toISOString()
  },
  {
    id: "prop-public-2",
    receiverName: "Beatrice Portinari",
    senderName: "Dante Alighieri",
    message: "My divine muse,\n\nThrough circles of shadow and peaks of stardust, your light guides my ink. Be my Beatrice and let us write a cosmic paradise.",
    themeIndex: 0,
    viralEffects: true,
    yesClicked: true,
    noAttempts: 12,
    isPrivate: false,
    likesList: ["user-3"],
    likesCount: 3810,
    viewsCount: 7890,
    authorId: "user-dante",
    authorName: "Dante Alighieri",
    createdAt: new Date(Date.now() - 72000000).toISOString()
  },
  {
    id: "prop-public-3",
    receiverName: "Lenore Gothic Muse",
    senderName: "Edgar Allan Poe",
    message: "Once upon a midnight dreary,\n\nI thought of your coquette eyes and grew weary. Will you hover YES, or let our love be lost forevermore?",
    themeIndex: 2,
    viralEffects: true,
    yesClicked: false,
    noAttempts: 0,
    isPrivate: false,
    likesList: [],
    likesCount: 2210,
    viewsCount: 4501,
    authorId: "user-poe",
    authorName: "Edgar Allan Poe",
    createdAt: new Date(Date.now() - 10800000).toISOString()
  }
];

const DUMMY_PUBLIC_CONFESSIONS: CrushLetter[] = [
  {
    id: "conf-dummy-1",
    crushName: "alex",
    displayName: "Alex",
    senderName: "Secret Sweetheart",
    message: "I watch you sip your matcha latte every Monday morning at the corner bakery. You always tuck your winter hair behind your ear when you read. One day I'll gather the courage to sit next to you.",
    createdAt: new Date(Date.now() - 50000000).toISOString(),
    reactions: ["❤️", "💖", "🔥"],
    replies: [
      { id: "rep-1", sender: "Alex", message: "Oh my gosh, is this actually about me? I drink matcha every Monday! Please do say hi next time!", createdAt: new Date(Date.now() - 40000000).toISOString() }
    ],
    likesList: ["user-x", "user-y", "user-z", "user-w", "user-t"],
    isPublished: true
  },
  {
    id: "conf-dummy-2",
    crushName: "clara",
    displayName: "Clara",
    senderName: "Coquette Poet",
    message: "In the campus library, under the warm gold lamps: you were reading romance classics and humming softly. My heart stopped. Writing this to ask if you believe in love at first glance.",
    createdAt: new Date(Date.now() - 120000000).toISOString(),
    reactions: ["💖", "✨"],
    replies: [],
    likesList: ["user-soph", "user-cosmic", "user-star"],
    isPublished: true
  },
  {
    id: "conf-dummy-3",
    crushName: "ryan",
    displayName: "Ryan",
    senderName: "Mystery Gym-goer",
    message: "To the Ryan who helped me adjust my bench press weights last Tuesday: your smile was kinder than any workout motivation. Hope you read this!",
    createdAt: new Date(Date.now() - 180000000).toISOString(),
    reactions: ["🔥"],
    replies: [],
    likesList: ["user-fit"],
    isPublished: true
  }
];

interface PublicBoardPageProps {
  uid: string | null;
}

export const PublicBoardPage: React.FC<PublicBoardPageProps> = ({ uid }) => {
  const [activeTab, setActiveTab] = useState<"proposals" | "confessions">("proposals");
  const [boardProposals, setBoardProposals] = useState<CustomProposal[]>([]);
  const [confessions, setConfessions] = useState<CrushLetter[]>([]);
  const [confSearch, setConfSearch] = useState("");
  
  // Custom Confession Form state
  const [showConfForm, setShowConfForm] = useState(false);
  const [confFormCrush, setConfFormCrush] = useState("");
  const [confFormSender, setConfFormSender] = useState("");
  const [confFormMessage, setConfFormMessage] = useState("");
  const [confFormError, setConfFormError] = useState("");
  const [confFormSuccess, setConfFormSuccess] = useState("");

  // Replies drawer tracker
  const [expandedReplies, setExpandedReplies] = useState<{ [id: string]: boolean }>({});
  const [newReplyText, setNewReplyText] = useState<{ [id: string]: string }>({});
  const [newReplySender, setNewReplySender] = useState<{ [id: string]: string }>({});

  const userIdentifier = uid || "anonymous-viewer";

  // Load both proposals and confessions
  const loadData = async () => {
    try {
      // Load proposals
      const proposalsRef = await AppDatabase.getProposals();
      const savedProposals = proposalsRef.filter(p => !p.isPrivate);
      const combinedProps = [...savedProposals];
      DUMMY_PUBLIC_PROPOSALS.forEach((d) => {
        if (!combinedProps.some(c => c.id === d.id)) {
          combinedProps.push(d);
        }
      });
      combinedProps.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
      setBoardProposals(combinedProps);

      // Load confessions
      const lettersRef = await AppDatabase.getCrushLetters();
      // Ensure we treat all retrieved letters as public, or filter by isPublished flag
      const publicLetters = lettersRef.filter(l => l.isPublished);
      const combinedConfs = [...publicLetters];
      DUMMY_PUBLIC_CONFESSIONS.forEach((d) => {
        if (!combinedConfs.some(c => c.id === d.id)) {
          combinedConfs.push(d);
        }
      });
      // Sort by virality: likes count + replies count + reactions count
      combinedConfs.sort((a, b) => {
        const viralityA = (a.likesList?.length || 0) + (a.replies?.length || 0) + (a.reactions?.length || 0);
        const viralityB = (b.likesList?.length || 0) + (b.replies?.length || 0) + (b.reactions?.length || 0);
        return viralityB - viralityA;
      });
      setConfessions(combinedConfs);
    } catch (e) {
      console.error("Failed loading board datasets:", e);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 8000);
    return () => clearInterval(timer);
  }, []);

  const handleLikeProposal = async (id: string) => {
    const matchedIdx = boardProposals.findIndex(b => b.id === id);
    if (matchedIdx > -1) {
      const target = boardProposals[matchedIdx];
      let updated: CustomProposal | null = null;
      
      if (!id.startsWith("prop-public")) {
        try {
          updated = await AppDatabase.toggleLikeProposal(id, userIdentifier);
        } catch (e) {
          console.error("Failed to toggle like:", e);
        }
      } else {
        const likes = target.likesList || [];
        const existIdx = likes.indexOf(userIdentifier);
        const nextList = [...likes];
        let diff = 0;
        if (existIdx > -1) {
          nextList.splice(existIdx, 1);
          diff = -1;
        } else {
          nextList.push(userIdentifier);
          diff = 1;
        }
        updated = {
          ...target,
          likesList: nextList,
          likesCount: Math.max(0, (target.likesCount || 0) + diff)
        };
      }

      if (updated) {
        setBoardProposals(prev => {
          const next = [...prev];
          next[matchedIdx] = updated!;
          next.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
          return next;
        });
      }
    }
  };

  const handleLikeConfession = async (id: string) => {
    const matchedIdx = confessions.findIndex(c => c.id === id);
    if (matchedIdx > -1) {
      const target = confessions[matchedIdx];
      
      if (!id.startsWith("conf-dummy")) {
        try {
          await AppDatabase.toggleLikeCrushLetter(id, userIdentifier);
        } catch (e) {
          console.error("Failed to toggle confession like:", e);
        }
      }
      
      const likes = target.likesList || [];
      const existIdx = likes.indexOf(userIdentifier);
      const nextList = [...likes];
      if (existIdx > -1) {
        nextList.splice(existIdx, 1);
      } else {
        nextList.push(userIdentifier);
      }
      
      setConfessions(prev => {
        const next = [...prev];
        next[matchedIdx] = {
          ...target,
          likesList: nextList
        };
        next.sort((a, b) => {
          const viralityA = (a.likesList?.length || 0) + (a.replies?.length || 0) + (a.reactions?.length || 0);
          const viralityB = (b.likesList?.length || 0) + (b.replies?.length || 0) + (b.reactions?.length || 0);
          return viralityB - viralityA;
        });
        return next;
      });
    }
  };

  const submitConfession = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfFormError("");
    setConfFormSuccess("");

    if (!confFormCrush.trim()) {
      setConfFormError("Please state the Crush name or nickname.");
      return;
    }
    if (!confFormMessage.trim()) {
      setConfFormError("Please fill out your crush board confession.");
      return;
    }

    const generatedId = "crush-pub-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const cleanCrushName = confFormCrush.toLowerCase().replace(/\s+/g, "");

    const newConf: CrushLetter = {
      id: generatedId,
      crushName: cleanCrushName,
      displayName: confFormCrush.trim(),
      senderName: confFormSender.trim() || "An Anonymous Muse",
      message: confFormMessage.trim(),
      createdAt: new Date().toISOString(),
      reactions: [],
      replies: [],
      likesList: [],
      isPublished: true
    };

    try {
      await AppDatabase.saveCrushLetter(newConf);
      setConfFormSuccess("Your confession was published directly onto the Viral Muse Leaderboard!");
      // Reset fields
      setConfFormCrush("");
      setConfFormSender("");
      setConfFormMessage("");
      setShowConfForm(false);
      // Reload lists
      loadData();
      setTimeout(() => setConfFormSuccess(""), 4000);
    } catch (err) {
      setConfFormError("Database save failed. Cached locally.");
    }
  };

  const handlePostReply = async (letterId: string) => {
    const text = newReplyText[letterId]?.trim();
    if (!text) return;
    const sender = newReplySender[letterId]?.trim() || "Crush Replying";

    try {
      if (!letterId.startsWith("conf-dummy")) {
        await AppDatabase.addReplyToCrushLetter(letterId, text, sender);
      }
      
      // Update local state for nice instant response feel
      setConfessions(prev => {
        return prev.map(c => {
          if (c.id === letterId) {
            const replies = c.replies || [];
            return {
              ...c,
              replies: [...replies, {
                id: "rep-added-" + Date.now(),
                sender,
                message: text,
                createdAt: new Date().toISOString()
              }]
            };
          }
          return c;
        });
      });

      setNewReplyText(prev => ({ ...prev, [letterId]: "" }));
      setNewReplySender(prev => ({ ...prev, [letterId]: "" }));
    } catch (err) {
      console.warn("Failed posting reply:", err);
    }
  };

  const filteredConfessions = confessions.filter(c => {
    if (!confSearch.trim()) return true;
    const query = confSearch.toLowerCase();
    return (
      c.displayName.toLowerCase().includes(query) ||
      c.senderName.toLowerCase().includes(query) ||
      c.message.toLowerCase().includes(query)
    );
  });

  return (
    <div className="w-full min-h-screen text-on-surface flex flex-col justify-start items-center pb-20 px-4 md:px-8 max-w-5xl mx-auto">
      {/* Top Banner section */}
      <section className="text-center max-w-2xl pt-10 pb-8">
        <span className="text-secondary text-xs uppercase font-extrabold tracking-widest bg-primary-fixed px-3.5 py-1 rounded-full border border-primary-container inline-flex items-center gap-1.5 justify-center">
          <Crown size={14} className="text-secondary animate-pulse" /> THE VIRAL LEADERBOARD
        </span>
        <h1 className="font-display text-3xl md:text-5xl font-black text-on-surface tracking-tight mt-3 mb-4">
          Monthly Muse Awards
        </h1>
        <p className="text-xs md:text-sm text-on-surface-variant font-light max-w-md mx-auto leading-relaxed">
          The romantic global showcase. Celebrate public custom proposal covenants and vote for viral anonymous confessions.
        </p>
      </section>

      {/* Tabs Controller */}
      <div className="flex bg-surface-container-low p-1.5 rounded-2xl border border-primary/5 w-full max-w-md mb-8 justify-center gap-1 shadow-2xs">
        <button
          onClick={() => setActiveTab("proposals")}
          className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === "proposals"
              ? "bg-secondary text-white shadow-sm"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
          }`}
          id="tab-proposal-seals"
        >
          💒 Proposal Seals
        </button>
        <button
          onClick={() => setActiveTab("confessions")}
          className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === "confessions"
              ? "bg-secondary text-white shadow-sm"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
          }`}
          id="tab-anonymous-confessions"
        >
          💌 Viral Confessions
        </button>
      </div>

      {confFormSuccess && (
        <div className="w-full mb-6 p-4 rounded-xl bg-green-50 text-green-800 border border-green-200 text-xs font-semibold text-center shadow-xs">
          {confFormSuccess}
        </div>
      )}

      {/* Tab 1: Proposals List */}
      {activeTab === "proposals" && (
        <section className="w-full space-y-6">
          {boardProposals.map((prop, idx) => {
            const secureShareUrl = generateSecureLink(prop);
            const hasLiked = prop.likesList?.includes(userIdentifier);

            return (
              <div
                key={prop.id}
                className="bg-surface-container-lowest border border-primary/10 rounded-2xl p-6 md:p-8 shadow-xs relative overflow-hidden transition-all duration-300 hover:shadow-md flex flex-col md:flex-row justify-between gap-6"
                id={`proposal-card-${prop.id}`}
              >
                {/* Ranking Medals overlay */}
                <div className="absolute top-0 left-0 bg-secondary-container text-on-secondary-container px-4 py-2 rounded-br-2xl font-display font-black text-xs flex items-center gap-1.5 shadow-2xs">
                  {idx === 0 ? "🥇 Rank #1" : idx === 1 ? "🥈 Rank #2" : idx === 2 ? "🥉 Rank #3" : `Rank #${idx + 1}`}
                </div>

                <div className="space-y-4 pt-4 md:pt-0 max-w-2xl flex-1">
                  <div className="space-y-1">
                    <h3 className="font-display font-black text-on-surface text-lg">
                      {prop.senderName} <span className="text-on-surface-variant font-light text-xs sm:text-sm">proposes to</span> {prop.receiverName}
                    </h3>
                    <span className="text-[10px] font-mono text-on-surface-variant tracking-normal block">
                      Public covenant sealed on • {new Date(prop.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-surface-container-low border border-primary/5 text-xs sm:text-sm italic text-on-surface-variant whitespace-pre-line leading-relaxed">
                    &quot;{prop.message}&quot;
                  </div>
                </div>

                {/* Metrics and Interactions */}
                <div className="md:w-48 shrink-0 flex flex-col md:justify-between items-start md:items-end border-t md:border-t-0 md:border-l border-primary/5 pt-4 md:pt-0 md:pl-6 gap-4">
                  <div className="text-left md:text-right w-full">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block">Metrics Profile</span>
                    <span className="font-display text-xl font-black text-secondary block">{prop.likesCount ? prop.likesCount.toLocaleString() : 0} Likers</span>
                    <span className="text-[10px] font-mono text-on-surface-variant">{prop.viewsCount ? prop.viewsCount.toLocaleString() : 1} Impressions</span>
                  </div>

                  <div className="flex gap-2 w-full justify-start md:justify-end">
                    <button
                      onClick={() => handleLikeProposal(prop.id)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                        hasLiked
                          ? "bg-secondary text-white shadow-xs font-boldScale"
                          : "bg-surface-container text-on-surface-variant hover:text-secondary border border-primary/5"
                      }`}
                      id={`like-proposal-${prop.id}`}
                    >
                      <Heart size={14} fill={hasLiked ? "currentColor" : "none"} /> {hasLiked ? "Liked!" : "Love"}
                    </button>
                    
                    <a
                      href={secureShareUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-primary/5 text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      <ExternalLink size={13} /> Inspect
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Tab 2: Confessions List */}
      {activeTab === "confessions" && (
        <div className="w-full space-y-6">
          {/* Confession Controls */}
          <div className="flex flex-col sm:flex-row gap-4 w-full items-center justify-between pb-2">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
              <input
                type="text"
                placeholder="Search confessions..."
                value={confSearch}
                onChange={(e) => setConfSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-surface-container border border-primary/10 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-secondary/50 placeholder:text-on-surface-variant/70 text-on-surface"
                id="search-confessions-box"
              />
            </div>

            <button
              onClick={() => setShowConfForm(!showConfForm)}
              className="w-full sm:w-auto px-5 py-2.5 bg-secondary text-white rounded-xl text-xs font-bold hover:bg-secondary-dim shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              id="open-confession-form"
            >
              <Plus size={15} /> Publish Confession
            </button>
          </div>

          {/* Form Drawers */}
          {showConfForm && (
            <div className="bg-surface-container p-6 rounded-2xl border border-secondary/10 shadow-sm w-full transition-all duration-300">
              <h3 className="font-display font-bold text-base text-on-surface mb-1 flex items-center gap-2">
                📂 Live Anonymous Confession Board
              </h3>
              <p className="text-xs text-on-surface-variant mb-4">
                Post anonymously. Others can view, react, reply, and help your confession go viral onto this monthly awards board!
              </p>
              
              {confFormError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-xs font-medium border border-red-200">
                  {confFormError}
                </div>
              )}

              <form onSubmit={submitConfession} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-on-surface-variant mb-1">To (Crush Name/Initials) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex, Clara, Ryan, SR..."
                      value={confFormCrush}
                      onChange={(e) => setConfFormCrush(e.target.value)}
                      className="w-full px-4 py-2 bg-surface-container-lowest border border-primary/10 rounded-xl text-xs font-medium focus:outline-hidden text-on-surface focus:ring-1 focus:ring-secondary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-on-surface-variant mb-1">From Name (Leave empty for Anonymous)</label>
                    <input
                      type="text"
                      placeholder="e.g. Secret admirer, coquette poet..."
                      value={confFormSender}
                      onChange={(e) => setConfFormSender(e.target.value)}
                      className="w-full px-4 py-2 bg-surface-container-lowest border border-primary/10 rounded-xl text-xs font-medium focus:outline-hidden text-on-surface focus:ring-1 focus:ring-secondary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-on-surface-variant mb-1">My Message *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Pour out your feelings... your confession will immediately update into our global leaderboard metrics."
                    value={confFormMessage}
                    onChange={(e) => setConfFormMessage(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-container-lowest border border-primary/10 rounded-xl text-xs font-medium focus:outline-hidden text-on-surface focus:ring-1 focus:ring-secondary"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowConfForm(false)}
                    className="px-4 py-2 border border-primary/10 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-secondary hover:bg-secondary-dim text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send size={12} /> Post Now
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Confession Cards */}
          {filteredConfessions.length === 0 ? (
            <div className="text-center py-16 bg-surface-container-lowest rounded-2xl border border-primary/5">
              <Flame size={32} className="mx-auto text-on-surface-variant/40 mb-3" />
              <p className="text-sm font-semibold text-on-surface">No secrets found</p>
              <p className="text-xs text-on-surface-variant max-w-xs mx-auto mt-1 leading-relaxed">
                Be the first to publish a confession on the global leaderboard! Click &apos;Publish Confession&apos; above.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredConfessions.map((conf, idx) => {
                const hasLiked = conf.likesList?.includes(userIdentifier);
                const totalVirality = (conf.likesList?.length || 0) + (conf.replies?.length || 0) + (conf.reactions?.length || 0);
                const isExpanded = expandedReplies[conf.id];

                return (
                  <div
                    key={conf.id}
                    className="bg-surface-container-lowest border border-primary/10 rounded-2xl p-6 md:p-8 shadow-xs relative overflow-hidden transition-all duration-300 hover:shadow-md flex flex-col justify-between"
                    id={`confession-card-${conf.id}`}
                  >
                    {/* Ranking Medal */}
                    <div className="absolute top-0 left-0 bg-primary/5 text-secondary px-4 py-2 rounded-br-2xl font-display font-black text-xs flex items-center gap-1.5 shadow-2xs border-r border-b border-primary/10">
                      {idx === 0 ? "🥇 Rank #1" : idx === 1 ? "🥈 Rank #2" : idx === 2 ? "🥉 Rank #3" : `Rank #${idx + 1}`}
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-4 mb-3 border-b border-primary/5 pb-3">
                      <div>
                        <h4 className="font-display font-extrabold text-on-surface text-base">
                          To: <span className="text-secondary font-black">{conf.displayName}</span>
                        </h4>
                        <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block mt-0.5">
                          From: {conf.senderName} • {new Date(conf.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 bg-surface-container-low px-3 py-1.5 rounded-xl border border-primary/5 text-xs font-mono text-on-surface-variant">
                        <Flame size={14} className="text-orange-500 animate-bounce" />
                        <span>Virality Index: <b>{totalVirality}</b></span>
                      </div>
                    </div>

                    {/* Message Body */}
                    <div className="p-4 rounded-xl bg-surface-container-low border border-primary/5 text-xs sm:text-sm italic text-on-surface-variant leading-relaxed whitespace-pre-line mb-4">
                      &quot;{conf.message}&quot;
                    </div>

                    {/* Bottom controls */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-primary/5 pt-4">
                      <div className="flex gap-2.5">
                        <button
                          onClick={() => handleLikeConfession(conf.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                            hasLiked
                              ? "bg-secondary text-white shadow-xs font-bold"
                              : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-secondary border border-primary/5"
                          }`}
                          id={`like-confession-${conf.id}`}
                        >
                          <Heart size={14} fill={hasLiked ? "currentColor" : "none"} /> {hasLiked ? "Voted!" : "Vote"} ({conf.likesList?.length || 0})
                        </button>

                        <button
                          onClick={() => setExpandedReplies(prev => ({ ...prev, [conf.id]: !isExpanded }))}
                          className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-primary/5 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <MessageCircle size={14} /> Answers ({conf.replies?.length || 0})
                        </button>
                      </div>

                      {/* Display summary of Reactions */}
                      {conf.reactions && conf.reactions.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs bg-pink-50/50 px-2.5 py-1 rounded-full border border-pink-100 text-pink-700">
                          <span>Reactions:</span>
                          <span className="font-mono font-bold text-pink-800">{conf.reactions.join(" ")}</span>
                        </div>
                      )}
                    </div>

                    {/* Replies drawer */}
                    {isExpanded && (
                      <div className="mt-5 pt-4 border-t border-dashed border-primary/10 space-y-4">
                        <h5 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                          Conversation Answers ({conf.replies?.length || 0})
                        </h5>

                        {conf.replies && conf.replies.length > 0 ? (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {conf.replies.map((rep, rIdx) => (
                              <div key={rep.id || rIdx} className="bg-surface-container-low p-3 rounded-lg border border-primary/5 text-xs">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-bold text-secondary">{rep.sender}</span>
                                  <span className="text-[8px] text-on-surface-variant font-mono">{new Date(rep.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-on-surface-variant italic">&quot;{rep.message}&quot;</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-on-surface-variant italic pl-1">No responses received yet.</p>
                        )}

                        {/* Reply Form */}
                        <div className="bg-surface-container rounded-xl p-3 border border-primary/5 space-y-2">
                          <input
                            type="text"
                            placeholder="My Signature (e.g. Crush, Secret Observer)"
                            value={newReplySender[conf.id] || ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setNewReplySender(prev => ({ ...prev, [conf.id]: v }));
                            }}
                            className="w-full px-3 py-1.5 bg-surface-container-lowest border border-primary/10 rounded-lg text-xs"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Type your reaction or message..."
                              value={newReplyText[conf.id] || ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                setNewReplyText(prev => ({ ...prev, [conf.id]: v }));
                              }}
                              className="flex-1 px-3 py-1.5 bg-surface-container-lowest border border-primary/10 rounded-lg text-xs focus:outline-hidden text-on-surface focus:ring-1 focus:ring-secondary"
                            />
                            <button
                              onClick={() => handlePostReply(conf.id)}
                              className="px-4 bg-secondary hover:bg-secondary-dim text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <Send size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
