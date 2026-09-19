import type { Brand } from "@jiscribe/utility-types";

import type { CommentThreadDoc } from "./CommentThreadDoc";

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
	/**
	 * Comment threads left on this object. Read through `readCommentThreads`,
	 * which drops malformed entries; nothing is drawn from them, and a duplicate
	 * of the object does not carry them. Kept in the document, so they travel
	 * with exports that embed it (`.jis.svg` / `.jis.png`).
	 */
	comments?: CommentThreadDoc[];
} & Record<string, unknown> &
	Brand<typeof MetaDocBrand>;
