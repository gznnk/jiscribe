import type { Brand } from "@workspace/utility-types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const MetaStateBrand: unique symbol;

export type MetaState = {
	name?: string;
	description?: string;
} & Record<string, unknown> &
	Brand<typeof MetaStateBrand>;
