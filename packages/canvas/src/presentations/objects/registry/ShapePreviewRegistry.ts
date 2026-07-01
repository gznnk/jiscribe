import type { ShapePreviewRenderer } from "./ShapePreviewTypes";
import type { ObjectType } from "../../../schemas/objects/types/ObjectType";

/**
 * Registry that manages the preview render function for each shape type during a draw drag.
 * Registration happens via `registerObject()` inside `initializeObjectRegistry()`.
 *
 * Only shapes that support draw dragging (rect / ellipse / polyline) are registered.
 */
class ShapePreviewRegistry {
	private readonly renderers = new Map<ObjectType, ShapePreviewRenderer>();

	register(type: ObjectType, renderer: ShapePreviewRenderer): void {
		this.renderers.set(type, renderer);
	}

	get(type: ObjectType): ShapePreviewRenderer | undefined {
		return this.renderers.get(type);
	}

	clear(): void {
		this.renderers.clear();
	}
}

export const shapePreviewRegistry = new ShapePreviewRegistry();
