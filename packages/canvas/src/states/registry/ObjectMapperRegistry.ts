import type { ObjectDoc } from "@jiscribe/doc/model/objects/base/ObjectDoc";
import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";
import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";

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
			// Stamp the type's declaration descriptor onto every state (as a shared
			// reference, never a copy) so consumers can read per-type specs from the
			// object without a registry lookup — works for custom types too (#165).
			toState: (doc) => {
				// mapper.toState always returns a fresh literal, so this owns it and may assign
				// in place — the same contract as CanvasMapper.processObject's parentId/childIds.
				const state = mapper.toState(doc as TDoc);
				state.features = features;
				return state;
			},
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
