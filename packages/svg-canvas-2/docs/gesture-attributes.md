# ジェスチャー連携属性（data-gesture / data-kind / data-id）

キャンバス上の DOM 要素は `data-*` 属性を通じてジェスチャーシステム（`GestureRecognizer`）と連携する。本ドキュメントはその規約をまとめる。

## 背景

ポインタ／ホイールイベントはキャンバスのルート要素（`Viewport`）に集約され、`GestureRecognizer` がドラッグ・クリック・スクロール・ズームなどのジェスチャーに変換する。一方で、テキスト編集中の `textarea` やメニュー内の入力欄・スライダーなど、**ブラウザ標準の動作をそのまま使いたい要素**も存在する。

以前はこの「ジェスチャーシステムから逃がす」処理が 3 つの仕組み（各コンポーネントでの `e.stopPropagation()`、`data-interactive="true"`、`data-native-wheel="true"`）に分散しており、選択基準が読み取りづらかった。これを `data-gesture` 属性に一本化した。

## `data-gesture`

ジェスチャーシステムとの関わり方を宣言する属性。**空白区切りのトークンリスト**を取り、各トークンは `[data-gesture~="token"]` セレクタで **祖先方向に `closest` 探索**される（`data-kind` と同じ規約）。

| トークン         | 意味                                                                                                                            | 主な付与先                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `none`           | ジェスチャーの起点にしない。pointerdown は無視され、contextmenu もネイティブに任せる                                            | テキスト編集の `textarea` ラッパー、メニュー内の数値入力・カラー入力、コンテキストメニューの callback 項目 |
| `native-pointer` | ジェスチャーには参加するが**ポインタキャプチャを行わない**。`inputValue` 収穫の対象にもなる                                     | スライダー（range input）                                                                                  |
| `native-wheel`   | 要素がスクロール可能（`scrollHeight > clientHeight`）なら wheel をネイティブスクロールに任せる。Ctrl 押下時はズームのため対象外 | テキスト編集の `textarea`                                                                                  |

複数トークンの併用例: `data-gesture="none native-wheel"`（ジェスチャー対象外かつネイティブスクロール）。

### 各トークンの読み取り箇所

- `none` → `isGestureOptedOut`。`GestureRecognizer.getHandlers()` の onPointerDown と `Canvas.tsx` の handleContextMenu で参照
- `native-pointer` → `shouldSkipPointerCapture`（ポインタキャプチャの抑止）と `getInputValue`（値の収穫）
- `native-wheel` → `shouldUseNativeWheel`。`useDocumentWheel` で参照

判定ユーティリティはいずれも `findGestureElement(target, token)` を土台にしており、`packages/svg-canvas-2/src/controllers/gestures/recognizer/utils/` に配置している。

## `data-kind` / `data-id`

ジェスチャーの**対象を識別する**ための属性。`getKindAndId` が `closest("[data-kind]")` で最も近い要素を探し、`{ kind, id }` を解決してジェスチャーイベントに載せる。各 GestureHandler は `targetKind` で自分が処理すべきイベントかを判定する（例: `targetKind === "object-menu"` → `ObjectMenuHandler`）。

`data-id` のフォーマット例（ObjectMenu）:

- `object-menu:toggle:{sectionId}` — セクション開閉
- `object-menu:set:{property}:{value}` — プロパティ更新
- `object-menu:slider:{property}` — スライダー更新
- `object-menu:command:{commandId}` — コマンド実行

## 設計上の判断メモ

- **トークン化した理由**: 「ジェスチャーとの関わり方」は排他ではなく組み合わせ得る関心事（例: テキスト編集領域はジェスチャー対象外であり、かつネイティブホイールを使う）。単一の enum 属性より空白区切りトークンが素直。
- **`closest` 探索に統一した理由**: 旧 `data-interactive` は `target.getAttribute` 直接参照で、イベントターゲット自身に属性が無いと効かなかった。子要素で発火したイベントでも親の宣言が効くよう `closest` に揃えた。
- **`native-pointer` が 2 つの意味を持つ点**: 「キャプチャ抑止」と「値収穫」を兼ねる。現状の付与先がスライダーのみで分離の必要が薄いため 1 トークンにまとめている。将来分離が必要になればトークンを追加する。
- **`stopPropagation` を撤廃した理由**: 各コンポーネントが個別に伝播を止める方式は、どの要素がなぜジェスチャーから外れるのかがマークアップから読めなかった。`data-gesture="none"` で宣言的に表現し、判定をレコグナイザ側に集約した。

## 新しいインタラクティブ要素を追加するとき

1. ブラウザ標準の操作（テキスト入力・クリック等）で完結する要素 → `data-gesture="none"`
2. ジェスチャー経由で値を伝えたいが、ネイティブのポインタ挙動（ドラッグ等）も必要な要素 → `data-gesture="native-pointer"` + `data-kind` / `data-id`
3. スクロール可能で、その内部スクロールを優先したい要素 → `data-gesture="native-wheel"`
