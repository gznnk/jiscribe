import { isSameCoordinate } from "../../shared/coordinate";

/** How many times the solver may split a block before it settles for what it has. */
const MAX_SOLVER_SPLITS = 200;

/** A Lagrange multiplier below this is negative enough to split its block. */
const SPLIT_MULTIPLIER = -1e-7;

/** One position for solveSeparation to find, in px along a single axis. */
export type SeparationVariable = {
	/**
	 * Where it would stand in px; the solver keeps the sum of squared distances from
	 * these least.
	 */
	desired: number;
	/**
	 * Held at `desired`, `low` and `high` then ignored; see solveSeparation for when it
	 * gives way.
	 */
	isFixed: boolean;
	/** The least px it may stand at; -Infinity for none. */
	low: number;
	/** The greatest px it may stand at; Infinity for none. */
	high: number;
};

/** `right` stands at least `gap` px past `left`. */
export type SeparationConstraint = {
	/** The index into the variables of the one on the low side. */
	left: number;
	/** The index into the variables of the one on the high side. */
	right: number;
	/**
	 * In px; 0 lets the two coincide, and a negative one lets `right` stand that far
	 * below `left`.
	 */
	gap: number;
};

type SolverVariable = {
	desired: number;
	isFixed: boolean;
	/** Where it stands from its block's position. */
	offset: number;
	block: SolverBlock;
	ins: SolverConstraint[];
	outs: SolverConstraint[];
};

type SolverConstraint = {
	left: SolverVariable;
	right: SolverVariable;
	gap: number;
	/** Held tight inside a block: one edge of the block's spanning tree. */
	isActive: boolean;
	multiplier: number;
};

/** Variables that move together, each at its offset from the block's position. */
type SolverBlock = {
	variables: SolverVariable[];
	freeCount: number;
	/** The sum of each free variable's desired position less its offset. */
	desiredSum: number;
	/** A fixed variable in the block, which pins it. */
	fixed: SolverVariable | undefined;
};

const blockPosition = (block: SolverBlock): number =>
	block.fixed === undefined
		? block.desiredSum / block.freeCount
		: block.fixed.desired - block.fixed.offset;

const positionOf = (variable: SolverVariable): number =>
	blockPosition(variable.block) + variable.offset;

const slackOf = (constraint: SolverConstraint): number =>
	positionOf(constraint.right) - positionOf(constraint.left) - constraint.gap;

const createBlock = (): SolverBlock => ({
	variables: [],
	freeCount: 0,
	desiredSum: 0,
	fixed: undefined,
});

const addToBlock = (block: SolverBlock, variable: SolverVariable): void => {
	variable.block = block;
	block.variables.push(variable);
	if (variable.isFixed) {
		block.fixed ??= variable;
	} else {
		block.freeCount += 1;
		block.desiredSum += variable.desired - variable.offset;
	}
};

/** Move every variable of `from` into `into` along `constraint`, which turns active. */
const mergeBlocks = (
	into: SolverBlock,
	from: SolverBlock,
	constraint: SolverConstraint,
	shift: number,
): void => {
	constraint.isActive = true;
	for (const variable of from.variables) {
		variable.offset += shift;
		addToBlock(into, variable);
	}
};

/**
 * Merge the block with the block on the far end of its most violated constraint, on
 * the left side or the right, until none is violated.
 */
const mergeAcross = (start: SolverBlock, isLeftward: boolean): void => {
	let block = start;
	for (;;) {
		let worst: SolverConstraint | undefined;
		let worstSlack = 0;
		for (const variable of block.variables) {
			for (const constraint of isLeftward ? variable.ins : variable.outs) {
				const other = isLeftward ? constraint.left : constraint.right;
				if (other.block === block) {
					continue;
				}
				const slack = slackOf(constraint);
				if (slack < worstSlack && !isSameCoordinate(slack, 0)) {
					worst = constraint;
					worstSlack = slack;
				}
			}
		}
		if (worst === undefined) {
			return;
		}
		const leftBlock = worst.left.block;
		const rightBlock = worst.right.block;
		// What puts the right block's variables in the left block's terms.
		const shift = worst.left.offset + worst.gap - worst.right.offset;
		if (leftBlock.variables.length >= rightBlock.variables.length) {
			mergeBlocks(leftBlock, rightBlock, worst, shift);
			block = leftBlock;
		} else {
			mergeBlocks(rightBlock, leftBlock, worst, -shift);
			block = rightBlock;
		}
	}
};

/**
 * Set the multiplier of every active constraint in the subtree reached from
 * `variable` (not back through `parent`), as libvpsc's compute_dfdv.
 *
 * @returns The subtree's derivative, NaN when it holds a fixed variable, which can
 *   take any force, so the constraint leading to it never splits
 */
const calcDerivative = (
	variable: SolverVariable,
	parent: SolverVariable | undefined,
): number => {
	let derivative = variable.isFixed
		? NaN
		: 2 * (positionOf(variable) - variable.desired);
	for (const constraint of variable.outs) {
		if (constraint.isActive && constraint.right !== parent) {
			const below = calcDerivative(constraint.right, variable);
			constraint.multiplier = Number.isNaN(below) ? Infinity : below;
			derivative += below;
		}
	}
	for (const constraint of variable.ins) {
		if (constraint.isActive && constraint.left !== parent) {
			const below = calcDerivative(constraint.left, variable);
			constraint.multiplier = Number.isNaN(below) ? Infinity : -below;
			derivative += below;
		}
	}
	return derivative;
};

const populateBlock = (
	block: SolverBlock,
	variable: SolverVariable,
	parent: SolverVariable | undefined,
): void => {
	addToBlock(block, variable);
	for (const constraint of variable.ins) {
		if (constraint.isActive && constraint.left !== parent) {
			populateBlock(block, constraint.left, variable);
		}
	}
	for (const constraint of variable.outs) {
		if (constraint.isActive && constraint.right !== parent) {
			populateBlock(block, constraint.right, variable);
		}
	}
};

/**
 * The positions nearest the desired ones in the least squares that keep every
 * constraint and bound, as VPSC (Dwyer, Marriott & Stuckey 2006) finds them: blocks
 * merged along violated constraints in the variables' order, then split where a
 * constraint holds two parts together that would rather part, at most
 * MAX_SOLVER_SPLITS times. Fixed variables pin their blocks; bounds are constraints
 * against fixed variables. A block that comes to hold two fixed variables keeps one
 * where it is and carries the other along, so a bound or a fixed position can give
 * way even where everything could hold, the constraints still holding. Where the
 * constraints cannot all hold, any constraint, bound or fixed position may be left
 * broken. Either way the caller checks.
 *
 * @param variables - In an order that puts every constraint's left before its right
 * @returns The position in px of each variable, in the order of `variables`
 */
export const solveSeparation = (
	variables: readonly SeparationVariable[],
	constraints: readonly SeparationConstraint[],
): number[] => {
	const createVariable = (
		desired: number,
		isFixed: boolean,
	): SolverVariable => {
		const block = createBlock();
		const variable: SolverVariable = {
			desired,
			isFixed,
			offset: 0,
			block,
			ins: [],
			outs: [],
		};
		addToBlock(block, variable);
		return variable;
	};
	const constrain = (
		left: SolverVariable,
		right: SolverVariable,
		gap: number,
	): void => {
		const constraint: SolverConstraint = {
			left,
			right,
			gap,
			isActive: false,
			multiplier: 0,
		};
		left.outs.push(constraint);
		right.ins.push(constraint);
	};
	const solverVariables = variables.map(({ desired, isFixed }) =>
		createVariable(desired, isFixed),
	);
	const lowBounds: SolverVariable[] = [];
	const highBounds: SolverVariable[] = [];
	variables.forEach(({ isFixed, low, high }, index) => {
		if (isFixed) {
			return;
		}
		if (Number.isFinite(low)) {
			const bound = createVariable(low, true);
			lowBounds.push(bound);
			constrain(bound, solverVariables[index], 0);
		}
		if (Number.isFinite(high)) {
			const bound = createVariable(high, true);
			highBounds.push(bound);
			constrain(solverVariables[index], bound, 0);
		}
	});
	for (const { left, right, gap } of constraints) {
		constrain(solverVariables[left], solverVariables[right], gap);
	}
	const everyVariable = [...lowBounds, ...solverVariables, ...highBounds];
	for (const variable of everyVariable) {
		mergeAcross(variable.block, true);
	}
	for (let split = 0; split < MAX_SOLVER_SPLITS; split += 1) {
		let splitAt: SolverConstraint | undefined;
		const blocks = new Set(everyVariable.map(({ block }) => block));
		for (const block of blocks) {
			calcDerivative(block.fixed ?? block.variables[0], undefined);
			for (const variable of block.variables) {
				for (const constraint of variable.outs) {
					if (
						constraint.isActive &&
						constraint.multiplier < SPLIT_MULTIPLIER &&
						(splitAt === undefined ||
							constraint.multiplier < splitAt.multiplier)
					) {
						splitAt = constraint;
					}
				}
			}
			if (splitAt !== undefined) {
				break;
			}
		}
		if (splitAt === undefined) {
			break;
		}
		splitAt.isActive = false;
		populateBlock(createBlock(), splitAt.left, undefined);
		populateBlock(createBlock(), splitAt.right, undefined);
		mergeAcross(splitAt.left.block, true);
		mergeAcross(splitAt.right.block, false);
	}
	return solverVariables.map(positionOf);
};
