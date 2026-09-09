export const chains = [
  {
    id: 'thyroid-cascade',
    title: 'Thyroid → Fatigue → Hair Loss → Brain Fog',
    shortTitle: 'Thyroid Cascade',
    matchPercent: 83,
    costToConfirm: '₹1,400',
    timeToRelief: '6–8 weeks',
    specialist: 'Endocrinologist',
    testsThisWeek: 'TSH, Free T3, Free T4, Anti-TPO',
    validatedBy: '3 endocrinologists',
    resolvedCases: 27,
    status: 'high-match',
    systems: ['Thyroid', 'Metabolic', 'Dermatology', 'Neurology'],
    steps: [
      {
        num: 1,
        step: 'Autoimmune attack / underperformance lowers T3/T4 output',
        system: 'Thyroid gland',
        ifUntreated: 'Progressive gland destruction',
      },
      {
        num: 2,
        step: 'Lower T3 slows metabolic rate across all tissues',
        system: 'Whole body',
        ifUntreated: 'Weight gain, cold intolerance worsens',
      },
      {
        num: 3,
        step: 'Hair follicles metabolically demanding → growth phase shortens',
        system: 'Hair follicle cycle',
        ifUntreated: 'Permanent follicle miniaturisation',
      },
      {
        num: 4,
        step: 'Slower ciliary beat in airway → thicker, slower-clearing mucus',
        system: 'Airway lining',
        ifUntreated: 'Chronic sinusitis, repeat infections',
      },
      {
        num: 5,
        step: 'Slower hepatic clearance → AST:ALT ratio rises (seen in labs as 2.56)',
        system: 'Liver kinetics',
        ifUntreated: 'Lipid & metabolic disorders',
      },
      {
        num: 6,
        step: 'Chronic deficit → HPA axis compensation',
        system: 'Adrenal / stress axis',
        ifUntreated: 'Cortisol dysregulation, anxiety',
      },
      {
        num: 7,
        step: 'Cellular energy deficit reaches brain',
        system: 'Cognition / memory',
        ifUntreated: 'Long-term cognitive impairment',
      },
    ],
    citations: [
      { id: 'c1', title: 'The clinical presentation of hypothyroidism', journal: 'Endocrine Reviews', year: 2021, link: 'https://pubmed.ncbi.nlm.nih.gov/34510444/' },
      { id: 'c2', title: 'Thyroid hormones and the central nervous system', journal: 'Nature Reviews Endocrinology', year: 2017, link: 'https://pubmed.ncbi.nlm.nih.gov/28555663/' }
    ]
  },
  {
    id: 'pericoronitis-cascade',
    title: 'Pericoronitis → Mucus → Ear Fullness → Brain Fog',
    shortTitle: 'Pericoronitis Cascade',
    matchPercent: 71,
    costToConfirm: '₹2,800',
    timeToRelief: '8–12 weeks',
    specialist: 'Oral Surgeon + ENT',
    testsThisWeek: 'OPG X-Ray, ENT evaluation, hsCRP',
    validatedBy: '2 oral surgeons',
    resolvedCases: 14,
    status: 'active',
    systems: ['Dental', 'ENT', 'Gastro', 'Neurology'],
    steps: [
      {
        num: 1,
        step: 'Pericoronitis — lower right wisdom tooth, partially erupted',
        system: 'Dental / Oral',
        ifUntreated: 'Chronic bacterial seeding into bloodstream',
      },
      {
        num: 2,
        step: 'Thick mucus blocks sinus ostia + compresses Eustachian tube',
        system: 'Sinus / ENT',
        ifUntreated: 'Chronic sinusitis, hearing issues',
      },
      {
        num: 3,
        step: 'LPR acid deposits in upper throat',
        system: 'Gastro / Throat',
        ifUntreated: 'Self-sustaining mucus + burning loop',
      },
      {
        num: 4,
        step: 'Congestion → mouth breathing → poor sleep',
        system: 'Respiratory / Sleep',
        ifUntreated: 'Chronic sleep deprivation',
      },
      {
        num: 5,
        step: 'Systemic inflammation crosses blood-brain barrier',
        system: 'Immune / Neuro',
        ifUntreated: 'Neuroinflammation, cognitive decline',
      },
      {
        num: 6,
        step: 'Ear fullness disrupts vestibular input + HPA dysregulation',
        system: 'Vestibular / HPA',
        ifUntreated: 'Dizziness + anxiety loop',
      },
    ],
  },
  {
    id: 'ent-allergy-brainfog',
    title: 'ENT Allergy → Sinus → Fatigue → Brain Fog',
    shortTitle: 'ENT-Allergy Chain',
    matchPercent: 56,
    costToConfirm: '₹1,800',
    timeToRelief: '4–6 weeks',
    specialist: 'ENT Allergist',
    testsThisWeek: 'Skin prick test, Total IgE, Specific IgE panel',
    validatedBy: '2 allergists',
    resolvedCases: 31,
    status: 'exploring',
    systems: ['ENT', 'Allergy', 'Neurology'],
    steps: [
      {
        num: 1,
        step: 'Allergen triggers IgE-mediated mast cell degranulation in nasal mucosa',
        system: 'Nasal / Immune',
        ifUntreated: 'Chronic allergic rhinitis',
      },
      {
        num: 2,
        step: 'Persistent mucosal swelling blocks sinus drainage',
        system: 'Sinus',
        ifUntreated: 'Recurrent sinusitis',
      },
      {
        num: 3,
        step: 'Chronic congestion → poor sleep quality + mouth breathing',
        system: 'Sleep / Respiratory',
        ifUntreated: 'Chronic fatigue',
      },
      {
        num: 4,
        step: 'Inflammatory cytokines + hypoxia affect prefrontal cortex',
        system: 'Neurology',
        ifUntreated: 'Persistent brain fog',
      },
    ],
  },
  {
    id: 'ebv-chronic-fatigue',
    title: 'EBV Reactivation → Chronic Fatigue → Immune Dysfunction',
    shortTitle: 'EBV-Fatigue Chain',
    matchPercent: 45,
    costToConfirm: '₹3,500',
    timeToRelief: '12–24 weeks',
    specialist: 'Immunologist',
    testsThisWeek: 'EBV VCA IgM, EBV VCA IgG, EBV EBNA IgG, EBV EA-D IgG',
    validatedBy: '1 immunologist',
    resolvedCases: 8,
    status: 'investigating',
    systems: ['Immune', 'Hematology', 'Neurology'],
    steps: [
      {
        num: 1,
        step: 'EBV reactivation from latency in B-lymphocytes',
        system: 'Immune / Viral',
        ifUntreated: 'Chronic viral load',
      },
      {
        num: 2,
        step: 'Persistent lymphocyte elevation and immune activation',
        system: 'Hematology',
        ifUntreated: 'Immune exhaustion',
      },
      {
        num: 3,
        step: 'Cytokine storm causing systemic fatigue',
        system: 'Systemic',
        ifUntreated: 'CFS/ME development',
      },
      {
        num: 7,
        step: 'Autonomic nervous system locked in fight-or-flight',
        system: 'Nervous / Autonomic',
        ifUntreated: 'Long-term cognitive impairment / severe brain fog',
      },
    ],
    citations: [
      { id: 'c3', title: 'Systemic inflammation and cognitive decline', journal: 'Journal of Neuroinflammation', year: 2020, link: 'https://pubmed.ncbi.nlm.nih.gov/32334586/' },
      { id: 'c4', title: 'Oral health and systemic disease: a review of the evidence', journal: 'The Journal of Clinical Dentistry', year: 2018, link: 'https://pubmed.ncbi.nlm.nih.gov/29323812/' }
    ]
  },
  {
    id: 'lpr-mucus-anxiety',
    title: 'LPR → Chronic Mucus → Vagus → Anxiety',
    shortTitle: 'LPR-Anxiety Chain',
    matchPercent: 38,
    costToConfirm: '₹2,200',
    timeToRelief: '6–10 weeks',
    specialist: 'Gastroenterologist',
    testsThisWeek: 'Pepsin test, pH monitoring, H.Pylori breath test',
    validatedBy: '2 gastroenterologists',
    resolvedCases: 19,
    status: 'exploring',
    systems: ['Gastro', 'ENT', 'Neurology'],
    steps: [
      {
        num: 1,
        step: 'Laryngopharyngeal reflux deposits pepsin in upper throat',
        system: 'Gastro / Throat',
        ifUntreated: 'Chronic throat irritation',
      },
      {
        num: 2,
        step: 'Mucus production increases as defensive response',
        system: 'ENT',
        ifUntreated: 'Post-nasal drip, voice changes',
      },
      {
        num: 3,
        step: 'Acid irritates vagus nerve through esophageal wall',
        system: 'Vagus / Autonomic',
        ifUntreated: 'Heart palpitations, nausea',
      },
      {
        num: 4,
        step: 'Vagal dysfunction triggers anxiety and panic-like symptoms',
        system: 'Neurology / Psych',
        ifUntreated: 'Chronic anxiety disorder misdiagnosis',
      },
    ],
  },
];

export const labResults = [];

export const odysseyPhases = [];

export const caseTimeline = [];

export const patientProfile = {
  name: 'Patient',
  age: null,
  gender: '',
  bloodGroup: '',
  journeyStart: '',
  journeyDuration: '',
  chainsMatched: 0,
  testsDone: 0,
  testsPending: 0,
  doctorsVisited: 0,
  currentPhase: 1,
  completionPercent: 0,
};
