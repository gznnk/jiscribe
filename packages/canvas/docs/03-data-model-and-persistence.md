# データモデルと永続化

canvas はデータを 2 つの形で持つ。**Doc**（保存用・ツリー）と
**State**（実行用・フラット）で、両者を Mapper が相互変換する。
この分離は [設計思想](./01-design-philosophy.md) の「性能優先」と「境界での防御」に基づく。

## Doc と State

|      | Doc（schemas/）                          | State（states/）                            |
| ---- | ---------------------------------------- | ------------------------------------------- |
| 用途 | 永続化・ファイル I/O                     | ランタイム編集                              |
| 形   | ツリー（`GroupDoc.children` に子を内包） | フラット（`objects` は ID キーの `Record`） |
| 例   | `RectDoc`, `GroupDoc`, `ConnectorDoc`    | `RectState`, `GroupState`, `ConnectorState` |

ツリーは人間にもファイル差分にも読みやすい一方、編集時の探索・更新には不向き。
そこで実行時はフラットに正規化し、ID で O(1) アクセスできるようにする。

## Mapper による相互変換

形状ごとに State と Mapper を共配置する（[アーキテクチャ](./02-architecture.md) の「共配置」）。
各 Mapper は **自身のプロパティのみ** を変換し、子要素の再帰は行わない。

```
states/objects/primitives/rect/
├── RectState.ts      # State 型
├── RectMapper.ts     # Doc ↔ State
└── __tests__/
```

全体変換は `states/canvas/CanvasMapper.ts` が一元管理する（`canvasToState` / `canvasToDoc`）。
CanvasMapper は形状タイプごとの Mapper を `ObjectRegistry` から引いて多態的に呼び出すため、
**`states/` の中で唯一 `registry/` を参照してよい例外**になっている（理由は
[アーキテクチャ](./02-architecture.md#registry-層) を参照）。ツリー ↔ フラットの
構造変換（親子関係の展開・再構築）はこの一点に集約し、個々の Mapper には漏らさない。

## 永続化フォーマット（`.jis.json` / `CanvasDoc`）

保存形式は `CanvasDoc`（`schemas/canvas/CanvasDoc.ts`）。

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

- `root` … 図形（rect / ellipse / diamond / polyline / polygon / group / sticky）とコネクターを混在させた単一配列。**配列順がそのまま重なり順（z-order）**になる
- コネクター（`type: "connector"`）… 端点は `source` / `target` の `owner{type,id}` + `anchor` で対象図形を参照する。`root` 直下にのみ置かれ、group の子にはならない。少なくとも一方の端点が owned であること（両端 free は不正）
- 色フィールド（`stroke` / `fontColor` / `fill`）… 具体的な CSS 色のほか、sentinel 値 `"auto"`（テーマ追従）を取りうる。`"auto"` は描画時にテーマ前景色へ解決される（[表示・テーマ](./08-presentation-and-theme.md) 参照）。新規図形の `stroke` / `fontColor` の既定値は `"auto"`
- 形式仕様の全文は `../ai/reference.md` と `../ai/jiscribe.schema.json` を参照

## parser の二段検証（境界での防御）

外部から渡る JSON 文字列は、`parseCanvasText`（`schemas/canvas/validators/`）が
**例外を投げずに判別可能なユニオン**で結果を返す。これにより拡張側・Webview 側が
同一ロジックを共有し、エラーの取りこぼしを防ぐ。

```ts
type CanvasParseResult =
	| { kind: "ok"; doc: CanvasDoc }
	| { kind: "syntax-error"; message: string } // JSON.parse 失敗
	| { kind: "semantic-error"; diagnostics: SemanticDiagnostic[] }
	| { kind: "internal-error"; message: string }; // 検証中の予期しない例外
```

検証は 2 段階。構造が成立していなければ意味検証へ進まない。

1. **構造検証 `validateStructure`** — 各ノードの型・必須フィールドを検証。型別の検証は
   `objectDocValidatorRegistry` に委譲し、`group` の `children` 再帰だけは構造ルールとしてここで処理する。
2. **意味検証 `validateSemantics`** — 文書全体を横断しないと判断できない整合性を検証。
   - **ID の一意性**: root ツリー（コネクター含む）を通じて ID が重複しないこと。
     `CanvasDoc` はネストしたツリーなので「親子の循環」は構造的に起こり得ず、循環に見えるケースは実質「同一 ID の別オブジェクト」= ID 重複でしかない。
   - **connector の参照整合性**: owner の `id` が実在し、参照先が connectable な型であること（group / polyline / polygon / connector は不可）。source と target が同一オブジェクトを指す自己ループは許可され、専用の直交ルートで矩形ループとして描画される（`resolveConnectorPoints` / `routeSelfLoop` を参照）。

検証に使う `objectDocValidatorRegistry` は parse 時にだけ必要なため、`parseCanvasText` が
未初期化なら冪等に初期化する。これにより呼び出し側はエントリ取り違えによる誤検知を構造的に避けられる。

### パーサー専用エントリ

`parser.ts` は UI 依存（react / emotion / katex）を含まない別エントリ。
「テキストを `CanvasDoc` にパースしたいだけ」の利用者（VSCode 拡張の Node 側 DiagnosticProvider など）向け。

```ts
import { parseCanvasText } from "@workspace/canvas/parser";
```

この境界を通った Doc は正当であることを前提に、内部関数は防御的チェックを省く
（[設計思想](./01-design-philosophy.md) の原則 4）。外部同期の入口での検証は
[外部同期・VSCode 連携](./07-external-sync.md) を参照。
</content>
