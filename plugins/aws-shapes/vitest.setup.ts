// Text measurement is offered rather than assumed: measuring with nobody having
// offered throws (@jiscribe/canvas-sdk/doc). The frame's label band is sized
// from the label's own text, so measuring it is unavoidable. A test has no
// browser canvas to measure against, so the 0.6em estimate is offered here.

import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/canvas-sdk/doc";

offerTextMeasurement(createEstimateTextMeasurement());
