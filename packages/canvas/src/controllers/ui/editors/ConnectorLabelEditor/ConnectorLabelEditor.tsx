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
	/** Label anchor (world coordinates on the route). The editor is centered here. */
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
	// Resolve auto (theme-following) to the theme foreground (ink). Use the same resolver as the rendering side to match colors.
	const color = resolveAutoColor(fontColor, "ink");
	const background = resolveLabelFill(fill);
	const borderColor = resolveAutoColor(stroke, "ink");

	// Width is clamped by measurement (horizontal expansion). Height follows the textarea's scrollHeight.
	const { width } = calcConnectorLabelBox(
		text,
		{ fontSize, fontFamily, fontWeight },
		strokeWidth,
	);

	// Focus initially and place the caret at the end.
	useEffect(() => {
		const el = textAreaRef.current;
		if (!el) {
			return;
		}
		el.focus();
		el.setSelectionRange(el.value.length, el.value.length);
	}, []);

	// Update the height to match the text amount (the width is given to the wrapper via measurement).
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

	// Prevent losing focus when clicking the margin (gesture exclusion is via data-gesture="none").
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
			data-testid="text-editor"
			data-gesture="none"
			style={{
				left: anchor.x,
				top: anchor.y,
				width,
				background,
				border:
					strokeWidth > 0
						? `${strokeWidth}px ${strokeDashType} ${borderColor}`
						: "none",
			}}
			onPointerDown={handleWrapperPointerDown}
		>
			<ConnectorLabelTextArea
				data-gesture="native-wheel"
				value={text}
				style={{ color, fontSize, fontFamily, fontWeight }}
				ref={textAreaRef}
				onChange={handleChange}
				onKeyDown={handleKeyDown}
			/>
		</ConnectorLabelEditorWrapper>
	);
};

/** In-place textarea overlay for editing a connector's label, anchored on the connector route. */
export const ConnectorLabelEditor = memo(ConnectorLabelEditorComponent);
