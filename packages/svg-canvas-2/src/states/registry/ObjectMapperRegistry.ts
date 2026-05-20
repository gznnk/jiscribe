import type { ObjectDoc } from "../../schemas/objects/base/ObjectDoc";
import type { ObjectFeatures } from "../../schemas/objects/types/ObjectFeatures";
import type { ObjectType } from "../../schemas/objects/types/ObjectType";
import type { ObjectMapperType } from "../objects/base/MapperTypes";
import type { ObjectState } from "../objects/base/ObjectState";

type MapperEntry = {
	mapper: ObjectMapperType;
	features: ObjectFeatures;
};

class ObjectMapperRegistry {
	private readonly entries = new Map<ObjectType, MapperEntry>();

	register<TDoc extends ObjectDoc, TState extends ObjectState>(
		type: ObjectType,
		mapper: ObjectMapperType<TDoc, TState>,
		features: ObjectFeatures,
	): void {
		this.entries.set(type, {
			mapper: mapper as unknown as ObjectMapperType,
			features,
		});
	}

	toState(doc: ObjectDoc): ObjectState {
		const entry = this.entries.get(doc.type);
		if (!entry) {
			throw new Error(`Mapper for object type '${doc.type}' not found.`);
		}
		return entry.mapper.toState(doc);
	}

	toDoc(state: ObjectState): ObjectDoc {
		const entry = this.entries.get(state.type);
		if (!entry) {
			throw new Error(`Mapper for object type '${state.type}' not found.`);
		}
		return entry.mapper.toDoc(state);
	}

	getFeatures(type: ObjectType): ObjectFeatures | undefined {
		return this.entries.get(type)?.features;
	}

	clear(): void {
		this.entries.clear();
	}
}

export const objectMapperRegistry = new ObjectMapperRegistry();
