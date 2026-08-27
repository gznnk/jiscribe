import type { Stencil } from "./Stencil";

/**
 * Registry that manages the stencils shown in the StencilLibrary (toolbar).
 * Registration happens via `applyObjectDefinition()` in `initializeObjectRegistry()`.
 *
 * It answers only "what exists"; display order (top level and within category
 * flyouts) is owned by the toolbar layout, which resolves presets by id via `get`.
 * Presets have a 1:N relationship with object types (e.g. rect has "rect" and "process").
 */
export class StencilRegistry {
	private readonly ordered: Stencil[] = [];
	private readonly byId = new Map<string, Stencil>();

	/**
	 * @param preset - The palette entry; its `id` may not contain a colon
	 * @throws When the id contains a colon. The id is carried to the click handler inside
	 *   `data-part="item:{id}"`, whose own separator is that character, so one in the id
	 *   leaves the entry rendered and clickable but resolving to nothing. Refusing it here
	 *   turns a palette that silently does nothing into a plugin that will not load.
	 */
	register(preset: Stencil): void {
		if (preset.id.includes(":")) {
			throw new Error(
				`StencilRegistry.register: preset id "${preset.id}" may not contain a colon; it is the separator of the data-part the palette entry is read through`,
			);
		}
		this.ordered.push(preset);
		this.byId.set(preset.id, preset);
	}

	/** All presets in registration order. */
	all(): readonly Stencil[] {
		return [...this.ordered];
	}

	get(id: string): Stencil | undefined {
		return this.byId.get(id);
	}

	clear(): void {
		this.ordered.length = 0;
		this.byId.clear();
	}
}

export const createStencilRegistry = (): StencilRegistry =>
	new StencilRegistry();
