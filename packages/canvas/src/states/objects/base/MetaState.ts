import type { CommentThreadDoc } from "@jiscribe/doc/model/objects/base/CommentThreadDoc";
import type { Brand } from "@jiscribe/utility-types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const MetaStateBrand: unique symbol;

export type MetaState = {
	name?: string;
	description?: string;
	/** Mirrors `MetaDoc.reference` (see its JSDoc for the contract). */
	reference?: string;
	/** Mirrors `MetaDoc.comments` (see its JSDoc for the contract). */
	comments?: CommentThreadDoc[];
} & Record<string, unknown> &
	Brand<typeof MetaStateBrand>;
