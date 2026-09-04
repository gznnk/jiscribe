import {
	Canvas,
	type Camera,
	type CanvasConfig,
	type CanvasDoc,
	type CanvasExportImagePayload,
	type CanvasHandle,
	type ToolbarEntry,
} from "@jiscribe/canvas";
import { standardToolbarLayout } from "@jiscribe/standard-shapes";
import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "@jiscribe/canvas/fonts.css";
import "katex/dist/katex.min.css";

import { canvasParser, plugins } from "./canvasParser";
import { DocErrorBanner, DocErrorNotice } from "./DocErrorNotice";
import {
	applyParseResult,
	type DocViewState,
	initialDocViewState,
} from "./docViewState";
import { vscodeCanvasTheme } from "./vscodeCanvasTheme";
import type {
	ExtensionToWebviewMessage,
	WebviewToExtensionMessage,
} from "../types/messages";

// The shipped shapes are supplied by @jiscribe/standard-shapes
// (packages/canvas/docs/13-authoring-plugins.md).
const initialConfig: CanvasConfig = { plugins };

// The annotation / flowchart / container / general / icon categories and the markdown preset are
// not part of core's default layout (they come from plugins), so the host inserts them —
// here in the arrangement the shape set itself proposes.
const toolbarLayout: ToolbarEntry[] = standardToolbarLayout;

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

/**
 * Webview-local state saved via getState/setState. With
 * retainContextWhenHidden: false (#138), the Webview is discarded when the tab
 * hides, but this survives the reload — so we save the viewport (camera) and
 * restore it on remount. The document isn't included, as the Extension re-sends
 * it via "ready".
 */
type PersistedState = {
	camera?: Camera;
};

const readPersistedCamera = (): Camera | undefined => {
	const state = vscode.getState() as PersistedState | null;
	return state?.camera ?? undefined;
};

const persistCamera = (camera: Camera): void => {
	const state = (vscode.getState() as PersistedState | null) ?? {};
	vscode.setState({ ...state, camera });
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
		case "requestImageExport":
			return (
				typeof message.requestId === "number" &&
				(message.format === "png" || message.format === "svg")
			);
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
	const [docView, setDocView] = useState<DocViewState>(initialDocViewState);
	const [missingEmbeddedSource, setMissingEmbeddedSource] = useState(false);

	// Canvas's imperative handle (its `export` namespace renders the image when
	// saving .jis.svg / .jis.png).
	const canvasRef = useRef<CanvasHandle>(null);

	// Mount-time canvas configuration, built once: `viewport` seeds the camera from
	// persisted state (undefined on first open → Canvas uses its doc-derived
	// default). The canvas owns the live camera after mount; we only persist what
	// it reports, never drive it back — so a tab-hide reload restores the last
	// view with no feedback into the canvas. Held in state rather than rebuilt per
	// render so the mounted canvas sees a stable prop.
	const [mountConfig] = useState<CanvasConfig>(() => ({
		...initialConfig,
		viewport: readPersistedCamera(),
	}));

	// Persist pan/zoom so the view survives a tab-hide reload (#138,
	// retainContextWhenHidden: false). A read-only mirror — no setState, no
	// feeding back into the canvas; it stays authoritative for the live camera.
	const handleViewportChange = useCallback((next: Camera) => {
		persistCamera(next);
	}, []);

	// The Canvas save scheduler throttles high-frequency commits (key repeat,
	// etc.) (#125), so send straight to the Extension without debouncing here.
	// The written-back payload is always the doc's JSON text regardless of
	// docType; image docs (.jis.svg / .jis.png) render at save time via
	// requestImageExport (keeping the commit path off DOM rendering).
	const handleCommit = useCallback((doc: CanvasDoc, saveNonce: string) => {
		const message: WebviewToExtensionMessage = {
			type: "update",
			data: JSON.stringify(doc, null, 2),
			saveNonce,
		};
		vscode.postMessage(message);
	}, []);

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
					setDocView((prev) =>
						applyParseResult(prev, result, message.saveNonce),
					);
					break;
				}

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
						let svg: string | null;
						try {
							svg = handle.toSvgString();
						} catch (err) {
							console.error("[Jiscribe] SVG export failed:", err);
							respond(null);
							break;
						}
						if (!svg) {
							respond(null);
							break;
						}
						// base64-encode like PNG (via Blob so UTF-8 text survives) so
						// imageExportResult.data has a single encoding for both formats,
						// removing the utf8/base64 mismatch hazard (#182).
						blobToBase64(new Blob([svg], { type: "image/svg+xml" })).then(
							respond,
							(err: unknown) => {
								console.error("[Jiscribe] SVG export failed:", err);
								respond(null);
							},
						);
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
			<div style={{ width: "100%", height: "100vh", position: "relative" }}>
				<Canvas
					doc={docView.doc}
					syncNonce={docView.syncNonce}
					initialConfig={mountConfig}
					toolbar={{ layout: toolbarLayout }}
					onViewportChange={handleViewportChange}
					onCommit={handleCommit}
					onUndo={handleUndo}
					onRedo={handleRedo}
					theme={vscodeCanvasTheme}
					ref={canvasRef}
					onExportImage={handleExportImage}
				/>
				{docView.error && <DocErrorBanner error={docView.error} />}
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
