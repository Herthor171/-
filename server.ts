import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const ALLOWED_FREE_MODELS = new Set([
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-flash-latest',
]);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  app.post('/api/chat', async (req, res) => {
    try {
      const {
        messages,
        model = 'gemini-3.5-flash',
        systemInstruction,
        clinicContext,
      } = req.body;

      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'Messages array is required.' });
        return;
      }

      const selectedModel = ALLOWED_FREE_MODELS.has(model)
        ? model
        : 'gemini-3.5-flash';

      const baseInstruction =
        systemInstruction ||
        'You are the intelligent clinical and administrative assistant for LK Smile Dental Clinic (ຄລີນິກແຂ້ວ LK Smile) in Vientiane, Laos. Respond clearly and accurately in Lao (ພາສາລາວ) or English depending on the user prompt.';

      const fullSystemInstruction = clinicContext
        ? `${baseInstruction}\n\nLive Clinic Snapshot:\n${clinicContext}`
        : baseInstruction;

      const contents = messages.map((m: { role: string; text: string }) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: String(m.text || '') }],
      }));

      let response;
      try {
        response = await ai.models.generateContent({
          model: selectedModel,
          contents,
          config: {
            systemInstruction: fullSystemInstruction,
          },
        });
      } catch (primaryErr: any) {
        // Fallback to gemini-flash-latest if a specific preview alias isn't enabled on the free tier key
        if (selectedModel !== 'gemini-flash-latest') {
          response = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents,
            config: {
              systemInstruction: fullSystemInstruction,
            },
          });
        } else {
          throw primaryErr;
        }
      }

      res.json({
        text: response.text || '',
        modelUsed: selectedModel,
      });
    } catch (error: any) {
      console.error('Gemini API Chat Error:', error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate response from Gemini.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LK Smile Dental Clinic Server running on http://localhost:${PORT}`);
  });
}

startServer();
