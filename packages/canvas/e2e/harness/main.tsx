import {
	containerPlugin,
	containerToolbarEntry,
} from "@workspace/plugin-container-shapes";
import {
	flowchartPlugin,
	flowchartToolbarEntry,
} from "@workspace/plugin-flowchart-shapes";
import { markdownPlugin } from "@workspace/plugin-markdown-shape";
import { umlPlugin, umlToolbarEntry } from "@workspace/plugin-uml-shapes";
import React, { useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "katex/dist/katex.min.css";

import { MultiCanvasApp } from "./MultiCanvasApp";
import type { CanvasConfig, CanvasDoc, ToolbarEntry } from "../../src";
import {
	Canvas,
	annotationToolbarEntry,
	darkCanvasTheme,
	extractCanvasSourceFromPng,
	generalToolbarEntry,
} from "../../src";
import { createCanvasParser } from "../../src/doc";
import "./harness.css";

// flowchart / container / markdown 図形は core から削除され、それぞれ
// @workspace/plugin-flowchart-shapes / @workspace/plugin-container-shapes /
// @workspace/plugin-markdown-shape が唯一の供給元
// (docs/05_extensibility/plugin-architecture-requirements.md)。e2e 専用の dev 限定
// 循環依存として devDependencies に登録し、関連 spec を存続させる。
const plugins = [flowchartPlugin, containerPlugin, markdownPlugin, umlPlugin];

const initialConfig: CanvasConfig = { plugins };

// flowchart / container カテゴリと markdown プリセットは core の既定 layout に
// 含まれない（プラグイン供給）。spec は両フライアウトボタンと Markdown プリセットに
// 依存するため、従来どおりの並びの layout をハーネスから渡す。
const toolbarLayout: ToolbarEntry[] = [
	{ kind: "preset", presetId: "rect" },
	{ kind: "preset", presetId: "ellipse" },
	{ kind: "preset", presetId: "polyline" },
	{ kind: "preset", presetId: "polygon" },
	{ kind: "preset", presetId: "sticky" },
	{ kind: "preset", presetId: "markdown" },
	flowchartToolbarEntry,
	containerToolbarEntry,
	umlToolbarEntry,
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

	// 外部同期（親からの doc 差し替え → SYNC_EXTERNAL）を spec から起こす操作口。
	// scenario/external-sync-cancels-drag.spec が依存する。
	useEffect(() => {
		(
			window as unknown as {
				__setHarnessDoc?: (docText: string) => void;
			}
		).__setHarnessDoc = (docText: string) => {
			const result = harnessParser.parse(docText);
			if (result.kind !== "ok") {
				throw new Error(`invalid harness doc: ${result.kind}`);
			}
			setLoadedDoc(result.doc);
		};
	}, []);

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
