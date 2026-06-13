# svg-canvas-demo E2E テスト

Playwright Test で svg-canvas-2 を実ユーザーと同じ UI 操作でテストする。
このドキュメントは構成ガイドと、`scripts/replay-hero-showcase.mjs`（.jis.json の UI 操作による再現）の開発過程で得たノウハウのまとめ。

## 構成

```
apps/svg-canvas-demo/
├── playwright.config.ts   # webServer で vite dev (port 5174) を自動起動
├── e2e/
│   ├── fixtures.ts        # canvas フィクスチャ（CanvasDriver を注入）
│   ├── support/
│   │   ├── selectors.ts   # data-kind / data-id セレクタ定数
│   │   └── CanvasDriver.ts # 操作API（描画・選択・テキスト・色・コネクター）
│   └── specs/             # テスト本体
└── scripts/               # Playwright を使った手動デモ・調査用スクリプト
```

実行:

```bash
pnpm --filter svg-canvas-demo test:e2e         # ルートからは pnpm test:e2e
pnpm --filter svg-canvas-demo test:e2e:headed  # ブラウザ表示あり
pnpm --filter svg-canvas-demo test:e2e:ui      # Playwright UI モード
```

設計方針: **失敗を隠すリトライは入れない**。CanvasDriver は時間待ちではなく状態待ち
（要素の出現・オブジェクト数の変化を `expect.poll` 等で待つ）で同期し、操作が効かない場合は
そのまま失敗させてプロダクトの問題として顕在化させる。デモ用スクリプトの Ctrl+Z 救済
（後述）はテストには持ち込まない。

## 基本セットアップ

```js
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: false, slowMo: 10 });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:5174/", { waitUntil: "networkidle" });
```

- 開発サーバーは `pnpm dev:demo`（http://localhost:5174/）
- WSL2 では WSLg（`DISPLAY=:0`）があるためヘッドあり実行で実際のウィンドウを表示できる
- 動きを目視したいときは `headless: false` + `slowMo`、検証だけなら headless（速い）
- **headless は操作間隔が詰まるためレースコンディションが顕在化しやすい**。headless で通れば headed でも通る、の逆は成り立たないことがある

## DOM の構造とセレクタ

ジェスチャーシステムが `data-kind` / `data-id` でイベントをルーティングしているため、テストでも同じ属性を使うのが確実。

属性の使い分け:

- **`data-kind` / `data-id`** … プロダクトの**機能契約**（gesture システムが読む）。テストは「ついでに」これを利用する
- **`data-testid`** … **テスト専用フック**。機能で特定できない要素（gesture を経由しない数値入力欄など）に付ける。`playwright.config.ts` の `testIdAttribute: "data-testid"` で有効化済みで、`page.getByTestId("menu-number-input:strokeWidth")` のように使う。機能契約（`data-id`）に混ぜないことで、テスト都合の識別子と機能の識別子を区別する

| data-kind     | 意味                                    | data-id の形式                    |
| ------------- | --------------------------------------- | --------------------------------- |
| `canvas`      | キャンバス本体（DIV）                   | `canvas`                          |
| `menu-item`   | 左ツールバーのボタン                    | `menu-item:re` など（先頭数文字） |
| `object`      | 図形（rect / ellipse / polyline …）     | UUID                              |
| `connector`   | コネクター（polyline + 矢印の polygon） | UUID                              |
| `control`     | 選択時のハンドル類                      | 下表参照                          |
| `object-menu` | 選択時のフローティングメニュー          | 下表参照                          |
| `text-editor` | テキスト編集中の TEXTAREA               | `textarea`                        |

ツールバーは `button[title="Rectangle"]` のように `title` 属性でも特定できる
（Rectangle / Ellipse / Polyline / Polygon / Sticky / Markdown）。

### control の data-id

| data-id                                                           | 役割                                                                                                                                      |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `transform-control:topLeft` 〜 `bottomRight`, `topCenter` 等8方向 | リサイズハンドル（8px 四方）                                                                                                              |
| `transform-control:rotation`                                      | 回転ハンドル（topRight の外側 +15,-15 付近）                                                                                              |
| `connection-anchor:create:<uuid>:<anchorId>`                      | コネクター作成アンカー。`anchorId` は `topCenter` / `bottomCenter` / `leftCenter` / `rightCenter`。**辺の中点から 20px 外側**に表示される |

### object-menu の data-id

| data-id                                                      | 開くもの                                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `object-menu:toggle:bg-color`                                | 背景色（property: `fill`）                                                            |
| `object-menu:toggle:stroke-color`                            | 枠線色（`stroke`）                                                                    |
| `object-menu:toggle:line-color`                              | 線色（`stroke`、線・コネクター用）                                                    |
| `object-menu:toggle:font-color`                              | 文字色（`fontColor`）                                                                 |
| `object-menu:toggle:line-style` / `border-style`             | 線種・線幅（・角丸）                                                                  |
| `object-menu:toggle:font-size` / `alignment` / `stack-order` | フォントサイズ / 配置 / 重なり順                                                      |
| `object-menu:set:<property>:<value>`                         | 即時設定ボタン（例: `object-menu:set:strokeDashType:dashed`、プリセット色スウォッチ） |

カラーピッカーには **CSS カラーのテキスト入力欄**（`input[placeholder="CSS color"]`）があり、
任意の hex や `transparent` を入力して **Enter で確定**できる。プリセットにない色はこれで設定する。

## 座標系

- デフォルト（ズーム1・パンなし）では **ドキュメント座標 ≒ 画面座標**
- パン/ズームは SVG の `viewBox` で実装されている。最大面積の `svg` の `viewBox` 属性を読めば現在のパン/ズーム状態が分かる（テスト中の不変条件チェックに有効）
- 図形要素は `transform="matrix(1,0,0,1,cx,cy)"` を持ち、**e,f が図形の中心座標**。`x,y,width,height` は中心原点
- コネクターの `points` は SVG 座標。画面座標へは `el.getScreenCTM()` + `DOMPoint.matrixTransform()` で変換する

## 操作のセマンティクス

| 操作           | 方法                                                | 注意                                                                                      |
| -------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 図形を描く     | ツールボタンをクリック → 対角ドラッグ               | 描画後ツールは選択モードに戻る。**新規図形は自動的に選択状態**になり ObjectMenu が出る    |
| 選択           | 図形をクリック                                      | 最前面の図形に当たる                                                                      |
| 複数選択       | 空白からドラッグ（マーキー）                        |                                                                                           |
| 移動           | 図形上で mousedown → move → up                      |                                                                                           |
| テキスト編集   | ダブルクリック → TEXTAREA にタイプ                  | **Escape はキャンセル**。確定は**外側クリック**（他のジェスチャー開始でも commit される） |
| 色・スタイル   | 選択中の ObjectMenu から                            | 上記の data-id 参照                                                                       |
| コネクター作成 | 接続元を選択 → 作成アンカーから接続先の辺へドラッグ | **作成直後は選択されない**。スタイル変更するには線上をクリックして選択し直す              |
| 回転           | 回転ハンドルを中心周りの円軌道でドラッグ            | 半径はハンドル位置から計算する                                                            |
| Undo / Redo    | Ctrl+Z / Ctrl+Shift+Z（修飾キー必須）               | 誤操作の復旧に使える                                                                      |

ドラッグは `page.mouse.move(x, y, { steps: N })` で中間イベントを発生させること。
steps なしの瞬間移動はジェスチャー認識やデモの視認性の点で不利。

## ハマりどころ（重要）

### 1. ツールボタンのクリックが「たまに」効かない

直前のクリックとの間隔が短いと、ダブルクリック判定との衝突等でツール選択が無視されることがある。
その状態でドラッグすると**既存の図形を掴んで動かしてしまい**、さらに後続の色設定・テキスト入力まで
その図形に誤適用される（被害がカスケードする）。

対策:

- クリックの間に **300ms 程度のポーズ**を入れる
- 描画後に **オブジェクト数が増えたことを検証**する。増えていなければ、既存図形の transform が
  変わっていないか調べ、変わっていたら **Ctrl+Z で復元してからリトライ**する

```js
const before = await captureObjects(); // [data-kind=object] の id と transform
await page.click('button[title="Rectangle"]');
await drag(...);
const after = await captureObjects();
if (after.length === before.length) {
	// 誤って動かした図形があれば Ctrl+Z で戻してリトライ
}
```

### 2. Escape はテキスト編集の「キャンセル」

タイプした内容が消える。確定は外側クリック（`commitTextEditIfNeeded` が他のジェスチャー開始時に走る）。

### 3. カラードロップダウンが図形を覆うことがある

ObjectMenu は選択図形の下に出るが、画面下端付近ではドロップダウンが**上方向にフリップして
図形自体を覆う**。その状態でダブルクリックするとパネル（プリセットスウォッチ）に当たり、
テキストエディタが開かない・意図しない色が付くなどの誤動作になる。

対策: テキスト編集の前に一度**選択解除してメニューを閉じる**。さらにダブルクリック後に
`[data-kind=text-editor]` の出現を `waitForSelector` で確認し、出なければリトライする。

### 4. ビューポート端 20px で自動スクロール（パン）

ドラッグ中にポインタが端から `AUTO_SCROLL_THRESHOLD = 20` px 以内に入るとキャンバスがパンする
（1ステップ 10px）。端ぎりぎりまでドラッグする操作（画面いっぱいの矩形など）は viewBox がずれ、
以降の座標前提が全部崩れる。

対策: 操作座標は端から **25px 以上**離す。テスト全体の不変条件として viewBox の変化を監視する。

### 5. 検証は「操作したつもり」ではなく結果で行う

- テキストの存在確認は `document.body.textContent` を使う（`innerHTML` は `&` が `&amp;` に
  エスケープされ偽陰性になる）
- オブジェクトの `id / transform / fill` のスナップショットを操作ごとに取り、
  **意図しない移動・着色を検出**すると原因特定が速い
- スクリーンショット（`page.screenshot`）を残すと headless でも見た目を確認できる

## 参考スクリプト（apps/svg-canvas-demo/scripts/）

テストではなく、手動デモ・調査用。`node apps/svg-canvas-demo/scripts/<name>.mjs` で実行
（dev サーバーは別途起動しておく）。

| ファイル                   | 内容                                                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `replay-hero-showcase.mjs` | `.jis.json` を UI 操作のみで再現（描画・色・テキスト・コネクター）。検証・リトライ・デバッグログ（`DEBUG=1`、`HEADLESS=1`）の実装例 |
| `live-show.mjs`            | 回転・リサイズ・コネクター・自由曲線ドラッグのデモ                                                                                  |
| `live-demo.mjs`            | 描画・移動・マーキー選択の基本デモ                                                                                                  |
| `inspect-canvas.mjs`       | キャンバス上の図形一覧をダンプ                                                                                                      |
| `verify-drag.mjs`          | ドラッグ前後の位置比較による検証例                                                                                                  |
| `screenshot.mjs`           | 任意 URL のスクリーンショットを保存する汎用ツール                                                                                   |
