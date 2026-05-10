import {
	Canvas,
	CanvasErrorScreen,
	CanvasValidationError,
	parseAndValidateCanvasDoc,
	type CanvasDoc,
	type SemanticDiagnostic,
} from "@workspace/svg-canvas-2";
import { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

// VSCode API type
declare const acquireVsCodeApi: () => {
	postMessage(message: unknown): void;
	getState(): unknown;
	setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();

function App() {
	const [canvasDoc, setCanvasDoc] = useState<CanvasDoc | null>(null);
	const [diagnostics, setDiagnostics] = useState<SemanticDiagnostic[]>([]);
	const [parseError, setParseError] = useState<string>("");

	const handleCommit = useCallback((doc: CanvasDoc) => {
		vscode.postMessage({
			type: "update",
			data: JSON.stringify(doc, null, 2),
		});
	}, []);

	useEffect(() => {
		const messageHandler = (event: MessageEvent) => {
			const message = event.data;

			switch (message.type) {
				case "update": {
					let parsed: unknown;
					try {
						parsed = JSON.parse(message.data as string);
					} catch (err) {
						const msg = err instanceof Error ? err.message : "JSON parse error";
						setParseError(msg);
						setDiagnostics([]);
						setCanvasDoc(null);
						return;
					}

					try {
						const validated = parseAndValidateCanvasDoc(parsed);
						setCanvasDoc(validated);
						setDiagnostics([]);
						setParseError("");
					} catch (err) {
						if (err instanceof CanvasValidationError) {
							setDiagnostics(err.specifics);
							setCanvasDoc(null);
							setParseError("");
						} else {
							setParseError(err instanceof Error ? err.message : "Unknown error");
							setCanvasDoc(null);
						}
					}
					break;
				}
			}
		};

		window.addEventListener("message", messageHandler);
		vscode.postMessage({ type: "ready" });

		return () => {
			window.removeEventListener("message", messageHandler);
		};
	}, []);

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
				<div style={{ fontWeight: "bold", marginBottom: "8px" }}>JSON Parse Error</div>
				<div style={{ fontSize: "12px", color: "#6b7280" }}>{parseError}</div>
			</div>
		);
	}

	if (diagnostics.length > 0) {
		return (
			<div style={{ width: "100%", height: "100vh" }}>
				<CanvasErrorScreen diagnostics={diagnostics} />
			</div>
		);
	}

	if (canvasDoc) {
		return (
			<div style={{ width: "100%", height: "100vh" }}>
				<Canvas canvasDoc={canvasDoc} onCommit={handleCommit} />
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

const container = document.getElementById("root");
if (container) {
	const root = createRoot(container);
	root.render(<App />);
}
