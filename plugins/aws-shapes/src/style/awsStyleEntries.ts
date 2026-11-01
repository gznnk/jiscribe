import type { DeclaredStyleTable } from "@jiscribe/canvas-sdk";
import { declaredFieldEntry } from "@jiscribe/canvas-sdk";

import type { AwsGroupState } from "../state/AwsGroupState";

/**
 * What an AWS frame answers for beyond its features: `kind` is the one field a
 * host can set without a menu of its own, and the border colour, the line style and the corner badge all follow
 * from it (resolveAwsGroupStroke).
 */
export const AWS_GROUP_STYLE_ENTRIES = {
	kind: declaredFieldEntry("kind", "string"),
} satisfies DeclaredStyleTable<AwsGroupState>;
