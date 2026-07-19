import { containerDefinition } from "@workspace/plugin-container-shapes";
import { containerParserExtension } from "@workspace/plugin-container-shapes/parser";
import React, { useCallback, useState } from "react";
import ReactDOM from "react-dom/client";
import "katex/dist/katex.min.css";

import { MultiCanvasApp } from "./MultiCanvasApp";
import type { CanvasConfig, CanvasDoc } from "../../src";
import {
	Canvas,
	applyObjectDefinition,
	createCanvasParser,
	darkCanvasTheme,
	extractCanvasSourceFromPng,
} from "../../src";
import "./harness.css";

// container 図形は core から削除され、@workspace/plugin-container-shapes が唯一の
// 供給元 (docs/05_extensibility/uc1-container-extraction-log.md)。e2e 専用の
// dev 限定循環依存として devDependencies に登録し、container.spec.ts を存続させる。
const initialConfig: CanvasConfig = {
	customize: (registries) =>
		applyObjectDefinition(registries, "container", containerDefinition),
};

const harnessParser = createCanvasParser({
	extensions: [containerParserExtension],
});

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
				canvasDoc={loadedDoc}
				theme={darkCanvasTheme}
				initialConfig={initialConfig}
			/>
		</div>
	);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<HarnessApp />
	</React.StrictMode>,
);
