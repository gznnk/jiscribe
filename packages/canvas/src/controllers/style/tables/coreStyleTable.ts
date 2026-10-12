import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";

import { textStyleTable } from "./textStyleTable";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { lockAspectRatioEntry } from "../entries/lockAspectRatioEntry";
import { objectFieldEntry } from "../entries/objectFieldEntry";
import { textVerticalBasisEntry } from "../entries/textVerticalBasisEntry";
import type { StyleTable } from "../StyleEntry";

/**
 * The table a type gets for free, derived from what it already declares — so the
 * flags are read once, here, when the table is built, and never again by whoever
 * applies or reports a style.
 *
 * What a type adds to this is its own table (ObjectTypeDefinition.styleEntries), which
 * is composed over this one — so a kind it declares replaces the derived entry,
 * which is how a type whose storage differs from the core guess (a table's fill,
 * which lives on the cells) says where the edit lands.
 *
 * @param features - The type's feature flags, as the object states carry them
 * @returns The type's table; empty for a type whose declarations enable nothing
 */
export const coreStyleTable = (
	features: ObjectFeatures,
): StyleTable<ObjectState> => ({
	...(features.fill && {
		fill: objectFieldEntry("fill"),
		fillOpacity: objectFieldEntry("fillOpacity"),
	}),
	...(features.stroke && {
		stroke: objectFieldEntry("stroke"),
		strokeWidth: objectFieldEntry("strokeWidth"),
		strokeDashType: objectFieldEntry("strokeDashType"),
		strokeOpacity: objectFieldEntry("strokeOpacity"),
	}),
	// The intent is named after what it means, the field after the SVG attribute
	// the radius has always been stored in.
	...(features.radius && {
		cornerRadius: objectFieldEntry("rx"),
	}),
	...(features.arrow && {
		startArrow: objectFieldEntry("startArrow"),
		endArrow: objectFieldEntry("endArrow"),
	}),
	// The lock rides on the transform the resize it governs acts on.
	...(features.transform && {
		lockAspectRatio: lockAspectRatioEntry,
	}),
	...(features.text && textStyleTable(features.text)),
	...(features.textVerticalBasis && {
		textVerticalBasis: textVerticalBasisEntry,
	}),
});
