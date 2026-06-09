import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialization of Gemini client
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is not configured. Please set your API secret key in AI Studio settings.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

// REST API endpoint to evaluate user's ecological actions
app.post("/api/evaluate", async (req, res) => {
  try {
    const { co2, points, cost, savings, rank, choices } = req.body;

    const summaryReport = `
      Current Daily Carbon Footprint: ${co2} kg CO2e (Target: <= 8.00 kg)
      Strategy Points: ${points}/100 remaining
      Total Action Costs: $${cost}
      Total Savings Generated: $${savings}
      Current Player Rank: ${rank}
      User Current Activities:
      - Shower Duration Profile: ${choices?.shower || "None"}
      - Primary Commute Mode: ${choices?.commute || "None"} (Distance: ${choices?.commuteDist || 0} km)
      - Dietary Profile: ${choices?.diet || "None"}
      - Lifestyle Shopping Choice: ${choices?.shopping || "None"}
      - Utility Appliance Usage: ${choices?.appliances || "None"}
      - Custom Logged Actions: ${JSON.stringify(choices?.customTasks || [])}
    `;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Evaluate this player's energy and resource strategy report and suggest target eco recovery tips:\n${summaryReport}`,
      config: {
        systemInstruction: "You are the EcoStep intelligent real-time climate strategist guiding players to improve their carbon footprint score. Suggest 3 sustainable alternatives or improvements specifically tailored to their select choices to maximize both their strategy points and utility bill savings. Be concise, warm, professional, and practical. Output the responses in the requested JSON structure.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            advice: {
              type: Type.STRING,
              description: "Brief professional strategist evaluation of the user's latest actions, under 3-4 sentences."
            },
            alternatives: {
              type: Type.ARRAY,
              description: "Array of exactly 3 practical recovery choices.",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  desc: { type: Type.STRING },
                  pointsRecovery: { type: Type.INTEGER }
                },
                required: ["title", "desc", "pointsRecovery"]
              }
            }
          },
          required: ["advice", "alternatives"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("AI Evaluation failed:", error);
    res.status(500).json({ 
      error: error.message || "Failed to trigger AI feedback",
      advice: "Your local calculator remains active! Reducing long hot showers, eating plant proteins, and biking under 5km will drop your emissions to restore the Earth.",
      alternatives: [
        {
          title: "Limit Showering Time",
          desc: "Shorter warm showers cut heating utility bills and maximize daily points.",
          pointsRecovery: 10
        },
        {
          title: "Walk or Bicycle Nearby Stops",
          desc: "Swap fuel commutes under 3km for a bike. Saves gas & recovers +10 game points.",
          pointsRecovery: 12
        },
        {
          title: "Initiate Meat-Free Meal",
          desc: "Substitute poultry or beef servings with tofu wraps to lower diet impact.",
          pointsRecovery: 8
        }
      ]
    });
  }
});

// Serve frontend assets via Vite in Dev or static files in Prod
async function start() {
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
    console.log(`EcoStep custom full-stack server listening at http://localhost:${PORT}`);
  });
}

start();
