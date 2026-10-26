import type { ComponentType } from "react";

import type { LocaleMessages } from "../../../../foundation/i18n/resolveLocaleMessages";
import { HelpIcon } from "../../icons/HelpIcon";
import { RedoIcon } from "../../icons/RedoIcon";
import { UndoIcon } from "../../icons/UndoIcon";
import { ZoomToFitIcon } from "../../icons/ZoomToFitIcon";
import type { StencilIconProps } from "../../objects/Stencil";

/**
 * One control on the toolbar. The discriminant is `type`, matching
 * `ObjectMenuItem`. The shape tools are not among them: presets and library
 * categories live on the stencil rail at the left (the `rail` Canvas prop).
 *
 * - `command`: a button running a registered command through the command system
 *   (`data-action="command:{id}"` → ToolbarHandler → handleCommand), disabled from
 *   the command's own `canExecute`. The icon rides on the item because `Command`
 *   itself carries no icon. A commandId the registry does not know (a command
 *   the host switched off via `CanvasConfig.commands`) is silently dropped.
 * - `zoom`: the composite `−` / readout / `+` group. Engine-owned rather than
 *   three commands, because the readout shows the current zoom and no command
 *   can express a value.
 * - `propertyPanelToggle`: the properties sidebar toggle. Engine-owned for the
 *   same reason: its pressed look comes from reducer state.
 * - `divider`: a hairline. One left at either end of a section, or next to
 *   another divider after the drops above, is cleaned away.
 * - `slot`: finished host UI. The engine only lends the place — it passes no
 *   props and holds no state — and wraps it in `data-gesture="none"` so plain
 *   `onClick` works.
 */
export type ToolbarItem =
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
	| { type: "propertyPanelToggle" }
	| { type: "divider" }
	| { type: "slot"; id: string; node: React.ReactNode };

/**
 * A run of toolbar items sharing one end of the bar.
 *
 * Sections are the single source of order: they name, in display order,
 * everything on the bar.
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

// The bar is laid out by two rules, which the sections below follow and a host
// replacing them is meant to keep:
//   1. The start side holds what changes the document (undo / redo, and the
//      host's document UI such as a file menu); the end side what does not
//      (zoom, help, and whatever view-side UI the host adds for itself).
//   2. The properties toggle keeps the far right, the edge its panel opens on.

/**
 * Undo / redo, kept on the start side as document-changing operations. The
 * whole section disappears when the host switched both commands off. A host
 * putting its own document UI before it ends that section with a divider, which
 * is kept as the boundary between the two.
 */
export const DEFAULT_TOOLBAR_HISTORY_SECTION: ToolbarSection = {
	id: "history",
	items: [
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
 * belongs after this section and before the properties toggle, so the toggle
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
 * The properties toggle alone at the far right. Its leading divider separates it
 * from whatever the host packed against the end before it.
 */
export const DEFAULT_TOOLBAR_PROPERTIES_SECTION: ToolbarSection = {
	id: "properties",
	align: "end",
	items: [{ type: "divider" }, { type: "propertyPanelToggle" }],
};

/** The default bar: history on the left, view and properties right. */
export const DEFAULT_TOOLBAR_SECTIONS: ToolbarSection[] = [
	DEFAULT_TOOLBAR_HISTORY_SECTION,
	DEFAULT_TOOLBAR_VIEW_SECTION,
	DEFAULT_TOOLBAR_PROPERTIES_SECTION,
];
