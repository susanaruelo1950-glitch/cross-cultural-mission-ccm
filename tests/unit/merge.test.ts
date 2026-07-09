/**
 * Unit test for the 3-way merge used by ConflictMergeDialog.
 * Run:  bun run tests/unit/merge.test.ts
 *
 * Verifies:
 *  - Non-overlapping edits auto-merge with zero conflicts.
 *  - Same field, different values → one conflict, base preserved.
 *  - Same field, same value on both sides → no conflict (harmonized).
 *  - Fields the remote didn't change keep the local edit.
 */
import { computeMerge } from "../../src/components/ConflictMergeDialog";

interface Missionary {
  id: string;
  fullName: string;
  phone: string;
  address: string;
  status: string;
}

const base: Missionary = {
  id: "m-1",
  fullName: "Juan Dela Cruz",
  phone: "0917-000",
  address: "Old Address",
  status: "Active",
};

let failed = 0;
function assert(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    console.log("  ✓", name);
  } else {
    failed++;
    console.error("  ✗", name, detail ?? "");
  }
}

console.log("• non-overlapping edits auto-merge");
{
  const mine = { ...base, phone: "0917-111" };
  const theirs = { ...base, address: "New Address" };
  const preview = computeMerge(base, mine, theirs);
  assert("no conflicts", preview.conflicts.length === 0);
  assert("keeps my phone", preview.autoMerged.phone === "0917-111");
  assert("keeps their address", preview.autoMerged.address === "New Address");
}

console.log("• true conflict on same field");
{
  const mine = { ...base, phone: "0917-111" };
  const theirs = { ...base, phone: "0917-222" };
  const preview = computeMerge(base, mine, theirs);
  assert("one conflict", preview.conflicts.length === 1);
  assert("conflict on phone", preview.conflicts[0]?.field === "phone");
  assert("mine=0917-111", preview.conflicts[0]?.mine === "0917-111");
  assert("theirs=0917-222", preview.conflicts[0]?.theirs === "0917-222");
  assert("base preserved", preview.conflicts[0]?.base === "0917-000");
}

console.log("• both changed to same value → no conflict");
{
  const mine = { ...base, status: "On Leave" };
  const theirs = { ...base, status: "On Leave" };
  const preview = computeMerge(base, mine, theirs);
  assert("no conflicts", preview.conflicts.length === 0);
  assert("status harmonized", preview.autoMerged.status === "On Leave");
}

console.log("• fields untouched by them keep my edits");
{
  const mine = { ...base, fullName: "Juan D. Cruz", phone: "0917-999" };
  const theirs = { ...base };
  const preview = computeMerge(base, mine, theirs);
  assert("no conflicts", preview.conflicts.length === 0);
  assert("keeps my name", preview.autoMerged.fullName === "Juan D. Cruz");
  assert("keeps my phone", preview.autoMerged.phone === "0917-999");
}

if (failed > 0) {
  console.error(`❌ ${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("✅ merge unit tests passed");
