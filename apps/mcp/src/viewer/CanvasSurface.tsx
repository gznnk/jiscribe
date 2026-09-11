import { Canvas, lightCanvasTheme } from "@jiscribe/canvas";
import type {
	CanvasConfig,
	CanvasDoc,
	CanvasHandle,
	OpenReferencePayload,
	StencilCategory,
	ToolbarSection,
} from "@jiscribe/canvas";
import {
	standardStencilLibrarySections,
	standardToolbarSections,
} from "@jiscribe/standard-shapes";
import { useEffect, useMemo, useRef } from "react";

import { plugins } from "./canvasPlugins";
import { FileLabel } from "./FileLabel";

// A module-scope constant, so that Canvas is not rebuilt on every re-render
const initialConfig: CanvasConfig = { plugins };

// The shape set owns how its stencils are arranged, over the bar and the sidebar
// both; core's default bar knows none of them, so the host passes both halves.
const stencilLibrarySections: StencilCategory[] =
	standardStencilLibrarySections;

export type CanvasSurfaceProps = {
	/** The doc to draw. Every replacement redraws it */
	doc: CanvasDoc;
	/** Workspace-relative path of the open file, shown in the toolbar */
	relPath: string | null;
	/**
	 * Identifies which file the doc was read from, so that opening another one
	 * drops the previous file's undo history instead of leaving it reachable on the
	 * new canvas. Undefined while no file is open
	 */
	docLoadId: string | undefined;
	/** Whether the socket to the host is up (drawn beside the file name) */
	isConnected: boolean;
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
 * A surface that draws one canvas filling its parent, with the open file's name in
 * the toolbar's host slot (the viewer has no chrome of its own around the canvas).
 *
 * It holds no file reading or writing (the doc comes down over the WebSocket, and
 * App does the saving).
 */
export function CanvasSurface({
	doc,
	relPath,
	docLoadId,
	isConnected,
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

	// The file name rides in a section of its own, ahead of the shape set's bar; the
	// divider closing it separates the name from the tools. Memoized so the toolbar keeps
	// its memo: `node` is a fresh element on every render.
	const toolbarSections = useMemo<ToolbarSection[]>(
		() => [
			{
				id: "file",
				items: [
					{
						type: "slot",
						id: "file-label",
						node: (
							<FileLabel
								relPath={relPath}
								isConnected={isConnected}
								tokens={lightCanvasTheme.tokens}
							/>
						),
					},
					{ type: "divider" },
				],
			},
			...standardToolbarSections,
		],
		[relPath, isConnected],
	);

	return (
		<div className="viewer-canvas-host">
			<Canvas
				ref={canvasRef}
				doc={doc}
				docLoadId={docLoadId}
				onCommit={onCommit}
				onOpenReference={onOpenReference}
				theme={lightCanvasTheme}
				initialConfig={initialConfig}
				stencilLibrary={{ sections: stencilLibrarySections }}
				toolbar={{ sections: toolbarSections }}
			/>
		</div>
	);
}
