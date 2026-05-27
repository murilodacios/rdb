export function getNormalizedDayOfWeek(dateString) {
  const date = new Date(dateString);

  const jsDay = date.getUTCDay();

  const rinhaDay = (jsDay + 6) % 7;

  return rinhaDay / 6;
}
