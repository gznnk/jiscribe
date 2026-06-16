# 開発ガイドライン（svg-canvas-2）

実装を進める中で見つかった「知らないと踏みやすい」規約・判断基準を蓄積するドキュメント。
アーキテクチャ全体像は [architecture.md](./architecture.md)、コマンドは [commands.md](./commands.md)、
ジェスチャー連携属性は [gesture-attributes.md](./gesture-attributes.md) を参照。

## 追記のしかた

- 1 つの規約 = 1 セクション。`## ` 見出しで「何をすべきか」を結論ファーストで書く。
- 「背景（なぜ）」「適用例 / 該当コード」をセットで書く。理由が分かると応用が効く。
- 既存の挙動・仕様に依存する規約は、依存先（ファイル・定数）へリンクしておく。

---

## 反復実行ボタンは click と doubleClick を等価に扱う

ツールバーのズーム ± など、**同じボタンを連打して毎回実行したい**コントロールでは、
ジェスチャーハンドラ側で `click` と `doubleClick` の**両方**を実行トリガとして扱う。

```ts
const isActivation = event.type === "click" || event.type === "doubleClick";
if (isActivation && event.targetId?.startsWith(COMMAND_PREFIX)) {
	return handleCommand(state, commandId);
}
```

### 背景

`GestureRecognizer` は `click` と `doubleClick` を**排他的に**発火する。
同一 `targetId` を `DOUBLE_CLICK_THRESHOLD`（300ms）以内に連打すると、2 回目以降は
`click` ではなく `doubleClick` になる（[GestureRecognizer.ts](../src/controllers/gestures/recognizer/GestureRecognizer.ts) の `pointerup` 判定）。

この排他仕様は「シングルクリック＝選択 / ダブルクリック＝テキスト編集」のように
**意味を変えたい**ケースのための意図的な設計で、オブジェクト/テキスト系ハンドラはこれに依存している。
そのため**認識器側を DOM 標準の「加算式（click が毎回 + dblclick が上乗せ）」に変えるのは避ける**
（回帰リスクが大きい）。

一方、反復コマンドボタンには「ダブルクリック固有の意味」が無い。`click` だけを拾うと
連打時に 1 回おきにスキップする（2 回目が `doubleClick` として捨てられる）ため、
**消費側のハンドラで両者を等価に扱う**ことで「N 連打＝N 実行」を局所的・低リスクに実現する。

### 該当コード

- [ToolbarHandler.ts](../src/controllers/gestures/handlers/menu/ToolbarHandler.ts)
- 関連定数: `DOUBLE_CLICK_THRESHOLD` ([GestureRecognizerConstants.ts](../src/controllers/gestures/recognizer/GestureRecognizerConstants.ts))

---

## SVG の色は「presentation 属性」か「CSS（style / emotion）」かを使い分ける

判断軸は **emotion か inline style か** ではなく、**presentation 属性で足りるか / CSS 関数の解決が要るか**。

- 静的な色で CSS 関数を使わない → SVG の presentation 属性で十分（`fill="currentColor"`、`stroke="#888"` 等）。
- `var(--vscode-*)` や `color-mix()` を使う → **presentation 属性では解決されない**。CSS プロパティとして当てる（`style={{ fill: ... }}` または emotion）。

### emotion と inline style の使い分け

- コンポーネントのクローム（コンテナ / ボタン / パネル / 入力など、`:hover`・状態・レイアウトを持つもの）→ emotion `styled`。
- アイコン内部の小さな SVG 塗りで、CSS 関数解決のためだけに CSS が必要 → inline `style`。
  アイコン群は素の SVG 属性で統一されているため、1 アイコン内で emotion と属性を混在させない。

### 該当コード

- `style={{ fill: theme.transparentChecker }}` … [ColorPreviewIcon.tsx](../src/controllers/ui/icons/ColorPreviewIcon.tsx)
- `style={{ stroke: theme.transparentChecker }}` … [BorderColorIcon.tsx](../src/controllers/ui/icons/BorderColorIcon.tsx)

---

## 追記候補（TODO）

今後ここに整理していきたいトピックのメモ。書けるものから上のセクションへ昇格させる。

- UI クロームの配色は VSCode テーマトークン（`var(--vscode-*)` + ダークフォールバック）を
  `constants/theme.ts` 経由で参照する。図形そのものの色（fill/stroke/fontColor）は
  ドキュメントに保存されるデータなので対象外。
- presentational な「汎用」シェイプ（矢印・GroupIcon 等）は `theme` を直接 import しない。
  色は親から `currentColor` で受け取る。一方、ObjectMenu 専用のカラー系アイコン
  （ColorPreviewIcon / BorderColorIcon 等）は UI クロームなので `theme` トークン
  （例: `transparentChecker`）の参照を許容する。
- 透明（none）インジケータの市松は `theme.transparentChecker`（前景色を薄く重ねる）で表現し、
  ライト / ダークで濃淡が自動反転するようにする。固定グレーは使わない。
- 短命なアクセントオーバーレイ（スナップガイド等）は鮮やかな固定色でも両テーマで成立するため、
  無理にテーマ化しない。色が衝突したときだけトークン化を検討する。
- 実行系の操作はコマンドシステム（`commandRegistry` + `handleCommand`）に集約し、
  キーボード / コンテキストメニュー / ツールバーが同一経路を通るようにする。
