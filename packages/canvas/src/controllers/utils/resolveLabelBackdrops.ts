import type { ConnectorLabel } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
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
	calcBoundingBoxIntersection,
	calcInverseAffineTransformedPoint,
	convertRectToBoundingBox,
	degreesToRadians,
	isPointInBoundingBox,
	isTransformedFrame,
} from "@jiscribe/geometry";
import type { BoundingBox, Point, TransformedFrame } from "@jiscribe/geometry";

import type { ConnectorRouteRegistries } from "./VisualExtentRegistries";
import { isTransparentColor } from "../../foundation/color/isTransparentColor";
import {
	listConnectorPathPoints,
	resolveConnectorPointsCached,
	resolveEndpointOwner,
} from "../../rendering/objects/connector/geometry/endpoints";
import { calcConnectorLabelAnchor } from "../../rendering/objects/connector/geometry/label/calcConnectorLabelAnchor";
import {
	placeConnectorLabelBox,
	resolveConnectorLabelBox,
} from "../../rendering/objects/connector/geometry/label/connectorLabelLayout";
import type { ConnectorLabelBox } from "../../rendering/objects/connector/geometry/label/connectorLabelLayout";
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
import { isConnectorState } from "../../states/objects/connector/ConnectorState";
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

/** One painted backdrop region met so far on the walk, in the form a label box is tested against. */
type PaintedRegion = {
	fill: string;
	fillOpacity: number;
	/** The region in its frame's local coordinates, normalized. */
	localBox: BoundingBox;
	/** The region in world coordinates; null for a frame rotated or flipped, whose region is tested by the label's center alone. */
	worldBox: BoundingBox | null;
	/** The frame the region belongs to, whose transform takes a world point into `localBox`'s space. */
	frame: TransformedFrame;
};

/** Where a label's box lies, as the walk tests it against the painted regions. */
type LabelBoxPlacement = {
	/** The box in world coordinates; for an owner rotated or flipped, only its center is meaningful. */
	worldBox: BoundingBox;
	/** The box's center in world coordinates. */
	worldCenter: Point;
	/** The box's own size, the extent of a layer covering all of it. */
	width: number;
	height: number;
	/** True when the owner is rotated or flipped, so the box is tested by its center alone. */
	isRotatedOrFlipped: boolean;
};

const isRotatedOrFlipped = (frame: TransformedFrame): boolean =>
	frame.rotation !== 0 || frame.scaleX !== 1 || frame.scaleY !== 1;

/**
 * A caption's placement as last worked out for one object state, which never
 * changes: still the answer while the text measurement and the part kind
 * placing the caption are the ones it was worked out under.
 */
type CaptionPlacementEntry = {
	measurementGeneration: number;
	textSlotKind: ObjectPartKindDefinition | undefined;
	/** Null for a caption with no text, which paints no box. */
	placement: LabelBoxPlacement | null;
};

const captionPlacementCache = new WeakMap<ObjectState, CaptionPlacementEntry>();

/**
 * A connector label's measured size as last worked out for one label object:
 * still the answer while the text measurement is the one it was measured under.
 */
type ConnectorLabelSizeEntry = {
	measurementGeneration: number;
	size: ConnectorLabelBox;
};

const connectorLabelSizeCache = new WeakMap<
	ConnectorLabel,
	ConnectorLabelSizeEntry
>();

const shiftBox = (box: BoundingBox, dx: number, dy: number): BoundingBox => ({
	left: box.left + dx,
	top: box.top + dy,
	right: box.right + dx,
	bottom: box.bottom + dy,
});

/** Where a caption lies, from the region its part kind places it in. */
const placeCaption = (
	captioned: ObjectState & TransformedFrame & TextStyleState,
	textSlotKind: ObjectPartKindDefinition | undefined,
): LabelBoxPlacement => {
	const region = calcTextRegion(captioned, BODY_TEXT_SLOT_ID, textSlotKind);
	const localBox = convertRectToBoundingBox(region);
	const localCenter = {
		x: (localBox.left + localBox.right) / 2,
		y: (localBox.top + localBox.bottom) / 2,
	};
	const isTransformed = isRotatedOrFlipped(captioned);
	return {
		worldBox: shiftBox(localBox, captioned.cx, captioned.cy),
		worldCenter: isTransformed
			? calcAffineTransformedPoint(
					localCenter.x,
					localCenter.y,
					captioned.scaleX,
					captioned.scaleY,
					degreesToRadians(captioned.rotation),
					captioned.cx,
					captioned.cy,
				)
			: { x: localCenter.x + captioned.cx, y: localCenter.y + captioned.cy },
		width: localBox.right - localBox.left,
		height: localBox.bottom - localBox.top,
		isRotatedOrFlipped: isTransformed,
	};
};

/**
 * Where the caption of a `features.text: "label"` shape with an `"auto"`
 * background and some text lies, else null. Cached per object state, so an
 * object a pass did not change is not placed again.
 */
const resolveCaptionPlacement = (
	obj: ObjectState,
	registries: LabelBackdropRegistries,
): LabelBoxPlacement | null => {
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
	const cached = captionPlacementCache.get(obj);
	if (
		cached !== undefined &&
		cached.measurementGeneration === measurementGeneration &&
		cached.textSlotKind === textSlotKind
	) {
		return cached.placement;
	}
	const bodySlot = captioned.text?.[BODY_TEXT_SLOT_ID];
	const placement =
		bodySlot === undefined ||
		richTextToPlain(readTextSlotContent(bodySlot.text)) === ""
			? null
			: placeCaption(captioned, textSlotKind);
	captionPlacementCache.set(obj, {
		measurementGeneration,
		textSlotKind,
		placement,
	});
	return placement;
};

/** A connector label's size, measured once per label object and text measurement. */
const measureConnectorLabel = (label: ConnectorLabel): ConnectorLabelBox => {
	const measurementGeneration = readTextMeasurementGeneration();
	const cached = connectorLabelSizeCache.get(label);
	if (
		cached !== undefined &&
		cached.measurementGeneration === measurementGeneration
	) {
		return cached.size;
	}
	const size = resolveConnectorLabelBox(label);
	connectorLabelSizeCache.set(label, { measurementGeneration, size });
	return size;
};

/**
 * Where a connector's label lies, for an `"auto"` label on a resolvable path,
 * else null. An empty label counts only while it is open in the editor
 * (`isLabelEdited`), whose box is drawn at its minimum size as it waits for text.
 */
const resolveConnectorLabelPlacement = (
	obj: ObjectState,
	objects: Record<string, ObjectState>,
	registries: LabelBackdropRegistries,
	isLabelEdited: boolean,
): LabelBoxPlacement | null => {
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
	const resolved = resolveConnectorPointsCached(
		obj,
		resolveEndpointOwner(objects, obj.source),
		resolveEndpointOwner(objects, obj.target),
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
	const rect = placeConnectorLabelBox(anchor, measureConnectorLabel(label));
	return {
		worldBox: convertRectToBoundingBox(rect),
		worldCenter: { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
		width: rect.width,
		height: rect.height,
		isRotatedOrFlipped: false,
	};
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
	const isTransformed = isRotatedOrFlipped(frame);
	const painted: PaintedRegion[] = [];
	for (const region of regions) {
		if (region.fillOpacity <= 0 || isTransparentColor(region.fill)) {
			continue;
		}
		const localBox = convertRectToBoundingBox(region.rect);
		painted.push({
			fill: region.fill,
			fillOpacity: region.fillOpacity,
			localBox,
			worldBox: isTransformed ? null : shiftBox(localBox, frame.cx, frame.cy),
			frame,
		});
	}
	return painted;
};

/** The layers the regions painted so far put under `labelBox`, bottom first. */
const cutLayers = (
	labelBox: LabelBoxPlacement,
	paintedRegions: readonly PaintedRegion[],
): LabelBackdropLayer[] => {
	const layers: LabelBackdropLayer[] = [];
	for (const region of paintedRegions) {
		if (!labelBox.isRotatedOrFlipped && region.worldBox !== null) {
			const overlap = calcBoundingBoxIntersection(
				labelBox.worldBox,
				region.worldBox,
			);
			if (overlap !== null) {
				layers.push({
					rect: {
						x: overlap.left - labelBox.worldBox.left,
						y: overlap.top - labelBox.worldBox.top,
						width: overlap.right - overlap.left,
						height: overlap.bottom - overlap.top,
					},
					fill: region.fill,
					fillOpacity: region.fillOpacity,
				});
			}
			continue;
		}
		// Either side rotated or flipped: the label's center decides, and the
		// region then covers the whole box.
		const { frame } = region;
		const centerInFrame = calcInverseAffineTransformedPoint(
			labelBox.worldCenter.x,
			labelBox.worldCenter.y,
			frame.scaleX,
			frame.scaleY,
			degreesToRadians(frame.rotation),
			frame.cx,
			frame.cy,
		);
		if (isPointInBoundingBox(centerInFrame, region.localBox)) {
			layers.push({
				rect: { x: 0, y: 0, width: labelBox.width, height: labelBox.height },
				fill: region.fill,
				fillOpacity: region.fillOpacity,
			});
		}
	}
	return layers;
};

/**
 * Works out, for every `"auto"` label of the document, the backdrop frames'
 * fills lying under its box, so the label is painted on them rather than on
 * the page's color alone (LabelBackdropLayers).
 *
 * Walks the objects in drawing order, keeping the regions the frames met so
 * far paint (ObjectLabelBackdropRegistry): a label is cut against those only,
 * so a frame drawn over a label, and the label's own owner, never count.
 * Only a frame declaring `labelBackdrop` counts; other filled shapes do not.
 * Where neither the frame nor the label's owner is rotated or flipped, the
 * region's overlap with the box is what is painted; otherwise the box's center
 * decides, and a region holding it covers the whole box.
 *
 * A caption's placement is kept per object state, and a connector label's size
 * per label object, each for as long as the text measurement stands
 * (readTextMeasurementGeneration): a pass re-measures only what changed.
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
 *   its draft already in `objects` (graftConnectorLabelDraft): its label is
 *   taken even while empty, the editor drawing a box for it all the same.
 *   Omitted = an empty label is taken for no connector
 * @returns The layers by the id of the object owning the label, bottom first,
 *   each with the label box's top-left corner as its origin; a label on no
 *   backdrop has no entry
 */
export const resolveLabelBackdrops = (
	objects: Record<string, ObjectState>,
	rootIds: readonly string[],
	registries: LabelBackdropRegistries,
	renderScope?: ReadonlySet<string>,
	labelEditOwnerId?: string,
): ReadonlyMap<string, readonly LabelBackdropLayer[]> => {
	const layersByOwnerId = new Map<string, readonly LabelBackdropLayer[]>();
	const paintedRegions: PaintedRegion[] = [];

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
		const labelBox = isConnectorState(obj)
			? resolveConnectorLabelPlacement(
					obj,
					objects,
					registries,
					id === labelEditOwnerId,
				)
			: resolveCaptionPlacement(obj, registries);
		if (labelBox !== null && paintedRegions.length > 0) {
			const layers = cutLayers(labelBox, paintedRegions);
			if (layers.length > 0) {
				layersByOwnerId.set(id, layers);
			}
		}
		// After its own label, so a frame never paints under itself.
		paintedRegions.push(...collectPaintedRegions(obj, registries));
	};

	rootIds.forEach(visit);
	return layersByOwnerId;
};
