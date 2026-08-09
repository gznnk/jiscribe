import {
	Canvas,
	brandLightCanvasTheme,
	darkCanvasTheme,
	lightCanvasTheme,
} from "@jiscribe/canvas";
import type { CanvasDoc, CanvasTheme } from "@jiscribe/canvas";
import { useEffect, useState } from "react";

// 巡回できるテーマ一覧。テーマを増やしたらここに追加すればトグルボタンが
// 自動で次のテーマへ切り替わる。colorScheme は暗いテーマだけ "dark" 扱いにし、
// ページ余白色は各テーマの canvasBg に追従させる。
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
 * テーマ切り替えの例: theme prop にプリセット（または自作の CanvasTheme）を渡す。
 * ホスト側 UI の配色は theme.tokens から取れる。
 */
export function ThemingExample() {
	const [themeIndex, setThemeIndex] = useState(0);
	const current = THEMES[themeIndex];
	const next = THEMES[(themeIndex + 1) % THEMES.length];

	// ページ側（キャンバス外の余白）もテーマに追従させる。例を離れたら元に戻す
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
