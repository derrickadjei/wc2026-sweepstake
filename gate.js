// ============================================================
// GATE — simple password screen before the app loads.
// NOTE: this is a casual deterrent, not real security — for a
// static site with no backend, there is no way to truly hide a
// password check (the comparison logic has to run somewhere a
// browser can see it). Storing a SHA-256 hash instead of the
// plain password just stops anyone casually browsing the GitHub
// repo from reading the password directly off the page — it
// won't stop someone determined to find it via dev tools.
// ============================================================

// SHA-256 hash of the password (not the password itself)
const GATE_PASSWORD_HASH = "5e1b69743ba71aabd39cad31908432b8aae3841c1ac52a4afb1b6ea2a97cca16";
const GATE_STORAGE_KEY = "wc2026_gate_unlocked";

async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function isUnlocked() {
  return sessionStorage.getItem(GATE_STORAGE_KEY) === "true";
}

function unlock() {
  sessionStorage.setItem(GATE_STORAGE_KEY, "true");
}

function renderGate() {
  const gateEl = document.getElementById("gate");
  const appEl = document.getElementById("app");

  gateEl.innerHTML = `
    <div class="gate-wrap">
      <div class="gate-card">
        <p class="gate-eyebrow">⚽ Family Sweepstake · 2026</p>
        <h1 class="gate-title">WORLD CUP <span>SCOREBOARD</span></h1>
        <p class="gate-sub">Enter the password to view the leaderboard.</p>
        <form id="gate-form" autocomplete="off">
          <input
            type="password"
            id="gate-input"
            class="gate-input"
            placeholder="Password"
            autocomplete="off"
            autofocus
          >
          <button type="submit" class="btn gate-btn">Enter</button>
        </form>
        <p class="gate-error" id="gate-error" style="display:none;">That's not it — try again.</p>
      </div>
    </div>
  `;

  const form = document.getElementById("gate-form");
  const input = document.getElementById("gate-input");
  const errorMsg = document.getElementById("gate-error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const enteredHash = await sha256(input.value);
    if (enteredHash === GATE_PASSWORD_HASH) {
      unlock();
      gateEl.style.display = "none";
      appEl.style.display = "block";
    } else {
      errorMsg.style.display = "block";
      input.value = "";
      input.focus();
    }
  });
}

if (isUnlocked()) {
  document.getElementById("app").style.display = "block";
} else {
  renderGate();
}
