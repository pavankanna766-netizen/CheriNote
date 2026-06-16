import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, Heart, ArrowRight, HelpCircle, User, MessageSquare, 
  Send, Trophy, Flame, Zap, ShieldAlert, BadgeCheck, Gamepad2, 
  RefreshCw, Smile, Users, X, Info, Crown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AppDatabase, db } from "../firebase";
import { UserProfile, GameRoom, GameMessage } from "../types";
import { 
  collection, doc, setDoc, onSnapshot, updateDoc, 
  query, where, getDocs, limit, arrayUnion 
} from "firebase/firestore";

interface ArcadeSpacePageProps {
  user: UserProfile | null;
  onUpgradePrompt: () => void;
}

// Fixed Questions for Affinity Pulse Compatibility game
const AFFINITY_PROMPTS = [
  {
    id: "q1",
    question: "What is your idea of a perfect first date?",
    options: [
      { text: "☕ Cozy library coffee cafe", key: "cafe" },
      { text: "🎪 Stargazing at a rooftop fair", key: "fair" },
      { text: "🎨 Making matching ceramic rings", key: "craft" }
    ]
  },
  {
    id: "q2",
    question: "Choose a dreamy romance aesthetic:",
    options: [
      { text: "🎀 Victorian lacy coquette pink", key: "coquette" },
      { text: "♟️ Deep academia leather-bound journals", key: "academia" },
      { text: "🎸 Grunge indie vinyl music sheets", key: "indie" }
    ]
  },
  {
    id: "q3",
    question: "Pick a secret love note token:",
    options: [
      { text: "💌 Wax-sealed dried wildflower envelope", key: "wax_envelope" },
      { text: "🎵 Custom cassette playlist mix", key: "cassette" },
      { text: "💍 Inside-engraved vintage silver band", key: "ring" }
    ]
  },
  {
    id: "q4",
    question: "What weather matches your loving mood?",
    options: [
      { text: "🌧️ Autumn rain pattering on the window", key: "rain" },
      { text: "☀️ Warm sunshine in a field of sunflowers", key: "sun" },
      { text: "❄️ Drifting winter snow with twin hot cocoas", key: "snow" }
    ]
  }
];

// Symbols for memory game (each appears twice)
const MEMORY_SYMBOLS = ["🧸", "🍒", "💌", "🌹", "🎀", "🕯️"];

export const ArcadeSpacePage: React.FC<ArcadeSpacePageProps> = ({ user, onUpgradePrompt }) => {
  // --- STATE ---
  const [activeRoom, setActiveRoom] = useState<GameRoom | null>(null);
  const [lookingForMatch, setLookingForMatch] = useState(false);
  const [gender, setGender] = useState<string>("other");
  const [preference, setPreference] = useState<string>("seeking-anyone");
  const [customName, setCustomName] = useState<string>("");
  const [selectedGameType, setSelectedGameType] = useState<"tic-tac-toe" | "heart-matcher" | "affinity-pulse">("tic-tac-toe");
  const [chatInput, setChatInput] = useState("");
  
  // Daily Limit State
  const [gamesPlayedToday, setGamesPlayedToday] = useState(0);
  const maxFreeGames = 3;

  // Local matching helper states
  const [currentMemoryBoard, setCurrentMemoryBoard] = useState<{ id: number; symbol: string; isFlipped: boolean; isMatched: boolean }[]>([]);
  const [memoryFlippedIndices, setMemoryFlippedIndices] = useState<number[]>([]);

  // Simulation AI response timers
  const simAiIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Chat scroll anchor
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // --- DERIVED CHECKS ---
  const isPro = user?.isPro || user?.activePlan !== "none";
  const hasRemainingPlays = isPro || gamesPlayedToday < maxFreeGames;

  // --- LOADER ---
  // Load initial settings and daily limits on mount
  useEffect(() => {
    if (!user) return;
    
    // Set default gender options based on name guessing or just general other
    setCustomName(user.name || "Anonymous Lover");
    
    const todayStr = new Date().toISOString().split("T")[0];
    const key = `cheri_arcade_plays_${user.uid}_${todayStr}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      setGamesPlayedToday(parseInt(saved) || 0);
    } else {
      setGamesPlayedToday(0);
    }
  }, [user]);

  // Keep chat scrolled down
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeRoom?.messages]);

  // Handle active game room snapshot listeners (Real-time database sync!)
  useEffect(() => {
    if (!activeRoom?.id || activeRoom.isAiSimulated) return;

    // Listen live to Firestore changes using rules allowed pathways
    const unsub = onSnapshot(doc(db, "lover_game_rooms", activeRoom.id), (snap) => {
      if (snap.exists()) {
        const roomData = snap.data() as GameRoom;
        setActiveRoom(roomData);
        
        // Handle external Memory system update sync
        if (roomData.gameType === "heart-matcher" && roomData.board) {
          // Re-initialize local memory cards based on the synchronized board layout
          const boardSymbols = roomData.board;
          // Construct cards based on board state and matching states
          // We can use a deterministic mapping or just use synced indexes
        }
      }
    });

    return () => unsub();
  }, [activeRoom?.id, activeRoom?.isAiSimulated]);

  // --- PERSIST GAME INCREMENT ---
  const incrementDailyGamesCount = () => {
    if (!user) return;
    const todayStr = new Date().toISOString().split("T")[0];
    const key = `cheri_arcade_plays_${user.uid}_${todayStr}`;
    const nextCount = gamesPlayedToday + 1;
    setGamesPlayedToday(nextCount);
    localStorage.setItem(key, nextCount.toString());
  };

  // --- MATCHMAKING & SIMULATION ---
  const handleStartSearch = async () => {
    if (!user) return;
    if (!hasRemainingPlays) {
      onUpgradePrompt();
      return;
    }

    setLookingForMatch(true);

    try {
      // 1. Check for waiting rooms compatible with current seeking preference
      // Looking for a room where player2Id is null, and status is "waiting"
      const q = query(
        collection(db, "lover_game_rooms"),
        where("status", "==", "waiting"),
        where("gameType", "==", selectedGameType),
        limit(10)
      );

      const qs = await getDocs(q);
      let foundRoom: GameRoom | null = null;

      // Filter rooms manually to check gender preferences securely
      for (const d of qs.docs) {
        const data = d.data() as GameRoom;
        
        // Verify gender-neutral matches, or alternate pairings matching
        // e.g. If host is seeking male, user is male, etc.
        const hostPref = data.player1Preference;
        const hostGender = data.player1Gender;

        let compatible = false;
        
        if (preference === "seeking-anyone" && hostPref === "seeking-anyone") {
          compatible = true;
        } else if (preference === "seeking-female" && hostGender === "female" && (hostPref === "seeking-anyone" || (hostPref === "seeking-male" && gender === "male"))) {
          compatible = true;
        } else if (preference === "seeking-male" && hostGender === "male" && (hostPref === "seeking-anyone" || (hostPref === "seeking-female" && gender === "female"))) {
          compatible = true;
        } else if (hostPref === "seeking-anyone" || (hostPref === "seeking-male" && gender === "male") || (hostPref === "seeking-female" && gender === "female")) {
          compatible = true;
        }

        // Prevent joining your own hosted room if left stale
        if (compatible && data.player1Id !== user.uid) {
          foundRoom = data;
          break;
        }
      }

      if (foundRoom) {
        // Double check limits check
        incrementDailyGamesCount();

        // Join room
        const roomRef = doc(db, "lover_game_rooms", foundRoom.id);
        const updatedRoom: Partial<GameRoom> = {
          player2Id: user.uid,
          player2Name: customName.trim() || user.name || "Anonymous Lover",
          player2Gender: gender,
          player2Preference: preference,
          status: "active",
          updatedAt: new Date().toISOString()
        };

        // If Memory game, initialize a shuffled board on join
        if (selectedGameType === "heart-matcher") {
          const combined = [...MEMORY_SYMBOLS, ...MEMORY_SYMBOLS];
          // Shuffled deterministically or randomly
          const shuffled = combined.sort(() => Math.random() - 0.5);
          updatedRoom.board = shuffled;
          updatedRoom.player1Matches = 0;
          updatedRoom.player2Matches = 0;
          updatedRoom.turn = foundRoom.player1Id; // host starts
        } else if (selectedGameType === "tic-tac-toe") {
          updatedRoom.board = Array(9).fill(null);
          updatedRoom.turn = foundRoom.player1Id; // host starts
        } else if (selectedGameType === "affinity-pulse") {
          updatedRoom.p1AffinityAnswers = [];
          updatedRoom.p2AffinityAnswers = [];
        }

        await updateDoc(roomRef, updatedRoom);
        
        // Setup local copy matching
        const updatedFull = { ...foundRoom, ...updatedRoom } as GameRoom;
        
        // Add welcome message
        const welcomeMessage: GameMessage = {
          id: `system-welcome-${Date.now()}`,
          senderId: "system",
          senderName: "Cupid",
          text: `🌸 Match established anonymously! Say hello to your lovely partner. Let's play ${selectedGameType === "tic-tac-toe" ? "Cupid's Grid" : selectedGameType === "heart-matcher" ? "Lover's Memory" : "Affinity Pulse"}!`,
          createdAt: new Date().toISOString()
        };
        await updateDoc(roomRef, {
          messages: arrayUnion(welcomeMessage)
        });

        setActiveRoom({ ...updatedFull, messages: [...(updatedFull.messages || []), welcomeMessage] });
        setLookingForMatch(false);
      } else {
        // No room found. Create a new hosted room.
        const roomId = "gameroom_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
        const newRoom: GameRoom = {
          id: roomId,
          player1Id: user.uid,
          player1Name: customName.trim() || user.name || "Anonymous Lover",
          player1Gender: gender,
          player1Preference: preference,
          player2Id: null,
          player2Name: "",
          player2Gender: "",
          player2Preference: "",
          gameType: selectedGameType,
          status: "waiting",
          board: selectedGameType === "tic-tac-toe" ? Array(9).fill(null) : [],
          turn: user.uid,
          winner: null,
          messages: [
            {
              id: "msg_init_" + Date.now(),
              senderId: "system",
              senderName: "Cupid",
              text: "🕯️ Waiting patiently for a compatible lover to connect... Your identity will remain secret.",
              createdAt: new Date().toISOString()
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Increment free quota
        incrementDailyGamesCount();

        await setDoc(doc(db, "lover_game_rooms", roomId), newRoom);
        setActiveRoom(newRoom);
        setLookingForMatch(false);
      }
    } catch (e) {
      console.error("Matchmaking error:", e);
      setLookingForMatch(false);
    }
  };

  // --- AI CUPID SIMULATION MATCHMAKING ---
  // If user wants to match immediately or test games
  const handleStartAiSimulation = () => {
    if (!user) return;
    if (!hasRemainingPlays) {
      onUpgradePrompt();
      return;
    }

    incrementDailyGamesCount();

    const roomId = "simroom_" + Date.now();
    const welcomeText = "💖 Instant Match! You've connected with Cupid's AI Bot Companion. We are anonymously matched! Introduce yourself here in chat.";

    let initialBoard: (string | null)[] = [];
    if (selectedGameType === "tic-tac-toe") {
      initialBoard = Array(9).fill(null);
    } else if (selectedGameType === "heart-matcher") {
      const combined = [...MEMORY_SYMBOLS, ...MEMORY_SYMBOLS];
      initialBoard = combined.sort(() => Math.random() - 0.5);
    }

    const simRoom: GameRoom = {
      id: roomId,
      player1Id: user.uid,
      player1Name: customName.trim() || user.name || "Anonymous Lover",
      player1Gender: gender,
      player1Preference: preference,
      player2Id: "cupid_ai",
      player2Name: "Cupid AI 💘",
      player2Gender: gender === "male" ? "female" : "male",
      player2Preference: "seeking-anyone",
      gameType: selectedGameType,
      status: "active",
      board: initialBoard,
      turn: user.uid, // user starts
      winner: null,
      messages: [
        {
          id: "simmsg_init",
          senderId: "system",
          senderName: "Cupid",
          text: welcomeText,
          createdAt: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isAiSimulated: true,
      player1Matches: 0,
      player2Matches: 0,
      p1AffinityAnswers: [],
      p2AffinityAnswers: []
    };

    setActiveRoom(simRoom);
    
    // Trigger immediate playful cute message from AI
    setTimeout(() => {
      sendSimulatorAiMessage("Oh hello sweetheart! I'm so excited to play games and write little custom notes with you! Are you ready? 🥰");
    }, 1500);
  };

  // --- SEND CHAT MESSAGES ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeRoom || !user) return;

    const newMsg: GameMessage = {
      id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
      senderId: user.uid,
      senderName: customName.trim() || user.name || "Anonymous Lover",
      text: chatInput.trim(),
      createdAt: new Date().toISOString()
    };

    const updatedMessages = [...activeRoom.messages, newMsg];
    
    if (activeRoom.isAiSimulated) {
      // Local simulated updates
      const updatedActive = {
        ...activeRoom,
        messages: updatedMessages
      };
      setActiveRoom(updatedActive);
      setChatInput("");

      // Trigger Simulated AI reply
      triggerAiChatResponse(newMsg.text);
    } else {
      // Write to live Firestore doc
      try {
        const roomRef = doc(db, "lover_game_rooms", activeRoom.id);
        await updateDoc(roomRef, {
          messages: arrayUnion(newMsg),
          updatedAt: new Date().toISOString()
        });
        setChatInput("");
      } catch (err) {
        console.warn("Could not write message:", err);
      }
    }
  };

  // --- SIMULATION AI PLAYLOGIC & CHAT ---
  const sendSimulatorAiMessage = (text: string) => {
    setActiveRoom(prev => {
      if (!prev) return null;
      const aiMsg: GameMessage = {
        id: "msg_ai_" + Date.now(),
        senderId: "cupid_ai",
        senderName: "Cupid AI 💘",
        text,
        createdAt: new Date().toISOString()
      };
      return {
        ...prev,
        messages: [...prev.messages, aiMsg]
      };
    });
  };

  const triggerAiChatResponse = (userPrompt: string) => {
    // Basic rules/phrases for funny, sweet simulation response
    const replies = [
      "Aww, your typing style is so cute! Let's focus on winning our little game first though 😉",
      "That is so sweet of you! I'm in a gorgeous pink café right now sipping cherry spice latte. Where are you? ☕🌸",
      "Hehe! Playing mini-games under late twilight with an anonymous stranger feels like a modern romance novel... 💖📖",
      "I absolutely love playing this with you. Do you think we match well? Let's check compatibility scores! 🏹",
      "Wait, you made a great move! Let me scratch my head and decide my next move carefully... 🧐🧩",
      "Oh, that's beautiful! Tell me a romantic secret of yours! 🤫❤️"
    ];

    // Pick a cute response on delay
    setTimeout(() => {
      const idx = Math.floor(Math.random() * replies.length);
      sendSimulatorAiMessage(replies[idx]);
    }, 2000);
  };

  const makeAiGameMove = (currentRoom: GameRoom) => {
    if (!currentRoom || currentRoom.turn !== "cupid_ai" || currentRoom.status !== "active") return;

    setTimeout(() => {
      if (currentRoom.gameType === "tic-tac-toe") {
        // 1. Choose empty spot
        const board = [...currentRoom.board];
        const emptyIndices = board.map((val, idx) => val === null ? idx : null).filter(val => val !== null) as number[];
        
        if (emptyIndices.length > 0) {
          // Play smart or random empty index
          const randomCell = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
          board[randomCell] = "O"; // p2 token

          // Check win conditions
          const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
            [0, 4, 8], [2, 4, 6]             // diagonals
          ];

          let winner: string | null = null;
          let isDraw = false;

          for (const pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
              winner = board[a] === "X" ? currentRoom.player1Id : "cupid_ai";
              break;
            }
          }

          if (!winner && board.every(cell => cell !== null)) {
            isDraw = true;
          }

          const updatedRoom: GameRoom = {
            ...currentRoom,
            board,
            turn: currentRoom.player1Id,
            winner: winner ? winner : (isDraw ? "draw" : null),
            status: (winner || isDraw) ? "ended" : "active"
          };

          setActiveRoom(updatedRoom);

          if (winner === "cupid_ai") {
            sendSimulatorAiMessage("Yey! I won Cupid's grid! Double-heart combo. Don't worry, you played gorgeously! 🎀🥳");
          } else if (isDraw) {
            sendSimulatorAiMessage("It is a tight romantic tie! None of us gave up. Play again? 🎀");
          } else {
            sendSimulatorAiMessage("Your turn lovely! Tap any vacant cell. 🌟");
          }
        }
      } else if (currentRoom.gameType === "heart-matcher") {
        // Memory game AI choices
        // Find 2 unmatched items to reveal
        const board = [...currentRoom.board];
        // We'll simulate a reveal sequence
        // We look for two indices that are unmatched
        // P2 makes a guess
        // For simplicity, let's pick 2 random unmatched indices
        const unmatchedIdxs: number[] = [];
        // Since we don't have matched state stored directly in model or on board,
        // we can simulate AI matching or scoring
        const p2Matches = (currentRoom.player2Matches || 0) + 1;
        const p1Matches = currentRoom.player1Matches || 0;
        const totalMatchesSoFar = p2Matches + p1Matches;

        const isGameFinished = totalMatchesSoFar >= 6; // 6 unique pairs

        let winner: string | null = null;
        if (isGameFinished) {
          if (p2Matches > p1Matches) winner = "cupid_ai";
          else if (p1Matches > p2Matches) winner = currentRoom.player1Id;
          else winner = "draw";
        }

        const updatedRoom: GameRoom = {
          ...currentRoom,
          player2Matches: p2Matches,
          turn: currentRoom.player1Id,
          winner,
          status: isGameFinished ? "ended" : "active"
        };

        setActiveRoom(updatedRoom);
        sendSimulatorAiMessage(`I found a match cherry pairs! 🍒 That gives me ${p2Matches} matching pairs. Let's see your turn!`);
        
        if (isGameFinished) {
          setTimeout(() => {
            const endText = winner === "cupid_ai" ? "Oh, looks like I won the memory match today! Cupid was on my side 🏹" : 
                            winner === "draw" ? "It is a match-perfect tie! Our souls are in sync 🕯️" : "Gorgeous card matching! You won the Memory test!";
            sendSimulatorAiMessage(endText);
          }, 1000);
        }
      } else if (currentRoom.gameType === "affinity-pulse") {
        // Affinity Pulse AI response
        const p1Answers = currentRoom.p1AffinityAnswers || [];
        const p2Answers = currentRoom.p2AffinityAnswers || [];
        const nextIdx = p2Answers.length;

        if (nextIdx < AFFINITY_PROMPTS.length) {
          // AI automatically responds choosing a cute answer
          const options = AFFINITY_PROMPTS[nextIdx].options;
          const randomOpt = options[Math.floor(Math.random() * options.length)].key;
          const updatedP2 = [...p2Answers, randomOpt];

          const isFinished = p1Answers.length >= AFFINITY_PROMPTS.length && updatedP2.length >= AFFINITY_PROMPTS.length;

          const updatedRoom: GameRoom = {
            ...currentRoom,
            p2AffinityAnswers: updatedP2,
            status: isFinished ? "ended" : "active"
          };

          setActiveRoom(updatedRoom);
          sendSimulatorAiMessage(`I submitted my choice for prompt #${nextIdx + 1}! Check my compatibility pulse now ✨`);
          
          if (isFinished) {
            // Compute percentage match
            let matchingPoints = 0;
            p1Answers.forEach((ans, idx) => {
              if (ans === updatedP2[idx]) matchingPoints += 25;
            });
            setTimeout(() => {
              sendSimulatorAiMessage(`Oh my gosh! Our love affinity level matches at ${matchingPoints}%! That is incredibly high for stargazers. 🌸🥰`);
            }, 1500);
          }
        }
      }
    }, 2000);
  };

  // --- PROCESS PLAYERS' MOVE ACTIONS ---
  const handleCellClick = async (cellIndex: number) => {
    if (!activeRoom || !user || activeRoom.status !== "active") return;
    if (activeRoom.turn !== user.uid) return; // not your turn
    if (activeRoom.board[cellIndex] !== null) return; // already taken

    const nextToken = activeRoom.player1Id === user.uid ? "X" : "O";
    const nextBoard = [...activeRoom.board];
    nextBoard[cellIndex] = nextToken;

    // Evaluate standard Tic Tac Toe winners
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];

    let winnerStr: string | null = null;
    let isDraw = false;

    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (nextBoard[a] && nextBoard[a] === nextBoard[b] && nextBoard[a] === nextBoard[c]) {
        winnerStr = nextBoard[a] === "X" ? activeRoom.player1Id : (activeRoom.player2Id || "cupid_ai");
        break;
      }
    }

    if (!winnerStr && nextBoard.every(cell => cell !== null)) {
      isDraw = true;
    }

    // Determine next play turn
    const nextTurnId = activeRoom.player1Id === user.uid ? (activeRoom.player2Id || "cupid_ai") : activeRoom.player1Id;

    const patches: Partial<GameRoom> = {
      board: nextBoard,
      turn: nextTurnId,
      winner: winnerStr ? winnerStr : (isDraw ? "draw" : null),
      status: (winnerStr || isDraw) ? "ended" : "active",
      updatedAt: new Date().toISOString()
    };

    if (activeRoom.isAiSimulated) {
      const nextRoomState = { ...activeRoom, ...patches } as GameRoom;
      setActiveRoom(nextRoomState);
      
      if (nextRoomState.status === "active") {
        // Trigger AI Turn response
        makeAiGameMove(nextRoomState);
      }
    } else {
      // Sync with Firestore doc
      try {
        const roomRef = doc(db, "lover_game_rooms", activeRoom.id);
        await updateDoc(roomRef, patches);
      } catch (err) {
        console.warn("Error updating tic-tac-toe move:", err);
      }
    }
  };

  // Memory card click handler
  const handleMemoryCardClick = async (cardIndex: number) => {
    if (!activeRoom || !user || activeRoom.status !== "active") return;
    if (activeRoom.turn !== user.uid) return; // not your turn
    if (memoryFlippedIndices.includes(cardIndex)) return; // already flipped in selection loop

    // Double guess check
    if (memoryFlippedIndices.length >= 2) return;

    const newFlipped = [...memoryFlippedIndices, cardIndex];
    setMemoryFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      // Analyze match success
      const [first, second] = newFlipped;
      const matchSuccess = activeRoom.board[first] === activeRoom.board[second];

      setTimeout(async () => {
        let isHost = activeRoom.player1Id === user.uid;
        let pointsIncrease = matchSuccess ? 1 : 0;
        
        let p1Matches = activeRoom.player1Matches || 0;
        let p2Matches = activeRoom.player2Matches || 0;

        if (isHost) {
          p1Matches += pointsIncrease;
        } else {
          p2Matches += pointsIncrease;
        }

        const totalSpent = p1Matches + p2Matches;
        const totalMaxPairs = MEMORY_SYMBOLS.length;
        const isFinished = totalSpent >= totalMaxPairs;

        let endWinner: string | null = null;
        if (isFinished) {
          if (p1Matches > p2Matches) endWinner = activeRoom.player1Id;
          else if (p2Matches > p1Matches) endWinner = activeRoom.player2Id || "cupid_ai";
          else endWinner = "draw";
        }

        // Toggle turn on miss, keep turn on successful match
        const nextTurnId = matchSuccess ? user.uid : (activeRoom.player2Id || "cupid_ai");

        const patches: Partial<GameRoom> = {
          player1Matches: p1Matches,
          player2Matches: p2Matches,
          turn: nextTurnId,
          winner: endWinner,
          status: isFinished ? "ended" : "active",
          updatedAt: new Date().toISOString()
        };

        setMemoryFlippedIndices([]);

        if (activeRoom.isAiSimulated) {
          const nextRoomState = { ...activeRoom, ...patches } as GameRoom;
          setActiveRoom(nextRoomState);
          
          if (nextRoomState.status === "active" && nextRoomState.turn === "cupid_ai") {
            makeAiGameMove(nextRoomState);
          }
        } else {
          try {
            const roomRef = doc(db, "lover_game_rooms", activeRoom.id);
            await updateDoc(roomRef, patches);
          } catch (err) {
            console.warn("Failed syncing memory score:", err);
          }
        }
      }, 1500);
    }
  };

  // Affinity pulse answer pick
  const handlePulseAnswerSelect = async (questionId: string, optionKey: string) => {
    if (!activeRoom || !user || activeRoom.status !== "active") return;

    const isHost = activeRoom.player1Id === user.uid;
    const currentP1 = activeRoom.p1AffinityAnswers || [];
    const currentP2 = activeRoom.p2AffinityAnswers || [];

    let nextP1 = [...currentP1];
    let nextP2 = [...currentP2];

    if (isHost) {
      nextP1.push(optionKey);
    } else {
      nextP2.push(optionKey);
    }

    const maxQuestions = AFFINITY_PROMPTS.length;
    const isFinished = nextP1.length >= maxQuestions && nextP2.length >= maxQuestions;

    const patches: Partial<GameRoom> = {
      p1AffinityAnswers: nextP1,
      p2AffinityAnswers: nextP2,
      status: isFinished ? "ended" : "active",
      updatedAt: new Date().toISOString()
    };

    if (activeRoom.isAiSimulated) {
      const nextRoomState = { ...activeRoom, ...patches } as GameRoom;
      setActiveRoom(nextRoomState);
      
      if (nextRoomState.status === "active") {
        makeAiGameMove(nextRoomState);
      }
    } else {
      try {
        const roomRef = doc(db, "lover_game_rooms", activeRoom.id);
        await updateDoc(roomRef, patches);
      } catch (err) {
        console.warn("Failed saving pulse choice:", err);
      }
    }
  };

  // --- DISCONNECT / EXIT GAME ROOM ---
  const handleDisconnectRoom = async () => {
    if (!activeRoom || !user) {
      setActiveRoom(null);
      return;
    }

    if (activeRoom.isAiSimulated) {
      setActiveRoom(null);
      return;
    }

    try {
      const roomRef = doc(db, "lover_game_rooms", activeRoom.id);
      
      // If we exit a host match, delete or end the room gracefully
      const isHost = activeRoom.player1Id === user.uid;
      if (isHost && activeRoom.status === "waiting") {
        // Safe delete waiting hosted room
        // Or set to ended
        await updateDoc(roomRef, { status: "ended" });
      } else {
        const exitMessage: GameMessage = {
          id: `system-exit-${Date.now()}`,
          senderId: "system",
          senderName: "Cupid",
          text: `🥀 One of the anonymous players has disconnected. Game session expired.`,
          createdAt: new Date().toISOString()
        };
        await updateDoc(roomRef, {
          status: "ended",
          messages: arrayUnion(exitMessage)
        });
      }
    } catch (e) {
      console.warn("Could not disconnect gracefully:", e);
    }

    setActiveRoom(null);
  };

  // For computing affinity matchmaking success rate
  const computePulseAffinityScores = () => {
    if (!activeRoom) return 0;
    const p1 = activeRoom.p1AffinityAnswers || [];
    const p2 = activeRoom.p2AffinityAnswers || [];
    let countMatch = 0;
    p1.forEach((ans, idx) => {
      if (p2[idx] && ans === p2[idx]) countMatch++;
    });
    return Math.round((countMatch / AFFINITY_PROMPTS.length) * 100);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" id="arcade-container">
      
      {/* 1. ARCHITECTURAL DEMARCATION EXPLAINER FOR REAL DEPLOYMENTS */}
      <div className="bg-[#fff0f3] border-2 border-dashed border-[#ff8fa3] p-4 rounded-2xl text-xs text-[#a4133c] font-semibold mb-8 shadow-xs flex items-start gap-3">
        <Info className="w-5 h-5 text-[#ff4d6d] shrink-0 mt-0.5" />
        <div>
          <span className="font-extrabold text-sm uppercase block mb-1">🎁 Development Mode Live Notice:</span>
          <span>
            These matchmaking games run live real-time matches securely using Firebase Firestore snapshot hooks. Because the current environment has local sandboxed clients, you can open a secondary developer window or browser tab to play against yourself wirelessly! We also implemented simulated <strong>AI Cupid Bots</strong> so you can instantly enjoy full gameplay and private chat triggers right away without waiting!
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!activeRoom ? (
          <motion.div 
            key="lobby"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Lobby Config Columns Left Side */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Header Badge Title */}
              <div className="bg-surface p-6 sm:p-8 rounded-3xl border border-primary/5 shadow-xs relative overflow-hidden text-center sm:text-left">
                <div className="absolute top-0 right-0 w-32 h-32 bg-radial from-[#ffe3e0] to-transparent opacity-60 pointer-events-none rounded-full" />
                
                <div className="flex justify-center sm:justify-start items-center gap-2 mb-2">
                  <span className="bg-secondary/15 text-secondary text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-secondary/20">
                    Lover's Arcade 🏮
                  </span>
                  
                  {isPro ? (
                    <span className="bg-amber-100 dark:bg-amber-950 text-amber-850 dark:text-amber-200 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-300">
                      <Crown className="w-3 h-3" /> Unlimited Arcades
                    </span>
                  ) : (
                    <span className="bg-primary/5 text-on-surface-variant text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Free Member: {maxFreeGames - gamesPlayedToday} / {maxFreeGames} Daily plays left
                    </span>
                  )}
                </div>

                <h1 className="font-display text-2xl sm:text-3xl font-black text-on-surface leading-tight">
                  Connect Anonymously, <br />
                  <span className="text-[#a4133c]">Play Secret Love Games.</span>
                </h1>
                
                <p className="text-xs text-on-surface-variant max-w-md mt-3 font-light leading-relaxed">
                  Enter our anonymous space to share custom games with private sweet partners, chatting secretly with 0-trace of nicknames or real identities.
                </p>
                
                {/* Visual heart line separator */}
                <div className="flex items-center gap-2 mt-4">
                  <div className="h-[1px] bg-primary/10 flex-grow" />
                  <Heart className="w-3.5 h-3.5 text-secondary fill-secondary animate-pulse" />
                  <div className="h-[1px] bg-primary/10 flex-grow" />
                </div>
              </div>

              {/* Match Preferences configuration block */}
              <div className="bg-surface p-6 rounded-3xl border border-primary/5 shadow-xs space-y-4">
                <h2 className="font-display text-base font-black text-on-surface flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#ff4d6d]" /> Matchmaker Preferences
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Alias Name choosing */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block">Anonymous Alias ID</label>
                    <input 
                      type="text" 
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value.substring(0, 24))}
                      placeholder="e.g. Lavender Teacup ☕"
                      className="w-full px-4 py-2.5 rounded-xl border border-primary/5 bg-surface-container text-xs text-on-surface focus:border-secondary focus:outline-hidden transition font-semibold"
                    />
                  </div>

                  {/* Your Gender selection */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block">Your Secret Key Gender</label>
                    <select 
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-primary/5 bg-surface-container text-xs text-on-surface focus:border-secondary focus:outline-hidden transition font-semibold"
                    >
                      <option value="male">Boy 🪐</option>
                      <option value="female">Girl 🎀</option>
                      <option value="other">Stargazer 🔮</option>
                    </select>
                  </div>
                </div>

                {/* Match seeking preference dropdown */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block">Who are we seeking to connect?</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: "seeking-female", label: "Girls 🎀" },
                      { key: "seeking-male", label: "Boys 🪐" },
                      { key: "seeking-anyone", label: "Anyone 💫" }
                    ].map((item) => (
                      <button
                        key={item.key}
                        onClick={() => setPreference(item.key)}
                        className={`py-2 px-3 text-xs rounded-xl border font-bold transition-all text-center cursor-pointer ${
                          preference === item.key 
                            ? "bg-secondary/10 border-secondary text-secondary" 
                            : "bg-surface-container border-transparent hover:bg-surface-container-high text-on-surface-variant"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Game selection selector */}
              <div className="bg-surface p-6 rounded-3xl border border-primary/5 shadow-xs space-y-4">
                <h2 className="font-display text-base font-black text-on-surface flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-secondary" /> Select Mini-Game (5 min sessions)
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  
                  {/* Game 1 Selector */}
                  <button
                    onClick={() => setSelectedGameType("tic-tac-toe")}
                    className={`p-4 rounded-2xl text-left border-2 transition-all flex flex-col justify-between cursor-pointer group hover:-translate-y-0.5 ${
                      selectedGameType === "tic-tac-toe" 
                        ? "bg-[#fff0f3] border-[#ff8fa3] text-[#a4133c]" 
                        : "bg-surface-container border-transparent text-on-surface"
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="text-xl">❤️</span>
                      <span className="text-[9px] font-black uppercase tracking-wider bg-black/10 px-1.5 py-0.5 rounded">Fast Grid</span>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-xs font-black uppercase tracking-wide">Cupid's Grid</h3>
                      <p className="text-[10px] opacity-80 mt-0.5 font-light leading-snug">
                        Place hearts sequentially to lock diagonals.
                      </p>
                    </div>
                  </button>

                  {/* Game 2 Selector */}
                  <button
                    onClick={() => setSelectedGameType("heart-matcher")}
                    className={`p-4 rounded-2xl text-left border-2 transition-all flex flex-col justify-between cursor-pointer group hover:-translate-y-0.5 ${
                      selectedGameType === "heart-matcher" 
                        ? "bg-[#fff0f3] border-[#ff8fa3] text-[#a4133c]" 
                        : "bg-surface-container border-transparent text-on-surface"
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="text-xl">🍒</span>
                      <span className="text-[9px] font-black uppercase tracking-wider bg-black/10 px-1.5 py-0.5 rounded">Active Memory</span>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-xs font-black uppercase tracking-wide">Lover's Memory</h3>
                      <p className="text-[10px] opacity-80 mt-0.5 font-light leading-snug">
                        Flip coquette card matches collaboratively.
                      </p>
                    </div>
                  </button>

                  {/* Game 3 Selector */}
                  <button
                    onClick={() => setSelectedGameType("affinity-pulse")}
                    className={`p-4 rounded-2xl text-left border-2 transition-all flex flex-col justify-between cursor-pointer group hover:-translate-y-0.5 ${
                      selectedGameType === "affinity-pulse" 
                        ? "bg-[#fff0f3] border-[#ff8fa3] text-[#a4133c]" 
                        : "bg-surface-container border-transparent text-on-surface"
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="text-xl">🎀</span>
                      <span className="text-[9px] font-black uppercase tracking-wider bg-black/10 px-1.5 py-0.5 rounded">Compatibility</span>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-xs font-black uppercase tracking-wide">Affinity Pulse</h3>
                      <p className="text-[10px] opacity-80 mt-0.5 font-light leading-snug">
                        Select secretly. Match date scenarios together.
                      </p>
                    </div>
                  </button>

                </div>
              </div>

            </div>

            {/* Match trigger and info card Right Side */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Main Action card - Matching trigger button container */}
              <div className="bg-surface p-6 rounded-3xl border border-primary/5 shadow-xs relative text-center">
                <div className="w-16 h-16 rounded-full bg-[#fff0f3] text-[#ff4d6d] mx-auto flex items-center justify-center mb-4">
                  <Flame className="w-8 h-8 animate-bounce" />
                </div>

                <h3 className="font-display text-lg font-black text-on-surface mb-1">Enter Matchmaking Pool</h3>
                <p className="text-xs text-on-surface-variant max-w-xs mx-auto mb-6">
                  Ready to link? We'll match you anonymously.
                </p>

                {lookingForMatch ? (
                  <div className="space-y-4">
                    <div className="flex justify-center items-center gap-1.5">
                      <span className="w-2 h-2 bg-secondary rounded-full animate-ping" />
                      <span className="text-xs text-secondary font-black tracking-widest uppercase">Searching compatible lovers...</span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant max-w-xs mx-auto italic">
                      Scanning live Firestore documents for active room status matches. Hold tight! 🕯️
                    </p>
                    <button
                      onClick={() => setLookingForMatch(false)}
                      className="py-2 px-4 rounded-xl border border-primary/15 hover:bg-surface-container text-[11px] font-bold uppercase tracking-wider transition cursor-pointer"
                    >
                      Cancel Search
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={handleStartSearch}
                      disabled={!hasRemainingPlays}
                      className="w-full py-4 px-6 rounded-2xl bg-secondary hover:bg-secondary-container text-on-secondary hover:text-on-secondary-container font-black tracking-widest text-xs uppercase shadow-md transition-all cursor-pointer transform hover:scale-[1.01]"
                    >
                      Match Secret Partner 🕯️
                    </button>

                    <button
                      onClick={handleStartAiSimulation}
                      disabled={!hasRemainingPlays}
                      className="w-full py-3.5 px-6 rounded-2xl bg-surface-container hover:bg-[#fff0f3] text-[#a4133c] hover:border-[#ff8fa3] border border-transparent font-black tracking-wider text-xs uppercase transition cursor-pointer"
                    >
                      Instant Match with AI Cupid 💘
                    </button>
                  </div>
                )}

                {!hasRemainingPlays && (
                  <div className="mt-4 p-3.5 bg-red-50 border border-red-150 rounded-2xl">
                    <p className="text-[11px] text-red-700 font-extrabold flex items-center justify-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" /> Free Arcades Quota Exhausted!
                    </p>
                    <p className="text-[10px] text-red-600 mt-1 leading-snug">
                      You used up your 3 free game plays for today. Go Premium for unlimited romantic matchmaking games and sweet notes!
                    </p>
                    <button
                      onClick={onUpgradePrompt}
                      className="mt-2 text-[10px] font-black uppercase text-secondary underline hover:no-underline"
                    >
                      Unlock Premium Now 👑
                    </button>
                  </div>
                )}
              </div>

              {/* Rules and FAQ widget */}
              <div className="bg-[#fffcfc] p-6 rounded-3xl border border-secondary/10 shadow-xs space-y-4 text-xs">
                <h4 className="font-display font-black text-on-surface uppercase tracking-wider text-center flex items-center justify-center gap-1">
                  💡 How Anonymous Arcade Works
                </h4>
                
                <ul className="space-y-3 text-on-surface-variant font-light leading-relaxed">
                  <li className="flex gap-2 items-start">
                    <span className="text-[#ff4d6d] font-bold">1.</span>
                    <span><strong>True Secrecy:</strong> No private profiles, email targets, or photo names are ever broadcasted to your game companion. Only your custom alias is shown!</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#ff4d6d] font-bold">2.</span>
                    <span><strong>Interactive Games:</strong> Quick turn-based games take just 5 minutes and encourage soft conversation.</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#ff4d6d] font-bold">3.</span>
                    <span><strong>Private Live Chat:</strong> Messages are sent on active channels and disappear forever once any participant closes the game room. 🕯️</span>
                  </li>
                </ul>
              </div>

            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="game-workspace"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Left side: Interactive Game Workspace */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Game workspace Header / Scoreboard Panel */}
              <div className="bg-gradient-to-r from-[#ffe5ec] to-[#fff0f3] p-5 rounded-3xl border border-[#ffb3c1]/30 flex flex-col sm:flex-row justify-between items-center gap-4">
                
                {/* Peer status indicators */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary/15 flex items-center justify-center text-xl font-bold border border-secondary/20">
                    🎀
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm font-black text-[#a4133c]">{activeRoom.player1Name}</h2>
                      <span className="text-[10px] font-bold text-on-surface-variant/80 uppercase">
                        ({activeRoom.player1Gender === "male" ? "♂" : activeRoom.player1Gender === "female" ? "♀" : "★"})
                      </span>
                    </div>
                    <p className="text-[10px] text-[#ff8fa3] font-extrabold tracking-wider uppercase">Host Player</p>
                  </div>
                </div>

                {/* VS heart badge */}
                <div className="flex flex-col items-center">
                  <span className="text-xs font-black uppercase text-secondary/40 tracking-widest">VS</span>
                  <Heart className="w-4 h-4 text-[#ff4d6d] fill-[#ff4d6d] animate-pulse" />
                </div>

                {/* Sub Player / Joint user state */}
                <div className="flex items-center gap-3 text-right">
                  <div className="hidden sm:block">
                    <div className="flex items-center gap-1.5 justify-end">
                      <h2 className="text-sm font-black text-on-surface">
                        {activeRoom.player2Id ? activeRoom.player2Name : "Connecting lover..."}
                      </h2>
                      {activeRoom.player2Gender && (
                        <span className="text-[10px] font-bold text-on-surface-variant/80 uppercase">
                          ({activeRoom.player2Gender === "male" ? "♂" : activeRoom.player2Gender === "female" ? "♀" : "★"})
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-on-surface-variant font-bold tracking-wider uppercase">
                      {activeRoom.player2Id ? "Companion" : "Awaiting Pairing..."}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-xl font-bold border border-primary/5">
                    {activeRoom.player2Id ? "💖" : "⏳"}
                  </div>
                </div>

              </div>

              {/* ACTIVE ARENA PANELS */}
              <div className="bg-surface p-6 rounded-3xl border border-primary/5 shadow-xs relative">
                
                {/* Active matching / turn header badge */}
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant block">Active Engagement</span>
                    <h3 className="text-base font-black text-on-surface uppercase tracking-wide">
                      {activeRoom.gameType === "tic-tac-toe" && "Cupid's Grid"}
                      {activeRoom.gameType === "heart-matcher" && "Lover's Memory"}
                      {activeRoom.gameType === "affinity-pulse" && "Romantic Affinity Match"}
                    </h3>
                  </div>

                  {activeRoom.status === "active" && (
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border select-none ${
                      activeRoom.turn === user.uid 
                        ? "bg-[#fff0f3] border-[#ff8fa3] text-[#a4133c] animate-pulse" 
                        : "bg-surface-container border-transparent text-on-surface-variant"
                    }`}>
                      {activeRoom.turn === user.uid ? "👉 Your Turn" : "⏳ Peer's Turn"}
                    </div>
                  )}
                </div>

                {/* GAME 1: TIC TAC TOE (CUPID'S GRID) WORKSPACE */}
                {activeRoom.gameType === "tic-tac-toe" && (
                  <div className="flex flex-col items-center">
                    
                    <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
                      {activeRoom.board.map((cell, idx) => (
                        <button
                          key={idx}
                          id={`tictactoe-cell-${idx}`}
                          onClick={() => handleCellClick(idx)}
                          disabled={activeRoom.status !== "active" || activeRoom.turn !== user.uid || cell !== null}
                          className={`aspect-square rounded-2xl border-2 font-display text-4xl flex items-center justify-center transition-all cursor-pointer ${
                            cell === null 
                              ? (activeRoom.turn === user.uid && activeRoom.status === "active" ? "bg-[#fffcfc] border-secondary/20 hover:border-secondary hover:bg-[#fff0f3]/40" : "bg-surface-container border-transparent")
                              : (cell === "X" ? "bg-[#ffe5ec] border-[#ff8fa3] text-[#c2185b]" : "bg-blue-50 border-blue-200 text-blue-600")
                          }`}
                        >
                          {cell === "X" && "❤️"}
                          {cell === "O" && "🎀"}
                        </button>
                      ))}
                    </div>

                    <div className="mt-6 flex justify-between items-center w-full max-w-xs text-xs font-bold text-on-surface-variant">
                      <span className="flex items-center gap-1">❤️ = {activeRoom.player1Name}</span>
                      <span className="flex items-center gap-1">🎀 = {activeRoom.player2Id ? activeRoom.player2Name : "Cupid AI"}</span>
                    </div>

                  </div>
                )}

                {/* GAME 2: HEART MATCHER WORKSPACE */}
                {activeRoom.gameType === "heart-matcher" && (
                  <div className="flex flex-col items-center">
                    
                    {/* Score stats indicators */}
                    <div className="flex justify-between items-center w-full max-w-sm mb-6 bg-surface-container p-3 rounded-2xl text-xs font-black">
                      <div className="text-center">
                        <p className="text-[10px] text-[#ff8fa3] uppercase">Host Matches</p>
                        <p className="text-sm font-mono text-secondary">{activeRoom.player1Matches || 0}</p>
                      </div>
                      <div className="h-8 w-[1px] bg-primary/10" />
                      <div className="text-center">
                        <p className="text-[10px] text-on-surface-variant uppercase">Pair Matches</p>
                        <p className="text-sm font-mono text-on-surface">
                          {activeRoom.player1Matches !== undefined && activeRoom.player2Matches !== undefined 
                            ? (activeRoom.player1Matches + activeRoom.player2Matches) 
                            : 0} / 6
                        </p>
                      </div>
                      <div className="h-8 w-[1px] bg-primary/10" />
                      <div className="text-center">
                        <p className="text-[10px] text-[#ff8fa3] uppercase">Peer Matches</p>
                        <p className="text-sm font-mono text-secondary">{activeRoom.player2Matches || 0}</p>
                      </div>
                    </div>

                    {/* Grid of memory cards */}
                    <div className="grid grid-cols-4 gap-3 w-full max-w-[340px]">
                      {activeRoom.board.map((symbol, idx) => {
                        const isChosen = memoryFlippedIndices.includes(idx);
                        // We also treat cards as matched if we can infer it or we just flip them
                        return (
                          <button
                            key={idx}
                            id={`memory-card-${idx}`}
                            onClick={() => handleMemoryCardClick(idx)}
                            disabled={activeRoom.status !== "active" || activeRoom.turn !== user.uid || isChosen}
                            className={`aspect-square rounded-xl text-3xl font-bold flex items-center justify-center transition-all cursor-pointer border transform active:scale-95 ${
                              isChosen 
                                ? "bg-[#fff0f3] border-[#ff8fa3] shadow-xs" 
                                : "bg-gradient-to-br from-[#ffb3c1] to-[#ff4d6d] text-white border-transparent"
                            }`}
                          >
                            {isChosen ? symbol : "🎀"}
                          </button>
                        );
                      })}
                    </div>

                    <p className="text-[10px] text-on-surface-variant italic font-light mt-4 text-center">
                      Find identical hidden candy emojis! If they match, you get +1 point and keep playing. 
                    </p>

                  </div>
                )}

                {/* GAME 3: AFFINITY PULSE SCENARIO CHOICES */}
                {activeRoom.gameType === "affinity-pulse" && (
                  <div className="space-y-6">
                    
                    {/* Render active unanswered prompt */}
                    {(() => {
                      const hostIsUser = activeRoom.player1Id === user.uid;
                      const userAnswers = hostIsUser ? (activeRoom.p1AffinityAnswers || []) : (activeRoom.p2AffinityAnswers || []);
                      const activeQuestionIdx = userAnswers.length;

                      if (activeQuestionIdx >= AFFINITY_PROMPTS.length) {
                        return (
                          <div className="text-center py-6">
                            <span className="text-4xl">🕊️</span>
                            <h4 className="font-display font-black text-sm text-on-surface mt-2 uppercase tracking-wide">All Answers Submitted!</h4>
                            <p className="text-xs text-on-surface-variant max-w-xs mx-auto mt-1 font-light">
                              Waiting for your private companion to complete their feedback selection. The live pulse results will unlock automatically below!
                            </p>
                          </div>
                        );
                      }

                      const currentQuestion = AFFINITY_PROMPTS[activeQuestionIdx];

                      return (
                        <div className="bg-surface-container p-5 rounded-2xl space-y-4 border border-[#ff8fa3]/10">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase text-secondary tracking-widest">
                              Prompt #{activeQuestionIdx + 1} of {AFFINITY_PROMPTS.length}
                            </span>
                            <span className="text-xs">🏹</span>
                          </div>

                          <h4 className="text-xs font-extrabold text-on-surface leading-normal text-left sm:text-center">
                            &ldquo;{currentQuestion.question}&rdquo;
                          </h4>

                          <div className="grid grid-cols-1 gap-2.5">
                            {currentQuestion.options.map((opt) => (
                              <button
                                key={opt.key}
                                onClick={() => handlePulseAnswerSelect(currentQuestion.id, opt.key)}
                                className="w-full text-left p-3.5 rounded-xl border border-primary/5 hover:border-[#ff8fa3] bg-surface text-xs text-on-surface hover:bg-[#fff0f3]/40 font-bold tracking-wide transition cursor-pointer"
                              >
                                {opt.text}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Progress feedback summary logs if they both started responding */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant border-b border-primary/5 pb-1">Compatibility Sync Cards</h4>
                      
                      {AFFINITY_PROMPTS.map((prompt, qIdx) => {
                        const p1Ans = activeRoom.p1AffinityAnswers?.[qIdx];
                        const p2Ans = activeRoom.p2AffinityAnswers?.[qIdx];
                        const bothSelected = !!p1Ans && !!p2Ans;
                        const matchStatus = p1Ans === p2Ans;

                        return (
                          <div key={prompt.id} className="flex justify-between items-center text-[11px] py-1">
                            <span className="text-on-surface font-semibold max-w-[150px] truncate">{qIdx + 1}. {prompt.question}</span>
                            <div className="flex items-center gap-2">
                              <span className="bg-surface-container px-2 py-0.5 rounded text-[10px] text-on-surface-variant font-mono">
                                Host: {p1Ans ? "✓ Picked" : "⏳"}
                              </span>
                              <span className="bg-surface-container px-2 py-0.5 rounded text-[10px] text-on-surface-variant font-mono">
                                Peer: {p2Ans ? "✓ Picked" : "⏳"}
                              </span>
                              {bothSelected && (
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  matchStatus 
                                    ? "bg-[#fff0f3] text-[#a4133c] border border-secondary" 
                                    : "bg-surface-container text-on-surface-variant-dim"
                                }`}>
                                  {matchStatus ? "💖 +25% Affinity" : "💔 No Sync"}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                )}

                {/* WINNER / GAME END OVERLAY */}
                {activeRoom.status === "ended" && (
                  <div className="absolute inset-0 bg-white/95 rounded-3xl z-10 flex flex-col justify-center items-center text-center p-6 space-y-4">
                    
                    <span className="text-5xl animate-bounce">🎀</span>
                    
                    <div>
                      <span className="bg-[#fff0f3] text-[#a4133c] text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-secondary/20">
                        Arcade Game Over
                      </span>
                      <h4 className="font-display text-lg font-black text-on-surface mt-2">
                        {activeRoom.winner === "draw" && "A Perfect Tie of Affinity! 🕯️"}
                        {activeRoom.winner === user.uid && "Hurrah, You Won this Round! 🏆"}
                        {activeRoom.winner && activeRoom.winner !== user.uid && `${activeRoom.winner === "cupid_ai" ? "Cupid AI" : "Anonymous peer"} won this challenge!`}
                      </h4>
                    </div>

                    {activeRoom.gameType === "affinity-pulse" && (
                      <div className="bg-[#fff5f6] p-4 rounded-2xl border border-secondary/10">
                        <p className="text-[11px] font-bold text-[#a4133c] uppercase tracking-wider">Final Romantic Compatibility Score</p>
                        <p className="text-3xl font-mono font-black text-secondary mt-1">{computePulseAffinityScores()}%</p>
                        <p className="text-[10px] text-on-surface-variant mt-1 max-w-xs mx-auto leading-relaxed">
                          {computePulseAffinityScores() >= 75 ? "Astounding! Hearts beating perfectly in Victorian velvet harmony. 💖" : 
                           computePulseAffinityScores() >= 50 ? "Delightful chemistry. Cozy stargazers writing under identical skies." : "A warm encounter, but your separate custom paths let you shine unique! ✨"}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={handleDisconnectRoom}
                        className="py-2.5 px-6 rounded-xl bg-on-surface text-surface text-xs font-bold uppercase transition cursor-pointer"
                      >
                        Return to Lobby
                      </button>
                    </div>

                  </div>
                )}

              </div>

              {/* Graceful Disconnect control panel */}
              <div className="flex justify-between items-center text-xs">
                <button
                  onClick={handleDisconnectRoom}
                  className="text-on-surface-variant hover:text-red-500 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-4 h-4" /> Exit Room & Clear Session Log
                </button>

                <div className="flex items-center gap-1 text-[10px] text-on-surface-variant/80 font-mono">
                  <span>Room ID: {activeRoom.id.substring(0, 16)}</span>
                </div>
              </div>

            </div>

            {/* Right side: Integrated Private Live Chat Box (They both can exclusively see!) */}
            <div className="lg:col-span-5 h-[500px] lg:h-auto flex flex-col bg-surface rounded-3xl border border-primary/5 shadow-xs overflow-hidden">
              
              <div className="bg-surface p-4 border-b border-primary/5 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                  <div>
                    <h3 className="text-xs font-black text-on-surface uppercase tracking-wider">Secure Lover's Line 🕯️</h3>
                    <p className="text-[9px] text-on-surface-variant/80 font-bold uppercase">Secret & Encrypted Chat</p>
                  </div>
                </div>
                <div className="bg-[#fff0f3] text-[#a4133c] text-[9px] font-black px-2 py-0.5 rounded border border-secondary/20">
                  Episodic Log
                </div>
              </div>

              {/* Private Message Stream Box */}
              <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-surface-container/20">
                {activeRoom.messages && activeRoom.messages.map((msg, idx) => {
                  const isSystem = msg.senderId === "system";
                  const isCurrentUserMsg = msg.senderId === user.uid;

                  if (isSystem) {
                    return (
                      <div key={msg.id || idx} className="text-center py-2 px-3 border border-secondary/5 bg-[#ffeae0]/10 rounded-2xl">
                        <p className="text-[10px] font-light text-[#ff4d6d] leading-normal">
                          {msg.text}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={msg.id || idx} 
                      className={`flex flex-col max-w-[80%] ${isCurrentUserMsg ? "ml-auto items-end" : "mr-auto items-start"}`}
                    >
                      <span className="text-[9px] font-black text-on-surface-variant/80 tracking-wider mb-0.5">
                        {isCurrentUserMsg ? "You" : msg.senderName} 
                      </span>
                      <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed font-semibold ${
                        isCurrentUserMsg 
                          ? "bg-secondary text-on-secondary rounded-tr-none" 
                          : "bg-surface text-on-surface border border-primary/5 rounded-tl-none shadow-xs"
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat form text input anchor */}
              <form onSubmit={handleSendMessage} className="p-3.5 border-t border-primary/5 bg-surface shrink-0 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Sealed letter: Type sensitive whisper here..."
                  className="flex-grow px-4 py-2.5 rounded-xl border border-primary/10 text-xs bg-surface-container text-on-surface focus:border-secondary focus:outline-hidden transition"
                />
                <button
                  type="submit"
                  className="w-10 h-10 rounded-xl bg-secondary hover:bg-secondary-container text-on-secondary shrink-0 flex items-center justify-center transition cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
