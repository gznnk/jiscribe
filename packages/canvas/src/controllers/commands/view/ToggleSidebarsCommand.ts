import type { ExecutableCommand } from "../CommandTypes";

/**
 * Switches the chrome between its two forms (`isChromeExpanded`), the only
 * command that collapses it.
 *
 * Collapsing leaves each panel's `isOpen` as it is, so expanding again brings
 * back the panels the user left open. Expanding with both closed (nothing to
 * bring back) opens both.
 *
 * The toolbar's `sidebarsToggle` runs it (`data-action="command:toggleSidebars"`).
 * The per-edge `toggleStencilLibrary` / `togglePropertyPanel` and the panels'
 * own close buttons move one panel within the expanded form. No keyboard
 * shortcut and a view command, like those two.
 */
export const ToggleSidebarsCommand: ExecutableCommand = {
	id: "toggleSidebars",
	label: { en: "Sidebars", ja: "サイドバー" },
	category: "view",

	canExecute: () => true,

	execute: (state) => {
		// A toolbar press dismisses the category flyout, like every other one.
		if (state.isChromeExpanded) {
			return {
				...state,
				isChromeExpanded: false,
				stencilLibraryOpenCategory: null,
			};
		}
		const isAnyPanelOpen =
			state.stencilLibraryPanel.isOpen || state.propertyPanel.isOpen;
		return {
			...state,
			isChromeExpanded: true,
			stencilLibraryPanel: isAnyPanelOpen
				? state.stencilLibraryPanel
				: { ...state.stencilLibraryPanel, isOpen: true },
			propertyPanel: isAnyPanelOpen
				? state.propertyPanel
				: { ...state.propertyPanel, isOpen: true },
			stencilLibraryOpenCategory: null,
		};
	},
};
