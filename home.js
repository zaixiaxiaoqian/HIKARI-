/*
  首页交互脚本：
  1. 读取同目录下的个人信息 txt，并整理成首页资料。
  2. 自动设置头像、image2 流光背景、音频播放器。
  3. 每秒刷新北京时间。
  4. 修复 QQ 复制：公网 HTTP、旧浏览器、剪贴板权限不稳定时都有兜底。
  5. 驱动 Hikari 大字、液态 canvas、光场控制台和鼠标/触摸持续交互。
*/

(function () {
  "use strict";

  const files = window.SITE_FILES || {};
  const VERSION = "20260624-liquid-v3";

  const elements = {
    avatar: document.getElementById("avatarImage"),
    backdrop: document.getElementById("heroBackdrop"),
    name: document.getElementById("profile-name"),
    summary: document.getElementById("profile-summary"),
    details: document.getElementById("profileDetails"),
    qqButton: document.getElementById("copyQqButton"),
    qqNumber: document.getElementById("qqNumber"),
    emailLink: document.getElementById("emailLink"),
    feedback: document.getElementById("copyFeedback"),
    clock: document.getElementById("beijingClock"),
    date: document.getElementById("beijingDate"),
    audioList: document.getElementById("audioList"),
    year: document.getElementById("currentYear"),
    stage: document.getElementById("heroStage"),
    word: document.getElementById("interactiveHikari"),
    portrait: document.getElementById("portraitCard"),
    canvas: document.getElementById("heroCanvas"),
    cursorLight: document.getElementById("cursorLight"),
    modeButtons: Array.from(document.querySelectorAll("[data-hero-mode]")),
    intensity: document.getElementById("lightIntensity"),
    modeLabel: document.getElementById("heroModeLabel"),
    signalName: document.getElementById("signalName"),
    signalQq: document.getElementById("signalQq"),
    signalEmail: document.getElementById("signalEmail"),
    profileFullText: document.getElementById("profileFullText")
  };

  const heroModes = {
    liquid: {
      label: "Liquid Flow",
      accent: "#14f1df",
      warm: "#f5b451",
      lineAlpha: 0.42
    },
    orbit: {
      label: "Orbit Trace",
      accent: "#8ad8ff",
      warm: "#f26f55",
      lineAlpha: 0.34
    },
    focus: {
      label: "Focus Beam",
      accent: "#ffffff",
      warm: "#16c7b8",
      lineAlpha: 0.48
    }
  };

  let currentQq = "";
  let activeHeroMode = "liquid";

  function toFileUrl(fileName) {
    return encodeURI(fileName || "");
  }

  function setText(element, value) {
    if (element) {
      element.textContent = value;
    }
  }

  async function loadProfileText() {
    const textFile = files.profileTextFile;
    if (!textFile) {
      return files.profileTextFallback || "";
    }

    try {
      const response = await fetch(`${toFileUrl(textFile)}?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("个人信息文件读取失败");
      }
      return await response.text();
    } catch (error) {
      return files.profileTextFallback || "";
    }
  }

  function parseProfileText(rawText) {
    const text = (rawText || "").replace(/\r/g, "").trim();
    const cleanedText = text.replace(/^信息\s*[:：]\s*/i, "").trim();
    const biliMatch = cleanedText.match(/(?:b\s*站名|B\s*站名|bilibili|哔哩哔哩)\s*[:：]\s*([^\n]+?)(?=\s+(?:qq|QQ|gmail|Gmail|邮箱|email)\s*[:：]|$)/i);
    const qqMatch = cleanedText.match(/\bqq\s*[:：]\s*(\d{5,12})/i);
    const emailMatch = cleanedText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);

    return {
      displayName: biliMatch ? biliMatch[1].trim() : "希卡里Hikari",
      qq: qqMatch ? qqMatch[1].trim() : "",
      email: emailMatch ? emailMatch[0].trim() : "",
      fullText: cleanedText || text
    };
  }

  function createDetailItem(label, value, meta, className) {
    const item = document.createElement("article");
    item.className = `signal-card ${className || ""}`.trim();
    item.innerHTML = `
      <span class="signal-label"></span>
      <strong class="signal-value"></strong>
      <span class="signal-meta"></span>
    `;
    item.querySelector(".signal-label").textContent = label;
    item.querySelector(".signal-value").textContent = value || "暂未填写";
    item.querySelector(".signal-meta").textContent = meta || "资料项";
    return item;
  }

  function renderProfile(profile) {
    currentQq = profile.qq;
    document.title = `${profile.displayName} | Hikari`;

    setText(elements.name, profile.displayName);
    setText(
      elements.summary,
      "这里是 Hikari 的个人内容界面：资料、音频、视频会随着文件增加持续更新，首页负责把它们整理成一个更完整的展示空间。"
    );
    setText(elements.qqNumber, profile.qq || "暂未填写");
    setText(elements.signalName, profile.displayName);
    setText(elements.signalQq, profile.qq || "暂未填写");
    setText(elements.signalEmail, profile.email || "暂未填写");
    setText(elements.profileFullText, profile.fullText || "个人信息暂未填写。");

    if (elements.qqButton) {
      elements.qqButton.disabled = !profile.qq;
      elements.qqButton.setAttribute("aria-label", profile.qq ? `复制 QQ ${profile.qq}` : "QQ 暂未填写");
    }

    if (elements.emailLink) {
      if (profile.email) {
        elements.emailLink.textContent = profile.email;
        elements.emailLink.href = `mailto:${profile.email}`;
      } else {
        elements.emailLink.textContent = "Gmail 暂未填写";
        elements.emailLink.removeAttribute("href");
      }
    }

    if (elements.details) {
      elements.details.innerHTML = "";
      elements.details.append(
        createDetailItem("B 站名", profile.displayName, "主页识别"),
        createDetailItem("QQ", profile.qq, "可一键复制", "qq-signal"),
        createDetailItem("Gmail", profile.email, "邮件联系"),
        createDetailItem("完整信息", profile.fullText, "来自个人信息.txt", "full-signal")
      );
    }
  }

  function renderAudioList() {
    const audioFiles = Array.isArray(files.audioFiles) ? files.audioFiles : [];
    if (!elements.audioList) {
      return;
    }

    elements.audioList.innerHTML = "";

    if (audioFiles.length === 0) {
      elements.audioList.innerHTML = '<p class="empty-state">暂时还没有音频作品。</p>';
      return;
    }

    audioFiles.forEach((audio, audioIndex) => {
      const item = document.createElement("article");
      item.className = "audio-card";
      item.innerHTML = `
        <div class="audio-copy">
          <span class="audio-index"></span>
          <strong class="audio-title"></strong>
          <span class="audio-description"></span>
        </div>
        <div class="audio-wave" aria-hidden="true">
          <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
        </div>
        <audio controls preload="metadata"></audio>
      `;
      item.querySelector(".audio-index").textContent = String(audioIndex + 1).padStart(2, "0");
      item.querySelector(".audio-title").textContent = audio.title || audio.file;
      item.querySelector(".audio-description").textContent = audio.description || "音频";
      item.querySelector("audio").src = toFileUrl(audio.file);
      elements.audioList.appendChild(item);
    });
  }

  function updateBeijingClock() {
    const now = new Date();
    const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    });
    const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "long"
    });

    setText(elements.clock, timeFormatter.format(now));
    setText(elements.date, dateFormatter.format(now));
  }

  function showCopyFeedback(message, tone) {
    if (!elements.feedback) {
      return;
    }

    elements.feedback.textContent = message;
    elements.feedback.dataset.tone = tone || "ok";
    window.clearTimeout(showCopyFeedback.timer);
    showCopyFeedback.timer = window.setTimeout(() => {
      elements.feedback.textContent = "";
      elements.feedback.removeAttribute("data-tone");
    }, 2200);
  }

  function eventCopyText(text) {
    let eventFired = false;

    function handleCopy(event) {
      event.clipboardData.setData("text/plain", text);
      event.preventDefault();
      eventFired = true;
    }

    document.addEventListener("copy", handleCopy, true);
    const commandResult = document.execCommand("copy");
    document.removeEventListener("copy", handleCopy, true);

    if (!commandResult && !eventFired) {
      throw new Error("copy 事件复制失败");
    }
  }

  function selectionCopyText(text) {
    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.top = "50%";
    input.style.left = "50%";
    input.style.width = "2px";
    input.style.height = "2px";
    input.style.padding = "0";
    input.style.border = "0";
    input.style.outline = "0";
    input.style.color = "transparent";
    input.style.background = "transparent";
    input.style.pointerEvents = "none";
    input.style.transform = "translate(-50%, -50%)";
    input.style.zIndex = "9999";

    document.body.appendChild(input);
    input.focus();
    input.select();
    input.setSelectionRange(0, text.length);

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } finally {
      input.remove();
    }

    if (!copied) {
      throw new Error("浏览器拒绝了兜底复制");
    }
  }

  function fallbackCopyText(text) {
    try {
      eventCopyText(text);
    } catch (eventError) {
      selectionCopyText(text);
    }
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch (error) {
        fallbackCopyText(text);
        return;
      }
    }

    fallbackCopyText(text);
  }

  async function copyQqNumber() {
    if (!currentQq) {
      showCopyFeedback("QQ 暂未填写", "warn");
      return;
    }

    try {
      await copyText(currentQq);
      showCopyFeedback(`已复制 QQ：${currentQq}`, "ok");
      if (elements.qqButton) {
        elements.qqButton.classList.add("is-copied");
        window.clearTimeout(copyQqNumber.timer);
        copyQqNumber.timer = window.setTimeout(() => {
          elements.qqButton.classList.remove("is-copied");
        }, 1600);
      }
    } catch (error) {
      showCopyFeedback("复制失败，请手动选中 QQ 号码", "warn");
    }
  }

  function setHeroMode(mode) {
    const nextMode = heroModes[mode] ? mode : "liquid";
    const config = heroModes[nextMode];
    activeHeroMode = nextMode;
    document.body.dataset.heroMode = nextMode;
    document.body.style.setProperty("--mode-accent", config.accent);
    document.body.style.setProperty("--mode-warm", config.warm);
    setText(elements.modeLabel, config.label);

    elements.modeButtons.forEach((button) => {
      const isActive = button.dataset.heroMode === nextMode;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function initPremiumHero() {
    if (!elements.stage || !elements.word) {
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const letters = Array.from(elements.word.querySelectorAll("span"));
    const state = {
      x: 0.52,
      y: 0.42,
      targetX: 0.52,
      targetY: 0.42,
      intensity: 1,
      time: 0
    };

    function setPointer(clientX, clientY) {
      const rect = elements.stage.getBoundingClientRect();
      state.targetX = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      state.targetY = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    }

    function handlePointerMove(event) {
      setPointer(event.clientX, event.clientY);
    }

    function handleTouchMove(event) {
      if (event.touches && event.touches[0]) {
        setPointer(event.touches[0].clientX, event.touches[0].clientY);
      }
    }

    function cycleMode() {
      const modes = Object.keys(heroModes);
      const index = modes.indexOf(activeHeroMode);
      setHeroMode(modes[(index + 1) % modes.length]);
    }

    elements.stage.addEventListener("pointermove", handlePointerMove);
    elements.stage.addEventListener("touchmove", handleTouchMove, { passive: true });
    elements.stage.addEventListener("pointerleave", () => {
      state.targetX = 0.52;
      state.targetY = 0.42;
    });
    elements.word.addEventListener("click", cycleMode);

    elements.modeButtons.forEach((button) => {
      button.addEventListener("click", () => setHeroMode(button.dataset.heroMode));
    });

    if (elements.intensity) {
      elements.intensity.addEventListener("input", () => {
        state.intensity = Number(elements.intensity.value) || 1;
        document.body.style.setProperty("--scene-intensity", state.intensity.toFixed(2));
      });
      state.intensity = Number(elements.intensity.value) || 1;
      document.body.style.setProperty("--scene-intensity", state.intensity.toFixed(2));
    }

    let canvasContext = null;
    let dpr = 1;

    function resizeCanvas() {
      if (!elements.canvas || reduceMotion) {
        return;
      }

      const rect = elements.stage.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      elements.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      elements.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      elements.canvas.style.width = `${rect.width}px`;
      elements.canvas.style.height = `${rect.height}px`;
      canvasContext = elements.canvas.getContext("2d");
      canvasContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawLiquid(ctx, width, height, time, config) {
      for (let i = 0; i < 15; i += 1) {
        const progress = i / 14;
        const y = height * (0.2 + progress * 0.68);
        const wave = Math.sin(time * 0.0011 + i * 0.72 + state.x * 2.4) * 38 * state.intensity;
        const pull = (state.y - 0.5) * 70 * state.intensity;

        ctx.beginPath();
        ctx.moveTo(-80, y + wave);
        ctx.bezierCurveTo(
          width * 0.24,
          y - 140 + wave + pull,
          width * 0.52,
          y + 130 - wave,
          width + 90,
          y - 20 + Math.cos(time * 0.001 + i) * 52
        );

        const gradient = ctx.createLinearGradient(0, y, width, y);
        gradient.addColorStop(0, `rgba(20, 241, 223, ${0.02 + progress * 0.03})`);
        gradient.addColorStop(0.48, `rgba(255, 255, 255, ${0.09 * config.lineAlpha * state.intensity})`);
        gradient.addColorStop(1, `rgba(245, 180, 81, ${0.08 * (1 - progress)})`);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1 + progress * 4.8;
        ctx.stroke();
      }
    }

    function drawOrbit(ctx, width, height, time) {
      const centerX = width * (0.52 + (state.x - 0.5) * 0.16);
      const centerY = height * (0.48 + (state.y - 0.5) * 0.18);

      for (let i = 0; i < 70; i += 1) {
        const phase = i * 0.61 + time * 0.001;
        const radiusX = width * (0.08 + (i % 9) * 0.018) * state.intensity;
        const radiusY = height * (0.06 + (i % 7) * 0.015) * state.intensity;
        const x = centerX + Math.cos(phase) * radiusX + Math.sin(i) * 18;
        const y = centerY + Math.sin(phase * 1.18) * radiusY + Math.cos(i) * 14;

        ctx.fillStyle = i % 5 === 0 ? "rgba(245, 180, 81, 0.5)" : "rgba(138, 216, 255, 0.38)";
        ctx.fillRect(x, y, i % 5 === 0 ? 3 : 2, i % 5 === 0 ? 3 : 2);
      }
    }

    function drawFocus(ctx, width, height, time) {
      const sourceX = width * state.x;
      const sourceY = height * state.y;

      for (let i = 0; i < 34; i += 1) {
        const angle = (Math.PI * 2 * i) / 34 + Math.sin(time * 0.0008) * 0.16;
        const length = Math.max(width, height) * (0.3 + (i % 8) * 0.055) * state.intensity;
        ctx.beginPath();
        ctx.moveTo(sourceX, sourceY);
        ctx.lineTo(sourceX + Math.cos(angle) * length, sourceY + Math.sin(angle) * length);
        ctx.strokeStyle = i % 4 === 0 ? "rgba(255, 255, 255, 0.22)" : "rgba(22, 199, 184, 0.13)";
        ctx.lineWidth = i % 4 === 0 ? 1.4 : 0.8;
        ctx.stroke();
      }
    }

    function drawCanvas(time) {
      if (!canvasContext || reduceMotion) {
        return;
      }

      const width = elements.canvas.clientWidth;
      const height = elements.canvas.clientHeight;
      const config = heroModes[activeHeroMode];
      canvasContext.clearRect(0, 0, width, height);
      canvasContext.globalCompositeOperation = "lighter";

      drawLiquid(canvasContext, width, height, time, config);
      if (activeHeroMode === "orbit") {
        drawOrbit(canvasContext, width, height, time);
      }
      if (activeHeroMode === "focus") {
        drawFocus(canvasContext, width, height, time);
      }

      canvasContext.globalCompositeOperation = "source-over";
    }

    function animate(time) {
      state.time = time;
      state.x += (state.targetX - state.x) * 0.085;
      state.y += (state.targetY - state.y) * 0.085;

      const tiltX = (state.x - 0.5) * 16 * state.intensity;
      const tiltY = (0.5 - state.y) * 10 * state.intensity;
      const glow = 0.62 + Math.sin(time * 0.0016) * 0.16 + Math.abs(state.x - 0.5) * 0.22;

      document.body.style.setProperty("--pointer-x", `${(state.x * 100).toFixed(2)}%`);
      document.body.style.setProperty("--pointer-y", `${(state.y * 100).toFixed(2)}%`);
      document.body.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`);
      document.body.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`);
      document.body.style.setProperty("--hikari-glow", glow.toFixed(3));
      document.body.style.setProperty("--backdrop-x", `${((state.x - 0.5) * -18).toFixed(2)}px`);
      document.body.style.setProperty("--backdrop-y", `${((state.y - 0.5) * -12).toFixed(2)}px`);

      if (elements.portrait) {
        elements.portrait.style.setProperty("--portrait-x", `${((state.x - 0.5) * -20).toFixed(2)}px`);
        elements.portrait.style.setProperty("--portrait-y", `${((state.y - 0.5) * -16).toFixed(2)}px`);
      }

      letters.forEach((letter, index) => {
        const lift = Math.sin(time * 0.002 + index * 0.78) * 9 * state.intensity + (state.y - 0.5) * -12;
        const twist = Math.cos(time * 0.0015 + index * 0.63) * 5 * state.intensity;
        letter.style.setProperty("--letter-y", `${lift.toFixed(2)}px`);
        letter.style.setProperty("--letter-r", `${twist.toFixed(2)}deg`);
      });

      drawCanvas(time);
      if (!reduceMotion) {
        window.requestAnimationFrame(animate);
      }
    }

    resizeCanvas();
    setHeroMode("liquid");
    window.addEventListener("resize", resizeCanvas);
    window.requestAnimationFrame(animate);
  }

  async function initHomePage() {
    if (!elements.name) {
      return;
    }

    setText(elements.year, new Date().getFullYear());

    if (elements.avatar) {
      elements.avatar.src = toFileUrl(files.avatarImage || "头像.jpg");
    }

    if (elements.backdrop) {
      elements.backdrop.src = `${toFileUrl(files.heroImage || "assets/hikari-liquid-flow-v3.png")}?v=${VERSION}`;
    }

    if (elements.qqButton) {
      elements.qqButton.addEventListener("click", copyQqNumber);
    }

    initPremiumHero();
    updateBeijingClock();
    window.setInterval(updateBeijingClock, 1000);
    renderAudioList();

    const rawProfileText = await loadProfileText();
    renderProfile(parseProfileText(rawProfileText));
  }

  initHomePage();
}());
