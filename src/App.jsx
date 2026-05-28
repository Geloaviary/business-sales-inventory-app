import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import {
  collection, doc, onSnapshot, setDoc, updateDoc, addDoc,
  getDocs, writeBatch, query, where, runTransaction, serverTimestamp
} from "firebase/firestore";

const FONT = `@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');`;
const REPORT_EMAIL = "catchillarangelo@gmail.com";

function todayStr() { return new Date().toISOString().split("T")[0]; }
function fmtP(n) { return "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function dayName(d) { return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" }); }
function prettyDate(d) { return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); }
function prettyDateFull(d) { return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }); }
function pad(s, n) { return String(s).padEnd(n); }
function rpad(s, n) { return String(s).padStart(n); }
function ln(n = 60) { return "─".repeat(n); }

// ─── Historical May 1–26 (hardcoded baseline) ────────────────────────────────
const HIST_RATIO = 74646.80 / (103918.30 - 4147.20);
const HISTORICAL = [
  ["2026-05-01",2412.40],["2026-05-02",3147.20],["2026-05-03",3184.60],
  ["2026-05-04",3941.20],["2026-05-05",2962.40],["2026-05-06",2321.00],
  ["2026-05-07",6509.80],["2026-05-08",3637.00],["2026-05-09",4611.80],
  ["2026-05-10",4727.20],["2026-05-11",4964.40],["2026-05-12",3681.00],
  ["2026-05-13",5433.60],["2026-05-14",3721.60],["2026-05-15",2439.00],
  ["2026-05-16",4270.80],["2026-05-17",5703.20],["2026-05-18",4712.80],
  ["2026-05-19",3116.60],["2026-05-20",2666.60],["2026-05-21",5398.40],
  ["2026-05-22",2985.50],["2026-05-23",4724.40],["2026-05-24",5863.80],
  ["2026-05-25",2706.80],["2026-05-26",4147.20],
].map(([date, sales]) => ({
  date, sales, day: dayName(date),
  cost: date === "2026-05-26" ? 3144.60 : parseFloat((sales * HIST_RATIO).toFixed(2)),
}));

// ─── May 26 Ending Inventory ─────────────────────────────────────────────────
const INITIAL_PRODUCTS = [
  { id:1,  sku:"RUG-001", name:"Doormat Rugs Rectangle",   category:"Rugs & Mats",        stock:672, thr:60,  cost:20,   price:30,   upcoming:false },
  { id:2,  sku:"RUG-002", name:"Doormat Rugs Oval",        category:"Rugs & Mats",        stock:159, thr:30,  cost:20,   price:30,   upcoming:false },
  { id:3,  sku:"RUG-003", name:"Doormat Rugs Bilog",       category:"Rugs & Mats",        stock:582, thr:30,  cost:20,   price:33,   upcoming:false },
  { id:4,  sku:"RUG-004", name:"Doormat Salasala",         category:"Rugs & Mats",        stock:1,   thr:5,   cost:20,   price:35,   upcoming:false },
  { id:5,  sku:"RUG-005", name:"Longmat Single 20x60",     category:"Rugs & Mats",        stock:0,   thr:5,   cost:100,  price:150,  upcoming:false },
  { id:6,  sku:"RUG-006", name:"Longmat Single 25x60",     category:"Rugs & Mats",        stock:0,   thr:5,   cost:120,  price:180,  upcoming:false },
  { id:7,  sku:"RUG-007", name:"Longmat Set",              category:"Rugs & Mats",        stock:5,   thr:3,   cost:200,  price:320,  upcoming:false },
  { id:8,  sku:"RUG-008", name:"Longmat Double",           category:"Rugs & Mats",        stock:4,   thr:3,   cost:250,  price:480,  upcoming:false },
  { id:9,  sku:"RUG-009", name:"Small Round Rugs",         category:"Rugs & Mats",        stock:402, thr:150, cost:1.60, price:2.20, upcoming:false },
  { id:10, sku:"RUG-010", name:"Doormat Gamoza Rectangle", category:"Rugs & Mats",        stock:184, thr:30,  cost:40,   price:100,  upcoming:false },
  { id:11, sku:"RUG-011", name:"Doormat Gamoza Oval",      category:"Rugs & Mats",        stock:58,  thr:20,  cost:40,   price:100,  upcoming:false },
  { id:12, sku:"RUG-012", name:"Doormat Gamoza Bilog",     category:"Rugs & Mats",        stock:22,  thr:10,  cost:40,   price:100,  upcoming:false },
  { id:13, sku:"RUG-013", name:"Kiddie Mat Queen",         category:"Rugs & Mats",        stock:3,   thr:3,   cost:250,  price:350,  upcoming:false },
  { id:14, sku:"RUG-014", name:"Kiddie Mat Double",        category:"Rugs & Mats",        stock:5,   thr:3,   cost:200,  price:300,  upcoming:false },
  { id:15, sku:"CLN-001", name:"Dishwashing Liquid 25",    category:"Cleaning & Hygiene", stock:32,  thr:10,  cost:17,   price:30,   upcoming:false },
  { id:16, sku:"CLN-002", name:"Dishwashing Liquid 10",    category:"Cleaning & Hygiene", stock:3,   thr:10,  cost:8,    price:12,   upcoming:false },
  { id:17, sku:"CLN-003", name:"Fabric Conditioner 30",    category:"Cleaning & Hygiene", stock:0,   thr:10,  cost:20,   price:30,   upcoming:false },
  { id:18, sku:"CLN-004", name:"Fabric Conditioner 15",    category:"Cleaning & Hygiene", stock:6,   thr:10,  cost:10,   price:15,   upcoming:false },
  { id:19, sku:"CLN-005", name:"Sponge",                   category:"Cleaning & Hygiene", stock:56,  thr:20,  cost:7,    price:10,   upcoming:false },
  { id:20, sku:"CLN-006", name:"Sponge 25",                category:"Cleaning & Hygiene", stock:108, thr:20,  cost:10,   price:25,   upcoming:false },
  { id:21, sku:"CLN-007", name:"Steelwool",                category:"Cleaning & Hygiene", stock:9,   thr:10,  cost:7,    price:10,   upcoming:false },
  { id:22, sku:"CLN-008", name:"Pot Holder",               category:"Cleaning & Hygiene", stock:983, thr:50,  cost:7,    price:12.50,upcoming:false },
  { id:23, sku:"CLN-009", name:"Pot Holder Big",           category:"Cleaning & Hygiene", stock:0,   thr:10,  cost:12,   price:25,   upcoming:false },
  { id:24, sku:"PIL-001", name:"Pillow Large",             category:"Pillows & Bedding",  stock:8,   thr:5,   cost:75,   price:150,  upcoming:false },
  { id:25, sku:"PIL-002", name:"Pillow Medium",            category:"Pillows & Bedding",  stock:19,  thr:5,   cost:90,   price:250,  upcoming:false },
  { id:26, sku:"PIL-003", name:"Body Size Pillow",         category:"Pillows & Bedding",  stock:9,   thr:5,   cost:180,  price:380,  upcoming:false },
  { id:27, sku:"PIL-004", name:"Hotdog Pillow Jumbo",      category:"Pillows & Bedding",  stock:4,   thr:3,   cost:180,  price:350,  upcoming:false },
  { id:28, sku:"PIL-005", name:"Hotdog Pillow Large",      category:"Pillows & Bedding",  stock:8,   thr:3,   cost:100,  price:250,  upcoming:false },
  { id:29, sku:"PIL-006", name:"Hotdog Pillow Medium",     category:"Pillows & Bedding",  stock:6,   thr:3,   cost:70,   price:180,  upcoming:false },
  { id:30, sku:"PIL-007", name:"Pillow Case Large",        category:"Pillows & Bedding",  stock:58,  thr:10,  cost:25,   price:50,   upcoming:false },
  { id:31, sku:"PIL-008", name:"Pillow Case Medium",       category:"Pillows & Bedding",  stock:57,  thr:10,  cost:22,   price:33,   upcoming:false },
  { id:32, sku:"PIL-009", name:"Hotdog Pillow Case Jumbo", category:"Pillows & Bedding",  stock:12,  thr:5,   cost:45,   price:85,   upcoming:false },
  { id:33, sku:"PIL-010", name:"Hotdog Pillow Case Large", category:"Pillows & Bedding",  stock:13,  thr:5,   cost:35,   price:65,   upcoming:false },
  { id:34, sku:"CAN-001", name:"Can Goods Sardines",       category:"Canned Goods",       stock:512, thr:200, cost:17,   price:20,   upcoming:false },
  { id:35, sku:"CAN-002", name:"Can Goods Sardines 25",    category:"Canned Goods",       stock:309, thr:100, cost:20,   price:25,   upcoming:false },
  { id:36, sku:"HME-001", name:"Ref Towel",                category:"Home & Kitchen",     stock:22,  thr:10,  cost:10,   price:15,   upcoming:false },
  { id:37, sku:"HME-002", name:"Ref Towel Big",            category:"Home & Kitchen",     stock:1,   thr:5,   cost:15,   price:25,   upcoming:false },
];

const CATEGORIES = ["Rugs & Mats","Cleaning & Hygiene","Pillows & Bedding","Canned Goods","Home & Kitchen"];
const BLANK_S = { productId:"", qty:"", channel:"Walk-in", date: todayStr() };
const BLANK_P = { name:"", sku:"", category:"Rugs & Mats", stock:"", thr:"", cost:"", price:"", upcoming:false };

// ─── Report Builders ─────────────────────────────────────────────────────────
function buildDailyText(products, sales, date, hExp) {
  const ds = sales.filter(s => s.date === date);
  const soldMap = {};
  ds.forEach(s => { soldMap[s.productId] = (soldMap[s.productId] || 0) + s.qty; });
  const sold = products.filter(p => soldMap[p.id]).map(p => ({
    ...p, qty: soldMap[p.id], totS: p.price * soldMap[p.id], totC: p.cost * soldMap[p.id]
  }));
  const totS = sold.reduce((a, p) => a + p.totS, 0);
  const totC = sold.reduce((a, p) => a + p.totC, 0);
  const gp = totS - totC;
  const np = gp - hExp;
  const invC = products.reduce((a, p) => a + p.stock * p.cost, 0);
  const invS = products.reduce((a, p) => a + p.stock * p.price, 0);
  const alerts = products.filter(p => p.stock <= p.thr);

  let t = `📊 ${prettyDate(date).toUpperCase()} DAILY SALES AND INVENTORY REPORT\n\n`;
  t += `🛒 DAILY SALES REPORT\nSTEP 1: TOTAL SALES\n${ln()}\n`;
  t += `${pad("Product", 30)} ${rpad("Qty", 5)} ${rpad("Unit Price", 12)} ${rpad("Total Sales", 13)}\n${ln()}\n`;
  sold.length === 0 ? t += "  No sales recorded.\n" : sold.forEach(p => {
    t += `${pad(p.name.substring(0,29), 30)} ${rpad(p.qty, 5)} ${rpad(fmtP(p.price), 12)} ${rpad(fmtP(p.totS), 13)}\n`;
  });
  t += `${ln()}\n💰 TOTAL SALES = ${fmtP(totS)}\n\n`;

  t += `📦 COST OF GOODS SOLD\nSTEP 2: TOTAL COST\n${ln()}\n`;
  t += `${pad("Product", 30)} ${rpad("Qty", 5)} ${rpad("Cost/Unit", 12)} ${rpad("Total Cost", 13)}\n${ln()}\n`;
  sold.forEach(p => { t += `${pad(p.name.substring(0,29), 30)} ${rpad(p.qty, 5)} ${rpad(fmtP(p.cost), 12)} ${rpad(fmtP(p.totC), 13)}\n`; });
  t += `${ln()}\n📦 TOTAL COST = ${fmtP(totC)}\n\n`;

  t += `📈 GROSS PROFIT\n${fmtP(totS)} − ${fmtP(totC)} = ${fmtP(gp)}\nGROSS PROFIT = ${fmtP(gp)}\n\n`;
  t += `🏠 NET PROFIT\n${ln(42)}\n${pad("Gross Profit",28)} ${fmtP(gp)}\n${pad("Household Withdrawal",28)} ${fmtP(hExp)}\n${ln(42)}\n`;
  t += `NET PROFIT = ${fmtP(np)} ${np >= 0 ? "✅" : "❌"}\n\n`;

  t += `📦 INVENTORY REPORT\nSTEP 1: REMAINING STOCK\n${ln()}\n`;
  products.forEach(p => { t += `${pad(p.name.substring(0,33), 34)} ${rpad(p.stock, 14)}\n`; });

  t += `\n💵 TOTAL INVENTORY COST VALUE = ${fmtP(invC)}\n`;
  t += `🏷️ TOTAL INVENTORY SELLING VALUE = ${fmtP(invS)}\n`;
  t += `💹 POTENTIAL GROSS PROFIT = ${fmtP(invS - invC)}\n\n`;

  if (alerts.length > 0) {
    t += `⚠️ STOCK ALERTS\n`;
    alerts.forEach(p => {
      t += `• ${p.name} — ${p.stock <= 0 ? "OUT OF STOCK" : "LOW STOCK (" + p.stock + " left)"}\n`;
    });
    t += "\n";
  }
  t += `📋 SUMMARY\nTotal Sales: ${fmtP(totS)}  |  Total Cost: ${fmtP(totC)}  |  Gross Profit: ${fmtP(gp)}  |  Net Profit: ${fmtP(np)} ${np >= 0 ? "✅" : "❌"}\n\n`;
  t += `Generated by Business Sales & Inventory App  •  ${new Date().toLocaleString()}\n`;
  return t;
}

function buildMonthlyText(products, sales, hExp) {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`;
  const monthSales = sales.filter(s => s.date >= monthStart);
  const todayS = monthSales.filter(s => s.date === todayStr()).reduce((a,s) => {
    const p = products.find(x => x.id === s.productId); return a + (p ? p.price * s.qty : 0);
  }, 0);
  const todayC = monthSales.filter(s => s.date === todayStr()).reduce((a,s) => {
    const p = products.find(x => x.id === s.productId); return a + (p ? p.cost * s.qty : 0);
  }, 0);

  const allDays = [...HISTORICAL];
  if (todayS > 0) allDays.push({ date: todayStr(), day: dayName(todayStr()), sales: todayS, cost: todayC });

  const totS = allDays.reduce((a, d) => a + d.sales, 0);
  const totC = allDays.reduce((a, d) => a + d.cost, 0);
  const gp = totS - totC;
  const totalHH = hExp * allDays.length;
  const netG = gp - totalHH;
  const avg = totS / allDays.length;
  const sorted = [...allDays].sort((a, b) => b.sales - a.sales);
  const dowAcc = {};
  allDays.forEach(d => { if (!dowAcc[d.day]) dowAcc[d.day] = {t:0,c:0}; dowAcc[d.day].t += d.sales; dowAcc[d.day].c++; });

  let t = `📈 MAY 2026 FULL BUSINESS PERFORMANCE REPORT\n\n`;
  t += `🗓 PERIOD: May 1 – ${prettyDate(allDays[allDays.length-1]?.date)} · ${allDays.length} Days\n\n`;
  t += `💰 1. DAILY SALES BREAKDOWN\n${ln()}\n${pad("Date",14)} ${pad("Day",11)} ${rpad("Daily Sales",13)}\n${ln()}\n`;
  allDays.forEach(d => { t += `${pad(prettyDate(d.date),14)} ${pad(d.day.substring(0,10),11)} ${rpad(fmtP(d.sales),13)}\n`; });
  t += `${ln()}\nTOTAL SALES (${allDays.length} DAYS): ${fmtP(totS)}\n\n`;

  t += `📊 2. AVERAGE DAILY SALES = ${fmtP(avg)}\n\n`;
  t += `💰 3. TOTAL COST OF GOODS = ${fmtP(totC)}\n\n`;
  t += `💵 4. GROSS PROFIT = ${fmtP(gp)} (Margin: ${totS ? ((gp/totS)*100).toFixed(1) : 0}%)\n\n`;
  t += `🏠 5. HOUSEHOLD WITHDRAWALS = ${fmtP(hExp)}/day × ${allDays.length} days = ${fmtP(totalHH)}\n\n`;
  t += `📉 6. NET CAPITAL GROWTH = ${fmtP(netG)} ${netG >= 0 ? "✅" : "❌"}\n\n`;

  const invC = products.reduce((a,p) => a + p.stock * p.cost, 0);
  const invS = products.reduce((a,p) => a + p.stock * p.price, 0);
  t += `📦 7. INVENTORY POSITION\n`;
  t += `At Cost: ${fmtP(invC)}  |  At Selling Price: ${fmtP(invS)}  |  Potential Profit: ${fmtP(invS-invC)}\n\n`;

  t += `🥇 8. BEST SALES DAYS\n${ln()}\n`;
  sorted.slice(0, 10).forEach((d, i) => { t += `${rpad(i+1,3)}. ${pad(prettyDate(d.date),16)} ${d.day.padEnd(11)} ${fmtP(d.sales)}\n`; });

  t += `\n📊 9. SALES BY DAY OF WEEK\n${ln()}\n`;
  Object.entries(dowAcc).sort((a,b) => b[1].t - a[1].t).forEach(([day,v]) => {
    t += `• ${pad(day,11)} Avg: ${fmtP(v.t/v.c)}  Total: ${fmtP(v.t)}\n`;
  });

  t += `\n💎 10. HIGH-PROFIT PRODUCTS\n`;
  [...products].sort((a,b) => (b.price-b.cost)-(a.price-a.cost)).slice(0,8)
    .forEach(p => { t += `• ${p.name} — ${fmtP(p.price-p.cost)}/unit margin\n`; });

  t += `\n🏁 STATUS: ${netG >= 0 ? "POSITIVE NET GROWTH ✅" : "NET LOSS — REVIEW NEEDED ❌"}\n`;
  t += `Generated by Business Sales & Inventory App  •  ${new Date().toLocaleString()}\n`;
  return t;
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────
function Modal({ title, onClose, wide, children }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className={`mbox${wide ? " mwide" : ""}`} onClick={e => e.stopPropagation()}>
        <div className="mhead"><span className="mtitle">{title}</span><button className="mclose" onClick={onClose}>✕</button></div>
        {children}
      </div>
    </div>
  );
}
function Field({ label, children }) { return <div className="field"><label>{label}</label>{children}</div>; }

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [products, setProducts]     = useState([]);
  const [sales, setSales]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [processing, setProcessing] = useState(false);
  const [tab, setTab]               = useState("dashboard");
  const [rptTab, setRptTab]         = useState("daily");
  const [filterCat, setFilterCat]   = useState("All");
  const [hExp, setHExp]             = useState(983);
  const [alert, setAlert]           = useState(null);
  const [schedTime, setSchedTime]   = useState("20:00");
  const [schedOn, setSchedOn]       = useState(false);
  const [lastSent, setLastSent]     = useState("");
  const [reportDate, setReportDate] = useState(todayStr());
  const [mSale, setMSale]           = useState(false);
  const [mProd, setMProd]           = useState(false);
  const [mRestock, setMRestock]     = useState(false);
  const [mHExp, setMHExp]           = useState(false);
  const [sForm, setSForm]           = useState(BLANK_S);
  const [pForm, setPForm]           = useState(BLANK_P);
  const [rForm, setRForm]           = useState({ productId:"", qty:"" });
  const [hExpInput, setHExpInput]   = useState("983");
  const styleRef = useRef(null);
  const schedRef = useRef(null);

  // Inject CSS
  useEffect(() => {
    if (!styleRef.current) { const s = document.createElement("style"); s.textContent = FONT + CSS; document.head.appendChild(s); styleRef.current = s; }
    return () => { if (styleRef.current) { styleRef.current.remove(); styleRef.current = null; } };
  }, []);

  // Firebase: init & listen to products
  useEffect(() => {
    let unsub;
    (async () => {
      const snap = await getDocs(collection(db, "products"));
      if (snap.empty) {
        const batch = writeBatch(db);
        INITIAL_PRODUCTS.forEach(p => batch.set(doc(db, "products", String(p.id)), p));
        await batch.commit();
      }
      unsub = onSnapshot(collection(db, "products"), s => {
        setProducts(s.docs.map(d => ({ ...d.data(), id: Number(d.id) })).sort((a,b) => a.id - b.id));
        setLoading(false);
      });
    })();
    return () => unsub?.();
  }, []);

  // Firebase: listen to this month's sales
  useEffect(() => {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`;
    const unsub = onSnapshot(
      query(collection(db, "sales"), where("date", ">=", monthStart)),
      s => setSales(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, []);

  // Firebase: listen to settings
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "settings"), s => {
      if (s.exists()) {
        const d = s.data();
        if (d.hExp != null) setHExp(d.hExp);
        if (d.schedTime) setSchedTime(d.schedTime);
        if (d.schedOn != null) setSchedOn(d.schedOn);
      }
    });
    return unsub;
  }, []);

  // Auto-scheduler
  useEffect(() => {
    if (schedRef.current) clearInterval(schedRef.current);
    if (!schedOn) return;
    schedRef.current = setInterval(() => {
      const now = new Date();
      const hm = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      if (hm === schedTime && lastSent !== todayStr()) {
        doSendBoth(); setLastSent(todayStr()); showAlert("📧 Reports auto-sent to " + REPORT_EMAIL);
      }
    }, 20000);
    return () => clearInterval(schedRef.current);
  }, [schedOn, schedTime, lastSent, products, sales]);

  function showAlert(msg, type = "success") { setAlert({ msg, type }); setTimeout(() => setAlert(null), 3200); }

  async function saveSettings(newHExp, newSchedTime, newSchedOn) {
    try { await setDoc(doc(db, "config", "settings"), { hExp: newHExp, schedTime: newSchedTime, schedOn: newSchedOn }); }
    catch (e) { console.error("Settings save error:", e); }
  }

  function doSendDaily() {
    const txt = buildDailyText(products, sales, todayStr(), hExp);
    window.open(`mailto:${REPORT_EMAIL}?subject=${encodeURIComponent("Daily Sales & Inventory Report — " + prettyDate(todayStr()))}&body=${encodeURIComponent(txt)}`, "_self");
  }
  function doSendMonthly() {
    const txt = buildMonthlyText(products, sales, hExp);
    window.open(`mailto:${REPORT_EMAIL}?subject=${encodeURIComponent("Monthly Business Performance Report — May 2026")}&body=${encodeURIComponent(txt)}`, "_self");
  }
  function doSendBoth() { doSendDaily(); setTimeout(doSendMonthly, 1500); }

  async function handleSale() {
    if (!sForm.productId || !sForm.qty || Number(sForm.qty) <= 0) return showAlert("Fill all fields correctly", "error");
    const p = products.find(x => x.id === Number(sForm.productId));
    if (!p) return;
    if (p.stock < Number(sForm.qty)) return showAlert(`Only ${p.stock} units in stock`, "error");
    setProcessing(true);
    try {
      const qty = Number(sForm.qty);
      await runTransaction(db, async tx => {
        const snap = await tx.get(doc(db, "products", String(p.id)));
        const cur = snap.data().stock;
        if (cur < qty) throw new Error(`Only ${cur} units available`);
        tx.update(doc(db, "products", String(p.id)), { stock: cur - qty });
      });
      await addDoc(collection(db, "sales"), { productId: p.id, qty, date: sForm.date, channel: sForm.channel, ts: serverTimestamp() });
      setSForm(BLANK_S); setMSale(false);
      showAlert(`✓ Sale recorded — ${qty}× ${p.name}`);
    } catch (e) { showAlert(e.message || "Error saving sale", "error"); }
    setProcessing(false);
  }

  async function handleAddProduct() {
    const { name, sku, category, stock, thr, cost, price, upcoming } = pForm;
    if (!name || !sku) return showAlert("Name and SKU are required", "error");
    setProcessing(true);
    try {
      const nid = products.length ? Math.max(...products.map(x => x.id)) + 1 : 1;
      await setDoc(doc(db, "products", String(nid)), {
        id: nid, sku, name, category, upcoming: !!upcoming,
        stock: upcoming ? 0 : Number(stock) || 0,
        thr: Number(thr) || 10, cost: Number(cost) || 0, price: Number(price) || 0,
      });
      setPForm(BLANK_P); setMProd(false);
      showAlert(upcoming ? `📦 "${name}" added as upcoming` : `✓ "${name}" added to inventory`);
    } catch (e) { showAlert("Error adding product", "error"); }
    setProcessing(false);
  }

  async function handleRestock() {
    if (!rForm.productId || !rForm.qty || Number(rForm.qty) <= 0) return showAlert("Fill all fields", "error");
    const p = products.find(x => x.id === Number(rForm.productId));
    if (!p) return;
    setProcessing(true);
    try {
      await updateDoc(doc(db, "products", String(p.id)), { stock: p.stock + Number(rForm.qty), upcoming: false });
      setRForm({ productId:"", qty:"" }); setMRestock(false);
      showAlert(`✓ Restocked ${rForm.qty} units of ${p.name}`);
    } catch (e) { showAlert("Error restocking", "error"); }
    setProcessing(false);
  }

  // ── Computed ──
  const todaySales  = sales.filter(s => s.date === todayStr());
  const totRev      = todaySales.reduce((a,s) => { const p = products.find(x=>x.id===s.productId); return a+(p?p.price*s.qty:0); }, 0);
  const totCost     = todaySales.reduce((a,s) => { const p = products.find(x=>x.id===s.productId); return a+(p?p.cost*s.qty:0); }, 0);
  const totUnits    = todaySales.reduce((a,s) => a+s.qty, 0);
  const grossP      = totRev - totCost;
  const netP        = grossP - hExp;
  const lowStock    = products.filter(p => p.stock <= p.thr);
  const filtProds   = filterCat === "All" ? products : products.filter(p => p.category === filterCat);
  const invCostNow  = products.reduce((a,p) => a+p.stock*p.cost, 0);
  const invSaleNow  = products.reduce((a,p) => a+p.stock*p.price, 0);

  const todaySoldMap = {};
  todaySales.forEach(s => { todaySoldMap[s.productId] = (todaySoldMap[s.productId]||0) + s.qty; });
  const soldProds = products.filter(p => todaySoldMap[p.id]).map(p => ({
    ...p, qty: todaySoldMap[p.id], totS: p.price*todaySoldMap[p.id], totC: p.cost*todaySoldMap[p.id]
  }));

  const topProds = [...products].map(p => ({
    ...p,
    sold: todaySales.filter(s=>s.productId===p.id).reduce((a,s)=>a+s.qty,0),
    rev:  todaySales.filter(s=>s.productId===p.id).reduce((a,s)=>a+s.qty*p.price,0),
  })).sort((a,b) => b.rev - a.rev);
  const maxRev = topProds[0]?.rev || 1;

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`;
  const todayForMonth = totRev > 0 ? [{ date:todayStr(), day:dayName(todayStr()), sales:totRev, cost:totCost }] : [];
  const allDays = [...HISTORICAL, ...todayForMonth];
  const mTotSales = allDays.reduce((a,d)=>a+d.sales,0);
  const mTotCost  = allDays.reduce((a,d)=>a+d.cost,0);
  const mGross    = mTotSales - mTotCost;
  const mHH       = hExp * allDays.length;
  const mNet      = mGross - mHH;
  const mAvg      = mTotSales / allDays.length;
  const bestDays  = [...allDays].sort((a,b)=>b.sales-a.sales).slice(0,5);
  const dowAcc    = {};
  allDays.forEach(d => { if(!dowAcc[d.day]) dowAcc[d.day]={t:0,c:0}; dowAcc[d.day].t+=d.sales; dowAcc[d.day].c++; });
  const dowList   = Object.entries(dowAcc).sort((a,b)=>b[1].t-a[1].t);

  if (loading) return (
    <div className="loadscreen">
      <div className="logo" style={{marginBottom:24}}><span className="lmark">▐</span><span className="ltxt">BIZ SALES</span><span className="lsub">& Inventory App</span></div>
      <div className="spinner" />
      <p className="loadtxt">Loading your business data from Firebase...</p>
    </div>
  );

  return (
    <div className="app">
      {processing && <div className="proc"><div className="spinner sm" /></div>}
      {alert && <div className={`toast ${alert.type}`}>{alert.msg}</div>}

      <header className="hdr">
        <div className="logo"><span className="lmark">▐</span><span className="ltxt">BIZ SALES</span><span className="lsub">& Inventory App</span></div>
        <div className="hcenter">
          <div className="hdate"><span className="dlbl">TODAY</span><span className="dval">{prettyDateFull(todayStr())}</span></div>
          <div className="hdate"><span className="dlbl">INVENTORY BASIS</span><span className="dval">May 26, 2026 Ending Stock</span></div>
          {schedOn && <div className="spill">⏰ AUTO-SEND {schedTime}</div>}
        </div>
        {lowStock.length > 0 && <div className="lsbadge" onClick={()=>setTab("inventory")}>⚠ {lowStock.length} LOW STOCK</div>}
      </header>

      <nav className="nav">
        {[["dashboard","Dashboard"],["inventory","Inventory"],["reports","Reports & Email"]].map(([id,lbl]) => (
          <button key={id} className={`nbtn${tab===id?" act":""}`} onClick={()=>setTab(id)}>{lbl}</button>
        ))}
        <div className="nsp" />
        <button className="nact sale" onClick={()=>setMSale(true)}>+ ADD SALE</button>
        <button className="nact prod" onClick={()=>setMProd(true)}>+ ADD PRODUCT</button>
        <button className="nact exp"  onClick={()=>{setHExpInput(String(hExp));setMHExp(true);}}>⚙ EXPENSES</button>
      </nav>

      <main className="main">

        {/* ══ DASHBOARD ══ */}
        {tab === "dashboard" && (
          <div className="fi">
            <div className="kgrid">
              <div className="kpi accent"><span className="klbl">TOTAL SALES TODAY</span><span className="kval">{fmtP(totRev)}</span><span className="ksub">{totUnits} units · {todaySales.length} transactions</span></div>
              <div className="kpi"><span className="klbl">GROSS PROFIT</span><span className="kval green">{fmtP(grossP)}</span><span className="ksub">Margin {totRev?((grossP/totRev)*100).toFixed(1):0}%</span></div>
              <div className="kpi"><span className="klbl">NET PROFIT</span><span className={`kval ${netP>=0?"green":"red"}`}>{fmtP(netP)}</span><span className="ksub">After ₱{hExp.toLocaleString()} household exp.</span></div>
              <div className={`kpi${lowStock.length>0?" warn":""}`}><span className="klbl">LOW STOCK ALERTS</span><span className="kval red">{lowStock.length}</span><span className="ksub">Items need attention</span></div>
            </div>

            <div className="qgrid">
              <button className="qa primary" onClick={()=>setMSale(true)}><span className="qi">+</span><div><b>ADD DAILY SALE</b><small>Log a transaction</small></div></button>
              <button className="qa blue"    onClick={()=>setMProd(true)}><span className="qi">📦</span><div><b>ADD PRODUCT</b><small>New or upcoming item</small></div></button>
              <button className="qa teal"    onClick={()=>setMRestock(true)}><span className="qi">↑</span><div><b>RESTOCK</b><small>Receive inventory</small></div></button>
              <button className="qa amber"   onClick={()=>{setTab("reports");setRptTab("daily");}}><span className="qi">📄</span><div><b>DAILY REPORT</b><small>View &amp; email</small></div></button>
              <button className="qa purple"  onClick={()=>{setTab("reports");setRptTab("monthly");}}><span className="qi">📈</span><div><b>MONTHLY REPORT</b><small>May 2026 summary</small></div></button>
            </div>

            <div className="twocol">
              <section className="card">
                <h2 className="ctitle">TOP PRODUCTS TODAY</h2>
                {topProds.filter(p=>p.sold>0).length === 0
                  ? <p className="empty">No sales yet today — use ADD SALE to get started.</p>
                  : topProds.filter(p=>p.sold>0).slice(0,8).map(p => (
                    <div key={p.id} className="brow">
                      <div className="blbl"><span className="bname">{p.name}</span><span className="brev">{fmtP(p.rev)}</span></div>
                      <div className="btrack"><div className="bfill" style={{width:`${(p.rev/maxRev)*100}%`}}/></div>
                      <span className="bunits">{p.sold} units sold</span>
                    </div>
                  ))}
              </section>
              <div>
                <section className="card">
                  <h2 className="ctitle">TODAY vs MONTHLY AVG</h2>
                  <div className="statsrows">
                    <div className="sr"><span>Today Sales</span><strong>{fmtP(totRev)}</strong></div>
                    <div className="sr"><span>May Daily Avg</span><strong>{fmtP(mAvg)}</strong></div>
                    <div className="sr"><span>May Total ({allDays.length}d)</span><strong>{fmtP(mTotSales)}</strong></div>
                    <div className="sr"><span>May Net Growth</span><strong style={{color:mNet>=0?"#00d48a":"#ff6b6b"}}>{fmtP(mNet)}</strong></div>
                    <div className="sr"><span>Inventory (Cost)</span><strong>{fmtP(invCostNow)}</strong></div>
                    <div className="sr"><span>Inventory (Sell)</span><strong>{fmtP(invSaleNow)}</strong></div>
                  </div>
                </section>
                {lowStock.length > 0 && (
                  <section className="card cwarn">
                    <h2 className="ctitle">⚠ LOW STOCK</h2>
                    {lowStock.slice(0,6).map(p => (
                      <div key={p.id} className="lsrow">
                        <div><span className="lsname">{p.name}</span><span className="lssku">{p.sku}</span></div>
                        <span className="lsval">{p.stock<=0?"OUT":p.stock+" left"}</span>
                      </div>
                    ))}
                    {lowStock.length > 6 && <p className="empty" style={{marginTop:8}}>+{lowStock.length-6} more items</p>}
                  </section>
                )}
              </div>
            </div>

            <section className="card">
              <h2 className="ctitle">TODAY'S TRANSACTIONS — {prettyDate(todayStr())}</h2>
              {todaySales.length === 0 ? <p className="empty">No transactions recorded yet today.</p> : (
                <div className="twrap">
                  <table className="tbl">
                    <thead><tr>{["SKU","PRODUCT","QTY","CHANNEL","SALES","PROFIT"].map(h=><th key={h}>{h}</th>)}</tr></thead>
                    <tbody>
                      {[...todaySales].reverse().map(s => {
                        const p = products.find(x=>x.id===s.productId);
                        return (<tr key={s.id}>
                          <td className="mono dim">{p?.sku}</td><td>{p?.name}</td>
                          <td className="mono">{s.qty}</td>
                          <td><span className={`tag ${(s.channel||"walk-in").replace(/\s/g,"-").toLowerCase()}`}>{s.channel}</span></td>
                          <td className="mono green">{fmtP(p?.price*s.qty)}</td>
                          <td className="mono amber">{fmtP((p?.price-p?.cost)*s.qty)}</td>
                        </tr>);
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ══ INVENTORY ══ */}
        {tab === "inventory" && (
          <div className="fi">
            <div className="invhdr">
              <div className="fbar">
                {["All",...CATEGORIES].map(c=>(
                  <button key={c} className={`fbtn${filterCat===c?" act":""}`} onClick={()=>setFilterCat(c)}>{c}</button>
                ))}
              </div>
              <button className="smadd" onClick={()=>setMProd(true)}>+ ADD PRODUCT</button>
            </div>
            <div className="invsum">
              <div className="is"><span>TOTAL COST VALUE</span><strong>{fmtP(invCostNow)}</strong></div>
              <div className="is"><span>TOTAL SELLING VALUE</span><strong>{fmtP(invSaleNow)}</strong></div>
              <div className="is"><span>POTENTIAL PROFIT</span><strong>{fmtP(invSaleNow-invCostNow)}</strong></div>
              <div className="is"><span>LOW STOCK ITEMS</span><strong style={{color:lowStock.length>0?"#ff6b6b":"#00d48a"}}>{lowStock.length}</strong></div>
            </div>
            <div className="igrid">
              {filtProds.map(p => {
                const isOut = p.stock <= 0;
                const isLow = p.stock <= p.thr;
                const pct = Math.min(100,(p.stock/(p.thr*5))*100);
                return (
                  <div key={p.id} className={`icard${isOut?" out":isLow?" low":""}`}>
                    <div className="itop"><span className="isku">{p.sku}</span>
                      <span className={`ibadge${isOut?" out":isLow?" low":" ok"}`}>{isOut?"OUT":isLow?"LOW":"OK"}</span>
                    </div>
                    <h3 className="iname">{p.name}</h3>
                    <span className="icat">{p.category}</span>
                    <div className="smeter"><div className="sfill" style={{width:`${pct}%`,background:isOut?"#ff2244":isLow?"#ff6b6b":"#00d48a"}}/></div>
                    <div className="istats">
                      <div className="ist"><span>STOCK</span><strong>{p.stock}</strong></div>
                      <div className="ist"><span>MIN</span><strong>{p.thr}</strong></div>
                      <div className="ist"><span>COST</span><strong>{fmtP(p.cost)}</strong></div>
                      <div className="ist"><span>PRICE</span><strong>{fmtP(p.price)}</strong></div>
                    </div>
                    <div className="ifoot">
                      <span className="iinv">{fmtP(p.stock*p.cost)}</span>
                      <span className="imargin">{p.price?((( p.price-p.cost)/p.price)*100).toFixed(0):0}% margin</span>
                    </div>
                    {isLow && <button className="irbtn" onClick={()=>{setRForm({productId:String(p.id),qty:""});setMRestock(true);}}>RESTOCK →</button>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ REPORTS ══ */}
        {tab === "reports" && (
          <div className="fi">
            <div className="rtabs">
              <button className={`rtab${rptTab==="daily"?" act":""}`} onClick={()=>setRptTab("daily")}>📊 DAILY REPORT</button>
              <button className={`rtab${rptTab==="monthly"?" act":""}`} onClick={()=>setRptTab("monthly")}>📈 MONTHLY REPORT</button>
            </div>

            {rptTab === "daily" && (
              <div className="twocol">
                <section className="card">
                  <div className="rpt-date-row">
                    <h2 className="ctitle" style={{margin:0}}>📊 DAILY SALES & INVENTORY REPORT</h2>
                    <input type="date" value={reportDate} max={todayStr()}
                      onChange={e=>setReportDate(e.target.value)}
                      style={{background:"#111820",border:"1px solid #1a2030",color:"#f5c842",padding:"6px 10px",borderRadius:4,fontFamily:"'DM Mono',monospace",fontSize:12,outline:"none"}}/>
                  </div>
                  <p className="hint" style={{marginTop:6,marginBottom:14}}>{prettyDateFull(reportDate)}</p>

                  {(()=>{
                    const rSales = sales.filter(s=>s.date===reportDate);
                    const rSoldMap = {};
                    rSales.forEach(s=>{rSoldMap[s.productId]=(rSoldMap[s.productId]||0)+s.qty;});
                    const rSoldProds = products.filter(p=>rSoldMap[p.id]).map(p=>({...p,qty:rSoldMap[p.id],totS:p.price*rSoldMap[p.id],totC:p.cost*rSoldMap[p.id]}));
                    const rTotRev = rSoldProds.reduce((a,p)=>a+p.totS,0);
                    const rTotCost = rSoldProds.reduce((a,p)=>a+p.totC,0);
                    const rGrossP = rTotRev-rTotCost;
                    const rNetP = rGrossP-hExp;
                    return (<>
                  <h3 className="sub">🛒 STEP 1 — TOTAL SALES</h3>
                  {rSoldProds.length === 0 ? <p className="empty">No sales recorded for {prettyDate(reportDate)}.</p> : (
                    <div className="twrap">
                      <table className="tbl">
                        <thead><tr><th>PRODUCT</th><th>QTY</th><th>UNIT PRICE</th><th>TOTAL SALES</th></tr></thead>
                        <tbody>{rSoldProds.map(p=>(
                          <tr key={p.id}><td>{p.name}</td><td className="mono">{p.qty}</td><td className="mono">{fmtP(p.price)}</td><td className="mono green">{fmtP(p.totS)}</td></tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
                  <div className="rtotal">💰 TOTAL SALES = <strong>{fmtP(rTotRev)}</strong></div>

                  <h3 className="sub" style={{marginTop:16}}>📦 STEP 2 — COST OF GOODS SOLD</h3>
                  {rSoldProds.length > 0 && (
                    <div className="twrap">
                      <table className="tbl">
                        <thead><tr><th>PRODUCT</th><th>QTY</th><th>COST/UNIT</th><th>TOTAL COST</th></tr></thead>
                        <tbody>{rSoldProds.map(p=>(
                          <tr key={p.id}><td>{p.name}</td><td className="mono">{p.qty}</td><td className="mono">{fmtP(p.cost)}</td><td className="mono amber">{fmtP(p.totC)}</td></tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
                  <div className="rtotal">📦 TOTAL COST = <strong>{fmtP(rTotCost)}</strong></div>

                  <h3 className="sub" style={{marginTop:16}}>📈 STEP 3 — PROFIT</h3>
                  <div className="pbox">
                    <div className="prow"><span>Gross Profit</span><strong className="green">{fmtP(rGrossP)}</strong></div>
                    <div className="prow"><span>Household Withdrawal</span><strong className="red">−{fmtP(hExp)}</strong></div>
                    <div className="prow total"><span>NET PROFIT</span><strong className={rNetP>=0?"green":"red"}>{fmtP(rNetP)} {rNetP>=0?"✅":"❌"}</strong></div>
                  </div>

                  <h3 className="sub" style={{marginTop:16}}>📦 INVENTORY STATUS</h3>
                  <div className="pbox">
                    <div className="prow"><span>Total at Cost</span><strong>{fmtP(invCostNow)}</strong></div>
                    <div className="prow"><span>Total at Selling Price</span><strong>{fmtP(invSaleNow)}</strong></div>
                    <div className="prow"><span>Potential Gross Profit</span><strong className="green">{fmtP(invSaleNow-invCostNow)}</strong></div>
                  </div>

                  {lowStock.length > 0 && <>
                    <h3 className="sub warn" style={{marginTop:16}}>⚠️ STOCK ALERTS</h3>
                    {lowStock.map(p=>(
                      <div key={p.id} className="lsrow">
                        <div><span className="lsname">{p.name}</span><span className="lssku">{p.sku}</span></div>
                        <span className="lsval">{p.stock<=0?"OUT OF STOCK":p.stock+" units left"}</span>
                      </div>
                    ))}
                  </>}
                    </>);
                  })()}
                </section>

                <div>
                  <section className="card">
                    <h2 className="ctitle">📧 SEND DAILY REPORT</h2>
                    <p className="hint">Full formatted daily report emailed to:</p>
                    <div className="echip">{REPORT_EMAIL}</div>
                    <button className="sbtn" onClick={()=>{ const txt=buildDailyText(products,sales,reportDate,hExp); window.open(`mailto:${REPORT_EMAIL}?subject=${encodeURIComponent("Daily Sales & Inventory Report — "+prettyDate(reportDate))}&body=${encodeURIComponent(txt)}`,"_self"); }}>📄 OPEN DAILY REPORT IN EMAIL →</button>
                  </section>
                  <section className="card">
                    <h2 className="ctitle">📧 SEND BOTH REPORTS</h2>
                    <p className="hint">Send daily + monthly performance report together.</p>
                    <button className="sbtn both" onClick={doSendBoth}>📧 SEND BOTH REPORTS →</button>
                  </section>
                  <section className="card">
                    <h2 className="ctitle">⏰ AUTO-SEND SCHEDULE</h2>
                    <p className="hint">Auto-send both reports daily at the time you set. Tab must stay open.</p>
                    <div className="schedrow">
                      <Field label="SEND TIME (DAILY)">
                        <input type="time" value={schedTime}
                          onChange={async e => { setSchedTime(e.target.value); if (schedOn) await saveSettings(hExp, e.target.value, schedOn); }}
                          style={{background:"#111820",border:"1px solid #1a2030",color:"#e2e8f0",padding:"10px 12px",borderRadius:4,fontFamily:"'DM Mono',monospace",fontSize:14,width:"100%",outline:"none"}}/>
                      </Field>
                      <button className={`tbtn${schedOn?" on":""}`}
                        onClick={async () => { const v = !schedOn; setSchedOn(v); await saveSettings(hExp, schedTime, v); showAlert(v?"✓ Auto-send enabled":"⏹ Auto-send disabled"); }}>
                        {schedOn?"DISABLE":"ENABLE"}
                      </button>
                    </div>
                    {schedOn && <div className="spill" style={{borderRadius:4,padding:"10px 14px",fontSize:12,marginTop:8}}>● Active · {schedTime} daily · {REPORT_EMAIL}</div>}
                  </section>
                  <section className="card">
                    <h2 className="ctitle">REPORT TEXT PREVIEW</h2>
                    <pre className="rpre">{buildDailyText(products,sales,todayStr(),hExp)}</pre>
                  </section>
                </div>
              </div>
            )}

            {rptTab === "monthly" && (
              <div className="twocol">
                <section className="card">
                  <h2 className="ctitle">📈 MAY 2026 FULL BUSINESS PERFORMANCE REPORT</h2>
                  <p className="hint">Period: May 1 – {prettyDate(allDays[allDays.length-1]?.date)} · {allDays.length} Days</p>
                  <div className="mkpis">
                    <div className="mk"><span>TOTAL SALES</span><strong>{fmtP(mTotSales)}</strong></div>
                    <div className="mk"><span>DAILY AVG</span><strong>{fmtP(mAvg)}</strong></div>
                    <div className="mk"><span>GROSS PROFIT</span><strong className="green">{fmtP(mGross)}</strong></div>
                    <div className="mk"><span>HOUSEHOLD TOTAL</span><strong className="red">{fmtP(mHH)}</strong></div>
                    <div className="mk"><span>NET GROWTH</span><strong className={mNet>=0?"green":"red"}>{fmtP(mNet)}</strong></div>
                    <div className="mk"><span>MARGIN</span><strong>{mTotSales?((mGross/mTotSales)*100).toFixed(1):0}%</strong></div>
                  </div>

                  <h3 className="sub" style={{marginTop:14}}>🗓 DAILY BREAKDOWN</h3>
                  <div className="twrap" style={{maxHeight:300,overflowY:"auto"}}>
                    <table className="tbl">
                      <thead><tr><th>#</th><th>DATE</th><th>DAY</th><th>SALES</th></tr></thead>
                      <tbody>{allDays.map((d,i)=>(
                        <tr key={d.date} style={{background:d.date===todayStr()?"#f5c84210":""}}>
                          <td className="mono dim">{i+1}</td>
                          <td>{prettyDate(d.date)}</td>
                          <td className="dim">{d.day}</td>
                          <td className="mono green">{fmtP(d.sales)}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>

                  <h3 className="sub" style={{marginTop:16}}>🥇 TOP 5 BEST DAYS</h3>
                  {bestDays.map((d,i)=>(
                    <div key={d.date} className="lsrow">
                      <div><span className="lsname">#{i+1} {prettyDate(d.date)} · {d.day}</span></div>
                      <span className="lsval" style={{color:"#f5c842"}}>{fmtP(d.sales)}</span>
                    </div>
                  ))}

                  <h3 className="sub" style={{marginTop:16}}>📊 SALES BY DAY OF WEEK</h3>
                  {dowList.map(([day,v])=>(
                    <div key={day} className="brow">
                      <div className="blbl"><span className="bname">{day}</span><span className="brev">{fmtP(v.t/v.c)} avg</span></div>
                      <div className="btrack"><div className="bfill" style={{width:`${(v.t/v.c/mAvg)*100}%`,background:"#a855f7"}}/></div>
                      <span className="bunits">{v.c} days · {fmtP(v.t)} total</span>
                    </div>
                  ))}
                </section>

                <div>
                  <section className="card">
                    <h2 className="ctitle">📧 SEND MONTHLY REPORT</h2>
                    <p className="hint">Full May 2026 performance report emailed to:</p>
                    <div className="echip">{REPORT_EMAIL}</div>
                    <button className="sbtn" onClick={doSendMonthly}>📈 OPEN MONTHLY REPORT IN EMAIL →</button>
                  </section>
                  <section className="card">
                    <h2 className="ctitle">📧 SEND BOTH REPORTS</h2>
                    <button className="sbtn both" onClick={doSendBoth}>📧 SEND BOTH REPORTS →</button>
                  </section>
                  <section className="card">
                    <h2 className="ctitle">REPORT TEXT PREVIEW</h2>
                    <pre className="rpre">{buildMonthlyText(products,sales,hExp)}</pre>
                  </section>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ══ MODALS ══ */}
      {mSale && (
        <Modal title="ADD DAILY SALE" onClose={()=>setMSale(false)}>
          <div className="mbody">
            <Field label="SALE DATE">
              <input type="date" value={sForm.date} max={todayStr()} onChange={e=>setSForm(f=>({...f,date:e.target.value}))}/>
            </Field>
            <Field label="PRODUCT">
              <select value={sForm.productId} onChange={e=>setSForm(f=>({...f,productId:e.target.value}))}>
                <option value="">— Select product —</option>
                {products.filter(p=>p.stock>0).map(p=><option key={p.id} value={p.id}>{p.name} — {p.stock} in stock</option>)}
              </select>
            </Field>
            <Field label="QUANTITY SOLD">
              <input type="number" min="1" placeholder="0" value={sForm.qty} onChange={e=>setSForm(f=>({...f,qty:e.target.value}))}/>
            </Field>
            <Field label="SALES CHANNEL">
              <select value={sForm.channel} onChange={e=>setSForm(f=>({...f,channel:e.target.value}))}>
                {["Walk-in","Online","Wholesale"].map(c=><option key={c}>{c}</option>)}
              </select>
            </Field>
            {sForm.productId && sForm.qty && (()=>{
              const p = products.find(x=>x.id===Number(sForm.productId)); if(!p) return null;
              const rev = p.price*Number(sForm.qty), profit = (p.price-p.cost)*Number(sForm.qty);
              return (<div className="pvstrip">
                <div className="pvi"><span>Sales</span><strong>{fmtP(rev)}</strong></div>
                <div className="pvi"><span>Profit</span><strong>{fmtP(profit)}</strong></div>
                <div className="pvi"><span>Stock After</span><strong style={{color:p.stock-Number(sForm.qty)<=p.thr?"#ff6b6b":"#00d48a"}}>{p.stock-Number(sForm.qty)}</strong></div>
              </div>);
            })()}
            <div className="macts">
              <button className="mcancel" onClick={()=>setMSale(false)}>CANCEL</button>
              <button className="mconfirm" onClick={handleSale} disabled={processing}>RECORD SALE →</button>
            </div>
          </div>
        </Modal>
      )}

      {mProd && (
        <Modal title="ADD PRODUCT" onClose={()=>setMProd(false)} wide>
          <div className="mbody">
            <div className="trow">
              <span className="tlbl">Type:</span>
              <button className={`tbtn2${!pForm.upcoming?" act":""}`} onClick={()=>setPForm(f=>({...f,upcoming:false}))}>IN STOCK</button>
              <button className={`tbtn2${pForm.upcoming?" act up":""}`} onClick={()=>setPForm(f=>({...f,upcoming:true}))}>UPCOMING</button>
            </div>
            {pForm.upcoming && <div className="upnote">Will appear in Upcoming section until stock is received.</div>}
            <div className="f2col">
              <Field label="PRODUCT NAME *"><input placeholder="e.g. Doormat Rugs XL" value={pForm.name} onChange={e=>setPForm(f=>({...f,name:e.target.value}))}/></Field>
              <Field label="SKU *"><input placeholder="e.g. RUG-015" value={pForm.sku} onChange={e=>setPForm(f=>({...f,sku:e.target.value}))}/></Field>
              <Field label="CATEGORY">
                <select value={pForm.category} onChange={e=>setPForm(f=>({...f,category:e.target.value}))}>
                  {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="COST PRICE (₱) *"><input type="number" min="0" step="0.01" placeholder="0.00" value={pForm.cost} onChange={e=>setPForm(f=>({...f,cost:e.target.value}))}/></Field>
              <Field label="SELLING PRICE (₱) *"><input type="number" min="0" step="0.01" placeholder="0.00" value={pForm.price} onChange={e=>setPForm(f=>({...f,price:e.target.value}))}/></Field>
              <Field label="LOW STOCK THRESHOLD"><input type="number" min="1" placeholder="10" value={pForm.thr} onChange={e=>setPForm(f=>({...f,thr:e.target.value}))}/></Field>
              {!pForm.upcoming && <Field label="OPENING STOCK QTY"><input type="number" min="0" placeholder="0" value={pForm.stock} onChange={e=>setPForm(f=>({...f,stock:e.target.value}))}/></Field>}
              {pForm.cost && pForm.price && <div className="mprev">Margin: <strong>{pForm.price>0?(((pForm.price-pForm.cost)/pForm.price)*100).toFixed(1):0}%  ·  {fmtP(pForm.price-pForm.cost)}/unit</strong></div>}
            </div>
            <div className="macts">
              <button className="mcancel" onClick={()=>setMProd(false)}>CANCEL</button>
              <button className="mconfirm" onClick={handleAddProduct} disabled={processing}>{pForm.upcoming?"ADD UPCOMING →":"ADD TO INVENTORY →"}</button>
            </div>
          </div>
        </Modal>
      )}

      {mRestock && (
        <Modal title="RESTOCK INVENTORY" onClose={()=>setMRestock(false)}>
          <div className="mbody">
            <Field label="PRODUCT">
              <select value={rForm.productId} onChange={e=>setRForm(f=>({...f,productId:e.target.value}))}>
                <option value="">— Select product —</option>
                {products.map(p=><option key={p.id} value={p.id}>{p.name} — {p.stock} in stock{p.stock<=p.thr?" ⚠":""}</option>)}
              </select>
            </Field>
            <Field label="UNITS TO ADD">
              <input type="number" min="1" placeholder="0" value={rForm.qty} onChange={e=>setRForm(f=>({...f,qty:e.target.value}))}/>
            </Field>
            {rForm.productId && rForm.qty && (()=>{
              const p = products.find(x=>x.id===Number(rForm.productId)); if(!p) return null;
              return (<div className="pvstrip">
                <div className="pvi"><span>Current</span><strong>{p.stock}</strong></div>
                <div className="pvi"><span>Adding</span><strong>+{rForm.qty}</strong></div>
                <div className="pvi"><span>New Total</span><strong style={{color:p.stock+Number(rForm.qty)>p.thr?"#00d48a":"#ff6b6b"}}>{p.stock+Number(rForm.qty)}</strong></div>
              </div>);
            })()}
            <div className="macts">
              <button className="mcancel" onClick={()=>setMRestock(false)}>CANCEL</button>
              <button className="mconfirm" onClick={handleRestock} disabled={processing}>CONFIRM RESTOCK →</button>
            </div>
          </div>
        </Modal>
      )}

      {mHExp && (
        <Modal title="HOUSEHOLD EXPENSE SETTING" onClose={()=>setMHExp(false)}>
          <div className="mbody">
            <p className="hint" style={{marginBottom:16}}>Daily household withdrawal deducted from gross profit to calculate net profit. Saved to Firebase.</p>
            <Field label="DAILY HOUSEHOLD EXPENSE (₱)">
              <input type="number" min="0" step="1" value={hExpInput} onChange={e=>setHExpInput(e.target.value)}/>
            </Field>
            <div className="macts">
              <button className="mcancel" onClick={()=>setMHExp(false)}>CANCEL</button>
              <button className="mconfirm" onClick={async()=>{
                const v = Number(hExpInput)||0; setHExp(v);
                await saveSettings(v, schedTime, schedOn); setMHExp(false);
                showAlert(`✓ Expense set to ₱${v.toLocaleString()}/day`);
              }} disabled={processing}>SAVE →</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
.app{font-family:'DM Sans',sans-serif;background:#080b10;color:#e2e8f0;min-height:100vh}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes sld{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.fi{animation:fadeIn .3s ease}
.loadscreen{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#080b10;gap:20px}
.spinner{width:36px;height:36px;border:3px solid #1a2030;border-top-color:#f5c842;border-radius:50%;animation:spin 1s linear infinite}
.spinner.sm{width:22px;height:22px;border-width:2px}
.loadtxt{color:#2e3a50;font-family:'DM Mono',monospace;font-size:12px;letter-spacing:1px}
.proc{position:fixed;inset:0;background:#00000060;z-index:9998;display:flex;align-items:center;justify-content:center}
.toast{position:fixed;top:16px;right:16px;z-index:9999;padding:12px 20px;border-radius:4px;font-family:'DM Mono',monospace;font-size:13px;animation:sld .25s ease;max-width:380px}
.toast.success{background:#00d48a18;border:1px solid #00d48a55;color:#00d48a}
.toast.error{background:#ff444418;border:1px solid #ff444455;color:#ff6b6b}
.hdr{display:flex;align-items:center;gap:18px;padding:14px 22px;border-bottom:1px solid #171f2e;background:#0b0e18}
.logo{display:flex;align-items:baseline;gap:8px;flex-shrink:0}
.lmark{font-size:22px;color:#f5c842}
.ltxt{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:3px;color:#f5c842}
.lsub{font-size:10px;color:#2e3a50;letter-spacing:1px;text-transform:uppercase}
.hcenter{display:flex;align-items:center;gap:20px;margin-left:auto;flex-wrap:wrap}
.hdate{text-align:right}
.dlbl{display:block;font-size:9px;color:#2e3a50;letter-spacing:1.5px;font-family:'DM Mono',monospace}
.dval{font-family:'DM Mono',monospace;font-size:12px;color:#6b7a96}
.spill{background:#f5c84215;border:1px solid #f5c84244;color:#f5c842;padding:4px 12px;border-radius:20px;font-size:11px;font-family:'DM Mono',monospace;animation:pulse 2s infinite}
.lsbadge{background:#ff444418;border:1px solid #ff444455;color:#ff6b6b;padding:6px 14px;border-radius:4px;font-size:11px;letter-spacing:1px;cursor:pointer;font-family:'DM Mono',monospace;flex-shrink:0}
.nav{display:flex;align-items:center;gap:2px;padding:0 22px;background:#0b0e18;border-bottom:1px solid #171f2e}
.nbtn{background:none;border:none;color:#2e3a50;padding:12px 16px;font-size:11px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;font-family:'DM Mono',monospace;transition:color .2s}
.nbtn:hover{color:#6b7a96}.nbtn.act{color:#f5c842;border-bottom-color:#f5c842}
.nsp{flex:1}
.nact{border:none;padding:7px 14px;border-radius:4px;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;cursor:pointer;margin:6px 3px;transition:opacity .2s}
.nact:hover{opacity:.85}
.nact.sale{background:#f5c84222;border:1px solid #f5c84244;color:#f5c842}
.nact.prod{background:#3b82f622;border:1px solid #3b82f644;color:#60a5fa}
.nact.exp{background:#a855f722;border:1px solid #a855f744;color:#c084fc}
.main{padding:18px 22px;max-width:1300px}
.kgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}
@media(max-width:800px){.kgrid{grid-template-columns:repeat(2,1fr)}}
.kpi{background:#0c1018;border:1px solid #171f2e;border-radius:6px;padding:16px}
.kpi.accent{border-color:#f5c84233;background:#f5c84206}.kpi.warn{border-color:#ff444433}
.klbl{display:block;font-size:9px;letter-spacing:1.5px;color:#2e3a50;margin-bottom:8px;font-family:'DM Mono',monospace}
.kval{display:block;font-family:'Bebas Neue',sans-serif;font-size:32px;letter-spacing:1px;line-height:1}
.kval.green{color:#00d48a}.kval.red{color:#ff6b6b}.ksub{display:block;font-size:11px;color:#2e3a50;margin-top:5px}
.qgrid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:18px}
@media(max-width:900px){.qgrid{grid-template-columns:repeat(3,1fr)}}
.qa{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:6px;border:1px solid;cursor:pointer;transition:opacity .2s;background:none;text-align:left;width:100%}
.qa:hover{opacity:.8}
.qa b{display:block;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;color:#e2e8f0;margin-bottom:2px}
.qa small{font-size:10px;color:#2e3a50;display:block}.qi{font-size:18px;flex-shrink:0;width:26px;text-align:center}
.qa.primary{border-color:#f5c84244;background:#f5c84208}.qa.primary .qi{color:#f5c842}
.qa.blue{border-color:#3b82f644;background:#3b82f808}.qa.blue .qi{color:#60a5fa}
.qa.teal{border-color:#00d48a44;background:#00d48a08}.qa.teal .qi{color:#00d48a}
.qa.amber{border-color:#f5a84244;background:#f5a84208}.qa.amber .qi{color:#f5a842}
.qa.purple{border-color:#a855f744;background:#a855f708}.qa.purple .qi{color:#c084fc}
.twocol{display:grid;grid-template-columns:1.5fr 1fr;gap:12px;margin-bottom:12px}
@media(max-width:920px){.twocol{grid-template-columns:1fr}}
.card{background:#0c1018;border:1px solid #171f2e;border-radius:6px;padding:18px;margin-bottom:12px}
.card.cwarn{border-color:#ff444430}
.ctitle{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;color:#2e3a50;margin-bottom:14px}
.sub{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1.5px;color:#3a5070;margin-bottom:8px}
.sub.warn{color:#ff6b6b}
.brow{margin-bottom:12px}.blbl{display:flex;justify-content:space-between;margin-bottom:3px}
.bname{font-size:13px}.brev{font-family:'DM Mono',monospace;font-size:13px;color:#f5c842}
.btrack{height:3px;background:#171f2e;border-radius:2px;overflow:hidden;margin-bottom:2px}
.bfill{height:100%;background:#f5c842;border-radius:2px;transition:width .6s}
.bunits{font-size:10px;color:#2e3a50;font-family:'DM Mono',monospace}
.statsrows .sr{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #111820;font-size:13px}
.statsrows .sr span{color:#6b7a96}.statsrows .sr strong{font-family:'DM Mono',monospace;font-size:14px}
.lsrow{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #111820}
.lsname{display:block;font-size:13px}.lssku{font-size:10px;color:#2e3a50;font-family:'DM Mono',monospace}
.lsval{font-family:'DM Mono',monospace;font-size:13px;color:#ff6b6b;flex-shrink:0}
.twrap{overflow-x:auto}
.tbl{width:100%;border-collapse:collapse}
.tbl th{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;color:#2e3a50;text-align:left;padding:7px 10px;border-bottom:1px solid #171f2e}
.tbl td{padding:8px 10px;border-bottom:1px solid #0e1520;font-size:13px}
.tbl tr:hover td{background:#0f1520}
.mono{font-family:'DM Mono',monospace}.dim{color:#2e3a50}.green{color:#00d48a}.amber{color:#f5c842}.red{color:#ff6b6b}
.tag{display:inline-block;padding:2px 7px;border-radius:3px;font-size:10px;letter-spacing:.5px;font-family:'DM Mono',monospace}
.tag.walk-in{background:#00d48a18;color:#00d48a;border:1px solid #00d48a33}
.tag.online{background:#3b82f618;color:#60a5fa;border:1px solid #3b82f633}
.tag.wholesale{background:#f5c84218;color:#f5c842;border:1px solid #f5c84233}
.invhdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px}
.fbar{display:flex;gap:5px;flex-wrap:wrap}
.fbtn{background:#0c1018;border:1px solid #171f2e;color:#2e3a50;padding:5px 11px;border-radius:4px;font-size:9px;letter-spacing:1px;cursor:pointer;font-family:'DM Mono',monospace;transition:all .2s}
.fbtn:hover{color:#6b7a96}.fbtn.act{border-color:#f5c84255;color:#f5c842;background:#f5c84210}
.smadd{background:#f5c84222;border:1px solid #f5c84244;color:#f5c842;padding:6px 13px;border-radius:4px;font-size:10px;letter-spacing:1px;cursor:pointer;font-family:'DM Mono',monospace;flex-shrink:0}
.invsum{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}
@media(max-width:700px){.invsum{grid-template-columns:repeat(2,1fr)}}
.is{background:#0c1018;border:1px solid #171f2e;border-radius:4px;padding:10px 14px}
.is span{display:block;font-size:9px;color:#2e3a50;letter-spacing:1px;font-family:'DM Mono',monospace;margin-bottom:4px}
.is strong{font-family:'DM Mono',monospace;font-size:14px}
.igrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(228px,1fr));gap:9px}
.icard{background:#0c1018;border:1px solid #171f2e;border-radius:6px;padding:15px}
.icard.low{border-color:#ff444433}.icard.out{border-color:#ff222233;background:#ff000006}
.itop{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}
.isku{font-family:'DM Mono',monospace;font-size:9px;color:#2e3a50}
.ibadge{font-family:'DM Mono',monospace;font-size:8px;padding:2px 6px;border-radius:3px}
.ibadge.ok{background:#00d48a18;color:#00d48a;border:1px solid #00d48a33}
.ibadge.low{background:#ff444418;color:#ff6b6b;border:1px solid #ff444433}
.ibadge.out{background:#ff222218;color:#ff4444;border:1px solid #ff222233}
.iname{font-size:13px;font-weight:500;margin-bottom:3px}.icat{font-size:10px;color:#2e3a50;display:block;margin-bottom:9px}
.smeter{height:2px;background:#171f2e;border-radius:2px;overflow:hidden;margin-bottom:11px}
.sfill{height:100%;border-radius:2px;transition:width .6s}
.istats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:7px}
.ist{display:flex;flex-direction:column}
.ist span{font-size:8px;letter-spacing:1px;color:#2e3a50;font-family:'DM Mono',monospace}
.ist strong{font-size:12px;font-family:'DM Mono',monospace}
.ifoot{display:flex;justify-content:space-between;font-size:10px;color:#2e3a50;font-family:'DM Mono',monospace;margin-bottom:7px}
.imargin{color:#00d48a}
.irbtn{width:100%;padding:7px;background:#ff444418;border:1px solid #ff444433;color:#ff6b6b;border-radius:3px;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;cursor:pointer}
.rtabs{display:flex;gap:6px;margin-bottom:16px}
.rtab{background:#0c1018;border:1px solid #171f2e;color:#2e3a50;padding:9px 20px;border-radius:5px;font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;cursor:pointer;transition:all .2s}
.rtab:hover{color:#6b7a96}.rtab.act{border-color:#f5c84244;color:#f5c842;background:#f5c84210}
.rtotal{font-family:'DM Mono',monospace;font-size:14px;color:#e2e8f0;padding:10px 0;border-top:1px solid #171f2e;margin-top:8px}
.rtotal strong{color:#f5c842}
.pbox{background:#111820;border:1px solid #171f2e;border-radius:4px;overflow:hidden;margin-top:4px}
.prow{display:flex;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #171f2e;font-size:13px}
.prow:last-child{border-bottom:none}.prow.total{background:#0c1018}
.prow span{color:#6b7a96}.prow strong{font-family:'DM Mono',monospace;font-size:14px}
.hint{font-size:12px;color:#2e3a50;margin-bottom:12px;line-height:1.6}
.echip{background:#f5c84210;border:1px solid #f5c84233;color:#f5c842;padding:8px 14px;border-radius:4px;font-family:'DM Mono',monospace;font-size:12px;margin-bottom:14px;word-break:break-all}
.sbtn{width:100%;padding:12px;background:#f5c842;color:#080b10;border:none;border-radius:4px;font-family:'Bebas Neue',sans-serif;font-size:17px;letter-spacing:2px;cursor:pointer;transition:opacity .2s;margin-bottom:8px}
.sbtn:hover{opacity:.88}.sbtn.both{background:#00d48a}
.schedrow{display:flex;gap:10px;align-items:flex-end;margin-bottom:8px}
.tbtn{padding:10px 16px;border-radius:4px;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;cursor:pointer;background:#171f2e;border:1px solid #252f40;color:#6b7a96;transition:all .2s;white-space:nowrap;flex-shrink:0}
.tbtn.on{background:#00d48a18;border-color:#00d48a44;color:#00d48a}
.mkpis{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:14px}
.mk{background:#111820;border:1px solid #171f2e;border-radius:4px;padding:10px 13px}
.mk span{display:block;font-size:8px;color:#2e3a50;letter-spacing:1px;font-family:'DM Mono',monospace;margin-bottom:4px}
.mk strong{font-family:'DM Mono',monospace;font-size:14px}
.rpre{background:#060810;border:1px solid #171f2e;border-radius:4px;padding:12px;font-family:'DM Mono',monospace;font-size:10px;color:#3a5070;overflow-x:auto;white-space:pre;line-height:1.65;max-height:360px;overflow-y:auto}
.overlay{position:fixed;inset:0;background:#00000090;backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px}
.mbox{background:#0d1118;border:1px solid #171f2e;border-radius:8px;width:100%;max-width:480px;animation:fadeIn .2s}
.mwide{max-width:660px}
.mhead{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #171f2e}
.mtitle{font-family:'DM Mono',monospace;font-size:11px;letter-spacing:2px;color:#6b7a96}
.mclose{background:none;border:none;color:#2e3a50;font-size:16px;cursor:pointer;padding:4px}.mclose:hover{color:#e2e8f0}
.mbody{padding:20px}
.field{margin-bottom:14px}.field label{display:block;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;color:#2e3a50;margin-bottom:5px}
.field select,.field input{width:100%;background:#111820;border:1px solid #171f2e;color:#e2e8f0;padding:9px 12px;border-radius:4px;font-family:'DM Sans',sans-serif;font-size:13px;outline:none;transition:border-color .2s}
.field select:focus,.field input:focus{border-color:#f5c84244}
.field select:disabled,.field input:disabled,.mconfirm:disabled{opacity:.5;cursor:not-allowed}
.f2col{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}
@media(max-width:500px){.f2col{grid-template-columns:1fr}}
.pvstrip{display:flex;gap:0;margin-bottom:14px;border:1px solid #171f2e;border-radius:4px;overflow:hidden}
.pvi{flex:1;padding:9px 12px;background:#111820;text-align:center;border-right:1px solid #171f2e}
.pvi:last-child{border-right:none}
.pvi span{display:block;font-size:8px;color:#2e3a50;letter-spacing:1px;font-family:'DM Mono',monospace;margin-bottom:3px}
.pvi strong{font-family:'DM Mono',monospace;font-size:14px}
.macts{display:flex;gap:8px;justify-content:flex-end;margin-top:8px}
.mcancel{background:none;border:1px solid #171f2e;color:#2e3a50;padding:9px 18px;border-radius:4px;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;cursor:pointer}
.mcancel:hover{color:#6b7a96}
.mconfirm{background:#f5c842;color:#080b10;border:none;padding:9px 22px;border-radius:4px;font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:2px;cursor:pointer;transition:opacity .2s}
.mconfirm:hover{opacity:.88}
.trow{display:flex;align-items:center;gap:8px;margin-bottom:14px;padding:10px 12px;background:#111820;border-radius:4px;border:1px solid #171f2e}
.tlbl{font-family:'DM Mono',monospace;font-size:10px;color:#2e3a50;letter-spacing:1px;flex-shrink:0}
.tbtn2{padding:6px 13px;border-radius:4px;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;cursor:pointer;background:#0c1018;border:1px solid #171f2e;color:#2e3a50;transition:all .2s}
.tbtn2.act{background:#f5c84215;border-color:#f5c84244;color:#f5c842}
.tbtn2.act.up{background:#3b82f615;border-color:#3b82f644;color:#60a5fa}
.upnote{font-size:11px;color:#60a5fa;background:#3b82f60a;border:1px solid #3b82f822;border-radius:4px;padding:9px 13px;margin-bottom:12px}
.mprev{grid-column:span 2;font-size:12px;color:#6b7a96;padding:8px 0;font-family:'DM Mono',monospace}
.mprev strong{color:#00d48a}
.rpt-date-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;flex-wrap:wrap;gap:8px}
.empty{color:#2e3a50;font-size:13px;padding:6px 0}
`;
