// ---------------------------------------------------------------------------
// UX Lens — mock data
// All screens read from this single module so the demo behaves like a real app.
// ---------------------------------------------------------------------------

export const reportMeta = {
  domain: 'Banking Domain',
  reportName: 'US Bank Report',
  url: 'https://www.usbank.com',
  generatedAt: 'Jun 14, 2026',
  pagesScanned: 10,
}

// Right-hand "Pages / Images Evaluated" panel ------------------------------
export const evaluatedPages = [
  { id: 'personal', label: 'Personal Banking', checked: true },
  { id: 'home-loan', label: 'Home Loan & Mortgage', checked: true },
  { id: 'auto', label: 'Auto & Vehicle Loan', checked: true },
  { id: 'invest', label: 'Investing & Wealth Management', checked: true },
  { id: 'business', label: 'Business & Corporate Services', checked: true },
]

export const promptSuggestions = [
  'Give me heuristic evaluation for the following url',
  'Quick ux review of the following pages in the url',
  'Generate the heat map of home page on this url',
]

export const promptThumbnails = [
  { id: 't1', tint: '#ffd9c2' },
  { id: 't2', tint: '#c2e0ff' },
  { id: 't3', tint: '#d6f5d6' },
]

// ---------------------------------------------------------------------------
// HOME / landing page
// ---------------------------------------------------------------------------
export const homeContent = {
  title: "AI's Dual Lens - Heuristics Evaluation & Heat maps Analysis",
  subtitle:
    'Identifying Usability Strengths & Weaknesses and Visualizing User Engagement & Pain Points',
  placeholder:
    'Give me heuristic evaluation for the following url https://www.usbank.com continuous learning html. For the above link, read heuristic evaluation & heat maps for Home Loans & Mortgages',
  // Generic top-5 flow types (spec Section 7) — these map to how many user
  // flows the backend discovers and evaluates, so all 5 are checked by
  // default. Unchecking some lets the user request fewer flows for a faster
  // run; it no longer needs to match any specific industry's page names.
  pageOptions: [
    { id: 'homepage', label: 'Homepage', checked: true },
    { id: 'product-services', label: 'Product / Services Page', checked: true },
    { id: 'product-detail', label: 'Product Detail Page', checked: true },
    { id: 'pricing', label: 'Pricing Page', checked: true },
    { id: 'checkout-contact', label: 'Checkout / Contact Page', checked: true },
  ],
  toolOptions: [
    { id: 'heuristics', label: 'Heuristics Evaluation', checked: true },
    { id: 'heatmap', label: 'Heat map Analysis', checked: true },
  ],
  heuristicOptions: [
    { id: 'home-eff', label: 'Home Page Effectiveness', checked: true },
    { id: 'search', label: 'Search', checked: true },
    { id: 'forms', label: 'Forms & Data Entry', checked: false },
    { id: 'nav', label: 'Navigation & IA', checked: true },
    { id: 'help', label: 'Help, Feedback & Error Tolerance', checked: false },
    { id: 'layout', label: 'Page Layout & Visual Design', checked: true },
    { id: 'writing', label: 'Writing & Content Quality', checked: false },
    { id: 'task', label: 'Task Orientation', checked: false },
  ],
  sidebar: [
    { id: 'home', label: 'Home', to: '/' },
    { id: 'eval', label: 'Evaluation list', to: '/report/heuristic' },
    { id: 'contact', label: 'Contact', to: '/' },
  ],
}

// ---------------------------------------------------------------------------
// HEURISTIC EVALUATION
// ---------------------------------------------------------------------------
export const heuristicSidebar = [
  { id: 'overall', label: 'Overall Summary' },
  { id: 'home', label: 'Home Page Effectiveness' },
  { id: 'nav', label: 'Navigation & IA' },
  {
    id: 'search',
    label: 'Search',
    children: [
      { id: 'obs-1', label: 'Observation 1' },
      { id: 'obs-2', label: 'Observation 2' },
      { id: 'obs-3', label: 'Observation 3' },
    ],
  },
  { id: 'layout', label: 'Page Layout & Visual Design' },
  { id: 'task', label: 'Task Orientation' },
  { id: 'writing', label: 'Writing & Content Quality' },
  { id: 'help', label: 'Help, Feedback, Error Tolerance' },
]

export const heuristicFooter = [
  { id: 'solution', label: 'Recommended UI Solution', icon: 'bulb' },
  { id: 'history', label: 'View History', icon: 'clock' },
]

export const observations = [
  {
    id: 'obs-1',
    index: 1,
    category: 'Search',
    principle: 'Visibility of System Status',
    vimm: 'Visual',
    severity: 'Medium',
    observation: [
      'The search field gives no loading or progress indication after submitting a query.',
      'Users cannot tell whether the search is processing or has failed silently.',
      'No result count is shown above the listing.',
    ],
    recommendation: [
      'Add an inline spinner and skeleton results while the query resolves.',
      'Surface a "Showing 1–10 of 124 results" summary above the list.',
      'Display a friendly empty-state with suggested terms when nothing matches.',
    ],
  },
  {
    id: 'obs-2',
    index: 2,
    category: 'Search',
    principle: 'User Control & Freedom',
    vimm: 'Visual',
    severity: 'Low',
    observation: [
      'The button visibility is low.',
      'The navigation alignment is misleading for the task flow.',
      'The body content of cards is not easy to absorb in a single view.',
    ],
    recommendation: [
      'The bg of button can be light with following shades matching the colour system #099856, #000057, along with text colour #0009C7.',
      'Alignment can be revised with proper left and right padding.',
      'Rearranged layout could be lorem ipsum.',
    ],
  },
  {
    id: 'obs-3',
    index: 3,
    category: 'Search',
    principle: 'Recognition Rather Than Recall',
    vimm: 'Interaction',
    severity: 'High',
    observation: [
      'Recent and trending searches are not surfaced when the field is focused.',
      'Filters reset on every new query, forcing users to re-select them.',
      'There is no autocomplete to reduce typing effort.',
    ],
    recommendation: [
      'Show recent searches and popular categories on focus.',
      'Persist active filters across consecutive searches in the session.',
      'Introduce type-ahead suggestions backed by the product taxonomy.',
    ],
  },
  {
    id: 'obs-4',
    index: 4,
    category: 'Navigation & IA',
    principle: 'Consistency & Standards',
    vimm: 'Visual',
    severity: 'Medium',
    observation: [
      'Primary nav labels differ between the header and the footer.',
      'The active menu item is not visually highlighted.',
      'Breadcrumbs disappear on deeper pages.',
    ],
    recommendation: [
      'Use a single source of truth for navigation labels.',
      'Add a clear active/hover state to the current section.',
      'Keep breadcrumbs persistent across all sub-pages.',
    ],
  },
  {
    id: 'obs-5',
    index: 5,
    category: 'Page Layout & Visual Design',
    principle: 'Aesthetic & Minimalist Design',
    vimm: 'Visual',
    severity: 'Low',
    observation: [
      'Above-the-fold hero competes with three CTAs of equal weight.',
      'Excessive promotional banners push key tasks below the fold.',
      'Inconsistent spacing between content blocks.',
    ],
    recommendation: [
      'Establish one primary CTA and de-emphasize the rest.',
      'Move account-login and quick actions above the fold.',
      'Apply an 8px spacing scale across all sections.',
    ],
  },
]

// Quick overall-summary scorecard (used on the Overall Summary view)
export const overallSummary = {
  score: 78,
  grade: 'B+',
  totalObservations: 23,
  bySeverity: { High: 4, Medium: 11, Low: 8 },
  byCategory: [
    { label: 'Home Page Effectiveness', score: 82 },
    { label: 'Navigation & IA', score: 74 },
    { label: 'Search', score: 69 },
    { label: 'Page Layout & Visual Design', score: 80 },
    { label: 'Writing & Content Quality', score: 85 },
  ],
}

// Category scores broken down per top user flow (NOTE: backend aggregate endpoint
// for this does not exist yet — populated from mock data until a real
// "overall summary" API is built; see Section 2 spec, "need to develop").
export const userFlows = [
  {
    id: 'flow-home-loan',
    name: 'Home Loan & Mortgage',
    categories: [
      { label: 'Home Page Effectiveness', score: 80 },
      { label: 'Search', score: 65 },
      { label: 'Navigation & IA', score: 72 },
      { label: 'Page Layout & Visual Design', score: 78 },
    ],
  },
  {
    id: 'flow-account-login',
    name: 'Account Login',
    categories: [
      { label: 'Home Page Effectiveness', score: 88 },
      { label: 'Search', score: 74 },
      { label: 'Navigation & IA', score: 79 },
      { label: 'Page Layout & Visual Design', score: 83 },
    ],
  },
  {
    id: 'flow-personal-banking',
    name: 'Personal Banking',
    categories: [
      { label: 'Home Page Effectiveness', score: 84 },
      { label: 'Search', score: 70 },
      { label: 'Navigation & IA', score: 76 },
      { label: 'Page Layout & Visual Design', score: 81 },
    ],
  },
]

// ---------------------------------------------------------------------------
// ATTENTION INSIGHT (heat maps)
// ---------------------------------------------------------------------------
export const attentionScores = {
  clarity: 50, // % improvement required (headline metric)
  scales: [
    { label: 'Text readability', value: 90 },
    { label: 'Focus', value: 100 },
    { label: 'Spacing', value: 11 },
    { label: 'Image clarity', value: 9 },
    { label: 'Accessibility', value: 100 },
    { label: 'Contrast', value: 11 },
  ],
  metrics: [
    {
      id: 'ia',
      label: 'Information Architecture',
      value: 62,
      status: 'Improvement required',
      note: 'Primary content competes with promotional banners for first fixation.',
    },
    {
      id: 'cta',
      label: 'Clear and Engaging CTAs',
      value: 48,
      status: 'Needs attention',
      note: 'The “Open account” CTA receives only 12% of early attention.',
    },
    {
      id: 'nav',
      label: 'Intuitive Navigation',
      value: 81,
      status: 'Good',
      note: 'Top navigation draws steady attention and supports wayfinding.',
    },
  ],
}

// Heatmap "hot spots" rendered as radial gradients over the mock page.
// x / y / r are percentages of the preview box; intensity drives colour.
export const heatSpots = [
  { x: 30, y: 26, r: 16, intensity: 1.0 },
  { x: 52, y: 30, r: 13, intensity: 0.85 },
  { x: 70, y: 24, r: 10, intensity: 0.6 },
  { x: 40, y: 52, r: 14, intensity: 0.9 },
  { x: 24, y: 64, r: 9, intensity: 0.5 },
  { x: 66, y: 60, r: 11, intensity: 0.7 },
  { x: 50, y: 78, r: 8, intensity: 0.4 },
]

// ---------------------------------------------------------------------------
// ACCESSIBILITY
// ---------------------------------------------------------------------------
export const accessibility = {
  score: 99.87,
  pagesScanned: 10,
  checks: [
    { id: 'color', label: 'Color', score: 98, status: 'pass' },
    { id: 'contrast', label: 'Color Contrast', score: 94, status: 'pass' },
    { id: 'keyboard', label: 'Keyboard', score: 100, status: 'pass' },
    { id: 'screen-reader', label: 'Screen Reader', score: 91, status: 'pass' },
    { id: 'text-resize', label: 'Text Resizing', score: 100, status: 'pass' },
    { id: 'interactions', label: 'Content Interactions', score: 88, status: 'warn' },
  ],
  pageName: 'Personal Banking — Landing',
  comments: [
    {
      id: 'a1',
      level: 'AA',
      severity: 'Minor',
      text: 'Decorative hero image is missing an empty alt attribute; add alt="" so screen readers skip it.',
    },
    {
      id: 'a2',
      level: 'AA',
      severity: 'Moderate',
      text: 'Secondary CTA text "#0B5FFF on #E8F0FE" has a 3.9:1 contrast ratio — below the 4.5:1 minimum.',
    },
    {
      id: 'a3',
      level: 'A',
      severity: 'Minor',
      text: 'Form inputs in the login card rely on placeholder text instead of persistent <label> elements.',
    },
    {
      id: 'a4',
      level: 'AAA',
      severity: 'Enhancement',
      text: 'Focus outline could be increased to 2px for better visibility on the dark footer.',
    },
  ],
}

// ---------------------------------------------------------------------------
// COMPETITOR ANALYSIS
// ---------------------------------------------------------------------------
export const competitors = [
  { id: 'c1', name: 'Competitor 1' },
  { id: 'c2', name: 'Competitor 2' },
  { id: 'c3', name: 'Competitor 3' },
]

export const competitorBrands = [
  { id: 'usbank', name: 'US Bank', accent: '#d6122e', self: true },
  { id: 'chase', name: 'Chase', accent: '#117aca' },
  { id: 'boa', name: 'Bank of America', accent: '#e11900' },
  { id: 'wells', name: 'Wells Fargo', accent: '#c9a227' },
]

export const competitorFeatures = [
  { id: 'f1', label: 'Online Account Opening', values: [true, true, true, true] },
  { id: 'f2', label: 'Mobile Check Deposit', values: [true, true, false, true] },
  { id: 'f3', label: 'Live Chat Support', values: [false, true, true, true] },
  { id: 'f4', label: 'Personalized Dashboard', values: [true, false, true, false] },
  { id: 'f5', label: 'Mortgage Pre-Approval', values: [true, true, true, true] },
  { id: 'f6', label: 'Biometric Login', values: [true, true, false, true] },
  { id: 'f7', label: 'Accessibility Statement', values: [false, true, true, false] },
]
