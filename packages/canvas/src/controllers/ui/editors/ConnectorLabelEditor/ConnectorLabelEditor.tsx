import type { Point } from "@workspace/geometry";
import type React from "react";
import { memo, useCallback, useEffect, useLayoutEffect, useRef } from "react";

import {
	ConnectorLabelEditorWrapper,
	ConnectorLabelTextArea,
} from "./ConnectorLabelEditorStyled";
import {
	calcConnectorLabelBox,
	CONNECTOR_LABEL_DEFAULTS,
	resolveLabelFill,
} from "../../../../presentations/objects/connections/ConnectorLabel";
import { resolveAutoColor } from "../../../../presentations/objects/utils/resolveAutoColor";

type ConnectorLabelEditorProps = {
	/** ラベルアンカー（経路上のワールド座標）。ここを中心に編集欄を出す。 */
	anchor: Point;
	text: string;
	fontColor?: string;
	fontSize?: number;
	fontWeight?: string;
	fill?: string;
	stroke?: string;
	strokeWidth?: number;
	strokeDashType?: string;
	onChange: (text: string) => void;
	onEscape?: () => void;
};

const ConnectorLabelEditorComponent: React.FC<ConnectorLabelEditorProps> = ({
	anchor,
	text,
	fontColor,
	fontSize = CONNECTOR_LABEL_DEFAULTS.fontSize,
	fontWeight = CONNECTOR_LABEL_DEFAULTS.fontWeight,
	fill,
	stroke,
	strokeWidth = 0,
	strokeDashType = "solid",
	onChange,
	onEscape,
}) => {
	const textAreaRef = useRef<HTMLTextAreaElement>(null);
	const fontFamily = CONNECTOR_LABEL_DEFAULTS.fontFamily;
	// auto（テーマ追従）をテーマ前景（ink）へ解決する。描画側と同じ resolver で色を揃える。
	const color = resolveAutoColor(fontColor, "ink");
	const background = resolveLabelFill(fill);
	const borderColor = resolveAutoColor(stroke, "ink");

	// 幅は計測でクランプ（横伸長）。高さは textarea の scrollHeight に追従させる。
	const { width } = calcConnectorLabelBox(
		text,
		{ fontSize, fontFamily, fontWeight },
		strokeWidth,
	);

	// 初回フォーカスして末尾にキャレットを置く。
	useEffect(() => {
		const el = textAreaRef.current;
		if (!el) {
			return;
		}
		el.focus();
		el.setSelectionRange(el.value.length, el.value.length);
	}, []);

	// テキスト量に合わせて高さを更新（横幅は計測でラッパーに与える）。
	useLayoutEffect(() => {
		const el = textAreaRef.current;
		if (!el) {
			return;
		}
		el.style.height = "0px";
		el.style.height = `${el.scrollHeight}px`;
	}, [text, width, fontSize, fontWeight]);

	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		onChange(e.target.value);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Escape" && onEscape) {
			e.preventDefault();
			e.stopPropagation();
			onEscape();
		}
	};

	// 余白クリックでフォーカスが外れないようにする（ジェスチャー除外は data-gesture="none"）。
	const handleWrapperPointerDown = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			if (e.target === e.currentTarget) {
				e.preventDefault();
				textAreaRef.current?.focus();
			}
		},
		[],
	);

	return (
		<ConnectorLabelEditorWrapper
			data-kind="text-editor"
			data-id="connector-label"
			data-gesture="none"
			left={anchor.x}
			top={anchor.y}
			width={width}
			background={background}
			borderWidth={strokeWidth}
			borderColor={borderColor}
			borderStyle={strokeDashType}
			onPointerDown={handleWrapperPointerDown}
		>
			<ConnectorLabelTextArea
				data-gesture="native-wheel"
				value={text}
				color={color}
				fontSize={fontSize}
				fontFamily={fontFamily}
				fontWeight={fontWeight}
				ref={textAreaRef}
				onChange={handleChange}
				onKeyDown={handleKeyDown}
			/>
		</ConnectorLabelEditorWrapper>
	);
};

export const ConnectorLabelEditor = memo(ConnectorLabelEditorComponent);
