import type { APIRoute } from "astro";
import { healthResponse } from "../../../http.mjs";
import { checkCms } from "../../../wix-store.mjs";
import keys from "../../../generated/keys.json";

export const prerender = false;
export const GET: APIRoute = async ({ request }) => {
  try {
    return healthResponse(request, keys, await checkCms());
  } catch (error) {
    console.error("UEPLV practice CMS check failed", error instanceof Error ? error.name : "Error");
    return healthResponse(request, keys, false);
  }
};
