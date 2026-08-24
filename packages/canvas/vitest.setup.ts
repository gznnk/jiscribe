// Text measurement is offered, never inferred, and measuring with nothing offered
// throws (@jiscribe/doc's textMeasurementSlot). The unit suite runs without a
// browser — the node environment has no `document`, and the jsdom one has no 2d
// context — so the renderer measurement this package offers on import abstains,
// and what these tests assert line breaking against is the estimate. Stated here
// rather than left to a fallback.

import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/doc/unstable";

offerTextMeasurement(createEstimateTextMeasurement());
