import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { cookies } from "next/headers";

// Oda-tilkoblingen (OAuth-tokens mot Odas MCP-server) bor i en KRYPTERT
// httpOnly-cookie i brukerens nettleser – aldri i databasen. Repoet er
// offentlig og appen skal ikke sitte på Oda-legitimasjon sentralt; en
// tilkobling gjelder derfor per nettleser (koble til på nytt på ny
// maskin, som tema-cookien). Nøkkelen avledes av ODA_COOKIE_SECRET i
// .env.local (AES-256-GCM: iv | tag | chiffertekst, base64url).

export const ODA_COOKIE = "oda_tilkobling";
export const ODA_FLYT_COOKIE = "oda_flyt";
const TRETTI_DAGER_SEKUNDER = 60 * 60 * 24 * 30;
const TI_MINUTTER_SEKUNDER = 60 * 10;

export type OdaTilkobling = {
  clientId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number; // epoch-millisekunder
};

// Mellomlagring under selve OAuth-flyten (state + PKCE-verifier).
export type OdaFlyt = {
  state: string;
  verifier: string;
  clientId: string;
  redirectUri: string;
};

export class OdaKonfigMangler extends Error {
  constructor() {
    super("ODA_COOKIE_SECRET mangler eller er for kort (min. 32 tegn) i .env.local.");
  }
}

function nokkel(): Buffer {
  const hemmelighet = process.env.ODA_COOKIE_SECRET;
  if (!hemmelighet || hemmelighet.length < 32) {
    throw new OdaKonfigMangler();
  }
  return createHash("sha256").update(hemmelighet).digest();
}

function krypter(data: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", nokkel(), iv);
  const kryptert = Buffer.concat([
    cipher.update(JSON.stringify(data), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), kryptert]).toString("base64url");
}

// null ved manglende nøkkel, tukling eller gammel nøkkel – da regnes
// brukeren som ikke tilkoblet og må koble til på nytt.
function dekrypter<T>(verdi: string): T | null {
  try {
    const buf = Buffer.from(verdi, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", nokkel(), buf.subarray(0, 12));
    decipher.setAuthTag(buf.subarray(12, 28));
    const klar = Buffer.concat([
      decipher.update(buf.subarray(28)),
      decipher.final(),
    ]).toString("utf8");
    return JSON.parse(klar) as T;
  } catch {
    return null;
  }
}

function cookieValg(maxAge: number) {
  return {
    path: "/",
    maxAge,
    httpOnly: true,
    sameSite: "lax" as const, // lax: cookien må følge GET-redirecten tilbake fra Oda
    secure: process.env.NODE_ENV === "production",
  };
}

export async function lesOdaTilkobling(): Promise<OdaTilkobling | null> {
  const verdi = (await cookies()).get(ODA_COOKIE)?.value;
  return verdi === undefined ? null : dekrypter<OdaTilkobling>(verdi);
}

export async function lagreOdaTilkobling(tilkobling: OdaTilkobling): Promise<void> {
  (await cookies()).set(ODA_COOKIE, krypter(tilkobling), cookieValg(TRETTI_DAGER_SEKUNDER));
}

export async function slettOdaTilkobling(): Promise<void> {
  (await cookies()).delete(ODA_COOKIE);
}

export async function lesOdaFlyt(): Promise<OdaFlyt | null> {
  const verdi = (await cookies()).get(ODA_FLYT_COOKIE)?.value;
  return verdi === undefined ? null : dekrypter<OdaFlyt>(verdi);
}

export async function lagreOdaFlyt(flyt: OdaFlyt): Promise<void> {
  (await cookies()).set(ODA_FLYT_COOKIE, krypter(flyt), cookieValg(TI_MINUTTER_SEKUNDER));
}

export async function slettOdaFlyt(): Promise<void> {
  (await cookies()).delete(ODA_FLYT_COOKIE);
}
