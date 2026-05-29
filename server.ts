import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini SDK to prevent startup crashes when API key is not present initially.
let aiInstance: GoogleGenAI | null = null;
function getGeminiSDK(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is not configured. Please add it via Settings > Secrets.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// ==========================================
// API Routing
// ==========================================

// 1. Spoken Schedule Parsing [TASK_PARSE]
app.post("/api/gemini/parse", async (req, res) => {
  try {
    const { inputText, landmarks } = req.body;
    if (!inputText) {
      return res.status(400).json({ error: "Missing inputText for parsing schedule" });
    }

    const ai = getGeminiSDK();
    const systemPrompt = `
You are the central AI Brain of TEMPUS (逆時防線), a smart time management app that operates on structured procrastination and CBT.
Your job is to parse spoken conversations or casual descriptions about schedules into an array of structured schedule nodes.

Rules:
1. Time Anchoring (時間錨定): Detect the start time for each task and map it in "HH:MM" format (24h).
2. Carryover Rule (起訖站承接): Map the origin ("fromLoc") and destination ("toLoc") coordinate points using the IDs provided in the landmark references list.
   - If an event ends somewhere, the next sequential event starting position "fromLoc" MUST carry over the previous event's ending position "toLoc" dynamically.
   - For example: If the first event is "from home to school", and the second is "go from school to dinner", the second's "fromLoc" is automatically the school landmark. If they don't specify where they are starting, carry over!
   - Default the first starting point to 'home' or a logical entry in the reference list if not explicitly specified.
3. Travel Mode: Suggest reasonable travel modes: "transit", "walk", "drive", "bicycling".
4. Add vibrant, relevant emojis to the beginning of the title to make it super gorgeous!

References Landmark List:
${JSON.stringify(landmarks || [])}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `[TASK_PARSE]\nUser prompt: "${inputText}"\nLandmarks database: ${JSON.stringify(landmarks)}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              rawTime: { type: Type.STRING, description: "Task planned start time in HH:MM format (24 hour time, e.g. 14:30)" },
              title: { type: Type.STRING, description: "Descriptive task header starting with a lively, expressive emoji" },
              buffer: { type: Type.INTEGER, description: "CBT recommended padding/buffer cushion in minutes (normally 15 or 10)" },
              fromLoc: { type: Type.STRING, description: "The landmark ID for origin, matching database keys" },
              toLoc: { type: Type.STRING, description: "The landmark ID for destination, matching database keys" },
              travelMode: { type: Type.STRING, description: "One of: transit, walk, drive, bicycling" }
            },
            required: ["rawTime", "title", "buffer", "fromLoc", "toLoc", "travelMode"]
          }
        }
      }
    });

    const parsedData = JSON.parse(response.text || "[]");
    return res.json(parsedData);
  } catch (error: any) {
    console.error("Parse Error:", error);
    return res.status(500).json({ error: error.message || "Failed to parse spoken text." });
  }
});

// 2. Anti-procrastination Assistant Coaching [TASK_COACH]
app.post("/api/gemini/coach", async (req, res) => {
  try {
    const { tasks, procrastinationLevel, theme, customName, customPersonality } = req.body;
    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({ error: "Missing schedules check items" });
    }

    const ai = getGeminiSDK();
    const systemPrompt = `
You are the system style mind of TEMPUS. You generate aggressive, interesting, behavioral CBT-grounded anti-procrastination roasts and advice.
We have 8 potential personality themes:
1. "star_idol" (閃耀星途): Tsundere manager of their favorite idol bias. Uses idol fandom lingo. Roasts that if they are late, they'll get bad balcony seats or miss the concert!
   Example style: "再磨蹭下去，演唱會序號就要變成蛋頂最後一排了！立刻開門出發！"
2. "racing" (極速賽道): Hardcore track director, team boss. Highly logical, demanding, speed-loving, counts pit time in seconds.
   Example style: "你的對手已經進站了，你還在沙發上怠速？起跑燈即將熄滅，立刻動身！"
3. "anime" (動漫萌系妖精): Tsundere cute anime-style elf assistant. Playful anime humor, talks of multi-verse decay, Bad Ends, achievement unlocks.
   Example style: "哼，本精靈才不是擔心你遲到呢！只是如果你任務失敗了，世界的線條會崩壞，快給我站起來！"
4. "fitness" (魔鬼增肌減脂教練): High-intensity personal fitness trainer. Talks about protein whey, carbs, calories, DOMS, pushing weights.
   Example style: "脂肪是不會同情你的軟弱的！把拖延的時間拿來背上重包跑步通勤，立刻起重出發！"
5. "cats_master" (高冷傲嬌貓主子): Sassy and lazy cat overlord. Throws purrs, meows, scratch warnings, demands canned food.
   Example style: "喵嗚…你還在躺？罐罐錢賺夠了沒？不快點出發我就要在你的鍵盤上踩一腳了喔！"
6. "workplace" (敏捷外商高階主管): Smooth corporate buzzwords user, Agile PM, manager. Focuses on KPI, deadline alignment, pain points, roadmap, high efficiency.
   Example style: "我們需要立即 alignment，這個行程的 deadline 是不可妥協的。請迅速出發，完成推進！"
7. "classic" (微光慢活 - DEFAULT): Elegant, empathetic classical private butler. Sophisticated, sharp, values cognitive rest, reminds them of peace of mind.
8. "custom" (使用者自訂): Name is "${customName || "管家"}" and characteristics: "${customPersonality || "嚴厲"}" - 100% roleplay this custom persona perfectly.

Parameters for current generation:
Procrastination scale: ${procrastinationLevel} (mild / heavy / master)
Current Theme Select: ${theme}

Write coaching texts in Traditional Chinese (繁體中文).
For each task item:
- coachAdvice: Sharp, CBT psychological advice tailored exact to this persona theme (max 40 chars). No formal lecturing, make it high-impact.
- funnyFact: A specific roasty joke about typical excuses for procrastinating this task (max 30 chars).
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `[TASK_COACH]\nTasks List: ${JSON.stringify(tasks)}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "The task unique ID reference" },
              coachAdvice: { type: Type.STRING, description: "Persona-fit advice to motivate action under 40 traditional Chinese chars" },
              funnyFact: { type: Type.STRING, description: "Tailored roasty delay excuse call-out under 30 traditional Chinese chars" }
            },
            required: ["id", "coachAdvice", "funnyFact"]
          }
        }
      }
    });

    const parsedData = JSON.parse(response.text || "[]");
    return res.json(parsedData);
  } catch (error: any) {
    console.error("Coach Error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate coaching suggestions." });
  }
});

// 3. Midnight Handcrafted Journal Diary Analysis [TASK_DIARY]
app.post("/api/gemini/diary", async (req, res) => {
  try {
    const { rate, reports, theme, customName, customPersonality } = req.body;
    const ai = getGeminiSDK();

    const systemPrompt = `
You are the gentle, highly sophisticated counselor of TEMPUS. You are reviewing the user's performance today (completion: ${rate}%, with specific CBT defense logs).
Adopt the voice tone of the current Butler Style Theme: "${theme}" (Custom Name: "${customName}", Custom profile: "${customPersonality}"). But combine it with deep therapeutic warmth and CBT psychological wisdom.

You MUST write a beautifully formatted handwritten Journal entry inside a diary book, divided into three specific, elegant sections in Traditional Chinese (繁體中文):

Section Structure requirements:
🌟 【微光日常時光剪影】
(Record the gentle gaps, commuter visuals, quiet buffers, and beautiful margins of today's space and travel. Use aesthetic prose.)

⏱️ 【抗拖延偏差值心理診斷】
(Critique the user's specific trigger behaviors based on cognitive sciences and their selected style's brand personality. Identify exactly where they had 'time blindness' or avoidances, and outline a realistic attention/energy optimization roadmap for tomorrow.)

💌 【逆時針情書】
(A gorgeous midnight heart-to-heart whisper. Empathetic, supportive, comforting, not patronizing, but deeply encouraging.)

Keep the Markdown layout immaculate and charming.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `[TASK_DIARY]\nToday's completion rate: ${rate}%\nCombat logs: ${JSON.stringify(reports)}`,
      config: {
        systemInstruction: systemPrompt,
      }
    });

    return res.json({ markdown: response.text || "手帳生成發生異常，請重試。" });
  } catch (error: any) {
    console.error("Diary Error:", error);
    return res.status(500).json({ error: error.message || "Failed to craft time journal draft." });
  }
});

// ==========================================
// Vite Dev & Production Static Servers
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[TEMPUS CORE STARTED] Dev link: http://localhost:${PORT}`);
  });
}

startServer();
