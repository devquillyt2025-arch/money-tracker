(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/store/useLedgerStore.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_CATEGORIES",
    ()=>DEFAULT_CATEGORIES,
    "INITIAL_DEFAULT_ENTRIES",
    ()=>INITIAL_DEFAULT_ENTRIES,
    "formatIndianCurrency",
    ()=>formatIndianCurrency,
    "useLedgerStore",
    ()=>useLedgerStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zustand/esm/react.mjs [app-client] (ecmascript)");
;
const DEFAULT_CATEGORIES = [
    "Food & Grocery",
    "Shopping",
    "Travel",
    "Bills & Subscription",
    "Investment",
    "Miscellaneous"
];
// Generate sensible default entries spanning recent months
const now = Date.now();
const getRecentDate = (daysAgo)=>new Date(now - daysAgo * 86400000).toISOString().split("T")[0];
const INITIAL_DEFAULT_ENTRIES = [
    {
        id: "1",
        name: "Monthly Salary",
        category: "Miscellaneous",
        amount: 185000,
        type: "income",
        date: getRecentDate(2)
    },
    {
        id: "2",
        name: "Index Fund SIP",
        category: "Investment",
        amount: 40000,
        type: "expense",
        date: getRecentDate(5)
    },
    {
        id: "3",
        name: "Nature's Basket Organic",
        category: "Food & Grocery",
        amount: 8450,
        type: "expense",
        date: getRecentDate(6)
    },
    {
        id: "4",
        name: "AWS Cloud & GitHub",
        category: "Bills & Subscription",
        amount: 3200,
        type: "expense",
        date: getRecentDate(10)
    },
    {
        id: "5",
        name: "Flight to Bengaluru",
        category: "Travel",
        amount: 11200,
        type: "expense",
        date: getRecentDate(15)
    },
    {
        id: "6",
        name: "Apple One Premier",
        category: "Bills & Subscription",
        amount: 1499,
        type: "expense",
        date: getRecentDate(20)
    },
    {
        id: "7",
        name: "Direct Equity Buy (Tata Motors)",
        category: "Investment",
        amount: 35000,
        type: "expense",
        date: getRecentDate(35)
    },
    {
        id: "8",
        name: "Quarterly Bonus",
        category: "Miscellaneous",
        amount: 75000,
        type: "income",
        date: getRecentDate(45)
    },
    {
        id: "9",
        name: "Urban Company & Repairs",
        category: "Miscellaneous",
        amount: 4500,
        type: "expense",
        date: getRecentDate(60)
    },
    {
        id: "10",
        name: "Mutual Fund Lumpsum",
        category: "Investment",
        amount: 50000,
        type: "expense",
        date: getRecentDate(75)
    }
];
const useLedgerStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["create"])((set)=>({
        entries: [],
        isHydrated: false,
        activeNav: "Dashboard",
        isAddModalOpen: false,
        setActiveNav: (nav)=>set({
                activeNav: nav
            }),
        setIsAddModalOpen: (open)=>set({
                isAddModalOpen: open
            }),
        hydrate: ()=>{
            try {
                const data = localStorage.getItem("ledger-dark-entries");
                if (data) {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        set({
                            entries: parsed,
                            isHydrated: true
                        });
                        return;
                    }
                }
                // If empty or first load, populate with stunning default entries
                localStorage.setItem("ledger-dark-entries", JSON.stringify(INITIAL_DEFAULT_ENTRIES));
                set({
                    entries: INITIAL_DEFAULT_ENTRIES,
                    isHydrated: true
                });
            } catch (e) {
                console.error("Failed to parse localStorage data", e);
                set({
                    entries: INITIAL_DEFAULT_ENTRIES,
                    isHydrated: true
                });
            }
        },
        addEntry: (entryData)=>{
            const newEntry = {
                id: crypto.randomUUID(),
                ...entryData,
                amount: Math.round(entryData.amount)
            };
            set((state)=>{
                const updatedEntries = [
                    newEntry,
                    ...state.entries
                ];
                try {
                    localStorage.setItem("ledger-dark-entries", JSON.stringify(updatedEntries));
                } catch (e) {
                    console.error("Failed to save to localStorage", e);
                }
                return {
                    entries: updatedEntries
                };
            });
        },
        deleteEntry: (id)=>{
            set((state)=>{
                const updatedEntries = state.entries.filter((entry)=>entry.id !== id);
                try {
                    localStorage.setItem("ledger-dark-entries", JSON.stringify(updatedEntries));
                } catch (e) {
                    console.error("Failed to save to localStorage", e);
                }
                return {
                    entries: updatedEntries
                };
            });
        }
    }));
const formatIndianCurrency = (amount, includePrefixSign = false, forcePlus = false)=>{
    const absAmount = Math.abs(amount);
    const formatted = absAmount.toLocaleString("en-IN", {
        maximumFractionDigits: 0
    });
    if (includePrefixSign) {
        if (amount < 0) {
            return `-₹${formatted}`;
        }
        if (forcePlus && amount > 0) {
            return `+₹${formatted}`;
        }
    }
    return `₹${formatted}`;
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/Eyebrow.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Eyebrow",
    ()=>Eyebrow
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/store/useLedgerStore.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
function Eyebrow() {
    _s();
    const isHydrated = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLedgerStore"])({
        "Eyebrow.useLedgerStore[isHydrated]": (state)=>state.isHydrated
    }["Eyebrow.useLedgerStore[isHydrated]"]);
    const dateStr = isHydrated ? new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).toUpperCase() : "";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
        className: "flex justify-between items-center border-b border-line pb-3 mb-7 font-mono uppercase text-[11px] text-gray tracking-wider",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                children: "Net Worth Ledger"
            }, void 0, false, {
                fileName: "[project]/src/components/Eyebrow.tsx",
                lineNumber: 20,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                children: dateStr
            }, void 0, false, {
                fileName: "[project]/src/components/Eyebrow.tsx",
                lineNumber: 21,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/Eyebrow.tsx",
        lineNumber: 19,
        columnNumber: 5
    }, this);
}
_s(Eyebrow, "qha+pLFzZI7xeCBDXD9joPX8XN8=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLedgerStore"]
    ];
});
_c = Eyebrow;
var _c;
__turbopack_context__.k.register(_c, "Eyebrow");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/Hero.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Hero",
    ()=>Hero
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/store/useLedgerStore.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/components/AnimatePresence/index.mjs [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function Hero() {
    _s();
    const entries = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLedgerStore"])({
        "Hero.useLedgerStore[entries]": (state)=>state.entries
    }["Hero.useLedgerStore[entries]"]);
    let assets = 0;
    let liabilities = 0;
    entries.forEach((entry)=>{
        if (entry.section === "Liabilities") {
            liabilities += entry.amount;
        } else {
            assets += entry.amount;
        }
    });
    const netWorth = assets - liabilities;
    const count = entries.length;
    const formattedNetWorth = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatIndianCurrency"])(netWorth, true);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "mb-10",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-[13px] text-gray font-sans mb-1 tracking-wide",
                children: "Total net worth"
            }, void 0, false, {
                fileName: "[project]/src/components/Hero.tsx",
                lineNumber: 25,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `text-[clamp(40px,6vw+1rem,64px)] font-mono font-bold leading-tight select-none flex items-center ${netWorth >= 0 ? "text-green" : "text-red"}`,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "inline-flex overflow-hidden py-1",
                    children: formattedNetWorth.split("").map((char, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AnimatePresence"], {
                            mode: "popLayout",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].span, {
                                initial: {
                                    y: 25,
                                    opacity: 0
                                },
                                animate: {
                                    y: 0,
                                    opacity: 1
                                },
                                exit: {
                                    y: -25,
                                    opacity: 0
                                },
                                transition: {
                                    duration: 0.25,
                                    type: "tween",
                                    ease: "easeInOut"
                                },
                                className: "inline-block",
                                children: char
                            }, `${char}-${idx}`, false, {
                                fileName: "[project]/src/components/Hero.tsx",
                                lineNumber: 36,
                                columnNumber: 15
                            }, this)
                        }, idx, false, {
                            fileName: "[project]/src/components/Hero.tsx",
                            lineNumber: 35,
                            columnNumber: 13
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/src/components/Hero.tsx",
                    lineNumber: 33,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/Hero.tsx",
                lineNumber: 28,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "font-mono text-[13px] text-gray mt-2 flex flex-wrap items-center gap-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: [
                            "Assets:",
                            " ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                className: "text-green font-bold",
                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatIndianCurrency"])(assets)
                            }, void 0, false, {
                                fileName: "[project]/src/components/Hero.tsx",
                                lineNumber: 53,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Hero.tsx",
                        lineNumber: 51,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: "·"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Hero.tsx",
                        lineNumber: 57,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: [
                            "Liabilities:",
                            " ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                className: "text-red font-bold",
                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatIndianCurrency"])(liabilities)
                            }, void 0, false, {
                                fileName: "[project]/src/components/Hero.tsx",
                                lineNumber: 60,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Hero.tsx",
                        lineNumber: 58,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: "·"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Hero.tsx",
                        lineNumber: 64,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: [
                            count,
                            " ",
                            count === 1 ? "entry" : "entries"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Hero.tsx",
                        lineNumber: 65,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Hero.tsx",
                lineNumber: 50,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/Hero.tsx",
        lineNumber: 24,
        columnNumber: 5
    }, this);
}
_s(Hero, "aPR4Nte5mjW5pwrb8Egm6QjouTQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLedgerStore"]
    ];
});
_c = Hero;
var _c;
__turbopack_context__.k.register(_c, "Hero");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/Tabs.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Tabs",
    ()=>Tabs
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/store/useLedgerStore.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
function Tabs() {
    _s();
    const activeTab = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLedgerStore"])({
        "Tabs.useLedgerStore[activeTab]": (state)=>state.activeTab
    }["Tabs.useLedgerStore[activeTab]"]);
    const setActiveTab = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLedgerStore"])({
        "Tabs.useLedgerStore[setActiveTab]": (state)=>state.setActiveTab
    }["Tabs.useLedgerStore[setActiveTab]"]);
    const tabs = [
        "All",
        ...__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SECTION_TYPES"]
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
        className: "flex items-center gap-6 border-b border-line mb-8 overflow-x-auto scrollbar-none",
        children: tabs.map((tab)=>{
            const isActive = activeTab === tab;
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: ()=>setActiveTab(tab),
                className: `font-mono uppercase text-[12px] pb-2 px-1 transition-colors whitespace-nowrap -mb-[1px] border-b-2 ${isActive ? "text-ink font-bold border-gold" : "text-gray font-normal border-transparent hover:text-ink"}`,
                children: tab
            }, tab, false, {
                fileName: "[project]/src/components/Tabs.tsx",
                lineNumber: 16,
                columnNumber: 11
            }, this);
        })
    }, void 0, false, {
        fileName: "[project]/src/components/Tabs.tsx",
        lineNumber: 12,
        columnNumber: 5
    }, this);
}
_s(Tabs, "yM4wLvpa8wX373dycUCtjS00bZE=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLedgerStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLedgerStore"]
    ];
});
_c = Tabs;
var _c;
__turbopack_context__.k.register(_c, "Tabs");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/SectionBlock.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SectionBlock",
    ()=>SectionBlock
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/store/useLedgerStore.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function SectionBlock({ section }) {
    _s();
    const [name, setName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [amount, setAmount] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const allEntries = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLedgerStore"])({
        "SectionBlock.useLedgerStore[allEntries]": (state)=>state.entries
    }["SectionBlock.useLedgerStore[allEntries]"]);
    const addEntry = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLedgerStore"])({
        "SectionBlock.useLedgerStore[addEntry]": (state)=>state.addEntry
    }["SectionBlock.useLedgerStore[addEntry]"]);
    const deleteEntry = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLedgerStore"])({
        "SectionBlock.useLedgerStore[deleteEntry]": (state)=>state.deleteEntry
    }["SectionBlock.useLedgerStore[deleteEntry]"]);
    const entries = allEntries.filter((e)=>e.section === section);
    const subtotal = entries.reduce((sum, entry)=>sum + entry.amount, 0);
    const isLiability = section === "Liabilities";
    const formattedSubtotal = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatIndianCurrency"])(isLiability && subtotal > 0 ? -subtotal : subtotal, true);
    const handleSubmit = (e)=>{
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (!name.trim() || isNaN(numAmount) || numAmount <= 0) {
            return; // ignore silently as per specification
        }
        addEntry(section, name, numAmount);
        setName("");
        setAmount("");
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mb-12",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex justify-between items-center border-b border-ink pb-2 mb-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "font-mono uppercase text-[12px] font-bold text-ink",
                        children: section
                    }, void 0, false, {
                        fileName: "[project]/src/components/SectionBlock.tsx",
                        lineNumber: 42,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: `font-mono text-[14px] font-bold ${isLiability ? "text-red" : "text-green"}`,
                        children: formattedSubtotal
                    }, void 0, false, {
                        fileName: "[project]/src/components/SectionBlock.tsx",
                        lineNumber: 45,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/SectionBlock.tsx",
                lineNumber: 41,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "divide-y divide-line",
                children: entries.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "py-8 text-center italic text-gray text-[13px] border-b border-line",
                    children: "No entries yet — add one below."
                }, void 0, false, {
                    fileName: "[project]/src/components/SectionBlock.tsx",
                    lineNumber: 57,
                    columnNumber: 11
                }, this) : entries.map((entry)=>{
                    const formattedDate = new Date(entry.timestamp).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                    });
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_120px_auto_auto] items-center gap-3 py-2.5 hover:bg-paper-dim/30 transition-colors px-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "font-sans font-medium text-[14px] text-ink truncate",
                                children: entry.name
                            }, void 0, false, {
                                fileName: "[project]/src/components/SectionBlock.tsx",
                                lineNumber: 75,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "font-mono text-[10px] text-gray hidden sm:block",
                                children: formattedDate
                            }, void 0, false, {
                                fileName: "[project]/src/components/SectionBlock.tsx",
                                lineNumber: 78,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: `font-mono font-bold text-right text-[14px] ${isLiability ? "text-red" : "text-green"}`,
                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatIndianCurrency"])(entry.amount)
                            }, void 0, false, {
                                fileName: "[project]/src/components/SectionBlock.tsx",
                                lineNumber: 81,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>deleteEntry(entry.id),
                                title: "Delete entry",
                                className: "text-gray hover:text-red hover:bg-red-soft w-6 h-6 flex items-center justify-center rounded-[5px] transition-colors text-[12px] cursor-pointer",
                                children: "✕"
                            }, void 0, false, {
                                fileName: "[project]/src/components/SectionBlock.tsx",
                                lineNumber: 88,
                                columnNumber: 17
                            }, this)
                        ]
                    }, entry.id, true, {
                        fileName: "[project]/src/components/SectionBlock.tsx",
                        lineNumber: 71,
                        columnNumber: 15
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/src/components/SectionBlock.tsx",
                lineNumber: 55,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                onSubmit: handleSubmit,
                className: "mt-4 grid grid-cols-1 sm:grid-cols-[1fr_160px_100px] gap-2 pt-1",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "text",
                        placeholder: "Add new entry...",
                        value: name,
                        onChange: (e)=>setName(e.target.value),
                        className: "bg-paper-dim border border-line rounded-[5px] px-3 py-2 text-[13px] font-sans text-ink placeholder:text-gray focus:outline-none focus:border-gold transition-colors"
                    }, void 0, false, {
                        fileName: "[project]/src/components/SectionBlock.tsx",
                        lineNumber: 106,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "number",
                        placeholder: "Amount (₹)...",
                        value: amount,
                        onChange: (e)=>setAmount(e.target.value),
                        className: "bg-paper-dim border border-line rounded-[5px] px-3 py-2 text-[13px] font-mono text-ink placeholder:text-gray focus:outline-none focus:border-gold transition-colors"
                    }, void 0, false, {
                        fileName: "[project]/src/components/SectionBlock.tsx",
                        lineNumber: 113,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "submit",
                        className: "bg-ink text-paper font-mono font-bold text-[12px] py-2 px-4 rounded-[5px] hover:opacity-90 transition-opacity flex items-center justify-center cursor-pointer",
                        children: "+ Add"
                    }, void 0, false, {
                        fileName: "[project]/src/components/SectionBlock.tsx",
                        lineNumber: 120,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/SectionBlock.tsx",
                lineNumber: 102,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/SectionBlock.tsx",
        lineNumber: 39,
        columnNumber: 5
    }, this);
}
_s(SectionBlock, "MEAcRCyfx4mpG/TBRNufyESxEyA=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLedgerStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLedgerStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLedgerStore"]
    ];
});
_c = SectionBlock;
var _c;
__turbopack_context__.k.register(_c, "SectionBlock");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/Footer.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Footer",
    ()=>Footer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
;
function Footer() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("footer", {
        className: "mt-auto py-8 border-t border-line text-center font-mono text-[11px] text-gray tracking-wider",
        children: "Stored locally on this device — only you can see this ledger."
    }, void 0, false, {
        fileName: "[project]/src/components/Footer.tsx",
        lineNumber: 3,
        columnNumber: 5
    }, this);
}
_c = Footer;
var _c;
__turbopack_context__.k.register(_c, "Footer");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Home
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/store/useLedgerStore.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Eyebrow$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/Eyebrow.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Hero$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/Hero.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Tabs$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/Tabs.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$SectionBlock$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/SectionBlock.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Footer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/Footer.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
function Home() {
    _s();
    const isHydrated = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLedgerStore"])({
        "Home.useLedgerStore[isHydrated]": (state)=>state.isHydrated
    }["Home.useLedgerStore[isHydrated]"]);
    const activeTab = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLedgerStore"])({
        "Home.useLedgerStore[activeTab]": (state)=>state.activeTab
    }["Home.useLedgerStore[activeTab]"]);
    const hydrate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLedgerStore"])({
        "Home.useLedgerStore[hydrate]": (state)=>state.hydrate
    }["Home.useLedgerStore[hydrate]"]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Home.useEffect": ()=>{
            hydrate();
        }
    }["Home.useEffect"], [
        hydrate
    ]);
    if (!isHydrated) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
            className: "max-w-3xl mx-auto w-full px-4 py-8 flex flex-col min-h-screen",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Eyebrow$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Eyebrow"], {}, void 0, false, {
                    fileName: "[project]/src/app/page.tsx",
                    lineNumber: 23,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex-1 flex items-center justify-center font-mono text-[13px] text-gray animate-pulse",
                    children: "Loading ledger..."
                }, void 0, false, {
                    fileName: "[project]/src/app/page.tsx",
                    lineNumber: 24,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Footer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Footer"], {}, void 0, false, {
                    fileName: "[project]/src/app/page.tsx",
                    lineNumber: 27,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/page.tsx",
            lineNumber: 22,
            columnNumber: 7
        }, this);
    }
    const visibleSections = activeTab === "All" ? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SECTION_TYPES"] : __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SECTION_TYPES"].filter((s)=>s === activeTab);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "max-w-3xl mx-auto w-full px-4 py-8 flex flex-col min-h-screen",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Eyebrow$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Eyebrow"], {}, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 37,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Hero$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Hero"], {}, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 38,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Tabs$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Tabs"], {}, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 39,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1",
                children: visibleSections.map((section)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$SectionBlock$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SectionBlock"], {
                        section: section
                    }, section, false, {
                        fileName: "[project]/src/app/page.tsx",
                        lineNumber: 42,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 40,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Footer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Footer"], {}, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 45,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/page.tsx",
        lineNumber: 36,
        columnNumber: 5
    }, this);
}
_s(Home, "Kgjm5aH8rEYPe341VPOwKKV9Ypg=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLedgerStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLedgerStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$useLedgerStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLedgerStore"]
    ];
});
_c = Home;
var _c;
__turbopack_context__.k.register(_c, "Home");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_12leqjd._.js.map