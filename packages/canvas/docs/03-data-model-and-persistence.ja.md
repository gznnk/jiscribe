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
├── RectState.ts      # State 型
├── RectMapper.ts     # Doc ↔ State
└── __tests__/
```

全体変換は `states/canvas/CanvasMapper.ts` が一元管理する（`canvasToState` / `canvasToDoc`）。
CanvasMapper は形状タイプごとの Mapper を `objectMapperRegistry`（`states/registry/ObjectMapperRegistry`）から
引いて多態的に呼び出す。全体変換のためにレジストリを参照する唯一の箇所だが、そのレジストリは
**`states/` 層内**（対象の Mapper 群と共配置）に閉じているのでレイヤーをまたぐ依存ではない（理由は
[アーキテクチャ](./02-architecture.ja.md) を参照）。ツリー ↔ フラットの
構造変換（親子関係の展開・再構築）はこの一点に集約し、個々の Mapper には漏らさない。

## 永続化フォーマット（`.jis.json` / `CanvasDoc`）

保存形式は `CanvasDoc`（`@jiscribe/doc` の `model/canvas/CanvasDoc.ts`）。

```jsonc
{
	"$schema": "https://schema.jiscribe.dev/v1/jiscribe.schema.json",
	"version": 1,
	"root": [
		/* ObjectDoc とコネクターを z-order 順（背面→前面）で混在させた配列。
		   group は children を内包。コネクターは group の子にはならず root 直下のみ。 */
	],
}
```

- `root` … 図形（rect / ellipse / diamond / polyline / polygon / group / sticky / svg）とコネクターを混在させた単一配列。**配列順がそのまま重なり順（z-order）**になる
- コネクター（`type: "connector"`）… 端点は `source` / `target` の `owner{type,id}` + `anchor` で対象図形を参照する。`root` 直下にのみ置かれ、group の子にはならない。少なくとも一方の端点が owned であること（両端 free は不正）
- 色フィールド（`stroke` / `fontColor` / `fill`）… 具体的な CSS 色のほか、sentinel 値 `"auto"`（テーマ追従）を取りうる。`"auto"` は描画時にテーマ前景色へ解決される（[描画・テーマ](./08-rendering-and-theme.ja.md) 参照）。新規図形の `stroke` / `fontColor` の既定値は `"auto"`
- 数値フィールド（座標・サイズ・回転）… 丸めは **State → Doc へ変換する地点**で `PRECISION` に揃える。ジェスチャーやコマンドの計算地点では丸めない。Doc の幾何は State から導出されるため（`x = cx - width / 2`）、手前で丸めても導出でずれる。境界 1 か所で決めることで、自前では丸めない経路（グループ変換・プラグインの制御点・`createDocOps`）も同じ精度に乗る。`@jiscribe/doc` の `roundDocNumbers` 参照
- 形式仕様の全文は `../../doc-schema/assets/reference.md` と `../../doc-schema/assets/jiscribe.schema.json` を参照

### テキストモデルの非対称（図形の `text` とコネクターの `label`）

文字を持つフィールドの格納形が、図形とコネクターで **意図的に非対称** になっている。

- **単一本文の図形（rect / ellipse / diamond / sticky など）** … `text` / `textAlign` / `fontColor` … を
  **トップ階層にフラット**で持つ（`features.text: "body"` が `TextStyleDoc` を合成する）。
- **複数スロットの図形（uml-shapes の record など）** … `features.text: "slots"` を宣言し、`text` を
  **スロット ID キーのオブジェクト**で持つ（`text: { name: {…}, rows: {…} }`。各スロットは
  `TextSlot` = 内容＋タイポグラフィで、スロット集合は型ごとにクローズド）。
- **コネクター** … 注記を
  `label: { text, position, offset, fontColor, fontFamily, fontSize, fontWeight, fill, stroke, strokeWidth, strokeDashType }`
  の **ネストした 1 オブジェクト**で持つ（`features.text` は立てない）。背景 `fill`・枠線
  `stroke`/`strokeWidth`/`strokeDashType` は図形と同じ語彙を借りるが、`label` の中にネストする点が異なる。

State 側は図形のどちらの形も **keyed スロット一形**に正規化される（`"body"` 型は mapper が単一
`body` スロットへ展開し、保存時に畳み戻す。`TextSlotsMapper` 参照）。描画・編集・スタイリングの
consumer はこの正規形だけを読むので、doc の形による分岐を持たない。

この差は層の都合ではなく、**役割（ロール）の違い**を映したもの。図形の `text` は「その図形の
_本文_」（中心的・ほぼ主役・ボックス内整列あり）。コネクターの文字は「辺に付く _注記_（edge label）」
（任意・副次的・整列概念なし）で、さらに `position`（経路に沿った比率）/ `offset`（垂直距離）という
**コネクター固有の配置軸**を持つ。フラットに流用すると (1) これら固有フィールドが他キーと混ざって
帰属が読めない (2) 線の短いタグに無関係な `textAlign` / `verticalAlign` が付く、という
歪みが出る。**違うものは違う形でよい**（無理に揃えるのは「偽の一貫性」）という判断。これは JSON を
生成する AI から見ても、型ごとに能力が違う前提（`../../doc-schema/assets/ai-guide.md` の能力表）と整合し、混乱コストは低い。

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
（メニュー項目 → `MENU_PROPERTY_UPDATE` / `object-menu:set:` → `StylePropertyRegistry.apply`）は
フラットなプロパティ名を運ぶ。ラベルの背景・枠線（`label.fill` / `label.stroke` /
`label.strokeWidth`）はネストのため、この配管に **ドット記法のプロパティ名のまま相乗り**させる。
2 経路とも収束点は `StylePropertyRegistry.apply` の 1 か所。`label.*` は connector 固有の宣言
（`ConnectorExtraStyleProperties`）として登録され、共有の書き込みパスがドットをネスト merge と
解釈して `connector.label` へ書く（label 未設定時は no-op）。共有 UI
（`ColorPickerGrid` / `MenuSlider`）と `commit`（ライブプレビュー＋履歴 1 件）の機微を再実装せずに
再利用するための割り切り。専用アクションを増やす案は、この commit 機微を二重持ちすることになるため
採らない。

## parser の二段検証（境界での防御）

外部から渡る JSON 文字列は、`createCanvasParser` が返すパーサー（`@jiscribe/doc` の `parse/`）が
**例外を投げずに判別可能なユニオン**で結果を返す。これにより拡張側・Webview 側が
同一ロジックを共有し、エラーの取りこぼしを防ぐ。

```ts
type CanvasParseResult =
	| { kind: "ok"; doc: CanvasDoc }
	| { kind: "syntax-error"; message: string } // JSON.parse 失敗
	| { kind: "structure-error"; diagnostics: SemanticDiagnostic[] } // validateStructure 失敗
	| { kind: "semantic-error"; diagnostics: SemanticDiagnostic[] } // validateSemantics 失敗
	| { kind: "internal-error"; message: string }; // 検証中の予期しない例外
```

`structure-error` と `semantic-error` は下記の 2 つの検証ステージに対応し、各ステージの失敗が別々のバリアントとして表れる。

検証は 2 段階。構造が成立していなければ意味検証へ進まない。

1. **構造検証 `validateStructure`** — 各ノードの型・必須フィールドを検証。型別の検証は
   パーサーが構築した doc バリデータのレジストリに委譲し、`group` の `children` 再帰だけは構造ルールとしてここで処理する。
2. **意味検証 `validateSemantics`** — 文書全体を横断しないと判断できない整合性を検証。
   - **ID の一意性**: root ツリー（コネクター含む）を通じて ID が重複しないこと。
     `CanvasDoc` はネストしたツリーなので「親子の循環」は構造的に起こり得ず、循環に見えるケースは実質「同一 ID の別オブジェクト」= ID 重複でしかない。
   - **connector の参照整合性**: owner の `id` が実在し、参照先が connectable な型であること（group / polyline / polygon / connector は不可）。source と target が同一オブジェクトを指す自己ループは許可され、専用の直交ルートで矩形ループとして描画される（`resolveConnectorPoints` / `routeSelfLoop` を参照）。

検証に使う doc バリデータのレジストリは parse 時にだけ必要なため、パーサーが自前で構築する。
グローバルを書き換えないので、プラグイン構成の異なるパーサーが同一プロセスに同居できる。

### headless なパッケージ

ドキュメント層は `@jiscribe/doc` という独立したパッケージで、UI 依存（react / emotion / katex）を含まない。
「テキストを `CanvasDoc` にパースしたいだけ」「プログラムから `CanvasDoc` を組み立てたいだけ」の
利用者（VSCode 拡張の Node 側 DiagnosticProvider・MCP サーバーなど）向け。

```ts
import { createCanvasParser } from "@jiscribe/doc";
```

`@jiscribe/canvas/doc` はそこへの re-export shim として動き続けるので、利用側は自分のタイミングで移行できる。

この境界を通った Doc は正当であることを前提に、内部関数は防御的チェックを省く
（[設計思想](./01-design-philosophy.ja.md) の原則 4）。外部同期の入口での検証は
[外部同期・VSCode 連携](./07-external-sync.ja.md) を参照。
</content>
