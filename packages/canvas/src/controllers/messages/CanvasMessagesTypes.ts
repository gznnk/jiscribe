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

	// Export dialog
	exportDialogTitle: string;
	exportDialogFormat: string;
	exportDialogFormatPng: string;
	exportDialogFormatSvg: string;
	exportDialogMargin: string;
	exportDialogIncludeSource: string;
	exportDialogTransparentBackground: string;
	exportDialogSubmit: string;
	exportDialogCancel: string;
	/** aria-label of the dialog's close (×) button */
	exportDialogClose: string;

	// Shortcut help modal
	shortcutHelpTitle: string;
	shortcutHelpClose: string;
	shortcutHelpCategoryEdit: string;
	shortcutHelpCategorySelection: string;
	shortcutHelpCategoryArrange: string;
	shortcutHelpCategoryView: string;

	// Error toasts
	clipboardWriteError: string;
	exportImageError: string;

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
 * (commands, stencils, color presets, arrow types); an entry missing
 * from a record falls back to that definition's label.
 */
export type CanvasMessages = CanvasMessageStrings & {
	/** Overrides keyed by command id (e.g. `undo`, `bringToFront`, `move-up-large`) */
	commandLabels: Record<string, string>;
	/** Overrides keyed by stencil id (e.g. `rect`, `ellipse`, `polygon`) */
	stencilLabels: Record<string, string>;
	/** Overrides keyed by stencil category id (e.g. `flowchart`, `general`, `annotation`) */
	stencilCategoryLabels: Record<string, string>;
	/** Overrides keyed by the English color preset name (e.g. `Red`, `Light Blue`) */
	colorNames: Record<string, string>;
	/** Overrides keyed by arrow type (e.g. `FilledTriangle`, `None`) */
	arrowTypeNames: Record<string, string>;
};
