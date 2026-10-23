import type { SelectionValue } from "@jiscribe/canvas-sdk";
import { useSelectionStyle } from "@jiscribe/canvas-sdk";

import { DEFAULT_AWS_ICON_NAME } from "../schema/AwsIconDoc";
import { resolveAwsIconName } from "../schema/icon/resolveAwsIconName";
import { AWS_ICON_STYLE_ENTRIES } from "../style/awsStyleEntries";

/** The icons the selection draws, as canonical names: an unset `icon` draws the default. */
type SelectedAwsIcon = {
	/** The icon every selected awsIcon draws, or the first selected one's when they differ. */
	icon: string;
	/** Whether the selected awsIcons draw more than one icon. */
	isMixed: boolean;
};

const toDrawnIconName = (icon: string | undefined): string =>
	(icon === undefined ? null : resolveAwsIconName(icon)) ??
	DEFAULT_AWS_ICON_NAME;

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
 * ObjectMenu's AwsIconPickerMenu and the sidebar's AwsIconProperty).
 *
 * Compared after resolving, so two spellings of one icon (`lambda` and
 * `service/aws-lambda`) are not reported as a mixed selection.
 *
 * @returns The drawn icon and whether the selection disagrees; a selection
 *   carrying no awsIcon answers the default icon, not mixed
 */
export const useSelectedAwsIcon = (): SelectedAwsIcon => {
	const drawnIcons = readCarriedIcons(
		useSelectionStyle(AWS_ICON_STYLE_ENTRIES, "icon"),
	).map(toDrawnIconName);
	return {
		icon: drawnIcons[0] ?? DEFAULT_AWS_ICON_NAME,
		isMixed: drawnIcons.some((icon) => icon !== drawnIcons[0]),
	};
};
