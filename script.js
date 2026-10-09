/**
 * AI Text-to-Speech Web Application Frontend Controller
 * Communicates with the local Node.js Express server to generate speech via ElevenLabs.
 */

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // DOM Elements
  // =========================================================================
  
  // Status & Alerts
  const apiStatusBadge = document.getElementById('apiStatusBadge');
  const apiStatusText = document.getElementById('apiStatusText');
  const alertBanner = document.getElementById('alertBanner');
  const alertIcon = document.getElementById('alertIcon');
  const alertTitle = document.getElementById('alertTitle');
  const alertMessage = document.getElementById('alertMessage');
  const alertCloseBtn = document.getElementById('alertCloseBtn');

  // Input Section
  const textInput = document.getElementById('textInput');
  const charCountEl = document.getElementById('charCount');
  const wordCountEl = document.getElementById('wordCount');
  const estDurationEl = document.getElementById('estDuration');
  const charLimitWarning = document.getElementById('charLimitWarning');
  const clearTextBtn = document.getElementById('clearTextBtn');
  const sampleChips = document.querySelectorAll('[data-sample]');

  // Voice & Model Selectors
  const voiceSelect = document.getElementById('voiceSelect');
  const voiceDescEl = document.getElementById('voiceDesc');
  const voicePreviewBtn = document.getElementById('voicePreviewBtn');
  const modelSelect = document.getElementById('modelSelect');
  const modelDescEl = document.getElementById('modelDesc');

  // Advanced Sliders
  const stabilitySlider = document.getElementById('stabilitySlider');
  const stabilityValue = document.getElementById('stabilityValue');
  const similaritySlider = document.getElementById('similaritySlider');
  const similarityValue = document.getElementById('similarityValue');
  const resetSlidersBtn = document.getElementById('resetSlidersBtn');

  // Generation Action
  const generateBtn = document.getElementById('generateBtn');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const generationStatus = document.getElementById('generationStatus');

  // Result & Audio Player
  const resultSection = document.getElementById('resultSection');
  const audioElement = document.getElementById('audioElement');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const playIcon = document.getElementById('playIcon');
  const pauseIcon = document.getElementById('pauseIcon');
  const currentTimeEl = document.getElementById('currentTime');
  const totalDurationEl = document.getElementById('totalDuration');
  const progressWrap = document.getElementById('progressWrap');
  const progressBar = document.getElementById('progressBar');
  const volumeSlider = document.getElementById('volumeSlider');
  const volumeMuteBtn = document.getElementById('volumeMuteBtn');
  const waveformAnim = document.getElementById('waveformAnim');
  const audioMetaSize = document.getElementById('audioMetaSize');
  const downloadBtn = document.getElementById('downloadBtn');

  // State Variables
  let currentAudioUrl = null;
  let currentAudioBlob = null;
  let voiceSampleAudio = null;
  let isMuted = false;
  let previousVolume = 1;

  // Sample Presets Dictionary
  const PRESET_TEXTS = {
    welcome: "Welcome to AI Voice Studio! This web application transforms any text into lifelike narration using ElevenLabs deep learning voice technology. Select your favorite voice and model, then click Generate Speech to begin.",
    story: "The ancient clock tower chimed midnight across the silent valley. A soft mist rolled down from the pine hills, carrying whispers of forgotten legends and secrets untold.",
    education: "Digital literacy empowers learners to critically evaluate online information, master artificial intelligence tools, and communicate effectively in an interconnected digital landscape."
  };

  // =========================================================================
  // Alert & Notification Helper
  // =========================================================================
  
  function showAlert(title, message, type = 'error') {
    alertBanner.className = `alert-banner alert-${type}`;
    alertTitle.textContent = title;
    alertMessage.textContent = message;

    if (type === 'error') alertIcon.textContent = '⛔';
    else if (type === 'warning') alertIcon.textContent = '⚠️';
    else alertIcon.textContent = '✅';

    alertBanner.classList.remove('hidden');
  }

  function hideAlert() {
    alertBanner.classList.add('hidden');
  }

  alertCloseBtn.addEventListener('click', hideAlert);

  // =========================================================================
  // 1. Health Check & Server Status
  // =========================================================================

  async function checkServerHealth() {
    try {
      const response = await fetch('/api/health');
      if (!response.ok) throw new Error('Health check failed');
      const data = await response.json();

      if (data.hasApiKey) {
        apiStatusBadge.className = 'status-pill status-connected';
        apiStatusText.textContent = 'API Key Connected';
      } else {
        apiStatusBadge.className = 'status-pill status-warning';
        apiStatusText.textContent = 'API Key Missing in .env';
        showAlert(
          'API Key Required',
          'Please configure ELEVENLABSAPIKEY in your local .env file to generate audio narration.',
          'warning'
        );
      }
    } catch (err) {
      apiStatusBadge.className = 'status-pill status-warning';
      apiStatusText.textContent = 'Server Unreachable';
      showAlert(
        'Backend Offline',
        'Could not connect to the local Node.js server. Please ensure "npm start" is running in your terminal.',
        'error'
      );
    }
  }

  // =========================================================================
  // 2. Load Supported Models
  // =========================================================================

  async function loadModels() {
    try {
      const response = await fetch('/api/models');
      if (!response.ok) throw new Error('Failed to load models');
      const data = await response.json();
      const models = data.models || [];

      modelSelect.innerHTML = '';
      models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = `${model.name} (${model.badge})`;
        option.dataset.desc = model.description;
        if (model.isDefault) option.selected = true;
        modelSelect.appendChild(option);
      });

      updateModelDescription();
    } catch (err) {
      console.error('Error loading models:', err);
      modelSelect.innerHTML = '<option value="eleven_multilingual_v2" selected>Eleven Multilingual v2 (Recommended)</option>';
      modelDescEl.textContent = 'High quality multilingual narration model.';
    }
  }

  function updateModelDescription() {
    const selectedOption = modelSelect.selectedOptions[0];
    if (selectedOption && selectedOption.dataset.desc) {
      modelDescEl.textContent = selectedOption.dataset.desc;
    }
  }

  modelSelect.addEventListener('change', updateModelDescription);

  // =========================================================================
  // 3. Load Available Voices
  // =========================================================================

  async function loadVoices() {
    try {
      voiceSelect.innerHTML = '<option disabled selected>Fetching voices from ElevenLabs...</option>';
      const response = await fetch('/api/voices');
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const data = await response.json();
      const voices = data.voices || [];

      if (data.warning) {
        console.warn('[Voices Warning]:', data.warning);
      }

      if (voices.length === 0) {
        voiceSelect.innerHTML = '<option value="" disabled>No voices found</option>';
        return;
      }

      voiceSelect.innerHTML = '';
      voices.forEach((voice, index) => {
        const option = document.createElement('option');
        option.value = voice.id;
        option.textContent = `${voice.name} (${voice.description})`;
        option.dataset.name = voice.name;
        option.dataset.desc = voice.description;
        if (voice.preview_url) {
          option.dataset.preview = voice.preview_url;
        }
        if (index === 0) option.selected = true;
        voiceSelect.appendChild(option);
      });

      updateVoiceDetails();
    } catch (err) {
      console.error('Error fetching voices:', err);
      voiceSelect.innerHTML = '<option value="JBFqnCBsd6RMkjVDRZzb" selected>George (Warm • Captivating Storyteller)</option>';
      voiceDescEl.textContent = 'British • Male • Storyteller • Narration';
    }
  }

  function updateVoiceDetails() {
    const selected = voiceSelect.selectedOptions[0];
    if (!selected) return;

    voiceDescEl.textContent = selected.dataset.desc || 'Natural AI Voice';

    if (selected.dataset.preview) {
      voicePreviewBtn.disabled = false;
      voicePreviewBtn.title = `Preview audio sample of ${selected.dataset.name}`;
    } else {
      voicePreviewBtn.disabled = true;
      voicePreviewBtn.title = 'No voice sample preview available';
    }
  }

  voiceSelect.addEventListener('change', () => {
    // Stop any playing preview sample
    if (voiceSampleAudio) {
      voiceSampleAudio.pause();
      voiceSampleAudio = null;
    }
    updateVoiceDetails();
  });

  // Voice Preview Button Handler
  voicePreviewBtn.addEventListener('click', () => {
    const selected = voiceSelect.selectedOptions[0];
    if (!selected || !selected.dataset.preview) return;

    if (voiceSampleAudio && !voiceSampleAudio.paused) {
      voiceSampleAudio.pause();
      voicePreviewBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <span>Sample</span>`;
      return;
    }

    voiceSampleAudio = new Audio(selected.dataset.preview);
    voicePreviewBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16"></rect>
        <rect x="14" y="4" width="4" height="16"></rect>
      </svg>
      <span>Stop</span>`;

    voiceSampleAudio.play().catch(e => console.warn('Preview play blocked:', e));

    voiceSampleAudio.onended = () => {
      voicePreviewBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <span>Sample</span>`;
    };
  });

  // =========================================================================
  // 4. Textarea Character Count & Presets
  // =========================================================================

  function updateTextStats() {
    const text = textInput.value;
    const charCount = text.length;
    charCountEl.textContent = charCount.toLocaleString();

    // Word count calculation
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    wordCountEl.textContent = words.toLocaleString();

    // Estimated duration calculation (~140 words per minute => ~2.3 words/sec)
    const estSeconds = Math.ceil(words / 2.3);
    if (estSeconds < 60) {
      estDurationEl.textContent = `${estSeconds}s`;
    } else {
      const mins = Math.floor(estSeconds / 60);
      const secs = estSeconds % 60;
      estDurationEl.textContent = `${mins}m ${secs}s`;
    }

    // High character limit warning
    if (charCount > 4500) {
      charLimitWarning.classList.remove('hidden');
    } else {
      charLimitWarning.classList.add('hidden');
    }
  }

  textInput.addEventListener('input', updateTextStats);

  // Preset Buttons
  sampleChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const sampleKey = chip.getAttribute('data-sample');
      if (PRESET_TEXTS[sampleKey]) {
        textInput.value = PRESET_TEXTS[sampleKey];
        updateTextStats();
        hideAlert();
        textInput.focus();
      }
    });
  });

  // Clear Text Button
  clearTextBtn.addEventListener('click', () => {
    textInput.value = '';
    updateTextStats();
    textInput.focus();
  });

  // =========================================================================
  // 5. Fine-Tuning Sliders
  // =========================================================================

  stabilitySlider.addEventListener('input', (e) => {
    stabilityValue.textContent = Number(e.target.value).toFixed(2);
  });

  similaritySlider.addEventListener('input', (e) => {
    similarityValue.textContent = Number(e.target.value).toFixed(2);
  });

  resetSlidersBtn.addEventListener('click', () => {
    stabilitySlider.value = 0.5;
    stabilityValue.textContent = '0.50';
    similaritySlider.value = 0.75;
    similarityValue.textContent = '0.75';
  });

  // =========================================================================
  // 6. Speech Generation (POST /api/generate-speech)
  // =========================================================================

  generateBtn.addEventListener('click', async () => {
    hideAlert();
    const text = textInput.value.trim();

    if (!text) {
      showAlert('Input Required', 'Please enter or paste some text before generating speech.', 'warning');
      textInput.focus();
      return;
    }

    const voiceId = voiceSelect.value;
    if (!voiceId) {
      showAlert('Voice Required', 'Please choose a voice from the dropdown.', 'warning');
      return;
    }

    const modelId = modelSelect.value || 'eleven_multilingual_v2';
    const stability = parseFloat(stabilitySlider.value);
    const similarityBoost = parseFloat(similaritySlider.value);

    // Set UI to Generating / Loading State
    setLoadingState(true);

    try {
      const response = await fetch('/api/generate-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          voiceId,
          modelId,
          stability,
          similarityBoost
        })
      });

      if (!response.ok) {
        // Attempt to parse JSON error returned by backend
        let errMessage = `Error ${response.status}: Failed to generate audio.`;
        try {
          const errorData = await response.json();
          errMessage = errorData.error || errorData.details || errMessage;
        } catch {
          const textErr = await response.text();
          if (textErr) errMessage = textErr;
        }
        throw new Error(errMessage);
      }

      // Received successful audio stream/buffer
      const blob = await response.blob();
      currentAudioBlob = blob;

      // Free previous blob URL memory if it exists
      if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl);
      }

      currentAudioUrl = URL.createObjectURL(blob);
      loadGeneratedAudio(currentAudioUrl, blob.size);

      generationStatus.textContent = 'Speech generated successfully!';
    } catch (err) {
      console.error('TTS Generation Error:', err);
      showAlert('Generation Failed', err.message, 'error');
      generationStatus.textContent = 'Error occurred during generation.';
    } finally {
      setLoadingState(false);
    }
  });

  function setLoadingState(isLoading) {
    if (isLoading) {
      generateBtn.disabled = true;
      loadingSpinner.classList.remove('hidden');
      generationStatus.textContent = 'Synthesizing audio with ElevenLabs...';
    } else {
      generateBtn.disabled = false;
      loadingSpinner.classList.add('hidden');
    }
  }

  // =========================================================================
  // 7. Audio Player Controls & Handling
  // =========================================================================

  function loadGeneratedAudio(url, sizeInBytes) {
    audioElement.src = url;
    resultSection.classList.remove('hidden');

    const kbSize = (sizeInBytes / 1024).toFixed(1);
    audioMetaSize.textContent = `Generated MP3 file (${kbSize} KB)`;

    // Scroll smoothly to player
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Autoplay the newly generated narration
    audioElement.play().catch(e => {
      console.log('Autoplay deferred until user interaction:', e);
    });
  }

  // Play / Pause Button
  playPauseBtn.addEventListener('click', () => {
    if (audioElement.paused || audioElement.ended) {
      audioElement.play();
    } else {
      audioElement.pause();
    }
  });

  audioElement.addEventListener('play', () => {
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    waveformAnim.classList.add('active');
  });

  audioElement.addEventListener('pause', () => {
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    waveformAnim.classList.remove('active');
  });

  audioElement.addEventListener('ended', () => {
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    waveformAnim.classList.remove('active');
    progressBar.style.width = '0%';
    currentTimeEl.textContent = '00:00';
  });

  // Track progress and update timer
  audioElement.addEventListener('timeupdate', () => {
    if (!audioElement.duration) return;
    const progressPercent = (audioElement.currentTime / audioElement.duration) * 100;
    progressBar.style.width = `${progressPercent}%`;
    currentTimeEl.textContent = formatTime(audioElement.currentTime);
  });

  audioElement.addEventListener('loadedmetadata', () => {
    totalDurationEl.textContent = formatTime(audioElement.duration);
    currentTimeEl.textContent = '00:00';
  });

  // Scrub / Seek Progress Bar
  progressWrap.addEventListener('click', (e) => {
    if (!audioElement.duration) return;
    const rect = progressWrap.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    audioElement.currentTime = ratio * audioElement.duration;
  });

  // Volume Slider
  volumeSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    audioElement.volume = val;
    isMuted = val === 0;
    updateVolumeIcon(val);
  });

  // Mute / Unmute
  volumeMuteBtn.addEventListener('click', () => {
    if (isMuted) {
      audioElement.volume = previousVolume || 1;
      volumeSlider.value = audioElement.volume;
      isMuted = false;
    } else {
      previousVolume = audioElement.volume;
      audioElement.volume = 0;
      volumeSlider.value = 0;
      isMuted = true;
    }
    updateVolumeIcon(audioElement.volume);
  });

  function updateVolumeIcon(vol) {
    if (vol === 0) {
      volumeMuteBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="1" y1="1" x2="23" y2="23"></line>
          <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
          <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
        </svg>`;
    } else {
      volumeMuteBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>`;
    }
  }

  // Format seconds to mm:ss
  function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // =========================================================================
  // 8. Audio Download
  // =========================================================================

  downloadBtn.addEventListener('click', () => {
    if (!currentAudioUrl) return;

    const selectedVoiceOption = voiceSelect.selectedOptions[0];
    const voiceName = selectedVoiceOption ? (selectedVoiceOption.dataset.name || 'voice') : 'voice';
    const sanitizedVoice = voiceName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `elevenlabs-narration-${sanitizedVoice}-${timestamp}.mp3`;

    const a = document.createElement('a');
    a.href = currentAudioUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  // =========================================================================
  // 9. Initial App Boot
  // =========================================================================

  async function init() {
    updateTextStats();
    await checkServerHealth();
    await loadModels();
    await loadVoices();
  }

  init();
});
