import {
	Canvas,
	brandLightCanvasTheme,
	darkCanvasTheme,
	lightCanvasTheme,
} from "@jiscribe/canvas";
import type { CanvasDoc, CanvasTheme } from "@jiscribe/canvas";
import { useEffect, useState } from "react";

// The themes that can be cycled through. Adding a theme here is enough for the toggle
// button to advance to it. colorScheme is treated as "dark" only for the dark themes, and
// the page margin colour follows each theme's canvasBg.
const THEMES: ReadonlyArray<{
	label: string;
	colorScheme: "dark" | "light";
	theme: CanvasTheme;
}> = [
	{ label: "Dark", colorScheme: "dark", theme: darkCanvasTheme },
	{ label: "Light", colorScheme: "light", theme: lightCanvasTheme },
	{ label: "Brand Light", colorScheme: "light", theme: brandLightCanvasTheme },
];

const emptyDoc: CanvasDoc = { version: 1, root: [] };

/**
 * Theming example: pass a preset (or your own CanvasTheme) to the theme prop.
 * The colours for the host's own UI can be read from theme.tokens.
 */
export function ThemingExample() {
	const [themeIndex, setThemeIndex] = useState(0);
	const current = THEMES[themeIndex];
	const next = THEMES[(themeIndex + 1) % THEMES.length];

	// Make the page itself (the margin outside the canvas) follow the theme too, and restore it on leaving the example
	useEffect(() => {
		document.documentElement.style.colorScheme = current.colorScheme;
		document.body.style.backgroundColor = current.theme.tokens.canvasBg;
		return () => {
			document.documentElement.style.colorScheme = "";
			document.body.style.backgroundColor = "";
		};
	}, [current]);

	return (
		<div style={{ position: "relative", width: "100%", height: "100%" }}>
			<Canvas doc={emptyDoc} theme={current.theme} />
			<button
				type="button"
				onClick={() => setThemeIndex((index) => (index + 1) % THEMES.length)}
				title={`Switch to ${next.label} theme`}
				style={{
					position: "absolute",
					right: 12,
					bottom: 12,
					zIndex: 1000,
					padding: "4px 10px",
					borderRadius: 4,
					border: `1px solid ${current.theme.tokens.border}`,
					background: current.theme.tokens.surface,
					color: current.theme.tokens.foreground,
					cursor: "pointer",
				}}
			>
				{next.label}
			</button>
		</div>
	);
}
