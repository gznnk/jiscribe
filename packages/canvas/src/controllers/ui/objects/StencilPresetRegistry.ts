import type { StencilPreset } from "./StencilPreset";

/**
 * Registry that manages the stencil presets shown in the StencilLibrary (toolbar).
 * Registration happens via `registerObject()` in `initializeObjectRegistry()`.
 *
 * It answers only "what exists"; display order (top level and within category
 * flyouts) is owned by the toolbar layout, which resolves presets by id via `get`.
 * Presets have a 1:N relationship with object types (e.g. rect has "rect" and "rect-markdown").
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
