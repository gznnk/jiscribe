# テスト

svg-canvas-2 のテストは「純粋関数を node 環境で速く検証する」ことを軸に、
ユニット → 結合 → E2E の 3 層 + 依存関係チェックで構成する。
純粋関数中心の設計（[設計思想](./01-design-philosophy.md) 原則 2）がこの構成を可能にしている。

## ユニットテスト（vitest）

各層に **co-located** で `__tests__/` を置く。State + Mapper や Controller、検証関数など、
対象ファイルのすぐ隣にテストを配置する（[アーキテクチャ](./02-architecture.md) の共配置方針）。

- 対象は `schemas` / `states` / `controllers` / `presentations` 各層の純粋関数群
  （Mapper の往復変換、`validateXxxDoc`、Command の `execute`、変形ロジックなど）
- `vitest.config.ts` は `environment: "node"`。DOM を介さず入力 state → 出力 state を直接検証する
- 実行: `pnpm --filter @workspace/svg-canvas-2 test`（`vitest run`）。
  `test:coverage` / `test:ui` も用意（カバレッジは `index.ts` と `vitest.config.ts` を除外）

```
src/**/__tests__/**/*.{test,spec}.{ts,tsx}
```

## 結合テスト（vitest）

`controllers/reducer/__integration__/` に、`canvasReducer` 経由で複数ハンドラ・履歴を
またぐ振る舞いを検証するテストを置く。`support/`（`createTestState` / `dispatch` / `fixtures`）で
state の組み立てと dispatch を共通化する。

現在の 4 観点:

| ファイル                      | 検証内容                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `canvasReducer.coalescing`    | 連続操作の履歴集約（[状態更新フロー](./06-state-update-flow.md) の coalescing） |
| `canvasReducer.commitSources` | どの操作で `commitVersion` / 履歴が記録されるか                                 |
| `canvasReducer.externalSync`  | `SYNC_EXTERNAL` と saveNonce 折り返し（[外部同期](./07-external-sync.md)）      |
| `canvasReducer.undoRedo`      | Undo / Redo による状態復元                                                      |

```
src/**/__integration__/**/*.{test,spec}.{ts,tsx}
```

## E2E（Playwright）

実ブラウザ・実 UI 操作での非回帰テスト。`apps/svg-canvas-demo/e2e/` に置く。

- `playwright.config.ts` が vite dev（port 5174）を `webServer` で自動起動。`testDir: e2e/specs`
- `support/CanvasDriver.ts` … 描画・選択・テキスト・色・コネクター操作の API。
  `support/selectors.ts` … `data-kind` / `data-id` セレクタ定数。`fixtures.ts` が CanvasDriver を注入
- `specs/` がテスト本体（CI ゲート）。カテゴリ: `arrange` / `driver` / `editing` / `keyboard` /
  `scenario` / `shapes` / `ui`（+ `smoke.spec.ts`）
- `e2e/demo/` は**マーケ素材生成用**のデモ（`testDir` 外）。回帰検知ではなくスクリーンショット／録画用で、
  重く flake しやすいため通常の CI ゲートから外し `test:e2e:demo` でのみ実行する
- 実行: `pnpm --filter svg-canvas-demo test:e2e`（`:headed` / `:ui` / `:demo` あり）

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
pnpm --filter @workspace/svg-canvas-2 test
```

</content>
