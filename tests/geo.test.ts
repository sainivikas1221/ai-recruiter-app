import { describe, expect, it } from "vitest";
import { countriesIn, inUserPlace, remoteOpenTo, userPlaces } from "@/lib/jobs/geo";

describe("userPlaces", () => {
  it("knows city aliases and their country", () => {
    const p = userPlaces(["Gurgaon"]);
    expect(p.cities.has("gurugram")).toBe(true);
    expect(p.countries.has("india")).toBe(true);
  });

  it("expands Delhi NCR to its cities", () => {
    const p = userPlaces(["Delhi NCR"]);
    expect(p.cities.has("noida")).toBe(true);
    expect(p.cities.has("gurgaon")).toBe(true);
  });

  it("treats a country name as a country", () => {
    const p = userPlaces(["India"]);
    expect(p.cities.size).toBe(0);
    expect(p.countries.has("india")).toBe(true);
  });
});

describe("inUserPlace", () => {
  const gurgaon = userPlaces(["Gurgaon"]);
  it("matches the city under either name", () => {
    expect(inUserPlace("Gurugram, Haryana", gurgaon)).toBe("city");
    expect(inUserPlace("Bengaluru, India", gurgaon)).toBe("country");
    expect(inUserPlace("New York, NY", gurgaon)).toBeNull();
  });
});

describe("remoteOpenTo", () => {
  const india = userPlaces(["Gurgaon"]);
  it("allows worldwide and the user's own country or region", () => {
    expect(remoteOpenTo("Worldwide", india)).toBe("worldwide");
    expect(remoteOpenTo(null, india)).toBe("worldwide");
    expect(remoteOpenTo("Remote - India", india)).toBe("country");
    expect(remoteOpenTo("APAC", india)).not.toBe(false);
  });

  it("excludes remote jobs limited to other countries", () => {
    expect(remoteOpenTo("USA only", india)).toBe(false);
    expect(remoteOpenTo("Remote - US", india)).toBe(false);
    expect(remoteOpenTo("Germany", india)).toBe(false);
  });

  it("does not read 'us' inside other words as the United States", () => {
    expect(countriesIn("Austin, Texas")).toContain("us");
    expect(countriesIn("Join us anywhere")).not.toContain("us");
  });
});
