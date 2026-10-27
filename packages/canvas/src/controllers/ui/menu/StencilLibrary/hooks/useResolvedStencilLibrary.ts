import { useCallback, useMemo } from "react";

import type { CanvasMessages } from "../../../../../foundation/i18n/CanvasMessagesTypes";
import type { CanvasRegistries } from "../../../../registries/CanvasRegistries";
import type { Stencil } from "../../../objects/Stencil";
import type { StencilCategory } from "../../../objects/StencilCategory";
import { createDefaultStencilLibraryCategory } from "../utils/createDefaultStencilLibraryCategory";
import type { ResolvedStencilCategory } from "../utils/resolveStencilCategory";
import { resolveStencilCategories } from "../utils/resolveStencilCategory";
import { resolveStencilLabel } from "../utils/resolveStencilLabel";

type ResolvedStencilLibrary = {
	/** The sections whose ids resolved to registered presets. */
	librarySections: ResolvedStencilCategory[];
	/** Looks a preset up by id; stable for as long as `registries` is. */
	resolveLibraryPreset: (presetId: string) => Stencil | undefined;
};

/**
 * The shape library's sections resolved against the stencil registry, and the
 * preset lookup the library panel reads.
 *
 * @param sections - The host's `stencilLibrary.sections`; undefined (no library declared) takes the default one (see createDefaultStencilLibraryCategory)
 * @param registries - The canvas's own registries, passed in rather than read from context because the canvas is their provider
 * @param messages - The canvas's locale-resolved messages; the default section's heading and the labels its search matches come from them (read only while `sections` is undefined)
 * @param locale - The canvas's `locale`, for the preset labels the default section's search matches
 */
export const useResolvedStencilLibrary = (
	sections: readonly StencilCategory[] | undefined,
	registries: CanvasRegistries,
	messages: CanvasMessages,
	locale: string,
): ResolvedStencilLibrary => {
	const librarySections = useMemo(
		() =>
			resolveStencilCategories(
				sections ?? [
					createDefaultStencilLibraryCategory(
						registries.stencil,
						messages.stencilLibraryAllShapes,
						(preset) => resolveStencilLabel(preset, messages, locale),
					),
				],
				registries.stencil,
			),
		[sections, registries, messages, locale],
	);

	// A stable reference, so the memoized panel does not re-render on every dispatch.
	const resolveLibraryPreset = useCallback(
		(presetId: string) => registries.stencil.get(presetId),
		[registries],
	);

	return { librarySections, resolveLibraryPreset };
};
