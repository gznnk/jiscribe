import type { Command } from "../commands/CommandTypes";

/**
 * Flat UI strings owned by the canvas components (tooltips, aria-labels,
 * menu titles, toast messages). Every key has an English default in
 * `defaultCanvasMessages`.
 */
export type CanvasMessageStrings = {
	// Toolbar
	toolbarZoomOut: string;
	toolbarResetZoom: string;
	toolbarZoomIn: string;
	/** aria-label of the help (?) button */
	toolbarShowShortcutHelp: string;
	/** title (tooltip) of the help (?) button */
	toolbarShortcutHelp: string;
	/** aria-label / title of the SVG export button */
	toolbarExportSvg: string;
	/** aria-label / title of the PNG export button */
	toolbarExportPng: string;

	// Shortcut help modal
	shortcutHelpTitle: string;
	shortcutHelpClose: string;
	shortcutHelpCategoryEdit: string;
	shortcutHelpCategorySelection: string;
	shortcutHelpCategoryArrange: string;
	shortcutHelpCategoryView: string;

	// Context menu
	contextMenuPaste: string;

	// Clipboard write error toast
	clipboardWriteError: string;

	// Color picker
	colorPickerAuto: string;
	colorPickerAutoTitle: string;
	colorPickerCssColorPlaceholder: string;

	// Object menu items
	menuTextAlignment: string;
	menuAlignLeft: string;
	menuAlignCenter: string;
	menuAlignRight: string;
	menuAlignTop: string;
	menuAlignMiddle: string;
	menuAlignBottom: string;
	menuBold: string;
	menuFontSize: string;
	menuFontColor: string;
	menuBackgroundColor: string;
	menuStrokeColor: string;
	menuLineColor: string;
	menuLineStyle: string;
	menuLineWidth: string;
	menuBorderStyle: string;
	menuBorderWidth: string;
	menuCornerRadius: string;
	menuSolidLine: string;
	menuDashedLine: string;
	menuDottedLine: string;
	menuLockAspectRatio: string;
	menuUnlockAspectRatio: string;
	menuConnectorRouting: string;
	menuRoutingOrthogonal: string;
	menuRoutingStraight: string;
	menuStartArrow: string;
	menuEndArrow: string;
	menuSwapArrows: string;
	menuLabelBold: string;
	menuLabelFontSize: string;
	menuLabelFontColor: string;
	menuLabelBackgroundColor: string;
	menuLabelBorderColor: string;
	menuLabelBorderStyle: string;
};

/**
 * All UI strings of the canvas.
 *
 * The flat keys cover strings hardcoded in components. The record keys
 * override labels whose English defaults live next to their definitions
 * (commands, shape presets, color presets, arrow types); an entry missing
 * from a record falls back to that definition's label.
 */
export type CanvasMessages = CanvasMessageStrings & {
	/** Overrides keyed by command id (e.g. `undo`, `bringToFront`, `move-up-large`) */
	commandLabels: Record<string, string>;
	/** Overrides keyed by shape preset id (e.g. `rect`, `ellipse`, `sticky`) */
	shapePresetLabels: Record<string, string>;
	/** Overrides keyed by the English color preset name (e.g. `Red`, `Light Blue`) */
	colorNames: Record<string, string>;
	/** Overrides keyed by arrow type (e.g. `FilledTriangle`, `None`) */
	arrowTypeNames: Record<string, string>;
};

/** English defaults. Hosts override parts of this via the `messages` prop of Canvas. */
export const defaultCanvasMessages: CanvasMessages = {
	toolbarZoomOut: "Zoom out",
	toolbarResetZoom: "Reset zoom to 100%",
	toolbarZoomIn: "Zoom in",
	toolbarShowShortcutHelp: "Show keyboard shortcuts",
	toolbarShortcutHelp: "Keyboard shortcuts",
	toolbarExportSvg: "Export as SVG (editable)",
	toolbarExportPng: "Export as PNG",

	shortcutHelpTitle: "Keyboard Shortcuts",
	shortcutHelpClose: "Close",
	shortcutHelpCategoryEdit: "Edit",
	shortcutHelpCategorySelection: "Selection",
	shortcutHelpCategoryArrange: "Arrange",
	shortcutHelpCategoryView: "View",

	contextMenuPaste: "Paste",

	clipboardWriteError:
		"Failed to write to the clipboard. Paste inside the app is still available.",

	colorPickerAuto: "Auto",
	colorPickerAutoTitle: "Auto (follows theme)",
	colorPickerCssColorPlaceholder: "CSS color",

	menuTextAlignment: "Text Alignment",
	menuAlignLeft: "Left",
	menuAlignCenter: "Center",
	menuAlignRight: "Right",
	menuAlignTop: "Top",
	menuAlignMiddle: "Middle",
	menuAlignBottom: "Bottom",
	menuBold: "Bold",
	menuFontSize: "Font Size",
	menuFontColor: "Font Color",
	menuBackgroundColor: "Background Color",
	menuStrokeColor: "Stroke Color",
	menuLineColor: "Line Color",
	menuLineStyle: "Line Style",
	menuLineWidth: "Line Width",
	menuBorderStyle: "Border Style",
	menuBorderWidth: "Border Width",
	menuCornerRadius: "Corner Radius",
	menuSolidLine: "Solid line",
	menuDashedLine: "Dashed line",
	menuDottedLine: "Dotted line",
	menuLockAspectRatio: "Lock Aspect Ratio",
	menuUnlockAspectRatio: "Unlock Aspect Ratio",
	menuConnectorRouting: "Connector Routing",
	menuRoutingOrthogonal: "Orthogonal",
	menuRoutingStraight: "Straight",
	menuStartArrow: "Start Arrow",
	menuEndArrow: "End Arrow",
	menuSwapArrows: "Swap arrows",
	menuLabelBold: "Label Bold",
	menuLabelFontSize: "Label Font Size",
	menuLabelFontColor: "Label Font Color",
	menuLabelBackgroundColor: "Label Background Color",
	menuLabelBorderColor: "Label Border Color",
	menuLabelBorderStyle: "Label Border Style",

	commandLabels: {},
	shapePresetLabels: {},
	colorNames: {},
	arrowTypeNames: {},
};

/** Merges host-supplied partial messages over the English defaults. */
export const mergeCanvasMessages = (
	overrides?: Partial<CanvasMessages>,
): CanvasMessages => ({
	...defaultCanvasMessages,
	...overrides,
	commandLabels: { ...overrides?.commandLabels },
	shapePresetLabels: { ...overrides?.shapePresetLabels },
	colorNames: { ...overrides?.colorNames },
	arrowTypeNames: { ...overrides?.arrowTypeNames },
});

/** Resolves a command's display label: override by id, else the command's English label. */
export const getCommandLabel = (
	messages: CanvasMessages,
	command: Pick<Command, "id" | "label">,
): string => messages.commandLabels[command.id] ?? command.label;
