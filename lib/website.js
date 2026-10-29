// Reads a client's public website as plain text for the Purpose–Market
// Alignment section. Built to be cheap and safe:
//   - Only public http(s) addresses; private/internal networks are refused
//     (prevents the server being used to probe internal systems).
//   - Homepage plus at most two "about"/"services" pages on the same site.
//   - HTML is reduced to visible text and capped, so token use stays small.
//   - Results are cached per site for a short time on each server instance.

import dns from "node:dns/promises";
import net from "node:net";

const FETCH_TIMEOUT_MS = 6000;
const MAX_BYTES = 1_500_000;        // per page, before text extraction
const MAX_REDIRECTS = 3;
const MAX_EXTRA_PAGES = 2;
const MAX_CHARS_PER_PAGE = 6000;
const MAX_TOTAL_CHARS = 14000;      // ≈ 3,500 tokens
const MIN_USEFUL_CHARS = 300;
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const cache = new Map();

const EXTRA_PAGE_PATTERNS = [
  /about/i, /who-?we-?are/i, /our-?story/i, /services?/i, /what-?we-?do/i, /how-?we-?work/i, /solutions/i,
];

// ─── URL safety ──────────────────────────────────────────────────────────────

export function normaliseUrl(input) {
  if (typeof input !== "string") return null;
  let s = input.trim();
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = `https://${s}`;
  let u;
  try { u = new URL(s); } catch { return null; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (u.username || u.password) return null;
  if (u.port && u.port !== "80" && u.port !== "443") return null;
  const host = u.hostname.toLowerCase();
  if (!host.includes(".") || host.endsWith(".local") || host.endsWith(".internal") || host === "localhost") return null;
  u.hash = "";
  return u;
}

function ipv4ToInt(ip) {
  return ip.split(".").reduce((a, o) => (a << 8) + Number(o), 0) >>> 0;
}

function inV4(ip, cidr) {
  const [base, bits] = cidr.split("/");
  const mask = bits === "0" ? 0 : (~0 << (32 - Number(bits))) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
}

const V4_BLOCKED = [
  "0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16",
  "172.16.0.0/12", "192.0.0.0/24", "192.0.2.0/24", "192.168.0.0/16", "198.18.0.0/15",
  "198.51.100.0/24", "203.0.113.0/24", "224.0.0.0/4", "240.0.0.0/4",
];

export function isPublicIp(ip) {
  if (net.isIPv4(ip)) return !V4_BLOCKED.some(c => inV4(ip, c));
  if (net.isIPv6(ip)) {
    const x = ip.toLowerCase();
    const mapped = x.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPublicIp(mapped[1]);
    if (x === "::" || x === "::1") return false;
    if (/^f[cd]/.test(x)) return false;          // unique local fc00::/7
    if (/^fe[89ab]/.test(x)) return false;       // link-local fe80::/10
    if (/^ff/.test(x)) return false;             // multicast
    if (x.startsWith("2001:db8")) return false;  // documentation
    return true;
  }
  return false;
}

async function assertPublicHost(hostname) {
  if (net.isIP(hostname)) {
    if (!isPublicIp(hostname)) throw new Error("Address not allowed");
    return;
  }
  const addrs = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!addrs.length || addrs.some(a => !isPublicIp(a.address))) throw new Error("Address not allowed");
}

// ─── Fetching ────────────────────────────────────────────────────────────────

async function fetchPage(url) {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(current.hostname);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    let res;
    try {
      res = await fetch(current.href, {
        redirect: "manual",
        signal: ctrl.signal,
        headers: {
          "User-Agent": "JKA-OrgClarityDiagnostic/1.0 (+https://jameskilbyadvisory.com.au)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new Error("Redirect without location");
      const next = normaliseUrl(new URL(loc, current).href);
      if (!next) throw new Error("Redirect to a disallowed address");
      current = next;
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const type = res.headers.get("content-type") || "";
    if (!/html/i.test(type)) throw new Error("Not an HTML page");

    const reader = res.body?.getReader();
    if (!reader) return { url: current, html: await res.text() };
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); break; }
      chunks.push(value);
    }
    const html = new TextDecoder("utf-8").decode(Buffer.concat(chunks.map(c => Buffer.from(c))));
    return { url: current, html };
  }
  throw new Error("Too many redirects");
}

// ─── Text extraction ─────────────────────────────────────────────────────────

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…", copy: "©" };

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : " ";
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? decodeEntities(m[2] ?? m[3] ?? m[4] ?? "") : "";
}

export function extractText(html) {
  const title = decodeEntities((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim());
  const metaTag = html.match(/<meta[^>]+name\s*=\s*["']description["'][^>]*>/i)?.[0]
    || html.match(/<meta[^>]+property\s*=\s*["']og:description["'][^>]*>/i)?.[0] || "";
  const description = metaTag ? attr(metaTag, "content").trim() : "";

  let body = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template|iframe|canvas|form|select)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(nav|footer)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/section|\/article|\/tr)\b[^>]*>/gi, "\n")
    .replace(/<h([1-6])\b[^>]*>/gi, "\n## ")
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<[^>]+>/g, " ");
  body = decodeEntities(body)
    .replace(/[ \t\f\v ]+/g, " ")
    .split("\n").map(l => l.trim()).filter(Boolean);

  // Drop exact duplicate lines (repeated menus, responsive duplicates).
  const seen = new Set();
  const lines = [];
  for (const l of body) {
    const k = l.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    lines.push(l);
  }
  return { title, description, text: lines.join("\n") };
}

export function findExtraPages(html, baseUrl) {
  const found = [];
  const seen = new Set([baseUrl.pathname.replace(/\/$/, "") || "/"]);
  const anchors = html.match(/<a\b[^>]*>/gi) || [];
  for (const tag of anchors) {
    const href = attr(tag, "href");
    if (!href || href.startsWith("#") || /^(mailto|tel|javascript):/i.test(href)) continue;
    let u;
    try { u = new URL(href, baseUrl); } catch { continue; }
    if (u.hostname.replace(/^www\./, "") !== baseUrl.hostname.replace(/^www\./, "")) continue;
    if (/\.(pdf|jpe?g|png|gif|webp|svg|zip|docx?)$/i.test(u.pathname)) continue;
    const path = u.pathname.replace(/\/$/, "") || "/";
    if (seen.has(path)) continue;
    const rank = EXTRA_PAGE_PATTERNS.findIndex(p => p.test(path));
    if (rank === -1) continue;
    seen.add(path);
    u.hash = ""; u.search = "";
    found.push({ url: u, rank });
  }
  found.sort((a, b) => a.rank - b.rank);
  // Prefer one "about"-type page and one "services"-type page.
  const about = found.find(f => f.rank <= 2);
  const services = found.find(f => f.rank >= 3);
  return [about, services].filter(Boolean).concat(found).filter((f, i, arr) => arr.indexOf(f) === i)
    .slice(0, MAX_EXTRA_PAGES).map(f => f.url);
}

/**
 * Returns { url, pages: [{url, title}], content } or { url, error }.
 * Never throws — website problems must not break the diagnostic.
 */
export async function readWebsite(input) {
  const url = normaliseUrl(input);
  if (!url) return { url: String(input || ""), error: "That doesn't look like a public website address." };

  const key = url.hostname.replace(/^www\./, "") + url.pathname.replace(/\/$/, "");
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  let value;
  try {
    const home = await fetchPage(url);
    const homeText = extractText(home.html);
    const extras = await Promise.allSettled(findExtraPages(home.html, home.url).map(fetchPage));

    const pages = [{ url: home.url.href, ...homeText }];
    for (const r of extras) if (r.status === "fulfilled") pages.push({ url: r.value.url.href, ...extractText(r.value.html) });

    let budget = MAX_TOTAL_CHARS;
    const parts = [];
    for (const p of pages) {
      if (budget <= 0) break;
      const head = `PAGE: ${p.url}\nTITLE: ${p.title}\n${p.description ? `DESCRIPTION: ${p.description}\n` : ""}`;
      const body = p.text.slice(0, Math.min(MAX_CHARS_PER_PAGE, Math.max(0, budget - head.length)));
      parts.push(head + body);
      budget -= head.length + body.length;
    }
    const content = parts.join("\n\n---\n\n");
    const visible = pages.reduce((n, p) => n + p.text.length + p.description.length, 0);

    value = visible < MIN_USEFUL_CHARS
      ? { url: url.href, pages: pages.map(p => ({ url: p.url, title: p.title })), error: "The website didn't return enough readable text to analyse." }
      : { url: url.href, pages: pages.map(p => ({ url: p.url, title: p.title })), content };
  } catch (err) {
    value = { url: url.href, error: "The website couldn't be read." , detail: String(err?.message || err) };
  }

  if (!value.error || /enough readable/.test(value.error)) {
    cache.set(key, { at: Date.now(), value });
    if (cache.size > 500) cache.delete(cache.keys().next().value);
  }
  return value;
}
