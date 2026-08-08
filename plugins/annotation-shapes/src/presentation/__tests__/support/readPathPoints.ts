/** Every coordinate pair in a path built from only M / L / Q commands. */
export const readPathPoints = (d: string): { x: number; y: number }[] => {
	const numbers = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
	return Array.from({ length: numbers.length / 2 }, (_, i) => ({
		x: numbers[i * 2],
		y: numbers[i * 2 + 1],
	}));
};
