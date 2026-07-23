import { SHAPE_CATEGORY_DEFINITIONS } from "../ui/menu/ShapeLibrary/shapeCategories";
import type { ShapeCategoryRegistry } from "../ui/menu/ShapeLibrary/ShapeCategoryRegistry";

/** Seeds the built-in categories into a fresh ShapeCategoryRegistry. */
export const initializeShapeCategoryRegistry = (
	registry: ShapeCategoryRegistry,
): void => {
	for (const category of Object.values(SHAPE_CATEGORY_DEFINITIONS)) {
		registry.register(category);
	}
};
