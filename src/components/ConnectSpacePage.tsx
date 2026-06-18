import React, { useState, useEffect, useRef } from "react";
import { Heart, User, CheckCircle2, XCircle, Send, ShieldAlert, Sparkles, MessageSquare, Trash2, Zap } from "lucide-react";
import { AppDatabase } from "../firebase";
import { UserProfile, SoulConnection, ConnectionMessage } from "../types";

interface ConnectSpacePageProps {
  user: UserProfile;
}

export const ConnectSpacePage: React.FC<ConnectSpacePageProps> = ({ user }) => {
  const [currentConnection, setCurrentConnection] = useState<SoulConnection | null>(null);
  const [candidates, setCandidates] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatMessage, setChatMessage] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [matchPreference, setMatchPreference] = useState<"opposite" | "everyone">("everyone");

  // Polling for connection state updates
  const loadConnectionState = async () => {
    try {
      const conn = await AppDatabase.getSoulConnection(user.uid);
      setCurrentConnection(conn);

      // If we don't have an active accepted/pending connection, lookup opposite gender candidates
      if (!conn) {
        const allUsers = await AppDatabase.getAllUsers();
        // Get all current connections to see who is already busy
        const connectionsPath = "soul_connections";
        
        const availableCandidates = allUsers.filter(u => {
          if (u.uid === user.uid) return false;
          if (!u.gender) return false; // candidate must have a gender defined
          
          if (matchPreference === "opposite") {
            if (user.gender === "Female") return u.gender === "Male";
            if (user.gender === "Male") return u.gender === "Female";
            // If user gender is non-binary/other, match anyone who isn't the same gender
            return u.gender !== user.gender;
          }
          return true; // "everyone" preference matches any other gender
        });

        setCandidates(availableCandidates);
      }
    } catch (e) {
      console.error("Failed to load matchmaker context:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnectionState();
    // Continuous polling for real-time conversation responsiveness
    const interval = setInterval(loadConnectionState, 3000);
    return () => clearInterval(interval);
  }, [user, matchPreference]);

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
      await loadConnectionState();
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
      await loadConnectionState();
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
        await loadConnectionState();
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

    const messagePayload: ConnectionMessage = {
      senderId: user.uid,
      senderName: user.name,
      text: chatMessage.trim(),
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
    } catch (err) {
      console.error("Failed sending message:", err);
    }
  };

  // If user has not specified a Gender, lock Connect Space and show Profile redirection instructions
  if (!user.gender) {
    return (
      <div className="w-full min-h-[70vh] flex flex-col justify-center items-center py-10 px-4 max-w-md mx-auto text-center space-y-6">
        <div className="w-16 h-16 bg-[#ffeed0] text-secondary rounded-full flex items-center justify-center border-2 border-dashed border-secondary shadow-xs animate-bounce">
          <Heart size={30} fill="currentColor" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display font-black text-on-surface text-xl">💞 Gender Selection Required</h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            To explore matches and connect with opposite genders in our personal chat chambers, you must specify your gender in your Profile!
          </p>
        </div>
        <div className="bg-surface-container-low p-4 rounded-xl border border-primary/5 text-[10px] text-on-surface-variant font-mono">
          Go to **My Account** tab → Find **My Gender** select → Set it to Female, Male, or Non-Binary → Commit Changes
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
