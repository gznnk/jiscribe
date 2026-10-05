import type { ArrowType } from "@jiscribe/doc/model/objects/types/ArrowType";
import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";
import type { StrokeDashType } from "@jiscribe/doc/model/objects/types/StrokeDashType";
import { UNDECLARED_STROKE_DASH } from "@jiscribe/doc/model/objects/utils/shapeStyleFallback";

import { objectField } from "./entries/objectField";
import { defaultSlotsOf } from "./entries/slotEntry";
import type { StyleTable } from "./StyleEntry";
import { textStyleTable } from "./textStyleTable";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * The table a type gets for free, derived from the features it already
 * declares — so the flags are read once, here, when the table is built, and
 * never again by whoever applies or reports a style.
 *
 * Every object-level style field is derived now; what still goes through
 * StylePropertyRegistry is the text content, `lockAspectRatio` and the shapes'
 * own ExtraStyleProperties. The declaration that lets a type whose storage
 * differs from the core guess (a table's fill, which lives on the cells) replace
 * an entry rather than name a property of its own comes with a later stage.
 *
 * @param features - The type's feature flags, as the object states carry them
 * @returns The type's table; empty for a type whose features enable nothing
 */
export const coreStyleTable = (
	features: ObjectFeatures,
): StyleTable<ObjectState> => ({
	...(features.fill && {
		fill: objectField<ObjectState, string>("fill"),
		fillOpacity: objectField<ObjectState, number>("fillOpacity"),
	}),
	...(features.stroke && {
		stroke: objectField<ObjectState, string>("stroke"),
		strokeWidth: objectField<ObjectState, number>("strokeWidth"),
		// The one field resolution can leave absent, so the entry is the place that
		// names what an undeclared dash is reported as.
		strokeDashType: objectField<ObjectState, StrokeDashType>(
			"strokeDashType",
			UNDECLARED_STROKE_DASH,
		),
		strokeOpacity: objectField<ObjectState, number>("strokeOpacity"),
	}),
	// The intent is named after what it means, the field after the SVG attribute
	// the radius has always been stored in.
	...(features.radius && {
		cornerRadius: objectField<ObjectState, number>("rx"),
	}),
	...(features.arrow && {
		startArrow: objectField<ObjectState, ArrowType>("startArrow"),
		endArrow: objectField<ObjectState, ArrowType>("endArrow"),
	}),
	// The core types spell their slots out as the keys of `text`, so the slots a
	// write reaches are read off the object itself (defaultSlotsOf).
	...(features.text && textStyleTable(features.text, defaultSlotsOf)),
});
