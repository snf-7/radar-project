/* ============================================================================
   RADAR (رادار) — Fintech Fraud-Intelligence Prototype
   Pure vanilla JS. No backend. All data & logic simulated in memory.

   Sections:
     1. i18n dictionary + language engine
     2. App state
     3. Utilities (format, random, latency)
     4. Transaction data simulator (Saudi context)
     5. Scoring engine (4 weighted dimensions -> composite + reason codes)
     6. Renderers (KPIs count-up, feed, engine panel)
     7. Threat map (equirectangular plotting + impossible-travel arcs)
     8. Silent Verification modal (Tier 1 FaceID -> Tier 2 Nafath -> Tier 3 Voice)
     9. Legacy vs Radar showdown
    10. Scenario runner (deterministic fraud + false-positive)
    11. Live feed loop (start / pause / resume)
    12. Boot
   ============================================================================ */

(function () {
    "use strict";

    /* ========================================================================
       1. i18n
       ======================================================================== */
    const I18N = {
        ar: {
            kpi_fp: "إنذارات كاذبة تم تفاديها",
            kpi_cost: "تكلفة موفّرة (ريال)",
            kpi_tps: "معاملات/ثانية",
            kpi_latency: "متوسّط زمن الاستجابة",
            feed_title: "التدفّق المباشر للمعاملات",
            feed_hint: "اضغط على أي صف لفحصه",
            col_customer: "العميل", col_amount: "المبلغ", col_merchant: "التاجر",
            col_city: "المدينة", col_score: "الخطورة", col_status: "الحالة",
            engine_title: "محرّك رادار · 4 أبعاد",
            engine_empty: "اختر معاملة من التدفّق لعرض التحليل التفصيلي.",
            latency_label: "زمن القرار",
            composite_label: "النتيجة المركّبة",
            status_safe: "آمنة", status_review: "مراجعة", status_fraud: "احتيال",
            dim_geo: "السرعة الجغرافية", dim_device: "ذكاء الجهاز",
            dim_flow: "التدفّق المالي", dim_time: "السياق الزمني",
            map_title: "الخريطة العالمية للتهديدات — عرض المهاجم",
            map_timer_label: "زمن الكشف والتجميد",
            map_idle: "المراقبة نشطة", map_detect: "تم الكشف · تجميد",
            device_prompt: "طلب تحقّق على جهاز العميل",
            legend_customer: "عميل موثوق", legend_attacker: "مهاجم", legend_traffic: "حركة عادية",
            legacy_title: "بنك تقليدي (Legacy)", radar_title: "رادار (Radar)",
            legacy_cost: "تكلفة مكالمة الوكيل (ريال)", legacy_churn: "عملاء محبَطون",
            radar_retained: "العملاء المحتفظ بهم", radar_revenue: "الإيراد المحمي (ريال)",
            tier1_tag: "المستوى 1 · تحقّق صامت", tier1_title: "التحقّق الصامت",
            tier1_sub: "تحقّق حيوي مرتبط بالجهاز (FIDO2 / Passkey)",
            tier1_btn: "تأكيد عبر FaceID", tier1_ignore: "تجاهل الإشعار",
            tier2_tag: "المستوى 2 · نفاذ", tier2_title: "التحقّق عبر نفاذ",
            tier2_sub: "توثيق حكومي · اختر الرقم المطابق",
            tier2_code: "رقم التحقّق الظاهر في تطبيقك",
            tier2_fallback: "تعذّر التحقّق؟ روبوت رادار الصوتي",
            tier3_tag: "المستوى 3 · روبوت صوتي", tier3_title: "روبوت رادار الصوتي",
            tier3_sub: "يطلب التأكيد داخل التطبيق فقط — لا يتم التحقّق عبر المكالمة",
            tier3_calling: "جارٍ الاتصال بالعميل…",
            tier3_tahaqaq: "تحقّق ربط الرقم عبر تحقّق (Tahaqaq) لمنع تبديل الشريحة",
            tier3_btn: "تأكيد داخل التطبيق",
            dock_title: "لوحة تشغيل العرض",
            dock_fraud: "سيناريو الاحتيال (الرياض←لندن)",
            dock_fp: "سيناريو الإنذار الكاذب (دبي)",
            dock_pause: "إيقاف التدفّق", dock_resume: "استئناف التدفّق",
            toast_approved_t: "تمت الموافقة على العملية",
            toast_approved_m: "تأكيد الهوية عبر التحقّق الصامت ومنع المهاجم.",
            toast_nafath_t: "تم التوثيق عبر نفاذ",
            toast_nafath_m: "توثيق حكومي ناجح — أعلى درجات الضمان.",
            toast_voice_t: "تم التأكيد داخل التطبيق",
            toast_voice_m: "أكّد العميل العملية عبر إشعار آمن — لا تحقّق صوتي.",
            toast_blocked_t: "تم تجميد حساب المهاجم",
            toast_blocked_m: "GEO_VELOCITY_IMPOSSIBLE — حظر فوري دون احتكاك للعميل.",
            toast_retained_t: "تم الاحتفاظ بالعميل",
            toast_retained_m: "تحقّق صامت بنقرتين — صفر احتكاك، 0.05 ريال.",
            legacy_blocked: "بطاقة محظورة", legacy_blocked_sub: "تم تعليق العملية في مطار دبي",
            legacy_agent: "تم إرسال مكالمة وكيل",
            radar_kept: "تم الاحتفاظ بالعميل ✓", radar_kept_sub: "تحقّق صامت بنقرتين",
            radar_friction: "صفر احتكاك",
            face_scanning: "SCANNING…", face_ok: "VERIFIED ✓",
            nafath_ok: "MATCH ✓ — APPROVED", nafath_wrong: "حاول مرة أخرى",
        },
        en: {
            kpi_fp: "False Positives Avoided",
            kpi_cost: "Cost Saved (SAR)",
            kpi_tps: "Transactions / sec",
            kpi_latency: "Avg. Response Time",
            feed_title: "Live Transaction Feed",
            feed_hint: "Click any row to inspect",
            col_customer: "Customer", col_amount: "Amount", col_merchant: "Merchant",
            col_city: "City", col_score: "Risk", col_status: "Status",
            engine_title: "Radar Engine · 4 Dimensions",
            engine_empty: "Select a transaction from the feed to see the breakdown.",
            latency_label: "Decision time",
            composite_label: "Composite Score",
            status_safe: "SAFE", status_review: "REVIEW", status_fraud: "FRAUD",
            dim_geo: "Geo-Velocity", dim_device: "Device Intelligence",
            dim_flow: "Financial Flow", dim_time: "Time Context",
            map_title: "Global Threat Map — Attacker View",
            map_timer_label: "Detect & freeze time",
            map_idle: "Monitoring active", map_detect: "Detected · Frozen",
            device_prompt: "Verification on customer device",
            legend_customer: "Trusted customer", legend_attacker: "Attacker", legend_traffic: "Normal traffic",
            legacy_title: "Legacy Bank", radar_title: "Radar",
            legacy_cost: "Agent call cost (SAR)", legacy_churn: "Frustrated customers",
            radar_retained: "Customers retained", radar_revenue: "Revenue protected (SAR)",
            tier1_tag: "Tier 1 · Silent", tier1_title: "Silent Verification",
            tier1_sub: "Device-bound biometric (FIDO2 / Passkey)",
            tier1_btn: "Confirm with FaceID", tier1_ignore: "Ignore notification",
            tier2_tag: "Tier 2 · Nafath", tier2_title: "Nafath Verification",
            tier2_sub: "Government-grade · pick the matching number",
            tier2_code: "Verification number shown in your app",
            tier2_fallback: "Can't verify? Radar Voice Bot",
            tier3_tag: "Tier 3 · Voice Bot", tier3_title: "Radar Voice Bot",
            tier3_sub: "Only prompts you to confirm in-app — never verifies over the call",
            tier3_calling: "Calling customer…",
            tier3_tahaqaq: "Number-binding via Tahaqaq to defeat SIM-swap",
            tier3_btn: "Confirm in-app",
            dock_title: "Demo Control Deck",
            dock_fraud: "Fraud scenario (Riyadh→London)",
            dock_fp: "False-positive scenario (Dubai)",
            dock_pause: "Pause feed", dock_resume: "Resume feed",
            toast_approved_t: "Transaction approved",
            toast_approved_m: "Identity confirmed via silent verification; attacker blocked.",
            toast_nafath_t: "Verified via Nafath",
            toast_nafath_m: "Government-grade authentication — highest assurance.",
            toast_voice_t: "Confirmed in-app",
            toast_voice_m: "Customer confirmed via secure prompt — no voice verification.",
            toast_blocked_t: "Attacker account frozen",
            toast_blocked_m: "GEO_VELOCITY_IMPOSSIBLE — instant block, zero customer friction.",
            toast_retained_t: "Customer retained",
            toast_retained_m: "Two-tap silent check — zero friction, 0.05 SAR.",
            legacy_blocked: "CARD BLOCKED", legacy_blocked_sub: "Transaction halted at Dubai Airport",
            legacy_agent: "Agent call dispatched",
            radar_kept: "Customer retained ✓", radar_kept_sub: "Two-tap silent check",
            radar_friction: "Zero friction",
            face_scanning: "SCANNING…", face_ok: "VERIFIED ✓",
            nafath_ok: "MATCH ✓ — APPROVED", nafath_wrong: "Try again",
        },
    };

    let lang = "ar";
    const t = (key) => (I18N[lang] && I18N[lang][key]) || key;

    /* ========================================================================
       2. State
       ======================================================================== */
    const state = {
        feed: [],
        selectedId: null,
        paused: false,
        scenarioRunning: false,
        seq: 1000,
        kpi: { fp: 1284, cost: 192600, tps: 0, retained: 0, revenue: 0, legacyCost: 0, legacyChurn: 0 },
    };

    /* ========================================================================
       3. Utilities
       ======================================================================== */
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => Array.from(document.querySelectorAll(sel));
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const rand = (min, max) => Math.random() * (max - min) + min;
    const randInt = (min, max) => Math.floor(rand(min, max + 1));
    const pick = (arr) => arr[randInt(0, arr.length - 1)];

    // Inline SVG icon helper — references the <symbol> sprite defined in index.html.
    const svgIco = (id, cls = "ico") => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;

    const fmtSAR = (n) => new Intl.NumberFormat("en-US").format(Math.round(n));
    const fmtSAR2 = (n) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

    function maskCard() {
        return "•••• " + randInt(1000, 9999);
    }
    function nowTime() {
        const d = new Date();
        return d.toLocaleTimeString("en-GB", { hour12: false });
    }

    // Animated count-up for an element's text.
    function countUp(el, to, { duration = 1200, decimals = 0, prefix = "", suffix = "" } = {}) {
        if (!el) return;
        const from = parseFloat((el.dataset.val || "0")) || 0;
        const start = performance.now();
        function frame(now) {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            const val = from + (to - from) * eased;
            el.textContent = prefix + new Intl.NumberFormat("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(val) + suffix;
            if (p < 1) requestAnimationFrame(frame);
            else el.dataset.val = String(to);
        }
        requestAnimationFrame(frame);
    }

    // Animate a millisecond timer that ticks UP and stops at `final` (< 80ms).
    function runLatencyTimer(el, final, duration = 900, suffixHtml = "ms") {
        const start = performance.now();
        return new Promise((resolve) => {
            function frame(now) {
                const p = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - p, 2);
                const val = Math.round(final * eased);
                el.innerHTML = val + '<span class="text-sm">' + suffixHtml + "</span>";
                if (p < 1) requestAnimationFrame(frame);
                else resolve();
            }
            requestAnimationFrame(frame);
        });
    }

    /* ========================================================================
       4. Transaction simulator (Saudi context)
       ======================================================================== */
    const CITIES = [
        { ar: "الرياض", en: "Riyadh" },
        { ar: "جدة", en: "Jeddah" },
        { ar: "الدمام", en: "Dammam" },
        { ar: "مكة", en: "Makkah" },
        { ar: "المدينة", en: "Madinah" },
        { ar: "أبها", en: "Abha" },
    ];
    const MERCHANTS = [
        { ar: "كارفور", en: "Carrefour" },
        { ar: "نون", en: "noon" },
        { ar: "جرير", en: "Jarir" },
        { ar: "ستاربكس", en: "Starbucks" },
        { ar: "أرامكو", en: "Aramco Station" },
        { ar: "هنقرستيشن", en: "HungerStation" },
        { ar: "آبل ستور", en: "Apple Store" },
        { ar: "تميمي", en: "Tamimi" },
    ];

    function genTransaction(overrides = {}) {
        const city = pick(CITIES);
        const merchant = pick(MERCHANTS);
        const amount = +rand(35, 4200).toFixed(2);
        const base = {
            id: "TXN-" + (state.seq++).toString(16).toUpperCase().padStart(5, "0"),
            customer: maskCard(),
            amount,
            merchant,
            city,
            time: nowTime(),
            // raw signals feeding the scoring engine (0..1 each)
            signals: {
                geoVelocity: rand(0, 0.25),
                deviceAnomaly: rand(0, 0.2),
                financialFlow: amount > 3000 ? rand(0.3, 0.6) : rand(0, 0.3),
                timeContext: rand(0, 0.3),
                rootDetected: false,
                newBeneficiary: Math.random() < 0.15,
                trustedDevice: Math.random() < 0.85,
            },
        };
        const tx = Object.assign(base, overrides);
        scoreTransaction(tx);
        return tx;
    }

    /* ========================================================================
       5. Scoring engine — 4 weighted dimensions
       ======================================================================== */
    const WEIGHTS = { geo: 0.35, device: 0.25, flow: 0.25, time: 0.15 };

    function scoreTransaction(tx) {
        const s = tx.signals;

        // Each dimension -> 0..100 sub-score + reason code.
        const geo = Math.round(Math.min(1, s.geoVelocity) * 100);
        const device = Math.round(Math.min(1, s.deviceAnomaly + (s.rootDetected ? 0.6 : 0) - (s.trustedDevice ? 0.1 : 0)) * 100);
        const flow = Math.round(Math.min(1, s.financialFlow + (s.newBeneficiary ? 0.3 : 0)) * 100);
        const time = Math.round(Math.min(1, s.timeContext) * 100);

        const composite = Math.round(geo * WEIGHTS.geo + device * WEIGHTS.device + flow * WEIGHTS.flow + time * WEIGHTS.time);

        // Reason codes (technical tokens — English in both languages).
        const codes = [];
        if (geo >= 70) codes.push({ c: "GEO_VELOCITY_IMPOSSIBLE", bad: true });
        else if (geo >= 40) codes.push({ c: "GEO_VELOCITY_HIGH", bad: true });
        else codes.push({ c: "GEO_OK", bad: false, ok: true });

        if (s.rootDetected) codes.push({ c: "ROOT_DETECTED", bad: true });
        if (s.trustedDevice) codes.push({ c: "TRUSTED_DEVICE_OK", bad: false, ok: true });
        else codes.push({ c: "DEVICE_UNKNOWN", bad: true });
        if (s.newBeneficiary) codes.push({ c: "NEW_BENEFICIARY", bad: true });
        if (flow >= 60) codes.push({ c: "AMOUNT_ANOMALY", bad: true });
        if (time >= 60) codes.push({ c: "ODD_HOUR", bad: true });

        let level = "safe";
        if (composite >= 70) level = "fraud";
        else if (composite >= 40) level = "review";

        tx.scores = { geo, device, flow, time, composite };
        tx.codes = codes;
        tx.level = level;
        tx.reasons = {
            geo: geo >= 70 ? "GEO_VELOCITY_IMPOSSIBLE" : geo >= 40 ? "GEO_VELOCITY_HIGH" : "within expected radius",
            device: s.rootDetected ? "ROOT_DETECTED" : s.trustedDevice ? "TRUSTED_DEVICE_OK" : "DEVICE_UNKNOWN",
            flow: s.newBeneficiary ? "NEW_BENEFICIARY" : flow >= 60 ? "AMOUNT_ANOMALY" : "normal spend pattern",
            time: time >= 60 ? "ODD_HOUR" : "typical activity window",
        };
        tx.latency = randInt(61, 79); // always sub-80ms
        return tx;
    }

    /* ========================================================================
       6. Renderers
       ======================================================================== */
    const feedEl = $("#feed");

    function levelClass(level) {
        return level === "fraud" ? "pill-fraud" : level === "review" ? "pill-review" : "pill-safe";
    }
    function levelLabel(level) {
        return level === "fraud" ? t("status_fraud") : level === "review" ? t("status_review") : t("status_safe");
    }

    function feedRowHtml(tx, isEnter) {
        const cityName = lang === "ar" ? tx.city.ar : tx.city.en;
        const merchName = lang === "ar" ? tx.merchant.ar : tx.merchant.en;
        return `
            <span class="mono text-xs text-[var(--dim)]">${tx.customer}</span>
            <span class="mono text-sm font-bold text-white">${fmtSAR2(tx.amount)} <span class="text-[10px] text-[var(--dim)]">SAR</span></span>
            <span class="text-sm text-[#cdd7ec] truncate">${merchName}</span>
            <span class="text-sm text-[var(--dim)]">${cityName}</span>
            <span class="mono text-sm font-bold ${tx.level === "fraud" ? "text-fraud" : tx.level === "review" ? "text-review" : "text-safe"}">${tx.scores.composite}</span>
            <span><span class="pill ${levelClass(tx.level)}">${levelLabel(tx.level)}</span></span>`;
    }

    function addFeedRow(tx, { prepend = true } = {}) {
        const row = document.createElement("div");
        row.className = "feed-row enter" + (tx.level === "fraud" ? " " : "");
        row.dataset.id = tx.id;
        row.innerHTML = feedRowHtml(tx);
        row.addEventListener("click", () => selectTransaction(tx.id));
        if (prepend) feedEl.prepend(row);
        else feedEl.appendChild(row);
        // cap feed length
        while (feedEl.children.length > 14) feedEl.removeChild(feedEl.lastChild);
        setTimeout(() => row.classList.remove("enter"), 600);
        return row;
    }

    function selectTransaction(id) {
        state.selectedId = id;
        $$(".feed-row").forEach((r) => r.classList.toggle("selected", r.dataset.id === id));
        const tx = state.feed.find((x) => x.id === id);
        if (tx) renderEngine(tx);
    }

    const DIMS = [
        { key: "geo", i18n: "dim_geo", icon: "i-globe" },
        { key: "device", i18n: "dim_device", icon: "i-cpu" },
        { key: "flow", i18n: "dim_flow", icon: "i-banknote" },
        { key: "time", i18n: "dim_time", icon: "i-clock" },
    ];

    function dimColor(v) {
        return v >= 70 ? "#FF4D5E" : v >= 40 ? "#FFB020" : "#00E5A0";
    }

    function renderEngine(tx) {
        const cityName = lang === "ar" ? tx.city.ar : tx.city.en;
        const merchName = lang === "ar" ? tx.merchant.ar : tx.merchant.en;
        $("#engineTx").innerHTML = `
            <div class="flex items-center justify-between gap-2">
                <span class="mono text-xs text-safe">${tx.id}</span>
                <span class="pill ${levelClass(tx.level)}">${levelLabel(tx.level)}</span>
            </div>
            <div class="mt-2 text-white text-sm font-bold mono">${fmtSAR2(tx.amount)} SAR</div>
            <div class="text-xs text-[var(--dim)]">${merchName} · ${cityName} · <span class="mono">${tx.time}</span></div>`;

        // dimensions
        $("#dims").innerHTML = DIMS.map((d) => {
            const v = tx.scores[d.key];
            const reason = tx.reasons[d.key];
            return `
            <div>
                <div class="flex items-center justify-between mb-1.5">
                    <span class="text-sm text-[#cdd7ec] inline-flex items-center gap-2 shrink-0 whitespace-nowrap">${svgIco(d.icon, "ico ico-sm")}${t(d.i18n)}</span>
                    <span class="mono text-sm font-bold" style="color:${dimColor(v)}">${v}</span>
                </div>
                <div class="gauge-track"><div class="gauge-fill" style="width:${v}%; background:${dimColor(v)}; box-shadow:0 0 10px ${dimColor(v)}66"></div></div>
                <p class="mono text-[10px] mt-1" style="color:${v >= 40 ? dimColor(v) : "var(--dim)"}">${reason}</p>
            </div>`;
        }).join("");

        // animate gauges from 0
        requestAnimationFrame(() => {
            $$("#dims .gauge-fill").forEach((el) => {
                const w = el.style.width;
                el.style.width = "0%";
                requestAnimationFrame(() => (el.style.width = w));
            });
        });

        // composite
        $("#compositeScore").textContent = tx.scores.composite;
        const cf = $("#compositeFill");
        cf.style.width = "0%";
        cf.style.background = `linear-gradient(90deg, ${dimColor(tx.scores.composite)}, #3b82f6)`;
        requestAnimationFrame(() => (cf.style.width = tx.scores.composite + "%"));

        const cp = $("#compositePill");
        cp.className = "pill " + levelClass(tx.level);
        cp.innerHTML = `<span>${levelLabel(tx.level)}</span>`;

        // reason codes
        $("#reasonCodes").innerHTML = tx.codes
            .map((c) => `<span class="code-tag ${c.bad ? "bad" : c.ok ? "ok" : ""}">${c.c}</span>`)
            .join("");

        // latency readout (sub-80ms)
        runLatencyTimer($("#latencyTimer"), tx.latency, 700);
    }

    /* ========================================================================
       7. Threat map — equirectangular plotting + arcs
       ======================================================================== */
    const MAP_W = 1000, MAP_H = 460;
    const GEO = {
        riyadh: { lat: 24.71, lon: 46.68, label: "Riyadh" },
        london: { lat: 51.5, lon: -0.12, label: "London" },
        jeddah: { lat: 21.49, lon: 39.19, label: "Jeddah" },
        dubai: { lat: 25.2, lon: 55.27, label: "Dubai" },
        ny: { lat: 40.71, lon: -74.0, label: "New York" },
        singapore: { lat: 1.35, lon: 103.8, label: "Singapore" },
        cairo: { lat: 30.04, lon: 31.24, label: "Cairo" },
    };
    function project(lat, lon) {
        return { x: ((lon + 180) / 360) * MAP_W, y: ((90 - lat) / 180) * MAP_H };
    }
    const SVGNS = "http://www.w3.org/2000/svg";
    function el(name, attrs) {
        const node = document.createElementNS(SVGNS, name);
        for (const k in attrs) node.setAttribute(k, attrs[k]);
        return node;
    }

    function drawMapGrid() {
        const g = $("#mapGrid");
        g.innerHTML = "";
        for (let x = 0; x <= MAP_W; x += 50) g.appendChild(el("line", { x1: x, y1: 0, x2: x, y2: MAP_H }));
        for (let y = 0; y <= MAP_H; y += 50) g.appendChild(el("line", { x1: 0, y1: y, x2: MAP_W, y2: y }));
    }

    function staticNode(geo, color, r = 4) {
        const p = project(geo.lat, geo.lon);
        const g = el("g", { class: "map-node" });
        g.appendChild(el("circle", { cx: p.x, cy: p.y, r: r + 6, fill: color, opacity: 0.12 }));
        g.appendChild(el("circle", { cx: p.x, cy: p.y, r, fill: color }));
        return g;
    }

    function drawAmbientNodes() {
        const ng = $("#mapNodes");
        ng.innerHTML = "";
        ["jeddah", "dubai", "ny", "singapore", "cairo"].forEach((k) => {
            ng.appendChild(staticNode(GEO[k], "#FFB020", 3));
        });
    }

    function initMap() {
        drawMapGrid();
        drawAmbientNodes();
        $("#mapArcs").innerHTML = "";
    }

    function arcPath(a, b, lift = 90) {
        const pa = project(a.lat, a.lon), pb = project(b.lat, b.lon);
        const mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2 - lift;
        return `M ${pa.x} ${pa.y} Q ${mx} ${my} ${pb.x} ${pb.y}`;
    }

    /* ========================================================================
       8. Verification modal — Tier 1 -> 2 -> 3
       ======================================================================== */
    const modal = $("#verifyModal");

    function setTier(n) {
        $$(".tier-dot").forEach((d) => d.classList.toggle("on", +d.dataset.tier <= n));
    }
    function showStep(step) {
        $$(".tier-step").forEach((s) => s.classList.toggle("active", s.dataset.step === step));
    }
    function openModal(step = "A", tier = 1) {
        showStep(step);
        setTier(tier);
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
        if (step === "A") runFaceScan();
    }
    function closeModal() {
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
        stopVoiceBars();
    }

    let faceTimer = null;
    function runFaceScan() {
        const status = $("#faceStatus"), icon = $("#faceIcon");
        status.textContent = t("face_scanning");
        status.style.color = "var(--safe)";
        icon.style.color = "var(--safe)";
        icon.innerHTML = svgIco("i-scan-face");
        clearTimeout(faceTimer);
        faceTimer = setTimeout(() => {
            status.textContent = t("face_ok");
            icon.innerHTML = svgIco("i-shield-check");
        }, 2000);
    }

    // Build Nafath number options (one correct).
    function buildNafath() {
        const correct = randInt(10, 98);
        $("#nafathCode").textContent = correct;
        $("#nafathStatus").textContent = "";
        const opts = new Set([correct]);
        while (opts.size < 3) opts.add(randInt(10, 98));
        const arr = Array.from(opts).sort(() => Math.random() - 0.5);
        $("#nafathOptions").innerHTML = arr
            .map((n) => `<button class="nafath-opt mono text-2xl font-bold py-4 rounded-xl bg-white/[0.04] border border-white/10 hover:border-review transition text-white" data-num="${n}">${n}</button>`)
            .join("");
        $$(".nafath-opt").forEach((b) => {
            b.addEventListener("click", () => {
                const status = $("#nafathStatus");
                if (+b.dataset.num === correct) {
                    b.style.borderColor = "var(--safe)";
                    b.style.color = "var(--safe)";
                    status.style.color = "var(--safe)";
                    status.textContent = t("nafath_ok");
                    setTimeout(() => {
                        closeModal();
                        toast({ title: t("toast_nafath_t"), msg: t("toast_nafath_m"), variant: "success", icon: "i-shield-check" });
                    }, 800);
                } else {
                    b.style.borderColor = "var(--fraud)";
                    status.style.color = "var(--fraud)";
                    status.textContent = t("nafath_wrong");
                }
            });
        });
    }

    // Animated voice bars for Tier 3.
    let voiceRAF = null;
    function startVoiceBars() {
        const host = $("#voiceBars");
        host.innerHTML = Array.from({ length: 9 }).map(() => '<span class="w-1.5 rounded-full" style="background:var(--safe);height:6px"></span>').join("");
        const bars = Array.from(host.children);
        const tick = () => {
            bars.forEach((b) => (b.style.height = randInt(6, 30) + "px"));
            voiceRAF = setTimeout(tick, 140);
        };
        tick();
    }
    function stopVoiceBars() { clearTimeout(voiceRAF); }

    // Modal action delegation.
    modal.addEventListener("click", (e) => {
        if (e.target === modal) return; // keep open on backdrop (demo-safe)
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const action = btn.dataset.action;
        const activeStep = $(".tier-step.active").dataset.step;

        if (action === "approve") {
            if (activeStep === "A") {
                closeModal();
                toast({ title: t("toast_approved_t"), msg: t("toast_approved_m"), variant: "success", icon: "i-shield-check" });
                markSelectedSafe();
            } else if (activeStep === "C") {
                stopVoiceBars();
                closeModal();
                toast({ title: t("toast_voice_t"), msg: t("toast_voice_m"), variant: "info", icon: "i-phone-call" });
            }
        } else if (action === "ignore") {
            // Escalate Tier 1 -> Tier 2 (Nafath)
            showStep("B");
            setTier(2);
            buildNafath();
        } else if (action === "fallback") {
            // Escalate Tier 2 -> Tier 3 (AI Voice Bot)
            showStep("C");
            setTier(3);
            startVoiceBars();
        }
    });

    function markSelectedSafe() {
        const tx = state.feed.find((x) => x.id === state.selectedId);
        if (tx) {
            tx.signals.geoVelocity = 0.05;
            tx.signals.rootDetected = false;
            tx.signals.trustedDevice = true;
            scoreTransaction(tx);
            const row = $(`.feed-row[data-id="${tx.id}"]`);
            if (row) row.innerHTML = feedRowHtml(tx);
            renderEngine(tx);
        }
    }

    /* ========================================================================
       9. Toasts
       ======================================================================== */
    function toast({ title, msg, variant = "success", icon = "i-shield-check" }) {
        const host = $("#toastHost");
        const node = document.createElement("div");
        node.className = "toast" + (variant === "info" ? " info" : "");
        const info = variant === "info";
        const tint = info ? "var(--brand)" : "var(--safe)";
        const chipBg = info ? "rgba(59,130,246,0.14)" : "rgba(0,229,160,0.14)";
        const chipBd = info ? "rgba(59,130,246,0.4)" : "rgba(0,229,160,0.4)";
        if (info) node.style.borderColor = "rgba(59,130,246,0.4)";
        node.innerHTML = `
            <div class="toast-ico" style="color:${tint};background:${chipBg};border:1px solid ${chipBd}">${svgIco(icon, "ico")}</div>
            <div class="flex-1" style="text-align:start">
                <p class="text-sm font-bold text-white">${title}</p>
                <p class="text-xs text-[var(--dim)] mt-0.5">${msg}</p>
            </div>`;
        host.appendChild(node);
        requestAnimationFrame(() => node.classList.add("show"));
        setTimeout(() => {
            node.classList.remove("show");
            node.addEventListener("transitionend", () => node.remove(), { once: true });
        }, 4200);
    }

    /* ========================================================================
       10. Scenario runner (deterministic)
       ======================================================================== */
    const mapTimerEl = $("#mapTimer");
    const mapStatusEl = $("#mapStatus");

    async function scenarioFraud() {
        if (state.scenarioRunning) return;
        state.scenarioRunning = true;
        const prevPaused = state.paused;
        state.paused = true;

        // Reset map
        initMap();
        mapStatusEl.className = "pill pill-safe";
        mapStatusEl.innerHTML = `<span>${t("map_idle")}</span>`;
        $("#devicePrompt").style.opacity = "0";

        // 1) Craft the deterministic attack transaction.
        const attack = genTransaction({
            customer: "•••• 7791",
            amount: 12900.0,
            merchant: { ar: "تحويل دولي", en: "Wire Transfer" },
            city: { ar: "لندن", en: "London" },
            time: nowTime(),
            signals: {
                geoVelocity: 0.97, deviceAnomaly: 0.7, financialFlow: 0.8, timeContext: 0.75,
                rootDetected: true, newBeneficiary: true, trustedDevice: false,
            },
        });
        state.feed.unshift(attack);
        const row = addFeedRow(attack);
        row.style.borderColor = "rgba(255,77,94,0.5)";
        selectTransaction(attack.id);

        // 2) Draw nodes: trusted customer (Riyadh) + attacker (London).
        const ng = $("#mapNodes");
        ng.appendChild(staticNode(GEO.riyadh, "#00E5A0", 6));
        // trusted pulse
        const rp = project(GEO.riyadh.lat, GEO.riyadh.lon);
        const cust = el("circle", { cx: rp.x, cy: rp.y, r: 6, fill: "#00E5A0", class: "node-pulse" });
        ng.appendChild(cust);

        const attackerNode = staticNode(GEO.london, "#FF4D5E", 6);
        attackerNode.id = "attackerNode";
        ng.appendChild(attackerNode);
        const lp = project(GEO.london.lat, GEO.london.lon);
        ng.appendChild(el("circle", { cx: lp.x, cy: lp.y, r: 6, fill: "#FF4D5E", class: "node-pulse" }));

        await sleep(400);

        // 3) Draw impossible-travel arc London -> Riyadh.
        const arc = el("path", { d: arcPath(GEO.london, GEO.riyadh, 120), class: "arc-path arc-anim arc-draw", stroke: "#FF4D5E" });
        $("#mapArcs").appendChild(arc);

        // 4) Run the detect timer up to <80ms and freeze.
        await runLatencyTimer(mapTimerEl, 73, 1100);
        mapStatusEl.className = "pill pill-fraud";
        mapStatusEl.innerHTML = `<span>${t("map_detect")}</span>`;

        // 5) Attacker dies (locked out), customer device lights up.
        const an = $("#attackerNode");
        if (an) an.classList.add("node-dead");
        arc.setAttribute("stroke", "#444");
        arc.setAttribute("opacity", "0.4");
        $("#devicePrompt").style.opacity = "1";
        toast({ title: t("toast_blocked_t"), msg: t("toast_blocked_m"), variant: "success", icon: "i-snowflake" });

        await sleep(500);

        // 6) Open silent verification flow.
        openModal("A", 1);

        state.scenarioRunning = false;
        state.paused = prevPaused;
    }

    async function scenarioFalsePositive() {
        if (state.scenarioRunning) return;
        state.scenarioRunning = true;

        const sd = $("#showdown");
        sd.classList.remove("hidden");
        sd.scrollIntoView({ behavior: "smooth", block: "center" });

        const legacyBody = $("#legacyBody");
        const radarBody = $("#radarBody");
        const spinner = `<div class="text-[var(--dim)]">${svgIco("i-loader", "ico ico-lg animate-spin")}</div>`;
        legacyBody.innerHTML = `${spinner}<p class="text-sm text-[var(--dim)]">${lang === "ar" ? "جارٍ المعالجة…" : "Processing…"}</p>`;
        radarBody.innerHTML = `${spinner}<p class="text-sm text-[var(--dim)]">${lang === "ar" ? "جارٍ المعالجة…" : "Processing…"}</p>`;

        await sleep(900);

        // LEFT: legacy blocks the legit customer.
        legacyBody.innerHTML = `
            <div class="text-fraud"><svg class="ico" style="width:2.8rem;height:2.8rem" aria-hidden="true"><use href="#i-x-octagon"/></svg></div>
            <span class="pill pill-fraud text-base px-4 py-1.5">${t("legacy_blocked")}</span>
            <p class="text-xs text-[var(--dim)]">${t("legacy_blocked_sub")}</p>
            <span class="code-tag bad mt-1">${t("legacy_agent")}: 15 SAR</span>`;
        countUp($("#legacyCost"), (state.kpi.legacyCost += 15), { duration: 800 });
        countUp($("#legacyChurn"), (state.kpi.legacyChurn += 1), { duration: 800 });

        await sleep(1100);

        // RIGHT: radar silently verifies and retains.
        radarBody.innerHTML = `
            <div class="text-safe"><svg class="ico" style="width:2.8rem;height:2.8rem" aria-hidden="true"><use href="#i-shield-check"/></svg></div>
            <span class="pill pill-safe text-base px-4 py-1.5">${t("radar_kept")}</span>
            <p class="text-xs text-[var(--dim)]">${t("radar_kept_sub")}</p>
            <div class="flex gap-2 mt-1">
                <span class="code-tag ok">0.05 SAR</span>
                <span class="code-tag ok">${t("radar_friction")}</span>
            </div>`;
        countUp($("#radarRetained"), (state.kpi.retained += 1), { duration: 800 });
        countUp($("#radarRevenue"), (state.kpi.revenue += 4800), { duration: 1000 });
        countUp($("#kpi-fp"), (state.kpi.fp += 1), { duration: 800 });

        toast({ title: t("toast_retained_t"), msg: t("toast_retained_m"), variant: "success", icon: "i-heart" });

        state.scenarioRunning = false;
    }

    /* ========================================================================
       11. Live feed loop + KPI drift
       ======================================================================== */
    function tickFeed() {
        if (!state.paused && !state.scenarioRunning) {
            const tx = genTransaction();
            state.feed.unshift(tx);
            if (state.feed.length > 60) state.feed.pop();
            addFeedRow(tx);

            // KPI drift
            state.kpi.tps = randInt(180, 340);
            $("#kpi-tps").textContent = state.kpi.tps;
            if (tx.level === "safe" && Math.random() < 0.5) {
                countUp($("#kpi-fp"), (state.kpi.fp += randInt(1, 3)), { duration: 600 });
                countUp($("#kpi-cost"), (state.kpi.cost += randInt(120, 380)), { duration: 600 });
            }
            // latency readout flutter (always < 80)
            $("#kpi-latency").textContent = randInt(72, 79);
        }
        setTimeout(tickFeed, randInt(1300, 1700));
    }

    function togglePause() {
        state.paused = !state.paused;
        $("#pauseIcon").innerHTML = state.paused ? '<use href="#i-play"/>' : '<use href="#i-pause"/>';
        $("#pauseLabel").textContent = state.paused ? t("dock_resume") : t("dock_pause");
    }

    /* ========================================================================
       12. Language engine + boot
       ======================================================================== */
    function applyLang() {
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
        $("#langLabel").textContent = lang === "ar" ? "EN" : "ع";
        $$("[data-i18n]").forEach((node) => {
            const key = node.getAttribute("data-i18n");
            if (I18N[lang][key] !== undefined) node.textContent = I18N[lang][key];
        });
        // pause label respects state
        $("#pauseLabel").textContent = state.paused ? t("dock_resume") : t("dock_pause");
        // re-render dynamic content in current language
        $$(".feed-row[data-id]").forEach((row) => {
            const tx = state.feed.find((x) => x.id === row.dataset.id);
            if (tx) row.innerHTML = feedRowHtml(tx);
        });
        const sel = state.feed.find((x) => x.id === state.selectedId);
        if (sel) renderEngine(sel);
    }

    function bootKPIs() {
        countUp($("#kpi-fp"), state.kpi.fp, { duration: 1600 });
        countUp($("#kpi-cost"), state.kpi.cost, { duration: 1800 });
        $("#kpi-tps").textContent = "0";
    }

    function seedFeed() {
        for (let i = 0; i < 7; i++) {
            const tx = genTransaction();
            state.feed.push(tx);
            addFeedRow(tx, { prepend: false });
        }
        // auto-select first for an immediate engine view
        if (state.feed.length) selectTransaction(state.feed[0].id);
    }

    function bindEvents() {
        $("#langToggle").addEventListener("click", () => {
            lang = lang === "ar" ? "en" : "ar";
            applyLang();
        });
        $("#btnFraud").addEventListener("click", scenarioFraud);
        $("#btnFP").addEventListener("click", scenarioFalsePositive);
        $("#btnPause").addEventListener("click", togglePause);
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
        });
        // Start voice bars whenever Tier 3 becomes visible (observed via approve->C is manual);
        // also start when stepping to C through escalation in future. Keep bars ready.
    }

    function init() {
        initMap();
        bootKPIs();
        seedFeed();
        bindEvents();
        applyLang();
        tickFeed();
    }

    document.addEventListener("DOMContentLoaded", init);
})();
