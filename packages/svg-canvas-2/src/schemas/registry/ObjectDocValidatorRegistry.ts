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

	/** 指定した型が connector の端点として接続可能かを返す。未登録型は false。 */
	isConnectable(type: string): boolean {
		return this.entries.get(type as ObjectType)?.features.connectable === true;
	}

	clear(): void {
		this.entries.clear();
	}
}

export const objectDocValidatorRegistry = new ObjectDocValidatorRegistry();
