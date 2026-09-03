import { hasInsetTextRegion, calcFullBoxTextRegion } from "@jiscribe/doc";

import type { AnyObjectTypeDefinition } from "./ObjectTypeDefinition";

/**
 * Whether switching this type's `textVerticalBasis` moves its body at all — the
 * doc layer's own answer (`hasInsetTextRegion`), asked of a UI definition.
 *
 * The region asked is the UI one ({@link ObjectTypeDefinition.textRegion}),
 * unlike the auto-height verdict next door (`supportsAutoHeightType`), which has
 * to match what the parser accepts. Here the region that matters is the one the
 * basis is applied to when the shape is drawn (`calcTextRegion`), and that is
 * this one. A type registering no region of its own is drawn with its whole box,
 * which the two bases name alike, so the default stood in here answers false.
 *
 * @param definition - The type's UI definition; only `features` and `textRegion` are read, so the answer is a fact about the type
 * @returns True when the canvas may offer this type the switch
 */
export const hasInsetTextRegionType = (
	definition: AnyObjectTypeDefinition,
): boolean =>
	hasInsetTextRegion({
		features: definition.features,
		textRegion: definition.textRegion ?? calcFullBoxTextRegion,
	});
