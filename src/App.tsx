import React, { useState, useEffect } from "react";
import { LandingPage } from "./components/LandingPage";
import { AuthPage } from "./components/AuthPage";
import { EditorPage } from "./components/EditorPage";
import { GalleryPage } from "./components/GalleryPage";
import { DashboardPage } from "./components/DashboardPage";
import { InsightsPage } from "./components/InsightsPage";
import { HelpPage } from "./components/HelpPage";
import { PublicBoardPage } from "./components/PublicBoardPage";
import { CrushSpacePage } from "./components/CrushSpacePage";
import { AILoveLabPage } from "./components/AILoveLabPage";
import { ArcadeSpacePage } from "./components/ArcadeSpacePage";
import AICompanionPage from "./components/AICompanionPage";
import { ConnectSpacePage } from "./components/ConnectSpacePage";
import { AppDatabase, auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { UserProfile, RealtimeNotification } from "./types";
import { Heart, Ribbon, Sparkles, Bell, User, Menu, X } from "lucide-react";

export default function App() {
  const [activeView, setActiveView] = useState<string>("home");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  
  // Mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Non-intruisve notifications panel
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  // Real-time synchronization with actual Firebase Auth client SDK instance
  useEffect(() => {
    // 1. Instantly read local cache for fast initial visual loading
    try {
      const stored = localStorage.getItem("cherinotes_authenticated_user");
      if (stored) {
        setUser(JSON.parse(stored));
        setIsAuthChecking(false);
      }
    } catch (e) {
      console.warn("Could not retrieve credentials cache:", e);
    }

    // 2. Bind background listener to actual Firebase client status
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const stored = localStorage.getItem("cherinotes_authenticated_user");
        let parsed = stored ? JSON.parse(stored) : null;
        
        let dbUser: UserProfile | null = null;
        try {
          dbUser = await AppDatabase.getUserProfile(firebaseUser.uid);
        } catch (e) {
          console.warn("Background user fetch failed:", e);
        }

        const updatedUser: UserProfile = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || dbUser?.name || parsed?.name || firebaseUser.email?.split("@")[0].toUpperCase() || "Lover",
          email: firebaseUser.email || dbUser?.email || parsed?.email || "",
          photoUrl: firebaseUser.photoURL || dbUser?.photoUrl || parsed?.photoUrl || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${encodeURIComponent(firebaseUser.uid)}`,
          mobileNumber: dbUser?.mobileNumber || parsed?.mobileNumber || undefined,
          isPro: dbUser?.isPro || parsed?.isPro || false,
          activePlan: dbUser?.activePlan || parsed?.activePlan || "none",
          unlockedTemplates: dbUser?.unlockedTemplates || parsed?.unlockedTemplates || [],
          bio: dbUser?.bio || parsed?.bio || "",
          gender: dbUser?.gender || parsed?.gender || undefined,
          isVerified: dbUser?.isVerified || parsed?.isVerified || false
        };
        setUser(updatedUser);
        
        // Sync in the background to prevent offline Firestore networks from hanging App load
        AppDatabase.saveUserProfile(updatedUser).catch(err => {
          console.warn("Background user profiles synchronization remark:", err);
        });
      } else {
        // If Firebase SDK states the user is signed out, clear local session state
        // to prevent false admin visibility that causes direct Firestore write rejections
        setUser(null);
        localStorage.removeItem("cherinotes_authenticated_user");
      }
      setIsAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  // Poll database notification updates
  useEffect(() => {
    let active = true;
    const loadNotifs = async () => {
      try {
        const list = await AppDatabase.getNotifications();
        if (active) setNotifications(list);
      } catch (e) {
        console.error("Failed to load notifications:", e);
      }
    };
    loadNotifs();
    const interval = setInterval(loadNotifs, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleAuthSuccess = async (userData: UserProfile) => {
    setUser(userData);
    await AppDatabase.saveUserProfile(userData);
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem("cherinotes_authenticated_user", JSON.stringify(updated));
    await AppDatabase.saveUserProfile(updated);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (e) {
      console.warn("Could not completely sign out from auth backend instance", e);
    }
    setUser(null);
    localStorage.removeItem("cherinotes_authenticated_user");
    setActiveView("home");
  };

  const handleSelectTemplateAndEdit = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setActiveView("editor");
  };

  const unreadNotifCount = notifications.filter(n => !n.isRead).length;

  const markAllNotificationsRead = async () => {
    try {
      await AppDatabase.markNotificationsAsRead();
      const list = await AppDatabase.getNotifications();
      setNotifications(list);
    } catch (e) {
      console.error("Failed to mark notifications read:", e);
    }
  };

  return (
    <div className="min-h-screen bg-surface selection:bg-[#ffb7c5]/50 selection:text-on-primary-fixed flex flex-col font-sans antialiased text-on-surface relative">
      
      {/* Decorative Top Line */}
      <div className="h-1 w-full bg-gradient-to-r from-[#ffeed2] via-secondary to-[#ffd9df] z-50"></div>

      {/* Main Header navigation */}
      <header className="sticky top-0 bg-surface/90 backdrop-blur-md border-b border-primary/5 py-4 px-6 md:px-10 flex justify-between items-center z-40 shadow-2xs">
        {/* Brand logo grouping */}
        <div 
          onClick={() => { setActiveView("home"); setMobileMenuOpen(false); }}
          className="flex items-center gap-2 cursor-pointer group"
          id="brand-logo"
        >
          <span className="p-1.5 rounded-lg bg-primary-fixed text-secondary group-hover:scale-105 transition-transform duration-300">
            <Ribbon size={18} className="animate-spin-slow" />
          </span>
          <span className="font-display font-black text-lg md:text-xl text-primary tracking-tight">
            CheriNotes
          </span>
        </div>

        {/* Desktop Navigation Link rails */}
        <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
          <button 
            onClick={() => setActiveView("home")} 
            className={`hover:text-secondary hover:underline decoration-wavy transition cursor-pointer ${activeView === "home" ? "text-secondary font-black" : ""}`}
          >
            Home
          </button>
          <button 
            onClick={() => setActiveView("gallery")} 
            className={`hover:text-secondary hover:underline decoration-wavy transition cursor-pointer ${activeView === "gallery" ? "text-secondary font-black" : ""}`}
          >
            Gallery
          </button>
          <button 
            onClick={async () => {
              setSelectedTemplateId(null);
              setActiveView("editor");
            }} 
            className={`hover:text-secondary hover:underline decoration-wavy transition cursor-pointer ${activeView === "editor" ? "text-secondary font-black" : ""}`}
          >
            Letter Desk
          </button>
          <button 
            onClick={() => setActiveView("crush-space")} 
            className={`hover:text-secondary hover:underline decoration-wavy transition cursor-pointer ${activeView === "crush-space" ? "text-secondary font-black" : ""}`}
          >
            Crush Space
          </button>
          <button 
            onClick={() => setActiveView("ai-love-lab")} 
            className={`hover:text-secondary hover:underline decoration-wavy transition cursor-pointer ${activeView === "ai-love-lab" ? "text-secondary font-black" : ""}`}
          >
            AI Love Lab
          </button>
          <button 
            onClick={() => setActiveView("lover-arcade")} 
            className={`hover:text-secondary hover:underline decoration-wavy transition cursor-pointer ${activeView === "lover-arcade" ? "text-secondary font-black" : ""}`}
          >
            Lover Arcade 🏮
          </button>
          <button 
            onClick={() => setActiveView("connect-space")} 
            className={`hover:text-secondary hover:underline decoration-wavy transition cursor-pointer ${activeView === "connect-space" ? "text-secondary font-black" : ""}`}
            id="nav-connect-space-btn"
          >
            Connect Space 💞
          </button>
          <button 
            onClick={() => setActiveView("ai-companion")} 
            className={`hover:text-secondary hover:underline decoration-wavy transition cursor-pointer ${activeView === "ai-companion" ? "text-secondary font-black" : ""}`}
          >
            AI Partner 💖
          </button>
          <button 
            onClick={() => setActiveView("leaderboard")} 
            className={`hover:text-secondary hover:underline decoration-wavy transition cursor-pointer ${activeView === "leaderboard" ? "text-secondary font-black" : ""}`}
          >
            Leaderboard
          </button>
          <button 
            onClick={() => setActiveView("insights")} 
            className={`hover:text-secondary hover:underline decoration-wavy transition cursor-pointer ${activeView === "insights" ? "text-secondary font-black" : ""}`}
          >
            Analytics
          </button>
          <button 
            onClick={() => setActiveView("help")} 
            className={`hover:text-secondary hover:underline decoration-wavy transition cursor-pointer ${activeView === "help" ? "text-secondary font-black" : ""}`}
          >
            Changelog
          </button>
        </nav>

        {/* Right Action buttons grouping */}
        <div className="flex items-center gap-4 relative">
          
          {/* Notifications Center button */}
          <div className="relative">
            <button
              onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
              className="p-2.5 rounded-xl bg-surface-container hover:bg-[#ffeed2] text-on-surface hover:text-secondary transition relative cursor-pointer"
              id="notif-bell-btn"
            >
              <Bell size={18} />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-secondary text-white text-[9px] rounded-full flex items-center justify-center font-bold animate-pulse">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            {/* Notifications drop down cards */}
            {notifDropdownOpen && (
              <div className="absolute right-0 mt-3 w-80 bg-surface-container-lowest border border-primary/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                <div className="p-4 bg-primary-fixed/50 flex justify-between items-center border-b border-primary/5">
                  <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                    <Sparkles size={14} className="text-secondary" /> Muse Notifications
                  </span>
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-[9.5px] uppercase tracking-wide font-bold text-secondary hover:text-primary transition cursor-pointer"
                  >
                    Mark read
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-primary/5">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div key={n.id} className={`p-3 text-[11px] hover:bg-surface-container/30 transition ${!n.isRead ? "bg-primary-fixed/20" : ""}`}>
                        <div className="flex justify-between items-start mb-0.5">
                          <span className="font-bold text-on-surface">{n.title}</span>
                          <span className="text-[8px] opacity-70 font-mono">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-on-surface-variant font-light leading-snug">{n.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-on-surface-variant font-light">
                      No notifications active right now.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Secure User profile button */}
          {user ? (
            <button
              onClick={() => { setActiveView("dashboard"); setMobileMenuOpen(false); }}
              className="flex items-center gap-2 p-1 bg-surface-container hover:bg-surface-container-high rounded-full border border-primary/10 pl-2 pr-3.5 cursor-pointer max-w-[130px] sm:max-w-none transition"
              id="header-profile-btn"
            >
              <img src={user.photoUrl} alt="Lover profile" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover border border-secondary" />
              <span className="text-xs font-bold text-on-surface leading-none truncate hidden sm:inline-block max-w-[65px]">{user.name}</span>
            </button>
          ) : (
            <button
              onClick={() => { setActiveView("auth"); setMobileMenuOpen(false); }}
              className="px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary-container text-on-secondary hover:text-on-secondary-container text-xs font-bold tracking-wider transition cursor-pointer shadow-2xs"
              id="header-auth-btn"
            >
              Sign In
            </button>
          )}

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2.5 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition cursor-pointer"
            id="mobile-menu-hamburger"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer menu overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-[73px] bg-surface border-b border-primary/10 p-6 flex flex-col gap-4 z-40 shadow-xl text-xs font-bold uppercase tracking-wider text-on-surface-variant animate-fade-in">
          <button 
            onClick={() => { setActiveView("home"); setMobileMenuOpen(false); }} 
            className="p-3 text-left hover:bg-surface-container rounded-xl transition"
          >
            Home
          </button>
          <button 
            onClick={() => { setActiveView("gallery"); setMobileMenuOpen(false); }} 
            className="p-3 text-left hover:bg-surface-container rounded-xl transition"
          >
            Gallery
          </button>
          <button 
            onClick={() => { setSelectedTemplateId(null); setActiveView("editor"); setMobileMenuOpen(false); }} 
            className="p-3 text-left hover:bg-surface-container rounded-xl transition"
          >
            Letter Desk
          </button>
          <button 
            onClick={() => { setActiveView("crush-space"); setMobileMenuOpen(false); }} 
            className="p-3 text-left hover:bg-surface-container rounded-xl transition"
          >
            Crush Space
          </button>
          <button 
            onClick={() => { setActiveView("ai-love-lab"); setMobileMenuOpen(false); }} 
            className="p-3 text-left hover:bg-surface-container rounded-xl transition"
          >
            AI Love Lab
          </button>
          <button 
            onClick={() => { setActiveView("lover-arcade"); setMobileMenuOpen(false); }} 
            className="p-3 text-left hover:bg-surface-container rounded-xl transition font-black text-secondary"
          >
            Lover Arcade 🏮
          </button>
          <button 
            onClick={() => { setActiveView("connect-space"); setMobileMenuOpen(false); }} 
            className="p-3 text-left hover:bg-surface-container rounded-xl transition font-black text-secondary"
          >
            Connect Space 💞
          </button>
          <button 
            onClick={() => { setActiveView("ai-companion"); setMobileMenuOpen(false); }} 
            className="p-3 text-left hover:bg-surface-container rounded-xl transition font-black text-secondary"
          >
            AI Partner 💖
          </button>
          <button 
            onClick={() => { setActiveView("leaderboard"); setMobileMenuOpen(false); }} 
            className="p-3 text-left hover:bg-surface-container rounded-xl transition"
          >
            Leaderboard
          </button>
          <button 
            onClick={() => { setActiveView("insights"); setMobileMenuOpen(false); }} 
            className="p-3 text-left hover:bg-surface-container rounded-xl transition"
          >
            Analytics
          </button>
          <button 
            onClick={() => { setActiveView("help"); setMobileMenuOpen(false); }} 
            className="p-3 text-left hover:bg-surface-container rounded-xl transition"
          >
            Changelog
          </button>
        </div>
      )}

      {/* Core Pages Views router switcher */}
      <main className="flex-1 w-full bg-surface">
        {activeView === "home" && (
          <LandingPage 
            onNavigate={setActiveView} 
            onSelectTemplate={handleSelectTemplateAndEdit} 
            uid={user?.uid || null} 
          />
        )}
        
        {activeView === "auth" && (
          <AuthPage 
            onAuthSuccess={handleAuthSuccess} 
            onNavigate={setActiveView} 
          />
        )}
        
        {activeView === "editor" && (
          isAuthChecking ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" id="editor-auth-loading">
              <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-display font-medium text-secondary animate-pulse">Opening Letter Desk... Aligning beautiful templates...</p>
            </div>
          ) : !user ? (
            <div className="max-w-md mx-auto py-16 px-4">
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl text-xs text-orange-850 mb-6 font-medium text-center">
                🔒 You must be signed in to create and save personalized digital letters. Please login to continue!
              </div>
              <AuthPage 
                onAuthSuccess={handleAuthSuccess} 
                onNavigate={setActiveView} 
              />
            </div>
          ) : (
            <EditorPage 
              selectedTemplateId={selectedTemplateId} 
              onClearTemplate={() => setSelectedTemplateId(null)} 
              uid={user?.uid || null}
              userName={user?.name}
              onNavigate={setActiveView}
            />
          )
        )}

        {activeView === "crush-space" && (
          <CrushSpacePage />
        )}

        {activeView === "ai-love-lab" && (
          <AILoveLabPage 
            user={user} 
            onUpgradePrompt={() => setActiveView("gallery")} 
          />
        )}

        {activeView === "lover-arcade" && (
          isAuthChecking ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" id="arcade-auth-loading">
              <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-display font-medium text-secondary animate-pulse">Whispering to Cupid... Coordinating secure game server...</p>
            </div>
          ) : !user ? (
            <div className="max-w-md mx-auto py-16 px-4">
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl text-xs text-orange-850 mb-6 font-medium text-center">
                🔒 You must be signed in to play multi-user Love Arcade games and trace secret chat lines. Please login to continue!
              </div>
              <AuthPage 
                onAuthSuccess={handleAuthSuccess} 
                onNavigate={setActiveView} 
              />
            </div>
          ) : (
            <ArcadeSpacePage 
              user={user} 
              onUpgradePrompt={() => setActiveView("gallery")} 
            />
          )
        )}
        
        {activeView === "ai-companion" && (
          isAuthChecking ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" id="companion-auth-loading">
              <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-display font-medium text-secondary animate-pulse">Consulting Oracle... Alchemizing premium partnership...</p>
            </div>
          ) : !user ? (
            <div className="max-w-md mx-auto py-16 px-4">
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl text-xs text-orange-850 mb-6 font-medium text-center">
                🔒 You must be signed in to step into the secure romantic companion sanctuary as a premium partner. Please login to continue!
              </div>
              <AuthPage 
                onAuthSuccess={handleAuthSuccess} 
                onNavigate={setActiveView} 
              />
            </div>
          ) : (
            <AICompanionPage 
              user={user}
              onUpdateUser={handleUpdateProfile}
              onSetActiveView={setActiveView}
            />
          )
        )}

        {activeView === "gallery" && (
          <GalleryPage 
            onSelectTemplate={handleSelectTemplateAndEdit} 
            onNavigate={setActiveView} 
            user={user}
            onUpdateUser={handleUpdateProfile}
          />
        )}
        
        {activeView === "leaderboard" && (
          <PublicBoardPage 
            uid={user?.uid || null} 
          />
        )}

        {activeView === "connect-space" && (
          isAuthChecking ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" id="connect-auth-loading">
              <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-display font-medium text-secondary animate-pulse">Syncing matches registry...</p>
            </div>
          ) : !user ? (
            <div className="max-w-md mx-auto py-16 px-4">
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl text-xs text-orange-850 mb-6 font-medium text-center">
                🔒 You must be signed in to step into the Matching Chamber. Please login to continue!
              </div>
              <AuthPage 
                onAuthSuccess={handleAuthSuccess} 
                onNavigate={setActiveView} 
              />
            </div>
          ) : (
            <ConnectSpacePage 
              user={user}
              onNavigate={setActiveView}
              onUpdateUser={handleUpdateProfile}
            />
          )
        )}
        
        {activeView === "insights" && (
          <InsightsPage />
        )}
        
        {activeView === "help" && (
          <HelpPage />
        )}
        
        {activeView === "dashboard" && user && (
          <DashboardPage 
            user={user} 
            onUpdateProfile={handleUpdateProfile} 
            onLogout={handleLogout} 
            onNavigate={setActiveView} 
          />
        )}
      </main>

      {/* Footer copyright */}
      <footer className="py-10 border-t border-primary/5 text-center text-xs font-light text-on-surface-variant/80 space-y-3 bg-surface-container-low select-none">
        <p className="font-display font-medium text-sm text-primary flex items-center justify-center gap-1.5">
          <Heart size={14} fill="currentColor" className="text-secondary animate-pulse" /> CheriNotes © 2026. Custom Digital Keepsakes.
        </p>
        <p className="text-[10px] opacity-75 max-w-sm mx-auto leading-relaxed">
          Unapologetically romantic. Handmades optimized with tamperproof tokens, Base64 encryption models and secure local caches.
        </p>
      </footer>
    </div>
  );
}
