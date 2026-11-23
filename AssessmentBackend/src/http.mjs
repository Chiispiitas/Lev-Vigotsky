import { createHash } from "node:crypto";
import { AttemptError, submitAttempt } from "./practice.mjs";

const origins = new Set(["https://ueplv.com", "https://www.ueplv.com", "https://chiispiitas.github.io"]);
const BODY_LIMIT = 48 * 1024;

function headersFor(request) {
  const origin = request.headers.get("Origin");
  const headers = {
    "Cache-Control": "no-store",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff"
  };
  if (origins.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
  }
  return headers;
}

function json(request, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headersFor(request), "Content-Type": "application/json; charset=utf-8" }
  });
}

async function readJson(request) {
  if (request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new AttemptError(415, "Submit the attempt as JSON.");
  }
  if (Number(request.headers.get("Content-Length")) > BODY_LIMIT) {
    throw new AttemptError(413, "The submission is too large.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new AttemptError(400, "Supply a practice attempt.");
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > BODY_LIMIT) {
      await reader.cancel();
      throw new AttemptError(413, "The submission is too large.");
    }
    body += decoder.decode(value, { stream: true });
  }
  try {
    return JSON.parse(body + decoder.decode());
  } catch {
    throw new AttemptError(400, "The submission is not valid JSON.");
  }
}

export function createSubmitHandler(keys, store) {
  return async request => {
    if (!origins.has(request.headers.get("Origin"))) {
      return json(request, { error: "Open the practice on the UEPLV website." }, 403);
    }
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headersFor(request) });
    if (request.method !== "POST") {
      return json(request, { error: "Use POST to submit the attempt." }, 405);
    }
    try {
      return json(request, await submitAttempt(await readJson(request), keys, store));
    } catch (error) {
      if (error instanceof AttemptError) return json(request, { error: error.message }, error.status);
      console.error("UEPLV practice CMS write failed", error?.code ?? error?.name ?? "Error");
      return json(request, { error: "Your attempt could not be saved. Please retry." }, 503);
    }
  };
}

export function healthResponse(request, keys, cmsReady) {
  const ready = cmsReady && Object.keys(keys).length > 0;
  return json(request, {
    service: "UEPLV English Practice",
    ready,
    keyDigest: createHash("sha256").update(JSON.stringify(keys)).digest("hex"),
    releases: Object.fromEntries(Object.entries(keys).map(([version, exams]) => [version, Object.keys(exams)]))
  }, ready ? 200 : 503);
}
