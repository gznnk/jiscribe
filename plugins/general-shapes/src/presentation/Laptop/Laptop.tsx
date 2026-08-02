import { createFrameObject } from "@workspace/canvas/unstable";

import { buildLaptopFigure } from "./buildLaptopFigure";
import type { LaptopState } from "../../state/laptop/LaptopState";
import { Pictogram } from "../shared/Pictogram";

/** Laptop presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const Laptop = createFrameObject<LaptopState>((state, shape) => (
	<Pictogram
		figure={buildLaptopFigure(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
		shape={shape}
	/>
));
