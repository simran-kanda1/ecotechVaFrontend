import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDLQEOHhqi1SwWcrQrP2WO_xt9rfqERfpw",
  authDomain: "ecotech-5166a.firebaseapp.com",
  projectId: "ecotech-5166a",
  storageBucket: "ecotech-5166a.firebasestorage.app",
  messagingSenderId: "718227655457",
  appId: "1:718227655457:web:836ff4ff20d4dca005cc60"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const c1 = collection(db, 'activityLogs');
  const s1 = await getDocs(query(c1, limit(3)));
  console.log("Activity Logs:");
  s1.forEach(d => console.log(d.id, d.data()));

  const c2 = collection(db, 'salesRankings');
  const s2 = await getDocs(query(c2, limit(3)));
  console.log("\nSales Rankings:");
  s2.forEach(d => console.log(d.id, d.data()));
  
  process.exit(0);
}
run();
