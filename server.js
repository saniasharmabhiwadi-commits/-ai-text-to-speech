import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Serve frontend static files from the project root
app.use(express.static(__dirname));

// Helper: retrieve ElevenLabs API key strictly from environment
function getApiKey() {
  return process.env.ELEVENLABSAPIKEY || process.env.ELEVENLABS_API_KEY || '';
}

// Curated list of default official ElevenLabs voices used as fallback if API key is not yet configured
const DEFAULT_PREMADE_VOICES = [
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', description: 'Warm • Captivating Storyteller • British Male' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'American • Male • Deep • Narration' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', description: 'American • Female • Soft • Storytelling' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'American • Male • Well-rounded • Commercials' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', description: 'American • Male • Crisp • Narration' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', description: 'American • Female • Strong • Audiobooks' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', description: 'American • Female • Emotional • Storytelling' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', description: 'American • Male • Deep • Narration' },
  { id: 'yoZ06a0CYWhxCd4mgOqS', name: 'Sam', description: 'American • Male • Raspy • Character' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', description: 'British • Male • Raspy • Narration' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', description: 'British • Female • Confident • News' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', description: 'British • Female • Warm • Narration' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', description: 'British • Male • Deep • News / Presenter' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', description: 'Australian • Male • Casual • Conversational' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', description: 'American • Male • Friendly • Social Media' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', description: 'American • Female • Expressive • Conversational' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', description: 'American • Female • Warm • Audiobooks' }
];

// Curated list of supported ElevenLabs TTS models
const SUPPORTED_MODELS = [
  {
    id: 'eleven_multilingual_v2',
    name: 'Eleven Multilingual v2',
    description: 'Most realistic, expressive, and natural model. Supports 29 languages.',
    badge: 'Recommended',
    isDefault: true
  },
  {
    id: 'eleven_turbo_v2_5',
    name: 'Eleven Turbo v2.5',
    description: 'High quality with ultra-low latency. Supports 32 languages.',
    badge: 'Fast',
    isDefault: false
  },
  {
    id: 'eleven_flash_v2_5',
    name: 'Eleven Flash v2.5',
    description: 'Fastest generation (~75ms). Perfect for rapid prototyping.',
    badge: 'Ultra Fast',
    isDefault: false
  },
  {
    id: 'eleven_monolingual_v1',
    name: 'Eleven Monolingual v1',
    description: 'Classic legacy model optimized specifically for English narration.',
    badge: 'English Only',
    isDefault: false
  }
];

/**
 * Health check endpoint: verifies server status and whether API key is set
 */
app.get('/api/health', (req, res) => {
  const apiKey = getApiKey();
  res.json({
    status: 'ok',
    hasApiKey: !!apiKey && apiKey.trim().length > 0 && apiKey !== 'your_elevenlabs_api_key_here',
    port: PORT
  });
});

/**
 * Endpoint: GET /api/models
 * Returns the supported ElevenLabs text-to-speech models
 */
app.get('/api/models', (req, res) => {
  res.json({ models: SUPPORTED_MODELS });
});

/**
 * Endpoint: GET /api/voices
 * Retrieves voices dynamically from ElevenLabs API.
 * If API key is missing or fails, provides clear error or fallback premades.
 */
app.get('/api/voices', async (req, res) => {
  const apiKey = getApiKey();

  if (!apiKey || apiKey === 'your_elevenlabs_api_key_here') {
    return res.status(200).json({
      voices: DEFAULT_PREMADE_VOICES,
      warning: 'API key not configured in .env. Showing default voices. Add your ELEVENLABSAPIKEY to generate speech.',
      source: 'fallback'
    });
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { detail: { message: errorText } };
      }

      const message = errorData?.detail?.message || errorData?.detail || `ElevenLabs API error (${response.status})`;
      console.error('[ElevenLabs Voices Error]:', message);

      // Return default voices with warning so the UI stays usable, but notify frontend
      return res.status(200).json({
        voices: DEFAULT_PREMADE_VOICES,
        warning: `Could not fetch live voices from ElevenLabs (${message}). Using standard voices.`,
        source: 'fallback'
      });
    }

    const data = await response.json();
    const rawVoices = data.voices || [];

    const formattedVoices = rawVoices.map((v) => {
      // Build readable description from labels
      const labels = v.labels || {};
      const descParts = [
        labels.accent,
        labels.gender,
        labels.age || labels.descriptive,
        labels.use_case
      ].filter(Boolean);

      const description = descParts.length > 0
        ? descParts.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' • ')
        : (v.category ? v.category.charAt(0).toUpperCase() + v.category.slice(1) : 'Standard');

      return {
        id: v.voice_id,
        name: v.name,
        category: v.category || 'premade',
        labels: labels,
        preview_url: v.preview_url || null,
        description: description
      };
    });

    res.json({
      voices: formattedVoices,
      source: 'live'
    });
  } catch (error) {
    console.error('[Error fetching voices]:', error.message);
    res.status(200).json({
      voices: DEFAULT_PREMADE_VOICES,
      warning: `Network error connecting to ElevenLabs (${error.message}). Showing default voices.`,
      source: 'fallback'
    });
  }
});

/**
 * Endpoint: POST /api/generate-speech (also aliased as /api/tts)
 * Generates speech audio from text using ElevenLabs API
 */
const handleTTS = async (req, res) => {
  const apiKey = getApiKey();

  // Validate API Key existence
  if (!apiKey || apiKey === 'your_elevenlabs_api_key_here') {
    return res.status(401).json({
      error: 'ElevenLabs API key is missing. Please set ELEVENLABSAPIKEY in your .env file and restart the server.'
    });
  }

  const { text, voiceId, modelId, stability, similarityBoost, style, useSpeakerBoost } = req.body;

  // Validate Input Text
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({
      error: 'Please enter text to narrate.'
    });
  }

  const trimmedText = text.trim();
  const MAX_CHARACTERS = 5000;
  if (trimmedText.length > MAX_CHARACTERS) {
    return res.status(400).json({
      error: `Text is too long (${trimmedText.length} characters). The maximum allowed length is ${MAX_CHARACTERS} characters.`
    });
  }

  // Validate Voice ID
  if (!voiceId || typeof voiceId !== 'string' || !voiceId.trim()) {
    return res.status(400).json({
      error: 'Please select a valid voice.'
    });
  }

  // Sanitize voice settings
  const parsedStability = typeof stability === 'number' ? Math.max(0, Math.min(1, stability)) : 0.5;
  const parsedSimilarity = typeof similarityBoost === 'number' ? Math.max(0, Math.min(1, similarityBoost)) : 0.75;
  const parsedStyle = typeof style === 'number' ? Math.max(0, Math.min(1, style)) : 0;
  const parsedSpeakerBoost = typeof useSpeakerBoost === 'boolean' ? useSpeakerBoost : true;

  const selectedModel = modelId || 'eleven_multilingual_v2';
  const targetVoiceId = encodeURIComponent(voiceId.trim());

  try {
    const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}?output_format=mp3_44100_128`;

    const requestPayload = {
      text: trimmedText,
      model_id: selectedModel,
      voice_settings: {
        stability: parsedStability,
        similarity_boost: parsedSimilarity,
        style: parsedStyle,
        use_speaker_boost: parsedSpeakerBoost
      }
    };

    const response = await fetch(elevenLabsUrl, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify(requestPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { detail: { message: errorText } };
      }

      const rawMsg = errorData?.detail?.message || errorData?.detail || errorData?.message;
      let userFriendlyMessage = rawMsg || 'ElevenLabs synthesis failed.';

      if (rawMsg) {
        userFriendlyMessage = rawMsg;
      } else if (response.status === 401) {
        userFriendlyMessage = 'Invalid ElevenLabs API key. Please check your ELEVENLABSAPIKEY in the .env file.';
      } else if (response.status === 429) {
        userFriendlyMessage = 'ElevenLabs rate limit or character quota exceeded for your tier.';
      } else if (response.status === 404) {
        userFriendlyMessage = 'The selected voice was not found in ElevenLabs.';
      }

      console.error(`[ElevenLabs API Error ${response.status}]:`, rawMsg || errorText);
      return res.status(response.status).json({
        error: userFriendlyMessage,
        details: rawMsg || null,
        statusCode: response.status
      });
    }

    // Stream the binary audio response back to the client
    const audioBuffer = Buffer.from(await response.arrayBuffer());

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Content-Disposition', 'inline; filename="narration.mp3"');
    res.setHeader('Cache-Control', 'no-cache');

    return res.end(audioBuffer);
  } catch (err) {
    console.error('[Server Error in /api/generate-speech]:', err);
    return res.status(500).json({
      error: `Server encountered an error while contacting ElevenLabs: ${err.message}`
    });
  }
};

app.post('/api/generate-speech', handleTTS);
app.post('/api/tts', handleTTS);

// Root route serves index.html explicitly
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the Express server when running locally
if (process.env.NETLIFY !== 'true') {
  app.listen(PORT, '0.0.0.0', () => {
    const hasKey = !!getApiKey() && getApiKey() !== 'your_elevenlabs_api_key_here';
    console.log(`\n=================================================`);
    console.log(`🎙️  AI Text-to-Speech Web App running successfully!`);
    console.log(`📡 Local URL: http://localhost:${PORT}`);
    console.log(`🔑 ElevenLabs API Key: ${hasKey ? '✓ Configured' : '✗ Missing (Set in .env file)'}`);
    console.log(`=================================================\n`);
  });
}

// Export app for Netlify Functions serverless wrapper
export default app;

