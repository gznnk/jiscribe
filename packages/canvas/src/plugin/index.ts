// プラグイン作者向けの語彙（#144 tier 1・安定エントリ）。
// プラグインは `ObjectTypeDefinition<TDoc, TState>` を注釈した宣言だけで済み、
// `CanvasPlugin.objects` に載せて host へ渡す。built-in レコードのみ
// per-entry TState 推論のため `defineObject` を使う。
export type { CanvasPlugin } from "./CanvasPlugin";
export { defineObject } from "./ObjectTypeDefinition";
export type {
	ObjectTypeDefinition,
	AnyObjectTypeDefinition,
	StencilLibraryRegistration,
} from "./ObjectTypeDefinition";
