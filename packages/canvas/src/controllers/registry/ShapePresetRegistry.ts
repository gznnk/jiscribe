import type { ShapePreset } from "../../schemas/objects/types/ShapePreset";

/**
 * Registry that manages the shape presets shown in the ShapeLibrary (toolbar).
 * Registration happens via `registerObject()` in `initializeObjectRegistry()`.
 *
 * - `all()` returns them preserving registration order (= toolbar display order).
 * - Presets have a 1:N relationship with shape types (e.g. rect has "rect" and "rect-markdown").
 */
class ShapePresetRegistry {
	private readonly ordered: ShapePreset[] = [];
	private readonly byId = new Map<string, ShapePreset>();

	register(preset: ShapePreset): void {
		this.ordered.push(preset);
		this.byId.set(preset.id, preset);
	}

	/**
	 * The list of presets sorted by display order.
	 * Ascending by `order`; ties and unspecified values keep registration order
	 * (Array.prototype.sort is stable).
	 */
	all(): readonly ShapePreset[] {
		return [...this.ordered].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
	}

	get(id: string): ShapePreset | undefined {
		return this.byId.get(id);
	}

	clear(): void {
		this.ordered.length = 0;
		this.byId.clear();
	}
}

export const shapePresetRegistry = new ShapePresetRegistry();

/** Retrieves a preset by its ID. Returns undefined if not registered. */
export const getShapePreset = (id: string): ShapePreset | undefined =>
	shapePresetRegistry.get(id);
