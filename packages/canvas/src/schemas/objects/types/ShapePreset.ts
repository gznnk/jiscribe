import type { ComponentType } from "react";

import type { ObjectType } from "./ObjectType";

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
	/**
	 * Display order in the toolbar. Smaller values are placed further left.
	 * Equal or unspecified values preserve registration order. Lets the preset
	 * declare a display order independent of registration order, e.g. basic
	 * shapes first and variants after.
	 */
	order?: number;
	/**
	 * Icon shown in the toolbar. Since preset data (schemas) has no UI, it is
	 * injected by the UI layer (controllers) at `registerObject()` time.
	 */
	icon?: ComponentType<ShapeIconProps>;
};
