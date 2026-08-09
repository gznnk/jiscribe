> 🌐 English version: [CONTRIBUTING.md](./CONTRIBUTING.md)

# コントリビュートガイド

Jiscribe に興味を持ってくれてありがとう。このドキュメントは、変更をマージするまでに
必要なことをまとめたものである。

## セットアップ

```bash
pnpm install
pnpm dev:examples   # http://localhost:5174/
```

CI が使うのは Node.js 22 と pnpm 10。`npm` と `yarn` では動かない。これは pnpm
ワークスペースであり、パッケージ間は `workspace:*` で依存しているためである。

## Pull Request を出す前に

以下をすべて実行し、通ることを確認する。

```bash
pnpm lint --fix
pnpm format
pnpm typecheck
pnpm dep:check
pnpm lint
```

そのうえで、触った範囲に応じて次を実行する。

- **どのパッケージでも** — そのパッケージのユニットテストを流す:
  `pnpm --filter @jiscribe/canvas test`
- **挙動または描画**（`packages/canvas/src/{gestures,controllers,presentations,states}`）
  — スイート全体ではなく関連する e2e スペックだけを流す:
  `pnpm --filter @jiscribe/canvas test:e2e specs/shapes/connector`
- **図形または AI 向けメタデータ**（新しい図形、`ObjectFeatures`、`description`、
  `defaults`） — `pnpm generate:ai` で AI 向けアセットを再生成してコミットする。
  さもないと差分によって CI の `check:ai` が落ちる
- **アプリが利用するもの** — ビルドする: `pnpm build:examples` または
  `pnpm build:vscode`

e2e スイート全体は重い。`main` を対象とした Pull Request では CI が実行する。

## リンターが強制するアーキテクチャルール

これらはスタイルの好みではなく、違反すると ESLint がビルドを落とす。

- **プラグインは外部である。** `plugins/` 配下のパッケージが import してよいのは
  `@jiscribe/canvas`、`@jiscribe/canvas-sdk` と、それぞれの `/doc` エントリポイント
  だけ。`@jiscribe/canvas/unstable` や `src/` パスへの参照は拒否される。図形
  オーサリングでサポートされる唯一の窓口が `@jiscribe/canvas-sdk` である。
- **ドキュメント層はヘッドレスを保つ。** `packages/canvas/src/doc.ts`、`schemas/`、
  `docOps/`、および canvas-sdk とプラグインの同等の層は、`react`、`react-dom`、
  `@emotion/*`、presentation / controller / state の各層を import してはならない。
  これによってドキュメント層は VSCode 拡張ホストや Node プロセスの中でも動く。
- **import はパッケージルート経由で。** `@jiscribe/geometry` を使い、
  `@jiscribe/geometry/src/...` は使わない。
- **Doc↔State 境界で二重キャストをしない。** `packages/canvas/src/states` と
  `schemas` の配下では `as unknown as` を禁止している。代わりに `rebrand<T>()` を
  使うこと。

## 書く前に再利用する

幾何型と幾何計算は `@jiscribe/geometry` に属する。`Point`、`Rect`、`Frame`、
`Ellipse`、`Transform`、`BoundingBox`、距離・回転のヘルパー、アフィン変換、交差判定、
度数法とラジアンの変換、そしてそれらすべてのバリデーターが揃っている。ほかの場所に
新しい型や関数を足す前に `packages/geometry/src/` を確認すること。

## コードスタイル

- TypeScript は strict モード。`@typescript-eslint/no-explicit-any` は error
- 整形は Prettier が決める（タブ、ダブルクォート、80 桁）。`pnpm format` を実行する
- `if` の本体には必ずブレースを付ける（`curly: all`）

**命名。** 文脈なしで意味が伝わる名前を選ぶ。`obj` より `srcObj`、`id` より
`clonedId`。対になる概念は対称に保つ（`src`/`cloned`、`old`/`new`）。曖昧になるまで
省略せず、名前に型を繰り返さない（`idMap` ではなく `idRemap`）。バリデーターは戻り値
で命名する。`boolean` を返す述語は `is*`、`SemanticDiagnostic[]` を返す関数は
`validate*`。型ガードの引数名は `value` とする。

**コメント。** コードが語れないことを書く。制約、意図、自明でない理由である。コードを
言い換えない。設計を正当化しない。代替案と比較しない。ドキュメントに書いてあるなら、
要約せずに 1 行でリンクする。

**JSDoc。** 公開 API — パッケージの `index.ts` からエクスポートされるもの — は引数が
1 つしかなくても全パラメータを記述する。呼び出し側が実装を読まなくて済むようにする
ためである。各 `@param` には名前だけでは分からない情報を足す。単位、座標系、許容範囲、
デフォルト値、境界時の挙動（`NaN`、`-0`、空配列、退化した図形）、あるいはどの引数が
主語なのか。`@returns` は型だけでは足りないときにだけ書く。JSDoc はプロパティごとに
1 つ。2 つのプロパティで 1 つのコメントを共有すると、片方はエディタに何も表示されない。
境界ケースについて書いた主張は、実際に評価して裏を取ること。

このリポジトリのコメントは日本語で書かれている。英語でのコントリビュートは歓迎するが、
無関係な変更のついでに既存コメントを機械翻訳しないこと。

## コミットと Pull Request

コミットメッセージは [Conventional Commits](https://www.conventionalcommits.org/)
に従い、スコープは任意とする: `fix(canvas): ...`、`feat(vscode): ...`、
`refactor(geometry): ...`。件名は日本語でも英語でもよい。

対象ブランチは `main`。何をなぜ変えたのかを書き、どのチェックを実行したかを添えること。
