import fs from "fs";
import path from "path";

interface KpiEntry {
  id: string;
  label?: string;
  analyzeFields?: string[];
}

interface InputEntry {
  inputId: string;
  dashboardKpiIds?: string[];
  hasDashboardExposure?: boolean;
}

const root = path.resolve(__dirname, "..", "docs", "dashboard");
const loadJson = <T>(filename: string): T => {
  const full = path.join(root, filename);
  const raw = fs.readFileSync(full, "utf8");
  return JSON.parse(raw) as T;
};

const kpis = loadJson<KpiEntry[]>("kpi-inventory.json");
const inputs = loadJson<InputEntry[]>("input-surfaces.json");
const matrix = loadJson<InputEntry[]>("kpi-input-matrix.json");

// Merge matrix exposure data into inputs by id for convenience
const inputMap = new Map<string, InputEntry>();
inputs.forEach((entry: any) => {
  const key = entry.inputId ?? entry.id;
  if (!key) return;
  inputMap.set(key, { ...entry, inputId: key });
});
matrix.forEach((entry) => {
  const merged = inputMap.get(entry.inputId) ?? { ...entry };
  merged.dashboardKpiIds = entry.dashboardKpiIds ?? merged.dashboardKpiIds;
  merged.hasDashboardExposure = entry.hasDashboardExposure ?? merged.hasDashboardExposure;
  inputMap.set(entry.inputId, merged);
});

const uncoveredInputs = Array.from(inputMap.values()).filter(
  (i) => i.hasDashboardExposure === false || (i.dashboardKpiIds?.length ?? 0) === 0,
);

const allInputIds = new Set<string>(Array.from(inputMap.values()).map((i) => i.inputId));
const inputsByField = new Map<string, string[]>();
Array.from(inputMap.values()).forEach((entry) => {
  if (!entry.dashboardKpiIds) return;
  entry.dashboardKpiIds.forEach((kpiId) => {
    const list = inputsByField.get(kpiId) ?? [];
    list.push(entry.inputId);
    inputsByField.set(kpiId, list);
  });
});

const unmappedKpis: { id: string; analyzeFields: string[] }[] = kpis
  .filter((k) => Array.isArray(k.analyzeFields) && k.analyzeFields.length > 0)
  .filter((k) => !inputsByField.has(k.id));

const outputDir = root;
if (uncoveredInputs.length > 0) {
  fs.writeFileSync(
    path.join(outputDir, "uncovered-inputs.json"),
    JSON.stringify(uncoveredInputs, null, 2),
    "utf8",
  );
}
if (unmappedKpis.length > 0) {
  fs.writeFileSync(
    path.join(outputDir, "unmapped-kpis.json"),
    JSON.stringify(unmappedKpis, null, 2),
    "utf8",
  );
}

const printSection = (title: string) => {
  // eslint-disable-next-line no-console
  console.log(`\n${title}\n${"-".repeat(title.length)}`);
};

printSection("Uncovered inputs (no dashboard exposure)");
if (uncoveredInputs.length === 0) {
  console.log("None");
} else {
  uncoveredInputs.forEach((i) => console.log(`- ${i.inputId}`));
}

printSection("KPIs with no input references");
if (unmappedKpis.length === 0) {
  console.log("None");
} else {
  unmappedKpis.forEach((k) => console.log(`- ${k.id}`));
}
