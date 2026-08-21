import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Origin the harness is served from. A reserved TLD, so it can never reach a real
 * host: every request under it is answered by {@link createHarnessAssetHandler}
 * before it leaves the browser. Serving over a normal https origin rather than
 * `file://` keeps the page under ordinary web rules — blob URLs, font loading and
 * canvas taint all behave the way they do in a real host.
 */
export const HARNESS_ORIGIN = "https://harness.jiscribe.invalid";

/**
 * Where the built harness sits, tried in order.
 *
 * Two candidates because this module is read from two places: `dist/index.mjs`,
 * where the harness is the sibling directory the build put it in, and the
 * TypeScript source under `src/render`, which the tests run from and which has to
 * reach across to `dist`. Whichever holds `fonts.json` is the built one.
 */
const HARNESS_DIR_CANDIDATES = [
	join(dirname(fileURLToPath(import.meta.url)), "harness"),
	join(dirname(fileURLToPath(import.meta.url)), "..", "..", "dist", "harness"),
];

const require = createRequire(import.meta.url);

const CONTENT_TYPES: Readonly<Record<string, string>> = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".ttf": "font/ttf",
	".otf": "font/otf",
};

const contentTypeFor = (pathname: string): string => {
	const dot = pathname.lastIndexOf(".");
	return (
		(dot === -1
			? undefined
			: CONTENT_TYPES[pathname.slice(dot).toLowerCase()]) ??
		"application/octet-stream"
	);
};

/** One answer to a request: the bytes and what they are, or nothing to serve. */
export type HarnessAsset = {
	body: Buffer;
	contentType: string;
};

/**
 * Serves the harness: its own files out of `dist/harness`, and the font files out
 * of the `@fontsource` / katex packages they were built against.
 *
 * The fonts are not copied into `dist` — the shipped stacks come to some 850
 * files split by unicode-range, fifty times the size of everything else here — so
 * the build records where each one came from (`fonts.json`) and this resolves the
 * specifier at render time. A browser therefore fetches only the ranges a
 * document actually draws, which is also what makes rendering a Latin-only
 * diagram fast.
 *
 * @returns A function taking the request path (`/index.html`, `/fonts/x.woff2`) and giving back what to answer with, or null for a path the harness does not have
 * @throws When the harness has not been built, naming both places it looked
 */
export const createHarnessAssetHandler = (): ((
	pathname: string,
) => HarnessAsset | null) => {
	let harnessDir: string | null = null;
	let fontManifest: Record<string, string> = {};
	for (const candidate of HARNESS_DIR_CANDIDATES) {
		try {
			fontManifest = JSON.parse(
				readFileSync(join(candidate, "fonts.json"), "utf8"),
			) as Record<string, string>;
			harnessDir = candidate;
			break;
		} catch {
			continue;
		}
	}
	if (harnessDir === null) {
		throw new Error(
			`the render harness has not been built (looked in ${HARNESS_DIR_CANDIDATES.join(" and ")}) — run \`pnpm build:cli\``,
		);
	}

	// A font is fetched once per unicode-range and re-fetched on every page the
	// process renders, so the bytes are worth keeping.
	const fontCache = new Map<string, Buffer | null>();

	const readFont = (pathname: string): Buffer | null => {
		const cached = fontCache.get(pathname);
		if (cached !== undefined) {
			return cached;
		}
		const specifier = fontManifest[pathname];
		let body: Buffer | null = null;
		if (specifier !== undefined) {
			try {
				body = readFileSync(require.resolve(specifier));
			} catch {
				// A font package that is not installed leaves the browser to substitute,
				// which is worse-looking but still a render; failing the whole command
				// over one unicode-range would not be.
				body = null;
			}
		}
		fontCache.set(pathname, body);
		return body;
	};

	return (pathname) => {
		if (pathname.startsWith("/fonts/")) {
			const body = readFont(pathname);
			return body === null
				? null
				: { body, contentType: contentTypeFor(pathname) };
		}
		const name = pathname === "/" ? "/index.html" : pathname;
		// Nothing but the three built files is served, so a path cannot walk out of
		// the harness directory.
		if (!/^\/[a-zA-Z0-9._-]+$/.test(name)) {
			return null;
		}
		try {
			return {
				body: readFileSync(join(harnessDir, name.slice(1))),
				contentType: contentTypeFor(name),
			};
		} catch {
			return null;
		}
	};
};
