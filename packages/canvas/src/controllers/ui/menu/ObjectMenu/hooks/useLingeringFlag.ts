import { useEffect, useState } from "react";

/**
 * `active`, held on for `lingerMs` after it goes false.
 *
 * Bridges the gaps between two conditions that should read as one continuous
 * state. Raising is immediate; only the fall is delayed, and a new rise inside
 * the linger window cancels it, so the result never blinks.
 *
 * @param active - The condition to follow; rising is passed through at once.
 * @param lingerMs - How long the result stays true after `active` goes false.
 *   Measured from that moment, restarted by every subsequent fall.
 * @returns Whether `active` is true or was true within the last `lingerMs`.
 */
export const useLingeringFlag = (
	active: boolean,
	lingerMs: number,
): boolean => {
	const [isLingering, setIsLingering] = useState(false);

	useEffect(() => {
		if (active) {
			setIsLingering(true);
			return;
		}
		if (!isLingering) {
			return;
		}
		const timer = setTimeout(() => setIsLingering(false), lingerMs);
		return () => clearTimeout(timer);
	}, [active, isLingering, lingerMs]);

	return active || isLingering;
};
