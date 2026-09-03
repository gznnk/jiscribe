// Text measurement is offered, never inferred, and measuring with nothing offered
// throws (@jiscribe/doc's textMeasurementSlot). These tests size labels without a
// browser to measure in, so they run on the estimate — stated here rather than
// left to a fallback.

import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/doc/unstable";

offerTextMeasurement(createEstimateTextMeasurement());
