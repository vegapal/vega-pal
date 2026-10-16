import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { recordFirstPartyVisit } from "../src/lib/analytics/first-party-visits.ts";

class Storage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
  clear() { this.values.clear(); }
}
const RealDate = Date;
let now = RealDate.parse("2026-10-16T15:00:00Z");
globalThis.Date = class extends RealDate {
  constructor(...args) { super(...(args.length ? args : [now])); }
  static now() { return now; }
};
const sent = [];
let fetchResult = async () => ({ ok: true });
globalThis.fetch = async (url, options) => {
  sent.push({ url, options, body: JSON.parse(options.body) });
  return fetchResult();
};
await recordFirstPartyVisit("/");
assert.equal(sent.length, 0, "SSR does not collect");
globalThis.window = { location: { origin: "https://vega-pal.com" } };
globalThis.document = { referrer: "" };
Object.defineProperty(globalThis, "navigator", { value: {}, configurable: true });
Object.defineProperty(globalThis, "crypto", { value: { randomUUID }, configurable: true });
globalThis.localStorage = new Storage();
globalThis.sessionStorage = new Storage();

for (const path of ["/pay/private-id", "/invoices/private-id", "/admin", "/api/auth/login", "/login", "/register", "/private@example.com", "/tools/private-id", "/learn/private-id", "/?email=private@example.com"]) {
  await recordFirstPartyVisit(path);
}
assert.equal(sent.length, 0, "private, auth, unknown, and query-bearing URLs are excluded");
assert.equal(localStorage.values.size, 0, "excluded pages create no identifier");
navigator.doNotTrack = "1";
await recordFirstPartyVisit("/");
assert.equal(sent.length, 0, "DNT opts out");
navigator.doNotTrack = "0";
navigator.globalPrivacyControl = true;
await recordFirstPartyVisit("/");
assert.equal(sent.length, 0, "GPC opts out");
navigator.globalPrivacyControl = false;
document.referrer = "https://www.google.com/search?q=private%40example.com";
await recordFirstPartyVisit("/invoice-generator/");
assert.equal(sent.length, 1);
assert.equal(sent[0].body.path, "/invoice-generator");
assert.equal(sent[0].body.source, "search");
assert.deepEqual(Object.keys(sent[0].body).sort(), ["path", "sessionId", "source", "visitorId"]);
assert.equal(sent[0].options.credentials, "omit");
assert.equal(sent[0].options.referrerPolicy, "no-referrer");
assert.ok(!sent[0].options.body.includes("private"), "no raw query or referrer leaves the browser");
const firstVisitor = sent[0].body.visitorId;
await recordFirstPartyVisit("/about");
assert.equal(sent.length, 1, "successful session deduplicates across public routes");

sessionStorage.clear();
let finish;
fetchResult = () => new Promise((resolve) => { finish = resolve; });
const pending = recordFirstPartyVisit("/");
await recordFirstPartyVisit("/about");
assert.equal(sent.length, 2, "concurrent navigations share one pending visit");
finish({ ok: true });
await pending;
assert.equal(sent[1].body.visitorId, firstVisitor, "new session retains unexpired browser identifier");

sessionStorage.clear();
fetchResult = async () => ({ ok: false });
await recordFirstPartyVisit("/");
assert.equal(sent.length, 3);
fetchResult = async () => ({ ok: true });
await recordFirstPartyVisit("/about");
assert.equal(sent.length, 4, "failed request can retry on next public navigation");
await recordFirstPartyVisit("/tools");
assert.equal(sent.length, 4, "successful retry marks the session");

now += 24 * 60 * 60 * 1000;
await recordFirstPartyVisit("/");
assert.equal(sent.length, 5, "same browser session can count once on next UTC day");
assert.equal(sent[4].body.visitorId, firstVisitor);
now += 30 * 24 * 60 * 60 * 1000;
await recordFirstPartyVisit("/");
assert.equal(sent.length, 6);
assert.notEqual(sent[5].body.visitorId, firstVisitor, "expired browser identifier rotates");

sessionStorage.clear();
globalThis.localStorage = { getItem() { throw new Error("blocked"); }, removeItem() {} };
await recordFirstPartyVisit("/");
assert.equal(sent.length, 6, "blocked storage skips collection");
console.log("PASS: SSR, public allowlist, DNT/GPC, no query/referrer/cookies, session/day deduplication, concurrency, failed-navigation retry, 30-day rotation, blocked storage.");
