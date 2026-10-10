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

`StyleIntent.ts` が core の語彙を 1 つの union で宣言する。「面を塗る」「線を太くする」
「文字を赤くする」— 各 kind が自分の型で値を運ぶ:

```ts
type CoreStyleIntent =
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

- `CoreStyleIntentKind` — kind だけ。表が答えるキーになる
- `StyleIntentValueType<K>` — ある kind の値の型。「`kind` 以外の唯一のフィールド」として導出する。
  エントリの `apply` と `read` は両方これに縛られるので、2 つが型で食い違えない
- `TOGGLE_FLIPS` — 3 つのキーボードトグルがどのフィールドを反転するか
  （`toggleBold` → `fontWeight`）。トグルの値型はそのフィールドの値型なので、
  型とエントリの双方のためにここ 1 箇所で宣言する

型が自前で宣言した kind は union に入らない。`ExtraStyleIntent`
（`{ kind: string; value: unknown }`）として運ばれる。エンジンはその kind の意味も型も
知らないからである。値は、名前と文字列しか持たないサーフェスからなら輸送形の文字列
（`styleIntentOf`）、宣言を持つサーフェスからなら型付きの値
（`{ kind: "headerHeight", value: 32 }`）。読むのは宣言した型のエントリである。
2 つを合わせたものが `StyleIntent` で、`applyStyleIntent` が受けるのはこれである。

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
	/** このエントリが書く object 直下のフィールド。登録時の検査が見る。宣言するエントリでは必須 */
	readonly fields?: readonly string[];
};
```

`read` が単一値でなく配列を返すのは、1 つの object が当たり先を複数持ちうるため
（表の行がセル 1 列を覆う）。これがあるので読み手は「その object 自身が割れている」
ことを出せる。値は型の既定値まで解決して返るので、報告されるのは実際に描かれている
値であり、メニューはローカル定数を持たない。

`StyleTable<TState>` は「その型が何に答えるか」を kind ごとに持つ。キーが無いのが
最も粗い gate で、その型はその intent を受けない。core の kind は 1 つずつ
型付けされ、それ以外のキーは宣言した型が持つエントリとして `ExtraStyleEntry` の
index signature に入る（値型はエンジンが知らないので `unknown`。core の
エントリもこれに代入できるので、2 つの半分が 1 つの交差型に収まる）。エントリは
**自分が書くフィールド**も述べる（`StyleEntry.fields`）。登録時にその型の Doc と
突き合わせるのがこれで、省略してよいのはエンジン自身の core のエントリだけ —
フィールドの保証は導出元のフラグ自身が持っているからである。

`StyleContext` は、object と値以外にエントリへ渡されるもの:

| フィールド           | 用途                                                                          |
| -------------------- | ----------------------------------------------------------------------------- |
| `selected`           | この対象が自分で選択されているのか、選択されたグループ経由の子孫なのか        |
| `shapeStyleDefaults` | 型別の stroke / fill 既定値。図形の `read` が描かれている値で答えるために     |
| `textStyleDefaults`  | 型別・スロット別のテキスト既定値。スロットの `read` も同様                    |
| `textEditRange`      | 編集中のエディタが選んでいる文字範囲（範囲への書き / 読みが編集の意味のとき） |

`ObjectStyleRegistry` が型別の表を持ち、バンドル生成時に埋まる。
`applyObjectDefinition` が全型について
`{ ...coreStyleTable(features), ...definition.styleEntries }` を登録する。型自前の表が
後ろなので、型が宣言した kind は導出されたエントリを置き換える。
レジストリに無い型は何も受けない — 歩き手はフィールドを推測せず飛ばす（fail-closed）。

## 宣言から無料で得られる表

`coreStyleTable(features)` は feature フラグを**組むときに 1 回だけ**読み、
以後どこもフラグを見ない:

| 宣言                         | 入るエントリ                                               |
| ---------------------------- | ---------------------------------------------------------- |
| `features.fill`              | `fill`, `fillOpacity`                                      |
| `features.stroke`            | `stroke`, `strokeWidth`, `strokeDashType`, `strokeOpacity` |
| `features.radius`            | `cornerRadius`（格納先は `rx`）                            |
| `features.arrow`             | `startArrow`, `endArrow`                                   |
| `features.transform`         | `lockAspectRatio`                                          |
| `features.text`              | `textStyleTable(features.text, defaultSlotsOf)`            |
| `features.textVerticalBasis` | `textVerticalBasis`                                        |

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
| `fieldEntry(path, valueType)`                | 型自前のフィールド。ドットはネストへの path。値は宣言した `valueType` に照らしてここで読む（文字列は輸送形として、既にその型の値はそのまま、それ以外は何も当てない）                              |
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
  `none` に畳む（`combineSelectionValues`）。core の kind を渡すと答えが型付き、
  型自前の名前だけを渡すと `SelectionValue<unknown>`。その kind を宣言した表を手前に
  渡すと（`readSelectionStyle(state, CONNECTOR_STYLE_ENTRIES, "label.fill", registries)`）
  宣言から型が付く。表は型のためだけに取り、歩きは各対象自身の登録済みの表を引く

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

UI が運ぶのはプロパティの**名前**と**文字列**。DOM の `data-action` に入るのがそれだけ
だからである（`menuActions.ts`）:

- `set:{property}:{value}` — スタイルプロパティを直接書く。値自身に `:` を含んでよい
- `slider:{property}` — 値は action ではなくイベント（`inputValue`）に乗るスライダー

```
ObjectMenu の項目 / スライダー、サイドバーの色見本 ── ジェスチャー（set: / slider:）─→ applyStyleAction ┐
                                                                                          │ styleIntentOf       │
ObjectMenu の数値入力、サイドバーのコールバック、エディタの打鍵 ── STYLE_INTENT ─────────→ canvasReducer       ┼─→ applyStyleIntent
    └ プロパティが静的に決まる行は intent を直接組み、                                    ┘
      名前と文字列しか持たない部品は styleIntentOf で読む
```

両経路の終点は `applyStyleIntent`。違うのは intent の出どころだけで、ジェスチャー経路は
DOM から名前と文字列を受け取って読み、React 経路（`STYLE_INTENT`）は既に intent を
運んでくる（名前と文字列しか持たない部品は `styleIntentOf` を通してから渡す）。

スライダーは両経路にまたがる。ポインタ操作（ドラッグとトラックのクリック）は
ジェスチャー経路、キーボード操作はジェスチャーを出さないので `STYLE_INTENT`。

`styleIntentOf(property, value)` が、名前と文字列を intent に読む唯一の場所:

- `INTENT_BY_PROPERTY` が、core の語彙の各名前と「その文字列が作る intent」を
  対応づける。`satisfies Record<SystemStyleName, StyleIntentMapper>` が付いていて、
  `SystemStyleName` は doc のスタイルグループが宣言するキーの union（`*_STYLE_KEYS`）＋
  どのグループも持たない 3 つ（`text` / `lockAspectRatio` / `textVerticalBasis`）。
  グループにキーを足すとマッパーを書くまでコンパイルが通らず、どのグループも持たない
  名前を事故で載せることもできない
- マッパーが undefined を返すのは「値として何も作れない」とき（数値にならない文字列）で、
  何も適用しない
- どのマッパーも知らない名前は `{ kind: property, value }` になり、受けるかどうかは
  型の表が決める

トグルも React 経路のただの intent で、打鍵が名指す `TextToggleIntentKind` をそのまま
`{ kind: "toggleBold" }` + `commit: true` として投げる。「太字」をフィールドへ読み替える
処理が 2 箇所に無く、1 打鍵が 1 エントリになるのも変わらない（記録するのは
`STYLE_INTENT` のコミット側の後処理）。

### スタイルの書き込みではないもの

複数選択の縦横比ロックは、選択の周りに描かれる枠（`createMultiSelectGroup`）の持ち物で、
中のどの object のものでもない。文書のフィールドではなくセッション状態なので、
`StyleEntry` では表せない。そのためどちらの経路にも乗らず、サイドバーの行は
`toggleLockAspectRatio` コマンドを走らせる。複数選択なら枠自身のフラグを反転し、
そうでなければ `lockAspectRatio` intent を適用する。報告する行も同じ優先順に従う
（`getSelectedLockAspectRatio`）。kind は語彙の一部なのでマッパーは
`INTENT_BY_PROPERTY` に残るが、ロックをプロパティ名で綴る UI はもう無い。

### 性能

スライダーのドラッグは pointermove フレームごとに適用されるので、歩き手は #213 の
`createCowObjects` ビューへ書く（全オブジェクトの map 展開ではなく変更数のオーダー）。
materialize は従来どおりの分担で、ジェスチャー経路は `handleGesture` のイベント末尾の
関門で平らにし、`handleGesture` を通らない `STYLE_INTENT` 経路は書き込みの
直後に平らにする。

## 型が宣言するもの

`ObjectFeatures` のフラグが覆わないスタイル — あるいはフラグの示す格納先と実際が違う
スタイル — は、その型自前の `DeclaredStyleTable` として宣言し、`ObjectTypeDefinition.styleEntries`
へ渡す:

```ts
export const CONTAINER_STYLE_ENTRIES = {
	headerFill: fieldEntry("headerFill", "string"),
	headerHeight: fieldEntry("headerHeight", "number"),
} satisfies DeclaredStyleTable<ContainerState>;
```

この表は導出された表の上に、**宣言が後ろになるよう**重ねられる。core の語彙が
持つ kind は拒否されるのではなく*置き換えられる*。格納先がコアの推測と違う型
（セルに `fill` を持つ表）が必要としているのはそれである。語彙が持たない kind は
その型だけのスタイルで、宣言の存在が gate そのもの。誰も宣言していない名前は何にも
当たらない（fail-closed）。宣言された名前は選択のうち宣言している object
— 選択グループの子孫も含む — にだけ当たる。名前のドットは書き込み path
（`label.fill` は `connector.label` へ merge）。

宣言するエントリは必ず自分が書くフィールドを述べる（`fields`。`fieldEntry` は path の
根から埋める。Doc に保存するものを何も書かないなら `[]`）。述べないエントリは登録時に
拒否し、`DeclaredStyleTable` がコンパイル時にも必須にする。**加えて、その型の Doc が
持てないフィールドを書くエントリも登録時に拒否する**。持てる名前は
`extraKeys` と `features` が示すもの（`collectStyleKeys` と `text`）。この検査が無いと、
エントリは mapper が Doc へ戻すときに落とす state を書けてしまい、保存するまで誰も
気づかない。

登録は `applyObjectDefinition` を通るので、`CanvasConfig.plugins` で足したプラグイン図形
（[プラグインアーキテクチャ](./12-plugin-architecture.ja.md) 参照）も同じ能力を得る。
`fieldEntry` と `DeclaredStyleTable` は `@jiscribe/canvas-sdk` が公開しており、導出された kind を
差し替える型のために、エンジンが自分の表を組むヘルパー（`objectField` / `slotField` /
`runOrSlot` / `toggleRunOrSlot` / `defaultSlotsOf`）も並んでいる。コネクターの表は
`controllers/style/connectorStyleEntries.ts`（`CONNECTOR_STYLE_ENTRIES`）。container プラグインは
`src/style/containerStyleEntries.ts` で `CONTAINER_STYLE_ENTRIES` を宣言し、`@jiscribe/canvas-sdk` の
`createFrameObjectDefinition` へ渡す。

行が値を述べ返すのは `useSelectionStyle`（`@jiscribe/canvas/unstable`）。選択全体の答え
（`single` / `mixed` / `none`。描ける形へ畳むのは `selectionValue*` ヘルパー）を、同じ
kind の書き込みが届くのとまったく同じ object について返す。kind の手前に表を渡すと
（`useSelectionStyle(CONTAINER_STYLE_ENTRIES, "headerFill")`）宣言から型が付くので、行の側で
絞るものは無く、型の値型は 1 箇所で述べられる。名前だけで読むと値は `unknown` のままで、
行が自前のガードで絞る。

## スタイルを足すとき

| ケース                         | 書くもの                                                                                                                                                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| core の語彙の新しいスタイル    | `CoreStyleIntent` への kind、それを有効にする宣言の下の `coreStyleTable` / `textStyleTable` へのエントリ、`INTENT_BY_PROPERTY` へのマッパー。`SystemStyleName` の `satisfies` があるので、どれか 1 つだけではコンパイルが通らない |
| 既存スタイルの新しい格納先     | `{ apply, read }` の対を返すヘルパーを `entries/` に足し、必要な表から使う                                                                                                                                                        |
| 1 つの型だけが持つスタイル     | その型自前の `DeclaredStyleTable` へ 1 エントリ。自前のフィールドなら `fieldEntry`（初回だけ定義の `styleEntries` も）。根のフィールドは `extraKeys` に入れる                                                                     |
| 導出エントリの格納先が違うとき | その kind のまま型自前の表へエントリを書く。導出された方が置き換わる                                                                                                                                                              |

回帰の安全網: 読み替えは `style/__tests__/styleIntentOf.test.ts` が、適用側は
名前と文字列を運ぶ唯一の経路の
`gestures/handlers/menu/utils/__tests__/applyStyleAction.test.ts` が見る。
後者はレジストリ駆動で、実際の
バンドル配線から型が宣言した kind を全て列挙し、gate・ネスト書き込み・エントリが述べた
フィールドを本当に書くことを確かめる。新しい宣言は自動でカバーされる。宣言した型が値を
何として読むかはエントリ自身の担当（`style/__tests__/fieldEntry.test.ts`）で、登録時の
検査にも専用のスイートがある（`registries/__tests__/applyObjectDefinition.style.test.ts`）。
