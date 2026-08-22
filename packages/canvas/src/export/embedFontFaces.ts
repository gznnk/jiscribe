const SVG_NS = "http://www.w3.org/2000/svg";

/** One `@font-face` ready to be written into the export SVG. */
export type EmbeddedFontFace = {
	/** `font-family` as the source rule declared it, quotes and all. */
	family: string;
	/** `font-weight` of the source rule; a fontsource sheet declares one number per file. */
	weight: string;
	/** `font-style` of the source rule (`normal` / `italic`). */
	style: string;
	/** `unicode-range` of the source rule; `""` when it declared none, meaning every code point. */
	unicodeRange: string;
	/** `data:` URI carrying the face bytes. */
	dataUri: string;
	/** The `format()` hint to write beside the URI, e.g. `woff2`. */
	format: string;
};

/** A `url()` entry of a `src` descriptor, with the format it was tagged with. */
export type FontFaceSource = {
	/** The URL exactly as the descriptor spelled it — still relative when it was declared that way. */
	url: string;
	/** The `format()` keyword, unquoted; derived from the file extension when the entry carried none. */
	format: string;
};

/** Every code point — what a face declaring no `unicode-range` covers. */
const FULL_UNICODE_RANGE: readonly (readonly [number, number])[] = [
	[0, 0x10ffff],
];

const UNICODE_RANGE_ENTRY = /^u\+([0-9a-f?]{1,6})(?:-([0-9a-f]{1,6}))?$/;

/**
 * The code-point ranges of a `unicode-range` declaration.
 *
 * @param declaration - A `unicode-range` value (`U+0-7F, U+4??`); `""` yields the full range, and entries that do not parse are dropped
 * @returns Inclusive `[from, to]` pairs in declaration order
 */
export const parseUnicodeRanges = (
	declaration: string,
): (readonly [number, number])[] => {
	if (declaration.trim() === "") {
		return [...FULL_UNICODE_RANGE];
	}
	return declaration
		.split(",")
		.flatMap((entry) => {
			const matched = UNICODE_RANGE_ENTRY.exec(entry.trim().toLowerCase());
			if (!matched) {
				return [];
			}
			const from = Number.parseInt(matched[1].replace(/\?/g, "0"), 16);
			const to = Number.parseInt(
				matched[2] ?? matched[1].replace(/\?/g, "f"),
				16,
			);
			return [[from, to] as const];
		})
		.filter(([from, to]) => Number.isFinite(from) && Number.isFinite(to));
};

/**
 * A `unicode-range` reduced to a form two spellings of the same set share.
 * `FontFace.unicodeRange` drops the leading zeros the stylesheet writes
 * (`U+0460-052F` comes back as `U+460-52F`), so the two can only be paired up
 * through their numbers.
 *
 * @param declaration - A `unicode-range` value, or `""` for a face that declared none
 * @returns Sorted `from-to` hex pairs joined by commas; identical for any two declarations covering the same code points
 */
export const canonicalizeUnicodeRange = (declaration: string): string =>
	parseUnicodeRanges(declaration)
		.slice()
		.sort((left, right) => left[0] - right[0] || left[1] - right[1])
		.map(([from, to]) => `${from.toString(16)}-${to.toString(16)}`)
		.join(",");

/**
 * The identity of one subset file: what a `CSSFontFaceRule` and the `FontFace`
 * the browser built from it have in common.
 *
 * @param family - `font-family`, with or without quotes
 * @param weight - `font-weight`, as either side spells it (`400`, `normal`)
 * @param style - `font-style` (`normal` / `italic`)
 * @param unicodeRange - `unicode-range`; `""` and the full range collapse to the same key
 * @returns A key comparable across the CSSOM and the FontFaceSet
 */
export const buildFontFaceKey = (
	family: string,
	weight: string,
	style: string,
	unicodeRange: string,
): string =>
	[
		family.replace(/["']/g, "").trim().toLowerCase(),
		weight.trim().toLowerCase(),
		style.trim().toLowerCase(),
		canonicalizeUnicodeRange(unicodeRange),
	].join("|");

const SRC_ENTRY =
	/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)(?:\s*format\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\))?/g;

const FORMAT_BY_EXTENSION: Readonly<Record<string, string>> = {
	woff2: "woff2",
	woff: "woff",
	ttf: "truetype",
	otf: "opentype",
};

/**
 * The `url()` entries of a `src` descriptor. `local()` entries are skipped —
 * they name a face on the host, which is exactly what an embedded copy exists
 * to stop the rasterizer from reaching for.
 *
 * @param src - A `src` descriptor value, as the CSSOM serializes it
 * @returns One entry per `url()`, in declaration order; empty when none parse
 */
export const parseFontFaceSources = (src: string): FontFaceSource[] => {
	const sources: FontFaceSource[] = [];
	for (const matched of src.matchAll(SRC_ENTRY)) {
		const url = matched[1] ?? matched[2] ?? matched[3] ?? "";
		if (url === "") {
			continue;
		}
		const declaredFormat = matched[4] ?? matched[5] ?? matched[6];
		const extension = url.slice(url.lastIndexOf(".") + 1).toLowerCase();
		sources.push({
			url,
			format: declaredFormat ?? FORMAT_BY_EXTENSION[extension] ?? "",
		});
	}
	return sources;
};

/**
 * The entry worth downloading out of a `src` descriptor: woff2 when offered,
 * since it is the smallest and every browser that can parse an SVG in an
 * `<img>` can decode it.
 *
 * @param src - A `src` descriptor value, as the CSSOM serializes it
 * @returns The chosen entry, or null when the descriptor names no `url()`
 */
export const pickFontFaceSource = (src: string): FontFaceSource | null => {
	const sources = parseFontFaceSources(src);
	return sources.find(({ format }) => format === "woff2") ?? sources[0] ?? null;
};

/**
 * Writes the faces back out as CSS. `font-display: block` is forced: the
 * fallback the `swap` period would paint is the very substitution this
 * embedding exists to prevent.
 *
 * @param faces - The faces to declare, in the order they should appear
 * @returns A `@font-face` block per face, newline separated; `""` for an empty list
 */
export const buildFontFaceCss = (faces: readonly EmbeddedFontFace[]): string =>
	faces
		.map(({ family, weight, style, unicodeRange, dataUri, format }) =>
			[
				"@font-face{",
				`font-family:${family};`,
				`font-style:${style};`,
				`font-weight:${weight};`,
				"font-display:block;",
				`src:url(${dataUri})${format === "" ? "" : ` format("${format}")`};`,
				unicodeRange.trim() === "" ? "" : `unicode-range:${unicodeRange};`,
				"}",
			].join(""),
		)
		.join("\n");

/** A rule that matched a loaded face, paired with the file it names. */
type FontFaceCandidate = Omit<EmbeddedFontFace, "dataUri" | "format"> & {
	/** Absolute URL of the face file, resolved against its stylesheet. */
	resolvedUrl: string;
	format: string;
};

/** The keys of every face the document has actually downloaded. */
const collectLoadedFontFaceKeys = (): Set<string> => {
	const keys = new Set<string>();
	if (typeof document === "undefined" || !document.fonts) {
		return keys;
	}
	document.fonts.forEach((face) => {
		if (face.status === "loaded") {
			keys.add(
				buildFontFaceKey(
					face.family,
					face.weight,
					face.style,
					face.unicodeRange,
				),
			);
		}
	});
	return keys;
};

/** Visits every `@font-face` rule reachable from a stylesheet, `@import` included. */
const forEachFontFaceRule = (
	sheet: CSSStyleSheet,
	visit: (rule: CSSFontFaceRule) => void,
): void => {
	let rules: CSSRuleList;
	try {
		rules = sheet.cssRules;
	} catch {
		// A cross-origin stylesheet throws on cssRules; its faces stay unembedded.
		return;
	}
	for (const rule of Array.from(rules)) {
		if (rule instanceof CSSFontFaceRule) {
			visit(rule);
		} else if (rule instanceof CSSImportRule && rule.styleSheet) {
			forEachFontFaceRule(rule.styleSheet, visit);
		}
	}
};

/** The rules whose face the document has downloaded, one entry per subset file. */
const collectFontFaceCandidates = (
	loadedKeys: ReadonlySet<string>,
): FontFaceCandidate[] => {
	const candidates = new Map<string, FontFaceCandidate>();
	for (const sheet of Array.from(document.styleSheets)) {
		forEachFontFaceRule(sheet, (rule) => {
			const family = rule.style.getPropertyValue("font-family");
			const weight = rule.style.getPropertyValue("font-weight") || "normal";
			const style = rule.style.getPropertyValue("font-style") || "normal";
			const unicodeRange = rule.style.getPropertyValue("unicode-range");
			const key = buildFontFaceKey(family, weight, style, unicodeRange);
			if (!loadedKeys.has(key) || candidates.has(key)) {
				return;
			}
			const source = pickFontFaceSource(rule.style.getPropertyValue("src"));
			if (!source) {
				return;
			}
			candidates.set(key, {
				family,
				weight,
				style,
				unicodeRange,
				format: source.format,
				resolvedUrl: new URL(
					source.url,
					rule.parentStyleSheet?.href ?? document.baseURI,
				).href,
			});
		});
	}
	return Array.from(candidates.values());
};

const MEDIA_TYPE_BY_FORMAT: Readonly<Record<string, string>> = {
	woff2: "font/woff2",
	woff: "font/woff",
	truetype: "font/ttf",
	opentype: "font/otf",
};

const toBase64 = (bytes: Uint8Array): string => {
	let binary = "";
	// Chunked, because spreading a multi-hundred-kilobyte array into
	// String.fromCharCode overflows the argument list.
	const CHUNK = 0x8000;
	for (let offset = 0; offset < bytes.length; offset += CHUNK) {
		binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK));
	}
	return btoa(binary);
};

// A face is fetched once per export and the same subsets come up on every
// later one, so the encoded form is kept for the life of the page.
const dataUriCache = new Map<string, Promise<string | null>>();

const fetchFontDataUri = (
	url: string,
	format: string,
): Promise<string | null> => {
	const cached = dataUriCache.get(url);
	if (cached) {
		return cached;
	}
	const pending = (async (): Promise<string | null> => {
		try {
			const response = await fetch(url);
			if (!response.ok) {
				return null;
			}
			const bytes = new Uint8Array(await response.arrayBuffer());
			const mediaType = MEDIA_TYPE_BY_FORMAT[format] ?? "font/woff2";
			return `data:${mediaType};base64,${toBase64(bytes)}`;
		} catch {
			return null;
		}
	})();
	dataUriCache.set(url, pending);
	return pending;
};

/**
 * Embeds the faces the page has downloaded into the export SVG as `@font-face`
 * rules holding the bytes.
 *
 * An SVG handed to an `<img>` is parsed as an isolated document: it cannot see
 * the page's stylesheets, so text drawn from it falls back to whatever face the
 * host OS matches the family name to — a different set of glyphs and a
 * different set of advances. Only the subsets `document.fonts` reports as
 * `loaded` are embedded, which for the unicode-range split fontsource ships is
 * a close approximation of the ranges the drawing actually uses.
 *
 * Best effort throughout: a face that cannot be fetched or matched back to its
 * rule is left out rather than failing the export, and the `textLength` the
 * `<text>` carries keeps the geometry right either way.
 *
 * @param exportSvg - The export SVG to prepend a `<style>` to; mutated in place and left untouched when nothing could be embedded
 * @returns The number of characters of CSS added, 0 when no face was embedded
 */
export const embedLoadedFontFaces = async (
	exportSvg: SVGSVGElement,
): Promise<number> => {
	let css: string;
	try {
		const loadedKeys = collectLoadedFontFaceKeys();
		if (loadedKeys.size === 0) {
			return 0;
		}
		const candidates = collectFontFaceCandidates(loadedKeys);
		const embedded = await Promise.all(
			candidates.map(async ({ resolvedUrl, format, ...face }) => {
				const dataUri = await fetchFontDataUri(resolvedUrl, format);
				return dataUri === null ? null : { ...face, format, dataUri };
			}),
		);
		css = buildFontFaceCss(
			embedded.filter((face): face is EmbeddedFontFace => face !== null),
		);
	} catch {
		return 0;
	}
	if (css === "") {
		return 0;
	}
	const style = document.createElementNS(SVG_NS, "style");
	style.textContent = css;
	exportSvg.insertBefore(style, exportSvg.firstChild);
	return css.length;
};
