import { Canvas, parseCanvasText } from "@jiscribe/canvas";
import type { Camera, CanvasDoc, CanvasHandle } from "@jiscribe/canvas";
import { useRef, useState } from "react";

// A doc with landmark shapes scattered around (run through parseCanvasText, as the Canvas contract requires)
const buildLandmarkDoc = (): CanvasDoc => {
	const result = parseCanvasText(
		JSON.stringify({
			version: 1,
			root: [
				{
					id: "origin",
					type: "rect",
					x: 100,
					y: 100,
					width: 160,
					height: 90,
					text: "origin",
				},
				{
					id: "far",
					type: "ellipse",
					cx: 1580,
					cy: 945,
					rx: 80,
					ry: 45,
					text: "far",
				},
			],
		}),
	);
	if (result.kind !== "ok") {
		throw new Error(`invalid landmark doc: ${result.kind}`);
	}
	return result.doc;
};

const landmarkDoc = buildLandmarkDoc();

const initialCamera: Camera = { minX: 0, minY: 0, zoom: 1 };

/**
 * Example of the imperative viewport (pan/zoom) API:
 * - initialConfig.viewport ... the initial camera, applied exactly once on mount
 * - onViewportChange ... read-only notification of camera changes (for persisting or
 *   mirroring; it never feeds a value back)
 * - ref.current.viewport.setViewport ... the only way to drive the camera from code
 */
export function ViewportExample() {
	const canvasRef = useRef<CanvasHandle>(null);
	const [camera, setCamera] = useState<Camera>(initialCamera);

	const panelButton = (label: string, targetCamera: Camera) => (
		<button
			type="button"
			onClick={() => canvasRef.current?.viewport.setViewport(targetCamera)}
			style={{ padding: "4px 10px", cursor: "pointer" }}
		>
			{label}
		</button>
	);

	return (
		<div style={{ position: "relative", width: "100%", height: "100%" }}>
			<Canvas
				doc={landmarkDoc}
				initialConfig={{ viewport: initialCamera }}
				onViewportChange={setCamera}
				ref={canvasRef}
			/>
			<div
				style={{
					position: "absolute",
					right: 12,
					bottom: 12,
					zIndex: 1000,
					display: "flex",
					flexDirection: "column",
					gap: 6,
					padding: 10,
					borderRadius: 6,
					background: "rgba(30, 30, 34, 0.9)",
					color: "#d4d4d8",
					fontSize: "0.75rem",
				}}
			>
				<span style={{ fontFamily: "ui-monospace, monospace" }}>
					minX: {Math.round(camera.minX)} / minY: {Math.round(camera.minY)} /
					zoom: {camera.zoom.toFixed(2)}
				</span>
				{panelButton("To the origin (zoom 1)", { minX: 0, minY: 0, zoom: 1 })}
				{panelButton("Jump to far", { minX: 1200, minY: 700, zoom: 1 })}
				{panelButton("The origin at 2x", { minX: 0, minY: 0, zoom: 2 })}
			</div>
		</div>
	);
}
