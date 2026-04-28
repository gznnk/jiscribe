# 性能改善候補レポート

調査日: 2026-04-28

---

## 高優先度（ドラッグ等の 60fps 操作に影響）

### 1. `handleObjectDrag` — 毎フレームで子孫 ID 収集と `Set` を再生成

**ファイル**: `controllers/gestures/handlers/objects/ObjectEventHandler.ts`

`dragStart`〜`dragEnd` の全フレームで `collectDescendantIds` + `Set` 生成を繰り返している。
`dragStart` 時に一度計算してキャッシュすれば十分。

```ts
// 現状: ドラッグの毎フレームで実行
const excludeIds = new Set(selectedIds);
for (const id of selectedIds) {
  for (const descendantId of collectDescendantIds(id, eventStartObjects)) {
    excludeIds.add(descendantId);
  }
}

// 改善案: dragStart 時に一度だけ計算してキャッシュ
```

---

### 2. `useKeyboardShortcuts` — `canvasState` が変わるたびにリスナーを再登録

**ファイル**: `controllers/hooks/useKeyboardShortcuts.ts`

`useEffect` の依存配列に `canvasState` があるため、ポインター移動のたびに
`addEventListener/removeEventListener` のペアが実行される。
`useRef` で最新値を保持して依存配列から外すのが定石。

```ts
// 現状
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (command.canExecute(canvasState)) { ... }
  };
  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, [canvasState, handleCommand]); // canvasState が変わるたびに再登録

// 改善案
const canvasStateRef = useRef(canvasState);
canvasStateRef.current = canvasState;

useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    const command = commandRegistry.findByShortcut(event);
    if (command && command.canExecute(canvasStateRef.current)) {
      handleCommand(command.id);
      event.preventDefault();
    }
  };
  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, [handleCommand]); // handleCommand のみ依存
```

---

### 3. `TransformControls` — 毎フレームでキーポイント計算 ×8 回 + カーソル計算

**ファイル**: `controllers/ui/controls/TransformControls/TransformControls.tsx`

`calcFrameKeyPoints`・`getResizeCursorForRotation`（8 回）などを `useMemo` なしで
毎レンダリング実行している。

```ts
// 改善案: useMemo でキャッシュ
const points = useMemo(
  () => calcFrameKeyPoints({ cx, cy, width, height, rotation, scaleX, scaleY }),
  [cx, cy, width, height, rotation, scaleX, scaleY],
);
const radians = useMemo(() => degreesToRadians(rotation), [rotation]);
const cursors = useMemo(() => ({
  topLeft: getResizeCursorForRotation(225, rotation, scaleX, scaleY),
  // ...8 項目
}), [rotation, scaleX, scaleY]);
```

---

### 4. `useMenuConfig` — `useMemo` の依存配列が `state` 全体で実質無効

**ファイル**: `controllers/ui/menu/ObjectMenu/hooks/useMenuConfig.ts`

`[state]` を依存にしているため、ビューポートスクロールやドラッグ中の位置更新でも
メモ化が無効化される。コード内にも「TODO: メモ化の意味がほぼない」とコメントあり。

```ts
// 現状
return useMemo(() => getMenuConfig(state), [state]);

// 改善案: 関係する部分だけを依存配列に絞る
const { selectedIds, objects } = state;
return useMemo(
  () => getMenuConfig(state),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [selectedIds, objects],
);
```

---

## 中優先度（選択・グループ操作時）

### 5. `collectDescendantIds` — スプレッドによる O(n²) 再帰連結

**ファイル**: `controllers/utils/collectDescendantIds.ts`

`results.push(...collectDescendantIds(...))` のパターンでネストが深いと二乗コスト。

```ts
// 現状
results.push(...collectDescendantIds(childId, objects));

// 改善案: result 配列を引数として渡す形に変更
export function collectDescendantIds(
  id: string,
  objects: Record<string, ObjectState>,
  result: string[] = [],
): string[] {
  const obj = objects[id];
  if (!obj || !isGroupState(obj)) return result;
  for (const childId of obj.childIds) {
    result.push(childId);
    collectDescendantIds(childId, objects, result);
  }
  return result;
}
```

---

### 6. `autoSelectParentGroups` — ループ内で `Array.includes()` 連発（O(m×n)）

**ファイル**: `controllers/gestures/handlers/objects/utils/autoSelectParentGroups.ts`

`every + includes` をループ内で呼んでいる。

```ts
// 現状 (O(m×n))
const allChildrenSelected =
  parent.childIds.every((childId) => currentSelectedIds.includes(childId));
if (!currentSelectedIds.includes(parentId)) { ... }

// 改善案: ループ前に Set 化
const selectedSet = new Set(currentSelectedIds);
const allChildrenSelected =
  parent.childIds.length > 0 &&
  parent.childIds.every((childId) => selectedSet.has(childId));
if (!selectedSet.has(parentId)) { ... }
```

---

### 7. `updateAffectedGroupBounds` — ソートのコンパレータ内で `getGroupDepth` を重複計算

**ファイル**: `controllers/ui/utils/updateAffectedGroupBounds.ts`

ソートのコンパレータは同じキーに対して複数回呼ばれるため、深さを重複計算する。

```ts
// 現状
const sortedGroupIds = Array.from(affectedGroupIds).sort((a, b) => {
  const depthA = getGroupDepth(state.objects, a); // sort のたびに再計算
  const depthB = getGroupDepth(state.objects, b); // sort のたびに再計算
  return depthB - depthA;
});

// 改善案: Schwartzian transform（ソート前に事前計算）
const withDepth = Array.from(affectedGroupIds).map((id) => ({
  id,
  depth: getGroupDepth(state.objects, id),
}));
withDepth.sort((a, b) => b.depth - a.depth);
const sortedGroupIds = withDepth.map((x) => x.id);
```

---

### 8. `handlePropertyUpdate` — `parsePropertyValue` をオブジェクト数×子孫数だけ重複呼び出し

**ファイル**: `controllers/utils/handlePropertyUpdate.ts`

同一 `property`/`value` に対してループ内で毎回呼んでいる。

```ts
// 改善案: ループ前に 1 回計算してキャッシュ
const parsedValue = parsePropertyValue(property, value);
// 以降のループでは parsedValue をそのまま使用
```

---

## 低優先度（細かな最適化・保守性）

### 9. `BringForward/SendBackward` 等 — `Array.includes()` → `Set.has()` に変更

**ファイル**:
- `controllers/commands/arrange/BringForwardCommand.ts`
- `controllers/commands/arrange/SendBackwardCommand.ts`
- `controllers/commands/arrange/BringToFrontCommand.ts`

ループ内や `filter` 内で `selectedIds.includes(id)` を繰り返している。
コマンド実行前に `new Set(state.selectedIds)` を作成して `.has()` で置き換える。

---

### 10. `CommandRegistry.findByShortcut` — キー操作ごとに全コマンドを線形探索

**ファイル**: `controllers/commands/CommandRegistry.ts`

コマンド登録時にショートカット→コマンドのルックアップマップを構築しておけば O(1) 検索が可能。

```ts
private shortcutMap = new Map<string, Command>();

register(command: Command): this {
  this.commands.set(command.id, command);
  const bindings = getPlatformShortcuts(command.shortcuts);
  for (const b of bindings) {
    const key = `${b.key}|${!!b.ctrl}|${!!b.shift}|${!!b.alt}|${!!b.meta}`;
    this.shortcutMap.set(key, command);
  }
  return this;
}

findByShortcut(event: KeyboardEvent): Command | undefined {
  const key = `${event.key.toLowerCase()}|${event.ctrlKey}|${event.shiftKey}|${event.altKey}|${event.metaKey}`;
  return this.shortcutMap.get(key);
}
```

---

### 11. `cleanupGroups` — `Array.from(groupsToProcess)` が不要

**ファイル**: `controllers/utils/cleanupGroups.ts`

`Set` は `for...of` で直接イテレートできるため `Array.from()` のコピーが無駄。

```ts
// 現状
for (const groupId of Array.from(groupsToProcess)) {

// 改善案
for (const groupId of groupsToProcess) {
```

---

### 12. `SelectionOverlay` — `flatMap` + `new Set` の二重走査

**ファイル**: `controllers/ui/feedback/SelectionOverlay/SelectionOverlay.tsx`

`flatMap` で中間配列を生成してから `new Set` でもう一度全要素をイテレートしている。

```ts
// 現状
const allIds = [
  ...selectedIds,
  ...selectedIds.flatMap((id) => collectDescendantIds(id, objects)),
];
const uniqueIds = [...new Set(allIds)];

// 改善案: 最初から Set に直接追加
const uniqueIds = new Set(selectedIds);
for (const id of selectedIds) {
  for (const desc of collectDescendantIds(id, objects)) {
    uniqueIds.add(desc);
  }
}
```

---

### 13. `ConnectionAnchors` — アンカー座標オブジェクトを毎レンダリングで新規生成

**ファイル**: `controllers/ui/controls/ConnectionAnchors/ConnectionAnchors.tsx`

`useMemo` で `anchors` 配列をキャッシュする。

```ts
const anchors = useMemo(() => {
  const points = calcFrameKeyPoints({ cx, cy, width, height, rotation, scaleX, scaleY });
  // ...計算...
  return [{ position: "topCenter", point: topCenterAnchor }, ...];
}, [cx, cy, width, height, rotation, scaleX, scaleY, zoom]);
```

---

## 優先度サマリー

| 優先度 | # | 問題 | 影響タイミング |
|--------|---|------|----------------|
| 高 | 1 | `handleObjectDrag` 毎フレームで子孫収集 | ドラッグ中 (60fps) |
| 高 | 2 | `useKeyboardShortcuts` 毎フレームでリスナー再登録 | 全操作中 |
| 高 | 3 | `TransformControls` 毎フレームでキーポイント計算×8 | ドラッグ中 (60fps) |
| 高 | 4 | `useMenuConfig` の `useMemo` が実質無効 | 全操作中 |
| 中 | 5 | `collectDescendantIds` O(n²) スプレッド | 削除・選択・描画時 |
| 中 | 6 | `autoSelectParentGroups` `includes` 連発 | エリア選択時 |
| 中 | 7 | `updateAffectedGroupBounds` ソートで深さを重複計算 | グループ移動時 |
| 中 | 8 | `handlePropertyUpdate` `parsePropertyValue` 重複呼び出し | プロパティ更新時 |
| 低 | 9 | Arrange コマンドの `includes` → `Set` | コマンド実行時 |
| 低 | 10 | `CommandRegistry.findByShortcut` 全コマンドスキャン | キー操作のたびに |
| 低 | 11 | `cleanupGroups` の `Array.from` 除去 | グループ操作時 |
| 低 | 12 | `SelectionOverlay` `flatMap` + `Set` の二重走査 | 選択時 |
| 低 | 13 | `ConnectionAnchors` アンカー毎レンダリング生成 | レンダリングのたびに |
