/** Rebuild the local Natural Earth land layer. No runtime network dependency. */
import fs from "node:fs";
const source = process.argv[2];
if (!source)
  throw new Error(
    "Usage: node scripts/prepare-midway-land.mjs <ne_110m_land.geojson>",
  );
const data = JSON.parse(fs.readFileSync(source, "utf8"));
const rings = data.features.flatMap((feature) =>
  feature.geometry.type === "Polygon"
    ? feature.geometry.coordinates
    : feature.geometry.coordinates.flat(),
);
function clip(points, axis, boundary, keepGreater) {
  const output = [];
  const inside = (point) =>
    keepGreater ? point[axis] >= boundary : point[axis] <= boundary;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const aIn = inside(a),
      bIn = inside(b);
    if (aIn) output.push(a);
    if (aIn !== bIn) {
      const t = (boundary - a[axis]) / (b[axis] - a[axis]);
      output.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  return output;
}
const output = [];
for (const ring of rings) {
  // Clip before wrapping: wrapping individual vertices introduces false cross-ocean edges.
  for (const shift of [0, 360]) {
    let points = ring.map(([lng, lat]) => [lng + shift, lat]);
    for (const [axis, boundary, greater] of [
      [0, 110, true],
      [0, 230, false],
      [1, 0, true],
      [1, 68, false],
    ]) {
      points = clip(points, axis, boundary, greater);
    }
    if (points.length >= 3)
      output.push(
        points.map((point) => point.map((value) => Number(value.toFixed(3)))),
      );
  }
}
fs.writeFileSync(
  new URL("../src/features/midway/land.json", import.meta.url),
  JSON.stringify(output) + "\n",
);
console.log(
  `Prepared ${output.length} land polygons; source: Natural Earth 1:110m, public domain.`,
);
