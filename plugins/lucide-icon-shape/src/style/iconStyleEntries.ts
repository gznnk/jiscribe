import type { DeclaredStyleTable } from "@jiscribe/canvas-sdk";
import { fieldEntry } from "@jiscribe/canvas-sdk";

import type { IconState } from "../state/IconState";

/**
 * What a lucide icon answers for beyond its features: which drawing it is. The
 * picker writes it as a style, there being no other route from a menu to a doc
 * field, and `icon` is in the doc definition's `extraKeys`, which is what
 * registration checks the entry against.
 */
export const ICON_STYLE_ENTRIES = {
	icon: fieldEntry("icon", "string"),
} satisfies DeclaredStyleTable<IconState>;
