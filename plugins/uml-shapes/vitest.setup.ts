// Text measurement is offered, never inferred, and measuring with nothing offered
// throws (see @jiscribe/canvas-sdk/doc). A record's bands are sized from their own
// text, so these tests measure; without a browser they run on the estimate,
// stated here rather than left to a fallback.

import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/canvas-sdk/doc";

offerTextMeasurement(createEstimateTextMeasurement());
