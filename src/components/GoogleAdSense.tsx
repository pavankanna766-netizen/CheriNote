import React, { useEffect, useState } from "react";
import { Sparkles, ShieldCheck, Heart, Info, DollarSign } from "lucide-react";

interface GoogleAdProps {
  className?: string;
  slotId?: string;
  format?: "auto" | "fluid" | "rectangle";
  responsive?: boolean;
}

export const GoogleAdSense: React.FC<GoogleAdProps> = ({
  className = "",
  slotId,
  format = "auto",
  responsive = true,
}) => {
  const metaEnv = (import.meta as any).env || {};
  const adClientId = metaEnv.VITE_ADSENSE_CLIENT_ID;
  const defaultSlotId = slotId || metaEnv.VITE_ADSENSE_SLOT_ID;
  const [adLoaded, setAdLoaded] = useState(false);
  const [isAdBlockerActive, setIsAdBlockerActive] = useState(false);

  useEffect(() => {
    if (!adClientId) return;

    // 1. Double Protection: Asynchronously insert AdSense root script block if missing
    const scriptSrc = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClientId}`;
    const existingScript = document.querySelector(`script[src="${scriptSrc}"]`);
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = scriptSrc;
      script.async = true;
      script.crossOrigin = "anonymous";
      // If payment or ad blockers prevent loading, handle gracefully
      script.onerror = () => {
        console.warn("Google AdSense core script was blocked or failed loading.");
        setIsAdBlockerActive(true);
      };
      document.head.appendChild(script);
    }

    // 2. Safe execution frame to avoid double-pushes or layout shift breakage
    const pushTimeout = setTimeout(() => {
      try {
        const adsbygoogle = (window as any).adsbygoogle;
        if (adsbygoogle) {
          adsbygoogle.push({});
          setAdLoaded(true);
        } else {
          // Script is script-blocked
          setIsAdBlockerActive(true);
        }
      } catch (e) {
        console.warn("AdSense layout init caught (usually safe in sandboxes):", e);
        // Do not crash the app under any pressure
      }
    }, 600);

    return () => clearTimeout(pushTimeout);
  }, [adClientId, defaultSlotId]);

  // Case A: Real configured production AdSense Unit
  if (adClientId && defaultSlotId && !isAdBlockerActive) {
    return (
      <div className={`w-full overflow-hidden my-6 mx-auto text-center ${className}`}>
        <span className="text-[9px] uppercase tracking-wider font-bold text-neutral-400 block mb-1">
          Sponsored Link
        </span>
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={adClientId}
          data-ad-slot={defaultSlotId}
          data-ad-format={format}
          data-full-width-responsive={responsive ? "true" : "false"}
        />
        {/* Anti-Shift Empty Frame height spacer prior to ad delivery */}
        {!adLoaded && (
          <div className="w-full h-24 bg-surface-container-low border border-primary/5 rounded-2xl animate-pulse flex items-center justify-center text-xs text-on-surface-variant/40">
            Fetching secure ad frame...
          </div>
        )}
      </div>
    );
  }

  // Case B: Elegant, future-proof Coquette Sponsor placeholder for Sandbox/Development or missing keys.
  return (
    <div className={`w-full max-w-xl mx-auto my-8 p-6 rounded-3xl bg-[#fffcf8] border border-[#f0e1d2] shadow-3xs relative overflow-hidden text-center group ${className}`}>
      {/* Decorative top ambient bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-200 via-rose-300 to-rose-200" />
      
      <div className="space-y-4">
        {/* Subtle ribbon icon */}
        <div className="mx-auto w-10 h-10 rounded-full bg-[#fff0f3] border border-[#ffd2dc] flex items-center justify-center text-rose-500 shadow-3xs transition-transform duration-500 group-hover:scale-110">
          <Heart size={16} fill="currentColor" className="animate-pulse" />
        </div>

        <div className="space-y-1">
          <div className="flex justify-center items-center gap-1.5">
            <span className="text-[10px] font-extrabold text-[#bb0026] uppercase tracking-widest font-mono bg-[#fff0f3] px-2 py-0.5 rounded-full">
              MONETIZATION COUPLER
            </span>
          </div>
          <h4 className="font-display text-base font-black text-[#2b201d] tracking-tight">
            Google AdSense Zone
          </h4>
          <p className="text-[11px] text-neutral-500 font-light max-w-sm mx-auto leading-relaxed">
            Your premium note board is fully prepared to earn revenue. Once you register a custom domain and get approved by AdSense, populate your keys in your environment variables to launch ads.
          </p>
        </div>

        {/* Informative Help Guide Badge info */}
        <div className="p-3 bg-[#fdfaf6] border border-[#ecdac7] rounded-2xl text-left max-w-md mx-auto grid grid-cols-12 gap-3.5 items-start">
          <div className="col-span-1 mt-0.5">
            <Info size={14} className="text-[#a00020]" />
          </div>
          <div className="col-span-11 space-y-1 leading-normal">
            <h5 className="text-[10.5px] font-bold text-[#2b201d]">To Monetize This Space:</h5>
            <ol className="list-decimal list-inside text-[9.5px] text-neutral-500 space-y-1 font-light">
              <li>Register your custom domain with Google AdSense.</li>
              <li>Provide <code className="font-mono bg-neutral-100 text-rose-700 px-1 rounded-sm">VITE_ADSENSE_CLIENT_ID</code> in the App Secrets.</li>
              <li>Configure <code className="font-mono bg-neutral-100 text-rose-700 px-1 rounded-sm">VITE_ADSENSE_SLOT_ID</code> to place ads instantly.</li>
            </ol>
          </div>
        </div>

        {/* Sandbox compliance signal */}
        <div className="flex items-center justify-center gap-1.5 text-[9px] text-[#864e5a] font-mono shrink-0 pt-1">
          <ShieldCheck size={11} className="text-emerald-600" />
          <span>Double-Protected Sandbox Mode Active</span>
        </div>
      </div>
    </div>
  );
};
