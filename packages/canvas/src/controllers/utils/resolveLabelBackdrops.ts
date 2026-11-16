import { richTextToPlain } from "@jiscribe/doc/model/objects/types/text/RichText";
import {
	BODY_TEXT_SLOT_ID,
	readTextSlotContent,
} from "@jiscribe/doc/model/objects/types/text/TextSlot";
import { hasLabelFill } from "@jiscribe/doc/model/objects/types/text/TextType";
import type { ObjectShapeStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectShapeStyleDefaultsRegistry";
import { readTextMeasurementGeneration } from "@jiscribe/doc/text/measure/textMeasurementSlot";
import {
	calcAffineTransformedPoint,
	calcInverseAffineTransformedPoint,
	convertRectToBoundingBox,
	degreesToRadians,
	isPointInBoundingBox,
	isTransformedFrame,
} from "@jiscribe/geometry";
import type { BoundingBox, Point, TransformedFrame } from "@jiscribe/geometry";

import { calcTransformedRectBounds } from "./calcTransformedRectBounds";
import type { ConnectorRouteRegistries } from "./VisualExtentRegistries";
import { isTransparentColor } from "../../foundation/color/isTransparentColor";
import { isConnectorShiftedWithOwners } from "../../rendering/layers/content/MovePreview";
import type { MovePreview } from "../../rendering/layers/content/MovePreview";
import {
	listConnectorPathPoints,
	resolveConnectorPointsCached,
	resolveEndpointOwner,
} from "../../rendering/objects/connector/geometry/endpoints";
import { calcConnectorLabelAnchor } from "../../rendering/objects/connector/geometry/label/calcConnectorLabelAnchor";
import type { LabelBackdropLayer } from "../../rendering/objects/LabelBackdropStoreContext";
import type { ObjectLabelBackdropRegistry } from "../../rendering/objects/registry/ObjectLabelBackdropRegistry";
import type {
	ObjectPartKindDefinition,
	ObjectPartKindRegistry,
} from "../../rendering/objects/registry/ObjectPartKindRegistry";
import { TEXT_SLOT_PART_KIND } from "../../rendering/objects/registry/ObjectPartKindRegistry";
import { calcTextRegion } from "../../rendering/objects/utils/calcTextRegion";
import { resolveAutoColor } from "../../rendering/objects/utils/resolveAutoColor";
import { isAutoLabelFill } from "../../rendering/objects/utils/resolveLabelFill";
import type { FillStyleState } from "../../states/objects/base/FillStyleState";
import type { LabelTextStyleState } from "../../states/objects/base/LabelTextStyleState";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../states/objects/base/TextStyleState";
import {
	isConnectorState,
	type ConnectorState,
} from "../../states/objects/connector/ConnectorState";
import { isGroupState } from "../../states/objects/primitives/group/GroupState";

/**
 * The registries the backdrops are worked out through: the canvas bundle
 * (CanvasRegistries) is structurally assignable to it.
 */
export type LabelBackdropRegistries = ConnectorRouteRegistries & {
	/** Which types are backdrops, and what each paints. */
	objectLabelBackdrop: Pick<ObjectLabelBackdropRegistry, "get">;
	/** Resolves a frame's body fill as createFrameObject draws it. */
	objectShapeStyleDefaults: Pick<
		ObjectShapeStyleDefaultsRegistry,
		"resolveShapeStyle"
	>;
	/** Places a caption's box, as createFrameObject hands it to LabelTextFill. */
	objectPartKind: Pick<ObjectPartKindRegistry, "get">;
};

/**
 * The drag under way, which a connector label's center is worked out against
 * without routing what the drawing does not route either.
 */
export type LabelBackdropDrag = {
	/**
	 * The move drag's preview, if the drag is a move: a connector both of whose
	 * owners it translates is drawn from its start route shifted by the delta
	 * (isConnectorShiftedWithOwners), and its center is taken the same way.
	 */
	movePreview: MovePreview | undefined;
	/**
	 * The ids drawn this frame (viewport culling, calcVisibleObjectIds): a
	 * connector outside it keeps the center it last had until the drag ends.
	 */
	visibleIds: ReadonlySet<string>;
};

/**
 * The center a connector's label was last given, per connector state, which a
 * drag leaves as it is: what an off-screen connector answers mid-drag. Keyed on
 * the connector alone, which holds because every pass outside a drag works each
 * center out again and overwrites it, and only an off-screen connector mid-drag
 * reads it.
 */
const connectorCenterCache = new WeakMap<ConnectorState, Point>();

/** One painted backdrop region met so far on the walk, in the form a label's center is tested against. */
type PaintedRegion = {
	fill: string;
	fillOpacity: number;
	/** The region in its frame's local coordinates, normalized. */
	localBox: BoundingBox;
	/** The frame's center x in world coordinates, which `localBox` is centered on. */
	cx: number;
	/** The frame's center y in world coordinates. */
	cy: number;
	/** The frame's horizontal flip (1 or -1), undone before testing against `localBox`. */
	scaleX: number;
	/** The frame's vertical flip (1 or -1). */
	scaleY: number;
	/** The frame's rotation in radians, worked out once per frame rather than per label. */
	angleRad: number;
	/**
	 * The upright box around the region in world coordinates (its rotated
	 * extent when the frame is rotated or flipped), widened by
	 * WORLD_BOX_SLACK: a center outside it is outside the region, so the exact
	 * test is skipped.
	 */
	worldBox: BoundingBox;
};

/**
 * How far a region's upright world box is widened, in world units: more than
 * the rounding its corners pick up through the transform, so a center the
 * exact test would take (one on the region's edge included) is never turned
 * away by the box.
 */
const WORLD_BOX_SLACK = 1e-6;

/**
 * A caption's center as last worked out for one object state, which never
 * changes: still the answer while the text measurement and the part kind
 * placing the caption are the ones it was worked out under.
 */
type CaptionCenterEntry = {
	measurementGeneration: number;
	textSlotKind: ObjectPartKindDefinition | undefined;
	/** In world coordinates; null for a caption with no text, which paints no box. */
	center: Point | null;
};

const captionCenterCache = new WeakMap<ObjectState, CaptionCenterEntry>();

/** The center of a caption's box in world coordinates, from the region its part kind places it in, carried through the owner's transform. */
const calcCaptionCenter = (
	captioned: ObjectState & TransformedFrame & TextStyleState,
	textSlotKind: ObjectPartKindDefinition | undefined,
): Point => {
	const region = calcTextRegion(captioned, BODY_TEXT_SLOT_ID, textSlotKind);
	return calcAffineTransformedPoint(
		region.x + region.width / 2,
		region.y + region.height / 2,
		captioned.scaleX,
		captioned.scaleY,
		degreesToRadians(captioned.rotation),
		captioned.cx,
		captioned.cy,
	);
};

/**
 * Where the box's center of the caption of a `features.text: "label"` shape
 * with an `"auto"` background and some text lies, else null. Cached per object
 * state, so an object a pass did not change is not placed again.
 */
const resolveCaptionCenter = (
	obj: ObjectState,
	registries: LabelBackdropRegistries,
): Point | null => {
	if (!hasLabelFill(obj.features?.text) || !isTransformedFrame(obj)) {
		return null;
	}
	const captioned = obj as ObjectState &
		TransformedFrame &
		Partial<LabelTextStyleState> &
		TextStyleState;
	if (!isAutoLabelFill(captioned.labelFill)) {
		return null;
	}
	const textSlotKind = registries.objectPartKind.get(
		obj.type,
		TEXT_SLOT_PART_KIND,
	);
	const measurementGeneration = readTextMeasurementGeneration();
	const cached = captionCenterCache.get(obj);
	if (
		cached !== undefined &&
		cached.measurementGeneration === measurementGeneration &&
		cached.textSlotKind === textSlotKind
	) {
		return cached.center;
	}
	const bodySlot = captioned.text?.[BODY_TEXT_SLOT_ID];
	const center =
		bodySlot === undefined ||
		richTextToPlain(readTextSlotContent(bodySlot.text)) === ""
			? null
			: calcCaptionCenter(captioned, textSlotKind);
	captionCenterCache.set(obj, { measurementGeneration, textSlotKind, center });
	return center;
};

/**
 * Where the box's center of a connector's label lies — the anchor the box is
 * centered on — for an `"auto"` label on a resolvable path, else null. An empty
 * label counts only while it is open in the editor (`isLabelEdited`), whose box
 * is drawn at its minimum size as it waits for text.
 */
const resolveConnectorLabelCenter = (
	obj: ObjectState,
	objects: Record<string, ObjectState>,
	registries: LabelBackdropRegistries,
	isLabelEdited: boolean,
	drag: LabelBackdropDrag | undefined,
	approximation: { isApproximate: boolean },
): Point | null => {
	if (!isConnectorState(obj)) {
		return null;
	}
	const label = obj.label;
	if (
		label === undefined ||
		(label.text === "" && !isLabelEdited) ||
		!isAutoLabelFill(label.fill)
	) {
		return null;
	}
	if (drag !== undefined && !drag.visibleIds.has(obj.id)) {
		const lastCenter = connectorCenterCache.get(obj);
		if (lastCenter !== undefined) {
			approximation.isApproximate = true;
			return lastCenter;
		}
	}
	// Moved with both its owners: the start route, which the cache already holds
	// for the whole drag, shifted by the delta, as the drawing takes it.
	const movePreview = drag?.movePreview;
	const isShifted =
		movePreview !== undefined &&
		isConnectorShiftedWithOwners(obj, movePreview, objects);
	const ownerObjects = isShifted ? movePreview.startObjects : objects;
	const resolved = resolveConnectorPointsCached(
		obj,
		resolveEndpointOwner(ownerObjects, obj.source),
		resolveEndpointOwner(ownerObjects, obj.target),
		registries.objectOutline,
		registries.objectAnchorRegion,
		registries.objectExtraConnectPoints,
		registries.objectGeometryKey,
	);
	if (!resolved) {
		return null;
	}
	const anchor = calcConnectorLabelAnchor(
		listConnectorPathPoints(resolved),
		label.position,
		label.offset,
	);
	if (anchor === null) {
		return null;
	}
	if (isShifted) {
		approximation.isApproximate = true;
	}
	const center = isShifted
		? { x: anchor.x + movePreview.delta.x, y: anchor.y + movePreview.delta.y }
		: anchor;
	connectorCenterCache.set(obj, center);
	return center;
};

/** The painted regions a backdrop frame adds, the transparent ones dropped. */
const collectPaintedRegions = (
	obj: ObjectState,
	registries: LabelBackdropRegistries,
): PaintedRegion[] => {
	const calculator = registries.objectLabelBackdrop.get(obj.type);
	if (calculator === undefined || !isTransformedFrame(obj)) {
		return [];
	}
	const frame = obj as ObjectState & TransformedFrame & FillStyleState;
	const bodyStyle = registries.objectShapeStyleDefaults.resolveShapeStyle(
		obj.type,
		{ fill: frame.fill, fillOpacity: frame.fillOpacity },
	);
	const regions = calculator(frame, {
		fillColor: resolveAutoColor(bodyStyle.fill, "surface"),
		fillAlpha: bodyStyle.fillOpacity,
	});
	const angleRad = degreesToRadians(frame.rotation);
	const painted: PaintedRegion[] = [];
	for (const region of regions) {
		if (region.fillOpacity <= 0 || isTransparentColor(region.fill)) {
			continue;
		}
		const worldBox = calcTransformedRectBounds(region.rect, frame);
		painted.push({
			fill: region.fill,
			fillOpacity: region.fillOpacity,
			localBox: convertRectToBoundingBox(region.rect),
			cx: frame.cx,
			cy: frame.cy,
			scaleX: frame.scaleX,
			scaleY: frame.scaleY,
			angleRad,
			worldBox: {
				left: worldBox.left - WORLD_BOX_SLACK,
				top: worldBox.top - WORLD_BOX_SLACK,
				right: worldBox.right + WORLD_BOX_SLACK,
				bottom: worldBox.bottom + WORLD_BOX_SLACK,
			},
		});
	}
	return painted;
};

/**
 * The layers of the regions painted so far that hold `center`, bottom first. A
 * point on a region's edge is inside it. The center is taken into each frame's
 * own space, so a rotated or flipped frame answers by the same rule; a region
 * whose upright world box does not hold it is passed over before that.
 *
 * @returns The layers, or null when no region holds the center
 */
const collectLayersAt = (
	center: Point,
	paintedRegions: readonly PaintedRegion[],
): LabelBackdropLayer[] | null => {
	let layers: LabelBackdropLayer[] | null = null;
	for (const region of paintedRegions) {
		const { worldBox } = region;
		if (
			center.x < worldBox.left ||
			center.x > worldBox.right ||
			center.y < worldBox.top ||
			center.y > worldBox.bottom
		) {
			continue;
		}
		const centerInFrame = calcInverseAffineTransformedPoint(
			center.x,
			center.y,
			region.scaleX,
			region.scaleY,
			region.angleRad,
			region.cx,
			region.cy,
		);
		if (isPointInBoundingBox(centerInFrame, region.localBox)) {
			(layers ??= []).push({
				fill: region.fill,
				fillOpacity: region.fillOpacity,
			});
		}
	}
	return layers;
};

/**
 * Works out, for every `"auto"` label of the document, the backdrop frames'
 * fills under the center of its box, so the label is painted on them rather
 * than on the page's color alone (LabelBackdropLayers).
 *
 * Walks the objects in drawing order, keeping the regions the frames met so
 * far paint (ObjectLabelBackdropRegistry): a label is tested against those
 * only, so a frame drawn over a label, and the label's own owner, never count.
 * Only a frame declaring `labelBackdrop` counts; other filled shapes do not.
 * Each region holding the center of the label's box (its edge included) gives
 * one layer covering the whole box, whether or not the box reaches past the
 * region; one not holding it gives none, however much of the box it covers. A
 * rotated or flipped frame or label owner answers by the same rule.
 *
 * A caption's center is kept per object state for as long as the text
 * measurement stands (readTextMeasurementGeneration): a pass re-measures only
 * what changed.
 *
 * Labels taken: a `features.text: "label"` caption with text and an `"auto"`
 * (or omitted) `labelFill`, and a connector label with text (or open in the
 * editor) and an `"auto"` (or omitted) `fill`.
 *
 * @param objects - The flat object map to draw, the text editor's draft
 *   included
 * @param rootIds - Root ids in drawing order; a group's `childIds` are walked
 *   depth first where the group stands
 * @param registries - The canvas's registries; a connector's path comes from
 *   the cache the renderer fills (resolveConnectorPointsCached)
 * @param renderScope - When given, only these ids are drawn (an export's
 *   scope, which holds every group above them; buildIdsWithAncestors): an id
 *   outside it is skipped with its subtree, as ObjectsRenderer skips it, so a
 *   frame not drawn paints under no label. Omitted = the whole tree
 * @param labelEditOwnerId - The connector whose label is open in the editor,
 *   already placed in `objects` where the editor sits
 *   (graftConnectorLabelDraft): its label is taken even while empty, the
 *   editor drawing a box for it all the same.
 *   Omitted = an empty label is taken for no connector
 * @param drag - The drag under way, outside an export's scope; omitted when
 *   none is. A connector moved with both its owners is then judged from its
 *   start route shifted by the move's delta, and one off screen by the center it
 *   last had, so neither is routed per frame; the pass after the drop is exact
 * @returns The layers by the id of the object owning the label, bottom first,
 *   each painted over the label's whole box; a label on no backdrop has no entry
 */
export const resolveLabelBackdrops = (
	objects: Record<string, ObjectState>,
	rootIds: readonly string[],
	registries: LabelBackdropRegistries,
	renderScope?: ReadonlySet<string>,
	labelEditOwnerId?: string,
	drag?: LabelBackdropDrag,
): ReadonlyMap<string, readonly LabelBackdropLayer[]> =>
	resolveLabelBackdropPass(
		objects,
		rootIds,
		registries,
		renderScope,
		labelEditOwnerId,
		drag,
	).layersByOwnerId;

/** What one pass of {@link resolveLabelBackdropPass} answers. */
export type LabelBackdropPass = {
	/** As {@link resolveLabelBackdrops} returns it. */
	layersByOwnerId: ReadonlyMap<string, readonly LabelBackdropLayer[]>;
	/**
	 * True when some center was taken from `drag` rather than worked out
	 * exactly — a connector's shifted with the move, or an off-screen one's kept
	 * — so the pass has to run again once the drag is over.
	 */
	isApproximate: boolean;
};

/**
 * {@link resolveLabelBackdrops}, also saying whether the drag's shortcuts were
 * taken; every parameter as there.
 */
export const resolveLabelBackdropPass = (
	objects: Record<string, ObjectState>,
	rootIds: readonly string[],
	registries: LabelBackdropRegistries,
	renderScope?: ReadonlySet<string>,
	labelEditOwnerId?: string,
	drag?: LabelBackdropDrag,
): LabelBackdropPass => {
	const layersByOwnerId = new Map<string, readonly LabelBackdropLayer[]>();
	const paintedRegions: PaintedRegion[] = [];
	const approximation = { isApproximate: false };

	const visit = (id: string): void => {
		if (renderScope !== undefined && !renderScope.has(id)) {
			return;
		}
		const obj = objects[id];
		if (!obj) {
			return;
		}
		if (isGroupState(obj)) {
			obj.childIds.forEach(visit);
			return;
		}
		const center = isConnectorState(obj)
			? resolveConnectorLabelCenter(
					obj,
					objects,
					registries,
					id === labelEditOwnerId,
					// An export draws what is off screen, so it judges everything exactly.
					renderScope === undefined ? drag : undefined,
					approximation,
				)
			: resolveCaptionCenter(obj, registries);
		if (center !== null && paintedRegions.length > 0) {
			const layers = collectLayersAt(center, paintedRegions);
			if (layers !== null) {
				layersByOwnerId.set(id, layers);
			}
		}
		// After its own label, so a frame never paints under itself.
		paintedRegions.push(...collectPaintedRegions(obj, registries));
	};

	rootIds.forEach(visit);
	return { layersByOwnerId, isApproximate: approximation.isApproximate };
};
