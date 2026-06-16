import React, { useState, useEffect } from "react";
import { 
  Search, 
  Heart, 
  Sparkles, 
  SlidersHorizontal, 
  ArrowUpRight, 
  Crown, 
  ShoppingBag, 
  Plus, 
  Check, 
  X, 
  CreditCard, 
  ShieldCheck,
  AlertCircle,
  QrCode,
  Smartphone
} from "lucide-react";
import { AppDatabase, auth } from "../firebase";
import { NoteTemplate, UserProfile, PricingConfig, UserTemplate } from "../types";
import { GoogleAdSense } from "./GoogleAdSense";


interface GalleryPageProps {
  onSelectTemplate: (templateId: string) => void;
  onNavigate: (view: string) => void;
  user?: UserProfile | null;
  onUpdateUser?: (updates: Partial<UserProfile>) => void;
}

export const GalleryPage: React.FC<GalleryPageProps> = ({ 
  onSelectTemplate, 
  onNavigate,
  user,
  onUpdateUser
}) => {
  const isAdminUser = user?.email?.toLowerCase() === "pavankanna766@gmail.com";

  // Navigation tabs within Gallery page: "templates" | "user-templates" | "pricing" | "admin"
  const [activeSubTab, setActiveSubTab] = useState<"templates" | "user-templates" | "pricing" | "admin">("templates");
  
  // Custom states
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"All" | "Sweet" | "Sassy" | "Spooky">("All");
  const [premiumModalTemplate, setPremiumModalTemplate] = useState<NoteTemplate | null>(null);

  // User templates additional state variables for Creator Space / AI verification
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadCategory, setUploadCategory] = useState<"Sweet" | "Sassy" | "Spooky">("Sweet");
  const [uploadImageUrl, setUploadImageUrl] = useState("https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=600");
  const [uploadingState, setUploadingState] = useState<"idle" | "verifying" | "saving" | "done">("idle");
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [aiReviewResult, setAiReviewResult] = useState<{ status: string; aiFeedback: string; tag: string; category: string } | null>(null);
  const [simulatedCountOffset, setSimulatedCountOffset] = useState(0);

  // Sync user templates on mount / changes
  useEffect(() => {
    let active = true;
    const loadUserTemplates = async () => {
      try {
        const uTemplates = await AppDatabase.fetchUserTemplates();
        if (active) {
          setUserTemplates(uTemplates);
        }
      } catch (e) {
        console.warn("Could not sync user templates on mount:", e);
      }
    };
    loadUserTemplates();
    return () => {
      active = false;
    };
  }, [user, activeSubTab]);

  const myTemplates = userTemplates.filter(t => t.userId === user?.uid);
  const verifiedCount = myTemplates.filter(t => t.status === "verified").length;
  const meetsVerificationThreshold = (verifiedCount + simulatedCountOffset) >= 500;
  const isCurrentlyVerified = !!(user?.isVerified || user?.isPro || (user?.activePlan && user?.activePlan !== "none") || meetsVerificationThreshold);

  const handleDeleteUserTemplate = async (id: string) => {
    if (!window.confirm("Delete this template draft?")) return;
    try {
      await AppDatabase.deleteUserTemplate(id);
      const freshTemplates = await AppDatabase.fetchUserTemplates();
      setUserTemplates(freshTemplates);
    } catch (e) {
      console.warn("Could not delete user template:", e);
    }
  };
  
  // Custom Template Creator / Editor modal state
  const [creatorModalOpen, setCreatorModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NoteTemplate | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState<"Sweet" | "Sassy" | "Spooky">("Sweet");
  const [newTag, setNewTag] = useState<"Popular" | "Trending" | "New Arrival" | "Classic">("New Arrival");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newIsPremium, setNewIsPremium] = useState(false);
  const [creatorError, setCreatorError] = useState("");
  const [creatorSuccess, setCreatorSuccess] = useState("");

  // Amount and pricing configuration
  const [pricing, setPricing] = useState<PricingConfig>(() => AppDatabase.getPricingConfig());
  const [singlePriceInput, setSinglePriceInput] = useState(pricing.singlePrice.toString());
  const [monthlyPriceInput, setMonthlyPriceInput] = useState(pricing.monthlyPrice.toString());
  const [lifetimePriceInput, setLifetimePriceInput] = useState(pricing.lifetimePrice.toString());
  const [upiIdInput, setUpiIdInput] = useState(pricing.upiId || "pavankanna766@ybl");
  const [payeeNameInput, setPayeeNameInput] = useState(pricing.payeeName || "Pavan Kanna");
  const [adminPricingError, setAdminPricingError] = useState("");
  const [adminPricingSuccess, setAdminPricingSuccess] = useState("");

  // Plan Selection Payment checkout modal
  const [checkoutPlan, setCheckoutPlan] = useState<{
    id: "single" | "monthly" | "lifetime";
    title: string;
    price: string;
    templateId?: string;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card">("upi");
  const [upiUtrNumber, setUpiUtrNumber] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [successPurchase, setSuccessPurchase] = useState("");
  const [subscribingLoader, setSubscribingLoader] = useState(false);

  const [templates, setTemplates] = useState<NoteTemplate[]>(() => AppDatabase.getTemplates());

  // Dynamic real-time cloud data load on element mount
  useEffect(() => {
    let active = true;
    const loadCloudStates = async () => {
      try {
        const prices = await AppDatabase.fetchPricingConfig();
        if (active) {
          setPricing(prices);
          setSinglePriceInput(prices.singlePrice.toString());
          setMonthlyPriceInput(prices.monthlyPrice.toString());
          setLifetimePriceInput(prices.lifetimePrice.toString());
          setUpiIdInput(prices.upiId || "pavankanna766@ybl");
          setPayeeNameInput(prices.payeeName || "Pavan Kanna");
        }
      } catch (e) {
        console.warn("Could not sync cloud pricing configuration on mount");
      }

      try {
        const cloudTemplates = await AppDatabase.fetchCloudTemplates();
        if (active) {
          setTemplates(cloudTemplates);
        }
      } catch (e) {
        console.warn("Could not sync cloud templates on mount");
      }
    };
    loadCloudStates();
    return () => {
      active = false;
    };
  }, []);

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                          t.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "All" || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleStartEditTemplate = (template: NoteTemplate) => {
    setEditingTemplate(template);
    setNewTitle(template.title);
    setNewDescription(template.description);
    setNewCategory(template.category);
    setNewTag(template.tag);
    setNewImageUrl(template.imageUrl);
    setNewIsPremium(template.isPremium);
    setCreatorModalOpen(true);
  };

  const handleDeleteTemplateConfirm = async (templateId: string) => {
    if (!window.confirm("Are you absolutely sure you want to delete this template permanently from the gallery?")) {
      return;
    }
    try {
      await AppDatabase.deleteCloudTemplate(templateId);
      const updatedTemplates = await AppDatabase.fetchCloudTemplates();
      setTemplates(updatedTemplates);
    } catch (e) {
      alert("Failed to delete template from gallery registry.");
    }
  };

  const handleSavePricing = async () => {
    setAdminPricingError("");
    setAdminPricingSuccess("");

    const single = parseFloat(singlePriceInput);
    const monthly = parseFloat(monthlyPriceInput);
    const lifetime = parseFloat(lifetimePriceInput);

    if (isNaN(single) || single < 0) {
      setAdminPricingError("Single Unlock amount must be a non-negative number.");
      return;
    }
    if (isNaN(monthly) || monthly < 0) {
      setAdminPricingError("Monthly Plan amount must be a non-negative number.");
      return;
    }
    if (isNaN(lifetime) || lifetime < 0) {
      setAdminPricingError("Lifetime Plan amount must be a non-negative number.");
      return;
    }

    const upiStr = upiIdInput.trim();
    const nameStr = payeeNameInput.trim();

    if (!upiStr || !upiStr.includes("@")) {
      setAdminPricingError("A valid UPI ID/VPA address is required (e.g. username@bank).");
      return;
    }
    if (!nameStr) {
      setAdminPricingError("Legal payee name is required to receive legitimate UPI transfers.");
      return;
    }

    const updatedConfig: PricingConfig = {
      singlePrice: single,
      monthlyPrice: monthly,
      lifetimePrice: lifetime,
      upiId: upiStr,
      payeeName: nameStr
    };

    try {
      await AppDatabase.savePricingConfig(updatedConfig);
      setPricing(updatedConfig);
      setAdminPricingSuccess("Pricing parameters and UPI destination updated on Cloud successfully!");
      setTimeout(() => setAdminPricingSuccess(""), 1800);
    } catch (e) {
      setAdminPricingError("Failed updating cloud pricing configuration variables.");
    }
  };

  const handleCreateTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatorError("");
    setCreatorSuccess("");

    if (!newTitle.trim()) {
      setCreatorError("Please define a cherishable title.");
      return;
    }
    if (!newDescription.trim()) {
      setCreatorError("A brief romantic description is required.");
      return;
    }

    const defaultImage = newCategory === "Sweet" 
      ? "https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&q=80&w=600"
      : newCategory === "Sassy" 
      ? "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&q=80&w=600"
      : "https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=600";

    const customTemplate: NoteTemplate = {
      id: editingTemplate ? editingTemplate.id : "custom-template-" + Date.now(),
      title: newTitle.trim(),
      description: newDescription.trim(),
      category: newCategory,
      tag: newTag,
      imageUrl: newImageUrl.trim() || (editingTemplate ? editingTemplate.imageUrl : defaultImage),
      isPremium: newIsPremium,
      likesCount: editingTemplate ? editingTemplate.likesCount : 0,
      viewsCount: editingTemplate ? editingTemplate.viewsCount : 0
    };

    try {
      await AppDatabase.saveCloudTemplate(customTemplate);
      const updatedList = await AppDatabase.fetchCloudTemplates();
      setTemplates(updatedList);
      
      setCreatorSuccess(editingTemplate ? "Template parameters updated successfully!" : "Magical template added successfully to the gallery!");
      
      // Reset inputs
      setTimeout(() => {
        setCreatorModalOpen(false);
        setEditingTemplate(null);
        setNewTitle("");
        setNewDescription("");
        setNewImageUrl("");
        setNewIsPremium(false);
        setCreatorSuccess("");
      }, 1500);
    } catch (err) {
      setCreatorError("Failed saving template configuration.");
    }
  };

  const handleSelectTemplate = (template: NoteTemplate) => {
    const isUnlockedGlobally = user?.isPro || user?.activePlan === "monthly" || user?.activePlan === "lifetime";
    const isUnlockedIndividually = user?.unlockedTemplates?.includes(template.id);

    if (template.isPremium && !isUnlockedGlobally && !isUnlockedIndividually) {
      setPremiumModalTemplate(template);
    } else {
      onSelectTemplate(template.id);
      onNavigate("editor");
    }
  };

  const processPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError("");
    
    if (paymentMethod === "card") {
      if (cardNumber.replace(/\s/g, "").length < 16) {
        setCheckoutError("Valid card credentials required (16-digit card).");
        return;
      }
      if (!cardExpiry.includes("/")) {
        setCheckoutError("Expiry date must be in MM/YY format.");
        return;
      }
      if (cardCvc.length < 3) {
        setCheckoutError("Valid CVV security core required.");
        return;
      }
    } else {
      // UPI reference checking
      const utr = upiUtrNumber.trim();
      if (!utr) {
        setCheckoutError("Please execute the transaction and paste your 12-digit UPI UTR / Ref Number.");
        return;
      }
      if (utr.length < 8) {
        setCheckoutError("Valid UPI Transaction Reference (UTR) is required (usually 12 digits).");
        return;
      }
    }

    setSubscribingLoader(true);

    setTimeout(async () => {
      try {
        const targetPlan = checkoutPlan?.id || "single";
        const currentUid = user?.uid || "anonymous-purchaser";

        // Generate next state values
        let nextIsPro = user?.isPro || false;
        let nextActivePlan = user?.activePlan || "none";
        const nextUnlockedArray = [...(user?.unlockedTemplates || [])];

        if (targetPlan === "single" && checkoutPlan?.templateId) {
          if (!nextUnlockedArray.includes(checkoutPlan.templateId)) {
            nextUnlockedArray.push(checkoutPlan.templateId);
          }
        } else {
          nextIsPro = true;
          nextActivePlan = targetPlan;
        }

        // Write both locally and Cloud Firestore (using robust helper)
        if (onUpdateUser) {
          onUpdateUser({
            isPro: nextIsPro,
            activePlan: nextActivePlan,
            unlockedTemplates: nextUnlockedArray
          });
        }

        await AppDatabase.updateUserSubscription(
          currentUid,
          nextActivePlan,
          nextIsPro,
          nextUnlockedArray
        );

        if (paymentMethod === "upi") {
          setSuccessPurchase(`UPI Transfer Reference Verified! Account updated successfully (UTR: ${upiUtrNumber}).`);
        } else {
          setSuccessPurchase(`Upgrade Successful! Authorized for: ${checkoutPlan?.title}.`);
        }
        
        setTimeout(() => {
          setSubscribingLoader(false);
          setCardNumber("");
          setCardExpiry("");
          setCardCvc("");
          setUpiUtrNumber("");
          setCheckoutPlan(null);
          setPremiumModalTemplate(null);
          setSuccessPurchase("");

          // If single template unlock, immediately route to the editor
          if (targetPlan === "single" && checkoutPlan?.templateId) {
            onSelectTemplate(checkoutPlan.templateId);
            onNavigate("editor");
          } else {
            setActiveSubTab("templates");
          }
        }, 1800);

      } catch (e) {
        setSubscribingLoader(false);
        setCheckoutError("Payment processing experienced network congestion. Please try again.");
      }
    }, 1500);
  };

  return (
    <div className="w-full min-h-screen text-on-surface flex flex-col justify-start items-center pb-20 px-4 md:px-8">
      
      {/* Upper Header Section */}
      <section className="text-center max-w-2xl py-12">
        <span className="text-secondary text-xs uppercase font-extrabold tracking-widest bg-primary-fixed px-3 py-1 rounded-full border border-primary-container inline-flex gap-1.5 items-center">
          <Sparkles size={11} className="text-secondary" /> Muse Curations
        </span>
        <h1 className="font-display text-3xl md:text-5xl font-extrabold text-on-surface tracking-tight mt-3 mb-4">
          The Curators&apos; Archive
        </h1>
        <p className="text-xs md:text-sm text-on-surface-variant font-light mb-8 max-w-lg leading-relaxed mx-auto">
          Choose from custom ribbons, vintage typewriter scripts, and spooky goth declarations. Set up premium templates or customize your subscription pricing.
        </p>

        {/* Gallery Mode Sub-Tabs Toggle */}
        <div className="inline-flex bg-surface-container-low p-1.5 rounded-2xl border border-primary/5 shadow-xs mb-4 flex-wrap justify-center gap-1">
          <button
            onClick={() => setActiveSubTab("templates")}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all duration-300 flex items-center gap-2 ${
              activeSubTab === "templates"
                ? "bg-secondary text-white shadow-xs"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
          >
            <ShoppingBag size={14} /> Templates Archive
          </button>
          <button
            onClick={() => setActiveSubTab("pricing")}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all duration-300 flex items-center gap-2 ${
              activeSubTab === "pricing"
                ? "bg-secondary text-white shadow-xs"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
          >
            <Crown size={14} fill={activeSubTab === "pricing" ? "currentColor" : "none"} /> Pricing &amp; Membership Plans
          </button>
          <button
            onClick={() => setActiveSubTab("user-templates")}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all duration-300 flex items-center gap-2 ${
              activeSubTab === "user-templates"
                ? "bg-[#6d28d9] text-white shadow-xs"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
          >
            <Sparkles size={14} className="text-secondary animate-pulse" /> AI Creator Space
          </button>
          {isAdminUser && (
            <button
              onClick={() => setActiveSubTab("admin")}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all duration-300 flex items-center gap-2 ${
                activeSubTab === "admin"
                  ? "bg-[#bb0026] text-white shadow-xs font-extrabold"
                  : "text-on-surface-variant hover:text-[#bb0026] hover:bg-surface-container"
              }`}
            >
              <ShieldCheck size={14} /> Admin Hub
            </button>
          )}
        </div>
      </section>

      {/* RENDER VIEW: TEMPLATES ARCHIVE */}
      {activeSubTab === "templates" && (
        <>
          {/* Filter, Search, and Create custom template bar */}
          <section className="w-full max-w-5xl bg-surface-container-lowest p-4 rounded-3xl border border-primary/10 flex flex-col md:flex-row gap-4 items-center justify-between mb-10 shadow-xs">
            {/* Category toggles */}
            <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
              {(["All", "Sweet", "Sassy", "Spooky"] as const).map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition ${
                    selectedCategory === category
                      ? "bg-secondary text-white font-extrabold shadow-xs"
                      : "text-on-surface-variant hover:text-on-surface bg-surface-container hover:bg-surface-container-high"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Right Action container */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              {/* Search bar */}
              <div className="relative w-full sm:max-w-xs">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  placeholder="Search curations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-container rounded-xl border border-primary/5 text-xs text-on-surface focus:border-secondary focus:outline-hidden transition"
                />
              </div>

              {/* Creator Button - Restricted to Admin */}
              {isAdminUser && (
                <button
                  onClick={() => {
                    setEditingTemplate(null);
                    setNewTitle("");
                    setNewDescription("");
                    setNewCategory("Sweet");
                    setNewTag("New Arrival");
                    setNewImageUrl("");
                    setNewIsPremium(false);
                    setCreatorModalOpen(true);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#bb0026]/10 hover:bg-[#bb0026]/25 text-[#bb0026] font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 border border-[#bb0026]/15 shadow-2xs transition"
                >
                  <Plus size={14} className="stroke-[3]" /> Add Template (Admin)
                </button>
              )}
            </div>
          </section>

          {/* Grid of Templates */}
          <section className="w-full max-w-5xl">
            {filteredTemplates.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                {filteredTemplates.map((template) => {
                  const isLockedGlobally = user?.isPro || user?.activePlan === "monthly" || user?.activePlan === "lifetime";
                  const isUnlockedIndividually = user?.unlockedTemplates?.includes(template.id);
                  const isUnlocked = !template.isPremium || isLockedGlobally || isUnlockedIndividually;

                  return (
                    <div
                      key={template.id}
                      className="group bg-surface-container-lowest rounded-3xl overflow-hidden border border-primary/10 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                    >
                      {/* Image Showcase */}
                      <div className="relative aspect-[4/3] bg-surface-container overflow-hidden">
                        <img
                          src={template.imageUrl}
                          alt={template.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-all duration-500"
                        />
                        
                        {/* Tag Indicator */}
                        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-surface-container-lowest/95 backdrop-blur-xs text-[9px] uppercase font-extrabold tracking-wider text-secondary shadow-xs font-mono">
                          {template.tag}
                        </span>

                        {/* Premium Badge */}
                        {template.isPremium && (
                          <span className={`absolute bottom-3 left-3 px-3 py-1 rounded-lg text-white text-[9px] uppercase font-bold tracking-widest flex items-center gap-1 shadow-xs ${
                            isUnlocked ? "bg-green-600" : "bg-secondary animate-pulse"
                          }`}>
                            <Crown size={12} fill="currentColor" /> {isUnlocked ? "UNLOCKED" : "PREMIUM"}
                          </span>
                        )}
                      </div>

                      {/* Content details */}
                      <div className="p-6 flex flex-col justify-between flex-1">
                        <div className="space-y-1.5">
                          <h3 className="font-display font-bold text-base md:text-lg text-on-surface group-hover:text-secondary transition">
                            {template.title}
                          </h3>
                          <p className="text-xs text-on-surface-variant font-light leading-relaxed">
                            {template.description}
                          </p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-primary/5 flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[11px] font-mono text-on-surface-variant flex items-center gap-1">
                            <Heart size={12} className="text-secondary" /> {template.likesCount} Loves
                          </span>
                          
                          <div className="flex items-center gap-1.5 ml-auto">
                            {isAdminUser && (
                              <>
                                <button
                                  onClick={() => handleStartEditTemplate(template)}
                                  className="px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-primary/5 text-on-surface text-[10px] font-bold uppercase transition"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteTemplateConfirm(template.id)}
                                  className="px-2.5 py-1.5 rounded-lg bg-red-100/70 hover:bg-red-100 text-red-700 text-[10px] font-bold uppercase transition"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                            
                            <button
                              onClick={() => handleSelectTemplate(template)}
                              className={`px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wider transition ${
                                template.isPremium && !isUnlocked
                                  ? "bg-surface-container text-secondary hover:bg-secondary hover:text-white border border-secondary/15"
                                  : "bg-secondary hover:bg-secondary-container text-on-secondary hover:text-on-secondary-container"
                              }`}
                            >
                              {template.isPremium && !isUnlocked ? `Unlock ($${pricing.singlePrice})` : "Design Now"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 bg-surface-container-low rounded-3xl border border-primary/5 mt-4">
                <ShoppingBag size={48} className="mx-auto text-on-surface-variant/50 mb-3" />
                <h3 className="font-display text-lg font-bold text-on-surface">No curations match</h3>
                <p className="text-xs text-on-surface-variant font-light mt-1 max-w-[280px] mx-auto">
                  Please refine your keywords or category filters to locate your secret romantic template styles.
                </p>
              </div>
            )}
          </section>
        </>
      )}

      {/* RENDER VIEW: AI CREATOR SPACE / TEMPLATE CONTRIBUTION */}
      {activeSubTab === "user-templates" && (
        <section className="w-full max-w-5xl text-on-surface space-y-10 animate-fade-in">
          
          {/* Badge & Tracker Hero Card */}
          <div className="w-full bg-linear-to-br from-[#1e1b4b] to-[#311042] text-white p-6 md:p-8 rounded-3xl border border-[#c084fc]/20 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -z-10 pointer-events-none" />
            
            <div className="space-y-4 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/10 text-xs text-[#d8b4fe] font-bold tracking-wide uppercase">
                <Sparkles size={12} className="animate-spin" /> Aesthetic Creator Guild
              </div>
              
              <h2 className="font-display text-2xl md:text-3xl font-black text-white leading-tight">
                Sculpt Love &amp; Earn Your <span className="bg-linear-to-r from-pink-400 to-[#c084fc] bg-clip-text text-transparent">Verified Creator Badge</span>
              </h2>
              
              <p className="text-xs text-[#e9d5ff] leading-relaxed font-light">
                Contribute romantic note layouts, sassy vintage texts, or gothic spooky letters. 
                Our **Chief Love AI** will instantly analyze your drafts. Creating **500 verified templates** 
                or having an active **Premium Membership** grants you the official **Verified checkmark badge** next to your profile!
              </p>

              {/* Verified Badge Details */}
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-full ${isCurrentlyVerified ? "bg-[#34d399]/20 border border-[#34d399]/30 text-[#34d399]" : "bg-white/5 border border-white/10 text-white/40"}`}>
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    Your Status: 
                    {isCurrentlyVerified ? (
                      <span className="text-[#34d399] font-black flex items-center gap-1">
                        VERIFIED CREATOR <Sparkles size={12} className="inline animate-bounce" />
                      </span>
                    ) : (
                      <span className="text-white/60">CONTRIBUTOR (UNVERIFIED)</span>
                    )}
                  </h4>
                  <p className="text-[11px] text-[#c084fc] font-mono mt-0.5">
                    {user?.isPro ? "✓ Premium Auto-Verification Active" : meetsVerificationThreshold ? "✓ 500+ Verified Contribution Tier Passed" : "Standard path active"}
                  </p>
                </div>
              </div>
            </div>

            {/* Tracker Bar */}
            <div className="bg-white/5 max-w-sm w-full md:w-80 p-5 rounded-2xl border border-white/10 flex flex-col gap-4 self-center md:self-auto">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-[#d8b4fe]">CONTRIBUTION RUN</span>
                <span className="font-mono text-xs font-bold text-white">
                  {verifiedCount + simulatedCountOffset} <span className="text-white/40">/ 500</span>
                </span>
              </div>

              {/* Progress Container */}
              <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-linear-to-r from-pink-500 to-[#9333ea] h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, ((verifiedCount + simulatedCountOffset) / 500) * 100)}%` }}
                />
              </div>

              <p className="text-[10px] text-white/50 leading-relaxed font-light">
                You have contributed **{myTemplates.length}** template drafts. **{verifiedCount}** are approved as certified love guides.
              </p>

              {/* Simulated Creator Tool for Testing and Checking functionality */}
              <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-white/10">
                <span className="text-[9px] font-mono text-white/40 uppercase">Dev Testing Simulator</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSimulatedCountOffset(500);
                      if (user && onUpdateUser) {
                        onUpdateUser({ isVerified: true });
                        AppDatabase.saveUserProfile({ ...user, isVerified: true }).catch(console.error);
                      }
                    }}
                    className="flex-1 bg-[#9333ea] hover:bg-[#a855f7] text-white px-2 py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase transition"
                  >
                    Simulate 500 Uploads
                  </button>
                  <button
                    onClick={() => {
                      setSimulatedCountOffset(0);
                      if (user && onUpdateUser) {
                        onUpdateUser({ isVerified: false });
                        AppDatabase.saveUserProfile({ ...user, isVerified: false }).catch(console.error);
                      }
                    }}
                    className="bg-white/10 hover:bg-white/20 text-white px-2 py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase transition"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Grid Layout: form & User Submission items */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Create & Submit Love Template Form Card */}
            <div className="lg:col-span-5 bg-surface-container-lowest p-6 rounded-3xl border border-primary/10 shadow-sm space-y-6">
              <div className="flex items-center gap-2 border-b border-primary/5 pb-3">
                <Sparkles className="text-secondary" size={18} />
                <h3 className="font-display font-bold text-on-surface text-base">Submit New Design Template</h3>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!user) {
                  setUploadError("Please register/login to submit templates.");
                  return;
                }
                if (!uploadTitle.trim() || !uploadDesc.trim()) {
                  setUploadError("Please provide both title and content message description.");
                  return;
                }

                setUploadError("");
                setUploadSuccess("");
                setUploadingState("verifying");

                try {
                  const evaluation = await AppDatabase.verifyTemplateWithAI(uploadTitle, uploadDesc, uploadCategory);
                  
                  setUploadingState("saving");

                  const newTemplateId = "user_temp_" + Date.now() + "_" + Math.floor(Math.random()*1000);
                  const newTemplate: UserTemplate = {
                    id: newTemplateId,
                    userId: user.uid,
                    authorName: user.name || "Aesthetic Contributor",
                    title: uploadTitle,
                    description: uploadDesc,
                    category: evaluation.category as any,
                    tag: evaluation.tag as any,
                    imageUrl: uploadImageUrl,
                    isPremium: false,
                    createdAt: new Date().toISOString(),
                    status: evaluation.status as any,
                    aiFeedback: evaluation.aiFeedback
                  };

                  await AppDatabase.saveUserTemplate(newTemplate);

                  const freshTemplates = await AppDatabase.fetchUserTemplates();
                  setUserTemplates(freshTemplates);

                  const currentVerifiedCount = freshTemplates.filter(t => t.userId === user.uid && t.status === "verified").length;
                  const totalVerCount = currentVerifiedCount + simulatedCountOffset;
                  if (totalVerCount >= 500 && !user.isVerified) {
                    const updatedProfile = { ...user, isVerified: true };
                    await AppDatabase.saveUserProfile(updatedProfile);
                    if (onUpdateUser) {
                      onUpdateUser({ isVerified: true });
                    }
                    setUploadSuccess("🎉 Fantastic! You have unlocked your Verified Creator Badge!");
                  }

                  setAiReviewResult({
                    status: evaluation.status,
                    aiFeedback: evaluation.aiFeedback,
                    tag: evaluation.tag,
                    category: evaluation.category
                  });

                  setUploadTitle("");
                  setUploadDesc("");
                  setUploadingState("done");

                } catch (err: any) {
                  setUploadError(err.message || "Failed during verification processing.");
                  setUploadingState("idle");
                }
              }} className="space-y-4">
                
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Template Title</label>
                  <input
                    type="text"
                    required
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g., Pink Ribbon Goth Manifesto"
                    className="w-full px-4 py-2 text-xs rounded-xl border border-primary/10 bg-surface-container font-medium text-on-surface placeholder:text-on-surface-variant/40 focus:outline-hidden focus:border-secondary transition-all"
                  />
                </div>

                {/* Content Message */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Poetic Content / Message Preset</label>
                  <textarea
                    rows={4}
                    required
                    value={uploadDesc}
                    onChange={(e) => setUploadDesc(e.target.value)}
                    placeholder="Provide your vintage script or love poetry template. Users will fill this out anonymous."
                    className="w-full p-4 text-xs rounded-xl border border-primary/10 bg-surface-container font-medium text-on-surface placeholder:text-on-surface-variant/40 focus:outline-hidden focus:border-secondary transition-all resize-none leading-relaxed"
                  />
                </div>

                {/* Category Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Love Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value as any)}
                    className="w-full px-4 py-2 text-xs rounded-xl border border-primary/10 bg-surface-container font-medium text-on-surface focus:outline-hidden focus:border-secondary transition-all"
                  >
                    <option value="Sweet">Sweet (Soft declarations)</option>
                    <option value="Sassy">Sassy (Fun banter / flirt)</option>
                    <option value="Spooky">Spooky (Goth poetry / eternity)</option>
                  </select>
                </div>

                {/* Presets Background Choice */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Preselected Aesthetic Cover</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        name: "Roses Sweet",
                        url: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=600",
                        preview: "bg-[#ffe4e6]"
                      },
                      {
                        name: "Neon Sassy",
                        url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=600",
                        preview: "bg-[#faf5ff]"
                      },
                      {
                        name: "Goth Spooky",
                        url: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?q=80&w=600",
                        preview: "bg-[#180828]"
                      }
                    ].map((card) => (
                      <button
                        type="button"
                        key={card.name}
                        onClick={() => setUploadImageUrl(card.url)}
                        className={`p-2 rounded-xl border transition flex flex-col items-center gap-1.5 ${
                          uploadImageUrl === card.url 
                            ? "border-secondary bg-secondary/5 font-extrabold" 
                            : "border-primary/10 hover:border-secondary/50 bg-surface-container"
                        }`}
                      >
                        <div className={`w-full h-8 rounded-md ${card.preview} border border-primary/5`} />
                        <span className="text-[9px] font-serif font-medium">{card.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* State Displays */}
                {uploadError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-[11px] font-light flex items-center gap-2">
                    <AlertCircle size={14} />
                    <span>{uploadError}</span>
                  </div>
                )}

                {uploadSuccess && (
                  <div className="p-3 bg-green-50 text-green-700 rounded-xl text-[11px] font-semibold">
                    {uploadSuccess}
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={uploadingState !== "idle" && uploadingState !== "done"}
                  className="w-full bg-[#6d28d9] hover:bg-[#5b21b6] disabled:bg-surface-container disabled:text-on-surface-variant/40 text-white font-extrabold text-xs tracking-wider uppercase py-3 rounded-2xl shadow-xs transition duration-300 flex items-center justify-center gap-2 mt-4"
                >
                  {uploadingState === "verifying" && (
                    <span className="animate-pulse flex items-center gap-1">
                      <Sparkles size={14} className="animate-spin text-pink-300" /> AI evaluating content...
                    </span>
                  )}
                  {uploadingState === "saving" && "Deploying to Firestore..."}
                  {(uploadingState === "idle" || uploadingState === "done") && "Upload Note Template"}
                </button>
              </form>

              {/* AI Interaction Result card */}
              {aiReviewResult && (
                <div className={`p-4 rounded-2xl border ${
                  aiReviewResult.status === "verified"
                    ? "bg-[#ecfdf5] border-[#a7f3d0] text-[#047857]"
                    : "bg-[#fdf2f2] border-[#fecaca] text-[#b91c1c]"
                } space-y-2 animate-fade-in`}>
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold font-mono uppercase tracking-wider text-black">Latest AI Review Feedback</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                      aiReviewResult.status === "verified" ? "bg-[#34d399]/20" : "bg-red-200"
                    }`}>
                      {aiReviewResult.status}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed font-serif italic text-on-surface mt-1">
                    "{aiReviewResult.aiFeedback}"
                  </p>
                  {aiReviewResult.status === "verified" && (
                    <div className="flex items-center gap-3 pt-2 text-[10px] border-t border-black/5">
                      <span>Tag: <span className="font-bold">{aiReviewResult.tag}</span></span>
                      <span>Category: <span className="font-bold">{aiReviewResult.category}</span></span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* List Submitted Templates */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-black text-on-surface text-lg">
                  Community Curated Design Drafts
                </h3>
                <span className="text-xs font-mono text-on-surface-variant font-medium">
                  {userTemplates.length} submissions found
                </span>
              </div>

              {userTemplates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userTemplates.map((item) => {
                    const isMyDraft = item.userId === user?.uid;
                    return (
                      <div 
                        key={item.id} 
                        className={`bg-surface-container-lowest p-4 rounded-2xl border transition relative flex flex-col justify-between h-56 group ${
                          item.status === "verified" ? "border-primary/10 hover:border-secondary/20 hover:shadow-xs" : "border-[#ee0b3b]/10 bg-[#fff5f6]/10"
                        }`}
                      >
                        {/* Overlay Category Cover info */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              item.category === "Sweet" ? "bg-red-50 text-pink-600 border border-pink-100" :
                              item.category === "Sassy" ? "bg-purple-50 text-[#8b5cf6] border border-purple-100" :
                              "bg-[#111827] text-[#c084fc] border border-stone-800"
                            }`}>
                              {item.category}
                            </span>
                            
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-mono ${
                              item.status === "verified" ? "bg-green-100 text-green-700" :
                              item.status === "rejected" ? "bg-red-100 text-red-700" :
                              "bg-yellow-100 text-yellow-800 animate-pulse"
                            }`}>
                              {item.status}
                            </span>
                          </div>

                          <h4 className="font-display font-extrabold text-on-surface text-xs truncate flex items-center gap-1.5">
                            {item.title}
                            {item.status === "verified" && (
                              <span className="w-3.5 h-3.5 rounded-full bg-[#c084fc] text-white flex items-center justify-center text-[8px] border border-white" title="Verified AI template">
                                ✓
                              </span>
                            )}
                          </h4>
                          
                          <p className="text-[11px] leading-relaxed text-on-surface-variant font-serif mt-1 line-clamp-3">
                            "{item.description}"
                          </p>

                          {item.aiFeedback && (
                            <div className="bg-surface-container-low px-2.5 py-1.5 rounded-xl border border-primary/5 mt-2">
                              <p className="text-[9px] leading-snug font-serif text-on-surface-variant italic">
                                <span className="font-bold font-mono text-secondary not-italic uppercase text-[8px]">AI:</span> {item.aiFeedback}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Card metadata row */}
                        <div className="flex items-center justify-between pt-2.5 border-t border-primary/5 mt-3">
                          <div className="flex flex-col">
                            <span className="text-[9px] text-on-surface-variant/70">Creator</span>
                            <span className="text-[10px] font-black text-on-surface max-w-[100px] truncate">
                              {item.authorName || "Romantic Guest"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {isMyDraft && (
                              <button
                                onClick={() => handleDeleteUserTemplate(item.id)}
                                className="p-1 px-2 hover:bg-red-100 hover:text-red-700 rounded-lg text-[9px] font-mono font-bold uppercase text-on-surface-variant transition"
                              >
                                Delete
                              </button>
                            )}
                            <button
                              onClick={() => {
                                alert("This customizable user-template will serve as layout base for dynamic Letters desk!");
                              }}
                              disabled={item.status !== "verified"}
                              className="bg-secondary hover:bg-secondary-container disabled:bg-surface-container text-white disabled:text-on-surface-variant/40 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition"
                            >
                              Adopt
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-20 bg-surface-container-low rounded-3xl border border-primary/5">
                  <Sparkles size={48} className="mx-auto text-on-surface-variant/35 mb-3 animate-bounce" />
                  <h3 className="font-display text-base font-bold text-on-surface">No creative drafts uploaded yet</h3>
                  <p className="text-xs text-on-surface-variant font-light mt-1 max-w-[280px] mx-auto">
                    Be the very first sweetheart to code a bespoke quote background template! Let the AI analyze and test rules.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* RENDER VIEW: PRICING & MEMBERSHIP PLANS */}
      {activeSubTab === "pricing" && (
        <section className="w-full max-w-5xl text-on-surface space-y-12">
          
          {/* Active status indicator if logged in */}
          {user && (
            <div className="max-w-2xl mx-auto rounded-2xl bg-[#ffeed2]/40 border border-secondary/15 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-secondary text-white rounded-xl">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Your Active Muse Status</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Plan: <span className="font-bold text-secondary uppercase font-mono">{user.activePlan || "Free Tier / None"}</span>
                    {user.isPro ? " (Premium Unlocked)" : " (Basic Standard Links)"}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-surface-container font-mono text-secondary">
                {user.isPro ? "✓ PRO MUSE ACTIVE" : "STANDARD PASS"}
              </span>
            </div>
          )}

          {/* Pricing Tiers Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Tier 1: Free starter */}
            <div className="bg-surface-container-low rounded-3xl border border-primary/5 p-8 flex flex-col justify-between shadow-2xs hover:shadow-md transition">
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-on-surface-variant">Starter</span>
                  <h3 className="font-display font-black text-2xl text-on-surface mt-1">Free Admirer</h3>
                  <p className="text-xs text-on-surface-variant font-light mt-1.5 leading-relaxed">
                    Test the waters of coquette confessions with elegant essential canvas layout models.
                  </p>
                </div>

                <div className="py-2">
                  <span className="font-mono text-3xl font-extrabold text-on-surface">$0</span>
                  <span className="text-xs text-on-surface-variant font-light"> / forever</span>
                </div>

                <ul className="space-y-3 pt-4 border-t border-primary/5 text-xs text-on-surface-variant font-light">
                  <li className="flex items-center gap-2 text-on-surface">
                    <Check size={14} className="text-green-600 stroke-[3]" /> Access to 3 Free Templates
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-green-600 stroke-[3]" /> Base64 Url Encryption
                  </li>
                  <li className="flex items-center gap-2">
                    <X size={14} className="text-red-500 stroke-[3]" /> Realtime read confirmations
                  </li>
                  <li className="flex items-center gap-2">
                    <X size={14} className="text-red-500 stroke-[3]" /> Custom typography matching
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <button
                  onClick={() => setActiveSubTab("templates")}
                  className="w-full py-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition text-xs font-bold text-on-surface tracking-wider uppercase cursor-pointer"
                >
                  Browse Free Art
                </button>
              </div>
            </div>

            {/* Tier 2: Muse Pro Monthly */}
            <div className="bg-surface-container-lowest rounded-3xl border-2 border-secondary p-8 flex flex-col justify-between shadow-lg relative transform scale-100 lg:scale-[1.02]">
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-secondary text-white font-mono font-bold text-[9px] uppercase tracking-widest rounded-full shadow-xs">
                ☆ MOST POPULAR ☆
              </span>

              <div className="space-y-6">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#bb0026]">Subscribed Access</span>
                  <h3 className="font-display font-black text-2xl text-on-surface mt-1 flex items-center gap-1.5 justify-center md:justify-start">
                    Muse Monthly Pass <Crown size={18} fill="currentColor" className="text-secondary" />
                  </h3>
                  <p className="text-xs text-on-surface-variant font-light mt-1.5 leading-relaxed">
                    Unchain complete romantic mastery with infinite access to all existing and newly uploaded premium canvasses.
                  </p>
                </div>

                <div className="py-2">
                  <span className="font-mono text-3xl font-extrabold text-on-surface">${pricing.monthlyPrice}</span>
                  <span className="text-xs text-on-surface-variant font-light"> / month</span>
                </div>

                <ul className="space-y-3 pt-4 border-t border-primary/5 text-xs text-on-surface-variant font-light">
                  <li className="flex items-center gap-2 text-on-surface font-semibold">
                    <Check size={14} className="text-green-600 stroke-[3]" /> Unlock ALL present &amp; future templates
                  </li>
                  <li className="flex items-center gap-2 text-on-surface">
                    <Check size={14} className="text-green-600 stroke-[3]" /> Custom premium ribbons &amp; goth scripts
                  </li>
                  <li className="flex items-center gap-2 text-on-surface">
                    <Check size={14} className="text-green-600 stroke-[3]" /> Real-time notification logs
                  </li>
                  <li className="flex items-center gap-2 text-on-surface">
                    <Check size={14} className="text-green-600 stroke-[3]" /> Instant recipient email tracking
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <button
                  onClick={() => setCheckoutPlan({ id: "monthly", title: "Muse Monthly Pass", price: `$${pricing.monthlyPrice} / month` })}
                  className="w-full py-3.5 rounded-xl bg-secondary hover:bg-secondary-container text-on-secondary hover:text-on-secondary-container font-extrabold text-xs uppercase tracking-wider shadow-sm transition cursor-pointer"
                >
                  Join Muse Monthly
                </button>
              </div>
            </div>

            {/* Tier 3: Lifetime Eternity Pass */}
            <div className="bg-surface-container-low rounded-3xl border border-primary/5 p-8 flex flex-col justify-between shadow-2xs hover:shadow-md transition">
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#bb0026]">Eternity Option</span>
                  <h3 className="font-display font-black text-2xl text-on-surface mt-1">Lifetime Royalty Pass</h3>
                  <p className="text-xs text-on-surface-variant font-light mt-1.5 leading-relaxed">
                    Single absolute payment for lifetime devotion, priority rendering, and complete premium privileges forever.
                  </p>
                </div>

                <div className="py-2">
                  <span className="font-mono text-3xl font-extrabold text-on-surface">${pricing.lifetimePrice}</span>
                  <span className="text-xs text-on-surface-variant font-light"> / once</span>
                </div>

                <ul className="space-y-3 pt-4 border-t border-primary/5 text-xs text-on-surface-variant font-light">
                  <li className="flex items-center gap-2 text-on-surface">
                    <Check size={14} className="text-green-600 stroke-[3]" /> Lifetime premium template locks bypassed
                  </li>
                  <li className="flex items-center gap-2 text-on-surface">
                    <Check size={14} className="text-green-600 stroke-[3]" /> Custom aesthetic creator dashboard
                  </li>
                  <li className="flex items-center gap-2 text-on-surface">
                    <Check size={14} className="text-green-600 stroke-[3]" /> Server-side premium vector graphics
                  </li>
                  <li className="flex items-center gap-2 text-on-surface font-semibold">
                    <Check size={14} className="text-green-600 stroke-[3]" /> Pride of absolute creator support
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <button
                  onClick={() => setCheckoutPlan({ id: "lifetime", title: "Lifetime Royalty Pass", price: `$${pricing.lifetimePrice} once` })}
                  className="w-full py-3 rounded-xl bg-surface-container hover:bg-secondary hover:text-white transition text-xs font-bold text-on-surface tracking-wider uppercase cursor-pointer"
                >
                  Acquire For Eternity
                </button>
              </div>
            </div>

          </div>

          {/* Secure compliance disclaimer banner */}
          <div className="max-w-2xl mx-auto text-center p-6 bg-surface-container-low rounded-2xl border border-primary/5 space-y-2">
            <span className="text-[10px] font-mono text-on-surface-variant flex items-center justify-center gap-1.5 uppercase font-bold">
              <ShieldCheck size={13} className="text-secondary" /> Verified Tamperproof Payment Gateway
            </span>
            <p className="text-[11px] text-on-surface-variant/90 leading-relaxed font-light">
              Payments are simulated inside the sandboxed space utilizing SSL keys. Real tokens are generated and recorded into Firebase structures instantly upon payment confirmation.
            </p>
          </div>
        </section>
      )}

      {/* RENDER VIEW: ADMIN HUB CONTROLS */}
      {activeSubTab === "admin" && isAdminUser && (
        <section className="w-full max-w-2xl bg-surface-container-lowest p-8 rounded-3xl border-2 border-[#bb0026]/10 space-y-6 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3 pb-4 border-b border-primary/5">
            <div className="p-3 bg-[#bb0026]/10 text-[#bb0026] rounded-2xl">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="font-display font-black text-xl text-on-surface">Admin Settings &amp; Pricing Controls</h3>
              <p className="text-xs text-on-surface-variant">Configure subscription prices and manage template parameters dynamically.</p>
            </div>
          </div>

          {/* Form for Pricing Control */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-[#bb0026] uppercase tracking-wider">Dynamic Pricing Calibration</h4>
            
            {adminPricingError && (
              <div className="p-3 text-xs bg-red-100 text-red-700 rounded-xl border border-red-200">
                {adminPricingError}
              </div>
            )}
            {adminPricingSuccess && (
              <div className="p-3 text-xs bg-green-100 text-green-700 rounded-xl border border-green-200">
                {adminPricingSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Price 1: Single template */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">Single Unlock ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={singlePriceInput}
                  onChange={(e) => setSinglePriceInput(e.target.value)}
                  className="w-full bg-surface-container-low border border-primary/5 rounded-xl px-3 py-2.5 text-xs text-on-surface focus:outline-hidden focus:border-secondary font-mono"
                />
              </div>

              {/* Price 2: Monthly price */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">Monthly Pass ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={monthlyPriceInput}
                  onChange={(e) => setMonthlyPriceInput(e.target.value)}
                  className="w-full bg-surface-container-low border border-primary/5 rounded-xl px-3 py-2.5 text-xs text-on-surface focus:outline-hidden focus:border-secondary font-mono"
                />
              </div>

              {/* Price 3: Lifetime price */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">Lifetime Eternity ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={lifetimePriceInput}
                  onChange={(e) => setLifetimePriceInput(e.target.value)}
                  className="w-full bg-surface-container-low border border-primary/5 rounded-xl px-3 py-2.5 text-xs text-on-surface focus:outline-hidden focus:border-secondary font-mono"
                />
              </div>
            </div>

            {/* UPI Destination Grid */}
            <div className="pt-4 border-t border-primary/5 space-y-3">
              <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                🇮🇳 UPI Destination Settings (For Direct Bank Settlement)
              </h5>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                Configure your Virtual Private Address (VPA) and correct legal name. When customers buy designs or subscription plans, they can scan your dynamic UPI QR code or click deep-links to pay. Money transfers instantly to your linked bank account.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">Your UPI ID / VPA Address</label>
                  <input
                    type="text"
                    placeholder="pavankanna766@ybl"
                    value={upiIdInput}
                    onChange={(e) => setUpiIdInput(e.target.value)}
                    className="w-full bg-surface-container-low border border-primary/5 rounded-xl px-3 py-2.5 text-xs text-on-surface focus:outline-hidden focus:border-secondary font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">Payee Legal Name (As in Bank)</label>
                  <input
                    type="text"
                    placeholder="Pavan Kanna"
                    value={payeeNameInput}
                    onChange={(e) => setPayeeNameInput(e.target.value)}
                    className="w-full bg-surface-container-low border border-primary/5 rounded-xl px-3 py-2.5 text-xs text-on-surface focus:outline-hidden focus:border-secondary"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleSavePricing}
                className="w-full py-3 rounded-xl bg-secondary hover:bg-secondary-container text-on-secondary hover:text-on-secondary-container font-extrabold text-xs uppercase tracking-wider transition shadow-xs cursor-pointer"
              >
                Save New Settings to Cloud
              </button>
            </div>
          </div>

          {/* Quick Admin Summary metrics */}
          <div className="pt-6 border-t border-primary/5 space-y-3">
            <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Platform Stats</h4>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-surface-container p-4 rounded-2xl">
                <span className="text-[10px] uppercase font-mono tracking-wider text-on-surface-variant block">Templates Active</span>
                <span className="font-mono text-2xl font-black text-secondary block mt-1">{templates.length}</span>
              </div>
              <div className="bg-surface-container p-4 rounded-2xl">
                <span className="text-[10px] uppercase font-mono tracking-wider text-on-surface-variant block">Unlocked Premium</span>
                <span className="font-mono text-2xl font-black text-secondary block mt-1">{templates.filter(t => t.isPremium).length} Designs</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Google AdSense or Aesthetic Sponsor Slot */}
      <GoogleAdSense className="mt-8 bg-white" />

      {/* MODAL 1: ADD CUSTOM TEMPLATE (TEMPLATE LAB) */}
      {creatorModalOpen && (
        <div className="fixed inset-0 bg-[#302829]/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-3xl border border-primary/10 shadow-2xl overflow-hidden">
            <div className="p-4 bg-primary-fixed/45 border-b border-primary/10 flex justify-between items-center px-6">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <Sparkles size={14} /> Design Studio (Template Lab)
              </span>
              <button 
                onClick={() => setCreatorModalOpen(false)}
                className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTemplateSubmit} className="p-6 space-y-4">
              {creatorError && (
                <div className="p-3 text-xs bg-red-100 text-red-700 rounded-xl border border-red-200 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" /> {creatorError}
                </div>
              )}
              {creatorSuccess && (
                <div className="p-3 text-xs bg-green-100 text-green-700 rounded-xl border border-green-200 flex items-center gap-2">
                  <Check size={14} className="shrink-0" /> {creatorSuccess}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Title of Creation</label>
                <input
                  type="text"
                  placeholder="e.g., Midnight Velvet Ribbon"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-surface-container/60 border border-primary/5 rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-hidden focus:border-secondary transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Description / Storyline</label>
                <textarea
                  rows={2}
                  placeholder="Write a sweet, coquette or spooky tease of what this note styling offers..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-surface-container/60 border border-primary/5 rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-hidden focus:border-secondary transition resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-surface-container/60 border border-primary/5 rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-hidden focus:border-secondary transition"
                  >
                    <option value="Sweet">Sweet</option>
                    <option value="Sassy">Sassy</option>
                    <option value="Spooky">Spooky</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Trend Tag</label>
                  <select
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value as any)}
                    className="w-full bg-surface-container/60 border border-primary/5 rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-hidden focus:border-secondary transition"
                  >
                    <option value="New Arrival">New Arrival</option>
                    <option value="Trending">Trending</option>
                    <option value="Popular">Popular</option>
                    <option value="Classic">Classic</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Unsplash Image URL (Optional)</label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="w-full bg-surface-container/60 border border-primary/5 rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-hidden focus:border-secondary transition"
                />
                <span className="text-[9.5px] text-on-surface-variant font-light block">Leave empty to use high-quality style imagery matched to the category.</span>
              </div>

              {/* isPremium toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="newIsPremium"
                  checked={newIsPremium}
                  onChange={(e) => setNewIsPremium(e.target.checked)}
                  className="rounded-md border-primary/10 text-secondary focus:ring-secondary/50 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="newIsPremium" className="text-xs font-bold text-on-surface cursor-pointer select-none">
                  Set as Premium Template (Requires Unlock)
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setCreatorModalOpen(false)}
                  className="flex-1 py-3 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-secondary hover:bg-secondary-container text-on-secondary hover:text-on-secondary-container text-xs font-bold rounded-xl transition cursor-pointer shadow-2xs"
                >
                  Publish Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: INTERACTIVE PREMIUM OPTIONS & BILLING */}
      {premiumModalTemplate && !checkoutPlan && (
        <div className="fixed inset-0 bg-[#302829]/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-3xl border border-secondary/15 shadow-2xl overflow-hidden">
            <div className="p-7 space-y-5">
              <div className="flex gap-4 items-center">
                <div className="p-3 bg-primary-fixed text-secondary rounded-2xl">
                  <Crown size={28} fill="currentColor" />
                </div>
                <div>
                  <h3 className="font-display font-black text-lg text-on-surface">Unlock Premium Canvas</h3>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#bb0026]/85 font-mono">Premium Customization Upgrade</span>
                </div>
              </div>

              <div className="p-4 bg-surface-container-low rounded-2xl border border-primary/5">
                <span className="text-[10px] font-extrabold text-on-surface-variant block uppercase tracking-wider mb-1 font-mono">Selected Canvas</span>
                <span className="font-display font-black text-secondary italic text-base">{premiumModalTemplate.title}</span>
                <p className="text-xs text-on-surface-variant font-light mt-1">{premiumModalTemplate.description}</p>
              </div>

              <div className="space-y-2.5">
                <span className="text-[10px] font-bold text-on-surface uppercase tracking-wider">Select Unlock Option:</span>
                
                {/* Option 1: Single Template */}
                <button
                  onClick={() => setCheckoutPlan({ 
                    id: "single", 
                    title: `Unlock - ${premiumModalTemplate.title}`, 
                    price: `$${pricing.singlePrice} Once`,
                    templateId: premiumModalTemplate.id 
                  })}
                  className="w-full text-left p-3 rounded-xl border border-primary/10 hover:border-secondary hover:bg-surface-container-low transition flex justify-between items-center"
                >
                  <div>
                    <span className="text-xs font-bold text-on-surface block">Unlock Single Design</span>
                    <span className="text-[11px] text-on-surface-variant font-light">Only use this specific template</span>
                  </div>
                  <span className="font-mono text-xs font-black text-secondary">${pricing.singlePrice}</span>
                </button>
                
                {/* Option 2: Monthly Plan */}
                <button
                  onClick={() => setCheckoutPlan({ 
                    id: "monthly", 
                    title: "Muse Monthly Pass", 
                    price: `$${pricing.monthlyPrice} / month`
                  })}
                  className="w-full text-left p-3 rounded-xl border-2 border-secondary bg-primary-fixed/20 hover:bg-primary-fixed/30 transition flex justify-between items-center"
                >
                  <div>
                    <span className="text-xs font-bold text-on-surface block flex items-center gap-1">
                      Muse Monthly Pass <Crown size={12} fill="currentColor" className="text-secondary" />
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-light">Ultimate access to all templates</span>
                  </div>
                  <span className="font-mono text-xs font-black text-secondary">${pricing.monthlyPrice}/mo</span>
                </button>

                {/* Option 3: Lifetime eternity */}
                <button
                  onClick={() => setCheckoutPlan({ 
                    id: "lifetime", 
                    title: "Lifetime Royalty Pass", 
                    price: `$${pricing.lifetimePrice} once`
                  })}
                  className="w-full text-left p-3 rounded-xl border border-primary/10 hover:border-secondary hover:bg-surface-container-low transition flex justify-between items-center"
                >
                  <div>
                    <span className="text-xs font-bold text-on-surface block">Lifetime Eternity Pass</span>
                    <span className="text-[11px] text-on-surface-variant font-light">Pay once, absolute membership forever</span>
                  </div>
                  <span className="font-mono text-xs font-black text-secondary">${pricing.lifetimePrice}</span>
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setPremiumModalTemplate(null)}
                  className="flex-1 py-3 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition text-xs font-semibold cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CHECKOUT BILLING PROCESSOR */}
      {checkoutPlan && (() => {
        const rawPriceStr = checkoutPlan.price.replace(/[^0-9.]/g, "");
        const priceUSD = parseFloat(rawPriceStr) || 1.99;
        const priceINR = Math.round(priceUSD * 85);
        const finalUpiId = pricing.upiId || "pavankanna766@ybl";
        const finalPayee = pricing.payeeName || "Pavan Kanna";
        const upiPayload = `upi://pay?pa=${finalUpiId}&pn=${encodeURIComponent(finalPayee)}&am=${priceINR}&cu=INR&tn=${encodeURIComponent(checkoutPlan.title)}`;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=2e1b12&data=${encodeURIComponent(upiPayload)}`;

        const maskUpiId = (upi: string): string => {
          if (!upi || !upi.includes("@")) return "******@ybl";
          const parts = upi.split("@");
          const handle = parts[0];
          const server = parts[1];
          if (handle.length <= 3) {
            return handle[0] + "***" + "@" + server;
          }
          return handle.substring(0, 2) + "******" + handle.substring(handle.length - 2) + "@" + server;
        };

        const maskPayeeName = (name: string): string => {
          if (!name) return "Verified Escrow";
          const words = name.split(/\s+/);
          return words.map(word => {
            if (word.length <= 2) return word[0] + "*";
            return word[0] + "*".repeat(word.length - 2) + word[word.length - 1];
          }).join(" ");
        };

        return (
          <div className="fixed inset-0 bg-[#302829]/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in shadow-2xl">
            <div className="bg-surface-container-lowest max-w-md w-full rounded-3xl border border-secondary/15 overflow-hidden flex flex-col">
              <div className="p-4 bg-secondary text-on-secondary flex justify-between items-center px-6">
                <span className="text-xs font-extrabold uppercase tracking-widest flex items-center gap-1.5 font-mono">
                  <ShieldCheck size={14} /> Secure Checkout Portal
                </span>
                <button 
                  onClick={() => setCheckoutPlan(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-on-secondary transition"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={processPaymentSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                <div className="p-4 bg-surface-container-low rounded-2xl border border-primary/5 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-on-surface-variant block uppercase tracking-wide">Selected License</span>
                    <span className="font-display font-extrabold text-secondary text-sm">{checkoutPlan.title}</span>
                  </div>
                  <span className="font-mono text-base font-black text-on-surface">
                    {paymentMethod === "upi" ? `₹${priceINR}` : checkoutPlan.price}
                  </span>
                </div>

                {/* Tab selector */}
                <div className="grid grid-cols-2 gap-2 bg-surface-container p-1 rounded-xl border border-primary/5">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("upi");
                      setCheckoutError("");
                    }}
                    className={`py-2 text-[10px] sm:text-xs font-extrabold rounded-lg uppercase tracking-wider transition ${
                      paymentMethod === "upi"
                        ? "bg-secondary text-on-secondary shadow-xs"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    🇮🇳 UPI Transfer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("card");
                      setCheckoutError("");
                    }}
                    className={`py-2 text-[10px] sm:text-xs font-extrabold rounded-lg uppercase tracking-wider transition ${
                      paymentMethod === "card"
                        ? "bg-secondary text-on-secondary shadow-xs"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    💳 Credit Card
                  </button>
                </div>

                {checkoutError && (
                  <div className="p-3 text-xs bg-red-100 text-red-700 rounded-xl border border-red-200 flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" /> {checkoutError}
                  </div>
                )}

                {successPurchase && (
                  <div className="p-3 text-xs bg-green-100 text-green-700 rounded-xl border border-green-200 text-center flex items-center justify-center gap-2">
                    <Check size={14} className="stroke-[3]" /> {successPurchase}
                  </div>
                )}

                {/* METHOD 1: UPI RENDER */}
                {paymentMethod === "upi" && (
                  <div className="space-y-4 animate-fade-in text-center">
                    <div className="p-4 bg-surface-container-low rounded-2xl border border-secondary/10 flex flex-col items-center space-y-3">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                        Scan From Any App (GPay, PhonePe, Paytm, BHIM)
                      </span>

                      {/* Code container */}
                      <div className="bg-white p-3 rounded-2xl border-4 border-secondary/15 shadow-xs flex items-center justify-center">
                        <img 
                          src={qrCodeUrl} 
                          alt="Genuine UPI Transfer Code" 
                          className="w-[150px] h-[150px] object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      {/* Razorpay-style payment secure merchant block */}
                      <div className="w-full border border-primary/10 rounded-2xl bg-surface-container-lowest p-3 text-left space-y-2.5 shadow-3xs relative overflow-hidden">
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] uppercase tracking-widest font-extrabold text-secondary font-mono">Verified Checkout</span>
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[8px] font-mono font-bold flex items-center gap-0.5">
                            <span className="w-1 h-1 rounded-full bg-emerald-600 animate-pulse" /> Razorpay Protocol
                          </span>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[11px] font-bold text-on-surface flex items-center gap-1">
                            Payee alias: <span className="text-secondary font-extrabold">{maskPayeeName(finalPayee)}</span>
                          </p>
                          <p className="text-[10px] font-mono text-on-surface-variant/90 tracking-dense flex justify-between">
                            <span>VPA handle: {maskUpiId(finalUpiId)}</span>
                            <span className="text-[8px] text-emerald-700 italic select-none">Secure Escrow</span>
                          </p>
                          <p className="text-xs text-on-surface-variant/95 italic font-mono pt-1 text-center border-t border-primary/5 mt-1.5">
                            Converted Amount: <span className="font-extrabold text-rose-700 text-sm">₹{priceINR} INR</span>
                          </p>
                        </div>
                      </div>

                      <div className="pt-1 w-full">
                        {/* Direct deep-link URL opening UPI */}
                        <a
                          href={upiPayload}
                          className="w-full inline-flex items-center justify-center gap-2 bg-[#2563eb]/10 hover:bg-[#2563eb]/25 text-[#2563eb] font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wide transition border border-[#2563eb]/15"
                        >
                          <Smartphone size={13} className="stroke-[2.5]" /> Open UPI Mobile App
                        </a>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex justify-between">
                        <span>UPI Transaction Reference (UTR)</span>
                        <span className="text-secondary text-[8px] font-normal lowercase">(12-digit payment code)</span>
                      </label>
                      <input
                        type="text"
                        maxLength={16}
                        placeholder="e.g., 305149204325"
                        value={upiUtrNumber}
                        onChange={(e) => setUpiUtrNumber(e.target.value.replace(/\D/g, ""))}
                        className="w-full px-3 py-2.5 bg-surface-container border border-primary/5 rounded-xl text-xs text-on-surface focus:outline-hidden focus:border-secondary transition font-mono"
                      />
                      <p className="text-[10px] text-on-surface-variant/80 font-light italic leading-normal">
                        Submit the 12-digit UTR from your bank app statement. Once submitted, your design / pass will be instantly authorized.
                      </p>
                    </div>
                  </div>
                )}

                {/* METHOD 2: CREDIT CARD RENDER */}
                {paymentMethod === "card" && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Card Number</label>
                      <div className="relative">
                        <input
                          type="text"
                          maxLength={19}
                          placeholder="4111 2222 3333 4444"
                          value={cardNumber}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, "");
                            let matched = val.match(/.{1,4}/g);
                            setCardNumber(matched ? matched.join(" ") : val);
                          }}
                          className="w-full pl-10 pr-4 py-2.5 bg-surface-container border border-primary/5 rounded-xl text-xs text-on-surface focus:outline-hidden focus:border-secondary transition font-mono"
                        />
                        <CreditCard size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Expiration</label>
                        <input
                          type="text"
                          maxLength={5}
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, "");
                            if (val.length > 2) {
                              val = val.substring(0, 2) + "/" + val.substring(2);
                            }
                            setCardExpiry(val);
                          }}
                          className="w-full px-3 py-2.5 bg-surface-container border border-primary/5 rounded-xl text-xs text-on-surface focus:outline-hidden focus:border-secondary transition font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">CVC Code</label>
                        <input
                          type="password"
                          maxLength={4}
                          placeholder="•••"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ""))}
                          className="w-full px-3 py-2.5 bg-surface-container border border-primary/5 rounded-xl text-xs text-on-surface focus:outline-hidden focus:border-secondary transition font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCheckoutPlan(null)}
                    disabled={subscribingLoader}
                    className="flex-1 py-3 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50 font-extrabold uppercase tracking-wide"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={subscribingLoader}
                    className="flex-1 py-3 bg-secondary hover:bg-secondary-container text-on-secondary hover:text-on-secondary-container text-xs font-black rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-1 disabled:opacity-50 uppercase tracking-wider"
                  >
                    {subscribingLoader ? (
                      <span className="inline-block animate-pulse">Verifying...</span>
                    ) : (
                      <>
                        {paymentMethod === "upi" ? (
                          <>Verify &amp; Unlock</>
                        ) : (
                          <>Authorize Key</>
                        )}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
