import type { BoundingBox, Point } from "@workspace/geometry";
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
import { useCanvasTheme } from "../../../../theme/CanvasThemeContext";
import { fitTextAreaHeight } from "../utils/fitTextAreaHeight";
import { readCaretLocalRect } from "../utils/readCaretLocalRect";

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
	/** Where the caret moved to, in world coordinates; reported on every edit and caret move. */
	onCaretMove?: (caretWorldBox: BoundingBox) => void;
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
	onCaretMove,
}) => {
	const wrapperRef = useRef<HTMLDivElement>(null);
	const textAreaRef = useRef<HTMLTextAreaElement>(null);
	// Labels have no per-doc fontFamily; follow the host theme so the editor
	// measures and renders with the same font as ConnectorLabel.
	const { fontFamily } = useCanvasTheme();
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
		// The caret is placed before the focus so the reveal that rides on the focus
		// event (onCaretMove) already sees the end of the text.
		el.setSelectionRange(el.value.length, el.value.length);
		// preventScroll: the browser would otherwise reveal the textarea by
		// scrolling the overflow-hidden ancestors, an offset the canvas camera
		// knows nothing about. Revealing is useRevealTextEditCaret's job.
		el.focus({ preventScroll: true });
	}, []);

	// Update the height to match the text amount (the width is given to the wrapper via measurement).
	useLayoutEffect(() => {
		const el = textAreaRef.current;
		if (!el) {
			return;
		}
		fitTextAreaHeight(el, fontSize);
	}, [text, width, fontSize, fontWeight]);

	// The wrapper is centered on the anchor, which is already a world coordinate,
	// so the caret's local offset only has to start from the wrapper's corner.
	const reportCaret = useCallback(() => {
		const el = textAreaRef.current;
		const wrapper = wrapperRef.current;
		// Only the focused editor has a caret to report; at mount the selection is
		// still at 0, which would reveal the wrong end of the text.
		if (!el || !wrapper || !onCaretMove || el !== document.activeElement) {
			return;
		}
		const caret = readCaretLocalRect(el);
		if (!caret) {
			return;
		}
		const left = anchor.x - wrapper.offsetWidth / 2 + caret.x;
		const top = anchor.y - wrapper.offsetHeight / 2 + caret.y;
		onCaretMove({ left, right: left, top, bottom: top + caret.height });
	}, [onCaretMove, anchor.x, anchor.y]);

	// After the height fit above, so the caret is measured against the laid-out box.
	useLayoutEffect(reportCaret);

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
				textAreaRef.current?.focus({ preventScroll: true });
			}
		},
		[],
	);

	return (
		<ConnectorLabelEditorWrapper
			ref={wrapperRef}
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
				// A caret move that changes nothing else (Home, an arrow key, a click
				// into the text) renders nothing, so it has to report on its own.
				onSelect={reportCaret}
				onFocus={reportCaret}
			/>
		</ConnectorLabelEditorWrapper>
	);
};

/** In-place textarea overlay for editing a connector's label, anchored on the connector route. */
export const ConnectorLabelEditor = memo(ConnectorLabelEditorComponent);
