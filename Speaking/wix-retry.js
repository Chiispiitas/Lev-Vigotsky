/*
  Resilience layer for the Lev Grading Wix Velo endpoints.
  Wix can occasionally return transient 502/503/504 or WDE0055 responses.
  Keep the existing API behavior, but retry those temporary failures before
  surfacing an error to the teacher.
*/
(() => {
  if (typeof speakingApiJson !== "function") return;

  const baseSpeakingApiJson = speakingApiJson;
  const RETRY_DELAYS_MS = [650, 1400, 2600];

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function errorMessage(error) {
    return String(error?.message || error || "Unknown server error");
  }

  function isTransientWixError(error) {
    const message = errorMessage(error);
    return /WDE0055|Service Unavailable|Server error\s+(?:408|425|429|500|502|503|504)\b|Failed to fetch|NetworkError|Load failed/i.test(message);
  }

  function readCreatePayload(options) {
    if (String(options?.method || "GET").toUpperCase() !== "POST") return null;
    if (typeof options?.body !== "string") return null;

    try {
      const payload = JSON.parse(options.body);
      return payload?.action === "create" && payload?.sessionId ? payload : null;
    } catch (_) {
      return null;
    }
  }

  async function recoverCreatedSession(url, options) {
    const payload = readCreatePayload(options);
    if (!payload) return null;

    try {
      const lookupUrl = new URL(url, window.location.href);
      lookupUrl.search = "";
      lookupUrl.searchParams.set("sessionId", payload.sessionId);
      const data = await baseSpeakingApiJson(lookupUrl.toString());
      return data?.session ? data : null;
    } catch (_) {
      return null;
    }
  }

  speakingApiJson = async function resilientSpeakingApiJson(url, options = {}) {
    let lastError = null;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        return await baseSpeakingApiJson(url, options);
      } catch (error) {
        lastError = error;

        if (!isTransientWixError(error)) {
          // A retried create may have succeeded on Wix even if its response was
          // lost. If Wix now reports a duplicate/conflict, recover that session.
          if (/already exists|duplicate|conflict/i.test(errorMessage(error))) {
            const recovered = await recoverCreatedSession(url, options);
            if (recovered) return recovered;
          }
          throw error;
        }

        if (attempt >= RETRY_DELAYS_MS.length) break;

        if (typeof setSharedSessionStatus === "function") {
          setSharedSessionStatus(
            `Wix is temporarily unavailable. Retrying (${attempt + 2}/${RETRY_DELAYS_MS.length + 1})…`
          );
        }
        await wait(RETRY_DELAYS_MS[attempt]);
      }
    }

    // A POST may have reached Wix before the 503 response was generated.
    // Check the deterministic session ID before declaring the create failed.
    const recovered = await recoverCreatedSession(url, options);
    if (recovered) return recovered;

    const message = errorMessage(lastError);
    if (/WDE0055|503|Service Unavailable/i.test(message)) {
      throw new Error("Wix is temporarily unavailable (503) after automatic retries. Please try creating the session again.");
    }
    throw lastError || new Error("The Wix service is temporarily unavailable.");
  };
})();
