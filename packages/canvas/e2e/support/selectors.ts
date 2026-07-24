/**
 * canvas の DOM 契約（data-kind / data-id / data-part、テスト専用フックは data-testid）に基づくセレクタ定数。
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
	| "header-color"
	| "stroke-color"
	| "line-color"
	| "font-color";

export const selectors = {
	/** ツールバーのツールボタン */
	toolButton: (tool: ToolTitle) => `button[title="${tool}"]`,

	/** StencilLibrary のカテゴリボタン（フライアウトを開くトグル） */
	categoryButton: (categoryId: string) =>
		`[data-id="stencil-category"][data-part="toggle:${categoryId}"]`,

	/** カテゴリフライアウト（開いているときだけ存在） */
	categoryFlyout: (categoryId: string) =>
		`[data-category-flyout="${categoryId}"]`,

	/** StencilLibrary の図形項目（ピン留め・フライアウト内で共通の DOM 契約） */
	shapeItem: (presetId: string) => `[data-part="item:${presetId}"]`,

	/** キャンバス上の図形（rect / ellipse / polyline …） */
	object: "[data-kind=object]",

	/**
	 * ドラッグ描画中のプレビュー（ゴースト）。図形本体コンポーネントを流用するため
	 * data-kind=object を持つが、コミット済み図形ではない。オブジェクト列挙時に
	 * この配下を除外して一時要素を数えないようにする。
	 */
	drawingPreview: '[data-testid="drawing-preview"]',

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
	) =>
		handle === "rotation"
			? `[data-id="transform"][data-part="rotation"]`
			: `[data-id="transform"][data-part="resize:${handle}"]`,

	/** コネクター作成アンカー（辺の中点から 20px 外側に表示される） */
	createAnchor: (anchorId: AnchorId) => `[data-part="anchor:${anchorId}"]`,

	/** ObjectMenu のドロップダウンを開くトグルボタン */
	objectMenuToggle: (sectionId: string) => `[data-part="toggle:${sectionId}"]`,

	/** ObjectMenu の即時設定ボタン（プリセット色・線種など） */
	objectMenuSet: (property: string, value: string) =>
		`[data-part="set:${property}:${value}"]`,

	/** ObjectMenu のコマンドボタン（重なり順の bringToFront など） */
	objectMenuCommand: (commandId: string) =>
		`[data-part="command:${commandId}"][data-id="object-menu"]`,

	/** ObjectMenu のスライダー（range input、ドラッグで値を変える） */
	objectMenuSlider: (property: string) => `[data-part="slider:${property}"]`,

	/** カラーピッカーの CSS カラーテキスト入力欄（Enter で確定） */
	cssColorInput: 'input[placeholder="CSS color"]',

	/** テキスト編集中の TEXTAREA */
	textEditor: '[data-testid="text-editor"]',

	/** コンテキストメニューの項目すべて（command / callback）。出現判定に使う */
	contextMenuAny:
		'[data-id="context-menu"], [data-testid^="context-menu-callback:"]',

	/** コンテキストメニューの command 項目（最前面へ・複製など） */
	contextMenuCommand: (commandId: string) =>
		`[data-id="context-menu"][data-part="command:${commandId}"]`,

	/** コンテキストメニューの callback 項目（paste など） */
	contextMenuCallback: (id: string) =>
		`[data-testid="context-menu-callback:${id}"]`,
} as const;
