// index.js
"use strict";

import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    collection,
    onSnapshot,
    doc,
    updateDoc,
    addDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const ACCOUNTS = [];
const CATEGORIES = [];
const TRANSACTIONS = [];

let MONTHLY_DATA = [
    { month: "Abr", income: 0, expense: 0 },
    { month: "Mai", income: 0, expense: 0 },
    { month: "Jun", income: 0, expense: 0 },
    { month: "Jul", income: 0, expense: 0 },
    { month: "Ago", income: 0, expense: 0 },
    { month: "Set", income: 0, expense: 0 }
];

const PIE_COLORS = ["#C855FF", "#FF2D6B", "#FF9F43", "#39FF14", "#00F5FF", "#FFD93D", "#FF5CB8"];

const EXP_COLORS = {
    expense: "#FF2D6B",
    income: "#39FF14"
};

const TITLES = {
    home: "Visão Geral",
    accounts: "Contas",
    categories: "Categorias",
    charts: "Análise",
    "data-db": "Configurações"
};

const DATA_DB_CONFIG = {
    accounts: {
        title: "Bancos",
        desc: "Dados das contas bancárias",
        collection: "accounts"
    },
    categories: {
        title: "Categorias",
        desc: "Categorias de entradas e saídas",
        collection: "categories"
    },
    transactions: {
        title: "Registros",
        desc: "Todos os registros financeiros",
        collection: "transactions"
    }
};

let theme = window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
let activeTab = "home";
let activeChartType = "monthly";
const systemTheme = window.matchMedia("(prefers-color-scheme: light)");
let openAccountId = null;
let dataDbOpenType = null;
let dataDbDirty = false;

let homeChartInstance = null;
let barChartInstance = null;
let pieChartInstance = null;

let unsubscribeAccounts = null;
let unsubscribeCategories = null;
let unsubscribeTransactions = null;

let currentUser = null;

const $ = (id) => document.getElementById(id);

function fmt(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function fmtDate(date) {
    if (!date) return "--";
    const parts = String(date).split("-");
    if (parts.length !== 3) return date;
    return `${parts[2]}/${parts[1]}`;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getCategory(id) {
    return CATEGORIES.find((category) => String(category.id) === String(id));
}

function getAccount(id) {
    return ACCOUNTS.find((account) => String(account.id) === String(id));
}

function txRow(tx) {
    const category = getCategory(tx.category);
    const account = getAccount(tx.account);

    const icon = category?.icon || "question";
    const color = category?.color || "#999";
    const sign = tx.type === "income" ? "+" : "-";
    const glow = tx.type === "income" ? "green-glow" : "red-glow";

    return `
        <div class="tx-row" style="padding:10px 12px">
            <div class="tx-icon" style="color:${color}">
                <i class="fas fa-${escapeHtml(icon)}"></i>
            </div>

            <div class="tx-info">
                <div class="tx-desc">${escapeHtml(tx.desc || "Sem descrição")}</div>
                <div class="tx-sub">
                    <span class="tx-cat">${escapeHtml(category?.name || "Sem categoria")}</span>
                    <span class="tx-time">${fmtDate(tx.date)} · ${escapeHtml(account?.name || "Conta")}</span>
                </div>
            </div>

            <div class="tx-amount ${glow}">
                ${sign}${fmt(Math.abs(Number(tx.amount || 0)))}
            </div>
        </div>
    `;
}

function applyTheme() {
    theme = systemTheme.matches ? "light" : "dark";

    document.body.classList.toggle("light", theme === "light");
}

systemTheme.addEventListener("change", () => {
    applyTheme();
    refreshAll();
});

function chartTextColor() {
    return document.body.classList.contains("light")
        ? "rgba(0,0,0,.55)"
        : "rgba(255,255,255,.45)";
}

function chartGridColor() {
    return document.body.classList.contains("light")
        ? "rgba(0,0,0,.06)"
        : "rgba(255,255,255,.06)";
}

function rebuildMonthlyData() {
    const months = ["Abr", "Mai", "Jun", "Jul", "Ago", "Set"];

    MONTHLY_DATA = months.map((month) => {
        const monthIndex = {
            Abr: 3,
            Mai: 4,
            Jun: 5,
            Jul: 6,
            Ago: 7,
            Set: 8
        }[month];

        let income = 0;
        let expense = 0;

        TRANSACTIONS.forEach((tx) => {
            const date = new Date(`${tx.date}T12:00:00`);
            if (date.getMonth() !== monthIndex) return;

            if (tx.type === "income") income += Number(tx.amount || 0);
            else expense += Number(tx.amount || 0);
        });

        return { month, income, expense };
    });
}

function buildHomeChart() {
    const canvas = $("homeChart");
    if (!canvas || typeof Chart === "undefined") return;

    if (homeChartInstance) homeChartInstance.destroy();

    homeChartInstance = new Chart(canvas, {
        type: "line",
        data: {
            labels: MONTHLY_DATA.map((item) => item.month),
            datasets: [
                {
                    data: MONTHLY_DATA.map((item) => item.income - item.expense),
                    borderColor: "#C855FF",
                    backgroundColor: "rgba(200,85,255,.08)",
                    fill: true,
                    tension: .38,
                    pointRadius: 2,
                    pointBackgroundColor: "#C855FF"
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: chartTextColor(), font: { size: 9 } }
                },
                y: {
                    grid: { color: chartGridColor() },
                    ticks: { color: chartTextColor(), font: { size: 8 } }
                }
            }
        }
    });
}

function buildBarChart() {
    const canvas = $("barChart");
    if (!canvas || typeof Chart === "undefined") return;

    if (barChartInstance) barChartInstance.destroy();

    barChartInstance = new Chart(canvas, {
        type: "bar",
        data: {
            labels: MONTHLY_DATA.map((item) => item.month),
            datasets: [
                {
                    label: "Entradas",
                    data: MONTHLY_DATA.map((item) => item.income),
                    backgroundColor: "#39FF14",
                    borderRadius: 5
                },
                {
                    label: "Saídas",
                    data: MONTHLY_DATA.map((item) => item.expense),
                    backgroundColor: "#FF2D6B",
                    borderRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: chartTextColor(), font: { size: 9 } }
                },
                y: {
                    grid: { color: chartGridColor() },
                    ticks: { color: chartTextColor(), font: { size: 8 } }
                }
            }
        }
    });
}

function getPieData() {
    const totals = new Map();

    TRANSACTIONS
        .filter((tx) => tx.type === "expense")
        .forEach((tx) => {
            const id = String(tx.category);
            totals.set(id, (totals.get(id) || 0) + Number(tx.amount || 0));
        });

    return [...totals.entries()]
        .map(([category, value]) => ({
            category: getCategory(category),
            value
        }))
        .filter((item) => item.category)
        .sort((a, b) => b.value - a.value);
}

function buildPieChart() {
    const canvas = $("pieChart");
    if (!canvas || typeof Chart === "undefined") return;

    const data = getPieData();

    if (pieChartInstance) pieChartInstance.destroy();

    pieChartInstance = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: data.map((item) => item.category.name),
            datasets: [{
                data: data.map((item) => item.value),
                backgroundColor: data.map((item) => item.category.color),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "68%",
            plugins: {
                legend: { display: false }
            }
        }
    });

    const total = data.reduce((sum, item) => sum + item.value, 0);

    $("pieList").innerHTML = data.length
        ? data.map((item, index) => {
            const pct = total ? (item.value / total) * 100 : 0;

            return `
                <div class="pie-row">
                    <span class="pie-dot" style="background:${item.category.color}"></span>
                    <span class="pie-icon" style="color:${item.category.color}">
                        <i class="fas fa-${escapeHtml(item.category.icon)}"></i>
                    </span>
                    <span class="pie-name">${escapeHtml(item.category.name)}</span>
                    <span class="pie-pct">${pct.toFixed(1)}%</span>
                    <span class="pie-val">${fmt(item.value)}</span>
                </div>
            `;
        }).join("")
        : `<div class="data-db-empty">Nenhuma despesa registrada.</div>`;
}

function rebuildCharts() {
    rebuildMonthlyData();
    buildHomeChart();
    buildBarChart();
    buildPieChart();
}

function renderHome() {
    const balance = ACCOUNTS.reduce((sum, account) => sum + Number(account.balance || 0), 0);
    const income = TRANSACTIONS
        .filter((tx) => tx.type === "income")
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    const expense = TRANSACTIONS
        .filter((tx) => tx.type === "expense")
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    $("totalBalance").textContent = fmt(balance);
    $("totalIncome").textContent = `+${fmt(income)}`;
    $("totalExpense").textContent = `-${fmt(expense)}`;

    const recent = [...TRANSACTIONS]
        .sort((a, b) => String(b.date).localeCompare(String(a.date)))
        .slice(0, 6);

    $("homeTxList").innerHTML = recent.length
        ? recent.map(txRow).join("")
        : `<div class="data-db-empty">Nenhum registro financeiro ainda.</div>`;

    rebuildCharts();
}

function renderAccounts() {
    const container = $("accountsList");

    if (!ACCOUNTS.length) {
        container.innerHTML = `<div class="data-db-empty">Nenhum banco cadastrado.</div>`;
        return;
    }

    container.innerHTML = ACCOUNTS.map((account) => {
        const accountTx = TRANSACTIONS.filter((tx) => String(tx.account) === String(account.id));
        const income = accountTx
            .filter((tx) => tx.type === "income")
            .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
        const expense = accountTx
            .filter((tx) => tx.type === "expense")
            .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

        const open = openAccountId === account.id;

        return `
            <div class="account-card">
                <div class="account-header" data-account-id="${escapeHtml(account.id)}">
                    <div class="account-dot-wrap" style="background:${escapeHtml(account.color || "#C855FF")}22">
                        <img
                            class="account-logo"
                            src="assets/${account.id}.png"
                            alt="${account.name} logo"
                        >
                    </div>

                    <div class="account-info">
                        <div class="account-name">${escapeHtml(account.name)}</div>
                        <div class="account-bank">${escapeHtml(account.bank || "")}</div>
                    </div>

                    <div class="account-right">
                        <div class="account-balance" style=" color:${account.color}; text-shadow:${account ? `0 0 12px ${account.color}80` : "none"} " >
                            ${fmt(account.balance)}
                        </div>
                        <div class="account-arrow">${open ? "▲" : "▼"}</div>
                    </div>
                </div>

                <div class="account-body ${open ? "open" : ""}">
                    <div class="account-stats">
                        <div class="account-stat">
                            <div class="account-stat-label">Entradas</div>
                            <div class="account-stat-val green-glow">${fmt(income)}</div>
                        </div>

                        <div class="account-stat-divider"></div>

                        <div class="account-stat">
                            <div class="account-stat-label">Saídas</div>
                            <div class="account-stat-val red-glow">${fmt(expense)}</div>
                        </div>
                    </div>

                    <div class="tx-list">
                        ${accountTx.length
                ? [...accountTx].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 5).map(txRow).join("")
                : `<div class="data-db-empty">Nenhum registro nesta conta.</div>`
            }
                    </div>
                </div>
            </div>
        `;
    }).join("");

    container.querySelectorAll(".account-header").forEach((header) => {
        header.addEventListener("click", () => {
            openAccountId = openAccountId === header.dataset.accountId
                ? null
                : header.dataset.accountId;
            renderAccounts();
        });
    });
}

function renderCategories() {
    const expenses = CATEGORIES.filter(
        (category) => category.type === "expense"
    );

    const incomes = CATEGORIES.filter(
        (category) => category.type === "income"
    );

    const expenseTotals = new Map();
    const incomeTotals = new Map();

    TRANSACTIONS.forEach((tx) => {
        const id = String(tx.category);

        const map =
            tx.type === "income"
                ? incomeTotals
                : expenseTotals;

        map.set(
            id,
            (map.get(id) || 0) + Number(tx.amount || 0)
        );
    });

    /*
     * ─────────────────────────────
     * DESPESAS
     * ─────────────────────────────
     */

    const expenseData = [...expenseTotals.entries()]
        .map(([id, total]) => ({
            category: getCategory(id),
            total
        }))
        .filter((item) => item.category && Math.abs(item.total) > 0)
        .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

    const maxExpense =
        expenseData.length
            ? Math.max(
                ...expenseData.map((item) => Math.abs(item.total)),
                1
            )
            : 1;

    const expEl = $("expenseCategories");

    expEl.style.cssText =
        "display:flex;flex-direction:column;gap:8px";

    expEl.innerHTML = expenseData
        .map((item, index) => {
            const category = item.category;
            const amount = item.total;

            /*
             * Intensidade baseada na posição.
             *
             * Primeiro = vermelho forte
             * Últimos = vermelho mais suave
             */

            const intensity =
                expenseData.length <= 1
                    ? 1
                    : 1 - (index / (expenseData.length - 1)) * 0.55;

            const red = Math.round(255 * intensity);
            const pink = Math.round(45 * intensity);
            const blue = Math.round(107 * intensity);

            const color =
                `rgb(${red}, ${pink}, ${blue})`;

            /*
             * A barra continua proporcional ao valor.
             */

            const pct =
                maxExpense > 0
                    ? (Math.abs(amount) / maxExpense) * 100
                    : 0;

            return `
                <div class="cat-row">

                    <div class="cat-top">

                        <i
                            class="cat-icon ${escapeHtml(
                category.icon || "fas fa-question"
            )}"
                            style="
                                color:${color};
                                text-shadow:0 0 7px ${color}55;
                            "
                        ></i>

                        <span class="cat-name">
                            ${escapeHtml(category.name)}
                        </span>

                        <span
                            class="cat-amount"
                            style="
                                color:${color};
                                text-shadow:0 0 8px ${color}66;
                            "
                        >
                            ${fmt(amount)}
                        </span>

                    </div>

                    <div class="cat-bar-track">

                        <div
                            class="cat-bar-fill"
                            style="
                                width:${Math.max(2, pct)}%;
                                background:${color};
                                box-shadow:0 0 6px ${color}66;
                            "
                        ></div>

                    </div>

                </div>
            `;
        })
        .join("");


    /*
     * ─────────────────────────────
     * ENTRADAS
     * ─────────────────────────────
     */

    const incomeData = [...incomeTotals.entries()]
        .map(([id, total]) => ({
            category: getCategory(id),
            total
        }))
        .filter((item) => item.category && Math.abs(item.total) > 0)
        .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

    const maxIncome =
        incomeData.length
            ? Math.max(
                ...incomeData.map((item) => item.total),
                1
            )
            : 1;

    const incEl = $("incomeCategories");

    incEl.style.cssText =
        "display:flex;flex-direction:column;gap:8px";

    incEl.innerHTML = incomeData
        .map((item, index) => {
            const category = item.category;
            const amount = item.total;

            /*
             * Maior entrada = verde mais forte.
             * As seguintes vão ficando mais suaves.
             */

            const intensity =
                incomeData.length <= 1
                    ? 1
                    : 1 - (index / (incomeData.length - 1)) * 0.45;

            const green = Math.round(255 * intensity);
            const red = Math.round(57 * intensity);
            const blue = Math.round(20 * intensity);

            const color =
                `rgb(${red}, ${green}, ${blue})`;

            const pct =
                maxIncome > 0
                    ? (amount / maxIncome) * 100
                    : 0;

            return `
                <div class="income-row">

                    <i
                        class="cat-icon ${escapeHtml(
                category.icon || "fas fa-question"
            )}"
                        style="
                            color:${color};
                            text-shadow:0 0 7px ${color}55;
                        "
                    ></i>

                    <span
                        class="cat-name"
                        style="
                            flex:1;
                            font-size:13px;
                            font-weight:500;
                            color:var(--text);
                        "
                    >
                        ${escapeHtml(category.name)}
                    </span>

                    <span
                        class="cat-amount"
                        style="
                            color:${color};
                            text-shadow:0 0 8px ${color}66;
                        "
                    >
                        +${fmt(amount)}
                    </span>

                </div>
            `;
        })
        .join("");
}

function renderCharts() {
    const monthly = $("chartMonthly");
    const pie = $("chartPie");

    monthly.style.display = activeChartType === "monthly" ? "" : "none";
    pie.style.display = activeChartType === "pie" ? "" : "none";

    document.querySelectorAll(".chart-tab").forEach((button) => {
        button.classList.toggle("active", button.dataset.chart === activeChartType);
    });

    rebuildCharts();
}

function renderDataDbFolders() {
    $("dataDbFolders").style.display = "";
    $("dataDbEditor").style.display = "none";
}

function getDataDbRecords(type) {
    if (type === "accounts") return ACCOUNTS;
    if (type === "categories") return CATEGORIES;
    if (type === "transactions") return TRANSACTIONS;
    return [];
}

function getValueType(value) {
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "boolean";
    return "text";
}

function parseEditedValue(raw, original) {
    if (typeof original === "number") {
        const normalized = String(raw).trim().replace(",", ".");
        const number = Number(normalized);
        return Number.isFinite(number) ? number : original;
    }

    if (typeof original === "boolean") {
        return String(raw).toLowerCase() === "true";
    }

    return raw;
}

function renderDataDbRecords(type) {
    const records = getDataDbRecords(type);
    const container = $("dataDbRecords");

    if (!records.length) {
        container.innerHTML = `<div class="data-db-empty">Nenhum registro encontrado.</div>`;
        return;
    }

    container.innerHTML = records.map((record, index) => {
        const fields = Object.entries(record)
            .filter(([key]) => !["createdAt", "updatedAt"].includes(key))
            .map(([key, value]) => {
                const inputType = getValueType(value) === "number" ? "number" : "text";
                const step = inputType === "number" ? 'step="0.01"' : "";

                return `
                    <div class="data-db-field">
                        <span class="data-db-key">${escapeHtml(key)}</span>
                        <input
                            class="data-db-input"
                            data-db-type="${escapeHtml(type)}"
                            data-id="${escapeHtml(record.id)}"
                            data-key="${escapeHtml(key)}"
                            data-original="${escapeHtml(JSON.stringify(value))}"
                            type="${inputType}"
                            ${step}
                            value="${escapeHtml(value)}"
                        >
                    </div>
                `;
            }).join("");

        return `
            <div class="data-db-record">
                <div class="data-db-record-head">
                    <span class="data-db-record-number">REGISTRO ${String(index + 1).padStart(2, "0")}</span>
                    <span class="data-db-record-id">${escapeHtml(record.id)}</span>
                </div>
                <div class="data-db-fields">${fields}</div>
            </div>
        `;
    }).join("");

    container.querySelectorAll(".data-db-input").forEach((input) => {
        input.addEventListener("input", handleDataDbInput);
    });
}

function setDataDbDirty(dirty) {
    dataDbDirty = dirty;

    const button = $("dataDbSave");
    button.disabled = !dirty;
    button.classList.toggle("is-dirty", dirty);
}

function handleDataDbInput(event) {
    const input = event.currentTarget;
    const type = input.dataset.dbType;
    const id = input.dataset.id;
    const key = input.dataset.key;

    const records = getDataDbRecords(type);
    const record = records.find((item) => String(item.id) === String(id));

    if (!record || key === "id") return;

    record[key] = parseEditedValue(input.value, record[key]);
    setDataDbDirty(true);
}

function openDataDbFolder(type) {
    const config = DATA_DB_CONFIG[type];
    if (!config) return;

    dataDbOpenType = type;
    dataDbDirty = false;

    $("dataDbFolders").style.display = "none";
    $("dataDbEditor").style.display = "";

    $("dataDbEditorLabel").textContent = "Banco de dados";
    $("dataDbEditorTitle").textContent = config.title;

    renderDataDbRecords(type);
    setDataDbDirty(false);
}

function closeDataDbFolder() {
    if (dataDbDirty) {
        const leave = confirm("Existem alterações não salvas. Sair mesmo assim?");
        if (!leave) return;
    }

    dataDbOpenType = null;
    setDataDbDirty(false);
    renderDataDbFolders();
}

async function saveDataDb() {
    if (!currentUser || !dataDbOpenType || !dataDbDirty) return;

    const config = DATA_DB_CONFIG[dataDbOpenType];
    const records = getDataDbRecords(dataDbOpenType);

    try {
        $("dataDbSave").disabled = true;

        for (const record of records) {
            const recordRef = doc(db, "users", currentUser.uid, config.collection, record.id);

            const cleanRecord = { ...record };
            delete cleanRecord.id;

            await updateDoc(recordRef, {
                ...cleanRecord,
                updatedAt: serverTimestamp()
            });
        }

        setDataDbDirty(false);
        renderDataDbRecords(dataDbOpenType);
        alert("Alterações salvas no Firebase.");
    } catch (error) {
        console.error(error);
        alert("Não foi possível salvar as alterações.");
        setDataDbDirty(true);
    }
}

function setTab(tab) {
    activeTab = tab;

    document.querySelectorAll(".screen").forEach((screen) => {
        screen.classList.toggle("active", screen.id === `screen-${tab}`);
    });

    document.querySelectorAll(".nav-btn").forEach((button) => {
        button.classList.toggle("active", button.dataset.tab === tab);
    });

    $("pageTitle").textContent = TITLES[tab] || "Krona";

    if (tab === "home") renderHome();
    if (tab === "accounts") renderAccounts();
    if (tab === "categories") renderCategories();
    if (tab === "charts") renderCharts();
}

function refreshAll() {
    if (activeTab === "home") renderHome();
    if (activeTab === "accounts") renderAccounts();
    if (activeTab === "categories") renderCategories();
    if (activeTab === "charts") renderCharts();

    if (activeTab === "data-db" && dataDbOpenType) {
        renderDataDbRecords(dataDbOpenType);
    }
}

function updateUserPanel(user) {
    const name = $("currentUserName");
    const email = $("currentUserEmail");

    if (name) name.textContent = user.displayName || "Usuário";
    if (email) email.textContent = user.email || "";
}

function clearLocalData() {
    ACCOUNTS.length = 0;
    CATEGORIES.length = 0;
    TRANSACTIONS.length = 0;
}

function startFirestoreListeners(user) {
    if (unsubscribeAccounts) unsubscribeAccounts();
    if (unsubscribeCategories) unsubscribeCategories();
    if (unsubscribeTransactions) unsubscribeTransactions();

    const userRef = doc(db, "users", user.uid);

    unsubscribeAccounts = onSnapshot(
        collection(userRef, "accounts"),
        (snapshot) => {
            ACCOUNTS.length = 0;

            snapshot.forEach((item) => {
                ACCOUNTS.push({
                    id: item.id,
                    ...item.data()
                });
            });

            ACCOUNTS.sort((a, b) =>
                String(a.name).localeCompare(String(b.name))
            );

            refreshAll();
        },
        (error) => console.error("accounts:", error)
    );

    unsubscribeCategories = onSnapshot(
        collection(userRef, "categories"),
        (snapshot) => {
            CATEGORIES.length = 0;

            snapshot.forEach((item) => {
                CATEGORIES.push({
                    id: item.id,
                    ...item.data()
                });
            });

            CATEGORIES.sort((a, b) =>
                Number(a.id) - Number(b.id)
            );

            refreshAll();
        },
        (error) => console.error("categories:", error)
    );

    unsubscribeTransactions = onSnapshot(
        collection(userRef, "transactions"),
        (snapshot) => {
            TRANSACTIONS.length = 0;

            snapshot.forEach((item) => {
                TRANSACTIONS.push({
                    id: item.id,
                    ...item.data()
                });
            });

            refreshAll();
        },
        (error) => console.error("transactions:", error)
    );
}

async function initApp(user) {
    currentUser = user;
    updateUserPanel(user);
    startFirestoreListeners(user);

    applyTheme();

    const now = new Date();
    $("monthLabel").textContent = now.toLocaleDateString("pt-BR", {
        month: "short",
        year: "numeric"
    }).replace(".", "")
        .replace(/^\w/, (char) => char.toUpperCase());
}

document.querySelectorAll(".nav-btn").forEach((button) => {
    button.addEventListener("click", () => setTab(button.dataset.tab));
});

document.querySelectorAll(".chart-tab").forEach((button) => {
    button.addEventListener("click", () => {
        activeChartType = button.dataset.chart;
        renderCharts();
    });
});

document.querySelectorAll(".data-db-folder").forEach((button) => {
    button.addEventListener("click", () => openDataDbFolder(button.dataset.dbType));
});

$("dataDbBack").addEventListener("click", closeDataDbFolder);
$("dataDbSave").addEventListener("click", saveDataDb);

$("addTxBtn").addEventListener("click", () => {
    alert("O próximo passo será criar o formulário real de nova transação.");
});

$("logoutBtn")?.addEventListener("click", async () => {
    if (!confirm("Sair da conta?")) return;

    await signOut(auth);
    window.location.replace("auth.html");
});

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("auth.html");
        return;
    }

    await initApp(user);
});
