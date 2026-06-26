import type { ComponentType } from "react";

import type { ObjectType } from "./ObjectType";

/** ShapeLibrary のアイコンコンポーネントが受け取る props。 */
export type ShapeIconProps = {
	width?: number;
	height?: number;
};

/**
 * ShapeLibrary（ツールバー）に並ぶ図形パレットの 1 項目。
 *
 * プリセットは図形型と 1:1 ではない（例: "rect" と "rect-markdown" は
 * どちらも rect 型のバリアント）。生成は常に objectType の `ShapeFactory` に
 * defaultOverrides を渡して行う。
 */
export type ShapePreset = {
	id: string;
	objectType: ObjectType;
	label: string;
	defaultOverrides?: Record<string, unknown>;
	/**
	 * ツールバーでの表示順。小さいほど左に並ぶ。
	 * 同値・未指定どうしは登録順を保つ。基本図形を前・バリアントを後ろに
	 * 並べるなど、登録順序に依存しない表示順をプリセット側で宣言する。
	 */
	order?: number;
	/**
	 * ツールバーに表示するアイコン。プリセットデータ（schemas）は UI を
	 * 持たないため、`registerObject()` 時に UI 層（controllers）が注入する。
	 */
	icon?: ComponentType<ShapeIconProps>;
};
