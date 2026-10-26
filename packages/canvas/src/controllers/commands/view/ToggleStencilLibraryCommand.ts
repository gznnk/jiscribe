import {
	CATALOG_PANEL_CONTENT,
	toggleStencilPanelContent,
} from "../../utils/stencilPanelContent";
import type { ExecutableCommand } from "../CommandTypes";

/**
 * Opens or closes the stencil catalog (every library category, searchable).
 *
 * Shown nowhere, it opens in the flyout over the canvas, or in the docked panel
 * when that is open with a category; shown already, in either panel, it closes
 * that panel (toggleStencilPanelContent, shared with the rail's category
 * buttons). The rail's catalog button runs it (`data-action="command:toggleStencilLibrary"`).
 *
 * Deliberately carries no keyboard shortcut. Categorized as a view command
 * because it changes what the chrome shows, not the document.
 */
export const ToggleStencilLibraryCommand: ExecutableCommand = {
	id: "toggleStencilLibrary",
	label: { en: "Find Shapes", ja: "図形を探す" },
	category: "view",

	canExecute: () => true,

	execute: (state) => toggleStencilPanelContent(state, CATALOG_PANEL_CONTENT),
};
