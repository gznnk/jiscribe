import type { Brand } from "@jiscribe/utility-types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const MetaDocBrand: unique symbol;

export type MetaDoc = {
	name?: string;
	description?: string;
	/**
	 * Path to another file this object refers to. The canvas neither resolves nor
	 * validates it — it hands the raw string to the host's `onOpenReference`.
	 * A path relative to the document is recommended, but resolving it is the
	 * host's responsibility.
	 */
	reference?: string;
} & Record<string, unknown> &
	Brand<typeof MetaDocBrand>;

/**
 * The members {@link MetaDoc} gives a meaning, each a string when present. The
 * record is open past these — the rest is the host's own — so the list cannot be
 * tied to the type the way the other key constants are, and `meta` is never
 * checked for unknown keys.
 */
export const META_DOC_STRING_KEYS = [
	"name",
	"description",
	"reference",
] as const;
