# @workspace/canvas

jiscribe の SVG キャンバス実装です。

## 使い方

```tsx
import { Canvas } from "@workspace/canvas";
import type { CanvasDoc } from "@workspace/canvas";

const initialDoc: CanvasDoc = { version: 1, root: [], connectors: [] };

function App() {
	return <Canvas doc={initialDoc} />;
}
```

## 開発

```bash
# 型チェック
pnpm --filter @workspace/canvas typecheck

# Lint
pnpm --filter @workspace/canvas lint
```

## ドキュメント

設計ドキュメントは [docs/](./docs/README.md) に 11 本の柱で整理しています。

- [設計ドキュメント目次](./docs/README.md)
- [設計思想](./docs/01-design-philosophy.md) / [アーキテクチャ](./docs/02-architecture.md)
- [データモデルと永続化](./docs/03-data-model-and-persistence.md)
- [ジェスチャシステム](./docs/04-gesture-system.md) / [コマンドシステム](./docs/05-command-system.md)
- [状態更新フロー（Reducer）](./docs/06-state-update-flow.md)
- [外部同期・VSCode 連携](./docs/07-external-sync.md)
- [表示・テーマ](./docs/08-presentation-and-theme.md) / [テスト](./docs/09-testing.md)
- [スタイルプロパティシステム](./docs/10-style-properties.md)
- [図形の設計判断](./docs/11-shape-design.md)

AI 向けリファレンス:

- [Canvas Doc リファレンス](../ai-docs/assets/reference.md)
- [AI オーサリングガイド](../ai-docs/assets/ai-guide.md)
