> 🌐 English version: [12-plugin-architecture.md](./12-plugin-architecture.md)

# プラグインアーキテクチャ

図形をエンジンの外に置くための契約。エンジンが組み込みで持つ基本型（正本は
`packages/doc/src/model/objects/types/ObjectType.ts` の `ObjectTypes`）以外の図形は
すべて `plugins/` 配下のプラグインとして出荷しており、第三者が使うのと同じ公開 API
だけで書いてある。
出荷図形がそれで書けるなら、あなたの図形も書ける。

ここでは契約を扱う。実際の手順（パッケージ構成・量産キット・配線チェックリスト）は
[プラグインの作り方](./13-authoring-plugins.ja.md) を参照。

## プラグインはコントリビューションの束

プラグイン専用のランタイムは無い。プラグインは「何を登録するか」の宣言であり、
通るレジストリは組み込み型と同じものである。

プラグインの型は `CanvasPlugin`（`packages/canvas/src/plugin/CanvasPlugin.ts`）で、
中身の本体は `objects` である。`ObjectType` をキーに、その型の定義を値に取る。
もう 1 つのコントリビューションが `commands` で、`Command` の配列を組み込みの後に
プラグインの宣言順で登録し、絞り込みは `config.commands` の同じ 1 本のリストで効く。

## 文言は宣言が自分で持つ

`Command` の `label` はただの文字列か `LocaleMessages<string>`（ロケールタグをキーに
取り、`en` が必須の辞書）のどちらかである。プラグインが足したコマンドも、自分が
出荷する言語ぶんの名前を宣言の上だけで名乗る。`Stencil.label` とステンシル
カテゴリのラベルも同じ書き方である。キャンバスはこれを `locale` で解決し
（完全一致 → 言語サブタグ（`"ja-JP"` → `"ja"`）→ `"en"`）、解決は宣言ごとなので、
`ja` を持たないコマンドは自分の英語に落ちるだけでキャンバス全体を英語へは引き戻さない。

最終決定権はホストにある。`messages.commandLabels[id]` は、組み込みでもプラグインでも
コマンド自身の `label` より強い（`resolveCommandLabel`）。

プラグインが自分で描く文字列（メニューの見出し・フィールドのラベル）は、そもそも
キャンバスへ渡さない。プラグインが自分の `LocaleMessages` を持ち、`useCanvasLocale` /
`resolveLocaleMessages` で解決する。共有する名前空間が無いので衝突しようがなく、
core のキーにも届かない。実例は
`plugins/container-shapes/src/messages/containerMessages.ts`。

ホストは `initialConfig` から配線する。

```tsx
<Canvas doc={doc} initialConfig={{ plugins: [stickyPlugin, umlPlugin] }} />
```

`objects` の値は `ObjectTypeDefinition`
（`packages/canvas/src/plugin/ObjectTypeDefinition.ts`）で、その型についてエンジンが
要るものを全部持つ。doc ↔ state の変換・state の検証・描画コンポーネント・
移動や回転の振る舞いが必須で、輪郭やテキスト領域のような幾何の calculator と、
ステンシル・メニュー・プロパティサイドバー・SVG defs・選択コントロールのような
UI への寄与は任意である。どのフィールドがあるかはこの型定義が正本。エンジン側に
型による分岐は無く、すべて `ObjectType` キーのレジストリで解決されるため、
実行時にプラグイン型と組み込み型は区別できない。

`objects` の型が素の `Record` ではなく `Partial<Record<...>>` なのは意図的である。
`ObjectType` は開いた union なので、1 図形だけ供給するプラグインが残りを省略できる
必要がある。

## UI と headless の 2 面

プラグインはコントリビューションを 2 つの入口から二重に export する。

| 入口    | export するもの           | 消費者                                         |
| ------- | ------------------------- | ---------------------------------------------- |
| `.`     | `CanvasPlugin`（UI 定義） | `<Canvas>` を使うホスト                        |
| `./doc` | `CanvasDocPlugin`         | `createCanvasParser`・Node ツール・VSCode 診断 |

`CanvasDocPlugin`（`packages/doc/src/plugin/CanvasDocPlugin.ts`）は `CanvasPlugin`
と同じ形で、`objects` の値が `ObjectDocDefinition` になっている。

`ObjectDocDefinition`（`packages/doc/src/plugin/ObjectDocDefinition.ts`）は型の
headless 半分である。パース層がその型を知り、doc を検証し、doc から生成するのに
要るもの（`features` / `validateDoc` など）と、スキーマ・AI ドキュメントの生成器が
読むメタデータを持つ。どのフィールドがあるかはこの型定義が正本。
`ObjectTypeDefinition` はこれに UI 層の契約を足したもので、doc のフィールドは
`textRegion` も含めてそのまま引き継ぐ。だから `CanvasPlugin` は `CanvasDocPlugin` に
**構造的に代入できる** — 同じ `plugins` 配列が `<Canvas>` にもパーサーにも渡せる。

doc の `textRegion` は headless の答え（はみ出し検査・高さ自動の判定）で、「箱が
文字を持たない」を `null` で答えられるので、キャンバスが文字を描く位置ではない。
キャンバス上の置き場所は `"textSlot"` 部分種別の `region`（`(state, slotId) => Rect`。
1 スロットずつ）か `regions`（`(state) => Record<slotId, Rect>`。全スロットを 1 回で）
で宣言する。`createTextSlotPartKindDefinition({ region })` /
`createTextSlotPartKindDefinition({ regions })` で作って `partKinds` に置き、
`createFrameObjectDefinition({ textRegion })` なら前者を代わりに作る。枠の描画は
種別の `regions` を描画 1 回につき 1 度だけ呼んで全スロットの領域を受け取る（スロット
ごとには呼ばない）ので、1 つのスロットを置くのに全体のレイアウトが要る型（表のセル、
record の区画）もレイアウトは 1 回で済む。どちらもローカル座標（原点は図形の中心、
左上基準）で答え、`regions` は `state.text` の全キーを含まなければならない。登録時に
core は登録する種別を包み、どちらも宣言しなければ箱全体を当て、その上にオブジェクトの
`textVerticalBasis` を掛ける。両方を宣言した種別は作る時点で拒否する。

分けてある理由は、ドキュメントを検証するだけの消費者に React を読ませないため。
VSCode 拡張の診断も MCP サーバーも Node プロセスで `.jis` をパースする。
プラグインの `.` 入口を import すると React・`@emotion`・描画層一式が
そのバンドルに入り込む。そこでプラグインは `./doc` をそれらから切り離しており、
ESLint がこれを強制する（[プラグインの作り方](./13-authoring-plugins.ja.md#リンタが強制する境界)参照）。

パーサーは構成ごとにインスタンス化する。

```ts
const parser = createCanvasParser({ plugins: [stickyDocPlugin, umlDocPlugin] });
const result = parser.parse(text);
```

`presetDefinitions` の既定は `builtinObjectDocDefinitions`（組み込み全型の Record）。
組み込み型を自前の定義に差し替えたい場合は、その型を除いた `presetDefinitions` を
渡し、`plugins` 側で足す。`createCanvasParser()` を引数なしで呼べば既定構成（組み込み型のみ）になる。

## ライフサイクルと競合規則

- **mount 時に一括適用し、以後は不変。**`initialConfig` は read-once で、プラグイン
  構成を変えるには React の `key` を変えて remount する。動的な有効・無効化は
  非目標である。登録を外した直後の型のオブジェクトが doc に残りうるのに、それを
  どう扱うべきかに整合的な答えが無い
- **マージ順**は `presetDefinitions` → `plugins` の宣言順
- **型の重複も、コマンド id の重複も構築時に throw する。**last-wins にはしない。
  2 つのプラグインが偶然衝突したとき、どちらの図形が描かれるか・メニューの項目が
  どのコマンドを走らせるかが黙って変わるより、大きな音を立てて失敗するほうがよい。
  意図的な差し替えは「除去 + 追加」で表現する
- **キーバインドの共有は順序ではなく `canExecute` で解く。**同じキーストロークを
  複数のコマンドが名乗ってよく、実行されるのは最初に「今は使える」と答えたもの、
  どれも答えなければブラウザへ渡す。したがってバインドを共有するコマンドは、
  排他的な文脈でしか使えてはならない。`initializeCommands.exclusivity.test.ts` の
  掃き出しがそれを守らせる
- プラグインが増えても検証境界は動かない。パーサーがドキュメントを検査する唯一の
  場所であり、その先は正当性を前提にする（[設計思想](./01-design-philosophy.ja.md)）

## 公開面とその階層

主な入口を並べる。テスト用の `./testing*` などを含む全体は、各パッケージの
`package.json` の `exports` が正本。

```
@jiscribe/canvas              安定: 型の語彙・登録口・Canvas の props
@jiscribe/doc                 安定・headless: ドキュメントモデル・パーサー・doc ops
@jiscribe/canvas/unstable     tier 2: ベース実装・presentation 部材
@jiscribe/doc/unstable        tier 2・headless
@jiscribe/canvas-sdk          プラグイン向けの面（unstable の再エクスポート + 量産キット）
@jiscribe/canvas-sdk/doc      その headless 版
```

headless な 2 つのエントリは独立したパッケージである。`@jiscribe/canvas` 側に
headless なサブパスは無い。ドキュメント層が要るプラグインや Node ツールは
`@jiscribe/doc`（または `@jiscribe/canvas-sdk/doc`）を名指しする。ESLint もそこを指す。

`unstable` サブパスには frame 系のベース実装と、図形を組み立てる presentation
部材が入っている。semver の保証外であり、そのことが import 文そのものに出る。

**プラグインはこれを直接 import しない。**`@jiscribe/canvas-sdk` が `unstable` の
全面を再エクスポートし、プラグインしか使わない部材を足しているので、図形作成の
サポート面はここ 1 つになる。プラグインが何に依存してよいかを調べる場所も
ここになる。`plugins/*/src/**` からの `@jiscribe/canvas/unstable` は ESLint が弾く。

## 状態の所有権: uncontrolled + ハンドル

状態は canvas が持つ。ホストは購読で読み、`ref` 上の imperative ハンドルで書く。

```tsx
const canvasRef = useRef<CanvasHandle>(null);

canvasRef.current?.viewport.setViewport(next);
canvasRef.current?.selection.select(ids);
await canvasRef.current?.export.toSvgString();
```

ハンドルには「canvas が doc をどう描いたか」を読み返す口もある。`CanvasDoc` が
持たない側の情報で、`measure`（テキストが何行に折り返して収まっているか、図形が
枠の外へ何を描いているか、コネクターがどう通ったか、どの図形が重なっているか、
ある点に何が描かれているか）、`history`（undo スタック。`mark` / `revertTo` で
一連の編集をまとめて巻き戻せる）、`interaction`（ユーザーが操作中か＝外から書き
込むと壊れる状態か）がそれにあたる（正本は
`packages/canvas/src/controllers/handles/CanvasHandle.ts`）。doc 自体の編集に canvas は要らないので、そちらは
headless な `@jiscribe/doc` の `createDocOps` の担当。

state をホストへ持ち上げる（controlled props 化）案は検討したうえで**採らない**。

1. **性能モデルと衝突する。**`CanvasState` はドラッグ中に RAF バッチで毎フレーム
   更新される。これをホストの state 経由にすると、描画性能がホスト実装の性質に
   なる。素直に書くと遅くなる API になってしまう
2. **失敗の実例がある。**viewport は一度 controlled にして振動が起きた。imperative
   な `setViewport` と観測用の `onViewportChange` に分けて解消した経緯がある。
   全面 controlled は、この問題クラスを全項目で再導入する
3. **内部構造をまるごと公開契約に固定する。**`CanvasState` にはジェスチャー開始
   スナップショットのような transient なフィールドが含まれる。ハンドルなら
   厳選した動詞だけを見せて表現を隠せるので、カプセル化はむしろ強くなる

根拠は「状態」と「コマンド」の性質の違いにある。宣言的な props は定常状態向きで、
選択の変更・パッチ適用・undo のような一回きりの遷移はコマンド向きである。
エンジン系ライブラリの境界に命令的な façade を置くのは一般的な形でもある
（tldraw の `Editor`、Excalidraw の `excalidrawAPI`、React Flow の instance、
CodeMirror の `EditorView`）。

ハンドルが state の置き場に堕ちないためのガードレール:

- 語彙は少数のドメイン動詞に絞る。内部 state への getter を雑に生やさない。
  生やすと事実上の state 公開になり、controlled の欠点だけを輸入する
- 実装はすべて既存 reducer への dispatch に落とす。純粋関数の状態遷移を迂回する
  横道を作らない
- 読み取りは購読で返す。命令的なのは書き込み口だけにする
- 各メソッドが履歴・commit 境界に与える影響を契約として文書化する

## プラグインが守る規約

**型 ID。**`ObjectType` は開いた union である。共有語彙の候補にするつもりが無い
図形には、ベンダー名前空間を付ける（`vendor:shape`）。組み込みや他プラグインとの
重複は throw する。

**`svgDefs`。**`url(#…)` で参照する filter / gradient / marker は定義に宣言し、
キャンバス全体の `<defs>` に**型ごと 1 回**描画される。その型のオブジェクトが 0 個
でも描画されるので、参照先が消えることはない。SVG の id は document グローバルで
レジストリ側でスコープを付けられないため、**id は型名を接頭辞にする**
（`sticky-shadow`）。ホストの `objectTypes` が絞るのは組み込み型だけで、`plugins` に
入れたプラグインの型とその `svgDefs` は常に登録される。エクスポートは live SVG の `cloneNode` なので、プラグイン提供分も自動で入る。

**テキストスロット**（`features.text: "slots"`）。整数風のスロット ID（`"0"` /
`"1"`）を使わない。JS は整数風の自前キーを挿入順より前に数値昇順で列挙するため、
`state.text` のキー順 — 既定スロット（Enter 編集）と描画順を決めているもの — が
型の意図を反映しなくなる。パーサーが該当 ID を弾くので、それを含むドキュメントは
読み込まれない。

**`menu`。**optional で 3 通りの意味を持つ。省略は `features` からの既定導出、
配列の宣言は全置換、`[]` はメニュー無し。導出規則は `createDefaultMenu` と
その unit テストが正である。

**`propertyPanel`。**プロパティサイドバーのセクションで、意味は `menu` と同じ
3 通り。省略は `features` からの既定導出、配列の宣言は全置換、`[]` は
セクション無し。導出規則は `createDefaultPropertyPanel` とその unit テストが
正である。導出でも宣言でも、この後に `derivePropertyPanel` が、定義がそれを含意
する型に対して自動高さの行を layout セクションへ、縦基準の行を text セクションへ
足すので、宣言側がこの 2 行を書く必要はない。宣言は組み込みの行種を並べ、どれも
当てはまらないところに型自身の行を足す形になる。

**`propertyPanel` のカスタム行。**プラグインが自分で描く行は組み込みの行に混ぜる
`{ type: "custom"; id; component }`（`PropertyPanelCustomItem`）で、ObjectMenu の
カスタム項目と同じ形である。コンポーネントが受け取るのは `PropertyPanelItemProps`
だけで、選択の切片と、スタイルを書く `onStyleIntent`・フレームの数値を書く
`onTransformUpdate` が入っている（どちらの型も
`packages/canvas/src/controllers/ui/menu/PropertyPanel/PropertyPanelTypes.ts` が正本）。
組み込みの行が読むコントローラ state は渡らない。使ってよいのは
`@jiscribe/canvas/unstable`（したがって `@jiscribe/canvas-sdk`）が公開する
プロパティサイドバーの UI キットで、全行が共有するラベル列の `PropertyRow`、
その隣に置く入力部品（`PropertyNumberField` / `PropertyColorField` など）、
単体で 1 行になる `PropertyCheckbox`（セクションの左端から、ボックスと右側の
ラベル）がある。キットに何があるかは `packages/canvas/src/unstable.ts` の export
が正本。行が**述べる**値はキット唯一の読み取り API `useSelectionStyle(name)` から
取る。そのプロパティについて選択全体が何を言っているかを、同名の書き込みが届くのと
まったく同じ object について返すので、プラグインの行も組み込みの行と同じように
mixed になれる（[スタイルシステム](./10-style-properties.ja.md) 参照）。自前の型が
宣言したプロパティの行は、kind の手前にその型の表を渡す
（`useSelectionStyle(CONTAINER_STYLE_ENTRIES, "headerFill")`）。宣言から型が付く。
書き込みはその鏡で、`onStyleIntent(intent, commit)` は名前と文字列ではなく述べられた
編集そのものを取る。型自身の kind は `{ kind, value }` と書く（宣言した名前と、
宣言どおり型付けした値か transport の文字列）。書く前に知っておく規約は 2 つ:

- 複数型のマージが行を突き合わせる鍵は `id` である。同じ行を出す型どうしは同じ
  綴りにすること。綴りが違う型が混ざった選択ではその行は落ちる（片方しか持たない
  組み込みの行種が落ちるのと同じ）
- 受け取るスタイル種別（後述の `partKinds` の `styleIntentKinds`）を宣言した種別の部分を
  選んでいる間 — テキストスロットがそれで、図形の文字の編集中に選ばれているスロットも
  含む — サイドバーに残るのは、扱う種別がすべてその中にある組み込みの行だけ。カスタム行は
  何を書くかを申告できないので落ちる。ObjectMenu も項目を同じ規則で絞る

**`propertyPanel` のセクション表示。**セクションは `isShown(selection)` を持てる。
描く前に、行が読むのと同じ選択の切片（`PropertyPanelSelection`）を渡して
尋ねられる。全ての行が null を返す
セクションにはこれが要る。行は自分で消えるが、アコーディオンの見出しだけが空の中身の
上に残るためである。コア自身の用例はコネクターの「ラベル」「ラベルの枠線」セクションで、ラベルに
文字があるときだけ出る。省略は常に出す。

実例は `plugins/container-shapes` である。自前のスタイル 2 つを自分の表
（`src/style/containerStyleEntries.ts`）として宣言し、`createFrameObjectDefinition` の
`styleEntries` へ渡す:

```ts
export const CONTAINER_STYLE_ENTRIES = {
	headerFill: declaredFieldEntry("headerFill", "string"),
	headerHeight: declaredFieldEntry("headerHeight", "number"),
} satisfies DeclaredStyleTable<ContainerState>;
```

宣言する表のエントリは、どれも自分が書くフィールドを述べる（`fields`。Doc に保存する
ものを何も書かないなら `[]`）。述べないエントリは登録時に拒否する。`declaredFieldEntry` は
これを自分で埋める。

`header-fill` 行が `PropertyColorField` から `onStyleIntent` 経由で `headerFill`
を書き、Fill セクションの本体色の下に並ぶ。`header-height` 行は
`PropertyNumberField` から `headerHeight` を書き、Layout セクションのサイズの下に
並ぶ。現在値はどちらも `useSelectionStyle(CONTAINER_STYLE_ENTRIES, …)` で述べ、宣言から型が
付くので自前で絞るものは無い。文言はどちらもプラグイン自身の辞書から取る。

宣言した種別は `features` から導いた種別を置き換える。core の種別の書き込む先を型が
変えるにはこれを使う。`plugins/table-shape` は `fill` を宣言し直し、pick で書き先を
振り分けている（何も選んでいなければ自分の背景へ、選んでいれば pick が届くセルの
`fill` へ。届くセルは文字系のエントリと同じ `resolveTextSlotIds` の答えで、後述の
`partKinds` の `textSlotIds` 参照）:

```ts
const TABLE_STYLE_ENTRIES = {
	fill: tableFillEntry,
} satisfies DeclaredStyleTable<TableState>;
```

文字スタイルがどのスロットに届くかは、表が宣言するものではない。core の文字系の
エントリが選ばれた種別の `textSlotIds` に従うので、表は文字系の種別を 1 つも宣言しない。

**コマンド。**プラグインが足したコマンドの `execute` は遷移のすべてを担い、
Doc を編集したと述べることもそこに含む。返す状態を `commitEdit(state)`
（`@jiscribe/canvas/unstable`、したがって `@jiscribe/canvas-sdk` から取れる）に通す。
reducer は、これが進める `commitVersion` を見て履歴を積み、保存を起こす。COMMAND の
経路は `execute` の後で祖先グループの枠・内容から決まる箱・部分選択を整えるが、commit は
しない。`commitEdit` を通さずに Doc を変えたコマンドは、undo できず保存もされない。
選択だけを動かすコマンドは状態をそのまま返す。

**i18n。**プラグインが足したコマンドは自分の `label` をロケール別に宣言する。
プラグインが自分で描く文字列はプラグインが持つ辞書から取り、`useCanvasLocale` /
`resolveLocaleMessages` で解決する。core の文言キーにプラグインの語彙は足さない。

**`selectionControls`。**プレーンな宣言（`SelectionControlDefinition`。ハンドルを
描く `Component` と、ジェスチャーを解釈する `handle` の組）で、基底クラス継承は無い。`handle` に渡すのは自オブジェクトの情報（現フレーム + ジェスチャー開始
スナップショット）とカーソルだけである。ハンドルに付ける `data-action` の導出
（`selection:<objectType>:<name>`。`Component` に `action` prop として渡り、末尾に足した
`:<sub>` は `SelectionControlEvent.subAction` として戻る）・スナップショットのガード・
COW 書き戻し・エッジスクロール解除は内部 adapter が肩代わりする。

`handle` が呼ばれるのは `events` に挙げたイベント種だけで、省略すれば drag / dragEnd
（`DEFAULT_SELECTION_CONTROL_EVENTS`）。`"click"` / `"doubleClick"` を挙げれば押しただけの
操作も届き、そのイベントに `start` / `delta` は無い。戻り値は `{ object?, selection? }`
で、`object` は自オブジェクトの置き換え（drag なら dragEnd で、クリックならその場で
確定する）、`selection` は自オブジェクトの上の部分選択（`null` で解除、省略なら
そのまま）。`selection` の `kind` は `partKinds` に宣言したものでなければ落とされる。
選択だけを返したクリックは編集にならない。いま立っている部分選択は `Component` に
`selectedPart` として、`handle` にも `context.selectedPart` として渡るので、ハンドルは
自分が選ばれていることを描け、修飾キー付きのクリック（`event.mods`）は選択を置き換えずに
伸ばしたり削ったりできる。オブジェクトの
移動中と変形ハンドルでのリサイズ中は `Component` を描かない（接続アンカーと同じ）。
コントロール自身のドラッグ中は描いたままになる。

**`partKinds`。**その型がオブジェクトを分割する部分 id の名前空間（`kind`）ごとに
`ObjectPartKindDefinition` を 1 つ宣言し、`has`（その id がまだそのオブジェクトの部分を
指すか）と `delete` を述べる。core は部分 id を不透明な文字列として運び、型へ渡し
返すだけなので、`"3"` や `"cell:2,1"` の意味を知っているのは型だけである。省略すれば
そのオブジェクトは不可分で、Delete は全体の削除へ落ちる。組み込みの `vertex` が
実例で、polyline / polygon / connector がそれぞれ、削除を断る頂点数の下限とともに
宣言している。`features.text` を持つ型には `"textSlot"` の種別が宣言なしで
付き、部分 id は自分の `text` のキーになる（1 ボディの型なら `body` だけで、テキスト
編集中はこのスロットが選ばれている）。自分で `"textSlot"` を宣言すれば、
衝突ではなくその既定を置き換える。core が導くものを残して足りない分だけ足すなら、
`createTextSlotPartKindDefinition()` を spread する（表は `range` と
`delete` を足し、`styleIntentKinds` に fill を足している）。スロットの置き場所は
`region` / `regions` として渡す。どちらの場合も、登録する種別の `region` / `regions`
は core が箱全体への代替と垂直基準で包むので、スロットは描かれ編集される位置に
枠が出る。

部分を押せるようにするには、その要素の `data-part` に `<kind>:<partId>` の住所を
書くだけでよい（`controllers/gestures/handlers/utils/partAddress.ts`。テキストスロットの
組み立て関数は `@jiscribe/canvas` の `textSlotPart`）。`data-part` が運ぶのはこの住所
だけで、押すと何かが始まる要素——メニューの行や選択コントロールのハンドル——は
代わりに `data-action` を持つ。メニュー用の文字列は `@jiscribe/canvas/unstable` の
`commandAction` / `toggleAction` / `setAction` / `sliderAction` で組む（文法は
`04-gesture-system.ja.md`）。

選択に関わる宣言は 4 つあり、どれも省略できる。

- `region` — 部分のオブジェクトローカル座標での矩形。宣言した種別は、選ばれた部分
  ごとに枠が描かれ、持ち主自身の枠は描かない。null を返した部分は枠を描かない。
  枠が 1 つでも描かれている間は、それと競う transform のハンドルが隠れる。
  `vertex` は宣言しない（頂点には自前のハンドルがある）ので、枠もハンドルの隠れも
  起きない
- `regions` — 全部分の矩形を 1 回で返す（部分 id がキー、座標は `region` と同じ）。
  1 つの部分を置くのに全体のレイアウトが要る種別（表のセル）向け。両方を宣言した
  種別は、どちらからも同じ矩形を答える
- `list` — その時点の全部分 id。Tab が巡る順序で、Shift クリックで伸ばした範囲の
  既定の解決（アンカーとフォーカスの間の区間）もこの順序で取る
- `range` — アンカーとフォーカスから範囲に含まれる部分を返す。部分が一列に並ばない
  型（表のセルの矩形範囲のような 2 次元の型）向けで、省略すれば `list` の区間になる。
  返す id はどれも `has` を通るもので、型自身の順序で並べる。空は返せない（範囲は
  少なくともフォーカスを含む）

pick へのスタイルに関わる宣言がさらに 2 つある。

- `styleIntentKinds` — この種別の pick が受け取るスタイル種別（core の種別も型自身の種別も）。
  宣言すれば、ObjectMenu とサイドバーは選ばれた種別に従う。扱う種別がすべてこの中に
  ある組み込みの操作だけを残し、それ以外とカスタム項目を落とし、システムセクションと
  Meta セクションを隠す。省略すれば、この種別の pick のもとでも全操作の主語は
  オブジェクトのまま（`vertex`）。core が付ける `"textSlot"` は文字系の種別
  （`TEXT_STYLE_INTENT_KINDS`）を宣言している
- `textSlotIds` — この種別の pick が届くテキストスロット。範囲を展開済みの、pick が覆う
  id を受け取る。文字系のエントリはこのスロットに書き、ここから読む
  （`resolveTextSlotIds`）。省略すれば pick は全スロットに届く。`"textSlot"` は選ばれた
  スロットそのものを答える

表の `row` / `column` は両方を宣言する。トラックの pick はセルの pick と同じく文字系の
種別と `fill` を受け取り、そのトラックが通るセルに届く。行を選んで色や太字を選べば
その行のセルに当たり、メニューには文字と背景の操作が出る — 表が文字系の種別を
自前で宣言することなく。`fillOpacity` は表の背景だけのものなので含まれず、どの pick の
もとでもその行は隠れる。

## まだ拡張できないもの

無いものを前提に設計しないよう、限界を明示しておく。

| 領域                         | 現状                                                                                                                                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 組み込み UI                  | ObjectMenu / ContextMenu は無条件にマウントされ、ホストから隠す・差し替える手段が無い（Toolbar は `toolbar.show: false` で隠せ、`toolbar.sections` で中身を差し替えられる）                     |
| UI スロット                  | ツールバーの `{ type: "slot" }` 項目だけ。オーバーレイ層のスロットは無い。プロパティサイドバーは、型が宣言したセクションの 1 行としてしかコンポーネントを受け取らない（パネル単位では渡せない） |
| 細粒度のプロパティ書き戻し   | ハンドルに `updateProperties` が無い。`doc` prop の差し替えは外部変更扱いで選択状態がリセットされ履歴境界も切られるため、編集経路に使えない                                                     |
| インタラクションの調整       | スナップ閾値などが定数でハードコードされている。エッジスクロールとパン/ズームも外部から無効化できない                                                                                           |
| コマンドのショートカット     | プラグインはコマンドを追加でき（`CanvasPlugin.commands`）、既存コマンドと同じバインドを名乗ることもできるが、そのコマンド自身のショートカットを付け替える・外すことはできない                   |
| ObjectMenu の項目種          | 組み込みの項目種は switch 固定で、データ駆動なのは `custom` コンポーネント項目だけ                                                                                                              |
| プロパティサイドバーの項目種 | 組み込みの項目種は固定の引き当てで、データ駆動なのは `custom` コンポーネント行だけ。その行は選ばれた部分がサイドバーを絞っている間（`styleIntentKinds`）は落ちる                                |

一方で**できること**: 独自の doc スキーマ・検証・描画・ステンシル・メニュー・
プロパティサイドバーのセクション・スタイルプロパティ・輪郭/スナップ挙動・
型固有の選択コントロール・共有 SVG defs・自前のコマンド・
自前の i18n を持つ図形型を、外部パッケージから追加できる。コマンドは
`@jiscribe/canvas-sdk` の `Command` に対して書く。コントローラの状態と
レジストリ束を受け取る型なので、これらは unstable 面に置いてある——コマンドは
確定した契約ではなくキャンバスの作業状態そのものを読んで返すため。
