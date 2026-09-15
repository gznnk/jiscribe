import type { AwsIconEntry } from "./AwsIconNode";
import { AWS_ICON_ALIASES } from "./iconAliases";
import { AWS_ICON_ENTRIES } from "./iconData.generated";
import { normalizeAwsIconName } from "./normalizeAwsIconName";

/** Vendor prefixes, dropped so that `amazon-ec2` answers to `ec2` as well. */
const VENDOR_PREFIXES = ["amazon-", "aws-"] as const;

/**
 * Shorthand spelling to canonical name. A spelling two icons answer to is
 * recorded as null — "resolves to nothing" rather than silently picking one.
 * Built on first use.
 */
let namesByShorthand: Map<string, string | null> | null = null;

/**
 * The shorthands mechanically derivable from one name: the name without its
 * layer prefix, and that without the vendor prefix of its first segment.
 */
const listShorthands = (name: string): string[] => {
	const withoutTier = name.slice(name.indexOf("/") + 1);
	const shorthands = [withoutTier];
	for (const prefix of VENDOR_PREFIXES) {
		if (withoutTier.startsWith(prefix)) {
			shorthands.push(withoutTier.slice(prefix.length));
		}
	}
	return shorthands;
};

const readNamesByShorthand = (): Map<string, string | null> => {
	if (namesByShorthand === null) {
		namesByShorthand = new Map();
		for (const name of Object.keys(AWS_ICON_ENTRIES)) {
			for (const shorthand of listShorthands(name)) {
				// A spelling that already means something as a canonical name or an
				// alias is not taken as a shorthand for anything else.
				if (
					hasOwnKey(AWS_ICON_ENTRIES, shorthand) ||
					hasOwnKey(AWS_ICON_ALIASES, shorthand)
				) {
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

/**
 * Own-property check, so a name of Object.prototype ("constructor") is not
 * mistaken for an icon. `Object.hasOwn` would require the ES2022 lib, and this
 * package compiles under the settings of whichever host takes it.
 */
const hasOwnKey = (record: object, key: string): boolean =>
	Object.prototype.hasOwnProperty.call(record, key);

/** Looks the spelling up as written: canonical name, then alias, then shorthand. */
const matchExactly = (name: string): string | null => {
	if (hasOwnKey(AWS_ICON_ENTRIES, name)) {
		return name;
	}
	if (hasOwnKey(AWS_ICON_ALIASES, name)) {
		return AWS_ICON_ALIASES[name];
	}
	return readNamesByShorthand().get(name) ?? null;
};

/**
 * Resolves a written icon name onto the canonical name of an icon that exists,
 * absorbing the three ways a well-meant name misses: the short name people say,
 * a dropped prefix, and another spelling.
 *
 * @param name - the name as written; a canonical name passes straight through,
 *   so a correct name never takes the long way round
 * @returns the canonical name, or null when nothing answers to it — the caller
 *   then reports it with candidates from
 *   {@link import("./suggestAwsIconNames").suggestAwsIconNames}
 */
export const resolveAwsIconName = (name: string): string | null => {
	const direct = matchExactly(name);
	if (direct !== null) {
		return direct;
	}
	const normalized = normalizeAwsIconName(name);
	return normalized === name ? null : matchExactly(normalized);
};

/**
 * Whether the name reaches an icon that exists, aliases, shorthands and spelling
 * variants included.
 *
 * @param name - the name as written
 * @returns true when it reaches one
 */
export const isKnownAwsIconName = (name: string): boolean =>
	resolveAwsIconName(name) !== null;

/**
 * Looks an icon up by name.
 *
 * @param name - any spelling {@link resolveAwsIconName} accepts; an alias
 *   answers with the icon it points at
 * @returns the drawings and the metadata, or null when nothing answers to the
 *   name
 */
export const readAwsIcon = (name: string): AwsIconEntry | null => {
	const resolved = resolveAwsIconName(name);
	return resolved === null ? null : (AWS_ICON_ENTRIES[resolved] ?? null);
};
