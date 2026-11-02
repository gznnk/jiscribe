import type { ObjectDocValidateFn, SemanticDiagnostic } from "@jiscribe/doc";

import { createIconSetNameSuggester } from "./createIconSetNameSuggester";
import type {
	IconSetBrowseGroup,
	IconSetBrowseGroupDeclaration,
	IconSetCatalogEntry,
	IconSetPaletteEntry,
	IconSetSearchResult,
} from "./IconSetTypes";
import { normalizeIconSetName } from "./normalizeIconSetName";

/** What one icon set hands {@link createIconSetCatalog}. */
export type IconSetCatalogConfig<TEntry extends IconSetCatalogEntry> = {
	/** The set's name as diagnostics print it (`unknown AWS icon "…"`). */
	setLabel: string;
	/** Canonical name to catalog entry: the generated catalog module. */
	entries: Readonly<Record<string, TEntry>>;
	/**
	 * Hand-written short names to canonical names, for the spellings no
	 * mechanical rule reaches (`s3`, `alb`). Every target must be a key of
	 * `entries`.
	 */
	aliases: Readonly<Record<string, string>>;
	/**
	 * The icons the palette lays out up front, in palette order. Each label wins
	 * over the entry's own wherever the icon is labelled (`readLabel`).
	 */
	palette: readonly IconSetPaletteEntry[];
	/**
	 * The sections of the "show all" view, in display order. Every category the
	 * entries carry must be in one, or its icons would be shown nowhere.
	 */
	browseGroups: readonly IconSetBrowseGroupDeclaration[];
	/**
	 * The shorthands mechanically derivable from one canonical name (a prefix
	 * dropped, say). A shorthand two names derive resolves to neither, and one
	 * spelled like a canonical name or an alias is not taken as a shorthand.
	 */
	listShorthands: (name: string) => readonly string[];
};

/** One icon set's names, closed over by {@link createIconSetCatalog}. */
export type IconSetCatalog<TEntry extends IconSetCatalogEntry> = {
	/**
	 * Resolves a written name onto a canonical one: as written first (canonical
	 * name, alias, shorthand), then the same three after normalizeIconSetName.
	 * Null when nothing answers to it.
	 */
	resolveName: (name: string) => string | null;
	/** Whether resolveName reaches an icon. */
	isKnownName: (name: string) => boolean;
	/** The entry the name resolves to, or null when nothing answers to it. */
	readEntry: (name: string) => TEntry | null;
	/**
	 * The label a shape placed with this icon starts out with: the palette's,
	 * else the entry's own. Null when nothing answers to the name.
	 */
	readLabel: (name: string) => string | null;
	/** Up to three canonical names resembling one that does not resolve, likeliest first. */
	suggestNames: (name: string) => string[];
	/**
	 * The names a library search for the term lays out, matched against the
	 * name, the label, the aliases and the category. An empty term (or one that
	 * normalizes to nothing) answers with the palette.
	 */
	search: (query: string) => IconSetSearchResult;
	/** Every section of the "show all" view, in declaration order. */
	listBrowseGroups: () => IconSetBrowseGroup[];
	/** Every canonical name, in the entries' order. */
	names: readonly string[];
	/** The categories the entries carry, alphabetically, each once. */
	categories: readonly string[];
	/** The palette's names alone, in palette order. */
	paletteNames: readonly string[];
	/**
	 * Checks a shape's own `icon` (optional): a string that resolves. One that
	 * does not is an error carrying suggestions. Marked `beyondSchema`, the JSON
	 * schema holding it as a plain string.
	 */
	validateIconName: ObjectDocValidateFn;
};

/** How many a search lays out at once. Past this, narrowing the search is quicker than scrolling. */
const MAX_SEARCH_RESULTS = 105;

/**
 * Own-property check, so a name of Object.prototype ("constructor") is not
 * mistaken for an icon. `Object.hasOwn` would require the ES2022 lib, and a
 * plugin compiles under the settings of whichever host takes it.
 */
const hasOwnKey = (record: object, key: string): boolean =>
	Object.prototype.hasOwnProperty.call(record, key);

/**
 * Builds the name lookup of one icon set: resolution (aliases, shorthands,
 * spelling variants), suggestions for a miss, the library search and the
 * "show all" sections, and the validator a doc definition registers.
 *
 * The shorthand and word-set indexes are built on first use, so a host that
 * only parses documents carrying canonical names never builds them.
 *
 * @param config - the set's tables; `entries`, `aliases` and `palette` are read,
 *   never copied, so they must not change afterwards
 * @returns the lookup, closed over this set alone
 * @throws when an alias points at a name `entries` does not hold, or a
 *   category of `entries` is in no browse group; the message names the set and
 *   the offending alias or category. A name with no drawing is not checked
 *   here: the catalog outlives the drawings by design
 */
export const createIconSetCatalog = <TEntry extends IconSetCatalogEntry>(
	config: IconSetCatalogConfig<TEntry>,
): IconSetCatalog<TEntry> => {
	const { setLabel, entries, aliases, palette, browseGroups, listShorthands } =
		config;
	const names: readonly string[] = Object.keys(entries);
	assertTablesConsistent(config);
	const paletteNames: readonly string[] = palette.map(({ icon }) => icon);

	/**
	 * Shorthand spelling to canonical name. A spelling two icons answer to is
	 * recorded as null — "resolves to nothing" rather than silently picking one.
	 * Built on first use.
	 */
	let namesByShorthand: Map<string, string | null> | null = null;

	const readNamesByShorthand = (): Map<string, string | null> => {
		if (namesByShorthand === null) {
			namesByShorthand = new Map();
			for (const name of names) {
				for (const shorthand of listShorthands(name)) {
					// A spelling that already means something as a canonical name or an
					// alias is not taken as a shorthand for anything else.
					if (hasOwnKey(entries, shorthand) || hasOwnKey(aliases, shorthand)) {
						continue;
					}
					namesByShorthand.set(
						shorthand,
						namesByShorthand.has(shorthand) ? null : name,
					);
				}
			}
		}
		return namesByShorthand;
	};

	/** Looks the spelling up as written: canonical name, then alias, then shorthand. */
	const matchExactly = (name: string): string | null => {
		if (hasOwnKey(entries, name)) {
			return name;
		}
		if (hasOwnKey(aliases, name)) {
			return aliases[name];
		}
		return readNamesByShorthand().get(name) ?? null;
	};

	const resolveName = (name: string): string | null => {
		const direct = matchExactly(name);
		if (direct !== null) {
			return direct;
		}
		const normalized = normalizeIconSetName(name);
		return normalized === name ? null : matchExactly(normalized);
	};

	const readEntry = (name: string): TEntry | null => {
		const resolved = resolveName(name);
		return resolved === null ? null : (entries[resolved] ?? null);
	};

	const paletteLabelByIcon = new Map<string, string>(
		palette.map(({ icon, label }) => [icon, label]),
	);

	const readLabel = (name: string): string | null => {
		const resolved = resolveName(name);
		if (resolved === null) {
			return null;
		}
		return paletteLabelByIcon.get(resolved) ?? entries[resolved]?.label ?? null;
	};

	const suggestNames = createIconSetNameSuggester(names, aliases);

	/** Canonical name to its alias spellings; one name may go by several short ones. */
	const aliasesByName = new Map<string, string[]>();
	for (const [alias, target] of Object.entries(aliases)) {
		aliasesByName.set(target, [...(aliasesByName.get(target) ?? []), alias]);
	}

	/**
	 * The names whose own name, label, alias or category holds the term. The
	 * category lets a term stand in for a category, as in the stencil library's
	 * search ("compute" lists all of Compute).
	 */
	const findMatches = (needle: string): string[] =>
		Object.entries(entries)
			.filter(
				([name, entry]) =>
					name.includes(needle) ||
					normalizeIconSetName(entry.label).includes(needle) ||
					normalizeIconSetName(entry.category).includes(needle) ||
					(aliasesByName.get(name) ?? []).some((alias) =>
						alias.includes(needle),
					),
			)
			.map(([name]) => name);

	const search = (query: string): IconSetSearchResult => {
		const needle = normalizeIconSetName(query);
		const matched =
			needle === ""
				? [...paletteNames]
				: sortByRelevance(findMatches(needle), needle);
		return {
			names: matched.slice(0, MAX_SEARCH_RESULTS),
			total: matched.length,
		};
	};

	/** Where a name sits in the palette; the ones outside it share the rank past its end. */
	const paletteRankByName = new Map(
		paletteNames.map((name, index) => [name, index]),
	);
	const paletteRank = (name: string): number =>
		paletteRankByName.get(name) ?? paletteNames.length;

	/** Palette members first in the palette's order, then the rest alphabetically. */
	const sortByPaletteFirst = (unsorted: string[]): string[] =>
		[...unsorted].sort(
			(left, right) =>
				paletteRank(left) - paletteRank(right) || left.localeCompare(right),
		);

	const listBrowseGroups = (): IconSetBrowseGroup[] =>
		browseGroups.map(({ id, label, categories }) => ({
			id,
			label,
			names: sortByPaletteFirst(
				Object.entries(entries)
					.filter(([, entry]) => categories.includes(entry.category))
					.map(([name]) => name),
			),
		}));

	const categories: readonly string[] = [
		...new Set(Object.values(entries).map((entry) => entry.category)),
	].sort((left, right) => left.localeCompare(right));

	const buildUnknownIconDiagnostic = (
		icon: string,
		path: string,
	): SemanticDiagnostic => {
		const suggestions = suggestNames(icon);
		const quoted = suggestions.map((name) => `"${name}"`).join(" or ");
		return {
			path,
			message:
				suggestions.length === 0
					? `unknown ${setLabel} icon "${icon}" (see the icon list in the AI reference)`
					: `unknown ${setLabel} icon "${icon}" — did you mean ${quoted}?`,
			severity: "error",
			beyondSchema: true,
		};
	};

	const validateIconName: ObjectDocValidateFn = (value, path) => {
		if (!("icon" in value) || value.icon === undefined) {
			return [];
		}
		const iconPath = `${path}.icon`;
		if (typeof value.icon !== "string") {
			return [
				{
					path: iconPath,
					message: "must be a string",
					severity: "error",
					beyondSchema: true,
				},
			];
		}
		if (resolveName(value.icon) !== null) {
			return [];
		}
		return [buildUnknownIconDiagnostic(value.icon, iconPath)];
	};

	return {
		resolveName,
		isKnownName: (name) => resolveName(name) !== null,
		readEntry,
		readLabel,
		suggestNames,
		search,
		listBrowseGroups,
		names,
		categories,
		paletteNames,
		validateIconName,
	};
};

/** Throws on an alias with no target, or a category no browse group holds. */
const assertTablesConsistent = <TEntry extends IconSetCatalogEntry>({
	setLabel,
	entries,
	aliases,
	browseGroups,
}: IconSetCatalogConfig<TEntry>): void => {
	for (const [alias, target] of Object.entries(aliases)) {
		if (!hasOwnKey(entries, target)) {
			throw new Error(
				`${setLabel} icon set: the alias "${alias}" points at "${target}", which the catalog does not hold`,
			);
		}
	}
	const browsed = new Set(browseGroups.flatMap(({ categories }) => categories));
	for (const [name, entry] of Object.entries(entries)) {
		if (!browsed.has(entry.category)) {
			throw new Error(
				`${setLabel} icon set: the category "${entry.category}" (of "${name}") is in no browse group`,
			);
		}
	}
};

/** Prefix matches first, then shortest, then alphabetical. */
const sortByRelevance = (names: string[], needle: string): string[] =>
	[...names].sort(
		(left, right) =>
			Number(startsWithNeedle(right, needle)) -
				Number(startsWithNeedle(left, needle)) ||
			left.length - right.length ||
			left.localeCompare(right),
	);

/**
 * Whether the name starts with the term, with or without its first `/`-segment
 * (or a layer prefix such as `service/` would miss every time).
 */
const startsWithNeedle = (name: string, needle: string): boolean =>
	name.startsWith(needle) ||
	name.slice(name.indexOf("/") + 1).startsWith(needle);
