import {
	Canvas,
	type Camera,
	type CanvasConfig,
	type CanvasDoc,
	type CanvasExportImagePayload,
	type CanvasHandle,
	type ToolbarEntry,
} from "@jiscribe/canvas";
import { annotationToolbarEntry } from "@jiscribe/plugin-annotation-shapes";
import { containerToolbarEntry } from "@jiscribe/plugin-container-shapes";
import { flowchartToolbarEntry } from "@jiscribe/plugin-flowchart-shapes";
import { generalToolbarEntry } from "@jiscribe/plugin-general-shapes";
import { lucideIconToolbarEntry } from "@jiscribe/plugin-lucide-icon-shape";
import { umlToolbarEntry } from "@jiscribe/plugin-uml-shapes";
import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "@jiscribe/canvas/fonts.css";
import "katex/dist/katex.min.css";

import { CanvasErrorNotice } from "./CanvasErrorNotice";
import { canvasParser, plugins } from "./canvasParser";
import { vscodeCanvasTheme } from "./vscodeCanvasTheme";
import type {
	ExtensionToWebviewMessage,
	WebviewToExtensionMessage,
} from "../types/messages";

// The container shape is supplied by @jiscribe/plugin-container-shapes
// (packages/canvas/docs/13-authoring-plugins.md).
const initialConfig: CanvasConfig = { plugins };

// The annotation / flowchart / container / general / icon categories and the markdown preset are
// not part of core's default layout (they come from plugins). The host decides their order
// and inserts them.
const toolbarLayout: ToolbarEntry[] = [
	{ kind: "preset", presetId: "rect" },
	{ kind: "preset", presetId: "ellipse" },
	{ kind: "preset", presetId: "polyline" },
	{ kind: "preset", presetId: "polygon" },
	{ kind: "preset", presetId: "text" },
	{ kind: "preset", presetId: "sticky" },
	{ kind: "preset", presetId: "markdown" },
	flowchartToolbarEntry,
	umlToolbarEntry,
	containerToolbarEntry,
	generalToolbarEntry,
	annotationToolbarEntry,
	lucideIconToolbarEntry,
];

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
 *   - canvasDoc: validated CanvasDoc (shows the Canvas when valid)
 *   - hasSemanticError: whether there are validation errors (shows the error
 *     notice instead of the Canvas UI)
 *   - parseError: JSON syntax error message (shown when the JSON is broken)
 *   - missingEmbeddedSource: image (.jis.svg / .jis.png) has no embedded source
 *
 * Error details are surfaced in the Problems panel by the Extension
 * (DiagnosticProvider), so the Webview only holds whether errors exist. These
 * states are mutually exclusive.
 */
function App() {
	const [canvasDoc, setCanvasDoc] = useState<CanvasDoc | null>(null);
	const [syncNonce, setSyncNonce] = useState<string | undefined>(undefined);
	const [hasSemanticError, setHasSemanticError] = useState(false);
	const [parseError, setParseError] = useState<string>("");
	const [missingEmbeddedSource, setMissingEmbeddedSource] = useState(false);

	// Canvas's imperative handle (its `export` namespace renders the image when
	// saving .jis.svg / .jis.png).
	const canvasRef = useRef<CanvasHandle>(null);

	// Camera restored from persisted state, read once at mount to seed the canvas
	// via `initialConfig.viewport` (undefined on first open → Canvas uses its doc-derived
	// default). The canvas owns the live camera after mount; we only persist what
	// it reports, never drive it back — so a tab-hide reload restores the last
	// view with no feedback into the canvas.
	const [initialCamera] = useState<Camera | undefined>(readPersistedCamera);

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
		 * validate in two stages and switch the display based on the result.
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
						setCanvasDoc(null);
						setHasSemanticError(false);
						setParseError("");
						break;
					}
					setMissingEmbeddedSource(false);

					// Delegate JSON syntax → CanvasDoc semantic checks to the shared
					// parser. It returns a discriminated union without throwing, so the
					// same logic as the Extension (DiagnosticProvider) covers every case.
					const result = canvasParser.parse(jsonText);
					switch (result.kind) {
						case "ok":
							setSyncNonce(message.saveNonce);
							setCanvasDoc(result.doc);
							setHasSemanticError(false);
							setParseError("");
							break;

						case "structure-error":
						case "semantic-error":
							// Structure errors (types, required fields) and semantic errors
							// (duplicate IDs, etc.) show the error notice. Details go to the
							// Problems panel, so hold only whether errors exist here.
							setHasSemanticError(true);
							setCanvasDoc(null);
							setParseError("");
							break;

						case "syntax-error":
						case "internal-error":
							// JSON syntax errors and unexpected errors are shown as a message.
							setParseError(result.message);
							setHasSemanticError(false);
							setCanvasDoc(null);
							break;
					}
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
		if (canvasDoc) {
			vscode.postMessage({ type: "rendered" });
		}
	}, [canvasDoc]);

	// Display priority:
	// missing source > JSON syntax error > semantic error > Canvas > loading

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

	if (parseError) {
		return (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					width: "100%",
					height: "100vh",
					color: "#dc2626",
					fontFamily: "monospace",
					padding: "20px",
					boxSizing: "border-box",
				}}
			>
				<div style={{ fontWeight: "bold", marginBottom: "8px" }}>
					JSON Parse Error
				</div>
				<div style={{ fontSize: "12px", color: "#6b7280" }}>{parseError}</div>
			</div>
		);
	}

	if (hasSemanticError) {
		return <CanvasErrorNotice />;
	}

	if (canvasDoc) {
		return (
			<div style={{ width: "100%", height: "100vh" }}>
				<Canvas
					doc={canvasDoc}
					syncNonce={syncNonce}
					initialConfig={{ ...initialConfig, viewport: initialCamera }}
					toolbar={{ layout: toolbarLayout }}
					onViewportChange={handleViewportChange}
					onCommit={handleCommit}
					onUndo={handleUndo}
					onRedo={handleRedo}
					theme={vscodeCanvasTheme}
					ref={canvasRef}
					onExportImage={handleExportImage}
				/>
			</div>
		);
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
