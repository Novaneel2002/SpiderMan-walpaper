/**
 * image-block/cards-data.js
 * Photorealistic New York City Architectural Building Definitions (3 depth tiers across Manhattan).
 * Replaces comic-style blocks with authentic NYC architectural archetypes:
 * glass curtain-wall towers, Art Deco limestone setbacks, cast-iron lofts, and masonry high-rises.
 */

const CARD_DEFINITIONS = [
  {
    // 0. High-Left: Rockefeller / 30 Rock Style Limestone Art Deco Setback Tower (Tier 1 - Back/High)
    x: 38, y: 42, w: 122, h: 110, radius: 2, isTopRow: true, sideDir: 1,
    tier: 0,
    archType: 'limestone-deco',
    name: 'ROCKEFELLER PLAZA',
    facadeColor: '#25272b',
    facadeDark: '#141518',
    trimColor: '#54534f',
    glassTint: '#14181e',
    windowWarmth: 0.65,
    windowCols: 8,
    hasWaterTower: false,
    hasSpire: true,
    hasFireEscape: false,
    seed: 101
  },
  {
    // 1. High-Mid-Left: Upper West Side Pre-War Masonry Tower (Tier 1 - Back/High)
    x: 296, y: 38, w: 114, h: 92, radius: 2, isTopRow: true, sideDir: 1,
    tier: 0,
    archType: 'prewar-brick',
    name: 'THE ANSONIA',
    facadeColor: '#262221',
    facadeDark: '#151212',
    trimColor: '#4f4b47',
    glassTint: '#121519',
    windowWarmth: 0.72,
    windowCols: 6,
    hasWaterTower: true,
    hasSpire: false,
    hasFireEscape: true,
    seed: 202
  },
  {
    // 2. High-Mid-Right: Hudson Yards / Midtown Glass Curtain-Wall Skyscraper (Tier 1 - Back/High)
    x: 602, y: 84, w: 136, h: 106, radius: 2, isTopRow: false, sideDir: -1,
    tier: 0,
    archType: 'curtain-glass',
    name: 'ONE VANDERBILT',
    facadeColor: '#1a2028',
    facadeDark: '#0e1217',
    trimColor: '#3d454f',
    glassTint: '#18212b',
    windowWarmth: 0.45,
    windowCols: 10,
    hasWaterTower: false,
    hasSpire: true,
    hasFireEscape: false,
    seed: 303
  },
  {
    // 3. High-Right: Chrysler / MetLife Style Crown & Steel Tower (Tier 1 - Back/High)
    x: 838, y: 34, w: 128, h: 118, radius: 2, isTopRow: true, sideDir: -1,
    tier: 0,
    archType: 'art-deco-spire',
    name: 'CHRYSLER ANNEX',
    facadeColor: '#212429',
    facadeDark: '#121418',
    trimColor: '#5c6168',
    glassTint: '#141920',
    windowWarmth: 0.60,
    windowCols: 8,
    hasWaterTower: false,
    hasSpire: true,
    hasFireEscape: false,
    seed: 404
  },
  {
    // 4. Mid-Left: SoHo Historic Cast-Iron & Masonry Loft (Tier 2 - Midground)
    x: 150, y: 214, w: 152, h: 118, radius: 2, isTopRow: false, sideDir: 1,
    tier: 1,
    archType: 'soho-castiron',
    name: 'GREENE ST LOFT',
    facadeColor: '#222120',
    facadeDark: '#131212',
    trimColor: '#484543',
    glassTint: '#13161a',
    windowWarmth: 0.70,
    windowCols: 6,
    hasWaterTower: true,
    hasSpire: false,
    hasFireEscape: true,
    seed: 505
  },
  {
    // 5. Center: Flatiron / Beaux-Arts Midtown Landmark Tower (Tier 2 - Midground Centerpiece)
    x: 388, y: 168, w: 158, h: 146, radius: 2, isTopRow: false, sideDir: 1,
    tier: 1,
    archType: 'beaux-arts',
    name: 'FLATIRON LANDMARK',
    facadeColor: '#2b2926',
    facadeDark: '#171614',
    trimColor: '#5e5952',
    glassTint: '#14171c',
    windowWarmth: 0.72,
    windowCols: 7,
    hasWaterTower: false,
    hasSpire: true,
    hasFireEscape: false,
    seed: 606
  },
  {
    // 6. Mid-Right: Hearst / Diagrid Structural Glass & Steel Tower (Tier 2 - Midground)
    x: 780, y: 206, w: 144, h: 132, radius: 2, isTopRow: false, sideDir: -1,
    tier: 1,
    archType: 'diagrid-glass',
    name: 'MIDTOWN ATRIUM',
    facadeColor: '#171d24',
    facadeDark: '#0c1014',
    trimColor: '#454e59',
    glassTint: '#1a232e',
    windowWarmth: 0.38,
    windowCols: 9,
    hasWaterTower: false,
    hasSpire: false,
    hasFireEscape: false,
    seed: 707
  },
  {
    // 7. Bottom-Left: Upper East Side / Brooklyn Classic Brownstone Row (Tier 3 - Foreground)
    x: 38, y: 422, w: 122, h: 108, radius: 2, isTopRow: false, sideDir: 1,
    tier: 2,
    archType: 'brownstone',
    name: 'BROOKLYN HEIGHTS',
    facadeColor: '#26201e',
    facadeDark: '#151110',
    trimColor: '#4a423e',
    glassTint: '#111317',
    windowWarmth: 0.78,
    windowCols: 5,
    hasWaterTower: false,
    hasSpire: false,
    hasFireEscape: true,
    seed: 808
  },
  {
    // 8. Bottom-Mid-Left: Greenwich Village Weathered Brick & Limestone Building (Tier 3 - Foreground)
    x: 356, y: 372, w: 118, h: 110, radius: 2, isTopRow: false, sideDir: 1,
    tier: 2,
    archType: 'prewar-brick',
    name: 'BLEECKER COURT',
    facadeColor: '#28211f',
    facadeDark: '#161211',
    trimColor: '#544e49',
    glassTint: '#13161a',
    windowWarmth: 0.76,
    windowCols: 5,
    hasWaterTower: true,
    hasSpire: false,
    hasFireEscape: true,
    seed: 909
  },
  {
    // 9. Bottom-Mid-Right: Chelsea Industrial Masonry & Steel Frame Loft (Tier 3 - Foreground)
    x: 610, y: 402, w: 126, h: 124, radius: 2, isTopRow: false, sideDir: -1,
    tier: 2,
    archType: 'soho-castiron',
    name: 'CHELSEA MARKET',
    facadeColor: '#202022',
    facadeDark: '#121214',
    trimColor: '#4a494c',
    glassTint: '#12161b',
    windowWarmth: 0.68,
    windowCols: 6,
    hasWaterTower: false,
    hasSpire: false,
    hasFireEscape: true,
    seed: 1010
  },
  {
    // 10. Bottom-Right: Tribeca Limestone & Granite Corner Building (Tier 3 - Foreground)
    x: 864, y: 410, w: 116, h: 118, radius: 2, isTopRow: false, sideDir: -1,
    tier: 2,
    archType: 'beaux-arts',
    name: 'TRIBECA HOUSE',
    facadeColor: '#262321',
    facadeDark: '#151312',
    trimColor: '#57524c',
    glassTint: '#13161a',
    windowWarmth: 0.74,
    windowCols: 5,
    hasWaterTower: true,
    hasSpire: false,
    hasFireEscape: false,
    seed: 1111
  }
];

// Pre-allocated runtime state for each NYC building
const CARD_COUNT = CARD_DEFINITIONS.length;
const cards = new Array(CARD_COUNT);
const drawOrder = new Int32Array(CARD_COUNT);

for (let i = 0; i < CARD_COUNT; i++) {
  drawOrder[i] = i;
  const def = CARD_DEFINITIONS[i];

  cards[i] = {
    idx: i,
    refCx: def.x + def.w * 0.5,
    refCy: def.y + def.h * 0.5,
    refW: def.w,
    refH: def.h,
    refRadius: def.radius,
    isTopRow: def.isTopRow,
    sideDir: def.sideDir,
    tier: def.tier,
    archType: def.archType,
    name: def.name,
    facadeColor: def.facadeColor,
    facadeDark: def.facadeDark,
    trimColor: def.trimColor,
    glassTint: def.glassTint,
    windowWarmth: def.windowWarmth,
    windowCols: def.windowCols,
    hasWaterTower: def.hasWaterTower,
    hasSpire: def.hasSpire,
    hasFireEscape: def.hasFireEscape,
    seed: def.seed,
    cx: 0,
    cy: 0,
    baseW: 0,
    baseH: 0,
    baseRadius: 0,
    fullH: 0,
    roofPadTop: 0,
    sideExtrudeW: 0,
    scale: IDLE_SCALE,
    targetScale: IDLE_SCALE,
    offsetX: 0,
    offsetY: 0,
    targetOffsetX: 0,
    targetOffsetY: 0,
    fieldStrength: 0,
    loadProgress: 1.0,
    cacheCanvas: null,
    cacheCtx: null,
    cacheW: 1,
    cacheH: 1,
    loaded: true
  };
}
