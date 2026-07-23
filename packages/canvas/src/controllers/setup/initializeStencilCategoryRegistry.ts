import { STENCIL_CATEGORY_DEFINITIONS } from "../ui/menu/StencilLibrary/stencilCategories";
import type { StencilCategoryRegistry } from "../ui/menu/StencilLibrary/StencilCategoryRegistry";

/** Seeds the built-in categories into a fresh StencilCategoryRegistry. */
export const initializeStencilCategoryRegistry = (
	registry: StencilCategoryRegistry,
): void => {
	for (const category of Object.values(STENCIL_CATEGORY_DEFINITIONS)) {
		registry.register(category);
	}
};
