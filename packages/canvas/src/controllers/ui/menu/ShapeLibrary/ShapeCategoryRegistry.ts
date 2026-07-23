import type { ShapeCategory } from "./shapeCategories";

/**
 * Registry that manages the palette categories shown in the ShapeLibrary.
 *
 * Seeded with the built-ins via `initializeShapeCategoryRegistry`, then each
 * applied definition's `shapeLibrary.categories` are registered in
 * `applyObjectDefinition`. The toolbar reads a layout entry's category via `get`.
 */
export class ShapeCategoryRegistry {
	private readonly byId = new Map<string, ShapeCategory>();

	/** Registers a category. An already-registered id is kept (first-wins). */
	register(category: ShapeCategory): void {
		if (!this.byId.has(category.id)) {
			this.byId.set(category.id, category);
		}
	}

	/** Category metadata for `id`, or undefined when no definition supplies it. */
	get(id: string): ShapeCategory | undefined {
		return this.byId.get(id);
	}
}

export const createShapeCategoryRegistry = (): ShapeCategoryRegistry =>
	new ShapeCategoryRegistry();
