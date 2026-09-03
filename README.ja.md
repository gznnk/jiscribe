> 🌐 English version: [README.md](./README.md)

# Jiscribe

React 向けの SVG ダイアグラムキャンバスエンジン。

Jiscribe はドキュメントファーストで設計されている。ダイアグラムは利用側が所有する
ただの JSON 値（`.jis.json`）であり、キャンバスはそれを描画・編集する制御された
React コンポーネントにすぎない。JSON Schema と AI 向けリファレンスを同梱しているので、
LLM がそのまま読み書きできる形式でもある。

作図に必要なものは一式そろっている。コアが 8 つの基本型（`rect` / `ellipse` /
`text` / `polyline` / `polygon` / `group` / `connector` / `svg`）を受け持ち、
フローチャート・UML・付箋・Markdown・コンテナ・注釈・汎用ピクトグラムといった
図形セットはプラグインとして同梱される。プラグインが使う公開 API は、独自の図形を書くときに使うものと
まったく同じである。

jiscribe の製品群は、いずれもこのコアの上に載っている。

- **[Jiscribe Web](https://app.jiscribe.dev/)** — ブラウザで動くエディタ
- **[Jiscribe for VSCode](https://marketplace.visualstudio.com/items?itemName=gznnk.jiscribe)**
  — `.jis.json` を VSCode 上で開いて編集する拡張

> **ステータス: プレリリース。** 各パッケージはまだ npm に公開されておらず、公開 API も
> 変更される可能性がある。初回の npm 公開は GitHub Release として出すので、知りたい場合は
> このリポジトリを Watch（Custom → Releases）しておくこと。

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

**ドキュメント層は独立したパッケージ**の `@jiscribe/doc` である。React や DOM への
依存を一切持ち込まずに `.jis.json` の解析・検証・変換ができる層で、VSCode 拡張の
診断機能と AI 向けツールはこの層の上に構築されている。`@jiscribe/canvas` は
`@jiscribe/canvas/doc` として再エクスポートしており、そのパスを使ってきた利用側は
そのままでよい。

## リポジトリの構成

| パッケージ                   | 内容                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `@jiscribe/canvas`           | エンジン本体。描画、ジェスチャー、コマンド、状態                                    |
| `@jiscribe/doc`              | ヘッドレスなドキュメント層。`CanvasDoc` モデルとそのパーサー・編集 ops              |
| `@jiscribe/canvas-sdk`       | プラグイン作者向けの図形オーサリングキット。canvas の公開 API だけで書かれている    |
| `@jiscribe/geometry`         | 幾何型と幾何計算（矩形、楕円、変換、交差判定）                                      |
| `@jiscribe/markdown`         | Markdown 図形が使う Markdown レンダリング                                           |
| `@jiscribe/basic-validators` | プリミティブの実行時バリデーター                                                    |
| `@jiscribe/utility-types`    | 共有の TypeScript ユーティリティ型                                                  |
| `@jiscribe/doc-schema`       | 標準図形セットの生成済み JSON Schema と AI 向けリファレンス                         |
| `@jiscribe/ai-tools`         | AI が呼べるキャンバスツールの宣言（トランスポート非依存）                           |
| `@jiscribe/standard-shapes`  | 出荷図形セットの正本（doc 面 / presentation 面の 2 エントリ）                       |
| `@jiscribe/doc-tools`        | 標準セットに対する検証・計測・診断（Node 計測バックエンド込み）                     |
| `plugins/*`                  | 標準の図形セット — flowchart、UML、container、general、annotation、sticky、markdown |
| `apps/canvas-examples`       | 統合サンプル（1 サンプル = 1 ファイル）                                             |
| `apps/mcp`                   | MCP サーバー。stdio でツールを配り、ローカルにキャンバスビューアを立てる            |
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
pnpm test:e2e          # Playwright の全スイート（コア・各プラグイン・同居検証）
```

必要環境: Node.js 22+ と pnpm 11。

エンジンの設計ドキュメントは
[`packages/canvas/docs/`](./packages/canvas/docs/README.ja.md) にある。設計思想、
アーキテクチャ、データモデル、ジェスチャーシステム、コマンドシステム、状態更新フロー、
外部同期、テーマ、テスト、スタイルプロパティ、図形設計、プラグインアーキテクチャ、
プラグイン作成の 13 本を収録している。英語版は同じ場所に `*.md` として置いてある。

## コントリビュート

**Issue は歓迎する。Pull Request は事前に合意したものだけ受け付ける** — まず Issue を
立て、その変更を入れたいという返答を待ってほしい。理由と、それ以外にマージまでに必要な
ことは [CONTRIBUTING.ja.md](./CONTRIBUTING.ja.md#コントリビュートの受け付け方) にある。

コード内コメントの多くと一部の設計ドキュメントは日本語で書かれているが、Issue と
Pull Request は英語でも構わない。

## ライセンス

[MIT](./LICENSE) © gznnk
