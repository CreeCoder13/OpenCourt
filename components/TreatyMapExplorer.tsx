"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cases } from "../data/cases";
import type { Treaty } from "../data/types";

type Position = [number, number];
type Geometry = { type: "Polygon"; coordinates: Position[][] } | { type: "MultiPolygon"; coordinates: Position[][][] };
type TreatyFeature = { type: "Feature"; properties: { ENAME: string }; geometry: Geometry };
type TreatyCollection = { type: "FeatureCollection"; features: TreatyFeature[]; metadata?: { source: string; publisher: string; accessed: string; note: string } };
type ViewBox = { x: number; y: number; width: number; height: number };

const INITIAL_VIEW: ViewBox = { x: 30, y: 22, width: 920, height: 515.2 };
const featureSlug: Record<string, string> = {
  "Douglas Treaties": "douglas-treaties",
  "Peace and Friendship Treaties": "peace-and-friendship-treaties",
  "Robinson-Huron Treaty": "robinson-huron",
  "Robinson-Superior Treaty": "robinson-superior",
  "Southern Ontario Treaties": "upper-canada-treaties",
  "Williams Treaties": "williams-treaties",
  ...Object.fromEntries(Array.from({ length: 11 }, (_, index) => [`Treaty ${index + 1}`, `treaty-${index + 1}`])),
};
const colours = ["#d5a33f", "#9f5267", "#6b8c7f", "#c7784e", "#7585a8", "#b06f93", "#7f9961", "#d19a6a", "#77546f", "#4f8b91", "#b3a64c", "#7c6ba3", "#a65e4d", "#5b9275", "#c08d37", "#856f5f", "#ab5872"];

const places = [
  { name: "Saskatoon, Saskatchewan", latitude: 52.1332, longitude: -106.67 },
  { name: "Regina, Saskatchewan", latitude: 50.4452, longitude: -104.6189 },
  { name: "Edmonton, Alberta", latitude: 53.5461, longitude: -113.4938 },
  { name: "Calgary, Alberta", latitude: 51.0447, longitude: -114.0719 },
  { name: "Winnipeg, Manitoba", latitude: 49.8954, longitude: -97.1385 },
  { name: "Thunder Bay, Ontario", latitude: 48.3809, longitude: -89.2477 },
  { name: "Greater Sudbury, Ontario", latitude: 46.4917, longitude: -80.993 },
  { name: "Toronto, Ontario", latitude: 43.6532, longitude: -79.3832 },
  { name: "Victoria, British Columbia", latitude: 48.4284, longitude: -123.3656 },
  { name: "Halifax, Nova Scotia", latitude: 44.6488, longitude: -63.5752 },
  { name: "Yellowknife, Northwest Territories", latitude: 62.454, longitude: -114.3718 },
];

const cleanName = (name: string) => name.replace(/\s+\([^)]*\)$/, "");
type Projector = (position: Position) => Position;
const linearProject: Projector = ([longitude, latitude]) => [((longitude + 142) / 92) * 1000, ((84 - latitude) / 44) * 560];
const lambertRaw: Projector = ([longitude, latitude]) => {
  const radians = Math.PI / 180; const phi = latitude * radians; const lambda = longitude * radians;
  const phi1 = 49 * radians; const phi2 = 77 * radians; const lambda0 = -91.8666666667 * radians;
  const n = Math.log(Math.cos(phi1) / Math.cos(phi2)) / Math.log(Math.tan(Math.PI / 4 + phi2 / 2) / Math.tan(Math.PI / 4 + phi1 / 2));
  const factor = (Math.cos(phi1) * Math.pow(Math.tan(Math.PI / 4 + phi1 / 2), n)) / n;
  const rho = factor / Math.pow(Math.tan(Math.PI / 4 + phi / 2), n);
  return [rho * Math.sin(n * (lambda - lambda0)), rho * Math.cos(n * (lambda - lambda0))];
};
const geometryPoints = (geometry: Geometry) => geometry.type === "Polygon" ? geometry.coordinates.flat() : geometry.coordinates.flat(2);
const createCanadaProjection = (background: TreatyCollection | null): Projector => {
  const points = background?.features.flatMap((feature) => geometryPoints(feature.geometry)) || [];
  if (!points.length) return linearProject;
  const raw = points.map(lambertRaw); const xs = raw.map(([x]) => x); const ys = raw.map(([, y]) => y);
  const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const scale = Math.min(920 / (maxX - minX), 510 / (maxY - minY));
  const offsetX = (1000 - (maxX - minX) * scale) / 2; const offsetY = (560 - (maxY - minY) * scale) / 2;
  return (position) => { const [x, y] = lambertRaw(position); return [offsetX + (x - minX) * scale, offsetY + (y - minY) * scale]; };
};
const ringPath = (ring: Position[], projector: Projector) => ring.map((point, index) => `${index ? "L" : "M"}${projector(point).map((value) => value.toFixed(1)).join(" ")}`).join(" ") + "Z";
const geometryPath = (geometry: Geometry, projector: Projector) => geometry.type === "Polygon"
  ? geometry.coordinates.map((ring) => ringPath(ring, projector)).join(" ")
  : geometry.coordinates.flatMap((polygon) => polygon.map((ring) => ringPath(ring, projector))).join(" ");

const pointInRing = (point: Position, ring: Position[]) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i]; const [xj, yj] = ring[j];
    if ((yi > point[1]) !== (yj > point[1]) && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const pointInPolygon = (point: Position, polygon: Position[][]) => pointInRing(point, polygon[0]) && !polygon.slice(1).some((hole) => pointInRing(point, hole));
const pointInGeometry = (point: Position, geometry: Geometry) => geometry.type === "Polygon" ? pointInPolygon(point, geometry.coordinates) : geometry.coordinates.some((polygon) => pointInPolygon(point, polygon));
const pointInProjectedGeometry = (point: Position, geometry: Geometry, projector: Projector) => geometry.type === "Polygon"
  ? pointInPolygon(point, geometry.coordinates.map((ring) => ring.map(projector)))
  : geometry.coordinates.some((polygon) => pointInPolygon(point, polygon.map((ring) => ring.map(projector))));

const geometryBounds = (geometry: Geometry, projector: Projector) => {
  const projected = geometryPoints(geometry).map(projector);
  const xs = projected.map(([x]) => x); const ys = projected.map(([, y]) => y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
};

const displayDate = (value?: string) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || "See source record";
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
};

export function TreatyMapExplorer({ records }: { records: Treaty[] }) {
  const [collection, setCollection] = useState<TreatyCollection | null>(null);
  const [canada, setCanada] = useState<TreatyCollection | null>(null);
  const [selectedName, setSelectedName] = useState("Treaty 6");
  const [hoveredName, setHoveredName] = useState("");
  const [query, setQuery] = useState("");
  const [province, setProvince] = useState("");
  const [type, setType] = useState("");
  const [year, setYear] = useState("");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [viewBox, setViewBox] = useState(INITIAL_VIEW);
  const [overlaps, setOverlaps] = useState<string[]>([]);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResult, setLocationResult] = useState<{ place: string; names: string[] } | null>(null);
  const drag = useRef<{ x: number; y: number; view: ViewBox } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/data/historic-treaties.geojson").then((response) => response.json() as Promise<TreatyCollection>),
      fetch("/data/canada.geojson").then((response) => response.json() as Promise<TreatyCollection>),
    ]).then(([treatiesData, canadaData]) => { setCollection(treatiesData); setCanada(canadaData); }).catch(() => { setCollection(null); setCanada(null); });
  }, []);

  const recordFor = useCallback((name: string) => records.find((record) => record.slug === featureSlug[cleanName(name)]), [records]);
  const projector = useMemo(() => createCanadaProjection(canada), [canada]);
  const filteredFeatures = useMemo(() => (collection?.features || []).filter((feature) => {
    const name = cleanName(feature.properties.ENAME); const record = recordFor(name); const q = query.trim().toLowerCase();
    return !hidden.has(name) && (!q || [name, record?.description, record?.placeSigned, ...(record?.indigenousParties.map((party) => party.name) || [])].join(" ").toLowerCase().includes(q))
      && (!province || record?.provincesTerritories.includes(province))
      && (!type || record?.treatyType === type)
      && (!year || String(record?.year) === year);
  }), [collection, hidden, province, query, recordFor, type, year]);

  const selected = recordFor(selectedName);
  const connectedCases = selected ? selected.caseSlugs.map((slug) => cases.find((entry) => entry.slug === slug)).filter((entry) => entry !== undefined) : [];
  const mappedNames = (collection?.features || []).map((feature) => cleanName(feature.properties.ENAME));

  const focusFeature = (name: string) => {
    const feature = collection?.features.find((item) => cleanName(item.properties.ENAME) === name);
    setSelectedName(name); setOverlaps([]);
    if (!feature) return;
    const bounds = geometryBounds(feature.geometry, projector); const padding = 45;
    const width = Math.max(130, bounds.maxX - bounds.minX + padding * 2); const height = Math.max(100, bounds.maxY - bounds.minY + padding * 2);
    const scale = Math.max(width / 1000, height / 560);
    const nextWidth = Math.min(1000, 1000 * scale); const nextHeight = Math.min(560, 560 * scale);
    setViewBox({ x: (bounds.minX + bounds.maxX - nextWidth) / 2, y: (bounds.minY + bounds.maxY - nextHeight) / 2, width: nextWidth, height: nextHeight });
  };

  const zoom = (factor: number) => setViewBox((current) => {
    const width = Math.max(110, Math.min(1000, current.width * factor)); const height = width * 0.56;
    return { x: current.x + (current.width - width) / 2, y: current.y + (current.height - height) / 2, width, height };
  });

  const handleMapClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const point: Position = [viewBox.x + ((event.clientX - rect.left) / rect.width) * viewBox.width, viewBox.y + ((event.clientY - rect.top) / rect.height) * viewBox.height];
    const matches = filteredFeatures.filter((feature) => pointInProjectedGeometry(point, feature.geometry, projector)).map((feature) => cleanName(feature.properties.ENAME));
    if (!matches.length) return;
    const next = matches.length > 1 && matches.includes(selectedName) ? matches[(matches.indexOf(selectedName) + 1) % matches.length] : matches.at(-1)!;
    setSelectedName(next); setOverlaps(matches);
  };

  const searchLocation = (event: React.FormEvent) => {
    event.preventDefault(); const q = locationQuery.trim().toLowerCase();
    const place = places.find((item) => item.name.toLowerCase().includes(q) || q.includes(item.name.split(",")[0].toLowerCase()));
    if (place && collection) {
      const names = collection.features.filter((feature) => pointInGeometry([place.longitude, place.latitude], feature.geometry)).map((feature) => cleanName(feature.properties.ENAME));
      setLocationResult({ place: place.name, names }); if (names[0]) focusFeature(names[0]); return;
    }
    const provinceMatches = records.filter((record) => record.provincesTerritories.some((value) => value.toLowerCase() === q)).flatMap((record) => mappedNames.filter((name) => featureSlug[name] === record.slug));
    setLocationResult({ place: locationQuery.trim(), names: [...new Set(provinceMatches)] });
  };

  return <section className="treaty-map-explorer" id="interactive-map">
    <header className="treaty-map-heading"><div><p className="kicker">Interactive treaty map</p><h2>Explore where historic treaties apply</h2></div><p>Select an area to connect sourced geography with the treaty text, parties, promises and legal cases. Overlapping polygons remain independently selectable.</p></header>
    <div className="treaty-map-filters">
      <label className="treaty-map-search"><span>Search treaty</span><input list="mapped-treaties" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Treaty 6, Robinson-Huron…" /><datalist id="mapped-treaties">{mappedNames.map((name) => <option key={name}>{name}</option>)}</datalist></label>
      <label><span>Year</span><select value={year} onChange={(event) => setYear(event.target.value)}><option value="">All years</option>{[...new Set(records.filter((record) => mappedNames.some((name) => featureSlug[name] === record.slug)).map((record) => record.year))].sort().map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><span>Province / territory</span><select value={province} onChange={(event) => setProvince(event.target.value)}><option value="">All regions</option>{[...new Set(records.flatMap((record) => record.provincesTerritories))].sort().map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><span>Treaty type</span><select value={type} onChange={(event) => setType(event.target.value)}><option value="">All types</option>{[...new Set(records.map((record) => record.treatyType))].map((value) => <option key={value}>{value}</option>)}</select></label>
      <button type="button" onClick={() => { setQuery(""); setProvince(""); setType(""); setYear(""); setHidden(new Set()); }}>Reset</button>
    </div>
    <div className="treaty-map-layout">
      <div className="treaty-map-stage">
        <div className="treaty-map-toolbar"><span>{hoveredName || `${filteredFeatures.length} treaty areas · Scroll to zoom`}</span><div><button type="button" onClick={() => zoom(.75)} aria-label="Zoom in">+</button><button type="button" onClick={() => zoom(1.35)} aria-label="Zoom out">−</button><button type="button" onClick={() => setViewBox(INITIAL_VIEW)}>Canada</button></div></div>
        {collection ? <svg ref={svgRef} viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`} onClick={handleMapClick} onWheel={(event) => { event.preventDefault(); zoom(event.deltaY > 0 ? 1.18 : .84); }} onPointerDown={(event) => { if (event.pointerType !== "mouse") return; drag.current = { x: event.clientX, y: event.clientY, view: viewBox }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (!drag.current) return; const rect = event.currentTarget.getBoundingClientRect(); const dx = ((event.clientX - drag.current.x) / rect.width) * drag.current.view.width; const dy = ((event.clientY - drag.current.y) / rect.height) * drag.current.view.height; setViewBox({ ...drag.current.view, x: drag.current.view.x - dx, y: drag.current.view.y - dy }); }} onPointerUp={() => { drag.current = null; }} role="img" aria-label="Interactive map of historic treaty areas over an outline map of Canada">
          <defs><linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d8e5e4" /><stop offset="1" stopColor="#edf1ea" /></linearGradient><filter id="land-shadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#31504b" floodOpacity=".18" /></filter></defs>
          <rect width="1000" height="560" fill="url(#water)" />
          {canada?.features.map((feature, index) => <path className="canada-background" key={`canada-${index}`} d={geometryPath(feature.geometry, projector)} fillRule="evenodd" filter="url(#land-shadow)" />)}
          <g className="map-graticule">{[100, 250, 400, 550, 700, 850].map((x) => <line key={`x${x}`} x1={x} x2={x} y1="0" y2="560" />)}{[100, 220, 340, 460].map((y) => <line key={`y${y}`} x1="0" x2="1000" y1={y} y2={y} />)}</g>
          <g className="map-labels" aria-hidden="true"><text x={projector([-102, 69])[0]} y={projector([-102, 69])[1]}>CANADA</text><text x={projector([-136, 50])[0]} y={projector([-136, 50])[1]}>PACIFIC</text><text x={projector([-53, 49])[0]} y={projector([-53, 49])[1]}>ATLANTIC</text><text x={projector([-95, 81])[0]} y={projector([-95, 81])[1]}>ARCTIC</text></g>
          {filteredFeatures.map((feature) => { const name = cleanName(feature.properties.ENAME); const index = mappedNames.indexOf(name); return <path key={feature.properties.ENAME} d={geometryPath(feature.geometry, projector)} fill={colours[index % colours.length]} className={`treaty-area${name === selectedName ? " selected" : ""}`} fillRule="evenodd" onMouseEnter={() => setHoveredName(name)} onMouseLeave={() => setHoveredName("")}><title>{name}</title></path>; })}
        </svg> : <div className="treaty-map-loading">Loading verified treaty boundaries…</div>}
        {overlaps.length > 1 && <div className="overlap-picker"><span>{overlaps.length} treaty areas at this point</span>{overlaps.map((name) => <button type="button" className={name === selectedName ? "active" : ""} onClick={() => setSelectedName(name)} key={name}>{name}</button>)}</div>}
        <p className="map-data-credit">Boundary source: Crown-Indigenous Relations and Northern Affairs Canada · Historic Treaties open data · generalized for display · accessed August 28, 2026</p>
      </div>
      <aside className="treaty-map-panel" aria-live="polite">
        {selected ? <><div className="map-panel-title"><span>{selected.treatyType}</span><h3>{selectedName}</h3><p>{selected.description}</p></div>
          <dl><div><dt>Date signed</dt><dd>{displayDate(selected.dateSigned)}</dd></div><div><dt>Location signed</dt><dd>{selected.placeSigned || "Multiple locations"}</dd></div><div><dt>Modern geographic area</dt><dd>{selected.territory.description}</dd></div>{selected.adhesions.length > 0 && <div><dt>Later adhesions</dt><dd>{selected.adhesions.map((item) => item.date || "See treaty record").join(", ")}</dd></div>}</dl>
          <div className="map-panel-section"><h4>Indigenous Nations</h4>{selected.indigenousParties.slice(0, 5).map((party) => <p key={party.name}>{party.communitySlug ? <Link href={`/communities/${party.communitySlug}`}>{party.name} →</Link> : party.name}<small>{party.role || "Treaty party"}</small></p>)}<em>Parties’ understandings are not presumed to be identical.</em></div>
          <div className="map-panel-section"><h4>Crown representatives</h4>{selected.crownRepresentatives?.length ? selected.crownRepresentatives.map((person) => <p key={person.name}>{person.name}<small>{person.role}</small></p>) : selected.crownParties.map((party) => <p key={party}>{party}<small>Historical Crown / government party</small></p>)}</div>
          <div className="map-panel-actions"><Link href={`/treaties/${selected.slug}`}>View full treaty record</Link><a href={selected.originalDocumentURL || selected.sources[0]?.url} target="_blank" rel="noreferrer">Read the treaty ↗</a>{connectedCases[0] && <Link href={`/cases/${connectedCases[0].slug}`}>Important court case</Link>}</div></> : <div className="map-panel-empty"><h3>Select a treaty territory</h3><p>Click a coloured area, use the treaty search, or choose an item in the timeline.</p></div>}
      </aside>
    </div>
    <details className="treaty-layer-control"><summary>Map layers <span>{mappedNames.length - hidden.size} of {mappedNames.length} on</span></summary><div>{mappedNames.map((name) => <label key={name}><input type="checkbox" checked={!hidden.has(name)} onChange={() => setHidden((current) => { const next = new Set(current); if (next.has(name)) next.delete(name); else next.add(name); return next; })} /><i style={{ background: colours[mappedNames.indexOf(name) % colours.length] }} />{name}</label>)}</div></details>
    <div className="treaty-location-search"><div><p className="kicker">Location lookup</p><h3>What Treaty Territory Am I In?</h3><p>Search a supported city or a province/territory. Results use the same generalized federal polygons and may show more than one treaty.</p></div><form onSubmit={searchLocation}><label><span>City, town, First Nation or province</span><input list="treaty-places" value={locationQuery} onChange={(event) => setLocationQuery(event.target.value)} placeholder="Try Saskatoon" /><datalist id="treaty-places">{places.map((place) => <option key={place.name}>{place.name}</option>)}</datalist></label><button>Find territory</button>{locationResult && <div className="location-result"><small>Map result for {locationResult.place}</small>{locationResult.names.length ? locationResult.names.map((name) => <button type="button" onClick={() => focusFeature(name)} key={name}>{name}<span>Explore →</span></button>) : <p>No supported mapped result. Try a listed city or a province name; postal-code geocoding is not available in this version.</p>}</div>}</form></div>
    <div className="treaty-map-notice"><b>Historical accuracy notice</b><p>Treaty boundaries shown on this map are based on available historical and geographic sources. Treaty relationships, Indigenous traditional territories, and Indigenous understandings of treaties may not perfectly correspond with modern mapped boundaries.</p></div>
    <div className="treaty-map-timeline"><header><div><p className="kicker">1725–1923</p><h3>Treaty timeline</h3></div><p>Choose an agreement to move the map to its sourced territory.</p></header><div>{[...mappedNames].sort((a, b) => (recordFor(a)?.year || 0) - (recordFor(b)?.year || 0)).map((name) => <button key={name} type="button" onClick={() => focusFeature(name)} className={name === selectedName ? "active" : ""}><time>{recordFor(name)?.year || "—"}</time><span>{name}</span></button>)}</div></div>
  </section>;
}
