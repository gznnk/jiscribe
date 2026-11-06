import { createFrameObject } from "@jiscribe/canvas/unstable";
import type { TextEditable } from "@jiscribe/canvas/unstable";
import type { TextSlot } from "@jiscribe/doc";

import {
	calcIconSetArtPlacement,
	readIconSetViewBoxSize,
} from "./calcIconSetArtPlacement";
import { IconSetArt } from "./IconSetArt";
import {
	IconSetArtGroup,
	IconSetHitArea,
	IconSetPlaceholderRect,
} from "./IconSetStyled";
import { readIconSetArt } from "./readIconSetArt";
import type { IconSetCatalog } from "../../schema/iconSet/createIconSetCatalog";
import type {
	IconSetCatalogEntry,
	IconSetDrawing,
} from "../../schema/iconSet/IconSetTypes";
import { BelowLabelHitArea } from "../BelowLabelHitArea";

/** The state createFrameObject draws from, read off its own signature. */
type FrameObjectDrawState = Parameters<
	Parameters<typeof createFrameObject>[0]
>[0];

/** What an icon-set shape's state has to carry: a frame, its label and the icon's name. */
export type IconSetObjectState = FrameObjectDrawState & {
	/** The shape's text slots; the body slot is the label hung below the box. */
	text?: Record<string, TextSlot>;
	/** The icon to draw, in any spelling the catalog resolves. */
	icon?: string;
};

/** What {@link createIconSetObject} takes. */
export type IconSetObjectParams = {
	/** Drawn when the state carries no `icon`; a canonical name the drawings hold. */
	defaultIcon: string;
	/** The set's name lookup (createIconSetCatalog). */
	catalog: IconSetCatalog<IconSetCatalogEntry>;
	/** Canonical name to drawing: the generated drawing module. */
	drawings: Readonly<Record<string, IconSetDrawing>>;
};

/**
 * Builds the component of a shape drawing one icon of a set: the asset's
 * viewBox scaled uniformly onto the box's shorter side and centred, over a
 * transparent hit area filling the box, with a hit area of its own for the
 * caption hung below (a `features.text: "label"` type's, BelowLabelHitArea).
 *
 * Two cases draw a dashed frame instead of the icon: a name that resolves to
 * nothing (the parser rejects those, so only a state assembled in memory gets
 * there), and a name the catalog holds but the drawings do not — the stand-in
 * a set shows once its drawings are no longer shipped, which keeps every
 * existing document openable.
 *
 * @param params - the set's lookup and drawings, and the icon an omitted `icon` draws
 * @returns the component an ObjectTypeDefinition takes, as createFrameObject builds it
 */
export const createIconSetObject = <TState extends IconSetObjectState>({
	defaultIcon,
	catalog,
	drawings,
}: IconSetObjectParams): React.FC<TState & TextEditable> =>
	createFrameObject<TState>((state, shape) => {
		const art = readIconSetArt(catalog, drawings, state.icon ?? defaultIcon);
		const viewBox =
			art === null ? null : readIconSetViewBoxSize(art.entry.viewBox);
		const { scale, offsetX, offsetY } = calcIconSetArtPlacement(
			state.width,
			state.height,
			viewBox?.width ?? 0,
			viewBox?.height ?? 0,
		);

		return (
			<g
				data-kind={shape["data-kind"]}
				data-id={shape["data-id"]}
				transform={shape.transform}
			>
				<IconSetHitArea
					x={-state.width / 2}
					y={-state.height / 2}
					width={state.width}
					height={state.height}
				/>
				{/* The label sits outside the box, past the reach of the area above. */}
				<BelowLabelHitArea state={state} />
				{art !== null && scale > 0 && (
					<IconSetArtGroup
						transform={`translate(${offsetX} ${offsetY}) scale(${scale})`}
					>
						<IconSetArt drawing={art.drawing} />
					</IconSetArtGroup>
				)}
				{art === null && (
					<IconSetPlaceholderRect
						x={-state.width / 2}
						y={-state.height / 2}
						width={state.width}
						height={state.height}
					/>
				)}
			</g>
		);
	});
