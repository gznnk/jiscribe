/**
 * Interface for diagram elements that can be selected by the user.
 * Provides properties to track selection state and multi-selection behavior.
 */
export type SelectableState = {
	isSelected: boolean;
	isRootSelected: boolean;
	isAncestorSelected: boolean;
	showOutline: boolean;
	outlineDisabled: boolean;
};
