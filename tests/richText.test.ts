import { describe, expect, it } from "vitest";
import { plainTextToRichHtml, sanitizeRichText } from "../src/features/courses/richText";

describe("lesson rich text safety", () => {
  it("removes event handlers and javascript links", () => {
    const result = sanitizeRichText('<p onclick="alert(1)"><a href="javascript:alert(1)">Text</a><img src=x onerror="alert(2)"></p>');
    expect(result).not.toMatch(/onclick|onerror|javascript:|<img/i);
    expect(result).toContain("Text");
  });
  it("keeps normal text formatting and safe links", () => {
    const result = sanitizeRichText('<h2>Lesson</h2><p><strong>Hello</strong> <a href="https://example.com">link</a></p>');
    expect(result).toContain("<h2>Lesson</h2>");
    expect(result).toContain("<strong>Hello</strong>");
    expect(result).toContain('rel="noreferrer"');
  });
  it("escapes pasted plain text", () => {
    expect(plainTextToRichHtml('<script>\nHello')).toBe("&lt;script&gt;<br>Hello");
  });
});
