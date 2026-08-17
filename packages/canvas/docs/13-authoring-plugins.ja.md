> 🌐 English version: [13-authoring-plugins.md](./13-authoring-plugins.md)

# プラグインの作り方

[プラグインアーキテクチャ](./12-plugin-architecture.ja.md) の実務側。図形パッケージの
構成、量産キットが何をくれるか、どのコードをどこに置くか、そして忘れてはいけない配線。

`plugins/` 配下の 8 パッケージが実例である。完成形として最小なのが `sticky-shape`、
型固有の選択コントロールを持つのが `container-shapes`、複数テキストスロットを
持つのが `uml-shapes`。

## パッケージ構成

```
plugins/sticky-shape/
├── package.json
├── playwright.config.ts  e2e スイートの Playwright 設定
├── e2e/
│   ├── harness/          spec が叩くページ（このプラグインだけを載せる）
│   └── specs/            Playwright の spec
└── src/
    ├── index.ts          公開 export（plugin・ツールバーエントリなどホストが要るもの）
    ├── plugin.ts         CanvasPlugin の宣言
    ├── doc.ts            CanvasDocPlugin の宣言 — headless 入口
    ├── definition.ts     ObjectTypeDefinition（UI 半分）
    ├── schema/           Doc 型・既定値・features・doc バリデータ
    ├── state/            State 型・mapper・state バリデータ
    ├── presentation/     React コンポーネントと <defs>
    ├── stencil/          パレットのアイコンとステンシル定義
    ├── menu/             独自の ObjectMenu 項目（あれば）
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
export const stickyDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: StickyFeatures,
	defaults: STICKY_DOC_DEFAULTS,
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
export const stickyPlugin: CanvasPlugin = {
	id: "sticky-shape",
	objects: { sticky: stickyDefinition },
};
```

## どのコードをどこに置くか

3 層あり、それぞれに判定基準がある。

| 層                     | 置くもの                                                                             | 基準                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `packages/canvas`      | `createFrame*` ファミリー・`ObjectTypeDefinition` 契約・レジストリ                   | **エンジン内部に触るもの**（State モデル・レジストリ・テーマ・内部バリデータ語彙）。追加は保守的に |
| `packages/canvas-sdk`  | 量産ヘルパー・プラグイン専用部材・canvas `unstable` 面の再エクスポート               | **canvas の公開 API だけで書けるもの。**2 プラグイン以上で同型が出たら昇格する                     |
| プラグインの `shared/` | 族固有の基盤（`general-shapes` のピクトグラム、`annotation-shapes` の group marker） | **その図形族だけの語彙。**他の族が使い始めたら SDK へ移す                                          |

SDK 向きに見えても `packages/canvas` に残るものが 2 種類ある。非公開のコンテキスト
（テーマ context）に依存するものと、内部バリデータ語彙に依存するもの。これらは
canvas に残して SDK が再エクスポートする。物理的に移すと canvas の公開面が狭まるどころか
逆に広がるためである。

## 量産キットがくれるもの

`@jiscribe/canvas-sdk` は `@jiscribe/canvas/unstable` の全面を再エクスポートする
（`/doc` は `unstable-doc` の全面）。つまり上位集合なので、その先へ手を伸ばす必要は無い。
そのうえで次を足している。

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

下ラベルの部材は 3 つで 1 組である。領域を型の `textRegion` に、bounds を
`visualBounds` に登録する。後者が無いと zoom-to-fit とエクスポートの viewBox が
ラベルを切り落とす。ヒットエリアは図形自身の `data-kind="object"` グループの中に
置き、ラベルを掴めるようにする。

`./testing` を別入口にしてあるのは、vitest がランタイムバンドルに届かないようにするため。

## e2e スイートを持たせる

どのプラグインも、**自分だけを載せたハーネス**を叩く Playwright スイートを持つ。単独
ロードで通ること自体が、他プラグインに寄りかかっていないことの証拠になる。出荷図形を
まとめたときの挙動はこのスイートの仕事ではない — spec 1 本を
`apps/canvas-examples/e2e/` が持っている。仕掛けは canvas の e2e キット
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
		"@playwright/test": "^1.60.0",
		"vite": "catalog:"
	}
}
```

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
	annotationToolbarEntry,
} from "@jiscribe/plugin-annotation-shapes";

// This package's shapes only, so a spec failing here is this package's own fault.
mountPluginHarness({
	plugins: [annotationPlugin],
	toolbarLayout: [{ kind: "preset", presetId: "rect" }, annotationToolbarEntry],
});
```

このファイルで外してはいけないのが 2 点。

- **プラグインは自分のパッケージ名で読む。**`../../src` ではない。外部の作者が通る経路が
  こちらであり、それに乗ることがパッケージの `exports` だけで足りていることの証明になる
- **`toolbarLayout` は spec が描く分だけに絞る。**自分のピン留めプリセットかカテゴリ
  エントリと、それに必ず `{ kind: "preset", presetId: "rect" }` を足す。後者は必須で、
  `CanvasDriver.goto()` が "Rectangle" ツールボタンの出現を待ってからページを引き渡すため。
  プラグインのプリセットとカテゴリは canvas の既定 layout に含まれないので、layout を
  渡さなければ spec からそもそも触れない

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
  `@jiscribe/canvas/unstable-doc` を import できない。`@jiscribe/canvas-sdk`
  （headless は `@jiscribe/canvas-sdk/doc`）を使う
- プラグインの `src/schema/` と `src/doc.ts` は headless。使えるのは
  `@jiscribe/canvas/doc` と `@jiscribe/canvas-sdk/doc` だけで、UI 入口・
  `react` / `react-dom` / `@emotion/*`・自パッケージの `presentation/`・
  `state/`・`stencil/`・`controls/`・`menu/` へは到達できない
- **import はパッケージルート経由。**`@jiscribe/geometry` であって
  `@jiscribe/geometry/src/...` ではない
- `packages/canvas-sdk` もプラグインと同じ規則の下にある（canvas の公開入口だけを見る）

幾何計算を自分で書く前に `@jiscribe/geometry` を見ること。型・距離と回転の
ヘルパー・アフィン変換・交差判定・図形間変換とそのバリデータが既にある。

## 図形をエンジンから出す

7 回やった結果の手順。

1. **その図形がエンジンから何を使っているか洗う。**すべて公開済みなら API 変更は
   不要。足りなければ先に `unstable` / `unstable-doc` へ足し、別コミットにする
2. **中身を書き換える前にファイルを移す。**git が rename として追えるようにするため。
   移送先は 1 図形 1 フォルダ（`schema/<id>/`・`state/<id>/`・`presentation/<Pascal>/`）
3. **エンジンから除去する。**`ObjectTypes` union・`builtinObjectDocDefinitions`・
   `initializeObjectRegistry`・`DEFAULT_TOOLBAR_LAYOUT` の 4 箇所
4. **エンジン側テストの副作用を処理する。**「輪郭を持つ図形」「クリック配置の図形」の
   代表としてその図形を使っていたテストが主語を失う。別の組み込みに乗り換えるのではなく、
   テスト側に最小の型を宣言する。前例は
   `controllers/__tests__/support/clickPlacedPlugin.ts`。e2e spec でも同じことをしており、
   代役は `e2e/plugins/specShapesPlugin.tsx`
5. **その図形の e2e spec をプラグイン側のスイートへ移す**（前述）。エンジン側に残すのは、
   コアの型と代役プラグインだけで駆動できるものに限る
6. **全ホストを配線する**（後述）
7. **検証する**（後述）

ツールバーへの露出はパッケージングとは別の判断である。カテゴリフライアウトの
エントリ（`containerToolbarEntry` / `annotationToolbarEntry`）はプラグインが所有し、
ホストが `toolbar.layout` に合成する。プラグインのカテゴリは
`DEFAULT_TOOLBAR_LAYOUT` に含まれないので、既定 layout をそのまま使うホストでは
エントリを足すまでその図形は出てこない。

## 配線チェックリスト

**忘れられるのは headless の `./doc` 側である。**両方を機械的に潰すこと。

UI プラグイン（`somePlugin`）:

- [ ] `apps/canvas-examples/src/examples/plugins.tsx`
- [ ] `apps/vscode-extension/src/webview/canvasParser.ts`
- [ ] `apps/vscode-extension/src/webview/index.tsx`（`toolbarLayout`）
- [ ] `apps/canvas-examples/e2e/harness/main.tsx`（`plugins` と `toolbarLayout`）

headless doc プラグイン（`someDocPlugin`）:

- [ ] `apps/vscode-extension/src/diagnostics/DiagnosticProvider.ts`
- [ ] `packages/ai-docs/generator/src/manifest.ts`（`definitionSources`）

上記各パッケージの `package.json` にも依存を足すこと。`packages/canvas` が意図的に
入っていないのは、出荷プラグインに一切依存しないためである。足すと
`canvas → plugins → canvas-sdk → canvas` の循環が戻ってくる。

> **配線し忘れると何が起きるか**: パースはエラーにならない。結果は `kind: "ok"` の
> ままで、その型のオブジェクトが `root` から**黙って落ちる**（警告は出る）。
> テストで気付きにくいので、上のリストは目視ではなく機械的に潰す。この挙動は
> `plugins/sticky-shape/src/__tests__/stickyParseCheck.test.ts` で固定してある。

キャンバスを組み込んでいる下流の製品にも独自の配線がある。出荷図形セットに図形を
足すということは、そちらの更新も含む。

## 検証

```bash
pnpm lint --fix && pnpm format && pnpm typecheck && pnpm dep:check && pnpm lint
pnpm test
pnpm generate:ai   # packages/ai-docs/assets を再生成する。差分はコミットする
pnpm build:examples && pnpm build:vscode
pnpm --filter @jiscribe/plugin-<name> test:e2e             # その図形のスイートは全部回す
pnpm --filter @jiscribe/canvas test:e2e specs/smoke specs/shapes/draw
pnpm --filter canvas-examples test:e2e                     # プラグイン同居
```

図形を**移設**したときは、`pnpm generate:ai` が**無変化**であることが doc 定義を
忠実に移せた証拠になる。図形を**追加**したときは差分が新しいスキーマそのものなので、
コミットする（CI の `check:ai` が乖離で落ちる）。
