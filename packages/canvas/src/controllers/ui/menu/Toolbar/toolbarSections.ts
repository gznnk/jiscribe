import type { ComponentType } from "react";

import type { LocaleMessages } from "../../../../foundation/i18n/resolveLocaleMessages";
import { HelpIcon } from "../../icons/HelpIcon";
import { RedoIcon } from "../../icons/RedoIcon";
import { UndoIcon } from "../../icons/UndoIcon";
import { ZoomToFitIcon } from "../../icons/ZoomToFitIcon";
import type { StencilIconProps } from "../../objects/Stencil";
import type { StencilCategory } from "../../objects/StencilCategory";
import { DEFAULT_BOTTOM_TOOLBAR_PRESET_IDS } from "../BottomToolbar/bottomToolbarPresets";

/**
 * One control on the toolbar. The discriminant is `type`, matching
 * `ObjectMenuItem`.
 *
 * - `stencilPreset`: a shape button pinned directly on the bar. An id naming no
 *   registered preset (a plugin the host did not apply) is silently dropped.
 * - `stencilCategory`: a category button opening a flyout that lists the category's
 *   `presetIds` in order. The category stays nested rather than flattened so the
 *   same {@link StencilCategory} object can also be passed to
 *   `stencilLibrary.sections`.
 * - `command`: a button running a registered command through the command system
 *   (`data-action="command:{id}"` → ToolbarHandler → handleCommand), disabled from
 *   the command's own `canExecute`. The icon rides on the item because `Command`
 *   itself carries no icon. A commandId the registry does not know (a command
 *   the host switched off via `CanvasConfig.commands`) is silently dropped.
 * - `zoom`: the composite `−` / readout / `+` group. Engine-owned rather than
 *   three commands, because the readout shows the current zoom and no command
 *   can express a value.
 * - `stencilLibraryToggle` / `propertyPanelToggle`: the two sidebar toggles.
 *   Engine-owned for the same reason: their pressed look comes from reducer
 *   state. The library toggle is dropped when the host declared no library.
 * - `sidebarsToggle`: one switch for both sidebars (the `toggleSidebars`
 *   command), pressed while either is open. Dropped when the host switched the
 *   command off via `CanvasConfig.commands`.
 * - `divider`: a hairline. One left at either end of a section, or next to
 *   another divider after the drops above, is cleaned away.
 * - `slot`: finished host UI. The engine only lends the place — it passes no
 *   props and holds no state — and wraps it in `data-gesture="none"` so plain
 *   `onClick` works.
 */
export type ToolbarItem =
	| { type: "stencilPreset"; presetId: string }
	| { type: "stencilCategory"; category: StencilCategory }
	| {
			type: "command";
			commandId: string;
			icon: ComponentType<StencilIconProps>;
			/**
			 * Overrides the command's own label on this button (tooltip and
			 * aria-label). Omit to take what `resolveCommandLabel` yields: the host
			 * override by id, else the command's own label for the locale.
			 */
			label?: string | LocaleMessages<string>;
	  }
	| { type: "zoom" }
	| { type: "stencilLibraryToggle" }
	| { type: "propertyPanelToggle" }
	| { type: "sidebarsToggle" }
	| { type: "divider" }
	| { type: "slot"; id: string; node: React.ReactNode };

/**
 * A run of toolbar items sharing one end of the bar.
 *
 * Sections are the single source of order and of category metadata: they name,
 * in display order, everything on the bar. The preset registry only answers
 * "what presets exist" — never "in what order" or "under which category".
 *
 * Hosts replace the whole array via the `toolbar.sections` Canvas prop; the
 * default bar is itself such an array ({@link DEFAULT_TOOLBAR_SECTIONS}).
 */
export type ToolbarSection = {
	/** Keys the rendered section; must be unique across the array. */
	id: string;
	/**
	 * Which end of the bar the section is packed against. Omitted = `"start"`.
	 * Sections are drawn in array order; the free space falls just before the
	 * first `"end"` section, so declare the `"end"` ones last.
	 */
	align?: "start" | "end";
	items: ToolbarItem[];
};

// The bar is laid out by three rules, which the sections below follow and a host
// replacing them is meant to keep:
//   1. A sidebar control sits at the edge its panel opens on — the shape library
//      toggle at the far left, the properties toggle or the switch for both
//      sidebars at the far right.
//   2. The start side holds what changes the document (placing shapes, undo /
//      redo); the end side what does not (zoom, help, and whatever view-side UI
//      the host adds for itself).
//   3. The shape presets live on the bottom tool bar (`bottomToolbar`), not
//      here. A host that still pins presets on this bar (DEFAULT_TOOLBAR_TOOLS_SECTION)
//      pins only the basic ones, as shortcuts, and hides the bottom bar so no
//      preset shows twice.

/**
 * The shape tools as the top bar used to carry them: the shape library toggle at
 * the far left, then core's presets ({@link DEFAULT_BOTTOM_TOOLBAR_PRESET_IDS})
 * pinned directly. No longer part of {@link DEFAULT_TOOLBAR_SECTIONS}, which
 * leaves the presets to the bottom tool bar; kept for a host that wants them on
 * top, which then passes `bottomToolbar: { show: false }` so they do not show
 * twice.
 */
export const DEFAULT_TOOLBAR_TOOLS_SECTION: ToolbarSection = {
	id: "tools",
	items: [
		{ type: "stencilLibraryToggle" },
		{ type: "divider" },
		...DEFAULT_BOTTOM_TOOLBAR_PRESET_IDS.map((presetId): ToolbarItem => ({
			type: "stencilPreset",
			presetId,
		})),
	],
};

/**
 * Undo / redo, kept on the start side as document-changing operations but in a
 * section of their own so a host replacing the shape tools does not have to
 * restate them. The leading divider marks the boundary with whatever tools
 * precede it, and goes when nothing does (a divider never opens the bar); the
 * whole section disappears when the host switched both commands off.
 */
export const DEFAULT_TOOLBAR_HISTORY_SECTION: ToolbarSection = {
	id: "history",
	items: [
		{ type: "divider" },
		{ type: "command", commandId: "undo", icon: UndoIcon },
		{ type: "command", commandId: "redo", icon: RedoIcon },
	],
};

/**
 * Zoom, zoom to fit and shortcut help, packed against the right edge: the
 * controls that leave the document alone. Zoom to fit rides beside the zoom
 * group as the one view command the bar shows; zoom to selection stays a
 * shortcut, since a button that needs a selection would sit disabled most of the
 * time. A host adding its own view-side UI (a settings menu, say)
 * belongs after this section and before the sidebar control, so that control
 * keeps the far edge.
 */
export const DEFAULT_TOOLBAR_VIEW_SECTION: ToolbarSection = {
	id: "view",
	align: "end",
	items: [
		{ type: "zoom" },
		{ type: "command", commandId: "zoomToFit", icon: ZoomToFitIcon },
		{ type: "divider" },
		{ type: "command", commandId: "shortcutHelp", icon: HelpIcon },
	],
};

/**
 * The properties toggle alone at the far right, mirroring the shape library
 * toggle at the far left. Its leading divider separates it from whatever the
 * host packed against the end before it. No longer part of
 * {@link DEFAULT_TOOLBAR_SECTIONS}, whose far right is the switch for both
 * sidebars ({@link DEFAULT_TOOLBAR_SIDEBARS_SECTION}); kept for a host that
 * moves the two edges apart.
 */
export const DEFAULT_TOOLBAR_PROPERTIES_SECTION: ToolbarSection = {
	id: "properties",
	align: "end",
	items: [{ type: "divider" }, { type: "propertyPanelToggle" }],
};

/**
 * The switch for both sidebars alone at the far right: it opens the shape
 * library and the properties sidebar together and closes both again (see the
 * `toggleSidebars` command). Its leading divider separates it from whatever the
 * host packed against the end before it.
 */
export const DEFAULT_TOOLBAR_SIDEBARS_SECTION: ToolbarSection = {
	id: "sidebars",
	align: "end",
	items: [{ type: "divider" }, { type: "sidebarsToggle" }],
};

/**
 * The default bar: history on the left, view and the switch for both sidebars
 * on the right. The shape presets are not on it: they are the bottom tool
 * bar's (`bottomToolbar`).
 */
export const DEFAULT_TOOLBAR_SECTIONS: ToolbarSection[] = [
	DEFAULT_TOOLBAR_HISTORY_SECTION,
	DEFAULT_TOOLBAR_VIEW_SECTION,
	DEFAULT_TOOLBAR_SIDEBARS_SECTION,
];
