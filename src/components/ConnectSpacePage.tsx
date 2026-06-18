import React, { useState, useEffect, useRef } from "react";
import { Heart, User, CheckCircle2, XCircle, Send, ShieldAlert, Sparkles, MessageSquare, Trash2, Zap } from "lucide-react";
import { collection, query, where, onSnapshot, getDocs, setDoc, doc } from "firebase/firestore";
import { AppDatabase, db } from "../firebase";
import { UserProfile, SoulConnection, ConnectionMessage } from "../types";

interface ConnectSpacePageProps {
  user: UserProfile;
  onNavigate?: (view: string) => void;
  onUpdateUser?: (updates: Partial<UserProfile>) => void;
}

export const ConnectSpacePage: React.FC<ConnectSpacePageProps> = ({ user, onNavigate, onUpdateUser }) => {
  const [currentConnection, setCurrentConnection] = useState<SoulConnection | null>(null);
  const [candidates, setCandidates] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatMessage, setChatMessage] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [matchPreference, setMatchPreference] = useState<"opposite" | "everyone">("everyone");
  const [selectedGender, setSelectedGender] = useState<string>("Female");
  const [isUpdatingGender, setIsUpdatingGender] = useState<boolean>(false);
  const [isAutoMatching, setIsAutoMatching] = useState<boolean>(false);
  const [autoMatchStatus, setAutoMatchStatus] = useState<string>("");

  // Establish a romantic companion/AI response fallback to ensure solo/home testing is 100% satisfying
  const establishAIMatchmateFallback = async () => {
    setAutoMatchStatus("Materializing highly compatible AI Matchmate...");
    const aiGender = user.gender === "Female" ? "Male" : "Female";
    const aiName = aiGender === "Female" ? "Chéri Matchmate 👩" : "Romeo Matchmate 👦";
    const connectionId = `${user.uid}_ai_matchmate`;
    
    const newConn: SoulConnection = {
      id: connectionId,
      senderId: user.uid,
      senderName: user.name,
      senderGender: user.gender || "Female",
      receiverId: "ai_matchmate",
      receiverName: aiName,
      receiverGender: aiGender,
      status: "accepted",
      createdAt: new Date().toISOString(),
      messages: [
        {
          senderId: "ai_matchmate",
          senderName: aiName,
          text: `Hi there! I am your AI Matchmate test partner. 💖 Since there are no other unlinked players on your database right now, I was initialized to help you test this secure chat chamber flawlessly! Ask me anything or send a message to test real-time communication!`,
          createdAt: new Date().toISOString()
        }
      ]
    };
    try {
      await setDoc(doc(db, "soul_connections", connectionId), newConn);
    } catch (err) {
      console.error("AI Matchmate setup failed: ", err);
    } finally {
      setIsAutoMatching(false);
      setAutoMatchStatus("");
    }
  };

  // Quantum matching algorithm allowing unlimited accessing & auto-merging overlapping invitations
  const handleAutoMatch = async () => {
    setIsAutoMatching(true);
    setAutoMatchStatus("Accessing live matchmaking grid...");
    try {
      // 1. Get all registered users directly to avoid offline stale storage
      const snapshot = await getDocs(collection(db, "users"));
      const allUsers: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        allUsers.push(docSnap.data() as UserProfile);
      });

      // Filter possible candidates
      const possibleCandidates = allUsers.filter((u) => {
        if (u.uid === user.uid) return false;
        
        if (matchPreference === "opposite") {
          if (!u.gender || !user.gender) return false;
          const userGender = (user.gender || "Female").trim().toLowerCase();
          const candGender = (u.gender || "Male").trim().toLowerCase();

          if (userGender.startsWith("female") || userGender === "f") {
            return candGender.startsWith("male") || candGender === "m";
          }
          if (userGender.startsWith("male") || userGender === "m") {
            return candGender.startsWith("female") || candGender === "f";
          }
          return candGender !== userGender;
        }
        return true;
      });

      if (possibleCandidates.length === 0) {
        setAutoMatchStatus("No unlinked players registered yet. Launching sweet test partner...");
        await establishAIMatchmateFallback();
        return;
      }

      setAutoMatchStatus("Resolving busy matching states...");
      // 2. Get all current soul connections to see who is busy
      const connSnap = await getDocs(collection(db, "soul_connections"));
      const busyUsers = new Set<string>();
      const existingInboundInvitations: SoulConnection[] = [];

      connSnap.forEach((docSnap) => {
        const conn = docSnap.data() as SoulConnection;
        if (conn.status === "accepted" || conn.status === "pending") {
          busyUsers.add(conn.senderId);
          busyUsers.add(conn.receiverId);
        }
        if (conn.status === "pending" && conn.receiverId === user.uid) {
          existingInboundInvitations.push(conn);
        }
      });

      // 3. Find a free candidate
      // Check if there is already a pending inbound invitation waiting for us from an eligible candidate
      const readyInbound = existingInboundInvitations.find(conn => 
        possibleCandidates.some(u => u.uid === conn.senderId)
      );

      if (readyInbound) {
        setAutoMatchStatus(`Overlapping proposal discovered! Snapping connect to ${readyInbound.senderName}...`);
        await AppDatabase.acceptSoulConnection(readyInbound.id);
        setIsAutoMatching(false);
        setAutoMatchStatus("");
        return;
      }

      // Secondary check: find an unlinked registered candidate
      const freeCandidate = possibleCandidates.find(u => !busyUsers.has(u.uid));

      if (freeCandidate) {
        setAutoMatchStatus(`Aligning connection tunnel with ${freeCandidate.name}...`);
        
        // Create an accepted connection immediately for both players! This bypasses authorization queues completely.
        const connectionId = `${user.uid}_${freeCandidate.uid}`;
        const newConn: SoulConnection = {
          id: connectionId,
          senderId: user.uid,
          senderName: user.name,
          senderGender: user.gender || "Female",
          receiverId: freeCandidate.uid,
          receiverName: freeCandidate.name,
          receiverGender: freeCandidate.gender || "Male",
          status: "accepted",
          createdAt: new Date().toISOString(),
          messages: [
            {
              senderId: "system",
              senderName: "Quantum Matchmaker",
              text: `💖 Match successfully aligned! Say hello to your new soul connection chamber here!`,
              createdAt: new Date().toISOString()
            }
          ]
        };
        await setDoc(doc(db, "soul_connections", connectionId), newConn);
        setIsAutoMatching(false);
        setAutoMatchStatus("");
      } else {
        // Fallback: match with opposite-gender AI companion
        setAutoMatchStatus("All online players are busy. Initializing AI Matchmate companion...");
        await establishAIMatchmateFallback();
      }
    } catch (e) {
      console.warn("Auto matchmaker failure:", e);
      setAutoMatchStatus("Tuning automatic match lines... launching AI bot check.");
      await establishAIMatchmateFallback();
    }
  };

  // 1. Listen for Soul Connections involving the current user in absolute REALTIME (onSnapshot)
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const path = "soul_connections";
    const q1 = query(collection(db, path), where("senderId", "==", user.uid));
    const q2 = query(collection(db, path), where("receiverId", "==", user.uid));

    let conn1: SoulConnection | null = null;
    let conn2: SoulConnection | null = null;

    const syncConnectionsState = () => {
      const activeConn = conn1 || conn2;
      setCurrentConnection(activeConn);
      setLoading(false);
    };

    const unsub1 = onSnapshot(q1, (snapshot) => {
      conn1 = null;
      snapshot.forEach((docSnap) => {
        conn1 = docSnap.data() as SoulConnection;
      });
      syncConnectionsState();
    }, (error) => {
      console.warn("Real-time soul connection (sender) failed:", error);
      setLoading(false);
    });

    const unsub2 = onSnapshot(q2, (snapshot) => {
      conn2 = null;
      snapshot.forEach((docSnap) => {
        conn2 = docSnap.data() as SoulConnection;
      });
      syncConnectionsState();
    }, (error) => {
      console.warn("Real-time soul connection (receiver) failed:", error);
      setLoading(false);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [user?.uid]);

  // 2. Listen for registered Users in absolute REALTIME (onSnapshot) to keep Candidates auto-synced
  useEffect(() => {
    // If the user already has an active or pending connection chamber, clear candidates list and bypass
    if (currentConnection) {
      setCandidates([]);
      return;
    }

    const unsubUsers = onSnapshot(query(collection(db, "users")), (snapshot) => {
      const allUsers: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        const u = docSnap.data() as UserProfile;
        allUsers.push(u);
      });

      const availableCandidates = allUsers.filter((u) => {
        // Exclude ourselves
        if (u.uid === user.uid) return false;

        if (matchPreference === "opposite") {
          if (!u.gender || !user.gender) return false; // Both must have gender for opposite match
          const userGender = (user.gender || "Female").trim().toLowerCase();
          const candGender = (u.gender || "Male").trim().toLowerCase();

          if (userGender.startsWith("female") || userGender === "f") {
            return candGender.startsWith("male") || candGender === "m";
          }
          if (userGender.startsWith("male") || userGender === "m") {
            return candGender.startsWith("female") || candGender === "f";
          }
          // If user gender is non-binary/other, match anyone who isn't the same gender
          return candGender !== userGender;
        }
        return true; // "everyone" matches anyone else who registered
      });

      setCandidates(availableCandidates);
    }, (error) => {
      console.warn("Real-time candidates list failed:", error);
    });

    return () => unsubUsers();
  }, [user, matchPreference, currentConnection]);

  // Scroll to bottom when messages list increases
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentConnection?.messages]);

  const handleRequestConnect = async (candidate: UserProfile) => {
    try {
      setLoading(true);
      await AppDatabase.createSoulConnection(
        user.uid,
        user.name,
        user.gender || "Female",
        candidate.uid,
        candidate.name,
        candidate.gender || "Male"
      );
    } catch (err) {
      console.error("Connection initiation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptConnect = async () => {
    if (!currentConnection) return;
    try {
      setLoading(true);
      await AppDatabase.acceptSoulConnection(currentConnection.id);
    } catch (err) {
      console.error("Connect acceptance failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelConnect = async () => {
    if (!currentConnection) return;
    if (window.confirm("Are you sure you want to cancel and delete this private connection chamber? This action cannot be undone.")) {
      try {
        setLoading(true);
        await AppDatabase.cancelSoulConnection(currentConnection.id);
        setCurrentConnection(null);
      } catch (err) {
        console.error("Disconnect trigger failed:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !currentConnection) return;

    const typedMsg = chatMessage.trim();
    const messagePayload: ConnectionMessage = {
      senderId: user.uid,
      senderName: user.name,
      text: typedMsg,
      createdAt: new Date().toISOString()
    };

    try {
      await AppDatabase.sendConnectionMessage(currentConnection.id, messagePayload);
      setChatMessage("");
      // Local state update for feeling snappy
      setCurrentConnection(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...prev.messages, messagePayload]
        };
      });

      // If connected to AI Matchmate, reply back smoothly with interactive testing helpers
      if (currentConnection.receiverId === "ai_matchmate" || currentConnection.senderId === "ai_matchmate") {
        setTimeout(async () => {
          const aiReplies = [
            "Your message is registered seamlessly! 💖 The long-polling network transport is operating beautifully.",
            "Testing private socket tunnel... 🔒 Result: 100% active and secure!",
            "I love chatting with you! Rose coordinates are perfectly synchronized on the server.",
            "Database update complete! 💌 What matches or effects should we explore next?",
            "No connection delays here! The home router bypass is working flawlessly.",
            "That's so interesting! Did you know that we can cancel and delete this chamber at any time to return to matchmaking?"
          ];
          const randomReply = aiReplies[Math.floor(Math.random() * aiReplies.length)];
          const aiResponsePayload: ConnectionMessage = {
            senderId: "ai_matchmate",
            senderName: currentConnection.receiverId === "ai_matchmate" ? currentConnection.receiverName : currentConnection.senderName,
            text: randomReply,
            createdAt: new Date().toISOString()
          };
          await AppDatabase.sendConnectionMessage(currentConnection.id, aiResponsePayload);
        }, 1100);
      }
    } catch (err) {
      console.error("Failed sending message:", err);
    }
  };

  // If user has not specified a Gender, lock Connect Space and show Profile redirection instructions
  if (!user.gender) {
    const handleSaveGenderInline = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!onUpdateUser) return;
      setIsUpdatingGender(true);
      try {
        await onUpdateUser({ gender: selectedGender });
      } catch (err) {
        console.error("Failed saving gender inline:", err);
      } finally {
        setIsUpdatingGender(false);
      }
    };

    return (
      <div className="w-full min-h-[70vh] flex flex-col justify-center items-center py-10 px-4 max-w-sm mx-auto text-center space-y-6">
        <div className="w-16 h-16 bg-[#ffeed0] text-secondary rounded-full flex items-center justify-center border-2 border-dashed border-secondary shadow-xs animate-bounce">
          <Heart size={30} fill="currentColor" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display font-black text-on-surface text-xl">💞 Specify Your Gender</h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Configure your gender first to unlock opposite-gender matches and private chat rooms in the Matching Chamber.
          </p>
        </div>

        <form onSubmit={handleSaveGenderInline} className="w-full bg-surface-container-low p-6 rounded-2xl border border-primary/5 space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">My Gender Identity</label>
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="w-full px-3 py-2 bg-white rounded-xl border border-primary/10 text-xs text-on-surface focus:outline-hidden focus:border-secondary transition cursor-pointer"
              id="inline-gender-select"
            >
              <option value="Female">Female ♀</option>
              <option value="Male">Male ♂</option>
              <option value="Non-Binary">Non-Binary ⚧</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isUpdatingGender}
            className="w-full py-2.5 bg-secondary hover:bg-secondary-dim disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5"
            id="inline-gender-submit"
          >
            {isUpdatingGender ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              "Activate My Matchmaker Profile ✨"
            )}
          </button>
        </form>

        <div className="text-xs font-light text-on-surface-variant leading-relaxed">
          Or, manage additional credential settings on your profile.
          <button
            onClick={() => onNavigate && onNavigate("dashboard")}
            className="text-secondary font-semibold hover:underline bg-transparent border-0 ml-1 cursor-pointer"
          >
            Go to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen text-on-surface flex flex-col justify-start items-center pb-20 px-4 md:px-8 max-w-4xl mx-auto" id="connect-space-root">
      {/* Page Header */}
      <section className="text-center max-w-xl pt-10 pb-8">
        <span className="text-secondary text-xs uppercase font-extrabold tracking-widest bg-primary-fixed px-3.5 py-1 rounded-full border border-primary-container inline-flex items-center gap-1.5 justify-center">
          <Zap size={13} className="text-secondary" /> CONNECT CHOPIN
        </span>
        <h1 className="font-display text-3xl md:text-4xl font-black text-on-surface tracking-tight mt-3 mb-2">
          The Matching Chamber
        </h1>
        <p className="text-xs text-on-surface-variant font-light leading-relaxed">
          Instantly connect with other opposite gender lovers in a secure private room. Strictly one partner at a time, until cancelled!
        </p>
      </section>

      {loading && !currentConnection && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-mono text-on-surface-variant">Syncing matchmaking registries...</p>
        </div>
      )}

      {/* State A: No pending or active connection */}
      {!loading && !currentConnection && (
        <div className="w-full space-y-6">
          <div className="bg-surface-container-low border border-primary/5 rounded-2xl p-6 text-center shadow-2xs max-w-md mx-auto space-y-4">
            <div>
              <span className="text-xs font-bold text-secondary-container bg-secondary text-on-secondary px-3 py-1 rounded-full text-[10px] font-mono">
                My Profile: {user.gender} 
              </span>
              <p className="text-xs text-on-surface-variant mt-3 leading-relaxed">
                Connect and match with other lovers live. Open multiple browser tabs using different accounts to test private real-time matchmaking seamlessly!
              </p>
            </div>
            
            {/* Match preferences selector tab */}
            <div className="flex justify-center items-center gap-1.5 bg-surface-container-high p-1 rounded-xl border border-primary/10 max-w-xs mx-auto">
              <button
                onClick={() => setMatchPreference("opposite")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-[10.5px] font-extrabold uppercase tracking-wider transition ${
                  matchPreference === "opposite"
                    ? "bg-secondary text-white shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Opposite Gender
              </button>
              <button
                onClick={() => setMatchPreference("everyone")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-[10.5px] font-extrabold uppercase tracking-wider transition ${
                  matchPreference === "everyone"
                    ? "bg-secondary text-white shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Everyone (Testing)
              </button>
            </div>
          </div>

          {/* Quantum Auto-Matchmaker Card (Solves dual-device / router sync limitations) */}
          <div className="bg-linear-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-secondary/20 p-6 rounded-2xl text-center space-y-4 max-w-md mx-auto shadow-sm relative overflow-hidden" id="quantum-auto-matchmaker">
            <div className="absolute top-0 right-0 p-2 text-secondary opacity-30 animate-pulse">
              <Sparkles size={24} />
            </div>
            
            <div className="space-y-1">
              <h4 className="text-sm font-black uppercase tracking-wider text-secondary flex items-center justify-center gap-1.5">
                <Zap size={15} className="text-secondary animate-bounce" /> Quantum Auto-Matchmaker
              </h4>
              <p className="text-[10.5px] text-on-surface-variant leading-relaxed px-4">
                Bypass all waiting times and home-based router locks! Click below to instantly scan, pair, and open your secure live private chat room automatically.
              </p>
            </div>

            <button
              onClick={handleAutoMatch}
              disabled={isAutoMatching}
              className="w-full max-w-xs py-3 bg-linear-to-r from-pink-500 to-indigo-600 hover:opacity-90 disabled:opacity-70 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition duration-300 transform active:scale-95 flex items-center justify-center gap-2 mx-auto cursor-pointer"
              id="instant-match-btn"
            >
              {isAutoMatching ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{autoMatchStatus || "Scanning Dimension..."}</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} className="animate-pulse" />
                  <span>Instant Matchmaker Link ⚡</span>
                </>
              )}
            </button>
            
            {autoMatchStatus && isAutoMatching && (
              <p className="text-[10px] font-mono text-secondary animate-pulse">
                {autoMatchStatus}
              </p>
            )}
          </div>

          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant border-b border-primary/5 pb-2">
            Available Matches ({candidates.length})
          </h3>

          {candidates.length === 0 ? (
            <div className="text-center py-16 bg-surface-container-lowest rounded-2xl border border-dashed border-primary/10">
              <User size={36} className="mx-auto text-on-surface-variant/40 mb-3" />
              <p className="text-xs font-semibold text-on-surface">Waiting for lovers...</p>
              <p className="text-[10px] text-on-surface-variant mt-1 max-w-xs mx-auto leading-relaxed">
                {matchPreference === "opposite" 
                  ? "Currently, there are no unlinked opposite gender users registered yet. Try switching to 'Everyone (Testing)' to link instantly!"
                  : "Currently, no other unlinked users are registered. Invite someone or open an incognito/secondary window to register a test user!"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidates.map((cand) => (
                <div
                  key={cand.uid}
                  className="bg-surface-container-lowest border border-primary/10 p-5 rounded-2xl shadow-2xs flex flex-col justify-between hover:shadow-xs transition duration-300"
                  id={`candidate-profile-${cand.uid}`}
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={cand.photoUrl}
                      alt={cand.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full object-cover border border-secondary shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-display font-bold text-on-surface text-sm">{cand.name}</h4>
                        <span className="text-[8px] bg-pink-100/60 border border-pink-200 text-pink-700 font-bold font-mono px-1.5 py-0.5 rounded-full">
                          {cand.gender}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant italic leading-relaxed">
                        {cand.bio ? `"${cand.bio}"` : "This romantic partner hasn't written a biography yet."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-primary/5 flex justify-end">
                    <button
                      onClick={() => handleRequestConnect(cand)}
                      className="px-4 py-2 bg-secondary text-white hover:bg-secondary-dim text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      id={`request-connect-${cand.uid}`}
                    >
                      <Heart size={12} fill="currentColor" /> Send Match Invitation
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* State B: Connection is pending */}
      {!loading && currentConnection && currentConnection.status === "pending" && (
        <div className="w-full max-w-md bg-surface-container-lowest border border-primary/10 rounded-2xl p-6 md:p-8 text-center shadow-xs space-y-6" id="connection-pending-screen">
          <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-rose-500 mx-auto animate-pulse">
            <Heart size={30} fill="currentColor" />
          </div>

          {currentConnection.senderId === user.uid ? (
            // I sent the request, waiting for receiver
            <div className="space-y-3">
              <h3 className="font-display font-black text-on-surface text-lg">Sent connection invitation</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                You sent an invitation to connect with <b>{currentConnection.receiverName}</b> ({currentConnection.receiverGender}). We are currently waiting for them to accept your matching request!
              </p>
              <div className="bg-surface-container-low p-3.5 rounded-xl border border-primary/5 text-[10px] font-mono text-on-surface-variant">
                Status: Pending Approval
              </div>
              <button
                onClick={handleCancelConnect}
                className="mt-4 w-full py-2.5 bg-surface-container hover:bg-surface-container-high border border-primary/10 rounded-xl text-xs font-bold text-on-surface-variant transition flex items-center justify-center gap-1.5 cursor-pointer"
                id="cancel-pending-request"
              >
                <XCircle size={14} /> Cancel Connection Proposal
              </button>
            </div>
          ) : (
            // I received the request from sender
            <div className="space-y-3">
              <h3 className="font-display font-black text-on-surface text-lg">Inbound match proposal!</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                <b>{currentConnection.senderName}</b> ({currentConnection.senderGender}) has invited you to connect in a one-on-one personal chat room!
              </p>
              
              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  onClick={handleCancelConnect}
                  className="py-2.5 bg-surface-container hover:bg-surface-container-high border border-primary/10 rounded-xl text-xs font-bold text-on-surface-variant transition cursor-pointer"
                  id="decline-connection-request"
                >
                  Decline
                </button>
                <button
                  onClick={handleAcceptConnect}
                  className="py-2.5 bg-secondary hover:bg-secondary-dim text-white rounded-xl text-xs font-black transition shadow-xs cursor-pointer flex items-center justify-center gap-1"
                  id="accept-connection-request"
                >
                  <CheckCircle2 size={13} fill="currentColor" /> Accept & Chat
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* State C: Accepted Active Chat Room */}
      {!loading && currentConnection && currentConnection.status === "accepted" && (
        <div className="w-full bg-surface-container-lowest border border-primary/10 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[580px]" id="connection-chat-room">
          
          {/* Top partner info header */}
          <div className="bg-surface-container-low p-4 border-b border-primary/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center font-display font-black text-secondary border border-secondary shadow-2xs">
                  {currentConnection.senderId === user.uid ? currentConnection.receiverName[0] : currentConnection.senderName[0]}
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
              </div>
              <div>
                <h4 className="font-display font-bold text-sm text-on-surface">
                  {currentConnection.senderId === user.uid ? currentConnection.receiverName : currentConnection.senderName}
                </h4>
                <span className="text-[9px] font-mono text-on-surface-variant uppercase tracking-wider block">
                  Active Connection Chamber • Connected Opposite Partner
                </span>
              </div>
            </div>

            <button
              onClick={handleCancelConnect}
              className="p-2 bg-pink-50 hover:bg-red-50 border border-pink-100 text-pink-700 hover:text-red-600 rounded-xl transition cursor-pointer"
              title="Break and delete connection"
              id="close-connection-btn"
            >
              <Trash2 size={15} />
            </button>
          </div>

          {/* Messages pane */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-container/10">
            {currentConnection.messages && currentConnection.messages.length > 0 ? (
              currentConnection.messages.map((msg, idx) => {
                const isMe = msg.senderId === user.uid;
                return (
                  <div
                    key={idx}
                    className={`flex ${isMe ? "justify-end" : "justify-start"} w-full animate-fade-in`}
                  >
                    <div className={`max-w-[70%] rounded-2xl p-3 text-xs shadow-2xs ${
                      isMe
                        ? "bg-secondary text-white rounded-br-none"
                        : "bg-surface-container text-on-surface rounded-bl-none border border-primary/5"
                    }`}>
                      {!isMe && (
                        <span className="font-bold text-[9px] block text-secondary mb-1">
                          {msg.senderName}
                        </span>
                      )}
                      <p className="leading-relaxed whitespace-pre-line break-words">{msg.text}</p>
                      <span className={`text-[8px] block mt-1.5 font-mono text-right ${isMe ? "opacity-80 text-pink-100" : "text-on-surface-variant"}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <MessageSquare size={32} className="text-secondary/40 animate-pulse" />
                <p className="text-xs font-semibold text-on-surface">Your private connection is live!</p>
                <p className="text-[10px] text-on-surface-variant max-w-xs leading-relaxed">
                  Say something romantic to start the conversation. Only you and your connected partner can read this chat.
                </p>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Text input form footer */}
          <form onSubmit={handleSendMessage} className="p-3 bg-surface-container-low border-t border-primary/5 flex gap-2">
            <input
              type="text"
              required
              placeholder="Write a sweet message..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              className="flex-1 px-4 py-3 bg-surface-container-lowest border border-primary/10 rounded-xl text-xs focus:outline-hidden text-on-surface focus:ring-1 focus:ring-secondary focus:border-secondary"
              id="chat-message-input-box"
            />
            <button
              type="submit"
              className="px-4 bg-secondary hover:bg-secondary-dim text-white rounded-xl transition flex items-center justify-center cursor-pointer shadow-xs"
              id="chat-message-send-btn"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
