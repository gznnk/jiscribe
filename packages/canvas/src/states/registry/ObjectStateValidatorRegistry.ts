import type { ObjectType } from "../../schemas/objects/types/ObjectType";

/**
 * Per-type `ObjectState` validation function. Takes an untrusted object (e.g. from
 * the clipboard) and returns a boolean for whether it is valid as that type (type-guard style).
 */
export type ObjectStateValidateFn = (value: unknown) => boolean;

/**
 * Registry for per-type `ObjectState` validators.
 * This is the state-side counterpart of the schema-side `ObjectDocValidatorRegistry`;
 * registration happens via `registerObject()` inside `initializeObjectRegistry()`.
 *
 * Its main use is strict clipboard-data validation in `isClipboardData`.
 */
class ObjectStateValidatorRegistry {
	private readonly entries = new Map<ObjectType, ObjectStateValidateFn>();

	register(type: ObjectType, validate: ObjectStateValidateFn): void {
		this.entries.set(type, validate);
	}

	/**
	 * Validates the value with the validator for the given type.
	 * Unregistered types are strictly rejected (clipboard validation does not trust unknown types).
	 */
	validate(type: string, value: unknown): boolean {
		const validate = this.entries.get(type as ObjectType);
		return validate ? validate(value) : false;
	}

	clear(): void {
		this.entries.clear();
	}
}

export const objectStateValidatorRegistry = new ObjectStateValidatorRegistry();
