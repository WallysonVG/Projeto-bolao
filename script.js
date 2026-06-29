import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
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
const ADMIN_WHATSAPP = "5594992633276";
const STATUS_PENDING = "pendente";
const STATUS_PAID = "pago";
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
const betCounterDoc = doc(db, "settings", "betCounter");

const form = document.querySelector("#bet-form");
const table = document.querySelector("#bets-table");
const searchInput = document.querySelector("#search");
const statusFilter = document.querySelector("#status-filter");
const statsGrid = document.querySelector("#stats-grid");
const scoreGroups = document.querySelector("#score-groups");
const message = document.querySelector("#form-message");
const emptyRow = document.querySelector("#empty-row");
const pixKey = document.querySelector("#pix-key");
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

function formatBetCode(value) {
  return String(value).padStart(4, "0");
}

async function createUniqueBetCode() {
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(betCounterDoc);
    let nextValue = (snapshot.exists() ? Number(snapshot.data().lastCode) || 0 : 0) + 1;
    let code = formatBetCode(nextValue);
    let codeDoc = doc(betsCollection, code);
    let codeSnapshot = await transaction.get(codeDoc);

    while (codeSnapshot.exists()) {
      nextValue += 1;
      code = formatBetCode(nextValue);
      codeDoc = doc(betsCollection, code);
      codeSnapshot = await transaction.get(codeDoc);
    }

    transaction.set(betCounterDoc, { lastCode: nextValue, updatedAt: serverTimestamp() }, { merge: true });

    return code;
  });
}

function getBetCode(bet) {
  return bet.codigo_aposta || bet.betId || bet.id;
}

function getBetName(bet) {
  return bet.nome_usuario || bet.name;
}

function getBetStatus(bet) {
  if (bet.status) return bet.status;
  return bet.paid ? STATUS_PAID : STATUS_PENDING;
}

function isBetPaid(bet) {
  return getBetStatus(bet) === STATUS_PAID;
}

function createPalpite(brazil, scotland) {
  return `${brazil}x${scotland}`;
}

function buildBetWhatsappText(bet) {
  return [
    "Nova aposta realizada.",
    `ID da aposta: ${bet.codigo_aposta}`,
    `Usuario: ${getBetName(bet)}`,
    `Palpite: ${bet.palpite}`,
    "Status: PENDENTE",
    "Aguardando confirmacao do pagamento.",
  ].join("\n");
}

function buildBetWhatsappUrl(bet) {
  return `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(buildBetWhatsappText(bet))}`;
}

function updatePixWhatsappLink(bet) {
  if (!pixKey) return;

  pixKey.href = buildBetWhatsappUrl(bet);
  pixKey.title = "Clique para enviar os dados da aposta no WhatsApp";
}

function notifyAdmin(bet, targetWindow) {
  const url = buildBetWhatsappUrl(bet);

  if (targetWindow && !targetWindow.closed) {
    targetWindow.location.href = url;
    return;
  }

  window.open(url, "_blank", "noopener");
}

function buildBetSchemaPatch(bet, docId) {
  const patch = {};
  const code = getBetCode({ id: docId, ...bet });
  const name = getBetName(bet);
  const palpite = bet.palpite || createPalpite(bet.brazil, bet.scotland);
  const status = getBetStatus(bet);

  if (!("id" in bet)) patch.id = code;
  if (!bet.codigo_aposta) patch.codigo_aposta = code;
  if (!bet.nome_usuario) patch.nome_usuario = name;
  if (!bet.palpite) patch.palpite = palpite;
  if (!bet.status) patch.status = status;
  if (!bet.data_criacao) patch.data_criacao = bet.createdAt || null;
  if (!("data_validacao" in bet)) patch.data_validacao = isBetPaid(bet) ? bet.createdAt || null : null;

  return patch;
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
      acc[key].push(`${scoreLabel(bet)} - ${getBetName(bet)}${isBetPaid(bet) ? " 💰" : " ⏳"}`);
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
      const text = `${getBetCode(bet)} ${getBetName(bet)} ${bet.brazil}x${bet.scotland} ${getBetStatus(bet)}`.toLowerCase();
      const statusMatches = status === "all" || (status === "paid" ? isBetPaid(bet) : !isBetPaid(bet));
      return statusMatches && text.includes(term);
    })
    .sort((a, b) => a.brazil - b.brazil || a.scotland - b.scotland);
}

function renderStats() {
  const total = bets.length;
  const paid = bets.filter(isBetPaid).length;
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
    const paid = isBetPaid(bet);
    row.innerHTML = `
      <td>${getBetCode(bet)}</td>
      <td><span class="score-chip">${scoreChipHtml(bet)}</span></td>
      <td>${getBetName(bet)}</td>
      <td><span class="status-chip ${paid ? "paid" : ""}">${paid ? "Pago" : "Pendente"}</span></td>
      <td>
        ${
          isAdmin
            ? `<div class="row-actions">
                <button class="small-button" type="button" data-action="toggle" data-id="${bet.id}">${paid ? "Pendente" : "Pago"}</button>
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
  const totalPrize = bets.filter(isBetPaid).length * BET_VALUE;
  const groups = bets.reduce((acc, bet) => {
    const key = `${bet.brazil}x${bet.scotland}`;
    acc[key] ||= [];
    acc[key].push(getBetName(bet));
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
        id: bet.id,
        codigo_aposta: bet.id,
        nome_usuario: bet.name,
        palpite: createPalpite(bet.brazil, bet.scotland),
        status: bet.paid ? STATUS_PAID : STATUS_PENDING,
        data_criacao: new Date(2026, 0, index + 1),
        data_validacao: bet.paid ? new Date(2026, 0, index + 1) : null,
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
      snapshot.docs.forEach((item) => {
        const patch = buildBetSchemaPatch(item.data(), item.id);
        if (Object.keys(patch).length) {
          updateDoc(doc(betsCollection, item.id), patch).catch(console.error);
        }
      });
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

  lastPalpiteText = `${scoreLabel({ brazil, scotland })} - ${name}`;

  let adminNotificationWindow = null;

  try {
    const code = await createUniqueBetCode();
    const palpite = createPalpite(brazil, scotland);
    adminNotificationWindow = window.open("", "_blank");
    const newBet = {
      id: code,
      codigo_aposta: code,
      nome_usuario: name,
      palpite,
      status: STATUS_PENDING,
      data_criacao: serverTimestamp(),
      data_validacao: null,
      betId: code,
      name,
      brazil,
      scotland,
      paid,
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(betsCollection, code), newBet);
    updatePixWhatsappLink(newBet);
    notifyAdmin({ ...newBet, data_criacao: new Date() }, adminNotificationWindow);
    form.reset();
    document.querySelector("#brazil").value = 2;
    document.querySelector("#scotland").value = 1;
    message.textContent =
      "Seu palpite foi salvo como pendente. O WhatsApp foi aberto com ID, nome e palpite para envio do comprovante.";
    message.dataset.copyText = "";
    message.classList.remove("clickable");
  } catch (error) {
    if (adminNotificationWindow && !adminNotificationWindow.closed) {
      adminNotificationWindow.close();
    }
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
      const nextPaid = !isBetPaid(currentBet);
      await updateDoc(doc(betsCollection, id), {
        paid: nextPaid,
        status: nextPaid ? STATUS_PAID : STATUS_PENDING,
        data_validacao: nextPaid ? serverTimestamp() : null,
      });
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
