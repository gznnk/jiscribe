import type { ComponentType } from "react";

import type { ShapeIconProps } from "../../../../schemas/objects/types/ShapePreset";
import { CalloutIcon } from "../../icons/CalloutIcon";
import { CloudIcon } from "../../icons/CloudIcon";
import { DiamondIcon } from "../../icons/DiamondIcon";
import { FrameIcon } from "../../icons/FrameIcon";
import { RectIcon } from "../../icons/RectIcon";

/**
 * A palette category shown as a submenu (flyout) button in the ShapeLibrary.
 *
 * Categories are a presentation axis, independent of the source folder ("home")
 * a shape lives in: a preset declares its memberships via `ShapePreset.categories`,
 * and the flyout lists `shapePreset.byCategory(id)`. The display label falls back
 * to `label` here and is overridden by `messages.shapeCategoryLabels[id]`.
 */
export type ShapeCategory = {
	id: string;
	/** English fallback label; overridden by `messages.shapeCategoryLabels[id]`. */
	label: string;
	/** Icon shown on the category button. */
	icon: ComponentType<ShapeIconProps>;
};

/**
 * Built-in category metadata. The category icon reuses a representative shape
 * icon (a dedicated glyph set can replace these later without touching callers).
 */
export const SHAPE_CATEGORY_DEFINITIONS: Record<string, ShapeCategory> = {
	basic: { id: "basic", label: "Basic", icon: RectIcon },
	flowchart: {
		id: "flowchart",
		label: "Flowchart",
		icon: DiamondIcon,
	},
	container: {
		id: "container",
		label: "Container",
		icon: FrameIcon,
	},
	general: { id: "general", label: "General", icon: CloudIcon },
	annotation: {
		id: "annotation",
		label: "Annotation",
		icon: CalloutIcon,
	},
};
