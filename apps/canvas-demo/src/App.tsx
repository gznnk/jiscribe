import {
	Canvas,
	darkCanvasTheme,
	lightCanvasTheme,
	parseCanvasText,
} from "@workspace/canvas";
import type { CanvasDoc } from "@workspace/canvas";
import { useEffect, useState } from "react";
import "./App.css";

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
	const [themeName, setThemeName] = useState<"dark" | "light">("dark");

	useEffect(() => {
		document.title = `Canvas Demo [${__GIT_BRANCH__}]`;
	}, []);

	// ページ背景（キャンバス外の余白）もテーマに追従させる
	useEffect(() => {
		document.documentElement.style.colorScheme = themeName;
		document.body.style.backgroundColor =
			themeName === "dark" ? "#242424" : "#ffffff";
	}, [themeName]);

	if (new URLSearchParams(window.location.search).has("multi")) {
		return <MultiCanvasApp />;
	}

	return (
		<div className="app">
			<Canvas
				canvasDoc={initialDoc}
				theme={themeName === "dark" ? darkCanvasTheme : lightCanvasTheme}
			/>
			<button
				type="button"
				data-testid="theme-toggle"
				onClick={() =>
					setThemeName((current) => (current === "dark" ? "light" : "dark"))
				}
				title="Toggle theme"
				style={{
					position: "fixed",
					right: 12,
					bottom: 12,
					zIndex: 1000,
					padding: "4px 10px",
					borderRadius: 4,
					border: "1px solid #888",
					background: themeName === "dark" ? "#252526" : "#f3f3f3",
					color: themeName === "dark" ? "#cccccc" : "#3b3b3b",
					cursor: "pointer",
				}}
			>
				{themeName === "dark" ? "Light" : "Dark"}
			</button>
		</div>
	);
}
