import React, { useCallback, useState } from "react";
import ReactDOM from "react-dom/client";
import "katex/dist/katex.min.css";

import { MultiCanvasApp } from "./MultiCanvasApp";
import type { CanvasDoc } from "../../src";
import {
	Canvas,
	darkCanvasTheme,
	extractCanvasSourceFromPng,
	parseCanvasText,
} from "../../src";
import "./harness.css";

// spec は demo アプリの既定だった dark テーマ前提で書かれているため、
// ハーネスも dark で固定する（余白色もキャンバスに追従させる）。
document.documentElement.style.colorScheme = "dark";
document.body.style.backgroundColor = darkCanvasTheme.tokens.canvasBg;

const emptyDoc: CanvasDoc = { version: 1, root: [] };

/**
 * 単一 Canvas を空ドキュメントでマウントする既定ページ。?multi で 2 キャンバス構成に切り替わる。
 * jiscribe エクスポート PNG（iTXt に .jis.json 入り）のドロップ復元は spec
 * （scenario/image-export-roundtrip）が依存する契約なのでハーネスでも提供する。
 */
function HarnessApp() {
	const [loadedDoc, setLoadedDoc] = useState<CanvasDoc>(emptyDoc);

	const handleDrop = useCallback(async (e: React.DragEvent) => {
		e.preventDefault();
		const file = e.dataTransfer.files[0];
		if (!file || file.type !== "image/png") {
			return;
		}
		const sourceText = await extractCanvasSourceFromPng(file);
		if (sourceText === null) {
			console.warn("Dropped PNG has no embedded jiscribe source");
			return;
		}
		const result = parseCanvasText(sourceText);
		if (result.kind !== "ok") {
			console.warn("Embedded jiscribe source is invalid", result);
			return;
		}
		setLoadedDoc(result.doc);
	}, []);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
	}, []);

	if (new URLSearchParams(window.location.search).has("multi")) {
		return <MultiCanvasApp />;
	}
	return (
		<div className="app" onDrop={handleDrop} onDragOver={handleDragOver}>
			<Canvas canvasDoc={loadedDoc} theme={darkCanvasTheme} />
		</div>
	);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<HarnessApp />
	</React.StrictMode>,
);
