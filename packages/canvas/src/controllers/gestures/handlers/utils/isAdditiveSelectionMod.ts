import type { Mods } from "../../registry/ObjectBehaviorTypes";

/**
 * Whether the held modifiers mean "add to the current selection" rather than
 * "replace it" (Ctrl / Meta / Shift). Click selection (determineSelection) and
 * the marquee (CanvasEventHandler) both gate on this so they never disagree.
 */
export const isAdditiveSelectionMod = (mods: Mods): boolean =>
	mods.ctrl || mods.meta || mods.shift;
