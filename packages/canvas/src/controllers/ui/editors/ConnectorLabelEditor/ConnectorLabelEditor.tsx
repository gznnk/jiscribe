import { CONNECTOR_LABEL_DEFAULTS } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import type { BoundingBox, Point } from "@jiscribe/geometry";
import type React from "react";
import { memo, useCallback, useLayoutEffect } from "react";

import {
	ConnectorLabelEditorWrapper,
	ConnectorLabelTextArea,
} from "./ConnectorLabelEditorStyled";
import { calcConnectorLabelBox } from "../../../../rendering/objects/connector/geometry/label/connectorLabelLayout";
import { resolveAutoColor } from "../../../../rendering/objects/utils/resolveAutoColor";
import { isCommitTextEditShortcut } from "../../../commands/text/CommitTextEditCommand";
import { useCaretReporter } from "../hooks/useCaretReporter";
import { fitTextAreaHeight } from "../utils/fitTextAreaHeight";
import type { CaretTarget } from "../utils/measureCaretInSurface";
import type { CaretLocalRect } from "../utils/readCaretLocalRect";

/**
 * Opens the label editor the way an in-place editor opens: focused, with the
 * caret at the end of what is already there. The caret is placed before the focus
 * so the reveal that rides on the focus event already sees the end of the text.
 */
const focusTextAreaAtEnd = (textArea: HTMLTextAreaElement): void => {
	textArea.setSelectionRange(textArea.value.length, textArea.value.length);
	// preventScroll: the browser would otherwise reveal the textarea by scrolling
	// the overflow-hidden ancestors, an offset the canvas camera knows nothing
	// about. Revealing is useRevealTextEditCaret's job.
	textArea.focus({ preventScroll: true });
};

/** Where the textarea draws its caret: the moving end of its selection, in its own value. */
const readTextAreaCaretTarget = (
	textArea: HTMLTextAreaElement,
): CaretTarget => ({
	caretIndex:
		textArea.selectionDirection === "backward"
			? textArea.selectionStart
			: textArea.selectionEnd,
	text: textArea.value,
});

type ConnectorLabelEditorProps = {
	/** Label anchor (world coordinates on the route). The editor is centered here. */
	anchor: Point;
	text: string;
	fontColor?: string;
	fontFamily?: string;
	fontSize?: number;
	fontWeight?: string;
	/**
	 * The label's border width (omitted/0 means none). The editor draws no
	 * border but takes up the same width, so its text lies where the label's does.
	 */
	strokeWidth?: number;
	onChange: (text: string) => void;
	onEscape?: () => void;
	/** Cmd+Enter on a Mac, Ctrl+Enter elsewhere (CommitTextEditCommand), outside an IME composition; the browser's own handling is already cancelled. Omitted = the keystroke is swallowed. */
	onCommit?: () => void;
	/** Where the caret moved to, in world coordinates; reported on every edit and caret move. */
	onCaretMove?: (caretWorldBox: BoundingBox) => void;
};

const ConnectorLabelEditorComponent: React.FC<ConnectorLabelEditorProps> = ({
	anchor,
	text,
	fontColor,
	fontFamily = CONNECTOR_LABEL_DEFAULTS.fontFamily,
	fontSize = CONNECTOR_LABEL_DEFAULTS.fontSize,
	fontWeight = CONNECTOR_LABEL_DEFAULTS.fontWeight,
	strokeWidth = 0,
	onChange,
	onEscape,
	onCommit,
	onCaretMove,
}) => {
	// Resolve auto (theme-following) to the theme foreground (ink). Use the same resolver as the rendering side to match colors.
	const color = resolveAutoColor(fontColor, "ink");

	// Width is the measured text's, so the box grows sideways as it is typed and
	// the textarea never wraps. Height follows the textarea's scrollHeight.
	const { width } = calcConnectorLabelBox(
		text,
		{ fontSize, fontFamily, fontWeight },
		strokeWidth,
	);

	// The wrapper is centered on the anchor, which is already a world coordinate,
	// so the caret's local offset only has to start from the wrapper's corner.
	const calcCaretWorldBox = useCallback(
		(caret: CaretLocalRect, wrapper: HTMLDivElement) => {
			const left = anchor.x - wrapper.offsetWidth / 2 + caret.x;
			const top = anchor.y - wrapper.offsetHeight / 2 + caret.y;
			return { left, right: left, top, bottom: top + caret.height };
		},
		[anchor.x, anchor.y],
	);

	const { surfaceRef, wrapperRef, reportCaret } =
		useCaretReporter<HTMLTextAreaElement>({
			onCaretMove,
			calcCaretWorldBox,
			focusAtEnd: focusTextAreaAtEnd,
			readCaretTarget: readTextAreaCaretTarget,
		});

	// Update the height to match the text amount (the width is given to the wrapper via measurement).
	useLayoutEffect(() => {
		const el = surfaceRef.current;
		if (!el) {
			return;
		}
		fitTextAreaHeight(el, fontSize);
	}, [text, width, fontFamily, fontSize, fontWeight, surfaceRef]);

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
			return;
		}
		// Mid composition the keystroke belongs to the IME.
		if (isCommitTextEditShortcut(e.nativeEvent) && !e.nativeEvent.isComposing) {
			e.preventDefault();
			e.stopPropagation();
			onCommit?.();
			return;
		}
		// Tab stays in the editor rather than moving the focus off an open session
		// (as in TextEditor).
		if (e.key === "Tab") {
			e.preventDefault();
			e.stopPropagation();
		}
	};

	// Prevent losing focus when clicking the margin (gesture exclusion is via data-gesture="none").
	const handleWrapperPointerDown = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			if (e.target === e.currentTarget) {
				e.preventDefault();
				surfaceRef.current?.focus({ preventScroll: true });
			}
		},
		[surfaceRef],
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
				// The box itself, border included, is the canvas's (ConnectorLabel).
				border: strokeWidth > 0 ? `${strokeWidth}px solid transparent` : "none",
			}}
			onPointerDown={handleWrapperPointerDown}
		>
			<ConnectorLabelTextArea
				data-gesture="native-wheel"
				value={text}
				style={{ color, fontSize, fontFamily, fontWeight }}
				ref={surfaceRef}
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

/**
 * In-place textarea overlay for editing a connector's label, anchored on the
 * connector route. Transparent: it draws the text alone, over the label's box,
 * which the canvas keeps drawing under it from the draft (ConnectorLabel with
 * `isEditing`).
 */
export const ConnectorLabelEditor = memo(ConnectorLabelEditorComponent);
