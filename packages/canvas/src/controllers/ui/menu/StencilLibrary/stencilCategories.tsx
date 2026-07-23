import type { ComponentType } from "react";

import type { LocaleMessages } from "../../../messages/resolveLocaleMessages";
import { CalloutIcon } from "../../objects/annotations/CalloutIcon";
import { DiamondIcon } from "../../objects/flowchart/DiamondIcon";
import { CloudIcon } from "../../objects/general/CloudIcon";
import { RectIcon } from "../../objects/primitives/RectIcon";
import type { StencilIconProps } from "../../objects/StencilPreset";

/**
 * A palette category shown as a submenu (flyout) button in the StencilLibrary.
 *
 * Categories are a presentation axis, independent of the source folder ("home")
 * a preset lives in: a preset declares its memberships via `StencilPreset.categories`,
 * and the flyout lists `stencilPreset.byCategory(id)`. Resolution order for the
 * label: `messages.stencilCategoryLabels[id]` (host override) → this `label`.
 */
export type StencilCategory = {
	id: string;
	/** A plain string (all locales) or a `LocaleMessages` dictionary. */
	label: string | LocaleMessages<string>;
	/** Icon shown on the category button. */
	icon: ComponentType<StencilIconProps>;
};

/**
 * Built-in category metadata. The category icon reuses a representative shape
 * icon (a dedicated glyph set can replace these later without touching callers).
 * Plugins contribute further categories via `ObjectTypeDefinition.stencilLibrary.categories`.
 */
export const SHAPE_CATEGORY_DEFINITIONS: Record<string, StencilCategory> = {
	basic: { id: "basic", label: { en: "Basic", ja: "基本" }, icon: RectIcon },
	flowchart: {
		id: "flowchart",
		label: { en: "Flowchart", ja: "フローチャート" },
		icon: DiamondIcon,
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
