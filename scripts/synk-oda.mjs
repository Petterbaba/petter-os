#!/usr/bin/env node
// Synker oda_products fra Odas åpne nettside-API (matflyt-planen, vedtatt
// 6. sep 2026). Kjøres med: npm run synk:oda          (full synk mot DB)
//                          npm run synk:oda -- --dry-run  (prøvekjøring)
//
// Kilden er uoffisiell (Odas eget nettside-API, åpent siden Kolonial.no-
// tiden) – derfor skånsomt tempo (begrenset parallellitet), tydelig
// User-Agent og retry ved enkeltfeil. Flyt: sitemap-enumerering (alle
// produkt-id-er) → produktdata per id → temp-tabell → upsert på
// source_id → arkiver varer som er borte fra kilden (slettes aldri;
// kommer varen tilbake, nullstilles archived_at).
//
// oda_products er DELT referansedata uten skrivepolicyer i RLS – synken
// går via direkte DB-tilkobling (SUPABASE_DB_URL, som backup.sh og
// synk-matvaretabellen.mjs), aldri gjennom appen. Prisen som lagres er
// en TIDSSTEMPLET CACHE (synced_at) – ferske priser hentes live ved
// handleforslag. Kjøres nattlig av GitHub Actions
// (.github/workflows/synk-oda.yml) og ellers manuelt ved behov.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SITEMAP_URL = (n) => `https://oda.com/sitemap/nb/products/${n}.xml`;
const PRODUKT_URL = (id) => `https://oda.com/api/v1/products/${id}/`;
const HODER = {
  Accept: "application/json",
  "User-Agent": "petter-os-synk (personlig ukesplanlegger; lav frekvens)",
};
const PARALLELLE = 4; // skånsomt: ~10 kall/s totalt med keep-alive

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

const dbUrl = DRY_RUN ? null : lesDbUrl();
if (!DRY_RUN && !dbUrl) {
  console.error(
    "SUPABASE_DB_URL mangler i .env.local – hent Session pooler-URL fra " +
      "Supabase-dashboardet (Connect) og legg den inn.",
  );
  process.exit(1);
}

// --- 1. Enumerér alle produkt-id-er fra sitemapen ------------------------

console.log("Leser produkt-sitemaps …");
const ider = [];
for (let n = 1; ; n++) {
  const svar = await fetch(SITEMAP_URL(n), { headers: HODER });
  if (!svar.ok) {
    if (n === 1) {
      console.error(`Sitemap-nedlastingen feilet: ${svar.status}`);
      process.exit(1);
    }
    break;
  }
  const treff = [...(await svar.text()).matchAll(/\/products\/(\d+)-/g)];
  if (treff.length === 0) {
    break;
  }
  ider.push(...treff.map((m) => m[1]));
}
console.log(`${ider.length} produkter i kilden.`);

// --- 2. Hent produktdata (begrenset parallellitet, én retry) -------------

const antallAaHente = DRY_RUN ? 20 : ider.length;
const rader = [];
const feilede = [];
let neste = 0;
let hentet = 0;

async function hentProdukt(id, forsok = 1) {
  const svar = await fetch(PRODUKT_URL(id), { headers: HODER });
  if (svar.status === 404) {
    return null; // borte mellom sitemap og nå – arkiveres av steg 3
  }
  if (!svar.ok) {
    if (forsok < 2) {
      await new Promise((r) => setTimeout(r, 2000));
      return hentProdukt(id, forsok + 1);
    }
    throw new Error(`HTTP ${svar.status}`);
  }
  return svar.json();
}

function tilRad(p) {
  // gross_price/gross_unit_price er strenger i kilden («28.80»).
  const tall = (v) => (typeof v === "string" && v !== "" ? Number(v) : null);
  return {
    sourceId: String(p.id),
    name: p.name,
    brand: p.brand ?? null,
    nameExtra: p.name_extra || null,
    grossPrice: tall(p.gross_price),
    grossUnitPrice: tall(p.gross_unit_price),
    unitPriceUnit: p.unit_price_quantity_abbreviation ?? null,
    frontUrl: p.front_url ?? null,
    isAvailable: p.availability?.is_available !== false,
  };
}

async function arbeider() {
  while (neste < antallAaHente) {
    const id = ider[neste++];
    try {
      const produkt = await hentProdukt(id);
      if (produkt !== null && typeof produkt.name === "string") {
        rader.push(tilRad(produkt));
      }
    } catch (feil) {
      feilede.push(`${id} (${feil.message})`);
    }
    hentet++;
    if (hentet % 500 === 0) {
      console.log(`  ${hentet}/${antallAaHente} …`);
    }
  }
}

console.log(`Henter ${antallAaHente} produkter (${PARALLELLE} parallelle) …`);
const start = Date.now();
await Promise.all(Array.from({ length: PARALLELLE }, arbeider));
console.log(
  `${rader.length} produkter hentet på ${Math.round((Date.now() - start) / 1000)} s.`,
);
if (feilede.length > 0) {
  console.log(`Hoppet over ${feilede.length} som feilet:`);
  for (const linje of feilede.slice(0, 20)) {
    console.log(`  - ${linje}`);
  }
  // Feiler mer enn 5 %, avbrytes synken – ellers ville arkiveringssteget
  // feilaktig arkivert alt vi ikke fikk hentet.
  if (feilede.length > antallAaHente * 0.05) {
    console.error("For mange feil – ingenting skrevet til databasen.");
    process.exit(1);
  }
}

if (DRY_RUN) {
  console.log("Eksempelrad:", JSON.stringify(rader[0], null, 2));
  console.log("Dry-run: ingenting skrevet til databasen.");
  process.exit(0);
}

// --- 3. Skriv til databasen i én transaksjon -----------------------------

const deler = [
  "begin;",
  `create temp table tmp_oda_products (
  source_id        text primary key,
  name             text not null,
  brand            text,
  name_extra       text,
  gross_price      numeric,
  gross_unit_price numeric,
  unit_price_unit  text,
  front_url        text,
  is_available     boolean not null
) on commit drop;`,
];

const BUNT = 500;
for (let i = 0; i < rader.length; i += BUNT) {
  const verdier = rader
    .slice(i, i + BUNT)
    .map(
      (r) =>
        `(${q(r.sourceId)}, ${q(r.name)}, ${q(r.brand)}, ${q(r.nameExtra)}, ` +
        `${r.grossPrice ?? "null"}, ${r.grossUnitPrice ?? "null"}, ` +
        `${q(r.unitPriceUnit)}, ${q(r.frontUrl)}, ${r.isAvailable})`,
    )
    .join(",\n");
  deler.push(
    `insert into tmp_oda_products (source_id, name, brand, name_extra, gross_price, gross_unit_price, unit_price_unit, front_url, is_available) values\n${verdier};`,
  );
}

deler.push(`insert into public.oda_products
  (source_id, name, brand, name_extra, gross_price, gross_unit_price, unit_price_unit, front_url, is_available)
select source_id, name, brand, name_extra, gross_price, gross_unit_price, unit_price_unit, front_url, is_available
from tmp_oda_products
on conflict (source_id) do update set
  name             = excluded.name,
  brand            = excluded.brand,
  name_extra       = excluded.name_extra,
  gross_price      = excluded.gross_price,
  gross_unit_price = excluded.gross_unit_price,
  unit_price_unit  = excluded.unit_price_unit,
  front_url        = excluded.front_url,
  is_available     = excluded.is_available,
  synced_at        = now(),
  archived_at      = null;`);

deler.push(`update public.oda_products
   set archived_at = now()
 where archived_at is null
   and source_id not in (select source_id from tmp_oda_products);`);

deler.push("commit;");

deler.push(`select
  count(*) filter (where archived_at is null)     as aktive,
  count(*) filter (where archived_at is not null) as arkiverte
from public.oda_products;`);

const sqlFil = join(mkdtempSync(join(tmpdir(), "odasynk-")), "synk.sql");
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
