> 🌐 English version: [09-testing.md](./09-testing.md)

# テスト

canvas のテストは **ユニット（vitest）→ E2E（Playwright）の 2 層** + 依存関係チェックで構成する。
純粋関数中心の設計（[設計思想](./01-design-philosophy.ja.md) 原則 2）がこの構成を可能にしている。

## ユニット/E2E の線引き（デトロイト派）

「ユニットか統合か」を**コードの粒度**（1 関数か、複数モジュールか）では分けない。
デトロイト派（古典派）の定義に従い、次の 3 条件を満たすものをユニットテストと呼ぶ。

1. **振る舞いの単位**（unit of behavior）を検証する — コードの単位ではない
2. **速く**実行できる
3. **他テストから隔離**されている（共有可変状態を持たない）

分ける軸は**プロセス境界**である。実 DOM・ブラウザ・ファイルシステム・ネットワーク等の
**out-of-process な依存を跨いだら統合（E2E）**、跨がなければユニット。
複数の本物のコラボレータ（Command / Registry / `canvasReducer` など）を束ねて 1 つの振る舞いを
検証しても、インプロセスで速く決定的なら**それはユニットテスト**である。

- **solitary（単体）** … 1 つの純粋関数を単独で検証する（Mapper の往復、`validateXxxDoc` など）
- **sociable（社交的）** … 本物のコラボレータを束ねて入口経由の振る舞いを検証する
  （`canvasReducer` 経由の Undo/Redo、`handleCommand` 経由のコマンド実経路など）

solitary も sociable も**同じユニット層**であり、フォルダでは区別しない（どちらも `__tests__/`）。

## ユニットテスト（vitest）

各層に **co-located** で `__tests__/` を置く。State + Mapper や Controller、検証関数、
および sociable な振る舞いテストを、対象ファイルのすぐ隣に配置する
（[アーキテクチャ](./02-architecture.ja.md) の共配置方針）。

- 主な対象は `states` / `controllers` / `rendering` 各層
  （Mapper の往復変換、Command の `execute`、変形ロジック、`canvasReducer` 経由の振る舞いなど）。
  `src/` の外にあるビルド時ヘルパー（`build/`）も同じく `__tests__/` に持つ。
  拾うファイルは `vitest.config.ts` の `include` が正本。
  Doc モデル自体のテスト（`validateXxxDoc`・パーサー・doc ops）は `@jiscribe/doc` にあり、`pnpm --filter @jiscribe/doc test` で走る
- 既定の環境は `environment: "node"` で、DOM を介さず入力 state → 出力 state を直接検証する。
  DOM API が要るテスト（React の hook・コンポーネントを描いて確かめるものなど）だけは、
  ファイル先頭の `// @vitest-environment jsdom` で jsdom に切り替える
  （例: `controllers/hooks/__tests__/useSyncExternalDoc.test.tsx`・`controllers/__tests__/CanvasThumbnail.test.tsx`）。
  jsdom はインプロセスの模擬 DOM なので、これもユニット層に入る
- 実行: `pnpm --filter @jiscribe/canvas test`（`vitest run`）。
  `test:coverage` / `test:ui` も用意（カバレッジの除外対象は `vitest.config.ts` の `coverage.exclude` 参照）

### ファイル命名規則

| 形式                    | 用途                                                                 | 例                                 |
| ----------------------- | -------------------------------------------------------------------- | ---------------------------------- |
| `<SUT>.test.ts`         | デフォルト。テスト対象ファイルと 1:1 で co-located                   | `validateRectDoc.test.ts`          |
| `<SUT>.<facet>.test.ts` | 1 つの SUT が大きく、**観点（facet）ごとにファイルを分割**したいとき | `canvasReducer.coalescing.test.ts` |
| `<scenario>.test.ts`    | 単一の SUT ファイルに帰属しない sociable な**横断的回帰シナリオ**    | `copyPasteDuplicateOrder.test.ts`  |

- `<facet>` は振る舞いの局面を表す名詞（`coalescing` / `undoRedo` / `externalSync` など）。
  **solitary な純粋関数テストでは facet 命名を使わない**（観点分割は sociable / 大きい SUT に限る）
- `<SUT>` 命名と `<scenario>` 命名の使い分けは**入口の有無ではなく、ファイル名が指す主語**で決める。
  ファイル名が単一 SUT の契約を指すなら `<SUT>(.<facet>)`、複数モジュールに跨る不変条件を指すなら `<scenario>`。
  scenario テストが特定の入口（`handleCommand` 等）を通っていてもファイル名に入口は冠しない
  — 落ちたとき開くべきは入口ではなく不変条件を実装する側であり、入口が複数のこともある
  （例: `copyPasteDuplicateOrder` は `handleCommand` と `handlePaste` の両方を叩く）。
  入口はフォルダ位置（下表）とテスト先頭の doc コメントで示す
- 入口そのものの契約（`handleCommand` なら Registry 解決・`canExecute` ゲートなど）をテストする場合は、
  scenario 命名にせず、通常どおり入口を SUT とする命名に乗せる
  （例: `canvasReducer` の契約は `canvasReducer.<facet>.test.ts`）
- sociable テストは state 組み立て・dispatch・fixtures を担う `support/` を `__tests__/support/` に置く。
  `support/` の共通化は将来課題で、当面は **フォルダごとに重複を許容**する
  （`controllers/reducer/__tests__/support/` と `controllers/commands/__tests__/support/` は別物）

#### 主な sociable テスト

| 置き場所                          | 入口            | 検証する観点                                                                                                                             |
| --------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `controllers/reducer/__tests__/`  | `canvasReducer` | `coalescing`（履歴集約）/ `commitSources`（履歴記録源）/ `externalSync`（[外部同期](./07-external-sync.ja.md)）/ `undoRedo`（Undo/Redo） |
| `controllers/commands/__tests__/` | `handleCommand` | コマンドの実経路（CommandRegistry 解決 + `canExecute` + `execute`）。例: コネクター選択時の StackOrder                                   |

## E2E（Playwright）

実ブラウザ・実 UI 操作での非回帰テスト。図形を持つパッケージがその spec を持つため、
スイートは**パッケージごと**に分かれている（canvas・`plugins/*` の各プラグイン・canvas-examples）。

| スイート         | 置き場所                    | 守備範囲                                                                                         |
| ---------------- | --------------------------- | ------------------------------------------------------------------------------------------------ |
| canvas           | `packages/canvas/e2e/`      | コアの振る舞い（ジェスチャー・選択・変形・テキスト編集・コネクター・整列・ツールバーとメニュー） |
| 各図形プラグイン | `plugins/<name>/e2e/`       | そのパッケージの図形だけ                                                                         |
| プラグイン同居   | `apps/canvas-examples/e2e/` | 出荷プラグインを全部 1 つのキャンバスに同居させたときだけ起きること、と出荷フォントが要る検証    |

どのスイートも構成は同じで、後述の共有キットに乗っている。

```
<package>/
├── playwright.config.ts     # createCanvasPlaywrightConfig の呼び出し
└── e2e/
    ├── harness/             # index.html + main.tsx（mountPluginHarness）+ vite.config.ts
    └── specs/
```

- `playwright.config.ts` がハーネス（`Canvas` をマウントする最小 Vite アプリ）を
  `webServer` で自動起動する。ポートは実行ごとに OS の ephemeral 範囲から取るので、
  複数スイートを同時に走らせられる。拡張子が `.mts` でないのは、Playwright が config を
  CommonJS へトランスパイルするため。ESM の config ではキットの名前付き export を受け取れない
- **canvas のハーネスは出荷プラグインを 1 つも登録しない。**載せるのは
  `e2e/plugins/specShapesPlugin.tsx` だけで、これはコアが自前では持たなくなった性質を
  供給するテスト専用の代役である。型ごとに性質を受け持つ（例: `tile` = カテゴリフライアウトに
  出るドラッグ描画型、`pin` = クリック配置型、`card` = `<g>` ルートでテキストスロットを持つ型、
  `panel` = 作成時の既定値を自前で宣言する型。一覧は同ファイルの `specShapesPlugin`）。
  出荷図形を題材にしていたコアの spec はこちらを叩く
- **プラグインのハーネスはそのプラグインだけを載せる。**単独ロードで通ること自体が、
  他プラグインへの暗黙依存が無いことの検証になる
- **canvas-examples のハーネスは出荷プラグインを全部載せる**（`e2e/harness/main.tsx` の `plugins`）。
  見るのは「全部載せたときに初めて壊れるもの」（例: ObjectType の登録衝突・ツールバーの重複・
  `<defs>` の id 衝突。`specs/plugin-coexistence.spec.ts`）と、出荷フォントを読み込むのが
  このハーネスだけであるために、ここでしか確かめられない PNG 書き出しのフォント埋め込み
  （`specs/png-font-embedding.spec.ts`）。個々の図形の描画・編集は各プラグインのスイートの持ち分。
  ここに置いて循環が生まれないのは、canvas と出荷プラグインすべてに依存していて、かつ
  どこからも依存されていない（依存グラフの頂点）から
- `support/CanvasDriver.ts` … 描画・選択・テキスト・色・コネクター操作の API。
  `support/selectors.ts` … `data-kind` / `data-id` セレクタ定数。`fixtures.ts` が CanvasDriver を注入。
  3 つとも canvas にあり、他スイートへはキット経由で届く
- canvas の `specs/` はフォルダで機能領域を分けている。分け方と新しい spec の置き場所は
  [`e2e/specs/README.md`](../e2e/specs/README.md) にある
- 実行: `pnpm --filter @jiscribe/canvas test:e2e`（`:headed` / `:ui` あり）/
  `pnpm --filter @jiscribe/plugin-sticky-shape test:e2e` / `pnpm --filter canvas-examples test:e2e`

設計方針: **CanvasDriver に失敗を隠すリトライは入れない**。時間待ちではなく状態待ち
（`expect.poll` 等）で安定させ、操作が効かなければそのままテストを落として本当の不具合を隠さない。
Playwright のテスト単位のリトライは、共有キットの `createCanvasPlaywrightConfig` が CI でだけ
有効にしている（ローカル実行ではリトライしない）。

ジェスチャー仕様の非回帰は [ジェスチャシステム](./04-gesture-system.ja.md) と対応する
（`specs/shapes/basic-gestures.spec.ts` / `specs/editing/text-edit-gestures.spec.ts` 等）。

### 共有キット

実装は canvas の `e2e/kit/` にあり、**スイートの 1 ファイルにつき 1 エントリ**で
公開している。プラグインは同じキットを `@jiscribe/canvas-sdk` 経由で取る。

| スイート内のファイル         | canvas のエントリ                            | プラグインのエントリ                             |
| ---------------------------- | -------------------------------------------- | ------------------------------------------------ |
| spec ファイル                | `@jiscribe/canvas/testing`                   | `@jiscribe/canvas-sdk/testing/e2e`               |
| `playwright.config.ts`       | `@jiscribe/canvas/testing/playwright-config` | `@jiscribe/canvas-sdk/testing/playwright-config` |
| `e2e/harness/vite.config.ts` | `@jiscribe/canvas/testing/vite-config`       | `@jiscribe/canvas-sdk/testing/vite-config`       |
| `e2e/harness/main.tsx`       | `@jiscribe/canvas/testing/harness`           | `@jiscribe/canvas-sdk/testing/harness`           |

分けてあるのは、これらのファイルがそれぞれ別のランタイムに読まれ、互いの import を
許さないからである。

- spec 用エントリを import すると Playwright の fixture が登録される。これは他のローダーの
  下では例外になる（`playwright.config.ts` を含む）
- vite 設定用エントリを Playwright 設定用エントリから分けてあるのは、Playwright が
  CommonJS へトランスパイルする config の読み込みが、ESM のみで配布される vite を
  `require()` せずに済むようにするため
- ハーネス用エントリはブラウザコードである。残りは `@playwright/test`・
  `node:child_process`・vite に手を伸ばしており、いずれもページにはバンドルできない

API は `createCanvasPlaywrightConfig` / `createPluginHarnessViteConfig` /
`mountPluginHarness` と、spec 側の `test` / `expect` / `CanvasDriver` / `selectors` など
（引数は `e2e/kit/` の各ファイル参照）。canvas 自身はキットを相対 import で
取る（`./e2e/testing-playwright-config`）。SDK 経由にはしない — `canvas → canvas-sdk → canvas`
の循環こそ、この分離で解消したものだからである。プラグインのスイートを立ち上げる手順は
[プラグインの作り方](./13-authoring-plugins.ja.md) にある。

## 循環依存チェック（madge）

madge（`dep:check` = `madge --circular`）でモジュールグラフの循環を検出する。
見るのは循環だけで、レイヤーの一方向依存（[アーキテクチャ](./02-architecture.ja.md)）に
逆らう import は、循環を作らない限り捕まえない。そちらはリポジトリルートの
`eslint.config.js` が `no-restricted-imports` で禁じている（`controllers/` 内の下の層から
上の層への値の import と、`rendering/` から `controllers/` への値の import。型の import は許す）。

- 実行: `pnpm dep:check`（ワークスペース全体）/ `pnpm --filter @jiscribe/canvas dep:check`（canvas のみ）。
  レイヤーの逆依存は `pnpm lint` で落ちる
- CI の checks ジョブでも `pnpm dep:check` と `pnpm lint` が走る

## 一括実行（タスク完了時のチェック）

変更後は次を順に通す（プロジェクト共通の手順）。

```bash
pnpm lint --fix
pnpm format
pnpm build:examples
pnpm typecheck
pnpm dep:check
pnpm lint
pnpm --filter @jiscribe/canvas test
```
