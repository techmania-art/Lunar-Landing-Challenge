import { z } from "zod";
import type { MissionInput, FormValidationErrors } from "@/types/mission";

export function parseAdditionalSite(
  input?: string | null
): { latitude: number; longitude: number } | null | { error: string } {
  if (!input || input.trim() === "") {
    return null;
  }

  const parts = input.split(",").map((p) => p.trim());
  if (parts.length !== 2) {
    return {
      error: "Enter coordinates as 'latitude, longitude' (e.g. -88.8, 12.4)",
    };
  }

  const lat = Number(parts[0]);
  const lon = Number(parts[1]);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return {
        error: "Both latitude and longitude must be valid finite numbers",
      };
    }

    return { latitude: lat, longitude: lon };
  }

  export const missionInputSchema = z.object({
    latitude: z
      .number({
        message: "Latitude is required and must be a number",
      })
    .refine((val) => Number.isFinite(val), {
        message: "Latitude must be a valid finite number",
      }),
    longitude: z
      .number({
        message: "Longitude is required and must be a number",
      })
    .refine((val) => Number.isFinite(val), {
        message: "Longitude must be a valid finite number",
      }),
    missionDate: z
      .string({
        message: "Mission date is required",
      })
      .min(1, "Mission date is required")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must follow YYYY-MM-DD format"),
    missionTimeUtc: z
      .string({
        message: "Mission time (UTC) is required",
      })
      .min(1, "Mission time (UTC) is required")
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be valid 24-hour UTC (HH:mm)"),
    additionalSite: z
      .object({
        latitude: z.number().refine((val) => Number.isFinite(val)),
        longitude: z.number().refine((val) => Number.isFinite(val)),
      })
      .optional(),
  });

  export type RawMissionFormValues = {
    latitude: string;
    longitude: string;
    missionDate: string;
    missionTimeUtc: string;
    additionalSite?: string;
  };

  export function validateMissionForm(
    values: RawMissionFormValues
  ): { success: true; data: MissionInput } | { success: false; errors: FormValidationErrors } {
    const errors: FormValidationErrors = {};

    const latTrimmed = (values.latitude ?? "").trim();
    const lonTrimmed = (values.longitude ?? "").trim();

      let parsedLat = NaN;
      let parsedLon = NaN;

      if (latTrimmed === "") {
        errors.latitude = "Valid numeric latitude is required";
      } else {
        parsedLat = Number(latTrimmed);
        if (!Number.isFinite(parsedLat)) {
          errors.latitude = "Valid numeric latitude is required";
        }
      }

        if (lonTrimmed === "") {
          errors.longitude = "Valid numeric longitude is required";
        } else {
          parsedLon = Number(lonTrimmed);
          if (!Number.isFinite(parsedLon)) {
            errors.longitude = "Valid numeric longitude is required";
          }
        }

        if (!values.missionDate || values.missionDate.trim() === "") {
          errors.missionDate = "Mission date is required";
        } else if (!/^\d{4}-\d{2}-\d{2}$/.test(values.missionDate)) {
          errors.missionDate = "Date must follow YYYY-MM-DD format";
        }

        if (!values.missionTimeUtc || values.missionTimeUtc.trim() === "") {
          errors.missionTimeUtc = "Mission time (UTC) is required";
        } else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(values.missionTimeUtc)) {
          errors.missionTimeUtc = "Time must be in HH:mm UTC format (00:00 - 23:59)";
        }

        let parsedAdditional: { latitude: number; longitude: number } | undefined;
        if (values.additionalSite && values.additionalSite.trim() !== "") {
          const res = parseAdditionalSite(values.additionalSite);
          if (res && "error" in res) {
            errors.additionalSite = res.error;
          } else if (res) {
            parsedAdditional = res;
          }
        }

        if (Object.keys(errors).length > 0) {
          return { success: false, errors };
        }

        return {
          success: true,
          data: {
            latitude: parsedLat,
            longitude: parsedLon,
            missionDate: values.missionDate,
            missionTimeUtc: values.missionTimeUtc,
            ...(parsedAdditional ? { additionalSite: parsedAdditional } : {}),
            rawCoordinates: {
              latitude: values.latitude,
              longitude: values.longitude,
            },
          },
        };
      }
