import { createFrameMapper } from "@workspace/canvas-sdk";

import type { SmartphoneState } from "./SmartphoneState";
import type { SmartphoneDoc } from "../../schema/smartphone/SmartphoneDoc";
import { SmartphoneFeatures } from "../../schema/smartphone/SmartphoneDoc";

/** SmartphoneDoc <-> SmartphoneState conversion (Frame-family shared logic generated from features). */
export const { toState: smartphoneToState, toDoc: smartphoneToDoc } =
	createFrameMapper<SmartphoneDoc, SmartphoneState>(SmartphoneFeatures);
