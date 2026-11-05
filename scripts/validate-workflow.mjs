#!/usr/bin/env node
/**
 * CI 工作流字段级校验器 —— CI-BOOT-01
 *
 * 用途：
 *   node scripts/validate-workflow.mjs              # 校验真实 .github/workflows/ci.yml（字段级）
 *   node scripts/validate-workflow.mjs --self-test  # 用内存对象验证负例（校验器本身有牙齿）
 *
 * 设计原则（来自工单与历史教训）：
 * - **不得以整文件子串匹配替代字段断言**。本文件先用一个最小的 YAML 子集解析器把 ci.yml
 *   解析成结构（mapping / sequence / scalar / block scalar），再断言具体的键、值、类型、
 *   步骤顺序与 `if` 条件表达式。因此「job 改个名字」「node 改成 20」「删掉 npm ci」
 *   都会真的 FAIL，而不是因为文件里还残留着某段文字而通过。
 * - **不得要求 pages.yml**：本任务只负责早期 `ci` 门禁；Pages 工作流由后续 SHIP-01 创建，
 *   校验器的正例只覆盖 `.github/workflows/ci.yml` 一类文件。
 * - 零 npm 依赖：只用 Node 24 标准库。
 *
 * 退出码：0 = 校验通过；1 = 校验失败（字段不满足或文件/YAML 解析失败）；2 = 用法错误。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');
const WORKFLOW_PATH = path.join(ROOT, '.github', 'workflows', 'ci.yml');

const CONTENT_GATE_COMMAND = 'node scripts/validate-content.mjs --stage full --media';

// ---------------------------------------------------------------------------
// 最小 YAML 子集解析器
// ---------------------------------------------------------------------------
//
// 只支持 GitHub workflow 常用的块式 YAML 子集：mapping、sequence、plain/quoted scalar、
// `|` / `>` block scalar、整行注释。不支持锚点/别名、flow collection、多文档。
// 这对本任务足够；若未来工作流需要更复杂语法，应在此显式扩展并补自测，而不是退回子串匹配。

function stripYamlComment(line) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inSingle) {
      if (ch === "'") inSingle = false;
      continue;
    }
    if (inDouble) {
      if (ch === '\\') i += 1;
      else if (ch === '"') inDouble = false;
      continue;
    }
    if (ch === "'") {
      inSingle = true;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      continue;
    }
    if (ch === '#' && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

function splitKeyValue(text) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inSingle) {
      if (ch === "'") inSingle = false;
      continue;
    }
    if (inDouble) {
      if (ch === '\\') i += 1;
      else if (ch === '"') inDouble = false;
      continue;
    }
    if (ch === "'") {
      inSingle = true;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      continue;
    }
    if (ch === ':' && (i + 1 === text.length || /\s/.test(text[i + 1]))) {
      const key = text.slice(0, i).trim();
      if (key.length === 0) return null;
      return { key: unquoteYamlScalar(key), value: text.slice(i + 1).trim() };
    }
  }
  return null;
}

function unquoteYamlScalar(value) {
  const text = String(value).trim();
  if (text.length >= 2 && text.startsWith("'") && text.endsWith("'")) {
    return text.slice(1, -1).replace(/''/g, "'");
  }
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
    try {
      return JSON.parse(text);
    } catch {
      return text.slice(1, -1);
    }
  }
  return text;
}

function parseYamlScalar(value) {
  const text = unquoteYamlScalar(value);
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (text === 'null' || text === '~') return null;
  if (/^-?\d+$/.test(text)) return Number(text);
  return text;
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseYamlSubset(source) {
  const rawLines = String(source).replace(/\r\n/g, '\n').split('\n');
  const lines = [];
  for (const raw of rawLines) {
    if (raw.includes('\t')) throw new Error('YAML 子集解析器不支持制表符缩进');
    const withoutComment = stripYamlComment(raw);
    if (withoutComment.trim() === '') continue;
    const stripped = withoutComment.replace(/^\s+/, '');
    lines.push({ indent: withoutComment.length - stripped.length, text: stripped });
  }
  let index = 0;

  function parseBlock(indent) {
    const line = lines[index];
    if (!line) return null;
    if (line.text === '-' || line.text.startsWith('- ')) return parseSequence(indent);
    return parseMapping(indent, {});
  }

  function parseMapping(indent, seed) {
    const object = seed;
    while (index < lines.length) {
      const line = lines[index];
      if (line.indent < indent) break;
      if (line.indent > indent) {
        throw new Error(`YAML 子集解析器：意外的缩进（第 ${index + 1} 个有效行「${line.text}」）`);
      }
      if (line.text === '-' || line.text.startsWith('- ')) break;
      const entry = splitKeyValue(line.text);
      if (!entry) throw new Error(`YAML 子集解析器：期望 "key: value"，实际「${line.text}」`);
      index += 1;
      object[entry.key] = parseValueAfterKey(entry.value, indent);
    }
    return object;
  }

  function parseSequence(indent) {
    const array = [];
    while (index < lines.length) {
      const line = lines[index];
      if (line.indent !== indent) break;
      if (!(line.text === '-' || line.text.startsWith('- '))) break;
      const content = line.text === '-' ? '' : line.text.slice(2).trim();
      if (content === '') {
        index += 1;
        array.push(parseBlock(lines[index] ? lines[index].indent : indent + 2));
        continue;
      }
      const entry = splitKeyValue(content);
      if (!entry) {
        index += 1;
        array.push(parseYamlScalar(content));
        continue;
      }
      index += 1;
      const item = {};
      item[entry.key] = parseValueAfterKey(entry.value, indent + 2);
      if (index < lines.length && lines[index].indent > indent) {
        parseMapping(lines[index].indent, item);
      }
      array.push(item);
    }
    return array;
  }

  function parseValueAfterKey(value, keyIndent) {
    if (value === '') {
      const next = lines[index];
      if (!next || next.indent <= keyIndent) return null;
      return parseBlock(next.indent);
    }
    const blockMatch = value.match(/^([|>])([+-]?)$/);
    if (blockMatch) return parseBlockScalar(keyIndent, blockMatch[1]);
    return parseYamlScalar(value);
  }

  function parseBlockScalar(keyIndent, mode) {
    const collected = [];
    while (index < lines.length && lines[index].indent > keyIndent) {
      collected.push(lines[index]);
      index += 1;
    }
    if (collected.length === 0) return '';
    const minIndent = Math.min(...collected.map((line) => line.indent));
    const joined = collected.map((line) => ' '.repeat(line.indent - minIndent) + line.text).join('\n');
    if (mode === '>') {
      return joined
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join(' ');
    }
    return joined;
  }

  const document = parseBlock(lines[0] ? lines[0].indent : 0);
  if (index < lines.length) {
    throw new Error(`YAML 子集解析器：无法消费第 ${index + 1} 个有效行「${lines[index].text}」`);
  }
  return document;
}

// ---------------------------------------------------------------------------
// 字段级校验
// ---------------------------------------------------------------------------

function normalizeExpression(value) {
  return String(value).replace(/\s+/g, ' ').trim();
}

function normalizeRun(value) {
  return String(value)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n')
    .trim();
}

function toArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === 'string') return [value];
  return [];
}

/**
 * 校验解析后的 workflow 对象。返回 `{ valid, errors, facts }`。
 * errors 的 `id` 是稳定 ID，供 --self-test 断言「某类缺陷真的被检测到」。
 */
function validateWorkflow(workflow) {
  const errors = [];
  const add = (id, message) => errors.push({ id, message });
  const facts = {
    triggers: { pullRequest: false, pushMain: false, pullRequestTarget: false },
    permissions: { contents: null, minimal: false },
    concurrency: { present: false, group: null },
    job: { id: 'ci', name: null, runsOn: null },
    setupNode: { uses: null, nodeVersion: null },
    stepOrder: [],
    commands: {},
    e2e: { detection: false, chromiumAndWebkit: false, runSuite: false, absentNotice: false },
    pagesViolation: false,
  };

  if (!isPlainObject(workflow)) {
    add('invalid-root', 'workflow 根节点必须是一个 mapping');
    return { valid: false, errors, facts };
  }

  // ---- 触发：pull_request + push(main)，且不得使用 pull_request_target
  const on = workflow.on;
  if (!isPlainObject(on)) {
    add('wrong-trigger', '缺少 `on:` 触发定义');
  } else {
    facts.triggers.pullRequest = Object.prototype.hasOwnProperty.call(on, 'pull_request');
    facts.triggers.pullRequestTarget = Object.prototype.hasOwnProperty.call(on, 'pull_request_target');
    if (!facts.triggers.pullRequest) add('wrong-trigger', '缺少 pull_request 触发');
    if (facts.triggers.pullRequestTarget) add('pull-request-target-forbidden', '禁止使用 pull_request_target（安全边界）');
    const push = on.push;
    const pushBranches = isPlainObject(push) ? toArray(push.branches) : [];
    facts.triggers.pushMain = pushBranches.includes('main');
    if (!Object.prototype.hasOwnProperty.call(on, 'push')) {
      add('wrong-trigger', '缺少 push 触发');
    } else if (!facts.triggers.pushMain) {
      add('wrong-trigger', 'push 触发必须限定 branches: [main]');
    }
  }

  // ---- 权限：最小化 contents: read
  const permissions = workflow.permissions;
  if (!isPlainObject(permissions)) {
    add('permissions-not-minimal', '缺少顶层 permissions（最小权限 contents: read）');
  } else {
    facts.permissions.contents = permissions.contents ?? null;
    const badScopes = Object.entries(permissions).filter(
      ([scope, level]) => scope !== 'contents' && String(level) !== 'read' && String(level) !== 'none',
    );
    if (permissions.contents !== 'read') add('permissions-not-minimal', 'permissions.contents 必须为 read');
    for (const [scope, level] of badScopes) {
      add('permissions-not-minimal', `权限 ${scope}=${level} 不是最小权限（只允许 read/none）`);
    }
    facts.permissions.minimal = permissions.contents === 'read' && badScopes.length === 0;
  }

  // ---- concurrency
  const concurrency = workflow.concurrency;
  if (concurrency === undefined || concurrency === null) {
    add('missing-concurrency', '缺少 concurrency');
  } else if (isPlainObject(concurrency)) {
    facts.concurrency.present = true;
    if (typeof concurrency.group !== 'string' || concurrency.group.trim() === '') {
      add('missing-concurrency', 'concurrency.group 必须是非空字符串');
    } else {
      facts.concurrency.group = concurrency.group;
    }
    if ('cancel-in-progress' in concurrency && typeof concurrency['cancel-in-progress'] !== 'boolean') {
      add('missing-concurrency', 'concurrency.cancel-in-progress 必须是布尔值');
    }
  } else if (typeof concurrency === 'string' && concurrency.trim() !== '') {
    facts.concurrency.present = true;
    facts.concurrency.group = concurrency;
  } else {
    add('missing-concurrency', 'concurrency 形状非法');
  }

  // ---- jobs.ci
  const jobs = workflow.jobs;
  if (!isPlainObject(jobs)) {
    add('missing-ci-job', '缺少 jobs mapping');
    return { valid: false, errors, facts };
  }
  for (const jobId of Object.keys(jobs)) {
    if (jobId !== 'ci' && /pages/i.test(jobId)) {
      add('pages-deploy-forbidden', `禁止包含 Pages 作业（发现 job id ${jobId}）`);
      facts.pagesViolation = true;
    }
  }
  const job = jobs.ci;
  if (!isPlainObject(job)) {
    add('missing-ci-job', '缺少 job id 为 ci 的作业');
    return { valid: false, errors, facts };
  }
  facts.job.name = job.name ?? null;
  facts.job.runsOn = job['runs-on'] ?? null;
  if (job.name !== 'ci') add('job-name-not-ci', `job name 必须精确为 "ci"（实际 ${JSON.stringify(job.name)}）`);
  if (job['runs-on'] !== 'ubuntu-latest') add('runs-on-not-ubuntu', `job runs-on 必须为 ubuntu-latest（实际 ${JSON.stringify(job['runs-on'])}）`);
  if (isPlainObject(job.permissions)) {
    for (const [scope, level] of Object.entries(job.permissions)) {
      if (scope === 'contents') {
        if (level !== 'read') add('permissions-not-minimal', `job permissions.contents=${level} 超出最小权限`);
      } else if (String(level) !== 'read' && String(level) !== 'none') {
        add('permissions-not-minimal', `job permissions.${scope}=${level} 超出最小权限`);
      }
    }
  }

  // ---- steps
  const steps = Array.isArray(job.steps) ? job.steps : null;
  if (!steps || steps.length === 0) {
    add('missing-steps', 'job 没有 steps');
    return { valid: false, errors, facts };
  }
  const runSteps = [];
  const usesSteps = [];
  steps.forEach((step, index) => {
    if (!isPlainObject(step)) {
      add('invalid-step', `第 ${index + 1} 个 step 不是 mapping`);
      return;
    }
    if (typeof step.run === 'string') {
      runSteps.push({
        index,
        run: normalizeRun(step.run),
        condition: typeof step.if === 'string' ? normalizeExpression(step.if) : '',
        id: typeof step.id === 'string' ? step.id : '',
        name: typeof step.name === 'string' ? step.name : '',
      });
    }
    if (typeof step.uses === 'string') usesSteps.push({ index, uses: step.uses });
  });
  facts.stepOrder = steps.map((step) => {
    if (!isPlainObject(step)) return 'invalid';
    if (typeof step.uses === 'string') return step.uses;
    if (typeof step.run === 'string') return normalizeRun(step.run).split('\n')[0].slice(0, 80);
    return typeof step.name === 'string' ? step.name : 'unnamed';
  });

  if (!usesSteps.some((step) => step.uses.startsWith('actions/checkout@'))) {
    add('missing-checkout', '缺少 actions/checkout 步骤');
  }

  const setupNode = usesSteps.find((step) => step.uses.startsWith('actions/setup-node@'));
  if (!setupNode) {
    add('missing-setup-node', '缺少 actions/setup-node 步骤');
  } else {
    const setupStep = steps[setupNode.index];
    facts.setupNode.uses = setupNode.uses;
    facts.setupNode.nodeVersion = isPlainObject(setupStep.with) ? setupStep.with['node-version'] : null;
    if (String(facts.setupNode.nodeVersion) !== '24') {
      add('node-version-not-24', `actions/setup-node 的 node-version 必须为 24（实际 ${JSON.stringify(facts.setupNode.nodeVersion)}）`);
    }
  }

  const findRunStep = (command) => runSteps.find((step) => step.run === command);
  const npmCi = findRunStep('npm ci');
  const contentGate = findRunStep(CONTENT_GATE_COMMAND);
  const siteCheck = findRunStep('node --run check');
  const siteBuild = findRunStep('node --run build');
  facts.commands = {
    npmCi: npmCi ? npmCi.index : null,
    contentGate: contentGate ? contentGate.index : null,
    check: siteCheck ? siteCheck.index : null,
    build: siteBuild ? siteBuild.index : null,
  };
  if (!npmCi) add('missing-npm-ci', '缺少 `npm ci` 安装步骤（run 必须精确为 "npm ci"）');
  if (!contentGate) add('missing-content-gate', `缺少内容门禁步骤（run 必须精确为 "${CONTENT_GATE_COMMAND}"）`);
  if (!siteCheck) add('missing-check', '缺少 `node --run check` 步骤');
  if (!siteBuild) add('missing-build', '缺少 `node --run build` 步骤');

  const orderedPairs = [
    [setupNode ? setupNode.index : -1, npmCi ? npmCi.index : -1, 'setup-node 必须在 npm ci 之前'],
    [npmCi ? npmCi.index : -1, contentGate ? contentGate.index : -1, 'npm ci 必须在内容门禁之前'],
    [contentGate ? contentGate.index : -1, siteCheck ? siteCheck.index : -1, '内容门禁必须在 node --run check 之前'],
    [siteCheck ? siteCheck.index : -1, siteBuild ? siteBuild.index : -1, 'node --run check 必须在 node --run build 之前'],
  ];
  for (const [before, after, message] of orderedPairs) {
    if (before >= 0 && after >= 0 && before >= after) add('wrong-step-order', message);
  }

  // ---- 条件 e2e：检测 package.json → 存在时安装 Chromium+WebKit 并运行；不存在时显式说明
  const detection = runSteps.find((step) => step.id === 'e2e');
  facts.e2e.detection = Boolean(
    detection &&
      detection.run.includes('package.json') &&
      detection.run.includes('test:e2e') &&
      detection.run.includes('GITHUB_OUTPUT'),
  );
  if (!facts.e2e.detection) {
    add('missing-e2e-detection', '缺少 e2e 检测步骤：step id 必须为 e2e，读取 package.json 的 test:e2e 并写入 GITHUB_OUTPUT');
  }
  const positiveCondition = (condition) => {
    const normalized = normalizeExpression(condition);
    return (
      normalized.includes("steps.e2e.outputs.has_test_e2e == 'true'") ||
      normalized.includes('steps.e2e.outputs.has_test_e2e == "true"')
    );
  };
  const negativeCondition = (condition) => normalizeExpression(condition).includes('steps.e2e.outputs.has_test_e2e !=');
  const browserInstall = runSteps.find(
    (step) => positiveCondition(step.condition) && /playwright/i.test(step.run) && /install/i.test(step.run) && /chromium/i.test(step.run) && /webkit/i.test(step.run),
  );
  const e2eRun = runSteps.find((step) => positiveCondition(step.condition) && step.run.includes('test:e2e'));
  const absentNotice = runSteps.find(
    (step) => negativeCondition(step.condition) && /e2e/i.test(step.run) && /echo|notice/i.test(step.run) && /package\.json|test:e2e/i.test(step.run),
  );
  facts.e2e.chromiumAndWebkit = Boolean(browserInstall);
  facts.e2e.runSuite = Boolean(e2eRun);
  facts.e2e.absentNotice = Boolean(absentNotice);
  if (!(facts.e2e.detection && facts.e2e.chromiumAndWebkit && facts.e2e.runSuite && facts.e2e.absentNotice)) {
    add(
      'missing-conditional-e2e',
      '条件 e2e 逻辑不完整：需要「检测 package.json test:e2e」+「存在时安装 Playwright Chromium 与 WebKit」+「存在时运行 test:e2e」+「不存在时输出明确可审计说明」四个部分',
    );
  }
  if (browserInstall && detection && browserInstall.index < detection.index) {
    add('wrong-e2e-order', 'Playwright 安装必须在 e2e 检测之后');
  }
  if (browserInstall && e2eRun && e2eRun.index < browserInstall.index) {
    add('wrong-e2e-order', 'e2e 套件必须在 Playwright Chromium/WebKit 安装之后');
  }

  // ---- 禁止 Pages build/deploy / 发布步骤
  const pagesUses = usesSteps.filter((step) => /pages/i.test(step.uses));
  const pagesCommands = runSteps.filter((step) => /deploy-pages|upload-pages-artifact|github-pages|pages build|pages deploy/i.test(step.run));
  if (pagesUses.length > 0 || pagesCommands.length > 0) {
    facts.pagesViolation = true;
    add('pages-deploy-forbidden', 'ci.yml 不得包含 Pages build/deploy 或发布步骤（由 SHIP-01 的独立工作流负责）');
  }

  return { valid: errors.length === 0, errors, facts };
}

// ---------------------------------------------------------------------------
// 自测：内存对象正例 + 负例（每类缺陷至少一例）
// ---------------------------------------------------------------------------

/** 内存中的合法 workflow（与 .github/workflows/ci.yml 的字段形状一致，但与文件读取无关）。 */
function makeValidWorkflow() {
  return {
    name: 'ci',
    on: {
      pull_request: null,
      push: { branches: ['main'] },
    },
    permissions: { contents: 'read' },
    concurrency: { group: 'ci-${{ github.workflow }}-${{ github.ref }}', 'cancel-in-progress': true },
    jobs: {
      ci: {
        name: 'ci',
        'runs-on': 'ubuntu-latest',
        steps: [
          { name: 'Checkout', uses: 'actions/checkout@v4' },
          { name: 'Setup Node.js 24', uses: 'actions/setup-node@v4', with: { 'node-version': '24', cache: 'npm' } },
          { name: 'Install dependencies (npm ci)', run: 'npm ci' },
          { name: 'Content gate (full stage + media)', run: CONTENT_GATE_COMMAND },
          { name: 'Site check', run: 'node --run check' },
          { name: 'Site build', run: 'node --run build' },
          {
            name: 'Detect e2e suite from package.json',
            id: 'e2e',
            run: "node -e \"const fs = require('fs'); const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')); const has = Boolean(pkg.scripts && pkg.scripts['test:e2e']); fs.appendFileSync(process.env.GITHUB_OUTPUT, 'has_test_e2e=' + has + '\\n');\"",
          },
          {
            name: 'Install Playwright Chromium and WebKit (e2e present)',
            if: "steps.e2e.outputs.has_test_e2e == 'true'",
            run: 'npx playwright install --with-deps chromium webkit',
          },
          {
            name: 'Run e2e suite (e2e present)',
            if: "steps.e2e.outputs.has_test_e2e == 'true'",
            run: 'npm run test:e2e',
          },
          {
            name: 'E2E suite not present (explicit, auditable notice)',
            if: "steps.e2e.outputs.has_test_e2e != 'true'",
            run: 'echo "e2e gate inactive: package.json has no test:e2e"',
          },
        ],
      },
    },
  };
}

function cloneWorkflow(workflow) {
  return JSON.parse(JSON.stringify(workflow));
}

function workflowWithoutStep(workflow, predicate) {
  const clone = cloneWorkflow(workflow);
  clone.jobs.ci.steps = clone.jobs.ci.steps.filter((step) => !predicate(step));
  return clone;
}

function selfTest() {
  const cases = [];
  const positive = makeValidWorkflow();
  cases.push({ id: 'positive', workflow: positive, expectValid: true, expectErrors: [] });

  // 1) 缺 ci 作业
  {
    const workflow = cloneWorkflow(positive);
    delete workflow.jobs.ci;
    cases.push({ id: 'missing-ci-job', workflow, expectValid: false, expectErrors: ['missing-ci-job'] });
  }
  // 2) 错误触发：缺 pull_request
  {
    const workflow = cloneWorkflow(positive);
    workflow.on = { push: { branches: ['main'] } };
    cases.push({ id: 'wrong-trigger', workflow, expectValid: false, expectErrors: ['wrong-trigger'] });
  }
  // 3) push 分支不是 main
  {
    const workflow = cloneWorkflow(positive);
    workflow.on = { pull_request: null, push: { branches: ['develop'] } };
    cases.push({ id: 'wrong-trigger-branch', workflow, expectValid: false, expectErrors: ['wrong-trigger'] });
  }
  // 4) Node 非 24
  {
    const workflow = cloneWorkflow(positive);
    const setupStep = workflow.jobs.ci.steps.find((step) => String(step.uses || '').startsWith('actions/setup-node@'));
    setupStep.with['node-version'] = '20';
    cases.push({ id: 'node-version-not-24', workflow, expectValid: false, expectErrors: ['node-version-not-24'] });
  }
  // 5) 缺 npm ci
  {
    const workflow = workflowWithoutStep(positive, (step) => step.run === 'npm ci');
    cases.push({ id: 'missing-npm-ci', workflow, expectValid: false, expectErrors: ['missing-npm-ci'] });
  }
  // 6) 缺内容门禁
  {
    const workflow = workflowWithoutStep(positive, (step) => step.run === CONTENT_GATE_COMMAND);
    cases.push({ id: 'missing-content-gate', workflow, expectValid: false, expectErrors: ['missing-content-gate'] });
  }
  // 7) e2e 条件逻辑缺失（删掉检测/安装/运行/说明四步）
  {
    const workflow = workflowWithoutStep(
      positive,
      (step) =>
        step.id === 'e2e' ||
        String(step.if || '').includes('has_test_e2e'),
    );
    cases.push({ id: 'missing-conditional-e2e', workflow, expectValid: false, expectErrors: ['missing-conditional-e2e'] });
  }
  // 8) 权限过大
  {
    const workflow = cloneWorkflow(positive);
    workflow.permissions = { contents: 'read', pages: 'write' };
    cases.push({ id: 'permissions-not-minimal', workflow, expectValid: false, expectErrors: ['permissions-not-minimal'] });
  }
  // 9) 缺 concurrency
  {
    const workflow = cloneWorkflow(positive);
    delete workflow.concurrency;
    cases.push({ id: 'missing-concurrency', workflow, expectValid: false, expectErrors: ['missing-concurrency'] });
  }
  // 10) 使用 pull_request_target
  {
    const workflow = cloneWorkflow(positive);
    workflow.on = { pull_request_target: null, push: { branches: ['main'] } };
    cases.push({ id: 'pull-request-target-forbidden', workflow, expectValid: false, expectErrors: ['pull-request-target-forbidden'] });
  }
  // 11) 包含 Pages 部署步骤
  {
    const workflow = cloneWorkflow(positive);
    workflow.jobs.ci.steps.push({ name: 'Deploy Pages', uses: 'actions/deploy-pages@v4' });
    cases.push({ id: 'pages-deploy-forbidden', workflow, expectValid: false, expectErrors: ['pages-deploy-forbidden'] });
  }
  // 12) 步骤顺序错误（npm ci 在 check 之后）
  {
    const workflow = cloneWorkflow(positive);
    const steps = workflow.jobs.ci.steps;
    const npmIndex = steps.findIndex((step) => step.run === 'npm ci');
    const [npmStep] = steps.splice(npmIndex, 1);
    const buildIndex = steps.findIndex((step) => step.run === 'node --run build');
    steps.splice(buildIndex + 1, 0, npmStep);
    cases.push({ id: 'wrong-step-order', workflow, expectValid: false, expectErrors: ['wrong-step-order'] });
  }

  let failures = 0;
  for (const testCase of cases) {
    const result = validateWorkflow(testCase.workflow);
    const idSet = new Set(result.errors.map((error) => error.id));
    // 负例只要求「必检错误 ID 全部出现」；同一个错误对象可能合法地连带触发其它字段错误
    // （例如把 on 换成 pull_request_target 自然也会缺 pull_request），这不影响负例成立。
    const missing = testCase.expectErrors.filter((errorId) => !idSet.has(errorId));
    const extra = result.errors.filter((error) => !testCase.expectErrors.includes(error.id));
    const ok = result.valid === testCase.expectValid && missing.length === 0;
    if (!ok) {
      failures += 1;
      console.log(`FAIL  self-test:${testCase.id}`);
      console.log(`      expectValid=${testCase.expectValid} actualValid=${result.valid}`);
      if (missing.length > 0) console.log(`      missing expected errors: ${missing.join(', ')}`);
    } else {
      const extraNote = testCase.expectValid ? '' : extra.length > 0 ? `（另连带 ${extra.length} 个相关字段错误）` : '';
      console.log(`PASS  self-test:${testCase.id}${testCase.expectValid ? '（正例通过）' : `（检测到 ${testCase.expectErrors.join(' + ')}）${extraNote}`}`);
    }
  }
  console.log('');
  if (failures > 0) {
    console.log(`self-test RESULT: FAIL（${failures}/${cases.length} 个用例不符预期）`);
    return 1;
  }
  console.log(`self-test RESULT: PASS（${cases.length} 个用例：1 正例 + ${cases.length - 1} 负例；负例覆盖缺 ci 作业/错误触发/Node 非 24/缺 npm ci/缺内容门禁/缺条件 e2e/权限/并发/安全边界/Pages/步骤顺序）`);
  return 0;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function printFacts(facts) {
  const line = (label, value) => console.log(`  ${label}: ${value}`);
  line('触发', `pull_request=${facts.triggers.pullRequest} push(main)=${facts.triggers.pushMain} pull_request_target=${facts.triggers.pullRequestTarget}`);
  line('权限', `contents=${facts.permissions.contents} minimal=${facts.permissions.minimal}`);
  line('concurrency', `present=${facts.concurrency.present} group=${facts.concurrency.group}`);
  line('job', `id=ci name=${JSON.stringify(facts.job.name)} runs-on=${JSON.stringify(facts.job.runsOn)}`);
  line('setup-node', `${facts.setupNode.uses} node-version=${JSON.stringify(facts.setupNode.nodeVersion)}`);
  line(
    '命令顺序',
    `npmCi=${facts.commands.npmCi} contentGate=${facts.commands.contentGate} check=${facts.commands.check} build=${facts.commands.build}`,
  );
  line(
    '条件 e2e',
    `detection=${facts.e2e.detection} chromium+webkit=${facts.e2e.chromiumAndWebkit} runTestE2E=${facts.e2e.runSuite} absentNotice=${facts.e2e.absentNotice}`,
  );
  line('Pages 违规', String(facts.pagesViolation));
}

function main(argv) {
  if (argv.includes('--self-test')) {
    if (argv.length > 1) {
      console.error('usage: node scripts/validate-workflow.mjs [--self-test]');
      return 2;
    }
    return selfTest();
  }
  if (argv.length > 0) {
    console.error('usage: node scripts/validate-workflow.mjs [--self-test]');
    return 2;
  }

  if (!fs.existsSync(WORKFLOW_PATH)) {
    console.log(JSON.stringify({ valid: false, reason: `missing ${path.relative(ROOT, WORKFLOW_PATH)}` }));
    return 1;
  }
  let workflow;
  try {
    workflow = parseYamlSubset(fs.readFileSync(WORKFLOW_PATH, 'utf8'));
  } catch (error) {
    console.log(JSON.stringify({ valid: false, reason: `YAML parse error: ${error?.message ?? error}` }));
    return 1;
  }

  const result = validateWorkflow(workflow);
  console.log(`validate-workflow: ${path.relative(ROOT, WORKFLOW_PATH)}`);
  printFacts(result.facts);
  if (result.valid) {
    console.log('RESULT: PASS');
    return 0;
  }
  console.log('');
  for (const error of result.errors) {
    console.log(`FAIL  [${error.id}] ${error.message}`);
  }
  console.log('');
  console.log(`RESULT: FAIL（${result.errors.length} 个字段级问题）`);
  return 1;
}

process.exitCode = main(process.argv.slice(2));
