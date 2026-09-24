// Ad-hoc check for lib/dashboard-layout.ts (the frontend has no test runner):
//   node --experimental-strip-types scripts/check-dashboard-layout.mts
import assert from "node:assert/strict"
import {
    DASHBOARD_SECTIONS,
    DEFAULT_LAYOUT,
    allCollapsed,
    hideSection,
    parseLayout,
    resetLayout,
    serializeLayout,
    setAllCollapsed,
    showSection,
    toggleCollapsed,
    visibleSections,
} from "../lib/dashboard-layout.ts"

const ids = DASHBOARD_SECTIONS.map((s) => s.id)
assert.equal(new Set(ids).size, ids.length, "section ids are unique")

// defaults and tolerant parsing
assert.deepEqual(parseLayout(undefined), DEFAULT_LAYOUT)
assert.deepEqual(parseLayout(""), DEFAULT_LAYOUT)
assert.deepEqual(parseLayout("not json"), DEFAULT_LAYOUT)
assert.deepEqual(parseLayout(encodeURIComponent('{"hidden":"x"}')), DEFAULT_LAYOUT)
assert.deepEqual(
    parseLayout(encodeURIComponent(JSON.stringify({ hidden: ["queue", "queue", "bogus"], collapsed: ["curve", 3] }))),
    { hidden: ["queue"], collapsed: ["curve"] },
    "unknown ids and duplicates are dropped",
)

// round trip
const layout = { hidden: ["heatmap"], collapsed: ["queue", "curve"] } as const
assert.deepEqual(parseLayout(serializeLayout({ hidden: [...layout.hidden], collapsed: [...layout.collapsed] })), layout)

// collapse / expand
let l = toggleCollapsed(DEFAULT_LAYOUT, "queue")
assert.deepEqual(l.collapsed, ["queue"])
l = toggleCollapsed(l, "queue")
assert.deepEqual(l.collapsed, [])

// collapse all only concerns VISIBLE sections and keeps hidden ones hidden
l = hideSection(DEFAULT_LAYOUT, "heatmap")
assert.ok(!visibleSections(l).includes("heatmap"))
l = setAllCollapsed(l, true)
assert.ok(allCollapsed(l))
assert.deepEqual(new Set(l.collapsed), new Set(visibleSections(l)))
assert.deepEqual(l.hidden, ["heatmap"])
l = setAllCollapsed(l, false)
assert.deepEqual(l.collapsed, [])
assert.ok(!allCollapsed(l))

// hide / show
l = hideSection(DEFAULT_LAYOUT, "queue")
assert.deepEqual(l.hidden, ["queue"])
assert.equal(hideSection(l, "queue").hidden.length, 1, "hiding twice is a no-op")
l = showSection(l, "queue")
assert.deepEqual(l.hidden, [])
// hiding a collapsed section forgets its collapsed flag; showing it again comes back expanded
l = hideSection(toggleCollapsed(DEFAULT_LAYOUT, "curve"), "curve")
assert.deepEqual(l.collapsed, [])

// everything hidden: nothing to collapse
let none = DEFAULT_LAYOUT
for (const id of ids) none = hideSection(none, id)
assert.equal(visibleSections(none).length, 0)
assert.equal(allCollapsed(none), false, "no visible section means nothing is collapsed")

assert.deepEqual(resetLayout(), DEFAULT_LAYOUT)
console.log("dashboard layout ok")
