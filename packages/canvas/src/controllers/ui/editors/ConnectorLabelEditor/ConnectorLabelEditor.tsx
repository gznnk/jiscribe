import { CONNECTOR_LABEL_DEFAULTS } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import type { BoundingBox, Point } from "@jiscribe/geometry";
import type React from "react";
import { memo, useCallback, useLayoutEffect, useMemo } from "react";

import {
	ConnectorLabelEditorBackdrop,
	ConnectorLabelEditorWrapper,
	ConnectorLabelTextArea,
	LABEL_EDITOR_BORDER_WIDTH_VAR,
} from "./ConnectorLabelEditorStyled";
import { LabelBackdropLayers } from "../../../../rendering/objects/base/LabelBackdropLayers";
import { LABEL_BOX_CORNER_RADIUS } from "../../../../rendering/objects/connector/ConnectorLabel/ConnectorLabelStyled";
import { calcConnectorLabelBox } from "../../../../rendering/objects/connector/geometry/label/connectorLabelLayout";
import { useDocumentSurface } from "../../../../rendering/objects/DocumentSurfaceContext";
import { useLabelBackdropLayers } from "../../../../rendering/objects/useLabelBackdropLayers";
import { resolveAutoColor } from "../../../../rendering/objects/utils/resolveAutoColor";
import {
	isAutoLabelFill,
	resolveLabelFill,
} from "../../../../rendering/objects/utils/resolveLabelFill";
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
	/**
	 * The connector whose label is edited, under which the surrounding `<Canvas>`
	 * keeps the backdrops the draft's box lies on (useLabelBackdropLayers).
	 */
	id: string;
	/** Label anchor (world coordinates on the route). The editor is centered here. */
	anchor: Point;
	text: string;
	fontColor?: string;
	fontFamily?: string;
	fontSize?: number;
	fontWeight?: string;
	fill?: string;
	stroke?: string;
	strokeWidth?: number;
	strokeDashType?: string;
	onChange: (text: string) => void;
	onEscape?: () => void;
	/** Cmd+Enter on a Mac, Ctrl+Enter elsewhere (CommitTextEditCommand), outside an IME composition; the browser's own handling is already cancelled. Omitted = the keystroke is swallowed. */
	onCommit?: () => void;
	/** Where the caret moved to, in world coordinates; reported on every edit and caret move. */
	onCaretMove?: (caretWorldBox: BoundingBox) => void;
};

const ConnectorLabelEditorComponent: React.FC<ConnectorLabelEditorProps> = ({
	id,
	anchor,
	text,
	fontColor,
	fontFamily = CONNECTOR_LABEL_DEFAULTS.fontFamily,
	fontSize = CONNECTOR_LABEL_DEFAULTS.fontSize,
	fontWeight = CONNECTOR_LABEL_DEFAULTS.fontWeight,
	fill,
	stroke,
	strokeWidth = 0,
	strokeDashType = "solid",
	onChange,
	onEscape,
	onCommit,
	onCaretMove,
}) => {
	const documentSurface = useDocumentSurface();
	// Resolve auto (theme-following) to the theme foreground (ink). Use the same resolver as the rendering side to match colors.
	const color = resolveAutoColor(fontColor, "ink");
	const knockout = resolveLabelFill(fill, documentSurface);
	const borderColor = resolveAutoColor(stroke, "ink");
	// Cut by the canvas for the draft's box (graftConnectorLabelDraft), so they
	// follow every keystroke.
	const layers = useLabelBackdropLayers(isAutoLabelFill(fill) ? id : undefined);
	const hasLayers = layers.length > 0;

	// Width is the measured text's, so the box grows sideways as it is typed and
	// the textarea never wraps. Height follows the textarea's scrollHeight; the
	// measured one is the box the backdrop was cut for, which it matches.
	const { width, height } = calcConnectorLabelBox(
		text,
		{ fontSize, fontFamily, fontWeight },
		strokeWidth,
	);
	const backdropBox = useMemo(
		() => ({ x: 0, y: 0, width, height }),
		[width, height],
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
			hasBackdrop={hasLayers}
			style={{
				left: anchor.x,
				top: anchor.y,
				width,
				// On a backdrop, the knockout is drawn with the frames' fills under the
				// text instead, as the committed label does (ConnectorLabel).
				background: hasLayers ? "transparent" : knockout,
				border:
					strokeWidth > 0
						? `${strokeWidth}px ${strokeDashType} ${borderColor}`
						: "none",
				...(hasLayers && {
					[LABEL_EDITOR_BORDER_WIDTH_VAR]: `${strokeWidth}px`,
				}),
			}}
			onPointerDown={handleWrapperPointerDown}
		>
			{hasLayers && (
				<ConnectorLabelEditorBackdrop>
					<LabelBackdropLayers
						box={backdropBox}
						layers={layers}
						cornerRadius={LABEL_BOX_CORNER_RADIUS}
						isShown
						knockout={knockout}
					/>
				</ConnectorLabelEditorBackdrop>
			)}
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
 * connector route. An `"auto"` label lying on a frame's backdrop is drawn on the
 * same stack as the committed label (LabelBackdropLayers in an SVG behind the
 * text, the box's own background transparent and its border drawn again on
 * top); elsewhere the box keeps its own background.
 */
export const ConnectorLabelEditor = memo(ConnectorLabelEditorComponent);
