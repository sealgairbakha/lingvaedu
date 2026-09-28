import { describe, expect, it } from "vitest";
import { trialCourseIdFromPath } from "./guestRoutes";

describe("guest trial route", () => {
  it("passes the course id from the URL to the trial page", () => {
    expect(trialCourseIdFromPath("/trial/a5107a38-5f6f-4899-b89c-aa7da3ebf3ee"))
      .toBe("a5107a38-5f6f-4899-b89c-aa7da3ebf3ee");
  });

  it("does not mistake other pages for trials", () => {
    expect(trialCourseIdFromPath("/welcome/students")).toBeNull();
    expect(trialCourseIdFromPath("/trial/one/extra")).toBeNull();
  });
});
