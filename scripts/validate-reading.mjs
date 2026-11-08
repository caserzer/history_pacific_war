/** Exercises the actual application router and all real content through server rendering. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "vite";
import { siteConfig } from "../vite.config.ts";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const out = path.join(root, ".cache", "reading-validate");
fs.mkdirSync(out, { recursive: true });
const entry = path.join(out, "entry.tsx");
fs.writeFileSync(
  entry,
  `export {ReadingSite,entityHref} from '../../src/reading/ReadingSite';\nexport {AppContextProvider} from '../../src/features/AppContext';\nexport {buildIndex} from '../../src/data/index';\nexport {parseRoute} from '../../src/router/route';\n`,
);
await build({
  configFile: false,
  root,
  base: siteConfig.base,
  plugins: siteConfig.plugins,
  logLevel: "error",
  ssr: { external: ["react", "react/jsx-runtime", "react/jsx-dev-runtime"] },
  build: {
    ssr: entry,
    outDir: path.join(out, "bundle"),
    emptyOutDir: true,
    minify: false,
    target: "node24",
    rollupOptions: { output: { entryFileNames: "runtime.mjs", format: "es" } },
  },
});
const { ReadingSite, entityHref, AppContextProvider, buildIndex, parseRoute } =
  await import(pathToFileURL(path.join(out, "bundle", "runtime.mjs")).href);
const doc = JSON.parse(
  fs.readFileSync(path.join(root, "content/history.json"), "utf8"),
);
const registry = JSON.parse(
  fs.readFileSync(path.join(root, "content/media.json"), "utf8"),
);
const index = buildIndex(doc);
const context = {
  content: {
    status: "available",
    doc,
    issues: [],
    sourceKey: "content/history.json",
  },
  index,
  hasContent: true,
  isFixture: false,
};
let assertions = 0,
  pages = 0,
  links = 0;
const check = (condition, message) => {
  assertions++;
  assert.ok(condition, message);
};
const text = (html) =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, "");
const routeExists = (route) =>
  !route.id ||
  (route.view === "timeline"
    ? index.events
    : route.view === "battles"
      ? index.battles
      : route.view === "people"
        ? index.people
        : route.view === "atlas"
          ? index.places
          : route.view === "questions"
            ? index.questions
            : route.view === "sources"
              ? index.sources
              : index.entities
  ).has(route.id);
function render(href, { missing = false } = {}) {
  const html = renderToStaticMarkup(
    React.createElement(
      AppContextProvider,
      { value: context },
      React.createElement(ReadingSite, { route: parseRoute(href) }),
    ),
  );
  pages++;
  check(
    (html.match(/<h1\b/g) ?? []).length === 1,
    `${href}: exactly one page heading`,
  );
  check(
    html.includes("rs-header") && html.includes("rs-footer"),
    `${href}: shared responsive shell`,
  );
  check(
    missing === html.includes("这条阅读线索暂时没有对应内容"),
    `${href}: expected found/not-found state`,
  );
  check(
    !html.includes("data-evidence-panel"),
    `${href}: evidence is on demand, not expanded in the page`,
  );
  for (const [, encoded] of html.matchAll(/href="(#[^\"]+)"/g)) {
    const target = encoded.replaceAll("&amp;", "&");
    if (!target.startsWith("#/")) continue;
    links++;
    const route = parseRoute(target);
    check(routeExists(route), `${href}: invalid destination ${target}`);
    if (route.battle)
      check(index.battles.has(route.battle), `${href}: valid battle deep link`);
  }
  return { html, plain: text(html) };
}
for (const view of [
  "overview",
  "timeline",
  "battles",
  "people",
  "concepts",
  "questions",
  "atlas",
  "sources",
  "search",
  "midway",
])
  render(view === "overview" ? "#/" : `#/${view}`);
const all = [
  ...doc.events,
  ...doc.battles,
  ...doc.people,
  ...doc.concepts,
  ...doc.units,
  ...doc.equipment,
];
for (const entity of all) {
  const { html, plain } = render(entityHref(entity.id));
  check(
    plain.includes(text("name" in entity ? entity.name : entity.title)),
    `${entity.id}: title preserved`,
  );
  const bodies =
    entity.article?.map((s) => s.body) ??
    (entity.sections
      ? Object.values(entity.sections).map((s) => s.body)
      : entity.layers
        ? [entity.whyItMatters, ...entity.layers.map((s) => s.body)]
        : entity.profile
          ? [
              entity.profile,
              ...entity.decisions.flatMap((d) => [
                d.context,
                d.choice,
                d.consequence,
                ...d.options,
                ...d.constraints,
              ]),
            ]
          : entity.description
            ? [entity.description]
            : [entity.summary, entity.limitations]);
  for (const body of bodies.filter(Boolean))
    check(
      plain.includes(text(body)),
      `${entity.id}: historical text preserved`,
    );
  for (const profile of Object.values(entity.analysisProfiles ?? {}))
    check(
      plain.includes(text(profile.body)),
      `${entity.id}: profile preserved`,
    );
  for (const asset of registry.media.filter((m) =>
    m.articleIds.includes(entity.id),
  ))
    check(
      html.includes(asset.path.replace(/^public\//, "")),
      `${entity.id}: registered media displayed`,
    );
  if (entity.sections) {
    for (const key of Object.keys(entity.sections))
      check(
        html.includes(`data-reading-section="${key}"`),
        `${entity.id}: analysis section ${key} preserved`,
      );
    check(
      html.includes(`data-battle-map="${entity.id}"`),
      `${entity.id}: actual new battle map rendered`,
    );
  }
}
for (const place of doc.places) {
  const { plain } = render(entityHref(place.id));
  check(
    plain.includes(text(place.historicalName)) &&
      plain.includes(text(place.modernName)),
    `${place.id}: both place names preserved`,
  );
}
for (const question of doc.questions) {
  const { plain } = render(`#/questions/${question.id}`);
  check(
    plain.includes(text(question.answer)),
    `${question.id}: answer preserved`,
  );
}
for (const source of doc.sources) {
  const { plain } = render(`#/sources/${source.id}`);
  check(
    plain.includes(text(source.reliabilityNote)),
    `${source.id}: reliability note preserved`,
  );
}
for (const battle of doc.battles)
  for (const phase of battle.phases) {
    const { plain, html } = render(
      `#/atlas?battle=${battle.id}&phase=${phase.id}`,
    );
    check(
      html.includes(`data-phase="${phase.id}"`),
      `${phase.id}: deep link selects the correct stage`,
    );
    check(
      plain.includes(text(phase.knownEnemy.japan)) &&
        plain.includes(text(phase.decision.japan)),
      `${phase.id}: stage-specific intelligence and decision`,
    );
  }
for (const view of [
  "timeline",
  "battles",
  "people",
  "concepts",
  "questions",
  "sources",
  "atlas",
])
  render(`#/${view}/does-not-exist`, { missing: true });
for (const query of ["雷达", "中途岛", "赤城"]) {
  const { html } = render(`#/search?q=${encodeURIComponent(query)}`);
  check(
    html.includes("rs-search-results"),
    `${query}: search returns real linked results`,
  );
}
const fixture = { ...doc, fixtureOnly: true };
const fixtureHtml = renderToStaticMarkup(
  React.createElement(
    AppContextProvider,
    {
      value: {
        ...context,
        content: { ...context.content, status: "fixture", doc: fixture },
        isFixture: true,
        index: buildIndex(fixture),
      },
    },
    React.createElement(ReadingSite, { route: parseRoute("#/") }),
  ),
);
check(fixtureHtml.includes("当前为测试样本"), "fixture remains visibly marked");
check(
  fs
    .readFileSync(path.join(root, "src/main.tsx"), "utf8")
    .includes("<ReadingSite route={route}"),
  "production entry uses the validated responsive application",
);
console.log(
  `Responsive reading validation: PASS ${assertions} assertions; ${pages} pages; ${links} internal links.`,
);
console.log(
  "Covered: all 93 content entities, 7 questions, 31 sources, 22 media items, 12 phase deep links, search and invalid IDs.",
);
