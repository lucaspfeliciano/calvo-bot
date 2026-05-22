import { TORUGO_FALLBACK_QUERIES, TORUGO_URL } from "../config";

export function pickTorugoQuery(): string {
  for (const candidate of TORUGO_FALLBACK_QUERIES) {
    if (candidate) return candidate;
  }
  return TORUGO_URL;
}
