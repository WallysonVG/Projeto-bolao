import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const initialBets = [
  { id: "initial-001", brazil: 4, scotland: 0, name: "Naldo", paid: true },
  { id: "initial-002", brazil: 4, scotland: 1, name: "Naldo", paid: true },
  { id: "initial-003", brazil: 4, scotland: 2, name: "Naldo", paid: true },
  { id: "initial-004", brazil: 3, scotland: 1, name: "Willans", paid: true },
  { id: "initial-005", brazil: 2, scotland: 0, name: "Sibeli", paid: true },
  { id: "initial-006", brazil: 2, scotland: 1, name: "Sibeli", paid: true },
  { id: "initial-007", brazil: 2, scotland: 1, name: "Lucas Emanuel", paid: true },
  { id: "initial-008", brazil: 2, scotland: 1, name: "Ana Paula", paid: true },
  { id: "initial-009", brazil: 2, scotland: 1, name: "Juciara", paid: true },
  { id: "initial-010", brazil: 0, scotland: 1, name: "Anna", paid: true },
  { id: "initial-011", brazil: 2, scotland: 1, name: "Nalanda", paid: true },
  { id: "initial-012", brazil: 2, scotland: 0, name: "Cristina", paid: true },
  { id: "initial-013", brazil: 2, scotland: 1, name: "Kimberly", paid: true },
  { id: "initial-014", brazil: 1, scotland: 2, name: "Matos", paid: true },
  { id: "initial-015", brazil: 2, scotland: 0, name: "Raida", paid: true },
  { id: "initial-016", brazil: 3, scotland: 0, name: "Ana Pollyana", paid: true },
  { id: "initial-017", brazil: 2, scotland: 0, name: "Lucas Sampaio", paid: true },
  { id: "initial-018", brazil: 2, scotland: 0, name: "Fernando", paid: true },
  { id: "initial-019", brazil: 3, scotland: 1, name: "Fernando", paid: true },
  { id: "initial-020", brazil: 1, scotland: 0, name: "Maida", paid: true },
  { id: "initial-021", brazil: 5, scotland: 1, name: "Wallyson", paid: true },
  { id: "initial-022", brazil: 3, scotland: 0, name: "GG", paid: true },
  { id: "initial-023", brazil: 5, scotland: 0, name: "GG", paid: true },
  { id: "initial-024", brazil: 2, scotland: 2, name: "Anna", paid: true },
];

const ADMIN_SESSION_KEY = "sps-saude-bolao-admin";
const SITE_LINK = "https://wallysonvg.github.io/Projeto-bolao/";
const BET_VALUE = 10;
const ADMIN_PASSWORD = "Wvg569645";
const firebaseConfig = {
  apiKey: "AIzaSyDolWd39yw26GA6k3TFsoO7LU0BlsH-L8k",
  authDomain: "projeto-bolao-3e431.firebaseapp.com",
  projectId: "projeto-bolao-3e431",
  storageBucket: "projeto-bolao-3e431.firebasestorage.app",
  messagingSenderId: "249211270979",
  appId: "1:249211270979:web:3dde4e2656f8fc6fcbe1f6",
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const betsCollection = collection(db, "bets");
const betsQuery = query(betsCollection, orderBy("createdAt", "desc"));

const form = document.querySelector("#bet-form");
const table = document.querySelector("#bets-table");
const searchInput = document.querySelector("#search");
const statusFilter = document.querySelector("#status-filter");
const statsGrid = document.querySelector("#stats-grid");
const scoreGroups = document.querySelector("#score-groups");
const message = document.querySelector("#form-message");
const emptyRow = document.querySelector("#empty-row");
const copyButton = document.querySelector("#copy-whatsapp");
const adminForm = document.querySelector("#admin-form");
const adminPassword = document.querySelector("#admin-password");
const adminMessage = document.querySelector("#admin-message");
const adminLogout = document.querySelector("#admin-logout");

let lastPalpiteText = "";
let bets = [];
let isAdmin = localStorage.getItem(ADMIN_SESSION_KEY) === "true";

function normalize(value) {
  return value.trim().replace(/\s+/g, " ");
}

function scoreLabel(bet) {
  return `🇧🇷${bet.brazil}x${bet.scotland}🇯🇵`;
}

function scoreChipHtml(bet) {
  return `<span class="score-flag brazil" aria-hidden="true"></span>${bet.brazil}x${bet.scotland}<span class="score-flag japan" aria-hidden="true"></span>`;
}

function formatCurrency(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function renderAdminState() {
  document.body.classList.toggle("is-admin", isAdmin);
  adminLogout.hidden = !isAdmin;
  adminPassword.hidden = isAdmin;

  if (isAdmin) {
    adminMessage.textContent = "Adm conectado.";
    adminPassword.value = "";
  } else {
    adminMessage.textContent = "Entre como adm para confirmar pagamento ou remover.";
  }
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

  const pageLink = SITE_LINK;

  return `*Lista de placar bolão SPS Saúde*\n\n${list}\n\nClique aqui para fazer seu Palpite 👇\n${pageLink}\n\n*R$ 10,00 Chave Pix: 94992633276*\n\n*Walison Vieira Galvão / Banco Inter*\n\nSe tem Neymar eu acredito!`;
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
  const totalValue = paid * BET_VALUE;
  const uniqueScores = new Set(bets.map((bet) => `${bet.brazil}x${bet.scotland}`)).size;

  const stats = [
    ["Palpites", total],
    ["Pagos", paid],
    ["Pendentes", pending],
    ["Arrecadado", formatCurrency(totalValue)],
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
        ${
          isAdmin
            ? `<div class="row-actions">
                <button class="small-button" type="button" data-action="toggle" data-id="${bet.id}">${bet.paid ? "Pendente" : "Pago"}</button>
                <button class="small-button remove" type="button" data-action="remove" data-id="${bet.id}">Remover</button>
              </div>`
            : ""
        }
      </td>
    `;
    table.append(row);
  });
}

function renderGroups() {
  const totalPrize = bets.filter((bet) => bet.paid).length * BET_VALUE;
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
      const groupValue = formatCurrency(totalPrize / names.length);
      return `
        <article class="group-card">
          <strong>
            <span class="group-score">
              <span class="score-flag brazil" aria-hidden="true"></span>
              ${brazil} x ${scotland}
              <span class="score-flag japan" aria-hidden="true"></span>
            </span>
            <span class="group-meta">
              <span class="group-count">${names.length}</span>
              <span class="group-value">${groupValue} cada</span>
            </span>
          </strong>
          <p>${names.join(", ")}</p>
        </article>
      `;
    })
    .join("");
}

function render() {
  renderAdminState();
  renderStats();
  renderTable();
  renderGroups();
}

async function seedInitialBetsIfEmpty() {
  const snapshot = await getDocs(betsCollection);
  if (!snapshot.empty) return;

  await Promise.all(
    initialBets.map((bet, index) =>
      setDoc(doc(betsCollection, bet.id), {
        brazil: bet.brazil,
        scotland: bet.scotland,
        name: bet.name,
        paid: bet.paid,
        createdAt: new Date(2026, 0, index + 1),
      }),
    ),
  );
}

function listenToBets() {
  onSnapshot(
    betsQuery,
    (snapshot) => {
      bets = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      render();
    },
    (error) => {
      console.error(error);
      message.textContent = "Não foi possível carregar os palpites online.";
    },
  );
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const name = normalize(data.get("name"));
  const brazil = Number(data.get("brazil"));
  const scotland = Number(data.get("scotland"));
  const paid = false;

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

  try {
    await addDoc(betsCollection, { name, brazil, scotland, paid, createdAt: serverTimestamp() });
    form.reset();
    document.querySelector("#brazil").value = 2;
    document.querySelector("#scotland").value = 1;
    message.textContent =
      "Clique no número abaixo e envie seu comprovante para análise. Assim que o pagamento for confirmado seu palpite constará na lista de apsotas.";
    message.dataset.copyText = "";
    message.classList.remove("clickable");
  } catch (error) {
    console.error(error);
    message.textContent = "Não foi possível salvar seu palpite. Tente novamente.";
  }
});

table.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (!isAdmin) return;

  const id = button.dataset.id;
  const action = button.dataset.action;
  const currentBet = bets.find((bet) => bet.id === id);
  if (!currentBet) return;

  try {
    if (action === "toggle") {
      await updateDoc(doc(betsCollection, id), { paid: !currentBet.paid });
    }

    if (action === "remove") {
      await deleteDoc(doc(betsCollection, id));
    }
  } catch (error) {
    console.error(error);
    message.textContent = "Não foi possível atualizar esse palpite.";
  }
});

adminForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const password = adminPassword.value.trim();

  if (password !== ADMIN_PASSWORD) {
    adminMessage.textContent = "Senha adm incorreta.";
    return;
  }

  isAdmin = true;
  localStorage.setItem(ADMIN_SESSION_KEY, "true");
  render();
});

adminLogout.addEventListener("click", () => {
  isAdmin = false;
  localStorage.removeItem(ADMIN_SESSION_KEY);
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

if (message) {
  message.addEventListener("click", async () => {
    if (!message.classList.contains("clickable")) return;

    const text = message.dataset.copyText;
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      message.textContent = "Palpite copiado.";
      message.classList.remove("clickable");
    } catch {
      message.textContent = "Não foi possível copiar o palpite.";
    }
  });
}

searchInput.addEventListener("input", render);
statusFilter.addEventListener("change", render);

render();

seedInitialBetsIfEmpty()
  .then(listenToBets)
  .catch((error) => {
    console.error(error);
    message.textContent = "Não foi possível conectar ao Firebase.";
  });
