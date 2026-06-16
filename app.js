// ============================================================
// APP — rendering + interactions
// ============================================================

let rawState = loadState();
let activeTab = "leaderboard";
let groupFilter = "ALL";
let koRoundFilter = "R32";

const app = document.getElementById("app");

function persist() {
  saveState(rawState);
  render();
}

function computed() {
  return deriveComputedState(rawState);
}

// ---------- Header ----------
function renderHero() {
  return `
    <header class="hero">
      <div class="wrap">
        <div class="hero-top">
          <div>
            <p class="hero-eyebrow">⚽ Family Sweepstake · 2026</p>
            <h1 class="hero-title">WORLD CUP <span>SCOREBOARD</span></h1>
          </div>
          <div class="hero-clock">
            Tournament runs <b>11 Jun – 19 Jul 2026</b><br>
            4 players · 12 teams each · 48 nations
          </div>
        </div>
        <nav class="tabs">
          ${tabButton("leaderboard", "Leaderboard")}
          ${tabButton("groups", "Group Matches")}
          ${tabButton("knockout", "Knockout")}
          ${tabButton("rules", "Rules")}
          ${tabButton("data", "Backup / Sync")}
        </nav>
      </div>
    </header>
  `;
}

function tabButton(id, label) {
  return `<button class="tab-btn ${activeTab === id ? "active" : ""}" data-tab="${id}">${label}</button>`;
}

// ---------- Leaderboard tab ----------
function renderLeaderboard() {
  const state = computed();
  const board = buildLeaderboard(state);
  const breakdown = buildTeamBreakdown(state).sort((a, b) => {
    const playerOrder = state.players.indexOf(a.player) - state.players.indexOf(b.player);
    if (playerOrder !== 0) return playerOrder;
    return b.total - a.total;
  });

  const medalIcon = (rank) => rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "";

  const rowsHtml = board.map(row => `
    <div class="board-row rank-${row.rank}">
      <div class="rank-num">${medalIcon(row.rank) || row.rank}</div>
      <div>
        <div class="player-name">${row.player}</div>
        <div class="player-meta">${state.draw[row.player].length} teams drafted</div>
      </div>
      <div class="stat-block">
        <div class="stat-num">${row.group}</div>
        <div class="stat-label">Group</div>
      </div>
      <div class="stat-block">
        <div class="stat-num">${row.ko}</div>
        <div class="stat-label">Knockout</div>
      </div>
      <div class="total-block">
        <div class="total-num">${row.total}</div>
        <div class="stat-label">Total</div>
      </div>
    </div>
  `).join("");

  const breakdownRows = breakdown.map((r, i) => `
    <tr>
      <td class="pos">${i + 1}</td>
      <td><span class="player-chip">${r.player}</span></td>
      <td class="team-flag">${r.team}</td>
      <td class="num">${r.group}</td>
      <td class="num">${r.ko}</td>
      <td class="num"><b>${r.total}</b></td>
    </tr>
  `).join("");

  return `
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">Standings</h2>
        <span class="section-sub">Auto-sorted by total points · updates live</span>
      </div>
      <div class="board">${rowsHtml}</div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title">Team Breakdown</h2>
        <span class="section-sub">${breakdown.length} teams</span>
      </div>
      <div style="overflow-x:auto;">
        <table class="team-table">
          <thead>
            <tr>
              <th>#</th><th>Player</th><th>Team</th>
              <th style="text-align:right">Group</th>
              <th style="text-align:right">KO</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>${breakdownRows}</tbody>
        </table>
      </div>
    </section>
  `;
}

// ---------- Group Matches tab (detailed entry) ----------
function teamOwner(team) {
  for (const [player, teams] of Object.entries(rawState.draw)) {
    if (teams.includes(team)) return player;
  }
  return null;
}

function renderGroupsTab() {
  const groupLetters = Object.keys(GROUPS_DATA);
  const pills = ["ALL", ...groupLetters].map(g =>
    `<button class="pill ${groupFilter === g ? "active" : ""}" data-groupfilter="${g}">${g === "ALL" ? "All Groups" : "Group " + g}</button>`
  ).join("");

  const visibleMatches = Object.values(GROUP_MATCHES).filter(m => groupFilter === "ALL" || m.group === groupFilter);

  const cardsHtml = visibleMatches.map(m => {
    const res = rawState.matchResults[m.id] || {};
    const homeOwner = teamOwner(m.home);
    const awayOwner = teamOwner(m.away);
    return `
      <div class="entry-card" data-matchcard="${m.id}">
        <div class="entry-head">
          <div class="entry-title">
            <span class="${homeOwner ? "match-team owned" : ""}">${m.home}</span>
            vs
            <span class="${awayOwner ? "match-team owned" : ""}">${m.away}</span>
          </div>
          <span class="entry-sub">Group ${m.group} ${homeOwner ? `· ${homeOwner}` : ""}${homeOwner && awayOwner ? " vs " + awayOwner : awayOwner ? "· " + awayOwner : ""}</span>
        </div>
        <div class="entry-fields">
          <div class="field">
            <label>${m.home} Goals</label>
            <input type="number" min="0" data-field="homeGoals" data-match="${m.id}" value="${res.homeGoals ?? ""}">
          </div>
          <div class="field">
            <label>${m.away} Goals</label>
            <input type="number" min="0" data-field="awayGoals" data-match="${m.id}" value="${res.awayGoals ?? ""}">
          </div>
          <div class="field">
            <label>${m.home} Clean Sheet</label>
            <select data-field="homeCS" data-match="${m.id}">
              <option value="false" ${!res.homeCS ? "selected" : ""}>No</option>
              <option value="true" ${res.homeCS ? "selected" : ""}>Yes</option>
            </select>
          </div>
          <div class="field">
            <label>${m.away} Clean Sheet</label>
            <select data-field="awayCS" data-match="${m.id}">
              <option value="false" ${!res.awayCS ? "selected" : ""}>No</option>
              <option value="true" ${res.awayCS ? "selected" : ""}>Yes</option>
            </select>
          </div>
          <div class="field">
            <label>${m.home} Red Cards</label>
            <input type="number" min="0" data-field="homeRed" data-match="${m.id}" value="${res.homeRed ?? 0}">
          </div>
          <div class="field">
            <label>${m.away} Red Cards</label>
            <input type="number" min="0" data-field="awayRed" data-match="${m.id}" value="${res.awayRed ?? 0}">
          </div>
        </div>
        <div class="entry-points">
          <span class="entry-sub">Match points →</span>
          <span class="pts-val">${matchPointsPreview(m)}</span>
        </div>
      </div>
    `;
  }).join("");

  // Bonus section: qualified / top of group per team
  const allTeams = groupLetters.flatMap(g => GROUPS_DATA[g].teams);
  const bonusRows = allTeams
    .filter(t => groupFilter === "ALL" || findTeamGroup(t) === groupFilter)
    .map(team => {
      const owner = teamOwner(team);
      const bonus = rawState.teamBonus[team] || {};
      return `
        <div class="entry-card">
          <div class="entry-head">
            <div class="entry-title">${team}</div>
            <span class="entry-sub">Group ${findTeamGroup(team)} ${owner ? "· " + owner : ""}</span>
          </div>
          <div class="entry-fields">
            <div class="field">
              <label>Qualified for R32</label>
              <select data-bonus="qualified" data-team="${team}">
                <option value="false" ${!bonus.qualified ? "selected" : ""}>No</option>
                <option value="true" ${bonus.qualified ? "selected" : ""}>Yes (+2)</option>
              </select>
            </div>
            <div class="field">
              <label>Top of Group</label>
              <select data-bonus="topOfGroup" data-team="${team}">
                <option value="false" ${!bonus.topOfGroup ? "selected" : ""}>No</option>
                <option value="true" ${bonus.topOfGroup ? "selected" : ""}>Yes (+3)</option>
              </select>
            </div>
          </div>
        </div>
      `;
    }).join("");

  return `
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">Group Stage Results</h2>
        <span class="section-sub">Enter scores, clean sheets &amp; red cards per match</span>
      </div>
      <div class="pill-row">${pills}</div>
      ${cardsHtml}
    </section>
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">Group Stage Bonuses</h2>
        <span class="section-sub">Tick once results are known — applies once per team</span>
      </div>
      ${bonusRows}
    </section>
  `;
}

function matchPointsPreview(m) {
  const state = computed();
  const homeEntry = (state.teamMatchEntries[m.home] || {})[m.id];
  const awayEntry = (state.teamMatchEntries[m.away] || {})[m.id];
  const hp = homeEntry ? calcGroupMatchPoints(homeEntry) : 0;
  const ap = awayEntry ? calcGroupMatchPoints(awayEntry) : 0;
  return `${m.home} ${hp} pts · ${m.away} ${ap} pts`;
}

// ---------- Knockout tab ----------
function allDraftedTeams() {
  return Object.values(rawState.draw).flat();
}

function renderKnockoutTab() {
  const rounds = ["R32", "R16", "QF", "SF", "3RD", "FIN"];
  const roundLabels = { R32: "Round of 32", R16: "Round of 16", QF: "Quarter-Final", SF: "Semi-Final", "3RD": "3rd Place", FIN: "Final" };

  const pills = rounds.map(r =>
    `<button class="pill ${koRoundFilter === r ? "active" : ""}" data-koround="${r}">${roundLabels[r]}</button>`
  ).join("");

  const teams = allDraftedTeams();

  const cardsHtml = teams.map(team => {
    const owner = teamOwner(team);
    const entries = rawState.knockout[team] || [];
    const existing = entries.find(e => e.round === koRoundFilter);
    const e = existing || { round: koRoundFilter, opponent: "", goals: "", cleanSheet: false, redCards: 0, won: false };

    return `
      <div class="entry-card" data-kocard="${team}">
        <div class="entry-head">
          <div class="entry-title">${team}</div>
          <span class="entry-sub">${owner ? owner + " · " : ""}${roundLabels[koRoundFilter]}</span>
        </div>
        <div class="entry-fields">
          <div class="field">
            <label>Opponent</label>
            <input type="text" data-kofield="opponent" data-koteam="${team}" value="${e.opponent || ""}" placeholder="e.g. Brazil">
          </div>
          <div class="field">
            <label>Goals Scored</label>
            <input type="number" min="0" data-kofield="goals" data-koteam="${team}" value="${e.goals ?? ""}">
          </div>
          <div class="field">
            <label>Clean Sheet</label>
            <select data-kofield="cleanSheet" data-koteam="${team}">
              <option value="false" ${!e.cleanSheet ? "selected" : ""}>No</option>
              <option value="true" ${e.cleanSheet ? "selected" : ""}>Yes</option>
            </select>
          </div>
          <div class="field">
            <label>Red Cards</label>
            <input type="number" min="0" data-kofield="redCards" data-koteam="${team}" value="${e.redCards ?? 0}">
          </div>
          <div class="field">
            <label>Result</label>
            <select data-kofield="won" data-koteam="${team}">
              <option value="false" ${!e.won ? "selected" : ""}>Lost / N-A</option>
              <option value="true" ${e.won ? "selected" : ""}>Won (+${ROUND_POINTS[koRoundFilter]})</option>
            </select>
          </div>
        </div>
        <div class="entry-points">
          <span class="entry-sub">Match points →</span>
          <span class="pts-val">${calcKnockoutMatchPoints({ ...e, goals: Number(e.goals) || 0 })} pts</span>
        </div>
      </div>
    `;
  }).join("");

  return `
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">Knockout Stage</h2>
        <span class="section-sub">Only fill in a round once your team actually reaches it</span>
      </div>
      <div class="pill-row">${pills}</div>
      ${cardsHtml}
    </section>
  `;
}

// ---------- Rules tab ----------
function renderRulesTab() {
  const groupRows = RULES.group.map(r => `<div class="rule-line"><span>${r.label}</span><b>${r.value}</b></div>`).join("");
  const koRows = RULES.knockout.map(r => `<div class="rule-line"><span>${r.label}</span><b>${r.value}</b></div>`).join("");

  const drawRows = Object.entries(rawState.draw).map(([player, teams]) => `
    <div class="rules-card">
      <h3>${player}</h3>
      ${teams.map(t => `<div class="rule-line"><span>${t}</span></div>`).join("")}
    </div>
  `).join("");

  return `
    <section class="section">
      <div class="section-head"><h2 class="section-title">Points System</h2></div>
      <div class="rules-grid">
        <div class="rules-card"><h3>Group Stage</h3>${groupRows}</div>
        <div class="rules-card"><h3>Knockout Stage</h3>${koRows}</div>
      </div>
    </section>
    <section class="section">
      <div class="section-head"><h2 class="section-title">The Draw</h2></div>
      <div class="rules-grid">${drawRows}</div>
    </section>
  `;
}

// ---------- Data / Backup tab ----------
function renderDataTab() {
  return `
    <section class="section">
      <div class="section-head"><h2 class="section-title">Backup &amp; Sync</h2></div>
      <div class="data-bar">
        This site stores results in <b>your browser only</b> (localStorage). To share updates
        with the group, export the data after entering results and send the file to whoever
        else is updating — or paste it back in on another device to keep things in sync.
      </div>
      <div class="btn-row">
        <button class="btn" id="export-btn">Export Results (.json)</button>
        <button class="btn btn-ghost" id="import-trigger">Import Results</button>
        <button class="btn btn-ghost" id="reset-btn">Reset to Defaults</button>
      </div>
      <input type="file" id="import-file" accept="application/json" style="display:none">
      <div class="data-bar">
        <b>Current data snapshot</b> (read-only — use Export above to save a copy)
        <textarea class="json-box" readonly>${exportStateJSON(rawState)}</textarea>
      </div>
    </section>
  `;
}

// ---------- Main render ----------
function render() {
  let body = "";
  if (activeTab === "leaderboard") body = renderLeaderboard();
  else if (activeTab === "groups") body = renderGroupsTab();
  else if (activeTab === "knockout") body = renderKnockoutTab();
  else if (activeTab === "rules") body = renderRulesTab();
  else if (activeTab === "data") body = renderDataTab();

  app.innerHTML = `
    ${renderHero()}
    <div class="wrap">${body}</div>
    <div class="footer">WORLD CUP 2026 · FAMILY SWEEPSTAKE · BUILT FOR YAW, ANDY, MAX &amp; DERRICK</div>
  `;

  attachListeners();
}

// ---------- Event handling ----------
function attachListeners() {
  // Tabs
  app.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      activeTab = btn.dataset.tab;
      render();
    });
  });

  // Group filter pills
  app.querySelectorAll("[data-groupfilter]").forEach(btn => {
    btn.addEventListener("click", () => {
      groupFilter = btn.dataset.groupfilter;
      render();
    });
  });

  // KO round filter pills
  app.querySelectorAll("[data-koround]").forEach(btn => {
    btn.addEventListener("click", () => {
      koRoundFilter = btn.dataset.koround;
      render();
    });
  });

  // Match result fields
  app.querySelectorAll("[data-field]").forEach(input => {
    input.addEventListener("change", (e) => {
      const matchId = e.target.dataset.match;
      const field = e.target.dataset.field;
      let value = e.target.value;
      if (field === "homeCS" || field === "awayCS") value = value === "true";

      if (!rawState.matchResults[matchId]) rawState.matchResults[matchId] = {};
      rawState.matchResults[matchId][field] = value;
      persist();
    });
  });

  // Bonus fields
  app.querySelectorAll("[data-bonus]").forEach(sel => {
    sel.addEventListener("change", (e) => {
      const team = e.target.dataset.team;
      const field = e.target.dataset.bonus;
      const value = e.target.value === "true";
      if (!rawState.teamBonus[team]) rawState.teamBonus[team] = {};
      rawState.teamBonus[team][field] = value;
      persist();
    });
  });

  // Knockout fields
  app.querySelectorAll("[data-kofield]").forEach(input => {
    input.addEventListener("change", (e) => {
      const team = e.target.dataset.koteam;
      const field = e.target.dataset.kofield;
      let value = e.target.value;
      if (field === "cleanSheet" || field === "won") value = value === "true";

      if (!rawState.knockout[team]) rawState.knockout[team] = [];
      let entry = rawState.knockout[team].find(en => en.round === koRoundFilter);
      if (!entry) {
        entry = { round: koRoundFilter, opponent: "", goals: "", cleanSheet: false, redCards: 0, won: false };
        rawState.knockout[team].push(entry);
      }
      entry[field] = value;
      persist();
    });
  });

  // Export
  const exportBtn = document.getElementById("export-btn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const blob = new Blob([exportStateJSON(rawState)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wc2026-sweepstake-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  // Import
  const importTrigger = document.getElementById("import-trigger");
  const importFile = document.getElementById("import-file");
  if (importTrigger && importFile) {
    importTrigger.addEventListener("click", () => importFile.click());
    importFile.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          rawState = normalizeState(parsed);
          persist();
          alert("Results imported successfully.");
        } catch (err) {
          alert("Could not read that file — make sure it's a valid export from this site.");
        }
      };
      reader.readAsText(file);
    });
  }

  // Reset
  const resetBtn = document.getElementById("reset-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (confirm("This will erase all results entered on this device and restore the original draw with no results. Continue?")) {
        resetState();
        rawState = defaultState();
        render();
      }
    });
  }
}

render();
