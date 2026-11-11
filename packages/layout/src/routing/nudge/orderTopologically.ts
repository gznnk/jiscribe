/**
 * The nodes 0 to `count` - 1 in an order keeping every edge's from before its to,
 * ties broken by the nodes' own order, and a cycle by taking its earliest node first.
 */
export const orderTopologically = (
	count: number,
	edges: readonly (readonly [number, number])[],
): number[] => {
	const successors: number[][] = Array.from({ length: count }, () => []);
	const inDegrees = new Array<number>(count).fill(0);
	for (const [from, to] of edges) {
		successors[from].push(to);
		inDegrees[to] += 1;
	}
	// Kept descending, so the earliest ready node is popped from the end.
	const ready: number[] = [];
	const makeReady = (index: number): void => {
		let low = 0;
		let high = ready.length;
		while (low < high) {
			const middle = (low + high) >> 1;
			if (ready[middle] > index) {
				low = middle + 1;
			} else {
				high = middle;
			}
		}
		ready.splice(low, 0, index);
	};
	inDegrees.forEach((inDegree, index) => {
		if (inDegree === 0) {
			makeReady(index);
		}
	});
	const isPlaced = new Array<boolean>(count).fill(false);
	const sequence: number[] = [];
	let earliestUnplaced = 0;
	while (sequence.length < count) {
		if (ready.length === 0) {
			while (isPlaced[earliestUnplaced]) {
				earliestUnplaced += 1;
			}
			makeReady(earliestUnplaced);
		}
		const index = ready.pop() as number;
		if (isPlaced[index]) {
			continue;
		}
		isPlaced[index] = true;
		sequence.push(index);
		for (const successor of successors[index]) {
			inDegrees[successor] -= 1;
			if (inDegrees[successor] === 0 && !isPlaced[successor]) {
				makeReady(successor);
			}
		}
	}
	return sequence;
};
