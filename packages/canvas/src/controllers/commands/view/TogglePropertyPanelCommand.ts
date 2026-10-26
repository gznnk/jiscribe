import type { ExecutableCommand } from "../CommandTypes";

/**
 * Opens or closes the properties sidebar.
 *
 * Deliberately carries no keyboard shortcut, like its counterpart
 * ToggleStencilLibraryCommand: the panel is reached from a toolbar toggle
 * (`data-action="command:togglePropertyPanel"`, where the host places one) or
 * from the ellipsis at the end of the ObjectMenu, and closed from the toolbar or
 * from its own close button. The switch for both sidebars runs
 * ToggleSidebarsCommand instead.
 * Categorized as a view command because it changes what the chrome shows, not
 * the document.
 */
export const TogglePropertyPanelCommand: ExecutableCommand = {
	id: "togglePropertyPanel",
	label: { en: "Properties", ja: "プロパティ" },
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
