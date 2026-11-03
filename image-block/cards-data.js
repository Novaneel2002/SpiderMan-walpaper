/**
 * image-block/cards-data.js
 * Image block definitions, crop ratios, relative paths, and card state initialization.
 */
/**
 * Exact 11 card definitions measured from the 1024x576 reference image.
 * All paths use explicit relative "./images/..." notation (no leading slash or absolute path).
 */
const CARD_DEFINITIONS = [
  {
    // 0. Top-Left ("GIMME.") - TOP ROW
    x: 45, y: 34, w: 106, h: 107, radius: 16, isTopRow: true, sideDir: 1,
    src: './images/gimme.jpg',
    altSrc: './images/gimme.jpg',
    crop: null
  },
  {
    // 1. Top-Mid-Left (Hands on head) - TOP ROW
    x: 313, y: 31, w: 97, h: 80, radius: 16, isTopRow: true, sideDir: 1,
    src: './images/download%20(4)-2.jpg',
    altSrc: './images/download (4)-2.jpg',
    crop: { sxRatio: 0, syRatio: 0.5017, swRatio: 1.0, shRatio: 0.4642 }
  },
  {
    // 2. Upper-Mid-Right ("AWESOME." hammock)
    x: 610, y: 89, w: 127, h: 105, radius: 18, isTopRow: false, sideDir: -1,
    src: './images/Peter%20Parker-2.jpg',
    altSrc: './images/Peter Parker-2.jpg',
    crop: null
  },
  {
    // 3. Top-Right (Holding camera) - TOP ROW
    x: 844, y: 29, w: 124, h: 119, radius: 18, isTopRow: true, sideDir: -1,
    src: './images/download%20(3)-2.jpg',
    altSrc: './images/download (3)-2.jpg',
    crop: null
  },
  {
    // 4. Mid-Left (In hospital bed)
    x: 154, y: 217, w: 149, h: 117, radius: 18, isTopRow: false, sideDir: 1,
    src: './images/download%20(2)-2.jpg',
    altSrc: './images/download (2)-2.jpg',
    crop: null
  },
  {
    // 5. Center ("ur not spider man / hell yes i am")
    x: 391, y: 166, w: 153, h: 146, radius: 20, isTopRow: false, sideDir: 1,
    src: './images/center-spider-man.jpg',
    altSrc: 'images/center-spider-man.jpg',
    crop: null
  },
  {
    // 6. Mid-Right ("OWWW MY LEG...")
    x: 785, y: 207, w: 141, h: 132, radius: 18, isTopRow: false, sideDir: -1,
    src: './images/Spider%20Man-2.jpg',
    altSrc: './images/Spider Man-2.jpg',
    crop: null
  },
  {
    // 7. Bottom-Left ("OF COURSE THIS HAPPENS WHEN I CAN'T AFFORD A THERAPIST.")
    x: 41, y: 424, w: 114, h: 104, radius: 16, isTopRow: false, sideDir: 1,
    src: './images/download%20(5)-2.jpg',
    altSrc: './images/download (5)-2.jpg',
    crop: null
  },
  {
    // 8. Bottom-Mid-Left (Upside down with headphones)
    x: 361, y: 372, w: 111, h: 108, radius: 16, isTopRow: false, sideDir: 1,
    src: './images/Classic%20teenage%20Spider-Man%20_%20%E2%9C%8C%F0%9F%8F%BB-2.jpg',
    altSrc: './images/Classic teenage Spider-Man _ \u270C\uD83C\uDFFB-2.jpg',
    crop: null
  },
  {
    // 9. Bottom-Mid-Right (Hands on cheeks with hearts)
    x: 614, y: 403, w: 121, h: 124, radius: 18, isTopRow: false, sideDir: -1,
    src: './images/spidey%20icon%20%E2%98%85-2.jpg',
    altSrc: './images/spidey icon \u2605-2.jpg',
    crop: null
  },
  {
    // 10. Bottom-Right (Sitting on chair in park)
    x: 869, y: 411, w: 109, h: 118, radius: 16, isTopRow: false, sideDir: -1,
    src: './images/Spider-Man-2.jpg',
    altSrc: 'images/Spider-Man-2.jpg',
    crop: null
  }
];

// Pre-allocated runtime state for each card
const CARD_COUNT = CARD_DEFINITIONS.length;
const cards = new Array(CARD_COUNT);
const drawOrder = new Int32Array(CARD_COUNT);


for (let i = 0; i < CARD_COUNT; i++) {
  drawOrder[i] = i;
  const def = CARD_DEFINITIONS[i];
  const img = new Image();
  img.decoding = 'async';

  const card = {
    refCx: def.x + def.w * 0.5,
    refCy: def.y + def.h * 0.5,
    refW: def.w,
    refH: def.h,
    refRadius: def.radius,
    isTopRow: def.isTopRow,
    sideDir: def.sideDir,
    cx: 0,
    cy: 0,
    baseW: 0,
    baseH: 0,
    baseRadius: 0,
    sx: 0,
    sy: 0,
    sw: 1,
    sh: 1,
    cropSpec: def.crop,
    scale: IDLE_SCALE,
    targetScale: IDLE_SCALE,
    offsetX: 0,
    offsetY: 0,
    targetOffsetX: 0,
    targetOffsetY: 0,
    fieldStrength: 0,
    loadProgress: 0, // 0 -> 1 over 400ms on load for smooth fade+scale-in
    img: img,
    cacheCanvas: null,
    cacheCtx: null,
    cacheW: 1,
    cacheH: 1,
    loaded: false,
    triedAlt: false
  };

  img.onload = function () {
    const natW = img.naturalWidth || img.width;
    const natH = img.naturalHeight || img.height;

    if (card.cropSpec) {
      card.sx = natW * card.cropSpec.sxRatio;
      card.sy = natH * card.cropSpec.syRatio;
      card.sw = natW * card.cropSpec.swRatio;
      card.sh = natH * card.cropSpec.shRatio;
    } else {
      const targetAR = card.refW / card.refH;
      const srcAR = natW / natH;
      if (srcAR > targetAR) {
        card.sh = natH;
        card.sw = natH * targetAR;
        card.sx = (natW - card.sw) * 0.5;
        card.sy = 0;
      } else {
        card.sw = natW;
        card.sh = natW / targetAR;
        card.sx = 0;
        card.sy = (natH - card.sh) * 0.5;
      }
    }
    card.loaded = true;
    card.loadProgress = 0.001;
    rebuildCardCache(card);
  };

  img.onerror = function () {
    if (!card.triedAlt && def.altSrc) {
      card.triedAlt = true;
      img.src = def.altSrc;
    }
  };

  img.src = def.src;
  cards[i] = card;
}

