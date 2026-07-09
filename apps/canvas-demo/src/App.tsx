import {
	Canvas,
	brandLightCanvasTheme,
	darkCanvasTheme,
	lightCanvasTheme,
	parseCanvasText,
} from "@workspace/canvas";
import type { CanvasDoc, CanvasTheme } from "@workspace/canvas";
import { useEffect, useState } from "react";
import "./App.css";

// デモで巡回できるテーマ一覧。テーマを増やしたらここに追加すれば
// トグルボタンが自動で次のテーマへ切り替わる。colorScheme は暗いテーマだけ
// "dark" 扱いにし、ページ余白色は各テーマの canvasBg に追従させる。
const DEMO_THEMES: ReadonlyArray<{
	label: string;
	colorScheme: "dark" | "light";
	theme: CanvasTheme;
}> = [
	{ label: "Dark", colorScheme: "dark", theme: darkCanvasTheme },
	{ label: "Light", colorScheme: "light", theme: lightCanvasTheme },
	{ label: "Brand Light", colorScheme: "light", theme: brandLightCanvasTheme },
];

const initialDoc: CanvasDoc = {
	version: 1,
	root: [],
};

// ?multi 用の 2 キャンバス構成。キーボードスコープ（フォーカスされた Canvas だけが
// ショートカットを処理する）の e2e 検証に使う。図形 ID はページ内で一意にして
// セレクタの衝突を避ける。Canvas の契約どおり parseCanvasText を通した doc を渡す。
const parseMultiDoc = (rectId: string): CanvasDoc => {
	const result = parseCanvasText(
		JSON.stringify({
			version: 1,
			root: [
				{ id: rectId, type: "rect", x: 100, y: 100, width: 120, height: 80 },
			],
		}),
	);
	if (result.kind !== "ok") {
		throw new Error(`invalid multi-canvas doc: ${result.kind}`);
	}
	return result.doc;
};

const multiDocA = parseMultiDoc("rect-a");
const multiDocB = parseMultiDoc("rect-b");

/** 複数 Canvas 埋め込みの検証ページ。ホストがフォーカスを管理する想定で autoFocus は切る。 */
function MultiCanvasApp() {
	return (
		<div className="app" style={{ display: "flex" }}>
			<div data-testid="canvas-a" style={{ flex: 1, minWidth: 0 }}>
				<Canvas canvasDoc={multiDocA} autoFocus={false} />
			</div>
			<div data-testid="canvas-b" style={{ flex: 1, minWidth: 0 }}>
				<Canvas canvasDoc={multiDocB} autoFocus={false} />
			</div>
		</div>
	);
}

export function App() {
	const [themeIndex, setThemeIndex] = useState(0);
	const current = DEMO_THEMES[themeIndex];
	const next = DEMO_THEMES[(themeIndex + 1) % DEMO_THEMES.length];

	useEffect(() => {
		document.title = `Canvas Demo [${__GIT_BRANCH__}]`;
	}, []);

	// ページ背景（キャンバス外の余白）もテーマに追従させる
	useEffect(() => {
		document.documentElement.style.colorScheme = current.colorScheme;
		document.body.style.backgroundColor = current.theme.tokens.canvasBg;
	}, [current]);

	if (new URLSearchParams(window.location.search).has("multi")) {
		return <MultiCanvasApp />;
	}

	return (
		<div className="app">
			<Canvas canvasDoc={initialDoc} theme={current.theme} />
			<button
				type="button"
				data-testid="theme-toggle"
				onClick={() =>
					setThemeIndex((index) => (index + 1) % DEMO_THEMES.length)
				}
				title={`Switch to ${next.label} theme`}
				style={{
					position: "fixed",
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
