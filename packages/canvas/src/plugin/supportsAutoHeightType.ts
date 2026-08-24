import { supportsAutoHeight, calcFullBoxTextRegion } from "@jiscribe/doc";

import type { AnyObjectTypeDefinition } from "./ObjectTypeDefinition";

/**
 * Whether a document of this type may leave `height` out and have it follow the
 * text — the doc layer's own answer (`supportsAutoHeight`), asked of a UI
 * definition.
 *
 * A UI definition drops the doc-side region and declares its own
 * ({@link ObjectTypeDefinition.textRegion}), so the two can disagree, and only
 * the doc side's answer matches what the parser accepts. Both directions are
 * covered:
 *
 * - a type registering no UI region is drawn with its whole box as the region
 *   (`calcTextRegion`), which is the region stood in here so a shape whose doc
 *   declares one and whose renderer is happy with the default still counts
 * - a UI region over a doc one that answers `null` — a label drawn below the
 *   outline, a record's bands — is denied at the source rather than here:
 *   `createFrameObjectDefinition` carries the doc's verdict across as
 *   `autoHeight: false`, and the built-ins spread their doc definition whole
 *
 * @param definition - The type's UI definition; only `features`, `textRegion` and `autoHeight` are read, so the answer is a fact about the type
 * @returns True when the canvas may offer this type the switch
 */
export const supportsAutoHeightType = (
	definition: AnyObjectTypeDefinition,
): boolean =>
	supportsAutoHeight({
		features: definition.features,
		textRegion: definition.textRegion ?? calcFullBoxTextRegion,
		autoHeight: definition.autoHeight,
	});
