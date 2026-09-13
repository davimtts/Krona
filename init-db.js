import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc,
    collection,
    getDocs,
    writeBatch,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


enviarDados("", "init-db.js: carregado", "info");

async function enviarDados(data, dados, tipo,) {
    
    if (tipo === "data") {
        const console = document.getElementById("bgConsoleTable");
        console.innerHTML += `<tr>
                    <td>${data}</td>
                    <td>${dados}</td>
                </tr>`;
    } else if (tipo === "info") {
        const console = document.getElementById("bgConsoleList");
        console.innerHTML += `<span>${dados}</span>`;
    }

}


const DEFAULT_ACCOUNTS = [

    { id: "nubank", name: "Nubank", bank: "Nu Pagamentos S.A.", balance: 275.50, color: "#C855FF" },
    { id: "itau", name: "Itaú", bank: "Banco Itaú S.A.", balance: 478.00, color: "#ff8800" },
    { id: "mp", name: "MercadoPago", bank: "Mercado Pago Pagamentos LTDA", balance: 100.30, color: "#ffd900" }

];

const DEFAULT_CATEGORIES = [
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
        icon: "fas fa-film",
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

const DEFAULT_TRANSACTIONS = [
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


async function criarColecaoSeNaoExistir(uid, nome, dados) {

    const ref = collection(
        db,
        "users",
        uid,
        nome
    );

    const snapshot = await getDocs(ref);

    
    enviarDados(nome, snapshot.size, "data");



    const batch = writeBatch(db);

    dados.forEach(item => {

        const itemRef = doc(
            ref,
            item.id
        );

        batch.set(itemRef, {
            ...item,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

    });

    await batch.commit();

}


async function inicializarBanco(user) {

    enviarDados("uid", user.uid, "data");

    try {

        // users/{uid}
        const userRef = doc(
            db,
            "users",
            user.uid
        );

        const userSnapshot = await getDoc(userRef);

        if (!userSnapshot.exists()) {

            enviarDados("Criando documento do usuário...", "info");

            await setDoc(userRef, {
                uid: user.uid,
                name: user.displayName || "Usuário",
                email: user.email || "",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            enviarDados("", "users/{uid}: criado", "info");

        } else {

            enviarDados("", "users/{uid}: logado", "info");

        }


        // SUBCOLEÇÕES

        await criarColecaoSeNaoExistir(
            user.uid,
            "accounts",
            DEFAULT_ACCOUNTS
        );

        await criarColecaoSeNaoExistir(
            user.uid,
            "categories",
            DEFAULT_CATEGORIES
        );

        await criarColecaoSeNaoExistir(
            user.uid,
            "transactions",
            DEFAULT_TRANSACTIONS
        );


        console.log("=================================");
        console.log("🔥 FIRESTORE INICIALIZADO");
        console.log("=================================");

    } catch (error) {

        console.error("❌ ERRO AO INICIALIZAR FIRESTORE");
        console.error("Código:", error.code);
        console.error("Mensagem:", error.message);
        console.error(error);

    }
}


onAuthStateChanged(auth, async (user) => {

    if (!user) {

        console.log("⚠️ Nenhum usuário autenticado");
        return;

    }

    await inicializarBanco(user);

});