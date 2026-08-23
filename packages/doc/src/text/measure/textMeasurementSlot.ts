import type { TextMeasurement, TextMeasurementSource } from "./TextMeasurement";

/**
 * The ordering {@link TextMeasurementSource} names, as numbers to compare. Higher
 * wins an offer; equal means two implementations of the same standing, which is
 * a configuration mistake rather than a choice to make.
 */
const RANK_BY_SOURCE: Readonly<Record<TextMeasurementSource, number>> = {
	renderer: 3,
	"font-metrics": 2,
	estimate: 1,
};

/** The implementation offers have settled on, or null while none has been made. */
let adoptedMeasurement: TextMeasurement | null = null;

/**
 * Whether anything has measured yet. From the first measurement on the adopted
 * implementation is the answer for the rest of the process, so that everything
 * measured under it — line breaks, box sizes, the heights cached against them —
 * stays comparable.
 */
let sealed = false;

const NOTHING_OFFERED_MESSAGE =
	"No text measurement has been offered. A browser host gets one by importing " +
	"@jiscribe/canvas; a Node host offers nodeTextMeasurement() from " +
	"@jiscribe/doc-tools, or createEstimateTextMeasurement() where a proportional " +
	"answer will do. Offer it before anything measures.";

/**
 * Puts an implementation forward as the process's text measurement. The
 * strongest offer wins ({@link TextMeasurementSource}), which is what lets a Node
 * tool offer its font-metrics measurement unconditionally and still stand aside
 * in a process where the canvas is drawing.
 *
 * Offering the same instance again does nothing, so an entry point may offer on
 * every call. Offering a *different* implementation of the standing already
 * adopted throws, as does anything that would change the answer after something
 * has measured — the point being that a mis-ordered offer is loud rather than
 * quietly authoritative.
 *
 * @param measurement - The implementation and the source it names itself; held by identity, so build it once (a module constant) rather than per call
 * @throws When two different implementations of the same source are offered, or when a stronger one arrives after the first measurement
 */
export const offerTextMeasurement = (measurement: TextMeasurement): void => {
	if (adoptedMeasurement === measurement) {
		return;
	}
	if (adoptedMeasurement === null) {
		adoptedMeasurement = measurement;
		return;
	}
	const offeredRank = RANK_BY_SOURCE[measurement.source];
	const adoptedRank = RANK_BY_SOURCE[adoptedMeasurement.source];
	if (offeredRank < adoptedRank || (sealed && offeredRank === adoptedRank)) {
		return;
	}
	if (sealed) {
		throw new Error(
			`A "${measurement.source}" text measurement was offered after ` +
				`"${adoptedMeasurement.source}" had already measured, which would leave ` +
				"two answers in one process. Offer it before anything measures.",
		);
	}
	if (offeredRank === adoptedRank) {
		throw new Error(
			`Two different "${measurement.source}" text measurements were offered. ` +
				"There is one per process, so one of them is not this host's.",
		);
	}
	adoptedMeasurement = measurement;
};

/**
 * The adopted implementation, sealing it in passing: this is the call that
 * settles the answer, so every measurement in the document layer goes through it
 * rather than holding on to what it returns across passes.
 *
 * Internal to this package — a host reaches the slot through
 * {@link offerTextMeasurement} alone.
 *
 * @returns The implementation the offers settled on; the same instance on every call afterwards, which is what a cache of measured results can key on
 * @throws When nothing has been offered, naming the implementations a host can offer
 */
export const adoptTextMeasurement = (): TextMeasurement => {
	if (adoptedMeasurement === null) {
		throw new Error(NOTHING_OFFERED_MESSAGE);
	}
	sealed = true;
	return adoptedMeasurement;
};

/**
 * Empties the slot and lifts the seal, for a test that measures under an
 * implementation of its own. Nothing else may call it: the whole point of the
 * seal is that a running process cannot do this.
 *
 * Caches keyed on the adopted instance need no notice of it — whatever is
 * adopted next is a different instance, so their entries miss.
 */
export const resetTextMeasurementForTests = (): void => {
	adoptedMeasurement = null;
	sealed = false;
};
