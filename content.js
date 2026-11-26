(() => {
  document.getElementById("octopus-root")?.remove();

  const luhn = (s) => {
    const d = s.replace(/\D/g, "");
    if (d.length < 13 || d.length > 19) return false;
    let sum = 0, alt = false;
    for (let i = d.length - 1; i >= 0; i--) {
      let n = +d[i];
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n; alt = !alt;
    }
    return sum % 10 === 0;
  };

  const RULES = [
    { label: "AWS key", tier: "high", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
    { label: "Stripe key", tier: "high", re: /\b(?:sk|rk)_live_[0-9a-zA-Z]{16,}\b/g },
    { label: "GitHub token", tier: "high", re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g },
    { label: "JWT", tier: "high", re: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g },
    { label: "Private key", tier: "high", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
    { label: "Connection string", tier: "high", re: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^\s'"<>]+/g },
    { label: "Bearer token", tier: "high", re: /\bBearer\s+[A-Za-z0-9._~+\/-]{20,}=*/g },
    { label: "Secret value", tier: "high", re: /\b[A-Za-z][A-Za-z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD|PASSWD)\s*[=:]\s*\S{8,}/gi },
    { label: "Email", tier: "medium", re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
    { label: "Card number", tier: "medium", re: /\b(?:\d[ -]?){13,19}\b/g, validate: luhn },
    { label: "IP address", tier: "medium", re: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g },
    { label: "Internal URL", tier: "medium", re: /\bhttps?:\/\/(?:localhost|127\.0\.0\.1|[\w.-]+\.(?:internal|local|corp))(?::\d+)?[^\s'"<>]*/g },
    { label: "Phone", tier: "low", re: /(?<![\d.])\+?\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}(?![\d.])/g,
      validate: (s) => s.replace(/\D/g, "").length >= 10 },
  ];

  const detect = (text) => {
    const found = [];
    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(text))) {
        if (rule.validate && !rule.validate(m[0])) continue;
        found.push({ start: m.index, end: m.index + m[0].length, label: rule.label, tier: rule.tier });
      }
    }
    found.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
    const out = []; let last = -1;
    for (const f of found) if (f.start >= last) { out.push(f); last = f.end; }
    return out;
  };

  // Find matches with exact boxes
  const hits = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const p = n.parentElement;
      if (!p || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(p.tagName)) return NodeFilter.FILTER_REJECT;
      return n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  let node;
  while ((node = walker.nextNode())) {
    for (const m of detect(node.nodeValue)) {
      const r = document.createRange();
      r.setStart(node, m.start); r.setEnd(node, m.end);
      for (const rect of r.getClientRects()) {
        if (rect.width < 2 || rect.height < 2) continue;
        if (rect.bottom < 0 || rect.top > innerHeight || rect.right < 0 || rect.left > innerWidth) continue;
        hits.push({ x: rect.left, y: rect.top, w: rect.width, h: rect.height, label: m.label, tier: m.tier, on: m.tier !== "low" });
      }
    }
  }

  // Overlay inside a closed shadow DOM
  const COLORS = { high: "239,68,68", medium: "245,158,11", low: "148,163,184" };
  const host = document.createElement("div");
  host.id = "octopus-root";
  host.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none";
  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: "closed" });
  const wrap = document.createElement("div");
  wrap.style.cssText = "position:fixed;inset:0;font:13px system-ui,sans-serif;pointer-events:none";
  root.appendChild(wrap);

  const bar = document.createElement("div");
  bar.style.cssText = "position:fixed;top:12px;right:12px;background:#111;color:#fff;padding:10px 12px;border-radius:10px;display:flex;gap:8px;align-items:center;pointer-events:auto";
  wrap.appendChild(bar);
  const btn = (t, bg) => {
    const b = document.createElement("button");
    b.textContent = t;
    b.style.cssText = `background:${bg};color:#fff;border:0;border-radius:6px;padding:6px 10px;cursor:pointer;font:inherit`;
    return b;
  };
  const status = document.createElement("span");
  const goBtn = btn("Redact & copy", "#2563eb");
  const closeBtn = btn("✕", "#444");
  bar.append(status, goBtn, closeBtn);

  const update = () => {
    const n = hits.filter((h) => h.on).length;
    status.textContent = hits.length ? `🐙 Found ${hits.length} · redacting ${n} (tap boxes to toggle)` : "🐙 Nothing found in view";
  };
  for (const h of hits) {
    const el = document.createElement("div");
    el.title = h.label;
    el.style.cssText = `position:fixed;left:${h.x - 2}px;top:${h.y - 1}px;width:${h.w + 4}px;height:${h.h + 2}px;border-radius:3px;cursor:pointer;pointer-events:auto;box-sizing:border-box`;
    const paint = () => {
      const c = COLORS[h.tier];
      el.style.background = h.on ? `rgba(${c},.85)` : `rgba(${c},.12)`;
      el.style.border = `2px solid rgb(${c})`;
    };
    paint();
    el.onclick = () => { h.on = !h.on; paint(); update(); };
    wrap.appendChild(el);
  }
  update();

  const close = () => { host.remove(); removeEventListener("keydown", onKey, true); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  addEventListener("keydown", onKey, true);
  closeBtn.onclick = close;

  goBtn.onclick = async () => {
    wrap.style.visibility = "hidden";
    await new Promise((r) => setTimeout(r, 150));
    const res = await chrome.runtime.sendMessage({ type: "capture" });
    wrap.style.visibility = "visible";
    if (!res || !res.dataUrl) { status.textContent = "Capture failed: " + (res && res.error); return; }
    const img = new Image();
    img.src = res.dataUrl;
    await img.decode();
    const s = img.width / innerWidth;
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    ctx.fillStyle = "#000";
    for (const h of hits) if (h.on) ctx.fillRect((h.x - 2) * s, (h.y - 1) * s, (h.w + 4) * s, (h.h + 2) * s);
    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      status.textContent = "✅ Copied redacted screenshot";
    } catch (e) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "octopus-redacted.png";
      a.click();
      status.textContent = "⬇️ Clipboard blocked, downloaded instead";
    }
    setTimeout(close, 1500);
  };
})();