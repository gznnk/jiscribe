## Layout

These are guidelines for readability, not part of the spec. Overlapping itself is
allowed (see "The canvas"); what these avoid is the overlap nobody meant.

- Standard node: `width: 160`, `height: 80`.
- Spacing between nodes: horizontal **80–120px**, vertical **60–100px**. Lay the shapes out on a grid with gaps that generous so connectors stay readable.
- Keep a single flow direction (left→right or top→bottom).
- Choose connect points to match the connection direction (for left→right, source = `rightCenter`, target = `leftCenter`).
- Do not overlap objects that are already there.

## Choosing what to draw with

- Prefer flowchart types (`diamond` for decisions, `stadium` for start/end, `rect` for steps) when the user asks for a flowchart. The same goes for the other families: pick the type whose meaning is already the thing you are drawing (see "Object quick reference").
- For directed flows set `endArrow` to `FilledTriangle`.
- When shapes form one cluster (a subsystem, a lane, a legend), group them as you build rather than afterwards, and put later additions into the same group.
- Color as you go, by giving `fill` / `stroke` / `fontColor` when you add a shape, rather than adding everything first and restyling afterwards.
- Do not reach for `svg` for ordinary boxes, nodes and arrows — use the built-in shapes and keep `svg` for visuals they cannot express (see "`svg` — the escape hatch for complex visuals").

## Know what is already there

Read the canvas before you edit it, and again after several edits to confirm the
result. On a drawing you did not build yourself, read what is already there
before you place anything: a shape you failed to account for is the usual cause
of an overlap nobody meant.

Add the nodes first, then draw the connectors between them.

## Fix your own work instead of working around it

Everything you draw stays editable:

- **Wrong shape, wrong label, wrong color**: delete or restyle the object itself. Never leave a mistake standing and put a second object beside it.
- **A line that crosses a shape**: fix the connector — pin both ends to the edges that face each other, or give the corners as route points. Do not redraw the diagram to dodge it.
- **A layout that got tight**: move shapes to open space up, align and distribute to tidy rows and columns, resize a shape when a label no longer fits.
- **Text on a line belongs to the line**: it is the connector's own label. Never place a text shape next to a connector to fake a label.
- **A free path** — a chart line, a bracket, a detour around a shape — is one connector: `routing` `"straight"` plus every corner in `points`, as many as it takes. Never put an invisible shape at each bend, and never stack narrow rectangles to fake a line or a filled area.
- **A line that hangs on nothing** is a `polyline` instead: a connector keeps at least one end on an object, and the other may stand at a free coordinate.
- **Something buried under a fill**: change the stacking order, since creation order is drawing order. Send the fill to the back or bring what it covers to the front, rather than redrawing in another order.
- **A shape pointing the wrong way**: rotate it (clockwise degrees about its own center). Poly shapes do not turn — give them turned points instead.

## Check the drawing before you answer

Check with numbers rather than by eye: look for shapes sitting on one another,
measure a label that may not fit its shape, measure a line you suspect cuts
through one. These answer exactly; a picture only suggests.

Then look at what you drew, for what no measurement catches — a lopsided layout,
a cluster that reads wrong. Fix what you found, then answer.

## Answering

Answer the user briefly in the language they wrote in. Describe what you drew
rather than dumping JSON; they can see the canvas.
