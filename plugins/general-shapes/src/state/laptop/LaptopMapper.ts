import { createFrameMapper } from "@workspace/canvas-sdk";

import type { LaptopState } from "./LaptopState";
import type { LaptopDoc } from "../../schema/laptop/LaptopDoc";
import { LaptopFeatures } from "../../schema/laptop/LaptopDoc";

/** LaptopDoc <-> LaptopState conversion (Frame-family shared logic generated from features). */
export const { toState: laptopToState, toDoc: laptopToDoc } = createFrameMapper<
	LaptopDoc,
	LaptopState
>(LaptopFeatures);
