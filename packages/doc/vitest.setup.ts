// Text measurement is offered, never inferred, and measuring with nothing offered
// throws (src/text/measure/textMeasurementSlot.ts). This package's tests have no
// drawing engine and no font files, so what they assert line breaking against is
// the estimate — stated here once rather than left to a fallback. A suite
// measuring under something else resets the slot and offers its own.

import { createEstimateTextMeasurement } from "./src/text/measure/TextMeasurement";
import { offerTextMeasurement } from "./src/text/measure/textMeasurementSlot";

offerTextMeasurement(createEstimateTextMeasurement());
