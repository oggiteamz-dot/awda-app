/**
 * palettes.js — THE COLOUR AXIS. The only place in this product a colour may exist.
 *
 * ─── WHY THE PREVIOUS SIX WERE REJECTED ─────────────────────────────────────
 * Hadi, 17 Sep: "this app isn't only about death. It's about education, about
 * faith." He was right. Four dark palettes and two muted lights all read as a
 * grief app, because every one of them put the mood in the PALETTE.
 *
 * ─── THE FIX, IN ONE SENTENCE ───────────────────────────────────────────────
 * The mood moves out of the palette and into the MODULE. A palette is now a
 * bright, saturated identity; the two sombre registers — الوثيقة (the will, a
 * legal document) and الكفن (iḥtiḍār, the time of dying) — are fixed grounds
 * that every palette wears unchanged. So the app can be alive on الرئيسية and
 * still be silent on الاحتضار, without one palette trying to be both.
 *
 * ─── THE STRUCTURAL PATTERN ─────────────────────────────────────────────────
 * Measured across Monzo, Buddy, Copilot Money, Rocket Money, KOHO and Affirm on
 * Mobbin: the bright apps that stay legible put a SATURATED COLOUR BLOCK at the
 * top and WHITE OR NEAR-WHITE CARDS below it. Body text never sits on the
 * saturated colour — only display numerals and one white label do. That is why
 * brightness costs them nothing in contrast, and it is precisely what the old
 * light palettes got wrong by putting grey text on a pale ground.
 *
 * So every row below has TWO grounds:
 *   head / head-ink / head-soft   the saturated block. Display type only.
 *   bg / card / ink / soft        the reading surface. All body text lives here.
 *
 * ─── THE FLOOR ──────────────────────────────────────────────────────────────
 * 4.5:1 on every text pair, INCLUDING headings. WCAG's large-text exemption at
 * 3:1 measures large-area luminance and knows nothing about the sub-pixel dots
 * and tashkīl that carry meaning in Arabic — a jīm and a ḥāʾ differ by one dot at
 * 8–10% of the em. No palette here takes that exemption.
 * Proven by scripts/contrast.mjs on every build. Six of the original seventeen
 * failed this check and shipped anyway. That cannot happen again.
 *
 * `rule` is the gold shrine-hairline. It is ORNAMENT, never text, and is checked
 * for visibility (>=1.6:1) rather than legibility. Gold belongs to the shrine,
 * not to the body — it never appears on الوثيقة or الكفن.
 */

export const DEFAULT_PALETTE = 'zumurrud';

export const PALETTES = [
  {
    key: 'zumurrud', ar: 'الزمرّد', en: 'Emerald', dark: 0,
    note: 'الهويّة. أخضر قاشاني الحرم، والبطاقات بيضاء.',
    source: 'Shrine-tile green. Ahl al-Bayt, sayyid descent — the safest positive colour in the register.',
    v: {
      'head': 'linear-gradient(160deg,#0C6849,#0A5C42 70%,#08503A)',
      'head-flat': '#0B6144', 'head-ink': '#FFFFFF', 'head-soft': '#ACE3CD',
      'bg': '#F3F7F5', 'card': '#FFFFFF', 'card2': '#EDF4F0',
      'ink': '#0F1F19', 'soft': '#485B53', 'line': 'rgba(15,31,25,.13)',
      'acc': '#0B6E4F', 'acc-ink': '#FFFFFF', 'rule': '#B08A34', 'grid': 'rgba(15,31,25,.08)',
    },
  },
  {
    key: 'fayruz', ar: 'الفيروز', en: 'Turquoise', dark: 0,
    note: 'فيروز قاشان العتبات. أصغر سنّاً، وأكثر حياة.',
    source: 'The moʿarraq faience turquoise of the ʿatabāt — the single most recognisable shrine colour to an Iraqi or Lebanese viewer.',
    v: {
      'head': 'linear-gradient(160deg,#0A6A74,#085A63 70%,#074E56)',
      'head-flat': '#09616A', 'head-ink': '#FFFFFF', 'head-soft': '#B2E8EE',
      'bg': '#F1F7F8', 'card': '#FFFFFF', 'card2': '#E9F3F5',
      'ink': '#0D1E21', 'soft': '#44575B', 'line': 'rgba(13,30,33,.13)',
      'acc': '#0A5F69', 'acc-ink': '#FFFFFF', 'rule': '#B08A34', 'grid': 'rgba(13,30,33,.08)',
    },
  },
  {
    key: 'lazuward', ar: 'اللازورد', en: 'Lapis', dark: 0,
    note: 'أزرق المخطوط وأحمر الفواصل. لونٌ للتنقّل، لا للزينة.',
    source: 'Manuscript rubrication: lapis for a heading, madder for a section break. In Islamic manuscript practice colour is NAVIGATION, not decoration.',
    v: {
      'head': 'linear-gradient(160deg,#254A97,#1A3672 70%,#152D61)',
      'head-flat': '#1E3D7E', 'head-ink': '#FFFFFF', 'head-soft': '#C3D2F0',
      'bg': '#F4F6FA', 'card': '#FFFFFF', 'card2': '#EBEFF8',
      'ink': '#121826', 'soft': '#475169', 'line': 'rgba(18,24,38,.13)',
      'acc': '#1E3D7E', 'acc-ink': '#FFFFFF', 'rule': '#9C3A2E', 'grid': 'rgba(18,24,38,.08)',
    },
  },
  {
    key: 'nili', ar: 'النيلي', en: 'Indigo', dark: 0,
    note: 'الأقرب إلى لغة الأدوات والقياس. هادئ، وحديث.',
    source: 'The instrument register — the colour scientific and measurement software reaches for, carried here on shrine geometry rather than on charts alone.',
    v: {
      'head': 'linear-gradient(160deg,#4A3BA0,#332878 70%,#2B2166)',
      'head-flat': '#3B2E85', 'head-ink': '#FFFFFF', 'head-soft': '#CBC4EE',
      'bg': '#F6F5FB', 'card': '#FFFFFF', 'card2': '#EEEBF8',
      'ink': '#161327', 'soft': '#504C6B', 'line': 'rgba(22,19,39,.13)',
      'acc': '#3F3193', 'acc-ink': '#FFFFFF', 'rule': '#B08A34', 'grid': 'rgba(22,19,39,.08)',
    },
  },
  {
    key: 'yaqut', ar: 'الياقوت', en: 'Plum', dark: 0,
    note: 'باذنجانيّ الخزف الصفويّ. غير مألوف، وراقٍ.',
    source: 'The aubergine of Safavid haft-rang seven-colour tile — present in the shrine palette, and absent from every app in this category.',
    v: {
      'head': 'linear-gradient(160deg,#7B3162,#5C2149 70%,#4E1B3E)',
      'head-flat': '#6B2A55', 'head-ink': '#FFFFFF', 'head-soft': '#E6C4DA',
      'bg': '#FAF4F8', 'card': '#FFFFFF', 'card2': '#F3E9F0',
      'ink': '#22121D', 'soft': '#5C4553', 'line': 'rgba(34,18,29,.13)',
      'acc': '#6B2A55', 'acc-ink': '#FFFFFF', 'rule': '#B08A34', 'grid': 'rgba(34,18,29,.08)',
    },
  },
  {
    key: 'sahra', ar: 'الصحراء', en: 'Clay', dark: 0,
    note: 'لون التربة. الأنسب لشاشة القضاء.',
    source: 'Turbah earth — the prayer-surface colour. Humble and repetitive, which is correct for a long obligation.',
    v: {
      'head': 'linear-gradient(160deg,#86462A,#733B23 70%,#63311D)',
      'head-flat': '#7A3F26', 'head-ink': '#FFFFFF', 'head-soft': '#EECAB5',
      'bg': '#FAF6F2', 'card': '#FFFFFF', 'card2': '#F3EBE3',
      'ink': '#221710', 'soft': '#5A4536', 'line': 'rgba(34,23,16,.13)',
      'acc': '#7A3D24', 'acc-ink': '#FFFFFF', 'rule': '#8A6A22', 'grid': 'rgba(34,23,16,.08)',
    },
  },
  {
    key: 'bronz', ar: 'البرونز', en: 'Bronze', dark: 0,
    note: 'نحاس الأسطرلاب. لون الآلة نفسها.',
    source: 'Engraved astrolabe brass — the instrument palette. The astrolabe, the zīj tables and the mīqāt were religious instruments; this is their colour.',
    v: {
      'head': 'linear-gradient(160deg,#5C4E1D,#4A3E15 70%,#3D3311)',
      'head-flat': '#514419', 'head-ink': '#FFFFFF', 'head-soft': '#D3C591',
      'bg': '#F8F6EE', 'card': '#FFFDF7', 'card2': '#F1EDDF',
      'ink': '#1E1B0E', 'soft': '#524B33', 'line': 'rgba(30,27,14,.15)',
      'acc': '#57491B', 'acc-ink': '#FFFFFF', 'rule': '#8A6A22', 'grid': 'rgba(30,27,14,.09)',
    },
  },
  {
    key: 'hibr', ar: 'الحبر', en: 'Ink', dark: 1,
    note: 'الوضع الليليّ. فحميّ لا أسود — والأسود مكروه في غير الحداد.',
    source: 'Charcoal, deliberately NOT pure black: black is makrūh in ordinary Shia use and its mourning exception is narrow, so a black chrome says "mourning" on every screen including the one where you log a missed ʿaṣr.',
    v: {
      'head': 'linear-gradient(160deg,#0F4A37,#0A3124 70%,#082A1F)',
      'head-flat': '#0C3B2C', 'head-ink': '#F4FBF7', 'head-soft': '#9FCCB8',
      'bg': '#14181B', 'card': '#1D2328', 'card2': '#252C32',
      'ink': '#ECF1EE', 'soft': '#A7B6AF', 'line': 'rgba(236,241,238,.16)',
      'acc': '#57D8A2', 'acc-ink': '#07130E', 'rule': '#C8A24A', 'grid': 'rgba(236,241,238,.10)',
    },
  },
];

/**
 * THE TWO FIXED GROUNDS.
 *
 * These do NOT change with the palette, and that is the whole point of them.
 *
 * الوثيقة — the will. Parchment, ink, one restrained rule. Document register:
 * sober, archival, legally serious. No gold: gold-woven cloth is prohibited in
 * the kafan, so gold stays off anything touching the body or the burial.
 *
 * الكفن — iḥtiḍār. Near-white shroud ground, greatly increased whitespace,
 * minimal chrome, one green element (the jarīda — the fresh green twig placed
 * with the body), charcoal text. White is the kafan, and it is also the least
 * visually noisy surface to read under stress. This is the single
 * highest-leverage decision in the whole design: WHITE, NOT BLACK, IS THE
 * COLOUR OF DEATH IN THIS APP.
 *
 * No red anywhere in either. Red is martyrdom and vengeance, and in taʿziya
 * convention it is the villain's colour. An ordinary person dying of cancer is
 * not a martyr, and framing them as one is a category error the family feels.
 * Destructive actions use a charcoal outline instead.
 */
export const GROUNDS = {
  doc: {
    ar: 'الوثيقة', en: 'Document',
    v: {
      'head': 'linear-gradient(170deg,#E7E1D2,#DED7C5)',
      'head-flat': '#E2DBCB', 'head-ink': '#1A1812', 'head-soft': '#4F4A3A',
      'bg': '#EFEADD', 'card': '#FBF8F0', 'card2': '#F2EDE1',
      'ink': '#1A1812', 'soft': '#4F4A3A', 'line': 'rgba(26,24,18,.20)',
      'acc': '#3A3325', 'acc-ink': '#FBF8F0', 'rule': '#8A7440', 'grid': 'rgba(26,24,18,.10)',
    },
  },
  shroud: {
    ar: 'الكفن', en: 'Shroud',
    v: {
      'head': 'linear-gradient(180deg,#FFFFFF,#FAFBFA)',
      'head-flat': '#FFFFFF', 'head-ink': '#15181A', 'head-soft': '#4C5457',
      'bg': '#FAFBFA', 'card': '#FFFFFF', 'card2': '#F3F5F4',
      'ink': '#15181A', 'soft': '#4C5457', 'line': 'rgba(21,24,26,.14)',
      'acc': '#0B6E4F', 'acc-ink': '#FFFFFF', 'rule': 'rgba(21,24,26,.14)', 'grid': 'rgba(21,24,26,.07)',
    },
  },
};

export function paletteByKey(key) {
  return PALETTES.find((p) => p.key === key) || PALETTES.find((p) => p.key === DEFAULT_PALETTE);
}
