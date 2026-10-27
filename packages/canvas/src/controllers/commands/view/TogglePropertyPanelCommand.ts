import { closeStencilPopups } from "../../utils/closeStencilPopups";
import type { ExecutableCommand } from "../CommandTypes";

/**
 * Opens or closes the properties sidebar within the expanded chrome. Pressed
 * while collapsed it expands the chrome with the properties sidebar alone
 * open, the shape library closed, since that is the one panel asked for.
 *
 * Deliberately carries no keyboard shortcut, like its counterpart
 * ToggleStencilLibraryCommand: the panel is reached from a toolbar toggle
 * (`data-action="command:togglePropertyPanel"`, where the host places one), and
 * closed from the toolbar or from its own close button. The switch for both
 * sidebars runs ToggleSidebarsCommand instead.
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
		...(state.isChromeExpanded
			? {
					propertyPanel: {
						...state.propertyPanel,
						isOpen: !state.propertyPanel.isOpen,
					},
				}
			: {
					isChromeExpanded: true,
					stencilLibraryPanel: { ...state.stencilLibraryPanel, isOpen: false },
					propertyPanel: { ...state.propertyPanel, isOpen: true },
				}),
		// A toolbar press dismisses the category flyout, like every other one.
		...closeStencilPopups(),
	}),
};
