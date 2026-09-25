import { OBJECT_COMMON_KEYS } from "../model/objects/base/ObjectDoc";
import { TEXT_BODY_KEYS } from "../model/objects/base/TextStyleDoc";
import { TRANSFORM_STYLE_KEYS } from "../model/objects/base/TransformDoc";
import type { ObjectFeatures } from "../model/objects/types/ObjectFeatures";
import type { ObjectType } from "../model/objects/types/ObjectType";
import {
	isSingleBodyText,
	textStyleKeysOf,
} from "../model/objects/types/text/TextType";
import { collectStyleKeys } from "../model/objects/utils/collectStyleKeys";
import { collectGeometryKeys } from "../model/objects/validators/validateGeometryFields";
import type { SemanticDiagnostic } from "../model/types/SemanticDiagnostic";
import type { ObjectDocDefinition } from "../plugin/ObjectDocDefinition";
import type { ObjectDocValidateFn } from "../plugin/ObjectDocValidateFn";
import type { DocDefinitionsConfig } from "../plugin/resolveDocDefinitions";
import { resolveDocDefinitions } from "../plugin/resolveDocDefinitions";

/**
 * What the registry reads off a type's definition: its own check of a doc, and
 * the two declarations that say which field names a doc of it may carry. Taken
 * from {@link ObjectDocDefinition} rather than restated, so a type registered
 * here and the same type handed to the mapper or to doc-ops cannot disagree
 * about what it holds.
 */
export type ObjectDocValidatorDeclaration = Pick<
	ObjectDocDefinition,
	"features" | "validateDoc" | "extraKeys"
>;

/**
 * What the parser's key check (`parse/validateDocKeys`) reads off a registered
 * type: the descriptor that says which containers a doc of it can hold, and the
 * names the object itself may carry. Built once at registration rather than on
 * every doc checked.
 */
export type DocKeyDeclaration = {
	/** The type's descriptor, which decides the nested containers to walk. */
	features: ObjectFeatures;
	/** Names the object itself may carry, as {@link collectKnownKeys} built them. */
	knownKeys: ReadonlySet<string>;
};

type ValidatorEntry = DocKeyDeclaration & {
	validate: ObjectDocValidateFn;
};

/**
 * Every field name a type of these features may write on the object itself: the
 * ones every object has, the geometry's coordinates, the style groups the
 * features enable, the text group in the form the text kind takes, and the names
 * the type declares for itself. Anything else the document writes is reported as
 * unknown and dropped on save, so a name missing here is a value silently lost —
 * the set is built from the very constants each group is defined by rather than
 * restated.
 */
const collectKnownKeys = (
	features: ObjectFeatures,
	extraKeys: readonly string[],
): ReadonlySet<string> =>
	new Set<string>([
		...OBJECT_COMMON_KEYS,
		...collectGeometryKeys(features.geometry),
		...(features.transform ? TRANSFORM_STYLE_KEYS : []),
		...collectStyleKeys(features),
		// A "slots" type keeps its styling inside each slot, so the object itself
		// carries the `text` record and nothing more; which slot ids it may hold is
		// the type's own to check, and its `validateDoc` is where it does it.
		...(features.text !== undefined ? ["text"] : []),
		...(isSingleBodyText(features.text)
			? [...textStyleKeysOf(features.text), ...TEXT_BODY_KEYS]
			: []),
		...extraKeys,
	]);

class ObjectDocValidatorRegistry {
	private readonly entries = new Map<ObjectType, ValidatorEntry>();

	/**
	 * Holds one entry per resolved type, each built from that type's whole
	 * definition; the accepted-name set is taken off it once here rather than on
	 * every doc checked.
	 */
	constructor(definitions: ReadonlyMap<string, ObjectDocValidatorDeclaration>) {
		definitions.forEach((declaration, type) => {
			this.entries.set(type as ObjectType, {
				validate: declaration.validateDoc,
				features: declaration.features,
				knownKeys: collectKnownKeys(
					declaration.features,
					declaration.extraKeys ?? [],
				),
			});
		});
	}

	/**
	 * Checks one object doc by the type's own rules about the values it holds.
	 * Which names the doc may carry is not asked here: that is the parser's check
	 * (`parse/validateDocKeys`), held against {@link getKeyDeclaration}.
	 *
	 * @param type - The doc's `type` field; one never registered yields no diagnostics, the object being opaque (see {@link hasType})
	 * @param obj - The object doc, read as a plain record
	 * @param path - JSON path of `obj` itself, which every diagnostic is reported under
	 */
	validate(
		type: string,
		obj: Record<string, unknown>,
		path: string,
	): SemanticDiagnostic[] {
		return this.entries.get(type as ObjectType)?.validate(obj, path) ?? [];
	}

	/**
	 * What the parser holds a doc of the type against when it looks for names the
	 * type does not hold; undefined for a type never registered, whose docs are
	 * opaque and not looked into.
	 */
	getKeyDeclaration(type: string): DocKeyDeclaration | undefined {
		return this.entries.get(type as ObjectType);
	}

	/**
	 * Returns whether a type is registered here at all. A type that is not is one
	 * the parser has no declaration for, so nothing about a doc of it can be
	 * checked and it is passed through as an opaque object (see OpaqueObjectDoc).
	 */
	hasType(type: string): boolean {
		return this.entries.has(type as ObjectType);
	}

	/** The type's descriptor, for reading what it can do; ask {@link hasType} whether it is registered at all. */
	getFeatures(type: string): ObjectFeatures | undefined {
		return this.entries.get(type as ObjectType)?.features;
	}

	/** Returns whether the given type can be connected as a connector endpoint. Unregistered types return false. */
	isConnectable(type: string): boolean {
		return this.entries.get(type as ObjectType)?.features.connectable === true;
	}
}

/**
 * Builds a doc-validator registry from a resolved definition set. Each call returns
 * a fresh instance, so parsers configured differently never see each other's types;
 * there is no way to build an empty one and fill it later, a registry being what a
 * definition set says and nothing more.
 *
 * @param config - Resolved by {@link resolveDocDefinitions} (see it for the preset/plugin
 *   merge and duplicate-type semantics). Omit for the built-in set as-is.
 */
export const createDocValidatorRegistry = (
	config?: DocDefinitionsConfig,
): ObjectDocValidatorRegistry =>
	new ObjectDocValidatorRegistry(resolveDocDefinitions(config));

// Exported as a type only: a registry is always obtained from the factory above (one per
// parser — there is no shared global instance), never by construction.
export type { ObjectDocValidatorRegistry };
