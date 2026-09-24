> 🌐 English version: [03-data-model-and-persistence.md](./03-data-model-and-persistence.md)

# データモデルと永続化

canvas はデータを 2 つの形で持つ。**Doc**（保存用・ツリー）と
**State**（実行用・フラット）で、両者を Mapper が相互変換する。
この分離は [設計思想](./01-design-philosophy.ja.md) の「性能優先」と「境界での防御」に基づく。

## Doc と State

|      | Doc（`@jiscribe/doc`）                   | State（`states/`）                          |
| ---- | ---------------------------------------- | ------------------------------------------- |
| 用途 | 永続化・ファイル I/O                     | ランタイム編集                              |
| 形   | ツリー（`GroupDoc.children` に子を内包） | フラット（`objects` は ID キーの `Record`） |
| 例   | `RectDoc`, `GroupDoc`, `ConnectorDoc`    | `RectState`, `GroupState`, `ConnectorState` |

ツリーは人間にもファイル差分にも読みやすい一方、編集時の探索・更新には不向き。
そこで実行時はフラットに正規化し、ID で O(1) アクセスできるようにする。

## Mapper による相互変換

形状ごとに State と Mapper を共配置する（[アーキテクチャ](./02-architecture.ja.md) の「共配置」）。
各 Mapper は **自身のプロパティのみ** を変換し、子要素の再帰は行わない。

```
states/objects/primitives/rect/
├── RectState.ts         # State 型
├── RectMapper.ts        # Doc ↔ State
├── validateRectState.ts # State のバリデータ
└── __tests__/
```

全体変換は `states/canvas/CanvasMapper.ts` が一元管理する（`canvasToState` / `canvasToDoc`）。
CanvasMapper は形状タイプごとの Mapper を、引数で受け取る `ObjectMapperRegistry`
（`states/registry/`。実体はキャンバスごとのレジストリ束の `registries.objectMapper`）から引いて
多態的に呼び出す。`canvasToState` は、内容から枠を導き直す型のために `ObjectContentResizerRegistry`
も受け取る。束ごとではなくレジストリを個別に受け取るのは、どちらも **`states/` 層のレジストリ**
（対象の Mapper 群と共配置）で、controllers 層のレジストリ束に依存しないためである（理由は
[アーキテクチャ](./02-architecture.ja.md) を参照）。ツリー ↔ フラットの
構造変換（親子関係の展開・再構築）はこの一点に集約し、個々の Mapper には漏らさない。

## 永続化フォーマット（`.jis` / `CanvasDoc`）

保存形式は `CanvasDoc`（`@jiscribe/doc` の `model/canvas/CanvasDoc.ts`）。

```jsonc
{
	"version": 1,
	"root": [
		/* ObjectDoc とコネクターを z-order 順（背面→前面）で混在させた配列。
		   group は children を内包。コネクターは group の子にはならず root 直下のみ。 */
	],
}
```

- `root` … 図形とコネクターを混在させた単一配列。図形には登録済みの型なら何でも置ける（組み込みの型は `@jiscribe/doc` の `plugin/builtinObjectDocDefinitions.ts`、それ以外はプラグインが足す）。**配列順がそのまま重なり順（z-order）**になる
- トップ階層には `version` と `root` のほか、省略可能なフィールド（キャンバス面の色 `background` など）がある。正本は `CanvasDoc.ts`
- `$schema` … 生成しない。既存の `.jis` が持っていても parse は受け付けるが、保存時に `canvasToDoc` が落とす（`$schema` 行のあるファイルを編集すると保存でその行が消えるのは意図どおり）
- コネクター（`type: "connector"`）… 端点は `source` / `target` の `owner{type,id}` + `anchor` で対象図形を参照する。`root` 直下にのみ置かれ、group の子にはならない。少なくとも一方の端点が owned であること（両端 free は不正）
- 色フィールド（`stroke` / `fontColor` / `fill`）… 具体的な CSS 色のほか、sentinel 値 `"auto"`（テーマ追従）を取りうる。`"auto"` は描画時にテーマ前景色へ解決される（[描画・テーマ](./08-rendering-and-theme.ja.md) 参照）。新規図形の `stroke` / `fontColor` の既定値は `"auto"`
- 数値フィールド（座標・サイズ・回転）… 丸めは **State → Doc へ変換する地点**で `PRECISION` に揃える。ジェスチャーやコマンドの計算地点では丸めない。Doc の幾何は State から導出されるため（`x = cx - width / 2`）、手前で丸めても導出でずれる。境界 1 か所で決めることで、自前では丸めない経路（グループ変換・プラグインの制御点・`createDocOps`）も同じ精度に乗る。丸め関数は `@jiscribe/doc` の `model/objects/utils/roundDocNumbers.ts` にまとまっている
- 形式仕様の全文は `../../doc-schema/assets/jiscribe.schema.json` を参照（散文の導入は `../../doc-schema/assets/ai-guide.md`）

### `image` はファイルを指すだけで、キャンバスは読まない

`image` が持つのは `src` ——`.jis` があるディレクトリからの相対パスで、その中に
収まるもの（区切りは `/`、`..` 不可、絶対パス・URL 不可）。画像本体は文書に入らず、
`width` / `height` は必須なので、ファイルに手が届かない環境でも文書のレイアウトは
成り立つ。

ファイルを読むのはホストの仕事で、`<Canvas>` の
`resolveImage` prop がその口。`meta.reference` を `onOpenReference` へ渡すのと
同じく、`src` を無加工で渡して `Blob` を受け取る。キャンバスはパスを解決も検証も
しない——ホストが共有する唯一の読み方は `splitDocRelativePath`（`@jiscribe/doc`）。
prop を省いても、promise が reject しても、そもそも `<Canvas>` の外で描かれても、
図形はプレースホルダを描く。画像が黙って絵から消えることはない。

届いたものは `src` ごとに保持する（`useDocImages`）。画面の `<image>` が描く blob
URL と、同じバイト列の `data:` URI の 2 つで、後者が書き出しに使われる。blob URL は
作られたタブの外では何も指さないので、`.jis.svg` と PNG はどちらもバイト列を埋め込む。
ファイルが届かなかった画像は書き出しから外す——図を見る人が受け取るのは
プレースホルダの絵そのものであって、切れた参照ではない。

### テキストモデルの非対称（図形の `text` とコネクターの `label`）

文字を持つフィールドの格納形が、図形とコネクターで **意図的に非対称** になっている。

- **単一本文の図形（rect / ellipse / diamond / sticky など）** … `text` / `textAlign` / `fontColor` … を
  **トップ階層にフラット**で持つ（`features.text: "body"` が `TextStyleDoc` を合成する）。
- **ソース言語の図形** … `features.text: "source"` を宣言し、同じフラットな群を、その本文が持てる
  ぶんだけ狭めて持つ（`SourceTextStyleDoc`）。`text` はプレーンな string のみで run 形式を取らず、
  装飾のタイポグラフィ（`fontWeight` / `fontStyle` / `textDecoration`）を持たない——それを決めるのは
  図形自身の構文だから。どのフィールドを受け付けるかの正本は `textStyleKeysOf`、root 形式の単一本文か
  の判定は `isSingleBodyText`。
- **複数スロットの図形（uml-shapes の record など）** … `features.text: "slots"` を宣言し、`text` を
  **スロット ID キーのオブジェクト**で持つ（`text: { name: {…}, rows: {…} }`。各スロットは
  `TextSlot` = 内容＋タイポグラフィで、スロット集合は型ごとにクローズド）。
- **コネクター** … 注記を `label` の **ネストした 1 オブジェクト**で持つ（`features.text` は立てない）。
  中身は本文 `text`、経路上の配置（`position` / `offset`）、文字スタイル、背景と枠線で、型の正本は
  `@jiscribe/doc` の `ConnectorDoc.ts` の `ConnectorLabel`。背景 `fill`・枠線 `stroke` などは図形と
  同じ語彙を借りるが、`label` の中にネストする点が異なる。

State 側は図形のどの形も **keyed スロット一形**に正規化される（root 形式の型は mapper が単一
`body` スロットへ展開し、保存時に畳み戻す。`TextSlotsMapper` 参照。移すのはその text type が
受け付けるフィールドだけなので、`"source"` のスロットは装飾のフィールドを持たず、内容は
プレーンな string で書き戻る）。描画・編集・スタイリングの
consumer はこの正規形だけを読むので、doc の形による分岐を持たない。

この差は層の都合ではなく、**役割（ロール）の違い**を映したもの。図形の `text` は「その図形の
_本文_」（中心的・ほぼ主役・ボックス内整列あり）。コネクターの文字は「辺に付く _注記_（edge label）」
（任意・副次的・整列概念なし）で、さらに `position`（経路に沿った比率）/ `offset`（垂直距離）という
**コネクター固有の配置軸**を持つ。フラットに流用すると (1) これら固有フィールドが他キーと混ざって
帰属が読めない (2) 線の短いタグに無関係な `textAlign` / `verticalAlign` が付く、という
歪みが出る。**違うものは違う形でよい**（無理に揃えるのは「偽の一貫性」）という判断。これは JSON を
生成する AI から見ても、型ごとに持つものが違う前提（`../../doc-schema/assets/ai-guide.md` は
"Object quick reference" や "Geometry by type" で型ごとに分けて説明している）と整合し、混乱コストは低い。

この非対称が気になった場合の指針:

- **解は「下げる」ではなく「上げる」**。対称性を取りたいなら、コネクターを平らにする（固有フィールドが
  浮く・無関係フィールドが付く前述の歪みが復活する）のではなく、**図形側も `label` ネストに寄せて
  揃える**のが筋。後方互換は不要方針（自分しか使っていない）なので技術的には可能。
- **ただし second reason が出るまでやらない**。実際に #167 で「図形に複数テキスト領域」という
  第二の動機が現れた際、採ったのは label ネストへの統一ではなく**名前付きテキストスロット**
  （State は常に keyed、単一本文の doc はフラット糖衣を維持）だった。コネクター `label` の
  スロット統合（型固有分岐の撤去）は、さらに動機が揃った時点の任意課題として残っている。
- **完全対称は本質的に取れない**。仮に全部ネストしても、キー名は図形＝本文（`text`）、
  コネクター＝注記（`label`）で **意味が違う**ため、ある種の非対称は概念上どうしても残る。

**スタイリング UI のネスト対応（ドット記法）**: スタイリングのプロパティ更新配管
（メニュー項目 → `STYLE_PROPERTY_UPDATE` または ObjectMenu のジェスチャー `set:{property}:{value}` →
`StylePropertyRegistry.apply`）はフラットなプロパティ名を運ぶ。ラベルのスタイル（`label.fill` /
`label.stroke` / `label.fontColor` など）はネストのため、この配管に **ドット記法のプロパティ名のまま相乗り**させる。
2 経路とも収束点は `StylePropertyRegistry.apply` の 1 か所。`label.*` は connector 固有の宣言
（`ConnectorExtraStyleProperties`）として登録され、共有の書き込みパスがドットをネスト merge と
解釈して `connector.label` へ書く（label 未設定時は no-op）。共有 UI
（`ObjectMenuColorPickerGrid` / `ObjectMenuSlider`）と `commit`（ライブプレビュー＋履歴 1 件）の機微を
再実装せずに再利用するための割り切り。専用アクションを増やす案は、この commit 機微を二重持ちすることになるため
採らない。ただしスタイルレジストリの管轄外のものは兄弟アクションを通る。枠そのものの数値（位置・サイズ・回転）は
`TRANSFORM_PROPERTY_UPDATE`、doc 自身の設定（キャンバス面の `background` など）は `DOCUMENT_PROPERTY_UPDATE`、
オブジェクトの `meta` は `META_PROPERTY_UPDATE`。どれも commit 機微は二重に持たず、コミット末尾
（`controllers/reducer/canvasReducer.ts` の `commitPropertyUpdate`）を共有する。`DOCUMENT_PROPERTY_UPDATE` は
対象が選択ではなく doc である点が違い、`null` はヘッドレスの `setBackground` と同じく「フィールドを消してテーマに従う」を意味する。

## parser の二段検証（境界での防御）

外部から渡る JSON 文字列は、`createCanvasParser` が返すパーサー（`@jiscribe/doc` の `parse/`）が
**例外を投げずに判別可能なユニオン**（`CanvasParseResult`。定義は `parse/parseWithRegistry.ts`）で
結果を返す。これにより拡張側・Webview 側が同一ロジックを共有し、エラーの取りこぼしを防ぐ。

失敗は段ごとに別の `kind` で返る（JSON の構文エラー・構造エラー・意味エラー・検証中の予期しない例外）。
成功（`ok`）は doc に加えて、取り除いた内容と読まずに残した内容を報告する `warnings` を持つ。

検証は 2 段階で、その手前に未知の内容を取り除く段がある。構造が成立していなければ意味検証へ進まない。

1. **未知の内容の除去 `stripUnknownContent`** — 列挙型フィールドの未知の値を取り除く。これはエラーにせず
   `ok` の `warnings` として報告し、文書の残りは読み込む。`ok.doc` は除去後の doc なので、それを保存すると
   除去が確定する。未登録の型のオブジェクトは取り除かず、**不透明オブジェクト**（`OpaqueObjectDoc`）として
   中身に触れずその位置に残し、同じく `warnings` で報告する。参照先として扱えるよう id は要り、id の無い
   ものだけは取り除く（それで空になった group や、その中の図形を指すコネクターも連鎖して）。
2. **構造検証 `validateStructure`** — 各ノードの型・必須フィールドを検証。型別の検証は
   パーサーが構築した doc バリデータのレジストリに委譲し、`group` の `children` 再帰だけは構造ルールとしてここで処理する。
   レジストリは、その型が持たないフィールドが書かれていればそれも報告する（綴り間違い、`markdown` カードに
   残った `fontWeight` のような、その図形が取らないスタイル）。持てる名前は型の定義（`features` と `extraKeys`）から
   読むので、登録された型すべてが対象になり、`validateDoc` は許可リストを持たない。これはエラーではなく **warning**
   （`SemanticDiagnostic.severity`）で、文書は読み込まれ、パーサーが `ok.doc` からそのフィールドを取り除く。
   消えるのは次の保存のときになる。キー名はファイルが持ちうる任意の文字列なので、warning は取り除く位置を
   `unknownKeyPath` として構造で持つ。不透明オブジェクトの中身はこの判断の対象外。文書のどこかにエラーが
   1 つでもあれば結果は `structure-error` でエラーだけを返す（開けない文書に保存すべき内容は無い）。
3. **意味検証 `validateSemantics`** — 文書全体を横断しないと判断できない整合性を検証。
   - **ID の一意性**: root ツリー（コネクター含む）を通じて ID が重複しないこと。
     `CanvasDoc` はネストしたツリーなので「親子の循環」は構造的に起こり得ず、循環に見えるケースは実質「同一 ID の別オブジェクト」= ID 重複でしかない。
   - **connector の参照整合性**: owner の `id` が実在し、参照先が connectable な型であること（型の `features.connectable` が決める。例: group や connector は不可）。不透明オブジェクトとその `children` の中の id は、型を判断できないので実在だけを見る。
   - **自己ループの端**: source と target が同一オブジェクトを指す自己ループは許可されるが、どちらかの端が `center` アンカーだと意味エラーになる（両端を connectPoint に固定する）。自己ループは `points` が空の間は専用の直交ルートで矩形ループとして描画され、頂点を置けばその経路に置き換わる（`resolveConnectorPoints` / `routeSelfLoop` を参照）。

検証に使う doc バリデータのレジストリは parse 時にだけ必要なため、パーサーが渡された定義集合から自前で構築する。
グローバルを書き換えないので、プラグイン構成の異なるパーサーが同一プロセスに同居できる。

### 不透明オブジェクトの往復

知らない型のオブジェクト（出荷していないプラグインの図形、新しい版の図形）は、どの編集経路を通っても
消えずに元の位置へ書き戻る。何を「知らない」とするかは読み手ごとに決まる（パーサーは自分のレジストリ、
DocOps は自分の定義集合、キャンバスは自分の mapper）。

- **キャンバス**: `canvasToState` はマッパーの無い型を `objects` に入れず、`CanvasState.opaqueObjects` に
  読み込み時の位置（コンテナと、その前に描かれていた既知の兄弟）と一緒に置く。子が全て不透明な group と、
  端が `objects` に無い図形に付いたコネクターも同じく丸ごと脇へ置く。描画・当たり判定・選択・編集はどれも
  `objects` しか見ないので、これらは描かれず触れない。`canvasToDoc` が元の位置へ戻す。前にあった兄弟が
  消えていれば更に前の兄弟の後ろへ、コンテナの group ごと消えていれば group があった位置へ落ちる。
  端の図形が消えた不透明なコネクターだけは、図形の削除がコネクターを連れていくのと同じく書き戻さない。
- **DocOps**: 不透明オブジェクトの中へは降りない（`children` を持っていても group としては扱わない）。
  削除・並べ替え・グループ化はできるが、移動・リサイズ・スタイルなど中身に触る操作は対象外になる。
  `listObjects` は `unknownType: true` を付けて列挙する。

### headless なパッケージ

ドキュメント層は `@jiscribe/doc` という独立したパッケージで、UI 依存（react / emotion / katex）を含まない。
「テキストを `CanvasDoc` にパースしたいだけ」「プログラムから `CanvasDoc` を組み立てたいだけ」の
利用者（VSCode 拡張の Node 側 DiagnosticProvider・MCP サーバーなど）向け。

```ts
import { createCanvasParser } from "@jiscribe/doc";
```

この境界を通った Doc は正当であることを前提に、内部関数は防御的チェックを省く
（[設計思想](./01-design-philosophy.ja.md) の原則 4）。外部同期の入口での検証は
[外部同期・VSCode 連携](./07-external-sync.ja.md) を参照。
