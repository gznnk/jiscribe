import { afterEach, beforeEach } from "vitest";

import type { TextMeasurement } from "../../TextMeasurement";
import { createEstimateTextMeasurement } from "../../TextMeasurement";
import {
	offerTextMeasurement,
	resetTextMeasurementForTests,
} from "../../textMeasurementSlot";

/**
 * Measures under `measurement` for the enclosing `describe`, and under the
 * estimate the package's vitest setup offers again afterwards. The slot seals on
 * the first measurement, so a swap means emptying it — an offer alone cannot
 * change an answer a test has already taken.
 *
 * @param measurement - The implementation to measure under; its `source` is compared against nothing here, the slot being empty at the point it is offered
 */
export const measureUnder = (measurement: TextMeasurement): void => {
	beforeEach(() => {
		resetTextMeasurementForTests();
		offerTextMeasurement(measurement);
	});
	afterEach(() => {
		resetTextMeasurementForTests();
		offerTextMeasurement(createEstimateTextMeasurement());
	});
};
