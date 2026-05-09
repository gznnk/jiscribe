# Jiscribe VSCode Extension

VSCode拡張機能で`.jis.json`ファイルをSVGキャンバスエディタで開くことができます。

## 機能

- `.jis.json`ファイル用のカスタムエディタ
- SVGキャンバスのビジュアル編集
- ファイル変更の自動検知とキャンバスへの反映
- リアルタイムプレビュー

## 開発

### ビルド

```bash
# ルートディレクトリから
pnpm build:vscode

# または拡張機能ディレクトリで
pnpm build
```

### 監視モード

```bash
# ルートディレクトリから
pnpm watch:vscode

# または拡張機能ディレクトリで
pnpm watch
```

### 拡張機能のテスト

1. VSCodeでこのプロジェクトを開く
2. `F5`を押して拡張機能開発ホストを起動
3. `.jis.json`ファイルを開く
4. カスタムエディタでキャンバスが表示される

## 使い方

1. `.jis.json`拡張子のファイルを作成
2. ファイルを開くと自動的にJiscribe Canvas Editorが起動
3. キャンバス上で図形を編集
4. 変更は自動的にファイルに保存される

## ファイル形式

`.jis.json`ファイルはSVGキャンバスデータをJSON形式で保存します:

```json
{
  "diagrams": [],
  "viewport": {
    "x": 0,
    "y": 0,
    "zoom": 1
  }
}
```

## トラブルシューティング

### ビルドエラー

- `pnpm install`を実行して依存関係を更新
- `pnpm build:vscode`で再ビルド

### 拡張機能が起動しない

- VSCodeを再起動
- 拡張機能開発ホストを再起動（F5）

## TODO

### KaTeX CSS の組み込み

Webview で数式（KaTeX）を正しくレンダリングするには、KaTeX の CSS とフォントファイルを Webview に読み込ませる必要がある。

現状は未対応のため、数式のレイアウトが崩れる可能性がある。

対応方針（2択）：

**① esbuild でバンドル（推奨・オフライン対応）**
1. `src/webview/index.tsx` に `import "katex/dist/katex.min.css"` を追加
2. `build.mjs` の webview ビルド設定に CSS ローダーを追加し、KaTeX フォント（`node_modules/katex/dist/fonts/`）を `dist/fonts/` にコピーするステップを追加
3. `JiscribeEditorProvider.ts` の `getHtmlForWebview` に `<link rel="stylesheet">` タグを追加
4. CSP に `font-src ${webview.cspSource}` を追加（すでに含まれている場合は確認のみ）

**② CDN から読み込む（実装が簡単・要インターネット）**
1. `getHtmlForWebview` の `<head>` に以下を追加：
   ```html
   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex/dist/katex.min.css">
   ```
2. CSP の `style-src` と `font-src` に `https://cdn.jsdelivr.net` を追加

