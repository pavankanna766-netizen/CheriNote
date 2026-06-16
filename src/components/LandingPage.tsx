import React from "react";
import { Heart, Stars, Ribbon, ArrowRight, ShieldCheck, BarChart3, Image as ImageIcon } from "lucide-react";
import { motion } from "motion/react";
import { INITIAL_TEMPLATES } from "../firebase";

interface LandingPageProps {
  onNavigate: (view: string) => void;
  onSelectTemplate: (templateId: string) => void;
  uid: string | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onSelectTemplate, uid }) => {
  return (
    <div className="w-full min-h-screen text-on-surface flex flex-col items-center justify-start pb-20">
      {/* Hero Banner Section */}
      <section className="relative w-full max-w-5xl px-6 pt-16 md:pt-24 pb-16 flex flex-col items-center text-center overflow-hidden">
        {/* Floating background decorative hearts */}
        <div className="absolute top-10 left-5 text-brand-soft-pink opacity-25 animate-bounce" style={{ animationDuration: "3s" }}>
          <Heart size={44} fill="currentColor" />
        </div>
        <div className="absolute top-36 right-10 text-brand-soft-pink opacity-25 animate-bounce" style={{ animationDuration: "5s" }}>
          <Heart size={32} fill="currentColor" />
        </div>
        <div className="absolute bottom-16 left-12 text-brand-soft-pink opacity-15 animate-pulse">
          <Stars size={40} />
        </div>

        {/* Elegant top micro-badge */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-semibold tracking-wide border border-primary-container mb-6 shadow-xs"
        >
          <Ribbon size={14} className="animate-spin-slow text-secondary" />
          <span>CELEBRATING COQUETTE ROMANCE</span>
        </motion.div>

        {/* Main Header typography */}
        <motion.h1 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-display text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-on-surface max-w-4xl leading-[1.1] mb-6"
        >
          Digital love letters for the <span className="text-secondary italic underline decoration-wavy decoration-primary-container pr-2">modern muse.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-base sm:text-lg md:text-xl text-on-surface-variant max-w-2xl font-light mb-10 leading-relaxed"
        >
          CheriNotes turns your deepest romantic confessions into interactive, playful exhibits. High-touch elegance, zero technical friction.
        </motion.p>

        {/* Hero Actions */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center items-center z-10"
        >
          <button
            onClick={() => onNavigate("editor")}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-secondary hover:bg-secondary-container text-on-secondary hover:text-on-secondary-container font-medium tracking-wide flex items-center justify-center gap-2 transition duration-300 shadow-md transform hover:-translate-y-0.5 active:translate-y-0"
            id="hero-create-btn"
          >
            Create Your Letter <ArrowRight size={18} />
          </button>
          
          <button
            onClick={() => onNavigate("gallery")}
            className="w-full sm:w-auto px-8 py-4 rounded-xl border border-primary/20 bg-surface-container-lowest hover:bg-surface-container-low text-primary font-medium tracking-wide transition duration-300 flex items-center justify-center gap-2"
            id="hero-templates-btn"
          >
            Explore Master Gallery
          </button>
        </motion.div>
      </section>

      {/* Decorative Ribbon Divider */}
      <div className="ribbon-divider w-full max-w-4xl my-4"></div>

      {/* Live Featured Layouts / Showcase */}
      <section className="w-full max-w-5xl px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-on-surface flex items-center gap-2">
              <Stars className="text-secondary" />
              Handcrafted Visual Masterpieces
            </h2>
            <p className="text-on-surface-variant text-sm font-light mt-1">
              Beautiful presets optimized for instant loading, encrypted transfer and customizable reach.
            </p>
          </div>
          <button
            onClick={() => onNavigate("gallery")}
            className="text-xs font-semibold uppercase tracking-wider text-secondary hover:text-primary flex items-center gap-1 group transition"
          >
            View all presets <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {INITIAL_TEMPLATES.slice(0, 4).map((template, idx) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * idx }}
              className="group bg-surface-container-lowest rounded-2xl overflow-hidden border border-primary/10 shadow-xs cursor-pointer hover:shadow-md transition duration-300 flex flex-col justify-between"
              onClick={() => {
                onSelectTemplate(template.id);
                onNavigate("editor");
              }}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-surface-container">
                <img
                  src={template.imageUrl}
                  alt={template.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-white/90 text-[10px] uppercase font-bold tracking-wider text-secondary shadow-xs">
                  {template.tag}
                </span>
                {template.isPremium && (
                  <span className="absolute bottom-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-secondary text-white text-[9px] uppercase font-bold tracking-widest">
                    ★ Premium
                  </span>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-0.5">
                    <h3 className="font-display font-bold text-sm text-on-surface group-hover:text-secondary transition">
                      {template.title}
                    </h3>
                  </div>
                  <p className="text-[11px] text-on-surface-variant font-light line-clamp-2 leading-relaxed">
                    {template.description}
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-primary/5 flex items-center justify-between text-[10px] text-on-surface-variant font-mono">
                  <span>Likes: {template.likesCount}</span>
                  <span className="text-primary font-medium group-hover:translate-x-0.5 transition-transform">Customize →</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Feature Pillar Highlights */}
      <section className="w-full max-w-5xl px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-surface-container-low rounded-2xl border border-primary/5 flex gap-4">
            <div className="p-3 bg-primary-fixed text-on-primary-fixed rounded-xl h-12 w-12 flex items-center justify-center shrink-0">
              <Stars className="text-secondary" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-on-surface mb-1">Playful Evasion Controls</h3>
              <p className="text-xs text-on-surface-variant font-light leading-relaxed">
                The whimsical &quot;No&quot; button physically evades your partner&apos;s mouse cursor, delivering an engaging process where they can only choose absolute affection!
              </p>
            </div>
          </div>

          <div className="p-6 bg-surface-container-low rounded-2xl border border-primary/5 flex gap-4">
            <div className="p-3 bg-primary-fixed text-on-primary-fixed rounded-xl h-12 w-12 flex items-center justify-center shrink-0">
              <ShieldCheck className="text-secondary" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-on-surface mb-1">Base64 Privacy Protection</h3>
              <p className="text-xs text-on-surface-variant font-light leading-relaxed">
                Send love letters without worry. Passwords and full customized payloads are packed directly in clean, tamperproof tokens ensuring your details stay completely safe from casual lookups.
              </p>
            </div>
          </div>

          <div className="p-6 bg-surface-container-low rounded-2xl border border-primary/5 flex gap-4">
            <div className="p-3 bg-primary-fixed text-on-primary-fixed rounded-xl h-12 w-12 flex items-center justify-center shrink-0">
              <BarChart3 className="text-secondary" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-on-surface mb-1">Real-Time Muse Insights</h3>
              <p className="text-xs text-on-surface-variant font-light leading-relaxed">
                Keep an elegant pulse on active reach, custom proposal conversions, geographic hearts, and top-ranking love declarations in our comprehensive real-time analytical view.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
