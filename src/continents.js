// Earth continent polygon data for GodBox world map
// Equirectangular projection: lon [-180, 180], lat [-90, 90]
// Simplified but recognizable outlines for land/ocean detection

/**
 * Normalize longitude to [-180, 180) range.
 * @param {number} lon
 * @returns {number}
 */
export function normalizeLon(lon) {
  let l = lon % 360;
  if (l >= 180) l -= 360;
  if (l < -180) l += 360;
  return l;
}

/**
 * Simplified continent polygons. Each entry has a name and a polygon
 * (array of [lon, lat] pairs tracing the outline clockwise).
 * Designed at 1/10M scale — enough vertices to be recognizable,
 * few enough for fast point-in-polygon testing.
 */
export const CONTINENTS = [
  // ── North America ──────────────────────────────────────────────
  {
    name: 'North America',
    polygon: [
      [-168, 66], [-162, 71], [-145, 70], [-130, 72], [-120, 74],
      [-95, 72], [-85, 68], [-80, 64], [-65, 60], [-58, 52],
      [-66, 44], [-70, 42], [-75, 38], [-80, 33], [-82, 25],
      [-88, 30], [-94, 30], [-97, 26], [-97, 20], [-87, 20],
      [-83, 15], [-80, 8], [-84, 10], [-87, 14], [-92, 15],
      [-97, 16], [-105, 20], [-110, 24], [-115, 28], [-118, 34],
      [-124, 42], [-125, 49], [-136, 58], [-150, 61], [-160, 63],
      [-168, 66],
    ],
  },

  // ── South America ──────────────────────────────────────────────
  {
    name: 'South America',
    polygon: [
      [-78, 10], [-77, 7], [-80, 5], [-78, 2], [-70, -2],
      [-50, -1], [-35, -4], [-35, -10], [-37, -14], [-39, -18],
      [-40, -22], [-48, -28], [-53, -33], [-58, -38], [-65, -42],
      [-67, -46], [-66, -50], [-68, -54], [-70, -56], [-74, -52],
      [-75, -46], [-75, -40], [-72, -35], [-71, -30], [-70, -18],
      [-75, -15], [-76, -10], [-80, -5], [-80, 0], [-78, 3],
      [-76, 6], [-78, 10],
    ],
  },

  // ── Europe (mainland) ──────────────────────────────────────────
  {
    name: 'Europe',
    polygon: [
      [-10, 36], [-9, 39], [-9, 43], [-2, 44], [3, 43],
      [5, 44], [8, 44], [12, 45], [14, 42], [16, 42],
      [20, 40], [25, 37], [28, 41], [30, 42], [28, 45],
      [32, 47], [30, 50], [24, 50], [18, 55], [20, 58],
      [24, 58], [28, 60], [30, 65], [26, 70], [20, 70],
      [18, 68], [14, 66], [10, 64], [5, 62], [5, 58],
      [8, 55], [12, 55], [12, 52], [8, 52], [4, 52],
      [2, 51], [-5, 50], [-8, 44], [-10, 36],
    ],
  },

  // ── Africa ─────────────────────────────────────────────────────
  {
    name: 'Africa',
    polygon: [
      [-17, 15], [-17, 21], [-16, 24], [-13, 28], [-10, 32],
      [-6, 35], [-2, 36], [3, 37], [10, 37], [12, 34],
      [25, 32], [33, 30], [36, 25], [43, 12], [50, 8],
      [50, 3], [42, -2], [40, -8], [36, -12], [35, -18],
      [33, -24], [30, -30], [28, -34], [22, -35], [18, -34],
      [15, -28], [12, -18], [12, -6], [9, 4], [6, 5],
      [2, 6], [-5, 5], [-8, 5], [-12, 6], [-15, 11],
      [-17, 15],
    ],
  },

  // ── Asia ───────────────────────────────────────────────────────
  {
    name: 'Asia',
    polygon: [
      [30, 42], [36, 37], [40, 37], [44, 40], [50, 38],
      [54, 26], [56, 24], [60, 25], [64, 25], [68, 24],
      [72, 20], [78, 8], [80, 12], [85, 22], [88, 22],
      [90, 26], [92, 20], [96, 16], [100, 14], [104, 10],
      [106, 16], [108, 20], [110, 20], [115, 22], [118, 24],
      [120, 30], [122, 32], [128, 36], [130, 42], [133, 44],
      [140, 48], [148, 52], [155, 56], [162, 60], [170, 62],
      [180, 66], [180, 72], [170, 70], [160, 64], [150, 58],
      [140, 52], [130, 48], [120, 54], [100, 52], [88, 50],
      [75, 54], [68, 56], [60, 60], [56, 62], [50, 62],
      [45, 65], [40, 68], [34, 70], [30, 68], [32, 62],
      [30, 56], [28, 50], [30, 47], [30, 42],
    ],
  },

  // ── Australia ──────────────────────────────────────────────────
  {
    name: 'Australia',
    polygon: [
      [114, -26], [114, -22], [118, -20], [130, -12], [136, -12],
      [138, -16], [142, -14], [146, -16], [148, -20], [153, -26],
      [150, -30], [150, -34], [148, -38], [142, -38], [138, -35],
      [136, -34], [132, -34], [128, -32], [124, -34], [118, -35],
      [115, -34], [114, -30], [114, -26],
    ],
  },

  // ── Antarctica ─────────────────────────────────────────────────
  {
    name: 'Antarctica',
    polygon: [
      [-180, -65], [-150, -70], [-120, -72], [-90, -70],
      [-60, -68], [-30, -70], [0, -70], [30, -68],
      [60, -66], [90, -68], [120, -67], [150, -70],
      [180, -65], [180, -90], [-180, -90], [-180, -65],
    ],
  },

  // ── Greenland ──────────────────────────────────────────────────
  {
    name: 'Greenland',
    polygon: [
      [-55, 60], [-48, 62], [-42, 64], [-36, 66], [-22, 70],
      [-20, 74], [-22, 78], [-30, 80], [-40, 82], [-50, 82],
      [-55, 80], [-58, 76], [-52, 72], [-55, 68], [-58, 64],
      [-55, 60],
    ],
  },

  // ── British Isles (Great Britain) ──────────────────────────────
  {
    name: 'British Isles',
    polygon: [
      [-5, 50], [-3, 50], [1, 51], [2, 53], [0, 54],
      [-1, 55], [-2, 57], [-3, 58], [-5, 58],
      [-6, 56], [-7, 55], [-5, 54], [-5, 52], [-5, 50],
    ],
  },

  // ── Ireland ────────────────────────────────────────────────────
  {
    name: 'Ireland',
    polygon: [
      [-10, 51.5], [-6, 51.5], [-6, 54], [-6, 55.5],
      [-8, 55.5], [-10, 54], [-10, 51.5],
    ],
  },

  // ── Iceland ────────────────────────────────────────────────────
  {
    name: 'Iceland',
    polygon: [
      [-24, 64], [-22, 65], [-18, 66], [-14, 66],
      [-13, 65], [-15, 64], [-18, 63], [-22, 63], [-24, 64],
    ],
  },

  // ── Japan ──────────────────────────────────────────────────────
  {
    name: 'Japan',
    polygon: [
      [130, 31], [131, 33], [132, 34], [135, 35], [138, 35],
      [140, 36], [140, 38], [140, 40], [141, 42], [142, 44],
      [145, 45], [145, 43], [143, 41], [141, 39], [141, 37],
      [140, 35], [138, 34], [135, 33], [132, 32], [130, 31],
    ],
  },

  // ── Madagascar ─────────────────────────────────────────────────
  {
    name: 'Madagascar',
    polygon: [
      [44, -13], [47, -14], [50, -16], [50, -20], [48, -24],
      [46, -26], [44, -24], [43, -20], [43, -16], [44, -13],
    ],
  },

  // ── New Zealand ────────────────────────────────────────────────
  {
    name: 'New Zealand',
    polygon: [
      [166, -35], [168, -37], [174, -40], [177, -42],
      [175, -44], [170, -46], [167, -46], [168, -44],
      [172, -42], [174, -40], [171, -38], [168, -36],
      [166, -35],
    ],
  },

  // ── Sri Lanka ──────────────────────────────────────────────────
  {
    name: 'Sri Lanka',
    polygon: [
      [80, 10], [80, 8], [81, 7], [82, 7],
      [82, 9], [81, 10], [80, 10],
    ],
  },

  // ── Sumatra / Western Indonesia ────────────────────────────────
  {
    name: 'Indonesia',
    polygon: [
      [95, 6], [98, 4], [102, 0], [104, -2], [106, -6],
      [108, -7], [112, -8], [114, -8], [116, -8],
      [120, -8], [122, -6], [118, -4], [116, -2],
      [112, 0], [108, 2], [104, 4], [100, 4], [95, 6],
    ],
  },

  // ── Borneo ─────────────────────────────────────────────────────
  {
    name: 'Borneo',
    polygon: [
      [109, 2], [112, 2], [115, 4], [118, 5], [119, 2],
      [117, 0], [116, -2], [116, -4], [113, -4],
      [110, -2], [109, 0], [109, 2],
    ],
  },

  // ── Philippines (simplified) ───────────────────────────────────
  {
    name: 'Philippines',
    polygon: [
      [118, 7], [120, 10], [122, 14], [122, 18],
      [121, 18], [120, 14], [119, 10], [117, 8],
      [118, 7],
    ],
  },

  // ── Papua New Guinea ──────────────────────────────────────────
  {
    name: 'Papua New Guinea',
    polygon: [
      [141, -2], [144, -4], [148, -6], [150, -6],
      [152, -5], [154, -6], [152, -8], [148, -8],
      [145, -7], [142, -4], [141, -2],
    ],
  },

  // ── Taiwan ─────────────────────────────────────────────────────
  {
    name: 'Taiwan',
    polygon: [
      [120, 22], [121, 24], [122, 25], [122, 24],
      [121, 22], [120, 22],
    ],
  },
];

// ─── Internal helpers ────────────────────────────────────────────

/**
 * Ray-casting point-in-polygon test.
 * @param {number} lon
 * @param {number} lat
 * @param {number[][]} poly - Array of [lon, lat] pairs (closed or open).
 * @returns {boolean}
 */
function pointInPolygon(lon, lat, poly) {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    if (((yi > lat) !== (yj > lat)) &&
        (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

// Pre-compute edge samples for coast-distance lookups.
// Each entry: { lon, lat } sampled uniformly along every polygon edge.
const COAST_SAMPLES = [];
const COAST_SAMPLE_STEP = 2; // degrees between samples on edges

for (const continent of CONTINENTS) {
  const poly = continent.polygon;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const x0 = poly[j][0], y0 = poly[j][1];
    const x1 = poly[i][0], y1 = poly[i][1];
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(1, Math.ceil(len / COAST_SAMPLE_STEP));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      COAST_SAMPLES.push({ lon: x0 + dx * t, lat: y0 + dy * t });
    }
  }
}

/**
 * Approximate squared angular distance between two lon/lat points.
 * Accounts for latitude compression of longitude.
 * @param {number} lon1
 * @param {number} lat1
 * @param {number} lon2
 * @param {number} lat2
 * @returns {number}
 */
function angularDistSq(lon1, lat1, lon2, lat2) {
  const dlat = lat2 - lat1;
  const dlon = lon2 - lon1;
  const cosLat = Math.cos((lat1 + lat2) * 0.5 * Math.PI / 180);
  const adjDlon = dlon * cosLat;
  return adjDlon * adjDlon + dlat * dlat;
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Returns true if the given point falls on land (inside any continent polygon).
 * @param {number} lon - Longitude in [-180, 180]
 * @param {number} lat - Latitude in [-90, 90]
 * @returns {boolean}
 */
export function isLand(lon, lat) {
  const nLon = normalizeLon(lon);
  for (const c of CONTINENTS) {
    if (pointInPolygon(nLon, lat, c.polygon)) return true;
  }
  return false;
}

/**
 * Returns the continent name at the given coordinates, or null if ocean.
 * @param {number} lon
 * @param {number} lat
 * @returns {string|null}
 */
export function getContinent(lon, lat) {
  const nLon = normalizeLon(lon);
  for (const c of CONTINENTS) {
    if (pointInPolygon(nLon, lat, c.polygon)) return c.name;
  }
  return null;
}

/**
 * Approximate angular distance to the nearest coastline.
 * Uses pre-sampled points along polygon edges.
 * Result is in degrees (1° ≈ 111 km at equator).
 * @param {number} lon
 * @param {number} lat
 * @returns {number} Distance in degrees
 */
export function getDistanceToCoast(lon, lat) {
  const nLon = normalizeLon(lon);
  let minDistSq = Infinity;
  for (let i = 0; i < COAST_SAMPLES.length; i++) {
    const p = COAST_SAMPLES[i];
    const d = angularDistSq(nLon, lat, p.lon, p.lat);
    if (d < minDistSq) minDistSq = d;
  }
  return Math.sqrt(minDistSq);
}
