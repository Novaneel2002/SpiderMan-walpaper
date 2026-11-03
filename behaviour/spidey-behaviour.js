/**
 * behaviour/spidey-behaviour.js
 * Natural blinking, eye tracking, wind brace, idle progression, swing update, and comic reaction bubbles.
 */

/**
 * Updates natural randomized blinking (with 25% chance of double-blink).
 */
function updateNaturalBlinking(dt) {
  if (spidey.isBlinking) {
    spidey.blinkProgress += dt / 0.15;
    if (spidey.blinkProgress >= 1) {
      spidey.blinkProgress = 0;
      spidey.isBlinking = false;
      if (spidey.pendingDoubleBlink) {
        spidey.pendingDoubleBlink = false;
        spidey.blinkTimer = 0.09;
      } else {
        spidey.blinkTimer = 2.2 + Math.random() * 3.8;
      }
    }
  } else {
    spidey.blinkTimer -= dt;
    if (spidey.blinkTimer <= 0) {
      spidey.isBlinking = true;
      spidey.blinkProgress = 0;
      spidey.pendingDoubleBlink = Math.random() < 0.26;
    }
  }
}

/**
 * Updates Spider-Man's pendulum swing trajectory, launch crouch, squash-turn,
 * autonomous roaming, and multi-stage idle progression.
 */
function updateSpiderMan(dt) {
  if (!config.showSpidey) return;

  updateNaturalBlinking(dt);

  // Eye tracking toward the cursor + squint when the cursor gets very close
  {
    const s = uniformScale * config.spideyScale;
    let tx = 0;
    let ty = 0;
    let near = 0;
    if (isPointerActive && spidey.headWorldX) {
      const ddx = smoothMouseX - spidey.headWorldX;
      const ddy = smoothMouseY - spidey.headWorldY;
      const d = Math.hypot(ddx, ddy);
      tx = ddx / (d + 60 * uniformScale);
      ty = ddy / (d + 60 * uniformScale);
      near = Math.max(0, Math.min(1, 1 - (d - 22 * s) / (40 * s)));
    }
    const lookA = 1 - Math.exp(-10 * dt);
    spidey.lookX += (tx - spidey.lookX) * lookA;
    spidey.lookY += (ty - spidey.lookY) * lookA;
    spidey.cursorNear += (near - spidey.cursorNear) * (1 - Math.exp(-8 * dt));

    // "Wind" brace when the cursor is whipped around fast
    const windTarget = (!spidey.isSwinging && isPointerActive)
      ? Math.max(0, Math.min(1, (mouseSpeed / Math.max(0.1, uniformScale) - 1600) / 2400))
      : 0;
    const windRate = windTarget > spidey.windBlend ? 7.0 : 2.2;
    spidey.windBlend += (windTarget - spidey.windBlend) * (1 - Math.exp(-windRate * dt));
    spidey.windDir += (mouseDirX - spidey.windDir) * (1 - Math.exp(-5 * dt));
  }

  // Smooth squash-turn interpolation over ~0.15s when facing flips between -1 and 1
  const prevFacingScale = spidey.facingScale;
  const turnRate = 18.0;
  spidey.facingScale += (spidey.facing - spidey.facingScale) * (1 - Math.exp(-turnRate * dt));
  if (Math.abs(spidey.facing - spidey.facingScale) < 0.01) {
    spidey.facingScale = spidey.facing;
  }
  // Subtle hop when passing through 0 during a turn
  if (prevFacingScale * spidey.facingScale <= 0 || Math.abs(spidey.facing - spidey.facingScale) > 0.15) {
    spidey.turnHop = (1 - Math.abs(spidey.facingScale)) * 2.5 * uniformScale;
  } else {
    spidey.turnHop = 0;
  }

  if (spidey.landSquash > 0) {
    spidey.landSquash = Math.max(0, spidey.landSquash - dt * 3.8);
  }

  if (spidey.flipTimer > 0) {
    spidey.flipTimer = Math.max(0, spidey.flipTimer - dt / 0.65);
  }

  if (clickEffect.active) {
    const prevClickTimer = clickEffect.timer;
    clickEffect.timer += dt;
    // While LMB is held, keep the thrown web line active from Spider-Man's hand
    if (isLmbHeld && !clickEffect.isSpideyClick) {
      if (clickEffect.cardIdx === -1 && isPointerActive) {
        clickEffect.targetX = smoothMouseX;
        clickEffect.targetY = smoothMouseY;
      }
      if (clickEffect.timer > 0.35) {
        clickEffect.timer = 0.35;
      }
    }
    // Leave a lingering web tag where the click web stuck
    if (!clickEffect.isSpideyClick && prevClickTimer < 0.14 && clickEffect.timer >= 0.14) {
      addWebTag(
        clickEffect.targetX, clickEffect.targetY,
        Math.atan2(clickEffect.targetY - spidey.handWorldY, clickEffect.targetX - spidey.handWorldX),
        clickEffect.cardIdx, clickEffect.relX, clickEffect.relY
      );
    }
    if (clickEffect.timer >= clickEffect.duration) {
      clickEffect.active = false;
    }
  }

  if (trailingWeb.active) {
    trailingWeb.alpha -= dt * 1.25;
    trailingWeb.vy += 1100 * uniformScale * dt;      // gravity
    trailingWeb.vx *= Math.exp(-3.0 * dt);            // air drag
    trailingWeb.handX += trailingWeb.vx * dt;
    trailingWeb.handY += trailingWeb.vy * dt;
    if (trailingWeb.alpha <= 0) {
      trailingWeb.alpha = 0;
      trailingWeb.active = false;
    }
  }

  // Update landing dust particles
  if (activeDustCount > 0) {
    let anyAlive = false;
    for (let i = 0; i < activeDustCount; i++) {
      if (dustAlpha[i] > 0.01) {
        dustX[i] += dustVx[i] * dt;
        dustY[i] += dustVy[i] * dt;
        dustVx[i] *= Math.exp(-5.5 * dt);
        dustVy[i] *= Math.exp(-5.5 * dt);
        dustAlpha[i] -= dt * 2.4;
        anyAlive = true;
      }
    }
    if (!anyAlive) activeDustCount = 0;
  }

  // Handle 0.11s launch crouch anticipation before jumping off a card
  if (spidey.preJumpTimer > 0) {
    spidey.preJumpTimer -= dt;
    spidey.x = getCardPerchX(spidey.currentCard, spidey.perchMode);
    spidey.y = getCardPerchY(spidey.currentCard, spidey.perchMode);
    if (spidey.preJumpTimer <= 0 && spidey.pendingTargetCard !== -1) {
      const nextTarget = spidey.pendingTargetCard;
      spidey.pendingTargetCard = -1;
      launchSwingNow(nextTarget, false);
    }
    return;
  }

  if (!spidey.isSwinging) {
    spidey.x = getCardPerchX(spidey.currentCard, spidey.perchMode);
    spidey.y = getCardPerchY(spidey.currentCard, spidey.perchMode);
    spidey.vx = 0;
    spidey.vy = 0;

    // Progress through chibi idle states:
    // 0..2s:   Top panel pose (hands raised, wide giant eyes)
    // 2..5s:   Bottom panel pose (hands on hips, sassy squinting eyes)
    // 5..18s:  Sitting on the card edge dangling and kicking his stubby legs
    // >18s:    Deep idle behavior (yawn/stretch, lying flat on card, or web-hang)
    spidey.idleTime += dt;

    const deepDelay = getDeepIdleDelay();
    const wasBelowDeep = (spidey.idleTime - dt) < deepDelay;
    if (wasBelowDeep && spidey.idleTime >= deepDelay) {
      const r = Math.random();
      if (timeOfDayMode === TOD_NIGHT) {
        spidey.deepIdleMode = r < 0.15 ? DEEP_IDLE_YAWN : (r < 0.8 ? DEEP_IDLE_LIE_DOWN : DEEP_IDLE_WEB_HANG);
      } else if (timeOfDayMode === TOD_MORNING) {
        spidey.deepIdleMode = r < 0.7 ? DEEP_IDLE_YAWN : (r < 0.9 ? DEEP_IDLE_LIE_DOWN : DEEP_IDLE_WEB_HANG);
      } else {
        spidey.deepIdleMode = r < 0.34 ? DEEP_IDLE_YAWN : (r < 0.68 ? DEEP_IDLE_LIE_DOWN : DEEP_IDLE_WEB_HANG);
      }
    }

    let targetSassy = (spidey.idleTime >= config.sassyPoseDelay && spidey.idleTime < config.idleSitDelay) ? 1.0 : 0.0;
    let targetSit = spidey.idleTime >= config.idleSitDelay ? 1.0 : 0.0;
    let targetDeep = spidey.idleTime >= deepDelay ? 1.0 : 0.0;

    // Hover reactions on special cards (cursor resting on the card he's perched on)
    const reactCode = CARD_REACTIONS[spidey.currentCard] | 0;
    const wantReact = reactCode !== REACT_NONE && isPointerActive &&
      cards[spidey.currentCard].fieldStrength > 0.45 && spidey.idleTime > 0.35 && spidey.flipTimer <= 0;
    if (wantReact || spidey.reactionBlend < 0.02) spidey.reactionCode = reactCode;
    spidey.reactionBlend += ((wantReact ? 1 : 0) - spidey.reactionBlend) * (1 - Math.exp(-(wantReact ? 6.0 : 3.0) * dt));
    if (wantReact) {
      targetDeep = 0;
      if (reactCode === REACT_HELLYES) { targetSassy = 1; targetSit = 0; }
      else if (reactCode === REACT_GIMME) { targetSassy = 0; targetSit = 0; }
      else if (reactCode === REACT_AWESOME) { spidey.deepIdleMode = DEEP_IDLE_LIE_DOWN; targetDeep = 1; }
      else if (reactCode === REACT_CHILL) { targetSit = 1; targetSassy = 0; }
    }

    spidey.sassyBlend += (targetSassy - spidey.sassyBlend) * (1 - Math.exp(-5.0 * dt));
    spidey.sitBlend += (targetSit - spidey.sitBlend) * (1 - Math.exp(-4.2 * dt));
    spidey.deepIdleBlend += (targetDeep - spidey.deepIdleBlend) * (1 - Math.exp(-3.2 * dt));

    if (isPointerActive) {
      const lookDx = smoothMouseX - spidey.x;
      if (Math.abs(lookDx) > 16 * uniformScale) {
        spidey.facing = lookDx >= 0 ? 1 : -1;
      }
    }
    return;
  }

  if (spidey.endIsCard) {
    spidey.endX = getCardPerchX(spidey.currentCard, spidey.nextPerchMode);
    spidey.endY = getCardPerchY(spidey.currentCard, spidey.nextPerchMode);
  }
  if (spidey.swingMode === SWING_ZIP) {
    spidey.anchorX = spidey.endX;
    spidey.anchorY = spidey.endY;
  } else {
    updateLiveWebAnchor();
  }

  const prevSwingT = spidey.swingT;
  spidey.swingT += dt / spidey.swingDuration;

  // Let go of the web near the end of a normal pendulum arc -> it droops and falls away
  if (spidey.swingMode === SWING_PENDULUM && !spidey.isChainSegment && prevSwingT < 0.85 && spidey.swingT >= 0.85) {
    releaseWebStrand(0.9);
  }

  if (spidey.swingT >= 1) {
    // Two-web swing: let go of web #1 mid-air and immediately fire web #2 at the real target
    if (spidey.isChainSegment && spidey.chainTargetCard >= 0) {
      spidey.isChainSegment = false;
      spidey.x = spidey.endX;
      spidey.y = spidey.endY;
      releaseWebStrand(0.9);
      const tgt = spidey.chainTargetCard;
      spidey.chainTargetCard = -1;
      beginSwingSegment(
        SWING_PENDULUM,
        getCardPerchX(tgt, spidey.nextPerchMode),
        getCardPerchY(tgt, spidey.nextPerchMode),
        true, -1, true
      );
      return;
    }

    const wasZip = spidey.swingMode === SWING_ZIP;
    spidey.swingT = 1;
    spidey.isSwinging = false;
    spidey.isChainSegment = false;
    spidey.perchMode = spidey.nextPerchMode;
    spidey.x = spidey.endX;
    spidey.y = spidey.endY;
    spidey.vx = 0;
    spidey.vy = 0;
    spidey.landSquash = 1.0;
    spidey.idleTime = 0;
    spidey.sassyBlend = 0;
    spidey.sitBlend = 0;
    spidey.deepIdleBlend = 0;

    // Finalize any photo-to-photo web connection carried during this swing
    finalizeActiveDragWeb();

    if (wasZip) {
      // The zip web stays stuck where he landed
      const c = cards[spidey.currentCard];
      const sc = c.scale * (1 + audioEnergy * 0.025);
      addWebTag(
        spidey.x, spidey.y, -Math.PI * 0.5, spidey.currentCard,
        (spidey.x - (c.cx + c.offsetX)) / Math.max(1, c.baseW * sc),
        (spidey.y - (c.cy + c.offsetY)) / Math.max(1, c.baseH * sc)
      );
    }

    // Spawn landing dust / comic impact ticks at the perch surface
    if (spidey.perchMode === PERCH_BOTTOM_UPSIDE_DOWN) {
      spawnLandingImpact(spidey.x, spidey.y, 0, 1);
    } else if (spidey.perchMode === PERCH_SIDE_EDGE) {
      spawnLandingImpact(spidey.x, spidey.y, cards[spidey.currentCard].sideDir, 0);
    } else {
      spawnLandingImpact(spidey.x, spidey.y, 0, -1);
    }

    // Continue webbing multiple images in sequence while LMB remains held
    if (isLmbHeld && lmbQueueCount > 0) {
      const nextCard = dequeueLmbCard();
      if (nextCard !== -1) {
        requestSwingToCard(nextCard);
      }
    }
    return;
  }

  const t = spidey.swingT;
  const prevX = spidey.x;
  const prevY = spidey.y;

  if (spidey.swingMode === SWING_ZIP) {
    computeZipPosition(t);
  } else {
    computePendulumPosition(t);
  }

  // Blend in the previous momentum for ~0.2s after a mid-air retarget (no velocity pops)
  if (spidey.carryTime > 0) {
    const el = t * spidey.swingDuration;
    if (el < spidey.carryTime) {
      const w0 = 1 - el / spidey.carryTime;
      const w = w0 * w0;
      spidey.x += (spidey.startX + spidey.carryVx * el - spidey.x) * w;
      spidey.y += (spidey.startY + spidey.carryVy * el - spidey.y) * w;
    }
  }

  spidey.y = Math.min(spidey.y, viewHeight - 14 * uniformScale);
  spidey.vx = (spidey.x - prevX) / dt;
  spidey.vy = (spidey.y - prevY) / dt;
}

/**
 * Comic speech bubble (no measureText - width estimated from character count).
 */
function drawComicBubble(x, y, text, s, alpha, rot) {
  if (alpha <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  const w = text.length * 5.0 * s + 10 * s;
  ctx.fillStyle = '#fffef2';
  ctx.strokeStyle = '#080608';
  ctx.lineWidth = 1.6 * s;
  traceRoundedRect(-w * 0.5, -8 * s, w, 16 * s, 5 * s);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#c81d25';
  ctx.font = '900 ' + Math.round(8.5 * s) + 'px Impact, Arial Black, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0.5 * s);
  ctx.restore();
}

function drawHeartShape(x, y, h) {
  const w = h * 0.5;
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.3);
  ctx.bezierCurveTo(x, y, x - w, y, x - w, y + h * 0.3);
  ctx.bezierCurveTo(x - w, y + h * 0.6, x, y + h * 0.75, x, y + h);
  ctx.bezierCurveTo(x, y + h * 0.75, x + w, y + h * 0.6, x + w, y + h * 0.3);
  ctx.bezierCurveTo(x + w, y, x, y, x, y + h * 0.3);
  ctx.closePath();
}

function drawSweatDrop(x, y, size, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#bfe6ff';
  ctx.strokeStyle = '#0f1423';
  ctx.lineWidth = Math.max(0.6, 0.8 * uniformScale);
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x + size * 0.8, y + size * 0.2, x, y + size * 0.6);
  ctx.quadraticCurveTo(x - size * 0.8, y + size * 0.2, x, y - size);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/**
 * Mini-reactions when the cursor rests on the special card Spider-Man is perched on.
 */
function drawCardReaction(s) {
  const a = spidey.reactionBlend;
  if (a < 0.03 || spidey.isSwinging || !spidey.headWorldX) return;
  const hx = spidey.headWorldX;
  const hy = spidey.headWorldY;
  const f = spidey.facing;
  const pop = Math.min(1, a * 1.3);
  const bx = hx + f * 22 * s;
  const by = hy - 20 * s - (1 - pop) * 6 * s;
  const code = spidey.reactionCode;

  if (code === REACT_HEARTS) {
    ctx.save();
    ctx.fillStyle = '#ff4d6d';
    ctx.strokeStyle = '#080608';
    ctx.lineWidth = 0.9 * s;
    for (let k = 0; k < 3; k++) {
      const p = (elapsedTime * 0.55 + k / 3) % 1;
      ctx.globalAlpha = a * Math.sin(p * Math.PI);
      const size = (5 + p * 2.5) * s;
      drawHeartShape(hx + (k - 1) * 9 * s + Math.sin(p * 6 + k) * 3 * s, hy - 14 * s - p * 28 * s, size);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  } else if (code === REACT_MUSIC) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let k = 0; k < 3; k++) {
      const p = (elapsedTime * 0.5 + k / 3) % 1;
      ctx.globalAlpha = a * Math.sin(p * Math.PI) * 0.95;
      ctx.font = 'bold ' + Math.round((9 + p * 3) * s) + 'px sans-serif';
      ctx.fillText(k === 1 ? '\u266B' : '\u266A', hx + f * (10 + k * 6) * s + Math.sin(p * 7 + k) * 3 * s, hy - 10 * s - p * 26 * s);
    }
    ctx.restore();
  } else if (code === REACT_CAMERA) {
    const p = (elapsedTime * 0.7) % 1;
    const flash = p < 0.12 ? 1 - p / 0.12 : 0;
    if (flash > 0.01) {
      const fx = hx + f * 16 * s;
      const fy = hy - 2 * s;
      const r = 11 * s * (0.6 + flash * 0.4);
      ctx.save();
      ctx.globalAlpha = a * flash;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(fx, fy - r);
      ctx.quadraticCurveTo(fx, fy, fx + r, fy);
      ctx.quadraticCurveTo(fx, fy, fx, fy + r);
      ctx.quadraticCurveTo(fx, fy, fx - r, fy);
      ctx.quadraticCurveTo(fx, fy, fx, fy - r);
      ctx.fill();
      ctx.restore();
    }
    drawComicBubble(bx, by, 'CLICK!', s, a, -0.1 * f);
  } else if (code === REACT_OWW) {
    const shake = Math.sin(elapsedTime * 40) * 1.2 * s;
    drawComicBubble(bx + shake, by, 'OWW!', s, a, -0.14 * f);
    drawSweatDrop(hx - f * 13 * s, hy - 6 * s + ((elapsedTime * 0.8) % 1) * 5 * s, 3.2 * s, a);
  } else if (code === REACT_SWEAT) {
    drawSweatDrop(hx - f * 13 * s, hy - 8 * s + ((elapsedTime * 0.6) % 1) * 6 * s, 3.4 * s, a);
    drawComicBubble(bx, by, '...', s, a, 0);
  } else if (code === REACT_GIMME) {
    drawComicBubble(bx, by - Math.abs(Math.sin(elapsedTime * 6)) * 2 * s, 'GIMME!', s, a, -0.12 * f);
  } else if (code === REACT_HELLYES) {
    drawComicBubble(bx, by, 'HELL YEAH!', s, a, -0.1 * f);
  } else if (code === REACT_AWESOME) {
    drawComicBubble(bx, by, 'AWESOME.', s, a, -0.06 * f);
  } else if (code === REACT_CONFUSED) {
    drawComicBubble(bx, by, '?!', s, a, 0.1 * f);
  } else if (code === REACT_OUCH) {
    drawComicBubble(bx, by, 'ouch...', s, a, 0.05 * f);
  } else if (code === REACT_CHILL) {
    drawComicBubble(bx, by, 'NICE.', s, a, -0.05 * f);
  }
}
