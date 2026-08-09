> 🌐 English version: [README.md](./README.md)

# Jiscribe

React 向けの SVG ダイアグラムキャンバスエンジン。[jiscribe](https://beta.jiscribe.dev)
の編集コアを、単体のライブラリとして切り出したもの。

Jiscribe はドキュメントファーストで設計されている。ダイアグラムは利用側が所有する
ただの JSON 値（`.jis.json`）であり、キャンバスはそれを描画・編集する制御された
React コンポーネントにすぎない。図形はコアにハードコードされておらず、フローチャート、
UML、付箋、Markdown なども含めてすべてプラグインとして提供される。それらが使う
公開 API は、独自の図形を書くときに使うものとまったく同じである。

> **ステータス: プレリリース。** 各パッケージはまだ npm に公開されておらず、公開 API も
> 変更される可能性がある。`0.1.0` のタグ付けを知りたい場合はリポジトリを Watch すること。

## まず動かす

```bash
pnpm install
pnpm dev:examples   # 統合サンプルのギャラリーが http://localhost:5174/ で起動する
```

エンジンの挙動を最短で確認する手段が `apps/canvas-examples` のギャラリーである。
各サンプルは 1 ファイルで完結しており、そのまま自分のアプリにコピーできる。

## キャンバスを使う

```tsx
import { Canvas } from "@jiscribe/canvas";
import type { CanvasDoc } from "@jiscribe/canvas";

const doc: CanvasDoc = { version: 1, root: [] };

export function App() {
	return <Canvas doc={doc} />;
}
```

プリミティブ以外の図形はプラグインから供給され、キャンバスごとに登録する。

```tsx
import { Canvas } from "@jiscribe/canvas";
import type { CanvasConfig } from "@jiscribe/canvas";
import { flowchartPlugin } from "@jiscribe/plugin-flowchart-shapes";
import { umlPlugin } from "@jiscribe/plugin-uml-shapes";

const config: CanvasConfig = { plugins: [flowchartPlugin, umlPlugin] };

export function App() {
	return <Canvas doc={doc} initialConfig={config} />;
}
```

`@jiscribe/canvas` は**ヘッドレスなドキュメント層**（`@jiscribe/canvas/doc`）も公開
している。React や DOM への依存を一切持ち込まずに `.jis.json` の解析・検証・変換が
できる層で、VSCode 拡張の診断機能と AI 向けツールはこの層の上に構築されている。

## リポジトリの構成

| パッケージ                   | 内容                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `@jiscribe/canvas`           | エンジン本体。描画、ジェスチャー、コマンド、状態、ドキュメントスキーマ              |
| `@jiscribe/canvas-sdk`       | プラグイン作者向けの図形オーサリングキット。canvas の公開 API だけで書かれている    |
| `@jiscribe/geometry`         | 幾何型と幾何計算（矩形、楕円、変換、交差判定）                                      |
| `@jiscribe/markdown`         | Markdown 図形が使う Markdown レンダリング                                           |
| `@jiscribe/basic-validators` | プリミティブの実行時バリデーター                                                    |
| `@jiscribe/utility-types`    | 共有の TypeScript ユーティリティ型                                                  |
| `@jiscribe/ai-docs`          | 標準図形セットの生成済み JSON Schema と AI 向けリファレンス                         |
| `plugins/*`                  | 標準の図形セット — flowchart、UML、container、general、annotation、sticky、markdown |
| `apps/canvas-examples`       | 統合サンプル（1 サンプル = 1 ファイル）                                             |
| `apps/vscode-extension`      | Jiscribe の VSCode 拡張                                                             |

`plugins/` ディレクトリは意図的に*外部*として扱っている。これらのパッケージは
`@jiscribe/canvas` と `@jiscribe/canvas-sdk` の公開 API しか使えず、それは ESLint で
強制されている。標準の図形がその制約で書けるなら、あなたの図形も書けるということである。

## 開発

```bash
pnpm install

pnpm dev:examples      # サンプルギャラリーを起動
pnpm build:examples    # サンプルギャラリーをビルド
pnpm build:vscode      # VSCode 拡張をビルド

pnpm lint              # ワークスペース全体の ESLint
pnpm typecheck         # ワークスペース全体の TypeScript
pnpm dep:check         # 循環依存チェック（madge）
pnpm format            # Prettier
pnpm test              # ユニットテスト（vitest）
pnpm test:e2e          # Playwright の e2e スイート全体
```

必要環境: Node.js 22（18 以上で動作）と pnpm 10。

エンジンの設計ドキュメントは
[`packages/canvas/docs/`](./packages/canvas/docs/README.ja.md) にある。設計思想、
アーキテクチャ、データモデル、ジェスチャーシステム、コマンドシステム、状態更新フロー、
外部同期、テーマ、テスト、スタイルプロパティ、図形設計、プラグインアーキテクチャ、
プラグイン作成の 13 本を収録している。英語版は同じ場所に `*.md` として置いてある。

## コントリビュート

[CONTRIBUTING.ja.md](./CONTRIBUTING.ja.md) を参照のこと。Issue と Pull Request を歓迎する。
コード内コメントの多くと一部の設計ドキュメントは日本語で書かれているが、Issue と
Pull Request は英語でも構わない。

## ライセンス

[MIT](./LICENSE) © gznnk
