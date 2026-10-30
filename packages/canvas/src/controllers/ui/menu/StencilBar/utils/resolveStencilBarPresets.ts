import type { Stencil } from "../../../objects/Stencil";
import type { StencilRegistry } from "../../../objects/StencilRegistry";
import { DEFAULT_STENCIL_BAR_PRESET_IDS } from "../stencilBarPresets";
import type { StencilBarOptions } from "../StencilBarTypes";

/**
 * The presets the stencil bar draws, looked up in the registry in the
 * declared order.
 *
 * Dropping an id that names nothing is silent, as it is for the top bar's
 * `stencilPreset` items: a host may name presets of a plugin it did not apply.
 *
 * @param options The host's `stencilBar` prop; undefined takes every default
 *   (shown, {@link DEFAULT_STENCIL_BAR_PRESET_IDS}).
 * @param stencil Registry answering "what presets exist" for this canvas.
 * @returns The presets in display order (possibly empty), or null when
 *   `options.show` is `false` and the bar is not drawn at all.
 * @throws When `options.presetIds` names the same id twice. The preset keys the
 *   rendered button, so a repeat would show up only as React's duplicate-key
 *   warning; the check is on the declared ids, so it fires whether or not the
 *   plugin owning the id is applied.
 */
export const resolveStencilBarPresets = (
	options: StencilBarOptions | undefined,
	stencil: StencilRegistry,
): Stencil[] | null => {
	if (options?.show === false) {
		return null;
	}
	const presetIds = options?.presetIds ?? DEFAULT_STENCIL_BAR_PRESET_IDS;
	const seenPresetIds = new Set<string>();
	for (const presetId of presetIds) {
		if (seenPresetIds.has(presetId)) {
			throw new Error(
				`resolveStencilBarPresets: stencilBar.presetIds lists the preset id "${presetId}" twice; each id may appear once`,
			);
		}
		seenPresetIds.add(presetId);
	}
	return presetIds
		.map((presetId) => stencil.get(presetId))
		.filter((preset) => preset !== undefined);
};
