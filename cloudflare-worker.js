// Cloudflare Worker for yugantpooja.com
// - /rsvp/...  -> served from GitHub Pages (yugantjoshi.github.io/baby-shower/rsvp/...)
// - everything else -> served from the published Canva site
// Visitors always stay on yugantpooja.com.

const CANVA_ORIGIN = "https://emu-kk2w78.my.canva.site";
const CANVA_HOME = "/baby-shower-website";
const GITHUB_ORIGIN = "https://yugantjoshi.github.io";
const GITHUB_BASE = "/baby-shower";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Send www to the bare domain
    if (url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }

    // RSVP page from GitHub Pages
    if (url.pathname === "/rsvp") {
      return Response.redirect(url.origin + "/rsvp/" + url.search, 301);
    }
    if (url.pathname.startsWith("/rsvp/")) {
      return proxy(request, GITHUB_ORIGIN + GITHUB_BASE + url.pathname + url.search, url.origin);
    }

    // Everything else from Canva
    const path = url.pathname === "/" ? CANVA_HOME : url.pathname;
    return proxy(request, CANVA_ORIGIN + path + url.search, url.origin);
  },
};

async function proxy(request, target, ourOrigin) {
  const upstream = await fetch(target, {
    method: request.method,
    headers: request.headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
    redirect: "manual",
  });

  const headers = new Headers(upstream.headers);

  // Keep redirects on our own domain
  const loc = headers.get("Location");
  if (loc) {
    const l = new URL(loc, target);
    if (l.origin === CANVA_ORIGIN) {
      headers.set("Location", ourOrigin + (l.pathname === CANVA_HOME || l.pathname === CANVA_HOME + "/" ? "/" : l.pathname) + l.search);
    } else if (l.origin === GITHUB_ORIGIN && l.pathname.startsWith(GITHUB_BASE)) {
      headers.set("Location", ourOrigin + l.pathname.slice(GITHUB_BASE.length) + l.search);
    }
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}
