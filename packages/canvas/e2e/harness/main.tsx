import {
	containerPlugin,
	containerToolbarEntry,
} from "@workspace/plugin-container-shapes";
import React, { useCallback, useState } from "react";
import ReactDOM from "react-dom/client";
import "katex/dist/katex.min.css";

import { MultiCanvasApp } from "./MultiCanvasApp";
import type { CanvasConfig, CanvasDoc, ToolbarEntry } from "../../src";
import {
	Canvas,
	annotationToolbarEntry,
	createCanvasParser,
	darkCanvasTheme,
	extractCanvasSourceFromPng,
	flowchartToolbarEntry,
	generalToolbarEntry,
} from "../../src";
import "./harness.css";

// container 図形は core から削除され、@workspace/plugin-container-shapes が唯一の
// 供給元 (docs/05_extensibility/canvas-plugin-design.md)。e2e 専用の dev 限定
// 循環依存として devDependencies に登録し、container.spec.ts を存続させる。
const plugins = [containerPlugin];

const initialConfig: CanvasConfig = { plugins };

// container カテゴリは core の既定 layout に含まれない（プラグイン供給）。
// container.spec.ts は container フライアウトボタンに依存するため、従来どおり
// flowchart 直後に container スロットを差し込んだ layout をハーネスから渡す。
const toolbarLayout: ToolbarEntry[] = [
	{ kind: "preset", presetId: "rect" },
	{ kind: "preset", presetId: "ellipse" },
	{ kind: "preset", presetId: "polyline" },
	{ kind: "preset", presetId: "polygon" },
	{ kind: "preset", presetId: "sticky" },
	{ kind: "preset", presetId: "rect-markdown" },
	flowchartToolbarEntry,
	containerToolbarEntry,
	generalToolbarEntry,
	annotationToolbarEntry,
];

const harnessParser = createCanvasParser({ plugins });

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
		const result = harnessParser.parse(sourceText);
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
			<Canvas
				doc={loadedDoc}
				theme={darkCanvasTheme}
				initialConfig={initialConfig}
				toolbar={{ layout: toolbarLayout }}
			/>
		</div>
	);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<HarnessApp />
	</React.StrictMode>,
);
