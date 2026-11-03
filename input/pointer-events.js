/**
 * input/pointer-events.js
 * Mouse movement, LMB hold multi-photo webbing, click hit-testing, and visibility/resize listeners.
 */
let lmbDownTime = 0;
let lmbDownX = 0;
let lmbDownY = 0;
let lmbHoldActive = false;
let lmbHoldTimerId = 0;

function hitTestCardAndQueue(clientX, clientY) {
  for (let i = CARD_COUNT - 1; i >= 0; i--) {
    const idx = drawOrder[i];
    const c = cards[idx];
    const currentScale = c.scale * (1 + audioEnergy * 0.025);
    const halfW = (c.baseW * currentScale) * 0.5;
    const halfH = (c.baseH * currentScale) * 0.5;
    const dx = clientX - (c.cx + c.offsetX);
    const dy = clientY - (c.cy + c.offsetY);
    if (Math.abs(dx) <= halfW && Math.abs(dy) <= halfH) {
      enqueueLmbCard(idx);
      break;
    }
  }
}

function activateLmbHold(clientX, clientY) {
  if (lmbHoldActive) return;
  lmbHoldActive = true;
  isLmbHeld = true;
  clearLmbCardQueue();
  clickEffect.active = false; // Do not show "THWIP!" when holding LMB

  if (config.showSpidey && spidey.initialized) {
    // If LMB is held while Spider-Man is already mid-swing between two cards, attach them
    if (spidey.isSwinging && spidey.originCard >= 0 && spidey.originCard !== spidey.currentCard && activeDragConnIdx < 0) {
      startPhotoWebConnection(spidey.originCard, spidey.currentCard);
    }
    hitTestCardAndQueue(clientX, clientY);
  }
}

function triggerSingleClickAction(clickX, clickY) {
  if (!config.showSpidey || !spidey.initialized) return;
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

  // 2. Check if the user clicked on any image card -> shoot "THWIP!" web & swing there (and done)
  for (let i = CARD_COUNT - 1; i >= 0; i--) {
    const idx = drawOrder[i];
    const c = cards[idx];
    const currentScale = c.scale * (1 + audioEnergy * 0.025);
    const halfW = (c.baseW * currentScale) * 0.5;
    const halfH = (c.baseH * currentScale) * 0.5;
    const dx = clickX - (c.cx + c.offsetX);
    const dy = clickY - (c.cy + c.offsetY);

    if (Math.abs(dx) <= halfW && Math.abs(dy) <= halfH) {
      spidey.facing = (clickX - spidey.x) >= 0 ? 1 : -1;
      clickEffect.active = true;
      clickEffect.timer = 0;
      clickEffect.isSpideyClick = false;
      clickEffect.targetX = clickX;
      clickEffect.targetY = clickY;
      clickEffect.cardIdx = idx;
      clickEffect.relX = dx / Math.max(1, c.baseW * currentScale);
      clickEffect.relY = dy / Math.max(1, c.baseH * currentScale);

      if (idx !== spidey.currentCard) {
        requestSwingToCard(idx);
      }
      return;
    }
  }
}

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

  // Promote LMB press to LMB hold immediately if dragged > 8px
  if (lmbDownTime > 0 && !lmbHoldActive) {
    if (Math.hypot(e.clientX - lmbDownX, e.clientY - lmbDownY) > 8) {
      if (lmbHoldTimerId) {
        clearTimeout(lmbHoldTimerId);
        lmbHoldTimerId = 0;
      }
      activateLmbHold(e.clientX, e.clientY);
    }
  }

  // While holding LMB, dragging over any photo card queues/triggers Spider-Man to travel & web it
  if (isLmbHeld && config.showSpidey && spidey.initialized) {
    hitTestCardAndQueue(e.clientX, e.clientY);
  }
}, { passive: true });

window.addEventListener('mousedown', function (e) {
  wakeNow();
  if (!config.showSpidey || !spidey.initialized) return;
  if (e.button === 0) {
    lmbDownTime = performance.now();
    lmbDownX = e.clientX;
    lmbDownY = e.clientY;
    lmbHoldActive = false;
    if (lmbHoldTimerId) clearTimeout(lmbHoldTimerId);
    lmbHoldTimerId = setTimeout(function () {
      lmbHoldTimerId = 0;
      if (lmbDownTime > 0) {
        activateLmbHold(rawMouseX, rawMouseY);
      }
    }, 170);
  }
}, { passive: true });

window.addEventListener('mouseup', function (e) {
  if (e.button === 0) {
    if (lmbHoldTimerId) {
      clearTimeout(lmbHoldTimerId);
      lmbHoldTimerId = 0;
    }
    const wasQuickClick = lmbDownTime > 0 && !lmbHoldActive;
    lmbDownTime = 0;
    lmbHoldActive = false;
    isLmbHeld = false;
    lastLmbClickCard = -1;
    clearLmbCardQueue();

    if (wasQuickClick) {
      triggerSingleClickAction(e.clientX, e.clientY);
    }
  }
}, { passive: true });

window.addEventListener('blur', function () {
  if (lmbHoldTimerId) {
    clearTimeout(lmbHoldTimerId);
    lmbHoldTimerId = 0;
  }
  lmbDownTime = 0;
  lmbHoldActive = false;
  isLmbHeld = false;
  lastLmbClickCard = -1;
  clearLmbCardQueue();
}, { passive: true });

window.addEventListener('mouseleave', function () {
  if (lmbHoldTimerId) {
    clearTimeout(lmbHoldTimerId);
    lmbHoldTimerId = 0;
  }
  isPointerActive = false;
  lmbDownTime = 0;
  lmbHoldActive = false;
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

