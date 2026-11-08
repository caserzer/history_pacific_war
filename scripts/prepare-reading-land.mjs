/** Rebuild the local Natural Earth land layer. No runtime network dependency. */
import fs from "node:fs";
const source = process.argv[2];
if (!source)
  throw new Error(
    "Usage: node scripts/prepare-reading-land.mjs <ne_50m_land.geojson>",
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
function simplify(points, tolerance = 0.035) {
  if (points.length < 8) return points;
  const keep = new Set([0, points.length - 1]);
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop();
    const a = points[start],
      b = points[end];
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      length = dx * dx + dy * dy;
    let farthest = tolerance * tolerance,
      selected = -1;
    for (let i = start + 1; i < end; i++) {
      const p = points[i];
      const t = length
        ? Math.max(
            0,
            Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length),
          )
        : 0;
      const distance =
        (p[0] - a[0] - t * dx) ** 2 + (p[1] - a[1] - t * dy) ** 2;
      if (distance > farthest) {
        farthest = distance;
        selected = i;
      }
    }
    if (selected >= 0) {
      keep.add(selected);
      stack.push([start, selected], [selected, end]);
    }
  }
  const result = [...keep].sort((a, b) => a - b).map((i) => points[i]);
  return result.length >= 4 ? result : points;
}
for (const ring of rings) {
  // Clip before wrapping: wrapping individual vertices introduces false cross-ocean edges.
  for (const shift of [0, 360]) {
    let points = ring.map(([lng, lat]) => [lng + shift, lat]);
    for (const [axis, boundary, greater] of [
      [0, 60, true],
      [0, 300, false],
      [1, -55, true],
      [1, 75, false],
    ]) {
      points = clip(points, axis, boundary, greater);
    }
    if (points.length >= 3)
      output.push(
        simplify(points).map((point) =>
          point.map((value) => Number(value.toFixed(3))),
        ),
      );
  }
}
fs.writeFileSync(
  new URL("../src/reading/land.json", import.meta.url),
  JSON.stringify(output) + "\n",
);
console.log(
  `Prepared ${output.length} land polygons; source: Natural Earth 1:50m, public domain.`,
);
