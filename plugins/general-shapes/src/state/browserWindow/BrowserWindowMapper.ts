import { createFrameMapper } from "@workspace/canvas/unstable";

import type { BrowserWindowState } from "./BrowserWindowState";
import type { BrowserWindowDoc } from "../../schema/browserWindow/BrowserWindowDoc";
import { BrowserWindowFeatures } from "../../schema/browserWindow/BrowserWindowDoc";

/** BrowserWindowDoc <-> BrowserWindowState conversion (Frame-family shared logic generated from features). */
export const { toState: browserWindowToState, toDoc: browserWindowToDoc } =
	createFrameMapper<BrowserWindowDoc, BrowserWindowState>(
		BrowserWindowFeatures,
	);
