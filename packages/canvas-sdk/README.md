# @jiscribe/canvas-sdk

canvas プラグイン（図形パッケージ）作者向けの量産キット。canvas 本体の公開 API だけで
書けるヘルパーと、`@jiscribe/canvas/unstable` / `/unstable-doc` 面の再エクスポートを
提供する。プラグインは canvas の unstable 系を直接 import しない（eslint ガードで強制）。

置き場所の 3 層ルールと、プラグイン作成の手順は
[プラグインの作り方](../canvas/docs/13-authoring-plugins.ja.md) 参照。

## エントリ

| エントリ                                         | 用途                                                                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `@jiscribe/canvas-sdk`                           | UI 部材（React 依存）。unstable 面の再エクスポート + sdk 固有ヘルパー                                               |
| `@jiscribe/canvas-sdk/doc`                       | headless 部材。unstable-doc 面の再エクスポート + doc 系ヘルパー。React / @emotion を引かない                        |
| `@jiscribe/canvas-sdk/tools`                     | 図形用の AI ツールを書く契約（`defineObjectAiTool` ほか）。`@jiscribe/ai-tools-sdk` の再エクスポート。headless      |
| `@jiscribe/canvas-sdk/icon-set-generator`        | アイコンセットの生成スクリプト用（Node の `.mjs`、型は手書きの `index.d.mts`）。SVG の変換と 2 モジュールの書き出し |
| `@jiscribe/canvas-sdk/testing`                   | ユニットテスト専用（vitest 前提）。ランタイム barrel には混ぜない                                                   |
| `@jiscribe/canvas-sdk/testing/e2e`               | e2e の spec ファイル用。fixtures・CanvasDriver・selectors                                                           |
| `@jiscribe/canvas-sdk/testing/playwright-config` | `playwright.config.ts` 用                                                                                           |
| `@jiscribe/canvas-sdk/testing/vite-config`       | ハーネスの `vite.config.ts` 用                                                                                      |
| `@jiscribe/canvas-sdk/testing/harness`           | ハーネスのエントリモジュール用（ブラウザコード）                                                                    |

e2e 用が 4 つに分かれているのは、spec / playwright config / vite config / ブラウザ
コードがそれぞれ別のローダーに読まれ、互いの import を許さないためである
（fixtures を登録するモジュールに触れた config を Playwright が拒否する、vite が
ESM 専用、など）。1 ファイル 1 エントリで対応させること。

## 置き場所の3層ルール

| 層                       | 基準                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------- |
| `packages/canvas`        | エンジン内部（State モデル・レジストリ・テーマ・内部バリデータ語彙）に触るもの      |
| `packages/canvas-sdk`    | canvas 公開 API だけで書ける、図形量産の便宜。**2プラグイン以上で同型が出たら昇格** |
| 各プラグインの `shared/` | その図形族だけの語彙（例: general の Pictogram、annotation の GroupMarker）         |

## 主要 API

### 図形定義の一括導出

- `createFrameObjectDoc({ features, defaults, ... })`（`/doc`）— validateDoc / factory を
  導出して `ObjectDocDefinition` を丸ごと返す。族固有 factory は `factory:` で上書き可
  （`supportsBounds` と型排他）。`extraKeys` はその型が持つフィールド名の唯一の宣言で、
  パーサーはそれと features から集合を組み立て、集合に無い名前を warning で報告して
  doc から取り除く（**`extraKeys` の書き漏れは保存時のデータ消失になる**）。外形
  `outline` とアンカー領域 `anchorRegion` もここで宣言する（UI 定義はそれを引き継ぐ
  だけで、別に渡す口は無い）
- `createFrameObjectDefinition<TDoc, TState>({ doc, component, ... })` — mapper /
  stateValidator / behavior を doc.features から充填して `ObjectTypeDefinition` を返す。
  図形固有のフィールド名は doc 定義の `extraKeys` から読む（宣言は
  `createFrameObjectDoc` 側 1 箇所）。`isExtraStateValid` と、`textRegion` /
  `visualBounds` / `stencils` 等の任意フィールドを透過

どちらも糖衣であり、`ObjectDocDefinition` / `ObjectTypeDefinition` の直書きは引き続き
第一級（例: uml の record は mapper が派生物のため definition を直書き）。

### presentation 部材

- `ShapeBodyPolygon` / `ShapeBodyPath` — 図形本体の styled 基底（stroke / fill props +
  掴めるカーソル + focus 輪郭消し）
- `calcRoundedRectOutline` — 角丸矩形の輪郭点列サンプリング（`/doc` からも import できる）
- below-label 機構（`calcBelowLabelTextRegion` / `calcBelowLabelVisualBounds` /
  `BelowLabelHitArea` / `BELOW_LABEL_STYLE_DEFAULTS`）— 箱いっぱいに描く図形の
  「文字を箱の下へ吊る」一式
- `calcLabelBoxSize` — 上記のラベル箱の採寸だけを取り出したもの。箱の下以外へ
  ラベルを吊る図形（グループマーカー等）が置き場所だけ自前で決めるときに使う
- `centeredPolygonOutline` / `OUTLINE_CURVE_SEGMENTS`（`/doc` からも import できる。
  doc 定義の `outline` はこちらで組む。点列を `points` 属性へ書くのは canvas の
  unstable 面が持つ `formatPolygonPoints`。この sdk からも import できる）

### stencil 部材

- `createStencilIcon(drawing)` — 24x24 viewBox の svg 外枠と memo を吸収する factory
- `createTypeStencils(preset)` — 単一プリセット（id = objectType）の `Stencil[]` を生成

### アイコンセット部材

ベンダーのアイコン集を生成データとして同梱する図形（`awsIcon` ほか）の共通部分。
生成データは目録（名前・表示名・カテゴリ・viewBox）と描画データ（SVG 要素ツリー）の
2 モジュールに分け、headless 側は目録だけを読む。

- `createIconSetCatalog(config)`（`/doc`）— 1 セット分の名前表（目録・別名・パレット・
  「すべて表示」の節・機械的な略記の導き方）を閉じ込めた名前引きを返す。解決・候補の提示・
  検索・節・`icon` のバリデータ（`validateIconName`）。略記と語集合の索引は初回使用時に作る
- `createIconSetObject` / `createIconSetStencils` / `createIconSetStencilCategory` —
  名前引きと描画データから、図形のコンポーネント・プリセット・ステンシルカテゴリを作る。
  描けない名前（解決しない・描画データに無い）は図形では破線枠、ステンシルでは空の glyph
- `IconSetArt` — 1 アイコンを描く。テーマの `colorScheme` で light / dark を選び、
  描画データが定義する id にはインスタンスごとの接尾辞を付ける（同じアイコンを 2 箇所に
  描いても文書中で id が重ならない）
- `./icon-set-generator` — 生成スクリプトのセット非依存部分。許可リストに無い要素・属性・
  style 宣言で失敗し、描画結果を変える処理（座標の丸め・色の置換）はしない

### テスト部材（`/testing`）

- `createParseCheckSuite({ plugin, sampleDoc, ... })` — パース受理と
  「doc プラグイン未配線時に図形が黙って落ちる」ことの検知を全プラグイン共通形で固定する

### e2e 部材（`/testing/*`）

プラグインが自分の e2e スイートを持つための一式。出荷プラグインの
`plugins/*/e2e/` が実例。

- `createCanvasPlaywrightConfig({ testDir, harnessCommand })`（`/testing/playwright-config`）
  — 毎回 ephemeral ポートでハーネスを起こす Playwright 設定。スイート固有はこの 2 つだけ
- `createPluginHarnessViteConfig()`（`/testing/vite-config`）— ハーネスの vite 設定。
  起動は `vite e2e/harness --configLoader runner`
- `mountPluginHarness({ plugins, toolbarItems, stencilBarPresetIds, stencilLibrarySections })`
  （`/testing/harness`）— spec が叩くハーネスページ。`toolbarItems` はバー全体ではなく
  図形ツールの分だけで、図形ライブラリのトグルとコアの view セクション
  （undo / redo / ズーム・サイドバーの開閉など）はキットが足す。ステンシルバーは
  `stencilBarPresetIds` を渡したときだけ出る（プリセットはどちらか一方のバーに置く）。自分の図形が要る分だけに絞る（単独ロードで
  動くこと自体が、他プラグインへの暗黙依存が無いことの検証になる）。`stencilLibrarySections` は図形ライブラリのサイドバーを spec で触る
  ときだけ渡す（省略すればサイドバーもツールバーのトグルも出ない）
- `test` / `expect` / `CanvasDriver` / `selectors`（`/testing/e2e`）— spec 側の部材
