import React, { useState } from "react";
import { User, Mail, Eye, EyeOff, Sparkles, Phone, Lock, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from "firebase/auth";
import { AppDatabase, auth } from "../firebase";

interface AuthPageProps {
  onAuthSuccess: (user: { uid: string; name: string; email: string; photoUrl: string; mobileNumber?: string }) => void;
  onNavigate: (view: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess, onNavigate }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Helper validation matching requirements: sanitizing and validating input fields
  const validateInputs = () => {
    if (!email || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return false;
    }
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return false;
    }
    if (!isLogin) {
      if (!name.trim()) {
        setErrorMessage("Please enter your full name.");
        return false;
      }
      // Simple phone sanitization check
      const phoneDigits = mobile.replace(/\D/g, "");
      if (mobile && phoneDigits.length < 10) {
        setErrorMessage("Please enter a valid 10-digit mobile number.");
        return false;
      }
    }
    setErrorMessage("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (isLogin) {
        // Sign In via Real Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const loggedUser = userCredential.user;
        const payload = {
          uid: loggedUser.uid,
          name: loggedUser.displayName || loggedUser.email?.split("@")[0].toUpperCase() || "Lover",
          email: loggedUser.email || email,
          photoUrl: loggedUser.photoURL || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${encodeURIComponent(loggedUser.uid)}`
        };
        setSuccessMessage("Welcome back, Lover!");
        setTimeout(() => {
          setIsLoading(false);
          onAuthSuccess(payload);
          onNavigate("dashboard");
        }, 1200);
      } else {
        // Register via Real Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const loggedUser = userCredential.user;
        try {
          await updateProfile(loggedUser, { displayName: name.trim() });
        } catch (profileErr) {
          console.warn("Could not set displayName during registration auto-sync", profileErr);
        }
        const payload = {
          uid: loggedUser.uid,
          name: name.trim(),
          email: loggedUser.email || email,
          photoUrl: `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${encodeURIComponent(name || email)}`,
          mobileNumber: mobile || undefined
        };
        setSuccessMessage("Cherished! Account created successfully!");
        setTimeout(() => {
          setIsLoading(false);
          onAuthSuccess(payload);
          onNavigate("dashboard");
        }, 1500);
      }
    } catch (e: any) {
      setIsLoading(false);
      let cleanMsg = e.message || "Authentication failed.";
      if (cleanMsg.includes("auth/invalid-credential") || cleanMsg.includes("invalid-password")) {
        cleanMsg = "Invalid email or matching password combination.";
      } else if (cleanMsg.includes("auth/email-already-in-use")) {
        cleanMsg = "This email is already in use by another account.";
      } else if (cleanMsg.includes("auth/operation-not-allowed")) {
        cleanMsg = "Email/Password sign-in is not yet enabled in the Firebase Console. Please try Google authentication.";
      }
      setErrorMessage(cleanMsg);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(auth, provider);
      const loggedUser = userCredential.user;
      const payload = {
        uid: loggedUser.uid,
        name: loggedUser.displayName || "Google Muse",
        email: loggedUser.email || "",
        photoUrl: loggedUser.photoURL || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${encodeURIComponent(loggedUser.uid)}`
      };
      setSuccessMessage("Successfully Authenticated via Google!");
      setTimeout(() => {
        setIsLoading(false);
        onAuthSuccess(payload);
        onNavigate("dashboard");
      }, 1000);
    } catch (e: any) {
      setIsLoading(false);
      let errorMsg = e.message || "Google Authentication declined or offline.";
      if (e.code === 'auth/unauthorized-domain') {
        errorMsg = `Domain not authorized! Please add exactly "${window.location.hostname}" to Firebase Console -> Authentication -> Settings -> Authorized domains (it can take up to 2-3 minutes to propagate).`;
      } else if (e.code === 'auth/popup-closed-by-user') {
        errorMsg = "Sign-in popup was closed before completion.";
      }
      setErrorMessage(errorMsg);
    }
  };

  return (
    <div className="w-full min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-surface-container-lowest border border-primary/10 rounded-3xl overflow-hidden shadow-xl relative">
        {/* Visual Coquette Ornament top */}
        <div className="h-2 bg-gradient-to-r from-primary-container via-secondary to-primary-container"></div>
        
        <div className="p-8">
          <div className="flex flex-col items-center text-center mb-8">
            <span className="p-3 bg-primary-fixed rounded-2xl block text-secondary mb-3 shadow-xs">
              <Sparkles size={24} />
            </span>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold text-on-surface">
              {isLogin ? "Welcome, Lover" : "Join the Archive"}
            </h2>
            <p className="text-xs text-on-surface-variant font-light mt-1.5 max-w-[280px]">
              {isLogin
                ? "Enter your secure credentials to coordinate valentines and access analytics."
                : "Register with verified credentials to design secure romantic drafts."}
            </p>
          </div>

          {/* Tab Selection */}
          <div className="grid grid-cols-2 p-1.5 rounded-xl bg-surface-container mb-6 border border-primary/5">
            <button
              onClick={() => {
                setIsLogin(true);
                setErrorMessage("");
                setSuccessMessage("");
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all duration-300 ${
                isLogin ? "block bg-white text-secondary shadow-xs font-bold" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setErrorMessage("");
                setSuccessMessage("");
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all duration-300 ${
                !isLogin ? "block bg-white text-secondary shadow-xs font-bold" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name field (Register Only) */}
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block">Full Name</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Anastasia Romanova"
                    className="w-full pl-10 pr-4 py-3 bg-surface-container rounded-xl border border-primary/5 text-xs focus:border-secondary focus:outline-hidden transition"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block">Email Address</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-surface-container rounded-xl border border-primary/5 text-xs focus:border-secondary focus:outline-hidden transition"
                />
              </div>
            </div>

            {/* Mobile Field (Register Only) */}
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block">Mobile Number (Optional)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    <Phone size={16} />
                  </span>
                  <input
                    type="text"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    className="w-full pl-10 pr-4 py-3 bg-surface-container rounded-xl border border-primary/5 text-xs focus:border-secondary focus:outline-hidden transition"
                  />
                </div>
              </div>
            )}

            {/* Password Field */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block">Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-surface-container rounded-xl border border-primary/5 text-xs focus:border-secondary focus:outline-hidden transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-secondary transition"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-lg bg-red-100 text-red-700 text-xs text-center border border-red-200">
                {errorMessage}
              </motion.div>
            )}

            {/* Success Message */}
            {successMessage && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-lg bg-green-100 text-green-700 text-xs text-center border border-green-200 flex items-center justify-center gap-1.5">
                <CheckCircle2 size={14} /> {successMessage}
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 mt-2 bg-secondary hover:bg-secondary-container text-on-secondary hover:text-on-secondary-container rounded-xl font-semibold tracking-wide text-xs transition duration-300 flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                isLogin ? "Sign Into My Vault" : "Initialize Secured Account"
              )}
            </button>
          </form>

          {/* Social Sign-in divider */}
          <div className="relative my-6 flex py-1 items-center">
            <div className="flex-grow border-t border-primary/10"></div>
            <span className="flex-shrink mx-4 text-[10px] text-on-surface-variant font-medium tracking-widest uppercase">Or continues with</span>
            <div className="flex-grow border-t border-primary/10"></div>
          </div>

          {/* Social login buttons */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full py-3 bg-white hover:bg-surface-container-low text-on-surface border border-primary/10 hover:border-primary/20 rounded-xl font-bold tracking-wide text-xs transition flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
              <path
                fill="#EA4335"
                d="M12 5.04c1.73 0 3.28.6 4.5 1.76l3.36-3.36C17.84 1.48 15.11.75 12 .75 7.42.75 3.51 3.38 1.62 7.19l3.96 3.07C6.51 7.23 9.01 5.04 12 5.04z"
              />
              <path
                fill="#4285F4"
                d="M23.25 12.25c0-.82-.07-1.61-.21-2.38H12v4.5h6.31c-.27 1.43-1.08 2.64-2.29 3.45l3.56 2.76c2.08-1.92 3.29-4.75 3.29-8.33z"
              />
              <path
                fill="#FBBC05"
                d="M5.58 14.86c-.24-.72-.38-1.49-.38-2.3c0-.81.14-1.58.38-2.3L1.62 7.19C.59 9.14 0 11.45 0 13.86c0 2.41.59 4.72 1.62 6.67l3.96-3.67z"
              />
              <path
                fill="#34A853"
                d="M12 23.25c3.24 0 5.96-1.07 7.95-2.9l-3.56-2.76c-.99.66-2.26 1.06-3.89 1.06-2.99 0-5.49-2.19-6.42-5.22L1.62 16.5c1.89 3.81 5.8 6.75 10.38 6.75z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>
      </div>
    </div>
  );
};
