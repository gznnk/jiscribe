/**
 * VSCode テーマ追従用のスタイルトークン。
 *
 * VSCode の Webview では `--vscode-*` CSS 変数がテーマ（Dark / Light / High Contrast）
 * に応じて自動注入される。各トークンはその変数を参照しつつ、変数が存在しない環境
 * （単体デモ・Storybook 等）向けにダーク基調のフォールバック値を持つ。
 *
 * これにより、VSCode 上では利用者のテーマに自動で馴染み、デモ環境では
 * モックで確認したダークテーマと同じ見た目になる。
 *
 * 注意: ここで扱うのは UI クローム（メニュー・ツールバー・選択枠など）の配色のみ。
 * 図形そのものの色（fill/stroke/fontColor）はドキュメントに保存されるデータであり、
 * テーマトークンの対象外。
 */
export const theme = {
	/** キャンバスの地色（エディタ背景） */
	canvasBg: "var(--vscode-editor-background, #1e1e1e)",
	/** メニュー・ツールバーなど浮動 UI の面 */
	surface: "var(--vscode-editorWidget-background, #252526)",
	/** ボタン等のホバー面 */
	surfaceHover:
		"var(--vscode-toolbar-hoverBackground, rgba(255, 255, 255, 0.08))",
	/** ボタン等のアクティブ面 */
	surfaceActive:
		"var(--vscode-toolbar-activeBackground, rgba(255, 255, 255, 0.12))",
	/** 浮動 UI の外枠線 */
	border: "var(--vscode-editorWidget-border, #2b2b2b)",
	/** 区切り線など控えめな線 */
	borderSubtle: "var(--vscode-panel-border, #3c3c3c)",
	/** 主要テキスト・アイコン色 */
	foreground: "var(--vscode-foreground, #cccccc)",
	/** 補助テキスト色 */
	foregroundMuted: "var(--vscode-descriptionForeground, #8b8b8b)",
	/** 非活性テキスト色（前景色を大きく減光し、無効状態を明確にする） */
	disabledForeground:
		"var(--vscode-disabledForeground, rgba(204, 204, 204, 0.4))",
	/** アイコン色 */
	iconForeground: "var(--vscode-icon-foreground, #c5c5c5)",
	/** アクセント（選択・フォーカス） */
	accent: "var(--vscode-focusBorder, #007acc)",
	/** 入力欄の背景 */
	inputBg: "var(--vscode-input-background, #1e1e1e)",
	/** 入力欄の文字色 */
	inputFg: "var(--vscode-input-foreground, #cccccc)",
	/** 入力欄の枠線 */
	inputBorder: "var(--vscode-input-border, #3c3c3c)",
	/** 入力欄のプレースホルダ色 */
	inputPlaceholder: "var(--vscode-input-placeholderForeground, #989898)",
	/** エラー文字色 */
	errorFg: "var(--vscode-errorForeground, #f48771)",
	/** 浮動 UI のドロップシャドウ */
	shadow: "0 2px 8px var(--vscode-widget-shadow, rgba(0, 0, 0, 0.36))",
	/** グリッド線の色 */
	gridLine: "var(--vscode-editorIndentGuide-background, #2a2a2a)",
	/** スライダー等のトラック色（面に対して視認できる中間グレー） */
	sliderTrack: "var(--vscode-scrollbarSlider-background, #6e6e6e)",
	/**
	 * 透明（none）を示す市松模様の濃い側の色。
	 * 前景色を薄く重ねることで、ダーク（明色の市松）/ ライト（暗色の市松）に自動追従する。
	 * もう一方のマスは透明（面が透ける）にして 2 トーンの市松にする。
	 */
	transparentChecker:
		"color-mix(in srgb, var(--vscode-foreground, #888) 22%, transparent)",
	/** フローティング UI（メニュー・ボタン等）の角丸。VSCode のウィジェットに合わせ控えめに。 */
	radius: "4px",
} as const;
