# @workspace/svg-canvas-2

svg-canvasの新しいバージョンです。

## 使い方

```tsx
import { SvgCanvas2 } from "@workspace/svg-canvas-2";

function App() {
	return <SvgCanvas2 width={800} height={600} />;
}
```

## 開発

```bash
# 型チェック
pnpm --filter @workspace/svg-canvas-2 typecheck

# Lint
pnpm --filter @workspace/svg-canvas-2 lint
```

## ドキュメント

設計ドキュメントは [docs/](./docs/README.md) に 9 本の柱で整理しています。

- [設計ドキュメント目次](./docs/README.md)
- [設計思想](./docs/01-design-philosophy.md) / [アーキテクチャ](./docs/02-architecture.md)
- [データモデルと永続化](./docs/03-data-model-and-persistence.md)
- [ジェスチャシステム](./docs/04-gesture-system.md) / [コマンドシステム](./docs/05-command-system.md)
- [状態更新フロー（Reducer）](./docs/06-state-update-flow.md)
- [外部同期・VSCode 連携](./docs/07-external-sync.md)
- [表示・テーマ](./docs/08-presentation-and-theme.md) / [テスト](./docs/09-testing.md)

AI 向けリファレンス:

- [Canvas Doc リファレンス](./ai/reference.md)
- [AI オーサリングガイド](./ai/ai-guide.md)
