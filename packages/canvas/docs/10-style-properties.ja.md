> 🌐 English version: [10-style-properties.md](./10-style-properties.md)

# スタイルシステム

スタイルの編集が文書へ届くまでの仕組み。UI が出すのは**編集の意味**だけで、
**それが自分のデータのどこへ落ちるか**は各オブジェクト型が答える。途中の層が
プロパティ名から格納先を推測することはない。

2 層は `StyleIntent`（意味と型付きの値）と、型ごとの `{ apply, read }` の表
（`StyleTable`）。選択を歩くのは 1 本で、書きと読みが同じ歩き手を使うため、
メニューの行とその裏の書き込みが「誰に当たるか」で食い違うことはない。

この章のものはすべて `controllers/style/` にある。

## 層 1: intent

`StyleIntent.ts` が語彙を 1 つの union で宣言する。「面を塗る」「線を太くする」
「文字を赤くする」— 各 kind が自分の型で値を運ぶ:

```ts
type StyleIntent =
	| { kind: "fill"; color: string }
	| { kind: "strokeWidth"; width: number }
	| { kind: "cornerRadius"; radius: number }
	| { kind: "fontColor"; color: string }
	| { kind: "toggleBold" }
	| { kind: "lockAspectRatio"; locked: boolean }
	| { kind: "textContent"; text: string }
	| …;
```

intent はどの文書のフィールドも名指さない。語彙と doc のフィールド名が一致している
ところ（`fill` ⇔ `fill`）は型がそう答えているだけで規則ではなく、一致しないものは
意味で名付ける（`cornerRadius` は SVG 属性 `rx` へ落ちる）。

union には 3 つの事実が乗る:

- `StyleIntentKind` — kind だけ。表が答えるキーになる
- `StyleIntentValueType<K>` — ある kind の値の型。「`kind` 以外の唯一のフィールド」として導出する。
  エントリの `apply` と `read` は両方これに縛られるので、2 つが型で食い違えない
- `TOGGLE_FLIPS` — 3 つのキーボードトグルがどのフィールドを反転するか
  （`toggleBold` → `fontWeight`）。トグルの値型はそのフィールドの値型なので、
  型とエントリの双方のためにここ 1 箇所で宣言する

図形が自前で宣言した名前は union に入らない。`ExtraStyleIntent`
（`{ kind: string; value: string }`）として運ばれ、値は輸送形の文字列のまま。
エンジンはその名前の意味も型も知らないからである。

## 層 2: 型ごとの表

`StyleEntry<TState, V>` は対。意図的に対で書かせている — 適用を頼める intent は、
現在値を答えられる intent でもあるべきだからである:

```ts
type StyleEntry<TState extends ObjectState, V> = {
	/** この object に intent を反映したもの。null = この対象には当たらない */
	apply(
		object: TState,
		pick: ObjectPartSelection | null,
		value: V,
		ctx: StyleContext,
	): TState | null;
	/** この object 上で intent が当たる各所の現在値。[] = 当たらない */
	read(
		object: TState,
		pick: ObjectPartSelection | null,
		ctx: StyleContext,
	): readonly V[];
};
```

`read` が単一値でなく配列を返すのは、1 つの object が当たり先を複数持ちうるため
（表の行がセル 1 列を覆う）。これがあるので読み手は「その object 自身が割れている」
ことを出せる。値は型の既定値まで解決して返るので、報告されるのは実際に描かれている
値であり、メニューはローカル定数を持たない。

`StyleTable<TState>` は「その型が何に答えるか」を kind ごとに持つ。キーが無いのが
最も粗い gate で、その型はその intent を受けない。エンジン自身の kind は 1 つずつ
型付けされ、それ以外のキーは図形自前のエントリとして `ExtraStyleEntry` の
index signature に入る（値型はエンジンが知らないので `unknown`。エンジン自身の
エントリもこれに代入できるので、2 つの半分が 1 つの交差型に収まる）。

`StyleContext` は、object と値以外にエントリへ渡されるもの:

| フィールド           | 用途                                                                          |
| -------------------- | ----------------------------------------------------------------------------- |
| `selected`           | この対象が自分で選択されているのか、選択されたグループ経由の子孫なのか        |
| `shapeStyleDefaults` | 型別の stroke / fill 既定値。図形の `read` が描かれている値で答えるために     |
| `textStyleDefaults`  | 型別・スロット別のテキスト既定値。スロットの `read` も同様                    |
| `textEditRange`      | 編集中のエディタが選んでいる文字範囲（範囲への書き / 読みが編集の意味のとき） |

`ObjectStyleRegistry` が型別の表を持ち、バンドル生成時に埋まる。
`applyObjectDefinition` が全型について
`{ ...coreStyleTable(features, facts), ...extraStyleTable(type, extras) }` を登録する。
レジストリに無い型は何も受けない — 歩き手はフィールドを推測せず飛ばす（fail-closed）。

## 宣言から無料で得られる表

`coreStyleTable(features, facts)` は feature フラグを**組むときに 1 回だけ**読み、
以後どこもフラグを見ない:

| 宣言                                 | 入るエントリ                                               |
| ------------------------------------ | ---------------------------------------------------------- |
| `features.fill`                      | `fill`, `fillOpacity`                                      |
| `features.stroke`                    | `stroke`, `strokeWidth`, `strokeDashType`, `strokeOpacity` |
| `features.radius`                    | `cornerRadius`（格納先は `rx`）                            |
| `features.arrow`                     | `startArrow`, `endArrow`                                   |
| `features.transform`                 | `lockAspectRatio`                                          |
| `features.text`                      | `textStyleTable(features.text, defaultSlotsOf)`            |
| `hasInsetTextRegionType(definition)` | `textVerticalBasis`                                        |

最後の行はフラグでは運べない唯一の判断なので、定義全体を専用の述語で見る。テキスト
領域が箱そのものの型は、どちらの基準でも同じ場所を指すため、この切り替えは何もしない
コントロールになってしまう。

`textStyleTable(textType, slotsOf)` は、型がテキストについて宣言する唯一のこと —
そのテキストがどのフィールドを持ちうるか（`textStyleKeysOf`）— からテキスト半分を
導出する。ソース言語で書かれた本文は自身の構文で強調を表すので、誰も text type で
分岐し直すことなくそれらの intent から外れる:

| 受け付けるフィールド | 入るエントリ                        |
| -------------------- | ----------------------------------- |
| テキストを持つ全型   | `textContent`                       |
| `fontColor`          | `fontColor`                         |
| `fontSize`           | `fontSize`                          |
| `fontFamily`         | `fontFamily`                        |
| `fontWeight`         | `fontWeight`, `toggleBold`          |
| `fontStyle`          | `fontStyle`, `toggleItalic`         |
| `textDecoration`     | `textDecoration`, `toggleUnderline` |
| `textAlign`          | `textAlign`                         |
| `verticalAlign`      | `verticalAlign`                     |

## 対を作るヘルパー

エントリは手で書かない。格納先ごとのヘルパーが対を返す（`controllers/style/entries/`）:

| ヘルパー                                     | 値の落ちる先                                                                                                                                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `objectField(field)`                         | object 自身の 1 フィールド。`read` は `ObjectShapeStyleDefaultsRegistry` 経由（object → 型の既定 → `SHAPE_STYLE_FALLBACK`）なので、受けるのは図形スタイルのフィールドだけ                         |
| `slotField(field, { slotsOf })`              | 当たる各テキストスロットの 1 フィールド。それより小さい単位には落ちない — ブロック全体を配置する alignment がこれ                                                                                 |
| `runOrSlot(field, { slotsOf })`              | 編集中に文字範囲が選ばれていればその範囲（`resolveRangeEdit`）、無ければスロット全体。全体に書くときは同フィールドを上書きしていた run を剥がす（でないとスロットは変わるのに見た目が変わらない） |
| `toggleRunOrSlot(kind, { slotsOf, toggle })` | `TOGGLE_FLIPS` が名指すフィールド。選ばれた範囲にだけ当たる（キー 1 打は図形全体への書きではない）。現在の描画値を読んで反転し、`runOrSlot` と同じ経路で書く                                      |
| `extraField(path, valueType)`                | 図形自前の宣言が名指すフィールド。ドットはネストへの path。輸送形の文字列は宣言の `valueType` でここで読む（境界はプラグインの語彙を知らない）                                                    |
| `lockAspectRatioEntry`                       | 選択された object だけの `lockAspectRatio`（`ctx.selected`）。選択グループのメンバーは自分のロックを保つ                                                                                          |
| `textVerticalBasisEntry`                     | `textVerticalBasis`。`"region"` はフィールドを消すことで表す（自分を書き込むのではない）                                                                                                          |
| `textContentEntry`                           | 既定スロット（先頭キー）の内容を `writeTextSlot` で書く。他のスロット・キー順・スロットの書式・内容の種別はすべて残る                                                                             |

`slotEntry` は `slotField` と `runOrSlot` のスロット半分が共有する部分 — どのスロットに
当たるか、同一参照の契約、各スロットを型の既定値で読むこと。

どのスロットに当たるかは型自身の答えで、`SlotsOf<TState>` として 1 回だけ渡す。コア型は
`defaultSlotsOf` を使う: スロットが選ばれていればそれ、無ければ object が持つ全スロット
— これが「何も選ばずに文字スタイルを書くと図形全体に当たる」の正体。`text` のキーが
スロットでない型は自分のものを渡す。

ネストへの書き込みは既存の親に merge し、**親を捏造しない**。ラベルの無いコネクターは
`label.*` の書きを一切受けない（色を押したらラベルが生える、にはならない）。

## 選択の解釈は 1 箇所

`collectStyleTargets(state)` が、スタイル層の持つ唯一の選択の解釈。選択順に、
選択された各 object と、それがグループなら寄与する子孫を並べる:

- `pick` を渡すのは選択がその 1 個だけのとき（`CanvasSelection.part` は単独選択の
  持ち物）。子孫と複数選択のメンバーは常に object 全体として扱われる
- `selected` でエントリはどちらを見ているか分かる。子孫に降りない intent
  （`lockAspectRatio` / `textVerticalBasis`）はこれで自分を gate するので、歩き手に
  分岐は無い
- 選択されたコネクターは他と同列の 1 対象

歩き手は 2 本ともこの歩きを使う:

- `applyStyleIntent(state, intent, registries)` — 各対象をその型のエントリで書く。
  その intent を受けない型、`apply` が null を返した対象はそのまま。何も変わらなければ
  `state` の同一参照を返す
- `readSelectionStyle(state, kind, registries)` — 同じ道で読み、`single` / `mixed` /
  `none` に畳む（`combineSelectionValues`）。エンジン自身の kind を渡すと答えが型付き、
  図形自前の名前を渡すと `SelectionValue<unknown>`

### 編集中の下書き

図形エディタの下書きはセッションが終わるまでスロットへコミットされないので、その下の
スロットへ書いても次の打鍵で上書きされる。この規則はエントリではなく歩き手が持つ。
`resolveStyleTextEdit` が編集中の情報を返し、編集中の object は下書きを対象スロットへ
**graft** してからエントリへ渡し、終わったらそのスロットを下書きへ読み戻す。エントリが
書かなかった graft は捨てる。エディタの存在はどのエントリも知らず、
`StyleContext.textEditRange` が運ぶのはオフセットだけ。

「選ばれた範囲がそもそもスタイルを当てる範囲か」も `resolveStyleTextEdit` が持つ。
崩れた（または未報告の）選択は範囲ではなく、ソース言語の本文の範囲も範囲ではない —
その一部に run を載せても保存時に落ちて描かれないので、スロット全体への書きになる。

## 輸送の境界

UI が運ぶのはプロパティの**名前**と**文字列**。DOM の `data-part` に入るのがそれだけ
だからである（`menuParts.ts`）:

- `set:{property}:{value}` — スタイルプロパティを直接書く。値自身に `:` を含んでよい
- `slider:{property}` — 値は part ではなくイベント（`inputValue`）に乗るスライダー

```
ObjectMenu の項目 / スライダー、サイドバーの色見本 ── ジェスチャー（set: / slider:）─→ applyStylePropertyPart ┐
ObjectMenu の数値入力、サイドバーのコールバック   ── STYLE_PROPERTY_UPDATE ──────────→ canvasReducer          ┼─→ applyStyleProperty
                                                                                                              ┘        │
                                                                                                     INTENT_BY_PROPERTY │
                                                                                                                        ↓
                                                                                                             applyStyleIntent
```

スライダーは両経路にまたがる。ポインタ操作（ドラッグとトラックのクリック）は
ジェスチャー経路、キーボード操作はジェスチャーを出さないので `STYLE_PROPERTY_UPDATE`。

`applyStyleProperty(state, property, value, registries)` が、名前と文字列を intent に
読む唯一の場所:

- `INTENT_BY_PROPERTY` が、エンジン自身の語彙の各名前と「その文字列が作る intent」を
  対応づける。`satisfies Record<SystemStyleName, StyleIntentMapper>` が付いていて、
  `SystemStyleName` は doc のスタイルグループが宣言するキーの union（`*_STYLE_KEYS`）＋
  どのグループも持たない 3 つ（`text` / `lockAspectRatio` / `textVerticalBasis`）。
  グループにキーを足すとマッパーを書くまでコンパイルが通らず、どのグループも持たない
  名前を事故で載せることもできない
- マッパーが undefined を返すのは「値として何も作れない」とき（数値にならない文字列）で、
  何も適用しない
- どのマッパーも知らない名前は `{ kind: property, value }` になり、受けるかどうかは
  型の表が決める

キーボード経路は境界を通らない。`TOGGLE_TEXT_FORMAT` は打鍵の時点から
`TextToggleIntentKind` を運び、直接 `applyStyleIntent` を呼ぶ。「太字」をフィールドへ
読み替える処理が 2 箇所に無いようにするためである。

### 唯一の例外

複数選択の縦横比ロックは、選択の周りに描かれる枠（`createMultiSelectGroup`）の持ち物で、
中のどの object のものでもない。文書のフィールドではなくセッション状態なので、
`StyleEntry` では表せない。`applyStyleProperty` がその場合だけ `multiSelectGroup` へ
書いて返る。報告する行も同じ優先順に従う（`getSelectedLockAspectRatio`）。

### 性能

スライダーのドラッグは pointermove フレームごとに適用されるので、歩き手は #213 の
`createCowObjects` ビューへ書く（全オブジェクトの map 展開ではなく変更数のオーダー）。
materialize は従来どおりの分担で、ジェスチャー経路は `handleGesture` のイベント末尾の
関門で平らにし、`handleGesture` を通らない `STYLE_PROPERTY_UPDATE` 経路は書き込みの
直後に平らにする。

## 図形が宣言するもの

`ObjectFeatures` のフラグが覆わないスタイルは、図形の Doc の隣で
`…ExtraStyleProperties` として宣言し、`ObjectTypeDefinition` の
`extraStyleProperties` から配線する:

```ts
export const ContainerExtraStyleProperties = {
	headerFill: { valueType: "string" },
	headerHeight: { valueType: "number" },
} as const satisfies Record<string, ExtraStylePropertyDescriptor>;
```

`extraStyleTable` が各宣言を `extraField` のエントリに変え、宣言された名前のまま
その型の表へ入れる。宣言の存在が gate そのもので、誰も宣言していない名前は何にも
当たらない（fail-closed）。宣言された名前は選択のうち宣言している object
— 選択グループの子孫も含む — にだけ当たる。名前のドットは書き込み path
（`label.fill` は `connector.label` へ merge）。

エンジン自身の語彙が持つ名前は**登録時に throw** し、型と名前を名指す。境界がその名前を
自分の intent に読んでしまうので、エントリは一度も呼ばれず、宣言が黙って何もしない
状態になるからである。

登録は `applyObjectDefinition` を通るので、`CanvasConfig.plugins` で足したプラグイン図形
（[プラグインアーキテクチャ](./12-plugin-architecture.ja.md) 参照）も同じ能力を得る。
コネクターの宣言は `@jiscribe/doc` の `model/objects/connector/ConnectorDoc.ts`。
container プラグインは `src/schema/ContainerDoc.ts` で `ContainerExtraStyleProperties` を
宣言し、`@jiscribe/canvas-sdk` の `createFrameObjectDefinition` へ渡す。

現時点でプラグインが頼れるのは、その宣言と、両サーフェスの自前の行で値を述べるための
`useSelectionStyle(name)`（`@jiscribe/canvas/unstable`）だけ。このフックは選択全体の答え
（`single` / `mixed` / `none`。描ける形へ畳むのは `selectionValue*` ヘルパー）を、同名の
書き込みが届くのとまったく同じ object について返す。宣言した名前はエンジンが何も知らない
名前なので、値は `unknown` で来る。行の側で絞る（自前のガードと `selectionValueAs`）。
スタイル層自体は内部実装で、型が導出済みのエントリを差し替えることはまだできない —
格納先がコアの推測と違う図形（セルに `fill` を持つ表）が必要としているのはそれである。
宣言面の `ObjectTypeDefinition.style` 上書きはそのために予定されており、**まだ無い**。

## スタイルを足すとき

| ケース                             | 書くもの                                                                                                                                                                                                                      |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| エンジン自身の語彙の新しいスタイル | `StyleIntent` への kind、それを有効にする宣言の下の `coreStyleTable` / `textStyleTable` へのエントリ、`INTENT_BY_PROPERTY` へのマッパー。`SystemStyleName` の `satisfies` があるので、どれか 1 つだけではコンパイルが通らない |
| 既存スタイルの新しい格納先         | `{ apply, read }` の対を返すヘルパーを `entries/` に足し、必要な表から使う                                                                                                                                                    |
| 1 つの図形だけが持つスタイル       | その図形の `…ExtraStyleProperties` へ 1 行（初回だけ定義の `extraStyleProperties` も）                                                                                                                                        |

回帰の安全網: `style/__tests__/applyStyleProperty.test.ts` はレジストリ駆動で、実際の
バンドル配線から図形宣言の extra を全て列挙し、gate・値の読み・ネスト書き込みを確かめる。
同じ名前を宣言する図形が `valueType` で一致していることも見る。新しい宣言は自動で
カバーされる。
