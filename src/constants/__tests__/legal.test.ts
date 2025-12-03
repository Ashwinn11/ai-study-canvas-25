import { getLegalContent } from "@/constants/legal";

describe("getLegalContent", () => {
  it("returns Terms of Service content for terms type", () => {
    const terms = getLegalContent("terms");
    expect(terms).toContain("Weekly Study Pass");
    expect(terms).toContain("Fees are non-refundable");
  });

  it("returns Privacy Policy content for privacy type", () => {
    const privacy = getLegalContent("privacy");
    expect(privacy).toContain("Masterly (“we”, “us”, “our”) is committed to protecting your privacy");
    expect(privacy).toContain("Account Information");
  });
});
