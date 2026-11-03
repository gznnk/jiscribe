// Text measurement is offered rather than assumed: measuring with nobody having
// offered throws (@jiscribe/canvas-sdk/doc). The label hung below the box is
// sized from its own text, so a test has to offer something to measure with;
// with no browser canvas here, the 0.6em estimate is offered.

import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/canvas-sdk/doc";

offerTextMeasurement(createEstimateTextMeasurement());
