import { BoundaryIcon } from "./BoundaryIcon";
import { FrameIcon } from "./FrameIcon";
import { ZoneIcon } from "./ZoneIcon";
import type { ShapePreset } from "../ShapePreset";

/** Faint neutral tint for the Zone body — subtle enough to never hide contents at any z-order. */
const ZONE_FILL = "rgba(100, 116, 139, 0.12)";

export const ContainerShapePresets: ShapePreset[] = [
	{
		id: "frame",
		objectType: "container",
		label: "Frame",
		categories: { container: 10 },
		icon: FrameIcon,
	},
	{
		// Dashed border — for a boundary / bounded context / "external" region.
		// Differs only as a palette preset (dashed default), not a distinct type.
		id: "boundary",
		objectType: "container",
		label: "Boundary",
		categories: { container: 20 },
		defaultOverrides: { strokeDashType: "dashed" },
		icon: BoundaryIcon,
	},
	{
		// Tinted body — a colored zone objects are dropped onto.
		id: "zone",
		objectType: "container",
		label: "Zone",
		categories: { container: 30 },
		defaultOverrides: { fill: ZONE_FILL },
		icon: ZoneIcon,
	},
];
