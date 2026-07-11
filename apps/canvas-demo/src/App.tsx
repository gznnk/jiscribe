import {
	Canvas,
	brandLightCanvasTheme,
	darkCanvasTheme,
	extractCanvasSourceFromPng,
	lightCanvasTheme,
	parseCanvasText,
} from "@workspace/canvas";
import type { CanvasDoc, CanvasTheme } from "@workspace/canvas";
import { useCallback, useEffect, useRef, useState } from "react";
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

const DEFAULT_FILE_NAME = "untitled.jis.json";

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

/**
 * toolbarLeading スロットに挿すファイル操作ボタン。
 * 配色はホスト側テーマから --demo-* 変数で与える（--jiscribe-* は非公開契約）。
 */
function FileToolbarButtons({
	tokens,
	onOpen,
	onSave,
}: {
	tokens: CanvasTheme["tokens"];
	onOpen: () => void;
	onSave: () => void;
}) {
	return (
		<div
			className="file-toolbar-buttons"
			style={
				{
					"--demo-radius": tokens.radius,
					"--demo-icon-foreground": tokens.iconForeground,
					"--demo-surface-hover": tokens.surfaceHover,
					"--demo-surface-active": tokens.surfaceActive,
				} as React.CSSProperties
			}
		>
			<button
				type="button"
				className="file-toolbar-button"
				data-testid="file-open"
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
				data-testid="file-save"
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

export function App() {
	const [themeIndex, setThemeIndex] = useState(0);
	const current = DEMO_THEMES[themeIndex];
	const next = DEMO_THEMES[(themeIndex + 1) % DEMO_THEMES.length];

	// canvasDoc はファイル読み込み時だけ差し替える。編集中の最新 doc は
	// onCommit で ref に写し、保存時に読む。
	const [loadedDoc, setLoadedDoc] = useState<CanvasDoc>(initialDoc);
	const [fileName, setFileName] = useState(DEFAULT_FILE_NAME);
	const latestDocRef = useRef<CanvasDoc>(initialDoc);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleCommit = useCallback((committedDoc: CanvasDoc) => {
		latestDocRef.current = committedDoc;
	}, []);

	// jiscribe がエクスポートした PNG（iTXt に .jis.json 入り）のドロップで
	// キャンバスを差し替える（round-trip の確認用）。外部入力なので
	// parseCanvasText の 2 段階バリデーションを通してから渡す。
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
		<div className="app" onDrop={handleDrop} onDragOver={handleDragOver}>
			<Canvas
				canvasDoc={loadedDoc}
				onCommit={handleCommit}
				theme={current.theme}
				toolbarLeading={
					<FileToolbarButtons
						tokens={current.theme.tokens}
						onOpen={handleOpenClick}
						onSave={handleSave}
					/>
				}
			/>
			<input
				ref={fileInputRef}
				type="file"
				accept=".json,application/json"
				style={{ display: "none" }}
				data-testid="file-input"
				onChange={handleFileChange}
			/>
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
