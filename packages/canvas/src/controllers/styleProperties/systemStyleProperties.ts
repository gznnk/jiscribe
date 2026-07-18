import { FeatureGatedStyleProperty } from "./FeatureGatedStyleProperty";
import { LockAspectRatioProperty } from "./LockAspectRatioProperty";
import type { StylePropertyHandler } from "./StylePropertyHandler";

/**
 * System style properties: the closed set tied 1:1 to ObjectFeatures flags,
 * registered into every canvas's StylePropertyRegistry at bundle creation.
 * Shape-specific properties are NOT added here — declare them in the shape's
 * ExtraStyleProperties (see ObjectTypeDefinition.extraStyleProperties) instead.
 * Handlers are stateless, so the instances are shared across bundles.
 */
export const SYSTEM_STYLE_PROPERTIES: Record<string, StylePropertyHandler> = {
	fill: new FeatureGatedStyleProperty("fill", "string"),
	stroke: new FeatureGatedStyleProperty("stroke", "string"),
	strokeWidth: new FeatureGatedStyleProperty("stroke", "number"),
	strokeDashType: new FeatureGatedStyleProperty("stroke", "string"),
	rx: new FeatureGatedStyleProperty("radius", "number"),
	text: new FeatureGatedStyleProperty("text", "string"),
	textAlign: new FeatureGatedStyleProperty("text", "string"),
	verticalAlign: new FeatureGatedStyleProperty("text", "string"),
	fontColor: new FeatureGatedStyleProperty("text", "string"),
	fontSize: new FeatureGatedStyleProperty("text", "number"),
	fontFamily: new FeatureGatedStyleProperty("text", "string"),
	fontWeight: new FeatureGatedStyleProperty("text", "string"),
	startArrow: new FeatureGatedStyleProperty("arrow", "string"),
	endArrow: new FeatureGatedStyleProperty("arrow", "string"),
	lockAspectRatio: new LockAspectRatioProperty(),
};
