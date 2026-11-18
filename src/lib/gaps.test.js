// Pruebas de la lógica de agrupación y cálculo de brechas (node:test, sin deps).
// Ejecutar: npm test  (en front/)
import { test } from "node:test";
import assert from "node:assert/strict";
import { splitCrossLevel, buildGaps } from "./gaps.js";

const near = (a, b) => Math.abs(a - b) < 1e-9;

test("splitCrossLevel: cruce nacional (sin subámbito)", () => {
  assert.deepEqual(splitCrossLevel("No pobre"), { pov: "No pobre", sub: "" });
});

test("splitCrossLevel: condición + subámbito", () => {
  assert.deepEqual(splitCrossLevel("Pobre extremo / Rural"), { pov: "Pobre extremo", sub: "Rural" });
});

test("splitCrossLevel: nombres con espacios no se parten de más", () => {
  assert.deepEqual(splitCrossLevel("No pobre / Madre de Dios"), { pov: "No pobre", sub: "Madre de Dios" });
});

// Datos del ejemplo del brief (desagüe por área), con decimales de la API.
const rows = [
  { level: "Pobre extremo / Rural",     estimate: 12.3, unreliable: false },
  { level: "No pobre / Urbano",         estimate: 84.9, unreliable: false },
  { level: "Pobre no extremo / Urbano", estimate: 75.6, unreliable: false },
  { level: "No pobre / Rural",          estimate: 27.5, unreliable: false },
  { level: "Pobre extremo / Urbano",    estimate: 61.4, unreliable: false },
  { level: "Pobre no extremo / Rural",  estimate: 18.8, unreliable: false },
];

test("buildGaps: una brecha por subámbito, dentro del mismo ámbito", () => {
  const bySub = Object.fromEntries(buildGaps(rows).map((x) => [x.sub, x]));
  assert.ok(bySub.Urbano && bySub.Rural);
  assert.ok(near(bySub.Urbano.gap, 23.5), `urbano=${bySub.Urbano.gap}`);   // 84.9 − 61.4
  assert.ok(near(bySub.Rural.gap, 15.2), `rural=${bySub.Rural.gap}`);      // 27.5 − 12.3
});

test("buildGaps: la brecha usa estimaciones del mismo ámbito (no mezcla)", () => {
  const bySub = Object.fromEntries(buildGaps(rows).map((x) => [x.sub, x]));
  assert.equal(bySub.Urbano.hi.estimate, 84.9);
  assert.equal(bySub.Urbano.lo.estimate, 61.4);
  assert.equal(bySub.Rural.hi.estimate, 27.5);
  assert.equal(bySub.Rural.lo.estimate, 12.3);
});

test("buildGaps: independiente del orden de las filas", () => {
  const m1 = Object.fromEntries(buildGaps(rows).map((x) => [x.sub, x.gap]));
  const m2 = Object.fromEntries(buildGaps([...rows].reverse()).map((x) => [x.sub, x.gap]));
  assert.deepEqual(m1, m2);
});

test("buildGaps: omite un subámbito sin alguno de los dos grupos", () => {
  const partial = rows.filter((r) => r.level !== "Pobre extremo / Rural");
  const g = buildGaps(partial);
  assert.ok(!g.find((x) => x.sub === "Rural"));
  assert.ok(g.find((x) => x.sub === "Urbano"));
});

test("buildGaps: maneja valores faltantes (null / NaN)", () => {
  const bad = [
    { level: "No pobre / X", estimate: null },
    { level: "Pobre extremo / X", estimate: 10 },
  ];
  assert.equal(buildGaps(bad).length, 0);
});

test("buildGaps: referencial si algún grupo supera el CV", () => {
  const r = [
    { level: "No pobre / Z", estimate: 50, unreliable: true },
    { level: "Pobre extremo / Z", estimate: 30, unreliable: false },
  ];
  assert.equal(buildGaps(r)[0].unreliable, true);
});

test("buildGaps: cruce nacional devuelve una sola brecha (sub vacío)", () => {
  const nat = [
    { level: "No pobre", estimate: 80 },
    { level: "Pobre no extremo", estimate: 60 },
    { level: "Pobre extremo", estimate: 40 },
  ];
  const g = buildGaps(nat);
  assert.equal(g.length, 1);
  assert.equal(g[0].sub, "");
  assert.ok(near(g[0].gap, 40));
});

test("buildGaps: entrada vacía o inválida no rompe", () => {
  assert.deepEqual(buildGaps([]), []);
  assert.deepEqual(buildGaps(null), []);
  assert.deepEqual(buildGaps(undefined), []);
});

test("buildGaps: brecha negativa conserva el signo (No pobre menor)", () => {
  const r = [
    { level: "No pobre / Q", estimate: 20 },
    { level: "Pobre extremo / Q", estimate: 35 },
  ];
  assert.ok(near(buildGaps(r)[0].gap, -15));
});
