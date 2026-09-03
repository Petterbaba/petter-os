import { createHash, randomBytes } from "node:crypto";

// OAuth 2.1 mot Odas MCP-server (offisiell flate: oda.com/mcp beskytter
// seg med Bearer-token fra autorisasjonsserveren oda.com/o). Serveren
// støtter dynamisk klientregistrering, PKCE S256 og «public client»
// (token_endpoint_auth_method: none) – så appen trenger ingen hemmelighet
// fra Oda, bare å registrere seg med sin egen callback-URL. Metadataene
// hentes fra .well-known ved behov og caches i prosessen.

export const ODA_MCP_URL = "https://oda.com/mcp";
const METADATA_URL = "https://oda.com/.well-known/oauth-authorization-server";
const SCOPE = "mcp";

type Metadata = {
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint: string;
};

let metadataCache: Metadata | null = null;

async function hentMetadata(): Promise<Metadata> {
  if (metadataCache !== null) {
    return metadataCache;
  }
  const svar = await fetch(METADATA_URL, { cache: "no-store" });
  if (!svar.ok) {
    throw new Error(`Oda OAuth-metadata: ${svar.status}`);
  }
  const data = (await svar.json()) as Partial<Metadata>;
  if (
    typeof data.authorization_endpoint !== "string" ||
    typeof data.token_endpoint !== "string" ||
    typeof data.registration_endpoint !== "string"
  ) {
    throw new Error("Oda OAuth-metadata mangler endepunkter.");
  }
  metadataCache = {
    authorization_endpoint: data.authorization_endpoint,
    token_endpoint: data.token_endpoint,
    registration_endpoint: data.registration_endpoint,
  };
  return metadataCache;
}

// Dynamisk klientregistrering (RFC 7591). Én registrering per tilkobling
// er enkelt og nok: client_id følger tilkoblings-cookien.
export async function registrerOdaKlient(redirectUri: string): Promise<string> {
  const { registration_endpoint } = await hentMetadata();
  const svar = await fetch(registration_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "petter-os",
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: SCOPE,
    }),
  });
  if (!svar.ok) {
    throw new Error(`Oda klientregistrering: ${svar.status}`);
  }
  const data = (await svar.json()) as { client_id?: unknown };
  if (typeof data.client_id !== "string") {
    throw new Error("Oda klientregistrering ga ingen client_id.");
  }
  return data.client_id;
}

export function lagPkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function lagState(): string {
  return randomBytes(16).toString("base64url");
}

export async function byggOdaAutorisasjonsUrl({
  clientId,
  redirectUri,
  state,
  challenge,
}: {
  clientId: string;
  redirectUri: string;
  state: string;
  challenge: string;
}): Promise<string> {
  const { authorization_endpoint } = await hentMetadata();
  const url = new URL(authorization_endpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  // RFC 8707: tokenet skal være bundet til MCP-serveren.
  url.searchParams.set("resource", ODA_MCP_URL);
  return url.toString();
}

export type OdaTokenSvar = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
};

async function tokenKall(felter: Record<string, string>): Promise<OdaTokenSvar> {
  const { token_endpoint } = await hentMetadata();
  const svar = await fetch(token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...felter, resource: ODA_MCP_URL }),
  });
  if (!svar.ok) {
    throw new Error(`Oda token: ${svar.status}`);
  }
  const data = (await svar.json()) as {
    access_token?: unknown;
    refresh_token?: unknown;
    expires_in?: unknown;
  };
  if (typeof data.access_token !== "string") {
    throw new Error("Oda token-svar mangler access_token.");
  }
  const levetid = typeof data.expires_in === "number" ? data.expires_in : 3600;
  return {
    accessToken: data.access_token,
    refreshToken: typeof data.refresh_token === "string" ? data.refresh_token : null,
    expiresAt: Date.now() + levetid * 1000,
  };
}

export function hentOdaToken({
  clientId,
  code,
  verifier,
  redirectUri,
}: {
  clientId: string;
  code: string;
  verifier: string;
  redirectUri: string;
}): Promise<OdaTokenSvar> {
  return tokenKall({
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    code_verifier: verifier,
    redirect_uri: redirectUri,
  });
}

export function fornyOdaToken({
  clientId,
  refreshToken,
}: {
  clientId: string;
  refreshToken: string;
}): Promise<OdaTokenSvar> {
  return tokenKall({
    grant_type: "refresh_token",
    client_id: clientId,
    refresh_token: refreshToken,
  });
}
