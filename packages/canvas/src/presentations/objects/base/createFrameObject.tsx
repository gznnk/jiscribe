import type { TransformedFrame } from "@workspace/geometry";
import { memo } from "react";
import type React from "react";
import type { ReactNode } from "react";

import { TextOverlay } from "./TextOverlay";
import type { TextEditable } from "./TextOverlay";
import type { FillStyleState } from "../../../states/objects/base/FillStyleState";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { StrokeStyleState } from "../../../states/objects/base/StrokeStyleState";
import type { TextStyleState } from "../../../states/objects/base/TextStyleState";
import { createSvgTransform } from "../utils/createSvgTransform";
import { getStrokeDasharray } from "../utils/getStrokeDasharray";
import { resolveAutoColor } from "../utils/resolveAutoColor";

/**
 * Frame 系図形の SVG 要素（rect / polygon / ellipse …）に共通で渡る属性。
 * `draw` はこれをスタイル付き要素へスプレッドし、geometry 属性だけを足す。
 */
export type FrameShapeProps = {
	"data-kind": "object";
	"data-id": string;
	transform: string;
	/** 解決済みの stroke 色（auto はテーマ前景へ解決済み）。 */
	strokeColor: string;
	/** 解決済みの fill 色（auto はテーマサーフェスへ解決済み）。 */
	fillColor: string;
	strokeWidth?: number;
	strokeDasharray?: string;
};

/** createFrameObject が読み取る state の最小形（geometry + transform + 各スタイル）。 */
type FrameRenderState = ObjectState &
	TransformedFrame &
	StrokeStyleState &
	FillStyleState &
	TextStyleState;

/**
 * Frame 系図形（stroke + fill + text + 単一 SVG 形状を持つ rect / diamond / ellipse など）の
 * 表示コンポーネントを生成する。
 *
 * これらは transform 適用・色解決（auto）・破線・テキストオーバーレイ・memo まで完全に同一で、
 * 違いは描画する SVG 形状だけ。そのため共通部分をここに集約し、図形ごとには形状を返す
 * `draw` 関数だけを渡す。`draw` は state（width/height/rx 等）と共通属性 `shape` を受け取る。
 *
 * 影付き sticky や DOMPurify を挟む svg は描画構造が異なるため対象外。
 */
export const createFrameObject = <TState extends FrameRenderState>(
	draw: (state: TState, shape: FrameShapeProps) => ReactNode,
): React.FC<TState & TextEditable> => {
	const FrameObject: React.FC<TState & TextEditable> = (props) => {
		const {
			id,
			cx,
			cy,
			width,
			height,
			scaleX,
			scaleY,
			rotation,
			fill,
			stroke,
			strokeWidth,
			strokeDashType,
			text,
			textType,
			textAlign,
			verticalAlign,
			fontColor,
			fontSize,
			fontFamily,
			fontWeight,
			isEditing = false,
		} = props;

		const transformAttr = createSvgTransform(scaleX, scaleY, rotation, cx, cy);

		const shape: FrameShapeProps = {
			"data-kind": "object",
			"data-id": id,
			transform: transformAttr,
			strokeColor: resolveAutoColor(stroke, "ink"),
			fillColor: resolveAutoColor(fill, "surface"),
			strokeWidth,
			strokeDasharray: getStrokeDasharray(strokeDashType, strokeWidth),
		};

		return (
			<>
				{draw(props, shape)}
				<TextOverlay
					x={-width / 2}
					y={-height / 2}
					width={width}
					height={height}
					transform={transformAttr}
					text={text}
					textType={textType}
					textAlign={textAlign}
					verticalAlign={verticalAlign}
					fontColor={fontColor}
					fontSize={fontSize}
					fontFamily={fontFamily}
					fontWeight={fontWeight}
					isEditing={isEditing}
				/>
			</>
		);
	};

	return memo(FrameObject) as React.FC<TState & TextEditable>;
};
