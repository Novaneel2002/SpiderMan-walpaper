/**
 * image-block/magnetic-field.js
 * Card border projection, perch coordinate solvers, and localized magnetic field attraction.
 */
/**
 * Picks a randomized perch mode when swinging to a card:
 * Top-row cards randomize between hanging upside-down from the bottom edge (1),
 * sitting on the inner side border (2), or low crouching on the top border (3).
 */
function choosePerchModeForCard(idx) {
  const c = cards[idx];
  if (!c.isTopRow) return PERCH_TOP_NORMAL;
  const r = Math.random();
  if (r < 0.36) return PERCH_BOTTOM_UPSIDE_DOWN;
  if (r < 0.70) return PERCH_SIDE_EDGE;
  return PERCH_TOP_CROUCH;
}

/**
 * Computes the exact world perch X and Y for card `idx` and `mode`.
 */
function getCardPerchX(idx, mode) {
  const c = cards[idx];
  const currentScale = c.scale * (1 + audioEnergy * 0.025);
  const halfW = (c.baseW * currentScale) * 0.5;
  if (mode === PERCH_SIDE_EDGE) {
    return (c.cx + c.offsetX) + c.sideDir * halfW;
  }
  return c.cx + c.offsetX;
}

function getCardPerchY(idx, mode) {
  const c = cards[idx];
  const currentScale = c.scale * (1 + audioEnergy * 0.025);
  const halfH = (c.baseH * currentScale) * 0.5;
  if (mode === PERCH_BOTTOM_UPSIDE_DOWN) {
    return (c.cy + c.offsetY) + halfH;
  }
  if (mode === PERCH_SIDE_EDGE) {
    return (c.cy + c.offsetY) - halfH * 0.12;
  }
  return (c.cy + c.offsetY) - halfH;
}

/**
 * Clamps an arbitrary point (px, py) onto the exact outer border of card `idx`
 * and writes the normalized relative coordinates into temp variables.
 */
let tempBorderX = 0;
let tempBorderY = 0;
let tempRelX = 0;
let tempRelY = 0;

function projectPointToCardBorder(idx, px, py) {
  const c = cards[idx];
  const currentScale = c.scale * (1 + audioEnergy * 0.025);
  const w = c.baseW * currentScale;
  const h = c.baseH * currentScale;
  const halfW = w * 0.5;
  const halfH = h * 0.5;
  const centerX = c.cx + c.offsetX;
  const centerY = c.cy + c.offsetY;

  let dx = Math.max(-halfW, Math.min(halfW, px - centerX));
  let dy = Math.max(-halfH, Math.min(halfH, py - centerY));

  const distLeft = Math.abs(dx + halfW);
  const distRight = Math.abs(halfW - dx);
  const distTop = Math.abs(dy + halfH);
  const distBottom = Math.abs(halfH - dy);
  const minDist = Math.min(distLeft, distRight, distTop, distBottom);

  if (minDist === distBottom) {
    dy = halfH;
  } else if (minDist === distTop) {
    dy = -halfH;
  } else if (minDist === distLeft) {
    dx = -halfW;
  } else {
    dx = halfW;
  }

  tempBorderX = centerX + dx;
  tempBorderY = centerY + dy;
  tempRelX = dx / Math.max(1, w);
  tempRelY = dy / Math.max(1, h);
}

let lastMagMouseX = -99999;
let lastMagMouseY = -99999;
let lastStrongestCard = -1;
let lastStrongestField = 0;

/**
 * Computes each card's localized magnetic attraction and debounced Spider-Man swing trigger.
 */
function updateMagneticTargets(dt) {
  if (!isPointerActive) {
    spidey.hoverCandidateCard = -1;
    spidey.hoverDwellTimer = 0;
    if (lastMagMouseX !== -99999) {
      lastMagMouseX = -99999;
      lastMagMouseY = -99999;
      lastStrongestCard = -1;
      lastStrongestField = 0;
      for (let i = 0; i < CARD_COUNT; i++) {
        const c = cards[i];
        c.targetScale = IDLE_SCALE;
        c.targetOffsetX = 0;
        c.targetOffsetY = 0;
        c.fieldStrength = 0;
      }
    }
    return;
  }

  let strongestCard = lastStrongestCard;
  let strongestField = lastStrongestField;

  // Skip the 11-card hypot loop when the smoothed cursor position has converged and is stationary
  if (Math.abs(smoothMouseX - lastMagMouseX) > 0.04 || Math.abs(smoothMouseY - lastMagMouseY) > 0.04) {
    lastMagMouseX = smoothMouseX;
    lastMagMouseY = smoothMouseY;
    strongestCard = -1;
    strongestField = 0;

    const effectiveSpan = Math.max(1, scaledMagnetRadius - scaledInnerRadius);
    for (let i = 0; i < CARD_COUNT; i++) {
      const c = cards[i];
      const dx = smoothMouseX - c.cx;
      const dy = smoothMouseY - c.cy;
      const dist = Math.hypot(dx, dy);

      if (dist >= scaledMagnetRadius) {
        c.targetScale = IDLE_SCALE;
        c.targetOffsetX = 0;
        c.targetOffsetY = 0;
        c.fieldStrength = 0;
        continue;
      }

      const r = dist <= scaledInnerRadius
        ? 0
        : (dist - scaledInnerRadius) / effectiveSpan;

      const oneMinusR2 = 1 - r * r;
      const fieldStrength = oneMinusR2 * oneMinusR2;
      c.fieldStrength = fieldStrength;

      if (fieldStrength > strongestField) {
        strongestField = fieldStrength;
        strongestCard = i;
      }

      c.targetScale = IDLE_SCALE + (config.maxMagnetScale - IDLE_SCALE) * fieldStrength;

      if (dist > 0.001) {
        const pullFactor = fieldStrength * Math.min(1, dist / (scaledInnerRadius * 2.5));
        const pullMag = scaledMaxPull * pullFactor;
        c.targetOffsetX = (dx / dist) * pullMag;
        c.targetOffsetY = (dy / dist) * pullMag;
      } else {
        c.targetOffsetX = 0;
        c.targetOffsetY = 0;
      }
    }
    lastStrongestCard = strongestCard;
    lastStrongestField = strongestField;
  }

  // Hover dwell debounce (180ms default; 40ms while holding LMB so multi-photo webbing is responsive)
  const minFieldForHover = isLmbHeld ? 0.24 : 0.32;
  const requiredDwell = isLmbHeld ? 0.04 : config.hoverDwellTime;
  if (config.showSpidey && strongestCard !== -1 && strongestField > minFieldForHover && strongestCard !== spidey.currentCard) {
    if (spidey.hoverCandidateCard === strongestCard) {
      spidey.hoverDwellTimer += dt;
      if (spidey.hoverDwellTimer >= requiredDwell) {
        spidey.hoverDwellTimer = 0;
        if (isLmbHeld) {
          enqueueLmbCard(strongestCard);
        } else {
          requestSwingToCard(strongestCard);
        }
      }
    } else {
      spidey.hoverCandidateCard = strongestCard;
      spidey.hoverDwellTimer = 0;
    }
  } else {
    spidey.hoverCandidateCard = -1;
    spidey.hoverDwellTimer = 0;
  }
}
