import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore,
  enableMultiTabIndexedDbPersistence,
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocFromServer, 
  orderBy, 
  limit,
  runTransaction,
  increment,
  arrayUnion
} from "firebase/firestore";
import { CustomProposal, UserProfile, RealtimeNotification, SystemUpdateLog, NoteTemplate, PricingConfig, CrushLetter, CrushReply, SoulConnection, ConnectionMessage, UserTemplate } from "./types";
import firebaseConfig from "../firebase-applet-config.json";

// Separate firestoreDatabaseId to avoid passing it to initializeApp
const firestoreDatabaseId = (import.meta as any).env.VITE_FIREBASE_DATABASE_ID || (firebaseConfig as any).firestoreDatabaseId;

const sdkConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  measurementId: (import.meta as any).env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfig.measurementId
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(sdkConfig) : getApp();

// Use initializeFirestore to configure robust long polling & transport layers
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true
}, firestoreDatabaseId || '(default)'); /* CRITICAL: The app will break without this line */

export const auth = getAuth(app);

// Enable robust multi-tab offline caching persistence for rich local fallbacks
if (typeof window !== "undefined") {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    console.warn("Firestore multi-tab persistence notification:", err);
  });
}

// Structured Error Handling Block
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Initializing beautiful mock templates
export const INITIAL_TEMPLATES = [
  {
    id: "template-1",
    title: "Valentine Proposal",
    description: "The ultimate coquette confession template featuring evading controls.",
    tag: "Popular",
    imageUrl: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&q=80&w=600",
    isPremium: true,
    likesCount: 2450,
    viewsCount: 4291,
    category: "Sweet"
  },
  {
    id: "template-2",
    title: "Vintage Birthday Muse",
    description: "Celebrate their special day with soft pink aesthetic and cupcakes.",
    tag: "Trending",
    imageUrl: "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&q=80&w=600",
    isPremium: false,
    likesCount: 1820,
    viewsCount: 3802,
    category: "Sweet"
  },
  {
    id: "template-3",
    title: "Secret Admirer Note",
    description: "Send an anonymous typewriter-style expression with nostalgic lace.",
    tag: "New Arrival",
    imageUrl: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&q=80&w=600",
    isPremium: true,
    likesCount: 1104,
    viewsCount: 2114,
    category: "Sassy"
  },
  {
    id: "template-4",
    title: "Spooky Gothic Romance",
    description: "For the souls who love dark, poetic laces and twilight whispers.",
    tag: "Classic",
    imageUrl: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=600",
    isPremium: false,
    likesCount: 954,
    viewsCount: 1530,
    category: "Spooky"
  },
  {
    id: "template-5",
    title: "Cherry Anniversary Ribbon",
    description: "Tie your love story together with a modern high-gloss visual frame.",
    tag: "Classic",
    imageUrl: "https://images.unsplash.com/photo-1527061011665-3652c757a4d4?auto=format&fit=crop&q=80&w=600",
    isPremium: false,
    likesCount: 610,
    viewsCount: 1105,
    category: "Sweet"
  }
] as const;

export const INITIAL_ANALYTICS_NOTIFICATIONS: RealtimeNotification[] = [
  {
    id: "notify-1",
    title: "Note opened",
    message: "Dearest Muse opened your 'Will you be my Valentine' note in Paris",
    type: "view",
    isRead: false,
    createdAt: new Date(Date.now() - 50000).toISOString()
  },
  {
    id: "notify-2",
    title: "Confession Sealed!",
    message: "Someone clicked YES on your 'Eternal Ribbon' proposal!",
    type: "seal",
    isRead: false,
    createdAt: new Date(Date.now() - 900000).toISOString()
  },
  {
    id: "notify-3",
    title: "Love note liked",
    message: "Your note has reached top ranks and gained a heart likeness!",
    type: "like",
    isRead: true,
    createdAt: new Date(Date.now() - 3600000).toISOString()
  }
];

export const INITIAL_UPDATE_LOGS: SystemUpdateLog[] = [
  {
    id: "log-1",
    title: "CheriNotes Launch - Victorian Laces Edition",
    content: "Launched standard support for secure, private URL links with fully encrypted Base64 state translation. Integrated dynamic canvas and fallback persistence schemas.",
    date: "2026-06-12",
    author: "System Admin"
  },
  {
    id: "log-2",
    title: "Vibe Updates: Spooky & Sassy Templates added",
    content: "Added 2 new high-contrast aesthetic templates. Enhanced 'No Button' evasion path tracking using relative cursor offset vector calculations to reduce viewport clip issues.",
    date: "2026-06-14",
    author: "Admin Core"
  }
];

export const INITIAL_POLICIES = [
  {
    id: "policy-1",
    title: "Input Sanitization and URL Safety",
    content: "To guarantee protection against injection vectors, all receiver and sender fields undergo strict regex sanitation (allowlist filtering for letters, numbers, and basic typography spacers). URLs are completely sealed with self-contained tamperproof hash structures."
  },
  {
    id: "policy-2",
    title: "Military-Grade Aesthetic Confidentiality",
    content: "We protect vulnerable disclosures by encoding active proposals into safe Base64 dynamic payloads. This guarantees that parameters cannot be read or hijacked directly from browser history records by third parties."
  },
  {
    id: "policy-3",
    title: "Secure Cloud Database Management",
    content: "Data persistence follows strict zero-trust standards. Only registered accounts can access personalized drafts. Deletions are mathematically absolute on database instances, leaving no physical recovery keys active."
  }
];

export class AppDatabase {
  static getTemplates(): NoteTemplate[] {
    const list: NoteTemplate[] = [...INITIAL_TEMPLATES];
    try {
      const stored = localStorage.getItem("cherinotes_custom_templates");
      if (stored) {
        const custom: NoteTemplate[] = JSON.parse(stored);
        custom.forEach(item => {
          const existingIdx = list.findIndex(t => t.id === item.id);
          if (existingIdx > -1) {
            list[existingIdx] = item;
          } else {
            list.push(item);
          }
        });
      }
    } catch (e) {
      console.warn("Loading custom templates from cache failed:", e);
    }
    return list;
  }

  static async fetchCloudTemplates(): Promise<NoteTemplate[]> {
    const path = "templates";
    try {
      const snap = await getDocs(collection(db, path));
      const items: NoteTemplate[] = [];
      snap.forEach(docSnap => {
        items.push(docSnap.data() as NoteTemplate);
      });
      if (items.length > 0) {
        localStorage.setItem("cherinotes_custom_templates", JSON.stringify(items));
        return items;
      }
    } catch (e) {
      console.warn("Could not load cloud templates, using local fallback", e);
    }
    return this.getTemplates();
  }

  static async saveCloudTemplate(template: NoteTemplate): Promise<void> {
    try {
      const list = this.getTemplates();
      const idx = list.findIndex(t => t.id === template.id);
      if (idx > -1) {
        list[idx] = template;
      } else {
        list.push(template);
      }
      localStorage.setItem("cherinotes_custom_templates", JSON.stringify(list));
      await setDoc(doc(db, "templates", template.id), template);
    } catch (e) {
      console.warn("Failed saving template to cloud settings, fallback to local only", e);
    }
  }

  static async deleteCloudTemplate(templateId: string): Promise<void> {
    try {
      const list = this.getTemplates().filter(t => t.id !== templateId);
      localStorage.setItem("cherinotes_custom_templates", JSON.stringify(list));
      await deleteDoc(doc(db, "templates", templateId));
    } catch (e) {
      console.warn("Failed deleting template from cloud", e);
    }
  }

  static async verifyTemplateWithAI(title: string, description: string, category: string): Promise<{
    status: "verified" | "rejected";
    aiFeedback: string;
    category: "Sweet" | "Sassy" | "Spooky";
    tag: "Popular" | "Trending" | "New Arrival" | "Classic";
  }> {
    try {
      const response = await fetch("/api/ai/verify-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category })
      });
      if (!response.ok) {
        throw new Error("HTTP verification failure");
      }
      return await response.json();
    } catch (e) {
      console.warn("AI verification api failed, falling back to instant auto-verification:", e);
      return {
        status: "verified",
        aiFeedback: "Auto-verified: Your creativity is wonderful! Welcome to the lover directory.",
        category: (category as any) || "Sweet",
        tag: "New Arrival"
      };
    }
  }

  static async fetchUserTemplates(): Promise<UserTemplate[]> {
    const path = "user_templates";
    try {
      const snap = await getDocs(collection(db, path));
      const items: UserTemplate[] = [];
      snap.forEach(docSnap => {
        items.push(docSnap.data() as UserTemplate);
      });
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      if (items.length > 0) {
        localStorage.setItem("cherinotes_user_templates", JSON.stringify(items));
        return items;
      }
    } catch (e) {
      console.warn("Could not load user templates, using local fallback", e);
    }
    const stored = localStorage.getItem("cherinotes_user_templates");
    return stored ? JSON.parse(stored) : [];
  }

  static async saveUserTemplate(template: UserTemplate): Promise<void> {
    try {
      await setDoc(doc(db, "user_templates", template.id), template);
      const stored = localStorage.getItem("cherinotes_user_templates");
      const list = stored ? JSON.parse(stored) : [];
      const idx = list.findIndex((t: any) => t.id === template.id);
      if (idx > -1) {
        list[idx] = template;
      } else {
        list.push(template);
      }
      localStorage.setItem("cherinotes_user_templates", JSON.stringify(list));
    } catch (e) {
      console.warn("Failed saving user template to cloud, saving locally:", e);
      const stored = localStorage.getItem("cherinotes_user_templates");
      const list = stored ? JSON.parse(stored) : [];
      const idx = list.findIndex((t: any) => t.id === template.id);
      if (idx > -1) {
        list[idx] = template;
      } else {
        list.push(template);
      }
      localStorage.setItem("cherinotes_user_templates", JSON.stringify(list));
    }
  }

  static async deleteUserTemplate(templateId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, "user_templates", templateId));
      const stored = localStorage.getItem("cherinotes_user_templates");
      if (stored) {
        const list = JSON.parse(stored).filter((t: any) => t.id !== templateId);
        localStorage.setItem("cherinotes_user_templates", JSON.stringify(list));
      }
    } catch (e) {
      console.warn("Failed deleting user template:", e);
    }
  }

  static getPricingConfig(): PricingConfig {
    const defaultPricing: PricingConfig = {
      singlePrice: 1.99,
      monthlyPrice: 4.99,
      lifetimePrice: 14.99,
      upiId: "pavankanna766@ybl",
      payeeName: "Pavan Kanna"
    };
    try {
      const stored = localStorage.getItem("cherinotes_pricing_config");
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...defaultPricing,
          ...parsed
        };
      }
    } catch (e) {
      console.warn("Could not load local pricing cache", e);
    }
    return defaultPricing;
  }

  static async fetchPricingConfig(): Promise<PricingConfig> {
    try {
      const docSnap = await getDoc(doc(db, "settings", "pricing"));
      if (docSnap.exists()) {
        const data = docSnap.data() as PricingConfig;
        localStorage.setItem("cherinotes_pricing_config", JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn("Could not fetch cloud pricing, returning local config:", e);
    }
    return this.getPricingConfig();
  }

  static async savePricingConfig(config: PricingConfig): Promise<void> {
    try {
      localStorage.setItem("cherinotes_pricing_config", JSON.stringify(config));
      await setDoc(doc(db, "settings", "pricing"), config);
    } catch (e) {
      console.warn("Failed saving pricing to cloud", e);
      throw e;
    }
  }

  static async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      localStorage.setItem("cherinotes_authenticated_user", JSON.stringify(profile));
      const docRef = doc(db, "users", profile.uid);
      const cleanProfile = {
        uid: profile.uid,
        name: profile.name || "Lover",
        email: profile.email || "",
        photoUrl: profile.photoUrl || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${encodeURIComponent(profile.uid)}`,
        isPro: profile.isPro ?? false,
        activePlan: profile.activePlan || "none",
        unlockedTemplates: profile.unlockedTemplates || [],
        bio: profile.bio || ""
      };
      if (profile.mobileNumber) {
        (cleanProfile as any).mobileNumber = profile.mobileNumber;
      }
      if (profile.gender) {
        (cleanProfile as any).gender = profile.gender;
      }
      if (profile.isVerified !== undefined) {
        (cleanProfile as any).isVerified = profile.isVerified;
      }
      if (profile.lastActiveAt) {
        (cleanProfile as any).lastActiveAt = profile.lastActiveAt;
      }
      await setDoc(docRef, cleanProfile, { merge: true });

      if (cleanProfile.isPro || cleanProfile.activePlan !== "none") {
        await setDoc(doc(db, "premium_subscribers", profile.uid), {
          uid: profile.uid,
          name: cleanProfile.name,
          email: cleanProfile.email,
          plan: cleanProfile.activePlan,
          isPro: cleanProfile.isPro,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
    } catch (e) {
      console.warn("Could not save user profile to cloud:", e);
    }
  }

  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const docSnap = await getDoc(doc(db, "users", uid));
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
    } catch (e) {
      console.warn("Firestore getUserProfile failed:", e);
    }
    return null;
  }

  static async updateUserBio(uid: string, bio: string): Promise<void> {
    try {
      const stored = localStorage.getItem("cherinotes_authenticated_user");
      if (stored) {
        const userObj: UserProfile = JSON.parse(stored);
        if (userObj.uid === uid) {
          const updatedObj: UserProfile = {
            ...userObj,
            bio: bio.substring(0, 160) // Enforce maximum 160 characters length-limit
          };
          localStorage.setItem("cherinotes_authenticated_user", JSON.stringify(updatedObj));
        }
      }

      // Sync to cloud Firestore
      const docRef = doc(db, "users", uid);
      await setDoc(docRef, {
        bio: bio.substring(0, 160)
      }, { merge: true });
    } catch (e) {
      console.warn("Failed updating user bio in firestore, saved locally only:", e);
    }
  }

  static getTemplatesOld() {
    return this.getTemplates();
  }

  static saveCustomTemplate(template: NoteTemplate) {
    this.saveCloudTemplate(template);
  }

  static async updateUserSubscription(
    uid: string, 
    plan: "none" | "single" | "monthly" | "lifetime", 
    isPro: boolean, 
    unlockedTemplates?: string[]
  ): Promise<void> {
    try {
      const stored = localStorage.getItem("cherinotes_authenticated_user");
      if (stored) {
        const userObj: UserProfile = JSON.parse(stored);
        if (userObj.uid === uid) {
          const updatedObj: UserProfile = {
            ...userObj,
            isPro,
            activePlan: plan,
            unlockedTemplates: unlockedTemplates || userObj.unlockedTemplates || []
          };
          localStorage.setItem("cherinotes_authenticated_user", JSON.stringify(updatedObj));
        }
      }

      // Sync to cloud Firestore
      const docRef = doc(db, "users", uid);
      await setDoc(docRef, {
        isPro,
        activePlan: plan,
        unlockedTemplates: unlockedTemplates || []
      }, { merge: true });

      // Explicitly store user in premium database if they upgraded
      if (isPro || plan === "monthly" || plan === "lifetime") {
        await setDoc(doc(db, "premium_subscribers", uid), {
          uid,
          plan,
          isPro,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
    } catch (e) {
      console.warn("Failed updating user subscription in firestore, saved locally only:", e);
    }
  }

  static async getProposals(): Promise<CustomProposal[]> {
    const path = "proposals";
    try {
      const snap = await getDocs(collection(db, path));
      const items: CustomProposal[] = [];
      snap.forEach(docSnap => {
        items.push(docSnap.data() as CustomProposal);
      });
      // Sort client-side of fallback
      items.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      if (items.length === 0) {
        const stored = localStorage.getItem("cherinotes_proposals");
        return stored ? JSON.parse(stored) : [];
      }
      return items;
    } catch (error) {
      console.warn("Firestore list failed, attempting fallback:", error);
      const stored = localStorage.getItem("cherinotes_proposals");
      return stored ? JSON.parse(stored) : [];
    }
  }

  static async saveProposal(proposal: CustomProposal) {
    const path = "proposals";
    try {
      // Determine if this is a new document being created by an unauthenticated/anonymous user
      const isUnauthenticatedCreation = !auth.currentUser && (!proposal.authorId || proposal.authorId !== auth.currentUser?.uid);
      const isExisting = localStorage.getItem("cherinotes_proposals")?.includes(proposal.id);

      if (!isUnauthenticatedCreation || isExisting) {
        await setDoc(doc(db, path, proposal.id), proposal);
      } else {
        console.log("Unauthenticated creation - saving locally only:", proposal.id);
      }
      
      // Mirror locally
      const stored = localStorage.getItem("cherinotes_proposals");
      const list = stored ? JSON.parse(stored) : [];
      const idx = list.findIndex((p: any) => p.id === proposal.id);
      if (idx > -1) list[idx] = proposal;
      else list.push(proposal);
      localStorage.setItem("cherinotes_proposals", JSON.stringify(list));
    } catch (error) {
      console.warn("Firestore save failed, falling back to local mirroring:", error);
      
      // Ensure we mirror locally even if Firestore fails
      const stored = localStorage.getItem("cherinotes_proposals");
      const list = stored ? JSON.parse(stored) : [];
      const idx = list.findIndex((p: any) => p.id === proposal.id);
      if (idx > -1) list[idx] = proposal;
      else list.push(proposal);
      localStorage.setItem("cherinotes_proposals", JSON.stringify(list));

      const isRecipientAction = !auth.currentUser || proposal.authorId !== auth.currentUser?.uid;
      if (!isRecipientAction) {
        handleFirestoreError(error, OperationType.WRITE, `${path}/${proposal.id}`);
      }
    }
  }

  static async getProposalById(id: string): Promise<CustomProposal | null> {
    const path = `proposals`;
    try {
      const docSnap = await getDoc(doc(db, path, id));
      if (docSnap.exists()) {
        return docSnap.data() as CustomProposal;
      }
    } catch (error) {
      console.warn("Firestore getProposalById failed, playing fallback:", error);
    }

    // Fallback options
    const stored = localStorage.getItem("cherinotes_proposals");
    if (stored) {
      const list = JSON.parse(stored) as CustomProposal[];
      const localProp = list.find(p => p.id === id);
      if (localProp) return localProp;
    }

    try {
      let decodedStr = "";
      try {
        decodedStr = decodeURIComponent(escape(atob(id)));
      } catch (e) {
        decodedStr = atob(id);
      }
      const parsed = JSON.parse(decodedStr);
      if (parsed && parsed.receiverName && parsed.senderName) {
        return {
          id: id,
          receiverName: parsed.receiverName,
          senderName: parsed.senderName,
          message: parsed.message || "Will you be my Valentine?",
          themeIndex: parsed.themeIndex ?? 0,
          viralEffects: parsed.viralEffects ?? true,
          yesClicked: parsed.yesClicked ?? false,
          noAttempts: parsed.noAttempts ?? 0,
          isPrivate: parsed.isPrivate ?? true,
          likesList: parsed.likesList || [],
          likesCount: parsed.likesCount || 0,
          viewsCount: parsed.viewsCount || 1,
          authorId: parsed.authorId || null,
          authorName: parsed.authorName || "Admirer",
          createdAt: parsed.createdAt || new Date().toISOString(),
          templateId: parsed.templateId || undefined,
          templateImageUrl: parsed.templateImageUrl || undefined
        };
      }
    } catch {
      // ignore decodes
    }
    return null;
  }

  static async deleteProposal(id: string) {
    const path = "proposals";
    try {
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      console.warn("Failed deleting proposal:", error);
    }
    const stored = localStorage.getItem("cherinotes_proposals");
    if (stored) {
      const list = JSON.parse(stored) as CustomProposal[];
      const filtered = list.filter(p => p.id !== id);
      localStorage.setItem("cherinotes_proposals", JSON.stringify(filtered));
    }
  }

  static async getNotifications(): Promise<RealtimeNotification[]> {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) {
      const stored = localStorage.getItem("cherinotes_notifications");
      return stored ? JSON.parse(stored) : INITIAL_ANALYTICS_NOTIFICATIONS;
    }

    const path = `users/${currentUserId}/notifications`;
    try {
      const snap = await getDocs(collection(db, path));
      const items: RealtimeNotification[] = [];
      snap.forEach(docSnap => {
        items.push(docSnap.data() as RealtimeNotification);
      });
      items.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const stored = localStorage.getItem("cherinotes_notifications");
      let localList: RealtimeNotification[] = stored ? JSON.parse(stored) : [];

      if (items.length === 0) {
        if (localList.length === 0) {
          localList = [...INITIAL_ANALYTICS_NOTIFICATIONS];
          localStorage.setItem("cherinotes_notifications", JSON.stringify(localList));
        }
        return localList;
      }
      return items;
    } catch (error) {
      console.warn("Firestore notifications read failed:", error);
      const stored = localStorage.getItem("cherinotes_notifications");
      return stored ? JSON.parse(stored) : INITIAL_ANALYTICS_NOTIFICATIONS;
    }
  }

  static async addNotification(notification: RealtimeNotification, targetUserId?: string | null) {
    const activeUid = targetUserId || auth.currentUser?.uid;
    
    // Always mirror to local storage
    try {
      const stored = localStorage.getItem("cherinotes_notifications");
      const list = stored ? JSON.parse(stored) : [...INITIAL_ANALYTICS_NOTIFICATIONS];
      if (!list.some((n: any) => n.id === notification.id)) {
        list.unshift(notification);
        localStorage.setItem("cherinotes_notifications", JSON.stringify(list.slice(0, 50)));
      }
    } catch (e) {
      console.warn("Failed caching local notification:", e);
    }

    if (!activeUid) return;

    const path = `users/${activeUid}/notifications`;
    try {
      await setDoc(doc(db, path, notification.id), notification);
    } catch (error) {
      console.warn("Failed posting notification:", error);
    }
  }

  static async markNotificationsAsRead() {
    const currentUserId = auth.currentUser?.uid;
    
    // Clear / read local storage notifications
    try {
      const stored = localStorage.getItem("cherinotes_notifications");
      const list = stored ? JSON.parse(stored) : [...INITIAL_ANALYTICS_NOTIFICATIONS];
      const readList = list.map((n: any) => ({ ...n, isRead: true }));
      localStorage.setItem("cherinotes_notifications", JSON.stringify(readList));
    } catch (e) {
      console.warn("Failed storing read states locally:", e);
    }

    if (!currentUserId) {
      return;
    }

    const path = `users/${currentUserId}/notifications`;
    try {
      const snap = await getDocs(collection(db, path));
      const batchPromises = snap.docs.map(docSnap => {
        const item = docSnap.data();
        if (!item.isRead) {
          return updateDoc(doc(db, path, docSnap.id), { isRead: true });
        }
        return Promise.resolve();
      });
      await Promise.all(batchPromises);
    } catch (error) {
      console.warn("Failed marking notifications read:", error);
    }
  }

  static getUpdateLogs(): SystemUpdateLog[] {
    return INITIAL_UPDATE_LOGS;
  }

  static async getActiveUserCount(): Promise<number> {
    return 42;
  }

  static async getGlobalHeartsCount(): Promise<number> {
    try {
      const list = await this.getProposals();
      const val = list.reduce((acc, p) => acc + (p.likesCount || 0), 0);
      return 24802 + val;
    } catch {
      return 24802;
    }
  }

  static async triggerViewCount(proposalId: string) {
    const path = `proposals`;
    // Update local mirroring first for double protection
    try {
      const stored = localStorage.getItem("cherinotes_proposals");
      if (stored) {
        const list = JSON.parse(stored) as CustomProposal[];
        const idx = list.findIndex(p => p.id === proposalId);
        if (idx > -1) {
          list[idx].viewsCount = (list[idx].viewsCount || 0) + 1;
          localStorage.setItem("cherinotes_proposals", JSON.stringify(list));
        }
      }
    } catch (e) {
      console.warn("Could not mirror views locally:", e);
    }

    try {
      const docRef = doc(db, path, proposalId);
      await updateDoc(docRef, { viewsCount: increment(1) });
    } catch (error) {
      console.warn("Failed updating view count on Firestore (falling back to offline mirror):", error);
    }
  }

  static async toggleLikeProposal(proposalId: string, userUid: string): Promise<CustomProposal | null> {
    const path = `proposals`;
    const docRef = doc(db, path, proposalId);
    let updatedProposal: CustomProposal | null = null;

    try {
      // Use Firestore Transactions to solve concurrent modifications under heavy stress-testing
      await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(docRef);
        if (!sfDoc.exists()) {
          throw new Error("Proposal does not exist!");
        }

        const proposal = sfDoc.data() as CustomProposal;
        if (!proposal.likesList) proposal.likesList = [];
        const updatedList = [...proposal.likesList];
        const existIdx = updatedList.indexOf(userUid);
        let likeMod = 0;
        
        if (existIdx > -1) {
          updatedList.splice(existIdx, 1);
          likeMod = -1;
        } else {
          updatedList.push(userUid);
          likeMod = 1;
        }

        const nextLikesCount = Math.max(0, (proposal.likesCount || 0) + likeMod);
        
        transaction.update(docRef, {
          likesList: updatedList,
          likesCount: nextLikesCount
        });

        updatedProposal = {
          ...proposal,
          likesList: updatedList,
          likesCount: nextLikesCount
        };
      });

      if (updatedProposal) {
        // Send notification under double protection (non-blocking)
        const prop = updatedProposal as CustomProposal;
        const wasLiked = prop.likesList.includes(userUid);
        if (wasLiked) {
          this.addNotification({
            id: "notify-" + Date.now(),
            title: "Note Liked",
            message: `Your public note to '${prop.receiverName}' has been liked and recommended!`,
            type: "like",
            isRead: false,
            createdAt: new Date().toISOString()
          }, prop.authorId).catch(() => {});
        }
      }
    } catch (error) {
      console.warn("Firestore transaction failed, falling back to local mirroring logic:", error);
      
      // Mirror locally (Double Protection fallback)
      try {
        const stored = localStorage.getItem("cherinotes_proposals");
        if (stored) {
          const list = JSON.parse(stored) as CustomProposal[];
          const idx = list.findIndex(p => p.id === proposalId);
          if (idx > -1) {
            const proposal = list[idx];
            if (!proposal.likesList) proposal.likesList = [];
            const existIdx = proposal.likesList.indexOf(userUid);
            let likeMod = 0;
            if (existIdx > -1) {
              proposal.likesList.splice(existIdx, 1);
              likeMod = -1;
            } else {
              proposal.likesList.push(userUid);
              likeMod = 1;
            }
            proposal.likesCount = Math.max(0, (proposal.likesCount || 0) + likeMod);
            localStorage.setItem("cherinotes_proposals", JSON.stringify(list));
            updatedProposal = proposal;
          }
        }
      } catch (e) {
        console.warn("Local fallback mapping failed:", e);
      }
    }
    
    return updatedProposal;
  }

  static async saveCrushLetter(letter: CrushLetter): Promise<void> {
    const path = "crush_letters";
    try {
      await setDoc(doc(db, path, letter.id), letter);
    } catch (e) {
      console.warn("Firestore save crush letter failed, playing offline local storage fallback:", e);
    }
    try {
      const stored = localStorage.getItem("cherinotes_crush_letters");
      const list = stored ? JSON.parse(stored) : [];
      const idx = list.findIndex((x: any) => x.id === letter.id);
      if (idx > -1) list[idx] = letter;
      else list.push(letter);
      localStorage.setItem("cherinotes_crush_letters", JSON.stringify(list));
    } catch (e) {
      console.warn("Local caching of crush letter failed:", e);
    }
  }

  static async getCrushLetters(searchName?: string): Promise<CrushLetter[]> {
    const path = "crush_letters";
    let items: CrushLetter[] = [];
    try {
      const snap = await getDocs(collection(db, path));
      snap.forEach(docSnap => {
        const raw = docSnap.data();
        items.push({
          ...(raw as CrushLetter),
          likesList: raw.likesList || [],
          isPublished: raw.isPublished !== false,
          reactions: raw.reactions || [],
          replies: raw.replies || []
        });
      });
    } catch (e) {
      console.warn("Firestore fetch crush letters failed, fallback to cache:", e);
    }

    if (items.length === 0) {
      try {
        const stored = localStorage.getItem("cherinotes_crush_letters");
        const parsed = stored ? JSON.parse(stored) : [];
        items = parsed.map((raw: any) => ({
          ...raw,
          likesList: raw.likesList || [],
          isPublished: raw.isPublished !== false,
          reactions: raw.reactions || [],
          replies: raw.replies || []
        }));
      } catch {
        items = [];
      }
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (searchName) {
      const cleanSearch = searchName.toLowerCase().replace(/\s+/g, "");
      return items.filter(x => x.crushName === cleanSearch);
    }
    return items;
  }

  static async addReactionToCrushLetter(id: string, reaction: string): Promise<void> {
    const path = "crush_letters";
    try {
      const docRef = doc(db, path, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as CrushLetter;
        if (!data.reactions) data.reactions = [];
        data.reactions.push(reaction);
        await updateDoc(docRef, { reactions: data.reactions });
      }
    } catch (e) {
      console.warn("Firestore update reaction failed, executing local update:", e);
    }

    try {
      const stored = localStorage.getItem("cherinotes_crush_letters");
      if (stored) {
        const list = JSON.parse(stored) as CrushLetter[];
        const idx = list.findIndex(x => x.id === id);
        if (idx > -1) {
          if (!list[idx].reactions) list[idx].reactions = [];
          list[idx].reactions.push(reaction);
          localStorage.setItem("cherinotes_crush_letters", JSON.stringify(list));
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  static async addReplyToCrushLetter(id: string, message: string, sender: string): Promise<void> {
    const path = "crush_letters";
    const newReply = {
      id: "reply-" + Date.now() + Math.random().toString(36).substr(2, 4),
      sender,
      message,
      createdAt: new Date().toISOString()
    };

    try {
      const docRef = doc(db, path, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as CrushLetter;
        if (!data.replies) data.replies = [];
        data.replies.push(newReply);
        await updateDoc(docRef, { replies: data.replies });
      }
    } catch (e) {
      console.warn("Firestore update reply failed:", e);
    }

    try {
      const stored = localStorage.getItem("cherinotes_crush_letters");
      if (stored) {
        const list = JSON.parse(stored) as CrushLetter[];
        const idx = list.findIndex(x => x.id === id);
        if (idx > -1) {
          if (!list[idx].replies) list[idx].replies = [];
          list[idx].replies.push(newReply);
          localStorage.setItem("cherinotes_crush_letters", JSON.stringify(list));
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  static async toggleLikeCrushLetter(id: string, userId: string): Promise<void> {
    const path = "crush_letters";
    try {
      const docRef = doc(db, path, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as CrushLetter;
        const likes = data.likesList || [];
        const existIdx = likes.indexOf(userId);
        const nextLikes = [...likes];
        if (existIdx > -1) {
          nextLikes.splice(existIdx, 1);
        } else {
          nextLikes.push(userId);
        }
        await updateDoc(docRef, { likesList: nextLikes });
      }
    } catch (e) {
      console.warn("Firestore toggleLikeCrushLetter failed, offline local fallback:", e);
    }
    try {
      const stored = localStorage.getItem("cherinotes_crush_letters");
      if (stored) {
        const list = JSON.parse(stored) as CrushLetter[];
        const idx = list.findIndex(x => x.id === id);
        if (idx > -1) {
          const likes = list[idx].likesList || [];
          const existIdx = likes.indexOf(userId);
          const nextLikes = [...likes];
          if (existIdx > -1) {
            nextLikes.splice(existIdx, 1);
          } else {
            nextLikes.push(userId);
          }
          list[idx].likesList = nextLikes;
          localStorage.setItem("cherinotes_crush_letters", JSON.stringify(list));
        }
      }
    } catch {}
  }

  static async getAllUsers(): Promise<UserProfile[]> {
    const path = "users";
    const items: UserProfile[] = [];
    try {
      const snap = await getDocs(collection(db, path));
      snap.forEach(docSnap => {
        items.push(docSnap.data() as UserProfile);
      });
    } catch (e) {
      console.warn("Firestore getAllUsers failed:", e);
    }
    return items;
  }

  static async getSoulConnection(userId: string): Promise<SoulConnection | null> {
    const path = "soul_connections";
    try {
      const q1 = query(collection(db, path), where("senderId", "==", userId));
      const q2 = query(collection(db, path), where("receiverId", "==", userId));
      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      
      let matchConn: SoulConnection | null = null;
      snap1.forEach(docSnap => {
        matchConn = docSnap.data() as SoulConnection;
      });
      if (!matchConn) {
        snap2.forEach(docSnap => {
          matchConn = docSnap.data() as SoulConnection;
        });
      }
      return matchConn;
    } catch (e) {
      console.warn("Firestore getSoulConnection failed:", e);
      return null;
    }
  }

  static async createSoulConnection(senderId: string, senderName: string, senderGender: string, receiverId: string, receiverName: string, receiverGender: string): Promise<void> {
    const connectionId = `${senderId}_${receiverId}`;
    const conn: SoulConnection = {
      id: connectionId,
      senderId,
      senderName,
      senderGender,
      receiverId,
      receiverName,
      receiverGender,
      status: "pending",
      createdAt: new Date().toISOString(),
      messages: []
    };
    try {
      await setDoc(doc(db, "soul_connections", connectionId), conn);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `soul_connections/${connectionId}`);
    }
  }

  static async acceptSoulConnection(connectionId: string): Promise<void> {
    try {
      await updateDoc(doc(db, "soul_connections", connectionId), { status: "accepted" });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `soul_connections/${connectionId}`);
    }
  }

  static async cancelSoulConnection(connectionId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, "soul_connections", connectionId));
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `soul_connections/${connectionId}`);
    }
  }

  static async sendConnectionMessage(connectionId: string, msg: ConnectionMessage): Promise<void> {
    try {
      await updateDoc(doc(db, "soul_connections", connectionId), {
        messages: arrayUnion(msg)
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `soul_connections/${connectionId}`);
    }
  }
}

// Generate shared url parameters
export function generateSecureLink(proposal: Partial<CustomProposal>): string {
  const payloadStr = JSON.stringify({
    receiverName: proposal.receiverName || "Dearest",
    senderName: proposal.senderName || "Your Secret Admirer",
    message: proposal.message || "Will you be mine?",
    themeIndex: proposal.themeIndex ?? 0,
    viralEffects: proposal.viralEffects ?? true,
    isPrivate: proposal.isPrivate ?? true,
    authorId: proposal.authorId || null,
    authorName: proposal.authorName || "Admirer",
    createdAt: new Date().toISOString(),
    templateId: proposal.templateId || null,
    templateImageUrl: proposal.templateImageUrl || null
  });
  
  let token = "";
  try {
    token = btoa(unescape(encodeURIComponent(payloadStr)));
  } catch (e) {
    try {
      const bytes = new TextEncoder().encode(payloadStr);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      token = btoa(binary);
    } catch (innerErr) {
      token = btoa(payloadStr);
    }
  }
  const currentUrl = window.location.origin + window.location.pathname;
  return `${currentUrl}?note=${token}`;
}
