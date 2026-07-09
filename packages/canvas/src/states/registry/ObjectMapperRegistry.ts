import type { ObjectDoc } from "../../schemas/objects/base/ObjectDoc";
import type { ObjectFeatures } from "../../schemas/objects/types/ObjectFeatures";
import type { ObjectType } from "../../schemas/objects/types/ObjectType";
import type { ObjectMapperType } from "../objects/base/MapperTypes";
import type { ObjectState } from "../objects/base/ObjectState";

type MapperEntry = {
	toState: (doc: ObjectDoc) => ObjectState;
	toDoc: (state: ObjectState) => ObjectDoc;
	features: ObjectFeatures;
};

export class ObjectMapperRegistry {
	private readonly entries = new Map<ObjectType, MapperEntry>();

	register<TDoc extends ObjectDoc, TState extends ObjectState>(
		type: ObjectType,
		mapper: ObjectMapperType<TDoc, TState>,
		features: ObjectFeatures,
	): void {
		this.entries.set(type, {
			// Stamp the type's outline geometry onto every state built here so pure
			// consumers (e.g. adjustToOutline) can read it from the object without a
			// registry lookup. Works for custom types too, since it comes from their
			// registered features (#165).
			toState: (doc) => ({
				...mapper.toState(doc as TDoc),
				geometry: features.geometry,
			}),
			toDoc: (state) => mapper.toDoc(state as TState),
			features,
		});
	}

	toState(doc: ObjectDoc): ObjectState {
		const entry = this.entries.get(doc.type);
		if (!entry) {
			throw new Error(`Mapper for object type '${doc.type}' not found.`);
		}
		return entry.toState(doc);
	}

	toDoc(state: ObjectState): ObjectDoc {
		const entry = this.entries.get(state.type);
		if (!entry) {
			throw new Error(`Mapper for object type '${state.type}' not found.`);
		}
		return entry.toDoc(state);
	}

	getFeatures(type: ObjectType): ObjectFeatures | undefined {
		return this.entries.get(type)?.features;
	}

	clear(): void {
		this.entries.clear();
	}
}

export const createObjectMapperRegistry = (): ObjectMapperRegistry =>
	new ObjectMapperRegistry();
