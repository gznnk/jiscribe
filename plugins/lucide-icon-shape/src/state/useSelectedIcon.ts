import type { SelectionValue } from "@jiscribe/canvas-sdk";
import { useSelectionStyle } from "@jiscribe/canvas-sdk";

import { resolveIconName } from "../schema/icon/resolveIconName";
import { DEFAULT_ICON_NAME } from "../schema/IconDoc";
import { ICON_STYLE_ENTRIES } from "../style/iconStyleEntries";

/** The icons the selection draws, as current names: an unset `icon` draws the default. */
type SelectedIcon = {
	/** The icon every selected lucideIcon draws, or the first selected one's when they differ. */
	icon: string;
	/** Whether the selected lucideIcons draw more than one icon. */
	isMixed: boolean;
};

const toDrawnIconName = (icon: string | undefined): string =>
	(icon === undefined ? null : resolveIconName(icon)) ?? DEFAULT_ICON_NAME;

const readCarriedIcons = (
	selectionIcon: SelectionValue<string | undefined>,
): readonly (string | undefined)[] => {
	switch (selectionIcon.kind) {
		case "single":
			return [selectionIcon.value];
		case "mixed":
			return selectionIcon.values;
		case "none":
			return [];
	}
};

/**
 * The icon the selection draws, for the two controls that state it (the
 * ObjectMenu's IconPickerMenu and the sidebar's IconProperty).
 *
 * Compared after resolving, so two spellings of one icon (`user-circle` and
 * `circle-user`) are not reported as a mixed selection.
 *
 * @returns The drawn icon and whether the selection disagrees; a selection
 *   carrying no lucideIcon answers the default icon, not mixed
 */
export const useSelectedIcon = (): SelectedIcon => {
	const drawnIcons = readCarriedIcons(
		useSelectionStyle(ICON_STYLE_ENTRIES, "icon"),
	).map(toDrawnIconName);
	return {
		icon: drawnIcons[0] ?? DEFAULT_ICON_NAME,
		isMixed: drawnIcons.some((icon) => icon !== drawnIcons[0]),
	};
};
