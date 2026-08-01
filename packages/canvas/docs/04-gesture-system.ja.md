> 🌐 English version: [04-gesture-system.md](./04-gesture-system.md)

# ジェスチャシステム

ポインタ／ホイールイベントを高レベルなジェスチャーに変換し、適切なハンドラへ振り分けるしくみ。
ジェスチャーが起こした状態変化がどう反映されるかは [状態更新フロー](./06-state-update-flow.ja.md) を参照。

## GestureRecognizer：pointer から gesture を認識

生の pointer / wheel イベントはキャンバスのルート（`Viewport`）に集約され、
`GestureRecognizer`（`controllers/gestures/recognizer/`）が `Gesture` に変換する。

`GestureType` は次の 9 種:

```
pressed | dragStart | drag | dragEnd | click | doubleClick | wheel | pinch | longPress
```

`Gesture` は SVG 座標とクライアント座標の両方（`start` / `last` / `delta`）、修飾キー
（`mods`）、ホバー要素（`getHovered()`：遅延評価＋メモ化のヒットテスト）、`targetId` / `targetKind`、
`inputValue`（`native-pointer` 要素の値）などを載せる。

ポイント:

- **click / doubleClick は排他**: 同一ターゲット（`(targetId, targetPart)` の組）を
  `DOUBLE_CLICK_THRESHOLD`（300ms）以内に連打すると、2 回目以降は `click` ではなく `doubleClick` になる。
  同一ターゲット内の別 part（同じメニューの別ボタン、コネクターの線とラベルボックス）は別のクリック対象。「シングル＝選択 /
  ダブル＝テキスト編集」のように**意味を変えたい**ケースのための意図的な設計で、
  オブジェクト／テキスト系ハンドラはこれに依存している（DOM 標準の加算式に変えると回帰リスクが大きい）。
- **RAF バッチ**: 高頻度な pointermove は `requestAnimationFrame` でまとめて 1 つの `drag` に集約し、
  毎フレーム以上の状態更新が走らないようにする（[設計思想](./01-design-philosophy.ja.md) の性能優先）。
- **2本指ピンチ（タッチ）**: 1本目のタッチがドラッグ確定する前に2本目の pointerdown が来ると、
  保留中の press を破棄してピンチモードに入る。`pinch` は `zoomScale`（指間距離比）と
  `scrollDelta`（中点移動）を載せ、1フレーム1発火に集約される（`settleBatch`）。
  キャンバスのパンドラッグ中は2本目で `dragEnd` を発火してパンを閉じ、ピンチへ移行する。
  図形ドラッグ中・シェイプ描画中およびマウス／ペンでは追加の pointerdown を単に無視する
  （パーム耐性、issue #25）。
- **タッチの長押し**: ドラッグ許容量内で `LONG_PRESS_DURATION_MS`（500ms）保持すると `longPress` が
  発火し、ジェスチャーを消費する（離しても click は出ない）。着地点を問わず CanvasEventHandler に
  ルーティングされ（per-target ハンドラは中/右ボタン同様 `isPerTargetInteraction` で拒否）、
  右クリック相当としてコンテキストメニューを開く。
- **タッチのパン**: `Gesture` は `pointerType` を持ち、CanvasEventHandler がタッチの1本指
  背景ドラッグをエリア選択ではなくビューポートのパン（GrabScroll パス）へルーティングする。
  タッチでのエリア選択は当面利用不可。またタッチでは背景の選択解除を `pressed` でなく
  タップ確定（`click`）まで遅延し、per-target ハンドラもタッチの press ではテキスト編集の
  コミットを同様に遅延する（`commitTextEditUnlessTouchPress`）。このためパンやピンチでは
  選択・開いたメニュー・編集中テキストが保持される（ピンチの指がオブジェクトや
  コントロールに乗っても同じ）。

## ハンドラ構成：canvas / controls / menu / objects

`handleGesture`（`controllers/gestures/handlers/handleGesture.ts`）がルーター。
`Gesture` を `CanvasEvent` に変換し（`wheel` は `ctrl` の有無で `zoom` / `scroll` に分岐、
`pinch` は `zoom` → `scroll` の順に分解）、
`gestureHandlerRegistry` 経由で対象ハンドラへ渡す。各ハンドラは `targetKind` で
自分が処理すべきイベントかを判定する。registry には `targetKind` ごとに 1 ハンドラだけを
登録する。さらに細かい分岐（`targetId` / `data-part` / イベント種）が要る kind では、
そのハンドラがルーターになり、同じフォルダ内のサブハンドラへ委譲する。

| ハンドラ群  | 対象                                                                       | 主なファイル                                                                                                                                                               |
| ----------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `canvas/`   | キャンバス全体（空白ドラッグ＝範囲選択、パン、ズーム）                     | `CanvasEventHandler.ts`                                                                                                                                                    |
| `controls/` | 変形コントロール（リサイズ・回転・頂点・接続）                             | `ControlEventHandler.ts`, `transform/`, `vertex/`, `connection/`                                                                                                           |
| `menu/`     | コンテキストメニュー・オブジェクトメニュー・ツールバー・図形ライブラリ     | `MenuEventHandler.ts`（ルーター）, `ContextMenuHandler.ts`, `ObjectMenuHandler.ts`, `ToolbarHandler.ts`, `StencilLibraryItemHandler.ts`, `StencilCategoryToggleHandler.ts` |
| `objects/`  | 図形・コネクター本体（移動・選択・テキスト編集起動・ラベル移動・線分移動） | `ObjectEventHandler.ts`, `ConnectorEventHandler.ts`（ルーター）, `ConnectorClickHandler.ts`, `ConnectorLabelDragHandler.ts`, `ConnectorSegmentDragHandler.ts`              |

`handleGesture` は `dragStart` で `eventStartSnapshot`（操作開始時の objects / keyPoints /
snapCandidates 等）を保存し、`dragEnd` でクリアする。`dragEnd` 時に doc が実際に変化していれば
`commitVersion` を進め、履歴記録のトリガにする（詳細は [状態更新フロー](./06-state-update-flow.ja.md)）。

`activeDragKind`（`"move"` / `"transform"` / `"other"`）も同じ `dragStart` / `dragEnd` の境界に従う。
`handleGesture` が全ドラッグを `"other"` で始めて `dragEnd` でクリアするので、`!== null` は常に
「ドラッグ中」を意味する。区別が必要なハンドラは自分の `dragStart` で上書きする
（`ObjectEventHandler` が `"move"`、`TransformControlHandler` が `"transform"`）。UI はこれを見て、
移動中は変形フレームと接続アンカーを、変形中は接続アンカーを隠し、ObjectMenu はドラッグ中すべてで隠す。

## 連携属性 `data-gesture` / `data-kind` / `data-id` / `data-part`

キャンバス上の DOM 要素は `data-*` 属性でジェスチャーシステムと連携する。
テキスト編集中の `textarea` やメニュー内の入力欄など、**ブラウザ標準動作をそのまま使いたい要素**を
宣言的に扱うための規約。

### `data-gesture`

ジェスチャーとの関わり方を宣言する。**空白区切りのトークンリスト**を取り、各トークンは
`[data-gesture~="token"]` で**祖先方向に `closest` 探索**される。

| トークン         | 意味                                                                                                                              | 主な付与先                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `none`           | ジェスチャーの起点にしない。pointerdown を無視し、contextmenu もネイティブに任せる                                                | テキスト編集の `textarea` ラッパー、メニュー内の数値・カラー入力、コンテキストメニューの callback 項目 |
| `native-pointer` | ジェスチャーには参加するが**ポインタキャプチャを行わない**。`inputValue` 収穫の対象にもなる                                       | スライダー（range input）                                                                              |
| `native-wheel`   | 要素がスクロール可能（`scrollHeight > clientHeight`）なら wheel をネイティブスクロールに任せる（Ctrl 押下時はズームのため対象外） | テキスト編集の `textarea`                                                                              |

併用例: `data-gesture="none native-wheel"`（ジェスチャー対象外かつネイティブスクロール）。

読み取り箇所:

- `none` → `isGestureOptedOut`（`GestureRecognizer.getHandlers()` の onPointerDown、`Canvas.tsx` の handleContextMenu）
- `native-pointer` → `isNativePointerTarget`（キャプチャ抑止と `inputValue` 収穫の対象判定。pointerdown 時に一度だけ判定し `Pressed` に保持）
- `native-wheel` → `shouldUseNativeWheel`（`useDocumentWheel`）

判定ユーティリティはいずれも `findGestureElement(target, token)` を土台にし、
`controllers/gestures/recognizer/utils/` に配置している。

### `data-kind` / `data-id` / `data-part`

ジェスチャーの**対象を識別する**属性。`getKindAndId` が `closest("[data-kind]")` で最も近い要素を探し、
`{ kind, id, part }` を解決してイベントの `targetKind` / `targetId` / `targetPart` に載せる。`part` はその要素
**自身または配下**の最も近い `[data-part]` から読む。これにより、ヒット領域を複数描く図形でも
`[data-kind]` 要素は 1 つに保てる（1 オブジェクト = 1 つの `data-kind="object"` 要素。e2e の
`captureObjects` がこの契約に依存している）。

3 属性はそれぞれ 1 軸を担い、`kind`（粗）→ `part` 接頭辞（細）の 2 段ルーティングツリーを成す（issue #81）:

| 属性        | 意味                                    | 文法                                                                  |
| ----------- | --------------------------------------- | --------------------------------------------------------------------- |
| `data-kind` | **ドメイン** — ハンドラ群と 1:1         | `object` / `connector` / `canvas` / `control` / `menu` のいずれか     |
| `data-id`   | **識別子** — どのターゲットか           | 実体の UUID、またはシングルトン部品名。**パースしない（コロン禁止）** |
| `data-part` | **サブ要素** — ターゲット内のどの部品か | `<subtype>[:<args...>]`。無印 = ターゲット本体そのもの                |

原則:

- ルーティングは `kind` → ハンドラ、`part` 接頭辞 → ストラテジ。`id` は lookup にだけ使い、決してパースしない
- 実体のサブタイプ（rect / connector / …）は DOM に書かず `objects[id].type` で解決する
- `part`（args 含む）は常に**サブ要素の識別子**であり、`id` が実体の識別子であることと対をなす。
  動詞に見える part（`set:fill:red`）は「fill を赤にするボタン」という部品名であって、
  part はコマンド伝達チャネルではない
- `data-kind` はジェスチャーハンドラを持つ要素にだけ付ける。「インタラクティブだが
  ジェスチャー対象外」はハンドラ無しの kind ではなく `data-gesture="none"` で表現する

例: コネクターのラベルボックスは `data-kind="connector" data-id={connectorId} data-part="label"`。
ラベルがあるコネクターは、線ではなくラベルボックスのダブルクリックだけがラベル編集を開始する。
ラベルボックスのドラッグは経路上の移動（`label.position` / `label.offset`）になり、
線から `SNAP_THRESHOLD_PX` 以内に落とすと `offset` は 0 に吸着する（Ctrl 押下で解除）。
ラベルが無いときは線のダブルクリックがクリック点（経路へ射影し同じ吸着をかけた位置）に
ラベルを作る。確定するまでは `textEditState` が保持し、コネクターには書き込まない。
複数スロットを持つ図形は入れ子の形を使う: `record` の `<g data-kind="object">` は
`data-part="name"` / `data-part="rows"` を持つ 2 つの区画矩形を包み、ダブルクリックした区画から
編集スロットを解決する（`resolveTextSlotId` が値を `state.text` のキーと照合する）。

#### 移行（issue #81）— 完了

上の文法は全面適用済み。menu 系 kind は `menu` に統合、control の id は実体 UUID（サブ要素は
`part`）、ハンドラ無しのマーカー kind は撤去した——テスト用フックだけが必要な要素は
`data-kind` / `data-id` ではなく `data-testid` を使う。

### なぜトークン化したか

旧実装はこの「ジェスチャーから逃がす」処理が 3 つの仕組み（各所の `e.stopPropagation()`、
`data-interactive`、`data-native-wheel`）に分散し、選択基準がマークアップから読めなかった。
関わり方は排他ではなく組み合わせ得る関心事（例: テキスト編集領域はジェスチャー対象外かつ
ネイティブホイールを使う）なので、空白区切りトークン + `closest` 探索に一本化した。

### 新しいインタラクティブ要素を追加するとき

1. ブラウザ標準の操作で完結する要素 → `data-gesture="none"`
2. ジェスチャー経由で値を伝えつつネイティブのポインタ挙動も必要 → `data-gesture="native-pointer"` + `data-kind` / `data-id`
3. スクロール可能で内部スクロールを優先したい → `data-gesture="native-wheel"`

## 反復ボタンは click と doubleClick を等価に扱う

ツールバーのズーム ± など、**同じボタンを連打して毎回実行したい**コントロールでは、
ハンドラ側で `click` と `doubleClick` の**両方**を実行トリガにする。

```ts
const isActivation = event.type === "click" || event.type === "doubleClick";
if (isActivation && event.targetId?.startsWith(COMMAND_PREFIX)) {
	return handleCommand(state, commandId);
}
```

理由は前述の排他仕様。反復コマンドボタンには「ダブルクリック固有の意味」が無いため、
`click` だけを拾うと連打時に 1 回おきにスキップする（2 回目が `doubleClick` として捨てられる）。
認識器の排他仕様はオブジェクト／テキスト系が依存しているので変えず、**消費側ハンドラで両者を
等価に扱う**ことで「N 連打＝N 実行」を局所的・低リスクに実現する。

- 該当: `controllers/gestures/handlers/menu/ToolbarHandler.ts`
- 関連定数: `DOUBLE_CLICK_THRESHOLD`（`recognizer/GestureRecognizerConstants.ts`）
  </content>
