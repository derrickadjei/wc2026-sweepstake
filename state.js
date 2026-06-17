// ============================================================
// STATE — loads baked-in data, merges with localStorage overrides,
// and exposes save/load/export/import for the "static site" model.
// ============================================================

const STORAGE_KEY = "wc2026_sweepstake_state_v1";

const DRAW_DATA = {
  players: ["Yaw", "Andy", "Max", "Derrick"],
  draw: {
    "Yaw":     ["Germany","Argentina","France","Switzerland","Senegal","Ecuador","Paraguay","Qatar","Tunisia","Jordan","Curaçao","Cabo Verde"],
    "Andy":    ["England","Netherlands","Mexico","Colombia","Austria","Croatia","Norway","Uzbekistan","Ivory Coast","DR Congo","Bosnia & H","Ghana"],
    "Max":     ["Belgium","Brazil","USA","Uruguay","Iran","Japan","Algeria","Panama","South Africa","Czechia","New Zealand","Türkiye"],
    "Derrick": ["Portugal","Spain","Canada","Morocco","Korea Republic","Australia","Egypt","Saudi Arabia","Scotland","Iraq","Sweden","Haiti"]
  }
};

const GROUPS_DATA = {
  A: { teams: ["Mexico", "South Africa", "Korea Republic", "Czechia"] },
  B: { teams: ["Canada", "Bosnia & H", "Qatar", "Switzerland"] },
  C: { teams: ["Brazil", "Morocco", "Haiti", "Scotland"] },
  D: { teams: ["USA", "Paraguay", "Australia", "Türkiye"] },
  E: { teams: ["Germany", "Curaçao", "Ivory Coast", "Ecuador"] },
  F: { teams: ["Netherlands", "Japan", "Sweden", "Tunisia"] },
  G: { teams: ["Belgium", "Egypt", "Iran", "New Zealand"] },
  H: { teams: ["Spain", "Cabo Verde", "Saudi Arabia", "Uruguay"] },
  I: { teams: ["France", "Senegal", "Iraq", "Norway"] },
  J: { teams: ["Argentina", "Algeria", "Austria", "Jordan"] },
  K: { teams: ["Portugal", "DR Congo", "Uzbekistan", "Colombia"] },
  L: { teams: ["England", "Croatia", "Ghana", "Panama"] }
};

// Generate round-robin matches (3 per team) for each group
function generateGroupMatches() {
  const matches = {}; // matchId -> {group, home, away}
  for (const [letter, g] of Object.entries(GROUPS_DATA)) {
    const [t1, t2, t3, t4] = g.teams;
    const pairs = [
      [t1, t2], [t3, t4],
      [t4, t2], [t1, t3],
      [t4, t1], [t2, t3]
    ];
    pairs.forEach((pair, idx) => {
      const id = `${letter}${idx + 1}`;
      matches[id] = { id, group: letter, home: pair[0], away: pair[1] };
    });
  }
  return matches;
}

const GROUP_MATCHES = generateGroupMatches();

// team -> list of matchIds it plays in
function buildTeamMatchIndex() {
  const idx = {};
  for (const m of Object.values(GROUP_MATCHES)) {
    if (!idx[m.home]) idx[m.home] = [];
    if (!idx[m.away]) idx[m.away] = [];
    idx[m.home].push(m.id);
    idx[m.away].push(m.id);
  }
  return idx;
}

const TEAM_MATCH_INDEX = buildTeamMatchIndex();

function findTeamGroup(team) {
  for (const [letter, g] of Object.entries(GROUPS_DATA)) {
    if (g.teams.includes(team)) return letter;
  }
  return null;
}

// ---------- Default seed results (carried over from the spreadsheet) ----------
// ---------- Seed results are now loaded from results.json (see loadSeedResults below) ----------
// This keeps "the latest results" as a single committable file: export from the app,
// drop the file into the repo as results.json, redeploy, and everyone sees it.
let SEED_RESULTS = {};

async function loadSeedResults() {
  try {
    const res = await fetch("results.json", { cache: "no-store" });
    if (!res.ok) throw new Error("results.json not found");
    const data = await res.json();
    SEED_RESULTS = data.matchResults || {};
    return data;
  } catch (e) {
    console.warn("Could not load results.json, starting with no results.", e);
    SEED_RESULTS = {};
    return null;
  }
}

function defaultState() {
  return {
    players: DRAW_DATA.players,
    draw: DRAW_DATA.draw,
    // raw match results keyed by matchId: {homeGoals, awayGoals, homeCS, awayCS, homeRed, awayRed}
    matchResults: { ...SEED_RESULTS },
    // bonus flags keyed by team: {qualified: bool, topOfGroup: bool}
    teamBonus: {},
    // knockout entries keyed by team: [{round, opponent, goals, cleanSheet, redCards, won}, ...]
    knockout: {}
  };
}

/**
 * Loads state with this priority:
 * 1. results.json committed to the repo (the "official" shared results)
 * 2. localStorage (only used if it's newer than what's committed — see note below)
 *
 * In the simple one-admin workflow, results.json IS the source of truth: every time
 * you export, you're meant to replace results.json in the repo with that export.
 * localStorage is just a convenience so your in-progress edits survive a page refresh
 * before you've exported yet.
 */
async function loadState() {
  const seedData = await loadSeedResults();

  let state = defaultState();
  if (seedData) {
    state = normalizeState({
      players: seedData.players || state.players,
      draw: seedData.draw || state.draw,
      matchResults: seedData.matchResults || state.matchResults,
      teamBonus: seedData.teamBonus || state.teamBonus,
      knockout: seedData.knockout || state.knockout
    });
  }

  // Layer on any local-only edits made since the last export (same device only)
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const committedVersion = seedData?.exportedAt || null;
      const localVersion = parsed.exportedAt || null;
      // If local edits are newer than (or there's no) committed version, prefer local
      if (!committedVersion || (localVersion && localVersion > committedVersion)) {
        state = normalizeState(parsed);
      }
    }
  } catch (e) {
    console.warn("Could not read local edits", e);
  }

  return state;
}

function normalizeState(parsed) {
  const base = defaultState();
  return {
    players: parsed.players || base.players,
    draw: parsed.draw || base.draw,
    matchResults: parsed.matchResults || base.matchResults,
    teamBonus: parsed.teamBonus || base.teamBonus,
    knockout: parsed.knockout || base.knockout,
    exportedAt: parsed.exportedAt || null
  };
}

function saveState(state) {
  // Stamp every local save so we can tell later whether it's newer than a committed export
  state.exportedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function exportStateJSON(state) {
  const toExport = { ...state, exportedAt: new Date().toISOString() };
  return JSON.stringify(toExport, null, 2);
}

function resetState() {
  localStorage.removeItem(STORAGE_KEY);
}

// ---------- Derive the "computed state" shape that points-engine.js expects ----------
function deriveComputedState(rawState) {
  const teamMatchEntries = {}; // team -> matchId -> {goals, cleanSheet, redCards, result}

  for (const [matchId, res] of Object.entries(rawState.matchResults)) {
    const m = GROUP_MATCHES[matchId];
    if (!m) continue;

    const hg = Number(res.homeGoals);
    const ag = Number(res.awayGoals);
    const hasScore = res.homeGoals !== "" && res.homeGoals !== undefined && res.homeGoals !== null &&
                      res.awayGoals !== "" && res.awayGoals !== undefined && res.awayGoals !== null;

    let homeResult = null, awayResult = null;
    if (hasScore && !isNaN(hg) && !isNaN(ag)) {
      if (hg > ag) { homeResult = "W"; awayResult = "L"; }
      else if (hg < ag) { homeResult = "L"; awayResult = "W"; }
      else { homeResult = "D"; awayResult = "D"; }
    }

    if (!teamMatchEntries[m.home]) teamMatchEntries[m.home] = {};
    if (!teamMatchEntries[m.away]) teamMatchEntries[m.away] = {};

    teamMatchEntries[m.home][matchId] = {
      goals: hasScore ? hg : 0,
      cleanSheet: !!res.homeCS,
      redCards: Number(res.homeRed) || 0,
      result: homeResult
    };
    teamMatchEntries[m.away][matchId] = {
      goals: hasScore ? ag : 0,
      cleanSheet: !!res.awayCS,
      redCards: Number(res.awayRed) || 0,
      result: awayResult
    };
  }

  const teamKoEntries = {};
  for (const [team, entries] of Object.entries(rawState.knockout || {})) {
    teamKoEntries[team] = entries.map(e => ({
      round: e.round,
      goals: Number(e.goals) || 0,
      cleanSheet: !!e.cleanSheet,
      redCards: Number(e.redCards) || 0,
      won: !!e.won
    }));
  }

  return {
    players: rawState.players,
    draw: rawState.draw,
    teamMatchEntries,
    teamBonus: rawState.teamBonus || {},
    teamKoEntries
  };
}
