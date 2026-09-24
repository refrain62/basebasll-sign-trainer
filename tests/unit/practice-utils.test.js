import test from "node:test";
import assert from "node:assert/strict";
import { filterPracticeSigns, findPracticeGroup, getPracticeOptions } from "../../public/practice-utils.js";

const signs = [
  { id: 1, groupId: 10 },
  { id: 2, groupId: 10 },
  { id: 3, groupId: 20 },
  { id: 4, groupId: null }
];
const groups = [{ id: 10, name: "A" }, { id: 20, name: "B" }];

test("practice sign filtering handles all, group and unselected states", () => {
  assert.equal(filterPracticeSigns(signs, "all").length, 4);
  assert.deepEqual(filterPracticeSigns(signs, 10).map((s) => s.id), [1, 2]);
  assert.deepEqual(filterPracticeSigns(signs, "20").map((s) => s.id), [3]);
  assert.deepEqual(filterPracticeSigns(signs, null), []);
});

test("selected group resolution supports the special all group", () => {
  assert.equal(findPracticeGroup(groups, 10)?.name, "A");
  assert.equal(findPracticeGroup(groups, 999), null);
  assert.equal(findPracticeGroup(groups, null), null);
  assert.equal(findPracticeGroup(groups, "all")?.id, "all");
});

test("practice options adapt to available sign count", () => {
  assert.deepEqual(getPracticeOptions(0), []);
  assert.deepEqual(getPracticeOptions(3).map((o) => o.count), ["all"]);
  assert.deepEqual(getPracticeOptions(5).map((o) => o.count), ["all"]);
  assert.deepEqual(getPracticeOptions(6).map((o) => o.count), [5, "all"]);
  assert.deepEqual(getPracticeOptions(10).map((o) => o.count), [10, 5, "all"]);
  assert.deepEqual(getPracticeOptions(25).map((o) => o.count), [10, 5, "all"]);
});
