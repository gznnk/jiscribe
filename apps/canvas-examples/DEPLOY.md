# Deploying the examples gallery (examples.jiscribe.dev)

The gallery is served from Cloudflare Pages (project `jiscribe-examples`) as the
static Vite build in `apps/canvas-examples/dist`. Selection lives in the URL
hash, so there is no server-side routing to configure and no `_redirects` file.
`public/404.html` is required — see below.

> Maintainer-only. Deploying needs write access to the Jiscribe Cloudflare
> account; a fork can still run the same commands against its own Pages project
> by changing `--project-name`.

## Why 404.html is required

Without a `404.html`, Pages answers any path that does not exist with
`index.html` and a **200**. Combined with the caching `_headers` puts on
`/assets/*`, that becomes a delivery incident.

When a browser asks an edge node that has not yet received the new assets, the
`index.html` it gets back is stored under that asset URL — by both the edge and
the browser — as a fresh response. The URL then keeps serving HTML and the app
dies with `Failed to load module script: ... MIME type of "text/html"` until the
entry goes stale, which is a day here and was a year while `/assets/*` was
`immutable`.

With a `404.html` in place, Pages answers 404, **skips `_headers` and forces
`cache-control: no-store`** (measured 2026-08-05 on app.jiscribe.dev). Assets
that do exist keep their caching, so nothing is lost.

If it happens anyway: Cloudflare dashboard → Caching → Configuration → Purge
Everything for the edge, and DevTools → Application → Clear site data for the
browser.

## First time only

```bash
pnpm dlx wrangler login   # authenticates Cloudflare in the browser

# wrangler 4 no longer creates the project on the first deploy — it errors with
# "The Pages project ... does not exist". Create it up front:
pnpm dlx wrangler pages project create jiscribe-examples --production-branch=main
```

## Deploying

```bash
# builds, then uploads — run from the repository root
pnpm --filter canvas-examples run deploy
```

`deploy` runs `build` first, so a stale `dist/` can never be published by
mistake. Note that `deploy` collides with pnpm's own built-in command, hence the
`run`.

To do it by hand:

```bash
pnpm build:examples

pnpm dlx wrangler pages deploy apps/canvas-examples/dist \
  --project-name=jiscribe-examples \
  --branch=main
```

> Check that Pages → Settings → Production branch is `main`; a custom domain
> serves the production deployment only.

The gallery has been live on `https://jiscribe-examples.pages.dev` since
2026-08-15; `examples.jiscribe.dev` is attached in the dashboard step below.

## Verifying

```bash
curl -sI https://examples.jiscribe.dev/ | grep -iE "content-type|cache-control"
# asset caching (substitute a real file name from dist/assets/)
curl -sI https://examples.jiscribe.dev/assets/index-XXXX.css | grep -i cache-control
# a missing path must not be cached — use a fresh random path every time, since
# the edge caches whatever it answered for a path you already probed
curl -sI https://examples.jiscribe.dev/assets/probe-$RANDOM.js | grep -iE "^HTTP|cache-control"
```

Expected, from `public/_headers`:

- `/assets/*` → `cache-control: public, max-age=86400, must-revalidate`
- everything else → `cache-control: public, max-age=0, must-revalidate`
- a path that does not exist → `HTTP/2 404` with `cache-control: no-store`
  (`_headers` is not applied)

## Preview deployments

To look at an unmerged branch on a real device, deploy to the same Pages project
under **any branch name other than the production one**. Production
(`main` → examples.jiscribe.dev) is untouched.

```bash
pnpm build:examples && pnpm dlx wrangler pages deploy apps/canvas-examples/dist \
  --project-name=jiscribe-examples \
  --branch=touch-verify
```

- The alias URL is `https://<branch>.jiscribe-examples.pages.dev`, plus a unique
  per-deployment URL
- Redeploying with the same `--branch` updates that same alias
- The build comes from the local working tree, committed or not
- Clean up from Cloudflare dashboard → Workers & Pages → `jiscribe-examples` →
  Deployments

## Custom domain (first time only)

1. Cloudflare dashboard → Workers & Pages → `jiscribe-examples` → Custom domains
2. Add `examples.jiscribe.dev` (DNS is managed by Cloudflare, so the record is
   created for you)
3. Once it propagates, run the curl checks above

## What to edit

- Gallery contents: `src/` (`ExamplesShell.tsx` holds the sidebar sections)
- Page shell and metadata: `index.html`
- Delivery headers: `public/_headers`
- 404 page: `public/404.html` (fixed name Pages looks for — deleting it brings
  the cache-poisoning incident back)
- Favicon: `public/favicon.svg` (the same mark as `src/JiscribeMark.tsx`)
