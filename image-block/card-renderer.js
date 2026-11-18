/**
 * image-block/card-renderer.js
 * Photorealistic New York City Panorama & 3D Architectural Skyscraper Renderer.
 * - Real-world Manhattan night/blue-hour lighting (horizontal floor-plate light ribbons,
 *   curtain-wall sky reflections, recessed interior ceiling troffers, stone pilaster ambient occlusion,
 *   and upward architectural cornice floodlights).
 * - Zero comic ink outlines, zero cartoon banners, zero halftone dots.
 */

let citySkyCanvas = null;
let cityFarCanvas = null;
let cityMidCanvas = null;
let cityCacheW = 0;
let cityCacheH = 0;

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Pre-allocated upper-sky stars & aviation beacons
const STAR_COUNT = 70;
const starX = new Float32Array(STAR_COUNT);
const starY = new Float32Array(STAR_COUNT);
const starSize = new Float32Array(STAR_COUNT);
const starPhase = new Float32Array(STAR_COUNT);
(function initStars() {
  const rng = seededRandom(777);
  for (let i = 0; i < STAR_COUNT; i++) {
    starX[i] = rng();
    starY[i] = rng() * 0.42;
    starSize[i] = 0.5 + rng() * 1.0;
    starPhase[i] = rng() * Math.PI * 2;
  }
})();

// FAA red aviation warning beacons on distant skyscraper spires
const BEACON_COUNT = 8;
const beaconRefX = new Float32Array([0.11, 0.24, 0.43, 0.56, 0.68, 0.79, 0.90, 0.34]);
const beaconRefY = new Float32Array([0.16, 0.09, 0.14, 0.07, 0.18, 0.11, 0.15, 0.21]);
const beaconLayer = new Uint8Array([0, 0, 1, 0, 1, 0, 0, 1]);

// Rising NYC street steam plumes
const STEAM_COUNT = 10;
const steamX = new Float32Array(STEAM_COUNT);
const steamY = new Float32Array(STEAM_COUNT);
const steamSpeed = new Float32Array(STEAM_COUNT);
const steamRadius = new Float32Array(STEAM_COUNT);
(function initSteam() {
  const rng = seededRandom(999);
  for (let i = 0; i < STEAM_COUNT; i++) {
    steamX[i] = (i + 0.2 + rng() * 0.6) / STEAM_COUNT;
    steamY[i] = rng();
    steamSpeed[i] = 0.06 + rng() * 0.05;
    steamRadius[i] = 32 + rng() * 38;
  }
})();

/**
 * Pure 35mm photographic luminance grain (no comic halftone grid).
 */
function createFilmGrainPattern() {
  const gCanvas = document.createElement('canvas');
  const size = 128;
  gCanvas.width = size;
  gCanvas.height = size;
  const gCtx = gCanvas.getContext('2d');
  const imgData = gCtx.createImageData(size, size);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = Math.max(0, Math.min(255, 128 + (Math.random() - 0.5) * 96));
    data[i] = noise;
    data[i + 1] = noise;
    data[i + 2] = noise;
    data[i + 3] = 255;
  }
  gCtx.putImageData(imgData, 0, 0);
  grainPattern = ctx.createPattern(gCanvas, 'repeat');
  grainCanvas = gCanvas;
}

/**
 * Draws a photorealistic weathered cedar NYC rooftop water tank on steel I-beam legs.
 */
function drawWaterTowerOnCtx(g, cx, baseY, s, isDistant) {
  const legH = 11 * s;
  const tankW = 17 * s;
  const tankH = 14.5 * s;
  const roofH = 6.8 * s;
  const tankTop = baseY - legH - tankH;

  // Steel I-beam support structure & cross tie-rods
  g.strokeStyle = isDistant ? '#090c14' : '#181c24';
  g.lineWidth = Math.max(0.8, 1.15 * s);
  g.beginPath();
  g.moveTo(cx - tankW * 0.38, baseY);
  g.lineTo(cx - tankW * 0.28, baseY - legH);
  g.moveTo(cx + tankW * 0.38, baseY);
  g.lineTo(cx + tankW * 0.28, baseY - legH);
  g.moveTo(cx, baseY);
  g.lineTo(cx, baseY - legH);
  g.lineWidth = Math.max(0.5, 0.65 * s);
  g.moveTo(cx - tankW * 0.35, baseY - 2 * s);
  g.lineTo(cx + tankW * 0.30, baseY - legH + 1 * s);
  g.moveTo(cx + tankW * 0.35, baseY - 2 * s);
  g.lineTo(cx - tankW * 0.30, baseY - legH + 1 * s);
  g.stroke();

  // Steel dunnage platform
  g.fillStyle = isDistant ? '#0d111c' : '#20242c';
  g.fillRect(cx - tankW * 0.54, baseY - legH - 1.4 * s, tankW * 1.08, 1.8 * s);

  if (isDistant) {
    g.fillStyle = '#0e1320';
    g.fillRect(cx - tankW * 0.48, tankTop, tankW * 0.96, tankH);
  } else {
    // Cylindrical 3D shaded weathered redwood/cedar barrel
    const barrelGrad = g.createLinearGradient(cx - tankW * 0.5, 0, cx + tankW * 0.5, 0);
    barrelGrad.addColorStop(0.00, '#1c1411');
    barrelGrad.addColorStop(0.22, '#3d2c24');
    barrelGrad.addColorStop(0.45, '#523b30');
    barrelGrad.addColorStop(0.75, '#33241d');
    barrelGrad.addColorStop(1.00, '#140e0c');
    g.fillStyle = barrelGrad;
    g.fillRect(cx - tankW * 0.48, tankTop, tankW * 0.96, tankH);

    // Subtle vertical wood stave seams
    g.strokeStyle = 'rgba(10, 7, 5, 0.38)';
    g.lineWidth = Math.max(0.4, 0.5 * s);
    g.beginPath();
    for (let k = -3; k <= 3; k++) {
      g.moveTo(cx + k * (tankW * 0.13), tankTop);
      g.lineTo(cx + k * (tankW * 0.13), tankTop + tankH);
    }
    g.stroke();

    // Tensioned steel hoops with specular catchlight
    g.strokeStyle = '#151920';
    g.lineWidth = Math.max(0.6, 0.8 * s);
    g.beginPath();
    for (let hIdx = 1; hIdx <= 3; hIdx++) {
      const hy = tankTop + tankH * (hIdx * 0.24);
      g.moveTo(cx - tankW * 0.50, hy);
      g.lineTo(cx + tankW * 0.50, hy);
    }
    g.stroke();
  }

  // Conical weathered slate roof with cylindrical shading
  const roofGrad = g.createLinearGradient(cx - tankW * 0.55, 0, cx + tankW * 0.55, 0);
  roofGrad.addColorStop(0, isDistant ? '#0b0f1a' : '#161a22');
  roofGrad.addColorStop(0.35, isDistant ? '#131929' : '#2c3340');
  roofGrad.addColorStop(1, isDistant ? '#070a12' : '#0f1218');
  g.fillStyle = roofGrad;
  g.beginPath();
  g.moveTo(cx - tankW * 0.56, tankTop + 0.5 * s);
  g.lineTo(cx, tankTop - roofH);
  g.lineTo(cx + tankW * 0.56, tankTop + 0.5 * s);
  g.closePath();
  g.fill();
}

/**
 * Helper: renders realistic horizontal office floor-plate light ribbons & micro-windows
 * on distant/mid-ground Manhattan skyscrapers (gives a true photographic skyline look).
 */
function drawSkyscraperMicroWindows(g, bx, by, bw, bh, us, rng, density, warmth, maxBottomY) {
  const floorStep = 3.2 * us;
  const sideMargin = bw * 0.08;
  const innerW = bw - sideMargin * 2;
  const cols = Math.max(4, Math.floor(innerW / (2.8 * us)));
  const cellW = innerW / cols;

  for (let wy = by + 4 * us; wy < Math.min(by + bh - 6 * us, maxBottomY); wy += floorStep) {
    // Entire office floor plate lit or partially lit
    const floorActivity = rng();
    if (floorActivity > density * 1.35) continue;

    for (let c = 0; c < cols; c++) {
      if (rng() > density) continue;
      const isWarm = rng() < warmth;
      const alpha = 0.22 + rng() * 0.44;
      if (isWarm) {
        g.fillStyle = rng() < 0.45
          ? 'rgba(224, 218, 206, ' + alpha.toFixed(2) + ')'
          : 'rgba(198, 186, 168, ' + (alpha * 0.82).toFixed(2) + ')';
      } else {
        g.fillStyle = 'rgba(182, 194, 206, ' + (alpha * 0.78).toFixed(2) + ')';
      }
      g.fillRect(bx - bw * 0.5 + sideMargin + c * cellW, wy, cellW * 0.72, 1.45 * us);
    }
  }
}

/**
 * Rebuilds the 3 photorealistic offscreen background canvases:
 * 1. `citySkyCanvas` (atmospheric twilight/night scattering, moon, illuminated haze)
 * 2. `cityFarCanvas` (Lower/Midtown Manhattan skyline, One WTC, Empire State, Chrysler, Brooklyn Bridge)
 * 3. `cityMidCanvas` (Closer mid-town glass & stone high-rises with 3D depth & street light bounce)
 */
function rebuildCityBackdropCache() {
  const w = Math.max(1, Math.round(viewWidth * dpr));
  const h = Math.max(1, Math.round(viewHeight * dpr));
  cityCacheW = w;
  cityCacheH = h;

  const padX = Math.round(64 * uniformScale * dpr);
  const farW = w + padX * 2;

  if (!citySkyCanvas) citySkyCanvas = document.createElement('canvas');
  if (!cityFarCanvas) cityFarCanvas = document.createElement('canvas');
  if (!cityMidCanvas) cityMidCanvas = document.createElement('canvas');

  citySkyCanvas.width = w;
  citySkyCanvas.height = h;
  cityFarCanvas.width = farW;
  cityFarCanvas.height = h;
  cityMidCanvas.width = farW;
  cityMidCanvas.height = h;

  const us = uniformScale;

  // =====================================================================
  // 1. PHOTOREALISTIC BLUE-HOUR / NIGHT SKY (`citySkyCanvas`)
  // =====================================================================
  const sCtx = citySkyCanvas.getContext('2d');
  sCtx.save();
  sCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const skyGrad = sCtx.createLinearGradient(0, 0, 0, viewHeight);
  skyGrad.addColorStop(0.00, '#040508');
  skyGrad.addColorStop(0.28, '#080b11');
  skyGrad.addColorStop(0.56, '#0f141c');
  skyGrad.addColorStop(0.78, '#171c24');
  skyGrad.addColorStop(0.92, '#21242b');
  skyGrad.addColorStop(1.00, '#2a2b30');
  sCtx.fillStyle = skyGrad;
  sCtx.fillRect(0, 0, viewWidth, viewHeight);

  // Subtle desaturated urban horizon haze over Manhattan
  const cityGlow = sCtx.createRadialGradient(
    viewWidth * 0.52, viewHeight * 0.95, 30 * us,
    viewWidth * 0.52, viewHeight * 0.95, viewWidth * 0.72
  );
  cityGlow.addColorStop(0.0, 'rgba(195, 188, 178, 0.14)');
  cityGlow.addColorStop(0.45, 'rgba(145, 142, 140, 0.07)');
  cityGlow.addColorStop(1.0, 'rgba(15, 18, 24, 0)');
  sCtx.fillStyle = cityGlow;
  sCtx.fillRect(0, 0, viewWidth, viewHeight);

  // Photographic Moon with soft atmospheric Mie scattering halo
  const moonX = viewWidth * 0.18;
  const moonY = viewHeight * 0.13;
  const moonR = 18 * us;
  const moonHalo = sCtx.createRadialGradient(moonX, moonY, moonR * 0.5, moonX, moonY, moonR * 6.5);
  moonHalo.addColorStop(0.0, 'rgba(255, 250, 235, 0.26)');
  moonHalo.addColorStop(0.25, 'rgba(195, 215, 245, 0.08)');
  moonHalo.addColorStop(1.0, 'rgba(195, 215, 245, 0)');
  sCtx.fillStyle = moonHalo;
  sCtx.beginPath();
  sCtx.arc(moonX, moonY, moonR * 6.5, 0, Math.PI * 2);
  sCtx.fill();

  const moonDisc = sCtx.createRadialGradient(
    moonX - moonR * 0.25, moonY - moonR * 0.25, moonR * 0.1,
    moonX, moonY, moonR
  );
  moonDisc.addColorStop(0, '#ffffff');
  moonDisc.addColorStop(0.75, '#f2ead8');
  moonDisc.addColorStop(1, '#cfc5b0');
  sCtx.fillStyle = moonDisc;
  sCtx.beginPath();
  sCtx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
  sCtx.fill();

  // Subtle lunar maria shading
  sCtx.fillStyle = 'rgba(160, 152, 138, 0.28)';
  sCtx.beginPath();
  sCtx.ellipse(moonX - moonR * 0.22, moonY - moonR * 0.12, moonR * 0.28, moonR * 0.18, 0.3, 0, Math.PI * 2);
  sCtx.ellipse(moonX + moonR * 0.24, moonY + moonR * 0.18, moonR * 0.20, moonR * 0.15, -0.2, 0, Math.PI * 2);
  sCtx.fill();

  // Soft stratospheric cloud bands catching warm city bounce light
  const rngCloud = seededRandom(321);
  for (let c = 0; c < 14; c++) {
    const cx = rngCloud() * viewWidth;
    const cy = viewHeight * (0.14 + rngCloud() * 0.38);
    const cw = (140 + rngCloud() * 200) * us;
    const ch = (10 + rngCloud() * 16) * us;
    const cGrad = sCtx.createLinearGradient(0, cy - ch, 0, cy + ch);
    cGrad.addColorStop(0, 'rgba(14, 22, 38, 0.18)');
    cGrad.addColorStop(1, 'rgba(225, 175, 145, 0.05)');
    sCtx.fillStyle = cGrad;
    sCtx.beginPath();
    sCtx.ellipse(cx, cy, cw, ch, 0, 0, Math.PI * 2);
    sCtx.fill();
  }
  sCtx.restore();

  // =====================================================================
  // 2. FAR MANHATTAN SKYLINE & SUSPENSION BRIDGE (`cityFarCanvas`)
  // =====================================================================
  const fCtx = cityFarCanvas.getContext('2d');
  fCtx.save();
  fCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const fw = viewWidth + (padX / dpr) * 2;
  const ox = padX / dpr;

  // Brooklyn / Manhattan Suspension Bridge in atmospheric distance
  const brLeft = ox + viewWidth * 0.01;
  const brRight = ox + viewWidth * 0.45;
  const brSpan = brRight - brLeft;
  const deckY = viewHeight * 0.73;
  const tower1X = brLeft + brSpan * 0.28;
  const tower2X = brLeft + brSpan * 0.74;
  const towerTopY = viewHeight * 0.47;

  // Main catenary cables
  fCtx.strokeStyle = 'rgba(42, 48, 64, 0.72)';
  fCtx.lineWidth = 1.4 * us;
  fCtx.beginPath();
  fCtx.moveTo(brLeft, deckY - 5 * us);
  fCtx.quadraticCurveTo(brLeft + (tower1X - brLeft) * 0.55, deckY - 7 * us, tower1X, towerTopY);
  fCtx.moveTo(tower1X, towerTopY);
  fCtx.quadraticCurveTo((tower1X + tower2X) * 0.5, deckY - 9 * us, tower2X, towerTopY);
  fCtx.moveTo(tower2X, towerTopY);
  fCtx.quadraticCurveTo(tower2X + (brRight - tower2X) * 0.45, deckY - 7 * us, brRight, deckY - 5 * us);
  fCtx.stroke();

  // Fine vertical suspender cables
  fCtx.lineWidth = 0.5 * us;
  fCtx.strokeStyle = 'rgba(58, 66, 86, 0.38)';
  fCtx.beginPath();
  for (let sx = brLeft + 8 * us; sx < brRight; sx += 7 * us) {
    let cableY = deckY;
    if (sx < tower1X) {
      const u = (sx - brLeft) / Math.max(1, tower1X - brLeft);
      cableY = (1 - u) * (1 - u) * (deckY - 5 * us) + 2 * (1 - u) * u * (deckY - 7 * us) + u * u * towerTopY;
    } else if (sx < tower2X) {
      const u = (sx - tower1X) / Math.max(1, tower2X - tower1X);
      cableY = (1 - u) * (1 - u) * towerTopY + 2 * (1 - u) * u * (deckY - 9 * us) + u * u * towerTopY;
    } else {
      const u = (sx - tower2X) / Math.max(1, brRight - tower2X);
      cableY = (1 - u) * (1 - u) * towerTopY + 2 * (1 - u) * u * (deckY - 7 * us) + u * u * (deckY - 5 * us);
    }
    fCtx.moveTo(sx, cableY);
    fCtx.lineTo(sx, deckY);
  }
  fCtx.stroke();

  // Granite Bridge Towers with warm upward architectural floodlights
  for (let tIdx = 0; tIdx < 2; tIdx++) {
    const tx = tIdx === 0 ? tower1X : tower2X;
    const tw = 16 * us;
    const tGrad = fCtx.createLinearGradient(tx - tw * 0.5, towerTopY, tx + tw * 0.5, deckY);
    tGrad.addColorStop(0, '#222836');
    tGrad.addColorStop(0.5, '#2d3240');
    tGrad.addColorStop(1, '#161a24');
    fCtx.fillStyle = tGrad;
    fCtx.fillRect(tx - tw * 0.5, towerTopY, tw, viewHeight - towerTopY);

    // Gothic arch openings
    fCtx.fillStyle = '#1c2436';
    fCtx.fillRect(tx - tw * 0.28, towerTopY + 12 * us, tw * 0.20, 24 * us);
    fCtx.fillRect(tx + tw * 0.08, towerTopY + 12 * us, tw * 0.20, 24 * us);
  }
  fCtx.fillStyle = '#181d29';
  fCtx.fillRect(brLeft, deckY, brSpan, 4 * us);

  // Far Manhattan Skyscrapers (34 dense towers with realistic setbacks & horizontal floor-plate light ribbons)
  const rngFar = seededRandom(1408);
  const farCount = 34;
  for (let i = 0; i < farCount; i++) {
    const u = i / farCount;
    const bx = ox + u * viewWidth + (rngFar() - 0.5) * 16 * us;
    const bw = (24 + rngFar() * 32) * us;
    let bh = (0.36 + rngFar() * 0.36) * viewHeight;

    const isOneWTC = (i === 8);
    const isEmpireState = (i === 18);
    const isChryslerFar = (i === 26);
    if (isOneWTC) bh = viewHeight * 0.80;
    else if (isEmpireState) bh = viewHeight * 0.82;
    else if (isChryslerFar) bh = viewHeight * 0.76;

    const by = viewHeight - bh;

    // Subtle vertical atmospheric shading on distant skyscraper
    const bGrad = fCtx.createLinearGradient(bx - bw * 0.5, by, bx + bw * 0.5, by + bh);
    bGrad.addColorStop(0, (i & 1) ? '#141d2e' : '#182234');
    bGrad.addColorStop(0.4, (i & 1) ? '#101726' : '#131b2b');
    bGrad.addColorStop(1, '#1d2230');
    fCtx.fillStyle = bGrad;
    fCtx.fillRect(bx - bw * 0.5, by, bw, bh);

    if (isEmpireState) {
      // Floodlit limestone Art Deco setbacks + spire
      const esGrad = fCtx.createLinearGradient(bx, by - 44 * us, bx, by);
      esGrad.addColorStop(0, '#6e6558');
      esGrad.addColorStop(1, '#2b2d38');
      fCtx.fillStyle = esGrad;
      fCtx.fillRect(bx - bw * 0.36, by - 22 * us, bw * 0.72, 22 * us);
      fCtx.fillRect(bx - bw * 0.20, by - 42 * us, bw * 0.40, 20 * us);
      fCtx.fillStyle = '#9aa8b8';
      fCtx.fillRect(bx - 0.9 * us, by - 78 * us, 1.8 * us, 36 * us);
      beaconRefX[3] = (bx - ox) / viewWidth;
      beaconRefY[3] = (by - 78 * us) / viewHeight;
    } else if (isOneWTC) {
      // Chamfered reflective glass obelisk + spire
      const wtcGrad = fCtx.createLinearGradient(bx - bw * 0.5, by, bx + bw * 0.5, by + bh * 0.6);
      wtcGrad.addColorStop(0, '#243854');
      wtcGrad.addColorStop(0.5, '#162438');
      wtcGrad.addColorStop(1, '#121a28');
      fCtx.fillStyle = wtcGrad;
      fCtx.fillRect(bx - bw * 0.5, by, bw, bh);
      // Center chamfer reflection line
      fCtx.strokeStyle = 'rgba(155, 205, 255, 0.22)';
      fCtx.lineWidth = 1.0 * us;
      fCtx.beginPath();
      fCtx.moveTo(bx, by);
      fCtx.lineTo(bx - bw * 0.35, by + bh * 0.7);
      fCtx.moveTo(bx, by);
      fCtx.lineTo(bx + bw * 0.35, by + bh * 0.7);
      fCtx.stroke();
      fCtx.fillStyle = '#b0c4de';
      fCtx.fillRect(bx - 0.9 * us, by - 62 * us, 1.8 * us, 62 * us);
      beaconRefX[1] = (bx - ox) / viewWidth;
      beaconRefY[1] = (by - 62 * us) / viewHeight;
    } else if (isChryslerFar) {
      // Illuminated stainless-steel terraced crown
      fCtx.fillStyle = '#758294';
      for (let tier = 0; tier < 4; tier++) {
        const tw = bw * (0.76 - tier * 0.16);
        fCtx.beginPath();
        fCtx.arc(bx, by - tier * 8.5 * us, tw * 0.5, Math.PI, 0);
        fCtx.fill();
      }
      fCtx.fillRect(bx - 0.8 * us, by - 52 * us, 1.6 * us, 20 * us);
      beaconRefX[5] = (bx - ox) / viewWidth;
      beaconRefY[5] = (by - 52 * us) / viewHeight;
    }

    drawSkyscraperMicroWindows(fCtx, bx, by, bw, bh, us, rngFar, 0.42, 0.72, viewHeight * 0.88);
  }

  // Realistic neutral aerial perspective haze over the distant skyline
  const farMist = fCtx.createLinearGradient(0, viewHeight * 0.48, 0, viewHeight);
  farMist.addColorStop(0.0, 'rgba(16, 20, 26, 0)');
  farMist.addColorStop(0.65, 'rgba(28, 31, 38, 0.34)');
  farMist.addColorStop(1.0, 'rgba(42, 44, 48, 0.55)');
  fCtx.fillStyle = farMist;
  fCtx.fillRect(0, viewHeight * 0.48, fw, viewHeight * 0.52);
  fCtx.restore();

  // =====================================================================
  // 3. MID-GROUND MANHATTAN HIGH-RISES (`cityMidCanvas`)
  // =====================================================================
  const mCtx = cityMidCanvas.getContext('2d');
  mCtx.save();
  mCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const rngMid = seededRandom(2099);
  const midCount = 22;
  for (let i = 0; i < midCount; i++) {
    const u = (i + 0.25) / midCount;
    const bx = ox + u * viewWidth + (rngMid() - 0.5) * 20 * us;
    const bw = (42 + rngMid() * 44) * us;
    const bh = (0.32 + rngMid() * 0.38) * viewHeight;
    const by = viewHeight - bh;

    // 3D side extrusion in shadow
    const sideW = 11 * us;
    mCtx.fillStyle = '#090b10';
    mCtx.fillRect(bx + bw * 0.5, by + 4 * us, sideW, bh);

    // Main mid-ground facade with desaturated stone/glass gradient
    const isGlassMid = (i % 3 === 0);
    const midGrad = mCtx.createLinearGradient(bx - bw * 0.5, by, bx + bw * 0.5, by + bh);
    if (isGlassMid) {
      midGrad.addColorStop(0, '#171d24');
      midGrad.addColorStop(0.5, '#11161c');
      midGrad.addColorStop(1, '#0c0f14');
    } else {
      midGrad.addColorStop(0, (i & 1) ? '#1e1f22' : '#211f1e');
      midGrad.addColorStop(1, '#101115');
    }
    mCtx.fillStyle = midGrad;
    mCtx.fillRect(bx - bw * 0.5, by, bw, bh);

    // Subtle stone cornice or mechanical penthouse rim
    mCtx.fillStyle = isGlassMid ? '#2b323b' : '#333234';
    mCtx.fillRect(bx - bw * 0.5, by, bw, 2.0 * us);

    if (i % 4 === 1) {
      drawWaterTowerOnCtx(mCtx, bx - bw * 0.24, by, us * 0.72, true);
    }

    drawSkyscraperMicroWindows(mCtx, bx, by + 4 * us, bw, bh, us * 1.15, rngMid, 0.45, isGlassMid ? 0.42 : 0.72, viewHeight - 10 * us);
  }

  // Subtle neutral street-canyon mist rising between mid-ground towers
  const streetGlow = mCtx.createLinearGradient(0, viewHeight * 0.72, 0, viewHeight);
  streetGlow.addColorStop(0.0, 'rgba(180, 175, 168, 0)');
  streetGlow.addColorStop(1.0, 'rgba(180, 175, 168, 0.11)');
  mCtx.fillStyle = streetGlow;
  mCtx.fillRect(0, viewHeight * 0.72, fw, viewHeight * 0.28);
  mCtx.restore();
}

/**
 * Renders the multi-layer photorealistic New York City background with smooth mouse parallax.
 */
function drawCityBackdrop() {
  const w = Math.max(1, Math.round(viewWidth * dpr));
  const h = Math.max(1, Math.round(viewHeight * dpr));
  if (!citySkyCanvas || cityCacheW !== w || cityCacheH !== h) {
    rebuildCityBackdropCache();
  }

  const us = uniformScale;
  const padX = 64 * us;

  const normMX = isPointerActive ? ((smoothMouseX - viewWidth * 0.5) / Math.max(1, viewWidth * 0.5)) : 0;
  const normMY = isPointerActive ? ((smoothMouseY - viewHeight * 0.5) / Math.max(1, viewHeight * 0.5)) : 0;

  // 1. Base Sky, Moon & Clouds
  ctx.drawImage(citySkyCanvas, 0, 0, viewWidth, viewHeight);

  // 2. Subtle Stars in the upper sky
  ctx.save();
  ctx.fillStyle = '#f0f4ff';
  for (let i = 0; i < STAR_COUNT; i++) {
    const twinkle = 0.3 + 0.7 * Math.sin(elapsedTime * 1.5 + starPhase[i]);
    ctx.globalAlpha = twinkle * 0.55;
    const sx = starX[i] * viewWidth - normMX * 4 * us;
    const sy = starY[i] * viewHeight - normMY * 2 * us;
    const sz = starSize[i] * us;
    ctx.fillRect(sx, sy, sz, sz);
  }
  ctx.restore();

  // 3. Distant Helicopter with realistic navigation strobe & searchlight
  {
    const heliPeriod = 42;
    const heliU = ((elapsedTime / heliPeriod) % 1);
    const hx = viewWidth * (1.08 - heliU * 1.16) - normMX * 8 * us;
    const hy = viewHeight * 0.16 + Math.sin(elapsedTime * 1.5) * 3.5 * us;

    ctx.save();
    const beamAng = 1.18 + Math.sin(elapsedTime * 0.75) * 0.24;
    const beamLen = 195 * us;
    const bx1 = hx + Math.cos(beamAng - 0.07) * beamLen;
    const by1 = hy + Math.sin(beamAng - 0.07) * beamLen;
    const bx2 = hx + Math.cos(beamAng + 0.07) * beamLen;
    const by2 = hy + Math.sin(beamAng + 0.07) * beamLen;
    const beamGrad = ctx.createLinearGradient(hx, hy, (bx1 + bx2) * 0.5, (by1 + by2) * 0.5);
    beamGrad.addColorStop(0, 'rgba(225, 240, 255, 0.14)');
    beamGrad.addColorStop(1, 'rgba(225, 240, 255, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(bx1, by1);
    ctx.lineTo(bx2, by2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#06080f';
    ctx.beginPath();
    ctx.ellipse(hx, hy, 4.8 * us, 2.0 * us, 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#06080f';
    ctx.lineWidth = 1.0 * us;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + 9 * us, hy - 1.0 * us);
    ctx.stroke();

    if (Math.sin(elapsedTime * 8.0) > 0.35) {
      ctx.fillStyle = '#ff2a3c';
      ctx.beginPath();
      ctx.arc(hx + 9 * us, hy - 1.0 * us, 1.4 * us, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 4. Far Manhattan Skyline Layer
  const farShiftX = -padX - normMX * 16 * us;
  const farShiftY = -normMY * 5 * us;
  ctx.drawImage(cityFarCanvas, farShiftX, farShiftY, viewWidth + padX * 2, viewHeight);

  // Moving vehicle headlights/taillights on the distant Brooklyn Bridge
  {
    const brLeft = viewWidth * 0.01 + farShiftX + padX;
    const brRight = viewWidth * 0.45 + farShiftX + padX;
    const deckY = viewHeight * 0.73 + farShiftY - 1.0 * us;
    ctx.save();
    for (let c = 0; c < 14; c++) {
      const dir = (c & 1) ? 1 : -1;
      const u = ((elapsedTime * (0.038 + (c % 3) * 0.01) * dir + c * 0.14) % 1 + 1) % 1;
      const cx = brLeft + u * (brRight - brLeft);
      ctx.fillStyle = dir > 0 ? 'rgba(255, 232, 175, 0.75)' : 'rgba(255, 65, 75, 0.70)';
      ctx.fillRect(cx, deckY, 2.0 * us, 1.1 * us);
    }
    ctx.restore();
  }

  // 5. Mid-Ground Manhattan Skyline Layer
  const midShiftX = -padX - normMX * 34 * us;
  const midShiftY = -normMY * 10 * us;
  ctx.drawImage(cityMidCanvas, midShiftX, midShiftY, viewWidth + padX * 2, viewHeight);

  // 6. FAA Red Obstruction Beacons with soft optical glow
  ctx.save();
  for (let i = 0; i < BEACON_COUNT; i++) {
    const pulse = 0.3 + 0.7 * Math.max(0, Math.sin(elapsedTime * 2.8 + i * 1.1));
    const shiftX = beaconLayer[i] === 0 ? (farShiftX + padX) : (midShiftX + padX);
    const shiftY = beaconLayer[i] === 0 ? farShiftY : midShiftY;
    const bx = beaconRefX[i] * viewWidth + shiftX;
    const by = beaconRefY[i] * viewHeight + shiftY;

    ctx.globalAlpha = pulse * 0.85;
    ctx.fillStyle = '#ff3844';
    ctx.beginPath();
    ctx.arc(bx, by, 1.4 * us, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = pulse * 0.22;
    ctx.beginPath();
    ctx.arc(bx, by, 5.5 * us, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Draws soft rising NYC street steam plumes at the bottom of the avenues.
 */
function drawCityForegroundMist() {
  const us = uniformScale;
  ctx.save();
  for (let i = 0; i < STEAM_COUNT; i++) {
    const p = (steamY[i] + elapsedTime * steamSpeed[i]) % 1;
    const sx = steamX[i] * viewWidth + Math.sin(elapsedTime * 0.65 + i * 2.1) * 16 * us;
    const sy = viewHeight - p * 140 * us;
    const rad = (steamRadius[i] + p * 24) * us;
    const alpha = Math.sin(p * Math.PI) * 0.065;
    if (alpha <= 0.004) continue;

    const grad = ctx.createRadialGradient(sx, sy, rad * 0.1, sx, sy, rad);
    grad.addColorStop(0, 'rgba(245, 220, 200, ' + alpha.toFixed(3) + ')');
    grad.addColorStop(1, 'rgba(245, 220, 200, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Renders a photorealistic 3D New York building into `card.cacheCanvas`:
 * - Glass Curtain-Wall Skyscrapers (`curtain-glass`, `diagrid-glass`):
 *   Sky-reflecting low-iron glass facade, thin anodized aluminum mullions, dark spandrel glass bands,
 *   3D interior office ceiling planes with linear LED light troffers, and diagonal specular sheen.
 * - Pre-War Limestone, Beaux-Arts, Cast-Iron & Weathered Brick Buildings:
 *   3D fluted stone pilasters with soft ambient-occlusion crevices, deep recessed window wells with
 *   projecting stone lintels/sills and drop shadows, warm multi-pane sash windows with sheer curtains,
 *   upward warm architectural floodlights on the cornices, and wrought-iron fire escapes with cast shadows.
 */
function rebuildCardCache(card) {
  const us = uniformScale;
  const rng = seededRandom(card.seed);

  const roofTopWorldY = card.cy - card.baseH * 0.5;
  const fullShaftH = Math.max(card.baseH * 1.4, (viewHeight + 70 * us) - roofTopWorldY);
  const roofPadTop = 46 * us;
  const sideExtrudeW = 18 * us;

  card.fullH = fullShaftH;
  card.roofPadTop = roofPadTop;
  card.sideExtrudeW = sideExtrudeW;

  const totalLogicW = card.baseW + sideExtrudeW;
  const totalLogicH = roofPadTop + fullShaftH;

  const targetW = Math.max(32, Math.round(totalLogicW * config.maxMagnetScale * dpr));
  const targetH = Math.max(32, Math.round(totalLogicH * config.maxMagnetScale * dpr));

  if (!card.cacheCanvas) {
    card.cacheCanvas = document.createElement('canvas');
    card.cacheCtx = card.cacheCanvas.getContext('2d');
  }
  card.cacheCanvas.width = targetW;
  card.cacheCanvas.height = targetH;

  const g = card.cacheCtx;
  g.save();
  g.clearRect(0, 0, targetW, targetH);
  g.scale(config.maxMagnetScale * dpr, config.maxMagnetScale * dpr);

  const w = card.baseW;
  const crownH = card.baseH;
  const h = fullShaftH;
  const y0 = roofPadTop;
  const extrudeRight = card.sideDir >= 0;
  const x0 = extrudeRight ? 0 : sideExtrudeW;
  const isGlassTower = card.archType === 'curtain-glass' || card.archType === 'diagrid-glass';

  // =========================================================================
  // 1. 3D PERSPECTIVE SIDE EXTRUSION WALL (in deep atmospheric shadow)
  // =========================================================================
  const sideGrad = g.createLinearGradient(0, y0, 0, y0 + h);
  sideGrad.addColorStop(0, card.facadeDark);
  sideGrad.addColorStop(0.7, '#090b12');
  sideGrad.addColorStop(1, '#141218');
  g.fillStyle = sideGrad;

  if (extrudeRight) {
    g.beginPath();
    g.moveTo(x0 + w, y0);
    g.lineTo(x0 + w + sideExtrudeW, y0 + 9 * us);
    g.lineTo(x0 + w + sideExtrudeW, y0 + h);
    g.lineTo(x0 + w, y0 + h);
    g.closePath();
    g.fill();
  } else {
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(0, y0 + 9 * us);
    g.lineTo(0, y0 + h);
    g.lineTo(x0, y0 + h);
    g.closePath();
    g.fill();
  }

  // Foreshortened side-wall windows
  const sideWinX = extrudeRight ? (x0 + w + 3.5 * us) : (3.5 * us);
  const sideWinW = sideExtrudeW - 7 * us;
  for (let sy = y0 + 14 * us; sy < y0 + h - 20 * us; sy += 13.5 * us) {
    if (rng() < 0.42) {
      g.fillStyle = rng() < card.windowWarmth
        ? 'rgba(185, 175, 158, 0.24)'
        : 'rgba(155, 168, 182, 0.20)';
      g.fillRect(sideWinX, sy, sideWinW, 7.5 * us);
    } else {
      g.fillStyle = 'rgba(5, 7, 12, 0.55)';
      g.fillRect(sideWinX, sy, sideWinW, 7.5 * us);
    }
  }

  // =========================================================================
  // 2A. MODERN GLASS CURTAIN-WALL SKYSCRAPER RENDERER
  // =========================================================================
  if (isGlassTower) {
    // Base reflective glass curtain wall (desaturated slate-charcoal glass)
    const glassSkyGrad = g.createLinearGradient(x0, y0, x0 + w * 0.3, y0 + h);
    glassSkyGrad.addColorStop(0.00, '#181e26');
    glassSkyGrad.addColorStop(0.35, '#12171e');
    glassSkyGrad.addColorStop(0.75, '#151920');
    glassSkyGrad.addColorStop(1.00, '#1e2024');
    g.fillStyle = glassSkyGrad;
    g.fillRect(x0, y0, w, h);

    const cols = card.windowCols || 9;
    const frameMargin = 4 * us;
    const bayW = (w - frameMargin * 2) / cols;
    const floorH = 12.5 * us;
    const spandrelH = 3.0 * us;
    const paneH = floorH - spandrelH;

    // Render 3D interior office floors visible through the curtain wall glass
    for (let wy = y0 + 10 * us; wy < y0 + h - 12 * us; wy += floorH) {
      // Dark anodized spandrel panel between floor slabs
      g.fillStyle = '#09101a';
      g.fillRect(x0, wy - spandrelH, w, spandrelH);
      g.fillStyle = 'rgba(140, 195, 245, 0.10)';
      g.fillRect(x0, wy - spandrelH, w, 0.6 * us);

      // Entire office floor illumination coherence
      const floorLitProb = 0.25 + rng() * 0.55;
      const floorIsWarm = rng() < card.windowWarmth;

      for (let c = 0; c < cols; c++) {
        const wx = x0 + frameMargin + c * bayW;
        const ww = bayW - 1.0 * us;

        if (rng() < floorLitProb) {
          const brightness = 0.50 + rng() * 0.42;
          const roomGrad = g.createLinearGradient(wx, wy, wx, wy + paneH);
          if (floorIsWarm) {
            roomGrad.addColorStop(0.0, 'rgba(225, 220, 208, ' + (0.78 * brightness).toFixed(2) + ')');
            roomGrad.addColorStop(0.35, 'rgba(175, 165, 148, ' + (0.58 * brightness).toFixed(2) + ')');
            roomGrad.addColorStop(1.0, 'rgba(62, 56, 50, ' + (0.42 * brightness).toFixed(2) + ')');
          } else {
            roomGrad.addColorStop(0.0, 'rgba(210, 220, 228, ' + (0.78 * brightness).toFixed(2) + ')');
            roomGrad.addColorStop(0.35, 'rgba(135, 152, 168, ' + (0.52 * brightness).toFixed(2) + ')');
            roomGrad.addColorStop(1.0, 'rgba(34, 42, 52, ' + (0.38 * brightness).toFixed(2) + ')');
          }
          g.fillStyle = roomGrad;
          g.fillRect(wx, wy, ww, paneH);

          // Perspective office ceiling linear LED light troffer strip near top of window
          g.fillStyle = floorIsWarm ? 'rgba(235, 232, 225, 0.78)' : 'rgba(222, 230, 238, 0.78)';
          g.fillRect(wx + ww * 0.12, wy + 1.0 * us, ww * 0.76, 1.1 * us);

          // Occasional interior structural column or partition silhouette
          if (rng() < 0.28) {
            g.fillStyle = 'rgba(12, 18, 28, 0.55)';
            g.fillRect(wx + ww * 0.6, wy + paneH * 0.45, ww * 0.35, paneH * 0.55);
          }
        } else {
          // Unlit office bay reflecting twilight sky
          g.fillStyle = 'rgba(10, 18, 30, 0.65)';
          g.fillRect(wx, wy, ww, paneH);
        }
      }
    }

    // Diagonal Fresnel sky sheen across the entire glass curtain wall
    const sheenGrad = g.createLinearGradient(x0, y0, x0 + w, y0 + crownH * 1.4);
    sheenGrad.addColorStop(0.00, 'rgba(180, 220, 255, 0.14)');
    sheenGrad.addColorStop(0.32, 'rgba(180, 220, 255, 0.02)');
    sheenGrad.addColorStop(0.50, 'rgba(255, 255, 255, 0.09)');
    sheenGrad.addColorStop(0.75, 'rgba(180, 220, 255, 0.0)');
    sheenGrad.addColorStop(1.00, 'rgba(255, 190, 140, 0.06)');
    g.fillStyle = sheenGrad;
    g.fillRect(x0, y0, w, h);

    // Fine vertical aluminum curtain-wall mullions with metallic catchlight
    for (let c = 0; c <= cols; c++) {
      const mx = x0 + frameMargin + c * bayW - 0.5 * us;
      g.fillStyle = '#0a101a';
      g.fillRect(mx, y0, 1.0 * us, h);
      g.fillStyle = 'rgba(165, 205, 240, 0.22)';
      g.fillRect(mx, y0, 0.4 * us, h);
    }

    // Brushed steel structural diagrid bracing (for Hearst / Midtown Atrium style)
    if (card.archType === 'diagrid-glass') {
      const diagStep = 38 * us;
      g.strokeStyle = '#0d1520';
      g.lineWidth = 2.6 * us;
      g.beginPath();
      for (let dy = y0; dy < y0 + h; dy += diagStep) {
        g.moveTo(x0, dy);
        g.lineTo(x0 + w, dy + diagStep);
        g.moveTo(x0 + w, dy);
        g.lineTo(x0, dy + diagStep);
      }
      g.stroke();

      g.strokeStyle = 'rgba(160, 200, 235, 0.28)';
      g.lineWidth = 0.8 * us;
      g.stroke();
    }
  } else {
    // =========================================================================
    // 2B. PRE-WAR LIMESTONE, BEAUX-ARTS, CAST-IRON & BRICK MASONRY RENDERER
    // =========================================================================
    const facGrad = g.createLinearGradient(x0, y0, x0 + w, y0 + h * 0.75);
    facGrad.addColorStop(0.0, card.facadeColor);
    facGrad.addColorStop(0.6, card.facadeDark);
    facGrad.addColorStop(1.0, '#121014');
    g.fillStyle = facGrad;
    g.fillRect(x0, y0, w, h);

    // Micro-stone / brick masonry course shading (subtle alternating horizontal bands)
    for (let ry = y0; ry < y0 + h; ry += 3.0 * us) {
      g.fillStyle = (rng() < 0.5) ? 'rgba(255, 255, 255, 0.018)' : 'rgba(0, 0, 0, 0.06)';
      g.fillRect(x0, ry, w, 1.5 * us);
    }

    const cols = card.windowCols || 6;
    const outerPierW = 8.5 * us;
    const innerSpanW = w - outerPierW * 2;
    const colSpan = innerSpanW / cols;
    const winW = Math.max(4.5 * us, colSpan * 0.62);
    const pilasterW = colSpan - winW;
    const rowStep = 14.5 * us;
    const winH = 9.2 * us;

    // Deep vertical recessed window bays with soft ambient-occlusion shadow edges
    for (let c = 0; c < cols; c++) {
      const bayX = x0 + outerPierW + c * colSpan + pilasterW * 0.5;
      g.fillStyle = 'rgba(0, 0, 0, 0.24)';
      g.fillRect(bayX - 1.2 * us, y0 + 8 * us, winW + 2.4 * us, h - 8 * us);
      // sunlit right edge of pilaster
      g.fillStyle = 'rgba(255, 245, 230, 0.045)';
      g.fillRect(bayX - pilasterW * 0.5, y0 + 8 * us, 1.0 * us, h - 8 * us);
    }

    // Render recessed masonry windows with 3D lintels, sills, double-hung sashes & warm rooms
    for (let wy = y0 + 13 * us; wy < y0 + h - 14 * us; wy += rowStep) {
      if (Math.abs(wy - (y0 + crownH - 4 * us)) < 7.5 * us) continue;

      // Continuous stone belt-course every 4 floors on Beaux-Arts / Cast-Iron buildings
      const floorIdx = Math.round((wy - y0) / rowStep);
      if ((card.archType === 'beaux-arts' || card.archType === 'soho-castiron') && (floorIdx % 4 === 0)) {
        g.fillStyle = card.trimColor;
        g.fillRect(x0, wy - 3.2 * us, w, 1.8 * us);
        g.fillStyle = 'rgba(0, 0, 0, 0.45)';
        g.fillRect(x0, wy - 1.4 * us, w, 1.4 * us);
      }

      for (let c = 0; c < cols; c++) {
        const wx = x0 + outerPierW + c * colSpan + pilasterW * 0.5;
        const isLit = rng() < 0.58;

        // Deep 3D masonry window recess (dark shadow reveal at top & left)
        g.fillStyle = '#07080d';
        g.fillRect(wx - 1.0 * us, wy - 1.2 * us, winW + 2.0 * us, winH + 2.0 * us);

        if (isLit) {
          const isWarm = rng() < card.windowWarmth;
          const intensity = 0.50 + rng() * 0.42;
          const winGrad = g.createLinearGradient(wx, wy, wx, wy + winH);
          if (isWarm) {
            winGrad.addColorStop(0.0, 'rgba(224, 214, 196, ' + (0.86 * intensity).toFixed(2) + ')');
            winGrad.addColorStop(0.5, 'rgba(168, 150, 128, ' + (0.76 * intensity).toFixed(2) + ')');
            winGrad.addColorStop(1.0, 'rgba(82, 68, 56, ' + (0.68 * intensity).toFixed(2) + ')');
          } else {
            winGrad.addColorStop(0.0, 'rgba(198, 210, 222, ' + (0.80 * intensity).toFixed(2) + ')');
            winGrad.addColorStop(1.0, 'rgba(78, 92, 108, ' + (0.60 * intensity).toFixed(2) + ')');
          }
          g.fillStyle = winGrad;
          g.fillRect(wx, wy, winW, winH);

          // Soft interior lamp hotspot in lower corner
          if (isWarm && rng() < 0.45) {
            const lx = wx + (rng() < 0.5 ? winW * 0.28 : winW * 0.72);
            const ly = wy + winH * 0.68;
            const lampG = g.createRadialGradient(lx, ly, 0.2 * us, lx, ly, winW * 0.65);
            lampG.addColorStop(0, 'rgba(240, 235, 222, 0.65)');
            lampG.addColorStop(1, 'rgba(200, 188, 168, 0)');
            g.fillStyle = lampG;
            g.fillRect(wx, wy, winW, winH);
          }

          // Half-drawn shade / sheer drapery fold
          if (rng() < 0.42) {
            g.fillStyle = 'rgba(24, 20, 22, 0.42)';
            g.fillRect(wx, wy, winW, winH * (0.28 + rng() * 0.32));
          }
        } else {
          // Dark glass pane with subtle sky reflection
          const darkGrad = g.createLinearGradient(wx, wy, wx + winW, wy + winH);
          darkGrad.addColorStop(0, '#131b29');
          darkGrad.addColorStop(1, '#090c14');
          g.fillStyle = darkGrad;
          g.fillRect(wx, wy, winW, winH);
          g.fillStyle = 'rgba(150, 185, 225, 0.08)';
          g.fillRect(wx + 0.5 * us, wy + 0.5 * us, winW * 0.38, winH - 1.0 * us);
        }

        // Double-hung window meeting rail & vertical muntin
        g.fillStyle = '#0b0d13';
        g.fillRect(wx, wy + winH * 0.48, winW, 0.75 * us);
        if (winW > 7 * us) {
          g.fillRect(wx + winW * 0.48, wy, 0.6 * us, winH);
        }

        // Carved stone window lintel (top header) & projecting stone sill with drop shadow
        g.fillStyle = card.trimColor;
        g.fillRect(wx - 1.1 * us, wy - 1.8 * us, winW + 2.2 * us, 1.3 * us);
        g.fillRect(wx - 1.3 * us, wy + winH, winW + 2.6 * us, 1.4 * us);
        g.fillStyle = 'rgba(0, 0, 0, 0.55)';
        g.fillRect(wx - 1.1 * us, wy + winH + 1.4 * us, winW + 2.2 * us, 1.2 * us);
      }
    }
  }

  // =========================================================================
  // 3. ARCHITECTURAL CORNICE OVERHANG & UPWARD WARM FLOODLIGHTING AT `y0 + crownH`
  //    (Grounds Spidey's `PERCH_BOTTOM_UPSIDE_DOWN` upside-down perch!)
  // =========================================================================
  const corniceY = y0 + crownH;

  // Upward neutral-warm architectural floodlights illuminating the upper crown facade above the cornice
  const numFloods = 4;
  for (let f = 0; f < numFloods; f++) {
    const fx = x0 + (w * (f + 0.5)) / numFloods;
    const floodR = 34 * us;
    const floodG = g.createRadialGradient(fx, corniceY - 3 * us, 2 * us, fx, corniceY - 18 * us, floodR);
    floodG.addColorStop(0.0, 'rgba(225, 218, 205, 0.18)');
    floodG.addColorStop(0.5, 'rgba(195, 188, 176, 0.06)');
    floodG.addColorStop(1.0, 'rgba(195, 188, 176, 0)');
    g.fillStyle = floodG;
    g.fillRect(x0, corniceY - floodR, w, floodR);
  }

  // Deep ambient-occlusion drop shadow cast below the projecting cornice ledge
  const cornShadow = g.createLinearGradient(0, corniceY, 0, corniceY + 16 * us);
  cornShadow.addColorStop(0.0, 'rgba(0, 0, 0, 0.78)');
  cornShadow.addColorStop(0.4, 'rgba(0, 0, 0, 0.35)');
  cornShadow.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  g.fillStyle = cornShadow;
  g.fillRect(x0, corniceY, w, 16 * us);

  // Sculpted stone/steel cornice molding & dentil brackets
  const cornGrad = g.createLinearGradient(0, corniceY - 5 * us, 0, corniceY + 1 * us);
  cornGrad.addColorStop(0.0, card.trimColor);
  cornGrad.addColorStop(0.3, 'rgba(255, 248, 235, 0.25)');
  cornGrad.addColorStop(1.0, '#161820');
  g.fillStyle = cornGrad;
  g.fillRect(x0 - 2.0 * us, corniceY - 5.0 * us, w + 4.0 * us, 5.5 * us);

  g.fillStyle = 'rgba(10, 12, 18, 0.65)';
  for (let bx = x0 + 3 * us; bx < x0 + w - 3 * us; bx += 6.5 * us) {
    g.fillRect(bx, corniceY - 2.0 * us, 2.2 * us, 2.5 * us);
  }

  // =========================================================================
  // 4. ROOFTOP PARAPET COPING & REALISTIC MECHANICAL / WATER-TOWER STRUCTURES
  //    (Center `[x0 + w*0.3 .. x0 + w*0.7]` is kept clear & level for Spidey!)
  // =========================================================================
  const paraGrad = g.createLinearGradient(0, y0 - 3 * us, 0, y0 + 5 * us);
  paraGrad.addColorStop(0.0, card.trimColor);
  paraGrad.addColorStop(0.25, '#8f8b84');
  paraGrad.addColorStop(0.7, '#282a33');
  paraGrad.addColorStop(1.0, '#0d0f14');
  g.fillStyle = paraGrad;
  g.fillRect(x0 - 1.5 * us, y0 - 2.5 * us, w + 3.0 * us, 6.0 * us);

  // Subtle moonlight specular highlight along the top stone coping edge
  g.fillStyle = 'rgba(220, 235, 255, 0.28)';
  g.fillRect(x0 - 1.5 * us, y0 - 2.5 * us, w + 3.0 * us, 0.9 * us);

  // Soft shadow below the parapet coping
  const topShadow = g.createLinearGradient(0, y0 + 3.5 * us, 0, y0 + 11 * us);
  topShadow.addColorStop(0, 'rgba(0, 0, 0, 0.62)');
  topShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  g.fillStyle = topShadow;
  g.fillRect(x0, y0 + 3.5 * us, w, 7.5 * us);

  // Weathered Cedar Rooftop Water Tank on the outer side of the roof
  if (card.hasWaterTower) {
    const wtX = extrudeRight ? (x0 + w * 0.80) : (x0 + w * 0.20);
    drawWaterTowerOnCtx(g, wtX, y0 - 2.0 * us, us * 0.92, false);
  }

  // Architectural Stepped Crown / Broadcast Mast on the side-corner of the roof
  if (card.hasSpire) {
    const spX = extrudeRight ? (x0 + w * 0.20) : (x0 + w * 0.80);
    const spGrad = g.createLinearGradient(spX - 10 * us, 0, spX + 10 * us, 0);
    spGrad.addColorStop(0, '#1e222b');
    spGrad.addColorStop(0.4, card.trimColor);
    spGrad.addColorStop(1, '#12151c');
    g.fillStyle = spGrad;
    g.fillRect(spX - 9.5 * us, y0 - 12 * us, 19 * us, 9.8 * us);
    g.fillRect(spX - 5.5 * us, y0 - 21 * us, 11 * us, 9 * us);

    // Tapered steel broadcast mast
    g.strokeStyle = '#9aa8b8';
    g.lineWidth = 1.2 * us;
    g.beginPath();
    g.moveTo(spX, y0 - 21 * us);
    g.lineTo(spX, y0 - 42 * us);
    g.stroke();

    // FAA red obstruction beacon with soft optical halo
    const bHalo = g.createRadialGradient(spX, y0 - 42 * us, 0.5 * us, spX, y0 - 42 * us, 5.5 * us);
    bHalo.addColorStop(0, 'rgba(255, 65, 75, 0.95)');
    bHalo.addColorStop(0.4, 'rgba(255, 40, 50, 0.35)');
    bHalo.addColorStop(1, 'rgba(255, 40, 50, 0)');
    g.fillStyle = bHalo;
    g.beginPath();
    g.arc(spX, y0 - 42 * us, 5.5 * us, 0, Math.PI * 2);
    g.fill();
  }

  // Realistic Louvered HVAC Mechanical Penthouse on the opposite roof corner
  if (!card.hasSpire) {
    const boxX = extrudeRight ? (x0 + w * 0.12) : (x0 + w * 0.72);
    const boxW = 19 * us;
    const boxH = 9.5 * us;
    const boxY = y0 - boxH - 2 * us;
    const mechGrad = g.createLinearGradient(boxX, boxY, boxX + boxW, boxY);
    mechGrad.addColorStop(0, '#252932');
    mechGrad.addColorStop(0.7, '#1a1d24');
    mechGrad.addColorStop(1, '#0e1015');
    g.fillStyle = mechGrad;
    g.fillRect(boxX, boxY, boxW, boxH);

    // Horizontal intake louver slats
    g.fillStyle = '#090b0f';
    for (let ly = boxY + 2 * us; ly < boxY + boxH - 1.5 * us; ly += 1.8 * us) {
      g.fillRect(boxX + 2.5 * us, ly, boxW - 5 * us, 0.9 * us);
    }
  }

  // =========================================================================
  // 5. REALISTIC WROUGHT-IRON NYC FIRE ESCAPES (with cast shadow on facade)
  // =========================================================================
  if (card.hasFireEscape) {
    const feX = extrudeRight ? (x0 + 7 * us) : (x0 + w - 26 * us);
    const feW = 19 * us;

    // Soft drop shadow cast by the iron fire escape onto the brick wall
    g.strokeStyle = 'rgba(0, 0, 0, 0.42)';
    g.lineWidth = 1.4 * us;
    g.beginPath();
    for (let fy = y0 + 26 * us; fy < y0 + h - 30 * us; fy += 29 * us) {
      g.rect(feX + 1.8 * us, fy + 2.2 * us, feW, 5.5 * us);
      g.moveTo(feX + 3.5 * us, fy + 7.7 * us);
      g.lineTo(feX + feW - 1.0 * us, fy + 31.2 * us);
    }
    g.stroke();

    // Wrought-iron balcony platforms, vertical spindles & diagonal stairs
    g.strokeStyle = '#12151c';
    g.lineWidth = Math.max(0.7, 0.95 * us);
    g.beginPath();
    for (let fy = y0 + 26 * us; fy < y0 + h - 30 * us; fy += 29 * us) {
      g.rect(feX, fy, feW, 5.2 * us);
      for (let rx = feX + 3 * us; rx < feX + feW; rx += 3.2 * us) {
        g.moveTo(rx, fy);
        g.lineTo(rx, fy + 5.2 * us);
      }
      g.moveTo(feX + 2 * us, fy + 5.2 * us);
      g.lineTo(feX + feW - 2 * us, fy + 29 * us);
    }
    g.stroke();
  }

  // Subtle ambient occlusion along the vertical edges of the building shaft
  const edgeAO = g.createLinearGradient(x0, 0, x0 + w, 0);
  edgeAO.addColorStop(0.00, 'rgba(0, 0, 0, 0.35)');
  edgeAO.addColorStop(0.08, 'rgba(0, 0, 0, 0)');
  edgeAO.addColorStop(0.92, 'rgba(0, 0, 0, 0)');
  edgeAO.addColorStop(1.00, 'rgba(0, 0, 0, 0.42)');
  g.fillStyle = edgeAO;
  g.fillRect(x0, y0, w, h);

  // Subtle 35mm photographic grain
  if (config.grainAmount > 0.005) {
    if (!grainCanvas) createFilmGrainPattern();
    const bakedPattern = g.createPattern(grainCanvas, 'repeat');
    g.globalAlpha = config.grainAmount * 0.55;
    g.globalCompositeOperation = 'overlay';
    g.fillStyle = bakedPattern;
    g.fillRect(0, 0, totalLogicW, totalLogicH);
  }

  g.restore();
  card.cacheW = targetW;
  card.cacheH = targetH;
}

function sortDrawOrderByScale() {
  for (let i = 0; i < CARD_COUNT; i++) {
    drawOrder[i] = i;
  }
}

function traceRoundedRect(x, y, w, h, r) {
  const radius = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }
}

/**
 * Renders a single photorealistic NYC building from its pre-rendered offscreen cache
 * with a soft volumetric rooftop floodlight glow when targeted by the cursor.
 */
function drawCard(card) {
  if (!card.loaded || !card.cacheCanvas) return;

  const audioBoost = 1 + audioEnergy * 0.012;
  const currentScale = card.scale * audioBoost;
  const extrudeRight = card.sideDir >= 0;

  const drawW = (card.baseW + card.sideExtrudeW) * currentScale;
  const drawH = (card.roofPadTop + card.fullH) * currentScale;

  const facadeLeftX = (card.cx + card.offsetX) - (card.baseW * currentScale) * 0.5;
  const drawX = extrudeRight ? facadeLeftX : (facadeLeftX - card.sideExtrudeW * currentScale);
  const roofTopY = (card.cy + card.offsetY) - (card.baseH * currentScale) * 0.5;
  const drawY = roofTopY - card.roofPadTop * currentScale;

  ctx.drawImage(card.cacheCanvas, drawX, drawY, drawW, drawH);

  // Soft architectural floodlight bloom on the upper building crown when targeted by the cursor
  const focusRatio = card.fieldStrength;
  if (focusRatio > 0.05) {
    const bw = card.baseW * currentScale;
    const bh = card.baseH * currentScale;
    const cx = card.cx + card.offsetX;
    ctx.save();
    const glow = ctx.createRadialGradient(cx, roofTopY, bw * 0.08, cx, roofTopY + bh * 0.35, bw * 0.85);
    glow.addColorStop(0.0, 'rgba(255, 230, 185, ' + (focusRatio * 0.22).toFixed(3) + ')');
    glow.addColorStop(0.6, 'rgba(180, 215, 255, ' + (focusRatio * 0.08).toFixed(3) + ')');
    glow.addColorStop(1.0, 'rgba(180, 215, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(facadeLeftX, roofTopY - 12 * uniformScale, bw, bh);
    ctx.restore();
  }
}
