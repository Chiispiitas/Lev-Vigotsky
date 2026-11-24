import type { APIRoute } from "astro";
import { createSubmitHandler } from "../../../http.mjs";
import { store } from "../../../wix-store.mjs";
import keys from "../../../generated/keys.json";
import rosters from "../../../homework-rosters.private.json";
import { createHomeworkNameValidator } from "../../../homework-identity.mjs";

export const prerender = false;
const handler = createSubmitHandler(keys, store, createHomeworkNameValidator(rosters));
export const ALL: APIRoute = ({ request }) => handler(request);
