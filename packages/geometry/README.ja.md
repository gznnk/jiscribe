> 🌐 English version: [README.md](./README.md)

# @workspace/geometry

jiscribe 全体で共有する幾何型と幾何計算。依存なし・純関数のみで、描画も
フレームワークも状態も持たない。

## 使い方

```typescript
import type { Point, TransformedFrame } from "@workspace/geometry";
import { calcFrameKeyPoints, isPoint } from "@workspace/geometry";

const frame: TransformedFrame = {
	cx: 50,
	cy: 30,
	width: 100,
	height: 60,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
};

const keyPoints = calcFrameKeyPoints(frame);
```

すべてパッケージルートから再エクスポートしているため、`src/` を直接参照せず
`@workspace/geometry` から import する。

## 収録内容

| ディレクトリ     | 内容                                                               |
| ---------------- | ------------------------------------------------------------------ |
| `src/types`      | `Point`, `Rect`, `Frame`, `Ellipse`, `Transform`, `KeyPoints` など |
| `src/geometry`   | バウンディングボックス、キーポイント、交差判定、図形変換           |
| `src/points`     | 距離、回転、輪郭上の交点、曲線サンプリング                         |
| `src/transform`  | アフィン変換とその逆変換                                           |
| `src/common`     | 角度変換と小さな数値ユーティリティ                                 |
| `src/constants`  | `EPSILON`                                                          |
| `src/validators` | 実行時の型ガード                                                   |

このパッケージを使う前に押さえておきたい契約が 2 つある。

- `Transform.rotation` は**度数法**だが、角度を直接受け取る関数は**ラジアン**
  （`angleRad`）を使う。`degreesToRadians` で変換すること。
- `Transform.scaleX` / `scaleY` は拡大縮小係数ではなく**反転フラグ**（`1 | -1`）。
  寸法は `width` / `height` が持つ。

## 開発

```bash
pnpm --filter @workspace/geometry typecheck
pnpm --filter @workspace/geometry lint
pnpm --filter @workspace/geometry test
```

## ドキュメント

- [命名規則とディレクトリ構造](./docs/naming-and-structure.ja.md)
- [幾何型定義](./docs/types.ja.md)
