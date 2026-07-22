import type { ComponentType } from "react";

import type { LocaleMessages } from "../../../messages/resolveLocaleMessages";
import { FrameIcon } from "../../icons/FrameIcon";
import { CalloutIcon } from "../../objects/annotations/CalloutIcon";
import { DiamondIcon } from "../../objects/flowchart/DiamondIcon";
import { CloudIcon } from "../../objects/general/CloudIcon";
import { RectIcon } from "../../objects/primitives/RectIcon";
import type { ShapeIconProps } from "../../objects/ShapePreset";

/**
 * A palette category shown as a submenu (flyout) button in the ShapeLibrary.
 *
 * Categories are a presentation axis, independent of the source folder ("home")
 * a shape lives in: a preset declares its memberships via `ShapePreset.categories`,
 * and the flyout lists `shapePreset.byCategory(id)`. Resolution order for the
 * label: `messages.shapeCategoryLabels[id]` (host override) → this `label`.
 */
export type ShapeCategory = {
	id: string;
	/** A plain string (all locales) or a `LocaleMessages` dictionary. */
	label: string | LocaleMessages<string>;
	/** Icon shown on the category button. */
	icon: ComponentType<ShapeIconProps>;
};

/**
 * Built-in category metadata. The category icon reuses a representative shape
 * icon (a dedicated glyph set can replace these later without touching callers).
 */
export const SHAPE_CATEGORY_DEFINITIONS: Record<string, ShapeCategory> = {
	basic: { id: "basic", label: { en: "Basic", ja: "基本" }, icon: RectIcon },
	flowchart: {
		id: "flowchart",
		label: { en: "Flowchart", ja: "フローチャート" },
		icon: DiamondIcon,
	},
	container: {
		id: "container",
		label: { en: "Container", ja: "コンテナ" },
		icon: FrameIcon,
	},
	general: {
		id: "general",
		label: { en: "General", ja: "一般" },
		icon: CloudIcon,
	},
	annotation: {
		id: "annotation",
		label: { en: "Annotation", ja: "注釈" },
		icon: CalloutIcon,
	},
};
