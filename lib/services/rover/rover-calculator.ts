import type {
  TraverseFeasibilityInput,
  TraverseFeasibilityResult,
} from "./rover-types";

/**
 * Standard IAU mean volumetric radius of the Moon in kilometers.
 */
export const LUNAR_MEAN_RADIUS_KM = 1737.4;

/**
 * Computes great-circle surface distance across the spherical Moon (in kilometers).
 */
export function calculateLunarGreatCircleDistanceKm(
  lat1Deg: number,
  lon1Deg: number,
  lat2Deg: number,
  lon2Deg: number
): number {
  if (
    !Number.isFinite(lat1Deg) ||
    !Number.isFinite(lon1Deg) ||
    !Number.isFinite(lat2Deg) ||
    !Number.isFinite(lon2Deg)
  ) {
    return 0;
  }

  const toRad = Math.PI / 180;
  const phi1 = lat1Deg * toRad;
  const phi2 = lat2Deg * toRad;
  const deltaPhi = (lat2Deg - lat1Deg) * toRad;
  const deltaLambda = (lon2Deg - lon1Deg) * toRad;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const clampedA = Math.max(0, Math.min(1, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));

  return Math.round(LUNAR_MEAN_RADIUS_KM * c * 100) / 100;
}

/**
 * Evaluates rover energy budget and traverse feasibility for a defined route.
 */
export function evaluateTraverseFeasibility(
  input: TraverseFeasibilityInput
): TraverseFeasibilityResult {
  const { battery, consumption, route, solarEnergyGeneratedWh = 0, missionDurationHours } = input;

  const defaultLimitations = [
    "Applies only to the specific proposed traverse route and documented rover assumptions.",
    "Does not claim the rover can traverse the Moon as a whole.",
    "Simplified constant-power model; does not account for localized wheel slip, regolith sinkage, or steep slope-dependent traction.",
    "Thermal heating loads during eclipse and communication RF downlink transmission spikes are excluded.",
  ];

  // Case 1: Route is not specified
  if (
    !route ||
    (route.manualDistanceKm === undefined &&
      (route.destLatitudeDeg === undefined || route.destLongitudeDeg === undefined))
  ) {
    return {
      state: "NOT_EVALUATED",
      explanation:
        "No destination coordinates or traverse route selected. Enter a destination location to assess rover traverse feasibility.",
      assumptions: [
        "Solar generation and landing point illumination can still be evaluated independently.",
      ],
      limitations: defaultLimitations,
    };
  }

  // Calculate route distance
  let distanceKm = 0;
  if (route.manualDistanceKm !== undefined && route.manualDistanceKm > 0) {
    distanceKm = route.manualDistanceKm;
  } else if (
    Number.isFinite(route.destLatitudeDeg) &&
    Number.isFinite(route.destLongitudeDeg)
  ) {
    distanceKm = calculateLunarGreatCircleDistanceKm(
      route.startLatitudeDeg,
      route.startLongitudeDeg,
      route.destLatitudeDeg!,
      route.destLongitudeDeg!
    );
  }

  if (distanceKm <= 0) {
    return {
      state: "UNDETERMINED",
      routeDistanceKm: 0,
      explanation:
        "Route distance is zero or identical to start coordinates. Specify a distinct traverse destination.",
      assumptions: [],
      limitations: defaultLimitations,
    };
  }

  // Case 2: Missing rover battery or consumption parameters
  if (
    !battery ||
    !Number.isFinite(battery.nominalCapacityWh) ||
    battery.nominalCapacityWh <= 0 ||
    !consumption ||
    !Number.isFinite(consumption.drivePowerW) ||
    consumption.drivePowerW <= 0 ||
    !Number.isFinite(consumption.driveSpeedKmH) ||
    consumption.driveSpeedKmH <= 0
  ) {
    return {
      state: "UNDETERMINED",
      routeDistanceKm: distanceKm,
      explanation:
        "Traverse energy sufficiency cannot be determined because battery capacity or rover consumption loads are missing. Configure rover specifications in Mission Input.",
      assumptions: [
        `Proposed route distance: ${distanceKm} km.`,
        "Solar panel generation does not provide complete energy sufficiency without battery and drive load data.",
      ],
      limitations: defaultLimitations,
    };
  }

  // Case 3: Valid calculation
  const speedKmH = consumption.driveSpeedKmH;
  const driveTimeHours = Math.round((distanceKm / speedKmH) * 100) / 100;
  const totalMissionHours = missionDurationHours && missionDurationHours > 0
    ? missionDurationHours
    : Math.max(4.0, Math.ceil(driveTimeHours));

  const driveEnergyWh = Math.round(consumption.drivePowerW * driveTimeHours * 100) / 100;
  const idleTimeHours = Math.max(0, totalMissionHours - driveTimeHours);
  const idleEnergyWh = Math.round((consumption.idlePowerW || 0) * idleTimeHours * 100) / 100;
  const totalRequiredWh = Math.round((driveEnergyWh + idleEnergyWh) * 100) / 100;

  const initialSoc = Math.min(100, Math.max(0, battery.initialSocPercent)) / 100;
  const maxDod = Math.min(100, Math.max(10, battery.maxDepthOfDischargePercent)) / 100;
  const initialBatteryEnergyWh = Math.round(battery.nominalCapacityWh * initialSoc * 100) / 100;
  const usableBatteryEnergyWh = Math.round(battery.nominalCapacityWh * maxDod * initialSoc * 100) / 100;

  const safetyReserveFrac = Math.min(100, Math.max(0, consumption.safetyReservePercent)) / 100;
  const requiredReserveWh = Math.round(totalRequiredWh * safetyReserveFrac * 100) / 100;

  const totalAvailableWh = usableBatteryEnergyWh + solarEnergyGeneratedWh;
  const netMarginWh = Math.round((totalAvailableWh - (totalRequiredWh + requiredReserveWh)) * 100) / 100;

  // Ending battery level
  const projectedEndingWh = Math.max(
    0,
    Math.min(
      battery.nominalCapacityWh,
      Math.round((initialBatteryEnergyWh + solarEnergyGeneratedWh - totalRequiredWh) * 100) / 100
    )
  );

  let state: TraverseFeasibilityResult["state"];
  let explanation: string;

  if (totalAvailableWh >= totalRequiredWh + requiredReserveWh) {
    state = "SUFFICIENT_ENERGY";
    explanation = `The configured rover model has an estimated energy margin of ${netMarginWh.toFixed(
      1
    )} Wh and is sufficient for the proposed ${distanceKm.toFixed(
      1
    )} km traverse with the ${consumption.safetyReservePercent}% reserve requirement. This result applies only to the selected route and assumptions.`;
  } else if (totalAvailableWh >= totalRequiredWh) {
    state = "CONDITIONALLY_FEASIBLE";
    explanation = `Energy is sufficient to complete the ${distanceKm.toFixed(
      1
    )} km traverse, but penetrates the ${consumption.safetyReservePercent}% safety reserve by ${Math.abs(
      netMarginWh
    ).toFixed(
      1
    )} Wh. Conditionally feasible under reduced idle loads or with dedicated stationary solar charging stops.`;
  } else {
    state = "INSUFFICIENT_ENERGY";
    const deficitWh = Math.round((totalRequiredWh - totalAvailableWh) * 100) / 100;
    explanation = `The projected battery level falls below the required reserve before the proposed ${distanceKm.toFixed(
      1
    )} km traverse is complete (energy deficit: ${deficitWh.toFixed(
      1
    )} Wh). Consider a shorter route, lower speed/loads, a longer solar charging window, or higher battery capacity.`;
  }

  const assumptions = [
    `Route distance: ${distanceKm.toFixed(2)} km across spherical Moon (IAU mean radius ${LUNAR_MEAN_RADIUS_KM} km).`,
    `Average drive speed: ${speedKmH} km/h (estimated drive duration: ${driveTimeHours} h).`,
    `Drive consumption: ${consumption.drivePowerW} W (${driveEnergyWh} Wh total).`,
    `Idle/housekeeping load: ${consumption.idlePowerW || 0} W for ${idleTimeHours.toFixed(1)} h (${idleEnergyWh} Wh total).`,
    `Usable battery capacity: ${usableBatteryEnergyWh} Wh (${(maxDod * 100).toFixed(0)}% DoD limit from ${battery.nominalCapacityWh} Wh nominal).`,
    `Solar contribution: ${solarEnergyGeneratedWh.toFixed(1)} Wh over ${totalMissionHours} h mission interval.`,
    `Required safety reserve: ${requiredReserveWh} Wh (${consumption.safetyReservePercent}% of total demand).`,
  ];

  return {
    state,
    routeDistanceKm: distanceKm,
    estimatedDriveTimeHours: driveTimeHours,
    missionDurationHours: totalMissionHours,
    driveEnergyWh,
    idleEnergyWh,
    totalEnergyRequiredWh: totalRequiredWh,
    solarEnergyGeneratedWh,
    initialBatteryEnergyWh,
    usableBatteryEnergyWh,
    projectedEndingBatteryEnergyWh: projectedEndingWh,
    requiredReserveWh,
    netMarginWh,
    explanation,
    assumptions,
    limitations: defaultLimitations,
  };
}
