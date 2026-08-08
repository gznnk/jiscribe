import { darkCanvasTheme } from "@workspace/canvas";
import type { CanvasTheme } from "@workspace/canvas";

/**
 * Maps the `--vscode-*` CSS variables that the VSCode webview auto-injects
 * onto the canvas's neutral theme tokens.
 *
 * The canvas itself knows nothing about VSCode: it resolves its appearance
 * from the injected `CanvasTheme`. This host-side mapping layer passes
 * `var(--vscode-..., <dark fallback>)` strings as token values, so the canvas
 * automatically blends with the user's editor theme (Dark / Light / High
 * Contrast). The fallbacks match `darkCanvasTheme` and only apply if a
 * `--vscode-*` variable is missing.
 *
 * Handle colors/dimensions and the default font are inherited from
 * `darkCanvasTheme` (fixed brand accents, not part of the VSCode palette).
 */
export const vscodeCanvasTheme: CanvasTheme = {
	...darkCanvasTheme,
	tokens: {
		...darkCanvasTheme.tokens,
		canvasBg: "var(--vscode-editor-background, #1e1e1e)",
		surface: "var(--vscode-editorWidget-background, #252526)",
		surfaceHover:
			"var(--vscode-toolbar-hoverBackground, rgba(255, 255, 255, 0.08))",
		surfaceActive:
			"var(--vscode-toolbar-activeBackground, rgba(255, 255, 255, 0.12))",
		border: "var(--vscode-editorWidget-border, #2b2b2b)",
		borderSubtle: "var(--vscode-panel-border, #3c3c3c)",
		foreground: "var(--vscode-foreground, #cccccc)",
		foregroundMuted: "var(--vscode-descriptionForeground, #8b8b8b)",
		disabledForeground:
			"var(--vscode-disabledForeground, rgba(204, 204, 204, 0.4))",
		iconForeground: "var(--vscode-icon-foreground, #c5c5c5)",
		accent: "var(--vscode-focusBorder, #007acc)",
		inputBg: "var(--vscode-input-background, #1e1e1e)",
		inputFg: "var(--vscode-input-foreground, #cccccc)",
		inputBorder: "var(--vscode-input-border, #3c3c3c)",
		inputPlaceholder: "var(--vscode-input-placeholderForeground, #989898)",
		errorFg: "var(--vscode-errorForeground, #f48771)",
		shadow: "0 2px 8px var(--vscode-widget-shadow, rgba(0, 0, 0, 0.36))",
		sliderTrack: "var(--vscode-scrollbarSlider-background, #6e6e6e)",
		scrollbarThumb: "var(--vscode-scrollbarSlider-background, #d1d5db)",
		scrollbarThumbHover:
			"var(--vscode-scrollbarSlider-hoverBackground, #9ca3af)",
		objectInk: "var(--vscode-editor-foreground, #ffffff)",
		objectSurface: "var(--vscode-editorWidget-background, #252526)",
	},
};
