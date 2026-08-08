import type { CreateObjectState } from "@workspace/canvas";

import type { MarkdownFeatures } from "../schema/MarkdownDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const MarkdownStateBrand: unique symbol;

export type MarkdownState = CreateObjectState<
	typeof MarkdownFeatures,
	typeof MarkdownStateBrand
>;
