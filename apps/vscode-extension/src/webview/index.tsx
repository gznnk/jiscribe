import {
	Canvas,
	type Camera,
	type CanvasConfig,
	type CanvasDoc,
	type CanvasExportImagePayload,
	type CanvasHandle,
	type CanvasSidebarsState,
	type StencilCategory,
	type ToolbarSection,
} from "@jiscribe/canvas";
import {
	standardStencilLibrarySections,
	standardToolbarSections,
} from "@jiscribe/standard-shapes";
import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "@jiscribe/canvas/fonts.css";
import "katex/dist/katex.min.css";

import { blobToBase64 } from "./blobToBase64";
import { canvasParser, plugins } from "./canvasParser";
import {
	DocEditingPausedOverlay,
	DocErrorNotice,
	LoadingNotice,
	MissingEmbeddedSourceNotice,
} from "./DocErrorNotice";
import {
	applyParseResult,
	type DocViewState,
	initialDocViewState,
} from "./docViewState";
import { exportImageAsBase64 } from "./exportViaCanvasHandle";
import { createPersistedState, type VscodeStateApi } from "./persistedState";
import { createWebviewImageResolver } from "./resolveImage";
import { useVscodeColorScheme } from "./useVscodeColorScheme";
import { vscodeCanvasThemes } from "./vscodeCanvasTheme";
import { isExtensionToWebviewMessage } from "../types/extensionMessageGuard";
import type { WebviewToExtensionMessage } from "../types/messages";

// The shipped shapes are supplied by @jiscribe/standard-shapes
// (packages/canvas/docs/13-authoring-plugins.md).
const initialConfig: CanvasConfig = { plugins };

// The shape set owns how its stencils are arranged, over the bar and the sidebar
// both; core's default bar knows none of them, so the host passes both halves.
const toolbarSections: ToolbarSection[] = standardToolbarSections;
const stencilLibrarySections: StencilCategory[] =
	standardStencilLibrarySections;

/**
 * Type of the API available only in the VSCode Webview environment.
 * acquireVsCodeApi() is a global VSCode injects into the Webview; it doesn't
 * exist in a normal browser, so we only declare its type.
 */
declare const acquireVsCodeApi: () => VscodeStateApi & {
	postMessage(message: WebviewToExtensionMessage): void;
};

// acquireVsCodeApi() can be called only once per page lifetime, so call it once
// at module level and cache it.
const vscode = acquireVsCodeApi();

// One resolver per page, not per App mount: the request ids it hands out have to
// stay unique for as long as the Extension may answer, and a remount would
// restart the counter while answers to the old ids are still in flight.
const imageResolver = createWebviewImageResolver((message) => {
	vscode.postMessage(message);
});

const {
	readPersistedCamera,
	persistCamera,
	readPersistedSidebars,
	persistSidebars,
} = createPersistedState(vscode);

/**
 * Root component of the Canvas editor.
 *
 * State:
 *   - docView: last document that parsed clean plus the current text's error
 *     (see {@link DocViewState}; the canvas stays mounted while an error stands)
 *   - missingEmbeddedSource: image (.jis.svg / .jis.png) has no embedded source
 *
 * Error details are surfaced in the Problems panel by the Extension
 * (DiagnosticProvider), so the Webview only holds what it needs to name the
 * failure.
 */
function App() {
	const colorScheme = useVscodeColorScheme();
	const [docView, setDocView] = useState<DocViewState>(initialDocViewState);
	const [missingEmbeddedSource, setMissingEmbeddedSource] = useState(false);
	// Name written onto the comments posted here, resolved by the Extension and
	// sent after the initial update; undefined until then, which is what keeps the
	// comment panel read-only when there is no name to post under.
	const [commentAuthor, setCommentAuthor] = useState<string | undefined>();

	// Canvas's imperative handle (its `export` namespace renders the image when
	// saving .jis.svg / .jis.png).
	const canvasRef = useRef<CanvasHandle>(null);

	// Mount-time canvas configuration, built once: `viewport` and `sidebars` seed
	// the camera and the sidebar open/collapsed state from persisted state
	// (undefined on first open → Canvas uses its own defaults). The canvas owns
	// both after mount; we only persist what it reports, never drive it back — so
	// a tab-hide reload restores the last view with no feedback into the canvas.
	// Held in state rather than rebuilt per render so the mounted canvas sees a
	// stable prop.
	const [mountConfig] = useState<CanvasConfig>(() => ({
		...initialConfig,
		viewport: readPersistedCamera(),
		sidebars: readPersistedSidebars(),
	}));

	// Persist pan/zoom so the view survives a tab-hide reload (#138,
	// retainContextWhenHidden: false). A read-only mirror — no setState, no
	// feeding back into the canvas; it stays authoritative for the live camera.
	const handleViewportChange = useCallback((next: Camera) => {
		persistCamera(next);
	}, []);

	// Same read-only mirror for the sidebars: the canvas reports every change and
	// we only write it back into the persisted state.
	const handleSidebarsChange = useCallback((next: CanvasSidebarsState) => {
		persistSidebars(next);
	}, []);

	// While the editor's text does not parse, the canvas is showing an older
	// document than the file holds, and a commit replaces the file's whole range
	// with it. Editing is therefore paused: the overlay takes the pointer events
	// and the keystrokes are swallowed below, so the user's edit is refused
	// visibly rather than made and then dropped.
	const isEditingPaused = docView.error !== null;
	// Read by handlers that must keep one identity for the canvas's memo, which
	// would otherwise re-render it on every broken keystroke.
	const isEditingPausedRef = useRef(isEditingPaused);
	isEditingPausedRef.current = isEditingPaused;

	// Version stamped on the newest update from the Extension, quoted back on
	// every commit so the Extension can drop one built before a change made
	// outside the canvas (see the `update` messages in types/messages.ts). A ref
	// rather than state: it must be readable from the handlers below without
	// rebuilding them, and it changes nothing on screen.
	const lastReceivedDocumentVersionRef = useRef<number | undefined>(undefined);

	// The Canvas save scheduler throttles high-frequency commits (key repeat,
	// etc.) (#125), so send straight to the Extension without debouncing here.
	// The written-back payload is always the doc's JSON text regardless of
	// docType; image docs (.jis.svg / .jis.png) render at save time via
	// requestImageExport (keeping the commit path off DOM rendering).
	const handleCommit = useCallback((doc: CanvasDoc) => {
		// Backstop for anything that reaches the canvas past the pause (a commit
		// already scheduled when the text broke).
		if (isEditingPausedRef.current) {
			return;
		}
		const message: WebviewToExtensionMessage = {
			type: "update",
			data: JSON.stringify(doc, null, 2),
			baseVersion: lastReceivedDocumentVersionRef.current,
		};
		vscode.postMessage(message);
	}, []);

	// The canvas listens for shortcuts on its own container, so the overlay above
	// it stops the pointer but not the keyboard. Stopping the event here, in the
	// capture phase, keeps Delete or a paste from changing a canvas whose changes
	// cannot be written back.
	const handleKeyDownCapture = useCallback(
		(event: React.KeyboardEvent<HTMLDivElement>) => {
			if (isEditingPausedRef.current) {
				event.stopPropagation();
			}
		},
		[],
	);

	// Delegate the export dialog's result to the workspace save. Choosing the
	// destination (save dialog) and deriving the file name are the Extension's job.
	const handleExportImage = useCallback((payload: CanvasExportImagePayload) => {
		blobToBase64(payload.data).then(
			(base64) => {
				vscode.postMessage({
					type: "exportImage",
					format: payload.format,
					base64,
					includesSource: payload.includesSource,
				});
			},
			(err: unknown) => {
				console.error("[Jiscribe] Failed to encode exported image:", err);
			},
		);
	}, []);

	const handleUndo = useCallback(() => {
		vscode.postMessage({ type: "undo" });
	}, []);

	const handleRedo = useCallback(() => {
		vscode.postMessage({ type: "redo" });
	}, []);

	useEffect(() => {
		/**
		 * Handler for messages from the Extension.
		 *
		 * An "update" message arrives whenever the file contents change; parse and
		 * validate it, then fold the result into the view state.
		 */
		const handleExtensionMessage = (event: MessageEvent) => {
			if (!isExtensionToWebviewMessage(event.data)) {
				return;
			}
			const message = event.data;

			switch (message.type) {
				case "update": {
					const docType = message.docType ?? "json";

					// For image docs (svg / png), the Extension has already extracted
					// the embedded source and sends JSON text. Empty string means no
					// embedded source.
					const jsonText = message.data;
					if (docType !== "json" && jsonText === "") {
						setMissingEmbeddedSource(true);
						setDocView(initialDocViewState);
						break;
					}
					setMissingEmbeddedSource(false);

					// Delegate JSON syntax → CanvasDoc semantic checks to the shared
					// parser. It returns a discriminated union without throwing, so the
					// same logic as the Extension (DiagnosticProvider) covers every case.
					// A failing result keeps the last valid document mounted and only
					// records the error, so mid-edit text (which is broken most of the
					// time) neither rebuilds the canvas nor drops the viewport (#136).
					const result = canvasParser.parse(jsonText);
					// Recorded only for text the canvas adopts: while the text is broken
					// the canvas stays on the older document, and a commit still on its
					// way from it must keep quoting that document's version, so the
					// Extension drops it rather than writing the older canvas over the
					// text being repaired. Image docs carry no version.
					if (result.kind === "ok") {
						lastReceivedDocumentVersionRef.current = message.version;
					}
					setDocView((prev) => applyParseResult(prev, result));
					break;
				}

				case "commentAuthor":
					setCommentAuthor(message.author);
					break;

				case "requestImageExport": {
					// Saving .jis.png / .jis.svg. Always answer, with data: null when
					// nothing could be rendered, so the Extension switches to its
					// fallback (old image + re-embedded new source) instead of waiting.
					const { requestId } = message;
					const postExportResult = (data: string | null) => {
						vscode.postMessage({
							type: "imageExportResult",
							requestId,
							data,
						});
					};
					exportImageAsBase64(canvasRef.current?.export, message.format).then(
						postExportResult,
					);
					break;
				}

				case "imageResolved":
					// Settles the resolveImage request the canvas is waiting on.
					imageResolver.handleImageResolved(message);
					break;
			}
		};

		window.addEventListener("message", handleExtensionMessage);

		// Tell the Extension the Webview is ready and request the initial contents.
		vscode.postMessage({ type: "ready" });

		return () => {
			window.removeEventListener("message", handleExtensionMessage);
		};
	}, []);

	// Notify the Extension whenever a document has rendered and the export
	// handle is available. This effect runs after the Canvas commits (the handle
	// is set via useImperativeHandle during commit, before this effect), so
	// requestImageExport can succeed. Lets the Extension reconcile a stale image
	// after a hidden-tab save (#179). Sent for every document, not once per
	// mount: a reconcile the Extension had to skip while the document was dirty
	// gets its next chance when an undo or redo brings a new document here.
	useEffect(() => {
		if (docView.doc) {
			vscode.postMessage({ type: "rendered" });
		}
	}, [docView.doc]);

	// Display priority:
	// missing source > Canvas (with the error as an overlay) > error notice > loading

	if (missingEmbeddedSource) {
		return <MissingEmbeddedSourceNotice />;
	}

	if (docView.doc) {
		return (
			<div
				style={{ width: "100%", height: "100vh", position: "relative" }}
				onKeyDownCapture={handleKeyDownCapture}
			>
				<Canvas
					doc={docView.doc}
					initialConfig={mountConfig}
					toolbar={{ sections: toolbarSections }}
					stencilLibrary={{ sections: stencilLibrarySections }}
					onViewportChange={handleViewportChange}
					onSidebarsChange={handleSidebarsChange}
					onCommit={handleCommit}
					onUndo={handleUndo}
					onRedo={handleRedo}
					theme={vscodeCanvasThemes[colorScheme]}
					ref={canvasRef}
					onExportImage={handleExportImage}
					commentAuthor={commentAuthor}
					resolveImage={imageResolver.resolveImage}
				/>
				{docView.error && <DocEditingPausedOverlay error={docView.error} />}
			</div>
		);
	}

	// No document has parsed clean yet, so there is nothing to keep on screen
	// behind the error.
	if (docView.error) {
		return <DocErrorNotice error={docView.error} />;
	}

	return <LoadingNotice />;
}

const container = document.getElementById("root");
if (container) {
	const root = createRoot(container);
	root.render(<App />);
}
