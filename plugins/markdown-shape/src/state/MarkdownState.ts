import type { CreateObjectState } from "@jiscribe/canvas";

import type { MarkdownFeatures } from "../schema/MarkdownDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const MarkdownStateBrand: unique symbol;

export type MarkdownState = CreateObjectState<
	typeof MarkdownFeatures,
	typeof MarkdownStateBrand
>;
