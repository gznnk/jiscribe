import { createFrameObject } from "@workspace/canvas/unstable";

import { buildSmartphoneFigure } from "./buildSmartphoneFigure";
import type { SmartphoneState } from "../../state/smartphone/SmartphoneState";
import { Pictogram } from "../shared/Pictogram";

/** Smartphone presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const Smartphone = createFrameObject<SmartphoneState>((state, shape) => (
	<Pictogram
		figure={buildSmartphoneFigure(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
		shape={shape}
	/>
));
