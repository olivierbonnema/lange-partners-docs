// ── Firebase configuratie ──────────────────────────────────────
// Vervang onderstaande waarden met uw eigen Firebase project config.
// U vindt deze in de Firebase console onder:
//   Projectinstellingen → Uw apps → Web app → Configuratie
// ───────────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey:            "AIzaSyAADcnx4SOi9prYB0JtyweAkR8OtIOcLw8",
  authDomain:        "lange-partners.firebaseapp.com",
  projectId:         "lange-partners",
  storageBucket:     "lange-partners.firebasestorage.app",
  messagingSenderId: "485613062573",
  appId:             "1:485613062573:web:c21545e8d3c02aedcff924"
};

firebase.initializeApp(firebaseConfig);
const db   = firebase.firestore();
const auth = firebase.auth();
