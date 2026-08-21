import type { ObjectFactory } from "../model/objects/types/ObjectFactory";
import type { ObjectType } from "../model/objects/types/ObjectType";

/**
 * Registry that manages the `ObjectFactory` for each object type.
 * Registration happens via `registerObject()` in `initializeObjectRegistry()`.
 *
 * To add a new object type, just create an `ObjectFactory` in that type's folder
 * and register it with `registerObject(..., { objectFactory })`. Callers such as
 * `createObjectDoc` support the new type without any edits.
 */
export class ObjectFactoryRegistry {
	private readonly entries = new Map<ObjectType, ObjectFactory>();

	register(type: ObjectType, factory: ObjectFactory): void {
		this.entries.set(type, factory);
	}

	get(type: ObjectType): ObjectFactory | undefined {
		return this.entries.get(type);
	}

	/**
	 * Whether the shape supports drag-drawing (creation from given bounds).
	 * Determined by the presence of `createDocFromBounds`.
	 */
	supportsBoundsDrawing(type: ObjectType): boolean {
		return this.entries.get(type)?.createDocFromBounds !== undefined;
	}

	clear(): void {
		this.entries.clear();
	}
}

export const createObjectFactoryRegistry = (): ObjectFactoryRegistry =>
	new ObjectFactoryRegistry();
