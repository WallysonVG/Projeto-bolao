const initialBets = [
  { id: createId(), brazil: 4, scotland: 0, name: "Naldo", paid: true },
  { id: createId(), brazil: 4, scotland: 1, name: "Naldo", paid: true },
  { id: createId(), brazil: 4, scotland: 2, name: "Naldo", paid: true },
  { id: createId(), brazil: 3, scotland: 1, name: "Willans", paid: true },
  { id: createId(), brazil: 2, scotland: 0, name: "Sibeli", paid: true },
  { id: createId(), brazil: 2, scotland: 1, name: "Sibeli", paid: true },
  { id: createId(), brazil: 2, scotland: 1, name: "Lucas Emanuel", paid: true },
  { id: createId(), brazil: 2, scotland: 1, name: "Ana Paula", paid: true },
  { id: createId(), brazil: 2, scotland: 1, name: "Juciara", paid: true },
  { id: createId(), brazil: 0, scotland: 1, name: "Anna", paid: true },
  { id: createId(), brazil: 2, scotland: 1, name: "Nalanda", paid: true },
  { id: createId(), brazil: 2, scotland: 0, name: "Cristina", paid: true },
  { id: createId(), brazil: 2, scotland: 1, name: "Kimberly", paid: true },
  { id: createId(), brazil: 1, scotland: 2, name: "Matos", paid: true },
  { id: createId(), brazil: 2, scotland: 0, name: "Raida", paid: true },
  { id: createId(), brazil: 3, scotland: 0, name: "Ana Pollyana", paid: true },
  { id: createId(), brazil: 2, scotland: 0, name: "Lucas Sampaio", paid: true },
  { id: createId(), brazil: 2, scotland: 0, name: "Fernando", paid: true },
  { id: createId(), brazil: 3, scotland: 1, name: "Fernando", paid: true },
  { id: createId(), brazil: 1, scotland: 0, name: "Maida", paid: true },
  { id: createId(), brazil: 5, scotland: 1, name: "Wallyson", paid: true },
  { id: createId(), brazil: 3, scotland: 0, name: "GG", paid: true },
  { id: createId(), brazil: 5, scotland: 0, name: "GG", paid: true },
  { id: createId(), brazil: 2, scotland: 2, name: "Anna", paid: true },
];

const STORAGE_KEY = "sps-saude-bolao";

const form = document.querySelector("#bet-form");
const table = document.querySelector("#bets-table");
const searchInput = document.querySelector("#search");
const statusFilter = document.querySelector("#status-filter");
const statsGrid = document.querySelector("#stats-grid");
const scoreGroups = document.querySelector("#score-groups");
const message = document.querySelector("#form-message");
const emptyRow = document.querySelector("#empty-row");
const copyButton = document.querySelector("#copy-whatsapp");
const pixKey = document.querySelector("#pix-key");

let lastPalpiteText = "";
let bets = loadBets();

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `bet-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadBets() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return initialBets;

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : initialBets;
  } catch {
    return initialBets;
  }
}

function saveBets() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bets));
}

function normalize(value) {
  return value.trim().replace(/\s+/g, " ");
}

function scoreLabel(bet) {
  return `🇧🇷${bet.brazil}x${bet.scotland}🇯🇵`;
}

function scoreChipHtml(bet) {
  return `<span class="score-flag brazil" aria-hidden="true"></span>${bet.brazil}x${bet.scotland}<span class="score-flag japan" aria-hidden="true"></span>`;
}

function buildShareText() {
  const grouped = bets
    .slice()
    .sort((a, b) => a.brazil - b.brazil || a.scotland - b.scotland)
    .reduce((acc, bet) => {
      const key = `${bet.brazil}x${bet.scotland}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(`${scoreLabel(bet)} - ${bet.name}${bet.paid ? " 💰" : " ⏳"}`);
      return acc;
    }, {});

  const list = Object.entries(grouped)
    .map(([score, items]) => `*Grupo ${score}*\n${items.join("\n")}`)
    .join("\n");

  const pageLink = window.location.href;

  return `*Lista de placar bolão SPS Saúde*\n\n${list}\n\nClique aqui para fazer seu Palpite\n${pageLink}\n\n*R$ 10,00 Chave Pix: 94992633276*\n\n*Walison Vieira Galvão / Banco Inter*\n\nSe tem Neymar eu acredito!`;
}

function filteredBets() {
  const term = normalize(searchInput.value).toLowerCase();
  const status = statusFilter.value;

  return bets
    .filter((bet) => {
      const text = `${bet.name} ${bet.brazil}x${bet.scotland}`.toLowerCase();
      const statusMatches = status === "all" || (status === "paid" ? bet.paid : !bet.paid);
      return statusMatches && text.includes(term);
    })
    .sort((a, b) => a.brazil - b.brazil || a.scotland - b.scotland);
}

function renderStats() {
  const total = bets.length;
  const paid = bets.filter((bet) => bet.paid).length;
  const pending = total - paid;
  const totalValue = paid * 10;
  const uniqueScores = new Set(bets.map((bet) => `${bet.brazil}x${bet.scotland}`)).size;

  const stats = [
    ["Palpites", total],
    ["Pagos", paid],
    ["Pendentes", pending],
    ["Arrecadado", totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })],
    ["Placares únicos", uniqueScores],
  ];

  statsGrid.innerHTML = stats
    .map(([label, value]) => `<article class="stat"><span class="muted">${label}</span><strong>${value}</strong></article>`)
    .join("");
}

function renderTable() {
  const items = filteredBets();
  table.innerHTML = "";

  if (!items.length) {
    table.append(emptyRow.content.cloneNode(true));
    return;
  }

  items.forEach((bet) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><span class="score-chip">${scoreChipHtml(bet)}</span></td>
      <td>${bet.name}</td>
      <td><span class="status-chip ${bet.paid ? "paid" : ""}">${bet.paid ? "Pago" : "Pendente"}</span></td>
      <td>
        <div class="row-actions">
          <button class="small-button" type="button" data-action="toggle" data-id="${bet.id}">${bet.paid ? "Pendente" : "Pago"}</button>
          <button class="small-button remove" type="button" data-action="remove" data-id="${bet.id}">Remover</button>
        </div>
      </td>
    `;
    table.append(row);
  });
}

function renderGroups() {
  const groups = bets.reduce((acc, bet) => {
    const key = `${bet.brazil}x${bet.scotland}`;
    acc[key] ||= [];
    acc[key].push(bet.name);
    return acc;
  }, {});

  scoreGroups.innerHTML = Object.entries(groups)
    .sort(([scoreA], [scoreB]) => {
      const [brazilA, scotlandA] = scoreA.split("x").map(Number);
      const [brazilB, scotlandB] = scoreB.split("x").map(Number);
      return brazilA - brazilB || scotlandA - scotlandB;
    })
    .map(([score, names]) => {
      const [brazil, scotland] = score.split("x");
      return `
        <article class="group-card">
          <strong>
            <span class="group-score">
              <span class="score-flag brazil" aria-hidden="true"></span>
              ${brazil} x ${scotland}
              <span class="score-flag japan" aria-hidden="true"></span>
            </span>
            <span class="group-count">${names.length}</span>
          </strong>
          <p>${names.join(", ")}</p>
        </article>
      `;
    })
    .join("");
}

function render() {
  renderStats();
  renderTable();
  renderGroups();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const name = normalize(data.get("name"));
  const brazil = Number(data.get("brazil"));
  const scotland = Number(data.get("scotland"));
  const paid = data.get("paid") === "on";

  if (!name || Number.isNaN(brazil) || Number.isNaN(scotland)) {
    message.textContent = "Preencha nome e placar para adicionar.";
    return;
  }

  const duplicate = bets.some(
    (bet) => bet.name.toLowerCase() === name.toLowerCase() && bet.brazil === brazil && bet.scotland === scotland,
  );

  if (duplicate) {
    message.textContent = "Esse nome já tem esse mesmo placar cadastrado.";
    message.dataset.copyText = "";
    message.classList.remove("clickable");
    return;
  }

  lastPalpiteText = `${scoreLabel({ brazil, scotland })} - ${name}`;
  bets.unshift({ id: createId(), name, brazil, scotland, paid });
  saveBets();
  render();
  form.reset();
  document.querySelector("#brazil").value = 2;
  document.querySelector("#scotland").value = 1;
  document.querySelector("#paid").checked = true;
  message.textContent = "Copie aqui seu Palpite e jogue no grupo da SPS GERAL";
  message.dataset.copyText = lastPalpiteText;
  message.classList.add("clickable");
});

table.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;

  if (action === "toggle") {
    bets = bets.map((bet) => (bet.id === id ? { ...bet, paid: !bet.paid } : bet));
  }

  if (action === "remove") {
    bets = bets.filter((bet) => bet.id !== id);
  }

  saveBets();
  render();
});

copyButton.addEventListener("click", async () => {
  const text = buildShareText();

  try {
    await navigator.clipboard.writeText(text);
    message.textContent = "Lista copiada para o WhatsApp.";
  } catch {
    message.textContent = "Não foi possível copiar automaticamente.";
  }
});

if (pixKey) {
  pixKey.addEventListener("click", async () => {
    const pixText = pixKey.textContent.trim();
    if (!pixText) return;

    try {
      await navigator.clipboard.writeText(pixText);
      message.textContent = "Chave Pix copiada para colar no banco.";
      message.dataset.copyText = "";
      message.classList.remove("clickable");
    } catch {
      message.textContent = "Não foi possível copiar a chave Pix.";
    }
  });
}

if (message) {
  message.addEventListener("click", async () => {
    const text = buildShareText();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      message.textContent = "Lista de palpites copiada! Cole no grupo da SPS GERAL.";
      message.classList.remove("clickable");
    } catch {
      message.textContent = "Não foi possível copiar a lista de palpites.";
    }
  });
}

searchInput.addEventListener("input", render);
statusFilter.addEventListener("change", render);

render();
