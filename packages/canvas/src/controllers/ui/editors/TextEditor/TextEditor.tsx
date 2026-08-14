import type { BoundingBox } from "@jiscribe/geometry";
import {
	calcAffineTransformedPoint,
	calcPolyBoundingBox,
	degreesToRadians,
} from "@jiscribe/geometry";
import type React from "react";
import { memo, useCallback, useEffect, useLayoutEffect, useRef } from "react";

import { EditableTextSurface, TextEditorWrapper } from "./TextEditorStyled";
import { TEXT_STYLE_FALLBACK } from "../../../../constants/textStyleFallback";
import { createSvgTransform } from "../../../../presentations/objects/utils/createSvgTransform";
import { resolveAutoColor } from "../../../../presentations/objects/utils/resolveAutoColor";
import { verticalAlignToAlignItems } from "../../../../presentations/objects/utils/verticalAlignToAlignItems";
import type { RichText } from "../../../../schemas/objects/types/RichText";
import {
	isSameRichText,
	remapRichText,
} from "../../../../schemas/objects/types/RichText";
import type { TextAlign } from "../../../../schemas/objects/types/TextAlign";
import type { VerticalAlign } from "../../../../schemas/objects/types/VerticalAlign";
import { useCanvasTheme } from "../../../../theme/CanvasThemeContext";
import type { TextEditFormat } from "../../../utils/toggleTextEditFormat";
import { useCaretReporter } from "../hooks/useCaretReporter";
import type { TextEditOverflow } from "../ObjectTextEditOverflowTypes";
import {
	focusEditableAtEnd,
	hasUnexpectedMarkup,
	readEditableSelection,
	readEditableText,
	renderEditableRichText,
	setEditableSelection,
} from "../utils/editableTextDom";
import type { CaretLocalRect, CaretTarget } from "../utils/readCaretLocalRect";

/** Keys that toggle a format while held with the platform's command modifier. */
const FORMAT_KEYS: Record<string, TextEditFormat | undefined> = {
	b: "bold",
	i: "italic",
	u: "underline",
};

/**
 * The browser's own rich-text edits, which reach an editable surface from the
 * context menu and the mobile text toolbar. They would write markup of their own,
 * so each is answered with the editor's own formatting instead.
 */
const FORMAT_INPUT_TYPES: Record<string, TextEditFormat | undefined> = {
	formatBold: "bold",
	formatItalic: "italic",
	formatUnderline: "underline",
};

/** A stretch of the edited text, in UTF-16 offsets; what the editor reports and restores. */
type TextSelection = { start: number; end: number };

type TextEditorProps = {
	objectId: string;
	/** The body being edited, draft included: drawn as its runs, and the styling the editor carries over as it is typed into */
	richText: RichText;
	cx: number;
	cy: number;
	/** Text region top-left X in the object's local coordinates (from calcTextRegion) */
	x: number;
	/** Text region top-left Y in the object's local coordinates (from calcTextRegion) */
	y: number;
	/** Text region width (from calcTextRegion) */
	width: number;
	/** Text region height (from calcTextRegion); a cap when `overflow` is "scroll", a minimum when it is "grow" */
	height: number;
	scaleX: number;
	scaleY: number;
	rotation: number;
	/** What happens when the typed text outgrows `height` (see ObjectTextEditOverflowRegistry) */
	overflow: TextEditOverflow;
	/** How far a "grow" editor may extend, in local px from the region's top edge (the shape's bottom edge); never negative, ignored when `overflow` is "scroll" */
	growLimit: number;
	/** Horizontal alignment; resolved against the shape type's defaults by the caller, else TEXT_STYLE_FALLBACK. */
	textAlign?: TextAlign;
	verticalAlign?: VerticalAlign;
	fontColor?: string;
	fontSize?: number;
	fontFamily?: string;
	fontWeight?: string;
	fontStyle?: string;
	textDecoration?: string;
	onChange: (text: string) => void;
	/** What the editor has selected, reported on every edit and caret move. */
	onSelectionChange?: (selection: TextSelection) => void;
	/** A bold / italic / underline keystroke, to apply over the current selection. */
	onToggleFormat?: (format: TextEditFormat) => void;
	onEscape?: () => void;
	/** Where the caret moved to, in world coordinates; reported on every edit and caret move. */
	onCaretMove?: (caretWorldBox: BoundingBox) => void;
};

const TextEditorComponent: React.FC<TextEditorProps> = ({
	richText,
	cx,
	cy,
	x,
	y,
	width,
	height,
	scaleX,
	scaleY,
	rotation,
	overflow,
	growLimit,
	textAlign = TEXT_STYLE_FALLBACK.textAlign,
	verticalAlign = TEXT_STYLE_FALLBACK.verticalAlign,
	fontColor = TEXT_STYLE_FALLBACK.fontColor,
	fontSize = TEXT_STYLE_FALLBACK.fontSize,
	fontFamily,
	fontWeight = TEXT_STYLE_FALLBACK.fontWeight,
	fontStyle = TEXT_STYLE_FALLBACK.fontStyle,
	textDecoration = TEXT_STYLE_FALLBACK.textDecoration,
	onChange,
	onSelectionChange,
	onToggleFormat,
	onEscape,
	onCaretMove,
}) => {
	// Docs of text-bearing shapes always carry fontFamily; the theme font is a
	// safety net for callers that omit it.
	const { fontFamily: themeFontFamily } = useCanvasTheme();
	const resolvedFontFamily = fontFamily ?? themeFontFamily;

	// Resolve auto (theme-following) to the theme foreground (ink). Use the same
	// resolver as the rendering-side TextOverlay so the color matches (issue #38).
	const resolvedColor = resolveAutoColor(fontColor, "ink");

	// The caret rides the same transform as the wrapper, one region offset further
	// in, so its world box is the local segment put through the shape's matrix.
	const calcCaretWorldBox = useCallback(
		(caret: CaretLocalRect) => {
			const rotationRad = degreesToRadians(rotation);
			const toWorld = (localY: number) =>
				calcAffineTransformedPoint(
					x + caret.x,
					y + localY,
					scaleX,
					scaleY,
					rotationRad,
					cx,
					cy,
				);
			return calcPolyBoundingBox([
				toWorld(caret.y),
				toWorld(caret.y + caret.height),
			]);
		},
		[x, y, scaleX, scaleY, rotation, cx, cy],
	);

	// The body the surface is drawing. Null until the first layout effect fills it;
	// from then on it is this editor's prediction of what the editing state holds,
	// which is what tells the echo of a keystroke from a change made elsewhere.
	const shownRichText = useRef<RichText | null>(null);
	// The newest body, for the sync a composition postpones.
	const incomingRichText = useRef(richText);
	const isComposing = useRef(false);
	const isSyncDeferred = useRef(false);
	// Reported rather than read on demand, because the styling that applies to it
	// runs in the reducer, which cannot reach the DOM. Only changes are sent: this
	// also runs on every render, and a dispatch per render would not settle.
	const reportedSelection = useRef<TextSelection | null>(null);

	const readCaretTarget = useCallback(
		(surface: HTMLDivElement): CaretTarget | null => {
			const selection = readEditableSelection(surface);
			if (!selection) {
				return null;
			}
			// The drawn body, not the incoming one: the caret has to be measured
			// against the runs the surface is laying out right now.
			return {
				caretIndex: selection.caretIndex,
				text: shownRichText.current ?? "",
			};
		},
		[],
	);

	const { surfaceRef, wrapperRef, reportCaret } =
		useCaretReporter<HTMLDivElement>({
			onCaretMove,
			calcCaretWorldBox,
			focusAtEnd: focusEditableAtEnd,
			readCaretTarget,
		});

	const reportSelection = useCallback(() => {
		const surface = surfaceRef.current;
		if (
			!surface ||
			!onSelectionChange ||
			surface !== surface.ownerDocument.activeElement
		) {
			return;
		}
		const selection = readEditableSelection(surface);
		if (!selection) {
			return;
		}
		const previous = reportedSelection.current;
		if (
			previous !== null &&
			previous.start === selection.start &&
			previous.end === selection.end
		) {
			return;
		}
		const reported = { start: selection.start, end: selection.end };
		reportedSelection.current = reported;
		onSelectionChange(reported);
	}, [onSelectionChange, surfaceRef]);

	// The frame the document's selectionchange queues its reports on, so a
	// selection dragged with the mouse renders the controller tree once per frame
	// rather than once per pointer move.
	const queuedReportFrame = useRef<number | null>(null);

	/**
	 * Reports the selection now, running the queued frame's reports with it rather
	 * than leaving them to land after the edit that follows this call.
	 */
	const reportSelectionNow = useCallback(() => {
		const queuedFrame = queuedReportFrame.current;
		if (queuedFrame === null) {
			reportSelection();
			return;
		}
		cancelAnimationFrame(queuedFrame);
		queuedReportFrame.current = null;
		reportSelection();
		reportCaret();
	}, [reportSelection, reportCaret]);

	/** Draws a body on the surface and puts the selection back, since rebuilding drops it. */
	const drawOnSurface = useCallback(
		(
			surface: HTMLDivElement,
			text: RichText,
			selection: TextSelection | null,
		) => {
			renderEditableRichText(surface, text);
			shownRichText.current = text;
			if (selection && surface === surface.ownerDocument.activeElement) {
				setEditableSelection(surface, selection.start, selection.end);
			}
		},
		[],
	);

	// Uncontrolled while typing: the browser owns the surface, and it is redrawn
	// only when the arriving body differs from the one it shows. The echo of a
	// keystroke must not redraw it — that would drop the caret and cut an IME
	// composition short — while a change made elsewhere (a format toggle, the text
	// menus, an undo) has to land, and takes the reported selection with it.
	useLayoutEffect(() => {
		incomingRichText.current = richText;
		const surface = surfaceRef.current;
		if (!surface) {
			return;
		}
		if (isComposing.current) {
			isSyncDeferred.current = true;
			return;
		}
		const shown = shownRichText.current;
		if (shown !== null && isSameRichText(shown, richText)) {
			return;
		}
		drawOnSurface(surface, richText, reportedSelection.current);
	}, [richText, drawOnSurface, surfaceRef]);

	// After the content above, so the caret is measured against the laid-out box.
	useLayoutEffect(reportCaret);
	useLayoutEffect(reportSelection);

	const handleInput = useCallback(() => {
		const surface = surfaceRef.current;
		if (!surface) {
			return;
		}
		const plain = readEditableText(surface);
		// The carry-over the reducer applies to the committed body, applied here to
		// the drawn one: the prediction it leaves behind is what the body coming back
		// is compared against.
		const edited = remapRichText(shownRichText.current ?? "", plain);
		shownRichText.current = edited;
		// Chrome answers some edits with markup of its own — a <b> reviving the
		// typing style of a run that was deleted whole, a <div> per line of a
		// multi-line insert. The characters still read back, but the drawn styling is
		// no longer the one the runs describe, so the surface is redrawn from them.
		if (!isComposing.current && hasUnexpectedMarkup(surface)) {
			drawOnSurface(surface, edited, readEditableSelection(surface));
		}
		onChange(plain);
	}, [onChange, drawOnSurface, surfaceRef]);

	const handleBeforeInput = useCallback(
		(event: InputEvent) => {
			const format = FORMAT_INPUT_TYPES[event.inputType];
			if (format !== undefined && onToggleFormat) {
				event.preventDefault();
				// As in handleKeyDown: the stretch being styled is whatever is selected
				// now, which the queued selectionchange may not have reported yet.
				reportSelectionNow();
				onToggleFormat(format);
				return;
			}
			if (event.inputType === "insertParagraph") {
				// Enter has to put a "\n" in the text rather than split the surface into
				// blocks. Under `white-space: pre-wrap` insertLineBreak inserts the
				// newline as a character, and going through the browser keeps the edit
				// on its own undo stack.
				event.preventDefault();
				(event.target as HTMLElement).ownerDocument.execCommand(
					"insertLineBreak",
				);
				return;
			}
			if (
				event.inputType === "deleteByDrag" ||
				event.inputType === "insertFromDrop"
			) {
				// A drop lands where it was dropped rather than in the selection the
				// editing state tracks, and brings the dragged markup with it. The two
				// are cancelled as a pair because Chrome splits a drag-move into them,
				// deleteByDrag first: cancelling the insert alone leaves the delete to
				// run, and the dragged text is gone without being put back.
				event.preventDefault();
			}
		},
		[onToggleFormat, reportSelectionNow],
	);

	const handlePaste = useCallback((event: ClipboardEvent) => {
		// Plain text only: what a body is styled in are its runs, not pasted markup.
		// execCommand keeps the insertion on the browser's undo stack.
		event.preventDefault();
		const text = event.clipboardData?.getData("text/plain") ?? "";
		if (text !== "") {
			(event.target as HTMLElement).ownerDocument.execCommand(
				"insertText",
				false,
				text,
			);
		}
	}, []);

	const handleCompositionStart = useCallback(() => {
		isComposing.current = true;
	}, []);

	const handleCompositionEnd = useCallback(() => {
		isComposing.current = false;
		const surface = surfaceRef.current;
		if (!surface || !isSyncDeferred.current) {
			return;
		}
		isSyncDeferred.current = false;
		const incoming = incomingRichText.current;
		const shown = shownRichText.current;
		if (shown !== null && isSameRichText(shown, incoming)) {
			return;
		}
		drawOnSurface(surface, incoming, reportedSelection.current);
	}, [drawOnSurface, surfaceRef]);

	// Attached natively: React's onBeforeInput is a synthetic event that does not
	// carry the inputType every decision above is made on, and the rest of the
	// editing path is kept beside it rather than split between the two models.
	useEffect(() => {
		const surface = surfaceRef.current;
		if (!surface) {
			return;
		}
		surface.addEventListener("beforeinput", handleBeforeInput);
		surface.addEventListener("input", handleInput);
		surface.addEventListener("paste", handlePaste);
		surface.addEventListener("compositionstart", handleCompositionStart);
		surface.addEventListener("compositionend", handleCompositionEnd);
		return () => {
			surface.removeEventListener("beforeinput", handleBeforeInput);
			surface.removeEventListener("input", handleInput);
			surface.removeEventListener("paste", handlePaste);
			surface.removeEventListener("compositionstart", handleCompositionStart);
			surface.removeEventListener("compositionend", handleCompositionEnd);
		};
	}, [
		surfaceRef,
		handleBeforeInput,
		handleInput,
		handlePaste,
		handleCompositionStart,
		handleCompositionEnd,
	]);

	// A caret move that changes nothing else (Home, an arrow key, a click into the
	// text) renders nothing, and an editable div has no onSelect of its own: the
	// document-wide event is where those surface. It fires once per pointer move
	// while a selection is dragged, so the reports ride one frame: what is reported
	// is read in the frame's callback, which makes every event but the first one
	// per frame redundant. A report queued when this effect is torn down is dropped
	// rather than run: the render that tore it down reported both itself.
	useEffect(() => {
		const surface = surfaceRef.current;
		if (!surface) {
			return;
		}
		const ownerDocument = surface.ownerDocument;
		const handleSelectionChange = () => {
			if (
				surface !== ownerDocument.activeElement ||
				queuedReportFrame.current !== null
			) {
				return;
			}
			queuedReportFrame.current = requestAnimationFrame(() => {
				queuedReportFrame.current = null;
				reportSelection();
				reportCaret();
			});
		};
		ownerDocument.addEventListener("selectionchange", handleSelectionChange);
		return () => {
			ownerDocument.removeEventListener(
				"selectionchange",
				handleSelectionChange,
			);
			if (queuedReportFrame.current !== null) {
				cancelAnimationFrame(queuedReportFrame.current);
				queuedReportFrame.current = null;
			}
		};
	}, [surfaceRef, reportSelection, reportCaret]);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (e.key === "Escape" && onEscape) {
			e.preventDefault();
			e.stopPropagation();
			onEscape();
			return;
		}
		// The surface has the focus, so these never reach the canvas-wide keyboard
		// handling; they are also the browser's own defaults on an editable element,
		// which writes markup of its own and has to be prevented. The selection is
		// reported first because the document's selectionchange is queued rather than
		// dispatched as the selection moves, and the report it drives is queued once
		// more onto a frame: a keystroke arriving before either runs would otherwise
		// style the stretch selected one keystroke ago.
		const format =
			(e.metaKey || e.ctrlKey) && !e.altKey
				? FORMAT_KEYS[e.key.toLowerCase()]
				: undefined;
		if (format !== undefined && onToggleFormat) {
			e.preventDefault();
			e.stopPropagation();
			reportSelectionNow();
			onToggleFormat(format);
		}
	};

	// Prevent losing focus when clicking the margin outside the text.
	// Exclusion from the gesture system is handled by data-gesture="none".
	const handleWrapperPointerDown = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			if (e.target === e.currentTarget) {
				e.preventDefault();
				surfaceRef.current?.focus({ preventScroll: true });
			}
		},
		[surfaceRef],
	);

	// The region offset (x/y) rides inside the transform, after the shape
	// matrix, mirroring TextOverlayFrame: left/top would be applied outside the
	// transform, which only agrees with the SVG side while the region is
	// centered on the shape's local origin.
	const transform = `${createSvgTransform(scaleX, scaleY, rotation, cx, cy)} translate(${x}px, ${y}px)`;

	return (
		<TextEditorWrapper
			ref={wrapperRef}
			data-testid="text-editor"
			data-gesture="none"
			style={{
				width,
				// "scroll" pins the box to the region and lets the surface's own
				// max-height clip it; "grow" takes the region as a floor and extends
				// downward from its top edge until `growLimit` (growth direction
				// independent of verticalAlign).
				height: overflow === "scroll" ? height : undefined,
				minHeight: overflow === "grow" ? height : undefined,
				transform,
				alignItems: verticalAlignToAlignItems[verticalAlign],
			}}
			onPointerDown={handleWrapperPointerDown}
		>
			<EditableTextSurface
				data-gesture="native-wheel"
				ref={surfaceRef}
				// The content is built and read back imperatively (editableTextDom), so
				// React renders the element empty and never reconciles what the browser
				// edits inside it.
				contentEditable
				suppressContentEditableWarning
				// Diagram labels are largely identifiers and abbreviations, which the
				// browser's dictionary underlines as misspellings on an editable element
				// (on by default there, unlike an ordinary element).
				spellCheck={false}
				role="textbox"
				aria-multiline
				style={{
					// Both modes cap the surface, at the region ("scroll") or at the
					// shape's bottom edge ("grow"); past the cap the text scrolls, which
					// is also what hands the wheel over (shouldUseNativeWheel tests
					// scrollability).
					maxHeight: overflow === "scroll" ? "100%" : growLimit,
					textAlign,
					color: resolvedColor,
					caretColor: resolvedColor,
					fontSize,
					fontFamily: resolvedFontFamily,
					fontWeight,
					fontStyle,
					textDecoration,
				}}
				onKeyDown={handleKeyDown}
				onFocus={() => {
					reportCaret();
					reportSelection();
				}}
			/>
		</TextEditorWrapper>
	);
};

/**
 * In-place overlay for editing an object's text, positioned and transformed to
 * match the object. The text is edited on a contenteditable div that draws the
 * body's runs itself, so the caret, the selection and the wrapping sit where the
 * styled text is drawn (issue #7).
 */
export const TextEditor = memo(TextEditorComponent);
