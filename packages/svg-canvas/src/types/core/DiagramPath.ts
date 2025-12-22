/**
 * Path to a diagram in the tree structure.
 * Example: [0, 2, 1] means items[0].items[2].items[1]
 */
export type DiagramPath = number[];

/**
 * Index mapping diagram IDs to their paths in the tree.
 */
export type DiagramPathIndex = Map<string, DiagramPath>;
