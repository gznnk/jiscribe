import type { Brand } from "@jiscribe/utility-types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const MetaDocBrand: unique symbol;

export type MetaDoc = {
	name?: string;
	description?: string;
} & Record<string, unknown> &
	Brand<typeof MetaDocBrand>;
