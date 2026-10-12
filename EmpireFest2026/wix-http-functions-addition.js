// Append to the existing backend/http-functions.js. Do not replace its contents.
import {
  post_empireFest2026 as ef2026Post,
  options_empireFest2026 as ef2026Options
} from 'backend/empire-fest-2026';

export function post_empireFest2026(request) {
  return ef2026Post(request);
}
export function options_empireFest2026(request) {
  return ef2026Options(request);
}
