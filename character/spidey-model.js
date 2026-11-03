/**
 * character/spidey-model.js
 * Chibi Spider-Man anatomical model: head webbing, expressive eyes, torso, limbs, and cast shadow.
 */
// Pre-allocated typed arrays for Chibi Head webbing (zero heap allocation in render loop)
const HEAD_SPOKES = new Float32Array([
  -2.85, -2.35, -1.85, -1.35, -0.85, -0.35, 0.25, 0.85, 1.45, 2.15, 2.7
]);
const HEAD_RADII_FACTORS = new Float32Array([3.6, 7.2, 11.2, 15.2]);


// Pre-rendered soft shadow sprite for Spider-Man's cast shadow onto cards
const shadowSprite = document.createElement('canvas');
shadowSprite.width = 64;
shadowSprite.height = 64;
(function () {
  const g = shadowSprite.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grad.addColorStop(0, 'rgba(0,0,0,0.85)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.42)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
})();

/**
 * Casts a soft shadow from Spider-Man (light from the top-left) onto whichever card
 * lies behind him, clipped to that card - so he reads as standing in front of it.
 */
function drawSpideyCastShadow() {
  if (!config.showSpidey || !spidey.initialized || !spidey.headWorldX) return;
  const s = uniformScale * config.spideyScale;
  const bx = (spidey.x + spidey.headWorldX) * 0.5 + 7 * s;
  const by = (spidey.y + spidey.headWorldY) * 0.5 + 10 * s;
  for (let i = CARD_COUNT - 1; i >= 0; i--) {
    const c = cards[drawOrder[i]];
    if (!c.loaded) continue;
    const sc = c.scale * (1 + audioEnergy * 0.025);
    const hw = c.baseW * sc * 0.5;
    const hh = c.baseH * sc * 0.5;
    const cx = c.cx + c.offsetX;
    const cy = c.cy + c.offsetY;
    if (Math.abs(bx - cx) > hw + 14 * s || Math.abs(by - cy) > hh + 14 * s) continue;
    ctx.save();
    traceRoundedRect(cx - hw, cy - hh, hw * 2, hh * 2, c.baseRadius * sc);
    ctx.clip();
    ctx.globalAlpha = spidey.isSwinging ? 0.22 : 0.34;
    const w = 40 * s;
    const h = 46 * s;
    ctx.drawImage(shadowSprite, bx - w * 0.5, by - h * 0.5, w, h);
    ctx.restore();
    break;
  }
}

/**
 * Helper: Draws an outlined chibi limb segment.      /**
 * Helper: Draws an outlined chibi limb segment.
 */
function drawOutlinedSegment(x1, y1, x2, y2, thickness, fillColor, inkWidth) {
  ctx.strokeStyle = '#07070b';
  ctx.lineWidth = thickness + inkWidth * 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.strokeStyle = fillColor;
  ctx.lineWidth = thickness;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/**
 * Draws the Chibi Spider-Man Head using pre-allocated typed arrays (HEAD_SPOKES, HEAD_RADII_FACTORS)
 * and smooth squash-turn scaling (`facingScale`).
 */
function drawChibiHead(cx, cy, s, facingScale, squintAmount) {
  ctx.save();
  ctx.translate(cx, cy);
  const dirSign = facingScale >= 0 ? 1 : -1;
  const absTurn = Math.max(0.28, Math.abs(facingScale));
  ctx.scale(dirSign * absTurn, 1 + (1 - absTurn) * 0.08);

  const rx = 13.6 * s;
  const ry = 10.6 * s;

  // 1. Big Chibi Horizontal-Oval Head Base
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, -0.04, 0, Math.PI * 2);
  ctx.fillStyle = '#c81d25';
  ctx.fill();

  ctx.save();
  ctx.clip();

  // 2. Dark Burgundy Crescent Shadow on the left/rear side
  ctx.fillStyle = '#680c10';
  ctx.beginPath();
  ctx.ellipse(-rx * 0.42, 0, rx * 0.85, ry * 1.05, 0, 0, Math.PI * 2);
  ctx.fill();

  // Re-fill main lit crimson face area shifted right
  ctx.fillStyle = '#cc2028';
  ctx.beginPath();
  ctx.ellipse(rx * 0.22, -ry * 0.05, rx * 0.92, ry * 0.98, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3. Mask Webbing Grid (using pre-allocated Float32Arrays)
  const wx = 4.8 * s;
  const wy = 1.4 * s;
  ctx.strokeStyle = 'rgba(15, 8, 10, 0.72)';
  ctx.lineWidth = Math.max(0.8, 0.92 * s);

  ctx.beginPath();
  for (let i = 0; i < HEAD_SPOKES.length; i++) {
    const a = HEAD_SPOKES[i];
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx + Math.cos(a) * rx * 1.6, wy + Math.sin(a) * ry * 1.6);
  }
  ctx.stroke();

  for (let rIdx = 0; rIdx < HEAD_RADII_FACTORS.length; rIdx++) {
    ctx.beginPath();
    ctx.arc(wx, wy, HEAD_RADII_FACTORS[rIdx] * s, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();

  // Outer dark ink border around the chibi head
  ctx.strokeStyle = '#080608';
  ctx.lineWidth = 1.6 * s;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, -0.04, 0, Math.PI * 2);
  ctx.stroke();

  // 4. Giant Expressive Chibi Eyes
  const sq = Math.max(0, Math.min(1, squintAmount));

  // Eye tracking: convert the world look direction into head-local space
  const lcos = Math.cos(spidey.headRot);
  const lsin = Math.sin(spidey.headRot);
  const lookLX = (spidey.lookX * lcos + spidey.lookY * lsin) * dirSign;
  const lookLY = (-spidey.lookX * lsin + spidey.lookY * lcos) * spidey.headFlipY;
  const eyeDX = lookLX * s;
  const eyeDY = lookLY * 0.9 * s;

  // --- LEFT (MAIN FRONT) EYE ---
  ctx.save();
  ctx.translate(-2.2 * s + eyeDX * 0.6, 0.6 * s + eyeDY * 0.6);
  ctx.rotate(0.08 - sq * 0.05);

  const leftEyeW = 5.8 * s;
  const leftEyeH = (4.8 * (1 - sq * 0.52)) * s;

  ctx.fillStyle = '#050507';
  ctx.beginPath();
  ctx.ellipse(0, 0, leftEyeW + 1.4 * s, leftEyeH + 1.35 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  const leftWhiteW = (5.6 - sq * 0.7) * s;
  const leftWhiteH = (4.4 * (1 - sq * 0.78)) * s;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(eyeDX * 0.45, eyeDY * 0.45, leftWhiteW, Math.max(0.75 * s, leftWhiteH), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // --- RIGHT (FAR / 3/4 SIDE) EYE ---
  ctx.save();
  ctx.translate(9.6 * s + eyeDX * 0.5, 0.5 * s + eyeDY * 0.6);
  ctx.rotate(-0.14 + sq * 0.06);

  const rightEyeW = 3.2 * s;
  const rightEyeH = (4.5 * (1 - sq * 0.52)) * s;

  ctx.fillStyle = '#050507';
  ctx.beginPath();
  ctx.ellipse(0, 0, rightEyeW + 1.25 * s, rightEyeH + 1.3 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  const rightWhiteW = (3.0 - sq * 0.4) * s;
  const rightWhiteH = (4.1 * (1 - sq * 0.78)) * s;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0.2 * s + eyeDX * 0.35, eyeDY * 0.4, rightWhiteW, Math.max(0.7 * s, rightWhiteH), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

/**
 * Draws the compact Chibi Torso from the reference image.
 */
function drawChibiTorso(cx, cy, w, h, s) {
  ctx.save();
  ctx.translate(cx, cy);

  const halfW = w * 0.5;
  const halfH = h * 0.5;

  ctx.beginPath();
  ctx.moveTo(-halfW * 0.82, -halfH);
  ctx.lineTo(halfW * 0.82, -halfH);
  ctx.quadraticCurveTo(halfW * 1.05, 0, halfW, halfH);
  ctx.lineTo(-halfW, halfH);
  ctx.quadraticCurveTo(-halfW * 1.05, 0, -halfW * 0.82, -halfH);
  ctx.closePath();

  ctx.fillStyle = '#13284c';
  ctx.fill();

  ctx.save();
  ctx.clip();

  ctx.fillStyle = '#c81d25';
  ctx.beginPath();
  ctx.moveTo(-halfW * 0.65, -halfH);
  ctx.lineTo(halfW * 0.65, -halfH);
  ctx.lineTo(halfW * 0.58, halfH * 0.48);
  ctx.lineTo(0, halfH * 0.98);
  ctx.lineTo(-halfW * 0.58, halfH * 0.48);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#080608';
  ctx.lineWidth = 1.0 * s;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(12, 8, 10, 0.72)';
  ctx.lineWidth = 0.8 * s;
  ctx.beginPath();
  ctx.moveTo(0, -halfH);
  ctx.lineTo(0, halfH * 0.95);
  ctx.moveTo(-halfW * 0.32, -halfH);
  ctx.lineTo(-halfW * 0.28, halfH * 0.72);
  ctx.moveTo(halfW * 0.32, -halfH);
  ctx.lineTo(halfW * 0.28, halfH * 0.72);
  ctx.moveTo(-halfW * 0.6, -halfH * 0.25);
  ctx.lineTo(halfW * 0.6, -halfH * 0.25);
  ctx.moveTo(-halfW * 0.58, halfH * 0.22);
  ctx.lineTo(halfW * 0.58, halfH * 0.22);
  ctx.stroke();

  ctx.fillStyle = '#060609';
  ctx.beginPath();
  ctx.ellipse(0, 0, 1.35 * s, 2.7 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#060609';
  ctx.lineWidth = 0.95 * s;
  ctx.beginPath();
  ctx.moveTo(0, -0.8 * s); ctx.lineTo(-3.0 * s, -2.2 * s);
  ctx.moveTo(0, -0.8 * s); ctx.lineTo(3.0 * s, -2.2 * s);
  ctx.moveTo(0, -0.2 * s); ctx.lineTo(-3.4 * s, -0.4 * s);
  ctx.moveTo(0, -0.2 * s); ctx.lineTo(3.4 * s, -0.4 * s);
  ctx.moveTo(0, 0.5 * s); ctx.lineTo(-3.2 * s, 1.2 * s);
  ctx.moveTo(0, 0.5 * s); ctx.lineTo(3.2 * s, 1.2 * s);
  ctx.moveTo(0, 1.1 * s); ctx.lineTo(-2.5 * s, 2.6 * s);
  ctx.moveTo(0, 1.1 * s); ctx.lineTo(2.5 * s, 2.6 * s);
  ctx.stroke();

  ctx.restore();

  ctx.strokeStyle = '#080608';
  ctx.lineWidth = 1.45 * s;
  ctx.stroke();

  ctx.restore();
}
