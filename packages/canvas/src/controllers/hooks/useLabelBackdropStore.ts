import { useLayoutEffect, useMemo, useRef } from "react";

import type { WritableLabelBackdropStore } from "./utils/createLabelBackdropStore";
import { createLabelBackdropStore } from "./utils/createLabelBackdropStore";
import { useConstant } from "../../foundation/hooks/useConstant";
import type { MovePreview } from "../../rendering/layers/content/MovePreview";
import type { LabelBackdropStore } from "../../rendering/objects/LabelBackdropStoreContext";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { CanvasControllerState, CanvasDragDetail } from "../CanvasTypes";
import { graftConnectorLabelDraft } from "../utils/graftConnectorLabelDraft";
import { readLabelBackdropDrag } from "../utils/readLabelBackdropDrag";
import { resolveLabelBackdropPass } from "../utils/resolveLabelBackdrops";
import type { LabelBackdropRegistries } from "../utils/resolveLabelBackdrops";
import type { SnapshotRenderScope } from "../utils/SnapshotRenderScope";

type UseLabelBackdropStoreParams = {
	/**
	 * The objects as drawn, the text editor's draft included
	 * (useTextEditSession). A connector label open in the editor is placed where
	 * its editor sits, for the backdrops alone (graftConnectorLabelDraft).
	 */
	objects: Record<string, ObjectState>;
	/** Read with `mode` to find the connector label open in the editor (readOpenTextEdit). */
	selection: CanvasControllerState["selection"];
	/**
	 * Read only for whether a connector label's editor is open and its pending
	 * placement: a keystroke in it works nothing out, the backdrop following
	 * the editor's own box rather than the draft text.
	 */
	mode: CanvasControllerState["mode"];
	rootIds: readonly string[];
	/** The counter from `useDocFonts`: a face landing re-sizes the labels, and so their backdrops. */
	fontsNonce: number;
	/** What a running export draws, or null while none runs (useSnapshotRenderScope). */
	snapshotRenderScope: SnapshotRenderScope | null;
	/**
	 * The drag under way, of which only the kind is read; null while none is.
	 * An inert one (an Escaped marquee's) counts as none. Read, not compared: a
	 * drag starting, a frame whose objects stand and a drag ending work nothing
	 * out, unless the last pass took a center from the drag (a connector shifted
	 * with the move, an off-screen one's kept), which the first render without
	 * one works out exactly.
	 */
	drag: Pick<CanvasDragDetail, "kind"> | null;
	/** What a move drag translated this frame (`CanvasDragDetail`'s `movePreview`); undefined for any other drag. */
	movePreview: MovePreview | undefined;
	/** The ids drawn in the viewport (useVisibleObjectIds): a connector off it keeps its last center while a drag runs. */
	visibleIds: ReadonlySet<string>;
	registries: LabelBackdropRegistries;
};

/** What the layers were last worked out from, compared by reference. */
type BackdropInputs = {
	objects: Record<string, ObjectState>;
	rootIds: readonly string[];
	fontsNonce: number;
	labelEditOwnerId: string | null;
	/** The export's set, or null for the whole tree (no export, or one drawing `"all"`). */
	renderScope: ReadonlySet<string> | null;
};

const isSameInputs = (
	inputs: BackdropInputs,
	otherInputs: BackdropInputs,
): boolean =>
	inputs.objects === otherInputs.objects &&
	inputs.rootIds === otherInputs.rootIds &&
	inputs.fontsNonce === otherInputs.fontsNonce &&
	inputs.labelEditOwnerId === otherInputs.labelEditOwnerId &&
	inputs.renderScope === otherInputs.renderScope;

/**
 * Owns the backdrop store the labels read through `LabelBackdropStoreContext`
 * (resolveLabelBackdrops): one instance for the canvas's lifetime.
 *
 * The layers are worked out again during render, whenever an input differs
 * from the last time they were (not from the previous render), so whatever
 * changed the document — an edit, undo, a paste, an external sync, a typed
 * character, every frame of a drag that moves or reshapes something — is picked
 * up without naming it. A drag that changes no object (a pan, a marquee) leaves
 * the inputs as they were, and works nothing out at its start, on its frames or
 * at its end. A pass that took a center from the drag is the one exception: the
 * first render with no drag works the layers out again, exact, whatever its
 * inputs. A running export's scope is an input too, so it is worked out for
 * what it draws and the whole document again once it ends.
 *
 * The new layers are written without notifying, so the labels rendered after
 * this in the same pass read them. Labels a memo skips are notified in a
 * layout effect, before the paint; nothing is notified during render.
 *
 * @returns The store, its identity fixed
 */
export const useLabelBackdropStore = ({
	objects: drawnObjects,
	selection,
	mode,
	rootIds,
	fontsNonce,
	snapshotRenderScope,
	drag: dragInProgress,
	movePreview,
	visibleIds,
	registries,
}: UseLabelBackdropStoreParams): LabelBackdropStore => {
	const store = useConstant<WritableLabelBackdropStore>(
		createLabelBackdropStore,
	);
	const lastInputsRef = useRef<BackdropInputs | null>(null);
	// Whether the last pass took a center from the drag, to be settled once it is over.
	const wasApproximateRef = useRef(false);
	const hasPendingNotifyRef = useRef(false);

	const labelEditDraft =
		mode.kind === "textEdit" && mode.draft.kind === "connectorLabel"
			? mode.draft
			: null;
	const isLabelEditOpen = labelEditDraft !== null;
	const labelEditPlacement = labelEditDraft?.placement;
	const { objects, labelEditOwnerId } = useMemo(
		() => graftConnectorLabelDraft({ objects: drawnObjects, selection, mode }),
		// `mode` changes on every keystroke, so only what the graft reads of it
		// is listed: whether a label edit is open, and its placement.
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[drawnObjects, selection, isLabelEditOpen, labelEditPlacement],
	);
	const drag = readLabelBackdropDrag(dragInProgress, movePreview, visibleIds);

	const renderScope =
		snapshotRenderScope === null || snapshotRenderScope === "all"
			? null
			: snapshotRenderScope;
	const inputs: BackdropInputs = {
		objects,
		rootIds,
		fontsNonce,
		labelEditOwnerId,
		renderScope,
	};
	if (
		lastInputsRef.current === null ||
		!isSameInputs(lastInputsRef.current, inputs) ||
		(drag === null && wasApproximateRef.current)
	) {
		lastInputsRef.current = inputs;
		const pass = resolveLabelBackdropPass(
			objects,
			rootIds,
			registries,
			renderScope ?? undefined,
			labelEditOwnerId ?? undefined,
			drag ?? undefined,
		);
		wasApproximateRef.current = pass.isApproximate;
		const hasChanged = store.replaceLayers(pass.layersByOwnerId);
		if (hasChanged) {
			hasPendingNotifyRef.current = true;
		}
	}

	useLayoutEffect(() => {
		if (hasPendingNotifyRef.current) {
			hasPendingNotifyRef.current = false;
			store.notify();
		}
	});

	return store;
};
