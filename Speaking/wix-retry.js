/*
  Resilience layer for the Lev Grading Wix Velo endpoints.
  Wix can occasionally return transient 5xx / WDE0055 responses.

  Read requests are safe to retry automatically. Session creation is handled
  differently because Wix Data can complete a write and then fail while
  returning/parsing the response. Repeating the POST blindly can therefore
  create duplicates or add unnecessary load during an outage.
*/
(() => {
  if (typeof speakingApiJson !== "function") return;

  const baseSpeakingApiJson = speakingApiJson;
  const READ_RETRY_DELAYS_MS = [650, 1400, 2600];
  const CREATE_RECOVERY_DELAYS_MS = [700, 1500, 3000, 5000];

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function errorMessage(error) {
    return String(error?.message || error || "Unknown server error");
  }

  function isTransientWixError(error) {
    const message = errorMessage(error);
    return /WDE0055|Service Unavailable|Internal Server Error|Server error\s+(?:408|425|429|500|502|503|504)\b|Failed to fetch|NetworkError|Load failed/i.test(message);
  }

  function requestMethod(options) {
    return String(options?.method || "GET").toUpperCase();
  }

  function readCreatePayload(options) {
    if (requestMethod(options) !== "POST") return null;
    if (typeof options?.body !== "string") return null;

    try {
      const payload = JSON.parse(options.body);
      return payload?.action === "create" && payload?.sessionId ? payload : null;
    } catch (_) {
      return null;
    }
  }

  function sessionLookupUrl(url, sessionId) {
    const lookupUrl = new URL(url, window.location.href);
    lookupUrl.search = "";
    lookupUrl.searchParams.set("sessionId", sessionId);
    return lookupUrl.toString();
  }

  async function recoverCreatedSession(url, options, { retries = false } = {}) {
    const payload = readCreatePayload(options);
    if (!payload) return null;

    const lookupUrl = sessionLookupUrl(url, payload.sessionId);
    const delays = retries ? CREATE_RECOVERY_DELAYS_MS : [0];

    for (let attempt = 0; attempt < delays.length; attempt += 1) {
      if (delays[attempt]) await wait(delays[attempt]);

      try {
        const data = await baseSpeakingApiJson(lookupUrl);
        if (data?.session) return data;
      } catch (error) {
        if (!isTransientWixError(error)) return null;
      }

      if (retries && typeof setSharedSessionStatus === "function" && attempt < delays.length - 1) {
        setSharedSessionStatus(
          `Wix did not confirm the create response. Checking whether the session was saved (${attempt + 1}/${delays.length})…`
        );
      }
    }

    return null;
  }

  async function retryRead(url, options) {
    let lastError = null;

    for (let attempt = 0; attempt <= READ_RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        return await baseSpeakingApiJson(url, options);
      } catch (error) {
        lastError = error;
        if (!isTransientWixError(error)) throw error;
        if (attempt >= READ_RETRY_DELAYS_MS.length) break;

        if (typeof setSharedSessionStatus === "function") {
          setSharedSessionStatus(
            `Wix is temporarily unavailable. Retrying (${attempt + 2}/${READ_RETRY_DELAYS_MS.length + 1})…`
          );
        }
        await wait(READ_RETRY_DELAYS_MS[attempt]);
      }
    }

    throw lastError || new Error("The Wix service is temporarily unavailable.");
  }

  speakingApiJson = async function resilientSpeakingApiJson(url, options = {}) {
    const createPayload = readCreatePayload(options);

    // GET/read operations are idempotent and safe to retry.
    if (!createPayload) {
      return retryRead(url, options);
    }

    // CREATE: send the write once. WDE0055 can mean Wix completed the write
    // but failed while returning/parsing the response, so do not spam POSTs.
    try {
      return await baseSpeakingApiJson(url, options);
    } catch (error) {
      if (!isTransientWixError(error)) {
        if (/already exists|duplicate|conflict/i.test(errorMessage(error))) {
          const recovered = await recoverCreatedSession(url, options);
          if (recovered) return recovered;
        }
        throw error;
      }

      if (typeof setSharedSessionStatus === "function") {
        setSharedSessionStatus("Wix returned a temporary server error. Checking whether the session was actually created…");
      }

      const recovered = await recoverCreatedSession(url, options, { retries: true });
      if (recovered) return recovered;

      const message = errorMessage(error);
      if (/WDE0055|500|502|503|504|Service Unavailable|Internal Server Error/i.test(message)) {
        throw new Error(
          "Wix Data is currently unavailable. The create request was sent once, but Wix could not confirm whether it was saved. Please try again after Wix recovers."
        );
      }
      throw error;
    }
  };
})();
