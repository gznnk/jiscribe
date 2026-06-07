# スタイル値の検証・無害化 / clipboard 検証の厳密化 計画

作成日: 2026-06-07
対象: `packages/svg-canvas-2`

## 背景

静的解析レポート（旧 `report.md`）で挙がっていた以下のセキュリティ指摘を起点とする。

> `handlePaste` が `{ ...state.objects, ...newObjects }` でクリップボード由来の
> `objects` を無検証で展開しており、`text` / `fontFamily` / `color` 等の値が
> 検証されずに描画系へ流れる。

調査の結果、問題は paste 固有ではなく**2つの独立した課題**に分解できることが分かった。

### 課題1: スタイル値の妥当性が検証されていない（セキュリティ実害）

- `validateDocUtils.ts` の style 系バリデータは `isString(o.fontColor)` のように
  **「文字列であること」しか確認しておらず、CSS としての妥当性を見ていない**。
- `TextOverlayStyled.ts` は `color` / `fontFamily` / `fontWeight` を emotion の CSS
  テンプレートへ**生値のまま補間**している。emotion は補間値をエスケープしないため、
  `red; } body { background: url(...)` のような **CSS インジェクション**が成立しうる。
- これは clipboard 経路だけでなく **CanvasDoc 経路にも等しく存在する**横断的課題。
- 一方 markdown `text` は `renderMarkdown` 内の DOMPurify で既にサニタイズ済み
  （スクリプト実行の主シンクは対策済み）。残るのは上記スタイル文字列の CSS インジェクション。

### 課題2: clipboard データの型別検証がレジストリ化されていない（構造の一貫性）

- スキーマ側には既に `ObjectDocValidatorRegistry` ＋ 型別 `validateXxxDoc` があり、
  `validateStructure` がこれに委譲している。
- 一方クリップボード（`ObjectState` 型）の検証は `isClipboardData` 内のインライン処理に
  留まり、型別の厳密検証レジストリが無い。
- スキーマ側の構造を **state 側にミラー**すれば、検証の一貫性とテスタビリティが上がる。

---

## 対応方針: 2ステップ

Step 1 が生成する共有 style バリデータを Step 2 が再利用することで、
**CanvasDoc 経路と clipboard 経路を単一の検証ロジックで守る**ことを最終形とする。

### Step 1: スタイル値の検証・無害化（セキュリティ実害の解消）

旧レポートのセキュリティ指摘を解消する。範囲を絞った高費用対効果の対応。

1. **ポータブルな述語 `isCssSafeValue` を `@workspace/basic-validators` に追加**
   - CSS ブレイクアウト文字（`;` `{` `}` `<` `>` `url(` `/* */` 等）を含まない文字列かを
     判定する純粋な型ガード。`CSS.supports` に依存せず Node でも動く。
     `isCssColor.ts` と並ぶ位置（`basic-validators/src/isCssSafeValue.ts`）。
2. **共有 style バリデータに injection 防止チェックを追加**（`schemas/objects/utils/validateDocUtils.ts`）
   - `validateStrokeStyleFields` / `validateFillStyleFields` / `validateTextStyleFields` の
     style 系フィールド（`stroke` / `fill` / `fontColor` / `fontFamily` / `fontWeight`）へ
     `isCssSafeValue` を適用。`validateStructure → registry → validateXxxDoc` 経由で
     **CanvasDoc 経路に効く**。

   **レイヤー分担（重要）**: Doc 検証層（`validateDocUtils`）は vitest（`environment: "node"`）や
   VSCode 拡張ホスト（Node）でも走るため、**ブラウザ専用 API に依存しないポータブルな
   `isCssSafeValue` のみ**を使う（injection 遮断に責務を絞る）。
   色が妥当な CSS color かどうかの**厳密判定**は、ブラウザ専用の
   `@workspace/basic-validators` の `isCssColor`（`CSS.supports`）が担い、
   **ブラウザで走る state 検証層**（`TextStyleState` / Step 2 の state バリデータ）で適用する。
   `isCssColor` は意図的にブラウザ専用・無テストの設計判断であり、Node 側へ持ち込まない。

3. **描画チョークポイントでの無害化**（`presentations/objects/base/TextOverlay/TextOverlayStyled.ts`）
   - サニタイザ `cssSafeValue`（`presentations/objects/utils/cssSafeValue.ts`、内部で
     `isCssSafeValue` を使用）で `color` / `fontFamily` / `fontWeight` の補間をラップ。
   - markdown の DOMPurify と同じ「**シンク1点で防御**」思想。検証を通らない経路
     （内部クリップボード等）でも CSS インジェクションを成立させない。
4. **テスト**: `isCssSafeValue`（basic-validators）・`cssSafeValue`（presentations）・
   style バリデータの injection 拒否ケース。

**完了条件**: 不正な CSS 値を持つ CanvasDoc が診断で弾かれ、かつ描画側でも
危険な値が無害化されること。これをもって旧レポートのセキュリティ指摘をクローズ。

### Step 2: state バリデータレジストリ（clipboard 検証の厳密化）

スキーマ側 `ObjectDocValidatorRegistry` の構造を state 側へミラーする。

1. **`states/registry/ObjectStateValidatorRegistry.ts`** 新規
   （`ObjectDocValidatorRegistry` のほぼ複製）。
2. **`states/objects/utils/validateStateUtils.ts`** 新規
   - state 固有の幾何・変換フィールド（`cx` / `cy` / `scaleX` / `scaleY` / `width` /
     `height` / `childIds` 等）を検証。
   - connector 端点は既存 `validateEndpointRef` を再利用。
   - style 系の injection 防止は **Step 1 の `isCssSafeValue` を再利用**。
   - 加えて、state 検証はブラウザで走るため、色の**妥当性**は
     `@workspace/basic-validators` の `isCssColor`（`CSS.supports`）で厳密検証する
     （`TextStyleState` と同じ方針。Node で走るテストでは色妥当性の分岐はテスト対象外）。
3. **型別 `validateXxxState.ts` × 7**（rect / ellipse / group / polygon / polyline /
   connector / sticky）。
4. **登録**: `initializeObjectRegistry.ts` の `registerObject()` に state バリデータを追加し、
   `clear()` 対象にも含める。
5. **paste 境界へ接続**: `controllers/commands/selection/ClipboardData.ts` の
   `isClipboardData` を、型別検証をレジストリへ委譲する形に置き換える。
   - 留意: レジストリ依存になるため `initializeObjectRegistry()` 実行後に使う契約へ変わる
     （paste 経路は初期化済みのため実害なし）。
6. **テスト**: 型別 state バリデータ、clipboard 検証の統合テスト。

**完了条件**: clipboard データが型別に厳密検証され、CanvasDoc / clipboard 両経路が
共通の style 値検証ロジックを通ること。

---

## 補足（旧レポートからの引き継ぎ事項）

旧 `report.md` の他項目（zoom 0 除算 / `findRootGroupId` 無限ループ / テストデータの
`as unknown as` キャスト等）は本計画の対象外。必要なら別タスクとして再起票する。
