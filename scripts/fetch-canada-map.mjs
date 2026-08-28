import { mkdir, writeFile } from "node:fs/promises";

const source = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson";
const response = await fetch(source);
if (!response.ok) throw new Error(`Natural Earth request failed: ${response.status}`);
const world = await response.json();
const canada = world.features.find((feature) => [feature.properties?.ADM0_A3, feature.properties?.ISO_A3, feature.properties?.SOV_A3].includes("CAN"));
if (!canada) throw new Error("Canada geometry was not found in the Natural Earth dataset");

const collection = {
  type: "FeatureCollection",
  features: [canada],
  metadata: {
    title: "Admin 0 — Countries, 1:50m",
    publisher: "Natural Earth",
    source: "https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/",
    accessed: "2026-08-28",
    note: "Generalized cartographic background only; treaty polygons use a separate federal dataset.",
  },
};

await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await writeFile(new URL("../public/data/canada.geojson", import.meta.url), JSON.stringify(collection));
console.log("Saved Natural Earth Canada background geometry.");
