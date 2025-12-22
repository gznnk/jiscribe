type ArrowDirection = { x: number; y: number };

const ARROW_TO_VECTOR: Record<string, ArrowDirection> = {
	ArrowUp: { x: 0, y: -1 },
	ArrowDown: { x: 0, y: 1 },
	ArrowLeft: { x: -1, y: 0 },
	ArrowRight: { x: 1, y: 0 },
};

export const getArrowDirection = (keys: Set<string>): ArrowDirection => {
	let x = 0;
	let y = 0;

	for (const key of keys) {
		const vec = ARROW_TO_VECTOR[key];
		if (vec) {
			x += vec.x;
			y += vec.y;
		}
	}

	return { x: Math.sign(x), y: Math.sign(y) };
};
