> 🌐 English version: [01-design-philosophy.md](./01-design-philosophy.md)

# 設計思想

canvas のコードを読む・書くうえでの判断基準。実装の細部で迷ったときは、
この 4 つの原則に立ち返って判断する。各原則は以降のドキュメントで具体化される。

## 1. 性能を最優先する

キャンバスは「ドラッグ中に毎フレーム状態を再計算する」ような高頻度更新を伴う。
そのため、設計判断が分かれる場面では**性能を最優先**する。これが他の原則
（防御的チェックの置き場所、状態の正規化など）の根拠になっている。

具体例:

- State はフラット（ID キーの `Record`）に正規化し、編集操作での探索・更新を速くする
  → [データモデルと永続化](./03-data-model-and-persistence.ja.md)
- keyPoints / snapCandidates は参照比較ベースでキャッシュし、変化したオブジェクトだけ再計算する
  （`handleGesture` の `dragStart` 時のキャッシュ更新）
- 正当性チェックは内部の各所で重複させず、入力の境界に寄せる（原則 4）

## 2. ロジックは可能な限り純粋関数で書く

状態更新ロジック（各 EventHandler / Controller / Command）は、
**入力 state を受け取って新しい state を返す純粋関数**として実装する。

```ts
execute: (state: CanvasState) => CanvasState; // 副作用なし
```

### なぜ

テストを容易にするため。純粋関数なら、DOM もブラウザも介さずに
「入力 state → 期待する出力 state」を直接検証できる。これは
[テスト](./09-testing.ja.md) のユニット／結合テストが node 環境で完結することの土台でもある。

## 3. 各イベントハンドラがキャンバス全体の状態更新に責任を持つ

1 つのジェスチャー（例: ドラッグ）に対して、担当の EventHandler が
**`CanvasState` 全体の次の状態を返す**。選択・移動・スナップ・履歴フラグなど、
そのジェスチャーが引き起こす変化を 1 か所で組み立てる。

### なぜ

「状態の項目ごとに更新責任を分割する」構造（例: 選択担当・移動担当・スナップ担当が
別々に部分更新する）は、相互に依存する多様な状態を扱う本アプリでは破綻しやすい。
ある項目の更新が別の項目の前提を崩し、整合性を保つための調整コードが分散してしまう。
ハンドラ単位で全体の遷移を組み立てることで、状態間の依存をその場で完結させる。

詳細は [状態更新フロー（Reducer）](./06-state-update-flow.ja.md) を参照。

## 4. 不正な状態は外部入力の境界で弾き、内部関数は正当性を前提とする

循環参照・壊れた参照・型不整合といった**不正な状態は、外部入力を受け取る境界で弾く**。
境界を通過したデータは正当であることを前提に、内部の関数は防御的チェックを省く。

境界にあたるのは parser（`parseCanvasText` の二段検証）であり、外部入力を `Canvas` へ
渡す前に host（VSCode 拡張・Web アプリ等）がここを通す責務を負う。`SYNC_EXTERNAL` /
`canvasToState`（初期マウント・外部同期・Undo/Redo の復元）は検証済みの `CanvasDoc` を
受け取る前提で**再検証せず**、`canvasToState` で軽量に state へ写すだけにする
→ [データモデルと永続化](./03-data-model-and-persistence.ja.md)。

### なぜ

各所で重複した正当性チェックを行うと、高頻度な内部処理にコストが乗る（原則 1）。
検証を境界に一元化すれば、内部は「正当な state しか来ない」前提で軽量に書ける。

> **状況**: 内部各所に残っていた防御的チェック（木構造の循環ガード、参照整合の
> 再検証、欠落 ID の握り潰しなど）は撤去済みで、内部関数は「正当な state しか来ない」
> 前提で書かれている。
>
> **境界の所在**: 検証の境界は parser（`parseCanvasText`）に一元化し、`Canvas` は
> 再検証しない。`Canvas` へ渡す `CanvasDoc` を `parseCanvasText` に通すのは **host の責務**
> であり（→ `Canvas.tsx` の `doc` prop コメント）、`SYNC_EXTERNAL` / `canvasToState`
> の入口で再検証しないのは重複検証を避けるための**意図的な設計判断**。`Canvas` は検証済み
> doc を渡す契約に依存するため、host 側で `parseCanvasText` を必ず通すこと。
>
> **CSS インジェクション**（stroke / fill / fontColor / fontFamily / fontWeight）も同じ
> 方針で境界に寄せる。doc 経路は `validateDocUtils` の `isCssSafeValue`、クリップボード経路は
> state 検証（`validateStateUtils` / `isCssColor`）で弾く。presentation（emotion styled）側の
> sink 防御は重複のため設けない。
