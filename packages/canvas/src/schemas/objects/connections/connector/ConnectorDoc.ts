import type { FillStyleDoc } from "../../base/FillStyleDoc";
import type { StrokeStyleDoc } from "../../base/StrokeStyleDoc";
import type { TextStyleDoc } from "../../base/TextStyleDoc";
import type { ArrowType } from "../../types/ArrowType";
import type { ConnectorRouting } from "../../types/ConnectorRouting";
import type { EndpointRef } from "../../types/EndpointRef";
import type { ObjectFeatures } from "../../types/ObjectFeatures";
import type { CreateObjectType } from "../../utils/CreateObjectType";

export const ConnectorFeatures = {
	type: "connector",
	geometry: "poly",
	stroke: true,
	connectable: false,
} as const satisfies ObjectFeatures;

/**
 * コネクターに付ける注記（ラベル）。
 *
 * 図形の本文テキスト（features.text のフラットな TextStyleDoc）とは別物として
 * **ネストした 1 オブジェクト**で持つ。理由は (1) 経路上の配置を表す
 * `position` / `offset` が connector 固有で、帰属を構造で明示したい
 * (2) 線上の短いタグに整列や markdown は不要、という点。スタイルは
 * 色・サイズ・太さのみ TextStyleDoc から借りる（整列・textType は持たない）。
 *
 * `text` が空文字のラベルは「無し」と等価で、保存時に取り除かれる。
 *
 * 背景・枠線は図形と同じ語彙を借りる（`fill` / `stroke` / `strokeWidth`）。
 * `fill` 省略時はキャンバス地色で線を隠す knockout を維持し、`strokeWidth` 省略時は枠線なし。
 */
export type ConnectorLabel = Pick<
	TextStyleDoc,
	"fontColor" | "fontSize" | "fontWeight"
> &
	Pick<FillStyleDoc, "fill"> &
	Pick<StrokeStyleDoc, "stroke" | "strokeWidth" | "strokeDashType"> & {
		/** ラベル文字列。空なら非表示（ラベル無し）。 */
		text: string;
		/** 経路に沿った位置。0（source）〜1（target）の比率。既定 0.5（中点）。 */
		position?: number;
		/** 経路に対する垂直方向の符号付きオフセット（ワールド単位）。既定 0。 */
		offset?: number;
	};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ConnectorDocBrand: unique symbol;

/**
 * コネクター（接続線）の Doc。
 *
 * `points` のセマンティクス: source → target 順の**中間経由点（waypoint）のみ**を
 * ワールド座標で保持する。端点座標は含めない（端点の正は `source` / `target` の
 * EndpointRef であり、owned アンカーは描画時に動的解決される）。
 * 直線コネクターは空配列。
 *
 * `routing` が `"orthogonal"`（省略時の既定）のときは経路を描画時に自動生成し、
 * `points` は使わない（常に空・派生値は永続化しない）。直線にしたい場合のみ `"straight"` を明示する。
 */
export type ConnectorDoc = CreateObjectType<
	typeof ConnectorFeatures,
	typeof ConnectorDocBrand,
	{
		source: EndpointRef;
		target: EndpointRef;
		routing?: ConnectorRouting;
		startArrow?: ArrowType;
		endArrow?: ArrowType;
		/** コネクター上の注記。省略時はラベル無し。 */
		label?: ConnectorLabel;
	}
>;
