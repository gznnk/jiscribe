import type { StencilPreset } from "./StencilPreset";

/**
 * Registry that manages the stencil presets shown in the StencilLibrary (toolbar).
 * Registration happens via `registerObject()` in `initializeObjectRegistry()`.
 *
 * - `all()` returns them in registration order.
 * - Presets have a 1:N relationship with object types (e.g. rect has "rect" and "rect-markdown").
 */
export class StencilPresetRegistry {
	private readonly ordered: StencilPreset[] = [];
	private readonly byId = new Map<string, StencilPreset>();

	register(preset: StencilPreset): void {
		this.ordered.push(preset);
		this.byId.set(preset.id, preset);
	}

	/** All presets in registration order. */
	all(): readonly StencilPreset[] {
		return [...this.ordered];
	}

	/**
	 * Presets belonging to `categoryId`, sorted by their category-local order
	 * (ascending `categories[categoryId]`). A preset in several categories
	 * appears in each, potentially at a different rank.
	 */
	byCategory(categoryId: string): readonly StencilPreset[] {
		return this.ordered
			.filter((preset) => preset.categories?.[categoryId] !== undefined)
			.sort((a, b) => a.categories![categoryId] - b.categories![categoryId]);
	}

	get(id: string): StencilPreset | undefined {
		return this.byId.get(id);
	}

	clear(): void {
		this.ordered.length = 0;
		this.byId.clear();
	}
}

export const createStencilPresetRegistry = (): StencilPresetRegistry =>
	new StencilPresetRegistry();
