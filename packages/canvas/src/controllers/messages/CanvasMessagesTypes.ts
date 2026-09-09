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
	/** title / aria-label of the toggle opening the shape library sidebar */
	toolbarStencilLibrary: string;
	/** title / aria-label of the toggle opening the properties sidebar */
	toolbarPropertyPanel: string;

	// Shape library sidebar
	/** Heading of the sidebar */
	stencilLibraryTitle: string;
	/** aria-label of the sidebar's close (×) button */
	stencilLibraryClose: string;
	/** placeholder of the sidebar's search box */
	stencilLibrarySearchPlaceholder: string;
	/** Shown in place of the sections when a search matches no stencil */
	stencilLibraryNoMatch: string;

	// Properties sidebar
	/** Heading of the sidebar */
	propertyPanelTitle: string;
	/** aria-label of the sidebar's close (x) button */
	propertyPanelClose: string;
	/** Shown in place of a value the selection does not agree on (a dropdown's label, a color field's) */
	propertyPanelMixed: string;
	/** placeholder of a number field the selection does not agree on; the field itself is left empty */
	propertyPanelMixedPlaceholder: string;
	/** aria-label of a number field's up button; the step is 1, or 10 with Shift */
	propertyPanelStepUp: string;
	/** aria-label of a number field's down button */
	propertyPanelStepDown: string;
	/** Heading of the section stating the document's own settings, shown while nothing is selected */
	propertyPanelSectionCanvas: string;
	/** Heading of the section stating the selection's position, size and rotation */
	propertyPanelSectionLayout: string;
	/** Heading of the section stating a shape's face color */
	propertyPanelSectionFill: string;
	/** Heading of the section stating the stroke of a shape that has no face (a line, a connector) */
	propertyPanelSectionLine: string;
	/** Heading of the section stating the outline of a shape that has a face */
	propertyPanelSectionStroke: string;
	/** Heading of the section stating the two ends of an arrow */
	propertyPanelSectionArrow: string;
	/** Heading of the section stating the text style of the selected slot */
	propertyPanelSectionText: string;
	/** Heading of the section stating a connector label's text and face, shown only once the label has text */
	propertyPanelSectionLabel: string;
	/** Heading of the section stating a connector label's border, shown only once the label has text */
	propertyPanelSectionLabelBorder: string;
	/** Heading of the section holding the stacking-order commands, shown for any selection they apply to */
	propertyPanelSectionArrange: string;
	/** Label of the row stating the canvas surface color, and the aria-label of its field */
	propertyPanelRowBackground: string;
	/** Label of the color row (fill, stroke, font color) */
	propertyPanelRowColor: string;
	/** Label of the stroke-thickness row */
	propertyPanelRowWidth: string;
	/** Label of the dash-pattern row */
	propertyPanelRowType: string;
	/** Label of the corner-radius row */
	propertyPanelRowRadius: string;
	/** Label of the font-size row */
	propertyPanelRowSize: string;
	/** Label of the layout row holding the frame's X / Y fields */
	propertyPanelRowPosition: string;
	/** Label of the layout row holding the rotation field */
	propertyPanelRowRotation: string;
	/** Label of the bold / italic / underline / strikethrough row */
	propertyPanelRowStyle: string;
	/** Label of the horizontal text-alignment row */
	propertyPanelRowHorizontal: string;
	/** Label of the vertical text-alignment row */
	propertyPanelRowVertical: string;
	/** Label of the row choosing which box a body's vertical alignment is measured against */
	propertyPanelRowTextBasis: string;
	/** Label of the row choosing a connector's line shape (orthogonal / straight) */
	propertyPanelRowRouting: string;
	/** The segment placing the text in the region the shape's own outline leaves clear (the default) */
	propertyPanelTextBasisRegion: string;
	/** The segment placing the text on the shape's whole height */
	propertyPanelTextBasisFrame: string;
	/** aria-label of the field stating the frame's left edge */
	propertyPanelFieldX: string;
	/** aria-label of the field stating the frame's top edge */
	propertyPanelFieldY: string;
	/** aria-label of the field stating the frame's width */
	propertyPanelFieldWidth: string;
	/** aria-label of the field stating the frame's height */
	propertyPanelFieldHeight: string;
	/** aria-label of the field stating the frame's rotation, in degrees */
	propertyPanelFieldRotation: string;

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
	menuTextFormat: string;
	menuBold: string;
	menuItalic: string;
	menuUnderline: string;
	menuStrikethrough: string;
	menuFontSize: string;
	menuFontFamily: string;
	/** Label of the CANVAS_FONT_FAMILIES entry whose id is "sans" */
	fontFamilySans: string;
	/** Label of the CANVAS_FONT_FAMILIES entry whose id is "serif" */
	fontFamilySerif: string;
	/** Label of the CANVAS_FONT_FAMILIES entry whose id is "mono" */
	fontFamilyMono: string;
	/** Label of the CANVAS_FONT_FAMILIES entry whose id is "hand" */
	fontFamilyHand: string;
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
	menuAutoHeight: string;
	menuFixedHeight: string;
	menuTextBasisFrame: string;
	menuTextBasisRegion: string;
	menuWrapTextInWidth: string;
	menuFitWidthToText: string;
	menuConnectorRouting: string;
	menuRoutingOrthogonal: string;
	menuRoutingStraight: string;
	menuStartArrow: string;
	menuEndArrow: string;
	menuSwapArrows: string;
	menuLabelBold: string;
	menuLabelFontSize: string;
	menuLabelFontFamily: string;
	menuLabelFontColor: string;
	menuLabelBackgroundColor: string;
	menuLabelBorderColor: string;
	menuLabelBorderStyle: string;
	menuOpenReference: string;
	/** Title of the ellipsis at the end of the ObjectMenu that opens the properties sidebar. */
	menuPropertyPanel: string;
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
