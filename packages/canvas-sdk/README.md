# @jiscribe/canvas-sdk

canvas プラグイン（図形パッケージ）作者向けの量産キット。canvas 本体の公開 API だけで
書けるヘルパーと、`@jiscribe/canvas/unstable` / `/unstable-doc` 面の再エクスポートを
提供する。プラグインは canvas の unstable 系を直接 import しない（eslint ガードで強制）。

経緯と全体設計は [docs/05_extensibility/canvas-sdk-plan.md](../../docs/05_extensibility/canvas-sdk-plan.md) 参照。

## エントリ

| エントリ                       | 用途                                                                                         |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| `@jiscribe/canvas-sdk`         | UI 部材（React 依存）。unstable 面の再エクスポート + sdk 固有ヘルパー                        |
| `@jiscribe/canvas-sdk/doc`     | headless 部材。unstable-doc 面の再エクスポート + doc 系ヘルパー。React / @emotion を引かない |
| `@jiscribe/canvas-sdk/testing` | テスト専用（vitest 前提）。ランタイム barrel には混ぜない                                    |

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
- `centeredPolygonOutline` / `OUTLINE_CURVE_SEGMENTS` / `formatPolygonPoints`

### stencil 部材

- `createStencilIcon(drawing)` — 24x24 viewBox の svg 外枠と memo を吸収する factory
- `createTypeStencils(preset)` — 単一プリセット（id = objectType）の `Stencil[]` を生成

### テスト部材（`/testing`）

- `createParseCheckSuite({ plugin, sampleDoc, ... })` — パース受理と
  「doc プラグイン未配線時に図形が黙って落ちる」ことの検知を全プラグイン共通形で固定する
