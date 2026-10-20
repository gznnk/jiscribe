import { useCallback, useMemo } from "react";

import type { CanvasRegistries } from "../../../../registries/CanvasRegistries";
import type { Stencil } from "../../../objects/Stencil";
import type { StencilCategory } from "../../../objects/StencilCategory";
import type { ResolvedStencilCategory } from "../utils/resolveStencilCategory";
import { resolveStencilCategories } from "../utils/resolveStencilCategory";

type ResolvedStencilLibrary = {
	/** The declared sections whose ids resolved to registered presets. */
	librarySections: ResolvedStencilCategory[];
	/** Looks a preset up by id; stable for as long as `registries` is. */
	resolveLibraryPreset: (presetId: string) => Stencil | undefined;
};

/**
 * The shape library's sections resolved against the stencil registry, and the
 * preset lookup the library panel reads.
 *
 * @param sections - The host's `stencilLibrary.sections`, or undefined when no library is declared (resolves to no sections)
 * @param registries - The canvas's own registries, passed in rather than read from context because the canvas is their provider
 */
export const useResolvedStencilLibrary = (
	sections: readonly StencilCategory[] | undefined,
	registries: CanvasRegistries,
): ResolvedStencilLibrary => {
	// Sections whose ids resolve to registered presets. Resolved here (not in the
	// panel) so an unmounted-but-declared library still decides whether the
	// sidebar can open at all.
	const librarySections = useMemo(
		() => resolveStencilCategories(sections ?? [], registries.stencil),
		[sections, registries],
	);

	// A stable reference, so the memoized panel does not re-render on every dispatch.
	const resolveLibraryPreset = useCallback(
		(presetId: string) => registries.stencil.get(presetId),
		[registries],
	);

	return { librarySections, resolveLibraryPreset };
};
