import type { ExecutableCommand } from "../CommandTypes";

/**
 * Opens or closes the properties sidebar.
 *
 * Deliberately carries no keyboard shortcut, like its counterpart
 * ToggleStencilLibraryCommand: the panel is reached from its toolbar toggle
 * (`data-part="command:togglePropertyPanel"`) or from the ellipsis at the end
 * of the ObjectMenu, and closed from the toolbar or from its own close button.
 * Categorized as a view command because it changes what the chrome shows, not
 * the document.
 */
export const TogglePropertyPanelCommand: ExecutableCommand = {
	id: "togglePropertyPanel",
	label: "Properties",
	category: "view",

	canExecute: () => true,

	execute: (state) => ({
		...state,
		propertyPanel: {
			...state.propertyPanel,
			isOpen: !state.propertyPanel.isOpen,
		},
		// A toolbar press dismisses the category flyout, like every other one.
		stencilLibraryOpenCategory: null,
	}),
};
