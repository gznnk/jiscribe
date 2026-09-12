> 🌐 English version: [10-style-properties.md](./10-style-properties.md)

# スタイルプロパティシステム

ObjectMenu とプロパティサイドバーから発行されるスタイルプロパティ更新（fill / stroke / fontSize /
headerFill / `label.*` …）を解決・適用する機構。#187 で従来の中央 `switch`
（`handlePropertyUpdate`）を per-canvas の宣言に置き換えた。新しいプロパティは
dispatch 関数の編集ではなく**宣言の登録**で追加する。

## フロー: 2 経路が 1 つのレジストリに収束する

```
ObjectMenu 項目 / スライダー、サイドバーのスウォッチ ── gesture (set:/slider:) ─→ ObjectMenuHandler     ┐
ObjectMenu 数値入力、サイドバーのコールバック         ── STYLE_PROPERTY_UPDATE ──→ canvasReducer      ┼─→ registries.styleProperty.apply(state, property, value)
                                                                                         ┘        │
                                                                            StylePropertyRegistry │
                                                                   handlers.get(property) ?? extraFallback
                                                                                                  │
                                                                         handler.apply(...) ⇒ 新しい state
```

スライダーは両方にまたがる。ポインタ操作（ドラッグとトラッククリック）は
gesture 経路を通り、キーボード操作（矢印キー等）は gesture が発生しないため
`STYLE_PROPERTY_UPDATE` を通る。

どちらの経路も UI から来たプロパティ名と生の文字列値を
`StylePropertyRegistry.apply` に渡すだけで、プロパティ固有のこと —
対応可否の gate・値の型強制・書き込み先 — はすべて解決されたハンドラ側にある。

## StylePropertyHandler: 1 メソッド固定・依存はコンストラクタで

`StylePropertyHandler`（`controllers/styleProperties/StylePropertyHandler.ts`）が持つのは
`apply(state, property, value)` の 1 メソッドだけで、選択中のオブジェクトへ更新を適用し、
適用対象が無ければ state を同一参照で返す。

interface は意図的に 1 メソッドに絞っている。協力オブジェクトが必要なハンドラ
（extras の lookup 等）はコンストラクタ注入で受け取り、dispatch の面を均一に保つ。

主なクラス（全体は `controllers/styleProperties/`）:

| クラス                      | 役割                                                                                                                                                                                                                         |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SelectionStyleProperty`    | 抽象基底。共通パイプライン: connector 分岐 / 選択ループ / group 子孫再帰 → per-object の gate・型解決 → 型強制 → 書き込み                                                                                                    |
| `FeatureGatedStyleProperty` | システムプロパティの標準実装。`ObjectFeatures` の `gate` フラグが立つオブジェクトに適用。コンストラクタ引数 `(gate, valueType)` が宣言そのもの                                                                               |
| `TextSlotStyleProperty`     | テキストの書式（fontSize / textAlign など）。テキストを持つオブジェクト（`features.text`）に適用し、スロット単位で書く（スロットが選ばれていればそれだけ、無ければ全スロット。編集中に文字範囲が選ばれていればその範囲だけ） |
| `ExtraStyleProperty`        | 未登録名の fallback。型がそのプロパティを宣言している場合のみ対応（fail-closed）                                                                                                                                             |
| `LockAspectRatioProperty`   | 特殊ルーティング: 複数選択時は `multiSelectGroup` 自体へ書き、子孫へは再帰しない                                                                                                                                             |

特殊な振る舞いは特殊なプロパティ自身のクラスに閉じる — 共通基底とレジストリは
個々のプロパティを知らない。

## 2 層の宣言

**システムプロパティ**（`styleProperties/systemStyleProperties.ts` の `SYSTEM_STYLE_PROPERTIES`）—
全図形に共通するスタイルの閉じた集合。キーは同ファイルの `SystemStyleName` に縛られている。
これは `@jiscribe/doc` のスタイルグループが宣言するキー（`*_STYLE_KEYS`）の和集合に `text` と
`lockAspectRatio` を足したもので、どのキーにもハンドラが要り、どこにも無い名前は登録できない。
対応可否の gate はハンドラごとに違う（`ObjectFeatures` のフラグ、テキストを持つか など）。
ハンドラはステートレスなので全キャンバスで共有し、バンドル生成時に各キャンバスの
レジストリへ登録する（`registries/initializeStyleProperties`）。

キャンバス自身のレジストリに縛られるハンドラは、同じ関数が `SYSTEM_STYLE_PROPERTIES` の外から
キャンバスごとにインスタンスを作って登録する（例: `textVerticalBasis` の `TextVerticalBasisProperty`）。

**シェイプ固有プロパティ** — `ObjectFeatures` に乗せないプロパティ
（connector の `label.*`、container プラグインの `headerFill` 等）。シェイプの Doc の
隣で `…ExtraStyleProperties` として宣言し、その `ObjectTypeDefinition` の
`extraStyleProperties` で配線する。例: container プラグイン（`plugins/container-shapes`）は
`src/schema/ContainerDoc.ts` で `ContainerExtraStyleProperties` を宣言し、`src/definition.ts` で
`@jiscribe/canvas-sdk` の `createFrameObjectDefinition` に `extraStyleProperties` として渡している。
connector の宣言は `@jiscribe/doc` の `model/objects/connector/ConnectorDoc.ts` にある。

宣言の存在**そのもの**が gate であり、別フラグは無い。誰も宣言していない
プロパティはどこにも適用されない（fail-closed）。登録は
`applyObjectDefinition` を通るので、`CanvasConfig.plugins`
（[プラグインアーキテクチャ](./12-plugin-architecture.ja.md) 参照）で足した
プラグイン/カスタム図形も同じ能力を持つ。extras はキャンバスのバンドルごとに型の定義から
登録され、システムハンドラは gesture handler や command と同じく型に依らず全キャンバスに載る。

## ドット記法 = 汎用ネスト書き込み

プロパティ名のドットは書き込みパス: `"label.fill"` は `connector.label.fill` へ
immutable にマージされる。ルールは**既存の親へマージし、親を捏造しない** —
途中の親が無ければ（label 未設定の connector 等）そのオブジェクトには no-op。
これが従来の connector 専用 `label.*` 分岐を置き換えた。label がネストである
理由は[データモデル](./03-data-model-and-persistence.ja.md)を参照。

値の型強制はプロパティごとの宣言
（`valueType: "string" | "number" | "boolean"`）に従い per-object に行う。
number のパース失敗はそのオブジェクトをスキップする。

## パフォーマンス: 他の objects 書き換えと同じ copy-on-write

スライダードラッグは pointermove フレームごとに `apply` を呼ぶため、選択ループは
#213 の `createCowObjects` ビューを使う（O(全オブジェクト) のスプレッドでなく
O(変更分)）。materialize は標準の分担どおり: gesture 経路は `handleGesture` の
イベント終端 choke point で、`handleGesture` を通らない `STYLE_PROPERTY_UPDATE`
経路は `apply` 直後に flatten する（`MoveCommands` と同じ one-shot パターン）。

## プロパティの追加方法

| ケース                                       | 書くもの                                                                                                                                                                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 既存フラグで gate される新システムプロパティ | doc のスタイルグループへのキー追加（`*_STYLE_KEYS`。グループに属さない名前は `SystemStyleName` へ直接）と、`SYSTEM_STYLE_PROPERTIES` へのハンドラ 1 行。キーは `SystemStyleName` に縛られているので、片方だけではコンパイルが通らない |
| 新しいシェイプ固有プロパティ                 | そのシェイプの `…ExtraStyleProperties` に 1 エントリ（初回のみ定義側に `extraStyleProperties` も）                                                                                                                                    |
| 特殊ルーティングが要るプロパティ             | `StylePropertyHandler` を実装（通常は `SelectionStyleProperty` を継承）して登録（キャンバスのレジストリに縛られるなら `initializeStyleProperties` で）— lockAspectRatio 級の例外に限る                                                |

回帰の安全網: `styleProperties/__tests__/stylePropertyRegistry.test.ts` は
レジストリ駆動で、`SYSTEM_STYLE_PROPERTIES` のうち `FeatureGatedStyleProperty` のものと、
実際のバンドル配線にある全シェイプ固有宣言を列挙して、gate / 型強制 / 適用と整合性
（extras がシステム名を隠さない・同名宣言の `valueType` 一致）を検証する。この 2 種類の
新しい宣言は自動的にカバーされる。
