import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShowerHead, 
  Bike, 
  Bus, 
  Car, 
  Trash2, 
  Sparkles, 
  ShieldAlert, 
  Lightbulb, 
  Coins, 
  TrendingDown, 
  HelpCircle, 
  RotateCcw, 
  Plus, 
  X,
  ShoppingBag,
  Zap,
  CheckCircle,
  HelpCircle as InfoIcon
} from "lucide-react";

// Types
interface CustomAction {
  id: number;
  name: string;
  impact: number;
  cost: number;
}

interface AIAlternative {
  title: string;
  desc: string;
  pointsRecovery: number;
}

interface AIResponse {
  advice: string;
  alternatives: AIAlternative[];
}

export default function App() {
  // Game session onboarding state
  const [onboardingStatus, setOnboardingStatus] = useState<"accepted" | "declined" | "pending">(() => {
    const saved = localStorage.getItem("ecostep_onboarding");
    return (saved as "accepted" | "declined") || "pending";
  });

  // Base Game configurations (Values match detailed ecological stats)
  const [shower, setShower] = useState<string>("none");
  const [commute, setCommute] = useState<string>("none");
  const [commuteDist, setCommuteDist] = useState<number>(0);
  const [diet, setDiet] = useState<string>("none");
  const [shopping, setShopping] = useState<string>("none");
  const [appliances, setAppliances] = useState<string>("none");
  const [customTasks, setCustomTasks] = useState<CustomAction[]>([]);

  // Extra inputs
  const [customName, setCustomName] = useState<string>("");
  const [customImpact, setCustomImpact] = useState<"low" | "medium" | "high">("low");
  const [customCost, setCustomCost] = useState<"low" | "medium" | "high">("low");

  // Advice states on icons
  const [activeAdviceKey, setActiveAdviceKey] = useState<"shower" | "commute" | "diet" | "shopping" | "appliances" | null>(null);

  // Carbon recovery strategies list (interactive tab selections)
  const [activeTacticTab, setActiveTacticTab] = useState<"transit" | "diet" | "routine" | "lifestyle">("transit");

  // AI Real-time feedback states
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [aiAdvice, setAiAdvice] = useState<string>(
    "Welcome to EcoStep! Choose your daily routines and strategic assets to begin real-time carbon strategy mapping."
  );
  const [aiAlternatives, setAiAlternatives] = useState<AIAlternative[]>([
    {
      title: "Walk or Bicycle Nearby Stops",
      desc: "Swap fuel commutes under 3km for active transport. Recovers +10 strategy points.",
      pointsRecovery: 10
    },
    {
      title: "Limit Showering Time",
      desc: "Shorter warm showers cut heating utility bills and maximize points budget.",
      pointsRecovery: 8
    },
    {
      title: "Initiate Meat-Free Meal",
      desc: "Substitute poultry or beef servings with tofu wraps to lower diet impact.",
      pointsRecovery: 12
    }
  ]);

  // Popup feedback modal states
  const [isFeedbackOpen, setIsFeedbackOpen] = useState<boolean>(false);
  const [appliedAlternative, setAppliedAlternative] = useState<string | null>(null);

  // Sprinkles list for bottom corner explosions
  interface Sprinkle {
    id: number;
    side: "left" | "right";
    size: string;
    bg: string;
    duration: string;
    tx: string;
    ty: string;
    rot: string;
    rx?: string;
  }
  const [sprinkles, setSprinkles] = useState<Sprinkle[]>([]);

  // Prevent initial load from automatically opening flash modals on startup
  const isInitialLoad = useRef<boolean>(true);

  // Constants
  const MAXIMUM_BASELINE_DAILY_COST = 240.0;

  // Static Library definitions
  const adviceLibrary = {
    shower: {
      icon: "🚿",
      title: "Water Heat Savings",
      desc: "Heating water is the second largest energy expense in residences. Trimming shower times below 5 minutes prevents substantial boiler fuel waste and direct municipal load costs."
    },
    commute: {
      icon: "🚗",
      title: "Transit Selection Strategy",
      desc: "Vehicles emit major greenhouse volumes per mile. Choosing standard transit or electric drives preserves your credit points and lowers fuel consumption."
    },
    diet: {
      icon: "🥗",
      title: "Agricultural Carbon Control",
      desc: "Heavy red meat lines generate dramatic methane and land logistic footprints. Introducing plant crops or grain proteins can drop emissions and improve systemic vitality."
    },
    shopping: {
      icon: "🛍️",
      title: "Circular Consumption",
      desc: "Fast manufacturing pushes raw textile extraction, and plastic processing. Thrifting secondhand and limiting gadget upgrades stops industrial lifecycle loads."
    },
    appliances: {
      icon: "⚡",
      title: "Grid Power Load Chores",
      desc: "Pumping hot air in clothes dryers sucks thousands of watts from local power lines. Selecting air-dry cycles protects garment strings and keeps electricity bills minimal."
    }
  };

  const alternativeStrategies = {
    transit: [
      {
        title: "Walk or Bicycle Nearby Stops",
        desc: "Swap fuel commutes under 3km for a bike. Saves gasoline & recovers +10 game points.",
        actionKey: "commute-walk"
      },
      {
        title: "Transition to Local Rail/Bus",
        desc: "Use public transit for longer daily routines to cut vehicle gasoline demands.",
        actionKey: "commute-transit"
      }
    ],
    diet: [
      {
        title: "Initiate Meat-Free Meal",
        desc: "Substitute poultry or meat dishes with green plant proteins to lower diet impact.",
        actionKey: "diet-vegan"
      },
      {
        title: "Rely on Local Organics",
        desc: "Choose raw regional crops over processed grocery imports.",
        actionKey: "diet-vegetarian"
      }
    ],
    routine: [
      {
        title: "Limit Showering Time",
        desc: "Shorter warm showers cut heating utility bills and maximize points budget.",
        actionKey: "shower-short"
      },
      {
        title: "Switch to Cold Wash Cycles",
        desc: "Washing garments with cold water limits electric heat-pump activation.",
        actionKey: "appliance-low"
      }
    ],
    lifestyle: [
      {
        title: "Focus on Thrifting Options",
        desc: "Store-hunt for quality preowned outfits. Stops rapid industrial fabrication demands.",
        actionKey: "shop-secondhand"
      },
      {
        title: "Mend and Repurpose Today",
        desc: "Delay buying premium electronic goods to maintain maximum local funds.",
        actionKey: "shop-none"
      }
    ]
  };

  // Perform instant calculations strictly synchronized in render
  const co2Stat = (() => {
    let co2 = 0;
    let cost = 0;

    // Shower
    if (shower === "short") { co2 += 0.40; cost += 0.50; }
    else if (shower === "med") { co2 += 1.80; cost += 1.50; }
    else if (shower === "long") { co2 += 5.20; cost += 4.00; }

    // Commute
    const dist = Number(commuteDist) || 0;
    if (commute === "transit") { co2 += dist * 0.08; cost += dist * 0.15; }
    else if (commute === "ev") { co2 += dist * 0.05; cost += dist * 0.10; }
    else if (commute === "car-gas") { co2 += dist * 0.25; cost += dist * 0.20; }

    // Diet
    if (diet === "vegan") { co2 += 1.20; cost += 6.00; }
    else if (diet === "vegetarian") { co2 += 2.10; cost += 8.00; }
    else if (diet === "average") { co2 += 4.50; cost += 12.00; }
    else if (diet === "heavy-meat") { co2 += 8.80; cost += 22.00; }

    // Shopping
    if (shopping === "secondhand") { co2 += 1.50; cost += 15.00; }
    else if (shopping === "new-clothes") { co2 += 12.00; cost += 45.00; }
    else if (shopping === "electronics") { co2 += 45.00; cost += 180.00; }

    // Appliances
    if (appliances === "med") { co2 += 0.80; cost += 1.20; }
    else if (appliances === "high") { co2 += 2.90; cost += 3.50; }

    // Custom activities
    customTasks.forEach(task => {
      co2 += task.impact;
      cost += task.cost;
    });

    const finalCo2 = Number(co2.toFixed(2));
    const finalCost = Number(cost.toFixed(2));

    // Remaining points: Max 100, drops by footprint scale (7 points per kg CO2)
    const points = Math.max(0, Math.min(100, Math.round(100 - (finalCo2 * 6.5))));

    // Savings Relative to Baseline
    const savings = Math.max(0, Number((MAXIMUM_BASELINE_DAILY_COST - finalCost).toFixed(2)));

    // Ranks based on total daily emissions
    let rank = "Earth Cadet 🥚";
    if (finalCo2 === 0) rank = "Seed Sower 🌱";
    else if (finalCo2 <= 3.00) rank = "Eco Champion 🌟";
    else if (finalCo2 <= 5.50) rank = "Green Knight 🛡️";
    else if (finalCo2 <= 8.00) rank = "Earth Cadet 🥚";
    else if (finalCo2 <= 12.00) rank = "Carbon Consumer 🏭";
    else rank = "Climate Danger ⚠️";

    return {
      co2: finalCo2,
      cost: finalCost,
      savings,
      points,
      rank
    };
  })();

  // Fire physical sprinkles burst from left and right bottom corners
  const triggerSprinklesBurst = () => {
    const colors = ["#2d6a4f", "#52b788", "#74c69d", "#ffb3c1", "#ffb703", "#38bdf8", "#ec4899", "#f59e0b"];
    const sideCount = 30;
    const items: Sprinkle[] = [];

    // Left Side Emitters
    for (let i = 0; i < sideCount; i++) {
      const rxType = Math.random() > 0.5 ? "50%" : "2px";
      items.push({
        id: Math.random() + i * 1000,
        side: "left",
        size: `${Math.floor(Math.random() * 8) + 6}px`,
        bg: colors[Math.floor(Math.random() * colors.length)],
        duration: `${(Math.random() * 1.5 + 1.2).toFixed(2)}s`,
        tx: `${Math.floor(Math.random() * 320) + 120}px`,
        ty: `-${Math.floor(Math.random() * 450) + 300}px`,
        rot: `${Math.floor(Math.random() * 720) + 360}deg`,
        rx: rxType
      });
    }

    // Right Side Emitters
    for (let i = 0; i < sideCount; i++) {
      const rxType = Math.random() > 0.5 ? "50%" : "4px";
      items.push({
        id: Math.random() + i * 2000,
        side: "right",
        size: `${Math.floor(Math.random() * 8) + 6}px`,
        bg: colors[Math.floor(Math.random() * colors.length)],
        duration: `${(Math.random() * 1.5 + 1.2).toFixed(2)}s`,
        tx: `${Math.floor(Math.random() * 320) + 120}px`,
        ty: `-${Math.floor(Math.random() * 450) + 300}px`,
        rot: `${Math.floor(Math.random() * 720) + 360}deg`,
        rx: rxType
      });
    }

    setSprinkles(items);

    // Clean up particles after they finish playing
    setTimeout(() => {
      setSprinkles([]);
    }, 3000);
  };

  // Perform server-side Gemini prompt evaluation with local fallback
  const fetchAIEvaluation = async () => {
    setIsEvaluating(true);
    try {
      const payload = {
        co2: co2Stat.co2,
        points: co2Stat.points,
        cost: co2Stat.cost,
        savings: co2Stat.savings,
        rank: co2Stat.rank,
        choices: {
          shower,
          commute,
          commuteDist,
          diet,
          shopping,
          appliances,
          customTasks
        }
      };

      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Local feedback mechanism triggered.");
      }

      const data: AIResponse = await response.json();
      setAiAdvice(data.advice);
      setAiAlternatives(data.alternatives || []);
    } catch (err) {
      console.warn("Using local algorithm parser:", err);
      // Fallback heuristics
      let localAdvice = "Analyzing your footprint config: ";
      if (co2Stat.co2 <= 8.00) {
        localAdvice += `Excellent task coordination! Your total daily footprint of ${co2Stat.co2} kg sits successfully under our planetary ceiling. Trimming laundry heat lines and cycling keeps coordinates pristine.`;
      } else {
        localAdvice += `We recorded excessive emissions (${co2Stat.co2} kg CO2e). Switching off standard gasoline vehicles, adopting plant meals, and reducing shower temperatures under 5 minutes will save your point budget first.`;
      }
      setAiAdvice(localAdvice);

      // Tailored fallback tips
      const defaultTips: AIAlternative[] = [];
      if (commute === "car-gas") {
        defaultTips.push({
          title: "Transition to Local Rail/Bus",
          desc: "Saves vehicle gasoline demands and recovers points. Cuts emissions by 75%.",
          pointsRecovery: 15
        });
      }
      if (shower === "long" || shower === "med") {
        defaultTips.push({
          title: "Limit Showering Time",
          desc: "Shorter warm showers cut heating utility bills and maximize points budget.",
          pointsRecovery: 10
        });
      }
      if (diet === "heavy-meat" || diet === "average") {
        defaultTips.push({
          title: "Initiate Meat-Free Meal",
          desc: "Substitute poultry or beef servings with tofu wraps to lower diet impact.",
          pointsRecovery: 12
        });
      }
      if (defaultTips.length < 3) {
        defaultTips.push({
          title: "Cold Wash Laundry Cycle",
          desc: "Air-drying garments limits electric heat-pump activation.",
          pointsRecovery: 8
        });
      }
      setAiAlternatives(defaultTips.slice(0, 3));
    } finally {
      setIsEvaluating(false);
      setIsFeedbackOpen(true);
    }
  };

  // Debounced evaluation trigger listener
  useEffect(() => {
    // Skip opening pop-ups automatically on the very first mount 
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    // Skip popups if all choices are reset/unselected to prevent constant modal clutter during setup
    const hasAnySelection = 
      shower !== "none" || 
      commute !== "none" || 
      diet !== "none" || 
      shopping !== "none" || 
      appliances !== "none" ||
      customTasks.length > 0;

    if (!hasAnySelection) return;

    const timer = setTimeout(() => {
      fetchAIEvaluation();
    }, 1200);

    return () => clearTimeout(timer);
  }, [shower, commute, commuteDist, diet, shopping, appliances, customTasks.length]);

  // Check limits and trigger corner celebration effects whenever points evaluation is completed
  useEffect(() => {
    if (isFeedbackOpen && co2Stat.co2 <= 8.00 && co2Stat.co2 > 0) {
      triggerSprinklesBurst();
    }
  }, [isFeedbackOpen]);

  // Save onboarding status to storage
  const handleOnboarding = (status: "accepted" | "declined") => {
    localStorage.setItem("ecostep_onboarding", status);
    setOnboardingStatus(status);
  };

  // Strategic Option applier from advisor tabs
  const applyStrategyAlternative = (actionKey: string) => {
    setAppliedAlternative(actionKey);
    setTimeout(() => setAppliedAlternative(null), 1500);

    switch (actionKey) {
      case "commute-walk":
        setCommute("walk");
        setCommuteDist(0);
        break;
      case "commute-transit":
        setCommute("transit");
        setCommuteDist(Math.max(5, commuteDist));
        break;
      case "diet-vegan":
        setDiet("vegan");
        break;
      case "diet-vegetarian":
        setDiet("vegetarian");
        break;
      case "shower-short":
        setShower("short");
        break;
      case "appliance-low":
        setAppliances("low");
        break;
      case "shop-secondhand":
        setShopping("secondhand");
        break;
      case "shop-none":
        setShopping("none-today");
        break;
      default:
        break;
    }
  };

  // Log Custom action inputs
  const handleAddCustomTask = () => {
    if (!customName.trim()) return;

    let impactFactor = 0.5;
    let costFactor = 2.0;

    if (customImpact === "medium") impactFactor = 2.0;
    else if (customImpact === "high") impactFactor = 5.0;

    if (customCost === "medium") costFactor = 8.0;
    else if (customCost === "high") costFactor = 30.0;

    const newTask: CustomAction = {
      id: Date.now(),
      name: customName.trim(),
      impact: impactFactor,
      cost: costFactor
    };

    setCustomTasks([...customTasks, newTask]);
    setCustomName("");
  };

  // Remove custom task
  const handleRemoveCustomTask = (id: number) => {
    setCustomTasks(customTasks.filter(item => item.id !== id));
  };

  // Reset core parameters
  const handleResetSession = () => {
    setShower("none");
    setCommute("none");
    setCommuteDist(0);
    setDiet("none");
    setShopping("none");
    setAppliances("none");
    setCustomTasks([]);
    setSprinkles([]);
    setIsFeedbackOpen(false);
  };

  return (
    <div className="min-h-screen bg-emerald-50 text-slate-800 py-8 px-4 flex flex-col items-center justify-start relative overflow-x-hidden font-sans selection:bg-emerald-200 selection:text-emerald-900">
      
      {/* Dynamic Sprinkles Celebration Elements */}
      {sprinkles.map(spr => (
        <div
          key={spr.id}
          className={spr.side === "left" ? "sprinkle-left" : "sprinkle-right"}
          style={{
            ["--size" as any]: spr.size,
            ["--bg" as any]: spr.bg,
            ["--duration" as any]: spr.duration,
            ["--tx" as any]: spr.tx,
            ["--ty" as any]: spr.ty,
            ["--rot" as any]: spr.rot,
            ["--rx" as any]: spr.rx
          } as React.CSSProperties}
        />
      ))}

      {/* State A: Onboarding Gate */}
      {onboardingStatus === "pending" && (
        <div className="fixed inset-0 bg-emerald-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border-[8px] border-emerald-100 max-w-lg w-full p-8 md:p-10 rounded-[3rem] text-center shadow-2xl relative"
          >
            <div className="text-5xl mb-4">🌍</div>
            <h2 className="text-emerald-900 text-2xl md:text-3xl font-black tracking-tight mb-4">
              Welcome to EcoStep
            </h2>
            <p className="text-slate-600 text-base leading-relaxed mb-6 font-medium">
              Evaluating everyday actions can guide us to healthier environmental choices. Let's measure your daily tasks, strategize your resources, and analyze your carbon footprint budget in real-time.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => handleOnboarding("declined")}
                className="flex-1 py-3.5 px-6 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold rounded-2xl transition duration-205"
              >
                No, thanks
              </button>
              <button 
                onClick={() => handleOnboarding("accepted")}
                className="flex-1 py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-md cursor-pointer transition duration-205"
              >
                Yes, let's start!
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* State B: Nature Fallback if Onboarding Declined */}
      {onboardingStatus === "declined" && (
        <div className="max-w-md w-full bg-white border-[8px] border-emerald-100 rounded-[3rem] p-8 text-center shadow-2xl my-auto">
          <div className="text-5xl mb-4">🍃</div>
          <h2 className="text-emerald-900 text-2xl font-black tracking-tight mb-3">Nature Awaits You</h2>
          <p className="text-slate-600 leading-relaxed font-semibold mb-6">
            Taking care of our planet starts with a single step whenever you feel ready. Return to the strategy game whenever you want to test your footprint.
          </p>
          <button 
            onClick={() => handleOnboarding("accepted")}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow transition duration-205"
          >
            Explore EcoStep anyway
          </button>
        </div>
      )}

      {/* State C: Primary Strategy Game Panel */}
      {onboardingStatus === "accepted" && (
        <div className="w-full max-w-5xl bg-white rounded-[3rem] border-[10px] border-emerald-100 p-6 md:p-10 shadow-2xl relative my-4">
          
          {/* Organic Leaf Vector Corners */}
          <div className="absolute top-0 left-0 -mt-2 -ml-2 pointer-events-none opacity-80 md:block hidden">
            <svg className="w-24 h-24 text-emerald-200" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
              <path d="M 0,0 C 30,10 50,30 80,40" />
              <path d="M 30,12 C 35,5 45,5 50,10 C 45,18 35,18 30,12 Z" fill="#a7f3d0" />
              <path d="M 50,23 C 58,20 62,10 70,15 C 68,25 58,28 50,23 Z" fill="#34d399" />
            </svg>
          </div>
          <div className="absolute top-0 right-0 -mt-2 -mr-2 pointer-events-none opacity-80 md:block hidden scale-x-[-1]">
            <svg className="w-24 h-24 text-emerald-200" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
              <path d="M 0,0 C 30,10 50,30 80,40" />
              <path d="M 30,12 C 35,5 45,5 50,10 C 45,18 35,18 30,12 Z" fill="#a7f3d0" />
              <path d="M 50,23 C 58,20 62,10 70,15 C 68,25 58,28 50,23 Z" fill="#34d399" />
            </svg>
          </div>

          {/* Heading block */}
          <header className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-black text-emerald-900 flex items-center justify-center gap-3">
              <span className="bg-emerald-200 p-2 rounded-2xl">🌱</span> EcoStep Strategy
            </h1>
            <p className="text-emerald-700 font-bold mt-2 text-sm md:text-base">
              Current Rank: <span className="text-emerald-500 underline font-black">{co2Stat.rank}</span>
            </p>
          </header>

          {/* Game HUD Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white rounded-3xl p-6 border-4 border-emerald-100 shadow-lg mb-8">
            {/* HUD: Points */}
            <div className="flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-black text-emerald-800 uppercase tracking-wider mb-1.5">
                <span>Eco-Points Multiplier</span>
                <span className="text-emerald-600">{co2Stat.points} / 100</span>
              </div>
              <div className="w-full h-8 bg-emerald-50 rounded-full overflow-hidden border-2 border-emerald-100">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500 ease-out"
                  style={{ width: `${co2Stat.points}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider">Consumes with high emissions</span>
            </div>

            {/* HUD: Limits */}
            <div className="flex flex-col items-center justify-center border-y md:border-y-0 md:border-x border-emerald-100 py-3 md:py-0 md:px-6">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Total Footprint</span>
              <div className="text-3xl font-black text-emerald-600 mt-1 flex items-baseline gap-1">
                <span>{co2Stat.co2}</span>
                <span className="text-sm font-bold">kg</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5">Target: &lt; 8.00 kg</span>
            </div>

            {/* HUD: Rank */}
            <div className="flex flex-col items-center justify-center">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Status Badge</span>
              <div className="text-sm font-black text-emerald-900 bg-emerald-100 px-4 py-2 rounded-2xl border-2 border-emerald-200 shadow-sm mt-1 text-center">
                {co2Stat.rank}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT WORKSPACE: Inputs */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Cards wrapper 1: Daily Routine */}
              <div className="bg-white rounded-3xl p-5 border-2 border-slate-100 shadow-md hover:border-emerald-300 transition-all relative">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                  <span className="font-extrabold text-slate-800 text-sm md:text-base flex items-center gap-2">
                    🚿 Daily Routine
                  </span>
                  <span className={`text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider select-none transition-all duration-300 ${shower !== "none" ? "bg-emerald-100 text-emerald-850 opacity-100 scale-100" : "bg-slate-100 text-slate-400 opacity-60 scale-95"}`}>
                    Logged
                  </span>
                </div>

                {/* Inner input 1: Shower */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black text-slate-500 flex items-center gap-1.5 mb-1.5">
                      Shower Duration
                      <button 
                        type="button" 
                        onClick={() => setActiveAdviceKey(activeAdviceKey === "shower" ? null : "shower")}
                        className="text-emerald-600 focus:outline-none hover:scale-110 transition duration-150"
                      >
                        <InfoIcon size={14} />
                      </button>
                    </label>
                    <select 
                      value={shower} 
                      onChange={(e) => setShower(e.target.value)}
                      className="w-full p-2.5 bg-emerald-50/50 border-2 border-emerald-105 rounded-2xl text-sm font-bold text-slate-700 focus:border-emerald-500 outline-none transition-all"
                    >
                      <option value="none">Choose duration...</option>
                      <option value="short">Short (&lt; 5 mins) — Save hot water</option>
                      <option value="med">Medium (5-15 mins) — Standard</option>
                      <option value="long">Long (&gt; 15 mins) — Heavy energy demand</option>
                    </select>
                  </div>

                  {/* Inner input 2: Commute Mode */}
                  <div>
                    <label className="text-xs font-black text-slate-500 flex items-center gap-1.5 mb-1.5">
                      Primary Commute Mode
                      <button 
                        type="button" 
                        onClick={() => setActiveAdviceKey(activeAdviceKey === "commute" ? null : "commute")}
                        className="text-emerald-600 focus:outline-none hover:scale-110 transition duration-150"
                      >
                        <InfoIcon size={14} />
                      </button>
                    </label>
                    <select 
                      value={commute} 
                      onChange={(e) => setCommute(e.target.value)}
                      className="w-full p-2.5 bg-emerald-50/50 border-2 border-emerald-105 rounded-2xl text-sm font-bold text-slate-700 focus:border-emerald-500 outline-none transition-all"
                    >
                      <option value="none">Choose transit...</option>
                      <option value="walk">No Drive (Walk / Bicycle)</option>
                      <option value="transit">Public Transit (Bus or Train)</option>
                      <option value="ev">Electric Vehicle (EV)</option>
                      <option value="car-gas">Standard Gasoline Vehicle</option>
                    </select>
                  </div>

                  {/* Conditional input: distance */}
                  {commute !== "none" && commute !== "walk" && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="bg-emerald-50/30 border-2 border-emerald-100 rounded-2xl p-3.5 space-y-1.5"
                    >
                      <label className="text-xs font-bold text-emerald-950 block">
                        Commute Distance (km)
                      </label>
                      <input 
                        type="number" 
                        min="0" 
                        max="200"
                        value={commuteDist === 0 ? "" : commuteDist} 
                        onChange={(e) => setCommuteDist(Math.max(0, Number(e.target.value)))}
                        placeholder="e.g. 15"
                        className="w-full p-2 bg-white border-2 border-emerald-100 rounded-xl font-bold text-sm outline-none focus:border-emerald-500 transition-all"
                      />
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Cards wrapper 2: Diet & Food */}
              <div className="bg-white rounded-3xl p-5 border-2 border-slate-100 shadow-md hover:border-emerald-300 transition-all">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <span className="font-extrabold text-slate-800 text-sm md:text-base flex items-center gap-2">
                    🥗 Dietary Footprint
                  </span>
                  <span className={`text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider select-none transition-all duration-300 ${diet !== "none" ? "bg-emerald-100 text-emerald-850 opacity-100 scale-100" : "bg-slate-100 text-slate-400 opacity-60 scale-95"}`}>
                    Logged
                  </span>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 flex items-center gap-1.5 mb-1.5">
                    Today's Food Profile
                    <button 
                      type="button" 
                      onClick={() => setActiveAdviceKey(activeAdviceKey === "diet" ? null : "diet")}
                      className="text-emerald-600 focus:outline-[#10b981] hover:scale-110 transition duration-150"
                    >
                      <InfoIcon size={14} />
                    </button>
                  </label>
                  <select 
                    value={diet} 
                    onChange={(e) => setDiet(e.target.value)}
                    className="w-full p-2.5 bg-emerald-50/50 border-2 border-emerald-105 rounded-2xl text-sm font-bold text-slate-700 focus:border-emerald-500 outline-none transition-all"
                  >
                    <option value="none">Choose meals...</option>
                    <option value="vegan">Vegan (Entirely Plant-Based)</option>
                    <option value="vegetarian">Vegetarian (Dairy / eggs, no meat)</option>
                    <option value="average">Balanced (Moderate poultry & dairy)</option>
                    <option value="heavy-meat">Heavy Meat (Frequent beef & lamb servings)</option>
                  </select>
                </div>
              </div>

              {/* Cards wrapper 3: Lifestyle & Shopping */}
              <div className="bg-white rounded-3xl p-5 border-2 border-slate-100 shadow-md hover:border-emerald-300 transition-all">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <span className="font-extrabold text-slate-800 text-sm md:text-base flex items-center gap-2">
                    🛍️ Lifestyle & Shopping
                  </span>
                  <span className={`text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider select-none transition-all duration-300 ${shopping !== "none" ? "bg-[#d8f3dc] text-emerald-850 opacity-100 scale-100" : "bg-slate-100 text-slate-400 opacity-60 scale-95"}`}>
                    Logged
                  </span>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 flex items-center gap-1.5 mb-1.5">
                    Major Purchases Today
                    <button 
                      type="button" 
                      onClick={() => setActiveAdviceKey(activeAdviceKey === "shopping" ? null : "shopping")}
                      className="text-emerald-600 focus:outline-[#10b981] hover:scale-110 transition duration-150"
                    >
                      <InfoIcon size={14} />
                    </button>
                  </label>
                  <select 
                    value={shopping} 
                    onChange={(e) => setShopping(e.target.value)}
                    className="w-full p-2.5 bg-emerald-50/50 border-2 border-emerald-105 rounded-2xl text-sm font-bold text-slate-700 focus:border-emerald-500 outline-none transition-all"
                  >
                    <option value="none">Choose shopping...</option>
                    <option value="none-today">No non-essential goods purchased</option>
                    <option value="secondhand">Secondhand / Thrifted items</option>
                    <option value="new-clothes">New Clothing (Fast Fashion lines)</option>
                    <option value="electronics">Premium Consumer Electronics / Upgrade</option>
                  </select>
                </div>
              </div>

              {/* Cards wrapper 4: Utility Chores */}
              <div className="bg-white rounded-3xl p-5 border-2 border-slate-100 shadow-md hover:border-emerald-300 transition-all">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <span className="font-extrabold text-slate-800 text-sm md:text-base flex items-center gap-2">
                    ⚡ Utility Chores & Bills
                  </span>
                  <span className={`text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider select-none transition-all duration-300 ${appliances !== "none" ? "bg-[#d8f3dc] text-emerald-850 opacity-100 scale-100" : "bg-slate-100 text-slate-400 opacity-60 scale-95"}`}>
                    Logged
                  </span>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 flex items-center gap-1.5 mb-1.5">
                    Appliances Operated Today
                    <button 
                      type="button" 
                      onClick={() => setActiveAdviceKey(activeAdviceKey === "appliances" ? null : "appliances")}
                      className="text-emerald-600 focus:outline-[#10b981] hover:scale-110 transition duration-150"
                    >
                      <InfoIcon size={14} />
                    </button>
                  </label>
                  <select 
                    value={appliances} 
                    onChange={(e) => setAppliances(e.target.value)}
                    className="w-full p-2.5 bg-emerald-50/50 border-2 border-emerald-105 rounded-2xl text-sm font-bold text-slate-700 focus:border-emerald-500 outline-none transition-all"
                  >
                    <option value="none">Choose usage...</option>
                    <option value="low">Air Drying only / Standby cycles</option>
                    <option value="med">Operate Dishwasher / Washing machine once</option>
                    <option value="high">Operate Electric Heaters or Clothes Dryer</option>
                  </select>
                </div>
              </div>

              {/* Cards wrapper 5: Custom Log "Others" */}
              <div className="bg-white rounded-3xl p-5 border-2 border-slate-100 shadow-md hover:border-emerald-300 transition-all">
                <span className="font-extrabold text-slate-800 text-sm md:text-base block mb-1">
                  ➕ Custom Activity (Others)
                </span>
                <p className="text-xs text-slate-400 mb-4 font-bold uppercase tracking-wide">
                  Manually log extra tasks or unlisted parameters to the local dynamic calculator.
                </p>

                <div className="space-y-3.5">
                  <div>
                    <label className="text-[11px] font-black text-slate-500 block mb-1">Activity Label</label>
                    <input 
                      type="text" 
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g. Purchased bottled water pack"
                      className="w-full p-2.5 bg-emerald-50/20 border-2 border-slate-100 rounded-2xl text-sm outline-none font-bold text-slate-800 focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-black text-slate-500 block mb-1">CO2 Impact</label>
                      <select 
                        value={customImpact} 
                        onChange={(e: any) => setCustomImpact(e.target.value)}
                        className="w-full p-2 bg-emerald-50/50 border-2 border-emerald-105 rounded-xl text-xs outline-none font-bold"
                      >
                        <option value="low">Low (~0.5 kg)</option>
                        <option value="medium">Medium (~2.0 kg)</option>
                        <option value="high">High (~5.0 kg)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-black text-slate-500 block mb-1">Financial Cost</label>
                      <select 
                        value={customCost} 
                        onChange={(e: any) => setCustomCost(e.target.value)}
                        className="w-full p-2 bg-emerald-50/50 border-2 border-emerald-105 rounded-xl text-xs outline-none font-bold"
                      >
                        <option value="low">Low Cost (~$2)</option>
                        <option value="medium">Medium Cost (~$8)</option>
                        <option value="high">High Cost (~$30)</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    type="button" 
                    onClick={handleAddCustomTask}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs transition duration-150 cursor-pointer shadow-sm"
                  >
                    Add Custom Task
                  </button>

                  {customTasks.length > 0 && (
                    <div className="mt-4 border-t border-slate-100 pt-3 space-y-2">
                      <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider block">Logged Additions:</span>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto">
                        {customTasks.map(task => (
                          <div 
                            key={task.id}
                            className="bg-emerald-50/45 border-2 border-emerald-100 rounded-2xl p-2.5 flex items-center justify-between"
                          >
                            <div className="text-xs">
                              <span className="font-black text-emerald-950 block">{task.name}</span>
                              <span className="text-slate-400 font-bold uppercase text-[10px]">+{task.impact} kg CO2e / +${task.cost}</span>
                            </div>
                            <button 
                              onClick={() => handleRemoveCustomTask(task.id)}
                              className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded-xl transition"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT WORKSPACE: Dashboard Stats & Achievements */}
            <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-4">
              
              {/* Box 1: Stats summary */}
              <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden border-4 border-emerald-700">
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-300 block">
                  Today's Footprint summary
                </span>
                <div className="flex items-baseline gap-1 mt-1.5 mb-5 select-all">
                  <span className="text-4xl font-black tracking-tight">{co2Stat.co2}</span>
                  <span className="text-base font-bold text-emerald-200">kg CO2e</span>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-white/10 backdrop-blur rounded-2xl p-3.5 border border-white/10 text-xs">
                  <div>
                    <span className="text-white/70 uppercase font-black tracking-wider text-[10px] block mb-0.5">Total Expenses</span>
                    <strong className="text-base font-mono font-black">${co2Stat.cost}</strong>
                  </div>
                  <div className="text-right border-l border-white/20 pl-4">
                    <span className="text-amber-300 uppercase font-black tracking-wider text-[10px] block mb-0.5 animate-pulse">Savings Saved</span>
                    <strong className="text-base text-amber-300 font-mono font-black">${co2Stat.savings}</strong>
                  </div>
                </div>
              </div>

              {/* Box 2: Cybernetic AI Eco-Trophy Showcase */}
              <div className={`mt-2 border-4 rounded-3xl p-5 text-center flex flex-col items-center transition-all duration-300 ${co2Stat.co2 <= 8.00 && co2Stat.co2 > 0 ? "border-amber-200 bg-amber-400 text-amber-950 shadow-xl" : "border-slate-100 bg-white"}`}>
                <span className={`text-base font-black flex items-center gap-1.5 ${co2Stat.co2 <= 8.00 && co2Stat.co2 > 0 ? "text-amber-950" : "text-gray-400"}`}>
                  <Sparkles size={18} />
                  {co2Stat.co2 <= 8.00 && co2Stat.co2 > 0 ? "AI Eco-Trophy Unlocked!" : "AI Eco-Trophy Locked"}
                </span>
                <p className={`text-xs mt-1 max-w-sm font-semibold ${co2Stat.co2 <= 8.00 && co2Stat.co2 > 0 ? "text-amber-900" : "text-slate-400"}`}>
                  {co2Stat.co2 <= 8.00 && co2Stat.co2 > 0 
                    ? "Spectacular strategy coordination! Tap below to read your custom advisor report." 
                    : "Emissions must stay below 8.00 kg. Limit high commutes or dairy foods to unlock this glow."}
                </p>

                {/* CYBERNETIC AI ECO-TROPHY SVG */}
                <div className="relative mt-4">
                  {co2Stat.co2 <= 8.00 && co2Stat.co2 > 0 && (
                    <motion.div 
                      className="absolute inset-0 bg-amber-400/30 rounded-full filter blur-xl"
                      animate={{ scale: [1, 1.2, 1], rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity }}
                    />
                  )}
                  <svg className={`w-28 h-28 ${co2Stat.co2 <= 8.00 && co2Stat.co2 > 0 ? "text-amber-900 filter drop-shadow-[0_0_15px_rgba(251,191,36,0.7)] rotate-3 scale-110" : "text-gray-300 opacity-60 scale-100"}`} viewBox="0 0 100 100" fill="currentColor">
                    {/* Pedestal */}
                    <path d="M25 88 L75 88 L68 76 L32 76 Z" />
                    <rect x="42" y="62" width="16" height="14" rx="2" fillOpacity="0.4" />
                    {/* Stem */}
                    <path d="M50 62 L50 45" stroke="currentColor" strokeWidth="4" />
                    {/* Cup */}
                    <polygon points="50,15 78,28 78,54 50,70 22,54 22,28" stroke="currentColor" strokeWidth="2.5" fill="none" />
                    {/* Inside Glowing Leaf Structure */}
                    <path d="M50,18 C64,28 64,46 50,58 C36,46 36,28 50,18 Z" className={co2Stat.co2 <= 8.00 && co2Stat.co2 > 0 ? "text-emerald-900" : "text-gray-300"} />
                  </svg>
                </div>
              </div>

              {/* Box 3: Oh No Crying Sad Cat (Alerts high output) */}
              <AnimatePresence>
                {co2Stat.co2 >= 10.00 && (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0, y: 15 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="border-4 border-rose-200 bg-rose-50 rounded-3xl p-5 text-center space-y-3 shadow-md"
                  >
                    <span className="text-xs font-black text-rose-700 block uppercase tracking-wider">Oh no! Footprint target exceeded...</span>
                    
                    {/* Animating blush crying cat */}
                    <div className="flex justify-center select-none">
                      <svg className="w-24 h-24 text-gray-600 animate-bounce" viewBox="0 0 100 100">
                        {/* Ears */}
                        <polygon points="20,40 8,8 38,28" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
                        <polygon points="22,37 12,12 35,27" fill="#ffb3c1" />
                        <polygon points="80,40 92,8 62,28" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
                        <polygon points="78,37 88,12 65,27" fill="#ffb3c1" />
                        {/* Head */}
                        <circle cx="50" cy="55" r="35" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
                        {/* Eyes */}
                        <ellipse cx="38" cy="52" rx="4.5" ry="6.5" fill="#2d3748" />
                        <ellipse cx="62" cy="52" rx="4.5" ry="6.5" fill="#2d3748" />
                        <circle cx="36.5" cy="50" r="1.5" fill="#ffffff" />
                        <circle cx="60.5" cy="50" r="1.5" fill="#ffffff" />
                        {/* Tears */}
                        <path d="M 38,58 C 38,72 35,76 35,76 C 35,76 38,72 38,58" fill="#8ecae6" stroke="#0077b6" strokeWidth="0.5" />
                        <path d="M 62,58 C 62,72 65,76 65,76 C 65,76 62,72 62,58" fill="#8ecae6" stroke="#0077b6" strokeWidth="0.5" />
                        {/* Blush Cheeks */}
                        <ellipse cx="26" cy="61" rx="5" ry="2.5" fill="#ffb3c1" fillOpacity="0.7" />
                        <ellipse cx="74" cy="61" rx="5" ry="2.5" fill="#ffb3c1" fillOpacity="0.7" />
                        {/* Mouth and Nose */}
                        <polygon points="50,59 48,57 52,57" fill="#ffb3c1" />
                        <path d="M 46,65 Q 50,68 54,65" fill="none" stroke="#2d3748" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <p className="text-xs text-rose-955 font-bold leading-relaxed">
                      Your daily transport or luxury lines generate extreme carbon ({co2Stat.co2} kg). Apply recovery tactics below to restore the water balances and dry its interactive tears!
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Box 4: Interactive recovery alternatives list */}
              <div className="bg-[#0f172a] rounded-[2.5rem] p-6 text-white border-8 border-slate-800 shadow-2xl relative space-y-4">
                <span className="font-extrabold text-[#10b981] text-sm flex items-center gap-2">
                  <Lightbulb size={16} />
                  Carbon Recovery Tactics
                </span>

                <div className="flex gap-1 overflow-x-auto pb-1.5 scrollbar-thin border-b border-[#10b981]/20 text-[11px] font-bold">
                  {(["transit", "diet", "routine", "lifestyle"] as const).map(tabName => (
                    <button
                      key={tabName}
                      onClick={() => setActiveTacticTab(tabName)}
                      className={`px-3 py-1.5 rounded-full select-none cursor-pointer capitalize transition-all duration-150 ${activeTacticTab === tabName ? "bg-emerald-500 text-slate-950 font-black" : "bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"}`}
                    >
                      {tabName}
                    </button>
                  ))}
                </div>

                <div className="min-h-36 flex flex-col justify-between">
                  <div className="space-y-3">
                    {alternativeStrategies[activeTacticTab].map((strategy, index) => (
                      <div 
                        key={index}
                        className={`bg-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition hover:bg-slate-750 border-l-4 ${
                          index === 0 ? "border-emerald-400" : index === 1 ? "border-yellow-400" : "border-rose-400"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className="text-xs font-black text-white block">{strategy.title}</span>
                          <span className="text-[11px] text-slate-400 font-medium leading-normal block">{strategy.desc}</span>
                        </div>
                        <button 
                          onClick={() => applyStrategyAlternative(strategy.actionKey)}
                          className="self-end sm:self-center shrink-0 text-xs text-emerald-400 hover:text-emerald-300 font-black underline select-none cursor-pointer"
                        >
                          {appliedAlternative === strategy.actionKey ? "Applied! ✨" : "Apply Tactic"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 font-sans">
                <button 
                  onClick={handleResetSession}
                  className="flex-1 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-2xl text-xs flex items-center justify-center gap-1.5 border border-slate-200 transition"
                >
                  <RotateCcw size={14} />
                  Reset Session
                </button>

                <button 
                  onClick={fetchAIEvaluation}
                  disabled={isEvaluating}
                  className="flex-1 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {isEvaluating ? "Analyzing..." : "Ask AI Advisor 🌿"}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Specific Inline Advice Info Popup */}
      <AnimatePresence>
        {activeAdviceKey && (
          <div className="fixed inset-0 bg-emerald-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[3rem] p-8 max-w-sm w-full border-[10px] border-emerald-100 text-center shadow-2xl space-y-4"
            >
              <div className="text-4xl text-[#2d6a4f]">{adviceLibrary[activeAdviceKey].icon}</div>
              <h3 className="text-emerald-900 text-lg font-black">{adviceLibrary[activeAdviceKey].title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">{adviceLibrary[activeAdviceKey].desc}</p>
              <button 
                onClick={() => setActiveAdviceKey(null)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs transition cursor-pointer"
              >
                Dismiss Guidance
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Real-time intelligent feedback pop-up system */}
      <AnimatePresence>
        {isFeedbackOpen && (
          <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-colors duration-400 ${co2Stat.co2 > 8.00 ? "bg-slate-950/90" : "bg-emerald-950/40 backdrop-blur-sm"}`}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`bg-white rounded-[3rem] p-8 md:p-10 max-w-lg w-full shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] relative border-[12px] ${co2Stat.co2 <= 8.00 ? "border-emerald-500" : "border-rose-500"}`}
            >
              <button 
                onClick={() => setIsFeedbackOpen(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition p-1.5"
              >
                <X size={18} />
              </button>

              <div className="text-center space-y-4">
                <div className="text-5xl">
                  {co2Stat.co2 <= 8.00 ? "🎉" : "😢"}
                </div>

                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${co2Stat.co2 <= 8.00 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                  {co2Stat.co2 <= 8.00 ? "Limit Target Met!" : "Target Exceeded"}
                </span>

                <h3 className="text-slate-900 text-xl md:text-2xl font-black tracking-tight">
                  {co2Stat.co2 <= 8.00 ? "Celebrating Sustainability!" : "Hale Catastrophe"}
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed font-bold bg-emerald-50/50 border border-slate-100 rounded-2xl p-4 text-left shadow-inner">
                  {aiAdvice}
                </p>

                {aiAlternatives.length > 0 && (
                  <div className="text-left space-y-3 pt-2">
                    <span className="text-[11px] font-black text-emerald-850 uppercase tracking-wider block">Recommended Corrections:</span>
                    <div className="space-y-2">
                      {aiAlternatives.map((strat, i) => (
                        <div 
                          key={i}
                          className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex sm:flex-row items-start sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <span className="text-xs font-black text-slate-800 block">{strat.title}</span>
                            <span className="text-[11px] text-slate-400 block font-medium leading-normal">{strat.desc}</span>
                          </div>
                          <span className="shrink-0 text-[10px] items-center bg-emerald-100 text-emerald-850 font-black px-2.5 py-1 rounded-lg">
                            +{strat.pointsRecovery} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => setIsFeedbackOpen(false)}
                  className="w-full py-3.5 bg-[#2d6a4f] hover:bg-[#1b4332] text-white font-black rounded-2xl text-xs transition duration-200 mt-4 cursor-pointer"
                >
                  Continue strategizing
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
