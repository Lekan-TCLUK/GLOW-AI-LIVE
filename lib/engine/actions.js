export const ACTION_ENGINE_VERSION = 'GLOW-ACTIONS-V1.0';

// Controlled action catalogue. Customer copy remains a content-layer concern;
// the deterministic engine selects only approved action IDs and metadata.
const CATALOG = {
  radiance: [
    ['RAD-001','cleansing','Gentle cleanse','immediate'], ['RAD-004','protection','SPF 30+','protection'],
    ['RAD-006','targeted skincare','Niacinamide','product'], ['RAD-010','movement','10–20 minute walk','lifestyle']
  ],
  hydration_appearance: [
    ['HYD-001','cleansing','Lukewarm cleanse','immediate'], ['HYD-005','moisturising','Hydration layers','product'],
    ['HYD-007','targeted skincare','Hyaluronic acid','product'], ['HYD-010','hydration habits','Earlier fluids','lifestyle']
  ],
  evenness: [
    ['EVE-001','protection','SPF 30+','protection'], ['EVE-004','targeted skincare','Niacinamide','product'],
    ['EVE-005','targeted skincare','Vitamin C derivative','product'], ['EVE-008','skincare','Consistent skincare','lifestyle']
  ],
  texture: [
    ['TEX-001','cleansing','Gentle cleanse','immediate'], ['TEX-002','moisturising','Moisturise','product'],
    ['TEX-004','exfoliation','Suitable gentle exfoliating product','product'], ['TEX-009','skincare','One new active at a time','lifestyle']
  ],
  under_eye_appearance: [
    ['UE-001','eye care','Cool compress','immediate'], ['UE-004','eye care','Caffeine eye product','product'],
    ['UE-007','protection','Eye-area SPF','protection'], ['UE-008','sleep','Consistent sleep window','lifestyle']
  ],
  overall_vitality: [
    ['VIT-001','sleep','Sleep window','immediate'], ['VIT-005','hydration habits','Fluids earlier','product'],
    ['VIT-006','movement','Walk','lifestyle'], ['VIT-008','environment','Wind-down ritual','lifestyle']
  ]
};

export function getActionCatalogue() { return JSON.parse(JSON.stringify(CATALOG)); }

export function actionsForDimension(dimension) {
  if (!CATALOG[dimension]) throw new Error(`Unknown dimension: ${dimension}`);
  return CATALOG[dimension].map(([action_id, category, action, role]) => ({ action_id, category, action, role, dimension }));
}

export function selectFourActions(dimension) {
  return actionsForDimension(dimension).map((a, i) => ({
    ...a,
    selection_reason: ['immediate priority response','targeted product/support action','protective habit','lifestyle support'][i],
    archetype_modifier: null,
    safety_validated: true
  }));
}