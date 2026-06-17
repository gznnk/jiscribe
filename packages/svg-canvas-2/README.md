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

- [アーキテクチャ](./docs/architecture.md)
- [Commands アーキテクチャ](./docs/commands.md)
- [ジェスチャー連携属性（data-gesture / data-kind / data-id）](./docs/gesture-attributes.md)
- [Canvas Doc リファレンス](./ai/reference.md)
- [AI オーサリングガイド](./ai/ai-guide.md)
- [Controller の変遷](./docs/controller-evolution.md)
