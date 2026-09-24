import type { ObjectDocDefinition } from "./ObjectDocDefinition";
import type { ObjectDocValidateFn } from "./ObjectDocValidateFn";
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
import { collectGeometryKeys } from "../model/objects/utils/geometryFields";
import type { SemanticDiagnostic } from "../model/types/SemanticDiagnostic";

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

type ValidatorEntry = {
	validate: ObjectDocValidateFn;
	features: ObjectFeatures;
	knownKeys: ReadonlySet<string>;
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
		// carries the `text` record and nothing more; the closed slot set is the
		// type's own to check, and its `validateDoc` is where it does it.
		...(features.text !== undefined ? ["text"] : []),
		...(isSingleBodyText(features.text)
			? [...textStyleKeysOf(features.text), ...TEXT_BODY_KEYS]
			: []),
		...extraKeys,
	]);

/**
 * Reports one warning per own key of `o` that the type does not hold. Warnings
 * rather than errors: the canvas already drops such a field on the way to the
 * state, so the document still opens — it just loses the field the next time it
 * is saved, which is what the message says and what `unknownKeyPath` lets the
 * parser carry out.
 */
const validateKnownKeys = (
	o: Record<string, unknown>,
	path: string,
	entry: ValidatorEntry,
): SemanticDiagnostic[] =>
	Object.keys(o)
		.filter((key) => !entry.knownKeys.has(key))
		.map((key) => ({
			path: `${path}.${key}`,
			message: `Unknown property "${key}" on a "${entry.features.type}": it was ignored and will be dropped on save.`,
			severity: "warning" as const,
			unknownKeyPath: [key],
		}));

class ObjectDocValidatorRegistry {
	private readonly entries = new Map<ObjectType, ValidatorEntry>();

	/**
	 * Adds one type, taking the accepted-name set off its declaration once here
	 * rather than on every doc checked.
	 *
	 * @param type - The `type` field a doc writes to name this type; a second registration replaces the first
	 * @param declaration - The type's definition, or the `{ features, validateDoc, extraKeys }` of one being assembled
	 */
	register(type: string, declaration: ObjectDocValidatorDeclaration): void {
		this.entries.set(type as ObjectType, {
			validate: declaration.validateDoc,
			features: declaration.features,
			knownKeys: collectKnownKeys(
				declaration.features,
				declaration.extraKeys ?? [],
			),
		});
	}

	/**
	 * Checks one object doc: the type's own rules about the values it holds, then
	 * the names it does not hold at all. The second half is the registry's own —
	 * a validator knows what its values must look like, not which fields the
	 * definition lets the type carry.
	 *
	 * @param type - The doc's `type` field; one never registered yields no diagnostics, the object being opaque (see {@link hasType})
	 * @param obj - The object doc, read as a plain record
	 * @param path - JSON path of `obj` itself, which every diagnostic is reported under
	 * @returns The type's diagnostics first, then one `severity: "warning"` entry per unknown field name
	 */
	validate(
		type: string,
		obj: Record<string, unknown>,
		path: string,
	): SemanticDiagnostic[] {
		const entry = this.entries.get(type as ObjectType);
		if (entry === undefined) {
			return [];
		}
		return [
			...entry.validate(obj, path),
			...validateKnownKeys(obj, path, entry),
		];
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

export const createObjectDocValidatorRegistry =
	(): ObjectDocValidatorRegistry => new ObjectDocValidatorRegistry();

// Exported as a type only: a registry is always obtained from the factory above (one per
// parser — there is no shared global instance), never by construction.
export type { ObjectDocValidatorRegistry };
