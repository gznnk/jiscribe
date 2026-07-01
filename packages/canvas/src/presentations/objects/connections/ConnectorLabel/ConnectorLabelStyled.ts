import styled from "@emotion/styled";

import {
	CONNECTOR_LABEL_PADDING_X,
	CONNECTOR_LABEL_PADDING_Y,
} from "./utils/connectorLabelLayout";
import { TEXT_LINE_HEIGHT } from "../../../../constants/textLineHeight";

type LabelBoxProps = {
	color: string;
	fontSize: number;
	fontFamily: string;
	fontWeight: string;
	/** 解決済み背景色（省略/auto はキャンバス地色）。 */
	background: string;
	/** 枠線太さ（0 で枠線なし）。 */
	borderWidth: number;
	/** 解決済み枠線色。 */
	borderColor: string;
	/** 枠線スタイル（CSS border-style: solid / dashed / dotted）。 */
	borderStyle: string;
};

/**
 * ラベル本体。線の上に水平で描き、背景（knockout）で線を隠して可読性を保つ。
 * テキスト量に応じた寸法は foreignObject 側で与えるため、ここでは中身いっぱいに広げる。
 */
export const LabelBox = styled.div<LabelBoxProps>`
	display: flex;
	width: 100%;
	height: 100%;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	padding: ${CONNECTOR_LABEL_PADDING_Y}px ${CONNECTOR_LABEL_PADDING_X}px;
	background: ${(props) => props.background};
	border: ${(props) =>
		props.borderWidth > 0
			? `${props.borderWidth}px ${props.borderStyle} ${props.borderColor}`
			: "none"};
	border-radius: 2px;
	color: ${(props) => props.color};
	font-size: ${(props) => props.fontSize}px;
	font-family: ${(props) => props.fontFamily};
	font-weight: ${(props) => props.fontWeight};
	line-height: ${TEXT_LINE_HEIGHT};
	text-align: center;
	white-space: pre-wrap;
	word-break: break-word;
	user-select: none;
`;
