import { httpError } from "../utils/http-error";

const MAX_DURATION_SECONDS = 2_147_483_647;

export function resolveDuration(startTime: Date, endTime?: Date) {
  if (!endTime) {
    return null;
  }

  if (startTime.getTime() > endTime.getTime()) {
    throw httpError(
      400,
      "start_time_cannot_be_after_end_time_please_adjust_the_time_range",
      "Start time cannot be after end time. Please adjust the time range.",
    );
  }

  const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

  if (duration > MAX_DURATION_SECONDS) {
    throw httpError(
      400,
      "the_time_range_is_too_long_to_record",
      "The time range is too long to record.",
    );
  }

  return duration;
}
