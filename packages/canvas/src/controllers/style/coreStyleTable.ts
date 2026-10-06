import type { ArrowType } from "@jiscribe/doc/model/objects/types/ArrowType";
import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";
import type { StrokeDashType } from "@jiscribe/doc/model/objects/types/StrokeDashType";

import { lockAspectRatioEntry } from "./entries/lockAspectRatioEntry";
import { objectField } from "./entries/objectField";
import { defaultSlotsOf } from "./entries/slotEntry";
import { textVerticalBasisEntry } from "./entries/textVerticalBasisEntry";
import type { StyleTable } from "./StyleEntry";
import { textStyleTable } from "./textStyleTable";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * What a type declares about itself that its table is derived from, beyond the
 * feature flags: the one verdict a flag cannot carry, read off the whole
 * definition by its own predicate (hasInsetTextRegionType).
 */
export type CoreStyleTableFacts = {
	/**
	 * Whether switching the type's `textVerticalBasis` moves its body at all. A
	 * type whose region is its whole box names one place with both bases, so the
	 * intent would be a control that does nothing.
	 */
	hasInsetTextRegion: boolean;
};

/**
 * The table a type gets for free, derived from what it already declares — so the
 * flags are read once, here, when the table is built, and never again by whoever
 * applies or reports a style.
 *
 * What a type adds to this is its own declarations (extraStyleTable), which name
 * fields of their own. The declaration that lets a type whose storage differs
 * from the core guess (a table's fill, which lives on the cells) replace an entry
 * rather than name a field of its own comes with a later stage.
 *
 * @param features - The type's feature flags, as the object states carry them
 * @param facts - What the definition says beyond its flags (CoreStyleTableFacts)
 * @returns The type's table; empty for a type whose declarations enable nothing
 */
export const coreStyleTable = (
	features: ObjectFeatures,
	facts: CoreStyleTableFacts,
): StyleTable<ObjectState> => ({
	...(features.fill && {
		fill: objectField<ObjectState, string>("fill"),
		fillOpacity: objectField<ObjectState, number>("fillOpacity"),
	}),
	...(features.stroke && {
		stroke: objectField<ObjectState, string>("stroke"),
		strokeWidth: objectField<ObjectState, number>("strokeWidth"),
		strokeDashType: objectField<ObjectState, StrokeDashType>("strokeDashType"),
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
	// The lock rides on the transform the resize it governs acts on.
	...(features.transform && {
		lockAspectRatio: lockAspectRatioEntry,
	}),
	// The core types spell their slots out as the keys of `text`, so the slots a
	// write reaches are read off the object itself (defaultSlotsOf).
	...(features.text && textStyleTable(features.text, defaultSlotsOf)),
	...(facts.hasInsetTextRegion && {
		textVerticalBasis: textVerticalBasisEntry,
	}),
});
