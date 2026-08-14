# @jiscribe/canvas-sdk

canvas プラグイン（図形パッケージ）作者向けの量産キット。canvas 本体の公開 API だけで
書けるヘルパーと、`@jiscribe/canvas/unstable` / `/unstable-doc` 面の再エクスポートを
提供する。プラグインは canvas の unstable 系を直接 import しない（eslint ガードで強制）。

置き場所の 3 層ルールと、プラグイン作成の手順は
[プラグインの作り方](../canvas/docs/13-authoring-plugins.ja.md) 参照。

## エントリ

| エントリ                                         | 用途                                                                                         |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `@jiscribe/canvas-sdk`                           | UI 部材（React 依存）。unstable 面の再エクスポート + sdk 固有ヘルパー                        |
| `@jiscribe/canvas-sdk/doc`                       | headless 部材。unstable-doc 面の再エクスポート + doc 系ヘルパー。React / @emotion を引かない |
| `@jiscribe/canvas-sdk/testing`                   | ユニットテスト専用（vitest 前提）。ランタイム barrel には混ぜない                            |
| `@jiscribe/canvas-sdk/testing/e2e`               | e2e の spec ファイル用。fixtures・CanvasDriver・selectors                                    |
| `@jiscribe/canvas-sdk/testing/playwright-config` | `playwright.config.ts` 用                                                                    |
| `@jiscribe/canvas-sdk/testing/vite-config`       | ハーネスの `vite.config.ts` 用                                                               |
| `@jiscribe/canvas-sdk/testing/harness`           | ハーネスのエントリモジュール用（ブラウザコード）                                             |

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
  （`supportsBounds` と型排他）
- `createFrameObjectDefinition<TDoc, TState>({ doc, component, ... })` — mapper /
  stateValidator / behavior を doc.features から充填して `ObjectTypeDefinition` を返す。
  `extraKeys` / `isExtraStateValid` と、`textRegion` / `outline` / `stencils` 等の
  任意フィールドを透過

どちらも糖衣であり、`ObjectDocDefinition` / `ObjectTypeDefinition` の直書きは引き続き
第一級（例: uml の record は mapper が派生物のため definition を直書き）。

### presentation 部材

- `ShapeBodyPolygon` / `ShapeBodyPath` — 図形本体の styled 基底（stroke / fill props +
  掴めるカーソル + focus 輪郭消し）
- `calcRoundedRectOutline` — 角丸矩形の輪郭点列サンプリング
- below-label 機構（`calcBelowLabelTextRegion` / `calcBelowLabelVisualBounds` /
  `BelowLabelHitArea` / `BELOW_LABEL_STYLE_DEFAULTS`）— 箱いっぱいに描く図形の
  「文字を箱の下へ吊る」一式
- `calcLabelBoxSize` — 上記のラベル箱の採寸だけを取り出したもの。箱の下以外へ
  ラベルを吊る図形（グループマーカー等）が置き場所だけ自前で決めるときに使う
- `centeredPolygonOutline` / `OUTLINE_CURVE_SEGMENTS` / `formatPolygonPoints`

### stencil 部材

- `createStencilIcon(drawing)` — 24x24 viewBox の svg 外枠と memo を吸収する factory
- `createTypeStencils(preset)` — 単一プリセット（id = objectType）の `Stencil[]` を生成

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
- `mountPluginHarness({ plugins, toolbarLayout })`（`/testing/harness`）— spec が叩く
  ハーネスページ。`toolbarLayout` は自分の図形が要る分だけに絞る（単独ロードで
  動くこと自体が、他プラグインへの暗黙依存が無いことの検証になる）
- `test` / `expect` / `CanvasDriver` / `selectors`（`/testing/e2e`）— spec 側の部材
