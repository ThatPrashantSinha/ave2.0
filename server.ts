import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

// Allow up to 25MB for high-resolution timetable images
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Initialize Google GenAI with telemetry User-Agent as instructed by guidelines
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface ParsedExamItem {
  subject: string;
  code?: string;
  date: string; // YYYY-MM-DD
  dayOfWeek?: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  venue?: string;
  type?: 'Theory' | 'Practical' | 'Viva' | 'Quiz' | 'Other';
  notes?: string;
}

interface ParseExamResponse {
  success: boolean;
  detectedExamName: string;
  exams: ParsedExamItem[];
  rawText?: string;
  message?: string;
}

// POST /api/parse-exam-image
app.post('/api/parse-exam-image', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/png', examNameHint } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        message: 'No image data provided. Please upload an exam timetable image.',
      });
    }

    // Strip prefix if present (e.g. data:image/png;base64,...)
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

    if (!geminiApiKey) {
      return res.status(500).json({
        success: false,
        message: 'GEMINI_API_KEY is not configured on the server. AI Vision extraction requires a valid Gemini API key.',
      });
    }

    const currentYear = new Date().getFullYear();

    const prompt = `You are an expert academic date-sheet and exam schedule parser.
Analyze this image of an exam schedule / timetable / date sheet carefully.
Extract all exam sessions, courses, dates, timings, and papers present in the image.

The user suggested exam name or hint is: "${examNameHint || 'Semester Examination'}".

Instructions:
1. Detect or infer the overarching Exam Name or Title from the header of the image if present (e.g., "Mid-Term Examination 2026", "End Semester Theory Examination", "Unit Test 1", "Odd Semester Final Examination", etc.). If not found, use the user hint "${examNameHint || 'Semester Examination'}".
2. For each exam paper or slot listed in the image, extract:
   - "subject": Full name of the subject/course (e.g., "Data Structures & Algorithms", "Operating Systems", "Microprocessors", etc.).
   - "code": Course code if present (e.g., "CS-301", "KCS-401", "MATH202", etc.).
   - "date": Date formatted strictly as "YYYY-MM-DD". If the year is omitted in the image, assume the year ${currentYear} or ${currentYear + 1} based on context.
   - "dayOfWeek": Day name (e.g., "Monday", "Tuesday", "Wednesday", etc.).
   - "startTime": Start time in 24-hour format "HH:mm" (e.g., "09:30", "10:00", "14:00"). If AM/PM is specified in image, convert to 24h.
   - "endTime": End time in 24-hour format "HH:mm" (e.g., "12:30", "13:00", "17:00"). If duration is given (e.g. 3 hours), calculate the endTime. If end time is missing, default to 3 hours after startTime.
   - "venue": Classroom, Hall, Center, or Lab if indicated, otherwise leave empty string.
   - "type": One of: "Theory", "Practical", "Viva", "Quiz", "Other". Default to "Theory".
   - "notes": Any session/shift (e.g., "Morning Shift", "Slot A", "Section E", "Max Marks: 100", etc.).

Return the response in valid JSON matching this schema:
{
  "detectedExamName": "string",
  "exams": [
    {
      "subject": "string",
      "code": "string",
      "date": "YYYY-MM-DD",
      "dayOfWeek": "string",
      "startTime": "HH:mm",
      "endTime": "HH:mm",
      "venue": "string",
      "type": "Theory | Practical | Viva | Quiz | Other",
      "notes": "string"
    }
  ]
}
`;

    let responseText = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || 'image/png',
              },
            },
            { text: prompt },
          ],
        },
        config: {
          responseMimeType: 'application/json',
        },
      });
      responseText = response.text || '';
    } catch (primaryErr: any) {
      console.warn('Primary model gemini-flash-latest error, trying fallback model gemini-3.1-flash-lite:', primaryErr?.message);
      const fallbackRes = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || 'image/png',
              },
            },
            { text: prompt },
          ],
        },
        config: {
          responseMimeType: 'application/json',
        },
      });
      responseText = fallbackRes.text || '';
    }
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse Gemini JSON response directly:', responseText);
      // Try extracting json block if wrapped in markdown
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('Invalid JSON received from AI model');
      }
    }

    const detectedExamName = parsed.detectedExamName || examNameHint || 'Semester Examination';
    const exams: ParsedExamItem[] = Array.isArray(parsed.exams) ? parsed.exams : [];

    // Sanitize and validate exam items
    const validatedExams: ParsedExamItem[] = exams.map((item, idx) => {
      let d = item.date;
      if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        // Fallback date if invalid
        d = new Date(Date.now() + (idx + 1) * 86400000 * 2).toISOString().split('T')[0];
      }

      let st = item.startTime || '09:30';
      if (!/^\d{2}:\d{2}$/.test(st)) {
        st = '09:30';
      }

      let et = item.endTime || '12:30';
      if (!/^\d{2}:\d{2}$/.test(et)) {
        et = '12:30';
      }

      return {
        subject: item.subject || `Subject ${idx + 1}`,
        code: item.code || undefined,
        date: d,
        dayOfWeek: item.dayOfWeek || undefined,
        startTime: st,
        endTime: et,
        venue: item.venue || undefined,
        type: item.type || 'Theory',
        notes: item.notes || undefined,
      };
    });

    return res.json({
      success: true,
      detectedExamName,
      exams: validatedExams,
      message: `Successfully extracted ${validatedExams.length} exam slots from image.`,
    });
  } catch (error: any) {
    console.error('Error processing exam image:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to parse timetable image with AI.',
    });
  }
});

// Setup Vite development server or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
