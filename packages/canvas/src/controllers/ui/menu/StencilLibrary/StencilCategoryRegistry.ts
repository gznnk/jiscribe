import type { StencilCategory } from "./stencilCategories";

/**
 * Registry that manages the palette categories shown in the StencilLibrary.
 *
 * Seeded with the built-ins via `initializeStencilCategoryRegistry`, then each
 * applied definition's `stencilLibrary.categories` are registered in
 * `applyObjectDefinition`. The toolbar reads a layout entry's category via `get`.
 */
export class StencilCategoryRegistry {
	private readonly byId = new Map<string, StencilCategory>();

	/** Registers a category. An already-registered id is kept (first-wins). */
	register(category: StencilCategory): void {
		if (!this.byId.has(category.id)) {
			this.byId.set(category.id, category);
		}
	}

	/** Category metadata for `id`, or undefined when no definition supplies it. */
	get(id: string): StencilCategory | undefined {
		return this.byId.get(id);
	}
}

export const createStencilCategoryRegistry = (): StencilCategoryRegistry =>
	new StencilCategoryRegistry();
