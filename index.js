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
    serverTimestamp,
    runTransaction
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


/* =========================================================
   DADOS
========================================================= */

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

const PIE_COLORS = [
    "#C855FF",
    "#FF2D6B",
    "#FF9F43",
    "#39FF14",
    "#00F5FF",
    "#FFD93D",
    "#FF5CB8"
];

const EXP_COLORS = {
    expense: "#FF2D6B",
    income: "#39FF14"
};


/* =========================================================
   CONFIGURAÇÕES
========================================================= */

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


/* =========================================================
   ESTADO
========================================================= */

let theme = window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";

let activeTab = "home";
let activeChartType = "pie";

const systemTheme =
    window.matchMedia("(prefers-color-scheme: light)");

let openAccountId = null;

let dataDbOpenType = null;
let dataDbDirty = false;
let dataDbSaving = false;
let dataDbDraft = null;

let homeChartInstance = null;
let barChartInstance = null;
let pieChartInstance = null;

let unsubscribeAccounts = null;
let unsubscribeCategories = null;
let unsubscribeTransactions = null;

let currentUser = null;


/* =========================================================
   NOVA TRANSAÇÃO - ESTADO
========================================================= */

let txSelectedAccount = null;
let txSelectedType = null;
let txSelectedCategory = null;
let txAmountCents = 0;
let txStep = 1;
let txDescriptionReady = false;


/* =========================================================
   UTILITÁRIOS
========================================================= */

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

    if (parts.length !== 3) {
        return date;
    }

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
    return CATEGORIES.find(
        (category) =>
            String(category.id) === String(id)
    );
}


function getAccount(id) {
    return ACCOUNTS.find(
        (account) =>
            String(account.id) === String(id)
    );
}


/*
 * Débito e crédito são considerados gastos
 * para gráficos, categorias e estatísticas.
 */
function isExpenseTransaction(tx) {
    return (
        tx.type === "expense" ||
        tx.type === "credit"
    );
}


/* =========================================================
   LINHA DE TRANSAÇÃO
========================================================= */

function txRow(tx) {

    const category = getCategory(tx.category);
    const account = getAccount(tx.account);

    const icon = category?.icon || "question";
    const color = category?.color || "#999";

    const isIncome =
        tx.type === "income";

    const sign =
        isIncome ? "+" : "-";

    const glow =
        isIncome
            ? "green-glow"
            : "red-glow";

    return `
        <div class="tx-row">
            <div
                class="tx-icon"
                style="color:${escapeHtml(color)}"
            >
                <i class="fas fa-${escapeHtml(icon)}"></i>
            </div>


            <div class="tx-info">

                <div class="tx-desc">
                    ${escapeHtml(
        tx.desc || category?.name || "Outros"
    )}
                </div>

                <div class="tx-sub">

                    <span class="tx-cat">
                        ${escapeHtml(
        category?.name ||
        "Sem categoria"
    )}
                    </span>

                    <span class="tx-time">
                        ${fmtDate(tx.date)}
                        ·
                        ${escapeHtml(
        account?.name ||
        "Conta"
    )}
                    </span>

                </div>

            </div>


            <div class="tx-amount ${glow}">
                ${sign}${fmt(
        Math.abs(
            Number(tx.amount || 0)
        )
    )}
            </div>

        </div>
        <div class="tx-row-divider"></div>
    `;
}


/* =========================================================
   TEMA
========================================================= */

function applyTheme() {

    theme = systemTheme.matches
        ? "light"
        : "dark";

    document.body.classList.toggle(
        "light",
        theme === "light"
    );
}


systemTheme.addEventListener(
    "change",
    () => {
        applyTheme();
        refreshAll();
    }
);


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


/* =========================================================
   DADOS MENSAIS
========================================================= */

function rebuildMonthlyData() {

    const months = [
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set"
    ];

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

            const date =
                new Date(`${tx.date}T12:00:00`);

            if (
                date.getMonth() !== monthIndex
            ) {
                return;
            }


            if (tx.type === "income") {

                income += Math.abs(
                    Number(tx.amount || 0)
                );

            } else if (
                isExpenseTransaction(tx)
            ) {

                expense += Math.abs(
                    Number(tx.amount || 0)
                );
            }

        });

        return {
            month,
            income,
            expense
        };
    });
}


/* =========================================================
   GRÁFICO HOME
========================================================= */

function buildHomeChart() {

    const canvas = $("homeChart");

    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {
        return;
    }

    if (homeChartInstance) {
        homeChartInstance.destroy();
    }

    homeChartInstance = new Chart(canvas, {

        type: "line",

        data: {

            labels:
                MONTHLY_DATA.map(
                    (item) => item.month
                ),

            datasets: [

                {
                    data:
                        MONTHLY_DATA.map(
                            (item) =>
                                item.income -
                                item.expense
                        ),

                    borderColor: "#C855FF",

                    backgroundColor:
                        "rgba(200,85,255,.08)",

                    fill: true,

                    tension: .38,

                    pointRadius: 2,

                    pointBackgroundColor:
                        "#C855FF"
                }

            ]
        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: false
                }
            },

            scales: {

                x: {

                    grid: {
                        display: false
                    },

                    ticks: {
                        color:
                            chartTextColor(),

                        font: {
                            size: 9
                        }
                    }
                },

                y: {

                    grid: {
                        color:
                            chartGridColor()
                    },

                    ticks: {
                        color:
                            chartTextColor(),

                        font: {
                            size: 8
                        }
                    }
                }
            }
        }
    });
}


/* =========================================================
   GRÁFICO DE BARRAS
========================================================= */

function buildBarChart() {

    const canvas = $("barChart");

    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {
        return;
    }

    if (barChartInstance) {
        barChartInstance.destroy();
    }

    barChartInstance = new Chart(canvas, {

        type: "bar",

        data: {

            labels:
                MONTHLY_DATA.map(
                    (item) => item.month
                ),

            datasets: [

                {
                    label: "Entradas",

                    data:
                        MONTHLY_DATA.map(
                            (item) =>
                                item.income
                        ),

                    backgroundColor:
                        "#39FF14",

                    borderRadius: 5
                },

                {
                    label: "Saídas",

                    data:
                        MONTHLY_DATA.map(
                            (item) =>
                                item.expense
                        ),

                    backgroundColor:
                        "#FF2D6B",

                    borderRadius: 5
                }

            ]
        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: false
                }
            },

            scales: {

                x: {

                    grid: {
                        display: false
                    },

                    ticks: {
                        color:
                            chartTextColor(),

                        font: {
                            size: 9
                        }
                    }
                },

                y: {

                    grid: {
                        color:
                            chartGridColor()
                    },

                    ticks: {
                        color:
                            chartTextColor(),

                        font: {
                            size: 8
                        }
                    }
                }
            }
        }
    });
}


/* =========================================================
   DADOS DO GRÁFICO DE CATEGORIAS
========================================================= */

function getPieData() {

    const totals = new Map();

    TRANSACTIONS
        .filter((tx) =>
            isExpenseTransaction(tx)
        )
        .forEach((tx) => {

            const id =
                String(tx.category);

            totals.set(
                id,
                (totals.get(id) || 0) +
                Math.abs(
                    Number(tx.amount || 0)
                )
            );

        });

    return [...totals.entries()]

        .map(([category, value]) => ({
            category:
                getCategory(category),

            value
        }))

        .filter(
            (item) => item.category
        )

        .sort(
            (a, b) =>
                b.value - a.value
        );
}


/* =========================================================
   GRÁFICO DE PIZZA
========================================================= */

function buildPieChart() {

    const canvas = $("pieChart");

    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {
        return;
    }

    const data = getPieData();

    if (pieChartInstance) {
        pieChartInstance.destroy();
    }

    pieChartInstance = new Chart(canvas, {

        type: "doughnut",

        data: {

            labels:
                data.map(
                    (item) =>
                        item.category.name
                ),

            datasets: [

                {
                    data:
                        data.map(
                            (item) =>
                                item.value
                        ),

                    backgroundColor:
                        data.map(
                            (item) =>
                                item.category.color
                        ),

                    borderWidth: 0
                }

            ]
        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            cutout: "68%",

            plugins: {

                legend: {
                    display: false
                }
            }
        }
    });


    const total =
        data.reduce(
            (sum, item) =>
                sum + item.value,
            0
        );


    $("pieList").innerHTML = data.length

        ? data.map((item) => {

            const pct =
                total
                    ? (item.value / total) * 100
                    : 0;

            return `
                <div class="pie-row">

                    <span
                        class="pie-dot"
                        style="
                            background:
                            ${escapeHtml(
                item.category.color
            )}
                        "
                    ></span>

                    <span
                        class="pie-icon"
                        style="
                            color:
                            ${escapeHtml(
                item.category.color
            )}
                        "
                    >
                        <i class="fas fa-${escapeHtml(
                item.category.icon ||
                "tag"
            )}"></i>
                    </span>

                    <span class="pie-name">
                        ${escapeHtml(
                item.category.name
            )}
                    </span>

                    <span class="pie-pct">
                        ${pct.toFixed(1)}%
                    </span>

                    <span class="pie-val">
                        ${fmt(item.value)}
                    </span>

                </div>
            `;

        }).join("")

        : `
            <div class="data-db-empty">
                Nenhuma despesa registrada.
            </div>
        `;
}


/* =========================================================
   RECONSTRUIR GRÁFICOS
========================================================= */

function rebuildCharts() {

    rebuildMonthlyData();

    buildHomeChart();

    buildBarChart();

    buildPieChart();
}


/* =========================================================
   HOME
========================================================= */

function renderHome() {

    /*
     * O saldo total vem SOMENTE dos saldos das contas.
     *
     * Crédito não reduz o saldo.
     */
    const balance =
        ACCOUNTS
            .filter((account) => Number(account.balance || 0) > 0)
            .reduce(
                (sum, account) =>
                    sum + Number(account.balance || 0),
                0
            );


    const income =
        TRANSACTIONS

            .filter(
                (tx) =>
                    tx.type === "income"
            )

            .reduce(
                (sum, tx) =>
                    sum +
                    Math.abs(
                        Number(tx.amount || 0)
                    ),
                0
            );


    const expense =
        TRANSACTIONS
            .filter((tx) => tx.type === "expense")
            .reduce(
                (sum, tx) =>
                    sum + Math.abs(Number(tx.amount || 0)),
                0
            );


    $("totalBalance").textContent =
        fmt(balance);

    $("totalIncome").textContent =
        `+${fmt(income)}`;

    $("totalExpense").textContent =
        `-${fmt(expense)}`;


    const recent =
        [...TRANSACTIONS]

            .sort(
                (a, b) =>
                    String(b.date)
                        .localeCompare(
                            String(a.date)
                        )
            )

            .slice(0, 6);


    $("homeTxList").innerHTML =
        recent.length

            ? recent
                .map(txRow)
                .join("")

            : `
                <div class="data-db-empty">
                    Nenhum registro financeiro ainda.
                </div>
            `;


    rebuildCharts();
}


/* =========================================================
   CONTAS / BANCOS
========================================================= */

function renderAccounts() {

    const container =
        $("accountsList");

    if (!ACCOUNTS.length) {

        container.innerHTML = `
            <div class="data-db-empty">
                Nenhum banco cadastrado.
            </div>
        `;

        return;
    }


    container.innerHTML =
        ACCOUNTS.map((account) => {

            const accountTx =
                TRANSACTIONS.filter(
                    (tx) =>
                        String(tx.account) ===
                        String(account.id)
                );


            const income =
                accountTx

                    .filter(
                        (tx) =>
                            tx.type === "income"
                    )

                    .reduce(
                        (sum, tx) =>
                            sum +
                            Math.abs(
                                Number(
                                    tx.amount || 0
                                )
                            ),
                        0
                    );


            const expense =
                accountTx

                    .filter((tx) =>
                        isExpenseTransaction(tx)
                    )

                    .reduce(
                        (sum, tx) =>
                            sum +
                            Math.abs(
                                Number(
                                    tx.amount || 0
                                )
                            ),
                        0
                    );


            const open =
                openAccountId ===
                account.id;


            /*
 * Saldo calculado pelos registros.
 *
 * INCOME  = entrada
 * EXPENSE = saída
 * CREDIT  = ignorado
 *
 * O sinal original do amount não importa.
 */
            const calculatedBalance =
                accountTx.reduce(
                    (balance, tx) => {

                        const amount =
                            Math.abs(
                                Number(
                                    tx.amount || 0
                                )
                            );

                        if (tx.type === "income") {
                            return balance + amount;
                        }

                        if (tx.type === "expense") {
                            return balance - amount;
                        }

                        // credit não participa do saldo
                        return balance;

                    },
                    0
                );


            /*
             * Saldo atualmente salvo no banco.
             */
            const savedBalance =
                Number(
                    account.balance || 0
                );


            /*
             * Se o saldo calculado for diferente
             * do saldo salvo, sincroniza o Firestore.
             */
            if (
                Math.abs(
                    savedBalance -
                    calculatedBalance
                ) > 0.001
            ) {

                updateDoc(
                    doc(
                        db,
                        "users",
                        auth.currentUser.uid,
                        "accounts",
                        account.id
                    ),
                    {
                        balance: calculatedBalance
                    }
                )
                    .then(() => {

                        console.log(
                            `💰 Saldo sincronizado: ${account.name}`,
                            calculatedBalance
                        );

                    })
                    .catch((error) => {

                        console.error(
                            `❌ Erro ao sincronizar saldo de ${account.name}:`,
                            error
                        );

                    });
            }


            /*
             * A interface usa imediatamente
             * o saldo calculado.
             */
            const balance =
                calculatedBalance;


            /*
 * Crédito pendente calculado pelos registros.
 *
 * Só entram:
 * - registros desta conta
 * - type === "credit"
 * - paid diferente de true
 *
 * Se paid for false ou não existir, conta.
 */
            /*
 * Crédito pendente calculado pelos registros.
 */
            const calculatedCredit =
                accountTx

                    .filter((tx) =>
                        tx.type === "credit" &&
                        tx.paid !== true
                    )

                    .reduce(
                        (sum, tx) =>
                            sum +
                            Math.abs(
                                Number(
                                    tx.amount || 0
                                )
                            ),
                        0
                    );


            /*
             * Crédito atualmente salvo no banco.
             */
            const savedCredit =
                Number(
                    account.credit || 0
                );


            /*
             * Se o valor calculado for diferente
             * do valor salvo, sincroniza o Firestore.
             */
            if (
                Math.abs(
                    savedCredit -
                    calculatedCredit
                ) > 0.001
            ) {

                updateDoc(
                    doc(
                        db,
                        "users",
                        auth.currentUser.uid,
                        "accounts",
                        account.id
                    ),
                    {
                        credit: calculatedCredit
                    }
                )
                    .then(() => {

                        console.log(
                            `💳 Crédito sincronizado: ${account.name}`,
                            calculatedCredit
                        );

                    })
                    .catch((error) => {

                        console.error(
                            `❌ Erro ao sincronizar crédito de ${account.name}:`,
                            error
                        );

                    });
            }


            /*
             * Usa o valor calculado imediatamente
             * na interface.
             */
            const credit =
                calculatedCredit;


            /*
             * Só mostra crédito se existir
             * e for diferente de zero.
             */
            const creditHtml =
                credit !== 0

                    ? `
                        <div class="account-credit">
                            ${fmt(credit)}
                        </div>
                    `

                    : "";


            return `
                <div class="account-card">

                    <div
                        class="account-header"
                        data-account-id="${escapeHtml(
                account.id
            )}"
                    >

                        <div
                            class="account-dot-wrap"
                            style="
                                background:
                                ${escapeHtml(
                account.color ||
                "#C855FF"
            )}22
                            "
                        >

                            <img
                                class="account-logo"
                                src="assets/${escapeHtml(
                account.id
            )}.png"
                                alt="${escapeHtml(
                account.name
            )} logo"
                            >

                        </div>


                        <div class="account-info">

                            <div class="account-name">
                                ${escapeHtml(
                account.name
            )}
                            </div>

                            <div class="account-bank">
                                ${escapeHtml(
                account.bank || ""
            )}
                            </div>

                        </div>


                        <div class="account-right">

                            <div
                                class="account-balance"
                                style="
                                    color:
                                    ${escapeHtml(
                account.color ||
                "#C855FF"
            )};

                                    text-shadow:
                                    0 0 12px
                                    ${escapeHtml(
                account.color ||
                "#C855FF"
            )}80;
                                "
                            >
                                ${fmt(balance)}

                                ${creditHtml}
                            </div>


                            <div class="account-arrow">
                                ${open ? "▲" : "▼"}
                            </div>

                        </div>

                    </div>


                    <div
                        class="account-body ${open ? "open" : ""
                }"
                    >

                        <div class="account-stats">

                            <div class="account-stat">

                                <div class="account-stat-label">
                                    Entradas
                                </div>

                                <div
                                    class="
                                        account-stat-val
                                        green-glow
                                    "
                                >
                                    ${fmt(income)}
                                </div>

                            </div>


                            <div
                                class="
                                    account-stat-divider
                                "
                            ></div>


                            <div class="account-stat">

                                <div class="account-stat-label">
                                    Saídas
                                </div>

                                <div
                                    class="
                                        account-stat-val
                                        red-glow
                                    "
                                >
                                    ${fmt(expense)}
                                </div>

                            </div>

                        </div>


                        <div class="tx-list-bank">

                            ${accountTx.length

                    ? [...accountTx]
                        .sort(
                            (a, b) =>
                                String(
                                    b.date
                                ).localeCompare(
                                    String(
                                        a.date
                                    )
                                )
                        )
                        .slice(0, 5)
                        .map(txRow)
                        .join("")

                    : `
                                        <div class="data-db-empty">
                                            Nenhum registro
                                            nesta conta.
                                        </div>
                                    `
                }

                        </div>

                    </div>

                </div>
            `;
        }).join("");


    container
        .querySelectorAll(".account-header")
        .forEach((header) => {

            header.addEventListener(
                "click",
                () => {

                    openAccountId =
                        openAccountId ===
                            header.dataset.accountId

                            ? null

                            : header.dataset.accountId;

                    renderAccounts();
                }
            );

        });
}


/* =========================================================
   CATEGORIAS
========================================================= */

function renderCategories() {

    const expenses =
        CATEGORIES.filter(
            (category) =>
                category.type === "expense"
        );


    const incomes =
        CATEGORIES.filter(
            (category) =>
                category.type === "income"
        );


    const expenseTotals =
        new Map();

    const incomeTotals =
        new Map();


    TRANSACTIONS.forEach((tx) => {

        const id =
            String(tx.category);


        if (tx.type === "income") {

            incomeTotals.set(
                id,
                (incomeTotals.get(id) || 0) +
                Math.abs(
                    Number(tx.amount || 0)
                )
            );

        } else if (
            isExpenseTransaction(tx)
        ) {

            expenseTotals.set(
                id,
                (expenseTotals.get(id) || 0) +
                Math.abs(
                    Number(tx.amount || 0)
                )
            );
        }

    });


    /* =====================================================
       DESPESAS
    ===================================================== */

    const expenseData =
        [...expenseTotals.entries()]

            .map(([id, total]) => ({
                category:
                    getCategory(id),

                total
            }))

            .filter(
                (item) =>
                    item.category &&
                    Math.abs(item.total) > 0
            )

            .sort(
                (a, b) =>
                    Math.abs(b.total) -
                    Math.abs(a.total)
            );


    const maxExpense =
        expenseData.length

            ? Math.max(
                ...expenseData.map(
                    (item) =>
                        Math.abs(item.total)
                ),
                1
            )

            : 1;


    const expEl =
        $("expenseCategories");


    expEl.style.cssText =
        "display:flex;flex-direction:column;gap:8px";


    expEl.innerHTML =
        expenseData
            .map((item, index) => {

                const category =
                    item.category;

                const amount =
                    item.total;


                const intensity =
                    expenseData.length <= 1

                        ? 1

                        : 1 -
                        (
                            index /
                            (
                                expenseData.length -
                                1
                            )
                        ) *
                        0.55;


                const red =
                    Math.round(
                        255 * intensity
                    );

                const pink =
                    Math.round(
                        45 * intensity
                    );

                const blue =
                    Math.round(
                        107 * intensity
                    );


                const color =
                    `rgb(${red}, ${pink}, ${blue})`;


                const pct =
                    maxExpense > 0

                        ? (
                            Math.abs(amount) /
                            maxExpense
                        ) * 100

                        : 0;


                return `
                    <div class="cat-row">

                        <div class="cat-top">

                            <i
                                class="cat-icon ${escapeHtml(
                    category.icon ||
                    "fas fa-question"
                )}"
                                style="
                                    color:${color};
                                    text-shadow:
                                    0 0 7px
                                    ${color}55;
                                "
                            ></i>


                            <span class="cat-name">
                                ${escapeHtml(
                    category.name
                )}
                            </span>


                            <span
                                class="cat-amount"
                                style="
                                    color:${color};
                                    text-shadow:
                                    0 0 8px
                                    ${color}66;
                                "
                            >
                                -${fmt(
                    Math.abs(amount)
                )}
                            </span>

                        </div>


                        <div
                            class="cat-bar-track"
                        >

                            <div
                                class="cat-bar-fill"
                                style="
                                    width:
                                    ${Math.max(
                    2,
                    pct
                )}%;

                                    background:
                                    ${color};

                                    box-shadow:
                                    0 0 6px
                                    ${color}66;
                                "
                            ></div>

                        </div>

                    </div>
                `;
            })
            .join("");


    /* =====================================================
       ENTRADAS
    ===================================================== */

    const incomeData =
        [...incomeTotals.entries()]

            .map(([id, total]) => ({
                category:
                    getCategory(id),

                total
            }))

            .filter(
                (item) =>
                    item.category &&
                    Math.abs(item.total) > 0
            )

            .sort(
                (a, b) =>
                    Math.abs(b.total) -
                    Math.abs(a.total)
            );


    const maxIncome =
        incomeData.length

            ? Math.max(
                ...incomeData.map(
                    (item) =>
                        Math.abs(item.total)
                ),
                1
            )

            : 1;


    const incEl =
        $("incomeCategories");


    incEl.style.cssText =
        "display:flex;flex-direction:column;gap:8px";


    incEl.innerHTML =
        incomeData
            .map((item, index) => {

                const category =
                    item.category;

                const amount =
                    Math.abs(item.total);


                const intensity =
                    incomeData.length <= 1

                        ? 1

                        : 1 -
                        (
                            index /
                            (
                                incomeData.length -
                                1
                            )
                        ) *
                        0.45;


                const green =
                    Math.round(
                        255 * intensity
                    );

                const red =
                    Math.round(
                        57 * intensity
                    );

                const blue =
                    Math.round(
                        20 * intensity
                    );


                const color =
                    `rgb(${red}, ${green}, ${blue})`;


                const pct =
                    maxIncome > 0

                        ? (
                            amount /
                            maxIncome
                        ) * 100

                        : 0;


                return `
                    <div class="income-row">

                        <i
                            class="cat-icon ${escapeHtml(
                    category.icon ||
                    "fas fa-question"
                )}"
                            style="
                                color:${color};
                                text-shadow:
                                0 0 7px
                                ${color}55;
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
                            ${escapeHtml(
                    category.name
                )}
                        </span>


                        <span
                            class="cat-amount"
                            style="
                                color:${color};
                                text-shadow:
                                0 0 8px
                                ${color}66;
                            "
                        >
                            +${fmt(amount)}
                        </span>

                    </div>
                `;
            })
            .join("");
}


/* =========================================================
   GRÁFICOS
========================================================= */

function renderCharts() {

    const monthly =
        $("chartMonthly");

    const pie =
        $("chartPie");


    monthly.style.display =
        activeChartType === "monthly"
            ? ""
            : "none";


    pie.style.display =
        activeChartType === "pie"
            ? ""
            : "none";


    document
        .querySelectorAll(".chart-tab")
        .forEach((button) => {

            button.classList.toggle(
                "active",
                button.dataset.chart ===
                activeChartType
            );

        });


    rebuildCharts();
}


/* =========================================================
   CONFIG / DataDb
========================================================= */

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

function getDataDbEditorRecords(type) {
    if (dataDbDraft && dataDbOpenType === type) {
        return dataDbDraft;
    }

    return getDataDbRecords(type);
}

function cloneDataDbRecords(records) {
    return records.map(record => ({
        ...record
    }));
}

function getValueType(value) {
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "boolean";

    return "text";
}

function parseEditedValue(raw, original) {
    if (typeof original === "number") {
        const normalized = String(raw)
            .trim()
            .replace(",", ".");

        const number = Number(normalized);

        return Number.isFinite(number)
            ? number
            : original;
    }

    if (typeof original === "boolean") {
        return String(raw).toLowerCase() === "true";
    }

    return raw;
}

function valueColor(color) {
    if (!color) return "#ffffff";

    const value = String(color).trim();

    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
        return value;
    }

    return "#ffffff";
}

function getAccountSelectHtml(record) {

    const currentAccount =
        getAccount(record.account);

    const selectedId =
        currentAccount
            ? currentAccount.id
            : "";

    const options =
        ACCOUNTS.map((account) => {

            const color =
                account.color ||
                "#C855FF";

            const selected =
                String(account.id) ===
                String(selectedId);

            return `
                <option
                    value="${escapeHtml(account.id)}"
                    ${selected ? "selected" : ""}
                >
                    ${escapeHtml(account.name)}
                </option>
            `;
        })
            .join("");

    return `
        <div class="data-db-field">

            <span class="data-db-key">
                account
            </span>

            <select
                class="
                    data-db-input
                    data-db-select
                    data-db-account-select
                "
                data-db-type="transactions"
                data-id="${escapeHtml(record.id)}"
                data-key="account"
            >

                <option value="" disabled>
                    Selecione um banco
                </option>

                ${options}

            </select>

        </div>
    `;
}

function renderDataDbRecords(
    type,
    records = getDataDbEditorRecords(type)
) {

    const container =
        $("dataDbRecords");


    if (!records.length) {

        container.innerHTML = `
            <div class="data-db-empty">
                Nenhum registro encontrado.
            </div>
        `;

        return;
    }


    container.innerHTML =
        records
            .map((record, index) => {

                const fields =
                    Object.entries(record)

                        .filter(([key]) =>
                            ![
                                "createdAt",
                                "updatedAt"
                            ].includes(key)
                        )

                        .map(([key, value]) => {

                            /*
                             * ID nunca deve ser alterado.
                             */
                            if (key === "id" && ("color" in record)) {
                                return `
                                    <div class="data-db-field data-db-field-id-color">

                                        <div class="data-db-field-half">
                                            <span class="data-db-key">id</span>
                                            <input
                                                class="data-db-input"
                                                type="text"
                                                value="${escapeHtml(String(value ?? ""))}"
                                                disabled
                                            >
                                        </div>

                                        <div class="data-db-field-half">
                                            <span class="data-db-key">color</span>
                                            <input
                                                class="data-db-input"
                                                type="color"
                                                data-db-type="${escapeHtml(type)}"
                                                data-id="${escapeHtml(record.id)}"
                                                data-key="color"
                                                value="${valueColor(record.color)}"
                                            >
                                        </div>

                                    </div>
                                `;
                            }

                            if (key === "color" && ("id" in record)) {
                                return "";
                            }

                            if (key === "id") {
                                return `
                                    <div class="data-db-field">
                                        <span class="data-db-key">id</span>
                                        <input
                                            class="data-db-input"
                                            type="text"
                                            value="${escapeHtml(String(value ?? ""))}"
                                            disabled
                                        >
                                    </div>
                                `;
                            }

                            if (key === "color") {
                                return;
                            }


                            /*
                             * TYPE DAS CATEGORIAS
                             *
                             * Somente income / expense.
                             */
                            if (
                                type === "categories" &&
                                key === "type"
                            ) {

                                const currentType =
                                    value === "income" ||
                                        value === "expense"
                                        ? value
                                        : "expense";


                                return `
                                    <div class="data-db-field">

                                        <span class="data-db-key">
                                            type
                                        </span>

                                        <select
                                            class="data-db-input data-db-select"
                                            data-db-type="categories"
                                            data-id="${escapeHtml(record.id)}"
                                            data-key="type"
                                        >

                                            <option
                                                value="income"
                                                ${currentType === "income" ? "selected" : ""}
                                            >
                                                income
                                            </option>

                                            <option
                                                value="expense"
                                                ${currentType === "expense" ? "selected" : ""}
                                            >
                                                expense
                                            </option>

                                        </select>

                                    </div>
                                `;
                            }


                            /*
                             * TYPE DOS REGISTROS
                             *
                             * income / expense / credit.
                             */
                            if (
                                type === "transactions" &&
                                key === "type"
                            ) {

                                const currentType =
                                    [
                                        "income",
                                        "expense",
                                        "credit"
                                    ].includes(value)
                                        ? value
                                        : "expense";


                                return `
                                    <div class="data-db-field">

                                        <span class="data-db-key">
                                            type
                                        </span>

                                        <select
                                            class="data-db-input data-db-select"
                                            data-db-type="transactions"
                                            data-id="${escapeHtml(record.id)}"
                                            data-key="type"
                                        >

                                            <option
                                                value="income"
                                                ${currentType === "income" ? "selected" : ""}
                                            >
                                                income
                                            </option>

                                            <option
                                                value="expense"
                                                ${currentType === "expense" ? "selected" : ""}
                                            >
                                                expense
                                            </option>

                                            <option
                                                value="credit"
                                                ${currentType === "credit" ? "selected" : ""}
                                            >
                                                credit
                                            </option>

                                        </select>

                                    </div>
                                `;
                            }


                            if (
                                type === "transactions" &&
                                key === "account"
                            ) {
                                return getAccountSelectHtml(record);
                            }


                            /*
                             * CATEGORY DOS REGISTROS
                             */
                            if (
                                type === "transactions" &&
                                key === "category"
                            ) {
                                return renderTransactionCategoryField(
                                    record
                                );
                            }


                            const valueType =
                                getValueType(value);


                            const inputType =
                                valueType === "number"
                                    ? "number"
                                    : "text";


                            const step =
                                inputType === "number"
                                    ? 'step="0.01"'
                                    : "";


                            return `
                                <div class="data-db-field">

                                    <span class="data-db-key">
                                        ${escapeHtml(key)}
                                    </span>

                                    <input
                                        class="data-db-input"
                                        data-db-type="${escapeHtml(type)}"
                                        data-id="${escapeHtml(record.id)}"
                                        data-key="${escapeHtml(key)}"
                                        type="${inputType}"
                                        ${step}
                                        value="${escapeHtml(value)}"
                                        autocomplete="off"
                                        spellcheck="false"
                                    >

                                </div>
                            `;
                        })
                        .join("");


                return `
                    <div
                        class="data-db-record"
                        data-record-id="${escapeHtml(record.id)}"
                    >

                        <div class="data-db-record-head">

                            <span class="data-db-record-number">
                                REGISTRO ${String(index + 1).padStart(2, "0")}
                            </span>

                            <span class="data-db-record-id">
                                ${escapeHtml(record.id)}
                            </span>

                        </div>

                        <div class="data-db-fields">
                            ${fields}
                        </div>

                    </div>
                `;
            })
            .join("");


    bindDataDbInputs();

}

function getTransactionCategories(type) {

    /*
     * Crédito também usa categorias de despesa.
     */
    const categoryType =
        type === "income"
            ? "income"
            : "expense";


    return CATEGORIES
        .filter(
            category =>
                category.type === categoryType
        )
        .sort(
            (a, b) =>
                String(a.name)
                    .localeCompare(
                        String(b.name)
                    )
        );
}


function renderTransactionCategoryField(record) {

    const type =
        record.type === "income"
            ? "income"
            : "expense";


    const categories =
        getTransactionCategories(type);


    let selectedCategory =
        categories.find(
            category =>
                String(category.id) ===
                String(record.category)
        );


    /*
     * Se a categoria atual não pertence ao tipo
     * selecionado, pega automaticamente a primeira.
     */
    if (!selectedCategory && categories.length) {

        selectedCategory =
            categories[0];

        record.category =
            selectedCategory.id;
    }


    const options =
        categories.length

            ? categories
                .map(category => {

                    const selected =
                        selectedCategory &&
                            String(category.id) ===
                            String(selectedCategory.id)
                            ? "selected"
                            : "";


                    return `
                        <option
                            value="${escapeHtml(category.id)}"
                            ${selected}
                        >
                            ${escapeHtml(category.name)}
                        </option>
                    `;
                })
                .join("")

            : `
                <option value="">
                    Nenhuma categoria disponível
                </option>
            `;


    return `
        <div class="data-db-field">

            <span class="data-db-key">
                category
            </span>

            <select
                class="data-db-input data-db-select"
                data-db-type="transactions"
                data-id="${escapeHtml(record.id)}"
                data-key="category"
            >

                ${options}

            </select>

        </div>
    `;
}

function setDataDbDirty(dirty) {
    dataDbDirty = dirty;

    const button = $("dataDbSave");

    button.disabled = !dirty || dataDbSaving;

    button.classList.toggle(
        "is-dirty",
        dirty
    );
}

function handleDataDbInput(event) {

    const input =
        event.currentTarget;


    const type =
        input.dataset.dbType;


    const id =
        input.dataset.id;


    const key =
        input.dataset.key;


    if (!dataDbDraft) {
        return;
    }


    const record =
        dataDbDraft.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!record) {
        return;
    }


    /*
     * ID é somente leitura.
     */
    if (key === "id") {
        return;
    }


    const originalValue =
        record[key];


    /*
     * SELECT
     */
    if (
        input.tagName === "SELECT"
    ) {

        record[key] =
            input.value;


        /*
         * Se mudou o TYPE do registro,
         * reconstrói o campo category.
         */
        if (
            type === "transactions" &&
            key === "type"
        ) {

            const categories =
                getTransactionCategories(
                    input.value
                );


            /*
             * Mantém a categoria se ela ainda
             * for válida para o novo tipo.
             */
            const currentCategory =
                categories.find(
                    category =>
                        String(category.id) ===
                        String(record.category)
                );


            /*
             * Caso contrário, escolhe a primeira.
             */
            if (
                currentCategory
            ) {

                record.category =
                    currentCategory.id;

            } else if (
                categories.length
            ) {

                record.category =
                    categories[0].id;

            } else {

                record.category =
                    "";
            }


            /*
             * Atualiza somente o campo category
             * deste registro.
             */
            refreshTransactionCategory(
                record
            );
        }


        setDataDbDirty(true);

        return;
    }


    /*
     * COLOR
     */
    if (
        input.type === "color"
    ) {

        record[key] =
            input.value;


        const colorLabel =
            input
                .closest(".data-db-color-wrap")
                ?.querySelector(
                    "[data-color-value]"
                );


        if (colorLabel) {

            colorLabel.textContent =
                input.value;
        }


        setDataDbDirty(true);

        return;
    }


    /*
     * INPUT NORMAL
     */
    record[key] =
        parseEditedValue(
            input.value,
            originalValue
        );


    setDataDbDirty(true);
}
function refreshTransactionCategory(record) {

    const recordElement =
        document.querySelector(
            `.data-db-record[data-record-id="${CSS.escape(String(record.id))}"]`
        );


    if (!recordElement) {
        return;
    }


    const categoryField =
        recordElement
            .querySelector(
                '[data-key="category"]'
            )
            ?.closest(
                ".data-db-field"
            );


    if (!categoryField) {
        return;
    }


    categoryField.outerHTML =
        renderTransactionCategoryField(
            record
        );


    const newSelect =
        recordElement
            .querySelector(
                '[data-key="category"]'
            );


    if (newSelect) {

        newSelect.addEventListener(
            "change",
            handleDataDbInput
        );

    }
}

function bindDataDbInputs() {

    const container =
        $("dataDbRecords");


    container
        .querySelectorAll(
            ".data-db-input"
        )
        .forEach(input => {

            const eventType =
                input.tagName === "SELECT"
                    ? "change"
                    : "input";


            input.addEventListener(
                eventType,
                handleDataDbInput
            );

        });
}

function openDataDbFolder(type) {

    const config = DATA_DB_CONFIG[type];

    if (!config) return;

    const records = getDataDbRecords(type);

    dataDbOpenType = type;
    dataDbDirty = false;
    dataDbSaving = false;

    /*
     * Cria uma cópia independente dos dados.
     *
     * O Firebase pode atualizar os arrays originais
     * sem destruir o que o usuário está editando.
     */
    dataDbDraft = cloneDataDbRecords(records);

    if (type === "transactions") {

        dataDbDraft.forEach(record => {

            const categories =
                getTransactionCategories(
                    record.type
                );


            const valid =
                categories.some(
                    category =>
                        String(category.id) ===
                        String(record.category)
                );


            if (!valid && categories.length) {

                record.category =
                    categories[0].id;

            }

        });
    }

    $("dataDbFolders").style.display = "none";
    $("dataDbEditor").style.display = "";

    $("dataDbEditorLabel").textContent =
        "Banco de dados";

    $("dataDbEditorTitle").textContent =
        config.title;

    renderDataDbRecords(
        type,
        dataDbDraft
    );

    setDataDbDirty(false);
}

function closeDataDbFolder() {

    if (dataDbDirty) {

        const leave = confirm(
            "Existem alterações não salvas. Sair mesmo assim?"
        );

        if (!leave) return;
    }

    dataDbOpenType = null;
    dataDbDirty = false;
    dataDbSaving = false;
    dataDbDraft = null;

    setDataDbDirty(false);

    renderDataDbFolders();
}

async function saveDataDb() {

    if (
        !currentUser ||
        !dataDbOpenType ||
        !dataDbDirty ||
        !dataDbDraft ||
        dataDbSaving
    ) {
        return;
    }

    const config =
        DATA_DB_CONFIG[dataDbOpenType];

    if (!config) return;

    /*
     * Congela o rascunho que será salvo.
     *
     * Assim, mesmo que algo aconteça enquanto
     * o Firebase processa os writes, o conjunto
     * enviado permanece consistente.
     */
    const draftToSave =
        cloneDataDbRecords(dataDbDraft);

    try {

        dataDbSaving = true;

        const saveButton = $("dataDbSave");

        saveButton.disabled = true;

        saveButton.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            <span>Salvando</span>
        `;

        const writes = draftToSave.map(record => {

            const recordRef = doc(
                db,
                "users",
                currentUser.uid,
                config.collection,
                record.id
            );

            const cleanRecord = {
                ...record
            };

            delete cleanRecord.id;

            return updateDoc(
                recordRef,
                {
                    ...cleanRecord,
                    updatedAt: serverTimestamp()
                }
            );
        });

        await Promise.all(writes);

        /*
         * Mantém o que acabou de ser salvo na tela
         * enquanto aguardamos o próximo snapshot.
         */
        dataDbDraft = draftToSave;

        dataDbDirty = false;

        setDataDbDirty(false);

        renderDataDbRecords(
            dataDbOpenType,
            dataDbDraft
        );

    } catch (error) {

        console.error(
            "Erro ao salvar configuração:",
            error
        );

        dataDbDirty = true;

        setDataDbDirty(true);

        alert(
            "Não foi possível salvar as alterações."
        );

    } finally {

        dataDbSaving = false;

        const saveButton = $("dataDbSave");

        saveButton.innerHTML = `
            <i class="fas fa-save"></i>
            <span>Salvar</span>
        `;

        saveButton.disabled =
            !dataDbDirty;
    }
}


/* =========================================================
   NAVEGAÇÃO
========================================================= */

function setTab(tab) {

    activeTab =
        tab;


    document
        .querySelectorAll(".screen")
        .forEach((screen) => {

            screen.classList.toggle(
                "active",
                screen.id ===
                `screen-${tab}`
            );

        });


    document
        .querySelectorAll(".nav-btn")
        .forEach((button) => {

            button.classList.toggle(
                "active",
                button.dataset.tab ===
                tab
            );

        });


    $("pageTitle").textContent =
        TITLES[tab] || "Krona";


    if (tab === "home") {
        renderHome();
        renderCharts();
    }

    if (tab === "accounts") {
        renderAccounts();
    }


}


function refreshAll() {
    renderCategories();
    
    if (activeTab === "home") {
        renderHome();
        renderCharts();
        

    }

    if (activeTab === "accounts") {
        renderAccounts();
    }




    if (
        activeTab === "data-db" &&
        dataDbOpenType &&
        !dataDbDirty &&
        !dataDbSaving
    ) {
        renderDataDbRecords(dataDbOpenType);
    }
    renderAccounts();
}


/* =========================================================
   USUÁRIO
========================================================= */

function updateUserPanel(user) {

    const name =
        $("currentUserName");

    const email =
        $("currentUserEmail");


    if (name) {

        name.textContent =
            user.displayName ||
            "Usuário";
    }


    if (email) {

        email.textContent =
            user.email ||
            "";
    }
}


/* =========================================================
   LIMPAR DADOS
========================================================= */

function clearLocalData() {

    ACCOUNTS.length = 0;

    CATEGORIES.length = 0;

    TRANSACTIONS.length = 0;
}


/* =========================================================
   FIRESTORE LISTENERS
========================================================= */

function startFirestoreListeners(user) {

    if (unsubscribeAccounts) {
        unsubscribeAccounts();
    }

    if (unsubscribeCategories) {
        unsubscribeCategories();
    }

    if (unsubscribeTransactions) {
        unsubscribeTransactions();
    }


    const userRef =
        doc(
            db,
            "users",
            user.uid
        );


    /* =====================================================
       ACCOUNTS
    ===================================================== */

    unsubscribeAccounts =
        onSnapshot(

            collection(
                userRef,
                "accounts"
            ),

            (snapshot) => {

                ACCOUNTS.length = 0;


                snapshot.forEach(
                    (item) => {

                        ACCOUNTS.push({
                            id: item.id,
                            ...item.data()
                        });

                    }
                );


                ACCOUNTS.sort(
                    (a, b) =>
                        String(a.name)
                            .localeCompare(
                                String(b.name)
                            )
                );


                refreshAll();
            },

            (error) =>
                console.error(
                    "accounts:",
                    error
                )
        );


    /* =====================================================
       CATEGORIES
    ===================================================== */

    unsubscribeCategories =
        onSnapshot(

            collection(
                userRef,
                "categories"
            ),

            (snapshot) => {

                CATEGORIES.length = 0;


                snapshot.forEach(
                    (item) => {

                        CATEGORIES.push({
                            id: item.id,
                            ...item.data()
                        });

                    }
                );


                CATEGORIES.sort(
                    (a, b) =>
                        Number(a.id) -
                        Number(b.id)
                );


                refreshAll();
            },

            (error) =>
                console.error(
                    "categories:",
                    error
                )
        );


    /* =====================================================
       TRANSACTIONS
    ===================================================== */

    unsubscribeTransactions =
        onSnapshot(

            collection(
                userRef,
                "transactions"
            ),

            (snapshot) => {

                TRANSACTIONS.length = 0;


                snapshot.forEach(
                    (item) => {

                        TRANSACTIONS.push({
                            id: item.id,
                            ...item.data()
                        });

                    }
                );


                refreshAll();
            },

            (error) =>
                console.error(
                    "transactions:",
                    error
                )
        );
}


/* =========================================================
   NOVA TRANSAÇÃO
   3 PASSOS
========================================================= */


/* =========================================================
   ABRIR MODAL
========================================================= */

function openTxModal() {

    if (!currentUser) {
        return;
    }


    txSelectedAccount =
        null;

    txSelectedType =
        null;

    txSelectedCategory =
        null;

    txAmountCents =
        0;

    txStep =
        1;

    txDescriptionReady = false;


    $("txModal")
        .classList
        .add("active");


    $("txTypeChooser").style.display =
        "none";


    $("txDescriptionWrap").style.display =
        "none";


    $("txDescription").value =
        "";


    renderTxAccounts();

    showTxStep(1);

    updateTxAmountDisplay();


    document.body.style.overflow =
        "hidden";
}


/* =========================================================
   FECHAR MODAL
========================================================= */

function closeTxModal() {

    $("txModal")
        .classList
        .remove("active");


    document.body.style.overflow =
        "";


    txSelectedAccount =
        null;

    txSelectedType =
        null;

    txSelectedCategory =
        null;

    txAmountCents =
        0;

    txStep =
        1;

    txDescriptionReady = false;
}


/* =========================================================
   TROCAR PASSO
========================================================= */

function showTxStep(step) {

    txStep =
        step;


    document
        .querySelectorAll(
            ".tx-step-content"
        )
        .forEach((element) => {

            element.classList.remove(
                "active"
            );

        });


    const steps = {

        1:
            "txStepAccount",

        2:
            "txStepAmount",

        3:
            "txStepCategory"

    };


    const titles = {

        1:
            "Novo registro",

        2:
            "Digite o valor",

        3:
            "Escolha uma categoria"

    };


    const target =
        $(steps[step]);


    if (target) {

        target.classList.add(
            "active"
        );
    }


    $("txStep").textContent =
        `${step}/3`;


    $("txModalTitle").textContent =
        titles[step];
}


/* =========================================================
   CONTAS / CARTÕES
========================================================= */

function renderTxAccounts() {

    const container =
        $("txAccounts");


    if (!ACCOUNTS.length) {

        container.innerHTML = `
            <div class="data-db-empty">
                Nenhuma conta cadastrada.
            </div>
        `;

        return;
    }


    container.innerHTML =
        ACCOUNTS.map(
            (account, index) => {

                const color =
                    account.color ||
                    "#C855FF";


                return `
                    <div class="wallet-card" data-account-id="${escapeHtml(
                    account.id
                )}"
                        style="
    --card-index:${index};

    background:
    linear-gradient(
        150deg,
        ${escapeHtml(color)} 0%,
        ${escapeHtml(color)} 52%,
        #151515 100%,
        #080808 100%
    );
"
                    >

                        <div
                            class="wallet-card-top"
                        >

                            <div
                                class="
                                    wallet-card-logo
                                "
                                style="
                                    box-shadow:
                                    0 0 25px
                                    ${escapeHtml(
                    color
                )}55
                                "
                            >

                                <img
                                    src="assets/${escapeHtml(
                    account.id
                )}.png"

                                    alt=""

                                    onerror="
                                        this.style.display='none';
                                        this.nextElementSibling.style.display='block';
                                    "
                                >


                                <i
                                    class="
                                        fas
                                        fa-university
                                    "
                                    style="
                                        display:none
                                    "
                                ></i>

                            </div>


                            <span
                                class="
                                    wallet-card-type
                                "
                            >
                                Conta
                            </span>

                        </div>


                        <div
                            class="
                                wallet-card-info
                            "
                        >

                            <div
                                class="
                                    wallet-card-name
                                "
                            >
                                ${escapeHtml(
                    account.name
                )}
                            </div>


                            <div
                                class="
                                    wallet-card-balance
                                "
                            >
                                ${fmt(
                    Number(
                        account.balance ||
                        0
                    )
                )}
                            </div>

                        </div>

                    </div>
                `;
            }
        ).join("");


    container
        .querySelectorAll(
            ".wallet-card"
        )
        .forEach((card) => {

            card.addEventListener(
                "click",
                () => {

                    const account =
                        ACCOUNTS.find(
                            (item) =>
                                String(
                                    item.id
                                ) ===
                                String(
                                    card.dataset
                                        .accountId
                                )
                        );


                    if (!account) {
                        return;
                    }


                    txSelectedAccount =
                        account;


                    /*
                     * Ao trocar de conta,
                     * limpa o tipo.
                     */
                    txSelectedType =
                        null;


                    container
                        .querySelectorAll(
                            ".wallet-card"
                        )
                        .forEach((item) => {

                            item.classList.remove(
                                "selected"
                            );

                        });


                    card.classList.add(
                        "selected"
                    );


                    /*
                     * Mostra Débito / Crédito
                     * imediatamente.
                     */
                    $("txTypeChooser").style.display =
                        "flex";
                }
            );

        });
}


/* =========================================================
   DÉBITO / CRÉDITO
========================================================= */

document
    .querySelectorAll(
        ".tx-type-btn"
    )
    .forEach((button) => {

        button.addEventListener(
            "click",
            () => {

                if (!txSelectedAccount) {

                    alert(
                        "Selecione uma conta."
                    );

                    return;
                }


                txSelectedType =
                    button.dataset.txType;


                document
                    .querySelectorAll(
                        ".tx-type-btn"
                    )
                    .forEach((item) => {

                        item.classList.remove(
                            "selected"
                        );

                    });


                button.classList.add(
                    "selected"
                );


                /*
                 * Depois de escolher
                 * Débito ou Crédito,
                 * vai para o valor.
                 */
                setTimeout(
                    () => {

                        showTxStep(2);

                        updateTxAmountDisplay();

                    },
                    180
                );
            }
        );

    });


/* =========================================================
   VALOR
========================================================= */

function updateTxAmountDisplay() {

    const value =
        txAmountCents / 100;


    $("txAmountDisplay").textContent =
        fmt(value);
}


function addTxNumber(value) {

    if (
        value ===
        "backspace"
    ) {

        txAmountCents =
            Math.floor(
                txAmountCents / 10
            );


        updateTxAmountDisplay();

        return;
    }


    if (value === "00") {

        if (
            txAmountCents === 0
        ) {
            return;
        }


        txAmountCents *= 100;

    } else {

        const digit =
            Number(value);


        if (
            !Number.isInteger(
                digit
            )
        ) {
            return;
        }


        if (
            txAmountCents >
            999999999
        ) {
            return;
        }


        txAmountCents =
            txAmountCents * 10 +
            digit;
    }


    updateTxAmountDisplay();
}


document
    .querySelectorAll(
        ".tx-keypad button"
    )
    .forEach((button) => {

        button.addEventListener(
            "click",
            () => {

                addTxNumber(
                    button.dataset.key
                );

            }
        );

    });


$("txAmountNext").addEventListener(
    "click",
    () => {

        if (!txSelectedAccount) {

            alert(
                "Selecione uma conta."
            );

            return;
        }


        if (!txSelectedType) {

            alert(
                "Selecione Débito ou Crédito."
            );

            return;
        }


        if (
            txAmountCents <= 0
        ) {

            alert(
                "Digite um valor maior que zero."
            );

            return;
        }


        renderTxCategories();

        showTxStep(3);
    }
);


/* =========================================================
   CATEGORIAS
========================================================= */

function renderTxCategories() {

    const container =
        $("txCategories");

    const nextButton =
        $("txCategoryNext");


    /*
     * Sempre começa sem categoria selecionada.
     */
    txSelectedCategory = null;

    txDescriptionReady = false;


    /*
     * Esconde a descrição inicialmente.
     */
    $("txDescriptionWrap").style.display =
        "none";


    /*
     * O botão começa bloqueado.
     */
    nextButton.disabled = true;

    nextButton.innerHTML = `
        <i class="fas fa-chevron-right"></i>
    `;


    /*
     * Tanto Débito quanto Crédito
     * usam categorias de despesa.
     */
    const categories =
        CATEGORIES
            .filter(
                (category) =>
                    category.type === "expense"
            )
            .sort(
                (a, b) =>
                    String(a.name)
                        .localeCompare(
                            String(b.name)
                        )
            );


    if (!categories.length) {

        container.innerHTML = `
            <div class="data-db-empty">
                Nenhuma categoria disponível.
            </div>
        `;

        return;
    }


    container.innerHTML =
        categories
            .map(
                (category, index) => {

                    const color =
                        category.color ||
                        "#FF2D6B";


                    return `
                        <div
                            class="
                                category-card
                            "

                            data-category-id="${escapeHtml(
                        category.id
                    )}"

                            style="
                                --card-index:${index};

                                background:
                                linear-gradient(
                                    135deg,
                                    ${escapeHtml(
                        color
                    )},
                                    #080808
                                );
                            "
                        >

                            <div
                                class="
                                    category-card-icon
                                "
                            >
                                <i
                                    class="
                                        fas
                                        fa-${escapeHtml(
                        category.icon ||
                        "tag"
                    )}
                                    "
                                ></i>
                            </div>


                            <div
                                class="
                                    category-card-name
                                "
                            >
                                ${escapeHtml(
                        category.name
                    )}
                            </div>

                        </div>
                    `;
                }
            )
            .join("");


    /*
     * Clique nas categorias.
     */
    container
        .querySelectorAll(
            ".category-card"
        )
        .forEach((card) => {

            card.addEventListener(
                "click",
                () => {

                    const category =
                        CATEGORIES.find(
                            (item) =>
                                String(
                                    item.id
                                ) ===
                                String(
                                    card.dataset
                                        .categoryId
                                )
                        );


                    if (!category) {
                        return;
                    }


                    txSelectedCategory =
                        category;


                    /*
                     * Remove seleção anterior.
                     */
                    container
                        .querySelectorAll(
                            ".category-card"
                        )
                        .forEach((item) => {

                            item.classList.remove(
                                "selected"
                            );

                        });


                    /*
                     * Seleciona a categoria atual.
                     */
                    card.classList.add(
                        "selected"
                    );


                    /*
                     * Categoria escolhida:
                     * libera o botão.
                     *
                     * IMPORTANTE:
                     * ainda não mostra a descrição.
                     */
                    nextButton.disabled =
                        false;

                    nextButton.innerHTML = `
                        <i class="fas fa-chevron-right"></i>
                    `;

                }
            );

        });
}


/* =========================================================
   ENVIAR TRANSAÇÃO
========================================================= */

async function sendTransaction() {

    if (!currentUser) {
        return;
    }


    if (!txSelectedAccount) {

        alert(
            "Selecione uma conta."
        );

        return;
    }


    if (!txSelectedType) {

        alert(
            "Selecione Débito ou Crédito."
        );

        return;
    }


    if (!txSelectedCategory) {

        alert(
            "Selecione uma categoria."
        );

        return;
    }


    if (
        txAmountCents <= 0
    ) {

        alert(
            "Digite um valor maior que zero."
        );

        return;
    }


    const amount =
        txAmountCents / 100;


    const description =
        $("txDescription")
            .value
            .trim();


    const accountRef =
        doc(
            db,
            "users",
            currentUser.uid,
            "accounts",
            txSelectedAccount.id
        );


    const transactionCollection =
        collection(
            db,
            "users",
            currentUser.uid,
            "transactions"
        );


    const transactionRef =
        doc(
            transactionCollection
        );


    const today =
        new Date();


    const date =
        today.getFullYear() +
        "-" +
        String(
            today.getMonth() + 1
        ).padStart(2, "0") +
        "-" +
        String(
            today.getDate()
        ).padStart(2, "0");


    const sendButton =
        $("txCategoryNext");


    try {

        sendButton.disabled =
            true;


        sendButton.innerHTML = `
            <i
                class="
                    fas
                    fa-spinner
                    fa-spin
                "
            ></i>

            Salvando...
        `;


        await runTransaction(
            db,
            async (transaction) => {

                /*
                 * Primeiro lê a conta atual.
                 */
                const accountSnapshot =
                    await transaction.get(
                        accountRef
                    );


                if (
                    !accountSnapshot.exists()
                ) {

                    throw new Error(
                        "Conta não encontrada."
                    );
                }


                const accountData =
                    accountSnapshot.data();


                const currentBalance =
                    Number(
                        accountData.balance ||
                        0
                    );


                const currentCredit =
                    Number(
                        accountData.credit ||
                        0
                    );


                /*
                 * O registro sempre recebe
                 * valor negativo para gastos.
                 */
                const signedAmount =
                    -amount;


                /*
                 * Dados que serão alterados
                 * na conta.
                 */
                const updates = {
                    updatedAt:
                        serverTimestamp()
                };


                /* =========================================
                   DÉBITO
                   =========================================

                   Exemplo:

                   balance = 1000
                   débito = 100

                   novo balance = 900
                */

                if (
                    txSelectedType ===
                    "expense"
                ) {

                    updates.balance =
                        currentBalance -
                        amount;
                }


                /* =========================================
                   CRÉDITO
                   =========================================

                   Exemplo:

                   credit = -300
                   compra = 100

                   novo credit = -400

                   O balance NÃO é alterado.
                */

                if (
                    txSelectedType ===
                    "credit"
                ) {

                    updates.credit =
                        currentCredit -
                        amount;
                }


                /*
                 * Cria o registro financeiro.
                 */
                transaction.set(
                    transactionRef,
                    {

                        account:
                            txSelectedAccount.id,

                        category:
                            txSelectedCategory.id,

                        type:
                            txSelectedType ===
                                "credit"

                                ? "credit"

                                : "expense",

                        amount:
                            signedAmount,

                        desc:
                            description,

                        date,

                        createdAt:
                            serverTimestamp(),

                        updatedAt:
                            serverTimestamp()
                    }
                );


                /*
                 * Atualiza a conta.
                 *
                 * Débito:
                 * balance muda.
                 *
                 * Crédito:
                 * credit muda.
                 */
                transaction.update(
                    accountRef,
                    updates
                );
            }
        );


        closeTxModal();


        $("txDescription").value =
            "";


        txAmountCents =
            0;





    } catch (error) {

        console.error(
            "Erro ao salvar transação:",
            error
        );


        alert(
            "Não foi possível salvar o registro."
        );


    } finally {

        sendButton.disabled =
            false;


        sendButton.innerHTML = `
            Enviar
            <i
                class="
                    fas
                    fa-paper-plane
                "
            ></i>
        `;
    }
}


/* =========================================================
   EVENTOS DO MODAL
========================================================= */

$("addTxBtn").addEventListener(
    "click",
    () => openTxModal()
);


$("txModalClose").addEventListener(
    "click",
    () => closeTxModal()
);


$("txModalBackdrop").addEventListener(
    "click",
    () => closeTxModal()
);


$("txCategoryNext").addEventListener(
    "click",
    async () => {

        /*
         * Não deixa avançar sem categoria.
         */
        if (!txSelectedCategory) {

            alert(
                "Selecione uma categoria."
            );

            return;
        }


        /*
         * PRIMEIRO CLIQUE
         *
         * Mostra a descrição.
         */
        if (!txDescriptionReady) {

            txDescriptionReady =
                true;


            $("txDescriptionWrap").style.display =
                "block";


            $("txCategoryNext").innerHTML = `
                Enviar
                <i class="fas fa-paper-plane"></i>
            `;


            $("txDescription").focus();

            return;
        }


        /*
         * SEGUNDO CLIQUE
         *
         * Salva no Firebase.
         */
        await sendTransaction();

    }
);


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

async function initApp(user) {

    currentUser =
        user;


    updateUserPanel(
        user
    );


    startFirestoreListeners(
        user
    );


    applyTheme();


    const now =
        new Date();


    $("monthLabel").textContent =
        now
            .toLocaleDateString(
                "pt-BR",
                {
                    month: "short",
                    year: "numeric"
                }
            )
            .replace(".", "")
            .replace(
                /^\w/,
                (char) =>
                    char.toUpperCase()
            );
}


/* =========================================================
   NAVEGAÇÃO
========================================================= */

document
    .querySelectorAll(".nav-btn")
    .forEach((button) => {

        button.addEventListener(
            "click",
            () =>
                setTab(
                    button.dataset.tab
                )
        );

    });


/* =========================================================
   ABAS DE GRÁFICO
========================================================= */




/* =========================================================
   DATA DB
========================================================= */

document
    .querySelectorAll(
        ".data-db-folder"
    )
    .forEach((button) => {

        button.addEventListener(
            "click",
            () =>
                openDataDbFolder(
                    button.dataset.dbType
                )
        );

    });


$("dataDbBack").addEventListener(
    "click",
    closeDataDbFolder
);


$("dataDbSave").addEventListener(
    "click",
    saveDataDb
);


/* =========================================================
   LOGOUT
========================================================= */

$("logoutBtn")?.addEventListener(
    "click",
    async () => {

        if (
            !confirm(
                "Sair da conta?"
            )
        ) {
            return;
        }


        await signOut(
            auth
        );


        window.location.replace(
            "auth.html"
        );
    }
);


/* =========================================================
   AUTH
========================================================= */

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.replace(
                "auth.html"
            );

            return;
        }


        await initApp(
            user
        );
    }
);






