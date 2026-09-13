// auth.js
import { auth, db } from "./firebase.js";

console.log("🔥 KRONA AUTH.JS CARREGADO");
console.log("🔥 Firebase:", db);

import {
    createUserWithEmailAndPassword,
    updateProfile,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    doc,
    setDoc,
    getDoc,
    collection,
    getDocs,
    writeBatch,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const $ = (id) => document.getElementById(id);

const loginForm = $("loginForm");
const registerForm = $("registerForm");
const loginMessage = $("loginMessage");
const registerMessage = $("registerMessage");

// ======================================================
// ABAS LOGIN / CADASTRO
// ======================================================

document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
        const mode = tab.dataset.mode;

        document.querySelectorAll(".auth-tab").forEach((item) => {
            item.classList.toggle("active", item === tab);
        });

        loginForm.classList.toggle("hidden", mode !== "login");
        registerForm.classList.toggle("hidden", mode !== "register");

        clearMessages();
    });
});

// ======================================================
// MENSAGENS
// ======================================================

function setMessage(element, text, type = "") {
    element.textContent = text;
    element.className = `auth-message ${type}`;
}

function clearMessages() {
    setMessage(loginMessage, "");
    setMessage(registerMessage, "");
}

function friendlyError(error) {
    const map = {
        "auth/invalid-email": "E-mail inválido.",
        "auth/user-not-found": "Usuário não encontrado.",
        "auth/wrong-password": "Senha incorreta.",
        "auth/invalid-credential": "E-mail ou senha incorretos.",
        "auth/email-already-in-use": "Este e-mail já está cadastrado.",
        "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
        "auth/popup-closed-by-user": "A janela do Google foi fechada.",
        "auth/popup-blocked": "O navegador bloqueou a janela de login.",
        "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco.",
        "auth/network-request-failed": "Falha de conexão. Verifique a internet."
    };

    return map[error?.code] || "Não foi possível concluir o acesso.";
}

// ======================================================
// DADOS PADRÃO
// ======================================================

const DEFAULT_ACCOUNTS = [
    {
        id: "nubank",
        name: "Nubank",
        bank: "Nubank",
        balance: 275.50,
        color: "#C855FF",
        logo: "img/nubank.png"
    },
    {
        id: "itau",
        name: "Itaú",
        bank: "Itaú",
        balance: 478.00,
        color: "#ff8800",
        logo: "img/itau.png"
    },
    {
        id: "mp",
        name: "Mercado Pago",
        bank: "Mercado Pago",
        balance: 100.30,
        color: "#ffd900",
        logo: "img/mp.png"
    }
];

const DEFAULT_CATEGORIES = [
    {
        id: "0",
        name: "Outros",
        type: "expense",
        icon: "question",
        color: "#999999"
    },
    {
        id: "1",
        name: "Salário",
        type: "income",
        icon: "dollar-sign",
        color: "#39FF14"
    },
    {
        id: "2",
        name: "Freelance",
        type: "income",
        icon: "laptop",
        color: "#FF5CB8"
    },
    {
        id: "3",
        name: "Alimentação",
        type: "expense",
        icon: "utensils",
        color: "#FF9F43"
    },
    {
        id: "4",
        name: "Transporte",
        type: "expense",
        icon: "car",
        color: "#FF9F43"
    },
    {
        id: "5",
        name: "Streaming",
        type: "expense",
        icon: "film",
        color: "#FF5CB8"
    },
    {
        id: "6",
        name: "Saúde",
        type: "expense",
        icon: "heart",
        color: "#C855FF"
    },
    {
        id: "7",
        name: "Moradia",
        type: "expense",
        icon: "home",
        color: "#FFD93D"
    },
    {
        id: "8",
        name: "Vestuário",
        type: "expense",
        icon: "tshirt",
        color: "#FF5CB8"
    },
    {
        id: "9",
        name: "Investimentos",
        type: "income",
        icon: "chart-line",
        color: "#00F5FF"
    },
    {
        id: "10",
        name: "Lazer",
        type: "expense",
        icon: "gamepad",
        color: "#39FF14"
    }
];

const DEFAULT_TRANSACTIONS = [
    {
        id: "t1",
        accountId: "nubank",
        type: "income",
        categoryId: "1",
        amount: 2340,
        date: "2026-09-02",
        description: "Salário"
    },
    {
        id: "t2",
        accountId: "itau",
        type: "expense",
        categoryId: "3",
        amount: 86.40,
        date: "2026-09-03",
        description: "Mercado"
    },
    {
        id: "t3",
        accountId: "nubank",
        type: "expense",
        categoryId: "5",
        amount: 39.90,
        date: "2026-09-04",
        description: "Netflix"
    },
    {
        id: "t4",
        accountId: "mp",
        type: "expense",
        categoryId: "4",
        amount: 22.50,
        date: "2026-09-05",
        description: "Uber"
    },
    {
        id: "t5",
        accountId: "itau",
        type: "expense",
        categoryId: "7",
        amount: 1687.60,
        date: "2026-09-06",
        description: "Aluguel"
    },
    {
        id: "t6",
        accountId: "nubank",
        type: "expense",
        categoryId: "3",
        amount: 54.90,
        date: "2026-09-07",
        description: "Lanche"
    },
    {
        id: "t7",
        accountId: "mp",
        type: "expense",
        categoryId: "10",
        amount: 45.00,
        date: "2026-09-08",
        description: "Lazer"
    },
    {
        id: "t8",
        accountId: "nubank",
        type: "income",
        categoryId: "2",
        amount: 350,
        date: "2026-09-10",
        description: "Freelance"
    }
];

// ======================================================
// FIRESTORE - USUÁRIO
// ======================================================

async function ensureUserDocument(user, name = "") {

    console.log("🔥 ensureUserDocument executado");
    console.log("🔥 Criando/verificando users/" + user.uid);

    const userRef = doc(db, "users", user.uid);

    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {

        await setDoc(userRef, {
            uid: user.uid,
            name: name || user.displayName || "Usuário",
            email: user.email || "",
            photoURL: user.photoURL || "",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        console.log("Krona: usuário criado no Firestore.");

    } else {

        const existingData = snapshot.data();

        await setDoc(
            userRef,
            {
                name:
                    name ||
                    user.displayName ||
                    existingData.name ||
                    "Usuário",

                email:
                    user.email ||
                    existingData.email ||
                    "",

                photoURL:
                    user.photoURL ||
                    existingData.photoURL ||
                    "",

                updatedAt: serverTimestamp()
            },
            {
                merge: true
            }
        );

        console.log("Krona: usuário atualizado no Firestore.");
    }

    await seedUserData(user.uid);
}

// ======================================================
// FIRESTORE - COLEÇÃO
// ======================================================

async function seedCollection(uid, collectionName, items) {

    const collectionRef = collection(
        db,
        "users",
        uid,
        collectionName
    );

    const snapshot = await getDocs(collectionRef);

    // Se já existem documentos, não recria os dados padrão.
    if (!snapshot.empty) {
        console.log(
            `Krona: ${collectionName} já possui dados.`
        );

        return;
    }

    const batch = writeBatch(db);

    items.forEach((item) => {

        const itemRef = doc(
            collectionRef,
            item.id
        );

        batch.set(itemRef, {
            ...item,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
    });

    await batch.commit();

    console.log(
        `Krona: coleção ${collectionName} criada com ${items.length} registros.`
    );
}

// ======================================================
// FIRESTORE - DADOS INICIAIS
// ======================================================

async function seedUserData(uid) {

    console.log(
        "Krona: criando dados iniciais para:",
        uid
    );

    await seedCollection(
        uid,
        "accounts",
        DEFAULT_ACCOUNTS
    );

    await seedCollection(
        uid,
        "categories",
        DEFAULT_CATEGORIES
    );

    await seedCollection(
        uid,
        "transactions",
        DEFAULT_TRANSACTIONS
    );

    console.log(
        "Krona: dados iniciais criados com sucesso."
    );
}

// ======================================================
// APÓS LOGIN
// ======================================================

async function afterLogin(user, name = "") {

    console.log("🔥 afterLogin executado");
    console.log("🔥 UID:", user.uid);
    console.log("🔥 Iniciando Firestore...");

    await ensureUserDocument(user, name);

    console.log("🔥 Firestore terminou");

    window.location.replace("index.html");
}

// ======================================================
// LOGIN
// ======================================================

loginForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        const email =
            $("loginEmail").value.trim();

        const password =
            $("loginPassword").value;

        loginForm.classList.add(
            "auth-loading"
        );

        setMessage(
            loginMessage,
            "Entrando..."
        );

        try {

            const result =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            await afterLogin(
                result.user
            );

        } catch (error) {

            console.error(
                "Krona login error:",
                error
            );

            setMessage(
                loginMessage,
                friendlyError(error),
                "error"
            );

        } finally {

            loginForm.classList.remove(
                "auth-loading"
            );
        }
    }
);

// ======================================================
// CADASTRO
// ======================================================

registerForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        const name =
            $("registerName").value.trim();

        const email =
            $("registerEmail").value.trim();

        const password =
            $("registerPassword").value;

        registerForm.classList.add(
            "auth-loading"
        );

        setMessage(
            registerMessage,
            "Criando sua conta..."
        );

        try {

            const result =
                await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            if (name) {

                await updateProfile(
                    result.user,
                    {
                        displayName: name
                    }
                );
            }

            await afterLogin(
                result.user,
                name
            );

        } catch (error) {

            console.error(
                "Krona register error:",
                error
            );

            setMessage(
                registerMessage,
                friendlyError(error),
                "error"
            );

        } finally {

            registerForm.classList.remove(
                "auth-loading"
            );
        }
    }
);

// ======================================================
// LOGIN GOOGLE
// ======================================================

async function loginWithGoogle(
    messageElement
) {

    messageElement.textContent =
        "Abrindo Google...";

    const provider =
        new GoogleAuthProvider();

    provider.setCustomParameters({
        prompt: "select_account"
    });

    try {

        const isMobile =
            /Android|iPhone|iPad|iPod/i.test(
                navigator.userAgent
            );

        if (isMobile) {

            await signInWithRedirect(
                auth,
                provider
            );

            return;
        }

        const result =
            await signInWithPopup(
                auth,
                provider
            );

        await afterLogin(
            result.user
        );

    } catch (error) {

        console.error(
            "Krona Google login error:",
            error
        );

        setMessage(
            messageElement,
            friendlyError(error),
            "error"
        );
    }
}

$("googleLogin").addEventListener(
    "click",
    () => loginWithGoogle(loginMessage)
);

$("googleRegister").addEventListener(
    "click",
    () => loginWithGoogle(registerMessage)
);

// ======================================================
// VERIFICAÇÃO DE AUTENTICAÇÃO
// ======================================================

onAuthStateChanged(
    auth,
    (user) => {

        if (user) {

            window.location.replace(
                "index.html"
            );
        }
    }
);