# 🎙️ AI Text-to-Speech Narration Web Application

A modern, responsive, and beginner-friendly AI Text-to-Speech web application built with **HTML5**, **CSS3**, **Vanilla JavaScript**, **Node.js (Express)**, and the **ElevenLabs API**.

This application allows users to input any custom text, select an AI speaker voice and narration model from ElevenLabs, adjust expressive voice stability settings, generate speech audio, preview and play back the audio with waveform animations, and download the resulting MP3 file directly to their computer.

---

## 🌟 Key Features

- **Clean & Responsive Interface**: Modern dark-themed dashboard with glassmorphism cards and smooth animations that work on desktop and mobile devices.
- **Large Text Input Area**: Real-time counter for characters (up to 5,000 characters), word count, and estimated reading/speaking duration.
- **Quick Sample Presets**: One-click test scripts ("Welcome", "Story", "Educational") for rapid testing.
- **Live Voice Selection**: Dynamically fetches all voices available on your ElevenLabs account (`/v1/voices`), including premade, cloned, and community library voices. Includes sample audio previews!
- **Supported TTS Models**: Easily switch between supported ElevenLabs models:
  - `eleven_multilingual_v2` *(Recommended: 29 languages, highest quality)*
  - `eleven_turbo_v2_5` *(Ultra-low latency, 32 languages)*
  - `eleven_flash_v2_5` *(Fastest generation, ~75ms)*
  - `eleven_monolingual_v1` *(Classic English model)*
- **Advanced Voice Controls**: Fine-tune Stability and Clarity/Similarity Boost sliders.
- **Interactive Audio Player**:
  - Custom Play / Pause controls.
  - Interactive progress seek bar and live time counter (`00:00 / 00:00`).
  - Animated sound wave visualizer that responds during playback.
  - Volume slider and one-click mute button.
- **Instant Audio Download**: Save the generated speech directly as a timestamped `.mp3` file (e.g. `elevenlabs-narration-rachel-2026-10-09.mp3`).
- **Secure Backend**: Your ElevenLabs API key is kept safely on the Node.js backend using the environment variable `ELEVENLABSAPIKEY`. The key is **never** exposed to client-side JavaScript or committed to Git.
- **Unified Local Server**: The Express backend serves the static frontend files (`index.html`, `style.css`, `script.js`), so you only need to run a single server on `http://localhost:3000`.

---

## 📁 Project Structure

```text
├── .env.example       # Example environment variables template
├── .gitignore          # Prevents node_modules, .env, and sensitive files from Git
├── index.html          # Semantic HTML layout and UI components
├── style.css           # Modern styles, responsive grid, animations & audio player UI
├── script.js           # Client-side logic, API calls, event handling & audio playback
├── server.js           # Node.js Express server, ElevenLabs endpoints & validation
├── package.json        # Project metadata, dependencies, and launch scripts
└── README.md           # Setup instructions, architecture overview & troubleshooting
```

---

## 📋 Prerequisites

Before starting, ensure you have the following installed on your computer:

1. **Node.js** (v18.0.0 or higher recommended). Check by running in PowerShell or Command Prompt:
   ```powershell
   node -v
   ```
2. An **ElevenLabs API Key**:
   - Create a free account at [ElevenLabs.io](https://elevenlabs.io).
   - In the ElevenLabs dashboard, click your profile icon in the bottom-left corner.
   - Select **Profile + API key**.
   - Copy your secret API key (starts with `sk_...` or a hexadecimal string).

---

## 🚀 Setup & Installation (Step-by-Step on Windows)

### Step 1: Open PowerShell or Terminal

Open Windows PowerShell or Command Prompt and make sure you are in the project folder:

```powershell
cd c:\Users\Pankaj\Documents\sania.c
```

### Step 2: Install Node.js Dependencies

Run npm install to install the required dependencies (`express`, `dotenv`, `cors`):

```powershell
npm install
```

### Step 3: Create Your `.env` File

Copy the template file `.env.example` into a new file named `.env`:

```powershell
Copy-Item .env.example .env
```
*(Or manually create a file named `.env` in the project root folder).*

Open `.env` in your text editor (such as VS Code or Notepad):

```powershell
notepad .env
```

Replace `your_elevenlabs_api_key_here` with your actual ElevenLabs API key:

```env
ELEVENLABSAPIKEY=sk_your_actual_elevenlabs_api_key_here
PORT=3000
```

> **Security Note:** Never commit your `.env` file to Git or share it publicly. The provided `.gitignore` file automatically excludes `.env` to protect your credentials.

---

## 🎬 Running the Application

### Start the Server:

```powershell
npm start
```

Or run with automatic reload during development:

```powershell
npm run dev
```

You should see the startup message in your terminal:

```text
=================================================
🎙️  AI Text-to-Speech Web App running successfully!
📡 Local URL: http://localhost:3000
🔑 ElevenLabs API Key: ✓ Configured
=================================================
```

### Open in Your Browser:

Open your web browser (Chrome, Edge, Firefox, Brave) and navigate to:

👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🧪 Testing the Application

1. **Verify Server Status**:
   - Look at the top right of the web app header. It should display a green badge reading **`API Key Connected`**.
2. **Select Voice & Model**:
   - Click the **ElevenLabs Voice** dropdown to pick a voice (e.g., *Rachel*, *Adam*, *Antoni*, or your custom cloned voices).
   - Click the **Sample** button next to the dropdown to preview what that voice sounds like.
   - Choose a TTS model (e.g., *Eleven Multilingual v2*).
3. **Enter Text**:
   - Click one of the sample preset chips (e.g., **Welcome** or **Story**), or type your own text into the text area.
   - Notice the character and word count update in real-time.
4. **Generate Speech**:
   - Click the purple **Generate Speech** button.
   - A loading spinner will appear while ElevenLabs synthesizes the voice.
5. **Listen & Download**:
   - Once complete, the **Generated Audio Narration** card will appear.
   - Use the **Play / Pause** button to listen, scrub through the progress bar, and adjust the volume.
   - Click **Download Audio (.mp3)** to save the audio file to your computer.

---

## 🛠️ API Endpoints Reference

The backend in `server.js` provides clean REST endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Serves the frontend web app (`index.html`) |
| `GET` | `/api/health` | Returns server health and checks whether `ELEVENLABSAPIKEY` is loaded |
| `GET` | `/api/models` | Returns the list of supported ElevenLabs TTS models |
| `GET` | `/api/voices` | Proxies `https://api.elevenlabs.io/v1/voices` using the server's API key |
| `POST` | `/api/generate-speech` | Generates speech audio (`audio/mpeg`) via ElevenLabs TTS API |

### Request Payload for `/api/generate-speech`:

```json
{
  "text": "Hello, world! This is a test narration.",
  "voiceId": "21m00Tcm4TlvDq8ikWAM",
  "modelId": "eleven_multilingual_v2",
  "stability": 0.5,
  "similarityBoost": 0.75
}
```

---

## ❓ Troubleshooting & Common Errors

### 1. `Error: ELEVENLABSAPIKEY is missing in your .env file`
- **Cause**: The `.env` file does not exist or does not contain `ELEVENLABSAPIKEY`.
- **Fix**: Make sure you created a file named `.env` in the root folder with the line:
  ```env
  ELEVENLABSAPIKEY=sk_your_key_here
  ```
  Restart the server after editing `.env` (`Ctrl + C` in PowerShell, then `npm start`).

### 2. `Error 401: Invalid ElevenLabs API key`
- **Cause**: The API key in `.env` has a typo, extra spaces, or has been revoked on ElevenLabs.
- **Fix**: Log in to [ElevenLabs Profile](https://elevenlabs.io/app/settings/api-keys), generate or copy a fresh key, and paste it into `.env` without quotes or leading/trailing whitespace.

### 3. `Error 429: Rate limit or character quota exceeded`
- **Cause**: The free tier of ElevenLabs has a monthly character quota (typically 10,000 characters/month).
- **Fix**: Check your remaining quota in the [ElevenLabs Subscription Dashboard](https://elevenlabs.io/app/subscription). Shorten your text input or wait for quota renewal.

### 4. `Error: Port 3000 is already in use (EADDRINUSE)`
- **Cause**: Another program or a previous Node process is already using port 3000.
- **Fix**: Change the port in `.env` by adding `PORT=3001` or run:
  ```powershell
  Stop-Process -Name node -Force
  ```
  Then restart with `npm start`.

### 5. Frontend shows `Server Unreachable`
- **Cause**: The Node.js server is not running in your terminal.
- **Fix**: Make sure your terminal is running `npm start` and displays `AI Text-to-Speech Web App running successfully!`.

---

## 📜 License & Acknowledgments

- Powered by [ElevenLabs Text-to-Speech API](https://elevenlabs.io).
- Created for educational purposes and digital literacy.
- Built with vanilla web standards (HTML, CSS, JS) and Express.js.
