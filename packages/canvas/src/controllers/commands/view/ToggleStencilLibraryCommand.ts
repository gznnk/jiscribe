import type { ExecutableCommand } from "../CommandTypes";

/**
 * Opens or closes the shape library sidebar.
 *
 * Deliberately carries no keyboard shortcut: the panel is reached from its
 * toolbar toggle (`data-action="command:toggleStencilLibrary"`) and closed from
 * there or from its own close button. Categorized as a view command because it
 * changes what the chrome shows, not the document.
 */
export const ToggleStencilLibraryCommand: ExecutableCommand = {
	id: "toggleStencilLibrary",
	label: { en: "Shape Library", ja: "図形ライブラリ" },
	category: "view",

	canExecute: () => true,

	execute: (state) => ({
		...state,
		stencilLibraryPanel: {
			...state.stencilLibraryPanel,
			isOpen: !state.stencilLibraryPanel.isOpen,
		},
		// A toolbar press dismisses the category flyout, like every other one.
		stencilLibraryOpenCategory: null,
	}),
};
