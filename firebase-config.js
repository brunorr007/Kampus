/**
 * FIREBASE CONFIGURATION - Gabarita.ai Forum
 * 
 * INSTRUÇÕES:
 * 1. Acesse https://console.firebase.google.com/
 * 2. Crie um novo projeto ou use um existente
 * 3. Vá em Configurações do Projeto > Geral
 * 4. Copie as credenciais abaixo e cole nos valores indicados
 */

// COLE SUAS CREDENCIAIS DO FIREBASE AQUI:
const firebaseConfig = {
  apiKey: "AIzaSyA6iF9AkY_wweWKAQFWlwW4Yw2pAvJutl8",
  authDomain: "kitcopo-6ae9c.firebaseapp.com",
  projectId: "kitcopo-6ae9c",
  storageBucket: "kitcopo-6ae9c.firebasestorage.app",
  messagingSenderId: "817794001497",
  appId: "1:817794001497:web:62d85f48ea7c0004e9df48",
  measurementId: "G-K3XDHDYMEL"
};

// Inicialização do Firebase
firebase.initializeApp(firebaseConfig);

// Referências globais para facilitar o uso em outros arquivos
const auth = firebase.auth();
const db = firebase.firestore();

// Configuração do provedor Google
const googleProvider = new firebase.auth.GoogleAuthProvider();

console.log("Firebase inicializado com sucesso!");