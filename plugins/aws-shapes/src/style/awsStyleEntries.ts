import type { DeclaredStyleTable } from "@jiscribe/canvas-sdk";
import { declaredFieldEntry } from "@jiscribe/canvas-sdk";

import type { AwsGroupState } from "../state/AwsGroupState";
import type { AwsIconState } from "../state/AwsIconState";

/**
 * What an AWS icon answers for beyond its features: which icon it draws. The
 * picker writes it as a style, there being no other route from a menu to a doc
 * field; `icon` is in the doc definition's `extraKeys`, which is what
 * registration checks the entry against.
 */
export const AWS_ICON_STYLE_ENTRIES = {
	icon: declaredFieldEntry("icon", "string"),
} satisfies DeclaredStyleTable<AwsIconState>;

/**
 * The same for a frame: `kind` is the one field a host can set without a menu of
 * its own, and the border colour, the line style and the corner badge all follow
 * from it (resolveAwsGroupStroke).
 */
export const AWS_GROUP_STYLE_ENTRIES = {
	kind: declaredFieldEntry("kind", "string"),
} satisfies DeclaredStyleTable<AwsGroupState>;
