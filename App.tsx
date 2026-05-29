import React, { useState, useEffect, useMemo } from "react";
import {
  Timer,
  ShieldAlert,
  UserCheck,
  Calendar,
  MapPin,
  Sparkles,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Trash2,
  Clock,
  Bus,
  Car,
  Footprints,
  Bike,
  HelpCircle,
  TrendingUp
} from "lucide-react";
import { DEFAULT_LANDMARKS, BUTLER_METADATA, INITIAL_TASKS } from "./data";
import { Landmark, ScheduledTask, ButlerConfig, ButlerTheme, ProcrastinationLevel, DiaryEntry } from "./types";
import LandmarkMap from "./components/LandmarkMap";
import HourlyCheckIn from "./components/HourlyCheckIn";

export default function App() {
  // State Storage
  const [tasks, setTasks] = useState<ScheduledTask[]>(() => {
    const saved = localStorage.getItem("tempus_tasks");
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });

  const [landmarks, setLandmarks] = useState<Landmark[]>(() => {
    const saved = localStorage.getItem("tempus_landmarks");
    return saved ? JSON.parse(saved) : DEFAULT_LANDMARKS;
  });

  const [selectedLandmarkId, setSelectedLandmarkId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const [butler, setButler] = useState<ButlerConfig>(() => {
    const saved = localStorage.getItem("tempus_butler");
    return saved
      ? JSON.parse(saved)
      : {
          theme: "classic" as ButlerTheme,
          customName: "魔鬼班長",
          customPersonality: "大吼大叫、滿嘴軍隊術語（注意、還在看、皮在癢）、極度嚴厲。",
          procrastinationLevel: "heavy" as ProcrastinationLevel,
        };
  });

  // UI States
  const [intakeText, setIntakeText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isCoaching, setIsCoaching] = useState(false);
  const [isCRAFTINGDiary, setIsCRAFTINGDiary] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [diaryError, setDiaryError] = useState<string | null>(null);

  // New Landmark input states
  const [newLandmarkName, setNewLandmarkName] = useState("");
  const [newLandmarkEmoji, setNewLandmarkEmoji] = useState("📍");
  const [newLandmarkDesc, setNewLandmarkDesc] = useState("");
  const [newLandmarkLat, setNewLandmarkLat] = useState<number>(24.1506);
  const [newLandmarkLng, setNewLandmarkLng] = useState<number>(120.6845);
  const [showAddLandmarkForm, setShowAddLandmarkForm] = useState(false);

  // Diary Entry Book state
  const [diaryEntry, setDiaryEntry] = useState<DiaryEntry | null>(() => {
    const saved = localStorage.getItem("tempus_diary");
    return saved ? JSON.parse(saved) : null;
  });

  // Current system local ticking time for real-time countdown line
  const [currentTimeStr, setCurrentTimeStr] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      setCurrentTimeStr(`${h}:${m}:${s}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem("tempus_tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("tempus_landmarks", JSON.stringify(landmarks));
  }, [landmarks]);

  useEffect(() => {
    localStorage.setItem("tempus_butler", JSON.stringify(butler));
  }, [butler]);

  useEffect(() => {
    if (diaryEntry) {
      localStorage.setItem("tempus_diary", JSON.stringify(diaryEntry));
    } else {
      localStorage.removeItem("tempus_diary");
    }
  }, [diaryEntry]);

  // CBT procrastination safety multipliers
  const LEVEL_MULTIPLIERS = {
    mild: 1.0,
    heavy: 1.3,
    master: 1.6,
  };

  const selectedMultiplier = LEVEL_MULTIPLIERS[butler.procrastinationLevel];

  // Helper conversions
  function parseTimeToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
    const parts = timeStr.split(":");
    if (parts.length < 2) return 0;
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  function formatMinutesToTime(totalMins: number): string {
    const h = Math.floor(totalMins / 60) % 24;
    const m = totalMins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  // Calculate dynamic departure schedules and defenses on the fly
  const tasksWithDefenses = useMemo(() => {
    return tasks.map((task) => {
      const startMins = parseTimeToMinutes(task.rawTime);
      const inflatedBuffer = Math.round(task.buffer * selectedMultiplier);
      const latestDepartureMins = startMins - (task.commuteTime + inflatedBuffer);
      const departureTimeStr = formatMinutesToTime(latestDepartureMins < 0 ? latestDepartureMins + 1440 : latestDepartureMins);

      return {
        ...task,
        inflatedBuffer,
        departureTimeStr,
        latestDepartureMins,
      };
    }).sort((a, b) => parseTimeToMinutes(a.rawTime) - parseTimeToMinutes(b.rawTime));
  }, [tasks, selectedMultiplier]);

  // Find nearest incoming warning defense deadline
  const nearestDefense = useMemo(() => {
    if (tasksWithDefenses.length === 0) return null;
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();

    // Find the next task where status is scheduled and departure is in the future today
    const incoming = tasksWithDefenses.filter(
      (t) => t.status === "scheduled" && t.latestDepartureMins > nowMins
    );

    if (incoming.length > 0) {
      const nextOne = incoming[0];
      const minsDiff = nextOne.latestDepartureMins - nowMins;
      return {
        taskName: nextOne.title,
        minsDiff,
        departureTime: nextOne.departureTimeStr,
      };
    }
    return null;
  }, [tasksWithDefenses, currentTimeStr]);

  // Completion stats
  const completionRate = useMemo(() => {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter((t) => t.status === "completed").length;
    return Math.round((completed / tasks.length) * 100);
  }, [tasks]);

  // Preset prompts templates
  const INTENSE_TEMPLATES = [
    {
      label: "攝影課 + 晚餐 📸",
      text: "我下午兩點半要到國立台中科技大學上攝影課，下午五點結束後要去一中街吃晚餐。"
    },
    {
      label: "早起晨會 + 健身房 💼",
      text: "早上十點要到辦公室開大晨會，下午兩點打算去路易莎咖啡廳寫報告，晚上七點再去巨石健身房練胸。"
    },
    {
      label: "休閒看展 + 悠閒午茶 🎨",
      text: "我上午十一點半想去台中科大參觀學生策展，結束後去微光文青咖啡廳吃個優雅下午茶。"
    }
  ];

  // AI API Handlers
  async function triggerAIParse() {
    if (!intakeText.trim()) return;
    setIsParsing(true);
    setParseError(null);

    try {
      const response = await fetch("/api/gemini/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputText: intakeText,
          landmarks: landmarks.map((l) => ({ id: l.id, name: l.name })),
        }),
      });

      if (!response.ok) {
        const errObj = await response.json();
        throw new Error(errObj.error || "Failed server API call.");
      }

      const parsedJSON = await response.json();
      if (Array.isArray(parsedJSON)) {
        // Build tasks list from parsed array
        const newTasks: ScheduledTask[] = parsedJSON.map((item, idx) => {
          // Assign dynamic default commute times based on travel modes
          let defaultCommute = 15;
          if (item.travelMode === "walk") defaultCommute = 20;
          if (item.travelMode === "transit") defaultCommute = 30;
          if (item.travelMode === "drive") defaultCommute = 12;
          if (item.travelMode === "bicycling") defaultCommute = 18;

          return {
            id: `parse-${Date.now()}-${idx}`,
            rawTime: item.rawTime || "12:00",
            title: item.title || "未知活動",
            buffer: item.buffer || 15,
            fromLoc: item.fromLoc || "loc-home",
            toLoc: item.toLoc || "loc-home",
            travelMode: (item.travelMode || "transit") as any,
            commuteTime: defaultCommute,
            status: "scheduled",
            comment: "",
          };
        });

        // Smart carryover check if parsed items missed starting position explicitly
        // If fromLoc equals toLoc or home, let's stitch endpoints sequentially
        for (let i = 0; i < newTasks.length; i++) {
          if (i > 0) {
            newTasks[i].fromLoc = newTasks[i - 1].toLoc;
          }
        }

        setTasks(newTasks);
        setIntakeText("");
        // Trigger smart coach suggestions for newly parsed activities immediately
        triggerSmartCoaching(newTasks);
      } else {
        throw new Error("Parsed response is not compatible.");
      }
    } catch (err: any) {
      setParseError(err.message || "時光防線大腦忙碌中，請重新嘗試。");
    } finally {
      setIsParsing(false);
    }
  }

  async function triggerSmartCoaching(currentTasks: ScheduledTask[] = tasks) {
    if (currentTasks.length === 0) return;
    setIsCoaching(true);
    setCoachError(null);

    try {
      const response = await fetch("/api/gemini/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: currentTasks.map((t) => ({ id: t.id, title: t.title, rawTime: t.rawTime })),
          procrastinationLevel: butler.procrastinationLevel,
          theme: butler.theme,
          customName: butler.customName,
          customPersonality: butler.customPersonality,
        }),
      });

      if (!response.ok) {
        const errObj = await response.json();
        throw new Error(errObj.error || "Coaching engine error.");
      }

      const coaches = await response.json();
      if (Array.isArray(coaches)) {
        setTasks((prev) =>
          prev.map((t) => {
            const fit = coaches.find((c) => c.id === t.id);
            if (fit) {
              return {
                ...t,
                coachAdvice: fit.coachAdvice,
                funnyFact: fit.funnyFact,
              };
            }
            return t;
          })
        );
      }
    } catch (err: any) {
      setCoachError(err.message || "管家防線調度出錯，請稍後重試。");
    } finally {
      setIsCoaching(false);
    }
  }

  async function generateTimeDiary() {
    setIsCRAFTINGDiary(true);
    setDiaryError(null);

    const cbtCombatLogs = tasks.map((t) => ({
      taskName: t.title,
      status: t.status,
      excuse: t.comment || "未記錄對抗回報(無拖延行動)",
    }));

    try {
      const response = await fetch("/api/gemini/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rate: completionRate,
          reports: cbtCombatLogs,
          theme: butler.theme,
          customName: butler.customName,
          customPersonality: butler.customPersonality,
        }),
      });

      if (!response.ok) {
        const errObj = await response.json();
        throw new Error(errObj.error || "Diary engine error.");
      }

      const resJSON = await response.json();
      setDiaryEntry({
        markdown: resJSON.markdown || "",
        date: new Date().toLocaleDateString("zh-TW", { month: "short", day: "numeric" }),
        rate: completionRate,
      });
    } catch (err: any) {
      setDiaryError(err.message || "深夜診斷手帳整理失敗。");
    } finally {
      setIsCRAFTINGDiary(false);
    }
  }

  // Interactive local updates
  const handleMapClickCoords = (lat: number, lng: number) => {
    setNewLandmarkEmoji("📍");
    setNewLandmarkName(`地標 (地圖定位點)`);
    setNewLandmarkDesc(`經緯座標: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    setNewLandmarkLat(lat);
    setNewLandmarkLng(lng);
    setShowAddLandmarkForm(true);
  };

  const handleAddLandmarkDirect = (name: string, emoji: string, desc: string, lat: number, lng: number) => {
    const newL: Landmark = {
      id: `loc-custom-${Date.now()}`,
      name: name.trim(),
      emoji: emoji || "📍",
      description: desc.trim() || "地圖直接新增地點",
      lat,
      lng,
    };
    setLandmarks((prev) => [...prev, newL]);
    setSelectedLandmarkId(newL.id);
  };

  const handleAddTask = () => {
    const newId = `task-custom-${Date.now()}`;
    const newTask: ScheduledTask = {
      id: newId,
      rawTime: "12:00",
      title: "📍 點擊編輯新抗拖項目",
      buffer: 15,
      fromLoc: landmarks[0]?.id || "loc-home",
      toLoc: landmarks[1]?.id || "loc-nutc",
      travelMode: "transit",
      commuteTime: 15,
      status: "scheduled",
      comment: "",
    };
    setTasks((prev) => [...prev, newTask]);
    setEditingTaskId(newId); // Focus editing mode right away
  };

  const handleUpdateTaskField = (id: string, field: keyof ScheduledTask, value: any) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated = { ...t, [field]: value };
          // If travelMode turns, assign typical baselines which can still be customized
          if (field === "travelMode") {
            let defaultCommute = 15;
            if (value === "walk") defaultCommute = 20;
            if (value === "transit") defaultCommute = 30;
            if (value === "drive") defaultCommute = 12;
            if (value === "bicycling") defaultCommute = 18;
            updated.commuteTime = defaultCommute;
          }
          return updated;
        }
        return t;
      })
    );
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (editingTaskId === id) {
      setEditingTaskId(null);
    }
  };

  const handleAddLandmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLandmarkName.trim()) return;

    const newL: Landmark = {
      id: `loc-custom-${Date.now()}`,
      name: newLandmarkName.trim(),
      emoji: newLandmarkEmoji,
      description: newLandmarkDesc.trim() || "自訂時間錨定地標項目",
      lat: newLandmarkLat,
      lng: newLandmarkLng,
    };

    setLandmarks((prev) => [...prev, newL]);
    setSelectedLandmarkId(newL.id); // Highlight on coordinates list and map
    setNewLandmarkName("");
    setNewLandmarkDesc("");
    setNewLandmarkLat(24.1506);
    setNewLandmarkLng(120.6845);
    setShowAddLandmarkForm(false);
  };

  const handleDeleteLandmark = (id: string) => {
    // Keep at least one
    if (landmarks.length <= 1) return;
    setLandmarks((prev) => prev.filter((l) => l.id !== id));
    if (selectedLandmarkId === id) {
      setSelectedLandmarkId(null);
    }
  };

  const triggerResetDemo = () => {
    setTasks(INITIAL_TASKS);
    setLandmarks(DEFAULT_LANDMARKS);
    setDiaryEntry(null);
  };

  // Safe manual Markdown parsed blocks render
  const ParagraphRenderer = ({ text }: { text: string }) => {
    if (!text) return null;
    const blocks = text.split("\n");
    return (
      <div className="space-y-4">
        {blocks.map((block, i) => {
          const trimmed = block.trim();
          if (!trimmed) return null;

          // Headers / Sections Matcher
          if (
            trimmed.startsWith("🌟") ||
            trimmed.startsWith("⏱️") ||
            trimmed.startsWith("💌") ||
            trimmed.startsWith("【微光") ||
            trimmed.startsWith("【抗拖") ||
            trimmed.startsWith("【逆時")
          ) {
            return (
              <h3
                key={i}
                className="text-base font-bold text-teal-400 mt-6 mb-2 border-b border-gray-800 pb-2 flex items-center gap-2"
                id={`hd-${i}`}
              >
                {trimmed}
              </h3>
            );
          }

          if (trimmed.startsWith("#")) {
            return (
              <h2
                key={i}
                className="text-lg font-bold text-emerald-400 mt-6 mb-3"
                id={`sh-${i}`}
              >
                {trimmed.replace(/^#+\s*/, "")}
              </h2>
            );
          }

          if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
            return (
              <li
                key={i}
                className="ml-4 list-disc text-gray-300 text-sm leading-relaxed"
                id={`li-${i}`}
              >
                {trimmed.replace(/^[-*]\s*/, "")}
              </li>
            );
          }

          // Clean inline strong formatting replacement
          const cleanHTML = trimmed.replace(/\*\*(.*?)\*\*/g, "<strong class='text-teal-300 font-semibold'>$1</strong>");

          return (
            <p
              key={i}
              className="text-sm text-gray-300 leading-relaxed font-sans"
              dangerouslySetInnerHTML={{ __html: cleanHTML }}
              id={`p-${i}`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans antialiased">
      {/* Visual Workspace Banner Container */}
      <header className="border-b border-zinc-900 bg-zinc-900/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-black text-xl select-none">T</div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tighter text-white">TEMPUS <span className="text-zinc-500 font-medium ml-1.5 text-base">逆時防線</span></h1>
              </div>
              <p className="text-xs text-zinc-500 font-mono">SYS_STATUS: ACTIVE // COGNITIVE_STATE: DEFENSIVE</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* NLP Status Indicator */}
            <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full text-[10px] font-mono flex items-center gap-2 text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> LIFE_DEFENSE MODE
            </div>

            {/* System Clock */}
            <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full text-xs font-mono text-emerald-400 font-bold">
              {currentTimeStr || "14:12:45"}
            </div>

            {/* Quick Demo Re-loader */}
            <button
              id="reset-demo-btn"
              onClick={triggerResetDemo}
              className="text-xs bg-zinc-800 border border-zinc-750 hover:bg-zinc-700 hover:text-white px-3.5 py-1.5 rounded-full font-mono transition text-zinc-300 ml-1 cursor-pointer"
              title="重設回初始展示日程"
            >
              RESET
            </button>
          </div>
        </div>
      </header>

      {/* Main Core Layout */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Hand Sidebar Column - Configurations & Landmarks */}
        <section className="lg:col-span-4 space-y-6">
          
          {/* Active Butler Character Speech Area / Configuration */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 md:p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2 font-mono">
                <UserCheck className="h-4 w-4 text-orange-500" />
                時光百變管家風格 STYLE
              </h2>
              <span className="text-[10px] text-zinc-500 font-mono tracking-tighter uppercase">// Butler Theme</span>
            </div>

            {/* Persona Selector Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-950 rounded-2xl mb-4 border border-zinc-850/60">
              {(Object.keys(BUTLER_METADATA) as ButlerTheme[]).map((key) => (
                <button
                  id={`theme-tab-${key}`}
                  key={key}
                  type="button"
                  onClick={() => setButler((prev) => ({ ...prev, theme: key }))}
                  className={`py-2 rounded-xl text-center transition flex flex-col items-center justify-center ${
                    butler.theme === key
                      ? "bg-orange-600 text-white font-bold shadow-lg"
                      : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
                  }`}
                  title={BUTLER_METADATA[key].name}
                >
                  <span className="text-lg select-none">{BUTLER_METADATA[key].avatar}</span>
                  <span className="text-[9px] mt-0.5 scale-90 truncate max-w-full font-mono font-medium">
                    {key === "star_idol" 
                      ? "偶像" 
                      : key === "racing" 
                      ? "賽車" 
                      : key === "anime" 
                      ? "動漫" 
                      : key === "classic" 
                      ? "管家" 
                      : key === "fitness"
                      ? "教練"
                      : key === "cats_master"
                      ? "貓主"
                      : key === "workplace"
                      ? "高管"
                      : "自訂"}
                  </span>
                </button>
              ))}
            </div>

            {/* Selected Butler Dynamic Character Panel */}
            <div className="bg-orange-600/10 border border-orange-500/20 rounded-2xl p-4 mb-4 flex gap-3.5 items-start">
              <div className="text-3xl p-2 bg-orange-600 rounded-xl border border-orange-400 shrink-0 select-none">
                {BUTLER_METADATA[butler.theme === "custom" ? "custom" : butler.theme].avatar}
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-black text-orange-400 uppercase tracking-widest font-mono">
                  {butler.theme === "custom"
                    ? butler.customName || "自訂管家"
                    : BUTLER_METADATA[butler.theme].name}
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans font-medium">
                  {butler.theme === "custom"
                    ? butler.customPersonality
                    : BUTLER_METADATA[butler.theme].desc}
                </p>
              </div>
            </div>

            {/* Dynamic Real-time speech bubble */}
            <div className="relative bg-zinc-950 border border-zinc-850/80 rounded-2xl p-3.5 text-xs italic text-zinc-200 leading-relaxed mt-2 font-serif">
              <div className="absolute top-2 -left-1.5 w-3 h-3 bg-zinc-950 border-l border-b border-zinc-850 rotate-45" />
              「{butler.theme === "custom" ? "防線已建立！" : BUTLER_METADATA[butler.theme].quote}」
            </div>

            {/* Custom Butler Form parameters */}
            {butler.theme === "custom" && (
               <div className="mt-4 p-3.5 bg-zinc-950 rounded-2xl border border-zinc-855 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                  <Sparkles className="h-3 w-3 text-orange-400" />
                  自訂人設特徵組裝
                </h4>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1 font-mono uppercase tracking-wider">管家大腦姓名</label>
                    <input
                      id="custom-butler-name"
                      type="text"
                      className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-orange-500 font-sans"
                      value={butler.customName}
                      onChange={(e) => setButler((prev) => ({ ...prev, customName: e.target.value }))}
                      placeholder="例如：熱血體育老師、瘋狂媽媽..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1 font-mono uppercase tracking-wider">個性與特有語言黑話</label>
                    <textarea
                      id="custom-butler-personality"
                      rows={2}
                      className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-orange-500 resize-none font-sans"
                      value={butler.customPersonality}
                      onChange={(e) => setButler((prev) => ({ ...prev, customPersonality: e.target.value }))}
                      placeholder="大聲叫喊、使用軍事術語、口頭禪..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Structured Procrastination level setting */}
            <div className="mt-5 border-t border-zinc-805/60 pt-4">
              <label className="block text-xs font-semibold text-zinc-300 mb-2 flex items-center justify-between font-mono uppercase tracking-wider">
                <span>🎯 緩衝倒提層級 (CBT 等級)</span>
                <span className="text-xs text-orange-400 font-black">
                  {butler.procrastinationLevel === "mild" ? "日常防護" : butler.procrastinationLevel === "heavy" ? "雙倍戒備" : "終極防護"} ({selectedMultiplier}x)
                </span>
              </label>
              
              <div className="grid grid-cols-3 gap-2">
                {(["mild", "heavy", "master"] as ProcrastinationLevel[]).map((lvl) => (
                  <button
                    id={`procrast-level-${lvl}`}
                    key={lvl}
                    type="button"
                    onClick={() => setButler((prev) => ({ ...prev, procrastinationLevel: lvl }))}
                    className={`py-2 rounded-xl text-xs transition border font-mono cursor-pointer ${
                      butler.procrastinationLevel === lvl
                        ? "bg-orange-500/10 text-orange-400 border-orange-500 font-bold"
                        : "bg-zinc-950 text-zinc-400 border-transparent hover:bg-zinc-800"
                    }`}
                  >
                    {lvl === "mild" ? "輕量防護" : lvl === "heavy" ? "防線升級" : "終極提防"}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-zinc-500 mt-2 font-sans italic leading-relaxed">
                *根據行為治療邏輯，設定層級越高會自動將安全緩衝 padding 時間放大，將動身期限提早！
              </p>
            </div>
          </div>

          {/* Spoken Intake Dialog Parse Segment (Relocated here successfully under Theme selection) */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 md:p-8 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2 font-mono">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                【TASK_PARSE】口語智慧解析狀態機
              </h2>
              <span className="text-[9px] text-zinc-550 font-mono uppercase tracking-widest">// NLP ENGINE</span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed font-sans font-medium">
              隨意輸入您一整天鬆散、口語的行程描述（例如去哪上課、去哪吃飯等），大腦會利用地標庫智慧逆推，替您重組出無縫拼接、極致物理逆推的精準日程！
            </p>

            {/* Quick Templates tag buttons wrapper */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {INTENSE_TEMPLATES.map((tmpl, tIdx) => (
                <button
                  id={`preset-prompt-${tIdx}`}
                  key={tIdx}
                  type="button"
                  onClick={() => setIntakeText(tmpl.text)}
                  className="text-[10px] bg-zinc-950 hover:bg-zinc-800 text-emerald-400 hover:text-emerald-300 border border-zinc-850 rounded-full px-2.5 py-1 transition cursor-pointer font-mono"
                >
                  {tmpl.label}
                </button>
              ))}
            </div>

            {/* Large text input */}
            <div className="relative">
              <textarea
                id="spoken-intake-textarea"
                rows={3}
                className="w-full text-xs bg-zinc-955 border border-zinc-805 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 placeholder-zinc-700 font-sans leading-relaxed transition"
                value={intakeText}
                onChange={(e) => setIntakeText(e.target.value)}
                placeholder="例：我下午兩點半要到國立台中科技大學上攝影課，下午五點結束後要去一中街吃晚餐..."
              />
              <div className="pt-2 flex justify-end">
                <button
                  id="trigger-parse-btn"
                  onClick={triggerAIParse}
                  disabled={isParsing || !intakeText.trim()}
                  className={`text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    isParsing || !intakeText.trim()
                      ? "bg-zinc-800 text-zinc-650 cursor-not-allowed"
                      : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-sm shadow-emerald-500/10 active:scale-95"
                  }`}
                >
                  {isParsing ? (
                    <>
                      <span className="animate-spin text-xs">🌀</span> 智慧解析中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" /> 建立逆向時間防護
                    </>
                  )}
                </button>
              </div>
            </div>

            {parseError && (
              <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/20 text-xs text-rose-450 flex items-center gap-2 font-sans font-medium animate-pulse">
                <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}
          </div>

          {/* Landmark Reference Database */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 md:p-8 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2 font-mono">
                <MapPin className="h-4 w-4 text-emerald-400" />
                生活常用地標資料庫
              </h2>
              <button
                id="toggle-add-landmark-btn"
                type="button"
                onClick={() => setShowAddLandmarkForm(!showAddLandmarkForm)}
                className="text-xs px-2.5 py-1 rounded-full bg-zinc-950 border border-zinc-800 text-emerald-400 hover:bg-zinc-800 flex items-center gap-1 transition font-mono cursor-pointer"
              >
                <Plus className="h-3 w-3" /> 新增
              </button>
            </div>

            {/* Add Landmark inline form */}
            {showAddLandmarkForm && (
              <form onSubmit={handleAddLandmark} className="mb-4 p-4 bg-zinc-950 rounded-2xl border border-zinc-850 space-y-3">
                <h3 className="text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider">登錄新常用地標</h3>
                <div className="grid grid-cols-5 gap-2">
                  <input
                    id="new-landmark-emoji"
                    type="text"
                    placeholder="圖示"
                    className="col-span-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1.5 text-center text-xs text-white"
                    value={newLandmarkEmoji}
                    onChange={(e) => setNewLandmarkEmoji(e.target.value)}
                  />
                  <input
                    id="new-landmark-name"
                    type="text"
                    placeholder="地標名稱 (例: 一中街)"
                    className="col-span-4 bg-zinc-900 border border-zinc-800 rounded-xl p-1.5 px-3 text-xs text-white"
                    value={newLandmarkName}
                    onChange={(e) => setNewLandmarkName(e.target.value)}
                    required
                  />
                </div>
                <input
                  id="new-landmark-desc"
                  type="text"
                  placeholder="簡要描述地標用途或位置"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-1.5 px-3 text-xs text-white"
                  value={newLandmarkDesc}
                  onChange={(e) => setNewLandmarkDesc(e.target.value)}
                />
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[8px] text-zinc-500 font-mono">LAT_緯度座標</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-1.5 px-3 text-[10px] text-zinc-300 font-mono"
                      value={newLandmarkLat}
                      onChange={(e) => setNewLandmarkLat(parseFloat(e.target.value) || 24.1506)}
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] text-zinc-500 font-mono">LNG_經度座標</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-1.5 px-3 text-[10px] text-zinc-300 font-mono"
                      value={newLandmarkLng}
                      onChange={(e) => setNewLandmarkLng(parseFloat(e.target.value) || 120.6845)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setShowAddLandmarkForm(false)}
                    className="px-2 py-1 text-zinc-500 hover:text-white"
                  >
                    取消
                  </button>
                  <button
                    id="submit-landmark-btn"
                    type="submit"
                    className="px-3 py-1.5 bg-emerald-500 text-zinc-950 rounded-xl font-bold transition hover:bg-emerald-400 cursor-pointer"
                  >
                    確認登錄
                  </button>
                </div>
              </form>
            )}

            {/* Landmarks List scrollbox */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {landmarks.map((l) => (
                <div
                  key={l.id}
                  onClick={() => setSelectedLandmarkId(l.id)}
                  className={`p-3 rounded-2xl border text-xs flex justify-between items-center group transition cursor-pointer ${
                    selectedLandmarkId === l.id
                      ? "bg-emerald-500/10 border-emerald-500/40"
                      : "bg-zinc-950 hover:bg-zinc-900/40 border-zinc-850/60"
                  }`}
                >
                  <div className="flex gap-2.5 items-center">
                    <span className="text-lg bg-zinc-900 p-2 rounded-xl border border-zinc-850">{l.emoji}</span>
                    <div>
                      <h4 className="font-bold text-zinc-100">{l.name}</h4>
                      <p className="text-[10px] text-zinc-505 font-sans truncate max-w-[160px]">{l.description}</p>
                    </div>
                  </div>
                  <button
                    id={`delete-landmark-${l.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation(); // Avoid triggering details selection
                      handleDeleteLandmark(l.id);
                    }}
                    className="p-1 px-1.5 text-zinc-500 hover:text-rose-450 rounded hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    title="刪除地標"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Interactive Embedded Google Maps locator assist panel */}
            <div className="mt-4 pt-4 border-t border-zinc-805/40">
              <LandmarkMap
                landmarks={landmarks}
                selectedLandmarkId={selectedLandmarkId}
                onSelectLandmark={setSelectedLandmarkId}
                onMapClickCoords={handleMapClickCoords}
                onAddLandmarkDirect={handleAddLandmarkDirect}
              />
            </div>
          </div>

          {/* Today's Defense Performance Badge Card */}
          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 md:p-8 shadow-xl relative overflow-hidden flex items-center gap-6">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="relative h-20 w-20 flex items-center justify-center shrink-0">
              {/* SVG Concentric progress ring */}
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="40" cy="40" r="34" fill="transparent" stroke="#1c1d24" strokeWidth="6" />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="transparent"
                  stroke={completionRate >= 80 ? "#10b981" : completionRate >= 50 ? "#f59e0b" : "#f43f5e"}
                  strokeWidth="6"
                  strokeDasharray={213}
                  strokeDashoffset={213 - (213 * completionRate) / 100}
                  className="transition-all duration-500"
                />
              </svg>
              <span className="absolute text-sm font-black text-white font-mono">{completionRate}%</span>
            </div>
            
            <div className="space-y-1">
              <h4 className="text-emerald-400 font-bold text-sm uppercase tracking-wider flex items-center gap-1.5 font-mono">
                🛡️ 今日時光抵禦成效
              </h4>
              <p className="text-zinc-400 text-xs leading-relaxed font-sans font-medium">
                {completionRate >= 80 
                  ? "系統診斷：防線堅守，完美掌控！您今天成功抵消了時間盲感。請繼續保持現有的緩衝排程習慣。" 
                  : completionRate >= 50 
                  ? "系統診斷：部分時段稍微被慵懶黑洞吞噬，發生輕微耽誤。建議下個時段提早 5 秒物理動身！" 
                  : "警報！慵懶狀態正在嚴重威脅您的今日防衛計劃，別氣餒，快讓教練/管家拉你一把，立即重整動身！"}
              </p>
              <p className="text-[10px] text-zinc-505 font-mono mt-2">
                已準時抵達 {tasks.filter(t => t.status === "completed").length} 關卡 // 經歷 {tasks.filter(t => t.status === "delayed").length} 次時間拉鋸 // 有 {tasks.filter(t => t.status === "missed").length} 次不幸遲到。
              </p>
            </div>
          </div>

        </section>

        {/* Right Hand Center & Bottom Panel - Operational Timelines & handcraft notebooks */}
        <section className="lg:col-span-8 space-y-6">
          
          {/* Real-time Defense Clock alert header banner */}
          <div className="rounded-3xl border border-rose-500/15 bg-rose-950/10 p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-16 h-full bg-rose-505/5 blur-xl pointer-events-none" />
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <ShieldAlert className="h-6 w-6 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-black text-white hover:text-rose-450 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                  時光防衛倒數提醒
                </h3>
                <p className="text-xs text-zinc-400 font-sans font-medium">
                  {nearestDefense
                    ? `下一個最遲出發行動：「${nearestDefense.taskName}」，警報防守動身期限：${nearestDefense.departureTime}`
                    : "目前日程暫無緊迫動身截止警報，時光防禦安全運作中。"}
                </p>
              </div>
            </div>

            {nearestDefense && (
              <div className="px-5 py-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-center shrink-0 min-w-[140px]">
                <div className="text-[9px] text-zinc-550 uppercase font-mono tracking-widest font-black">
                  預備出發倒數
                </div>
                <div className="text-xl font-bold font-mono text-rose-450 animate-pulse mt-0.5">
                  {nearestDefense.minsDiff <= 0 ? "🚨 立即動身！" : `${nearestDefense.minsDiff} 分鐘`}
                </div>
              </div>
            )}
          </div>

          {/* Defensive Timelines list */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2 font-mono">
                <Calendar className="h-4 w-4 text-amber-500" />
                【逆向防禦線】每日防禦日程表
              </h2>
              
              <div className="flex items-center gap-2">
                <button
                  id="trigger-recoach-btn"
                  onClick={() => triggerSmartCoaching()}
                  disabled={isCoaching || tasks.length === 0}
                  className="text-xs px-3.5 py-1.5 rounded-full bg-zinc-950 hover:bg-zinc-800 border border-zinc-805 text-amber-400 disabled:text-zinc-650 disabled:bg-zinc-900 font-mono transition flex items-center gap-1.5 cursor-pointer"
                  title="要求管家重新提供心理防守應對文案"
                >
                  {isCoaching ? "管家批改中..." : "🔄 重新計算抗拖語調"}
                </button>
                
                <button
                  id="add-task-btn"
                  onClick={handleAddTask}
                  className="text-xs px-4 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black font-mono transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" /> 新增活動
                </button>
              </div>
            </div>

            {/* Timeline Task items container */}
            <div className="space-y-4">
              {tasksWithDefenses.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/40 p-12 text-center text-zinc-500 space-y-3 font-mono">
                  <Clock className="h-8 w-8 text-zinc-700 mx-auto animate-pulse" />
                  <div>
                    <h3 className="font-bold text-zinc-400">目前防禦日程是一片白紙</h3>
                    <p className="text-xs text-zinc-600 mt-1 font-sans">
                      精準點擊左上方的「口語智慧解析狀態機」或右上角「新增活動」，讓最百變貼心的管家幫您排憂解難、逆推盲感！
                    </p>
                  </div>
                </div>
              ) : (
                tasksWithDefenses.map((task, index) => {
                  // Find landmarks
                  const currentOrigin = landmarks.find((l) => l.id === task.fromLoc);
                  const currentDest = landmarks.find((l) => l.id === task.toLoc);
                  const isEditing = editingTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      className={`rounded-3xl border p-6 md:p-8 transition-all hover:border-zinc-700 relative overflow-hidden ${
                        isEditing
                          ? "bg-zinc-900/90 border-amber-500/40 shadow-xl"
                          : task.status === "completed"
                          ? "bg-zinc-900 border-zinc-800/80 shadow-md opacity-80"
                          : task.status === "delayed"
                          ? "bg-zinc-900 border-amber-500/25 shadow-md"
                          : task.status === "missed"
                          ? "bg-zinc-900 border-rose-500/25 shadow-md"
                          : "bg-zinc-900 border-zinc-800 shadow-sm"
                      }`}
                    >
                      {/* Left vertical timeline line connector */}
                      <div className="absolute top-0 left-8 w-[1.5px] h-full bg-zinc-800/80 pointer-events-none -z-10" />

                      {/* Header Row: time tag and title input */}
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex items-center gap-3 w-full">
                          {/* Chrono Node bullet */}
                          <div
                            className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 border font-mono text-[9px] font-bold ${
                              task.status === "completed"
                                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                : task.status === "delayed"
                                ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                                : task.status === "missed"
                                ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                                : "bg-zinc-950 border-zinc-750 text-zinc-500"
                            }`}
                          >
                            {index + 1}
                          </div>
                          
                          {/* Title & Start Time render by state */}
                          {isEditing ? (
                            <div className="flex-1 flex flex-col sm:flex-row gap-2 w-full">
                              <input
                                id={`task-time-${task.id}`}
                                type="time"
                                className="bg-zinc-955 px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold text-emerald-400 border border-zinc-800 max-w-[100px] focus:outline-none focus:border-emerald-500 transition"
                                value={task.rawTime}
                                onChange={(e) => handleUpdateTaskField(task.id, "rawTime", e.target.value)}
                              />
                              <input
                                id={`task-title-${task.id}`}
                                type="text"
                                className="bg-zinc-955 px-3 py-1.5 text-sm font-bold text-white border border-zinc-800 rounded-xl focus:border-emerald-500 focus:outline-none flex-1 font-sans"
                                value={task.title}
                                onChange={(e) => handleUpdateTaskField(task.id, "title", e.target.value)}
                                placeholder="地標名稱或活動內容"
                              />
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2 flex-1">
                              <span className="text-xs px-2.5 py-1 bg-zinc-950 font-mono font-bold text-emerald-400 border border-zinc-800 rounded-xl">
                                🔔 預定抵達：{task.rawTime}
                              </span>
                              <span className="text-sm font-bold text-white font-sans ml-1">
                                {task.title}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Top Right Actions by State */}
                        <div className="flex items-center gap-1.5 sm:self-center shrink-0 ml-8 sm:ml-0">
                          {isEditing ? (
                            <button
                              id={`task-save-btn-${task.id}`}
                              onClick={() => setEditingTaskId(null)}
                              className="px-3 py-1.5 text-xs rounded-xl bg-emerald-500 text-zinc-950 hover:bg-emerald-400 font-bold font-mono transition flex items-center gap-1 cursor-pointer"
                              title="完成防守線編輯並鎖定"
                            >
                              ✓ 儲存排程
                            </button>
                          ) : (
                            <button
                              id={`task-edit-btn-${task.id}`}
                              onClick={() => setEditingTaskId(task.id)}
                              className="px-3 py-1.5 text-xs rounded-xl bg-zinc-950 border border-zinc-800/80 hover:bg-zinc-800 hover:border-zinc-700 text-amber-400 font-semibold font-sans transition flex items-center gap-1 cursor-pointer"
                              title="調整排程地標或安全緩衝"
                            >
                              ✏️ 調整設定
                            </button>
                          )}

                          {/* Delete Item */}
                          <button
                            id={`task-delete-btn-${task.id}`}
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1.5 px-2 rounded-xl bg-zinc-950 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-450 transition border border-zinc-850/60 cursor-pointer"
                            title="刪除此行程"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Travel and Location Segment Grid: Editable in editing mode, summary capsule in normal mode */}
                      {isEditing ? (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-4 ml-8 bg-zinc-955 p-4 rounded-2xl border border-zinc-850">
                          {/* Location Selectors */}
                          <div className="md:col-span-5 grid grid-cols-1 gap-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-zinc-500 font-bold uppercase font-mono tracking-wider w-10 shrink-0">起點：</span>
                              <select
                                id={`task-from-${task.id}`}
                                className="w-full bg-zinc-900 text-xs text-zinc-100 rounded-xl border border-zinc-800 p-1.5 px-2 focus:outline-none focus:border-emerald-500 font-medium font-sans"
                                value={task.fromLoc}
                                onChange={(e) => handleUpdateTaskField(task.id, "fromLoc", e.target.value)}
                              >
                                {landmarks.map((l) => (
                                  <option key={l.id} value={l.id}>
                                    {l.emoji} {l.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-zinc-500 font-bold uppercase font-mono tracking-wider w-10 shrink-0">終點：</span>
                              <select
                                id={`task-to-${task.id}`}
                                className="w-full bg-zinc-900 text-xs text-zinc-100 rounded-xl border border-zinc-800 p-1.5 px-2 focus:outline-none focus:border-emerald-500 font-medium font-sans"
                                value={task.toLoc}
                                onChange={(e) => handleUpdateTaskField(task.id, "toLoc", e.target.value)}
                              >
                                {landmarks.map((l) => (
                                  <option key={l.id} value={l.id}>
                                    {l.emoji} {l.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Travel Mode Selectors */}
                          <div className="md:col-span-4 flex flex-col justify-center space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-zinc-500 font-bold uppercase font-mono tracking-wide w-10 shrink-0">交通：</span>
                              <div className="flex bg-zinc-900 rounded-xl p-1 border border-zinc-800 w-full justify-between gap-1">
                                {(["transit", "walk", "drive", "bicycling"] as const).map((mode) => (
                                  <button
                                    id={`travel-${task.id}-${mode}`}
                                    key={mode}
                                    type="button"
                                    onClick={() => handleUpdateTaskField(task.id, "travelMode", mode)}
                                    className={`p-1.5 rounded-lg transition shrink-0 cursor-pointer ${
                                      task.travelMode === mode ? "bg-emerald-500 text-zinc-950 font-bold" : "text-zinc-500 hover:text-white"
                                    }`}
                                    title={mode === "transit" ? "大眾運輸" : mode === "walk" ? "步行" : mode === "drive" ? "開車" : "自行車"}
                                  >
                                    {mode === "transit" && <Bus className="h-3.5 w-3.5" />}
                                    {mode === "walk" && <Footprints className="h-3.5 w-3.5" />}
                                    {mode === "drive" && <Car className="h-3.5 w-3.5" />}
                                    {mode === "bicycling" && <Bike className="h-3.5 w-3.5" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                            
                            {/* Commute Duration slider editing */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-mono leading-none">
                                <span className="text-zinc-500">通勤耗時:</span>
                                <span className="text-emerald-400 font-bold">{task.commuteTime} 分鐘</span>
                              </div>
                              <input
                                id={`commute-slider-${task.id}`}
                                type="range"
                                min={1}
                                max={120}
                                value={task.commuteTime}
                                onChange={(e) => handleUpdateTaskField(task.id, "commuteTime", parseInt(e.target.value, 10))}
                                className="w-full accent-emerald-500 bg-zinc-800 h-1 rounded-lg cursor-pointer animate-none"
                              />
                            </div>
                          </div>

                          {/* CBT Buffer slider modifier */}
                          <div className="md:col-span-3 flex flex-col justify-center space-y-1">
                            <div className="flex justify-between text-[10px] font-mono leading-none">
                              <span className="text-zinc-500">基本緩衝:</span>
                              <span className="text-amber-400 font-bold">
                                {task.buffer}分 + 額外{task.inflatedBuffer - task.buffer}m
                              </span>
                            </div>
                            <input
                              id={`buffer-slider-${task.id}`}
                              type="range"
                              min={0}
                              max={60}
                              value={task.buffer}
                              onChange={(e) => handleUpdateTaskField(task.id, "buffer", parseInt(e.target.value, 10))}
                              className="w-full accent-amber-500 bg-zinc-800 h-1 rounded-lg cursor-pointer"
                            />
                            <p className="text-[9px] text-zinc-500 leading-tight block pt-0.5 font-mono">
                              *加權後實際緩衝: <strong className="text-amber-550 font-black">{task.inflatedBuffer} 分鐘</strong>
                            </p>
                          </div>
                        </div>
                      ) : (
                        /* Normal Presentation Mode Summary Capsule Row */
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-zinc-300 ml-8 mt-3 font-medium">
                          <span className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-xl border border-zinc-850/60 shadow-inner">
                            <span className="text-sm select-none">{currentOrigin?.emoji || "🏠"}</span>
                            <span className="text-zinc-300 font-bold">{currentOrigin?.name || "起點地標"}</span>
                          </span>
                          <span className="text-zinc-600 font-mono">➜</span>
                          <span className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-xl border border-zinc-850/60 shadow-inner">
                            <span className="text-sm select-none">{currentDest?.emoji || "🏢"}</span>
                            <span className="text-zinc-300 font-bold">{currentDest?.name || "目的地方"}</span>
                          </span>
                          
                          <span className="flex items-center gap-1 bg-zinc-950/40 px-2.5 py-1 rounded-xl text-zinc-400 border border-zinc-850">
                            {task.travelMode === "transit" && <Bus className="h-3 w-3 text-emerald-400" />}
                            {task.travelMode === "walk" && <Footprints className="h-3 w-3 text-emerald-400" />}
                            {task.travelMode === "drive" && <Car className="h-3 w-3 text-emerald-400" />}
                            {task.travelMode === "bicycling" && <Bike className="h-3 w-3 text-emerald-400" />}
                            {task.travelMode === "transit" ? "大眾運輸" : task.travelMode === "walk" ? "步行" : task.travelMode === "drive" ? "開車" : "自行車"}
                            ({task.commuteTime} 分)
                          </span>

                          <span className="flex items-center gap-1 bg-zinc-950/40 px-2.5 py-1 rounded-xl text-zinc-400 border border-zinc-855">
                            🛡️ 緩衝: {task.inflatedBuffer} 分
                          </span>
                        </div>
                      )}

                      {/* CALCULATED PHYSICAL DEFENSE OUTCOME LINE */}
                      <div className="ml-8 mt-3 p-3.5 rounded-2xl bg-zinc-950 border border-zinc-850/85 flex flex-col md:flex-row justify-between items-center gap-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                          <span className="text-xs font-bold text-zinc-400 font-mono uppercase tracking-wider">絕對動身期限</span>
                          <span className="text-xs font-black text-rose-450 font-mono bg-rose-550/15 border border-rose-550/25 px-2.5 py-1 rounded-xl tracking-wider">
                            {task.departureTimeStr} 以前
                          </span>
                        </div>
                        <span className="text-[9px] text-zinc-550 font-mono">
                          計算公式: {task.rawTime} - 通勤 {task.commuteTime}m - 緩衝 {task.inflatedBuffer}m
                        </span>
                      </div>

                      {/* Active Persona Advice box */}
                      {task.coachAdvice && (
                        <div className="ml-8 mt-3 p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl relative overflow-hidden">
                          <div className="absolute top-2 right-2 text-2xl opacity-15 select-none animate-pulse">
                            {BUTLER_METADATA[butler.theme].avatar}
                          </div>
                          <div className="text-xs leading-relaxed text-orange-400 font-sans font-medium">
                            <strong className="text-orange-500 font-black uppercase tracking-wider">
                              {butler.theme === "custom" ? butler.customName : BUTLER_METADATA[butler.theme].name}
                            </strong>：{task.coachAdvice}
                          </div>
                          {task.funnyFact && (
                            <div className="text-[10px] text-zinc-500 mt-1.5 pl-2.5 border-l border-zinc-800 font-mono italic">
                              💡 吐槽調侃：{task.funnyFact}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions Footer / CBT Battleground responses */}
                      <div className="ml-8 mt-4 pt-4 border-t border-zinc-805/40 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
                        {/* Combat Status Selectors */}
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">時光抵禦結果:</span>
                          {(["scheduled", "completed", "delayed", "missed"] as const).map((st) => (
                            <button
                              id={`status-task-${task.id}-${st}`}
                              key={st}
                              onClick={() => handleUpdateTaskField(task.id, "status", st)}
                              className={`px-3 py-1 rounded-full text-xs transition border flex items-center gap-1 font-mono cursor-pointer ${
                                task.status === st
                                  ? st === "completed"
                                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-bold"
                                    : st === "delayed"
                                    ? "bg-amber-500/15 border-amber-500/30 text-amber-400 font-bold"
                                    : st === "missed"
                                    ? "bg-rose-500/15 border-rose-500/30 text-rose-450 font-bold"
                                    : "bg-zinc-950 border-zinc-700 text-zinc-305 font-bold"
                                  : "bg-transparent border-transparent text-zinc-500 hover:bg-zinc-800"
                              }`}
                            >
                              {st === "scheduled" ? "⏳ 待出發" : st === "completed" ? "✅ 堅守功成" : st === "delayed" ? "⚠️ 輕微延誤" : "❌ 完全失守"}
                            </button>
                          ))}
                        </div>

                        {/* Anti-procrastination Combat excuse logger */}
                        <div className="flex-1 max-w-sm">
                          <input
                            id={`excuse-task-${task.id}`}
                            type="text"
                            placeholder="心理自省: 剛才逃避了什麼？(寫下藉口進行認知重建)"
                            className="w-full text-xs bg-zinc-955 hover:bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-emerald-550 placeholder-zinc-700 transition font-sans"
                            value={task.comment || ""}
                            onChange={(e) => handleUpdateTaskField(task.id, "comment", e.target.value)}
                          />
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Hourly time logging snapshots & text reminders (Goal 7) */}
          <HourlyCheckIn
            butlerName={butler.theme === "custom" ? (butler.customName || "自訂管家") : BUTLER_METADATA[butler.theme].name}
            butlerAvatar={BUTLER_METADATA[butler.theme === "custom" ? "custom" : butler.theme].avatar}
          />

          {/* Time Diary Handcraft Segment [TASK_DIARY] */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 md:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2 font-mono">
                <BookOpen className="h-4 w-4 text-emerald-400" />
                【TASK_DIARY】時光逆向防線手帳
              </h2>
              <span className="text-[9px] text-zinc-550 font-mono uppercase tracking-widest">// COGNITIVE DIARY</span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed font-sans font-medium">
              結束充實而對抗拖延的一天了嗎？點擊並透過 CBT 心理學大腦與您選定的管家口吻，自動生成一章充滿生活品味與溫柔理解的精緻時光分析！
            </p>

            <div className="flex items-center gap-4">
              <button
                id="generate-diary-btn"
                onClick={generateTimeDiary}
                disabled={isCRAFTINGDiary || tasks.length === 0}
                className={`text-xs px-5 py-2.5 rounded-xl font-bold transition flex items-center gap-2 font-mono ${
                  isCRAFTINGDiary || tasks.length === 0
                    ? "bg-zinc-805 text-zinc-650 cursor-not-allowed"
                    : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/10 cursor-pointer animate-pulse"
                }`}
              >
                {isCRAFTINGDiary ? (
                  <>
                    <span className="animate-spin text-xs">🌀</span> 深夜研墨起草中...
                  </>
                ) : (
                  <>
                    <BookOpen className="h-4 w-4" /> CREATE_DIARY_ENTRY
                  </>
                )}
              </button>

              {tasks.length === 0 && (
                <span className="text-[10px] text-zinc-500 font-mono">
                  *需要建立至少一個防守線行程才能起手調製。
                </span>
              )}
            </div>

            {diaryError && (
              <div className="p-3.5 rounded-xl bg-rose-955/20 border border-rose-500/20 text-xs text-rose-450 flex items-center gap-2 font-sans font-medium">
                <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                <span>{diaryError}</span>
              </div>
            )}

            {/* Handcraft Leather diary sheet */}
            {diaryEntry ? (
              <div
                id="diary-book-wrapper"
                className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-6 md:p-8 shadow-2xl relative overflow-hidden"
              >
                {/* Journal aesthetic textures */}
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-teal-500 via-emerald-555 to-amber-500" />
                <div className="absolute top-4 right-4 text-[9px] font-mono text-zinc-555 flex items-center gap-2 uppercase tracking-tight">
                  <span>📅 TEMPUS JOURNAL SHEET</span>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold">{diaryEntry.date}</span>
                </div>

                <div className="max-w-none prose prose-invert font-serif relative">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-4 tracking-wider uppercase font-mono">
                    <span>本日防守成功率:</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 font-bold text-xs">
                      {diaryEntry.rate}%
                    </span>
                  </div>

                  {/* Body Content parsed custom compiler */}
                  <div className="font-sans text-xs text-zinc-300 leading-relaxed space-y-2">
                    <ParagraphRenderer text={diaryEntry.markdown} />
                  </div>
                </div>

                {/* Reset Diary option */}
                <div className="mt-8 pt-4 border-t border-zinc-900/60 flex justify-end">
                  <button
                    id="clear-diary-btn"
                    onClick={() => setDiaryEntry(null)}
                    className="text-[10px] text-zinc-500 hover:text-rose-450 transition font-mono uppercase tracking-wider cursor-pointer"
                  >
                    // 撕下今日手帳重新起筆
                  </button>
                </div>
              </div>
            ) : (
              !isCRAFTINGDiary && (
                <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 p-8 text-center text-zinc-550 text-xs font-sans font-medium leading-relaxed">
                  手帳目前尚未落筆。點擊上方按鈕，在睡前接受 CBT 時光大腦的暖心復盤與調養吧。
                </div>
              )
            )}
          </div>

        </section>

      </main>

      <footer className="border-t border-zinc-850 bg-zinc-950 py-8 mt-16 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 space-y-2 font-mono">
          <p className="font-bold text-zinc-450 uppercase tracking-wider text-[10px]">© 2026 TEMPUS (逆時防線) Time Shield Inc. 空間與拖延抗禦時間狀態機</p>
          <p className="text-[10px] text-zinc-600 font-sans leading-relaxed">
            基於「認知行為療法 (CBT)」大腦理論，透過科學逆退緩衝墊與自我對抗回報，擊退時間盲感。由 Google Gemini 強力驅動。
          </p>
        </div>
      </footer>
    </div>
  );
}
