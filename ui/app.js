const $ = (id) => document.getElementById(id);

function shortHash(value) {
  return value ? String(value).slice(0, 12) : "—";
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char]));
}

function render(state) {
  $("stamp").textContent = state.lock?.generatedAt ? "synced" : "no lock";
  $("project").textContent = state.config?.name ?? "—";
  $("count").textContent = String(state.lock?.skills?.length ?? 0);
  $("plan").textContent = state.plan?.ready ? "READY" : state.plan?.exists ? "DRAFT" : "missing";
  $("scope").textContent = state.config?.defaults?.scope ?? "global";

  const skills = state.lock?.skills ?? [];
  $("skills").innerHTML = skills.length
    ? skills.map((skill) => `
      <tr>
        <td><strong>${esc(skill.name)}</strong></td>
        <td><code>${esc(skill.package)}</code></td>
        <td>${esc(skill.scope)}</td>
        <td><code>${esc(shortHash(skill.sha256))}</code></td>
        <td>${esc(skill.installedAt?.slice(0, 10) ?? "")}</td>
      </tr>`).join("")
    : `<tr><td colspan="5" class="empty">No pinned skills yet. Run <code>skillcrate add &lt;package&gt;</code>.</td></tr>`;

  const profiles = Object.entries(state.config?.profiles ?? {});
  $("profiles").innerHTML = profiles.length
    ? profiles.map(([name, profile]) => `
      <div class="profile">
        <strong>${esc(name)}</strong>
        <span>${esc(profile.description ?? "")}</span><br>
        <span>${(profile.skills ?? []).length} skill(s)</span>
      </div>`).join("")
    : `<div class="empty">No profiles configured.</div>`;

  $("next").textContent = [
    "skillcrate doctor",
    "skillcrate audit --strict",
    "skillcrate compose default --force",
  ].join("\n");
}

fetch("/api/state")
  .then((response) => response.json())
  .then(render)
  .catch((error) => {
    $("stamp").textContent = "error";
    $("next").textContent = String(error);
  });
