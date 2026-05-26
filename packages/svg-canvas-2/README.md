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
