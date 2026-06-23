# テスト

canvas のテストは **ユニット（vitest）→ E2E（Playwright）の 2 層** + 依存関係チェックで構成する。
純粋関数中心の設計（[設計思想](./01-design-philosophy.md) 原則 2）がこの構成を可能にしている。

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
（[アーキテクチャ](./02-architecture.md) の共配置方針）。

- 対象は `schemas` / `states` / `controllers` / `presentations` 各層
  （Mapper の往復変換、`validateXxxDoc`、Command の `execute`、変形ロジック、`canvasReducer` 経由の振る舞いなど）
- `vitest.config.ts` は `environment: "node"`。DOM を介さず入力 state → 出力 state を直接検証する
- 実行: `pnpm --filter @workspace/canvas test`（`vitest run`）。
  `test:coverage` / `test:ui` も用意（カバレッジは `index.ts` と `vitest.config.ts` を除外）

```
src/**/__tests__/**/*.{test,spec}.{ts,tsx}
```

### ファイル命名規則

| 形式                    | 用途                                                                 | 例                                 |
| ----------------------- | -------------------------------------------------------------------- | ---------------------------------- |
| `<SUT>.test.ts`         | デフォルト。テスト対象ファイルと 1:1 で co-located                   | `validateRectDoc.test.ts`          |
| `<SUT>.<facet>.test.ts` | 1 つの SUT が大きく、**観点（facet）ごとにファイルを分割**したいとき | `canvasReducer.coalescing.test.ts` |
| `<scenario>.test.ts`    | 特定の入口に紐づかない sociable な**回帰シナリオ**                   | `copyPasteDuplicateOrder.test.ts`  |

- `<facet>` は振る舞いの局面を表す名詞（`coalescing` / `undoRedo` / `externalSync` など）。
  **solitary な純粋関数テストでは facet 命名を使わない**（観点分割は sociable / 大きい SUT に限る）
- sociable テストは state 組み立て・dispatch・fixtures を担う `support/` を `__tests__/support/` に置く。
  `support/` の共通化は将来課題で、当面は **フォルダごとに重複を許容**する
  （`controllers/reducer/__tests__/support/` と `controllers/commands/__tests__/support/` は別物）

#### 主な sociable テスト

| 置き場所                          | 入口            | 検証する観点                                                                                                                          |
| --------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `controllers/reducer/__tests__/`  | `canvasReducer` | `coalescing`（履歴集約）/ `commitSources`（履歴記録源）/ `externalSync`（[外部同期](./07-external-sync.md)）/ `undoRedo`（Undo/Redo） |
| `controllers/commands/__tests__/` | `handleCommand` | コマンドの実経路（CommandRegistry 解決 + `canExecute` + `execute`）。例: コネクター選択時の StackOrder                                |

## E2E（Playwright）

実ブラウザ・実 UI 操作での非回帰テスト。`apps/canvas-demo/e2e/` に置く。

- `playwright.config.ts` が vite dev（port 5174）を `webServer` で自動起動。`testDir: e2e/specs`
- `support/CanvasDriver.ts` … 描画・選択・テキスト・色・コネクター操作の API。
  `support/selectors.ts` … `data-kind` / `data-id` セレクタ定数。`fixtures.ts` が CanvasDriver を注入
- `specs/` がテスト本体（CI ゲート）。カテゴリ: `arrange` / `driver` / `editing` / `keyboard` /
  `scenario` / `shapes` / `ui`（+ `smoke.spec.ts`）
- `e2e/demo/` は**マーケ素材生成用**のデモ（`testDir` 外）。回帰検知ではなくスクリーンショット／録画用で、
  重く flake しやすいため通常の CI ゲートから外し `test:e2e:demo` でのみ実行する
- 実行: `pnpm --filter canvas-demo test:e2e`（`:headed` / `:ui` / `:demo` あり）

設計方針: **失敗を隠すリトライは入れない**。CanvasDriver は時間待ちではなく状態待ち
（`expect.poll` 等）で安定させ、本当の不具合を隠さない。

ジェスチャー仕様の非回帰は [ジェスチャシステム](./04-gesture-system.md) と対応する
（`specs/shapes/basic-gestures.spec.ts` / `specs/editing/text-edit-gestures.spec.ts` 等）。

## 循環依存チェック（madge）

レイヤーの一方向依存（[アーキテクチャ](./02-architecture.md)）を機械的に担保するため、
madge で循環依存を検出する。

- 実行: `pnpm dep:circle`

## 一括実行（タスク完了時のチェック）

変更後は次を順に通す（プロジェクト共通の手順）。

```bash
pnpm lint --fix
pnpm format
pnpm build:demo
pnpm typecheck
pnpm lint
pnpm --filter @workspace/canvas test
```

</content>
