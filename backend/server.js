import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = "gemini-2.5-flash";

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/summarize", async (req, res) => {
  const { text, style } = req.body;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({ error: "Missing or empty 'text' field." });
  }

  const MAX_CHARS = 15000;
  const trimmedText = text.slice(0, MAX_CHARS);

  const stylePrompt =
  style === "bullet"
    ? "Summarize the following content as a numbered list of key points (1., 2., 3., etc). Do not use Markdown formatting — no asterisks, no bold, no hashtags. Plain text only, one point per line."
    : "Summarize the following content in a clear, well-organized paragraph. Do not use Markdown formatting — no asterisks, no bold, no hashtags. Plain text only.";

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `${stylePrompt}\n\nContent:\n${trimmedText}`,
    });

    res.json({ summary: response.text });
  } catch (err) {
    console.error("[server] LLM API error:", err.message);
    res.status(500).json({ error: "Failed to generate summary." });
  }
});

app.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
});