import { mkdir, writeFile } from "node:fs/promises";

const endpoint = "https://geo.sac-isc.gc.ca/geomatics/rest/services/Donnees_Ouvertes-Open_Data/Historic_Treaty_E/MapServer/0/query";
const params = new URLSearchParams({
  where: "1=1",
  outFields: "ENAME",
  returnGeometry: "true",
  outSR: "4326",
  geometryPrecision: "2",
  f: "geojson",
});

const response = await fetch(`${endpoint}?${params}`);
if (!response.ok) throw new Error(`Historic treaty GIS request failed: ${response.status}`);
const collection = await response.json();
if (collection.type !== "FeatureCollection" || !collection.features?.length) {
  throw new Error("Historic treaty GIS response did not contain features");
}

const sqDistanceToSegment = (point, start, end) => {
  let x = start[0];
  let y = start[1];
  let dx = end[0] - x;
  let dy = end[1] - y;
  if (dx || dy) {
    const t = ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) { x = end[0]; y = end[1]; }
    else if (t > 0) { x += dx * t; y += dy * t; }
  }
  dx = point[0] - x;
  dy = point[1] - y;
  return dx * dx + dy * dy;
};

const simplifyOpen = (points, toleranceSquared) => {
  if (points.length <= 2) return points;
  let farthest = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = sqDistanceToSegment(points[i], points[0], points.at(-1));
    if (distance > farthest) { farthest = distance; index = i; }
  }
  if (farthest <= toleranceSquared) return [points[0], points.at(-1)];
  return [...simplifyOpen(points.slice(0, index + 1), toleranceSquared).slice(0, -1), ...simplifyOpen(points.slice(index), toleranceSquared)];
};

const simplifyRing = (ring) => {
  if (ring.length < 8) return ring;
  const simplified = simplifyOpen(ring.slice(0, -1), 0.04 ** 2);
  if (simplified.length < 3) return ring;
  return [...simplified, simplified[0]];
};

for (const feature of collection.features) {
  if (feature.geometry.type === "Polygon") feature.geometry.coordinates = feature.geometry.coordinates.map(simplifyRing);
  if (feature.geometry.type === "MultiPolygon") feature.geometry.coordinates = feature.geometry.coordinates.map((polygon) => polygon.map(simplifyRing));
}

collection.metadata = {
  title: "Historic treaties",
  publisher: "Crown-Indigenous Relations and Northern Affairs Canada",
  source: "https://open.canada.ca/data/en/dataset/f281b150-0645-48e4-9c30-01f55f93f78e",
  service: endpoint.replace(/\/query$/, ""),
  accessed: "2026-08-28",
  note: "Coordinates rounded to two decimals and linework generalized to 0.04 degrees for web display. Boundaries are usually not surveyed and are not legal descriptions.",
};

await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await writeFile(new URL("../public/data/historic-treaties.geojson", import.meta.url), JSON.stringify(collection));
console.log(`Saved ${collection.features.length} official treaty-area features.`);
