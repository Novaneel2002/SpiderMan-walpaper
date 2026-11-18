/**
 * character/spidey-model.js
 * Spider-Verse Enhanced Chibi Spider-Man anatomical model:
 * - Pre-baked Ben-Day comic halftone dot shader pattern (zero GC in render loop)
 * - Scalloped radial mask webbing & dual rim lighting (warm crimson + electric cyan)
 * - Sculpted angular comic-book lenses with dynamic eye-tracking & glossy specular reflections
 * - Tapered cel-shaded limbs, webbed boots, gloved hands, and detailed spider-emblem torso
 */

// Pre-allocated typed arrays for Chibi Head webbing (zero heap allocation in render loop)
const HEAD_SPOKES = new Float32Array([
  -2.88, -2.42, -1.96, -1.48, -0.98, -0.45, 0.12, 0.68, 1.25, 1.85, 2.45
]);
const HEAD_SPOKE_COS = new Float32Array(HEAD_SPOKES.length);
const HEAD_SPOKE_SIN = new Float32Array(HEAD_SPOKES.length);
for (let i = 0; i < HEAD_SPOKES.length; i++) {
  HEAD_SPOKE_COS[i] = Math.cos(HEAD_SPOKES[i]);
  HEAD_SPOKE_SIN[i] = Math.sin(HEAD_SPOKES[i]);
}
const HEAD_RADII_FACTORS = new Float32Array([3.4, 6.8, 10.6, 14.6, 18.8]);

// Pre-rendered soft shadow sprite for Spider-Man's cast shadow onto cards
const shadowSprite = document.createElement('canvas');
shadowSprite.width = 64;
shadowSprite.height = 64;
(function () {
  const g = shadowSprite.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grad.addColorStop(0, 'rgba(0,0,0,0.88)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.45)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
})();

// Pre-rendered Spider-Verse Ben-Day halftone dot pattern (baked once at load time)
const halftoneTile = document.createElement('canvas');
halftoneTile.width = 12;
halftoneTile.height = 12;
let spideyHalftonePattern = null;
(function () {
  const g = halftoneTile.getContext('2d');
  g.clearRect(0, 0, 12, 12);
  g.fillStyle = 'rgba(10, 4, 8, 0.28)';
  g.beginPath();
  g.arc(3, 3, 1.55, 0, Math.PI * 2);
  g.arc(9, 9, 1.55, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255, 110, 115, 0.16)';
  g.beginPath();
  g.arc(9, 3, 1.0, 0, Math.PI * 2);
  g.arc(3, 9, 1.0, 0, Math.PI * 2);
  g.fill();
  spideyHalftonePattern = g.createPattern(halftoneTile, 'repeat');
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
    ctx.globalAlpha = spidey.isSwinging ? 0.24 : 0.36;
    const w = 42 * s;
    const h = 48 * s;
    ctx.drawImage(shadowSprite, bx - w * 0.5, by - h * 0.5, w, h);
    ctx.restore();
    break;
  }
}

/**
 * Draws a sculpted, tapered cel-shaded limb segment with comic ink outline and rim highlight.
 */
function drawOutlinedSegment(x1, y1, x2, y2, thickness, fillColor, inkWidth) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);

  // 1. Outer dark comic ink outline
  ctx.strokeStyle = '#07060b';
  ctx.lineWidth = thickness + inkWidth * 2.05;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // 2. Main suit color fill
  ctx.strokeStyle = fillColor;
  ctx.lineWidth = thickness;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // 3. Cel-shaded rim highlight along the upper/lit edge of the limb
  if (len > 1.5) {
    const nx = -dy / len;
    const ny = dx / len;
    const sign = (nx + ny * 0.5) >= 0 ? 1 : -1;
    const off = thickness * 0.22 * sign;
    const isRed = fillColor.charCodeAt(1) === 99 || fillColor.charCodeAt(1) === 100; // '#c...' or '#d...'
    ctx.strokeStyle = isRed ? 'rgba(255, 112, 118, 0.42)' : 'rgba(68, 210, 255, 0.36)';
    ctx.lineWidth = Math.max(0.7, thickness * 0.26);
    ctx.beginPath();
    ctx.moveTo(x1 + nx * off, y1 + ny * off);
    ctx.lineTo(x2 + nx * off, y2 + ny * off);
    ctx.stroke();
  }
}

/**
 * Draws a chibi Spider-Man boot with a V-cut cuff and subtle web-seam detail.
 */
function drawChibiBoot(kneeX, kneeY, footX, footY, toeOffsetX, s, ink) {
  // Lower leg / boot shaft
  drawOutlinedSegment(kneeX, kneeY, footX, footY, 4.5 * s, '#d11f28', ink);

  // Sculpted foot / toe cap
  drawOutlinedSegment(footX - 1.5 * s, footY, footX + toeOffsetX, footY + 0.2 * s, 3.8 * s, '#d11f28', ink);

  // Crisp black V-cuff line below the knee
  const mx = kneeX + (footX - kneeX) * 0.28;
  const my = kneeY + (footY - kneeY) * 0.28;
  ctx.strokeStyle = '#08060a';
  ctx.lineWidth = Math.max(0.8, 0.95 * s);
  ctx.beginPath();
  ctx.moveTo(mx - 2.1 * s, my - 0.5 * s);
  ctx.lineTo(mx, my + 1.1 * s);
  ctx.lineTo(mx + 2.1 * s, my - 0.5 * s);
  ctx.stroke();
}

/**
 * Draws an angular comic-book Spider-Man eye lens with expressive squint morphing
 * and dual glossy specular reflections.
 */
function drawSpiderLens(w, h, sq, isRightSide, lookShiftX, lookShiftY, s) {
  const framePad = 1.45 * s;
  const fw = w + framePad;
  const fh = h + framePad * (1 - sq * 0.25);
  const browTilt = isRightSide ? -0.18 : 0.16;

  // Outer black mechanical lens frame (sculpted comic shield/teardrop shape)
  ctx.fillStyle = '#050509';
  ctx.beginPath();
  ctx.moveTo(-fw, -fh * 0.18);
  // Furrowed upper brow curve (flattens & angles aggressively when squinting)
  ctx.bezierCurveTo(
    -fw * 0.45, -fh * (0.98 - sq * 0.35),
    fw * 0.55, -fh * (0.88 - sq * 0.25) + browTilt * fh,
    fw, -fh * 0.06
  );
  // Sweeping lower cheek curve
  ctx.bezierCurveTo(
    fw * 0.85, fh * 0.92,
    -fw * 0.55, fh * 1.04,
    -fw, -fh * 0.18
  );
  ctx.closePath();
  ctx.fill();

  // Subtle cyan/silver rim highlight on the black lens frame
  ctx.strokeStyle = isRightSide ? 'rgba(255, 255, 255, 0.22)' : 'rgba(90, 225, 255, 0.28)';
  ctx.lineWidth = Math.max(0.6, 0.7 * s);
  ctx.stroke();

  // Inner expressive white lens (clips shading & glossy reflections)
  const iw = Math.max(1.2 * s, w * (1 - sq * 0.1));
  const ih = Math.max(0.75 * s, h * (1 - sq * 0.72));

  ctx.save();
  ctx.translate(lookShiftX, lookShiftY);
  ctx.beginPath();
  ctx.moveTo(-iw, -ih * 0.15);
  ctx.bezierCurveTo(
    -iw * 0.42, -ih * (0.95 - sq * 0.3),
    iw * 0.52, -ih * (0.85 - sq * 0.2) + browTilt * ih,
    iw, -ih * 0.05
  );
  ctx.bezierCurveTo(
    iw * 0.82, ih * 0.90,
    -iw * 0.52, ih * 1.02,
    -iw, -ih * 0.15
  );
  ctx.closePath();

  // Soft cool-blue comic shading at the bottom of the white lens
  ctx.fillStyle = '#d4ecff';
  ctx.fill();

  ctx.clip();

  // Pure white upper/center lens fill
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(iw * 0.08, -ih * 0.16, iw * 0.95, ih * 0.88, 0, 0, Math.PI * 2);
  ctx.fill();

  // Glossy diagonal comic specular reflection bar
  if (ih > 1.2 * s) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.ellipse(-iw * 0.22, -ih * 0.32, iw * 0.32, ih * 0.18, -0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Draws the Chibi Spider-Man Head using pre-allocated typed arrays, scalloped mask webbing,
 * Spider-Verse halftone shading, dual rim highlights, and sculpted comic lenses.
 */
function drawChibiHead(cx, cy, s, facingScale, squintAmount) {
  ctx.save();
  ctx.translate(cx, cy);
  const dirSign = facingScale >= 0 ? 1 : -1;
  const absTurn = Math.max(0.28, Math.abs(facingScale));
  ctx.scale(dirSign * absTurn, 1 + (1 - absTurn) * 0.08);

  const rx = 13.8 * s;
  const ry = 10.8 * s;

  // 1. Sculpted Chibi Head Silhouette (slightly fuller cranium + subtle chin contour)
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, -0.04, 0, Math.PI * 2);
  ctx.fillStyle = '#b81720';
  ctx.fill();

  ctx.save();
  ctx.clip();

  // 2. Deep Burgundy Crescent Shadow on the rear/left side
  ctx.fillStyle = '#5e090e';
  ctx.beginPath();
  ctx.ellipse(-rx * 0.44, 0, rx * 0.86, ry * 1.06, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3. Re-fill main lit crimson face area shifted forward
  ctx.fillStyle = '#d6222b';
  ctx.beginPath();
  ctx.ellipse(rx * 0.20, -ry * 0.06, rx * 0.92, ry * 0.98, 0, 0, Math.PI * 2);
  ctx.fill();

  // 4. Warm Scarlet Specular Crown Highlight (top-right forehead)
  ctx.fillStyle = 'rgba(255, 105, 100, 0.42)';
  ctx.beginPath();
  ctx.ellipse(rx * 0.34, -ry * 0.48, rx * 0.48, ry * 0.34, 0.22, 0, Math.PI * 2);
  ctx.fill();

  // 5. Spider-Verse Ben-Day Halftone Dot Overlay on shadow crescent
  if (spideyHalftonePattern) {
    ctx.save();
    ctx.fillStyle = spideyHalftonePattern;
    ctx.beginPath();
    ctx.ellipse(-rx * 0.55, ry * 0.08, rx * 0.65, ry * 0.95, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 6. Electric Cyan Spider-Verse Rim Highlight along the left shadow edge
  ctx.strokeStyle = 'rgba(65, 232, 255, 0.55)';
  ctx.lineWidth = 1.65 * s;
  ctx.beginPath();
  ctx.ellipse(-rx * 0.04, 0, rx * 0.94, ry * 0.94, -0.04, Math.PI * 0.68, Math.PI * 1.32);
  ctx.stroke();

  // 7. Scalloped Mask Webbing Grid (radial spokes + concave web arcs)
  const wx = 4.6 * s;
  const wy = 1.3 * s;
  ctx.strokeStyle = 'rgba(14, 6, 9, 0.76)';
  ctx.lineWidth = Math.max(0.75, 0.88 * s);

  const maxRay = rx * 1.65;
  ctx.beginPath();
  for (let i = 0; i < HEAD_SPOKES.length; i++) {
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx + HEAD_SPOKE_COS[i] * maxRay, wy + HEAD_SPOKE_SIN[i] * maxRay);
  }
  ctx.stroke();

  // Scalloped concentric web rings between adjacent spokes
  ctx.beginPath();
  for (let rIdx = 0; rIdx < HEAD_RADII_FACTORS.length; rIdx++) {
    const rad = HEAD_RADII_FACTORS[rIdx] * s;
    const sag = rad * 0.86; // slight inward scallop for authentic spider-web curve
    for (let i = 0; i < HEAD_SPOKES.length; i++) {
      const nextI = (i + 1) % HEAD_SPOKES.length;
      const x1 = wx + HEAD_SPOKE_COS[i] * rad;
      const y1 = wy + HEAD_SPOKE_SIN[i] * rad;
      const x2 = wx + HEAD_SPOKE_COS[nextI] * rad;
      const y2 = wy + HEAD_SPOKE_SIN[nextI] * rad;
      const midCos = (HEAD_SPOKE_COS[i] + HEAD_SPOKE_COS[nextI]) * 0.5;
      const midSin = (HEAD_SPOKE_SIN[i] + HEAD_SPOKE_SIN[nextI]) * 0.5;
      const norm = 1 / Math.max(0.1, Math.hypot(midCos, midSin));
      const cxArc = wx + midCos * norm * sag;
      const cyArc = wy + midSin * norm * sag;
      if (i === 0) ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(cxArc, cyArc, x2, y2);
    }
  }
  ctx.stroke();

  ctx.restore();

  // Outer dark comic ink border around the chibi head
  ctx.strokeStyle = '#070508';
  ctx.lineWidth = 1.65 * s;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, -0.04, 0, Math.PI * 2);
  ctx.stroke();

  // 8. Giant Expressive Comic-Book Lenses
  const sq = Math.max(0, Math.min(1, squintAmount));

  // Eye tracking: convert the world look direction into head-local space
  const lcos = Math.cos(spidey.headRot);
  const lsin = Math.sin(spidey.headRot);
  const lookLX = (spidey.lookX * lcos + spidey.lookY * lsin) * dirSign;
  const lookLY = (-spidey.lookX * lsin + spidey.lookY * lcos) * spidey.headFlipY;
  const eyeDX = lookLX * s;
  const eyeDY = lookLY * 0.9 * s;

  // --- LEFT (MAIN FRONT) LENS ---
  ctx.save();
  ctx.translate(-2.3 * s + eyeDX * 0.6, 0.5 * s + eyeDY * 0.6);
  ctx.rotate(0.07 - sq * 0.05);
  drawSpiderLens(5.9 * s, 4.9 * s, sq, false, eyeDX * 0.42, eyeDY * 0.42, s);
  ctx.restore();

  // --- RIGHT (FAR / 3/4 SIDE) LENS ---
  ctx.save();
  ctx.translate(9.6 * s + eyeDX * 0.5, 0.4 * s + eyeDY * 0.6);
  ctx.rotate(-0.14 + sq * 0.06);
  drawSpiderLens(3.3 * s, 4.6 * s, sq, true, 0.2 * s + eyeDX * 0.34, eyeDY * 0.38, s);
  ctx.restore();

  ctx.restore();
}

/**
 * Draws the compact Chibi Torso with V-taper lat panels, cyan rim light,
 * curved chest webbing, red V-belt, and sharp geometric Spider-Emblem.
 */
function drawChibiTorso(cx, cy, w, h, s) {
  ctx.save();
  ctx.translate(cx, cy);

  const halfW = w * 0.5;
  const halfH = h * 0.5;

  // 1. Sculpted Heroic Chibi Torso Base (deep metallic navy side panels)
  ctx.beginPath();
  ctx.moveTo(-halfW * 0.86, -halfH);
  ctx.lineTo(halfW * 0.86, -halfH);
  ctx.quadraticCurveTo(halfW * 1.10, -halfH * 0.1, halfW * 0.96, halfH);
  ctx.lineTo(-halfW * 0.96, halfH);
  ctx.quadraticCurveTo(-halfW * 1.10, -halfH * 0.1, -halfW * 0.86, -halfH);
  ctx.closePath();

  ctx.fillStyle = '#112548';
  ctx.fill();

  ctx.save();
  ctx.clip();

  // Cyan Spider-Verse rim highlight on the blue lat side panels
  ctx.strokeStyle = 'rgba(65, 225, 255, 0.42)';
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.moveTo(-halfW * 0.84, -halfH * 0.8);
  ctx.quadraticCurveTo(-halfW * 1.02, 0, -halfW * 0.90, halfH * 0.85);
  ctx.stroke();

  // 2. Crimson Center Chest Shield + Red V-Belt
  ctx.fillStyle = '#d42029';
  ctx.beginPath();
  ctx.moveTo(-halfW * 0.72, -halfH);
  ctx.lineTo(halfW * 0.72, -halfH);
  ctx.lineTo(halfW * 0.58, halfH * 0.45);
  ctx.lineTo(halfW * 0.95, halfH * 0.68);
  ctx.lineTo(halfW * 0.95, halfH);
  ctx.lineTo(0, halfH * 1.05);
  ctx.lineTo(-halfW * 0.95, halfH);
  ctx.lineTo(-halfW * 0.95, halfH * 0.68);
  ctx.lineTo(-halfW * 0.58, halfH * 0.45);
  ctx.closePath();
  ctx.fill();

  // Upper chest highlight
  ctx.fillStyle = 'rgba(255, 110, 110, 0.28)';
  ctx.beginPath();
  ctx.ellipse(halfW * 0.12, -halfH * 0.55, halfW * 0.48, halfH * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#080608';
  ctx.lineWidth = 0.95 * s;
  ctx.stroke();

  // 3. Curved Chest Webbing Lines
  ctx.strokeStyle = 'rgba(12, 6, 9, 0.72)';
  ctx.lineWidth = 0.78 * s;
  ctx.beginPath();
  // Vertical ribs
  ctx.moveTo(0, -halfH);
  ctx.lineTo(0, halfH * 0.95);
  ctx.moveTo(-halfW * 0.36, -halfH);
  ctx.lineTo(-halfW * 0.28, halfH * 0.72);
  ctx.moveTo(halfW * 0.36, -halfH);
  ctx.lineTo(halfW * 0.28, halfH * 0.72);
  // Curved horizontal web arcs
  ctx.moveTo(-halfW * 0.64, -halfH * 0.32);
  ctx.quadraticCurveTo(0, -halfH * 0.12, halfW * 0.64, -halfH * 0.32);
  ctx.moveTo(-halfW * 0.58, halfH * 0.18);
  ctx.quadraticCurveTo(0, halfH * 0.36, halfW * 0.58, halfH * 0.18);
  ctx.stroke();

  // 4. Iconic Sharp Chest Spider Emblem
  ctx.fillStyle = '#060609';
  // Upper cephalothorax diamond
  ctx.beginPath();
  ctx.ellipse(0, -1.1 * s, 1.15 * s, 1.25 * s, 0, 0, Math.PI * 2);
  // Lower abdomen teardrop
  ctx.ellipse(0, 1.15 * s, 1.45 * s, 2.0 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // 8 Angled jointed spider legs
  ctx.strokeStyle = '#060609';
  ctx.lineWidth = 0.95 * s;
  ctx.beginPath();
  // Pair 1 (upward)
  ctx.moveTo(-0.8 * s, -0.9 * s); ctx.lineTo(-2.4 * s, -2.0 * s); ctx.lineTo(-2.9 * s, -3.1 * s);
  ctx.moveTo(0.8 * s, -0.9 * s);  ctx.lineTo(2.4 * s, -2.0 * s);  ctx.lineTo(2.9 * s, -3.1 * s);
  // Pair 2 (upper-mid)
  ctx.moveTo(-1.0 * s, -0.3 * s); ctx.lineTo(-3.2 * s, -0.9 * s); ctx.lineTo(-3.8 * s, -1.7 * s);
  ctx.moveTo(1.0 * s, -0.3 * s);  ctx.lineTo(3.2 * s, -0.9 * s);  ctx.lineTo(3.8 * s, -1.7 * s);
  // Pair 3 (lower-mid)
  ctx.moveTo(-1.0 * s, 0.4 * s);  ctx.lineTo(-3.2 * s, 1.0 * s);  ctx.lineTo(-3.7 * s, 2.1 * s);
  ctx.moveTo(1.0 * s, 0.4 * s);   ctx.lineTo(3.2 * s, 1.0 * s);   ctx.lineTo(3.7 * s, 2.1 * s);
  // Pair 4 (downward)
  ctx.moveTo(-0.8 * s, 1.1 * s);  ctx.lineTo(-2.2 * s, 2.2 * s);  ctx.lineTo(-2.6 * s, 3.4 * s);
  ctx.moveTo(0.8 * s, 1.1 * s);   ctx.lineTo(2.2 * s, 2.2 * s);   ctx.lineTo(2.6 * s, 3.4 * s);
  ctx.stroke();

  ctx.restore();

  // Outer dark comic ink outline around torso
  ctx.strokeStyle = '#070508';
  ctx.lineWidth = 1.5 * s;
  ctx.stroke();

  ctx.restore();
}
