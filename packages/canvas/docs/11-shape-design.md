> 🌐 日本語版: [11-shape-design.ja.md](./11-shape-design.ja.md)

# Shape Design Decisions

The criteria for adding or extending a shape (object). Where
[Design Philosophy](./01-design-philosophy.md) covers the principles for how to
write code, this document covers the design decisions made before writing code:
what goes into the doc schema and what is left to the engine.

## Split geometry into "user-specified" and "engine-derived" by role

When adding a geometry parameter to a shape (such as a compartment height), decide
whether to expose it as a doc field or derive it in the engine based on the
**role** of the region.

- **The outer bounds (bbox) belong to the user.** Content that does not fit never
  resizes the bounds; overflow and clipping are accepted (inconsistencies are
  surfaced as diagnostics for the AI / user to fix — the engine does not auto-correct)
- **Internal compartments that exist only to hold text** (e.g., the record's name
  band) are **derived**. What the user wants is not "a specific height" but
  "a readable title," and deriving from the font size satisfies that
- **Regions that double as interaction surfaces or visual design elements**
  (e.g., the container's header: the grab handle standing in for the pass-through
  body, and a visual accent with its own color) are **manually adjustable via a
  doc field**. Their proportion to the whole shape and their grabbability are
  legitimate targets of adjustment, independent of whether the content fits

The litmus test is "is the user satisfied once the content fits?" If yes, derive.
If "I want to tune the proportion / ergonomics against the whole shape" is a
legitimate ask, make it manual. Even then, the default when unspecified can be
derived (derived default + manual override).

### Why

Every doc field added brings along a value the AI must keep consistent when
generating, a diagnostic to detect contradictions, and an editing gesture with its
tests. Granting freedom for a want that derivation already satisfies leaves only
that cost. Conversely, fixing a legitimate design want behind derivation cannot
track the range of shape sizes (from a small frame to a screen-covering zone).

Concrete examples:

- The record's name band: no doc field, derived (`calcRecordSlotRegions`)
- The container's header: the `headerHeight` doc field plus divider dragging
  (`handleContainerHeaderHeight`); rendered with a default value when unspecified
