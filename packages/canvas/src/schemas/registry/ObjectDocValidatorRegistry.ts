import type { SemanticDiagnostic } from "../canvas/validators/types";
import type { ObjectFeatures } from "../objects/types/ObjectFeatures";
import type { ObjectType } from "../objects/types/ObjectType";

export type ObjectDocValidateFn = (
	obj: Record<string, unknown>,
	path: string,
) => SemanticDiagnostic[];

/**
 * A parse-time extension for one object type: its doc validator plus the features
 * used for structure-stage type-existence checks and semantic-stage connectability
 * checks (see {@link ObjectDocValidatorRegistry.getFeatures} / `isConnectable`).
 * `createCanvasParser` composes an array of these into a dedicated registry instance.
 */
export type ObjectParserExtension = {
	type: ObjectType;
	features: ObjectFeatures;
	validateDoc: ObjectDocValidateFn;
};

type ValidatorEntry = {
	validate: ObjectDocValidateFn;
	features: ObjectFeatures;
};

class ObjectDocValidatorRegistry {
	private readonly entries = new Map<ObjectType, ValidatorEntry>();

	register(
		type: ObjectType,
		validate: ObjectDocValidateFn,
		features: ObjectFeatures,
	): void {
		this.entries.set(type, { validate, features });
	}

	validate(
		type: string,
		obj: Record<string, unknown>,
		path: string,
	): SemanticDiagnostic[] {
		return this.entries.get(type as ObjectType)?.validate(obj, path) ?? [];
	}

	getFeatures(type: string): ObjectFeatures | undefined {
		return this.entries.get(type as ObjectType)?.features;
	}

	/** Returns whether the given type can be connected as a connector endpoint. Unregistered types return false. */
	isConnectable(type: string): boolean {
		return this.entries.get(type as ObjectType)?.features.connectable === true;
	}

	/** Whether the registry is empty. Used to decide whether parseCanvasText needs lazy initialization. */
	isEmpty(): boolean {
		return this.entries.size === 0;
	}

	clear(): void {
		this.entries.clear();
	}
}

export const createObjectDocValidatorRegistry =
	(): ObjectDocValidatorRegistry => new ObjectDocValidatorRegistry();

export const objectDocValidatorRegistry = createObjectDocValidatorRegistry();
