/**
 * character/spidey-renderer.js
 * Renders Chibi Spider-Man across all swinging, perched, sitting, and deep-idle poses.
 * - Mid-air shadow & faint speed lines during fast swings
 * - Top-row randomized perch modes (bottom upside-down, side edge, or low top crouch)
 * - Continuous arm/torso interpolation into sitting (zero z-order pop)
 * - Smooth squash-turn (`facingScale`), natural randomized blinking, and deep-idle poses (>18s)
 */
function drawSpiderMan() {
  if (!config.showSpidey || !spidey.initialized) return;

  const s = uniformScale * config.spideyScale;
  const ink = 1.35 * s;

  drawLandingDust();

  if (trailingWeb.active && trailingWeb.alpha > 0.01) {
    drawWebLine(
      trailingWeb.handX,
      trailingWeb.handY,
      trailingWeb.anchorX,
      trailingWeb.anchorY,
      1.0,
      trailingWeb.alpha * 0.75,
      0.0,
      Math.sin(elapsedTime * 11) * 3 * uniformScale * trailingWeb.alpha,
      true
    );
  }

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (spidey.isSwinging) {
    // =================================================================
    // CHIBI SWINGING POSE (with mid-air shadow + faint speed lines)
    // =================================================================
    const t = spidey.swingT;
    const dir = spidey.facing;
    const speed = Math.hypot(spidey.vx, spidey.vy);

    // 1. Mid-air shadow grounding Spider-Man visually during the swing
    ctx.save();
    ctx.globalAlpha = 0.28 * (1 - Math.sin(t * Math.PI) * 0.35);
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(spidey.x, spidey.y + 16 * s, 11.5 * s, 3.0 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Faint comic speed lines trailing behind fast swings
    if (speed > 260 * uniformScale) {
      const invSpeed = 1 / Math.max(1, speed);
      const ux = -spidey.vx * invSpeed;
      const uy = -spidey.vy * invSpeed;
      const nx = -uy;
      const ny = ux;
      const lineLen = Math.min(34 * s, speed * 0.045);

      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.15 * s;
      for (let k = -1; k <= 1; k++) {
        ctx.globalAlpha = (k === 0 ? 0.24 : 0.15) * Math.sin(t * Math.PI);
        const ox = spidey.x + nx * (k * 8.5 * s) + ux * 10 * s;
        const oy = (spidey.y - 10 * s) + ny * (k * 8.5 * s) + uy * 10 * s;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox + ux * lineLen, oy + uy * lineLen);
        ctx.stroke();
      }
      ctx.restore();
    }

    const webAttached = spidey.swingMode === SWING_ZIP ? t < 0.94 : (spidey.isChainSegment || t < 0.85);
    const shootProgress = Math.min(1, t / 0.12);
    const webAlpha = 0.95; // Released strand (trailingWeb) takes over at t = 0.85

    const swingAngle = Math.atan2(spidey.vy, spidey.vx * dir) * 0.32 * dir;
    const releaseFlip = t > 0.78 ? Math.sin(((t - 0.78) / 0.22) * Math.PI) * 0.4 * dir : 0;
    const bodyTilt = swingAngle + releaseFlip;

    const localHandX = dir * 9.5 * s;
    const localHandY = -18.5 * s;
    const cosA = Math.cos(bodyTilt);
    const sinA = Math.sin(bodyTilt);
    const worldHandX = spidey.x + (localHandX * cosA - localHandY * sinA);
    const worldHandY = (spidey.y - 12 * s) + (localHandX * sinA + localHandY * cosA);
    spidey.handWorldX = worldHandX;
    spidey.handWorldY = worldHandY;

    if (webAttached) {
      // Slack while shooting -> pulls taut through the bottom of the arc -> eases before release
      let webTension = 0.3;
      let webWobble = 0;
      if (shootProgress >= 1) {
        if (spidey.swingMode === SWING_ZIP) {
          webTension = 1.0; // Zip line is pulled dead straight
        } else {
          const pull = Math.min(1, Math.max(0, (t - 0.12) / 0.16));
          const ease = (t > 0.68 && !spidey.isChainSegment) ? Math.max(0, 1 - (t - 0.68) / 0.17) : 1;
          webTension = 0.3 + 0.7 * pull * (0.6 + 0.4 * ease);
        }
        const tau = (t - 0.12) * spidey.swingDuration; // seconds since the web stuck
        webWobble = 6 * uniformScale * Math.exp(-tau * 10) * Math.cos(tau * 48);
      }
      drawWebLine(worldHandX, worldHandY, spidey.anchorX, spidey.anchorY, shootProgress, webAlpha, webTension, webWobble, true);
    }

    ctx.translate(spidey.x, spidey.y - 12 * s);
    ctx.rotate(bodyTilt);

    const legSwing = Math.sin(t * Math.PI) * 3.5 * s;

    drawOutlinedSegment(-3.2 * dir * s, 3.5 * s, (-7.0 * dir) * s, 8.5 * s, 4.4 * s, '#13284c', ink);
    drawOutlinedSegment((-7.0 * dir) * s, 8.5 * s, (-9.5 * dir) * s, 12.2 * s, 4.2 * s, '#c81d25', ink);

    drawOutlinedSegment(3.2 * dir * s, 3.5 * s, (7.5 * dir) * s, (4.5 - legSwing * 0.2) * s, 4.6 * s, '#13284c', ink);
    drawOutlinedSegment((7.5 * dir) * s, (4.5 - legSwing * 0.2) * s, (5.5 * dir) * s, 10.2 * s, 4.4 * s, '#c81d25', ink);

    drawChibiTorso(0, -1.5 * s, 11.2 * s, 10.5 * s, s);

    drawOutlinedSegment(4.2 * dir * s, -4.5 * s, 9.5 * dir * s, -18.5 * s, 3.8 * s, '#c81d25', ink);
    // Trailing chibi arm (aims at click target if a click "THWIP!" web is active during swing)
    let freeArmEndX = -11.0 * dir * s;
    let freeArmEndY = -0.5 * s;
    if (clickEffect.active && !clickEffect.isSpideyClick) {
      freeArmEndX = 8.5 * dir * s;
      freeArmEndY = 2.0 * s;
    }
    drawOutlinedSegment(-4.2 * dir * s, -4.0 * s, freeArmEndX * 0.75, freeArmEndY * 0.75 - 1.0 * s, 3.8 * s, '#13284c', ink);
    drawOutlinedSegment(freeArmEndX * 0.75, freeArmEndY * 0.75 - 1.0 * s, freeArmEndX, freeArmEndY, 3.8 * s, '#c81d25', ink);

    if (clickEffect.active && !clickEffect.isSpideyClick) {
      spidey.handWorldX = spidey.x + (freeArmEndX * cosA - freeArmEndY * sinA);
      spidey.handWorldY = (spidey.y - 12 * s) + (freeArmEndX * sinA + freeArmEndY * cosA);
    }

    spidey.headRot = bodyTilt;
    spidey.headFlipY = 1;
    spidey.headWorldX = spidey.x + (1.2 * dir * s * cosA - (-15.2 * s) * sinA);
    spidey.headWorldY = (spidey.y - 12 * s) + (1.2 * dir * s * sinA + (-15.2 * s) * cosA);
    drawChibiHead(1.2 * dir * s, -15.2 * s, s, spidey.facingScale, t < 0.22 ? 0.55 : 0.0);
  } else {
    // =================================================================
    // CHIBI PERCHED & IDLE POSES (Unified Z-Order, Top-Row Modes, Deep Idle)
    // =================================================================
    const sassy = spidey.sassyBlend * spidey.sassyBlend * (3 - 2 * spidey.sassyBlend);
    const rawSit = spidey.sitBlend;
    const sit = rawSit * rawSit * (3 - 2 * rawSit);
    const deep = spidey.deepIdleBlend * spidey.deepIdleBlend * (3 - 2 * spidey.deepIdleBlend);

    const breath = Math.sin(elapsedTime * 3.0) * 0.65 * s;
    const preJumpCrouch = spidey.preJumpTimer > 0 ? Math.sin((spidey.preJumpTimer / 0.11) * Math.PI) * 0.34 : 0;
    const landSquashVal = Math.sin(spidey.landSquash * Math.PI) * 0.22;
    const totalCrouch = Math.max(preJumpCrouch, landSquashVal);

    // Top-row crouch mode keeps him extra compact so his head stays well inside the top of the screen
    const modeCrouch = spidey.perchMode === PERCH_TOP_CROUCH ? 0.26 * (1 - sit * 0.7) : 0;

    const scaleXPerch = 1 + (totalCrouch + modeCrouch * 0.4) * 0.65;
    const scaleYPerch = 1 - (totalCrouch + modeCrouch);

    let worldOriginX = spidey.x;
    let worldOriginY = spidey.y - spidey.turnHop;
    let worldRot = 0;
    let worldFlipY = 1;

    ctx.translate(worldOriginX, worldOriginY);

    // Apply orientation transform for Top-Row randomized perch modes or Web-Hang deep idle
    const isWebHangDeep = (deep > 0.05 && spidey.deepIdleMode === DEEP_IDLE_WEB_HANG && spidey.perchMode !== PERCH_BOTTOM_UPSIDE_DOWN);
    if (spidey.perchMode === PERCH_BOTTOM_UPSIDE_DOWN) {
      // Hang upside-down from the bottom edge of a top-row card (with a short web line if sitting/chilling)
      const dropDist = 8.0 * sit * s;
      if (dropDist > 1.0) {
        drawWebLine(0, 0, 0, dropDist + 4 * s, 1.0, 0.9, 1.0, Math.sin(elapsedTime * 2.3) * 0.6 * s, false);
      }
      ctx.translate(0, dropDist);
      ctx.scale(1, -1);
      worldOriginY += dropDist;
      worldFlipY = -1;
    } else if (spidey.perchMode === PERCH_SIDE_EDGE) {
      // Sit/perch on the inner vertical side border of a top-row card
      const sideDir = cards[spidey.currentCard].sideDir;
      worldRot = sideDir * Math.PI * 0.5;
      ctx.rotate(worldRot);
    } else if (isWebHangDeep) {
      // Deep Idle Mode 2: Hang upside-down from a web thread below the top border
      const hangDrop = 34 * deep * s;
      drawWebLine(0, 0, 0, hangDrop, 1.0, 0.9 * deep, 1.0, Math.sin(elapsedTime * 1.9) * 1.2 * s, false);
      ctx.translate(0, hangDrop);
      worldOriginY += hangDrop;
      worldRot = Math.PI * deep;
      ctx.rotate(worldRot);
    } else if (deep > 0.05 && spidey.deepIdleMode === DEEP_IDLE_LIE_DOWN) {
      // Deep Idle Mode 1: Lie down comfortably on the card edge
      const lieDrop = 3.5 * deep * s;
      ctx.translate(0, lieDrop);
      worldOriginY += lieDrop;
      worldRot = -0.42 * deep * spidey.facing;
      ctx.rotate(worldRot);
    }

    // Excited click backflip + wave when the user clicks Spider-Man
    if (spidey.flipTimer > 0) {
      const flipP = 1 - spidey.flipTimer;
      const jumpH = Math.sin(flipP * Math.PI) * 26 * s;
      ctx.translate(0, -jumpH);
      worldOriginY -= jumpH * worldFlipY;
      const flipAngle = flipP * Math.PI * 2 * spidey.facing;
      ctx.rotate(flipAngle);
      worldRot += flipAngle * worldFlipY;
    }

    // Brace against "wind" when the cursor is whipped around fast
    if (spidey.windBlend > 0.01) {
      const w = spidey.windBlend;
      const lean = -spidey.windDir * 0.13 * w + Math.sin(elapsedTime * 31) * 0.05 * w;
      ctx.rotate(lean);
      worldRot += lean * worldFlipY;

      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.1 * s;
      ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        const p = (elapsedTime * 2.4 + k * 0.37) % 1;
        ctx.globalAlpha = 0.35 * w * Math.sin(p * Math.PI);
        const yy = (-34 + k * 11) * s;
        const xx = (p - 0.5) * 70 * s * spidey.windDir;
        ctx.beginPath();
        ctx.moveTo(xx - 9 * s * spidey.windDir, yy);
        ctx.lineTo(xx + 9 * s * spidey.windDir, yy);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.scale(scaleXPerch, scaleYPerch);

    // 1. Surface shadow on the card border
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(0, (0.4 + sit * 1.0) * s, 12.5 * s, 2.2 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Alternating leg-kick oscillation when sitting & dangling legs over the image edge
    const kickPhase = elapsedTime * 3.2;
    const leftKickX = Math.sin(kickPhase) * 1.8 * s * sit;
    const leftKickY = Math.cos(kickPhase) * 2.1 * s * sit;
    const rightKickX = Math.sin(kickPhase + Math.PI) * 1.8 * s * sit;
    const rightKickY = Math.cos(kickPhase + Math.PI) * 2.1 * s * sit;

    const torsoCenterY = (-10.8 + sit * 4.2 + modeCrouch * 3.5) * s + breath;

    // --- Continuous Arm Joint Interpolation (Standing Pose A/B <-> Sitting Propped Arms <-> Yawn Stretch) ---
    const standLElbowX = (-7.2 * (1 - sassy) + (-8.6) * sassy) * s;
    const standLElbowY = (torsoCenterY + 0.5 * s) * (1 - sassy) + (torsoCenterY - 0.5 * s) * sassy;
    const standLHandX = (-3.6 * (1 - sassy) + (-5.5) * sassy) * s;
    const standLHandY = (torsoCenterY - 1.2 * s) * (1 - sassy) + (torsoCenterY + 2.8 * s) * sassy;

    const standRElbowX = (7.2 * (1 - sassy) + 8.6 * sassy) * s;
    const standRElbowY = (torsoCenterY + 0.5 * s) * (1 - sassy) + (torsoCenterY - 0.5 * s) * sassy;
    const standRHandX = (6.8 * (1 - sassy) + 5.5 * sassy) * s;
    const standRHandY = (torsoCenterY - 1.4 * s) * (1 - sassy) + (torsoCenterY + 2.8 * s) * sassy;

    // Sitting propped arms target
    const sitLElbowX = -7.2 * s;
    const sitLElbowY = -3.2 * s;
    const sitLHandX = -8.8 * s;
    const sitLHandY = -0.8 * s;

    const sitRElbowX = 7.2 * s;
    const sitRElbowY = -3.2 * s;
    const sitRHandX = 8.8 * s;
    const sitRHandY = -0.8 * s;

    // Yawn / overhead stretch target when deep idle mode === DEEP_IDLE_YAWN
    const yawnStretch = (spidey.deepIdleMode === DEEP_IDLE_YAWN) ? deep * (0.5 + 0.5 * Math.sin(elapsedTime * 1.6)) : 0;

    const lShoulderX = -5.0 * s;
    const lShoulderY = torsoCenterY - 2.6 * s;
    let lElbowX = standLElbowX * (1 - sit) + sitLElbowX * sit - yawnStretch * 2.5 * s;
    let lElbowY = standLElbowY * (1 - sit) + sitLElbowY * sit - yawnStretch * 8.5 * s;
    let lHandX = standLHandX * (1 - sit) + sitLHandX * sit - yawnStretch * 3.0 * s;
    let lHandY = standLHandY * (1 - sit) + sitLHandY * sit - yawnStretch * 14.0 * s;

    const rShoulderX = 5.0 * s;
    const rShoulderY = torsoCenterY - 2.6 * s;
    let rElbowX = standRElbowX * (1 - sit) + sitRElbowX * sit + yawnStretch * 2.5 * s;
    let rElbowY = standRElbowY * (1 - sit) + sitRElbowY * sit - yawnStretch * 8.5 * s;
    let rHandX = standRHandX * (1 - sit) + sitRHandX * sit + yawnStretch * 3.0 * s;
    let rHandY = standRHandY * (1 - sit) + sitRHandY * sit - yawnStretch * 14.0 * s;

    // If shooting a click "THWIP!" web while perched, extend the facing arm toward the clicked point
    if (clickEffect.active && !clickEffect.isSpideyClick) {
      if (spidey.facing >= 0) {
        rElbowX = 8.2 * s;
        rElbowY = torsoCenterY - 3.5 * s;
        rHandX = 11.8 * s;
        rHandY = torsoCenterY - 4.2 * s;
      } else {
        lElbowX = -8.2 * s;
        lElbowY = torsoCenterY - 3.5 * s;
        lHandX = -11.8 * s;
        lHandY = torsoCenterY - 4.2 * s;
      }
    }

    // Morning coffee (06-10): hold a steaming mug while sitting upright on a top edge
    const uprightPerch = spidey.perchMode === PERCH_TOP_NORMAL || spidey.perchMode === PERCH_TOP_CROUCH;
    const coffee = (timeOfDayMode === TOD_MORNING && uprightPerch && !(clickEffect.active && !clickEffect.isSpideyClick))
      ? sit * (1 - deep) * (1 - spidey.reactionBlend)
      : 0;
    if (coffee > 0.01) {
      rElbowX += (8.0 * s - rElbowX) * coffee;
      rElbowY += ((torsoCenterY + 2.0 * s) - rElbowY) * coffee;
      rHandX += (4.6 * s - rHandX) * coffee;
      rHandY += ((torsoCenterY - 3.4 * s) - rHandY) * coffee;
    }

    // Compute exact world coordinates of the active web-shooting hand
    const activeLocalHandX = (spidey.facing >= 0 ? rHandX : lHandX) * scaleXPerch;
    const activeLocalHandY = (spidey.facing >= 0 ? rHandY : lHandY) * scaleYPerch * worldFlipY;
    const cosR = Math.cos(worldRot);
    const sinR = Math.sin(worldRot);
    spidey.handWorldX = worldOriginX + (activeLocalHandX * cosR - activeLocalHandY * sinR);
    spidey.handWorldY = worldOriginY + (activeLocalHandX * sinR + activeLocalHandY * cosR);

    // Unified Z-Order Step 1: Chibi Torso
    drawChibiTorso(0, torsoCenterY, 11.3 * s, 10.2 * s, s);

    // Unified Z-Order Step 2: Stubby Chibi Legs & Boots (smoothly morph from A-stance to dangling in front)
    const hipY = (-6.2 + sit * 4.8 + modeCrouch * 2.2) * s + breath * (1 - sit * 0.5);

    const lKneeX = (-5.2 * (1 - sit) + (-3.8) * sit) * s + leftKickX * 0.3;
    const lKneeY = (-3.4 * (1 - sit) + 2.2 * sit) * s;
    const lFootX = (-6.8 * (1 - sit) + (-4.0) * sit) * s + leftKickX;
    const lFootY = (-0.8 * (1 - sit) + 10.8 * sit) * s + leftKickY;

    const rKneeX = (5.2 * (1 - sit) + 3.8 * sit) * s + rightKickX * 0.3;
    const rKneeY = (-3.4 * (1 - sit) + 2.2 * sit) * s;
    const rFootX = (6.8 * (1 - sit) + 4.0 * sit) * s + rightKickX;
    const rFootY = (-0.8 * (1 - sit) + 10.8 * sit) * s + rightKickY;

    if (sit < 0.85) {
      ctx.save();
      ctx.globalAlpha = 1 - sit * 0.85;
      ctx.fillStyle = '#13284c';
      ctx.strokeStyle = '#080608';
      ctx.lineWidth = 1.35 * s;
      ctx.beginPath();
      ctx.moveTo(-4.8 * s, hipY - 1.5 * s);
      ctx.lineTo(4.8 * s, hipY - 1.5 * s);
      ctx.lineTo(6.2 * s, -2.5 * s);
      ctx.quadraticCurveTo(0, -4.8 * s, -6.2 * s, -2.5 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    drawOutlinedSegment(-3.6 * s, hipY, lKneeX, lKneeY, 4.8 * s, '#13284c', ink);
    drawOutlinedSegment(3.6 * s, hipY, rKneeX, rKneeY, 4.8 * s, '#13284c', ink);

    drawOutlinedSegment(lKneeX, lKneeY, lFootX, lFootY, 4.5 * s, '#c81d25', ink);
    drawOutlinedSegment(lFootX - 1.8 * s, lFootY, lFootX + 1.2 * s, lFootY, 3.6 * s, '#c81d25', ink);

    drawOutlinedSegment(rKneeX, rKneeY, rFootX, rFootY, 4.5 * s, '#c81d25', ink);
    drawOutlinedSegment(rFootX - 1.2 * s, rFootY, rFootX + 1.8 * s, rFootY, 3.6 * s, '#c81d25', ink);

    // Unified Z-Order Step 3: Arms (continuous interpolation from raised -> hips -> propped on ledge)
    drawOutlinedSegment(lShoulderX, lShoulderY, lElbowX, lElbowY, 3.6 * s, '#13284c', ink);
    drawOutlinedSegment(lElbowX, lElbowY, lHandX, lHandY, 3.8 * s, '#c81d25', ink);

    drawOutlinedSegment(rShoulderX, rShoulderY, rElbowX, rElbowY, 3.6 * s, '#13284c', ink);
    drawOutlinedSegment(rElbowX, rElbowY, rHandX, rHandY, 3.8 * s, '#c81d25', ink);

    // Little spread chibi fingers when in the Top Panel hands-up pose
    const fingerAlpha = Math.max(0, 1 - Math.max(sassy, sit) * 1.6);
    if (fingerAlpha > 0.05) {
      ctx.save();
      ctx.globalAlpha = fingerAlpha;
      ctx.strokeStyle = '#080608';
      ctx.lineWidth = 2.2 * s;
      ctx.beginPath();
      ctx.moveTo(lHandX, lHandY); ctx.lineTo(lHandX - 1.8 * s, lHandY - 1.8 * s);
      ctx.moveTo(lHandX, lHandY); ctx.lineTo(lHandX + 1.5 * s, lHandY - 1.6 * s);
      ctx.moveTo(rHandX, rHandY); ctx.lineTo(rHandX + 2.2 * s, rHandY - 1.5 * s);
      ctx.moveTo(rHandX, rHandY); ctx.lineTo(rHandX + 2.0 * s, rHandY + 1.2 * s);
      ctx.stroke();
      ctx.restore();
    }

    // Steaming coffee mug in his right hand
    if (coffee > 0.3) {
      const mugA = Math.min(1, (coffee - 0.3) / 0.4);
      const mx = rHandX - 1.2 * s;
      const my = rHandY - 4.6 * s;
      ctx.save();
      ctx.globalAlpha = mugA;
      ctx.fillStyle = '#f4f1ea';
      ctx.strokeStyle = '#080608';
      ctx.lineWidth = 1.0 * s;
      traceRoundedRect(mx - 2.6 * s, my, 5.2 * s, 5.6 * s, 1.0 * s);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#c81d25';
      ctx.fillRect(mx - 2.6 * s, my + 2.0 * s, 5.2 * s, 1.4 * s);
      ctx.beginPath();
      ctx.moveTo(mx + 2.6 * s, my + 1.4 * s);
      ctx.quadraticCurveTo(mx + 4.8 * s, my + 2.8 * s, mx + 2.6 * s, my + 4.4 * s);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.9 * s;
      for (let k = 0; k < 2; k++) {
        const p = (elapsedTime * 0.5 + k * 0.5) % 1;
        ctx.globalAlpha = mugA * Math.sin(p * Math.PI) * 0.6;
        const sx0 = mx + (k - 0.5) * 2.2 * s;
        const sy0 = my - 1.0 * s - p * 8 * s;
        ctx.beginPath();
        ctx.moveTo(sx0, sy0 + 3 * s);
        ctx.quadraticCurveTo(sx0 + Math.sin(elapsedTime * 3 + k) * 2 * s, sy0 + 1.5 * s, sx0, sy0);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Unified Z-Order Step 4: Huge Chibi Head on Top
    const chillBob = Math.sin(kickPhase * 0.5) * 0.8 * s * sit;
    const naturalBlink = spidey.isBlinking ? Math.sin(spidey.blinkProgress * Math.PI) * 0.92 : 0;
    const sleepySquint = deep * 0.78;
    const nightDrowsy = timeOfDayMode === TOD_NIGHT ? 0.3 : 0;
    const reactSquint = (spidey.reactionCode === REACT_HEARTS ? 0.55 : (spidey.reactionCode === REACT_OWW ? 0.75 : 0)) * spidey.reactionBlend;
    const totalSquint = Math.max(
      sassy * 0.95, naturalBlink, sleepySquint, nightDrowsy,
      spidey.cursorNear * 0.6, spidey.windBlend * 0.65, reactSquint
    );

    // Head bookkeeping for eye tracking, reactions and the cast shadow
    spidey.headRot = worldRot;
    spidey.headFlipY = worldFlipY;
    const headLocalY = (torsoCenterY - 13.8 * s) * scaleYPerch * worldFlipY;
    spidey.headWorldX = worldOriginX - headLocalY * Math.sin(worldRot);
    spidey.headWorldY = worldOriginY + headLocalY * Math.cos(worldRot);

    drawChibiHead(
      chillBob,
      torsoCenterY - 13.8 * s,
      s,
      spidey.facingScale,
      totalSquint
    );

    // Floating "Zzz" when in deep-idle sleepy/lying pose
    if (deep > 0.4 && spidey.deepIdleMode !== DEEP_IDLE_WEB_HANG) {
      const zPhase = (elapsedTime * 0.75) % 1;
      ctx.save();
      ctx.globalAlpha = Math.sin(zPhase * Math.PI) * deep * 0.85;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold ' + Math.round((8 + zPhase * 4) * s) + 'px sans-serif';
      ctx.fillText('z', (12 + zPhase * 8) * spidey.facing * s, torsoCenterY - (22 + zPhase * 12) * s);
      ctx.restore();
    }
  }

  ctx.restore();

  // Special-card hover reactions (hearts, music notes, bubbles...)
  drawCardReaction(s);

  // Render interactive click effects ("THWIP!" web shot or "HEY! ★" flip bubble)
  drawClickEffects(s);
}
