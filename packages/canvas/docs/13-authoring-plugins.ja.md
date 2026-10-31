> 🌐 English version: [13-authoring-plugins.md](./13-authoring-plugins.md)

# プラグインの作り方

[プラグインアーキテクチャ](./12-plugin-architecture.ja.md) の実務側。図形パッケージの
構成、量産キットが何をくれるか、どのコードをどこに置くか、そして忘れてはいけない配線。

`plugins/` 配下のパッケージがそれぞれ実例である。完成形として最小なのが `sticky-shape`、
型固有の選択コントロールを持つのが `container-shapes`、複数テキストスロットを
持つのが `uml-shapes`。自前の部分種別・クリックを受ける選択コントロール・寄与コマンド・
保存せず内容から測る箱を持つのが `table-shape`。

## パッケージ構成

```
plugins/sticky-shape/
├── package.json
├── playwright.config.ts  e2e スイートの Playwright 設定
├── e2e/
│   ├── harness/          spec が叩くページ（このプラグインだけを載せる）
│   └── specs/            Playwright の spec
└── src/
    ├── index.ts          公開 export（plugin・図形カテゴリなどホストが要るもの）
    ├── plugin.ts         CanvasPlugin の宣言
    ├── doc.ts            CanvasDocPlugin の宣言 — headless 入口
    ├── definition.ts     ObjectTypeDefinition（UI 半分）
    ├── schema/           Doc 型・既定値・features・doc バリデータ
    ├── state/            State 型・mapper・state バリデータ
    ├── presentation/     React コンポーネントと <defs>
    ├── stencil/          パレットのアイコンとステンシル定義
    ├── menu/             独自の ObjectMenu 項目（あれば）
    ├── propertyPanel/    独自のプロパティサイドバー行（あれば）
    └── __tests__/        parse-check スイート
```

2 つの入口は `package.json` で宣言する。

```json
{
	"exports": {
		".": "./src/index.ts",
		"./doc": "./src/doc.ts"
	}
}
```

依存の形はどのプラグインでも同じである。`@jiscribe/canvas` と
`@jiscribe/canvas-sdk`（および `react` / `@emotion/*`）は
**`peerDependencies` と `devDependencies` の両建て**にする。peer は利用側が 1 部だけ
供給するため、dev はパッケージ単体でビルド・テストできるようにするため。プラグインが
実際に同梱するもの（`@jiscribe/geometry`・`@jiscribe/basic-validators`）は
`dependencies` に入れる。e2e スイートのぶんとして `@playwright/test` と `vite` が
`devDependencies` に加わる。

headless 半分から先に書く。UI 半分がそれを入力に取るからである。

```ts
// src/doc.ts
import { createFrameObjectDoc } from "@jiscribe/canvas-sdk/doc";
import type { CanvasDocPlugin, ObjectDocDefinition } from "@jiscribe/doc";
import { calcFullBoxTextRegion } from "@jiscribe/doc";

import { STICKY_DOC_DEFAULTS, StickyFeatures } from "./schema/StickyDoc";

export const stickyDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: StickyFeatures,
	defaults: STICKY_DOC_DEFAULTS,
	textRegion: calcFullBoxTextRegion,
	description: "Sticky note annotation.",
	summary: "sticky note (no stroke or `rx`)",
	supportsBounds: false, // クリック配置のみ（ドラッグでのサイズ指定は無い）
});

export const stickyDocPlugin: CanvasDocPlugin = {
	id: "sticky-shape",
	objects: { sticky: stickyDocDefinition },
};
```

```ts
// src/definition.ts
import type { ObjectTypeDefinition } from "@jiscribe/canvas";
import { createFrameObjectDefinition } from "@jiscribe/canvas-sdk";
// 以下、./doc・./presentation・./stencil などから自パッケージの部品を import する

export const stickyDefinition: ObjectTypeDefinition<StickyDoc, StickyState> =
	createFrameObjectDefinition<StickyDoc, StickyState>({
		doc: stickyDocDefinition,
		component: Sticky,
		svgDefs: StickyDefs,
		stencils: StickyStencils,
		menu: [/* … */],
	});
```

```ts
// src/plugin.ts
import type { CanvasPlugin } from "@jiscribe/canvas";

import { stickyDefinition } from "./definition";

export const stickyPlugin: CanvasPlugin = {
	id: "sticky-shape",
	objects: { sticky: stickyDefinition },
};
```

## どのコードをどこに置くか

3 層あり、それぞれに判定基準がある。

| 層                          | 置くもの                                                                             | 基準                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `packages/canvas`           | `createFrame*` ファミリー・`ObjectTypeDefinition` 契約・レジストリ                   | **エンジン内部に触るもの**（State モデル・レジストリ・テーマ・内部バリデータ語彙）。追加は保守的に |
| `packages/canvas-sdk`       | 量産ヘルパー・プラグイン専用部材・canvas `unstable` 面の再エクスポート               | **canvas の公開 API だけで書けるもの。**2 プラグイン以上で同型が出たら昇格する                     |
| プラグインの `<層>/shared/` | 族固有の基盤（`general-shapes` のピクトグラム、`annotation-shapes` の group marker） | **その図形族だけの語彙。**他の族が使い始めたら SDK へ移す                                          |

SDK 向きに見えても `packages/canvas` に残るものが 2 種類ある。非公開のコンテキスト
（テーマ context）に依存するものと、内部バリデータ語彙に依存するもの。これらは
canvas に残して SDK が再エクスポートする。物理的に移すと canvas の公開面が狭まるどころか
逆に広がるためである。

## 量産キットがくれるもの

`@jiscribe/canvas-sdk` は `@jiscribe/canvas/unstable` の全面を再エクスポートする
（`/doc` は `@jiscribe/doc/unstable` の全面）。つまり上位集合なので、その先へ手を伸ばす必要は無い。
そのうえで足している主なものが次である（全体は `packages/canvas-sdk/src/` の
`index.ts` / `doc.ts` / `testing.ts` の export が正本）。

| export                                                                                                                   | 置き換わるもの                                                  |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `createFrameObjectDoc`（`/doc`）                                                                                         | 図形ごとの factory / doc バリデータのファイル                   |
| `createFrameObjectDefinition`                                                                                            | 図形ごとの mapper / state バリデータのファイル                  |
| `createTypeStencils` / `createStencilIcon`                                                                               | ステンシル配列と、全アイコンが繰り返す `<svg>` ラッパー         |
| `createInsetTextRegion`                                                                                                  | 領域が固定比率の inset でしかない場合の手書き `calc*TextRegion` |
| `ShapeBodyPath` / `ShapeBodyPolygon`                                                                                     | frame 系図形が描くシルエット（線・塗り・掴める本体）            |
| `calcRoundedRectOutline` / `centeredPolygonOutline` / `formatPolygonPoints`                                              | 手書きの輪郭計算                                                |
| `calcBelowLabelTextRegion` / `calcBelowLabelVisualBounds` / `BelowLabelHitArea` / `BELOW_LABEL_STYLE_DEFAULTS`（`/doc`） | 「箱いっぱいに描くので文字を下へ吊る」機構一式                  |
| `createParseCheckSuite`（`/testing`）                                                                                    | 図形パッケージが毎回書く parse-check テスト                     |

下ラベルの部材は 3 つで 1 組である。領域を `createFrameObjectDefinition` の
`textRegion`（ラベルを置くテキストスロットの部分種別になる）に、bounds を
`visualBounds` に渡す。後者が無いと zoom-to-fit とエクスポートの viewBox が
ラベルを切り落とす。ヒットエリアは図形自身の `data-kind="object"` グループの中に
置き、ラベルを掴めるようにする。

スロット同士を並べてレイアウトする型（表のセル、record の区画）は、`"textSlot"` の
部分種別を自分で宣言し、`createTextSlotPartKindDefinition({ regions })` を
`partKinds` に置く。全スロットの領域を 1 回で答える関数で、描画は描画 1 回につき
1 度だけ呼ぶ。種別が取るのは `region` か `regions` のどちらか一方
（[プラグインアーキテクチャ](./12-plugin-architecture.ja.md)参照）。

そうして自分で並べた中身は、共有の文字組みを測る `diagnoseDoc` には見えない。箱に
収まらないことを報告させたいなら、doc 定義に `diagnoseOverflow`
（`ObjectDocOverflowDiagnoser`）を宣言する。doc を受け取り、はみ出しごとに英語 1 行
（何が何 px 足りないかと直し方）を返す関数で、`diagnoseDoc` がそれぞれを図形の id
付きのエラーにする。record が区画の高さで実例を示している。

`createFrameObject` を通さず手描きするなら、それが解決していたものは自分で解決する
（sticky が実例）。特に色は `resolveAutoColor(fill, "surface")` で解決し、**結果は
SVG の `fill` 属性ではなく CSS で当てる**。`"auto"` の解決先は `var(--jiscribe-*)` で、
属性では評価されないため、属性へ入れると図形が黒く塗られる（#38 / #206）。

型のプロパティサイドバーのセクションは `propertyPanel` で宣言し、独自の行は `{ type: "custom"; id; component }` として、キットが再エクスポートするサイドバーの部品（`PropertyRow` ほか）で組む。その選択に対して言うことが何も無いセクションは `isShown` を持たせると、行と一緒に見出しも消える。どちらも doc 12 を参照。

`./testing` を別入口にしてあるのは、vitest がランタイムバンドルに届かないようにするため。

## 図形用の AI ツールを足す

汎用ツール（`set_text`・`set_extra_props` など）では、ある型にしか意味の無い編集
（表への行の挿入など）を表せない。そうした編集はプラグインが自前のツールとして出す。
各ツールは呼び出しが `id` で名指す 1 オブジェクトに作用し、作り直す（`apply`）か
読む（`read`）かのどちらかを持つ。`@jiscribe/canvas-sdk/tools` に対して書き、
headless の `./tools` 入口（`src/tools.ts`）から export する。引数スキーマは zod の
raw shape（`z.object` ではなくプロパティの並び）で書く。ホストはそれをそのまま
ツール宣言に載せる（MCP SDK が zod でしかツールを宣言できない）。zod は契約の peer
なので、プラグインとホストは同じ zod の実体を共有する。プラグインは `zod` を
catalog の版（`catalog:`）で `peerDependencies` と `devDependencies` に足す。

契約の正本は `@jiscribe/ai-tools-sdk` で、`@jiscribe/canvas-sdk/tools` はその
再エクスポートである。プラグインは前者を直接 import しない（ESLint が弾く）が、
canvas-sdk がそれを peer で取るので、`./tools` を持つプラグインは
`@jiscribe/ai-tools-sdk` を `peerDependencies` と `devDependencies` に足す。

```ts
// src/tools.ts
import {
	type AiToolPlugin,
	defineObjectAiTool,
} from "@jiscribe/canvas-sdk/tools";
import { z } from "zod";

export const tableAiToolPlugin: AiToolPlugin = {
	id: "table-shape",
	tools: [
		defineObjectAiTool({
			name: "table_insert_tracks", // <型>_<動詞>。全ツールを通して一意
			description: "Insert rows or columns into a table.",
			objectType: "table",
			inputSchema: { axis: z.enum(["row", "column"]), at: z.number().int() },
			apply: (table: TableDoc, { axis, at }) => ({
				doc: insertTracks(table, axis, at), // 新しいオブジェクトを返す。`table` は書き換えない
				text: `inserted a ${axis} at ${at}`,
			}),
		}),
	],
};
```

`id` はホストがスキーマに足し、別の型のオブジェクトは拒否する。`apply` の戻り値は、
書き込む前にその型の `validateDoc` と型が持つ名前で検査されるので、パーサーが拒否する
（または落とす）結果は呼び出しの失敗になり、doc は変わらない。呼び出しを断るときは
`Error` を throw する。そのメッセージが AI に返る。`read` のツールは doc を書き戻さない。
組み込みツールや他プラグインのツールと名前が重なると、ホストがツール一式を組む時点で
throw する。

自分の型のテキストスロットをスタイルするツールは、文字装飾の引数を書き起こさず
`textSlotStyleSchema` を `inputSchema` に展開する。組み込みの `set_style` が宣言する
語彙そのもので、説明文も同じになる。`fontWeight` は `"400"` / `"700"` も受けるので、
書き込む前に `canonicalizeFontWeight` を通す（doc は `"normal"` / `"bold"` で持つ）。
どちらも `@jiscribe/canvas-sdk/tools` から取る。実例はテーブルの `table_set_cell_style`。

自分の型のテキストの一部を装飾するツールも同じように、組み込みの `set_text_style` が
宣言する語彙を展開する。`textMatchSchema`（`match` / `occurrence`。装飾する箇所を
文字そのもので名指す）と `inlineTextStyleSchema`（文字の並びが単独で持てる文字装飾）
の 2 つ。箇所を探して装飾するのは `@jiscribe/doc` の `styleRichTextMatches` で、
`set_text_style` の裏にあるのと同じ関数。見つからなかった理由は結果で返すので、
文言はツール側で組む。実例はテーブルの `table_set_text_style`。

## e2e スイートを持たせる

どのプラグインも、**自分だけを載せたハーネス**を叩く Playwright スイートを持つ。単独
ロードで通ること自体が、他プラグインに寄りかかっていないことの証拠になる。出荷図形を
まとめたときの挙動はこのスイートの仕事ではない — それは
`apps/canvas-examples/e2e/` のスイートが持っている。仕掛けは canvas の e2e キット
（[テスト](./09-testing.ja.md)）で、`@jiscribe/canvas-sdk/testing/*` 経由で取る。以下の
実例は `plugins/annotation-shapes/`。

`package.json` に script 2 つと依存 2 つ。

```json
{
	"scripts": {
		"dev:harness": "vite e2e/harness --configLoader runner",
		"test:e2e": "playwright test"
	},
	"devDependencies": {
		"@playwright/test": "<packages/canvas と同じ版>",
		"vite": "catalog:"
	}
}
```

`@playwright/test` は catalog に入っていないので、版は既存のプラグインや
`packages/canvas` の `package.json` に揃える。

`--configLoader runner` は省略できない。vite 既定の `bundle` ローダーではハーネス設定の
bare specifier が external のまま残るため、`@jiscribe/canvas-sdk/testing/vite-config` を
node 自身が読むことになり、生の TypeScript を解釈する羽目になる。runner ローダーなら
設定が vite 自身のパイプラインを通る。（canvas のハーネスはキットを相対 import しているので
このフラグは要らない。）

`tsconfig.json` — 増えた 2 つのルートも型チェックの対象にする。

```json
{
	"include": ["src", "e2e", "playwright.config.ts"]
}
```

`playwright.config.ts` はパッケージ直下。スイート固有なのは `testDir` とハーネス起動
コマンドだけである。ポートは実行ごとにキットが空きを取って渡してくるので、コマンド側は
そのポートを固定すること。

```ts
import { createCanvasPlaywrightConfig } from "@jiscribe/canvas-sdk/testing/playwright-config";

export default createCanvasPlaywrightConfig({
	testDir: "./e2e/specs",
	harnessCommand: (port) => `pnpm dev:harness --port ${port} --strictPort`,
});
```

`e2e/harness/vite.config.ts`:

```ts
import { createPluginHarnessViteConfig } from "@jiscribe/canvas-sdk/testing/vite-config";

export default createPluginHarnessViteConfig();
```

`e2e/harness/index.html` — `mountPluginHarness` が要求するのは `#root` の要素と
エントリモジュールだけ。

```html
<!doctype html>
<html lang="ja">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Canvas E2E Harness</title>
	</head>
	<body>
		<div id="root"></div>
		<script type="module" src="/main.tsx"></script>
	</body>
</html>
```

`e2e/harness/main.tsx`:

```tsx
import { mountPluginHarness } from "@jiscribe/canvas-sdk/testing/harness";
import {
	annotationPlugin,
	annotationStencilCategory,
} from "@jiscribe/plugin-annotation-shapes";

// This package's shapes only, so a spec failing here is this package's own fault.
mountPluginHarness({
	plugins: [annotationPlugin],
	toolbarItems: [
		{ type: "stencilPreset", presetId: "rect" },
		{ type: "stencilCategory", category: annotationStencilCategory },
	],
});
```

このファイルで外してはいけないのが 2 点。

- **プラグインは自分のパッケージ名で読む。**`../../src` ではない。外部の作者が通る経路が
  こちらであり、それに乗ることがパッケージの `exports` だけで足りていることの証明になる
- **`toolbarItems` は spec が描く分だけに絞る。**自分のピン留めプリセットかカテゴリ
  （`{ type: "stencilCategory", category }` の項目にする）。spec が core の矩形を描く
  （`drawShape("Rectangle", …)`）ときだけ `{ type: "stencilPreset", presetId: "rect" }` も足す。
  渡すのはバーの図形ツールだけである。キット
  （`packages/canvas/e2e/kit/mountPluginHarness.tsx`）はその前に図形ライブラリの
  トグルと区切りを置き、後ろに core のセクション（undo / redo・ズーム・プロパティの
  トグル・両サイドバーの開閉スイッチなど）を足すので、それらは名指ししなくても残る。
  ただしトグルと区切りが残るのは `stencilLibrarySections` を渡したときだけで、渡さなければ
  解決時に落ちる（上の例は渡していないので、トグルは出ない）。プラグインのプリセットと
  カテゴリは canvas の既定に含まれないので、項目を渡さなければ spec からそもそも
  触れない。ステンシルバーは `stencilBarPresetIds` を渡したときだけ出るので、
  `toolbarItems` に書いたプリセットが 2 つ並ぶことはない。プリセットをステンシルバーへ置く
  ページもあってよく、`selectors.toolButton` / `shapeItem` はどちらのバーでも見つける

spec 側は spec 用エントリからすべて取る。

```ts
import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";
```

実行は `pnpm --filter @jiscribe/plugin-annotation-shapes test:e2e`。目視で見たいときは
`dev:harness` でハーネスだけ起動する。`vitest.config.ts` の include は
`src/**/__tests__/` だけなので、Playwright の spec が `pnpm test` に混ざることはない。

## リンタが強制する境界

`eslint.config.js` が以下をすべてビルドエラーにする。

- プラグインの `src/` 配下からは `@jiscribe/canvas/unstable`・
  `@jiscribe/doc/unstable` を import できない。`@jiscribe/canvas-sdk`
  （headless は `@jiscribe/canvas-sdk/doc`）を使う
- プラグインの `src/schema/`・`src/doc.ts`・`src/tools.ts`（または `src/tools/`）は
  headless。canvas / doc 系の入口で使えるのは `@jiscribe/doc` と
  `@jiscribe/canvas-sdk/doc`（`/tools`）だけで、UI 入口・
  `react` / `react-dom` / `@emotion/*`・自パッケージの UI 側の層（`presentation/`・
  `state/`・`menu/` など。一覧は `eslint.config.js` が正本）へは到達できない
- **import はパッケージルート経由。**`@jiscribe/geometry` であって
  `@jiscribe/geometry/src/...` ではない
- `packages/canvas-sdk` もプラグインと同じく canvas の公開入口だけを見る（内部の
  `src/` へは届かない）。ただしプラグインより許される入口が広い。
  `@jiscribe/canvas/unstable`・`@jiscribe/canvas/testing*`・`@jiscribe/doc/unstable`
  を import でき、それらを再エクスポートするのが SDK の役目である

幾何計算を自分で書く前に `@jiscribe/geometry` を見ること。型・距離と回転の
ヘルパー・アフィン変換・交差判定・図形間変換とそのバリデータが既にある。

## 図形をエンジンから出す

組み込みの図形をプラグインへ移すときの手順。

1. **その図形がエンジンから何を使っているか洗う。**すべて公開済みなら API 変更は
   不要。足りなければ先に canvas の `unstable` / doc の `unstable` へ足し、別コミットにする
2. **中身を書き換える前にファイルを移す。**git が rename として追えるようにするため。
   移送先は 1 図形 1 フォルダ（`schema/<id>/`・`state/<id>/`・`presentation/<Pascal>/`）
3. **エンジンから除去する。**その型を名指ししている箇所をすべて外す。主なものは
   次のとおりで、取りこぼしは型名で `packages/doc/src` と `packages/canvas/src` を
   grep して拾う
   - 型の union `ObjectTypes`（`packages/doc/src/model/objects/types/ObjectType.ts`）
   - headless 定義の `builtinObjectDocDefinitions`（`packages/doc/src/plugin/builtinObjectDocDefinitions.ts`）
   - UI 定義の `BUILTIN_OBJECT_DEFINITIONS`（`packages/canvas/src/controllers/registries/applyObjectDefinition.ts`）
   - プリセットを名指ししている `DEFAULT_STENCIL_BAR_PRESET_IDS`（`packages/canvas/src/controllers/ui/menu/StencilBar/stencilBarPresets.ts`。`DEFAULT_TOOLBAR_TOOLS_SECTION` はここから作る）と `basicStencilCategory` の `presetIds`（`packages/canvas/src/controllers/ui/objects/StencilCategory.ts`）
4. **エンジン側テストの副作用を処理する。**「輪郭を持つ図形」「クリック配置の図形」の
   代表としてその図形を使っていたテストが主語を失う。別の組み込みに乗り換えるのではなく、
   テスト側に最小の型を宣言する。前例は
   `controllers/__tests__/support/clickPlacedPlugin.ts`。e2e spec でも同じことをしており、
   代役は `e2e/plugins/specShapesPlugin.tsx`
5. **その図形の e2e spec をプラグイン側のスイートへ移す**（前述）。エンジン側に残すのは、
   コアの型と代役プラグインだけで駆動できるものに限る
6. **全ホストを配線する**（後述）
7. **検証する**（後述）

ツールバーへの露出はパッケージングとは別の判断である。カテゴリ
（`containerStencilCategory` / `annotationStencilCategory`。型は `StencilCategory`）は
プラグインが所有し、ホストが合成する。宣言 1 つが 2 箇所に効く。
`stencilLibrary.sections` へ入れれば図形ライブラリのサイドバーのセクションになり、
`toolbar.sections` へ `{ type: "stencilCategory", category }` として入れればツールバーの
カテゴリフライアウトになる（任意）。出荷図形
セットは全プラグインのカテゴリを `standardStencilLibrarySections`
（`packages/standard-shapes`）でサイドバーのセクションとして並べ、プリセットだけを
ステンシルバーにピン留めしている（`standardStencilBarPresetIds`）。プラグインの
カテゴリは `DEFAULT_TOOLBAR_SECTIONS` に含まれないので、既定のバーをそのまま使い
library も宣言しないホストでは、カテゴリを足すまでその図形は既定のライブラリに
登録済みの全プリセットと並んで出るだけになる。

並べきれない数のプリセットを持つカテゴリ（数百のグリフを抱えるアイコンセット）は、
`presetIds` には選んだ数個だけを並べ、プリセットは全てステンシルとして登録したうえで
`search`（`StencilCategorySearch`）を宣言する。サイドバーの検索語を受け、登録済み
プリセットの id を順位順で、カテゴリ自身の上限で切って返し、切る前の件数を
`matchCount` で添える関数である。サイドバーはそれを並べたプリセットのラベル一致の
後ろに並べ、表示済みの id と未登録の id を落とし、切られた分があれば 1 行添える。
検索していない間は、セクションの下に「ほかの図形を探す」と検索への導線を出す。
ツールバーのフライアウトは `search` を見ず、`presetIds` だけを出す。

## 配線チェックリスト

**忘れられるのは headless の `./doc` 側である。**どのリストも機械的に潰すこと。

型を 1 つ足すたびに:

- [ ] `packages/doc-schema/generator/src/manifest.ts`（`CANONICAL_TYPE_ORDER` に型名を足す。スキーマと AI ドキュメントの並び順で、漏れも余りも生成が落ちる）

プラグインのパッケージを出荷図形セットに新しく加えるときは、さらに UI と headless の
両方を配線する。

UI プラグイン（`somePlugin`）:

- [ ] `packages/standard-shapes/src/index.ts`（`standardPlugins` と、図形をサイドバーに出す `standardStencilLibrarySections`。VSCode 拡張・MCP ビューア・CLI preview はここから図形セットを受け取る）
- [ ] `apps/canvas-examples/src/examples/plugins.tsx`（`plugins` と `stencilLibrarySections`）
- [ ] `apps/canvas-examples/e2e/harness/main.tsx`（`plugins` と `stencilLibrarySections`）

headless doc プラグイン（`someDocPlugin`）:

- [ ] `packages/standard-shapes/src/doc.ts`（`standardDocPlugins`。VSCode 拡張の診断・スキーマ生成・MCP サーバー・`doc-tools` はここから図形セットを受け取る）

AI ツール（`someAiToolPlugin`。プラグインが出す場合だけ）:

- [ ] `packages/standard-shapes/src/tools.ts`（`standardAiToolPlugins`。MCP サーバーはここからツール一式を受け取る）

`package.json` にプラグインへの依存を足すのは `packages/standard-shapes` と
`apps/canvas-examples` だけである。ほかのホスト（VSCode 拡張・MCP・CLI）は
`@jiscribe/standard-shapes` にだけ依存しているので触らない。`packages/canvas` が
意図的に入っていないのは、出荷プラグインに一切依存しないためである。足すと
`canvas → plugins → canvas-sdk → canvas` の循環が戻ってくる。

> **配線し忘れると何が起きるか**: パースはエラーにならない。結果は `kind: "ok"` の
> ままで、その型のオブジェクトが `root` から**黙って落ちる**（警告は出る）。
> テストで気付きにくいので、上のリストは目視ではなく機械的に潰す。この挙動は
> 各プラグインの parse-check スイート（`createParseCheckSuite`。例:
> `plugins/sticky-shape/src/__tests__/stickyParseCheck.test.ts`）が固定している。

キャンバスを組み込んでいる下流の製品にも独自の配線がある。出荷図形セットに図形を
足すということは、そちらの更新も含む。

## 検証

```bash
pnpm lint --fix && pnpm format && pnpm typecheck && pnpm dep:check && pnpm lint
pnpm test
pnpm generate:schema   # packages/doc-schema/assets を再生成する。差分はコミットする
pnpm build:examples && pnpm build:vscode
pnpm --filter @jiscribe/plugin-<name> test:e2e             # その図形のスイートは全部回す
pnpm --filter @jiscribe/canvas test:e2e specs/smoke specs/shapes/draw
pnpm --filter canvas-examples test:e2e                     # プラグイン同居
```

図形を**移設**したときは、`pnpm generate:schema` が**無変化**であることが doc 定義を
忠実に移せた証拠になる。図形を**追加**したときは差分が新しいスキーマそのものなので、
コミットする（CI の `check:schema` が乖離で落ちる）。
