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
