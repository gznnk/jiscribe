import type { CanvasColorScheme } from "@jiscribe/canvas";
import { useEffect, useState } from "react";

import { readVscodeThemeKind, toCanvasColorScheme } from "./vscodeCanvasTheme";

/**
 * The ground the editor theme currently draws on, kept in step with theme
 * switches. VSCode rewrites the body's `data-vscode-theme-kind` when the user
 * changes theme, without reloading the webview, so the value is observed rather
 * than read once.
 *
 * @returns `"light"` or `"dark"`, following `toCanvasColorScheme`
 */
export const useVscodeColorScheme = (): CanvasColorScheme => {
	const [colorScheme, setColorScheme] = useState<CanvasColorScheme>(() =>
		toCanvasColorScheme(readVscodeThemeKind(document.body)),
	);

	useEffect(() => {
		const observer = new MutationObserver(() => {
			setColorScheme(toCanvasColorScheme(readVscodeThemeKind(document.body)));
		});
		observer.observe(document.body, {
			attributes: true,
			attributeFilter: ["data-vscode-theme-kind"],
		});
		return () => observer.disconnect();
	}, []);

	return colorScheme;
};
