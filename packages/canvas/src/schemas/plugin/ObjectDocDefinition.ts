import type { ObjectFactory } from "../objects/types/ObjectFactory";
import type { ObjectFeatures } from "../objects/types/ObjectFeatures";
import type { ObjectDocValidateFn } from "../registry/ObjectDocValidatorRegistry";

/**
 * Headless (UI-independent) description of a single object type: everything the
 * parse layer needs to know a type exists, validate its doc, and create it from
 * a doc — with no React / presentation / controller dependency. The full
 * {@link import("../../plugin/ObjectTypeDefinition").ObjectTypeDefinition} is this
 * intersected with the UI-side contracts, so a UI definition is structurally a
 * doc definition.
 */
export type ObjectDocDefinition = {
	/** Geometry kind and per-type capability flags (see ObjectFeatures). */
	features: ObjectFeatures;

	/** Doc validator used by parse-time structure/semantic validation. */
	validateDoc: ObjectDocValidateFn;

	/** Doc creation, dimensions, and bounds generation. Omitted for types not created programmatically. */
	factory?: ObjectFactory;
};
