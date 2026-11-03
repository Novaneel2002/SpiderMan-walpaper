/**
 * core/loop.js
 * Responsive 16:9 stage layout, adaptive FPS throttling, and main renderFrame animation loop.
 */

/**
 * Recalculates canvas resolution and centered 16:9 responsive card geometry on window resize.
 */
function handleResize() {
  viewWidth = window.innerWidth;
  viewHeight = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 3);

  canvas.width = Math.round(viewWidth * dpr);
  canvas.height = Math.round(viewHeight * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (!grainPattern) {
    createFilmGrainPattern();
  }

  // Centered 16:9 stage with gentle aspect-ratio breathing room so 21:9/16:10 never distort
  const rawScaleX = viewWidth / REF_WIDTH;
  const rawScaleY = viewHeight / REF_HEIGHT;
  uniformScale = Math.min(rawScaleX, rawScaleY);

  // Allow up to 12% gentle spacing expansion on ultrawide/tall monitors while centering the rest
  const layoutScaleX = uniformScale + (rawScaleX - uniformScale) * 0.35;
  const layoutScaleY = uniformScale + (rawScaleY - uniformScale) * 0.35;
  stageOffsetX = (viewWidth - REF_WIDTH * layoutScaleX) * 0.5;
  stageOffsetY = (viewHeight - REF_HEIGHT * layoutScaleY) * 0.5;

  scaledMagnetRadius = config.magnetRadius * uniformScale;
  scaledInnerRadius = INNER_CORE_RADIUS * uniformScale;
  scaledMaxPull = config.maxMagnetPull * uniformScale;

  for (let i = 0; i < CARD_COUNT; i++) {
    const c = cards[i];
    c.cx = stageOffsetX + c.refCx * layoutScaleX;
    c.cy = stageOffsetY + c.refCy * layoutScaleY;
    c.baseW = c.refW * uniformScale;
    c.baseH = c.refH * uniformScale;
    c.baseRadius = c.refRadius * uniformScale;
    if (c.loaded) {
      rebuildCardCache(c);
    }
  }

  if (!spidey.initialized) {
    spidey.perchMode = PERCH_TOP_NORMAL;
    spidey.x = getCardPerchX(spidey.currentCard, spidey.perchMode);
    spidey.y = getCardPerchY(spidey.currentCard, spidey.perchMode);
    spidey.initialized = true;
  }
}

/**
 * Determines whether the scene is actively moving (requires full 60+ FPS)
 * or resting in a calm idle state (throttled to ~30 FPS to save GPU/CPU).
 */
function isSceneHighMotion() {
  if ((isPointerActive && timeSinceMouseMove < 0.6) || spidey.isSwinging || spidey.preJumpTimer > 0 || spidey.flipTimer > 0) return true;
  if (isLmbHeld || activeDragConnIdx >= 0 || trailingWeb.active || spidey.windBlend > 0.02 || spidey.reactionBlend > 0.03 || spidey.landSquash > 0) return true;
  if (clickEffect.active || activeDustCount > 0 || audioEnergy > 0.02) return true;
  for (let i = 0; i < WEB_CONN_POOL_SIZE; i++) {
    const st = webConnState[i];
    if (st === WEB_STATE_FADING || (st === WEB_STATE_ACTIVE && webConnAge[i] < 0.7)) return true;
  }
  for (let i = 0; i < CARD_COUNT; i++) {
    const c = cards[i];
    if (c.loadProgress < 1) return true;
    if (Math.abs(c.scale - c.targetScale) > 0.002) return true;
    if (Math.abs(c.offsetX - c.targetOffsetX) > 0.1 || Math.abs(c.offsetY - c.targetOffsetY) > 0.1) return true;
  }
  return false;
}

/**
 * Frame pacing:
 *  - anything moving / blinking -> every display frame (rAF)
 *  - calm                       -> ~30 fps
 *  - calm for > 4s              -> ~15 fps
 *  - asleep (deep idle) & quiet -> ~8 fps (breathing / Zzz only)
 * Low-rate frames are scheduled with setTimeout so the browser does no work in between.
 */
function getFrameInterval() {
  if (isSceneHighMotion() || spidey.isBlinking) return 0;
  const asleep = spidey.deepIdleBlend > 0.95 && !spidey.isSwinging;
  if (asleep && timeSinceMouseMove > 3) return 125;
  if (timeSinceMouseMove > 4) return 66;
  return 33;
}

function wakeFrameFromTimer() {
  idleTimerId = 0;
  rafId = isPageHidden ? 0 : requestAnimationFrame(renderFrame);
}

function scheduleNextFrame() {
  const interval = getFrameInterval();
  lastFrameInterval = interval;
  if (interval <= 0) {
    rafId = requestAnimationFrame(renderFrame);
  } else {
    rafId = -1; // Marker: a timer is pending
    idleTimerId = setTimeout(wakeFrameFromTimer, Math.max(1, interval - 4));
  }
}

// Immediately resume full-rate rendering (input, resize, settings change)
function wakeNow() {
  if (idleTimerId) {
    clearTimeout(idleTimerId);
    idleTimerId = 0;
    lastFrameInterval = 0;
    rafId = isPageHidden ? 0 : requestAnimationFrame(renderFrame);
  }
}

/**
 * Main animation loop optimized for minimal CPU/GPU usage and zero GC pressure.
 */
function renderFrame(now) {
  if (isPageHidden) {
    rafId = 0;
    return;
  }
  rafId = 0;
  lastRenderTime = now;

  const realDt = Math.max(0.001, (now - lastFrameTime) * 0.001);
  const dt = Math.min(lastFrameInterval > 0 ? 0.15 : 0.05, realDt);
  lastFrameTime = now;

  // Smoothed cursor speed + direction (drives the wind brace)
  mouseSpeed += (mouseTravel / realDt - mouseSpeed) * (1 - Math.exp(-7 * dt));
  if (Math.abs(mouseTravelX) > 2) mouseDirX = mouseTravelX > 0 ? 1 : -1;
  mouseTravel = 0;
  mouseTravelX = 0;
  elapsedTime += dt;
  timeSinceMouseMove += dt;

  // 1. Clear canvas with pure black matching the reference image
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, viewWidth, viewHeight);

  // 2. Smoothly interpolate cursor coordinates so the magnetic field glides organically
  if (isPointerActive) {
    const cursorAlpha = 1 - Math.exp(-CURSOR_SMOOTH_RATE * dt);
    smoothMouseX += (rawMouseX - smoothMouseX) * cursorAlpha;
    smoothMouseY += (rawMouseY - smoothMouseY) * cursorAlpha;
  }

  // 3. Smoothly decay or follow Lively audio energy (skip math when silent)
  if (audioEnergy > 0.0005 || targetAudioEnergy > 0.0005) {
    audioEnergy += (targetAudioEnergy - audioEnergy) * (1 - Math.exp(-8 * dt));
    targetAudioEnergy *= Math.exp(-4 * dt);
  } else {
    audioEnergy = 0;
    targetAudioEnergy = 0;
  }

  // 4. Update particle positions (frame-rate independent via dt * 60 + DPI/uniformScale sizing)
  if (audioEnergy > 0.01) {
    const dtScale = dt * 60;
    ctx.save();
    ctx.globalAlpha = Math.min(audioEnergy * 0.18, 0.12);
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particleX[i] += particleVx[i] * dtScale;
      particleY[i] += particleVy[i] * dtScale;
      if (particleX[i] < 0) particleX[i] += REF_WIDTH;
      else if (particleX[i] > REF_WIDTH) particleX[i] -= REF_WIDTH;
      if (particleY[i] < 0) particleY[i] += REF_HEIGHT;
      else if (particleY[i] > REF_HEIGHT) particleY[i] -= REF_HEIGHT;

      const pSize = particleSize[i] * uniformScale;
      ctx.fillRect(
        stageOffsetX + (particleX[i] / REF_WIDTH) * (viewWidth - stageOffsetX * 2),
        stageOffsetY + (particleY[i] / REF_HEIGHT) * (viewHeight - stageOffsetY * 2),
        pSize,
        pSize
      );
    }
    ctx.restore();
  }

  // 5. Compute strictly local magnetic targets for cards near the cursor
  updateMagneticTargets(dt);

  // 6. Exponential viscous relaxation + 400ms card load fade-in progression (skip already-converged cards)
  const scaleAlpha = 1 - Math.exp(-SCALE_SMOOTH_RATE * dt);
  const pullAlpha = 1 - Math.exp(-PULL_SMOOTH_RATE * dt);
  let anyCardScaling = false;

  for (let i = 0; i < CARD_COUNT; i++) {
    const c = cards[i];
    if (c.loaded && c.loadProgress < 1) {
      c.loadProgress = Math.min(1, c.loadProgress + dt / 0.40);
    }
    const ds = c.targetScale - c.scale;
    if (Math.abs(ds) > 0.0002) {
      c.scale += ds * scaleAlpha;
      anyCardScaling = true;
    } else {
      c.scale = c.targetScale;
    }
    const dox = c.targetOffsetX - c.offsetX;
    const doy = c.targetOffsetY - c.offsetY;
    if (Math.abs(dox) > 0.02 || Math.abs(doy) > 0.02) {
      c.offsetX += dox * pullAlpha;
      c.offsetY += doy * pullAlpha;
    } else {
      c.offsetX = c.targetOffsetX;
      c.offsetY = c.targetOffsetY;
    }
  }

  // 7. Sort draw order only when card scales are changing
  if (anyCardScaling) {
    sortDrawOrderByScale();
  }

  for (let i = 0; i < CARD_COUNT; i++) {
    drawCard(cards[drawOrder[i]]);
  }

  // 8. Update Spider-Man, photo-to-photo web connections, lingering web tags, cast shadow, and Spider-Man
  updateSpiderMan(dt);
  updatePhotoWebConnections(dt);
  updateWebTags(dt);
  drawPhotoWebConnections();
  drawWebTags();
  drawSpideyCastShadow();
  drawSpiderMan();

  scheduleNextFrame();
}

let wallpaperStarted = false;
function startWallpaper() {
  if (wallpaperStarted) return;
  wallpaperStarted = true;
  handleResize();
  rafId = requestAnimationFrame(renderFrame);
}
