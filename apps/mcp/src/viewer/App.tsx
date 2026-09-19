// The canvas viewer. It connects over WebSocket to the host the MCP process brought
// up, mirrors the file the AI rewrote, and writes back what a person fixed.
//
// The file is the source of truth, so nothing here owns the doc. Keeping the two in
// step is ./useDocSync, and holding the connection is ./useCanvasHostSocket; what is
// left here is the page itself — the canvas, the error bar, the notice — and the
// wiring between the two.
//
// Its other job is answering the queries only the drawn result can answer (capture,
// camera, selection, measurement). Reading the file does not tell the AI those, so
// it comes here to ask.
//
// The same page is used for the window a person looks at and for the headless one
// the AI looks through (?headless=1). The headless one has nobody to close it, so
// it is the one page that closes itself when the host stays unreachable, or when
// the canvas it exists to draw has thrown.

import type { AiHandleOp } from "@jiscribe/ai-tools";
import {
	applyHandleOp,
	captureCanvasImage,
	createCanvasHandleControl,
	type AiHandleControl,
	type CapturePng,
} from "@jiscribe/ai-tools/client";
import type {
	CanvasHandle,
	CanvasPngExportOptions,
	OpenReferencePayload,
} from "@jiscribe/canvas";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { CanvasErrorBoundary } from "./CanvasErrorBoundary";
import { waitForCanvasFrames } from "./canvasFrames";
import { CanvasSurface } from "./CanvasSurface";
import { calcDocLoadId } from "./ownEcho";
import { createDocImageResolver } from "./resolveDocImage";
import { useCanvasHostSocket } from "./useCanvasHostSocket";
import { useDocSync } from "./useDocSync";
import { viewerTheme } from "./viewerTheme";
import { isHeadlessViewerSearch } from "../shared/canvasHostProtocol";

/**
 * How long the transient notice stays up, fading in and back out included. The
 * element is dropped on the same timer the animation runs on, so it is passed to
 * the animation rather than repeated in the stylesheet
 */
const NOTICE_DURATION_MS = 2_000;

/**
 * The chrome sits outside the Canvas root, where the theme's `--jiscribe-*` do
 * not reach, so its colors are read from the same theme the canvas is drawn with.
 * The root's own ground is what shows once the canvas is gone (an error bar on
 * its own, a canvas that threw)
 */
const rootStyle: CSSProperties = {
	colorScheme: viewerTheme.colorScheme,
	background: viewerTheme.tokens.canvasBg,
	color: viewerTheme.tokens.foreground,
};

const errorStyle: CSSProperties = {
	background: viewerTheme.tokens.surface,
	color: viewerTheme.tokens.errorFg,
	borderBottomColor: viewerTheme.tokens.borderSubtle,
};

const noticeStyle: CSSProperties = {
	background: viewerTheme.tokens.surface,
	color: viewerTheme.tokens.foreground,
	borderColor: viewerTheme.tokens.border,
	borderRadius: viewerTheme.tokens.radius,
	boxShadow: viewerTheme.tokens.shadow,
	animationDuration: `${NOTICE_DURATION_MS}ms`,
};

/** What Ctrl+S is answered with, in place of the browser's save dialog */
const AUTO_SAVE_NOTICE = "変更は自動で保存されます";

/** Whether this window is the AI's eye rather than one a person is looking at */
const isHeadlessWindow = isHeadlessViewerSearch(window.location.search);

const EXTERNAL_URL_PATTERN = /^https?:\/\//i;

export function App() {
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	// Held apart from the rest: the canvas is not mounted again, so this message
	// outlives the next incoming frame, which clears the ordinary one
	const [canvasErrorMessage, setCanvasErrorMessage] = useState<string | null>(
		null,
	);
	// The id remounts the element, so pressing again while one is up replays the
	// animation instead of leaving a notice that is already fading
	const [notice, setNotice] = useState<{
		id: number;
		message: string;
	} | null>(null);

	const noticeTimerRef = useRef<number | null>(null);
	const noticeCountRef = useRef(0);
	const canvasHandleRef = useRef<CanvasHandle | null>(null);

	const isPersonInteracting = useCallback(
		(): boolean =>
			canvasHandleRef.current?.interaction.getStatus().isBusy ?? false,
		[],
	);

	const {
		doc,
		openDoc,
		applyIncomingDoc,
		applyDocError,
		handleCommit,
		flushPendingSave,
	} = useDocSync({ reportError: setErrorMessage, isPersonInteracting });
	const openPath = openDoc?.relPath ?? null;

	// One resolver per open file: a src is relative to that file's directory
	const resolveImage = useMemo(
		() => (openPath === null ? undefined : createDocImageResolver(openPath)),
		[openPath],
	);

	const registerCanvas = useCallback((handle: CanvasHandle | null) => {
		canvasHandleRef.current = handle;
	}, []);

	const capturePng = useCallback<CapturePng>(
		async (options?: CanvasPngExportOptions) =>
			(await canvasHandleRef.current?.export.capturePng(options))?.blob ?? null,
		[],
	);

	const handleControl = useMemo<AiHandleControl>(
		() => createCanvasHandleControl(() => canvasHandleRef.current),
		[],
	);

	/**
	 * Answers the queries about the drawn result. Capture alone carries an image
	 * rather than text, so it has a path of its own
	 */
	const runHandleOp = useCallback(
		async (op: AiHandleOp) => {
			try {
				return op.kind === "captureCanvas"
					? await captureCanvasImage(capturePng)
					: await applyHandleOp(op, handleControl);
			} catch (error) {
				// Throwing without answering would leave the host with nothing to do but
				// wait 15 seconds and time out, and the AI with no reason at all
				return {
					ok: false,
					text: `the canvas viewer failed to run ${op.kind}: ${error instanceof Error ? error.message : String(error)}`,
				};
			}
		},
		[capturePng, handleControl],
	);

	const showNotice = useCallback((message: string): void => {
		noticeCountRef.current += 1;
		setNotice({ id: noticeCountRef.current, message });
		if (noticeTimerRef.current !== null) {
			window.clearTimeout(noticeTimerRef.current);
		}
		noticeTimerRef.current = window.setTimeout(() => {
			noticeTimerRef.current = null;
			setNotice(null);
		}, NOTICE_DURATION_MS);
	}, []);

	/**
	 * Writes out the edits, the ones the canvas has yet to hand over included, before
	 * the host moves on to another file or closes this window. A drag released just
	 * before is committed a frame or two later; missed, it is dropped and reported
	 * rather than written anywhere (see useDocSync)
	 */
	const flushEditsForHost = useCallback(async (): Promise<boolean> => {
		await waitForCanvasFrames();
		return await flushPendingSave({ isLeavingDocument: true });
	}, [flushPendingSave]);

	/**
	 * Writes out the buffered edits, then closes the window. close_canvas reads
	 * whether it closed here from the connection being cut, so nothing is returned
	 * even when it could not close
	 */
	const closeWindow = useCallback((): void => {
		void flushEditsForHost().finally(() => {
			window.close();
		});
	}, [flushEditsForHost]);

	/**
	 * What is left when the canvas has thrown. The socket stays up, so the AI is
	 * still answered (with "there is no canvas"), but a headless window has nothing
	 * to draw and nobody to notice, so it goes rather than sitting there orphaned
	 */
	const handleCanvasError = useCallback((message: string): void => {
		setCanvasErrorMessage(`キャンバスの描画に失敗しました: ${message}`);
		if (isHeadlessWindow) {
			window.close();
		}
	}, []);

	const handleOpenReference = useCallback((payload: OpenReferencePayload) => {
		if (EXTERNAL_URL_PATTERN.test(payload.reference)) {
			window.open(payload.reference, "_blank", "noopener,noreferrer");
			return;
		}
		setErrorMessage(`このビューアが開けない参照です: ${payload.reference}`);
	}, []);

	const isConnected = useCanvasHostSocket({
		isHeadlessWindow,
		onDocFrame: applyIncomingDoc,
		onDocError: applyDocError,
		onCloseViewer: closeWindow,
		onFlushEdits: flushEditsForHost,
		onHandleOp: runHandleOp,
	});

	// Ctrl+S is a person asking to save what is already saving itself. Left to the
	// browser it opens the save dialog, which would write a copy of the page rather
	// than the canvas, so it is taken over: the buffered edits go out now, and the
	// notice says the edits did not need the keystroke
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent): void => {
			if (
				event.key.toLowerCase() !== "s" ||
				!(event.ctrlKey || event.metaKey) ||
				event.altKey
			) {
				return;
			}
			event.preventDefault();
			void flushPendingSave().then((isSaved) => {
				// A write that did not land shows up in the error bar, with no file open
				// there is nothing to say, and edits waiting for a gesture to end are
				// saved once it has; saying it is saved on top of any of them would be
				// the opposite of the truth
				if (isSaved) {
					showNotice(AUTO_SAVE_NOTICE);
				}
			});
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [flushPendingSave, showNotice]);

	useEffect(
		() => () => {
			if (noticeTimerRef.current !== null) {
				window.clearTimeout(noticeTimerRef.current);
			}
		},
		[],
	);

	// Write out the buffered edits before the tab closes. It is a write from a page
	// on its way out, so there is no guarantee it arrives; catching what was waiting
	// on the debounce is treated as the best that can be hoped for
	useEffect(() => {
		const handleBeforeUnload = (): void => {
			void flushPendingSave({ isLeavingDocument: true });
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [flushPendingSave]);

	// A canvas that threw is the page's whole state, so it is shown over anything
	// the file itself has to say
	const bannerMessage = canvasErrorMessage ?? errorMessage;

	return (
		<div className="viewer-root" style={rootStyle}>
			{bannerMessage !== null && (
				<div className="viewer-error" style={errorStyle}>
					{bannerMessage}
				</div>
			)}
			<CanvasErrorBoundary onError={handleCanvasError}>
				<CanvasSurface
					doc={doc}
					relPath={openPath}
					docLoadId={calcDocLoadId(openDoc)}
					isConnected={isConnected}
					onCommit={handleCommit}
					onOpenReference={handleOpenReference}
					resolveImage={resolveImage}
					onRegisterCanvas={registerCanvas}
				/>
			</CanvasErrorBoundary>
			{notice !== null && (
				<div
					key={notice.id}
					className="viewer-notice"
					role="status"
					style={noticeStyle}
				>
					{notice.message}
				</div>
			)}
		</div>
	);
}
