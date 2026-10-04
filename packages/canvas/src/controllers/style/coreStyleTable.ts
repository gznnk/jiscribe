import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";

import { objectField } from "./entries/objectField";
import type { StyleTable } from "./StyleEntry";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * The table a type gets for free, derived from the features it already
 * declares — so the flags are read once, here, when the table is built, and
 * never again by whoever applies or reports a style.
 *
 * Only `fill` is derived so far; the other groups follow as their intents move
 * off StylePropertyRegistry. The declaration that lets a type whose storage
 * differs from the core guess (a table's fill, which lives on the cells) replace
 * an entry rather than name a property of its own comes with that move too.
 *
 * @param features - The type's feature flags, as the object states carry them
 * @returns The type's table; empty for a type whose features enable nothing yet
 */
export const coreStyleTable = (
	features: ObjectFeatures,
): StyleTable<ObjectState> => ({
	...(features.fill && { fill: objectField<ObjectState, string>("fill") }),
});
