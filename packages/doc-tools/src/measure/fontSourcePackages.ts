import { createRequire } from "node:module";
import { dirname } from "node:path";

/**
 * The `@fontsource` package each family the canvas can be drawn in ships as,
 * keyed by the family name exactly as a document spells it (the quoted names of
 * `CANVAS_FONT_FAMILIES` in packages/canvas/src/constants/fontFamilies.ts). Only
 * these can be measured from metrics; a document naming anything else falls back
 * to the character-count estimate.
 */
const PACKAGE_BY_FAMILY: Readonly<Record<string, string>> = {
	"Source Sans 3": "@fontsource/source-sans-3",
	"Noto Sans JP": "@fontsource/noto-sans-jp",
	"Source Serif 4": "@fontsource/source-serif-4",
	"Noto Serif JP": "@fontsource/noto-serif-jp",
	"Source Code Pro": "@fontsource/source-code-pro",
	Caveat: "@fontsource/caveat",
	"Klee One": "@fontsource/klee-one",
};

const require = createRequire(import.meta.url);

const packageDirCache = new Map<string, string | null>();

/**
 * Directory the family's font files and `@font-face` CSS sit in, resolved
 * through Node so it follows whatever the installer laid out.
 *
 * @param family - One family name, unquoted and case-sensitive
 * @returns The absolute directory, or null for a family the canvas does not ship or a package that is not installed
 */
export const resolveFontSourceDir = (family: string): string | null => {
	const cached = packageDirCache.get(family);
	if (cached !== undefined) {
		return cached;
	}
	const packageName = PACKAGE_BY_FAMILY[family];
	let dir: string | null = null;
	if (packageName !== undefined) {
		try {
			dir = dirname(require.resolve(`${packageName}/package.json`));
		} catch {
			// An install without the optional font packages measures by estimate
			// rather than failing: a diagnosis is still useful, just approximate.
			dir = null;
		}
	}
	packageDirCache.set(family, dir);
	return dir;
};

/**
 * The families named in a CSS font stack, in the order the browser tries them,
 * with quotes stripped. Generic keywords (`sans-serif`, `monospace`, …) are
 * dropped: they name no file, and reaching one means the host's own default
 * would have drawn the text, which no metric here can predict.
 *
 * @param fontFamily - A `font-family` value as a document stores it, e.g. `'"Source Sans 3", "Noto Sans JP", sans-serif'`
 * @returns The concrete family names, possibly empty
 */
export const parseFontStack = (fontFamily: string): string[] =>
	fontFamily
		.split(",")
		.map((entry) => entry.trim().replace(/^["']|["']$/g, ""))
		.filter(
			(family) => family !== "" && PACKAGE_BY_FAMILY[family] !== undefined,
		);

/**
 * The numeric weight a CSS `font-weight` names. Only the two keywords a document
 * can hold are spelled out; anything unparseable is taken as regular, matching
 * what a browser falls back to.
 *
 * @param fontWeight - "normal", "bold", or a number as a string
 * @returns A weight in the 1–1000 CSS range
 */
export const parseFontWeight = (fontWeight: string): number => {
	if (fontWeight === "bold") {
		return 700;
	}
	if (fontWeight === "normal") {
		return 400;
	}
	const parsed = Number.parseInt(fontWeight, 10);
	return Number.isFinite(parsed) ? parsed : 400;
};
