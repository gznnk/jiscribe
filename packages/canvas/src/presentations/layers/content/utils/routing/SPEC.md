# Orthogonal Connector Routing — Specification

The authoritative definition of what a "correct" orthogonal connector route is, and how it is
verified. Agreed on 2026-07-08 after a series of drag-behaviour regressions that could not be pinned
down by snapshot fixes; the root problem was that the spec (the _priority order_ between competing
properties) had never been made explicit. This document is that spec.

Implementation: `routeOrthogonalConnector.ts` (orchestration), `stub.ts` / `elbowCandidates.ts` /
`routeCost.ts` (stages). Verification: `routingHarness.ts` + `__tests__/routingInvariants.test.ts`.

## Scope

- Two endpoints. Each is a **connect point** on a box face (edge centre) with an outward exit
  direction, or a free point. The route is made of horizontal/vertical segments only.
- **Rotated** shapes are supported. The connect point is on the rotated outline; the exit direction
  is the snapped centre→point vector; the shape is avoided via its **AABB**. The stub clamp measures
  from the AABB edge (not the connect point) so a rotated stub does not overshoot (see the note under
  `clampStubMargin`). One residual limitation remains (see Limitations: tilted-face stub clip).
- Box-size-dependent tuning and avoiding third shapes in between are out of scope.
- Guarantees below hold for **clearly separated** boxes (a gap larger than the margin on their
  nearest axis). Overlapping / edge-adjacent boxes are near-degenerate (an exit face can point
  straight into an abutting shape) and are best-effort only.

## Hard constraints (inviolable)

- **H1** — The path connects the two endpoints, every segment is orthogonal, and each end leaves its
  face outward by a **stub** before bending.
- **H2** — No segment passes through the interior of either endpoint's box.

## Cost priority (total order)

Routes are compared by this lexicographic tuple; each key strictly dominates the ones after it. This
ordering _is_ the spec — every past conflict was a disagreement about it.

1. **crossings** (H2) — number of box interiors the elbow passes through. Minimised (want 0).
2. **reversals** (S1) — number of backtrack spikes (the path goes out then immediately back along the
   same axis). A spike is never acceptable: the router always prefers wrapping around (more turns)
   over a spike. When no spike-free route exists, all candidates tie here and it falls through.
3. **intrusions** (S2) — number of segments grazing within a shape's margin band (see definition
   below). Ranked above the aesthetic so the route keeps full clearance from shapes it passes
   _whenever a clearance route exists_, even at the cost of a couple of turns — so clearance never
   dips inside the margin and pops back out as a shape is dragged.
4. **aesthetic** (S3 + S4) — `turns × weight + length`. Fewer corners first, then shorter.
5. **symmetric** (S5) — tie-break preferring the crossover centred between the two shapes (so an S/Z
   jogs at the midline, not against one shape's margin). Applied only among cost-equal candidates, so
   it never turns a cheaper route (e.g. a clean L) into an S.
6. **signature → path** (S6) — deterministic, geometry-intrinsic tie-break for stability, so the
   topology does not flip-flop while a shape is dragged except at genuine cost crossings.

## Key definitions

- **margin** — the clearance a route keeps from a shape (`DEFAULT_CONNECTOR_MARGIN`, 30px). Also the
  stub push-out length.
- **stub** — the point each endpoint is pushed out to along its exit direction before the elbow. For
  close endpoints it is clamped to half the forward distance so facing stubs meet at the midpoint
  instead of overshooting (`clampStubMargin`).
- **exit corridor** — the strip directly in front of an endpoint's exit face. The wire _must_ pass
  through its own exit corridor, so grazing there is the natural exit, **not** an intrusion.
- **intrusion** — a segment passing within the margin of a box on a side **other than that box's own
  exit face**. Implemented by expanding each box by the margin on every side except its exit face
  (`expandBoxExceptExit`) and counting crossings of the expanded box. When the two shapes are closer
  than `2 × margin` on an axis their margin bands overlap, so _every_ candidate intrudes and the
  intrusion tier cancels out — the route is then free to squeeze straight through (a facing pair
  correctly meets nearer than the margin; it does not detour).

## Anti-patterns (must not occur for clearly separated boxes)

These are the concrete, machine-checkable failures the harness guards against:

- **(a) reversal** — the line goes out and immediately backtracks.
- **(b) clearance dip-and-restore** — while a shape is dragged, a pass-by segment's clearance drops
  below the margin and then recovers, instead of staying ≥ margin monotonically.
- **(c) wiggle / staircase** — more turns than a wrap-around needs (> 4 interior corners).
- **(d) exit-then-backtrack jog** — a clean route exists but the line jogs against its own exit face.
- **(e) topology thrash** — the route topology flips at points other than genuine cost crossings.

## Verification

The recurring regressions were about behaviour over the **continuous configuration space** (a shape
being dragged), which hand-picked snapshots miss. Verification is therefore a **config-space sweep**:

- `routingHarness.ts` enumerates every source-face × target-face pair (16) over a grid of relative
  box positions and measures each route (crossings, reversals, turns, pass-by clearance, signature).
- `routingInvariants.test.ts` asserts, for **clearly separated** boxes (gap > margin):
  - **reversals = 0**, **crossings = 0**, **turns ≤ 4**;
  - **pass-by clearance ≥ margin** when clearance is achievable (both axes separated by > 2×margin).
- A separate sweep rotates the source box (15–75°) and asserts **no backtrack spikes** (`backtracks`
  catches the offset spikes a rotated shape produces that the strict reversal check misses). Crossings
  are measured against the true rotated polygon there, and are **not** asserted 0 (see Limitations).
- Adjacent / touching / overlapping configs are surveyed but not held to the strict bar.

Any new degradation report should be reproduced as a point (or a swept axis) in this space and, once
fixed, left as a permanent assertion — not patched as a one-off snapshot.

## Limitations / out of scope (2026-07-09)

- **Tilted-face stub clip (rotation):** exiting a rotated face along a _snapped_ orthogonal direction
  can clip a corner of the shape on the exit leg (~1% of rotated configs, worst near 45°). The elbow
  still avoids the AABB; only the short exit leg is affected. Removing it needs a shape-aware
  (non-AABB) stub or a non-orthogonal exit, deferred.
- **Box-size-dependent** behaviour; **third-shape** obstacle avoidance.
- **Overlapping / edge-adjacent** boxes: routes are produced but not guaranteed free of the
  anti-patterns (the input is geometrically ambiguous).
- The sweep is **grid-sampled** (step 20px), and rotates only the source; not exhaustively continuous.
