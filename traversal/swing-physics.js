/**
 * traversal/swing-physics.js
 * Physical web anchor selection, pendulum energy-conservation solver, and web-zip trajectory.
 */
// Pendulum time-warp table: maps normalized time -> angle fraction so he speeds up
// through the bottom of the arc and slows near the top (energy conservation)
const PEND_SAMPLES = 48;
const pendTimeTable = new Float32Array(PEND_SAMPLES + 1);
let pendTh0 = 0;
let pendTh1 = 0;
let pendR0 = 0;
let pendR1 = 0;



/**
 * Selects the most realistic physical web anchor on either:
 * 1. The nearest suitable image card's border/corner above the swing trajectory, OR
 * 2. The nearest screen border (top edge y=0, left edge x=0, or right edge x=viewWidth).
 */
function resolvePhysicalWebAnchor(startX, startY, endX, endY, originCardIdx, targetCardIdx) {
  const dx = endX - startX;
  const dy = endY - startY;
  const jumpDist = Math.hypot(dx, dy);

  const idealX = startX + dx * 0.55;
  const highestY = Math.min(startY, endY);
  const lowestY = Math.max(startY, endY);
  const idealLift = Math.max(95 * uniformScale, Math.min(220 * uniformScale, jumpDist * 0.38));
  const idealY = Math.max(0, highestY - idealLift);

  let bestScore = 1e18;
  let bestX = idealX;
  let bestY = 0;
  let bestCard = -1;
  let bestRelX = 0;
  let bestRelY = 0;

  // --- Candidate 1: Screen Borders ---
  const topEdgeX = Math.max(16, Math.min(viewWidth - 16, idealX));
  const topEdgeY = 0;
  const distToTopScreen = Math.hypot(topEdgeX - idealX, topEdgeY - idealY) + (highestY - topEdgeY) * 0.35;
  if (distToTopScreen < bestScore) {
    bestScore = distToTopScreen;
    bestX = topEdgeX;
    bestY = topEdgeY;
    bestCard = -1;
  }

  if (idealX < viewWidth * 0.28) {
    const leftEdgeX = 0;
    const leftEdgeY = Math.max(16, Math.min(highestY - 25 * uniformScale, idealY));
    const distToLeftScreen = Math.hypot(leftEdgeX - idealX, leftEdgeY - idealY) + 30 * uniformScale;
    if (distToLeftScreen < bestScore) {
      bestScore = distToLeftScreen;
      bestX = leftEdgeX;
      bestY = leftEdgeY;
      bestCard = -1;
    }
  }

  if (idealX > viewWidth * 0.72) {
    const rightEdgeX = viewWidth;
    const rightEdgeY = Math.max(16, Math.min(highestY - 25 * uniformScale, idealY));
    const distToRightScreen = Math.hypot(rightEdgeX - idealX, rightEdgeY - idealY) + 30 * uniformScale;
    if (distToRightScreen < bestScore) {
      bestScore = distToRightScreen;
      bestX = rightEdgeX;
      bestY = rightEdgeY;
      bestCard = -1;
    }
  }

  // --- Candidate 2: Nearest Image Card Borders ---
  const minPathX = Math.min(startX, endX) - 130 * uniformScale;
  const maxPathX = Math.max(startX, endX) + 130 * uniformScale;

  for (let i = 0; i < CARD_COUNT; i++) {
    if (i === originCardIdx) continue;

    projectPointToCardBorder(i, idealX, idealY);
    const bx = tempBorderX;
    const by = tempBorderY;

    if (i === targetCardIdx) {
      if (endY < startY - 70 * uniformScale) {
        const c = cards[i];
        const currentScale = c.scale * (1 + audioEnergy * 0.025);
        const cornerX = (c.cx + c.offsetX) + (dx >= 0 ? -1 : 1) * (c.baseW * currentScale) * 0.35;
        const cornerY = (c.cy + c.offsetY) - (c.baseH * currentScale) * 0.5;
        const zipScore = Math.hypot(cornerX - idealX, cornerY - idealY) + 45 * uniformScale;
        if (zipScore < bestScore) {
          bestScore = zipScore;
          bestX = cornerX;
          bestY = cornerY;
          bestCard = i;
          bestRelX = (dx >= 0 ? -0.35 : 0.35);
          bestRelY = -0.5;
        }
      }
      continue;
    }

    if (by > lowestY - 15 * uniformScale) continue;
    if (bx < minPathX || bx > maxPathX) continue;

    const aboveBonus = by <= highestY ? -35 * uniformScale : 20 * uniformScale;
    const cardScore = Math.hypot(bx - idealX, by - idealY) + aboveBonus;

    if (cardScore < bestScore) {
      bestScore = cardScore;
      bestX = bx;
      bestY = by;
      bestCard = i;
      bestRelX = tempRelX;
      bestRelY = tempRelY;
    }
  }

  spidey.anchorX = bestX;
  spidey.anchorY = bestY;
  spidey.anchorCard = bestCard;
  spidey.anchorRelX = bestRelX;
  spidey.anchorRelY = bestRelY;
}

/**
 * Updates the web anchor coordinates if the web is attached to a card border
 * that is currently moving slightly under the magnetic field.
 */
function updateLiveWebAnchor() {
  if (spidey.anchorCard !== -1) {
    const c = cards[spidey.anchorCard];
    const currentScale = c.scale * (1 + audioEnergy * 0.025);
    const w = c.baseW * currentScale;
    const h = c.baseH * currentScale;
    spidey.anchorX = (c.cx + c.offsetX) + spidey.anchorRelX * w;
    spidey.anchorY = (c.cy + c.offsetY) + spidey.anchorRelY * h;
  }
}

/**
 * Requests a swing to `targetCardIdx`:
 * - If Spider-Man is currently perched, triggers a brief 0.11s launch crouch before takeoff.
 * - If Spider-Man is already mid-swing, smoothly blends his current velocity into the new arc.
 */
function requestSwingToCard(targetCardIdx) {
  if (targetCardIdx < 0 || targetCardIdx === spidey.currentCard) return;
  if (!spidey.isSwinging && spidey.preJumpTimer <= 0) {
    spidey.pendingTargetCard = targetCardIdx;
    spidey.preJumpTimer = isLmbHeld ? 0.04 : 0.11;
    const targetX = getCardPerchX(targetCardIdx, PERCH_TOP_NORMAL);
    spidey.facing = (targetX - spidey.x) >= 0 ? 1 : -1;
    return;
  }
  if (spidey.preJumpTimer > 0) {
    spidey.pendingTargetCard = targetCardIdx;
    const targetX = getCardPerchX(targetCardIdx, PERCH_TOP_NORMAL);
    spidey.facing = (targetX - spidey.x) >= 0 ? 1 : -1;
    return;
  }
  launchSwingNow(targetCardIdx, true);
}

/**
 * Decides how Spider-Man travels to `targetCardIdx`:
 * - Web-zip: target is clearly higher (or very close) -> fire web at it and get yanked up.
 * - Two-web swing: very long horizontal jumps -> swing, let go mid-air, fire a 2nd web.
 * - Pendulum swing: everything else.
 */
function launchSwingNow(targetCardIdx, carryVelocity) {
  if (targetCardIdx === spidey.currentCard || targetCardIdx < 0) return;

  if (spidey.isSwinging && isWebStillAttached()) {
    releaseWebStrand(0.85);
  }

  const previousCard = spidey.currentCard;
  spidey.originCard = previousCard;
  spidey.currentCard = targetCardIdx;
  spidey.nextPerchMode = choosePerchModeForCard(targetCardIdx);
  spidey.isChainSegment = false;
  spidey.chainTargetCard = -1;

  // While holding LMB, attach the origin photo and target photo with a web connection
  if (isLmbHeld) {
    startPhotoWebConnection(previousCard, targetCardIdx);
  } else if (activeDragConnIdx >= 0) {
    finalizeActiveDragWeb();
  }

  // Reset idle timers when launching a swing
  spidey.idleTime = 0;
  spidey.sassyBlend = 0;
  spidey.sitBlend = 0;
  spidey.deepIdleBlend = 0;
  spidey.reactionBlend = 0;

  const ex = getCardPerchX(targetCardIdx, spidey.nextPerchMode);
  const ey = getCardPerchY(targetCardIdx, spidey.nextPerchMode);
  const dx = ex - spidey.x;
  const dy = ey - spidey.y;
  const dist = Math.hypot(dx, dy);
  const rise = spidey.y - ey; // > 0 when the target is higher
  const us = uniformScale;

  if ((rise > 50 * us && Math.abs(dx) < rise * 1.4) || (dist < 140 * us && rise > -20 * us)) {
    beginSwingSegment(SWING_ZIP, ex, ey, true, previousCard, carryVelocity);
  } else if (Math.abs(dx) > viewWidth * 0.42) {
    // Two-web swing: web #1 carries him to a mid-air release point
    const mx = spidey.x + dx * 0.5;
    const my = Math.max(60 * us, Math.min(viewHeight * 0.55, Math.min(spidey.y, ey) - 30 * us));
    spidey.isChainSegment = true;
    spidey.chainTargetCard = targetCardIdx;
    beginSwingSegment(SWING_PENDULUM, mx, my, false, previousCard, carryVelocity);
  } else {
    beginSwingSegment(SWING_PENDULUM, ex, ey, true, previousCard, carryVelocity);
  }
}

function isWebStillAttached() {
  if (!spidey.isSwinging) return false;
  if (spidey.swingMode === SWING_ZIP) return spidey.swingT < 0.94;
  return spidey.isChainSegment || spidey.swingT < 0.85;
}

/**
 * Starts a single swing segment from Spider-Man's current position to (endX, endY).
 */
function beginSwingSegment(mode, endX, endY, endIsCard, originCardIdx, carryVelocity) {
  const us = uniformScale;
  spidey.swingMode = mode;
  spidey.startX = spidey.x;
  spidey.startY = spidey.y;
  spidey.endX = endX;
  spidey.endY = endY;
  spidey.endIsCard = endIsCard;

  const dx = endX - spidey.startX;
  const dy = endY - spidey.startY;
  const dist = Math.hypot(dx, dy);
  if (Math.abs(dx) > 2) spidey.facing = dx >= 0 ? 1 : -1;

  const hasCarry = carryVelocity && (Math.abs(spidey.vx) + Math.abs(spidey.vy) > 20);
  spidey.carryVx = hasCarry ? spidey.vx : 0;
  spidey.carryVy = hasCarry ? spidey.vy : 0;
  spidey.carryTime = hasCarry ? 0.2 : 0;

  spidey.swingT = 0;
  spidey.isSwinging = true;

  if (mode === SWING_ZIP) {
    spidey.swingDuration = Math.min(0.7, Math.max(0.42, 0.42 + (dist / Math.max(1, viewHeight)) * 0.3));
    spidey.anchorCard = -1; // Anchor follows the live landing point every frame
    spidey.anchorX = endX;
    spidey.anchorY = endY;
    return;
  }

  spidey.swingDuration = Math.min(1.1, Math.max(0.6, 0.5 + (dist / Math.max(1, viewWidth)) * 0.72));
  resolvePhysicalWebAnchor(spidey.startX, spidey.startY, endX, endY, originCardIdx, endIsCard ? spidey.currentCard : -1);

  // A pendulum needs its pivot above both ends - otherwise anchor to the top of the screen
  if (spidey.anchorY > Math.min(spidey.startY, endY) - 25 * us) {
    spidey.anchorX = Math.max(16, Math.min(viewWidth - 16, spidey.startX + dx * 0.55));
    spidey.anchorY = 0;
    spidey.anchorCard = -1;
  }
  buildPendulumTable();
}

/**
 * Recomputes pendulum angles/radii from the live anchor (cards may drift under the magnet).
 * Angles are measured from straight-down, positive to the right.
 */
function computePendulumGeometry() {
  const ax = spidey.anchorX;
  const ay = spidey.anchorY;
  pendTh0 = Math.atan2(spidey.startX - ax, spidey.startY - ay);
  let th1 = Math.atan2(spidey.endX - ax, spidey.endY - ay);
  if (th1 - pendTh0 > Math.PI) th1 -= Math.PI * 2;
  else if (pendTh0 - th1 > Math.PI) th1 += Math.PI * 2;
  pendTh1 = th1;
  pendR0 = Math.hypot(spidey.startX - ax, spidey.startY - ay);
  pendR1 = Math.hypot(spidey.endX - ax, spidey.endY - ay);
}

/**
 * Builds the time-warp table using energy conservation: speed ~ sqrt(height dropped).
 */
function buildPendulumTable() {
  computePendulumGeometry();
  const ax = spidey.anchorX;
  const ay = spidey.anchorY;
  const yRef = Math.min(spidey.startY, spidey.endY);
  let maxY = yRef;
  for (let i = 0; i <= PEND_SAMPLES; i++) {
    const f = i / PEND_SAMPLES;
    const th = pendTh0 + (pendTh1 - pendTh0) * f;
    const r = pendR0 + (pendR1 - pendR0) * (f * f * (3 - 2 * f));
    const y = ay + Math.cos(th) * r;
    if (y > maxY) maxY = y;
  }
  const vMin2 = Math.max(30 * uniformScale, (maxY - yRef) * 0.22);
  let px = spidey.startX;
  let py = spidey.startY;
  let total = 0;
  pendTimeTable[0] = 0;
  for (let i = 1; i <= PEND_SAMPLES; i++) {
    const f = i / PEND_SAMPLES;
    const th = pendTh0 + (pendTh1 - pendTh0) * f;
    const r = pendR0 + (pendR1 - pendR0) * (f * f * (3 - 2 * f));
    const x = ax + Math.sin(th) * r;
    const y = ay + Math.cos(th) * r;
    const yMid = (py + y) * 0.5;
    const v = Math.sqrt(vMin2 + 2 * Math.max(0, yMid - yRef));
    total += Math.hypot(x - px, y - py) / v;
    pendTimeTable[i] = total;
    px = x;
    py = y;
  }
  for (let i = 0; i <= PEND_SAMPLES; i++) {
    pendTimeTable[i] = total > 0 ? pendTimeTable[i] / total : i / PEND_SAMPLES;
  }
}

function computePendulumPosition(t) {
  let i = 0;
  while (i < PEND_SAMPLES - 1 && pendTimeTable[i + 1] < t) i++;
  const ta = pendTimeTable[i];
  const tb = pendTimeTable[i + 1];
  const local = tb > ta ? Math.max(0, Math.min(1, (t - ta) / (tb - ta))) : 0;
  const f = Math.max(0, Math.min(1, (i + local) / PEND_SAMPLES));
  computePendulumGeometry();
  const th = pendTh0 + (pendTh1 - pendTh0) * f;
  const r = pendR0 + (pendR1 - pendR0) * (f * f * (3 - 2 * f));
  spidey.x = spidey.anchorX + Math.sin(th) * r;
  spidey.y = spidey.anchorY + Math.cos(th) * r;
}

/**
 * Web-zip: hold while the web flies (t < 0.16), then a hard yank that eases into the landing.
 */
function computeZipPosition(t) {
  const hold = 0.16;
  const k = t <= hold ? 0 : (t - hold) / (1 - hold);
  const e = 1 - Math.pow(1 - k, 2.6);
  const dx = spidey.endX - spidey.startX;
  const dy = spidey.endY - spidey.startY;
  const d = Math.max(1, Math.hypot(dx, dy));
  let nx = -dy / d;
  let ny = dx / d;
  if (ny < 0) { nx = -nx; ny = -ny; }
  const bulge = Math.sin(k * Math.PI) * Math.min(18 * uniformScale, d * 0.12);
  spidey.x = spidey.startX + dx * e + nx * bulge;
  spidey.y = spidey.startY + dy * e + ny * bulge;
}
