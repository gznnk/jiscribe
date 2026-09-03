import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import type { ComponentType } from "react";

import type { LocaleMessages } from "../../messages/resolveLocaleMessages";

/** Props received by a StencilLibrary icon component. */
export type StencilIconProps = {
	width?: number;
	height?: number;
};

/**
 * A single item in the stencil palette shown in the StencilLibrary (toolbar).
 *
 * Presets are not 1:1 with object types (e.g. "rect" and "process" are both
 * variants of the rect type). Creation always goes through the objectType's
 * `ObjectFactory`, passing defaultOverrides.
 */
export type Stencil = {
	/**
	 * Stable identifier; the lookup key for label overrides and toolbar layout. Shared by
	 * every plugin a host applies, so a plugin offering several presets of one type
	 * prefixes them (`lucideIconFileText`). No colon: it separates the id from the `item`
	 * token in the DOM (`data-part="item:{id}"`), and StencilRegistry refuses one that has it.
	 */
	id: string;
	/** Object type this preset creates through (presets are not 1:1 with types). */
	objectType: ObjectType;
	/**
	 * Display label: a plain string or a per-locale dictionary.
	 * Resolved via `messages.stencilLabels[id]` (host override) → this label.
	 */
	label: string | LocaleMessages<string>;
	/** Icon component rendered in the palette. */
	icon: ComponentType<StencilIconProps>;
	/** Merged over the objectType's defaults when creating via its `ObjectFactory`. */
	defaultOverrides?: Record<string, unknown>;
};
