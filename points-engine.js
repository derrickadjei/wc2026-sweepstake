// ============================================================
// POINTS ENGINE — mirrors the spreadsheet logic exactly
// ============================================================

const ROUND_POINTS = {
  R32: 5,
  R16: 8,
  QF: 11,
  SF: 15,
  "3RD": 10,
  FIN: 20
};

const RULES = {
  group: [
    { label: "Win", value: "3 pts" },
    { label: "Draw", value: "1 pt" },
    { label: "Loss", value: "0 pts" },
    { label: "Goal scored", value: "+1 pt" },
    { label: "Clean sheet (90 min)", value: "+2 pts" },
    { label: "Red card", value: "−1 pt" },
    { label: "Qualify for R32", value: "+2 pts" },
    { label: "Top of group", value: "+3 pts" }
  ],
  knockout: [
    { label: "Round of 32 win", value: "5 pts" },
    { label: "Round of 16 win", value: "8 pts" },
    { label: "Quarter-final win", value: "11 pts" },
    { label: "Semi-final win", value: "15 pts" },
    { label: "3rd place win", value: "10 pts" },
    { label: "Champion", value: "20 pts" },
    { label: "Goal scored", value: "+1 pt" },
    { label: "Clean sheet (90 min)", value: "+2 pts" },
    { label: "Red card", value: "−1 pt" }
  ]
};

/**
 * Compute points for one team's single group-stage match entry.
 * entry shape: { goals, cleanSheet (bool), redCards, result: 'W'|'D'|'L' }
 */
function calcGroupMatchPoints(entry) {
  if (!entry) return 0;
  let pts = 0;
  const goals = Number(entry.goals) || 0;
  const redCards = Number(entry.redCards) || 0;

  pts += goals * 1;
  if (entry.cleanSheet) pts += 2;
  pts -= redCards * 1;

  if (entry.result === "W") pts += 3;
  else if (entry.result === "D") pts += 1;
  // L = 0

  return pts;
}

/**
 * Compute bonus points (qualify + top of group) — applied once per team.
 */
function calcGroupBonusPoints(bonus) {
  if (!bonus) return 0;
  let pts = 0;
  if (bonus.qualified) pts += 2;
  if (bonus.topOfGroup) pts += 3;
  return pts;
}

/**
 * Compute points for one team's single knockout match entry.
 * entry shape: { round, goals, cleanSheet, redCards, won (bool) }
 */
function calcKnockoutMatchPoints(entry) {
  if (!entry) return 0;
  let pts = 0;
  const goals = Number(entry.goals) || 0;
  const redCards = Number(entry.redCards) || 0;

  pts += goals * 1;
  if (entry.cleanSheet) pts += 2;
  pts -= redCards * 1;

  if (entry.won && entry.round && ROUND_POINTS[entry.round] !== undefined) {
    pts += ROUND_POINTS[entry.round];
  }

  return pts;
}

/**
 * Sum all group points for a given team across its matches + bonus.
 */
function teamGroupTotal(team, state) {
  const matchEntries = state.teamMatchEntries[team] || {};
  let total = 0;
  for (const matchId in matchEntries) {
    total += calcGroupMatchPoints(matchEntries[matchId]);
  }
  const bonus = state.teamBonus[team];
  total += calcGroupBonusPoints(bonus);
  return total;
}

/**
 * Sum all knockout points for a given team across its KO entries.
 */
function teamKnockoutTotal(team, state) {
  const koEntries = state.teamKoEntries[team] || [];
  let total = 0;
  for (const entry of koEntries) {
    total += calcKnockoutMatchPoints(entry);
  }
  return total;
}

/**
 * Full total for a team.
 */
function teamTotal(team, state) {
  return teamGroupTotal(team, state) + teamKnockoutTotal(team, state);
}

/**
 * Full totals for a player (sum across their drafted teams).
 */
function playerTotals(player, state) {
  const teams = state.draw[player] || [];
  let group = 0, ko = 0;
  for (const team of teams) {
    group += teamGroupTotal(team, state);
    ko += teamKnockoutTotal(team, state);
  }
  return { group, ko, total: group + ko };
}

/**
 * Build the sorted leaderboard (array of {player, group, ko, total, rank}).
 */
function buildLeaderboard(state) {
  const rows = state.players.map(p => {
    const t = playerTotals(p, state);
    return { player: p, ...t };
  });
  rows.sort((a, b) => b.total - a.total);
  let rank = 1;
  for (let i = 0; i < rows.length; i++) {
    if (i > 0 && rows[i].total < rows[i - 1].total) rank = i + 1;
    rows[i].rank = rank;
  }
  return rows;
}

/**
 * Build per-team breakdown rows, sorted by player then by total desc.
 */
function buildTeamBreakdown(state) {
  const rows = [];
  for (const player of state.players) {
    const teams = state.draw[player] || [];
    for (const team of teams) {
      rows.push({
        player,
        team,
        group: teamGroupTotal(team, state),
        ko: teamKnockoutTotal(team, state),
        total: teamTotal(team, state)
      });
    }
  }
  return rows;
}
