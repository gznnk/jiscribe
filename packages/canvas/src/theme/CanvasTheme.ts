/**
 * Host-injectable theme for the Canvas.
 *
 * A theme has two delivery paths, matching how each value is consumed:
 *
 * - {@link CanvasThemeTokens} are CSS values. The Canvas root injects them as
 *   `--jiscribe-*` CSS custom properties, and styles reference them via the
 *   static token object in `constants/theme.ts`. Values may themselves be
 *   `var(...)` expressions — that is how a host maps its own variables onto
 *   the neutral tokens (e.g. VSCode maps `--vscode-editor-background` to
 *   `canvasBg`).
 * - {@link CanvasHandleDimensions} and {@link CanvasTheme.fontFamily} are
 *   consumed in JS (zoom-adjusted geometry, canvas text measurement, doc
 *   creation defaults), so they are concrete values distributed via
 *   `CanvasThemeContext` — never `var(...)` strings.
 */

/**
 * Appearance tokens injected as `--jiscribe-*` CSS custom properties.
 * Colors of the shapes themselves (fill/stroke/fontColor) are document data
 * and are not part of the theme.
 */
export type CanvasThemeTokens = {
	/** Canvas base color (editor background) */
	canvasBg: string;
	/** Surface of floating UI such as menus and toolbars */
	surface: string;
	/** Hover surface for buttons, etc. */
	surfaceHover: string;
	/** Active surface for buttons, etc. */
	surfaceActive: string;
	/** Outer border of floating UI */
	border: string;
	/** Subtle lines such as separators */
	borderSubtle: string;
	/** Primary text/icon color */
	foreground: string;
	/** Secondary text color */
	foregroundMuted: string;
	/** Disabled text color (dims the foreground heavily to make the disabled state clear) */
	disabledForeground: string;
	/** Icon color */
	iconForeground: string;
	/** Accent (selection/focus) */
	accent: string;
	/** Input field background */
	inputBg: string;
	/** Input field text color */
	inputFg: string;
	/** Input field border */
	inputBorder: string;
	/** Input field placeholder color */
	inputPlaceholder: string;
	/** Error text color */
	errorFg: string;
	/** Drop shadow for floating UI (full box-shadow value) */
	shadow: string;
	/** Grid line color */
	gridLine: string;
	/** Track color for sliders, etc. (a mid gray visible against the surface) */
	sliderTrack: string;
	/**
	 * The darker color of the checkerboard indicating transparency (none).
	 * The other cell is transparent (the surface shows through) to make a two-tone checker.
	 */
	transparentChecker: string;
	/** Corner radius of floating UI (menus, buttons, etc.) as a CSS length */
	radius: string;
	/** Outline color of selection/transform handles and connector endpoints */
	handleAccent: string;
	/** Fill color of selection/transform handles and inactive connection targets */
	handleFill: string;
	/** Color of connection anchors, connection targets, and vertex-insert handles */
	connectionAccent: string;
	/** Scrollbar track color. Default transparent (overlay-scrollbar convention); hosts may set an opaque color */
	scrollbarTrack: string;
	/** Scrollbar thumb color (text editor, etc.) */
	scrollbarThumb: string;
	/** Scrollbar thumb color on hover */
	scrollbarThumbHover: string;
};

/**
 * Sizes of the interactive handles (selection anchors, rotation handle,
 * connection anchors, ...). World-unit numbers before zoom adjustment;
 * consumed in JS, so numbers rather than CSS lengths.
 */
export type CanvasHandleDimensions = {
	/** Radius of anchor/endpoint/vertex handles */
	anchorRadius: number;
	/** Stroke width of anchor/endpoint/vertex handles */
	anchorStrokeWidth: number;
	/** Distance from the shape's top edge to the rotation handle */
	rotationHandleOffset: number;
	/** Rendered size of the rotation icon */
	rotationIconSize: number;
	/** Hit-test radius of the rotation handle */
	rotationHitRadius: number;
	/** Distance from the shape's edge to its connection anchors */
	connectionAnchorOffset: number;
};

/** The full theme a host can inject via the Canvas `theme` prop. */
export type CanvasTheme = {
	tokens: CanvasThemeTokens;
	handleDimensions: CanvasHandleDimensions;
	/**
	 * Default font for newly created shapes and the fallback for labels without
	 * an explicit font. Used for canvas text measurement in JS, so this must be
	 * a concrete font-family list, not a `var(...)` expression.
	 */
	fontFamily: string;
};
