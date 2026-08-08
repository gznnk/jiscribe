import {
	Canvas,
	extractCanvasSourceFromPng,
	parseCanvasText,
} from "@workspace/canvas";
import type { CanvasDoc } from "@workspace/canvas";
import { useCallback, useRef, useState } from "react";
import "./file-io.css";

const initialDoc: CanvasDoc = { version: 1, root: [] };

const DEFAULT_FILE_NAME = "untitled.jis.json";

/** parseCanvasText の失敗結果をアラート用の文字列にまとめる */
const formatParseError = (
	result: Exclude<ReturnType<typeof parseCanvasText>, { kind: "ok" }>,
): string => {
	switch (result.kind) {
		case "syntax-error":
		case "internal-error":
			return result.message;
		case "structure-error":
		case "semantic-error":
			return result.diagnostics
				.map((diagnostic) => `${diagnostic.path}: ${diagnostic.message}`)
				.join("\n");
	}
};

/** toolbar.leading スロットに挿すファイル操作ボタン。 */
function FileToolbarButtons({
	onOpen,
	onSave,
}: {
	onOpen: () => void;
	onSave: () => void;
}) {
	return (
		<div className="file-toolbar-buttons">
			<button
				type="button"
				className="file-toolbar-button"
				title="Open file"
				aria-label="Open file"
				onClick={onOpen}
			>
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
				</svg>
			</button>
			<button
				type="button"
				className="file-toolbar-button"
				title="Save file"
				aria-label="Save file"
				onClick={onSave}
			>
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
					<path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
					<path d="M7 3v4a1 1 0 0 0 1 1h7" />
				</svg>
			</button>
		</div>
	);
}

/**
 * ファイル入出力の例:
 * - .jis.json の読み込み（toolbar.leading の Open ボタン → parseCanvasText で 2 段階バリデーション）
 * - 編集中ドキュメントの保存（onCommit で最新 doc を ref に写し、Save でダウンロード）
 * - jiscribe エクスポート PNG（iTXt に .jis.json 入り）のドロップ復元（round-trip 確認用）
 */
export function FileIoExample() {
	// doc はファイル読み込み時だけ差し替える。編集中の最新 doc は
	// onCommit で ref に写し、保存時に読む。
	const [loadedDoc, setLoadedDoc] = useState<CanvasDoc>(initialDoc);
	const [fileName, setFileName] = useState(DEFAULT_FILE_NAME);
	const latestDocRef = useRef<CanvasDoc>(initialDoc);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleCommit = useCallback((committedDoc: CanvasDoc) => {
		latestDocRef.current = committedDoc;
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
		const result = parseCanvasText(sourceText);
		if (result.kind !== "ok") {
			console.warn("Embedded jiscribe source is invalid", result);
			return;
		}
		latestDocRef.current = result.doc;
		setLoadedDoc(result.doc);
		setFileName(file.name.replace(/\.png$/i, ".json"));
	}, []);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
	}, []);

	const handleOpenClick = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	const handleFileChange = useCallback(
		async (event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			// 同じファイルをもう一度選んでも change が発火するようリセットする
			event.target.value = "";
			if (!file) {
				return;
			}
			const text = await file.text();
			const result = parseCanvasText(text);
			if (result.kind !== "ok") {
				window.alert(
					`Failed to load ${file.name}:\n${formatParseError(result)}`,
				);
				return;
			}
			latestDocRef.current = result.doc;
			setLoadedDoc(result.doc);
			setFileName(file.name);
		},
		[],
	);

	const handleSave = useCallback(() => {
		const json = JSON.stringify(latestDocRef.current, null, 2);
		const blob = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = fileName;
		anchor.click();
		URL.revokeObjectURL(url);
	}, [fileName]);

	return (
		<div
			style={{ width: "100%", height: "100%" }}
			onDrop={handleDrop}
			onDragOver={handleDragOver}
		>
			<Canvas
				doc={loadedDoc}
				onCommit={handleCommit}
				toolbar={{
					leading: (
						<FileToolbarButtons onOpen={handleOpenClick} onSave={handleSave} />
					),
				}}
			/>
			<input
				ref={fileInputRef}
				type="file"
				accept=".json,application/json"
				style={{ display: "none" }}
				onChange={handleFileChange}
			/>
		</div>
	);
}
