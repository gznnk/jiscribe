# 履歴（Undo/Redo）既知のバグ

調査日: 2026-05-16

svg-canvas-2 の履歴機能と、vscode-extension との統合における既知のバグを記録する。

---

## バグ 1 【最重大】Undo/Redo がファイルに保存されない

**関係ファイル:**
- `packages/svg-canvas-2/src/controllers/commands/history/UndoCommand.ts:44`
- `packages/svg-canvas-2/src/controllers/commands/history/RedoCommand.ts:53`
- `packages/svg-canvas-2/src/controllers/Canvas.tsx:97-103`

### 症状

キャンバス上で Ctrl+Z を押すと UI は過去の状態に戻るが、ファイルは更新されない。
そのままファイルを閉じて再オープンすると、undo が消滅して元の状態に戻ってしまう。

### 原因

`onCommit` は `lastCommitTime` が変化したときだけ呼ばれる：

```typescript
// Canvas.tsx:97-103
useEffect(() => {
    if (state.lastCommitTime > 0) {
        const doc = canvasToDoc(state);
        onCommit?.(doc);
    }
}, [state.lastCommitTime, onCommit]);
```

UndoCommand と RedoCommand は意図的に `lastCommitTime` を更新しない：

```typescript
// UndoCommand.ts:44 / RedoCommand.ts:53
lastCommitTime: state.lastCommitTime, // Don't update - this is history restoration, not a new commit
```

これは `recordHistoryIfNeeded` が undo/redo 操作を誤って history に積まないようにするための設計だが、
副作用として `onCommit` も呼ばれなくなる。

### 再現手順（VSCode 拡張機能）

1. 図形を描く → ファイルに保存（doc1）
2. キャンバスで Ctrl+Z → キャンバスは doc0 を表示するが `onCommit` は呼ばれない
3. ファイルは doc1 のまま
4. ファイルを閉じて再オープン → SYNC_EXTERNAL が doc1 で発火 → undo が消滅する

### 修正の方向性

`lastCommitTime`（history 記録トリガー）と `onCommit`（保存トリガー）を切り離す。
たとえば `lastUndoRedoTime` のような独立したフィールドを追加して、
`recordHistoryIfNeeded` は参照せず `onCommit` だけをトリガーする方法が考えられる。

---

## バグ 2 【高】SYNC_EXTERNAL が `future`（redo スタック）を常に消去する

**関係ファイル:**
- `packages/svg-canvas-2/src/controllers/reducer/canvasReducer.ts:67`

### 症状

外部変更（別エディタ、git 等）が来ると、その時点での redo スタックが失われる。

### 原因

```typescript
// canvasReducer.ts:64-68
history: {
    ...state.history,
    present: doc,
    future: [],  // 常にクリア
},
```

コメントには「外部変更後に古い状態へ redo されるのを防ぐ」とあるが、
undo 直後の future まで巻き込んで消してしまう。

### 再現手順

1. 図形を描く（past=[], present=doc1, future=[]）
2. undo → past=[], present=doc0, future=[doc1]
3. 外部から任意のファイル変更イベントが届く
4. SYNC_EXTERNAL 発火 → future=[] → **redo が失われる**

---

## バグ 3 【高】SYNC_EXTERNAL が直前の `present` を `past` に積まない

**関係ファイル:**
- `packages/svg-canvas-2/src/controllers/reducer/canvasReducer.ts:49-70`

### 症状

外部変更が来た時点の状態（present）が history に記録されず、
次の undo でその状態を飛ばしてさらに前の状態に戻ってしまう。

### 原因

SYNC_EXTERNAL は `present` を上書きするが `past` に積まない：

```typescript
// 外部変更前: past=[A, B], present=C, future=[]
// 外部変更後: past=[A, B], present=D, future=[]  ← C が消える
```

undo を押すと C を飛ばして B に戻る。

### 備考

VSCode 文脈では VSCode 自身がファイルの undo 履歴を管理しており、
VSCode の Ctrl+Z でファイルを戻せば SYNC_EXTERNAL 経由でキャンバスに反映される。
ただしキャンバス内部の history とは独立した管理になるため、
両方の undo スタックが噛み合わない状況が起きやすい。

---

## バグ 4 【中】外部変更が `pendingWebviewUpdates > 0` 中に来ると無視される

**関係ファイル:**
- `apps/vscode-extension/src/editor/JiscribeEditorProvider.ts:63-65`

### 症状

Webview → Extension への書き込み中（高頻度ドラッグ中など）に外部変更（git pull 等）が来ると、
その変更がキャンバスに反映されず、次のイベントまで不整合が続く。

### 原因

```typescript
if (pendingWebviewUpdates === 0) {
    this.updateWebview(webviewPanel, document);
}
```

無限ループ防止のカウンターが、外部変更の受信も抑制してしまう。
書き込みが完了するまでの間に来た外部変更はすべてサイレントに捨てられる。

---

## 構造的な背景

キャンバスには現在 **2 つの独立した undo スタック** が存在する：

| スタック | 管理者 | 対象 |
|---------|--------|------|
| VSCode の WorkspaceEdit undo | VSCode | ファイルの内容 |
| canvas の `history.past/future` | svg-canvas-2 | キャンバスの UI 状態 |

これらは独立しているため、一方での undo が他方に反映されない。
バグ 1〜3 はすべてこの二重管理に起因する。
