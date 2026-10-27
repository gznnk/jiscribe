import type { ExecutableCommand } from "../CommandTypes";

/**
 * Opens or closes the shape library sidebar within the expanded chrome. Pressed
 * while collapsed it expands the chrome with the library alone open, the
 * properties sidebar closed, since that is the one panel asked for.
 *
 * Deliberately carries no keyboard shortcut: the panel is reached from a
 * toolbar toggle (`data-action="command:toggleStencilLibrary"`, where the host
 * places one) and closed from there or from its own close button. The switch
 * for both sidebars runs ToggleSidebarsCommand instead. Categorized as a view
 * command because it changes what the chrome shows, not the document.
 */
export const ToggleStencilLibraryCommand: ExecutableCommand = {
	id: "toggleStencilLibrary",
	label: { en: "Shape Library", ja: "図形ライブラリ" },
	category: "view",

	canExecute: () => true,

	execute: (state) => ({
		...state,
		...(state.isChromeExpanded
			? {
					stencilLibraryPanel: {
						...state.stencilLibraryPanel,
						isOpen: !state.stencilLibraryPanel.isOpen,
					},
				}
			: {
					isChromeExpanded: true,
					stencilLibraryPanel: { ...state.stencilLibraryPanel, isOpen: true },
					propertyPanel: { ...state.propertyPanel, isOpen: false },
				}),
		// A toolbar press dismisses the category flyout, like every other one.
		stencilLibraryOpenCategory: null,
	}),
};
