import type { SelectableState } from "../../../types/state/core/SelectableState";

export const SelectableDefaultState = {
	isSelected: false,
	isAncestorSelected: false,
	isRootSelected: false,
	showOutline: false,
	outlineDisabled: false,
} as const satisfies SelectableState;
