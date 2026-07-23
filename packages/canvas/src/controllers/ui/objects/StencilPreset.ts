import type { ComponentType } from "react";

import type { ObjectType } from "../../../schemas/objects/types/ObjectType";
import type { LocaleMessages } from "../../messages/resolveLocaleMessages";

/** Props received by a StencilLibrary icon component. */
export type StencilIconProps = {
	width?: number;
	height?: number;
};

/**
 * A single item in the stencil palette shown in the StencilLibrary (toolbar).
 *
 * Presets are not 1:1 with object types (e.g. "rect" and "rect-markdown" are
 * both variants of the rect type). Creation always goes through the
 * objectType's `ObjectFactory`, passing defaultOverrides.
 */
export type StencilPreset = {
	id: string;
	objectType: ObjectType;
	/**
	 * Display label: a plain string (all locales) or a `LocaleMessages` dictionary.
	 * Resolution order: `messages.stencilPresetLabels[id]` (host override) → this label.
	 */
	label: string | LocaleMessages<string>;
	defaultOverrides?: Record<string, unknown>;
	/** Icon shown in the toolbar. */
	icon: ComponentType<StencilIconProps>;
	/**
	 * Palette memberships: category id → display order within that category
	 * (ascending). A preset may belong to several categories and rank
	 * differently in each (e.g. `{ basic: 30, flowchart: 20 }`). Membership is
	 * independent of the source folder ("home") and of whether the preset is
	 * pinned directly on the toolbar (that is decided by the toolbar layout, so
	 * this order only affects the order *inside* a category flyout).
	 */
	categories?: Record<string, number>;
};
