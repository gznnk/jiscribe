import { Canvas } from "@jiscribe/canvas";
import type {
	CanvasConfig,
	CanvasDoc,
	CanvasHandle,
	OpenReferencePayload,
	ResolveImage,
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
import { HostMenu } from "./HostMenu";
import { viewerTheme } from "./viewerTheme";
import type {
	HostActionName,
	SessionApiResponse,
} from "../shared/hostActionsRoute";

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
	/**
	 * The session the host announced, null until it has: the actions its owner
	 * offers, drawn as a menu ahead of the file name, and the token asking for
	 * one has to carry. A browser viewer's host offers none, and then no menu is
	 * put up at all
	 */
	hostSession: SessionApiResponse | null;
	/**
	 * Called with the action a person chose from that menu, and the token of the
	 * session the menu was drawn from, which is what the request has to carry
	 */
	onHostAction: (action: HostActionName, sessionToken: string) => void;
	/** Called when a person commits an edit. Not called mid-drag */
	onCommit: (committedDoc: CanvasDoc) => void;
	/** A request to open an object's meta.reference. Resolving it is the host's job */
	onOpenReference: (payload: OpenReferencePayload) => void;
	/** Reads the file an image object's `src` names. Undefined while no file is open */
	resolveImage: ResolveImage | undefined;
	/**
	 * Hands the parent the Canvas handle that capture, camera, selection and
	 * measurement need. It is valid only while mounted, and is released with null on
	 * unmount (so that an AI reaching in while there is no canvas can be told "there
	 * is no screen")
	 */
	onRegisterCanvas: (handle: CanvasHandle | null) => void;
};

/**
 * A surface that draws one canvas filling its parent, with the open file's name
 * and, for a host whose owner offers actions, a small host menu in the toolbar's
 * host slots (the viewer has no chrome of its own around the canvas).
 *
 * It holds no file reading or writing (the doc comes down over the WebSocket, and
 * App does the saving), and no host action either (App asks the host).
 */
export function CanvasSurface({
	doc,
	relPath,
	docLoadId,
	isConnected,
	hostSession,
	onHostAction,
	onCommit,
	onOpenReference,
	resolveImage,
	onRegisterCanvas,
}: CanvasSurfaceProps) {
	const canvasRef = useRef<CanvasHandle>(null);

	useEffect(() => {
		onRegisterCanvas(canvasRef.current);
		return () => {
			onRegisterCanvas(null);
		};
	}, [onRegisterCanvas]);

	// The host menu and the file name ride in a section of their own, ahead of the
	// shape set's bar; the divider closing it separates them from the tools. The
	// menu's slot is added only when an action is offered: the toolbar wraps every
	// slot in a flex item with a gap, so an empty one would still push the name
	// over, and a browser viewer's bar is to start at the name. Memoized so the
	// toolbar keeps its memo: `node` is a fresh element on every render.
	const toolbarSections = useMemo<ToolbarSection[]>(
		() => [
			{
				id: "file",
				items: [
					...(hostSession !== null && hostSession.actions.length > 0
						? [
								{
									type: "slot" as const,
									id: "host-menu",
									node: (
										<HostMenu
											actions={hostSession.actions}
											onAction={(action) =>
												onHostAction(action, hostSession.token)
											}
											tokens={viewerTheme.tokens}
										/>
									),
								},
							]
						: []),
					{
						type: "slot",
						id: "file-label",
						node: (
							<FileLabel
								relPath={relPath}
								isConnected={isConnected}
								tokens={viewerTheme.tokens}
							/>
						),
					},
					{ type: "divider" },
				],
			},
			...standardToolbarSections,
		],
		[hostSession, onHostAction, relPath, isConnected],
	);

	return (
		<div className="viewer-canvas-host">
			<Canvas
				ref={canvasRef}
				doc={doc}
				docLoadId={docLoadId}
				onCommit={onCommit}
				onOpenReference={onOpenReference}
				resolveImage={resolveImage}
				theme={viewerTheme}
				initialConfig={initialConfig}
				stencilLibrary={{ sections: stencilLibrarySections }}
				toolbar={{ sections: toolbarSections }}
			/>
		</div>
	);
}
