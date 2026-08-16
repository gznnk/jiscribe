import type { ObjectFeatures } from "../objects/types/ObjectFeatures";
import type { ObjectType } from "../objects/types/ObjectType";
import type { SemanticDiagnostic } from "../types/SemanticDiagnostic";

export type ObjectDocValidateFn = (
	obj: Record<string, unknown>,
	path: string,
) => SemanticDiagnostic[];

type ValidatorEntry = {
	validate: ObjectDocValidateFn;
	features: ObjectFeatures;
};

class ObjectDocValidatorRegistry {
	private readonly entries = new Map<ObjectType, ValidatorEntry>();

	register(
		type: string,
		validate: ObjectDocValidateFn,
		features: ObjectFeatures,
	): void {
		this.entries.set(type as ObjectType, { validate, features });
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
}

export const createObjectDocValidatorRegistry =
	(): ObjectDocValidatorRegistry => new ObjectDocValidatorRegistry();

// Exported as a type only: a registry is always obtained from the factory above (one per
// parser — there is no shared global instance), never by construction.
export type { ObjectDocValidatorRegistry };
