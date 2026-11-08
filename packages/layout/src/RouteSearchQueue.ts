const INITIAL_CAPACITY = 1024;

/**
 * The route search's open list: a binary min-heap kept in typed arrays that grow by
 * doubling, so a push allocates nothing most of the time. An entry is taken first for
 * the smaller `f` (cost so far plus the estimate of what is left), then the larger `g`
 * (cost so far: the one further along), then the smaller tie key (the caller orders it
 * by x, y and direction), then the smaller state, so a tie never depends on the order
 * the entries were pushed in.
 */
export class RouteSearchQueue {
	private fs = new Float64Array(INITIAL_CAPACITY);
	private gs = new Float64Array(INITIAL_CAPACITY);
	private tieKeys = new Float64Array(INITIAL_CAPACITY);
	private states = new Int32Array(INITIAL_CAPACITY);
	private count = 0;

	/** The state of the entry the last pop removed. */
	poppedState = 0;
	/** Its cost so far. */
	poppedG = 0;

	clear(): void {
		this.count = 0;
	}

	private grow(): void {
		const capacity = this.states.length * 2;
		const grown = <T extends Float64Array | Int32Array>(
			values: T,
			created: T,
		): T => {
			created.set(values);
			return created;
		};
		this.fs = grown(this.fs, new Float64Array(capacity));
		this.gs = grown(this.gs, new Float64Array(capacity));
		this.tieKeys = grown(this.tieKeys, new Float64Array(capacity));
		this.states = grown(this.states, new Int32Array(capacity));
	}

	/** Whether an entry with these keys is taken before the one held at `index`. */
	private isBefore(
		f: number,
		g: number,
		tieKey: number,
		state: number,
		index: number,
	): boolean {
		if (f !== this.fs[index]) {
			return f < this.fs[index];
		}
		if (g !== this.gs[index]) {
			return g > this.gs[index];
		}
		if (tieKey !== this.tieKeys[index]) {
			return tieKey < this.tieKeys[index];
		}
		return state < this.states[index];
	}

	private put(
		index: number,
		f: number,
		g: number,
		tieKey: number,
		state: number,
	): void {
		this.fs[index] = f;
		this.gs[index] = g;
		this.tieKeys[index] = tieKey;
		this.states[index] = state;
	}

	private move(from: number, to: number): void {
		this.fs[to] = this.fs[from];
		this.gs[to] = this.gs[from];
		this.tieKeys[to] = this.tieKeys[from];
		this.states[to] = this.states[from];
	}

	push(f: number, g: number, tieKey: number, state: number): void {
		if (this.count === this.states.length) {
			this.grow();
		}
		let index = this.count;
		this.count += 1;
		while (index > 0) {
			const parentIndex = (index - 1) >> 1;
			if (!this.isBefore(f, g, tieKey, state, parentIndex)) {
				break;
			}
			this.move(parentIndex, index);
			index = parentIndex;
		}
		this.put(index, f, g, tieKey, state);
	}

	/**
	 * Remove the first entry, which `poppedState` and `poppedG` then hold.
	 *
	 * @returns False when the queue was empty
	 */
	pop(): boolean {
		if (this.count === 0) {
			return false;
		}
		this.poppedState = this.states[0];
		this.poppedG = this.gs[0];
		this.count -= 1;
		const size = this.count;
		if (size === 0) {
			return true;
		}
		const f = this.fs[size];
		const g = this.gs[size];
		const tieKey = this.tieKeys[size];
		const state = this.states[size];
		let index = 0;
		for (;;) {
			const leftIndex = index * 2 + 1;
			if (leftIndex >= size) {
				break;
			}
			const rightIndex = leftIndex + 1;
			const childIndex =
				rightIndex < size &&
				this.isBefore(
					this.fs[rightIndex],
					this.gs[rightIndex],
					this.tieKeys[rightIndex],
					this.states[rightIndex],
					leftIndex,
				)
					? rightIndex
					: leftIndex;
			if (this.isBefore(f, g, tieKey, state, childIndex)) {
				break;
			}
			this.move(childIndex, index);
			index = childIndex;
		}
		this.put(index, f, g, tieKey, state);
		return true;
	}
}
