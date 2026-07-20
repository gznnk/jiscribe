> 🌐 English version: [10-style-properties.md](./10-style-properties.md)

# スタイルプロパティシステム

ObjectMenu から発行されるスタイルプロパティ更新（fill / stroke / fontSize /
headerFill / `label.*` …）を解決・適用する機構。#187 で従来の中央 `switch`
（`handlePropertyUpdate`）を per-canvas の宣言に置き換えた。新しいプロパティは
dispatch 関数の編集ではなく**宣言の登録**で追加する。

## フロー: 2 経路が 1 つのレジストリに収束する

```
ObjectMenu 項目 / スライダー ── gesture (set:/slider:) ─→ ObjectMenuHandler ┐
ObjectMenu 数値入力          ── MENU_PROPERTY_UPDATE ──→ canvasReducer      ┼─→ registries.styleProperty.apply(state, property, value)
                                                                            ┘        │
                                                               StylePropertyRegistry │
                                                      handlers.get(property) ?? extraFallback
                                                                                     │
                                                            handler.apply(...) ⇒ 新しい state
```

どちらの経路も UI から来たプロパティ名と生の文字列値を
`StylePropertyRegistry.apply` に渡すだけで、プロパティ固有のこと —
対応可否の gate・値の型強制・書き込み先 — はすべて解決されたハンドラ側にある。

## StylePropertyHandler: 1 メソッド固定・依存はコンストラクタで

```ts
interface StylePropertyHandler {
	/** 選択中オブジェクトへ更新を適用する。適用対象が無ければ state を同一参照で返す */
	apply(state, property, value): CanvasControllerState;
}
```

interface は意図的に 1 メソッドに絞っている。協力オブジェクトが必要なハンドラ
（extras の lookup 等）はコンストラクタ注入で受け取り、dispatch の面を均一に保つ。

クラス階層（`controllers/styleProperties/`）:

| クラス                      | 役割                                                                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `SelectionStyleProperty`    | 抽象基底。共通パイプライン: connector 分岐 / 選択ループ / group 子孫再帰 → per-object の gate・型解決 → 型強制 → 書き込み                    |
| `FeatureGatedStyleProperty` | システムプロパティ標準実装。`ObjectFeatures` の `gate` フラグが立つオブジェクトに適用。コンストラクタ引数 `(gate, valueType)` が宣言そのもの |
| `ExtraStyleProperty`        | 未登録名の fallback。型がそのプロパティを宣言している場合のみ対応（fail-closed）                                                             |
| `LockAspectRatioProperty`   | 特殊ルーティング: 複数選択時は `multiSelectGroup` 自体へ書き、子孫へは再帰しない                                                             |

特殊な振る舞いは特殊なプロパティ自身のクラスに閉じる — 共通基底とレジストリは
個々のプロパティを知らない。

## 2 層の宣言

**システムプロパティ**（`styleProperties/systemStyleProperties.ts`）—
`ObjectFeatures` フラグと 1:1 で結びつく閉じた集合。バンドル生成時に全キャンバスへ
登録される（`setup/initializeStyleProperties`）:

```ts
export const SYSTEM_STYLE_PROPERTIES: Record<string, StylePropertyHandler> = {
	fill: new FeatureGatedStyleProperty("fill", "string"),
	strokeWidth: new FeatureGatedStyleProperty("stroke", "number"),
	// … 15 エントリ
	lockAspectRatio: new LockAspectRatioProperty(),
};
```

**シェイプ固有プロパティ** — `ObjectFeatures` に乗せないプロパティ
（connector の `label.*`、container プラグインの `headerFill` 等）。シェイプの Doc の
隣で宣言し、その `ObjectTypeDefinition` 経由で配線する。例は container プラグイン
（`plugins/container-shapes`。当該シェイプは現在そちらに帰属）より:

```ts
// plugins/container-shapes/src/schema/ContainerDoc.ts — `headerFill?: string` のすぐ隣
export const ContainerExtraStyleProperties = {
	headerFill: { valueType: "string" },
} as const satisfies Record<string, ExtraStylePropertyDescriptor>;

// plugins/container-shapes/src/definition.ts
export const containerDefinition = defineObject({
	features: ContainerFeatures,
	extraStyleProperties: ContainerExtraStyleProperties,
	// …
});
```

宣言の存在**そのもの**が gate であり、別フラグは無い。誰も宣言していない
プロパティはどこにも適用されない（fail-closed）。登録は
`applyObjectDefinition` を通るので、`CanvasConfig.plugins`
（docs/05_extensibility/canvas-plugin-design.md 参照）で足した
プラグイン/カスタム図形も同じ能力を持つ。`initializeObjectRegistry` の
clear サイクルは per-type の extras だけを消す（`clearExtras`）—
システムハンドラは gesture handler や command と同じく canvas-wide。

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
イベント終端 choke point で、`handleGesture` を通らない `MENU_PROPERTY_UPDATE`
経路は `apply` 直後に flatten する（`MoveCommands` と同じ one-shot パターン）。

## プロパティの追加方法

| ケース                                       | 書くもの                                                                                                         |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 既存フラグで gate される新システムプロパティ | `SYSTEM_STYLE_PROPERTIES` に 1 行                                                                                |
| 新しいシェイプ固有プロパティ                 | そのシェイプの `…ExtraStyleProperties` に 1 エントリ（初回のみ定義側に `extraStyleProperties` も）               |
| 特殊ルーティングが要るプロパティ             | `StylePropertyHandler` を実装（通常は `SelectionStyleProperty` を継承）して登録 — lockAspectRatio 級の例外に限る |

回帰の安全網: `styleProperties/__tests__/stylePropertyRegistry.test.ts` は
レジストリ駆動で、実際のバンドル配線を列挙して全宣言プロパティの
gate / 型強制 / 適用と整合性（extras がシステム名を隠さない・同名宣言の
`valueType` 一致）を検証する。新しい宣言は自動的にカバーされる。
