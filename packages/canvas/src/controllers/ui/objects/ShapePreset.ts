import type { ComponentType } from "react";

import type { ObjectType } from "../../../schemas/objects/types/ObjectType";

/** Props received by a ShapeLibrary icon component. */
export type ShapeIconProps = {
	width?: number;
	height?: number;
};

/**
 * A single item in the shape palette shown in the ShapeLibrary (toolbar).
 *
 * Presets are not 1:1 with shape types (e.g. "rect" and "rect-markdown" are
 * both variants of the rect type). Creation always goes through the
 * objectType's `ShapeFactory`, passing defaultOverrides.
 */
export type ShapePreset = {
	id: string;
	objectType: ObjectType;
	label: string;
	defaultOverrides?: Record<string, unknown>;
	/** Icon shown in the toolbar. */
	icon: ComponentType<ShapeIconProps>;
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
