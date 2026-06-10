// Returns "YYYY-MM-DD" using local timezone (avoids UTC offset bugs at night)
export function localDateISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Today's date as "YYYY-MM-DD" in local timezone
export function todayISO() {
  return localDateISO(new Date());
}
