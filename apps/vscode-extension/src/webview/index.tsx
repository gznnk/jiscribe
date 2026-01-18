import { Canvas, type CanvasDoc } from "@workspace/svg-canvas-2";
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
	const [error, setError] = useState<string>("");

	// Handle commits from canvas - receive doc
	const handleCommit = useCallback((doc: CanvasDoc) => {
		console.log("Canvas committed, sending to extension");
		vscode.postMessage({
			type: "update",
			data: JSON.stringify(doc, null, 2),
		});
	}, []);

	useEffect(() => {
		console.log("Setting up message listener");

		// Listen for messages from the extension
		const messageHandler = (event: MessageEvent) => {
			const message = event.data;
			console.log("Raw message received:", event);
			console.log("Message type:", message?.type);
			console.log("Message data:", message?.data);

			switch (message.type) {
				case "update":
					console.log(
						"Update message received, data length:",
						message.data?.length,
					);
					try {
						const parsed = JSON.parse(message.data) as CanvasDoc;
						console.log("Parsed data:", parsed);

						setCanvasDoc(parsed);
						setError("");
					} catch (err) {
						console.error("Failed to parse canvas data:", err);
						const errorMessage =
							err instanceof Error ? err.message : "Unknown parsing error";
						setError(errorMessage);
					}
					break;
				default:
					console.log("Unknown message type:", message.type);
			}
		};

		window.addEventListener("message", messageHandler);
		console.log("Message listener attached");

		// Request initial data
		console.log("Sending ready message to extension");
		vscode.postMessage({ type: "ready" });

		return () => {
			console.log("Cleaning up message listener");
			window.removeEventListener("message", messageHandler);
		};
	}, []);

	console.log("Render state:", { canvasDoc, error });

	return (
		<div style={{ width: "100%", height: "100vh" }}>
			{error ? (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						height: "100%",
						color: "red",
					}}
				>
					<div>Error: {error}</div>
					<div style={{ marginTop: "10px", fontSize: "12px" }}>
						Failed to parse canvas data
					</div>
				</div>
			) : canvasDoc ? (
				<Canvas canvasDoc={canvasDoc} onCommit={handleCommit} />
			) : (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						height: "100%",
					}}
				>
					<div>Loading canvas...</div>
					<div style={{ marginTop: "10px", fontSize: "12px" }}>
						Waiting for data from extension
					</div>
				</div>
			)}
		</div>
	);
}

const container = document.getElementById("root");
if (container) {
	const root = createRoot(container);
	root.render(<App />);
}
