import type { ShapePreset } from "./ShapePreset";

/**
 * Registry that manages the shape presets shown in the ShapeLibrary (toolbar).
 * Registration happens via `registerObject()` in `initializeObjectRegistry()`.
 *
 * - `all()` returns them in registration order.
 * - Presets have a 1:N relationship with shape types (e.g. rect has "rect" and "rect-markdown").
 */
export class ShapePresetRegistry {
	private readonly ordered: ShapePreset[] = [];
	private readonly byId = new Map<string, ShapePreset>();

	register(preset: ShapePreset): void {
		this.ordered.push(preset);
		this.byId.set(preset.id, preset);
	}

	/** All presets in registration order. */
	all(): readonly ShapePreset[] {
		return [...this.ordered];
	}

	/**
	 * Presets belonging to `categoryId`, sorted by their category-local order
	 * (ascending `categories[categoryId]`). A preset in several categories
	 * appears in each, potentially at a different rank.
	 */
	byCategory(categoryId: string): readonly ShapePreset[] {
		return this.ordered
			.filter((preset) => preset.categories?.[categoryId] !== undefined)
			.sort((a, b) => a.categories![categoryId] - b.categories![categoryId]);
	}

	get(id: string): ShapePreset | undefined {
		return this.byId.get(id);
	}

	clear(): void {
		this.ordered.length = 0;
		this.byId.clear();
	}
}

export const createShapePresetRegistry = (): ShapePresetRegistry =>
	new ShapePresetRegistry();
