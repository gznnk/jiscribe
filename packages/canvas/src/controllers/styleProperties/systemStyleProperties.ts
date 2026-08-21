import type { ARROW_STYLE_KEYS } from "@jiscribe/doc/model/objects/base/ArrowStyleDoc";
import type { FILL_STYLE_KEYS } from "@jiscribe/doc/model/objects/base/FillStyleDoc";
import type { RADIUS_STYLE_KEYS } from "@jiscribe/doc/model/objects/base/RadiusStyleDoc";
import type { STROKE_STYLE_KEYS } from "@jiscribe/doc/model/objects/base/StrokeStyleDoc";
import type { TEXT_SLOT_STYLE_KEYS } from "@jiscribe/doc/model/objects/types/TextSlot";

import { FeatureGatedStyleProperty } from "./FeatureGatedStyleProperty";
import { LockAspectRatioProperty } from "./LockAspectRatioProperty";
import type { StylePropertyHandler } from "./StylePropertyHandler";
import { TextContentProperty } from "./TextContentProperty";
import { TextSlotStyleProperty } from "./TextSlotStyleProperty";

/**
 * Every name a system style property may carry, taken from the style groups the doc
 * declares. `Record<SystemStyleName, ...>` below then demands one handler each, so a
 * field added to a group fails to compile until it is given one, and a name no group
 * owns is refused.
 *
 * Two names are not a style group's and are spelled here. "text" is the content rather
 * than styling. Of the transform group only `lockAspectRatio` is written this way:
 * rotation and the flips are moved through their own gestures and ops, never through a
 * style property, so listing them would demand handlers that nothing would reach.
 */
type SystemStyleName =
	| (typeof FILL_STYLE_KEYS)[number]
	| (typeof STROKE_STYLE_KEYS)[number]
	| (typeof RADIUS_STYLE_KEYS)[number]
	| (typeof TEXT_SLOT_STYLE_KEYS)[number]
	| (typeof ARROW_STYLE_KEYS)[number]
	| "text"
	| "lockAspectRatio";

/**
 * System style properties: the closed set tied 1:1 to ObjectFeatures flags,
 * registered into every canvas's StylePropertyRegistry at bundle creation.
 * Shape-specific properties are NOT added here — declare them in the shape's
 * ExtraStyleProperties (see ObjectTypeDefinition.extraStyleProperties) instead.
 * Handlers are stateless, so the instances are shared across bundles.
 *
 * The text group lives in `state.text` as keyed slots, so a dot-path write would
 * flatten it; "text" (the content, written into the default slot) and the
 * styling properties (written into the selected slot, or every slot when none is
 * selected) have their own handlers instead of the flag gate.
 */
export const SYSTEM_STYLE_PROPERTIES: Record<
	SystemStyleName,
	StylePropertyHandler
> = {
	fill: new FeatureGatedStyleProperty("fill", "string"),
	stroke: new FeatureGatedStyleProperty("stroke", "string"),
	strokeWidth: new FeatureGatedStyleProperty("stroke", "number"),
	strokeDashType: new FeatureGatedStyleProperty("stroke", "string"),
	rx: new FeatureGatedStyleProperty("radius", "number"),
	text: new TextContentProperty(),
	textAlign: new TextSlotStyleProperty("string"),
	verticalAlign: new TextSlotStyleProperty("string"),
	fontColor: new TextSlotStyleProperty("string"),
	fontSize: new TextSlotStyleProperty("number"),
	fontFamily: new TextSlotStyleProperty("string"),
	fontWeight: new TextSlotStyleProperty("string"),
	fontStyle: new TextSlotStyleProperty("string"),
	textDecoration: new TextSlotStyleProperty("string"),
	startArrow: new FeatureGatedStyleProperty("arrow", "string"),
	endArrow: new FeatureGatedStyleProperty("arrow", "string"),
	lockAspectRatio: new LockAspectRatioProperty(),
};
