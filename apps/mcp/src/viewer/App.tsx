// The canvas viewer. It connects over WebSocket to the host the MCP process brought
// up, mirrors the file the AI rewrote, and writes back what a person fixed.
//
// The file is the source of truth, so nothing here owns the doc. Keeping the two in
// step is ./useDocSync, and holding the connection is ./useCanvasHostSocket; what is
// left here is the page itself — the canvas, the error bar, the notices — and the
// wiring between the two.
//
// The error bar holds a state until it is resolved (a broken or missing file, a
// failed write, a canvas that threw). A notice says that something happened — a
// save that needed no keystroke, edits that did not make it into the file — and
// goes on its own, since there is nothing about it left to resolve.
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
import { CanvasSurface } from "./CanvasSurface";
import { noticeDurationsMs, type NoticeKind } from "./noticeDurations";
import { calcDocLoadId } from "./ownEcho";
import { createDocImageResolver } from "./resolveDocImage";
import { useCanvasCommitWait } from "./useCanvasCommitWait";
import { useCanvasHostSocket } from "./useCanvasHostSocket";
import { useDocSync, type WorkInHand } from "./useDocSync";
import { viewerTheme } from "./viewerTheme";
import { isHeadlessViewerSearch } from "../shared/canvasHostProtocol";

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

const noticeStyles: Record<NoticeKind, CSSProperties> = {
	info: {
		background: viewerTheme.tokens.surface,
		color: viewerTheme.tokens.foreground,
		borderColor: viewerTheme.tokens.border,
		borderRadius: viewerTheme.tokens.radius,
		boxShadow: viewerTheme.tokens.shadow,
		animationDuration: `${noticeDurationsMs.info}ms`,
	},
	warning: {
		background: viewerTheme.tokens.surface,
		color: viewerTheme.tokens.errorFg,
		borderColor: viewerTheme.tokens.border,
		borderRadius: viewerTheme.tokens.radius,
		boxShadow: viewerTheme.tokens.shadow,
		animationDuration: `${noticeDurationsMs.warning}ms`,
	},
};

/** One notice on screen. The id remounts the element when the same text is said again */
type Notice = { id: number; kind: NoticeKind; message: string };

/**
 * How long a flush waits for a drag in progress to be let go before it answers.
 * The canvas has no way to end a drag from outside, and the host gives up on the
 * flush after 3 seconds, which leaves the rest for the commit and the write
 */
const DRAG_RELEASE_WAIT_MS = 1_500;

/** How often that wait looks, the canvas having nothing to call when a drag ends */
const DRAG_RELEASE_POLL_MS = 50;

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
	// Stacked, so that a warning is not pushed out by the next Ctrl+S before it has
	// been read
	const [notices, setNotices] = useState<Notice[]>([]);

	// Each notice's own timer, by its id
	const noticeTimersRef = useRef(new Map<number, number>());
	const noticeCountRef = useRef(0);
	const canvasHandleRef = useRef<CanvasHandle | null>(null);

	const isPersonInteracting = useCallback(
		(): boolean =>
			canvasHandleRef.current?.interaction.getStatus().isBusy ?? false,
		[],
	);

	const readWorkInHand = useCallback((): WorkInHand | null => {
		const status = canvasHandleRef.current?.interaction.getStatus();
		if (status === undefined) {
			return null;
		}
		if (status.editingTextId !== null) {
			return "text";
		}
		return status.drag === null ? null : "drag";
	}, []);

	/**
	 * Waits for a drag in progress to be let go, up to DRAG_RELEASE_WAIT_MS, so that
	 * it ends as the person ends it rather than being dropped with the document
	 */
	const waitForDragRelease = useCallback(async (): Promise<void> => {
		const deadline = performance.now() + DRAG_RELEASE_WAIT_MS;
		while (
			(canvasHandleRef.current?.interaction.getStatus().drag ?? null) !==
				null &&
			performance.now() < deadline
		) {
			await new Promise((resolve) => {
				window.setTimeout(resolve, DRAG_RELEASE_POLL_MS);
			});
		}
	}, []);

	/**
	 * Shows a notice for its kind's duration. The same text said again while it is
	 * up replaces it, replaying the animation, rather than stacking a copy; the
	 * replaced one's timer then finds nothing left to take down
	 */
	const showNotice = useCallback((message: string, kind: NoticeKind): void => {
		noticeCountRef.current += 1;
		const id = noticeCountRef.current;
		const noticeTimers = noticeTimersRef.current;
		setNotices((previous) => [
			...previous.filter((shown) => shown.message !== message),
			{ id, kind, message },
		]);
		noticeTimers.set(
			id,
			window.setTimeout(() => {
				noticeTimers.delete(id);
				setNotices((previous) => previous.filter((shown) => shown.id !== id));
			}, noticeDurationsMs[kind]),
		);
	}, []);

	const reportLostEdits = useCallback(
		(message: string): void => {
			showNotice(message, "warning");
		},
		[showNotice],
	);

	const {
		doc,
		openDoc,
		applyIncomingDoc,
		applyDocError,
		handleCommit,
		flushPendingSave,
	} = useDocSync({
		reportError: setErrorMessage,
		reportLostEdits,
		isPersonInteracting,
		readWorkInHand,
	});
	const waitForCanvasCommit = useCanvasCommitWait();
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

	/**
	 * Writes out the edits, the ones the canvas has yet to hand over included, before
	 * the host moves on to another file or closes this window. A drag still under
	 * way is given a moment to be let go, and a drag released is committed a render
	 * later (useCanvasCommitWait). Text still being typed cannot be committed from
	 * here (the canvas offers no way to), so it goes with the document, as does a
	 * drag held past the wait or a commit missed: each is dropped and named in a
	 * notice rather than written anywhere (see useDocSync)
	 */
	const flushEditsForHost = useCallback(async (): Promise<boolean> => {
		await waitForDragRelease();
		await waitForCanvasCommit();
		return await flushPendingSave({ isLeavingDocument: true });
	}, [flushPendingSave, waitForCanvasCommit, waitForDragRelease]);

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

	const handleOpenReference = useCallback(
		(payload: OpenReferencePayload) => {
			if (EXTERNAL_URL_PATTERN.test(payload.reference)) {
				window.open(payload.reference, "_blank", "noopener,noreferrer");
				return;
			}
			showNotice(
				`このビューアが開けない参照です: ${payload.reference}`,
				"warning",
			);
		},
		[showNotice],
	);

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
					showNotice(AUTO_SAVE_NOTICE, "info");
				}
			});
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [flushPendingSave, showNotice]);

	useEffect(() => {
		const noticeTimers = noticeTimersRef.current;
		return () => {
			for (const timer of noticeTimers.values()) {
				window.clearTimeout(timer);
			}
		};
	}, []);

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
			{notices.length > 0 && (
				<div className="viewer-notices">
					{notices.map((notice) => (
						<div
							key={notice.id}
							className="viewer-notice"
							role={notice.kind === "warning" ? "alert" : "status"}
							style={noticeStyles[notice.kind]}
						>
							{notice.message}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
