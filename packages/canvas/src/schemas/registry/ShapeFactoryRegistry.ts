import type { ObjectType } from "../objects/types/ObjectType";
import type { ShapeFactory } from "../objects/types/ShapeFactory";

/**
 * Registry that manages the `ShapeFactory` for each shape type.
 * Registration happens via `registerObject()` in `initializeObjectRegistry()`.
 *
 * To add a new shape, just create a `ShapeFactory` in that shape's folder and
 * register it with `registerObject(..., { shapeFactory })`. Callers such as
 * `createObjectDoc` support the new shape without any edits.
 */
export class ShapeFactoryRegistry {
	private readonly entries = new Map<ObjectType, ShapeFactory>();

	register(type: ObjectType, factory: ShapeFactory): void {
		this.entries.set(type, factory);
	}

	get(type: ObjectType): ShapeFactory | undefined {
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

export const createShapeFactoryRegistry = (): ShapeFactoryRegistry =>
	new ShapeFactoryRegistry();
