import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { parseFontWeight, resolveFontSourceDir } from "./fontSourcePackages";

/** One `@font-face` of a fontsource stylesheet: the file, and what it covers. */
type FontFace = {
	/** Absolute path of the `.woff` the face names (the `.woff2` beside it needs a brotli decoder fontkit does not carry). */
	filePath: string;
	/** Inclusive code-point ranges of `unicode-range`, in the order declared. */
	ranges: readonly (readonly [number, number])[];
};

/** The faces of one family at one weight and style, and the lookup they back. */
export type FontFaceIndex = {
	/**
	 * The `.woff` covering a code point, or null when this family has no face for
	 * it (fontsource subsets a family into per-range files, so "not covered" is the
	 * common case rather than the exception).
	 */
	findFileForCodePoint(codePoint: number): string | null;
};

/**
 * A fontsource stylesheet names one file per subset; the `format('woff2')` entry
 * comes first and the `.woff` fallback second, and only the second is read here.
 */
const WOFF_URL_PATTERN = /url\(\.\/files\/([^)]+\.woff)\)/;
const UNICODE_RANGE_PATTERN = /unicode-range:\s*([^;]+);/;

const parseUnicodeRange = (
	declaration: string,
): (readonly [number, number])[] =>
	declaration
		.split(",")
		.map((entry) => entry.trim())
		.flatMap((entry) => {
			const hyphenated = /^U\+([0-9a-f]+)-([0-9a-f]+)$/i.exec(entry);
			if (hyphenated) {
				return [
					[
						Number.parseInt(hyphenated[1], 16),
						Number.parseInt(hyphenated[2], 16),
					] as const,
				];
			}
			const single = /^U\+([0-9a-f]+)$/i.exec(entry);
			if (single) {
				const codePoint = Number.parseInt(single[1], 16);
				return [[codePoint, codePoint] as const];
			}
			// The wildcard form (U+4??) does not appear in fontsource output; a face
			// whose range cannot be read covers nothing rather than everything.
			return [];
		});

const parseStylesheet = (dir: string, css: string): FontFace[] => {
	const faces: FontFace[] = [];
	for (const block of css.split("@font-face")) {
		const url = WOFF_URL_PATTERN.exec(block);
		const range = UNICODE_RANGE_PATTERN.exec(block);
		if (url && range) {
			faces.push({
				filePath: join(dir, "files", url[1]),
				ranges: parseUnicodeRange(range[1]),
			});
		}
	}
	return faces;
};

/**
 * The weight the family actually ships that is nearest the one asked for.
 * Fontsource names one stylesheet per shipped weight, and a family offering
 * 400 / 600 only (Klee One) must still answer for a document asking 700.
 */
const findNearestWeight = (dir: string, weight: number): number | null => {
	const available = readdirSync(dir)
		.map((name) => /^(\d+)\.css$/.exec(name))
		.filter((matched) => matched !== null)
		.map((matched) => Number.parseInt(matched[1], 10));
	if (available.length === 0) {
		return null;
	}
	return available.reduce((nearest, candidate) =>
		Math.abs(candidate - weight) < Math.abs(nearest - weight)
			? candidate
			: nearest,
	);
};

const readStylesheet = (
	dir: string,
	weight: number,
	italic: boolean,
): string | null => {
	const nearestWeight = findNearestWeight(dir, weight);
	if (nearestWeight === null) {
		return null;
	}
	// Not every family ships an italic (none of the JP ones do); the upright faces
	// then measure it, which is what a browser synthesising an oblique also does.
	const names = italic
		? [`${nearestWeight}-italic.css`, `${nearestWeight}.css`]
		: [`${nearestWeight}.css`];
	for (const name of names) {
		try {
			return readFileSync(join(dir, name), "utf8");
		} catch {
			continue;
		}
	}
	return null;
};

const indexCache = new Map<string, FontFaceIndex | null>();

/**
 * The subset files of one family at one weight and style, indexed by code point.
 * Built once per combination and kept for the life of the process: reading a
 * stylesheet costs a few hundred kilobytes and a family carries up to 125
 * subsets, which is too much to redo per measured string.
 *
 * @param family - One concrete family name, as {@link parseFontStack} yields it
 * @param fontWeight - A CSS `font-weight` value; snapped to the nearest weight the family ships
 * @param italic - Whether to prefer the italic faces, falling back to the upright ones for a family shipping none
 * @returns The index, or null for a family that is not installed or ships no stylesheet
 */
export const getFontFaceIndex = (
	family: string,
	fontWeight: string,
	italic: boolean,
): FontFaceIndex | null => {
	const weight = parseFontWeight(fontWeight);
	const cacheKey = `${family}|${weight}|${italic ? "i" : "n"}`;
	const cached = indexCache.get(cacheKey);
	if (cached !== undefined) {
		return cached;
	}

	const dir = resolveFontSourceDir(family);
	const css = dir === null ? null : readStylesheet(dir, weight, italic);
	if (dir === null || css === null) {
		indexCache.set(cacheKey, null);
		return null;
	}

	const faces = parseStylesheet(dir, css);
	const fileByCodePoint = new Map<number, string | null>();
	const index: FontFaceIndex = {
		findFileForCodePoint: (codePoint) => {
			const known = fileByCodePoint.get(codePoint);
			if (known !== undefined) {
				return known;
			}
			let filePath: string | null = null;
			for (const face of faces) {
				if (
					face.ranges.some(([from, to]) => codePoint >= from && codePoint <= to)
				) {
					filePath = face.filePath;
					break;
				}
			}
			fileByCodePoint.set(codePoint, filePath);
			return filePath;
		},
	};
	indexCache.set(cacheKey, index);
	return index;
};
