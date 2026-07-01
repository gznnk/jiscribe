/**
 * Style tokens for following the VSCode theme.
 *
 * In VSCode webviews, `--vscode-*` CSS variables are auto-injected according to the theme
 * (Dark / Light / High Contrast). Each token references those variables while holding a
 * dark-toned fallback value for environments where the variables do not exist
 * (standalone demo, Storybook, etc.).
 *
 * As a result, it automatically blends with the user's theme in VSCode, and in the demo
 * environment it looks the same as the dark theme verified with mocks.
 *
 * Note: this only covers the colors of the UI chrome (menus, toolbars, selection frames, etc.).
 * The colors of the shapes themselves (fill/stroke/fontColor) are data saved in the document
 * and are not the subject of theme tokens.
 */
export const theme = {
	/** Canvas base color (editor background) */
	canvasBg: "var(--vscode-editor-background, #1e1e1e)",
	/** Surface of floating UI such as menus and toolbars */
	surface: "var(--vscode-editorWidget-background, #252526)",
	/** Hover surface for buttons, etc. */
	surfaceHover:
		"var(--vscode-toolbar-hoverBackground, rgba(255, 255, 255, 0.08))",
	/** Active surface for buttons, etc. */
	surfaceActive:
		"var(--vscode-toolbar-activeBackground, rgba(255, 255, 255, 0.12))",
	/** Outer border of floating UI */
	border: "var(--vscode-editorWidget-border, #2b2b2b)",
	/** Subtle lines such as separators */
	borderSubtle: "var(--vscode-panel-border, #3c3c3c)",
	/** Primary text/icon color */
	foreground: "var(--vscode-foreground, #cccccc)",
	/** Secondary text color */
	foregroundMuted: "var(--vscode-descriptionForeground, #8b8b8b)",
	/** Disabled text color (dims the foreground heavily to make the disabled state clear) */
	disabledForeground:
		"var(--vscode-disabledForeground, rgba(204, 204, 204, 0.4))",
	/** Icon color */
	iconForeground: "var(--vscode-icon-foreground, #c5c5c5)",
	/** Accent (selection/focus) */
	accent: "var(--vscode-focusBorder, #007acc)",
	/** Input field background */
	inputBg: "var(--vscode-input-background, #1e1e1e)",
	/** Input field text color */
	inputFg: "var(--vscode-input-foreground, #cccccc)",
	/** Input field border */
	inputBorder: "var(--vscode-input-border, #3c3c3c)",
	/** Input field placeholder color */
	inputPlaceholder: "var(--vscode-input-placeholderForeground, #989898)",
	/** Error text color */
	errorFg: "var(--vscode-errorForeground, #f48771)",
	/** Drop shadow for floating UI */
	shadow: "0 2px 8px var(--vscode-widget-shadow, rgba(0, 0, 0, 0.36))",
	/** Grid line color */
	gridLine: "var(--vscode-editorIndentGuide-background, #2a2a2a)",
	/** Track color for sliders, etc. (a mid gray visible against the surface) */
	sliderTrack: "var(--vscode-scrollbarSlider-background, #6e6e6e)",
	/**
	 * The darker color of the checkerboard indicating transparency (none).
	 * Overlaying the foreground faintly makes it auto-follow dark (light checker) / light (dark checker).
	 * The other cell is transparent (the surface shows through) to make a two-tone checker.
	 */
	transparentChecker:
		"color-mix(in srgb, var(--vscode-foreground, #888) 22%, transparent)",
	/** Corner radius of floating UI (menus, buttons, etc.). Kept subtle to match VSCode widgets. */
	radius: "4px",
} as const;
