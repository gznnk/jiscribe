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
