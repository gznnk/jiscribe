import type { ObjectFeatures } from "../../../../../schemas/objects/types/ObjectFeatures";
import type { ObjectMenuConfig } from "../types/ObjectMenuConfig";

/**
 * Creates a menu configuration object based on object features.
 * This utility generates the appropriate menu options based on the capabilities
 * defined in the ObjectFeatures.
 *
 * Based on svg-canvas's createMenuConfig but adapted for svg-canvas-2.
 *
 * @param features - The object features that determine available menu options
 * @param overrides - Optional manual overrides to enable/disable specific menu options
 * @returns An ObjectMenuConfig object with menu options enabled based on features
 *
 * @example
 * ```typescript
 * const rectMenu = createMenuConfig(RectFeatures);
 * const connectorMenu = createMenuConfig(ConnectorFeatures, {
 *   lineColor: true,
 *   lineStyle: true,
 *   arrowHead: true,
 * });
 * ```
 */
export const createMenuConfig = (
	features: ObjectFeatures,
	overrides: ObjectMenuConfig = {},
): ObjectMenuConfig => {
	const config: ObjectMenuConfig = {};

	// Add fill features
	if (features.fill) {
		config.backgroundColor = overrides.backgroundColor ?? true;
	}

	// Add stroke features
	if (features.stroke) {
		config.borderColor = overrides.borderColor ?? true;
		// Only include borderStyle if not explicitly overridden to undefined
		if (!("borderStyle" in overrides) || overrides.borderStyle !== undefined) {
			config.borderStyle = overrides.borderStyle ?? { radius: false };
		}
	}

	// Add radius features
	if (features.radius) {
		// Also add radius to borderStyle if stroke is available
		if (features.stroke && config.borderStyle) {
			config.borderStyle.radius = overrides.borderStyle?.radius ?? true;
		}
	}

	// Add text features
	if (features.text) {
		config.fontStyle = overrides.fontStyle ?? true;
		config.textAlignment = overrides.textAlignment ?? true;
	}

	// Add transform features (aspect ratio)
	if (features.transform) {
		config.aspectRatio = overrides.aspectRatio ?? true;
	}

	// Add line color (for lines, connectors, polylines)
	if (overrides.lineColor !== undefined) {
		config.lineColor = overrides.lineColor;
	}

	// Add arrow head controls
	if (overrides.arrowHead !== undefined) {
		config.arrowHead = overrides.arrowHead;
	}

	// Add line style controls
	if (overrides.lineStyle !== undefined) {
		config.lineStyle = overrides.lineStyle;
	}

	return config;
};
