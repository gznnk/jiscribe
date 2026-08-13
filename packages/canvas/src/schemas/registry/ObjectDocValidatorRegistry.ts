import type { SemanticDiagnostic } from "../canvas/validators/types";
import type { ObjectFeatures } from "../objects/types/ObjectFeatures";
import type { ObjectType } from "../objects/types/ObjectType";

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

	/** Whether the registry is empty (no type registered yet). */
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
