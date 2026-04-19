/* ═══════════════════════════════════════════════════════════════
   DRUG ENGINE v2 — Comprehensive Wound-Care Formulary
   28 drugs · 9 categories · 25+ rules · Clinical Gemini prompts
   ═══════════════════════════════════════════════════════════════ */

const DRUG_DB = {
  /* ── ANTIBIOTICS ────────────────────────────── */
  amoxicillin:  { name: 'Amoxicillin-Clavulanate',  dose: '500/125 mg',    route: 'Oral',             freq: 'Every 8 h',    category: 'Antibiotic',         baseDose: 12.5  },
  clindamycin:  { name: 'Clindamycin',               dose: '300 mg',        route: 'Oral/IV',          freq: 'Every 6 h',    category: 'Antibiotic',         baseDose: 8     },
  metronidazole:{ name: 'Metronidazole',              dose: '400 mg',        route: 'Oral/Topical',     freq: 'Every 8 h',    category: 'Antibiotic',         baseDose: 7.5   },
  mupirocin:    { name: 'Mupirocin 2% Ointment',     dose: 'Thin layer',    route: 'Topical',          freq: 'Every 8–12 h', category: 'Antibiotic',         baseDose: 0     },
  fusidic:      { name: 'Fusidic Acid 2%',           dose: 'Thin layer',    route: 'Topical',          freq: 'Every 8 h',    category: 'Antibiotic',         baseDose: 0     },
  cephalexin:   { name: 'Cephalexin',                 dose: '500 mg',        route: 'Oral',             freq: 'Every 6 h',    category: 'Antibiotic',         baseDose: 12    },

  /* ── ANTIMICROBIALS ─────────────────────────── */
  silver:       { name: 'Silver Sulfadiazine 1%',    dose: '1–2 mm layer',  route: 'Topical',          freq: 'Once daily',   category: 'Antimicrobial',      baseDose: 0     },
  povidone:     { name: 'Povidone-Iodine 10%',       dose: '5–10 mL',       route: 'Topical wash',     freq: 'Every 12 h',   category: 'Antimicrobial',      baseDose: 0     },
  chlorhexidine:{ name: 'Chlorhexidine 0.05%',       dose: '10–20 mL',      route: 'Irrigation',       freq: 'Once daily',   category: 'Antimicrobial',      baseDose: 0     },
  manuka:       { name: 'Medical-Grade Manuka Honey', dose: '3–5 mm layer',  route: 'Topical dressing', freq: 'Every 24–48 h',category: 'Antimicrobial',      baseDose: 0     },
  phmb:         { name: 'PHMB 0.1% Solution',        dose: '10–20 mL',      route: 'Irrigation',       freq: 'Once daily',   category: 'Antimicrobial',      baseDose: 0     },

  /* ── ANTI-INFLAMMATORIES ────────────────────── */
  diclofenac:   { name: 'Diclofenac Gel 1%',         dose: '2–4 g',         route: 'Topical',          freq: 'Every 6–8 h',  category: 'Anti-inflammatory',  baseDose: 1     },
  ibuprofen:    { name: 'Ibuprofen',                  dose: '400 mg',        route: 'Oral',             freq: 'Every 6–8 h',  category: 'Anti-inflammatory',  baseDose: 5     },
  hydrocortisone:{ name: 'Hydrocortisone 1% Cream',  dose: 'Thin layer',    route: 'Topical',          freq: 'Every 12 h',   category: 'Anti-inflammatory',  baseDose: 0     },
  dexamethasone:{ name: 'Dexamethasone',              dose: '4 mg',          route: 'IV/Oral',          freq: 'Once daily',   category: 'Anti-inflammatory',  baseDose: 0.15  },

  /* ── HEMOSTATICS ────────────────────────────── */
  tranexamic:   { name: 'Tranexamic Acid',            dose: '500 mg',        route: 'Topical/IV',       freq: 'Every 8 h',    category: 'Hemostatic',         baseDose: 10    },
  cellulose:    { name: 'Oxidized Cellulose (Surgicel)',dose: '1 sheet',     route: 'Topical',          freq: 'As needed',    category: 'Hemostatic',         baseDose: 0     },
  thrombin:     { name: 'Topical Thrombin',           dose: '1000 IU/mL',    route: 'Topical',          freq: 'As needed',    category: 'Hemostatic',         baseDose: 0     },

  /* ── ANTIOXIDANTS ───────────────────────────── */
  nac:          { name: 'N-Acetyl Cysteine',          dose: '200 mg/mL',     route: 'Topical (bandage)',freq: 'Continuous',    category: 'Antioxidant',        baseDose: 4     },
  vitaminC:     { name: 'Ascorbic Acid (Vitamin C)',   dose: '250 mg/mL',     route: 'Topical',          freq: 'Every 12 h',   category: 'Antioxidant',        baseDose: 5     },
  vitaminE:     { name: 'Vitamin E (α-Tocopherol)',   dose: '5% cream',      route: 'Topical',          freq: 'Every 12 h',   category: 'Antioxidant',        baseDose: 0     },

  /* ── GROWTH FACTORS ─────────────────────────── */
  becaplermin:  { name: 'Becaplermin Gel (Regranex)',  dose: '0.01%',         route: 'Topical',          freq: 'Once daily',   category: 'Growth Factor',      baseDose: 0     },
  egf:          { name: 'Epidermal Growth Factor',     dose: '10 µg/cm²',     route: 'Topical',          freq: 'Once daily',   category: 'Growth Factor',      baseDose: 0     },

  /* ── DEBRIDERS ──────────────────────────────── */
  collagenase:  { name: 'Collagenase (Santyl)',        dose: '2 mm layer',    route: 'Topical',          freq: 'Once daily',   category: 'Debrider',           baseDose: 0     },

  /* ── ANALGESICS ─────────────────────────────── */
  lidocaine:    { name: 'Lidocaine 2% Gel',            dose: '5–10 mL',       route: 'Topical',          freq: 'Every 4–6 h',  category: 'Analgesic',          baseDose: 4.5   },
  prilocaine:   { name: 'Prilocaine-Lidocaine (EMLA)', dose: '2.5 g',         route: 'Topical',          freq: 'Before procedure', category: 'Analgesic',      baseDose: 0     },

  /* ── EMERGENCY ──────────────────────────────── */
  oxygen:       { name: 'Supplemental O₂ (Escalate)',  dose: '2–15 L/min',    route: 'Inhalation',       freq: 'Continuous',   category: 'Emergency',          baseDose: 0     },
  epinephrine:  { name: 'Epinephrine 1:1000',          dose: '0.3–0.5 mg',    route: 'IM',               freq: 'STAT',         category: 'Emergency',          baseDose: 0.01  },
};

/* ── RULE ENGINE ──────────────────────────────── */
const RULES = [
  // ─── CRITICAL / EMERGENCY ───
  { id: 'crit-o2',        check: (v)   => v.spo2 < 88,                                             drugs: ['oxygen'],                      urgency: 'high',   reason: 'SpO₂ < 88% — CRITICAL. Immediate supplemental oxygen required. Escalate to emergency team.' },
  { id: 'low-o2',         check: (v)   => v.spo2 >= 88 && v.spo2 < 92,                             drugs: ['oxygen'],                      urgency: 'medium', reason: 'SpO₂ below 92% — hypoxic risk. Start supplemental oxygen and monitor closely.' },
  { id: 'anaphylaxis',    check: (v)   => v.spo2 < 85 && v.temperature > 38,                       drugs: ['epinephrine', 'oxygen'],        urgency: 'high',   reason: 'Combined hypoxia + fever — suspect anaphylaxis or septic shock. Epinephrine + O₂ STAT.' },

  // ─── INFECTION (temperature-based) ───
  { id: 'severe-infection', check: (v) => v.temperature >= 39.5,                                    drugs: ['clindamycin', 'metronidazole'], urgency: 'high',   reason: 'Severe fever (≥ 39.5°C) — aggressive dual antibiotic therapy. Blood cultures recommended.' },
  { id: 'mod-infection',    check: (v) => v.temperature >= 38.5 && v.temperature < 39.5,            drugs: ['amoxicillin', 'mupirocin'],     urgency: 'high',   reason: 'Moderate fever — systemic + topical antibiotic. Monitor for escalation.' },
  { id: 'mild-infection',   check: (v) => v.temperature >= 37.8 && v.temperature < 38.5,            drugs: ['fusidic'],                     urgency: 'medium', reason: 'Mild temperature elevation — topical antibiotic as prophylaxis. Watch for worsening.' },

  // ─── BURN-SPECIFIC ───
  { id: 'burn-infected',   check: (v,w) => w === 'burn' && v.temperature > 38,                      drugs: ['silver', 'cephalexin', 'lidocaine'], urgency: 'high',   reason: 'Infected burn wound — SSD antimicrobial cover + systemic antibiotic + pain management.' },
  { id: 'burn-clean',      check: (v,w) => w === 'burn' && v.temperature <= 38,                     drugs: ['silver', 'lidocaine', 'vitaminE'],   urgency: 'medium', reason: 'Clean burn — Silver Sulfadiazine cover, analgesia, and Vitamin E for scar prevention.' },

  // ─── LACERATION ───
  { id: 'laceration-bleed', check: (v,w) => w === 'laceration',                                     drugs: ['tranexamic', 'lidocaine', 'chlorhexidine'], urgency: 'high', reason: 'Laceration — hemostatic control + wound irrigation + local anesthesia for closure.' },

  // ─── BRUISE / CONTUSION ───
  { id: 'bruise',           check: (v,w) => w === 'bruise',                                         drugs: ['diclofenac', 'ibuprofen'],     urgency: 'low',    reason: 'Bruise/contusion — topical + oral anti-inflammatory. RICE protocol.' },

  // ─── ABRASION ───
  { id: 'abrasion',         check: (v,w) => w === 'abrasion',                                       drugs: ['chlorhexidine', 'mupirocin', 'manuka'], urgency: 'medium', reason: 'Abrasion — irrigate with antiseptic, topical antibiotic, honey dressing for moist healing.' },

  // ─── ULCER / CHRONIC WOUND ───
  { id: 'ulcer-severe',    check: (v,w) => w === 'ulcer' && v.temperature > 38,                     drugs: ['collagenase', 'amoxicillin', 'becaplermin'], urgency: 'high',   reason: 'Infected chronic ulcer — enzymatic debridement + antibiotic + growth factor therapy.' },
  { id: 'ulcer-stable',    check: (v,w) => w === 'ulcer' && v.temperature <= 38,                    drugs: ['collagenase', 'manuka', 'egf'],              urgency: 'medium', reason: 'Stable chronic ulcer — debridement, honey dressing, EGF to accelerate granulation.' },

  // ─── INFECTED WOUND ───
  { id: 'infected-severe',  check: (v,w) => w === 'infected' && v.temperature >= 39,                drugs: ['clindamycin', 'metronidazole', 'povidone'], urgency: 'high',   reason: 'Severely infected wound with high fever — dual antibiotics + antiseptic irrigation.' },
  { id: 'infected-mild',    check: (v,w) => w === 'infected' && v.temperature < 39,                 drugs: ['amoxicillin', 'phmb', 'mupirocin'],          urgency: 'medium', reason: 'Infected wound — systemic antibiotic, PHMB irrigation, topical mupirocin.' },

  // ─── SURGICAL WOUND ───
  { id: 'surgical',          check: (v,w) => w === 'surgical',                                      drugs: ['cephalexin', 'chlorhexidine', 'lidocaine'],  urgency: 'medium', reason: 'Surgical wound — prophylactic antibiotic, antiseptic care, pain management.' },

  // ─── PRESSURE INJURY ───
  { id: 'pressure',          check: (v,w) => w === 'pressure_injury',                               drugs: ['collagenase', 'manuka', 'vitaminC'],         urgency: 'medium', reason: 'Pressure injury — enzymatic debridement, honey dressing, Vitamin C for collagen synthesis.' },

  // ─── OXIDATIVE STRESS (H₂O₂) ───
  { id: 'h2o2-critical',    check: (v)   => v.h2o2 >= 1.5,                                          drugs: ['nac', 'vitaminC', 'dexamethasone'], urgency: 'high',   reason: 'Critical H₂O₂ ≥ 1.5 mM — severe oxidative stress. Aggressive antioxidant + anti-inflammatory.' },
  { id: 'h2o2-high',        check: (v)   => v.h2o2 >= 0.8 && v.h2o2 < 1.5,                          drugs: ['nac', 'vitaminC'],              urgency: 'medium', reason: 'Elevated H₂O₂ — antioxidant therapy to reduce oxidative tissue damage.' },
  { id: 'h2o2-moderate',    check: (v)   => v.h2o2 >= 0.4 && v.h2o2 < 0.8,                          drugs: ['vitaminC', 'vitaminE'],         urgency: 'low',    reason: 'Moderate H₂O₂ — topical antioxidant support for healing environment.' },

  // ─── PAIN MANAGEMENT (catch-all for high-severity wounds) ───
  { id: 'pain-severe',      check: (v,w,s) => s > 70,                                               drugs: ['lidocaine'],                   urgency: 'medium', reason: 'High severity wound — local anesthesia for pain management.' },

  // ─── BASELINE (always-on for clean healing) ───
  { id: 'baseline',          check: ()    => true,                                                   drugs: ['diclofenac'],                  urgency: 'low',    reason: 'Vitals stable — mild anti-inflammatory maintenance for optimal healing.' },
];

class DrugEngine {
  constructor() {
    this.apiKey = '';
  }

  setApiKey(key) {
    this.apiKey = key;
  }

  getDrugList() {
    return Object.entries(DRUG_DB).map(([id, d]) => ({ id, ...d }));
  }

  getDrugById(id) {
    return DRUG_DB[id] || null;
  }

  /* ── Rule-based analysis ─────────────────────── */
  analyze(vitals, woundType = 'unknown', severity = 50) {
    const suggestions = [];
    const seen = new Set();
    // Are vitals alarming regardless of wound type?
    const vitalsAlarm = vitals.temperature >= 38 || vitals.spo2 < 92 || vitals.h2o2 >= 0.8;
    const isMinorWound = severity < 25 && !vitalsAlarm;

    for (const rule of RULES) {
      if (rule.id === 'baseline') continue; // add last

      // For very minor wounds with normal vitals, skip high-urgency rules
      if (isMinorWound && rule.urgency === 'high') continue;
      // For low-severity wounds, skip medium rules unless vitals are flagged or wound type matched
      if (severity < 20 && !vitalsAlarm && rule.urgency === 'medium' && woundType === 'unknown') continue;

      if (rule.check(vitals, woundType, severity)) {
        for (const drugId of rule.drugs) {
          if (!seen.has(drugId)) {
            seen.add(drugId);
            const db = DRUG_DB[drugId];
            if (db) {
              suggestions.push({
                ...db, id: drugId,
                urgency: rule.urgency,
                reason: rule.reason,
                source: 'rule',
              });
            }
          }
        }
      }

      // Cap at 4 drug suggestions to avoid overwhelming the panel
      if (suggestions.length >= 4) break;
    }

    // Baseline fallback — always show at least one suggestion
    if (suggestions.length === 0) {
      const base = RULES.find(r => r.id === 'baseline');
      for (const drugId of base.drugs) {
        if (!seen.has(drugId)) {
          suggestions.push({ ...DRUG_DB[drugId], id: drugId, urgency: 'low', reason: base.reason, source: 'rule' });
        }
      }
    }

    return suggestions;
  }

  /* ── Gemini AI: wound image analysis ────────── */
  async analyzeWoundImage(imageBase64) {
    if (!this.apiKey) return null;

    const prompt = `You are an expert clinical wound care specialist and dermatologist AI integrated into a smart bandage medical device. Analyze the provided wound image with extreme precision.

INSTRUCTIONS:
1. Carefully examine the wound morphology, tissue color, border characteristics, exudate, and surrounding skin.
2. Classify the wound type from the following categories ONLY: laceration, bruise, burn, abrasion, ulcer, infected, surgical, pressure_injury, healthy_skin, unknown
3. Assess severity on a 0–100 scale based on:
   - Wound depth and area
   - Tissue viability (necrotic/sloughy/granulating/epithelializing)
   - Signs of infection (erythema, purulence, warmth, edema)
   - Wound edges (undermining, tunneling, rolled)
4. Determine the healing stage based on wound appearance.
5. List concrete immediate clinical actions.

If the image is NOT a wound (e.g. random object, selfie, landscape), set woundType to "healthy_skin", severity to 0, and note this in observations.

Respond in VALID JSON ONLY, no markdown, no explanation:
{
  "woundType": "laceration|bruise|burn|abrasion|ulcer|infected|surgical|pressure_injury|healthy_skin|unknown",
  "severity": <0-100>,
  "severityLabel": "Mild|Moderate|Severe|Critical",
  "healingStage": "Hemostasis|Inflammation|Proliferation|Remodeling|Chronic",
  "tissueComposition": {
    "necrotic": <0-100>,
    "slough": <0-100>,
    "granulation": <0-100>,
    "epithelial": <0-100>
  },
  "infectionRisk": "None|Low|Moderate|High|Active",
  "observations": "<3-4 detailed clinical sentences>",
  "immediateActions": ["<action1>", "<action2>", "<action3>"]
}`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
              ]
            }],
            generationConfig: {
              temperature: 0.1,
              topP: 0.8,
              maxOutputTokens: 1024,
            }
          })
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('[Gemini Wound] API error:', res.status, err);
        return null;
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        console.error('[Gemini Wound] Empty response');
        return null;
      }

      // Parse JSON from response — handle markdown code fences
      const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const result = JSON.parse(cleaned);

      // Validate required fields
      if (!result.woundType || result.severity === undefined) {
        console.error('[Gemini Wound] Missing fields in response:', result);
        return null;
      }

      return result;

    } catch (e) {
      console.error('[Gemini Wound] Error:', e);
      return null;
    }
  }

  /* ── Gemini AI: drug recommendations ────────── */
  async analyzeWithGemini(vitals, woundType, severity = 50, imageB64 = null) {
    if (!this.apiKey) return null;

    const prompt = `You are a clinical pharmacist AI integrated into a smart wound-care bandage system. Based on the following patient data, provide drug recommendations.

PATIENT VITALS:
- Temperature: ${vitals.temperature}°C
- SpO₂: ${vitals.spo2}%
- H₂O₂ (wound oxidative stress): ${vitals.h2o2} mM
- Heart Rate: ${vitals.heartRate || 'N/A'} bpm
- Wound Type: ${woundType}
- Wound Severity: ${severity}%

AVAILABLE DRUGS IN OUR SMART BANDAGE SYSTEM:
${Object.entries(DRUG_DB).map(([id, d]) => `- ${d.name} (${d.category}) — ${d.dose}, ${d.route}`).join('\n')}

INSTRUCTIONS:
1. Recommend 2–5 drugs from the available list above.
2. For each drug, specify: exact dose, route, frequency, urgency (high/medium/low), and clinical reasoning.
3. Consider drug interactions and contraindications.
4. Prioritize life-threatening conditions first.

Respond in VALID JSON ONLY:
{
  "summary": "<overall clinical assessment in 2 sentences>",
  "recommendations": [
    {
      "drugId": "<drug key from available list>",
      "name": "<drug name>",
      "dose": "<specific dose>",
      "route": "<route>",
      "frequency": "<frequency>",
      "urgency": "high|medium|low",
      "reason": "<1-2 sentence clinical rationale>"
    }
  ],
  "woundAssessment": "<wound status summary>",
  "healingOutlook": "<expected healing trajectory>",
  "warnings": ["<any warnings or contraindications>"]
}`;

    const parts = [{ text: prompt }];
    if (imageB64) parts.push({ inline_data: { mime_type: 'image/jpeg', data: imageB64 } });

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { temperature: 0.2, topP: 0.85, maxOutputTokens: 2048 }
          })
        }
      );

      if (!res.ok) return null;
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return null;

      return JSON.parse(text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim());

    } catch (e) {
      console.error('[Gemini Drug]', e);
      return null;
    }
  }

  /* ── Dose calculation (weight-based) ────────── */
  calculateDose(drugId, weightKg, severityPct = 50) {
    const drug = DRUG_DB[drugId];
    if (!drug || drug.baseDose === 0) return drug ? drug.dose : '—'; // topical — return label dose
    const dose = Math.round(drug.baseDose * weightKg * (0.75 + (severityPct / 100) * 0.5));
    return dose + ' mg';
  }
}

window.DrugEngine = DrugEngine;
