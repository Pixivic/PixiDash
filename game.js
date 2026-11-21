(() => {
  "use strict";

  const { Runner, TILE, HEIGHT, STEP, groundFrame } = globalThis.PixiDash;
  const stage = document.querySelector(".game");
  const scene = document.querySelector(".scene");
  const canvas = document.querySelector("#world");
  const context = canvas.getContext("2d", { alpha: false });
  const intro = document.querySelector("#intro");
  const title = document.querySelector("#title");
  const menuMask = document.createElement("canvas");
  const menuMaskContext = menuMask.getContext("2d");
  const menuMaskTiles = [];
  const titleLogo = document.querySelector("#title-logo");
  const startButton = document.querySelector("#start");
  const crtButton = document.querySelector("#crt-toggle");
  const musicButton = document.querySelector("#music-toggle");
  const soundButton = document.querySelector("#sound-toggle");
  const creditsButton = document.querySelector("#credits-button");
  const credits = document.querySelector("#credits");
  const closeCreditsButton = document.querySelector("#close-credits");
  const result = document.querySelector("#result");
  const continueButton = document.querySelector("#continue");
  const returnWipe = document.querySelector("#return-wipe");
  const wipeContext = returnWipe.getContext("2d");
  const ditherTile = document.createElement("canvas");
  ditherTile.width = ditherTile.height = 8;
  const tileContext = ditherTile.getContext("2d");
  const ditherPixels = tileContext.createImageData(ditherTile.width, ditherTile.height);
  const score = document.querySelector("#score");
  const scoreValue = document.querySelector("#score-value");
  const finalScore = document.querySelector("#final-score");
  const breath = document.querySelector("#breath");
  const breathCopy = breath.querySelector("span");
  const breathText = breath.dataset.text;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const jumpKeys = new Set(["Space", "ArrowUp", "KeyW"]);
  const breathDelay = 0.18;
  const breathLetterTime = 0.06;
  const breathHold = 0.65;
  const breathEraseTime = 0.045;
  const introDitherDuration = 0.48;
  const titleDitherDuration = 0.42;
  const creditsDitherDuration = 0.56;
  const resultDitherDuration = 0.34;
  const wipeDuration = 0.2;
  const deathScreenDelay = 0.84;
  const shortDeathScreenDelay = 0.28;
  const shakeDuration = 0.32;
  const flashRise = 0.045;
  const flashDuration = 0.23;
  const bayerThresholds = [
     0, 48, 12, 60,  3, 51, 15, 63,
    32, 16, 44, 28, 35, 19, 47, 31,
     8, 56,  4, 52, 11, 59,  7, 55,
    40, 24, 36, 20, 43, 27, 39, 23,
     2, 50, 14, 62,  1, 49, 13, 61,
    34, 18, 46, 30, 33, 17, 45, 29,
    10, 58,  6, 54,  9, 57,  5, 53,
    42, 26, 38, 22, 41, 25, 37, 21,
  ];
  const cloudSpeed = 7;
  const assetsPath = "Pixidash assets/";
  const audioPath = assetsPath + "audio/";
  const menuTrack = "Kevin MacLeod - Pixelland.mp3";
  const runTrack = "Jeremy Blake - Powerup!.mp3";
  const gameOverTrack = "Game Over.mp3";
  const music = new Audio();
  music.loop = true;
  music.volume = 0.4;
  const sounds = {
    jump: new Audio(audioPath + "jump.WAV"),
    dead: new Audio(audioPath + "dead.WAV"),
  };
  sounds.jump.volume = 0.55;
  sounds.jump.preservesPitch = false;
  sounds.dead.volume = 0.65;

  const artFiles = {
    sky: "Backgrounds/Background-1.png",
    mountains: "Backgrounds/Background-2.png",
    clouds: "Backgrounds/Background-3.png",
    trees: "Backgrounds/Background-4.png",
    runner: "Pixivic-Run.png",
    death: "Pixivic-death.png",
    grass: "Grass-Tiles.png",
    bushes: "bushes.png",
    spikes: "Spikes.png",
    bee: "Bee-fly.png",
    beeTransition: "Bee-transition.png",
    engaged: "Bee-fly-engage.png",
    boar: "boar.png",
    pad: "Jump-Pad.png",
    sprung: "Jump-Pad-activate.png",
    signs: "Jump-Pad-Signage.png",
  };

  let art;
  let game;
  let previousTime = 0;
  let accumulator = 0;
  let introStarted = false;
  let introTime = 0;
  let displayedMode = "";
  let creditsOpen = false;
  let creditsProgress = 0;
  let displayedScore = -1;
  let breathStart = null;
  let returnTime = null;
  let wipeProgress = 0;
  let cloudDrift = 0;
  let pointer = null;
  const keyboard = new Set();

  function readSetting(key) {
    try {
      return localStorage.getItem("pixidash." + key);
    } catch {
      return null;
    }
  }

  function saveSetting(key, enabled) {
    try {
      localStorage.setItem("pixidash." + key, enabled ? "on" : "off");
    } catch {
      console.warn("PixiDash couldn't save the " + key + " setting. It applies until reload.");
    }
  }

  function toggleEnabled(button) {
    return button.getAttribute("aria-pressed") === "true";
  }

  function labelToggle(button, enabled) {
    button.setAttribute("aria-pressed", String(enabled));
    button.textContent = button.getAttribute("aria-label") + (enabled ? ": ON" : ": OFF");
  }

  function bindToggle(button, key, apply) {
    const saved = readSetting(key);
    if (saved === "on" || saved === "off") labelToggle(button, saved === "on");
    apply(toggleEnabled(button));
    button.addEventListener("click", () => {
      if (returnTime !== null || title.inert) return;
      const enabled = !toggleEnabled(button);
      labelToggle(button, enabled);
      saveSetting(key, enabled);
      apply(enabled);
    });
  }

  function reportPlaybackError(error) {
    if (error.name === "NotAllowedError" || error.name === "AbortError") return;
    console.warn("PixiDash audio playback failed:", error.name);
  }

  function syncMusic() {
    const waitingForResult = game?.mode === "dead" && displayedMode !== "dead";
    if (!introStarted || !toggleEnabled(musicButton) || document.hidden || waitingForResult) {
      music.pause();
      return;
    }
    let track = menuTrack;
    if (game?.mode === "dead") track = gameOverTrack;
    else if (game && game.mode !== "title") track = runTrack;
    const source = audioPath + track;
    if (music.getAttribute("src") !== source) music.src = source;
    if (music.paused) music.play().catch(reportPlaybackError);
  }

  function playSound(name) {
    if (!toggleEnabled(soundButton) || document.hidden) return;
    const sound = sounds[name];
    if (name === "jump") sound.playbackRate = 0.9 + Math.random() * 0.2;
    sound.currentTime = 0;
    sound.play().catch(reportPlaybackError);
  }

  function loadArt() {
    return Promise.all(Object.entries(artFiles).map(([key, name]) => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve([key, img]);
      img.onerror = () => reject(new Error("Couldn't load " + name));
      img.src = assetsPath + name;
    }))).then(Object.fromEntries);
  }

  function gamePixelScale(height, ratio) {
    return Math.max(1, Math.round(height * ratio / HEIGHT));
  }

  function fitTitleLogo({ left, top, width, height }) {
    const { naturalWidth, naturalHeight } = titleLogo;
    if (!naturalWidth) return;

    const ratio = window.devicePixelRatio;
    const compact = width < 720 && height >= 400;
    const topMargin = compact ? 116 : 8;
    const gameScale = gamePixelScale(height, ratio);
    const introScale = Math.floor(Math.min(width * 0.88 / naturalWidth, height * 0.6 / naturalHeight) * ratio);
    if (introScale > 0) {
      intro.style.setProperty("--intro-logo-width", naturalWidth * Math.min(gameScale, introScale) / ratio + "px");
    } else {
      intro.style.removeProperty("--intro-logo-width");
    }
    const maxWidth = compact ? width * 0.88 : width - 2 * Math.min(196, width * 0.21);
    const maxHeight = height * (compact ? 0.54 : 0.43) - topMargin;
    const fittingScale = Math.floor(Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight) * ratio);
    const scale = Math.min(gameScale, fittingScale);
    titleLogo.hidden = scale < 1;
    if (titleLogo.hidden) return;

    const logoWidth = naturalWidth * scale / ratio;
    const logoHeight = naturalHeight * scale / ratio;
    const x = left + (width - logoWidth) / 2;
    const y = top + Math.max(topMargin, height / 5 - logoHeight / 2);
    titleLogo.style.width = logoWidth + "px";
    const logoTop = Math.round(y * ratio) / ratio - top;
    titleLogo.style.left = Math.round(x * ratio) / ratio - left + "px";
    titleLogo.style.top = logoTop + "px";
    title.style.setProperty("--logo-bottom", logoTop + logoHeight + "px");
  }

  function sizeWipe({ left, top, width, height }) {
    const ratio = window.devicePixelRatio;
    const pixelSize = gamePixelScale(height, ratio) / ratio;
    const x = Math.floor(left * ratio) / ratio - left;
    const y = Math.floor(top * ratio) / ratio - top;
    returnWipe.width = Math.ceil((width - x) / pixelSize);
    returnWipe.height = Math.ceil((height - y) / pixelSize);
    returnWipe.style.left = x + "px";
    returnWipe.style.top = y + "px";
    returnWipe.style.width = returnWipe.width * pixelSize + "px";
    returnWipe.style.height = returnWipe.height * pixelSize + "px";
    if (returnTime !== null) drawWipe(wipeProgress);
  }

  function sizeMenuMasks({ left, top, height }) {
    const ratio = window.devicePixelRatio;
    const scale = gamePixelScale(height, ratio);
    const pixels = ditherTile.width * scale;
    scene.style.setProperty("--game-pixel", scale / ratio + "px");
    const x = Math.floor(left * ratio) / ratio - left;
    const y = Math.floor(top * ratio) / ratio - top;
    scene.style.setProperty("--menu-mask-position", x + "px " + y + "px");
    if (menuMask.width === pixels && menuMask.height === pixels) return;
    menuMask.width = menuMask.height = pixels;
    menuMaskTiles.length = 0;
    if (game) syncTitle(game.mode);
  }

  function fitOverlays(bounds) {
    fitTitleLogo(bounds);
    if (scene.classList.contains("crt-on")) resizeCrt(bounds);
    sizeMenuMasks(bounds);
    sizeWipe(bounds);
  }

  function resize() {
    const bounds = scene.getBoundingClientRect();
    const { width, height } = bounds;
    if (height === 0) return;
    fitOverlays(bounds);
    const canvasWidth = Math.round(width * HEIGHT / height);
    if (canvas.width !== canvasWidth) canvas.width = canvasWidth;
    context.imageSmoothingEnabled = false;
    game?.resize(canvasWidth);
  }

  function sprite(img, sx, sy, width, height, x, y) {
    context.drawImage(img, sx, sy, width, height, Math.round(x), Math.round(y), width, height);
  }

  function drawPose({ frame, x, y, flipped }, camera) {
    const screenX = x - camera;
    const image = art[frame.sheet];
    if (!flipped) {
      sprite(image, frame.sx, frame.sy, frame.width, frame.height, screenX, y);
      return;
    }
    context.save();
    context.translate(screenX + frame.width, y);
    context.scale(-1, 1);
    sprite(image, frame.sx, frame.sy, frame.width, frame.height, 0, 0);
    context.restore();
  }

  function drawLayer(img, position) {
    const offset = Math.floor(position) % img.width;
    for (let x = -offset - img.width; x < canvas.width + 8; x += img.width) {
      context.drawImage(img, x, HEIGHT - img.height);
    }
  }

  function drawGround(platform, camera) {
    const start = Math.max(platform.x, Math.floor(camera / TILE) * TILE - TILE);
    const end = Math.min(platform.end, camera + canvas.width + TILE);
    for (let x = start; x < end; x += TILE) {
      for (let y = platform.y; y < HEIGHT; y += TILE) {
        const frame = groundFrame(platform, x, y);
        sprite(art.grass, frame.sx, frame.sy, TILE, TILE, x - camera, y);
      }
    }
  }

  function drawObjects(platform, camera) {
    const { y, bushes, pad, spike, boar } = platform;
    for (const bush of bushes) {
      const width = bush.big ? 32 : 16;
      const sourceX = bush.big ? 32 + bush.variant * width : bush.variant * width;
      sprite(art.bushes, sourceX, bush.flower * 32, width, 32, bush.x - camera, y - 32);
    }

    if (pad) {
      const frame = game.padFrame(pad);
      sprite(art.signs, 0, 0, 48, 32, pad.x - TILE - camera, y - 31);
      sprite(pad.used < 0 ? art.pad : art.sprung, frame * TILE, 0, TILE, 32, pad.x - camera, y - 31);
    }
    if (spike) drawPose(game.spikePose(spike), camera);
    if (boar) drawPose(game.boarPose(boar), camera);
  }

  function drawBees(camera) {
    for (const platform of game.terrain.platforms) {
      const { bee } = platform;
      if (!bee || bee.x < camera - 24 || bee.x > camera + canvas.width + 24) continue;
      drawPose(game.beePose(platform), camera);
    }
  }

  function syncBreath() {
    const { mode, player, time, camera } = game;
    if (mode !== "running") {
      breathStart = null;
      breath.hidden = true;
      return;
    }

    breathStart ??= time + breathDelay;
    const elapsed = time - breathStart;
    if (elapsed < 0) return;

    const still = reducedMotion.matches;
    const count = breathText.length;
    const typingTime = still ? 0 : (count - 1) * breathLetterTime;
    const eraseTime = elapsed - typingTime - breathHold;
    let letters = still ? count : Math.min(count, 1 + Math.floor(elapsed / breathLetterTime));
    if (eraseTime >= 0) {
      letters = still ? 0 : Math.max(0, count - 1 - Math.floor(eraseTime / breathEraseTime));
    }

    const text = breathText.slice(0, letters);
    if (breathCopy.textContent !== text) breathCopy.textContent = text;
    breath.hidden = letters === 0;
    if (breath.hidden) return;
    breath.style.setProperty("--breath-x", (player.x - camera + 4.5) / canvas.width * 100 + "%");
    breath.style.setProperty("--breath-y", (player.feet - 44) / HEIGHT * 100 + "%");
  }

  function drawImpactFlash(time) {
    if (time >= flashDuration) return;
    const intensity = time < flashRise ? time / flashRise : (flashDuration - time) / (flashDuration - flashRise);
    const level = Math.round(intensity * bayerThresholds.length);
    if (!level) return;
    for (let i = 0; i < bayerThresholds.length; i++) {
      ditherPixels.data.set([255, 28, 43, bayerThresholds[i] < level ? 108 : 0], i * 4);
    }
    tileContext.putImageData(ditherPixels, 0, 0);
    context.fillStyle = context.createPattern(ditherTile, "repeat");
    context.fillRect(0, 0, canvas.width, HEIGHT);
  }

  function render() {
    const camera = Math.floor(game.camera);
    const showImpact = game.mode === "dead" && !reducedMotion.matches;
    const shake = showImpact ? Math.max(0, 1 - game.deathTime / shakeDuration) : 0;
    context.fillStyle = "#063c3c";
    context.fillRect(0, 0, canvas.width, HEIGHT);
    context.save();
    if (shake) {
      context.translate(Math.round(Math.sin(game.deathTime * 151 + 0.8) * shake * 9),
        Math.round(Math.cos(game.deathTime * 127) * shake * 6));
    }
    drawLayer(art.sky, 0);
    drawLayer(art.mountains, game.camera * 0.13);
    drawLayer(art.clouds, game.camera * 0.24 + cloudDrift);
    drawLayer(art.trees, game.camera * 0.53);

    drawBees(camera);
    for (const platform of game.terrain.platforms) {
      if (platform.end < camera - TILE || platform.x > camera + canvas.width + TILE) continue;
      drawGround(platform, camera);
      drawObjects(platform, camera);
    }
    if (game.mode !== "title") drawPose(game.playerPose(), camera);
    context.restore();
    if (showImpact) drawImpactFlash(game.deathTime);
    if (scene.classList.contains("crt-on")) globalThis.PixiCRT.draw(canvas);
  }

  function makeMenuMask(level) {
    const side = ditherTile.width;
    const pixel = menuMask.width / side;
    menuMaskContext.clearRect(0, 0, menuMask.width, menuMask.height);
    menuMaskContext.fillStyle = "#fff";
    for (let i = 0; i < bayerThresholds.length; i++) {
      if (bayerThresholds[i] < level) continue;
      menuMaskContext.fillRect(i % side * pixel, Math.floor(i / side) * pixel, pixel, pixel);
    }
    return 'url("' + menuMask.toDataURL() + '")';
  }

  function setMenuMask(overlay, fade) {
    const level = Math.round(fade * bayerThresholds.length);
    if (level === 0) {
      if (overlay.style.maskImage) overlay.style.removeProperty("mask-image");
      return;
    }
    const mask = menuMaskTiles[level] ??= makeMenuMask(level);
    if (overlay.style.maskImage !== mask) overlay.style.maskImage = mask;
  }

  function advanceIntro(elapsed) {
    if (!introStarted || intro.hidden || !game) return;
    introTime += elapsed;
    const progress = reducedMotion.matches ? 1 : Math.min(1, introTime / introDitherDuration);
    intro.hidden = progress === 1;
    setMenuMask(intro, intro.hidden ? 0 : progress);
    if (intro.hidden) {
      syncTitle(game.mode);
      startButton.focus();
    }
  }

  function enterSite() {
    if (introStarted) return;
    introStarted = true;
    intro.inert = true;
    syncMusic();
    advanceIntro(0);
  }

  function syncTitle(mode) {
    const leaving = mode === "entering" && !reducedMotion.matches && game.time < titleDitherDuration;
    const showTitle = mode === "title" && creditsProgress < 0.5;
    const showCredits = mode === "title" && creditsProgress > 0.5;
    title.inert = !intro.hidden || leaving || creditsOpen || creditsProgress > 0;
    title.hidden = !showTitle && !leaving;
    credits.hidden = !showCredits;
    credits.inert = !showCredits || !creditsOpen;
    const titleFade = leaving ? game.time / titleDitherDuration : showTitle ? 2 * creditsProgress : 0;
    setMenuMask(title, titleFade);
    setMenuMask(credits, showCredits ? 2 * (1 - creditsProgress) : 0);
  }

  function advanceCredits(elapsed) {
    const target = creditsOpen ? 1 : 0;
    const step = elapsed / creditsDitherDuration;
    creditsProgress = reducedMotion.matches ? target : creditsOpen
      ? Math.min(1, creditsProgress + step)
      : Math.max(0, creditsProgress - step);
    syncTitle("title");
    if (creditsProgress === target) {
      (creditsOpen ? closeCreditsButton : creditsButton).focus();
    }
  }

  function openCredits(event) {
    if (game?.mode !== "title" || returnTime !== null || title.inert) return;
    event.stopPropagation();
    creditsOpen = true;
    advanceCredits(0);
    syncMusic();
  }

  function closeCredits() {
    creditsOpen = false;
    advanceCredits(0);
  }

  function syncInterface() {
    const resultDelay = reducedMotion.matches || game.cause === "fall" ? shortDeathScreenDelay : deathScreenDelay;
    const mode = game.mode === "dead" && game.deathTime < resultDelay ? "dying" : game.mode;
    const modeChanged = displayedMode !== mode;
    const keyboardFocus = modeChanged && (document.activeElement === startButton || document.activeElement === continueButton);
    if (modeChanged || (mode === "entering" && !title.hidden)) syncTitle(mode);
    if (modeChanged) {
      score.hidden = mode !== "running";
      result.hidden = mode !== "dead";
      if (mode === "dead") {
        finalScore.textContent = "Score " + game.score;
        if (keyboardFocus) continueButton.focus();
      }
      if (mode === "title" && keyboardFocus) startButton.focus();
      displayedMode = mode;
      syncMusic();
    }
    const resultFade = mode === "dead" && !reducedMotion.matches
      ? Math.max(0, 1 - (game.deathTime - resultDelay) / resultDitherDuration) : 0;
    setMenuMask(result, resultFade);
    if (displayedScore !== game.score) {
      scoreValue.textContent = game.score;
      displayedScore = game.score;
    }
  }

  function drawWipe(progress) {
    wipeProgress = progress;
    const { width, height } = returnWipe;
    const covering = progress <= 1;
    const slant = Math.round(Math.min(width * 0.25, height * 0.68));
    const front = Math.floor((covering ? progress : progress - 1) * (width + slant));
    wipeContext.clearRect(0, 0, width, height);
    wipeContext.fillStyle = "#000";
    for (let y = 0; y < height; y++) {
      const edge = front - Math.round(slant * (1 - (y + 1) / height));
      const x = Math.min(width, Math.max(0, edge));
      if (covering) wipeContext.fillRect(0, y, x, 1);
      else wipeContext.fillRect(x, y, width - x, 1);
    }
  }

  function syncReturn(elapsed) {
    if (returnTime === null) return;
    returnTime += elapsed;
    const progress = returnTime / wipeDuration;
    if (reducedMotion.matches || progress >= 2) {
      if (game.mode === "dead") game.reset();
      returnWipe.hidden = true;
      returnTime = null;
      return;
    }
    if (progress >= 1 && game.mode === "dead") {
      drawWipe(1);
      game.reset();
      return;
    }
    drawWipe(progress);
  }

  function tick(now) {
    const elapsed = previousTime ? Math.min((now - previousTime) / 1000, 0.1) : 0;
    previousTime = now;
    if (!document.hidden) {
      if (game.mode !== "dead" && !reducedMotion.matches) {
        cloudDrift = (cloudDrift + elapsed * cloudSpeed) % art.clouds.width;
      }
      accumulator += elapsed;
      while (accumulator >= STEP) {
        game.update(STEP);
        accumulator -= STEP;
      }
      advanceIntro(elapsed);
      if (creditsProgress !== Number(creditsOpen)) advanceCredits(elapsed);
      syncReturn(elapsed);
      syncInterface();
      syncBreath();
      render();
    }
    requestAnimationFrame(tick);
  }

  function menuAction() {
    if (!game || !intro.hidden || returnTime !== null || creditsOpen || creditsProgress > 0) return;
    if (game.mode === "title") game.start();
    else if (game.mode === "dead" && !result.hidden) {
      if (reducedMotion.matches) {
        game.reset();
      } else {
        returnTime = 0;
        drawWipe(0);
        returnWipe.hidden = false;
      }
    }
    syncInterface();
  }

  function resizeCrt({ height }) {
    globalThis.PixiCRT.resize(height, window.devicePixelRatio);
  }

  function setCrtFilter(enabled) {
    if (enabled) resizeCrt(scene.getBoundingClientRect());
    scene.classList.toggle("crt-on", enabled);
  }

  function stopTouch(event) {
    if (pointer !== event.pointerId) return;
    pointer = null;
    if (keyboard.size === 0) game.releaseJump();
  }

  function clearControls() {
    keyboard.clear();
    pointer = null;
    game?.releaseJump();
    previousTime = 0;
    accumulator = 0;
  }

  startButton.addEventListener("click", menuAction);
  continueButton.addEventListener("click", menuAction);
  creditsButton.addEventListener("click", openCredits);
  stage.addEventListener("click", () => {
    if (!intro.hidden) {
      enterSite();
      return;
    }
    if (creditsOpen && !credits.hidden) closeCredits();
    syncMusic();
  });
  titleLogo.addEventListener("load", () => fitTitleLogo(scene.getBoundingClientRect()));
  window.addEventListener("resize", resize);
  bindToggle(crtButton, "crt", setCrtFilter);
  bindToggle(musicButton, "music", syncMusic);
  bindToggle(soundButton, "sound", (enabled) => {
    if (!enabled) {
      sounds.jump.pause();
      sounds.dead.pause();
    }
  });
  stage.addEventListener("pointerdown", (event) => {
    if (!game || !intro.hidden || event.button !== 0 || event.target.closest("button")) return;
    event.preventDefault();
    if (game.mode === "title" || game.mode === "dead") {
      menuAction();
    } else if (pointer === null) {
      pointer = event.pointerId;
      stage.setPointerCapture(event.pointerId);
      game.pressJump();
    }
  });
  window.addEventListener("pointerup", stopTouch);
  window.addEventListener("pointercancel", stopTouch);
  stage.addEventListener("lostpointercapture", stopTouch);
  window.addEventListener("keydown", (event) => {
    if (!intro.hidden) {
      if (!event.repeat && !event.altKey && !event.ctrlKey && !event.metaKey
        && (event.code === "Enter" || event.code === "Space")) {
        event.preventDefault();
        enterSite();
      }
      return;
    }
    if (!event.repeat) syncMusic();
    if (creditsOpen || creditsProgress > 0) {
      if (event.code === "Escape" && creditsOpen) {
        event.preventDefault();
        closeCredits();
      }
      return;
    }
    if ((event.code === "Enter" || event.code === "Space") && event.target.closest?.(".title-controls")) return;
    if (!game || (!jumpKeys.has(event.code) && event.code !== "Enter")) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.code === "Enter" && (game.mode === "running" || game.mode === "entering")) return;
    event.preventDefault();
    if (event.repeat || returnTime !== null) return;
    if (game.mode === "title" || game.mode === "dead") {
      menuAction();
    } else if (keyboard.size === 0 && pointer === null) {
      game.pressJump();
    }
    if (jumpKeys.has(event.code)) keyboard.add(event.code);
  });
  window.addEventListener("keyup", (event) => {
    if (!keyboard.delete(event.code)) return;
    if (keyboard.size === 0 && pointer === null) game.releaseJump();
  });
  window.addEventListener("blur", clearControls);
  document.addEventListener("visibilitychange", () => {
    clearControls();
    syncMusic();
  });

  loadArt().then((images) => {
    art = images;
    resize();
    game = new Runner(canvas.width, Math.random, playSound);
    startButton.disabled = false;
    startButton.textContent = "Start Dashin'";
    new ResizeObserver(resize).observe(scene);
    render();
    requestAnimationFrame(tick);
  }).catch((error) => {
    intro.querySelector("span").textContent = error.message;
  });
})();
