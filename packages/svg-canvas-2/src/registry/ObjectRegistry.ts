import type {
	ObjectComponentType,
	ObjectDefinition,
} from "./ObjectRegistryTypes";
import type { ObjectDoc } from "../schemas/objects/base/ObjectDoc";
import type { ObjectType } from "../schemas/objects/types/ObjectType";
import type { ObjectState } from "../states/objects/base/ObjectState";

/**
 * Registry for object definitions (Mappers + Components).
 * Handles polymorphic conversion and component retrieval.
 */
class ObjectRegistry {
	private definitions = new Map<ObjectType, ObjectDefinition>();

	/**
	 * Registers a definition for a specific object type.
	 * @param type - The object type (e.g., 'group', 'rect')
	 * @param definition - The object definition (mapper + component)
	 */
	register<D extends ObjectDoc, S extends ObjectState>(
		type: ObjectType,
		definition: ObjectDefinition<D, S>,
	) {
		this.definitions.set(type, definition as unknown as ObjectDefinition);
	}

	/**
	 * Retrieves the definition for a specific object type.
	 */
	getDefinition(type: ObjectType): ObjectDefinition | undefined {
		return this.definitions.get(type);
	}

	/**
	 * Retrieves the component for a specific object type.
	 */
	getComponent(type: ObjectType): ObjectComponentType | undefined {
		return this.definitions.get(type)?.component;
	}

	/**
	 * Converts any ObjectDoc to its corresponding ObjectState using the registered mapper.
	 */
	toState(doc: ObjectDoc): ObjectState {
		const def = this.definitions.get(doc.type);
		if (!def) {
			throw new Error(`Definition for object type '${doc.type}' not found.`);
		}
		return def.mapper.toState(doc);
	}

	/**
	 * Converts any ObjectState to its corresponding ObjectDoc using the registered mapper.
	 */
	toDoc(state: ObjectState): ObjectDoc {
		const def = this.definitions.get(state.type);
		if (!def) {
			throw new Error(`Definition for object type '${state.type}' not found.`);
		}
		return def.mapper.toDoc(state);
	}
}

export const objectRegistry = new ObjectRegistry();
