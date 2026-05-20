import type { SemanticDiagnostic } from "./types";
import type { ObjectType } from "../../objects/types/ObjectType";

export type ObjectDocValidateFn = (
	obj: Record<string, unknown>,
	path: string,
) => SemanticDiagnostic[];

class ObjectDocValidatorRegistry {
	private readonly validators = new Map<ObjectType, ObjectDocValidateFn>();

	register(type: ObjectType, validate: ObjectDocValidateFn): void {
		this.validators.set(type, validate);
	}

	validate(
		type: string,
		obj: Record<string, unknown>,
		path: string,
	): SemanticDiagnostic[] {
		return this.validators.get(type as ObjectType)?.(obj, path) ?? [];
	}

	clear(): void {
		this.validators.clear();
	}
}

export const objectDocValidatorRegistry = new ObjectDocValidatorRegistry();
