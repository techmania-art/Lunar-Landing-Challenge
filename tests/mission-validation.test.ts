import { describe, it, expect } from "vitest";
import {
  validateMissionForm,
  parseAdditionalSite,
} from "@/lib/validation/mission-input-schema";

describe("Mission Input Validation (Arbitrary Thresholds Removed)", () => {
  it("validates boundary coordinates without arbitrary clamping: lat -90, lon -180", () => {
    const result = validateMissionForm({
      latitude: "-90",
      longitude: "-180",
      missionDate: "2027-04-12",
      missionTimeUtc: "12:00",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.latitude).toBe(-90);
      expect(result.data.longitude).toBe(-180);
      expect(result.data.rawCoordinates?.latitude).toBe("-90");
      expect(result.data.rawCoordinates?.longitude).toBe("-180");
      expect(result.data.missionDate).toBe("2027-04-12");
      expect(result.data.missionTimeUtc).toBe("12:00");
    }
  });

  it("accepts valid negative and decimal coordinates", () => {
    const result = validateMissionForm({
      latitude: "-89.54",
      longitude: "0.235",
      missionDate: "2026-11-20",
      missionTimeUtc: "14:30",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.latitude).toBe(-89.54);
      expect(result.data.longitude).toBe(0.235);
    }
  });

  it("does not reject coordinates merely for falling outside previous arbitrary UI thresholds", () => {
    // E.g. 0-360 longitude or high coordinate entries are parsed safely as finite numbers;
    // service-specific constraints are handled at adapter boundaries rather than arbitrary app rejection.
    const result360 = validateMissionForm({
      latitude: "-85.0",
      longitude: "270.5",
      missionDate: "2028-01-15",
      missionTimeUtc: "12:00",
    });
    expect(result360.success).toBe(true);
    if (result360.success) {
      expect(result360.data.longitude).toBe(270.5);
      expect(result360.data.rawCoordinates?.longitude).toBe("270.5");
    }
  });

  it("rejects malformed and non-finite inputs (NaN, Infinity, empty)", () => {
    const resultNaN = validateMissionForm({
      latitude: "not-a-number",
      longitude: "0",
      missionDate: "2026-11-20",
      missionTimeUtc: "12:00",
    });
    expect(resultNaN.success).toBe(false);
    if (!resultNaN.success) {
      expect(resultNaN.errors.latitude).toBeDefined();
    }

    const resultInf = validateMissionForm({
      latitude: "Infinity",
      longitude: "0",
      missionDate: "2026-11-20",
      missionTimeUtc: "12:00",
    });
    expect(resultInf.success).toBe(false);

    const resultEmpty = validateMissionForm({
      latitude: "",
      longitude: "0",
      missionDate: "2026-11-20",
      missionTimeUtc: "12:00",
    });
    expect(resultEmpty.success).toBe(false);
  });

  it("requires date in YYYY-MM-DD format", () => {
    const resultMissing = validateMissionForm({
      latitude: "-89.5",
      longitude: "0.0",
      missionDate: "",
      missionTimeUtc: "12:00",
    });
    expect(resultMissing.success).toBe(false);
    if (!resultMissing.success) {
      expect(resultMissing.errors.missionDate).toBe("Mission date is required");
    }

    const resultMalformed = validateMissionForm({
      latitude: "-89.5",
      longitude: "0.0",
      missionDate: "12-04-2027",
      missionTimeUtc: "12:00",
    });
    expect(resultMalformed.success).toBe(false);
    if (!resultMalformed.success) {
      expect(resultMalformed.errors.missionDate).toContain("YYYY-MM-DD");
    }
  });

  it("requires valid 24-hour UTC time", () => {
    const resultEmpty = validateMissionForm({
      latitude: "-89.5",
      longitude: "0.0",
      missionDate: "2027-04-12",
      missionTimeUtc: "",
    });
    expect(resultEmpty.success).toBe(false);

    const resultInvalidHour = validateMissionForm({
      latitude: "-89.5",
      longitude: "0.0",
      missionDate: "2027-04-12",
      missionTimeUtc: "25:00",
    });
    expect(resultInvalidHour.success).toBe(false);

    const resultInvalidMinute = validateMissionForm({
      latitude: "-89.5",
      longitude: "0.0",
      missionDate: "2027-04-12",
      missionTimeUtc: "12:65",
    });
    expect(resultInvalidMinute.success).toBe(false);
  });

  it("parses optional comparison site correctly", () => {
    expect(parseAdditionalSite("")).toBeNull();
    expect(parseAdditionalSite("   ")).toBeNull();

    const validParsed = parseAdditionalSite("-88.8, 12.4");
    expect(validParsed).toEqual({ latitude: -88.8, longitude: 12.4 });

    const resultWithSite = validateMissionForm({
      latitude: "-89.5",
      longitude: "0.0",
      missionDate: "2027-04-12",
      missionTimeUtc: "12:00",
      additionalSite: "-88.8, 12.4",
    });
    expect(resultWithSite.success).toBe(true);
    if (resultWithSite.success) {
      expect(resultWithSite.data.additionalSite).toEqual({
        latitude: -88.8,
        longitude: 12.4,
      });
    }
  });

  it("rejects non-numeric optional comparison site coordinates", () => {
    const malformed = parseAdditionalSite("invalid-input");
    expect(malformed).toHaveProperty("error");

    const nonNumeric = parseAdditionalSite("abc, 20");
    expect(nonNumeric).toHaveProperty("error");
  });
});
