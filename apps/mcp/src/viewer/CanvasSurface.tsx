import { Canvas, lightCanvasTheme } from "@jiscribe/canvas";
import type {
	CanvasConfig,
	CanvasDoc,
	CanvasHandle,
	OpenReferencePayload,
	ToolbarEntry,
} from "@jiscribe/canvas";
import { standardToolbarLayout } from "@jiscribe/standard-shapes";
import { useEffect, useRef } from "react";

import { plugins } from "./canvasPlugins";

// A module-scope constant, so that Canvas is not rebuilt on every re-render
const initialConfig: CanvasConfig = { plugins };

// The annotation / flowchart / container / general / icon categories and the
// markdown preset are not in core's default layout (the plugins supply them). Use
// the arrangement the shape set proposes
const toolbarLayout: ToolbarEntry[] = standardToolbarLayout;

export type CanvasSurfaceProps = {
	/** The doc to draw. Every replacement redraws it */
	doc: CanvasDoc;
	/** Called when a person commits an edit. Not called mid-drag */
	onCommit: (committedDoc: CanvasDoc) => void;
	/** A request to open an object's meta.reference. Resolving it is the host's job */
	onOpenReference: (payload: OpenReferencePayload) => void;
	/**
	 * Hands the parent the Canvas handle that capture, camera, selection and
	 * measurement need. It is valid only while mounted, and is released with null on
	 * unmount (so that an AI reaching in while there is no canvas can be told "there
	 * is no screen")
	 */
	onRegisterCanvas: (handle: CanvasHandle | null) => void;
};

/**
 * A surface that does nothing but draw one canvas filling its parent.
 *
 * It holds no file reading or writing (the doc comes down over the WebSocket, and
 * App does the saving).
 */
export function CanvasSurface({
	doc,
	onCommit,
	onOpenReference,
	onRegisterCanvas,
}: CanvasSurfaceProps) {
	const canvasRef = useRef<CanvasHandle>(null);

	useEffect(() => {
		onRegisterCanvas(canvasRef.current);
		return () => {
			onRegisterCanvas(null);
		};
	}, [onRegisterCanvas]);

	return (
		<div className="viewer-canvas-host">
			<Canvas
				ref={canvasRef}
				doc={doc}
				onCommit={onCommit}
				onOpenReference={onOpenReference}
				theme={lightCanvasTheme}
				initialConfig={initialConfig}
				toolbar={{ layout: toolbarLayout }}
			/>
		</div>
	);
}
