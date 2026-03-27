// ── Firebase configuratie ──────────────────────────────────────
// Vervang onderstaande waarden met uw eigen Firebase project config.
// U vindt deze in de Firebase console onder:
//   Projectinstellingen → Uw apps → Web app → Configuratie
// ───────────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey:            "VERVANG_MET_API_KEY",
  authDomain:        "VERVANG_MET_PROJECT_ID.firebaseapp.com",
  projectId:         "VERVANG_MET_PROJECT_ID",
  storageBucket:     "VERVANG_MET_PROJECT_ID.appspot.com",
  messagingSenderId: "VERVANG_MET_SENDER_ID",
  appId:             "VERVANG_MET_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db   = firebase.firestore();
const auth = firebase.auth();
