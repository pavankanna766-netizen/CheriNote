import React, { useState, useEffect } from "react";
import { User, ShieldCheck, FileText, Settings2, Trash2, Camera, LogOut, CheckCircle2, AlertTriangle, Link as LinkIcon, Heart, Eye } from "lucide-react";
import { AppDatabase, generateSecureLink } from "../firebase";
import { CustomProposal, UserProfile } from "../types";
import { motion } from "motion/react";
import { GoogleAdSense } from "./GoogleAdSense";


interface DashboardPageProps {
  user: UserProfile;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  onLogout: () => void;
  onNavigate: (view: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ user, onUpdateProfile, onLogout, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<"history" | "profile">("history");
  const [myProposals, setMyProposals] = useState<CustomProposal[]>([]);
  const [editingName, setEditingName] = useState(user.name);
  const [mobileNumber, setMobileNumber] = useState(user.mobileNumber || "");
  const [bio, setBio] = useState(user.bio || "");
  const [gender, setGender] = useState(user.gender || "Female");
  const [photoError, setPhotoError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    let active = true;
    const loadProposals = async () => {
      try {
        const list = await AppDatabase.getProposals();
        const filtered = list.filter(p => p.authorId === user.uid || p.senderName === user.name);
        if (active) setMyProposals(filtered);
      } catch (e) {
        console.error("Failed to load proposals:", e);
      }
    };
    loadProposals();
    return () => {
      active = false;
    };
  }, [user]);

  const handleUpdateDetails = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      name: editingName.trim() || user.name,
      mobileNumber: mobileNumber.trim() || undefined,
      bio: bio.trim(),
      gender: gender
    });
    setSuccessMsg("Profile credentials updated successfully.");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  // Base64 file uploader validating JPG size constraint to secure client storage limits!
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate JPG format
    if (file.type !== "image/jpeg" && file.type !== "image/jpg") {
      setPhotoError("Only JPEG/JPG image format is authorized.");
      return;
    }

    // Validate size (1MB max, e.g., 1,024,000 bytes)
    const MAX_SIZE_BYTES = 1048576; // 1MB
    if (file.size > MAX_SIZE_BYTES) {
      setPhotoError(`File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Authorized limit: 1.00MB.`);
      return;
    }

    setPhotoError("");
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onUpdateProfile({ photoUrl: reader.result });
        setSuccessMsg("Aesthetic Muse image updated successfully.");
        setTimeout(() => setSuccessMsg(""), 2000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteProposal = async (id: string) => {
    try {
      await AppDatabase.deleteProposal(id);
      setMyProposals(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      console.error("Failed to delete proposal:", e);
    }
  };

  return (
    <div className="w-full min-h-screen pb-20 px-4 md:px-8 max-w-5xl mx-auto">
      {/* Intro Greetings card */}
      <section className="bg-surface-container-low p-6 md:p-8 rounded-3xl border border-primary/5 flex flex-col md:flex-row items-center justify-between gap-6 mb-8 mt-6">
        <div className="flex items-center gap-4.5">
          <div className="relative group">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-secondary bg-surface-container">
              <img src={user.photoUrl} alt="Lover profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            </div>
            <label className="absolute bottom-0 right-0 p-1 bg-secondary text-white rounded-full cursor-pointer shadow-xs hover:bg-secondary-container transition">
              <Camera size={12} />
              <input type="file" accept=".jpg,.jpeg" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>
          <div>
            <span className="text-[10px] tracking-widest text-[#bb0026]/85 uppercase font-extrabold flex items-center gap-1">
              <ShieldCheck size={12} /> SECURED LOVER PORTAL
            </span>
            <h1 className="font-display text-2xl font-black text-on-surface flex items-center gap-1.5 flex-wrap">
              Dearest, {user.name}
              {(user.isVerified || user.isPro || (user.activePlan && user.activePlan !== "none")) && (
                <span className="inline-flex items-center justify-center p-0.5 bg-[#a855f7]/20 rounded-full text-[#8b5cf6]" title="Verified Creator & Pro Muse">
                  <CheckCircle2 size={16} fill="currentColor" className="text-white" />
                </span>
              )}
            </h1>
            <p className="text-xs text-on-surface-variant font-light">{user.email}</p>
            {user.bio && (
              <p className="text-xs text-[#9d364a] font-medium mt-1.5 italic max-w-sm">
                &ldquo;{user.bio}&rdquo;
              </p>
            )}
          </div>
        </div>

        <button
          onClick={onLogout}
          className="px-4 py-2 bg-surface-container hover:bg-red-100 hover:text-red-700 text-on-surface-variant rounded-xl text-xs font-semibold tracking-wide transition border border-primary/5 flex items-center gap-1.5 cursor-pointer"
        >
          <LogOut size={14} /> Close Session
        </button>
      </section>

      {/* Primary tabs */}
      <div className="flex gap-4 border-b border-primary/10 mb-8 pb-px">
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-3 text-xs uppercase font-extrabold tracking-widest transition-all relative ${
            activeTab === "history" ? "text-secondary font-black" : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          My Kept Confessions {myProposals.length > 0 && `(${myProposals.length})`}
          {activeTab === "history" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary"></span>}
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={`pb-3 text-xs uppercase font-extrabold tracking-widest transition-all relative ${
            activeTab === "profile" ? "text-secondary font-black" : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Interactive Credentials & Settings
          {activeTab === "profile" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary"></span>}
        </button>
      </div>

      {/* Tab Contents: History drafts and logs */}
      {activeTab === "history" ? (
        <section className="space-y-6">
          {myProposals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myProposals.map((prop) => {
                const secureShareUrl = generateSecureLink(prop);
                return (
                  <div key={prop.id} className="bg-surface-container-lowest border border-primary/10 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-[10px] font-mono text-on-surface-variant lowercase">Id: {prop.id}</span>
                          <h3 className="font-display font-extrabold text-base text-on-surface">To: {prop.receiverName}</h3>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider ${
                          prop.yesClicked ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {prop.yesClicked ? "Affirmed!" : "Drafted"}
                        </span>
                      </div>

                      <p className="text-xs text-on-surface-variant font-light line-clamp-3 leading-relaxed mb-4 italic">
                        &quot;{prop.message}&quot;
                      </p>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-primary/5">
                      <div className="flex justify-between items-center text-[10px] text-on-surface-variant font-mono">
                        <span className="flex items-center gap-1"><Eye size={12} /> {prop.viewsCount || 1} Reads</span>
                        <span className="flex items-center gap-1"><Heart size={12} fill={prop.yesClicked ? "currentColor" : "none"} className="text-secondary" /> {prop.noAttempts || 0} No evasions</span>
                        <span>{prop.isPrivate ? "🔒 Private" : "🌐 Public board"}</span>
                      </div>

                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          onClick={() => {
                            // Copy share URL
                            navigator.clipboard.writeText(secureShareUrl);
                            alert("Secure keepsake URL copied successfully!");
                          }}
                          className="p-2 border border-primary/10 hover:border-secondary hover:text-secondary rounded-lg text-xs transition cursor-pointer"
                          title="Copy secure link"
                        >
                          <LinkIcon size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteProposal(prop.id)}
                          className="p-2 border border-primary/10 hover:border-red-600 hover:text-red-700 rounded-lg text-xs transition cursor-pointer"
                          title="Purge proposal"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-surface-container-low rounded-2xl border border-primary/5">
              <FileText size={44} className="mx-auto text-on-surface-variant/50 mb-2" />
              <h3 className="font-display text-base font-bold text-on-surface">The Archives are vacant</h3>
              <p className="text-xs text-on-surface-variant font-light max-w-xs mx-auto mt-1 leading-relaxed">
                You haven&apos;t sculpted any keepsake templates or secured proposal links yet. Visit the Letter desk to seal your first.
              </p>
              <button
                onClick={() => onNavigate("editor")}
                className="mt-5 px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary-container text-on-secondary hover:text-on-secondary-container text-xs font-semibold tracking-wider transition"
              >
                Go to Letter Desk
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="bg-surface-container-lowest border border-primary/10 rounded-2xl p-6 md:p-8">
          <div className="flex gap-3 mb-6 items-center">
            <span className="p-2.5 bg-primary-fixed text-secondary rounded-xl">
              <Settings2 size={20} />
            </span>
            <div>
              <h3 className="font-display font-extrabold text-[#864e5a] text-lg">Muses Credentials Administration</h3>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-light">Custom updates assigned locally to your profile metadata</p>
            </div>
          </div>

          <form onSubmit={handleUpdateDetails} className="space-y-5 max-w-xl">
            {/* JPG Size errors notifications */}
            {photoError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle size={16} /> {photoError}
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 size={16} /> {successMsg}
              </div>
            )}

            {/* Profile Picture picker button */}
            <div className="space-y-1.5 pb-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block">Profile Coquette Image (JPEG size limit: 1MB)</label>
              <div className="flex items-center gap-4">
                <img src={user.photoUrl} alt="Lover profile" referrerPolicy="no-referrer" className="w-[52px] h-[52px] border-2 border-secondary rounded-full object-cover" />
                <label className="px-4 py-2 rounded-xl bg-surface-container border border-primary/5 hover:bg-surface-container-high transition text-xs font-semibold cursor-pointer">
                  Choose JPG Photo
                  <input type="file" accept=".jpg,.jpeg" onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>
            </div>

            {/* Edit Name */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block">Edit Public Name</label>
              <input
                type="text"
                required
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container rounded-xl border border-primary/5 text-xs text-on-surface focus:border-secondary focus:outline-hidden transition"
              />
            </div>

            {/* Mobile Number option */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block">Assigned Mobile Number</label>
              <input
                type="text"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="+1 (555) 019-2834"
                className="w-full px-4 py-3 bg-surface-container rounded-xl border border-primary/5 text-xs text-on-surface focus:border-secondary focus:outline-hidden transition"
              />
            </div>

            {/* Custom Bio with limited words/characters */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block">Interactive Romance Bio</label>
                <span className={`text-[10px] font-bold ${bio.length >= 140 ? "text-red-500 font-black animate-pulse" : "text-[#9d364a]"}`}>
                  {160 - bio.length} chars left
                </span>
              </div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 160))}
                rows={3}
                placeholder="Share a short romantic update, favorite love lyric, or your status (e.g., 'Writing sweet lace letters under Paris twilight... 🌸')"
                className="w-full px-4 py-3 bg-surface-container rounded-xl border border-primary/5 text-xs text-on-surface focus:border-secondary focus:outline-hidden resize-none transition"
              />
              <p className="text-[10px] text-on-surface-variant/80 italic font-medium">
                Keep it short, lyrical, and beautiful. Your bio is stored in your secure lover profile.
              </p>
            </div>

            {/* My Gender selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block">My Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container rounded-xl border border-primary/5 text-xs text-on-surface focus:outline-hidden focus:border-secondary transition cursor-pointer"
                id="edit-profile-gender-select"
              >
                <option value="Female">Female ♀</option>
                <option value="Male">Male ♂</option>
                <option value="Non-Binary">Non-Binary ⚧</option>
                <option value="Other">Other</option>
              </select>
              <p className="text-[9px] text-on-surface-variant/80 italic font-medium">
                Used to pair with opposite gender connections for private chat rooms.
              </p>
            </div>

            <button
              type="submit"
              className="py-3.5 px-6 rounded-xl bg-secondary hover:bg-secondary-container text-on-secondary hover:text-on-secondary-container transition text-xs font-bold tracking-wide uppercase shadow-xs cursor-pointer"
            >
              Commit Changes
            </button>
          </form>
        </section>
      )}

      {/* Google AdSense or Aesthetic Sponsor Slot */}
      <GoogleAdSense className="mt-8" />
    </div>
  );
};
