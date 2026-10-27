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
 *   state (pressed while their panel is drawn). Pressed while the chrome is
 *   collapsed, each expands it with its own panel alone open.
 * - `sidebarsToggle`: the switch between the chrome's two forms (the
 *   `toggleSidebars` command), pressed while expanded. Dropped when the host
 *   switched the command off via `CanvasConfig.commands`.
 * - `divider`: a hairline. Dividers left stranded or doubled by the drops
 *   above, or by neighbouring sections, are cleaned away (see
 *   `resolveToolbarSections`).
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
 *
 * The bar takes the chrome's two forms. Expanded, it is the full-width bar
 * above the canvas, laid out by `align`; collapsed, it splits into two pills
 * floating over the canvas's top corners along the same sides, unless a
 * section's `collapsedAlign` says otherwise.
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
	/**
	 * Which pill the section goes into while the chrome is collapsed:
	 * `"start"` the top-left one, `"end"` the top-right one, `"hidden"` neither
	 * (the section is not drawn until the chrome expands). Omitted = the same as
	 * `align`. Within a pill sections are drawn in array order with exactly one
	 * divider between neighbours, whatever dividers they declare at their own
	 * ends; a pill left with no section is not drawn.
	 */
	collapsedAlign?: "start" | "end" | "hidden";
	items: ToolbarItem[];
};

// The default bar is laid out by four rules, which a host replacing it is meant
// to keep:
//   1. The switch for both sidebars keeps the far right, and the toggles for
//      one sidebar each sit just before it, the shape library's first.
//      DEFAULT_TOOLBAR_TOOLS_SECTION and DEFAULT_TOOLBAR_PROPERTIES_SECTION do
//      not follow this one: each puts its toggle at the edge its panel opens on.
//   2. The start side holds what changes the document (placing shapes, undo /
//      redo); the end side what does not (zoom, help, and whatever view-side UI
//      the host adds for itself).
//   3. The shape presets live on the bottom tool bar (`bottomToolbar`), not
//      here. A host that still pins presets on this bar (DEFAULT_TOOLBAR_TOOLS_SECTION)
//      pins only the basic ones, as shortcuts, and hides the bottom bar so no
//      preset shows twice.
//   4. A host section that only matters while editing (a settings menu, say)
//      sets `collapsedAlign: "hidden"`.

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
 * precede it, and goes when nothing does or when that already ends in one (see
 * `resolveToolbarSections`); the whole section disappears when the host
 * switched both commands off.
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
 * Zoom and zoom to fit, packed against the right edge: the controls that leave
 * the document alone. Zoom to fit rides beside the zoom group as the one view
 * command the bar shows; zoom to selection stays a shortcut, since a button
 * that needs a selection would sit disabled most of the time.
 */
export const DEFAULT_TOOLBAR_VIEW_SECTION: ToolbarSection = {
	id: "view",
	align: "end",
	items: [
		{ type: "zoom" },
		{ type: "command", commandId: "zoomToFit", icon: ZoomToFitIcon },
	],
};

/**
 * Shortcut help, right after {@link DEFAULT_TOOLBAR_VIEW_SECTION} and set off
 * from it by its leading divider; `?` opens the help while the section is
 * hidden. A host adding its own view-side UI (a settings menu, say) belongs
 * after this section and before the sidebar controls, which keep the far right.
 */
export const DEFAULT_TOOLBAR_HELP_SECTION: ToolbarSection = {
	id: "help",
	align: "end",
	collapsedAlign: "hidden",
	items: [
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
 * The toggles for one sidebar each, the shape library's then the properties',
 * just before the switch for both ({@link DEFAULT_TOOLBAR_SIDEBARS_SECTION}).
 * Each shows pressed while its own panel is open. Hidden while the chrome is
 * collapsed, where the switch alone expands it. Its leading divider separates
 * it from whatever the host packed against the end before it.
 */
export const DEFAULT_TOOLBAR_PER_SIDEBAR_TOGGLES_SECTION: ToolbarSection = {
	id: "per-sidebar-toggles",
	align: "end",
	collapsedAlign: "hidden",
	items: [
		{ type: "divider" },
		{ type: "stencilLibraryToggle" },
		{ type: "propertyPanelToggle" },
	],
};

/**
 * The switch for both sidebars, alone at the far right: it expands the chrome
 * with the sidebars the user last had open (both, when that was neither) and
 * collapses it again (see the `toggleSidebars` command). Its leading divider
 * separates it from whatever the host packed against the end before it.
 */
export const DEFAULT_TOOLBAR_SIDEBARS_SECTION: ToolbarSection = {
	id: "sidebars",
	align: "end",
	items: [{ type: "divider" }, { type: "sidebarsToggle" }],
};

/**
 * The default bar: history on the left; view, help, the toggles for each
 * sidebar and the switch for both on the right. Collapsed, the same two sides
 * as pills, with help and the per-sidebar toggles hidden.
 * The shape presets are not on it: they are the bottom tool bar's
 * (`bottomToolbar`).
 */
export const DEFAULT_TOOLBAR_SECTIONS: ToolbarSection[] = [
	DEFAULT_TOOLBAR_HISTORY_SECTION,
	DEFAULT_TOOLBAR_VIEW_SECTION,
	DEFAULT_TOOLBAR_HELP_SECTION,
	DEFAULT_TOOLBAR_PER_SIDEBAR_TOGGLES_SECTION,
	DEFAULT_TOOLBAR_SIDEBARS_SECTION,
];
