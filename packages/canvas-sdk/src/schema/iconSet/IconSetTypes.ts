/**
 * One element of an icon's drawing: its tag, its attributes, and its children
 * where it has any. Attribute names carry React's spelling, so a renderer hands
 * them straight to `createElement`.
 *
 * Unlike lucide's flat IconNode this nests, because the vendor assets group
 * fills and placement with `<g fill="…">` / `<g transform="…">`. Flattening them
 * would mean composing the transforms.
 */
export type IconSetNode = readonly [
	tag: string,
	attrs: Readonly<Record<string, string>>,
	children?: readonly IconSetNode[],
];

/** What the catalog knows of one icon: everything but the drawing itself. */
export type IconSetCatalogEntry = {
	/** Display name, opened up from the asset's file name (`Amazon EC2 / Instance`). */
	label: string;
	/** The vendor's category, from the directory the asset sits in; search matches it too. */
	category: string;
	/** The asset's own viewBox, kept as authored (`"0 0 48 48"`). */
	viewBox: string;
};

/** One icon's drawing, kept apart from the catalog so the headless side never loads it. */
export type IconSetDrawing = {
	/** The drawing for a light ground, and the only one for most icons. */
	nodes: readonly IconSetNode[];
	/**
	 * The separate drawing the vendor ships for a dark ground, where it ships one.
	 * Absent means `nodes` is the only rendition and reads on both grounds.
	 */
	darkNodes?: readonly IconSetNode[];
	/**
	 * Every id the drawing defines (both renditions together), each of which
	 * something in it refers to by `url(#…)` or `href="#…"`. Absent when it
	 * defines none, and then the drawing is drawn exactly as stored.
	 */
	idRefs?: readonly string[];
};

/** One palette entry. The label doubles as the text slot's initial value. */
export type IconSetPaletteEntry = {
	/** The canonical icon name. */
	icon: string;
	/** The name that goes into the text slot when the icon is placed. */
	label: string;
};

/** One section of a stencil category's "show all" view, as declared. */
export type IconSetBrowseGroupDeclaration = {
	/** Unique among the sections of one set. */
	id: string;
	/** English, as the set names it; not translated, like the icon labels. */
	label: string;
	/** The set's own category names (`IconSetCatalogEntry.category`) the section holds. */
	categories: readonly string[];
};

/** One section of the "show all" view with the icons it holds. */
export type IconSetBrowseGroup = {
	/** The declared id. */
	id: string;
	/** The declared label. */
	label: string;
	/** Canonical icon names, palette members first in palette order, then the rest alphabetically. */
	names: string[];
};

/** A search result. */
export type IconSetSearchResult = {
	/** The canonical names to lay out, best match first, cut off at the display limit. */
	names: string[];
	/** How many matched before the cut, for a "more matched" line. */
	total: number;
};
