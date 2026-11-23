import type { APIRoute } from "astro";
import { createSubmitHandler } from "../../../http.mjs";
import { store } from "../../../wix-store.mjs";
import keys from "../../../generated/keys.json";

export const prerender = false;
const handler = createSubmitHandler(keys, store);
export const ALL: APIRoute = ({ request }) => handler(request);
