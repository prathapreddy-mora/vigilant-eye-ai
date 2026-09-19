import { useSyncExternalStore } from "react";

type Lang = "en" | "te";
const dict: Record<Lang, Record<string, string>> = {
  en: {
    dashboard: "Dashboard", scanner: "Live Scanner", alerts: "Alerts", search: "Search",
    history: "Scan History", signout: "Sign out", scanned: "Vehicles Scanned",
    verified: "Verified", suspicious: "Suspicious", stolen: "Stolen",
    challans: "Pending Challans", criminal: "Criminal Cases", active_alerts: "Active Alerts",
    start_scan: "Start Scanning", stop_scan: "Stop", plate: "Number Plate",
    owner: "Owner", status: "Status", risk: "Risk", confidence: "OCR Confidence",
    resolve: "Mark Resolved", close: "Close Alert", assign: "Assign Officer",
    add_note: "Add Investigation Note", download_pdf: "Download PDF Report",
  },
  te: {
    dashboard: "డాష్‌బోర్డ్", scanner: "లైవ్ స్కానర్", alerts: "హెచ్చరికలు", search: "శోధన",
    history: "స్కాన్ చరిత్ర", signout: "సైన్ అవుట్", scanned: "స్కాన్ చేసిన వాహనాలు",
    verified: "ధృవీకరించబడింది", suspicious: "అనుమానితం", stolen: "దొంగిలించబడింది",
    challans: "పెండింగ్ చలాన్‌లు", criminal: "క్రిమినల్ కేసులు", active_alerts: "క్రియాశీల హెచ్చరికలు",
    start_scan: "స్కానింగ్ ప్రారంభించండి", stop_scan: "ఆపండి", plate: "నంబర్ ప్లేట్",
    owner: "యజమాని", status: "స్థితి", risk: "ప్రమాదం", confidence: "OCR విశ్వాసం",
    resolve: "పరిష్కృతంగా గుర్తు పెట్టండి", close: "హెచ్చరిక మూసివేయండి", assign: "అధికారిని కేటాయించండి",
    add_note: "దర్యాప్తు నోట్ జోడించండి", download_pdf: "PDF నివేదిక డౌన్‌లోడ్",
  },
};
let lang: Lang = "en";
const listeners = new Set<() => void>();
function get() { return lang; }
function sub(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); }
export function setLang(l: Lang) {
  lang = l;
  if (typeof window !== "undefined") localStorage.setItem("tp-lang", l);
  listeners.forEach((cb) => cb());
}
export function initLang() {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("tp-lang") as Lang | null;
    if (stored === "en" || stored === "te") lang = stored;
  }
}
export function useLang() {
  return useSyncExternalStore(sub, get, () => "en" as Lang);
}
export function t(key: keyof typeof dict.en) {
  return dict[lang][key] ?? dict.en[key];
}
