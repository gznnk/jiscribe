import { isAnySidebarOpen } from "../../utils/sidebarsState";
import type { ExecutableCommand } from "../CommandTypes";

/**
 * Opens both sidebars together, or closes both while they are expanded (any
 * one of them open, see {@link isAnySidebarOpen}), so a press never leaves one
 * open and the other closed. Without a shape library declared
 * (`hasStencilLibrary` false) the library's `isOpen` is left as it is: there is
 * no panel to open, and `onSidebarsChange` would report one.
 *
 * The toolbar's `sidebarsToggle` runs it (`data-action="command:toggleSidebars"`).
 * The per-edge `toggleStencilLibrary` / `togglePropertyPanel` stay as they are,
 * so the panels' own close buttons and the per-edge toolbar toggles still move
 * one edge at a time. No keyboard shortcut and a view command, like those two.
 */
export const ToggleSidebarsCommand: ExecutableCommand = {
	id: "toggleSidebars",
	label: { en: "Sidebars", ja: "サイドバー" },
	category: "view",

	canExecute: () => true,

	execute: (state) => {
		const isOpen = !isAnySidebarOpen(state);
		return {
			...state,
			stencilLibraryPanel: state.hasStencilLibrary
				? { ...state.stencilLibraryPanel, isOpen }
				: state.stencilLibraryPanel,
			propertyPanel: { ...state.propertyPanel, isOpen },
			// A toolbar press dismisses the category flyout, like every other one.
			stencilLibraryOpenCategory: null,
		};
	},
};
