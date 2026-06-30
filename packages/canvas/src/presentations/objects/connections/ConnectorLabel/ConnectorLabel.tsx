import type { Point } from "@workspace/geometry";
import type React from "react";
import { memo } from "react";

import { LabelBox } from "./ConnectorLabelStyled";
import {
	calcConnectorLabelBox,
	CONNECTOR_LABEL_DEFAULTS,
} from "./utils/connectorLabelLayout";
import { resolveLabelFill } from "./utils/resolveLabelFill";
import { resolveAutoColor } from "../../utils/resolveAutoColor";

type ConnectorLabelProps = {
	/** 親コネクターの id（ヒット時に編集を開始できるよう data 属性に載せる）。 */
	id: string;
	/** ラベルアンカー（経路上のワールド座標）。 */
	anchor: Point;
	text: string;
	fontColor?: string;
	fontSize?: number;
	fontWeight?: string;
	/** 背景色（省略/auto はキャンバス地色＝knockout）。 */
	fill?: string;
	/** 枠線色。 */
	stroke?: string;
	/** 枠線太さ（省略/0 で枠線なし）。 */
	strokeWidth?: number;
	/** 枠線スタイル（solid / dashed / dotted）。省略時は solid。 */
	strokeDashType?: string;
	disablePointerEvents?: boolean;
};

const ConnectorLabelComponent: React.FC<ConnectorLabelProps> = ({
	id,
	anchor,
	text,
	fontColor,
	fontSize = CONNECTOR_LABEL_DEFAULTS.fontSize,
	fontWeight = CONNECTOR_LABEL_DEFAULTS.fontWeight,
	fill,
	stroke,
	strokeWidth = 0,
	strokeDashType = "solid",
	disablePointerEvents = false,
}) => {
	if (text === "") {
		return null;
	}

	const fontFamily = CONNECTOR_LABEL_DEFAULTS.fontFamily;
	// auto（テーマ追従）をテーマ前景（ink）へ解決する（issue #38）。
	const color = resolveAutoColor(fontColor, "ink");
	const background = resolveLabelFill(fill);
	const borderColor = resolveAutoColor(stroke, "ink");

	const { width, height } = calcConnectorLabelBox(
		text,
		{ fontSize, fontFamily, fontWeight },
		strokeWidth,
	);

	// アンカーを中心に水平配置する（回転しない）。
	return (
		<foreignObject
			x={anchor.x - width / 2}
			y={anchor.y - height / 2}
			width={width}
			height={height}
			// 線上のラベルをダブルクリックしても編集を開始できるよう connector として扱う。
			data-kind="connector"
			data-id={id}
			pointerEvents={disablePointerEvents ? "none" : "auto"}
		>
			<LabelBox
				color={color}
				fontSize={fontSize}
				fontFamily={fontFamily}
				fontWeight={fontWeight}
				background={background}
				borderWidth={strokeWidth}
				borderColor={borderColor}
				borderStyle={strokeDashType}
			>
				{text}
			</LabelBox>
		</foreignObject>
	);
};

export const ConnectorLabel = memo(ConnectorLabelComponent);
