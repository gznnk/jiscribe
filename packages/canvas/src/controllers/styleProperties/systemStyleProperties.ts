import type { ARROW_STYLE_KEYS } from "@jiscribe/doc/model/objects/base/ArrowStyleDoc";
import type { FILL_STYLE_KEYS } from "@jiscribe/doc/model/objects/base/FillStyleDoc";
import type { RADIUS_STYLE_KEYS } from "@jiscribe/doc/model/objects/base/RadiusStyleDoc";
import type { STROKE_STYLE_KEYS } from "@jiscribe/doc/model/objects/base/StrokeStyleDoc";
import type { TEXT_SLOT_STYLE_KEYS } from "@jiscribe/doc/model/objects/types/text/TextSlot";

import { LockAspectRatioProperty } from "./LockAspectRatioProperty";
import type { StylePropertyHandler } from "./StylePropertyHandler";
import { TextContentProperty } from "./TextContentProperty";

/**
 * The names the style tables answer for instead (ObjectStyleRegistry, reached
 * through StylePropertyRegistry.apply). Subtracted from SystemStyleName below so
 * the exhaustive record neither demands a handler that nothing would reach nor
 * lets one linger. The list grows as the remaining properties move over, and
 * takes this whole module with it.
 *
 * Every field of every style group is in it now, which is why no name below is
 * one of the `*_STYLE_KEYS`.
 */
type IntentStyleName =
	| "fill"
	| "fillOpacity"
	| "stroke"
	| "strokeWidth"
	| "strokeDashType"
	| "strokeOpacity"
	| "rx"
	| "startArrow"
	| "endArrow"
	| "fontColor"
	| "fontSize"
	| "fontFamily"
	| "fontWeight"
	| "fontStyle"
	| "textDecoration"
	| "textAlign"
	| "verticalAlign";

/**
 * Every name a system style property may carry, taken from the style groups the doc
 * declares, less the ones already answered by the style tables (IntentStyleName).
 * `Record<SystemStyleName, ...>` below then demands one handler each, so a
 * field added to a group fails to compile until it is given one, and a name no group
 * owns is refused.
 *
 * Both names left are ones no style group owns. "text" is the content rather than
 * styling. Of the transform group only `lockAspectRatio` is written this way:
 * rotation and the flips are moved through their own gestures and ops, never through a
 * style property, so listing them would demand handlers that nothing would reach.
 */
type SystemStyleName = Exclude<
	| (typeof FILL_STYLE_KEYS)[number]
	| (typeof STROKE_STYLE_KEYS)[number]
	| (typeof RADIUS_STYLE_KEYS)[number]
	| (typeof TEXT_SLOT_STYLE_KEYS)[number]
	| (typeof ARROW_STYLE_KEYS)[number]
	| "text"
	| "lockAspectRatio",
	IntentStyleName
>;

/**
 * System style properties: one handler per SystemStyleName, registered into every
 * canvas's StylePropertyRegistry at bundle creation. What gates support is the
 * handler's own business.
 * Shape-specific properties are NOT added here — declare them in the shape's
 * ExtraStyleProperties (see ObjectTypeDefinition.extraStyleProperties) instead.
 * Handlers are stateless, so the instances are shared across bundles.
 *
 * The text content lives in `state.text` as keyed slots, so a dot-path write
 * would flatten it; "text" (written into the default slot) has a handler of its
 * own.
 */
export const SYSTEM_STYLE_PROPERTIES: Record<
	SystemStyleName,
	StylePropertyHandler
> = {
	text: new TextContentProperty(),
	lockAspectRatio: new LockAspectRatioProperty(),
};
