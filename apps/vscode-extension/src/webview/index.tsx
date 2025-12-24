import {
	SvgCanvas,
	useSvgCanvas,
	type SvgCanvasRef,
	type SvgCanvasData,
} from "@workspace/svg-canvas";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

// VSCode API type
declare const acquireVsCodeApi: () => {
	postMessage(message: unknown): void;
	getState(): unknown;
	setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();

function App() {
	const [canvasData, setCanvasData] = useState<SvgCanvasData | null>(null);
	const [error, setError] = useState<string>("");
	const canvasRef = useRef<SvgCanvasRef | null>(null);

	// Handle data changes from canvas
	const handleDataChange = (data: SvgCanvasData) => {
		console.log("Canvas data changed, sending to extension");
		vscode.postMessage({
			type: "update",
			data: JSON.stringify(data, null, 2),
		});
	};

	// Initialize canvas with useSvgCanvas hook
	const { canvasProps, loadCanvasData } = useSvgCanvas({
		id: "vscode-canvas",
		minX: 0,
		minY: 0,
		zoom: 1,
		items: canvasData?.items || [],
		canvasRef,
		onDataChange: handleDataChange,
	});

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
					console.log("Update message received, data length:", message.data?.length);
					try {
						const parsed = JSON.parse(message.data);
						console.log("Parsed data:", parsed);
						setCanvasData(parsed);
						loadCanvasData({
							id: "vscode-canvas",
							minX: parsed.minX || 0,
							minY: parsed.minY || 0,
							zoom: parsed.zoom || 1,
							items: parsed.items || parsed.diagrams || [],
						});
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
	}, [loadCanvasData]);

	console.log("Render state:", { canvasData, error });

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
			) : canvasData ? (
				<SvgCanvas {...canvasProps} ref={canvasRef} />
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
