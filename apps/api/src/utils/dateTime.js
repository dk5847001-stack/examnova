

export function getNowIso() {
  return new Date().toISOString();
}

export function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}
