/**
 * Trip State Machine
 * 
 * Pure functions for trip lifecycle state transitions.
 * Each function returns the next state of the trip, vehicle, and driver,
 * plus any side-effect data (like odometer updates).
 * 
 * Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 * 
 * State Machine:
 * - Draft → Dispatched (via dispatchTrip)
 * - Dispatched → Completed (via completeTrip with valid odometer & fuel)
 * - Dispatched → Cancelled (via cancelTrip)
 * - All other transitions are rejected
 */

import { Trip, TripStatus, VehicleStatus, DriverStatus, Vehicle } from "./types";

/**
 * Result type for state machine transitions.
 * Success includes the next status for all three entities and optional odometer update.
 * Failure includes a descriptive error message.
 */
export type TransitionResult =
  | {
      ok: true;
      trip: TripStatus;
      vehicle: VehicleStatus;
      driver: DriverStatus;
      newOdometer?: number;
    }
  | { ok: false; error: string };

/**
 * Dispatch a trip from Draft to Dispatched.
 * 
 * Guard: Trip must be in Draft status
 * Effect: Trip → Dispatched, Vehicle → On Trip, Driver → On Trip
 * 
 * Requirement 6.2: When a User dispatches a Trip whose current Trip Status is Draft,
 * THE Trip_Service SHALL set the Trip Status to Dispatched and set both the assigned
 * Vehicle Status and assigned Driver Status to On Trip.
 * 
 * Requirement 6.6: Only Dispatched trips can be completed or cancelled (implicit: only
 * Draft trips can be dispatched).
 * 
 * @param trip - The trip to dispatch
 * @returns TransitionResult with next states or error
 */
export function dispatchTrip(trip: Trip): TransitionResult {
  // Guard: Only Draft trips can be dispatched (Req 6.6 implicit)
  if (trip.status !== "Draft") {
    return { ok: false, error: "Only Draft trips can be dispatched" };
  }

  // Transition all three entities (Req 6.2)
  return {
    ok: true,
    trip: "Dispatched",
    vehicle: "On Trip",
    driver: "On Trip",
  };
}

/**
 * Complete a dispatched trip.
 * 
 * Guards:
 * - Trip must be in Dispatched status
 * - Final odometer must be >= current vehicle odometer
 * - Fuel consumed must be >= 0
 * 
 * Effect: Trip → Completed, Vehicle → Available, Driver → Available,
 *         Vehicle.odometer := finalOdometer
 * 
 * Requirement 6.3: When a User completes a Trip whose current Trip Status is Dispatched
 * by entering a final Odometer reading greater than or equal to the assigned Vehicle's
 * current Odometer and a fuel consumed value greater than or equal to 0, THE Trip_Service
 * SHALL set the Trip Status to Completed and set both the assigned Vehicle Status and
 * assigned Driver Status to Available.
 * 
 * Requirement 6.5: When a User completes a Trip with a final Odometer reading greater
 * than or equal to the assigned Vehicle's current Odometer, THE Trip_Service SHALL update
 * the assigned Vehicle's Odometer to the entered final reading.
 * 
 * Requirement 6.6: If a User attempts to complete or cancel a Trip whose current Trip
 * Status is not Dispatched, THEN THE Trip_Service SHALL reject the request, preserve
 * the Trip Status and the assigned Vehicle and Driver Statuses, and display an error message.
 * 
 * Requirement 6.7: If a User submits a final Odometer reading less than the assigned
 * Vehicle's current Odometer or a fuel consumed value less than 0 when completing a Trip,
 * THEN THE Trip_Service SHALL reject the completion, preserve the Trip Status and the
 * assigned Vehicle's Odometer, and display a validation error message.
 * 
 * @param trip - The trip to complete
 * @param vehicle - The assigned vehicle (for odometer validation)
 * @param finalOdometer - The final odometer reading (must be >= current)
 * @param fuelConsumed - The fuel consumed (must be >= 0)
 * @returns TransitionResult with next states and odometer update, or error
 */
export function completeTrip(
  trip: Trip,
  vehicle: Vehicle,
  finalOdometer: number,
  fuelConsumed: number
): TransitionResult {
  // Guard: Only Dispatched trips can be completed (Req 6.6)
  if (trip.status !== "Dispatched") {
    return {
      ok: false,
      error: "Only Dispatched trips can be completed",
    };
  }

  // Guard: Final odometer must be >= current odometer (Req 6.7)
  if (finalOdometer < vehicle.odometer) {
    return {
      ok: false,
      error: "Final odometer must be greater than or equal to current reading",
    };
  }

  // Guard: Fuel consumed must be >= 0 (Req 6.7)
  if (fuelConsumed < 0) {
    return {
      ok: false,
      error: "Fuel consumed cannot be negative",
    };
  }

  // Transition all three entities and update odometer (Req 6.3, 6.5)
  return {
    ok: true,
    trip: "Completed",
    vehicle: "Available",
    driver: "Available",
    newOdometer: finalOdometer,
  };
}

/**
 * Cancel a dispatched trip.
 * 
 * Guard: Trip must be in Dispatched status
 * Effect: Trip → Cancelled, Vehicle → Available, Driver → Available
 * 
 * Requirement 6.4: When a User cancels a Trip whose current Trip Status is Dispatched,
 * THE Trip_Service SHALL set the Trip Status to Cancelled and set both the assigned
 * Vehicle Status and assigned Driver Status to Available.
 * 
 * Requirement 6.6: If a User attempts to complete or cancel a Trip whose current Trip
 * Status is not Dispatched, THEN THE Trip_Service SHALL reject the request, preserve
 * the Trip Status and the assigned Vehicle and Driver Statuses, and display an error message.
 * 
 * @param trip - The trip to cancel
 * @returns TransitionResult with next states or error
 */
export function cancelTrip(trip: Trip): TransitionResult {
  // Guard: Only Dispatched trips can be cancelled (Req 6.6)
  if (trip.status !== "Dispatched") {
    return {
      ok: false,
      error: "Only Dispatched trips can be cancelled",
    };
  }

  // Transition all three entities (Req 6.4)
  return {
    ok: true,
    trip: "Cancelled",
    vehicle: "Available",
    driver: "Available",
  };
}
