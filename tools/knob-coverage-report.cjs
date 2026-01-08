/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const { pathToFileURL } = require("node:url");
const ts = require("typescript");

const repoRoot = path.resolve(__dirname, "..");

const targetFiles = {
  ui: [
    "apps/hps-dealengine/components/sandbox/BusinessLogicSandbox.tsx",
    "apps/hps-dealengine/components/sandbox/RepairsSandbox.tsx",
    "apps/hps-dealengine/constants/sandboxSettingsSource.ts",
  ],
  options: ["apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts"],
  policy: ["apps/hps-dealengine/lib/sandboxPolicy.ts"],
  engine: [
    "packages/engine/src/compute_underwriting.ts",
    "packages/engine/src/policy_builder.ts",
  ],
  trace: [
    "packages/engine/src/compute_underwriting.ts",
    "apps/hps-dealengine/app/(app)/trace/page.tsx",
    "apps/hps-dealengine/lib/overviewStrategy.ts",
  ],
};

const fileCache = {};
const readFile = (relativePath) => {
  if (!fileCache[relativePath]) {
    const fullPath = path.join(repoRoot, relativePath);
    if (!fs.existsSync(fullPath)) {
      fileCache[relativePath] = "";
    } else {
      fileCache[relativePath] = fs.readFileSync(fullPath, "utf8");
    }
  }
  return fileCache[relativePath];
};

function loadSandboxMetadata() {
  const filePath = path.join(
    repoRoot,
    "apps/hps-dealengine/lib/sandboxKnobAudit.ts",
  );
  const source = fs.readFileSync(filePath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filePath,
  });

  const module = { exports: {} };
  const requireFn = Module.createRequire(pathToFileURL(filePath));
  const wrapper = new Function(
    "exports",
    "require",
    "module",
    "__filename",
    "__dirname",
    outputText,
  );
  wrapper(module.exports, requireFn, module, filePath, path.dirname(filePath));
  return module.exports.SANDBOX_KNOB_METADATA;
}

function classify(finalImpact) {
  if (finalImpact === "ux_only") return "ux_only";
  if (finalImpact === "risk_compliance") return "risk_gate";
  if (finalImpact === "operational_workflow") return "workflow";
  return "runtime_math";
}

const keyAliases = {
  assumptionsProtocolPlaceholdersWhenEvidenceMissing: [
    "allow_placeholders_when_evidence_missing",
  ],
  bankersRoundingModeNumericSafety: ["bankers_rounding_mode"],
  buyerCostsAllocationDualScenarioRenderingWhenUnknown: ["buyer_costs_dual_scenario_when_unknown"],
  buyerCostsLineItemModelingMethod: ["buyer_costs_line_item_modeling_method"],
};

const traceRuleAliases = {
  carryMonthsMaximumCap: ["CARRY_MONTHS_POLICY"],
  offerValidityPeriodDaysPolicy: ["DTM_URGENCY_POLICY"],
  payoffAccrualBasisDayCountConvention: ["PAYOFF_POLICY"],
  payoffAccrualComponents: ["PAYOFF_POLICY"],
  payoffLetterEvidenceRequiredAttachment: ["PAYOFF_POLICY"],
  repairsContingencyPercentageByClass: ["REPAIRS_POLICY"],
  repairsHardMax: ["REPAIRS_POLICY"],
  repairsSoftMaxVsArvPercentage: ["REPAIRS_POLICY"],
};

function fileHasKey(relativeFiles, key) {
  const needles = [key, ...(keyAliases[key] ?? [])];
  return relativeFiles.some((file) =>
    needles.some((needle) => readFile(file).includes(needle)),
  );
}

function buildCoverageRows() {
  const metadata = loadSandboxMetadata();
  const keeps = Object.values(metadata).filter(
    (meta) => meta.recommendedAction === "KEEP",
  );

  const sandboxSettingsSource = readFile("apps/hps-dealengine/constants/sandboxSettingsSource.ts");
  const sandboxPolicyFile = readFile("apps/hps-dealengine/lib/sandboxPolicy.ts");
  const policyBuilderFile = readFile("packages/engine/src/policy_builder.ts");

  // Build knob -> policy field map by scanning sandboxPolicy and policy_builder
  const policyFieldMap = {};
  sandboxPolicyFile.split("\n").forEach((line) => {
    const match = line.match(/([a-zA-Z0-9_]+)\s*:\s*pickPostureValue\([^,]+,\s*[^,]+,\s*"(.*?)"\)/);
    if (match) {
      const [, field, knob] = match;
      if (!policyFieldMap[knob]) policyFieldMap[knob] = new Set();
      policyFieldMap[knob].add(field);
    }
  });
  policyBuilderFile.split("\n").forEach((line) => {
    const match = line.match(/([a-zA-Z0-9_]+)\s*:\s*sandboxOptions\.[a-zA-Z0-9_]+\.(.*?)\s*\?\?/);
    if (match) {
      const [, field, knob] = match;
      if (!policyFieldMap[knob]) policyFieldMap[knob] = new Set();
      policyFieldMap[knob].add(field);
    }
  });

  const policyFieldUsedInEngine = (fields = []) => {
    const engineText = readFile("packages/engine/src/compute_underwriting.ts");
    const builderText = policyBuilderFile;
    return fields.some((f) => engineText.includes(f) || builderText.includes(f));
  };
  const traceHasRule = (rule) =>
    targetFiles.trace.some((file) =>
      readFile(file).includes(`rule: '${rule}'`),
    );

  return keeps.map((meta) => {
    const ui =
      fileHasKey(targetFiles.ui, meta.key) ||
      sandboxSettingsSource.includes(`key: '${meta.key}'`);
    const options = fileHasKey(targetFiles.options, meta.key);
    const policy = fileHasKey(targetFiles.policy, meta.key);
    const policyFields = Array.from(policyFieldMap[meta.key] ?? []);
    const engine =
      fileHasKey(targetFiles.engine, meta.key) || (policy && policyFieldUsedInEngine(policyFields));
    const trace =
      fileHasKey(targetFiles.trace, meta.key) ||
      policyFields.some((f) => targetFiles.trace.some((file) => readFile(file).includes(f))) ||
      (traceRuleAliases[meta.key] ?? []).some((rule) => traceHasRule(rule));

    return {
      key: meta.key,
      finalImpact: meta.finalImpact,
      ui,
      options,
      policy,
      engine,
      trace,
      classification: classify(meta.finalImpact),
      primary_surface: null,
    };
  });
}

function derivePrimarySurface(row) {
  if (row.classification === "ux_only") return "sandbox";
  if (row.engine && row.ui && row.trace) return "multiple";
  if (row.engine && row.ui) return "overview";
  if (row.engine && row.trace) return "trace";
  if (row.ui) return "sandbox";
  return "multiple";
}

function printMarkdown(rows) {
  const header =
    "| key | final_impact | ui | options | policy | engine | trace | classification | primary_surface |\n" +
    "| --- | ------------ | -- | ------- | ------ | ------ | ----- | -------------- | ---------------- |";
  const lines = rows.map((row) => {
    const yesNo = (flag) => (flag ? "✅" : "❌");
    return [
      row.key,
      row.finalImpact,
      yesNo(row.ui),
      yesNo(row.options),
      yesNo(row.policy),
      yesNo(row.engine),
      yesNo(row.trace),
      row.classification,
      row.primary_surface,
    ].join(" | ");
  });
  console.log([header, ...lines].join("\n"));
}

function writeJson(rows) {
  const outPath = path.join(__dirname, "knob-coverage-report.json");
  const payload = {};
  rows.forEach((row) => {
    payload[row.key] = {
      finalImpact: row.finalImpact,
      ui: row.ui,
      options: row.options,
      policy: row.policy,
      engine: row.engine,
      trace: row.trace,
      classification: row.classification,
      primary_surface: row.primary_surface,
    };
  });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
}

const rows = buildCoverageRows().map((row) => ({
  ...row,
  primary_surface: derivePrimarySurface(row),
}));
printMarkdown(rows);
writeJson(rows);
