(() => {
  "use strict";

  const els = {
    settingsBtn: document.getElementById("settingsBtn"),
    closeSettingsBtn: document.getElementById("closeSettingsBtn"),
    menuBackdrop: document.getElementById("menuBackdrop"),
    settingsMenu: document.getElementById("settingsMenu"),
    startBtn: document.getElementById("startBtn"),
    resetBtn: document.getElementById("resetBtn"),
    testBtn: document.getElementById("testBtn"),
    muteBtn: document.getElementById("muteBtn"),
    dogSprite: document.getElementById("dogSprite"),
    dogStage: document.getElementById("dogStage"),
    statusPill: document.getElementById("statusPill"),
    currentValue: document.getElementById("currentValue"),
    peakValue: document.getElementById("peakValue"),
    meterFill: document.getElementById("meterFill"),
    warningLine: document.getElementById("warningLine"),
    alarmLine: document.getElementById("alarmLine"),
    warningSlider: document.getElementById("warningSlider"),
    alarmSlider: document.getElementById("alarmSlider"),
    sensitivitySlider: document.getElementById("sensitivitySlider"),
    warningOut: document.getElementById("warningOut"),
    alarmOut: document.getElementById("alarmOut"),
    sensitivityOut: document.getElementById("sensitivityOut"),
    permissionNote: document.getElementById("permissionNote")
  };

  const sprites = {
    sleeping: "assets/dog-sleeping.png",
    disturbed: "assets/dog-disturbed.png",
    awake: "assets/dog-awake.png"
  };

  Object.values(sprites).forEach(src => {
    const image = new Image();
    image.src = src;
  });

  const settings = loadSettings();
  let audioContext = null;
  let analyser = null;
  let micStream = null;
  let micSource = null;
  let timeData = null;
  let rafId = 0;
  let running = false;
  let muted = false;
  let alarmActive = false;
  let alarmLoop = 0;
  let alarmSince = 0;
  let quietSince = 0;
  let smoothedVolume = 0;
  let peakVolume = 0;
  let currentMood = "sleeping";

  const ALARM_HOLD_MS = 650;
  const ALARM_RELEASE_MS = 1300;

  els.warningSlider.value = settings.warning;
  els.alarmSlider.value = settings.alarm;
  els.sensitivitySlider.value = settings.sensitivity;
  updateThresholdUI();
  updateVolumeUI(0);

  els.settingsBtn.addEventListener("click", openSettings);
  els.closeSettingsBtn.addEventListener("click", closeSettings);
  els.menuBackdrop.addEventListener("click", closeSettings);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeSettings();
  });

  els.dogStage.addEventListener("click", () => {
    if (running) stopListening();
    else startListening();
  });

  els.dogStage.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (running) stopListening();
      else startListening();
    }
  });

  els.startBtn.addEventListener("click", () => {
    if (running) stopListening();
    else startListening();
  });

  els.resetBtn.addEventListener("click", () => {
    peakVolume = 0;
    els.peakValue.textContent = "0";
  });

  els.testBtn.addEventListener("click", () => {
    ensureAudioContext().then(() => {
      setMood("awake", "Alarm test", "alarm");
      playAlarmBurst();
      setTimeout(() => {
        if (!alarmActive) {
          if (running) setMood("sleeping", "Listening", "listening");
          else setMood("sleeping", "Tap dog to start", "");
        }
      }, 1500);
    });
  });

  els.muteBtn.addEventListener("click", () => {
    muted = !muted;
    els.muteBtn.textContent = muted ? "Unmute Alarm" : "Mute Alarm";
    if (muted) stopAlarmLoop();
  });

  [els.warningSlider, els.alarmSlider, els.sensitivitySlider].forEach(input => {
    input.addEventListener("input", () => {
      if (Number(els.warningSlider.value) >= Number(els.alarmSlider.value)) {
        if (input === els.warningSlider) els.alarmSlider.value = Math.min(100, Number(els.warningSlider.value) + 5);
        if (input === els.alarmSlider) els.warningSlider.value = Math.max(10, Number(els.alarmSlider.value) - 5);
      }
      settings.warning = Number(els.warningSlider.value);
      settings.alarm = Number(els.alarmSlider.value);
      settings.sensitivity = Number(els.sensitivitySlider.value);
      saveSettings();
      updateThresholdUI();
    });
  });

  function openSettings() {
    els.settingsMenu.classList.add("open");
    els.settingsMenu.setAttribute("aria-hidden", "false");
    els.settingsBtn.setAttribute("aria-expanded", "true");
    els.menuBackdrop.hidden = false;
  }

  function closeSettings() {
    els.settingsMenu.classList.remove("open");
    els.settingsMenu.setAttribute("aria-hidden", "true");
    els.settingsBtn.setAttribute("aria-expanded", "false");
    els.menuBackdrop.hidden = true;
  }

  async function startListening() {
    try {
      await ensureAudioContext();
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.25;
      timeData = new Uint8Array(analyser.fftSize);
      micSource = audioContext.createMediaStreamSource(micStream);
      micSource.connect(analyser);
      running = true;
      els.startBtn.textContent = "Stop Listening";
      els.dogStage.setAttribute("aria-label", "Tap to stop microphone listening");
      els.permissionNote.classList.add("hidden");
      setMood("sleeping", "Listening", "listening");
      loop();
    } catch (error) {
      console.error(error);
      setMood("disturbed", "Microphone blocked", "warning");
      els.permissionNote.classList.remove("hidden");
    }
  }

  function stopListening() {
    running = false;
    cancelAnimationFrame(rafId);
    stopAlarmLoop();
    alarmActive = false;
    alarmSince = 0;
    quietSince = 0;
    smoothedVolume = 0;
    if (micSource) micSource.disconnect();
    if (micStream) micStream.getTracks().forEach(track => track.stop());
    micSource = null;
    micStream = null;
    analyser = null;
    timeData = null;
    els.startBtn.textContent = "Start Microphone";
    els.dogStage.setAttribute("aria-label", "Tap to start microphone listening");
    updateVolumeUI(0);
    setMood("sleeping", "Tap dog to start", "");
  }

  async function ensureAudioContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
  }

  function loop(now = performance.now()) {
    if (!running || !analyser || !timeData) return;

    analyser.getByteTimeDomainData(timeData);
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
      const value = (timeData[i] - 128) / 128;
      sum += value * value;
    }

    const rms = Math.sqrt(sum / timeData.length);
    const rawVolume = Math.min(100, rms * settings.sensitivity * 1.85);
    smoothedVolume = smoothedVolume * 0.78 + rawVolume * 0.22;
    const volume = Math.max(0, Math.min(100, smoothedVolume));

    updateVolumeUI(volume);
    updateState(volume, now);

    rafId = requestAnimationFrame(loop);
  }

  function updateVolumeUI(volume) {
    const rounded = Math.round(volume);
    els.currentValue.textContent = String(rounded);
    els.meterFill.style.width = `${rounded}%`;
    if (volume > peakVolume) {
      peakVolume = volume;
      els.peakValue.textContent = String(Math.round(peakVolume));
    }
  }

  function updateState(volume, now) {
    if (volume >= settings.alarm) {
      if (!alarmSince) alarmSince = now;
      quietSince = 0;
      if (now - alarmSince >= ALARM_HOLD_MS) {
        alarmActive = true;
        setMood("awake", "Alarm", "alarm");
        startAlarmLoop();
      }
      return;
    }

    alarmSince = 0;

    if (alarmActive) {
      if (!quietSince) quietSince = now;
      if (now - quietSince >= ALARM_RELEASE_MS) {
        alarmActive = false;
        stopAlarmLoop();
      } else {
        return;
      }
    }

    if (volume >= settings.warning) {
      setMood("disturbed", "Warning", "warning");
    } else {
      setMood("sleeping", "Listening", "listening");
    }
  }

  function setMood(mood, status, statusClass) {
    if (currentMood !== mood) {
      currentMood = mood;
      els.dogSprite.src = sprites[mood];
    }
    els.statusPill.textContent = status;
    els.statusPill.className = "status-pill" + (statusClass ? ` ${statusClass}` : "");
    els.dogStage.className = "scene-frame" + (statusClass ? ` ${statusClass}` : "");
  }

  function startAlarmLoop() {
    if (muted || alarmLoop) return;
    playAlarmBurst();
    alarmLoop = window.setInterval(playAlarmBurst, 900);
  }

  function stopAlarmLoop() {
    if (alarmLoop) {
      clearInterval(alarmLoop);
      alarmLoop = 0;
    }
  }

  function playAlarmBurst() {
    if (muted || !audioContext) return;
    const now = audioContext.currentTime;
    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    gain.connect(audioContext.destination);

    [0, 0.17].forEach(offset => {
      const osc = audioContext.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(740, now + offset);
      osc.frequency.exponentialRampToValueAtTime(520, now + offset + 0.16);
      osc.connect(gain);
      osc.start(now + offset);
      osc.stop(now + offset + 0.16);
    });

    window.setTimeout(() => gain.disconnect(), 650);
  }

  function updateThresholdUI() {
    els.warningOut.textContent = `${settings.warning}%`;
    els.alarmOut.textContent = `${settings.alarm}%`;
    els.sensitivityOut.textContent = `${settings.sensitivity}%`;
    els.warningLine.style.left = `${settings.warning}%`;
    els.alarmLine.style.left = `${settings.alarm}%`;
  }

  function loadSettings() {
    try {
      const stored = JSON.parse(localStorage.getItem("sleepyDogVolumeSettings") || "{}");
      return {
        warning: clamp(Number(stored.warning) || 55, 10, 95),
        alarm: clamp(Number(stored.alarm) || 75, 15, 100),
        sensitivity: clamp(Number(stored.sensitivity) || 130, 60, 220)
      };
    } catch {
      return { warning: 55, alarm: 75, sensitivity: 130 };
    }
  }

  function saveSettings() {
    localStorage.setItem("sleepyDogVolumeSettings", JSON.stringify(settings));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
})();
