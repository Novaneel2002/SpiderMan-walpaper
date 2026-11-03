/**
 * input/pointer-events.js
 * Mouse movement, LMB hold multi-photo webbing, click hit-testing, and visibility/resize listeners.
 */
window.addEventListener('mousemove', function (e) {
  if (isPointerActive) {
    const mdx = e.clientX - rawMouseX;
    mouseTravel += Math.abs(mdx) + Math.abs(e.clientY - rawMouseY);
    mouseTravelX += mdx;
  }
  wakeNow();
  rawMouseX = e.clientX;
  rawMouseY = e.clientY;
  timeSinceMouseMove = 0;
  if (!isPointerActive) {
    smoothMouseX = rawMouseX;
    smoothMouseY = rawMouseY;
    isPointerActive = true;
  }

  // While holding LMB, dragging over any photo card queues/triggers Spider-Man to travel & web it
  if (isLmbHeld && config.showSpidey && spidey.initialized) {
    for (let i = CARD_COUNT - 1; i >= 0; i--) {
      const idx = drawOrder[i];
      const c = cards[idx];
      const currentScale = c.scale * (1 + audioEnergy * 0.025);
      const halfW = (c.baseW * currentScale) * 0.5;
      const halfH = (c.baseH * currentScale) * 0.5;
      const dx = e.clientX - (c.cx + c.offsetX);
      const dy = e.clientY - (c.cy + c.offsetY);
      if (Math.abs(dx) <= halfW && Math.abs(dy) <= halfH) {
        enqueueLmbCard(idx);
        break;
      }
    }
  }
}, { passive: true });

window.addEventListener('mousedown', function (e) {
  wakeNow();
  if (!config.showSpidey || !spidey.initialized) return;
  if (e.button === 0) {
    isLmbHeld = true;
    clearLmbCardQueue();
    // If LMB is pressed while Spider-Man is already mid-swing between two cards, attach them
    if (spidey.isSwinging && spidey.originCard >= 0 && spidey.originCard !== spidey.currentCard && activeDragConnIdx < 0) {
      startPhotoWebConnection(spidey.originCard, spidey.currentCard);
    }
  }
  const clickX = e.clientX;
  const clickY = e.clientY;
  const s = uniformScale * config.spideyScale;

  // 1. Check if the user clicked directly on Chibi Spider-Man
  const distToSpidey = Math.hypot(clickX - spidey.x, clickY - (spidey.y - 12 * s));
  if (distToSpidey <= 28 * s) {
    spidey.flipTimer = 1.0;
    spidey.idleTime = 0;
    spidey.sassyBlend = 0;
    spidey.sitBlend = 0;
    spidey.deepIdleBlend = 0;
    clickEffect.active = true;
    clickEffect.timer = 0;
    clickEffect.isSpideyClick = true;
    return;
  }

  // 2. Check if the user clicked on any image card -> shoot "THWIP!" web & swing there
  let hitCard = false;
  for (let i = CARD_COUNT - 1; i >= 0; i--) {
    const idx = drawOrder[i];
    const c = cards[idx];
    const currentScale = c.scale * (1 + audioEnergy * 0.025);
    const halfW = (c.baseW * currentScale) * 0.5;
    const halfH = (c.baseH * currentScale) * 0.5;
    const dx = clickX - (c.cx + c.offsetX);
    const dy = clickY - (c.cy + c.offsetY);

    if (Math.abs(dx) <= halfW && Math.abs(dy) <= halfH) {
      hitCard = true;
      spidey.facing = (clickX - spidey.x) >= 0 ? 1 : -1;
      clickEffect.active = true;
      clickEffect.timer = 0;
      clickEffect.isSpideyClick = false;
      clickEffect.targetX = clickX;
      clickEffect.targetY = clickY;
      clickEffect.cardIdx = idx;
      clickEffect.relX = dx / Math.max(1, c.baseW * currentScale);
      clickEffect.relY = dy / Math.max(1, c.baseH * currentScale);

      lastLmbClickCard = idx;
      lastLmbClickRelX = clickEffect.relX;
      lastLmbClickRelY = clickEffect.relY;

      if (idx !== spidey.currentCard) {
        if (isLmbHeld) {
          enqueueLmbCard(idx);
        } else {
          requestSwingToCard(idx);
        }
      }
      break;
    }
  }

  // 3. If LMB is held in empty space, still throw a web toward the cursor
  if (!hitCard && e.button === 0) {
    spidey.facing = (clickX - spidey.x) >= 0 ? 1 : -1;
    clickEffect.active = true;
    clickEffect.timer = 0;
    clickEffect.isSpideyClick = false;
    clickEffect.targetX = clickX;
    clickEffect.targetY = clickY;
    clickEffect.cardIdx = -1;
    clickEffect.relX = 0;
    clickEffect.relY = 0;
  }
}, { passive: true });

window.addEventListener('mouseup', function (e) {
  if (e.button === 0) {
    isLmbHeld = false;
    lastLmbClickCard = -1;
    clearLmbCardQueue();
  }
}, { passive: true });

window.addEventListener('blur', function () {
  isLmbHeld = false;
  lastLmbClickCard = -1;
  clearLmbCardQueue();
}, { passive: true });

window.addEventListener('mouseleave', function () {
  isPointerActive = false;
  isLmbHeld = false;
  lastLmbClickCard = -1;
  clearLmbCardQueue();
}, { passive: true });

document.addEventListener('visibilitychange', function () {
  isPageHidden = document.hidden;
  if (!isPageHidden && !rafId) {
    lastFrameTime = performance.now();
    rafId = requestAnimationFrame(renderFrame);
  }
});

window.addEventListener('resize', function () {
  handleResize();
  wakeNow();
}, { passive: true });

