"use strict";


const ACCOUNTS = [
    {
        id: "nubank",
        name: "Nubank",
        bank: "Nu Pagamentos S.A.",
        balance: 275.50,
        color: "#C855FF"
    },

    {
        id: "itau",
        name: "Itaú",
        bank: "Banco Itaú S.A.",
        balance: 478.00,
        color: "#ff8800"
    },

    {
        id: "mp",
        name: "MercadoPago",
        bank: "Banco Mercado Pago S.A.",
        balance: 100.30,
        color: "#ffffff"
    }
];


/* ── Categorias ── */

const CATEGORIES = [

    {
        id: "0",
        name: "Outros",
        type: "expense",
        icon: "fas fa-question",
        color: "#808080"
    },

    {
        id: "1",
        name: "Salário",
        type: "income",
        icon: "fas fa-dollar-sign",
        color: "#39FF14"
    },

    {
        id: "2",
        name: "Freelance",
        type: "income",
        icon: "fas fa-laptop",
        color: "#FF2D6B"
    },

    {
        id: "3",
        name: "Alimentação",
        type: "expense",
        icon: "fas fa-utensils",
        color: "#FF8C00"
    },

    {
        id: "4",
        name: "Transporte",
        type: "expense",
        icon: "fas fa-car",
        color: "#FF8C00"
    },

    {
        id: "5",
        name: "Streaming",
        type: "expense",
        icon: "fas fa-tv",
        color: "#FF6BB0"
    },

    {
        id: "6",
        name: "Saúde",
        type: "expense",
        icon: "fas fa-heart",
        color: "#7B61FF"
    },

    {
        id: "7",
        name: "Moradia",
        type: "expense",
        icon: "fas fa-home",
        color: "#FFD700"
    },

    {
        id: "8",
        name: "Vestuário",
        type: "expense",
        icon: "fas fa-tshirt",
        color: "#FF69B4"
    },

    {
        id: "9",
        name: "Investimentos",
        type: "income",
        icon: "fas fa-chart-line",
        color: "#1E90FF"
    },

    {
        id: "10",
        name: "Lazer",
        type: "expense",
        icon: "fas fa-gamepad",
        color: "#32CD32"
    }

];


/* ── Registros ── */

const TRANSACTIONS = [

    {
        id: "t1",
        account: "nubank",
        type: "income",
        category: "1",
        amount: 2300,
        date: "2024-04-05",
        desc: "Salário de Abril"
    },

    {
        id: "t2",
        account: "itau",
        type: "income",
        category: "2",
        amount: 600,
        date: "2024-05-12",
        desc: "Projeto Freelance"
    },

    {
        id: "t3",
        account: "mp",
        type: "expense",
        category: "3",
        amount: -500,
        date: "2024-04-10",
        desc: "Supermercado"
    },

    {
        id: "t4",
        account: "nubank",
        type: "expense",
        category: "4",
        amount: -50,
        date: "2024-05-15",
        desc: "Combustível"
    },

    {
        id: "t5",
        account: "itau",
        type: "expense",
        category: "5",
        amount: -25.00,
        date: "2024-06-20",
        desc: "Netflix"
    },

    {
        id: "t7",
        account: "itau",
        type: "income",
        category: "9",
        amount: 130.57,
        date: "2024-09-15",
        desc: "Cripto"
    },

    {
        id: "t6",
        account: "nubank",
        type: "expense",
        category: "4",
        amount: -50,
        date: "2024-09-16",
        desc: "Combustível"
    },

    {
        id: "t8",
        account: "nubank",
        type: "expense",
        category: "7",
        amount: -500,
        date: "2024-08-10",
        desc: "Aluguel"
    }

];


const MONTHLY_DATA = [

    {
        month: "Abr",
        income: 6200,
        expense: 3100
    },

    {
        month: "Mai",
        income: 7100,
        expense: 3800
    },

    {
        month: "Jun",
        income: 6500,
        expense: 4200
    },

    {
        month: "Jul",
        income: 7800,
        expense: 3600
    },

    {
        month: "Ago",
        income: 6900,
        expense: 4100
    },

    {
        month: "Set",
        income: 8040,
        expense: 2568.90
    }

];


const ICONS = {

    "Salário": "💼",
    "Freelance": "💻",
    "Alimentação": "🍔",
    "Transporte": "🚗",
    "Streaming": "📺",
    "Saúde": "💊",
    "Moradia": "🏠",
    "Vestuário": "👗",
    "Lazer": "🎮",
    "Investimentos": "📈"

};


const PIE_COLORS = [
    "#C855FF",
    "#FF2D6B",
    "#39FF14",
    "#00F5FF",
    "#FF8C00",
    "#FF6BB0",
    "#7B61FF"
];


const EXP_COLORS = [
    "#FF2D6B",
    "#FF6B9D",
    "#FF8FB1",
    "#FFB3C6",
    "#FFD6E0",
    "#FFEEF2"
];


const fmt = n =>
    new Intl.NumberFormat(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    ).format(Math.abs(n));


let theme = "dark";

let activeTab = "home";

let activeChartType = "monthly";

let openAccountId = null;

let homeChartInst = null;

let barChartInst = null;

let pieChartInst = null;


/* ── Data DB ── */

let dataDbOpenType = null;

let dataDbDirty = false;


const DATA_DB_CONFIG = {

    accounts: {

        title: "Bancos",

        label: "Data DB / Bancos",

        source: () => ACCOUNTS

    },

    categories: {

        title: "Categorias",

        label: "Data DB / Categorias",

        source: () => CATEGORIES

    },

    transactions: {

        title: "Registros",

        label: "Data DB / Registros",

        source: () => TRANSACTIONS

    }

};


/* ── Theme ── */

function applyTheme() {

    document.body.classList.toggle(
        "dark",
        theme === "dark"
    );

    document.body.classList.toggle(
        "light",
        theme === "light"
    );

    document.getElementById(
        "themeToggle"
    ).textContent =
        theme === "dark"
            ? "☀️"
            : "🌑";

    rebuildCharts();

    if (
        activeTab === "data-db" &&
        dataDbOpenType
    ) {
        renderDataDbRecords();
    }

}


/* ── Chart color helpers ── */

function cc() {

    const d = theme === "dark";

    return {

        grid:
            d
                ? "rgba(255,255,255,0.04)"
                : "rgba(0,0,0,0.05)",

        tick:
            d
                ? "rgba(255,255,255,0.3)"
                : "#9ca3af",

        tbg:
            d
                ? "#111"
                : "#fff",

        tbor:
            d
                ? "rgba(255,255,255,0.1)"
                : "#e5e7eb",

        tcol:
            d
                ? "#fff"
                : "#111",

        tsub:
            d
                ? "rgba(255,255,255,0.4)"
                : "#9ca3af"

    };

}


function tooltip(
    chart,
    tooltip,
    id,
    buildHtml
) {

    let el =
        document.getElementById(id);

    if (!el) {

        el =
            document.createElement("div");

        el.id = id;

        el.style.cssText =
            "position:absolute;pointer-events:none;z-index:50;transition:opacity .1s";

        chart.canvas.parentNode.style.position =
            "relative";

        chart.canvas.parentNode.appendChild(el);

    }

    if (tooltip.opacity === 0) {

        el.style.opacity = 0;

        return;

    }

    el.innerHTML =
        buildHtml(tooltip);

    el.style.opacity = 1;

    el.style.left =
        tooltip.caretX + "px";

    el.style.top =
        tooltip.caretY - 10 + "px";

}


function ttWrap(label, inner) {

    const c = cc();

    return `
        <div style="
            background:${c.tbg};
            border:1px solid ${c.tbor};
            border-radius:10px;
            padding:8px 12px;
            font-family:'Orbitron',monospace;
            font-size:11px;
            color:${c.tcol}
        ">

            <div style="
                font-family:'Outfit',sans-serif;
                font-size:10px;
                color:${c.tsub};
                margin-bottom:4px
            ">
                ${label}
            </div>

            ${inner}

        </div>
    `;

}


/* ── Home chart ── */

function buildHomeChart() {

    const canvas =
        document.getElementById(
            "homeChart"
        );

    if (!canvas) return;

    if (homeChartInst) {

        homeChartInst.destroy();

        homeChartInst = null;

    }

    const c = cc();

    homeChartInst =
        new Chart(
            canvas,
            {

                type: "line",

                data: {

                    labels:
                        MONTHLY_DATA.map(
                            d => d.month
                        ),

                    datasets: [

                        {

                            label: "Entradas",

                            data:
                                MONTHLY_DATA.map(
                                    d => d.income
                                ),

                            borderColor:
                                "#39FF14",

                            borderWidth: 2,

                            fill: true,

                            backgroundColor:
                                "rgba(57,255,20,0.08)",

                            tension: 0.4,

                            pointRadius: 0

                        },

                        {

                            label: "Saídas",

                            data:
                                MONTHLY_DATA.map(
                                    d => d.expense
                                ),

                            borderColor:
                                "#FF2D6B",

                            borderWidth: 2,

                            fill: true,

                            backgroundColor:
                                "rgba(255,45,107,0.08)",

                            tension: 0.4,

                            pointRadius: 0

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            display: false
                        },

                        tooltip: {

                            enabled: false,

                            external({
                                chart: ch,
                                tooltip: tt
                            }) {

                                tooltip(
                                    ch,
                                    tt,
                                    "tt-home",

                                    t =>
                                        ttWrap(
                                            t.title[0] ?? "",

                                            t.dataPoints
                                                .map(
                                                    p =>
                                                        `<div style="color:${p.dataset.borderColor}">
                                                            ${fmt(p.raw)}
                                                        </div>`
                                                )
                                                .join("")
                                        )
                                );

                            }

                        }

                    },

                    scales: {

                        x: {

                            grid: {
                                display: false
                            },

                            ticks: {

                                color: c.tick,

                                font: {
                                    family: "Outfit",
                                    size: 10
                                }

                            },

                            border: {
                                display: false
                            }

                        },

                        y: {
                            display: false
                        }

                    }

                }

            }
        );

}


/* ── Bar chart ── */

function buildBarChart() {

    const canvas =
        document.getElementById(
            "barChart"
        );

    if (!canvas) return;

    if (barChartInst) {

        barChartInst.destroy();

        barChartInst = null;

    }

    const c = cc();

    const d =
        theme === "dark";

    barChartInst =
        new Chart(
            canvas,
            {

                type: "bar",

                data: {

                    labels:
                        MONTHLY_DATA.map(
                            d => d.month
                        ),

                    datasets: [

                        {

                            label: "income",

                            data:
                                MONTHLY_DATA.map(
                                    d => d.income
                                ),

                            backgroundColor:
                                "#39FF14",

                            borderRadius: 4,

                            borderSkipped:
                                "bottom",

                            hoverBackgroundColor:
                                d
                                    ? "#5fff3a"
                                    : "#39FF14"

                        },

                        {

                            label: "expense",

                            data:
                                MONTHLY_DATA.map(
                                    d => d.expense
                                ),

                            backgroundColor:
                                "#FF2D6B",

                            borderRadius: 4,

                            borderSkipped:
                                "bottom",

                            hoverBackgroundColor:
                                d
                                    ? "#ff5588"
                                    : "#FF2D6B"

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            display: false
                        },

                        tooltip: {

                            enabled: false,

                            external({
                                chart: ch,
                                tooltip: tt
                            }) {

                                tooltip(
                                    ch,
                                    tt,
                                    "tt-bar",

                                    t =>
                                        ttWrap(
                                            t.title[0] ?? "",

                                            t.dataPoints
                                                .map(
                                                    p =>
                                                        `<div style="color:${p.dataset.backgroundColor}">
                                                            ${p.dataset.label === "income" ? "+" : "-"}${fmt(p.raw)}
                                                        </div>`
                                                )
                                                .join("")
                                        )
                                );

                            }

                        }

                    },

                    scales: {

                        x: {

                            grid: {
                                display: false
                            },

                            ticks: {

                                color: c.tick,

                                font: {
                                    family: "Outfit",
                                    size: 10
                                }

                            },

                            border: {
                                display: false
                            }

                        },

                        y: {

                            grid: {
                                color: c.grid
                            },

                            ticks: {

                                color: c.tick,

                                font: {
                                    family: "Outfit",
                                    size: 9
                                },

                                callback:
                                    v =>
                                        v >= 1000
                                            ? `${v / 1000}k`
                                            : v

                            },

                            border: {
                                display: false
                            }

                        }

                    }

                }

            }
        );

}


/* ── Pie chart ── */

function getPieData() {

    const map = {};

    TRANSACTIONS
        .filter(
            t => t.type === "expense"
        )
        .forEach(
            tx => {

                map[tx.category] =
                    (map[tx.category] ?? 0) +
                    Math.abs(tx.amount);

            }
        );

    return Object
        .entries(map)
        .map(
            ([categoryId, value]) => ({

                categoryId,

                name:
                    CATEGORIES.find(
                        c => c.id === categoryId
                    )?.name ??
                    "Desconhecida",

                value

            })
        )
        .sort(
            (a, b) =>
                b.value - a.value
        );

}


function buildPieChart() {

    const canvas =
        document.getElementById(
            "pieChart"
        );

    if (!canvas) return;

    if (pieChartInst) {

        pieChartInst.destroy();

        pieChartInst = null;

    }

    const data =
        getPieData();

    const d =
        theme === "dark";

    pieChartInst =
        new Chart(
            canvas,
            {

                type: "doughnut",

                data: {

                    labels:
                        data.map(
                            d => d.name
                        ),

                    datasets: [

                        {

                            data:
                                data.map(
                                    d => d.value
                                ),

                            backgroundColor:
                                PIE_COLORS,

                            borderWidth:
                                d ? 1 : 2,

                            borderColor:
                                d
                                    ? "#000"
                                    : "#fff",

                            hoverOffset: 6

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    cutout: "60%",

                    plugins: {

                        legend: {
                            display: false
                        },

                        tooltip: {

                            enabled: false,

                            external({
                                chart: ch,
                                tooltip: tt
                            }) {

                                tooltip(
                                    ch,
                                    tt,
                                    "tt-pie",

                                    t => {

                                        const p =
                                            t.dataPoints[0];

                                        const col =
                                            PIE_COLORS[
                                                p.dataIndex %
                                                PIE_COLORS.length
                                            ];

                                        return ttWrap(
                                            p.label,

                                            `<div style="color:${col}">
                                                ${fmt(p.raw)}
                                            </div>`
                                        );

                                    }
                                );

                            }

                        }

                    }

                }

            }
        );


    const total =
        data.reduce(
            (s, d) =>
                s + d.value,
            0
        );


    document.getElementById(
        "pieList"
    ).innerHTML =

        data.map(
            (item, i) => {

                const col =
                    PIE_COLORS[
                        i % PIE_COLORS.length
                    ];

                const pct =
                    total
                        ? (
                            item.value /
                            total *
                            100
                        ).toFixed(1)
                        : "0.0";

                const category =
                    CATEGORIES.find(
                        c =>
                            c.id ===
                            item.categoryId
                    );

                return `

                    <div class="pie-row">

                        <div
                            class="pie-dot"
                            style="
                                background:${col};
                                ${theme === "dark"
                                    ? `box-shadow:0 0 6px ${col}`
                                    : ""}
                            "
                        ></div>

                        <i
                            class="pie-icon ${category?.icon ?? "fas fa-question"}"
                            style="
                                color:${category?.color ?? col}
                            "
                        ></i>

                        <span class="pie-name">
                            ${item.name}
                        </span>

                        <span class="pie-pct">
                            ${pct}%
                        </span>

                        <span
                            class="pie-val"
                            style="
                                color:${col};
                                ${theme === "dark"
                                    ? `text-shadow:0 0 6px ${col}80`
                                    : ""}
                            "
                        >
                            ${fmt(item.value)}
                        </span>

                    </div>

                `;

            }
        ).join("");

}


function rebuildCharts() {

    if (activeTab === "home") {

        buildHomeChart();

    }

    if (activeTab === "charts") {

        activeChartType === "monthly"
            ? buildBarChart()
            : buildPieChart();

    }

}


function fmtDate(dateStr) {

    const date =
        new Date(dateStr);

    return date.toLocaleDateString(
        "pt-BR",
        {
            day: "2-digit",
            month: "short"
        }
    );

}


/* ── Render helpers ── */

function txRow(tx) {

    const inc =
        tx.type === "income";

    const col =
        inc
            ? "#39FF14"
            : "#FF2D6B";

    const glow =
        theme === "dark"

            ? (
                inc

                    ? "text-shadow:0 0 8px rgba(57,255,20,.5)"

                    : "text-shadow:0 0 8px rgba(255,45,107,.5)"
            )

            : "";

    const category =
        CATEGORIES.find(
            c => c.id === tx.category
        );


    return `

        <div class="tx-row">

            <i
                class="tx-icon ${category?.icon ?? "fas fa-question"}"
                style="
                    color:${category?.color ?? col}
                "
            ></i>

            <div class="tx-sub">

                <div class="tx-info">

                    <div class="tx-desc">
                        ${tx.desc}
                    </div>

                    <div class="tx-cat">
                        ${category?.name ?? "Categoria desconhecida"}
                    </div>

                </div>

                <div class="tx-time">
                    ${fmtDate(tx.date)}
                </div>

                <div
                    class="tx-amount"
                    style="
                        color:${col};
                        ${glow}
                    "
                >
                    ${inc ? "+" : "-"}${fmt(Math.abs(tx.amount))}
                </div>

            </div>

        </div>

    `;

}


/* ── Tab renders ── */

function renderHome() {

    const bal =
        ACCOUNTS.reduce(
            (s, a) =>
                s + a.balance,
            0
        );

    const inc =
        TRANSACTIONS
            .filter(
                t =>
                    t.type === "income"
            )
            .reduce(
                (s, t) =>
                    s + t.amount,
                0
            );

    const exp =
        TRANSACTIONS
            .filter(
                t =>
                    t.type === "expense"
            )
            .reduce(
                (s, t) =>
                    s + Math.abs(t.amount),
                0
            );


    document.getElementById(
        "totalBalance"
    ).textContent =
        fmt(bal);


    document.getElementById(
        "totalIncome"
    ).textContent =
        "+" + fmt(inc);


    document.getElementById(
        "totalExpense"
    ).textContent =
        "-" + fmt(exp);


    const recent =
        [...TRANSACTIONS]
            .sort(
                (a, b) =>
                    b.date.localeCompare(
                        a.date
                    )
            )
            .slice(0, 6);


    document.getElementById(
        "homeTxList"
    ).innerHTML =
        recent
            .map(txRow)
            .join("");


    buildHomeChart();

}


function renderAccounts() {

    const d =
        theme === "dark";

    const wrap =
        document.getElementById(
            "accountsList"
        );

    wrap.style.cssText =
        "display:flex;flex-direction:column;gap:10px";

    wrap.innerHTML = "";


    ACCOUNTS.forEach(
        acc => {

            const txs =
                TRANSACTIONS.filter(
                    t =>
                        t.account ===
                        acc.id
                );


            const inc =
                txs
                    .filter(
                        t =>
                            t.type ===
                            "income"
                    )
                    .reduce(
                        (s, t) =>
                            s + t.amount,
                        0
                    );


            const exp =
                txs
                    .filter(
                        t =>
                            t.type ===
                            "expense"
                    )
                    .reduce(
                        (s, t) =>
                            s +
                            Math.abs(t.amount),
                        0
                    );


            const open =
                openAccountId ===
                acc.id;


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "account-card";


            card.style.borderColor =
                open
                    ? acc.color + "50"
                    : "";


            card.style.boxShadow =
                open
                    ? `0 0 20px ${acc.color}20`
                    : "";


            card.innerHTML = `

                <div
                    class="account-header"
                    data-id="${acc.id}"
                >

                    <div class="account-dot-wrap">

                        <img
                            class="account-logo"
                            src="assets/${acc.id}.png"
                            alt="${acc.name} logo"
                        >

                    </div>


                    <div class="account-info">

                        <div class="account-name">
                            ${acc.name}
                        </div>

                        <div class="account-bank">
                            ${acc.bank}
                        </div>

                    </div>


                    <div class="account-right">

                        <div
                            class="account-balance"
                            style="
                                color:${acc.color};
                                text-shadow:${d
                                    ? `0 0 12px ${acc.color}80`
                                    : "none"}
                            "
                        >
                            ${fmt(acc.balance)}
                        </div>

                        <div class="account-arrow">
                            ${open ? "▲" : "▼"}
                        </div>

                    </div>

                </div>


                <div
                    class="account-body${open ? " open" : ""}"
                >

                    <div class="account-stats">

                        <div class="account-stat">

                            <div class="account-stat-label">
                                Entradas
                            </div>

                            <div
                                class="account-stat-val"
                                style="
                                    color:#39FF14;
                                    text-shadow:${d
                                        ? "0 0 8px rgba(57,255,20,.5)"
                                        : "none"}
                                "
                            >
                                +${fmt(inc)}
                            </div>

                        </div>


                        <div class="account-stat-divider"></div>


                        <div class="account-stat">

                            <div class="account-stat-label">
                                Saídas
                            </div>

                            <div
                                class="account-stat-val"
                                style="
                                    color:#FF2D6B;
                                    text-shadow:${d
                                        ? "0 0 8px rgba(255,45,107,.5)"
                                        : "none"}
                                "
                            >
                                -${fmt(exp)}
                            </div>

                        </div>

                    </div>


                    <div class="tx-list">

                        ${txs
                            .slice(0, 4)
                            .map(txRow)
                            .join("")}

                    </div>

                </div>

            `;


            card
                .querySelector(
                    ".account-header"
                )
                .addEventListener(
                    "click",
                    () => {

                        openAccountId =
                            openAccountId ===
                            acc.id
                                ? null
                                : acc.id;

                        renderAccounts();

                    }
                );


            wrap.appendChild(card);

        }
    );

}


function renderCategories() {

    const d =
        theme === "dark";

    const expMap = {};

    const incMap = {};


    TRANSACTIONS.forEach(
        tx => {

            if (
                tx.type ===
                "expense"
            ) {

                expMap[tx.category] =
                    (
                        expMap[tx.category] ??
                        0
                    ) +
                    Math.abs(
                        tx.amount
                    );

            } else {

                incMap[tx.category] =
                    (
                        incMap[tx.category] ??
                        0
                    ) +
                    tx.amount;

            }

        }
    );


    const exps =
        Object.entries(expMap)
            .map(
                ([categoryId, total]) =>
                    ({
                        categoryId,
                        total
                    })
            )
            .sort(
                (a, b) =>
                    b.total -
                    a.total
            );


    const incs =
        Object.entries(incMap)
            .map(
                ([categoryId, total]) =>
                    ({
                        categoryId,
                        total
                    })
            )
            .sort(
                (a, b) =>
                    b.total -
                    a.total
            );


    const maxE =
        exps[0]?.total ??
        1;


    const expEl =
        document.getElementById(
            "expenseCategories"
        );


    expEl.style.cssText =
        "display:flex;flex-direction:column;gap:8px";


    expEl.innerHTML =
        exps
            .map(
                (c, i) => {

                    const category =
                        CATEGORIES.find(
                            x =>
                                x.id ===
                                c.categoryId
                        );

                    const col =
                        EXP_COLORS[
                            i %
                            EXP_COLORS.length
                        ];

                    const pct =
                        (
                            c.total /
                            maxE
                        ) *
                        100;


                    return `

                        <div class="cat-row">

                            <div class="cat-top">

                                <i
                                    class="cat-icon ${category?.icon ?? "fas fa-question"}"
                                    style="
                                        color:${col}
                                    "
                                ></i>

                                <span class="cat-name">
                                    ${category?.name ?? "Categoria desconhecida"}
                                </span>

                                <span
                                    class="cat-amount"
                                    style="
                                        color:#FF2D6B;
                                        text-shadow:${d
                                            ? "0 0 8px rgba(255,45,107,.5)"
                                            : ""}
                                    "
                                >
                                    ${fmt(c.total)}
                                </span>

                            </div>


                            <div class="cat-bar-track">

                                <div
                                    class="cat-bar-fill"
                                    style="
                                        width:${pct}%;
                                        background:${col};
                                        ${d
                                            ? `box-shadow:0 0 6px ${col}80`
                                            : ""}
                                    "
                                ></div>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");


    const incEl =
        document.getElementById(
            "incomeCategories"
        );


    incEl.style.cssText =
        "display:flex;flex-direction:column;gap:8px";


    incEl.innerHTML =
        incs
            .map(
                c => {

                    const category =
                        CATEGORIES.find(
                            x =>
                                x.id ===
                                c.categoryId
                        );


                    return `

                        <div class="income-row">

                            <i
                                class="cat-icon ${category?.icon ?? "fas fa-question"}"
                                style="
                                    color:${category?.color ?? "#39FF14"}
                                "
                            ></i>

                            <span
                                class="cat-name"
                                style="
                                    flex:1;
                                    font-size:13px;
                                    font-weight:500;
                                    color:var(--text)
                                "
                            >
                                ${category?.name ?? "Categoria desconhecida"}
                            </span>

                            <span
                                class="cat-amount"
                                style="
                                    color:#39FF14;
                                    text-shadow:${d
                                        ? "0 0 8px rgba(57,255,20,.5)"
                                        : ""}
                                "
                            >
                                +${fmt(c.total)}
                            </span>

                        </div>

                    `;

                }
            )
            .join("");

}


function renderCharts() {

    const monthly =
        activeChartType ===
        "monthly";


    document.getElementById(
        "chartMonthly"
    ).style.display =
        monthly
            ? "block"
            : "none";


    document.getElementById(
        "chartPie"
    ).style.display =
        monthly
            ? "none"
            : "block";


    monthly
        ? buildBarChart()
        : buildPieChart();

}


/* ============================================================
   DATA DB
   ============================================================ */


/* ── Controla estado do botão Salvar ── */

function setDataDbDirty(
    value = true
) {

    dataDbDirty =
        value;


    const saveBtn =
        document.getElementById(
            "dataDbSave"
        );


    if (!saveBtn) return;


    saveBtn.disabled =
        !dataDbDirty;


    saveBtn.classList.toggle(
        "is-dirty",
        dataDbDirty
    );

}


/* ── Retorna os dados da pasta aberta ── */

function getDataDbRecords() {

    if (!dataDbOpenType)
        return [];


    return DATA_DB_CONFIG[
        dataDbOpenType
    ].source();

}


/* ── Identifica o tipo de valor ── */

function getValueType(value) {

    if (
        typeof value ===
        "number"
    ) {
        return "number";
    }


    if (
        typeof value ===
        "boolean"
    ) {
        return "boolean";
    }


    return "text";

}


/* ── Converte o valor digitado ── */

function parseEditedValue(
    rawValue,
    originalValue
) {

    if (
        typeof originalValue ===
        "number"
    ) {

        const normalized =
            rawValue
                .replace(/\s/g, "")
                .replace(/\./g, "")
                .replace(",", ".");


        const parsed =
            Number(
                normalized
            );


        return Number.isNaN(
            parsed
        )
            ? originalValue
            : parsed;

    }


    if (
        typeof originalValue ===
        "boolean"
    ) {

        return (
            rawValue ===
            "true"
        );

    }


    return rawValue;

}


/* ── Protege texto usado no HTML ── */

function escapeHtml(value) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


/* ── Mostra as três pastas ── */

function renderDataDbFolders() {

    document.getElementById(
        "dataDbFolders"
    ).style.display =
        "block";


    document.getElementById(
        "dataDbEditor"
    ).style.display =
        "none";


    dataDbOpenType =
        null;


    setDataDbDirty(false);

}


/* ── Renderiza os registros da pasta ── */

function renderDataDbRecords() {

    if (!dataDbOpenType)
        return;


    const config =
        DATA_DB_CONFIG[
            dataDbOpenType
        ];


    const records =
        getDataDbRecords();


    const container =
        document.getElementById(
            "dataDbRecords"
        );


    document.getElementById(
        "dataDbFolders"
    ).style.display =
        "none";


    document.getElementById(
        "dataDbEditor"
    ).style.display =
        "block";


    document.getElementById(
        "dataDbEditorLabel"
    ).textContent =
        config.label;


    document.getElementById(
        "dataDbEditorTitle"
    ).textContent =
        config.title;


    container.innerHTML = "";


    if (!records.length) {

        container.innerHTML = `

            <div class="data-db-empty">
                Nenhum registro encontrado.
            </div>

        `;

        return;

    }


    records.forEach(
        (record, recordIndex) => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "data-db-record";


            const keys =
                Object.keys(record);


            card.innerHTML = `

                <div class="data-db-record-head">

                    <span class="data-db-record-number">
                        #${recordIndex + 1}
                    </span>

                    <span class="data-db-record-id">
                        ${escapeHtml(
                            record.id ??
                            "sem-id"
                        )}
                    </span>

                </div>


                <div class="data-db-fields">

                    ${keys
                        .map(
                            key => {

                                const value =
                                    record[key];


                                const inputType =
                                    getValueType(
                                        value
                                    );


                                return `

                                    <div class="data-db-field">

                                        <label
                                            class="data-db-key"
                                            for="db-${dataDbOpenType}-${recordIndex}-${key}"
                                        >
                                            ${escapeHtml(key)}
                                        </label>


                                        <input
                                            id="db-${dataDbOpenType}-${recordIndex}-${key}"
                                            class="data-db-input"
                                            data-record-index="${recordIndex}"
                                            data-key="${escapeHtml(key)}"
                                            data-value-type="${inputType}"
                                            type="text"
                                            value="${escapeHtml(value)}"
                                            autocomplete="off"
                                            spellcheck="false"
                                        />

                                    </div>

                                `;

                            }
                        )
                        .join("")}

                </div>

            `;


            container.appendChild(
                card
            );

        }
    );


    container
        .querySelectorAll(
            ".data-db-input"
        )
        .forEach(
            input => {

                input.addEventListener(
                    "input",
                    handleDataDbInput
                );

            }
        );


    setDataDbDirty(
        dataDbDirty
    );

}


/* ── Quando um input é alterado ── */

function handleDataDbInput(
    event
) {

    if (!dataDbOpenType)
        return;


    const input =
        event.target;


    const recordIndex =
        Number(
            input.dataset.recordIndex
        );


    const key =
        input.dataset.key;


    const records =
        getDataDbRecords();


    const record =
        records[
            recordIndex
        ];


    if (
        !record ||
        !(key in record)
    ) {
        return;
    }


    record[key] =
        parseEditedValue(
            input.value,
            record[key]
        );


    setDataDbDirty(true);

}


/* ── Abre uma pasta ── */

function openDataDbFolder(
    type
) {

    if (
        !DATA_DB_CONFIG[type]
    ) {
        return;
    }


    dataDbOpenType =
        type;


    dataDbDirty =
        false;


    renderDataDbRecords();


    document.getElementById(
        "mainScroll"
    ).scrollTop = 0;

}


/* ── Volta para as pastas ── */

function closeDataDbFolder() {

    if (dataDbDirty) {

        const leave =
            confirm(
                "Existem alterações não salvas. Deseja voltar mesmo assim?"
            );


        if (!leave)
            return;

    }


    renderDataDbFolders();


    document.getElementById(
        "mainScroll"
    ).scrollTop = 0;

}


/* ── Salvar ── */

function saveDataDb() {

    if (!dataDbDirty)
        return;


    alert(
        "Alterações salvas!"
    );


    setDataDbDirty(
        false
    );

}


/* ============================================================
   NAVIGATION
   ============================================================ */


const TITLES = {

    home:
        "Visão Geral",

    accounts:
        "Contas",

    categories:
        "Categorias",

    charts:
        "Análise",

    "data-db":
        "Configurações"

};


function setTab(tab) {

    activeTab =
        tab;


    document
        .querySelectorAll(
            ".screen"
        )
        .forEach(
            s =>
                s.classList.remove(
                    "active"
                )
        );


    document
        .getElementById(
            "screen-" + tab
        )
        .classList.add(
            "active"
        );


    document
        .querySelectorAll(
            ".nav-btn"
        )
        .forEach(
            b =>
                b.classList.toggle(
                    "active",
                    b.dataset.tab ===
                    tab
                )
        );


    document.getElementById(
        "pageTitle"
    ).textContent =
        TITLES[tab];


    document.getElementById(
        "mainScroll"
    ).scrollTop = 0;


    if (
        tab === "home"
    ) {
        renderHome();
    }


    if (
        tab === "accounts"
    ) {
        renderAccounts();
    }


    if (
        tab === "categories"
    ) {
        renderCategories();
    }


    if (
        tab === "charts"
    ) {
        renderCharts();
    }


    if (
        tab === "data-db"
    ) {

        if (dataDbOpenType) {

            renderDataDbRecords();

        } else {

            renderDataDbFolders();

        }

    }

}


/* ============================================================
   INIT
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {


        document
            .getElementById(
                "themeToggle"
            )
            .addEventListener(
                "click",
                () => {

                    theme =
                        theme === "dark"
                            ? "light"
                            : "dark";

                    applyTheme();

                    setTab(
                        activeTab
                    );

                }
            );


        document
            .querySelectorAll(
                ".nav-btn"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            setTab(
                                button.dataset.tab
                            );

                        }
                    );

                }
            );


        document
            .getElementById(
                "chartToggle"
            )
            .addEventListener(
                "click",
                e => {

                    const button =
                        e.target.closest(
                            ".chart-tab"
                        );


                    if (!button)
                        return;


                    document
                        .querySelectorAll(
                            ".chart-tab"
                        )
                        .forEach(
                            x =>
                                x.classList.remove(
                                    "active"
                                )
                        );


                    button.classList.add(
                        "active"
                    );


                    activeChartType =
                        button.dataset.chart;


                    renderCharts();

                }
            );


        /* ── Data DB eventos ── */

        document
            .querySelectorAll(
                ".data-db-folder"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            openDataDbFolder(
                                button.dataset.dbType
                            );

                        }
                    );

                }
            );


        document
            .getElementById(
                "dataDbBack"
            )
            .addEventListener(
                "click",
                () => {

                    closeDataDbFolder();

                }
            );


        document
            .getElementById(
                "dataDbSave"
            )
            .addEventListener(
                "click",
                () => {

                    saveDataDb();

                }
            );


        setTab("home");

    }
);