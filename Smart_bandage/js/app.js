/* app.js — Main application logic */

const state = {
  vitals: { temperature: 36.8, spo2: 97, h2o2: 0.20, heartRate: 72, ph: 7.0 },
  history: { temperature: [], spo2: [], h2o2: [], heartRate: [], ph: [], labels: [] },
  woundType: 'unknown', woundSeverity: 0, woundImageB64: null,
  patient: { name: 'John Patient', id: 'PT-001', weight: 70 },
  alerts: [], releases: [], sessionStart: Date.now(),
  apiKey: localStorage.getItem('sb_api_key') || '',
};

const hw = new HardwareAdapter();
const engine = new DrugEngine();
engine.setApiKey(state.apiKey);

const MAX_POINTS = 60;
const CIRC = 2 * Math.PI * 48;
const $ = id => document.getElementById(id);

const RANGES = {
  temperature: { min: 34, max: 42,  warn: 38,  crit: 39,   invert: false },
  spo2:        { min: 70, max: 100, warn: 92,  crit: 88,   invert: true  },
  h2o2:        { min: 0,  max: 3,   warn: 0.8, crit: 1.2,  invert: false },
  heartRate:   { min: 40, max: 180, warn: 110, crit: 140,  invert: false },
  ph:          { min: 0,  max: 14,  warn: 8.5, crit: 9.5,  invert: false },
};

function gaugeOffset(metric, value) {
  const r = RANGES[metric];
  const pct = Math.max(0, Math.min(1, (value - r.min) / (r.max - r.min)));
  return CIRC * (1 - pct);
}
function getStatus(metric, value) {
  const r = RANGES[metric];
  if (r.invert) { if (value <= r.crit) return 'critical'; if (value <= r.warn) return 'warning'; return 'normal'; }
  if (value >= r.crit) return 'critical'; if (value >= r.warn) return 'warning'; return 'normal';
}

/* ── Chart ──────────────────────────────────── */
let chart;
function initChart() {
  const ctx = $('vitals-chart').getContext('2d');
  const g = (c1, c2) => { const gr = ctx.createLinearGradient(0,0,0,300); gr.addColorStop(0,c1); gr.addColorStop(1,c2); return gr; };
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        { label:'Temp (°C)',    data:[], borderColor:'#f87171', backgroundColor:g('rgba(248,113,113,0.2)','rgba(248,113,113,0)'), tension:.4, fill:true, pointRadius:0, borderWidth:2, yAxisID:'y' },
        { label:'SpO₂ (%)',    data:[], borderColor:'#00e5a0', backgroundColor:g('rgba(0,229,160,0.2)','rgba(0,229,160,0)'),     tension:.4, fill:true, pointRadius:0, borderWidth:2, yAxisID:'y' },
        { label:'H₂O₂ (×10)', data:[], borderColor:'#a78bfa', backgroundColor:g('rgba(167,139,250,0.2)','rgba(167,139,250,0)'), tension:.4, fill:true, pointRadius:0, borderWidth:2, yAxisID:'y' },
        { label:'HR (bpm)',     data:[], borderColor:'#fb7185', backgroundColor:g('rgba(251,113,133,0.2)','rgba(251,113,133,0)'), tension:.4, fill:true, pointRadius:0, borderWidth:2, yAxisID:'y2' },
        { label:'pH',           data:[], borderColor:'#22d3ee', backgroundColor:g('rgba(34,211,238,0.2)','rgba(34,211,238,0)'),   tension:.4, fill:true, pointRadius:0, borderWidth:2, yAxisID:'y3' },
      ],
    },
    options: {
      responsive:true, maintainAspectRatio:false, animation:false,
      interaction:{ mode:'index', intersect:false },
      plugins:{ legend:{ display:false }, tooltip:{ backgroundColor:'rgba(13,25,41,0.95)', borderColor:'rgba(255,255,255,0.1)', borderWidth:1, titleColor:'#8fa3be', bodyColor:'#f0f6ff' } },
      scales:{
        x:{ grid:{ color:'rgba(255,255,255,0.04)' }, ticks:{ color:'#445566', font:{ size:10 }, maxTicksLimit:10 } },
        y:{ position:'left', grid:{ color:'rgba(255,255,255,0.04)' }, ticks:{ color:'#445566', font:{ size:10 } }, title:{ display:false } },
        y2:{ position:'right', grid:{ drawOnChartArea:false }, ticks:{ color:'#fb7185', font:{ size:10 } }, title:{ display:true, text:'HR (bpm)', color:'#fb7185', font:{ size:10 } }, min:40, max:180 },
        y3:{ display:false, min:0, max:14 },
      },
    },
  });
}

/* ── Update vitals UI ───────────────────────── */
function updateVitalsUI(v) {
  Object.assign(state.vitals, v);

  // Update all gauge-based vitals (temp, spo2, h2o2, heartRate, ph)
  [['temperature','temp'],['spo2','spo2'],['h2o2','h2o2'],['heartRate','hr'],['ph','ph']].forEach(([metric, key]) => {
    const val = state.vitals[metric];
    if (val === undefined) return;
    const status = getStatus(metric, val);
    const fill = $('g-' + key);
    if (fill) fill.style.strokeDashoffset = gaugeOffset(metric, val);
    let disp;
    if (metric === 'h2o2') disp = val.toFixed(3);
    else if (metric === 'heartRate') disp = Math.round(val).toString();
    else disp = val.toFixed(1);
    const valEl = $(key + '-val'); if (valEl) valEl.textContent = disp;
    const badge = $(key + '-badge'); if (badge) { badge.className = 'gauge-badge ' + status; badge.textContent = status.charAt(0).toUpperCase() + status.slice(1); }
    const wrap  = $(key + '-wrap');  if (wrap)  wrap.className  = 'gauge-wrap ' + (status !== 'normal' ? status : '');

    // Mobile vitals cards
    const mvcVal   = $('mvc-' + key + '-val');
    const mvcBadge = $('mvc-' + key + '-badge');
    const mvcCard  = $('mvc-' + key);
    if (mvcVal)   mvcVal.textContent   = disp;
    if (mvcBadge) { mvcBadge.className = 'mob-vital-badge ' + status; mvcBadge.textContent = status.charAt(0).toUpperCase() + status.slice(1); }
    if (mvcCard)  { mvcCard.className = mvcCard.className.replace(/\s*(warning|critical)/g,''); if (status !== 'normal') mvcCard.classList.add(status); }
  });

  // Beat detection animation
  // In serial mode: ESP32 sends beat:1 when MAX30100 detects a beat
  // In simulation mode: pulse whenever HR > 0
  const hr = state.vitals.heartRate;
  const hasBeat = v.beat === 1 || (hr > 0);
  const beatEl = $('beat-indicator');
  const heartEl = $('beat-heart');
  if (hasBeat && beatEl) {
    beatEl.classList.add('active');
    heartEl?.classList.remove('pulse');
    void heartEl?.offsetWidth; // trigger reflow for re-animation
    heartEl?.classList.add('pulse');
  } else if (beatEl) {
    beatEl.classList.remove('active');
  }

  // Mobile beat indicator
  const mobBeatEl = $('mob-beat-indicator');
  const mobHeartEl = $('mob-beat-heart');
  if (hasBeat && mobBeatEl) {
    mobBeatEl.classList.add('active');
    mobHeartEl?.classList.remove('pulse');
    void mobHeartEl?.offsetWidth;
    mobHeartEl?.classList.add('pulse');
  } else if (mobBeatEl) {
    mobBeatEl.classList.remove('active');
  }

  $('stat-hr').textContent    = Math.round(hr) + ' bpm';
  $('stat-delta').textContent = '+' + (state.vitals.temperature - 36.5).toFixed(1) + ' °C';

  // Mobile quick-summary
  const mTemp = $('mob-temp-quick'); if (mTemp) mTemp.textContent = state.vitals.temperature.toFixed(1) + '°C';
  const mSpo2 = $('mob-spo2-quick'); if (mSpo2) mSpo2.textContent = state.vitals.spo2.toFixed(0) + '% SpO₂';

  // Health score (includes all 5 vitals)
  const score = $('mob-health-score');
  if (score) {
    const ts = getStatus('temperature', state.vitals.temperature);
    const ss = getStatus('spo2', state.vitals.spo2);
    const hs = getStatus('h2o2', state.vitals.h2o2);
    const hrs = getStatus('heartRate', state.vitals.heartRate);
    const phs = getStatus('ph', state.vitals.ph);
    const allStatuses = [ts, ss, hs, hrs, phs];
    if (allStatuses.includes('critical')) { score.textContent = 'Critical'; score.style.color = '#ef4444'; }
    else if (allStatuses.includes('warning')) { score.textContent = 'Monitor'; score.style.color = '#f59e0b'; }
    else { score.textContent = 'Good'; score.style.color = '#00e5a0'; }
  }

  const now = new Date().toLocaleTimeString('en-GB', { hour12: false });
  state.history.labels.push(now);
  state.history.temperature.push(state.vitals.temperature);
  state.history.spo2.push(state.vitals.spo2);
  state.history.h2o2.push(parseFloat((state.vitals.h2o2 * 10).toFixed(2)));
  state.history.heartRate.push(state.vitals.heartRate);
  state.history.ph.push(state.vitals.ph);
  if (state.history.labels.length > MAX_POINTS)
    ['labels','temperature','spo2','h2o2','heartRate','ph'].forEach(k => state.history[k].shift());

  chart.data.labels = state.history.labels;
  chart.data.datasets[0].data = state.history.temperature;
  chart.data.datasets[1].data = state.history.spo2;
  chart.data.datasets[2].data = state.history.h2o2;
  chart.data.datasets[3].data = state.history.heartRate;
  chart.data.datasets[4].data = state.history.ph;
  chart.update('none');

  checkAlerts();
  if (state.history.labels.length % 10 === 0) refreshDrugs();
}

/* ── Alerts ─────────────────────────────────── */
function checkAlerts() {
  const v = state.vitals, alerts = [];
  if (v.temperature >= 39)   alerts.push({ icon:'🔴', title:'Critical Temp',  msg:`Temperature ${v.temperature}°C — possible severe infection.` });
  else if (v.temperature >= 38) alerts.push({ icon:'🟡', title:'High Temp', msg:`Temperature ${v.temperature}°C — monitor for infection.` });
  if (v.spo2 < 88)           alerts.push({ icon:'🔴', title:'Critical SpO₂', msg:`SpO₂ ${v.spo2}% — immediate oxygen therapy required.` });
  else if (v.spo2 < 92)      alerts.push({ icon:'🟡', title:'Low SpO₂',     msg:`SpO₂ ${v.spo2}% — monitor oxygen saturation.` });
  if (v.h2o2 >= 1.2)         alerts.push({ icon:'🔴', title:'Critical H₂O₂',msg:`H₂O₂ ${v.h2o2} mM — severe oxidative stress.` });
  else if (v.h2o2 >= 0.8)    alerts.push({ icon:'🟡', title:'High H₂O₂',    msg:`H₂O₂ ${v.h2o2} mM — elevated oxidative stress.` });

  const banner = $('alert-banner');
  if (alerts.length) {
    $('alert-icon').textContent = alerts[0].icon;
    $('alert-title').textContent = alerts[0].title;
    $('alert-msg').textContent   = alerts[0].msg;
    banner.classList.remove('hidden');
    $('alert-badge').textContent = alerts.length;
    $('alert-badge').classList.remove('hidden');
    // Sync mobile badge
    const mb = $('mob-alert-badge');
    if (mb) { mb.textContent = alerts.length; mb.classList.remove('hidden'); }
  } else {
    banner.classList.add('hidden');
    $('alert-badge').classList.add('hidden');
    const mb = $('mob-alert-badge'); if (mb) mb.classList.add('hidden');
  }
}

/* ── Drug suggestions — glitch-free update ──── */
let _lastSuggestionKey = '';
function refreshDrugs(force = false) {
  const suggestions = engine.analyze(state.vitals, state.woundType, state.woundSeverity);
  const key = suggestions.map(s => s.id + s.urgency).join('|');
  if (!force && key === _lastSuggestionKey) return;
  _lastSuggestionKey = key;
  renderDrugCards(suggestions);
}

function renderDrugCards(suggestions) {
  const container = $('drug-suggestions');
  container.innerHTML = '';
  if (!suggestions.length) { container.innerHTML = '<div class="drug-empty">No suggestions</div>'; return; }
  suggestions.forEach(s => {
    const card = document.createElement('div');
    card.className = 'drug-card';
    const src = s.source === 'gemini' ? '✦ AI' : '⚙ Rule';
    card.innerHTML = `
      <div class="drug-card-hdr">
        <span class="drug-name">${s.name}</span>
        <span class="drug-urgency ${s.urgency}">${s.urgency}</span>
      </div>
      <div class="drug-meta">${s.dose} · ${s.route} · ${s.freq || s.frequency || ''} · <em>${src}</em></div>
      <div class="drug-reason">${s.reason}</div>
      <button class="drug-apply-btn" data-drug="${s.id || s.drugId || ''}">Apply →</button>`;
    card.querySelector('.drug-apply-btn').addEventListener('click', () => applyDrug(s.id || s.drugId));
    container.appendChild(card);
  });
}

function applyDrug(drugId) {
  $('dose-drug').value = drugId;
  const dose = engine.calculateDose(drugId, parseInt($('dose-weight').value), state.woundSeverity);
  $('dose-amount').value = dose;
  const drug = $('dose-drug').options[$('dose-drug').selectedIndex]?.text || drugId;
  $('release-confirm-detail').innerHTML = `<strong>Drug:</strong> ${drug}<br><strong>Dose:</strong> ${dose} mg<br><strong>Mode:</strong> ${$('dose-mode').options[$('dose-mode').selectedIndex].text}<br><strong>Patient:</strong> ${state.patient.name}`;
  $('release-modal').classList.remove('hidden');
}

/* ── Release log ────────────────────────────── */
function logRelease() {
  const drugEl = $('dose-drug');
  const drugName = drugEl.options[drugEl.selectedIndex].text;
  const dose = $('dose-amount').value;
  const mode = $('dose-mode').options[$('dose-mode').selectedIndex].text;
  const entry = { drug: drugName, dose, mode, time: new Date().toLocaleTimeString() };
  state.releases.unshift(entry);

  const log = $('release-log');
  const empty = log.querySelector('.log-empty');
  if (empty) empty.remove();

  const el = document.createElement('div');
  el.className = 'log-entry';
  el.innerHTML = `
    <div class="log-entry-top"><span class="log-drug">${drugName}</span><span class="log-dose">${dose} mg</span></div>
    <div class="log-entry-top"><span class="log-mode">${mode}</span><span class="log-time">${entry.time}</span></div>`;
  log.prepend(el);
  $('stat-last-release').textContent = entry.time;
  const cnt = $('release-count');
  if (cnt) cnt.textContent = state.releases.length + ' release' + (state.releases.length !== 1 ? 's' : '');
}

/* ── Wound ──────────────────────────────────── */
async function handleWoundImage(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = $('wound-img');
    img.src = e.target.result;
    img.classList.remove('hidden');
    $('drop-placeholder').classList.add('hidden');
    state.woundImageB64 = e.target.result.split(',')[1];
    $('btn-ai-analyze').disabled = false;
  };
  reader.readAsDataURL(file);
}

async function analyzeWound() {
  if (!state.woundImageB64) return;
  const btn = $('btn-ai-analyze');
  btn.textContent = '⏳ Analyzing…'; btn.disabled = true;
  $('wound-ai-text').textContent = 'Analyzing wound image with AI…';

  if (state.apiKey) {
    try {
      // Step 1: Wound image analysis
      const result = await engine.analyzeWoundImage(state.woundImageB64);
      if (result) {
        state.woundType = result.woundType;
        state.woundSeverity = result.severity;
        $('wound-type-chip').textContent = result.woundType;
        $('severity-fill').style.width   = result.severity + '%';
        $('severity-pct').textContent     = result.severityLabel + ' (' + result.severity + '%)';

        // Build rich observation text
        let obs = result.observations || '';
        if (result.healingStage) obs += `\n🔬 Stage: ${result.healingStage}`;
        if (result.infectionRisk) obs += `\n⚠ Infection Risk: ${result.infectionRisk}`;
        if (result.tissueComposition) {
          const tc = result.tissueComposition;
          obs += `\n📊 Tissue: ${tc.granulation || 0}% granulation, ${tc.slough || 0}% slough, ${tc.necrotic || 0}% necrotic, ${tc.epithelial || 0}% epithelial`;
        }
        if (result.immediateActions?.length) {
          obs += `\n\n✅ Actions:\n` + result.immediateActions.map(a => `• ${a}`).join('\n');
        }
        $('wound-ai-text').textContent = obs;

        // Step 2: Get Gemini drug recommendations based on wound + vitals
        refreshDrugs(true); // immediate rule-based update

        btn.textContent = '⏳ Getting drug recs…';
        const geminiDrugs = await engine.analyzeWithGemini(
          state.vitals, state.woundType, state.woundSeverity, state.woundImageB64
        );
        if (geminiDrugs?.recommendations?.length) {
          const merged = geminiDrugs.recommendations.map(r => ({
            ...r, id: r.drugId || r.name, source: 'gemini',
            dose: r.dose, route: r.route, freq: r.frequency,
          }));
          renderDrugCards(merged);
        }

        btn.textContent = '✦ AI Analyze'; btn.disabled = false;
        return;
      } else {
        $('wound-ai-text').textContent = '⚠ AI analysis returned empty. Check API key or try again.';
      }
    } catch (err) {
      console.error('[Wound Analysis]', err);
      $('wound-ai-text').textContent = `⚠ Error: ${err.message}. Falling back to rule engine.`;
    }
  }

  // Fallback demo (no API key or API failed)
  setTimeout(() => {
    // Use a varied demo based on whatever image was loaded
    const demoTypes = ['laceration', 'bruise', 'abrasion', 'burn', 'unknown'];
    const demoType  = demoTypes[Math.floor(Math.random() * demoTypes.length)];
    const demoSev   = Math.floor(Math.random() * 50) + 15; // 15–65%
    const demoLabel = demoSev < 30 ? 'Mild' : demoSev < 60 ? 'Moderate' : 'Severe';
    state.woundType = demoType;
    state.woundSeverity = demoSev;
    $('wound-type-chip').textContent = demoType;
    $('severity-fill').style.width   = demoSev + '%';
    $('severity-pct').textContent     = `${demoLabel} (${demoSev}%)`;
    $('wound-ai-text').textContent    =
      `⚠ No API key — demo mode. Add your Gemini API key in Settings for real AI analysis.\n` +
      `Demo result: ${demoType} wound, ${demoLabel.toLowerCase()} severity (${demoSev}%).\n\n` +
      `✅ Suggested actions:\n• Clean wound with saline or clean water\n` +
      `• Apply appropriate dressing\n• Monitor for signs of infection`;
    refreshDrugs(true);
    btn.textContent = '✦ AI Analyze'; btn.disabled = false;
  }, 1200);
}

/* ── Session timer ──────────────────────────── */
function updateSession() {
  const e = Date.now() - state.sessionStart;
  const h = String(Math.floor(e/3600000)).padStart(2,'0');
  const m = String(Math.floor((e%3600000)/60000)).padStart(2,'0');
  const s = String(Math.floor((e%60000)/1000)).padStart(2,'0');
  const t = `${h}:${m}:${s}`;
  $('stat-session').textContent = t;
  const ms = $('mob-session'); if (ms) ms.textContent = t;
}

/* ── Connection UI ──────────────────────────── */
function setConnectionUI(connected, mode) {
  $('conn-dot').className = connected ? 'conn-dot' : 'conn-dot disconnected';
  $('conn-label').textContent = connected
    ? (mode === 'bluetooth' ? '🔵 Bluetooth' : mode === 'serial' ? '🔌 USB Serial' : '🎭 Simulation')
    : 'Disconnected';
}

/* ── Mobile header init ─────────────────────── */
function initMobileHeader() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning,' : hour < 17 ? 'Good afternoon,' : 'Good evening,';
  const hiEl = document.querySelector('.mob-hi'); if (hiEl) hiEl.textContent = greeting;

  // Settings button
  $('mob-btn-settings')?.addEventListener('click', () => $('settings-modal').classList.remove('hidden'));

  // Connect quick-action opens connect modal
  $('mqa-connect')?.addEventListener('click', () => $('connect-modal').classList.remove('hidden'));

  // Panel quick-action buttons
  document.querySelectorAll('.mob-action-btn[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.dataset.panel;
      document.querySelectorAll('.mnav-btn').forEach(b => b.classList.remove('active'));
      const navBtn = document.querySelector(`.mnav-btn[data-panel="${panel}"]`);
      if (navBtn) { navBtn.classList.add('active'); navBtn.click(); }
    });
  });
}

/* ── Mobile nav ─────────────────────────────── */
function initMobileNav() {
  const panelMap = {
    vitals: document.querySelector('.vitals-panel'),
    chart:  document.querySelector('.chart-panel'),
    wound:  document.querySelector('.wound-panel'),
    drug:   document.querySelector('.drug-panel'),
    log:    document.querySelector('.release-log-panel'),
  };

  document.querySelectorAll('.mnav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mnav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      Object.values(panelMap).forEach(p => p?.classList.remove('mob-active'));
      panelMap[btn.dataset.panel]?.classList.add('mob-active');
      if (window.innerWidth <= 768) setTimeout(() => chart.resize(), 50);
    });
  });

  if (window.innerWidth <= 768) panelMap.vitals?.classList.add('mob-active');
}

/* ── Settings ───────────────────────────────── */
function initSettings() {
  $('btn-settings').addEventListener('click', () => {
    $('s-api-key').value       = state.apiKey;
    $('s-patient-name').value  = state.patient.name;
    $('s-patient-id').value    = state.patient.id;
    $('s-weight').value        = state.patient.weight;
    $('settings-modal').classList.remove('hidden');
  });
  $('settings-close').addEventListener('click', () => $('settings-modal').classList.add('hidden'));
  $('settings-modal').addEventListener('click', e => { if (e.target === $('settings-modal')) $('settings-modal').classList.add('hidden'); });

  $('s-save-key').addEventListener('click', () => {
    state.apiKey = $('s-api-key').value.trim();
    localStorage.setItem('sb_api_key', state.apiKey);
    engine.setApiKey(state.apiKey);
    $('s-save-key').textContent = '✓ Saved';
    setTimeout(() => $('s-save-key').textContent = 'Save', 1500);
  });

  $('s-save-all').addEventListener('click', () => {
    state.apiKey        = $('s-api-key').value.trim();
    state.patient.name  = $('s-patient-name').value || 'Patient';
    state.patient.id    = $('s-patient-id').value || 'PT-001';
    state.patient.weight= parseInt($('s-weight').value) || 70;
    state.woundType     = $('s-wound-type').value;
    localStorage.setItem('sb_api_key', state.apiKey);
    engine.setApiKey(state.apiKey);
    $('patient-name-disp').textContent = state.patient.name;
    $('patient-id-disp').textContent   = state.patient.id + ' · ' + state.patient.weight + ' kg';
    $('patient-avatar').textContent    = state.patient.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    $('dose-weight').value = state.patient.weight;
    refreshDrugs(true);
    $('settings-modal').classList.add('hidden');
  });

  $('s-normal').addEventListener('click',    () => hw.setScenario('normal'));
  $('s-infection').addEventListener('click', () => hw.setScenario('infection'));
  $('s-critical').addEventListener('click',  () => hw.setScenario('critical'));
}

/* ── Connect modal ────────────────────────────── */
function initConnectModal() {
  const openModal  = () => $('connect-modal').classList.remove('hidden');
  const closeModal = () => $('connect-modal').classList.add('hidden');

  $('btn-connect')?.addEventListener('click', openModal);
  $('connect-close')?.addEventListener('click', closeModal);
  $('connect-modal')?.addEventListener('click', e => { if (e.target === $('connect-modal')) closeModal(); });

  ['opt-ble','opt-serial','opt-sim'].forEach(id => {
    $(id)?.addEventListener('click', () => {
      document.querySelectorAll('.connect-opt').forEach(b => b.classList.remove('active'));
      $(id).classList.add('active');
      const modeMap = { 'opt-ble':'bluetooth', 'opt-serial':'serial', 'opt-sim':'simulation' };
      closeModal();
      hw.disconnect();
      hw.connect(modeMap[id]);
    });
  });
}

/* ── Release modal ──────────────────────────── */
function initReleaseModal() {
  $('btn-release').addEventListener('click', () => {
    const drug = $('dose-drug').options[$('dose-drug').selectedIndex].text;
    const dose = $('dose-amount').value;
    const mode = $('dose-mode').options[$('dose-mode').selectedIndex].text;
    $('release-confirm-detail').innerHTML = `<strong>Drug:</strong> ${drug}<br><strong>Dose:</strong> ${dose} mg<br><strong>Mode:</strong> ${mode}<br><strong>Patient:</strong> ${state.patient.name}`;
    $('release-modal').classList.remove('hidden');
  });
  $('release-modal-close').addEventListener('click', () => $('release-modal').classList.add('hidden'));
  $('release-cancel').addEventListener('click',      () => $('release-modal').classList.add('hidden'));
  $('release-modal').addEventListener('click', e => { if (e.target === $('release-modal')) $('release-modal').classList.add('hidden'); });
  $('release-confirm').addEventListener('click', () => {
    logRelease();
    $('release-modal').classList.add('hidden');
    $('release-confirm').textContent = '✓ Released!';
    setTimeout(() => $('release-confirm').textContent = '✓ Confirm Release', 2000);
  });
}

/* ── Chart toggles ──────────────────────────── */
function initChartToggles() {
  document.querySelectorAll('.ctoggle').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      chart.data.datasets[parseInt(btn.dataset.ds)].hidden = !btn.classList.contains('active');
      chart.update();
    });
  });
}

/* ── Wound ──────────────────────────────────── */
function initWound() {
  $('wound-upload').addEventListener('change', e => { if (e.target.files[0]) handleWoundImage(e.target.files[0]); });
  $('btn-ai-analyze').addEventListener('click', analyzeWound);
  $('btn-refresh-drugs').addEventListener('click', () => refreshDrugs(true));
  const zone = $('wound-drop');
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('dragover');
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith('image/')) handleWoundImage(f);
  });
}

/* ── Hardware ───────────────────────────────── */
function initHardware() {
  hw.addEventListener('data', e => {
    const d = e.detail;
    if (d.connected !== undefined) setConnectionUI(d.connected, d.mode);
    if (d.batch) updateVitalsUI(d.batch);
    if (d.metric && d.value !== undefined) { const u={}; u[d.metric]=d.value; updateVitalsUI(u); }
  });
  hw.connect('simulation');
}

/* ── INIT (called by auth.js after login) ──── */
let _dashboardInitialized = false;
function initDashboard() {
  if (_dashboardInitialized) return;
  _dashboardInitialized = true;

  initChart();
  initMobileHeader();
  initMobileNav();
  initSettings();
  initConnectModal();
  initReleaseModal();
  initChartToggles();
  initWound();
  initHardware();
  $('alert-close').addEventListener('click', () => $('alert-banner').classList.add('hidden'));
  refreshDrugs(true);
  setInterval(updateSession, 1000);
}

// Register service worker for PWA offline support
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
