import type { ARROW_STYLE_KEYS } from "@jiscribe/doc/model/objects/base/ArrowStyleDoc";
import type { FILL_STYLE_KEYS } from "@jiscribe/doc/model/objects/base/FillStyleDoc";
import type { RADIUS_STYLE_KEYS } from "@jiscribe/doc/model/objects/base/RadiusStyleDoc";
import type { STROKE_STYLE_KEYS } from "@jiscribe/doc/model/objects/base/StrokeStyleDoc";
import type { TEXT_SLOT_STYLE_KEYS } from "@jiscribe/doc/model/objects/types/text/TextSlot";

import { FeatureGatedStyleProperty } from "./FeatureGatedStyleProperty";
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
 * The whole text group is in it now, which is why no name below is one of
 * TEXT_SLOT_STYLE_KEYS.
 */
type IntentStyleName =
	| "fill"
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
 * Two names are not a style group's and are spelled here. "text" is the content rather
 * than styling. Of the transform group only `lockAspectRatio` is written this way:
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
 * canvas's StylePropertyRegistry at bundle creation. Several names may share one
 * ObjectFeatures flag as their gate (strokeWidth and strokeDashType ride on "stroke").
 * Shape-specific properties are NOT added here — declare them in the shape's
 * ExtraStyleProperties (see ObjectTypeDefinition.extraStyleProperties) instead.
 * Handlers are stateless, so the instances are shared across bundles.
 *
 * The text content lives in `state.text` as keyed slots, so a dot-path write
 * would flatten it; "text" (written into the default slot) has its own handler
 * instead of the flag gate.
 */
export const SYSTEM_STYLE_PROPERTIES: Record<
	SystemStyleName,
	StylePropertyHandler
> = {
	fillOpacity: new FeatureGatedStyleProperty("fill", "number"),
	stroke: new FeatureGatedStyleProperty("stroke", "string"),
	strokeWidth: new FeatureGatedStyleProperty("stroke", "number"),
	strokeDashType: new FeatureGatedStyleProperty("stroke", "string"),
	strokeOpacity: new FeatureGatedStyleProperty("stroke", "number"),
	rx: new FeatureGatedStyleProperty("radius", "number"),
	text: new TextContentProperty(),
	startArrow: new FeatureGatedStyleProperty("arrow", "string"),
	endArrow: new FeatureGatedStyleProperty("arrow", "string"),
	lockAspectRatio: new LockAspectRatioProperty(),
};
