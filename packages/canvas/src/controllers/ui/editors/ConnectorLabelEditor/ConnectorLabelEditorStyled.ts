import styled from "@emotion/styled";

import { TEXT_LINE_HEIGHT } from "../../../../constants/textLineHeight";
import { theme } from "../../../../constants/theme";
import {
	CONNECTOR_LABEL_PADDING_X,
	CONNECTOR_LABEL_PADDING_Y,
} from "../../../../presentations/objects/connections/ConnectorLabel/connectorLabelLayout";

type WrapperProps = {
	left: number;
	top: number;
	width: number;
};

/**
 * アンカー（経路上のラベル位置）を中心に配置するラッパー。
 * 幅は計測値で与え、translate(-50%, -50%) で中央追従させる。高さは中身に追従する。
 */
export const ConnectorLabelEditorWrapper = styled.div<WrapperProps>`
	position: absolute;
	left: ${(props) => props.left}px;
	top: ${(props) => props.top}px;
	width: ${(props) => props.width}px;
	transform: translate(-50%, -50%);
	background: ${theme.canvasBg};
	border-radius: 2px;
	pointer-events: auto;
`;

type TextAreaProps = {
	color: string;
	fontSize: number;
	fontFamily: string;
	fontWeight: string;
};

export const ConnectorLabelTextArea = styled.textarea<TextAreaProps>`
	display: block;
	width: 100%;
	box-sizing: border-box;
	padding: ${CONNECTOR_LABEL_PADDING_Y}px ${CONNECTOR_LABEL_PADDING_X}px;
	color: ${(props) => props.color};
	font-size: ${(props) => props.fontSize}px;
	font-family: ${(props) => props.fontFamily};
	font-weight: ${(props) => props.fontWeight};
	line-height: ${TEXT_LINE_HEIGHT};
	text-align: center;
	white-space: pre-wrap;
	word-break: break-word;
	background: transparent;
	border: none;
	outline: none;
	overflow: hidden;
	resize: none;
`;
