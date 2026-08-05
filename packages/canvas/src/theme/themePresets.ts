import type { CanvasTheme } from "./CanvasTheme";
import { DEFAULT_FONT_FAMILY } from "../constants/defaultFontFamily";

/**
 * Derives the transparency checker from the injected foreground so it
 * auto-follows dark (light checker) / light (dark checker) themes.
 */
const TRANSPARENT_CHECKER =
	"color-mix(in srgb, var(--jiscribe-foreground, #888) 22%, transparent)";

/** Handle colors are brand accents that read well on both light and dark. */
const HANDLE_COLORS = {
	handleAccent: "#0d99ff",
	handleFill: "#ffffff",
	connectionAccent: "#6366f1",
} as const;

/** Handle sizes shared by the standard themes. */
const HANDLE_DIMENSIONS = {
	anchorRadius: 4,
	anchorStrokeWidth: 1,
	rotationHandleOffset: 15,
	rotationIconSize: 20,
	rotationHitRadius: 7,
	connectionAnchorOffset: 20,
} as const;

/**
 * Standard dark theme. Also the built-in default: token values double as the
 * `var(--jiscribe-*, <fallback>)` fallbacks baked into `constants/theme.ts`,
 * so fragments rendered outside a themed root (e.g. exported SVG) fall back
 * to these colors.
 */
export const darkCanvasTheme: CanvasTheme = {
	tokens: {
		canvasBg: "#1e1e1e",
		surface: "#252526",
		surfaceHover: "rgba(255, 255, 255, 0.08)",
		surfaceActive: "rgba(255, 255, 255, 0.12)",
		border: "#2b2b2b",
		borderSubtle: "#3c3c3c",
		foreground: "#cccccc",
		foregroundMuted: "#8b8b8b",
		disabledForeground: "rgba(204, 204, 204, 0.4)",
		iconForeground: "#c5c5c5",
		accent: "#007acc",
		inputBg: "#1e1e1e",
		inputFg: "#cccccc",
		inputBorder: "#3c3c3c",
		inputPlaceholder: "#989898",
		errorFg: "#f48771",
		shadow: "0 2px 8px rgba(0, 0, 0, 0.36)",
		sliderTrack: "#6e6e6e",
		transparentChecker: TRANSPARENT_CHECKER,
		radius: "4px",
		...HANDLE_COLORS,
		scrollbarTrack: "transparent",
		scrollbarThumb: "#d1d5db",
		scrollbarThumbHover: "#9ca3af",
		objectInk: "#ffffff",
		objectSurface: "#252526",
	},
	handleDimensions: HANDLE_DIMENSIONS,
	fontFamily: DEFAULT_FONT_FAMILY,
};

/**
 * Selection/transform handles tinted with the brand teal (icon gradient
 * `#0f9e8f → #075e56`). Connection anchors stay indigo so they read as a
 * distinct role from the teal selection handles.
 */
const BRAND_HANDLE_COLORS = {
	handleAccent: "#0f9e8f",
	handleFill: "#ffffff",
	connectionAccent: "#6366f1",
} as const;

/** Standard light theme. */
export const lightCanvasTheme: CanvasTheme = {
	tokens: {
		canvasBg: "#ffffff",
		surface: "#f3f3f3",
		surfaceHover: "rgba(0, 0, 0, 0.06)",
		surfaceActive: "rgba(0, 0, 0, 0.1)",
		border: "#c8c8c8",
		borderSubtle: "#d4d4d4",
		foreground: "#3b3b3b",
		foregroundMuted: "#6e6e6e",
		disabledForeground: "rgba(59, 59, 59, 0.4)",
		iconForeground: "#424242",
		accent: "#005fb8",
		inputBg: "#ffffff",
		inputFg: "#3b3b3b",
		inputBorder: "#c8c8c8",
		inputPlaceholder: "#767676",
		errorFg: "#a1260d",
		shadow: "0 2px 8px rgba(0, 0, 0, 0.16)",
		sliderTrack: "#b0b0b0",
		transparentChecker: TRANSPARENT_CHECKER,
		radius: "4px",
		...HANDLE_COLORS,
		scrollbarTrack: "transparent",
		scrollbarThumb: "#c6c6c6",
		scrollbarThumbHover: "#a8a8a8",
		objectInk: "#000000",
		objectSurface: "#f3f3f3",
	},
	handleDimensions: HANDLE_DIMENSIONS,
	fontFamily: DEFAULT_FONT_FAMILY,
};

/**
 * Brand light theme. A near-white canvas that keeps the brand teal
 * (`#0f9e8f → #075e56`, mint line `#ecfffb`) confined to accents — selection
 * handles, focus accent, dark-teal text — rather than the background. Error
 * stays warm-red for semantics; the checker follows the injected foreground.
 */
export const brandLightCanvasTheme: CanvasTheme = {
	tokens: {
		canvasBg: "#ffffff",
		surface: "#f4f9f8",
		surfaceHover: "rgba(15, 158, 143, 0.07)",
		surfaceActive: "rgba(15, 158, 143, 0.12)",
		border: "#c9e0db",
		borderSubtle: "#dcece8",
		foreground: "#0b3f39",
		foregroundMuted: "#4d726c",
		disabledForeground: "rgba(11, 63, 57, 0.4)",
		iconForeground: "#0e544c",
		accent: "#0f9e8f",
		inputBg: "#ffffff",
		inputFg: "#0b3f39",
		inputBorder: "#c9e0db",
		inputPlaceholder: "#6f918b",
		errorFg: "#a1260d",
		shadow: "0 2px 8px rgba(7, 94, 86, 0.14)",
		sliderTrack: "#b4d3cd",
		transparentChecker: TRANSPARENT_CHECKER,
		radius: "4px",
		...BRAND_HANDLE_COLORS,
		scrollbarTrack: "transparent",
		scrollbarThumb: "#c3ddd7",
		scrollbarThumbHover: "#a3ccc3",
		objectInk: "#000000",
		objectSurface: "#f4f9f8",
	},
	handleDimensions: HANDLE_DIMENSIONS,
	fontFamily: DEFAULT_FONT_FAMILY,
};
