/** Extract local modern coastlines for small-island campaign views. */
import fs from "node:fs";
const input = process.argv[2];
if (!input)
  throw new Error(
    "Usage: node scripts/prepare-late-war-land.mjs <ne_10m_land.geojson>",
  );
const source = JSON.parse(fs.readFileSync(input, "utf8"));
const areas = {
  "battle-guadalcanal": [158, -10.5, 162, -8],
  "battle-iwo-jima": [141, 24.5, 141.6, 25],
  "battle-okinawa": [127, 25.8, 128.6, 27.2],
};
const rings = source.features.flatMap(({ geometry }) =>
  geometry.type === "MultiPolygon"
    ? geometry.coordinates.map((p) => p[0])
    : [geometry.coordinates[0]],
);
const result = Object.fromEntries(
  Object.entries(areas).map(([id, [west, south, east, north]]) => {
    const selected = rings
      .filter((ring) =>
        ring.some(
          ([lng, lat]) =>
            lng >= west && lng <= east && lat >= south && lat <= north,
        ),
      )
      .map((ring) =>
        ring.map(([lng, lat]) => [
          Number(lng.toFixed(5)),
          Number(lat.toFixed(5)),
        ]),
      );
    if (!selected.length) throw new Error(`No coastline found for ${id}`);
    return [id, selected];
  }),
);
fs.writeFileSync(
  new URL("../src/reading/local-land.json", import.meta.url),
  JSON.stringify(result) + "\n",
);
console.log(
  Object.fromEntries(
    Object.entries(result).map(([key, value]) => [key, value.length]),
  ),
);
