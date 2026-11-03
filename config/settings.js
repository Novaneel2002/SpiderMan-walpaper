/**
 * config/settings.js
 * Global canvas context, reference design dimensions, configurable settings,
 * viewport/pointer/audio/timing state, and Lively Wallpaper integration.
 */
const canvas = document.getElementById('wallpaperCanvas');
let ctx = canvas.getContext('2d', { alpha: false });

// Reference design dimensions (16:9 aspect ratio matching the 1024x576 reference image)
const REF_WIDTH = 1024;
const REF_HEIGHT = 576;

// Configurable Settings (customizable live via LivelyProperties.json)
const config = {
  showSpidey: true,
  spideyScale: 1.15,
  maxMagnetScale: 1.22,
  magnetRadius: 185,
  maxMagnetPull: 14,
  grainAmount: 0.085,
  hoverDwellTime: 0.18,       // 180ms cursor dwell required before triggering a swing
  sassyPoseDelay: 2.0,        // 2s -> sassy hands-on-hips squint pose
  idleSitDelay: 5.0,          // 5s -> sit & dangle legs over border
  deepIdleDelay: 18.0         // 18s -> deep idle (yawn, lie flat, or hang upside-down on web)
};

const IDLE_SCALE = 1.0;
const INNER_CORE_RADIUS = 18;

// Smooth viscous-fluid damping rates (lower = slower, silkier, zero bounce)
const CURSOR_SMOOTH_RATE = 8.5;
const SCALE_SMOOTH_RATE = 5.0;
const PULL_SMOOTH_RATE = 5.5;

// Viewport & centered 16:9 stage state (prevents stretching on ultrawide 21:9 or 16:10 displays)
let viewWidth = window.innerWidth;
let viewHeight = window.innerHeight;
let dpr = Math.min(window.devicePixelRatio || 1, 3);
let uniformScale = 1;
let stageOffsetX = 0;
let stageOffsetY = 0;
let scaledMagnetRadius = config.magnetRadius;
let scaledInnerRadius = INNER_CORE_RADIUS;
let scaledMaxPull = config.maxMagnetPull;

// Pointer state (raw, smoothed, and inactivity timeout)
let rawMouseX = -9999;
let rawMouseY = -9999;
let smoothMouseX = -9999;
let smoothMouseY = -9999;
let isPointerActive = false;
let timeSinceMouseMove = 999;

// Timing & adaptive frame-rate state
let lastFrameTime = performance.now();
let lastRenderTime = 0;
let elapsedTime = 0;
let isPageHidden = document.hidden;
let rafId = 0;

// Optional Lively Wallpaper audio reactivity state (0 when silent/unused)
let audioEnergy = 0;
let targetAudioEnergy = 0;

// Pre-rendered seamless film grain / halftone pattern
let grainPattern = null;
let grainCanvas = null; // Source tile, reused to bake grain into each card cache

let idleTimerId = 0;
let lastFrameInterval = 0;
// Cursor speed tracking (for the "wind" brace reaction)
let mouseTravel = 0;
let mouseTravelX = 0;
let mouseSpeed = 0;
let mouseDirX = 1;

/**
 * Lively Wallpaper Settings Panel Listener (wired to LivelyProperties.json)
 */
window.livelyPropertyListener = function (name, val) {
  wakeNow();
  switch (name) {
    case 'showSpidey':
      config.showSpidey = Boolean(val);
      break;
    case 'spideyScale':
      config.spideyScale = Math.max(0.6, Math.min(2.0, Number(val) || 1.15));
      break;
    case 'magnetStrength':
      config.maxMagnetScale = 1.0 + Math.max(0.05, Math.min(0.5, Number(val) || 0.22));
      break;
    case 'magnetRadius':
      config.magnetRadius = Math.max(90, Math.min(350, Number(val) || 185));
      scaledMagnetRadius = config.magnetRadius * uniformScale;
      break;
    case 'grainAmount':
      config.grainAmount = Math.max(0, Math.min(0.25, Number(val) || 0.085));
      for (let i = 0; i < CARD_COUNT; i++) {
        if (cards[i].loaded) rebuildCardCache(cards[i]);
      }
      break;
    case 'idleSitDelay':
      config.idleSitDelay = Math.max(2, Math.min(20, Number(val) || 5.0));
      break;
  }
};

/**
 * Optional Lively Wallpaper Audio API Listener
 */
window.livelyAudioListener = function (audioArray) {
  if (!audioArray || !audioArray.length) return;
  let bassSum = 0;
  const bins = Math.min(16, audioArray.length);
  for (let i = 0; i < bins; i++) {
    bassSum += audioArray[i];
  }
  targetAudioEnergy = Math.min(1, bassSum / bins);
};

// Tiny public API: the character remains self-contained in this HTML file,
// but can also be controlled by another script or a host wallpaper panel.
// Example: SpiderManChibi.setScale(1.35); SpiderManChibi.setVisible(false);
window.SpiderManChibi = {
  setScale: function (value) {
    config.spideyScale = Math.max(0.6, Math.min(2.0, Number(value) || 1.15));
  },
  setVisible: function (value) {
    config.showSpidey = Boolean(value);
  },
  swingTo: function (cardIndex) {
    const idx = Math.max(0, Math.min(CARD_COUNT - 1, Number(cardIndex) || 0));
    requestSwingToCard(idx);
  }
};
