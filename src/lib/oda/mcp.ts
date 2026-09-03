import { ODA_MCP_URL } from "./oauth";

// Minimal MCP-klient (Streamable HTTP, JSON-RPC 2.0) mot Odas server –
// kun det kurv-knappen trenger: initialize → initialized → tools/call.
// Svar kan komme som ren JSON eller som SSE (text/event-stream) på samme
// POST; begge håndteres. Ingen avhengighet: protokollen er tre requests.

export class OdaIkkeAutorisert extends Error {
  constructor() {
    super("Oda avviste tokenet (401).");
  }
}

type JsonRpcSvar = {
  id?: number | string;
  result?: unknown;
  error?: { code: number; message: string };
};

const PROTOKOLLVERSJON = "2025-06-18";

function parseSse(tekst: string, id: number): JsonRpcSvar | null {
  let siste: JsonRpcSvar | null = null;
  for (const hendelse of tekst.split(/\n\n+/)) {
    const data = hendelse
      .split("\n")
      .filter((linje) => linje.startsWith("data:"))
      .map((linje) => linje.slice(5).trim())
      .join("\n");
    if (data === "") {
      continue;
    }
    try {
      const melding = JSON.parse(data) as JsonRpcSvar;
      if (melding.id === id) {
        return melding;
      }
      siste = melding;
    } catch {
      // Ikke-JSON-hendelser (keep-alive o.l.) ignoreres.
    }
  }
  return siste;
}

async function post(
  token: string,
  body: object,
  sessionId: string | null,
  id: number | null,
): Promise<{ svar: JsonRpcSvar | null; sessionId: string | null }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "MCP-Protocol-Version": PROTOKOLLVERSJON,
  };
  if (sessionId !== null) {
    headers["Mcp-Session-Id"] = sessionId;
  }
  const respons = await fetch(ODA_MCP_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (respons.status === 401) {
    throw new OdaIkkeAutorisert();
  }
  if (!respons.ok) {
    throw new Error(`Oda MCP: ${respons.status}`);
  }
  const nySession = respons.headers.get("mcp-session-id") ?? sessionId;
  if (id === null || respons.status === 202) {
    return { svar: null, sessionId: nySession };
  }
  const type = respons.headers.get("content-type") ?? "";
  const tekst = await respons.text();
  const svar = type.includes("text/event-stream")
    ? parseSse(tekst, id)
    : (JSON.parse(tekst) as JsonRpcSvar);
  return { svar, sessionId: nySession };
}

type VerktoyResultat = {
  content?: { type: string; text?: string }[];
  structuredContent?: unknown;
  isError?: boolean;
};

// Kaller ett MCP-verktøy og returnerer resultatet – structuredContent når
// serveren gir det, ellers tekstinnholdet parset som JSON (Odas verktøy
// svarer med JSON i tekstfeltet), ellers råteksten.
export async function kallOdaVerktoy(
  token: string,
  navn: string,
  argumenter: Record<string, unknown>,
): Promise<unknown> {
  const init = await post(
    token,
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: PROTOKOLLVERSJON,
        capabilities: {},
        clientInfo: { name: "petter-os", version: "0.1.0" },
      },
    },
    null,
    1,
  );
  if (init.svar?.error) {
    throw new Error(`Oda MCP initialize: ${init.svar.error.message}`);
  }
  const sessionId = init.sessionId;

  await post(
    token,
    { jsonrpc: "2.0", method: "notifications/initialized" },
    sessionId,
    null,
  );

  const { svar } = await post(
    token,
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: navn, arguments: argumenter },
    },
    sessionId,
    2,
  );
  if (svar === null) {
    throw new Error(`Oda MCP: tomt svar fra ${navn}.`);
  }
  if (svar.error) {
    throw new Error(`Oda MCP ${navn}: ${svar.error.message}`);
  }
  const resultat = (svar.result ?? {}) as VerktoyResultat;
  const tekst = (resultat.content ?? [])
    .filter((del) => del.type === "text" && typeof del.text === "string")
    .map((del) => del.text)
    .join("\n");
  if (resultat.isError) {
    throw new Error(`Oda MCP ${navn}: ${tekst || "verktøyet feilet"}`);
  }
  if (resultat.structuredContent !== undefined) {
    return resultat.structuredContent;
  }
  try {
    return JSON.parse(tekst);
  } catch {
    return tekst;
  }
}
