// Hand-written declarations for index.mjs (a Node script, which Node 22 cannot
// import as TypeScript). Keep them in step with it.
import type { IconSetNode } from "../src/schema/iconSet/IconSetTypes";

/**
 * Every `.svg` file under a directory, sorted.
 *
 * @param dir - the directory to walk, as a path the file system resolves
 * @returns the paths, built on `dir` as it was given
 */
export declare const listSvgFiles: (dir: string) => string[];

/** What {@link convertIconSetSvg} gives back for one asset. */
export type ConvertedIconSetSvg = {
	/** The viewBox as authored, or `0 0 <width> <height>` built for a root that misspells it `xviewBox`. */
	viewBox: string;
	/** The drawing, attribute names in React's spelling. */
	nodes: IconSetNode[];
	/** The ids kept (each one referred to), in document order; empty when none is. */
	idRefs: string[];
};

/**
 * Converts one asset into the drawing a generated module stores, adjusting the
 * embedding only (index.mjs lists every adjustment).
 *
 * @param source - the SVG text
 * @param options - `filePath` names the asset in an error; `idPrefix` starts
 *   every kept id (`<idPrefix>-<n>`) and must be unique across the set and its
 *   renditions
 * @throws on an element, attribute or style declaration not on the lists, a
 *   reference to an id the asset does not define, or malformed markup
 */
export declare const convertIconSetSvg: (
	source: string,
	options: { filePath: string; idPrefix: string },
) => ConvertedIconSetSvg;

/** What {@link formatIconSetCatalogModule} takes. */
export type IconSetCatalogModuleOptions = {
	/** The comment the module opens with, one `//` line per line (source, release, terms). */
	header: string;
	/** TypeScript placed after the import: the set's source URL and release constants. */
	preamble: string;
	/** The entry type the module imports and types its entries with. */
	entryType: { name: string; from: string };
	/** The exported constant holding the entries. */
	entriesName: string;
	/** In output order; each field is written as JSON, in the object's own key order. */
	entries: readonly {
		name: string;
		fields: Readonly<Record<string, string>>;
	}[];
};

/**
 * Formats the catalog module: names, labels, categories and viewBoxes, without
 * a single drawing.
 *
 * @param options - the header, the preamble, the entry type and the entries
 * @returns the module source, unformatted (run prettier over the file)
 */
export declare const formatIconSetCatalogModule: (
	options: IconSetCatalogModuleOptions,
) => string;

/** What {@link formatIconSetDrawingsModule} takes. */
export type IconSetDrawingsModuleOptions = {
	/** The comment the module opens with; the drawings are the vendor's work, so the catalog's source and terms. */
	header: string;
	/** The exported constant holding the drawings. */
	drawingsName: string;
	/** In output order. `darkNodes` absent and an empty `idRefs` are left out of the output. */
	drawings: readonly {
		name: string;
		nodes: readonly IconSetNode[];
		darkNodes?: readonly IconSetNode[];
		idRefs?: readonly string[];
	}[];
};

/**
 * Formats the drawing module: every icon's node trees, keyed like the catalog.
 *
 * @param options - the header, the constant's name and the drawings
 * @returns the module source, unformatted (run prettier over the file)
 */
export declare const formatIconSetDrawingsModule: (
	options: IconSetDrawingsModuleOptions,
) => string;
