export interface NoteTemplate {
  id: string;
  title: string;
  description: string;
  tag: "Popular" | "Trending" | "New Arrival" | "Classic";
  imageUrl: string;
  isPremium: boolean;
  likesCount: number;
  viewsCount: number;
  category: "Sweet" | "Sassy" | "Spooky";
}

export interface CustomProposal {
  id: string; // Dynamic unique key
  receiverName: string;
  senderName: string;
  message: string;
  themeIndex: number;
  viralEffects: boolean;
  yesClicked: boolean;
  noAttempts: number;
  isPrivate: boolean;
  likesList: string[]; // List of user IDs who liked this
  likesCount: number;
  viewsCount: number;
  authorId: string | null;
  authorName: string;
  createdAt: string;
  templateId?: string;
  templateImageUrl?: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  mobileNumber?: string;
  photoUrl: string;
  isPro?: boolean;
  activePlan?: "none" | "single" | "monthly" | "lifetime";
  unlockedTemplates?: string[];
  bio?: string;
  gender?: string;
  isVerified?: boolean;
}

export interface UserTemplate {
  id: string;
  userId: string;
  authorName: string;
  title: string;
  description: string;
  category: "Sweet" | "Sassy" | "Spooky";
  tag: "Popular" | "Trending" | "New Arrival" | "Classic";
  imageUrl: string;
  isPremium: boolean;
  createdAt: string;
  status: "pending" | "verified" | "rejected";
  aiFeedback?: string;
}

export interface SystemUpdateLog {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
}

export interface RealtimeNotification {
  id: string;
  title: string;
  message: string;
  type: "seal" | "view" | "like" | "system";
  isRead: boolean;
  createdAt: string;
}

export interface PricingConfig {
  singlePrice: number;
  monthlyPrice: number;
  lifetimePrice: number;
  upiId?: string;
  payeeName?: string;
}

export interface CrushReply {
  id: string;
  sender: string;
  message: string;
  createdAt: string;
}

export interface CrushLetter {
  id: string;
  crushName: string;
  displayName: string;
  senderName: string;
  message: string;
  createdAt: string;
  reactions: string[];
  replies: CrushReply[];
  likesList: string[];
  isPublished: boolean;
}

export interface GameMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
}

export interface GameRoom {
  id: string;
  player1Id: string;
  player1Name: string;
  player1Gender: "male" | "female" | "other" | string;
  player1Preference: string;
  player2Id: string | null;
  player2Name: string;
  player2Gender: "male" | "female" | "other" | string;
  player2Preference: string;
  gameType: "tic-tac-toe" | "heart-matcher" | "affinity-pulse";
  status: "waiting" | "active" | "ended";
  board: (string | null)[]; // board state representation
  player1Matches?: number; // memory matches count for p1
  player2Matches?: number; // memory matches count for p2
  p1AffinityAnswers?: string[]; // pulse answers for p1
  p2AffinityAnswers?: string[]; // pulse answers for p2
  turn: string; // ID of active player whose turn it is
  winner: string | null; // player ID or "draw" or null
  messages: GameMessage[];
  createdAt: string;
  updatedAt: string;
  isAiSimulated?: boolean;
}

export interface ConnectionMessage {
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
}

export interface SoulConnection {
  id: string;
  senderId: string;
  senderName: string;
  senderGender: string;
  receiverId: string;
  receiverName: string;
  receiverGender: string;
  status: "pending" | "accepted";
  createdAt: string;
  messages: ConnectionMessage[];
}

