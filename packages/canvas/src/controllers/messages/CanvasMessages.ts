import type { CanvasMessages } from "./CanvasMessagesTypes";
import { jaCanvasMessages } from "./jaCanvasMessages";
import {
	resolveLocaleMessages,
	type LocaleMessages,
} from "./resolveLocaleMessages";
import type { Command } from "../commands/CommandTypes";

/** English defaults. Hosts override parts of this via the `messages` prop of Canvas. */
export const defaultCanvasMessages: CanvasMessages = {
	toolbarZoomOut: "Zoom out",
	toolbarResetZoom: "Reset zoom to 100%",
	toolbarZoomIn: "Zoom in",
	toolbarShowShortcutHelp: "Show keyboard shortcuts",
	toolbarShortcutHelp: "Keyboard shortcuts",

	exportDialogTitle: "Export Image",
	exportDialogFormat: "Format",
	exportDialogFormatPng: "PNG",
	exportDialogFormatSvg: "SVG",
	exportDialogMargin: "Margin",
	exportDialogIncludeSource: "Include source data (re-editable)",
	exportDialogTransparentBackground: "Transparent background",
	exportDialogSubmit: "Export",
	exportDialogCancel: "Cancel",
	exportDialogClose: "Close",

	shortcutHelpTitle: "Keyboard Shortcuts",
	shortcutHelpClose: "Close",
	shortcutHelpCategoryEdit: "Edit",
	shortcutHelpCategorySelection: "Selection",
	shortcutHelpCategoryArrange: "Arrange",
	shortcutHelpCategoryView: "View",

	clipboardWriteError:
		"Failed to write to the clipboard. Paste inside the app is still available.",
	exportImageError: "Failed to export the image.",

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
	menuTextFormat: "Text Format",
	menuBold: "Bold",
	menuItalic: "Italic",
	menuUnderline: "Underline",
	menuStrikethrough: "Strikethrough",
	menuFontSize: "Font Size",
	menuFontFamily: "Font",
	fontFamilySans: "Sans",
	fontFamilySerif: "Serif",
	fontFamilyMono: "Mono",
	fontFamilyHand: "Hand",
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
	menuOpenReference: "Open Reference",

	commandLabels: {},
	stencilLabels: {},
	stencilCategoryLabels: {},
	colorNames: {},
	arrowTypeNames: {},
};

/** Built-in dictionaries the canvas resolves from `locale` on its own. */
const builtinCanvasMessagesByLocale: LocaleMessages<CanvasMessages> = {
	en: defaultCanvasMessages,
	ja: jaCanvasMessages,
};

/**
 * Resolves the effective messages for a locale, then applies host overrides.
 * Flat keys: English defaults ← built-in locale dictionary ← overrides. Record
 * fields are merged key by key (built-in locale record ← overrides record).
 */
export const resolveCanvasMessages = (
	locale: string,
	overrides?: Partial<CanvasMessages>,
): CanvasMessages => {
	const localized = resolveLocaleMessages(
		builtinCanvasMessagesByLocale,
		locale,
	);
	return {
		...defaultCanvasMessages,
		...localized,
		...overrides,
		commandLabels: { ...localized.commandLabels, ...overrides?.commandLabels },
		stencilLabels: {
			...localized.stencilLabels,
			...overrides?.stencilLabels,
		},
		stencilCategoryLabels: {
			...localized.stencilCategoryLabels,
			...overrides?.stencilCategoryLabels,
		},
		colorNames: { ...localized.colorNames, ...overrides?.colorNames },
		arrowTypeNames: {
			...localized.arrowTypeNames,
			...overrides?.arrowTypeNames,
		},
	};
};

/** Resolves a command's display label: override by id, else the command's English label. */
export const getCommandLabel = (
	messages: CanvasMessages,
	command: Pick<Command, "id" | "label">,
): string => messages.commandLabels[command.id] ?? command.label;
