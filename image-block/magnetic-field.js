/**
 * image-block/magnetic-field.js
 * NYC Building border projection, rooftop/wall/cornice perch coordinate solvers,
 * localized building parallax, and city-wide mouse-guided Spider-Man swing targeting.
 */

/**
 * Picks the most natural perch mode when swinging to building `idx`:
 * - Uses the cursor's position relative to the building when pointer is active
 *   (rooftop parapet, vertical skyscraper wall-crawl, or upside-down under a cornice overhang).
 */
function choosePerchModeForCard(idx) {
  const c = cards[idx];
  if (isPointerActive) {
    const halfW = c.baseW * 0.5;
    const halfH = c.baseH * 0.5;
    const dx = smoothMouseX - c.cx;
    const dy = smoothMouseY - c.cy;

    // If cursor is below the upper crown of a top-tier skyscraper -> hang upside-down from the cornice
    if (c.isTopRow && dy > halfH * 0.35) {
      return PERCH_BOTTOM_UPSIDE_DOWN;
    }
    // If cursor is near the inner vertical wall of the building -> cling sideways to the skyscraper wall
    if (dy > -halfH * 0.25 && dx * c.sideDir > halfW * 0.55) {
      return PERCH_SIDE_EDGE;
    }
    if (c.isTopRow) {
      return PERCH_TOP_CROUCH;
    }
    return PERCH_TOP_NORMAL;
  }

  if (!c.isTopRow) return PERCH_TOP_NORMAL;
  const r = Math.random();
  if (r < 0.36) return PERCH_BOTTOM_UPSIDE_DOWN;
  if (r < 0.70) return PERCH_SIDE_EDGE;
  return PERCH_TOP_CROUCH;
}

/**
 * Computes the exact world perch X and Y for building `idx` and `mode`.
 */
function getCardPerchX(idx, mode) {
  const c = cards[idx];
  const currentScale = c.scale * (1 + audioEnergy * 0.015);
  const halfW = (c.baseW * currentScale) * 0.5;
  if (mode === PERCH_SIDE_EDGE) {
    return (c.cx + c.offsetX) + c.sideDir * halfW;
  }
  return c.cx + c.offsetX;
}

function getCardPerchY(idx, mode) {
  const c = cards[idx];
  const currentScale = c.scale * (1 + audioEnergy * 0.015);
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
 * Measures the distance from a screen point (px, py) to building `idx`'s interactive perch box.
 */
function distToBuildingPerchZone(idx, px, py) {
  const c = cards[idx];
  const halfW = c.baseW * 0.5;
  const halfH = c.baseH * 0.5;
  const dx = Math.max(0, Math.abs(px - c.cx) - halfW * 0.65);
  // Bias slightly toward the rooftop ledge (`cy - halfH * 0.35`) where Spidey primarily perches
  const perchCy = c.cy - halfH * 0.25;
  const dy = Math.max(0, Math.abs(py - perchCy) - halfH * 0.65);
  return Math.hypot(dx, dy);
}

/**
 * Clamps an arbitrary point (px, py) onto the exact outer border of building `idx`
 * and writes the normalized relative coordinates into temp variables.
 */
let tempBorderX = 0;
let tempBorderY = 0;
let tempRelX = 0;
let tempRelY = 0;

function projectPointToCardBorder(idx, px, py) {
  const c = cards[idx];
  const currentScale = c.scale * (1 + audioEnergy * 0.015);
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
let lastNearestBuilding = -1;

/**
 * Computes each building's subtle 3D parallax attraction and continuously guides
 * Spider-Man to swing across the New York City buildings toward the mouse cursor.
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
      lastNearestBuilding = -1;
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
  let nearestBuilding = lastNearestBuilding;

  if (Math.abs(smoothMouseX - lastMagMouseX) > 0.04 || Math.abs(smoothMouseY - lastMagMouseY) > 0.04) {
    lastMagMouseX = smoothMouseX;
    lastMagMouseY = smoothMouseY;
    strongestCard = -1;
    strongestField = 0;
    nearestBuilding = -1;
    let bestZoneDist = 1e18;

    const effectiveSpan = Math.max(1, scaledMagnetRadius - scaledInnerRadius);
    for (let i = 0; i < CARD_COUNT; i++) {
      const c = cards[i];
      const dx = smoothMouseX - c.cx;
      const dy = smoothMouseY - c.cy;
      const dist = Math.hypot(dx, dy);

      // Find the closest building perch anywhere in the city for cursor-following swings
      const zoneDist = distToBuildingPerchZone(i, smoothMouseX, smoothMouseY);
      if (zoneDist < bestZoneDist) {
        bestZoneDist = zoneDist;
        nearestBuilding = i;
      }

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
    lastNearestBuilding = nearestBuilding;
  }

  if (!config.showSpidey || nearestBuilding === -1) {
    spidey.hoverCandidateCard = -1;
    spidey.hoverDwellTimer = 0;
    return;
  }

  // Hysteresis: only switch target building if the cursor is meaningfully closer to `nearestBuilding`
  // than to Spider-Man's current target building
  const currentTarget = spidey.pendingTargetCard !== -1 ? spidey.pendingTargetCard : spidey.currentCard;
  if (nearestBuilding !== currentTarget) {
    const distToNew = distToBuildingPerchZone(nearestBuilding, smoothMouseX, smoothMouseY);
    const distToCur = distToBuildingPerchZone(currentTarget, smoothMouseX, smoothMouseY);
    const hysteresis = 16 * uniformScale;

    if (distToNew + hysteresis < distToCur) {
      // If Spider-Man is currently mid-swing, let him complete at least 46% of his pendulum arc
      // before releasing his web mid-air and firing a fresh web toward the new cursor building
      if (spidey.isSwinging) {
        if (spidey.swingT >= 0.46) {
          spidey.hoverDwellTimer = 0;
          spidey.hoverCandidateCard = nearestBuilding;
          if (isLmbHeld) {
            enqueueLmbCard(nearestBuilding);
          } else {
            launchSwingNow(nearestBuilding, true);
          }
        }
        return;
      }

      // Perched or in pre-jump crouch: accumulate brief response timer without resetting when
      // the cursor sweeps across multiple buildings
      spidey.hoverCandidateCard = nearestBuilding;
      spidey.hoverDwellTimer += dt;
      const requiredDwell = isLmbHeld ? 0.02 : config.hoverDwellTime;
      if (spidey.hoverDwellTimer >= requiredDwell) {
        spidey.hoverDwellTimer = 0;
        if (isLmbHeld) {
          enqueueLmbCard(nearestBuilding);
        } else {
          requestSwingToCard(nearestBuilding);
        }
      }
      return;
    }
  } else if (!spidey.isSwinging && spidey.preJumpTimer <= 0) {
    // Cursor moved to a different side/ledge of the SAME building (e.g. rooftop -> side wall)
    const desiredMode = choosePerchModeForCard(currentTarget);
    if (desiredMode !== spidey.perchMode && timeSinceMouseMove < 0.25) {
      const targetPerchX = getCardPerchX(currentTarget, desiredMode);
      const targetPerchY = getCardPerchY(currentTarget, desiredMode);
      if (Math.hypot(smoothMouseX - targetPerchX, smoothMouseY - targetPerchY) < 42 * uniformScale) {
        spidey.perchMode = desiredMode;
      }
    }
  }

  spidey.hoverCandidateCard = -1;
  spidey.hoverDwellTimer = 0;
}
