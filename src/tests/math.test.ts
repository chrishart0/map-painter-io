import { describe, it, expect } from "vitest";
import { sum } from "../utils/math";

describe("Math Functions", () => {
  it("adds two numbers correctly", () => {
    expect(sum(1, 2)).toBe(3);
    expect(sum(-1, 5)).toBe(4);
    expect(sum(0, 0)).toBe(0);
  });

  it("handles negative numbers", () => {
    expect(sum(-2, -3)).toBe(-5);
  });
});
