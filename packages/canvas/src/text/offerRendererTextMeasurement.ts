// Offers the browser's own measurement to the document layer, as a side effect of
// this module being evaluated. Both entry points import it first, so in any host
// that statically imports @jiscribe/canvas the offer lands before a line of the
// host's code runs — which is what a document opened and measured before the
// Canvas is ever mounted depends on.

import { offerTextMeasurement } from "@jiscribe/doc/text/measure/textMeasurementSlot";

import { createRendererTextMeasurement } from "./rendererTextMeasurement";

const rendererMeasurement = createRendererTextMeasurement();
if (rendererMeasurement) {
	offerTextMeasurement(rendererMeasurement);
}
