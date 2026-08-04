import { FeatureGatedStyleProperty } from "./FeatureGatedStyleProperty";
import { LockAspectRatioProperty } from "./LockAspectRatioProperty";
import type { StylePropertyHandler } from "./StylePropertyHandler";
import { TextContentProperty } from "./TextContentProperty";
import { TextSlotStyleProperty } from "./TextSlotStyleProperty";

/**
 * System style properties: the closed set tied 1:1 to ObjectFeatures flags,
 * registered into every canvas's StylePropertyRegistry at bundle creation.
 * Shape-specific properties are NOT added here — declare them in the shape's
 * ExtraStyleProperties (see ObjectTypeDefinition.extraStyleProperties) instead.
 * Handlers are stateless, so the instances are shared across bundles.
 *
 * The text group lives in `state.text` as keyed slots, so a dot-path write would
 * flatten it; "text" (the content, written into the default slot) and the six
 * styling properties (written into the selected slot, or every slot when none is
 * selected) have their own handlers instead of the flag gate.
 */
export const SYSTEM_STYLE_PROPERTIES: Record<string, StylePropertyHandler> = {
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
	startArrow: new FeatureGatedStyleProperty("arrow", "string"),
	endArrow: new FeatureGatedStyleProperty("arrow", "string"),
	lockAspectRatio: new LockAspectRatioProperty(),
};
