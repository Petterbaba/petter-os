#!/usr/bin/env node
// Synker food_items fra Matvaretabellen (Mattilsynet – offisiell, åpen
// kilde uten auth; oppdateres årlig om høsten, caching er tillatt).
// Kjøres med: npm run synk:mat        (full synk mot databasen)
//            npm run synk:mat -- --dry-run   (last ned og valider, uten DB)
//
// food_items er DELT referansedata uten skrivepolicyer i RLS – synken går
// derfor via direkte DB-tilkobling (SUPABASE_DB_URL, som backup.sh), aldri
// gjennom appen. Krever psql (macOS: brew install libpq && brew link
// --force libpq). Flyt: last ned → valider → temp-tabell → upsert på
// source_id → arkiver rader som er borte fra kilden (slettes aldri;
// kommer varen tilbake, nullstilles archived_at).
//
// NB (kildekrav): UI som viser tallene skal kreditere Matvaretabellen/
// Mattilsynet – håndteres på /mat-siden.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const KILDE_URL = "https://www.matvaretabellen.no/api/nb/foods.json";
const ROT = fileURLToPath(new URL("..", import.meta.url));
const DRY_RUN = process.argv.includes("--dry-run");

// .env-filer er ikke shell-syntaks – les kun linjen vi trenger (samme
// tilnærming som backup.sh, av samme grunn: $/& i passordet).
function lesDbUrl() {
  if (process.env.SUPABASE_DB_URL) {
    return process.env.SUPABASE_DB_URL;
  }
  try {
    const linje = readFileSync(join(ROT, ".env.local"), "utf8")
      .split("\n")
      .find((l) => l.startsWith("SUPABASE_DB_URL="));
    if (linje) {
      return linje.slice("SUPABASE_DB_URL=".length).trim();
    }
  } catch {
    // .env.local finnes ikke – fanges av sjekken under.
  }
  return null;
}

// SQL-literal med '' -escaping; null blir NULL.
function q(verdi) {
  if (verdi === null) {
    return "null";
  }
  return "'" + String(verdi).replaceAll("'", "''") + "'";
}

function makro(food, nutrientId) {
  const rad = food.constituents.find((c) => c.nutrientId === nutrientId);
  return typeof rad?.quantity === "number" ? rad.quantity : null;
}

const dbUrl = DRY_RUN ? null : lesDbUrl();
if (!DRY_RUN && !dbUrl) {
  console.error(
    "SUPABASE_DB_URL mangler i .env.local – hent Session pooler-URL fra " +
      "Supabase-dashboardet (Connect) og legg den inn.",
  );
  process.exit(1);
}

console.log(`Laster ned ${KILDE_URL} …`);
const svar = await fetch(KILDE_URL);
if (!svar.ok) {
  console.error(`Nedlastingen feilet: ${svar.status} ${svar.statusText}`);
  process.exit(1);
}
const { foods } = await svar.json();

const rader = [];
const hoppetOver = [];
for (const food of foods) {
  // kcal_per_100g er not null i DB – matvarer uten kcal kan ikke lagres.
  if (food.calories?.unit !== "kcal" || typeof food.calories.quantity !== "number") {
    hoppetOver.push(`${food.foodId} ${food.foodName}`);
    continue;
  }
  rader.push({
    sourceId: food.foodId,
    name: food.foodName,
    kcal: food.calories.quantity,
    protein: makro(food, "Protein"),
    fat: makro(food, "Fett"),
    carbs: makro(food, "Karbo"),
    fiber: makro(food, "Fiber"),
    // Kun gram-porsjoner tas med (kilden bruker i praksis alltid gram).
    portions: food.portions
      .filter((p) => p.unit === "g" && typeof p.quantity === "number")
      .map((p) => ({ name: p.portionName, grams: p.quantity })),
  });
}

console.log(`${rader.length} matvarer fra kilden.`);
if (hoppetOver.length > 0) {
  console.log(`Hoppet over ${hoppetOver.length} uten kcal:`);
  for (const navn of hoppetOver) {
    console.log(`  - ${navn}`);
  }
}

if (DRY_RUN) {
  const eksempel = rader.find((r) => r.portions.length > 0) ?? rader[0];
  console.log("Eksempelrad:", JSON.stringify(eksempel, null, 2));
  console.log("Dry-run: ingenting skrevet til databasen.");
  process.exit(0);
}

// Hele synken i én transaksjon: temp-tabell → upsert → arkivering.
const deler = [
  "begin;",
  `create temp table tmp_food_items (
  source_id text primary key,
  name      text not null,
  kcal      numeric not null,
  protein   numeric,
  fat       numeric,
  carbs     numeric,
  fiber     numeric,
  portions  jsonb not null
) on commit drop;`,
];

const BUNT = 500;
for (let i = 0; i < rader.length; i += BUNT) {
  const verdier = rader
    .slice(i, i + BUNT)
    .map(
      (r) =>
        `(${q(r.sourceId)}, ${q(r.name)}, ${r.kcal}, ${r.protein ?? "null"}, ` +
        `${r.fat ?? "null"}, ${r.carbs ?? "null"}, ${r.fiber ?? "null"}, ` +
        `${q(JSON.stringify(r.portions))}::jsonb)`,
    )
    .join(",\n");
  deler.push(
    `insert into tmp_food_items (source_id, name, kcal, protein, fat, carbs, fiber, portions) values\n${verdier};`,
  );
}

deler.push(`insert into public.food_items
  (source_id, name, kcal_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, fiber_per_100g, portions)
select source_id, name, kcal, protein, fat, carbs, fiber, portions from tmp_food_items
on conflict (source_id) do update set
  name             = excluded.name,
  kcal_per_100g    = excluded.kcal_per_100g,
  protein_per_100g = excluded.protein_per_100g,
  fat_per_100g     = excluded.fat_per_100g,
  carbs_per_100g   = excluded.carbs_per_100g,
  fiber_per_100g   = excluded.fiber_per_100g,
  portions         = excluded.portions,
  archived_at      = null;`);

deler.push(`update public.food_items
   set archived_at = now()
 where archived_at is null
   and source_id not in (select source_id from tmp_food_items);`);

deler.push("commit;");

deler.push(`select
  count(*) filter (where archived_at is null)     as aktive,
  count(*) filter (where archived_at is not null) as arkiverte
from public.food_items;`);

const sqlFil = join(mkdtempSync(join(tmpdir(), "matsynk-")), "synk.sql");
writeFileSync(sqlFil, deler.join("\n\n"));

console.log("Skriver til databasen …");
const resultat = spawnSync(
  "psql",
  [dbUrl, "--set", "ON_ERROR_STOP=1", "--quiet", "--file", sqlFil],
  { stdio: "inherit" },
);

if (resultat.error?.code === "ENOENT") {
  console.error(
    "psql mangler. macOS: brew install libpq && brew link --force libpq",
  );
  process.exit(1);
}
if (resultat.status !== 0) {
  console.error(`Synken feilet (psql avsluttet med ${resultat.status}).`);
  process.exit(1);
}
console.log("Synk fullført.");
