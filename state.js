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
const SEED_RESULTS = {
  // matchId -> { homeGoals, awayGoals, homeCS, awayCS, homeRed, awayRed }
  // (carried over exactly from the latest spreadsheet entries)
  A1: { homeGoals: 2, awayGoals: 0, homeCS: true,  awayCS: false, homeRed: 1, awayRed: 2 }, // Mexico 2-0 South Africa
  A2: { homeGoals: 2, awayGoals: 1, homeCS: false, awayCS: false, homeRed: 0, awayRed: 0 }, // Korea Republic 2-1 Czechia
  B1: { homeGoals: 1, awayGoals: 1, homeCS: false, awayCS: false, homeRed: 0, awayRed: 0 }, // Canada 1-1 Bosnia & H
  B2: { homeGoals: 1, awayGoals: 1, homeCS: false, awayCS: false, homeRed: 0, awayRed: 0 }, // Qatar 1-1 Switzerland
  C1: { homeGoals: 1, awayGoals: 1, homeCS: false, awayCS: false, homeRed: 0, awayRed: 0 }, // Brazil 1-1 Morocco
  C2: { homeGoals: 0, awayGoals: 1, homeCS: false, awayCS: true,  homeRed: 0, awayRed: 0 }, // Haiti 0-1 Scotland
  D1: { homeGoals: 4, awayGoals: 1, homeCS: false, awayCS: false, homeRed: 0, awayRed: 0 }, // USA 4-1 Paraguay
  D2: { homeGoals: 2, awayGoals: 0, homeCS: true,  awayCS: false, homeRed: 0, awayRed: 0 }, // Australia 2-0 Türkiye
  E1: { homeGoals: 7, awayGoals: 1, homeCS: false, awayCS: false, homeRed: 0, awayRed: 0 }, // Germany 7-1 Curaçao
  E2: { homeGoals: 1, awayGoals: 0, homeCS: true,  awayCS: false, homeRed: 0, awayRed: 0 }, // Ivory Coast 1-0 Ecuador
  F1: { homeGoals: 2, awayGoals: 2, homeCS: false, awayCS: false, homeRed: 0, awayRed: 0 }, // Netherlands 2-2 Japan
  F2: { homeGoals: 5, awayGoals: 1, homeCS: false, awayCS: false, homeRed: 0, awayRed: 0 }, // Sweden 5-1 Tunisia
  G1: { homeGoals: 1, awayGoals: 1, homeCS: false, awayCS: false, homeRed: 0, awayRed: 0 }, // Belgium 1-1 Egypt
  G2: { homeGoals: 2, awayGoals: 2, homeCS: false, awayCS: false, homeRed: 0, awayRed: 0 }, // Iran 2-2 New Zealand
  H1: { homeGoals: 0, awayGoals: 0, homeCS: false, awayCS: false, homeRed: 0, awayRed: 0 }, // Spain 0-0 Cabo Verde
  H2: { homeGoals: 1, awayGoals: 1, homeCS: false, awayCS: false, homeRed: 0, awayRed: 0 }  // Saudi Arabia 1-1 Uruguay
};

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

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return normalizeState(parsed);
    }
  } catch (e) {
    console.warn("Could not load saved state, using defaults", e);
  }
  return defaultState();
}

function normalizeState(parsed) {
  const base = defaultState();
  return {
    players: parsed.players || base.players,
    draw: parsed.draw || base.draw,
    matchResults: parsed.matchResults || base.matchResults,
    teamBonus: parsed.teamBonus || base.teamBonus,
    knockout: parsed.knockout || base.knockout
  };
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function exportStateJSON(state) {
  return JSON.stringify(state, null, 2);
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
