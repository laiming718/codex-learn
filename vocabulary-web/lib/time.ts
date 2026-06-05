const chinaUtcOffsetMs = 8 * 60 * 60 * 1000;
const oneHourMs = 60 * 60 * 1000;
const oneDayMs = 24 * oneHourMs;
const learningDayBoundaryHour = 6;

export const tenMinutesMs = 10 * 60 * 1000;

export function getLearningDayStart(timestamp: number) {
  const localTimestamp = timestamp + chinaUtcOffsetMs;
  const localDayStart = Math.floor(localTimestamp / oneDayMs) * oneDayMs;
  const boundaryOffsetMs = learningDayBoundaryHour * oneHourMs;
  const localTimeSinceMidnight = localTimestamp - localDayStart;
  const localLearningDayStart =
    localTimeSinceMidnight >= boundaryOffsetMs
      ? localDayStart + boundaryOffsetMs
      : localDayStart - (oneDayMs - boundaryOffsetMs);

  return localLearningDayStart - chinaUtcOffsetMs;
}

export function getNextLearningDayReviewAt(baseTimestamp: number, dayCount: number) {
  return getLearningDayStart(baseTimestamp) + dayCount * oneDayMs;
}

export function getNextReviewAt(result: string, streak: number, now = Date.now()) {
  if (result === "forgot") {
    return now + tenMinutesMs;
  }

  if (result === "fuzzy") {
    return getNextLearningDayReviewAt(now, 1);
  }

  const reviewDays = streak <= 1 ? 3 : streak === 2 ? 7 : 14;
  return getNextLearningDayReviewAt(now, reviewDays);
}
