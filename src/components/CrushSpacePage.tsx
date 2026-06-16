import React, { useState, useEffect } from "react";
import { Search, Heart, Send, Sparkles, MessageCircle, User, Ribbon, Plus, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AppDatabase } from "../firebase";
import { CrushLetter } from "../types";

export const CrushSpacePage: React.FC = () => {
  const [crushLetters, setCrushLetters] = useState<CrushLetter[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchedLetters, setSearchedLetters] = useState<CrushLetter[] | null>(null);

  // Note creator state
  const [crushInputName, setCrushInputName] = useState("");
  const [senderInputName, setSenderInputName] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [creationSuccess, setCreationSuccess] = useState("");
  const [creationError, setCreationError] = useState("");

  // Letter reply form tracking
  const [replyTextMap, setReplyTextMap] = useState<{ [letterId: string]: string }>({});
  const [replySenderMap, setReplySenderMap] = useState<{ [letterId: string]: string }>({});

  const loadAllLetters = async () => {
    try {
      const data = await AppDatabase.getCrushLetters();
      setCrushLetters(data);
    } catch (e) {
      console.error("Failed loading crush letters:", e);
    }
  };

  useEffect(() => {
    loadAllLetters();
    const interval = setInterval(loadAllLetters, 6000);
    return () => clearInterval(interval);
  }, []);

  // Filter letters when searchTerm is active
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchedLetters(null);
      return;
    }
    const cleanSearch = searchTerm.toLowerCase().replace(/\s+/g, "");
    const filtered = crushLetters.filter(x => x.crushName.includes(cleanSearch));
    setSearchedLetters(filtered);
  }, [searchTerm, crushLetters]);

  const handleCreateLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreationError("");
    setCreationSuccess("");

    if (!crushInputName.trim()) {
      setCreationError("Please specify your Crush's name.");
      return;
    }
    if (!messageInput.trim()) {
      setCreationError("Please write a sweet anonymous confession message.");
      return;
    }

    const cleanCrushName = crushInputName.toLowerCase().replace(/\s+/g, "");
    const generatedId = "crush-" + Date.now() + "-" + Math.floor(Math.random() * 1000);

    const newLetter: CrushLetter = {
      id: generatedId,
      crushName: cleanCrushName,
      displayName: crushInputName.trim(),
      senderName: senderInputName.trim() || "An Anonymous Admirer",
      message: messageInput.trim(),
      createdAt: new Date().toISOString(),
      reactions: [],
      replies: [],
      likesList: [],
      isPublished: true
    };

    try {
      await AppDatabase.saveCrushLetter(newLetter);
      setCreationSuccess(`Letter successfully sealed and posted online for '${crushInputName.trim()}'!`);
      
      // Reset inputs
      setCrushInputName("");
      setSenderInputName("");
      setMessageInput("");
      
      await loadAllLetters();
      setTimeout(() => setCreationSuccess(""), 4000);
    } catch (err) {
      setCreationError("Network database sync failed. Cached locally.");
    }
  };

  const handleReact = async (letterId: string, reaction: string) => {
    try {
      await AppDatabase.addReactionToCrushLetter(letterId, reaction);
      await loadAllLetters();
    } catch (err) {
      console.warn("Reacting offline:", err);
    }
  };

  const handlePostReply = async (letterId: string) => {
    const text = replyTextMap[letterId]?.trim();
    if (!text) return;

    const sender = replySenderMap[letterId]?.trim() || "Crush Answer";

    try {
      await AppDatabase.addReplyToCrushLetter(letterId, text, sender);
      
      // Clear reply state for this letter
      setReplyTextMap(prev => ({ ...prev, [letterId]: "" }));
      setReplySenderMap(prev => ({ ...prev, [letterId]: "" }));
      
      await loadAllLetters();
    } catch (err) {
      console.warn("Replying offline:", err);
    }
  };

  const displayedList = searchedLetters !== null ? searchedLetters : crushLetters;

  return (
    <div className="w-full min-h-screen text-on-surface flex flex-col justify-start items-center pb-20 px-4 md:px-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <section className="text-center max-w-xl py-12">
        <span className="text-secondary text-xs uppercase font-extrabold tracking-widest bg-primary-fixed px-3.5 py-1 rounded-full border border-primary-container inline-flex items-center gap-1.5">
          <Ribbon size={14} className="animate-spin-slow text-secondary" /> CRUSH SPACE
        </span>
        <h1 className="font-display text-3xl md:text-5xl font-extrabold text-on-surface tracking-tight mt-3 mb-4">
          The Decrypted Confession Box
        </h1>
        <p className="text-xs md:text-sm text-on-surface-variant font-light max-w-md mx-auto leading-relaxed">
          Post completely anonymous letters to your crush. Anyone can search their name (stripped of capital letters and spacing) to check if a secret letter awaits them, react, or reply back!
        </p>
      </section>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-start">
        {/* Left Column: Creator & Lookup Form */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Lookup Search box */}
          <div className="bg-surface-container-lowest border border-primary/10 rounded-2xl p-6 shadow-xs">
            <h3 className="font-display font-extrabold text-primary text-base mb-3 flex items-center gap-2">
              <Search size={16} className="text-secondary" /> Lookup Your Name
            </h3>
            <p className="text-[11px] text-on-surface-variant leading-relaxed mb-4">
              Enter your name or your crush&apos;s name. We will auto-format it (removing spacing and caps) to find relevant confessions.
            </p>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="e.g. Peter Parker"
                className="w-full px-4 py-3 rounded-xl border border-primary/15 bg-surface-container/30 focus:outline-none focus:ring-1 focus:ring-secondary text-sm font-medium"
              />
              <Search className="absolute right-3.5 top-3.5 text-on-surface-variant" size={16} />
            </div>
            {searchTerm && (
              <p className="text-[10px] font-mono text-secondary mt-2">
                Searching index: <span className="underline">{searchTerm.toLowerCase().replace(/\s+/g, "")}</span>
              </p>
            )}
          </div>

          {/* Create Anonymous Letter card */}
          <div className="bg-surface-container-lowest border border-primary/10 rounded-2xl p-6 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-soft-pink opacity-5 rounded-full pointer-events-none transform translate-x-8 -translate-y-8"></div>
            
            <h3 className="font-display font-extrabold text-primary text-base mb-3 flex items-center gap-2">
              <Plus size={16} className="text-secondary" /> Write Anonymous Note
            </h3>
            
            <form onSubmit={handleCreateLetter} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-variant mb-1">Crush Name *</label>
                <input
                  type="text"
                  required
                  value={crushInputName}
                  onChange={(e) => setCrushInputName(e.target.value)}
                  placeholder="e.g. Peter Parker"
                  className="w-full px-3 py-2 rounded-lg border border-primary/10 bg-surface-container/20 text-xs focus:ring-1 focus:ring-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-variant mb-1">Your Alias (Optional)</label>
                <input
                  type="text"
                  value={senderInputName}
                  onChange={(e) => setSenderInputName(e.target.value)}
                  placeholder="e.g. Web Slinger"
                  className="w-full px-3 py-2 rounded-lg border border-primary/10 bg-surface-container/20 text-xs focus:ring-1 focus:ring-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-variant mb-1">Secret Confession Message *</label>
                <textarea
                  required
                  rows={4}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Dearest... I think you are absolutely marvelous."
                  className="w-full px-3 py-2 rounded-lg border border-primary/10 bg-surface-container/20 text-xs focus:ring-1 focus:ring-secondary focus:outline-none resize-none leading-relaxed"
                ></textarea>
              </div>

              {creationSuccess && (
                <div className="text-xs text-green-700 font-medium bg-green-50 p-3 rounded-lg border border-green-200">
                  {creationSuccess}
                </div>
              )}

              {creationError && (
                <div className="text-xs text-red-700 font-medium bg-red-50 p-3 rounded-lg border border-red-200">
                  {creationError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-secondary hover:bg-secondary-container text-on-secondary hover:text-on-secondary-container text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-xs"
              >
                Seal and Send Anonymously <ArrowRight size={14} />
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Confession Feed */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex justify-between items-center px-2">
            <h2 className="font-display font-extrabold text-lg text-primary">
              {searchedLetters !== null ? "Search Results" : "Recent Anonymized Letters"}
            </h2>
            <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-md">
              {displayedList.length} Active Notes
            </span>
          </div>

          <div className="space-y-6">
            {displayedList.length > 0 ? (
              displayedList.map((letter) => (
                <motion.div
                  key={letter.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-surface-container-lowest border-2 border-pink-100 rounded-3xl p-6 shadow-xs hover:shadow-md transition relative flex flex-col justify-between"
                >
                  {/* Card top banner ribbon */}
                  <div className="absolute top-0 right-8 transform -translate-y-1/2 bg-brand-soft-pink text-[#c2185b] px-3.5 py-1 text-[9px] uppercase font-black tracking-widest rounded-md shadow-xs border border-pink-200">
                    🎀 {letter.senderName}
                  </div>

                  <div>
                    {/* Header tags */}
                    <div className="mb-2">
                      <span className="text-xs font-black text-secondary">
                        To Crush: <span className="underline italic text-[#a04e5d]">{letter.displayName}</span>
                      </span>
                      <span className="text-[9px] font-mono text-on-surface-variant block mt-0.5">
                        Index Key: <span className="font-bold">@{letter.crushName}</span>
                      </span>
                    </div>

                    {/* Speech message block */}
                    <p className="text-xs sm:text-sm text-on-surface font-light leading-relaxed my-4 whitespace-pre-line border-l-2 border-brand-soft-pink pl-4 italic">
                      &ldquo;{letter.message}&rdquo;
                    </p>

                    {/* Reactions Display bar */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-primary/5">
                      <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider mr-2">React:</span>
                      {["❤️", "💖", "🥰", "🎀", "💌"].map((emoji) => {
                        const count = (letter.reactions || []).filter(r => r === emoji).length;
                        return (
                          <button
                            key={emoji}
                            onClick={() => handleReact(letter.id, emoji)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-low hover:bg-[#ffeed2] text-xs transition border border-primary/5 active:scale-95"
                          >
                            <span>{emoji}</span>
                            {count > 0 && <span className="font-bold text-[10px] text-secondary">{count}</span>}
                          </button>
                        );
                      })}
                    </div>

                    {/* Replies Thread */}
                    {letter.replies && letter.replies.length > 0 && (
                      <div className="mt-5 space-y-2">
                        <span className="text-[9px] text-[#864e5a] font-bold uppercase tracking-widest block mb-2">Crush Responses</span>
                        {letter.replies.map((reply) => (
                          <div key={reply.id} className="p-3 bg-pink-50/50 border border-pink-100 rounded-xl max-w-lg">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-bold text-[#c2185b] flex items-center gap-1">
                                <Sparkles size={11} /> {reply.sender}
                              </span>
                              <span className="text-[8px] opacity-70 font-mono">
                                {new Date(reply.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-[#5a383d] font-light leading-relaxed">{reply.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Send Response Action widget */}
                  <div className="mt-6 pt-4 border-t border-primary/5 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Your Alias (e.g. My Crush)"
                      value={replySenderMap[letter.id] || ""}
                      onChange={(e) => setReplySenderMap(prev => ({ ...prev, [letter.id]: e.target.value }))}
                      className="px-3 py-2 bg-surface-container/30 border border-primary/10 rounded-xl text-xs sm:w-1/3 focus:outline-none focus:ring-1 focus:ring-secondary"
                    />
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        placeholder="Write your single message back..."
                        value={replyTextMap[letter.id] || ""}
                        onChange={(e) => setReplyTextMap(prev => ({ ...prev, [letter.id]: e.target.value }))}
                        className="flex-1 px-3 py-2 bg-surface-container/30 border border-primary/10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-secondary"
                      />
                      <button
                        onClick={() => handlePostReply(letter.id)}
                        className="px-4 py-2 bg-secondary text-white rounded-xl text-xs font-bold hover:bg-secondary-container hover:text-on-secondary-container transition flex items-center gap-1"
                      >
                        <Send size={12} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="p-12 text-center bg-surface-container-lowest border border-dashed border-primary/10 rounded-3xl">
                <p className="text-sm text-on-surface-variant font-light mb-2">No anonymous confessions found.</p>
                <p className="text-xs text-on-surface-variant font-light">Be the first to leave a sweet confession note above!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
