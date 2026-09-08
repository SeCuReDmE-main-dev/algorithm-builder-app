export const HERO_SHEET_TABS = Object.freeze(['mission', 'hero', 'forge', 'qbit', 'journal']);

export function isHeroSheetProjection(value) {
  return Boolean(
    value
    && value.schema === 'securedme.education.algoquest.hero-sheet-projection.v1'
    && typeof value.run_id === 'string'
    && Number.isInteger(value.revision)
    && value.canonical_state_owner === 'algoquest'
    && value.mission
    && value.hero
    && value.raw_secret_stored === false
  );
}
