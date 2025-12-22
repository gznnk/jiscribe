import type { DiagramFeatures } from "../../../types/core/DiagramFeatures";
import type { DiagramMenuConfig } from "../../../types/menu/DiagramMenuConfig";

/**
 * Creates a menu configuration object based on diagram features.
 * This utility generates the appropriate menu options based on the capabilities
 * defined in the DiagramFeatures.
 *
 * @param features - The diagram features that determine available menu options
 * @param overrides - Optional manual overrides to enable/disable specific menu options
 * @returns A DiagramMenuConfig object with menu options enabled based on features
 *
 * @example
 * ```typescript
 * const rectangleMenu = createMenuConfig(RectangleFeatures, {
 *   backgroundColor: true,
 *   borderColor: true,
 *   borderStyle: { radius: true },
 * });
 * ```
 */
export const createMenuConfig = (
	features: DiagramFeatures,
	overrides: DiagramMenuConfig = {},
): DiagramMenuConfig => {
	const config: DiagramMenuConfig = {};

	// Add fillable features
	if (features.fillable) {
		config.backgroundColor = overrides.backgroundColor ?? true;
	}

	// Add strokable features
	if (features.strokable) {
		config.borderColor = overrides.borderColor ?? true;
		config.borderStyle = overrides.borderStyle ?? {
			radius: false,
		};
	}

	// Add corner roundable features
	if (features.cornerRoundable) {
		// Also add radius to borderStyle if strokable
		if (features.strokable && config.borderStyle) {
			config.borderStyle.radius = overrides.borderStyle?.radius ?? true;
		}
	}

	// Add textable features
	if (features.textable) {
		config.fontStyle = overrides.fontStyle ?? true;
		config.textAlignment = overrides.textAlignment ?? true;
	}

	// Add transformative features
	if (features.transformative) {
		config.aspectRatio = overrides.aspectRatio ?? true;
	}

	return config;
};
