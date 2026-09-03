import { ICON_ALIASES, ICON_NODES } from "./iconData.generated";
import type { IconNode } from "./IconNode";
import { normalizeIconName } from "./normalizeIconName";

/**
 * Maps a written icon name onto the current name of an icon that exists, forgiving
 * the two ways a correct-in-spirit name goes wrong: a superseded name (`user-circle`,
 * `edit`) and a spelling variant (`fileText`, `file_text`).
 *
 * @param name - The name as written; the exact spelling is tried before any rewriting,
 *   so a valid name never pays for the fallbacks
 * @returns The current name, or null when nothing in the set matches — the caller
 *   then reports it, with {@link import("./suggestIconNames").suggestIconNames} for candidates
 */
export const resolveIconName = (name: string): string | null => {
	const direct = matchExactly(name);
	if (direct !== null) {
		return direct;
	}
	const normalized = normalizeIconName(name);
	return normalized === name ? null : matchExactly(normalized);
};

/** Whether a name resolves to an icon that exists, aliases and spelling variants included. */
export const isKnownIconName = (name: string): boolean =>
	resolveIconName(name) !== null;

/**
 * Looks up an icon's drawing by a name {@link resolveIconName} accepts.
 *
 * @param name - The name as written; resolved before lookup, so an alias draws
 *   the icon it points at
 * @returns The nodes to render, or null when the name resolves to nothing
 */
export const readIconNodes = (name: string): readonly IconNode[] | null => {
	const resolved = resolveIconName(name);
	return resolved === null ? null : (ICON_NODES[resolved] ?? null);
};

/**
 * Own-property test rather than a lookup, so a name shared with something on
 * `Object.prototype` ("constructor", "toString") is not mistaken for an icon.
 * `Object.hasOwn` would say the same, but it needs an ES2022 lib and this package
 * is compiled by whichever host consumes it.
 */
const hasOwnKey = (record: object, key: string): boolean =>
	Object.prototype.hasOwnProperty.call(record, key);

/** Matches a name against the icon set and the alias table, without rewriting it. */
const matchExactly = (name: string): string | null => {
	if (hasOwnKey(ICON_NODES, name)) {
		return name;
	}
	return hasOwnKey(ICON_ALIASES, name) ? ICON_ALIASES[name] : null;
};
