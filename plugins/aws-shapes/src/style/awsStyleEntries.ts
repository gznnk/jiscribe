import { BODY_TEXT_SLOT_ID } from "@jiscribe/canvas";
import type {
	DeclaredStyleEntry,
	DeclaredStyleTable,
} from "@jiscribe/canvas-sdk";
import { declaredFieldEntry, readTextSlot } from "@jiscribe/canvas-sdk";

import { DEFAULT_AWS_ICON_NAME } from "../schema/AwsIconDoc";
import { readAwsIconLabel } from "../schema/icon/readAwsIconLabel";
import type { AwsGroupState } from "../state/AwsGroupState";
import type { AwsIconState } from "../state/AwsIconState";

const iconFieldEntry = declaredFieldEntry<AwsIconState, "string">(
	"icon",
	"string",
);

/**
 * Writes `icon`, and carries the label along while it is still the old icon's
 * own (readAwsIconLabel) — the one a stencil placed. A label the user typed, an
 * empty one included, is theirs and stays.
 */
const iconEntry: DeclaredStyleEntry<AwsIconState, string | undefined> = {
	fields: ["icon", "text"],
	apply: (object, pick, value, ctx) => {
		const updated = iconFieldEntry.apply(object, pick, value, ctx);
		if (updated === null || updated === object) {
			return updated;
		}
		const slot = object.text?.[BODY_TEXT_SLOT_ID];
		const oldLabel = readAwsIconLabel(object.icon ?? DEFAULT_AWS_ICON_NAME);
		const newLabel =
			updated.icon === undefined ? null : readAwsIconLabel(updated.icon);
		if (
			object.text === undefined ||
			slot === undefined ||
			oldLabel === null ||
			newLabel === null ||
			readTextSlot(object.text, BODY_TEXT_SLOT_ID) !== oldLabel
		) {
			return updated;
		}
		// The whole label is replaced, so the runs styling stretches of the old
		// one go with it; the slot's own typography stays.
		return {
			...updated,
			text: {
				...object.text,
				[BODY_TEXT_SLOT_ID]: { ...slot, text: newLabel },
			},
		};
	},
	read: iconFieldEntry.read,
};

/**
 * What an AWS icon answers for beyond its features: which icon it draws. The
 * picker writes it as a style, there being no other route from a menu to a doc
 * field; `icon` is in the doc definition's `extraKeys`, which is what
 * registration checks the entry against.
 */
export const AWS_ICON_STYLE_ENTRIES = {
	icon: iconEntry,
} satisfies DeclaredStyleTable<AwsIconState>;

/**
 * The same for a frame: `kind` is the one field a host can set without a menu of
 * its own, and the border colour, the line style and the corner badge all follow
 * from it (resolveAwsGroupStroke).
 */
export const AWS_GROUP_STYLE_ENTRIES = {
	kind: declaredFieldEntry("kind", "string"),
} satisfies DeclaredStyleTable<AwsGroupState>;
