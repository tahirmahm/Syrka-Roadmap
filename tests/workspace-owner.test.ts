import { test } from "node:test";
import assert from "node:assert/strict";
import { expectedWorkspaceOwner } from "../src/odyssey/server/workspace-owner";
test("a delayed A save or delete cannot act as B after cookies change, while public owner discovery stays readable", () => {
  const requestFromA = new Headers({ "x-roadmaps-owner": "account-A" });
  let writes = 0;
  const actAs = (owner: string) => {
    if (expectedWorkspaceOwner(requestFromA, owner)) writes++;
  };
  actAs("account-B");
  assert.equal(writes, 0);
  actAs("account-A");
  assert.equal(writes, 1);
  assert.equal(expectedWorkspaceOwner(new Headers(), "account-B"), false);
  assert.equal(expectedWorkspaceOwner(new Headers(), "account-B", false), true);
  assert.equal(expectedWorkspaceOwner(requestFromA, "account-B", false), false);
});
