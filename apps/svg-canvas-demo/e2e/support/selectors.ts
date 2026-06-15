/**
 * svg-canvas-2 の DOM 契約（data-kind / data-id）に基づくセレクタ定数。
 * 詳細は e2e/README.md の「DOM の構造とセレクタ」を参照。
 */

/** 左ツールバーのツール名（button の title 属性） */
export type ToolTitle =
	| "Rectangle"
	| "Ellipse"
	| "Polyline"
	| "Polygon"
	| "Sticky"
	| "Markdown";

/** コネクター接続アンカーの辺ID */
export type AnchorId =
	| "topCenter"
	| "bottomCenter"
	| "leftCenter"
	| "rightCenter";

/** ObjectMenu のカラーピッカーを開くセクションID */
export type ColorSectionId =
	| "bg-color"
	| "stroke-color"
	| "line-color"
	| "font-color";

export const selectors = {
	/** ツールバーのツールボタン */
	toolButton: (tool: ToolTitle) => `button[title="${tool}"]`,

	/** キャンバス上の図形（rect / ellipse / polyline …） */
	object: "[data-kind=object]",

	/** コネクター（本体の polyline。矢印の polygon も同じ data-kind を持つ） */
	connectorPolyline: "polyline[data-kind=connector]",

	/** 選択時のハンドル類すべて */
	control: "[data-kind=control]",

	/** リサイズ・回転ハンドル */
	transformControl: (
		handle:
			| "topLeft"
			| "topCenter"
			| "topRight"
			| "leftCenter"
			| "rightCenter"
			| "bottomLeft"
			| "bottomCenter"
			| "bottomRight"
			| "rotation",
	) => `[data-id="transform-control:${handle}"]`,

	/** コネクター作成アンカー（辺の中点から 20px 外側に表示される） */
	createAnchor: (anchorId: AnchorId) =>
		`[data-id^="connection-anchor:create"][data-id$=":${anchorId}"]`,

	/** ObjectMenu のドロップダウンを開くトグルボタン */
	objectMenuToggle: (sectionId: string) =>
		`[data-id="object-menu:toggle:${sectionId}"]`,

	/** ObjectMenu の即時設定ボタン（プリセット色・線種など） */
	objectMenuSet: (property: string, value: string) =>
		`[data-id="object-menu:set:${property}:${value}"]`,

	/** ObjectMenu のコマンドボタン（重なり順の bringToFront など） */
	objectMenuCommand: (commandId: string) =>
		`[data-id="object-menu:command:${commandId}"]`,

	/** ObjectMenu のスライダー（range input、ドラッグで値を変える） */
	objectMenuSlider: (property: string) =>
		`[data-id="object-menu:slider:${property}"]`,

	/** カラーピッカーの CSS カラーテキスト入力欄（Enter で確定） */
	cssColorInput: 'input[placeholder="CSS color"]',

	/** テキスト編集中の TEXTAREA */
	textEditor: "[data-kind=text-editor]",

	/** コンテキストメニューの項目すべて（command / callback）。出現判定に使う */
	contextMenuAny: '[data-kind^="context-menu"]',

	/** コンテキストメニューの command 項目（最前面へ・複製など） */
	contextMenuCommand: (commandId: string) =>
		`[data-id="context-menu:${commandId}"]`,

	/** コンテキストメニューの callback 項目（paste など） */
	contextMenuCallback: (id: string) =>
		`[data-kind="context-menu-callback"][data-id="${id}"]`,
} as const;
