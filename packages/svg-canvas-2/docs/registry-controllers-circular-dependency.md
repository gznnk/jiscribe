# `registry ↔ controllers` の循環依存

## 現状

`registry/` が `controllers/` の型に依存しており、アーキテクチャが想定する `controllers → registry` の一方向依存に反している。

```
registry/GestureHandlerRegistry.ts
  └─ import type { CanvasControllerState } from "../controllers/CanvasTypes"
registry/GestureHandlerRegistryTypes.ts
  └─ import type { CanvasControllerState } from "../controllers/CanvasTypes"
  └─ import type { ... } from "../controllers/gestures/recognizer/GestureRecognizerTypes"
registry/ObjectRegistryTypes.ts
  └─ import type { ObjectMenuConfig } from "../controllers/ui/menu/ObjectMenu/types/ObjectMenuConfig"
```

## 問題の本質

`GestureHandlerRegistry` は `CanvasControllerState` や `GestureRecognizerTypes` に本質的に依存しており、controller 層の概念を内包している。`ObjectRegistry`（data 層に依存）と同じ `registry/` に置く設計的な根拠が薄い。

`ObjectRegistryTypes` が `ObjectMenuConfig` を参照している点も、UI の関心事が registry 層に漏れている。

## 推奨する対応

**① `GestureHandlerRegistry` を `controllers/gestures/` 配下に移動（優先）**

`GestureHandlerRegistry` は実質 controller 層のコンポーネントであるため、`controllers/gestures/GestureHandlerRegistry.ts` として移動する。`registry/` は `ObjectRegistry` のみを持つシンプルな構成になる。

**② `ObjectMenuConfig` の移動**

`ObjectMenuConfig` を `schemas/` または独立した設定ファイルに切り出し、`ObjectRegistryTypes` が `controllers/` を参照しない構成にする。

## 対応のトリガー

- `registry/` パッケージを独立パッケージとして分割したいとき
- `GestureHandlerRegistry` に大きな変更が必要になったとき
