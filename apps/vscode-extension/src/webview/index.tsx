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

import { canvasParser, plugins } from "./canvasParser";
import { DocEditingPausedOverlay, DocErrorNotice } from "./DocErrorNotice";
import {
	applyParseResult,
	type DocViewState,
	initialDocViewState,
} from "./docViewState";
import { createWebviewImageResolver } from "./resolveImage";
import { useVscodeColorScheme } from "./useVscodeColorScheme";
import { vscodeCanvasThemes } from "./vscodeCanvasTheme";
import type {
	ExtensionToWebviewMessage,
	WebviewToExtensionMessage,
} from "../types/messages";

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
declare const acquireVsCodeApi: () => {
	postMessage(message: WebviewToExtensionMessage): void;
	getState(): unknown;
	setState(state: unknown): void;
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

/**
 * Webview-local state saved via getState/setState. With
 * retainContextWhenHidden: false (#138), the Webview is discarded when the tab
 * hides, but this survives the reload — so we save the viewport (camera) and the
 * sidebar open/collapsed state, and restore both on remount. The document isn't
 * included, as the Extension re-sends it via "ready".
 */
type PersistedState = {
	camera?: Camera;
	sidebars?: CanvasSidebarsState;
};

const readPersistedCamera = (): Camera | undefined => {
	const state = vscode.getState() as PersistedState | null;
	return state?.camera ?? undefined;
};

const persistCamera = (camera: Camera): void => {
	const state = (vscode.getState() as PersistedState | null) ?? {};
	vscode.setState({ ...state, camera });
};

const readPersistedSidebars = (): CanvasSidebarsState | undefined => {
	const state = vscode.getState() as PersistedState | null;
	return state?.sidebars ?? undefined;
};

const persistSidebars = (sidebars: CanvasSidebarsState): void => {
	const state = (vscode.getState() as PersistedState | null) ?? {};
	vscode.setState({ ...state, sidebars });
};

/**
 * Minimal shape validation for messages arriving from the Extension.
 *
 * The CSP is `default-src 'none'`, so there is no cross-origin frame that could
 * postMessage here; this is a defense-in-depth gate (#183) that whitelists known
 * `type`s and checks each variant's required fields before dispatch, so an
 * unexpected sender cannot drive the update / export handlers.
 */
const isExtensionToWebviewMessage = (
	value: unknown,
): value is ExtensionToWebviewMessage => {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const message = value as Record<string, unknown>;
	switch (message.type) {
		case "update":
			return typeof message.data === "string";
		case "commentAuthor":
			return message.author === undefined || typeof message.author === "string";
		case "requestImageExport":
			return (
				typeof message.requestId === "number" &&
				(message.format === "png" || message.format === "svg")
			);
		case "imageResolved":
			if (typeof message.requestId !== "string") {
				return false;
			}
			return message.ok === true
				? typeof message.base64 === "string" &&
						typeof message.mimeType === "string"
				: message.ok === false && typeof message.error === "string";
		default:
			return false;
	}
};

/** Convert a Blob to a base64 string (without the data-URL header). */
const blobToBase64 = (blob: Blob): Promise<string> =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			resolve((reader.result as string).split(",")[1] ?? "");
		};
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});

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
		const messageHandler = (event: MessageEvent) => {
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
					setDocView((prev) => applyParseResult(prev, result));
					break;
				}

				case "commentAuthor":
					setCommentAuthor(message.author);
					break;

				case "requestImageExport": {
					// Saving .jis.png / .jis.svg: render the current canvas and return it.
					// Always respond even on failure (data: null) so the Extension
					// switches to its fallback (old image + re-embedded new source).
					const respond = (data: string | null) => {
						vscode.postMessage({
							type: "imageExportResult",
							requestId: message.requestId,
							data,
						});
					};
					const handle = canvasRef.current?.export;
					if (!handle) {
						respond(null);
						break;
					}
					if (message.format === "svg") {
						handle
							.toSvgString()
							// base64-encode like PNG (via Blob so UTF-8 text survives) so
							// imageExportResult.data has a single encoding for both formats,
							// removing the utf8/base64 mismatch hazard (#182).
							.then((svg) =>
								svg
									? blobToBase64(new Blob([svg], { type: "image/svg+xml" }))
									: null,
							)
							.then(respond, (err: unknown) => {
								console.error("[Jiscribe] SVG export failed:", err);
								respond(null);
							});
						break;
					}
					handle
						.capturePng()
						.then((capture) => (capture ? blobToBase64(capture.blob) : null))
						.then(respond, (err: unknown) => {
							console.error("[Jiscribe] PNG export failed:", err);
							respond(null);
						});
					break;
				}

				case "imageResolved":
					// Settles the resolveImage request the canvas is waiting on.
					imageResolver.handleImageResolved(message);
					break;
			}
		};

		window.addEventListener("message", messageHandler);

		// Tell the Extension the Webview is ready and request the initial contents.
		vscode.postMessage({ type: "ready" });

		// Cleanup: remove the listener on unmount to avoid a memory leak.
		return () => {
			window.removeEventListener("message", messageHandler);
		};
	}, []); // empty deps = run once on mount

	// Notify the Extension once the canvas has rendered and its export handle is
	// available. This effect runs after the Canvas commits (the handle is set via
	// useImperativeHandle during commit, before this effect), so requestImageExport
	// can succeed. Lets the Extension reconcile a stale image after a hidden-tab
	// save (#179).
	useEffect(() => {
		if (docView.doc) {
			vscode.postMessage({ type: "rendered" });
		}
	}, [docView.doc]);

	// Display priority:
	// missing source > Canvas (with the error as an overlay) > error notice > loading

	if (missingEmbeddedSource) {
		return (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					width: "100%",
					height: "100vh",
					color: "#6b7280",
					fontFamily: "monospace",
					padding: "20px",
					boxSizing: "border-box",
					textAlign: "center",
				}}
			>
				<div style={{ fontWeight: "bold", marginBottom: "8px" }}>
					No embedded jiscribe source
				</div>
				<div style={{ fontSize: "12px" }}>
					This image does not contain an editable jiscribe canvas. Only images
					exported from jiscribe (.jis.png / .jis.svg) can be edited.
				</div>
			</div>
		);
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

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				width: "100%",
				height: "100vh",
				color: "#6b7280",
			}}
		>
			Loading canvas...
		</div>
	);
}

// The script tag sits at the end of body, so the DOM is guaranteed built when
// this runs. The null check is kept to stay safe against future HTML changes.
const container = document.getElementById("root");
if (container) {
	const root = createRoot(container);
	root.render(<App />);
}
