// app/platform/model.ts
var aiFields = ["purpose", "detail", "notes", "result"];
var aiCategories = ["\uC778\uB825", "\uC2DC\uC124\xB7\uC548\uC804", "\uACE0\uAC1D \uC694\uCCAD", "\uBBFC\uC6D0", "\uC6B4\uC601"];
var aiUrgencies = ["\uB0AE\uC74C", "\uBCF4\uD1B5", "\uB192\uC74C"];
var aiConfidences = ["low", "medium", "high"];
var entryOf = (v) => v.entry === "ai" ? "ai" : "manual";
var dayShift = (day, n) => {
  const d = /* @__PURE__ */ new Date(day + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
var targetOf = (v) => v.targetType === "store" ? v.storeId || "missing-store" : v.siteId;
function targetsOf(data) {
  return [...data.sites.map((s) => ({ id: s.id, type: "site", siteId: s.id, storeId: null, name: s.name, siteName: s.name, team: s.team, part: s.part, division: s.division, region: s.region, address: s.address, managerIds: s.managerIds, rule: s.rule, status: s.status, startDate: s.startDate, lat: s.lat ?? null, lng: s.lng ?? null })), ...data.stores.map((s) => {
    const p = data.sites.find((p2) => p2.id === s.siteId);
    return { id: s.id, type: "store", siteId: s.siteId, storeId: s.id, name: s.name, siteName: p?.name || "\uBBF8\uC5F0\uACB0 \uD604\uC7A5", team: p?.team || "", part: p?.part || "", division: p?.division || "", region: s.region, address: s.address, managerIds: s.managerIds, rule: s.rule, status: s.status, startDate: s.startDate, lat: s.lat ?? null, lng: s.lng ?? null };
  })];
}
function requirements(targets, start, end) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) return [];
  const out = [];
  for (const t of targets) {
    if (t.status !== "\uC6B4\uC601 \uC911" || t.rule.period === "manual" || !Number.isInteger(t.rule.count) || t.rule.count < 1 || t.rule.count > 8 || t.rule.period === "week" && t.rule.count > 7) continue;
    const d = /* @__PURE__ */ new Date(start + "T12:00:00Z");
    if (t.rule.period === "month") d.setUTCDate(1);
    else d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
    for (let safety = 0; safety < 400 && d.toISOString().slice(0, 10) <= end; safety++) {
      const unitStart = d.toISOString().slice(0, 10);
      const next = new Date(d);
      if (t.rule.period === "month") next.setUTCMonth(next.getUTCMonth() + 1);
      else next.setUTCDate(next.getUTCDate() + 7);
      const nextDay = next.toISOString().slice(0, 10), length = Math.round((+next - +d) / 864e5);
      for (let i = 0; i < t.rule.count; i++) {
        const a = dayShift(unitStart, Math.floor(length * i / t.rule.count)), b = dayShift(unitStart, Math.floor(length * (i + 1) / t.rule.count) - 1);
        if (b >= start && b <= end && b >= t.startDate) out.push({ id: `req:${t.id}:${unitStart}:${i + 1}`, targetId: t.id, targetType: t.type, siteId: t.siteId, storeId: t.storeId, windowStart: a < t.startDate ? t.startDate : a, windowEnd: b, dueDate: b, ordinal: i + 1 });
      }
      d.setTime(+next);
    }
  }
  return out.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id));
}
function visibleTargets(targets, me) {
  if (["admin", "director"].includes(me.role)) return targets;
  if (me.role === "lead") return targets.filter((t) => t.team === me.team);
  if (me.role === "partlead") return targets.filter((t) => t.team === me.team && t.part === me.part);
  return targets.filter((t) => t.managerIds.includes(me.id));
}
var validGeo = (g) => !!g && typeof g.lat === "number" && typeof g.lng === "number" && Number.isFinite(g.lat) && Number.isFinite(g.lng) && Math.abs(g.lat) <= 90 && Math.abs(g.lng) <= 180;
function distanceM(a, b) {
  const r = Math.PI / 180, x = Math.sin((b.lat - a.lat) * r / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin((b.lng - a.lng) * r / 2) ** 2;
  return Math.round(12742e3 * Math.asin(Math.sqrt(x)));
}

// app/platform/mutations.ts
var str = (v, max) => typeof v === "string" ? v.slice(0, max) : "";
function aiEntryOf(raw) {
  if (!raw || typeof raw !== "object") throw Error("AI \uC785\uB825 \uAE30\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. AI \uAC04\uD3B8 \uB4F1\uB85D\uC5D0\uC11C \uB2E4\uC2DC \uC791\uC131\uD574 \uC8FC\uC138\uC694.");
  const text = str(raw.input?.text, 3e3), imageCount = Number(raw.input?.imageCount);
  if (!Number.isInteger(imageCount) || imageCount < 0 || imageCount > 3) throw Error("AI \uC785\uB825 \uC0AC\uC9C4 \uC218\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.");
  if (!text.trim() && !imageCount) throw Error("AI \uC785\uB825 \uC6D0\uBB38(\uBA54\uBAA8 \uB610\uB294 \uC0AC\uC9C4)\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
  const draft = Object.fromEntries(aiFields.map((k) => [k, str(raw.draft?.[k], 3500)])), edited = Array.isArray(raw.edited) ? [...new Set(raw.edited)].filter((k) => aiFields.includes(k)) : [];
  return { input: { text, imageCount }, draft, summary: str(raw.summary, 200), category: (Array.isArray(raw.category) ? raw.category : []).filter((c) => aiCategories.includes(c)), urgency: aiUrgencies.includes(raw.urgency) ? raw.urgency : "", confidence: aiConfidences.includes(raw.confidence) ? raw.confidence : "", model: str(raw.model, 80), generatedAt: str(raw.generatedAt, 40), edited };
}
function newId() {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : "demo-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}
function updateDemo(data, entity, values, record, actor, now) {
  const next = structuredClone(data), id = record?.id || newId();
  const manager = actor.role === "manager";
  if (actor.role === "director") throw Error("\uC0AC\uC5C5\uBD80\uC7A5\uC740 \uC870\uD68C \uC804\uC6A9\uC785\uB2C8\uB2E4.");
  const validateDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + "T12:00:00Z")) && (/* @__PURE__ */ new Date(s + "T12:00:00Z")).toISOString().slice(0, 10) === s;
  const targets = targetsOf(data);
  const allowed = visibleTargets(targets, actor);
  const can = (targetId) => allowed.some((t) => t.id === targetId);
  let item = { ...values, id, version: (record?.version || 0) + 1 };
  let array;
  if (entity === "site" || entity === "store") {
    if (manager) throw Error("\uD604\uC7A5\xB7\uB9E4\uC7A5 \uB4F1\uB85D \uBC0F \uB2F4\uB2F9\uC790 \uBC30\uC815\uC740 \uAD00\uB9AC\uC790 \uAD8C\uD55C\uC785\uB2C8\uB2E4.");
    if (!item.name?.trim() || !item.code?.trim() || !item.address?.trim()) throw Error("\uC774\uB984, \uCF54\uB4DC, \uC8FC\uC18C\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.");
    if (record && !can(record.id)) throw Error("\uB2F4\uB2F9 \uC870\uC9C1 \uBC94\uC704 \uBC16\uC758 \uB300\uC0C1\uC785\uB2C8\uB2E4.");
    if (item.lat == null && item.lng == null || item.lat === "" && item.lng === "") {
      item.lat = null;
      item.lng = null;
    } else {
      const g = { lat: Number(item.lat), lng: Number(item.lng) };
      if (!validGeo(g)) throw Error("\uC704\uB3C4\xB7\uACBD\uB3C4\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.");
      item.lat = g.lat;
      item.lng = g.lng;
    }
    const parent = entity === "store" ? data.sites.find((s) => s.id === item.siteId) : null;
    if (entity === "store" && (!parent || !can(parent.id))) throw Error("\uC18C\uC18D \uD604\uC7A5\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.");
    const team = parent?.team || item.team, part = parent?.part || item.part;
    if (entity === "site" && record && (team !== record.team || part !== record.part) && data.stores.some((s) => s.siteId === record.id)) throw Error("\uC0B0\uD558 \uB9E4\uC7A5\uC774 \uC788\uB294 \uD604\uC7A5\uC758 \uC870\uC9C1 \uBCC0\uACBD\uC740 \uBCC4\uB3C4 \uC774\uAD00 \uC808\uCC28\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.");
    if (actor.role === "lead" && team !== actor.team || actor.role === "partlead" && (team !== actor.team || part !== actor.part)) throw Error("\uC18C\uC18D \uC870\uC9C1 \uBC94\uC704\uC5D0\uC11C\uB9CC \uB4F1\uB85D\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.");
    if (!item.managerIds?.length || item.managerIds.some((u) => !data.users.some((x) => x.id === u && x.active && x.team === team && x.part === part))) throw Error("\uB300\uC0C1\uACFC \uAC19\uC740 \uD300\xB7\uD30C\uD2B8\uC758 \uB2F4\uB2F9\uC790\uB97C 1\uBA85 \uC774\uC0C1 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.");
    if (!["week", "month", "manual"].includes(item.rule?.period) || !Number.isInteger(item.rule?.count) || item.rule.count < 1 || item.rule.count > 8 || item.rule.period === "week" && item.rule.count > 7) throw Error("\uC8FC\uAC04 1~7\uD68C, \uC6D4\uAC04 1~8\uD68C \uBC94\uC704\uC758 \uBC29\uBB38 \uD68C\uCC28\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.");
    array = entity === "site" ? next.sites : next.stores;
    if (array.some((t) => t.code === item.code && t.id !== id)) throw Error("\uC774\uBBF8 \uC0AC\uC6A9 \uC911\uC778 \uCF54\uB4DC\uC785\uB2C8\uB2E4.");
    if (entity === "site") item = { ...item, client: item.client || "\uAC00\uC0C1 \uACE0\uAC1D\uC0AC", division: item.division || "\uC720\uD1B5\uC0AC\uC5C5\uBD80", cycle: item.rule.period === "week" ? "weekly" : item.rule.period === "manual" ? "manual" : "monthly" };
    item.startDate = record?.startDate || now;
  } else if (entity === "visit" || entity === "action") {
    if (!["site", "store"].includes(item.targetType)) throw Error("\uD604\uC7A5 \uBC29\uBB38 \uB610\uB294 \uB9E4\uC7A5 \uBC29\uBB38\uC744 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.");
    const target = targets.find((t) => t.id === (item.targetType === "store" ? item.storeId : item.siteId));
    if (!target || target.siteId !== item.siteId || !can(target.id)) throw Error("\uC811\uADFC\uD560 \uC218 \uC788\uB294 \uD604\uC7A5\xB7\uB9E4\uC7A5\uC744 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.");
    item.storeId = item.targetType === "store" ? item.storeId : null;
    if (record && targetOf(record) !== target.id) throw Error("\uAE30\uC874 \uAE30\uB85D\uC758 \uBC29\uBB38 \uB300\uC0C1\uC740 \uBCC0\uACBD\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
    const owner = entity === "visit" ? item.visitorId : item.ownerId;
    if (!target.managerIds.includes(owner) && owner !== (record ? entity === "visit" ? record.visitorId : record.ownerId : null)) throw Error("\uD574\uB2F9 \uD604\uC7A5\xB7\uB9E4\uC7A5\uC5D0 \uBC30\uC815\uB41C \uB2F4\uB2F9\uC790\uB97C \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.");
    if (manager && (owner !== actor.id || record && (entity === "visit" ? record.visitorId : record.ownerId) !== actor.id)) throw Error("\uBCF8\uC778\uC758 \uBC29\uBB38\xB7\uC870\uCE58\uB9CC \uB4F1\uB85D\uD558\uAC70\uB098 \uC218\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.");
    if (entity === "visit") {
      if (!["planned", "completed", "cancelled"].includes(item.status) || !item.purpose) throw Error("\uBC29\uBB38 \uBAA9\uC801\uACFC \uC9C4\uD589 \uC0C1\uD0DC\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.");
      if (record?.status === "completed" && item.status !== "completed" || record?.status === "cancelled" && item.status !== "cancelled") throw Error("\uC644\uB8CC\xB7\uCDE8\uC18C \uAE30\uB85D\uC758 \uC0C1\uD0DC\uB294 \uB418\uB3CC\uB9B4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC0C8 \uBC29\uBB38\uC744 \uB4F1\uB85D\uD574 \uC8FC\uC138\uC694.");
      if (item.plannedDate && !validateDate(item.plannedDate)) throw Error("\uC720\uD6A8\uD55C \uC608\uC815\uC77C\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.");
      if (item.status === "planned" && !item.plannedDate) throw Error("\uBC29\uBB38 \uC608\uC815\uC77C\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.");
      if (item.status === "completed" && (!validateDate(item.actualDate) || item.actualDate > now || !item.detail?.trim())) throw Error("\uC624\uB298\uAE4C\uC9C0\uC758 \uC2E4\uC81C \uBC29\uBB38\uC77C\uACFC \uC8FC\uC694 \uD65C\uB3D9 \uB0B4\uC6A9\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.");
      if (item.status === "cancelled" && !item.cancelReason?.trim()) throw Error("\uCDE8\uC18C \uC0AC\uC720\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.");
      if (item.requirementId) {
        if (!item.requirementId.startsWith("req:" + target.id + ":")) throw Error("\uD544\uC694 \uD68C\uCC28\uC640 \uBC29\uBB38 \uB300\uC0C1\uC774 \uC77C\uCE58\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
        const unit = item.requirementId.slice(("req:" + target.id + ":").length).slice(0, 10);
        const req = requirements([target], unit, dayShift(unit, 40)).find((r) => r.id === item.requirementId);
        if (!record && !req) throw Error("\uC874\uC7AC\uD558\uB294 \uD544\uC694 \uD68C\uCC28\uB97C \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.");
        if (req && item.status === "planned" && item.plannedDate && (item.plannedDate < req.windowStart || item.plannedDate > req.windowEnd)) throw Error("\uD574\uB2F9 \uD544\uC694 \uD68C\uCC28\uC758 \uC778\uC815 \uAE30\uAC04 \uC548\uC73C\uB85C \uBC29\uBB38 \uC608\uC815\uC77C\uC744 \uC815\uD574 \uC8FC\uC138\uC694.");
        if (req && item.status === "completed" && item.actualDate < req.windowStart) throw Error("\uD544\uC694 \uD68C\uCC28 \uC2DC\uC791\uC77C \uC774\uC804\uC758 \uBC29\uBB38\uC744 \uC5F0\uACB0\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
      }
      if (item.requirementId && next.visits.some((v) => v.id !== id && v.requirementId === item.requirementId && v.status !== "cancelled")) throw Error("\uC774 \uD544\uC694 \uD68C\uCC28\uC5D0\uB294 \uC774\uBBF8 \uACC4\uD68D \uB610\uB294 \uACB0\uACFC\uAC00 \uC5F0\uACB0\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4. \uAE30\uC874 \uC77C\uC815\uC744 \uC218\uC815\uD574 \uC8FC\uC138\uC694.");
      const done = record?.status === "completed", entry = done ? entryOf(record) : entryOf(item);
      if (done && entryOf(item) !== entry) throw Error("AI \uB4F1\uB85D\uACFC \uC9C1\uC811 \uC785\uB825 \uAE30\uB85D\uC740 \uC11C\uB85C \uBC14\uAFC0 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
      delete item.extra;
      delete item.aiAssisted;
      delete item.aiFields;
      if (entry === "ai") {
        if (item.status !== "completed") throw Error("AI \uAC04\uD3B8 \uB4F1\uB85D\uC740 \uBC29\uBB38 \uACB0\uACFC\uB85C\uB9CC \uC800\uC7A5\uD569\uB2C8\uB2E4.");
        item.entry = "ai";
        item.ai = aiEntryOf(item.ai);
        item.ai.edited = aiFields.filter((k) => (item[k] || "") !== item.ai.draft[k]);
      } else {
        item.entry = "manual";
        delete item.ai;
      }
      if (item.geo == null) delete item.geo;
      else {
        const g = item.geo, acc = Number(item.geo.accuracy);
        if (!validGeo(g) || !Number.isFinite(acc) || acc < 0) throw Error("GPS \uC704\uCE58 \uAE30\uB85D\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.");
        item.geo = { lat: g.lat, lng: g.lng, accuracy: Math.round(acc), at: typeof item.geo.at === "string" ? item.geo.at.slice(0, 40) : "", distance: target.lat !== null && target.lng !== null ? distanceM(g, { lat: target.lat, lng: target.lng }) : null };
      }
      if (item.status !== "completed") {
        item.actualDate = null;
        item.actualTime = "";
        item.detail = "";
        item.notes = "";
        item.result = "";
      }
      array = next.visits;
    } else {
      if (!item.content?.trim() || !validateDate(item.dueDate) || !["\uC870\uCE58 \uC608\uC815", "\uCC98\uB9AC \uC911", "\uBCF4\uB958", "\uC644\uB8CC"].includes(item.state)) throw Error("\uC870\uCE58 \uB0B4\uC6A9, \uC720\uD6A8\uD55C \uAE30\uD55C \uBC0F \uC0C1\uD0DC\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.");
      if (item.visitId && !data.visits.some((v) => v.id === item.visitId && targetOf(v) === target.id)) throw Error("\uAD00\uB828 \uBC29\uBB38\uAE30\uB85D\uACFC \uB300\uC0C1\uC774 \uC77C\uCE58\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
      item.completedDate = item.state === "\uC644\uB8CC" ? record?.completedDate || now : null;
      item.createdDate = record?.createdDate || now;
      array = next.actions;
    }
  } else throw Error("\uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uB4F1\uB85D\uC785\uB2C8\uB2E4.");
  const index = array.findIndex((x) => x.id === id);
  if (index < 0) array.push(item);
  else array[index] = item;
  next.audit.push({ id: newId(), actorId: actor.id, entity, entityId: id, before: record ? JSON.stringify(record) : null, after: JSON.stringify(item), createdAt: (/* @__PURE__ */ new Date()).toISOString() });
  return { data: next, item };
}
export {
  aiEntryOf,
  newId,
  updateDemo
};
