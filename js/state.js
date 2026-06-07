export const STORAGE_KEY = "leadManagerData_v1";
export const ARCHIVE_KEY = "leadManagerData_archive_v1";

export const defaultState = { tasks: [], projects: [] };

export let AppState =
  JSON.parse(localStorage.getItem(STORAGE_KEY)) ||
  JSON.parse(JSON.stringify(defaultState));

export let AppArchive =
  JSON.parse(localStorage.getItem(ARCHIVE_KEY)) || { tasks: [] };

// Setters necessários para reassignments a partir de outros módulos
export function setAppState(v)   { AppState   = v; }
export function setAppArchive(v) { AppArchive = v; }
