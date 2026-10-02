export const SYMPTOM_PRESETS = [
  {
    label: '⚡ Chronic Fatigue',
    symptom: 'Unexplained chronic fatigue, unrefreshing sleep, and low afternoon energy',
    specialist: 'endo',
  },
  {
    label: '🤕 Daily Headache',
    symptom: 'Chronic daily throbbing headaches with light sensitivity and neck tightness',
    specialist: 'neuro',
  },
  {
    label: '🫀 Palpitations',
    symptom: 'Sudden resting heart racing, post-meal palpitations, and postural dizziness',
    specialist: 'cardio',
  },
  {
    label: '🧬 Brain Fog',
    symptom: 'Memory lapses, word-finding difficulty, and cognitive sluggishness after exertion',
    specialist: 'neuro',
  },
  {
    label: '🩺 Gut & Bloating',
    symptom: 'Chronic post-meal bloating, food sensitivities, and alternating bowel habits',
    specialist: 'gastro',
  },
  {
    label: '➕ Other Complex Cases',
    symptom: 'Complex overlapping multi-system symptoms across multiple organs',
    specialist: 'gp',
  },
];

export const CONSENSUS_DIALOGUE = [
  {
    role: 'Cardiologist',
    icon: '🩺',
    color: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.15)',
    finding: 'Resting tachycardia noted despite normal ECG.',
  },
  {
    role: 'Neurologist',
    icon: '🧠',
    color: '#A78BFA',
    bg: 'rgba(139, 92, 246, 0.15)',
    finding: 'Postural timing may be useful to document clearly.',
  },
  {
    role: 'Endocrinologist',
    icon: '🔬',
    color: '#60A5FA',
    bg: 'rgba(59, 130, 246, 0.15)',
    finding: 'Bring the dated iron results and printed ranges to the visit.',
  },
];

export const BENTO_COL_LEFT = [
  {
    id: 'bento_left_1',
    type: 'img',
    img: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
    tag: '📖 Patient Guide',
    status: 'GUIDE',
    title: 'What is HealthChain and How Can It Improve Doctor Visits?',
    desc: 'Managing health records made simple. HealthChain provides a clear, unified timeline so you never repeat the story.',
  },
  {
    id: 'bento_left_2',
    type: 'img',
    img: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=80',
    tag: '🗂️ Record Overview',
    status: 'OVERVIEW',
    title: "HealthChain's Integrated Approach to Patient Data Management",
    desc: 'Explore how HealthChain centralizes a patient health story, records, observations, and cross-system questions for review.',
  },
  {
    id: 'bento_left_3',
    type: 'img',
    img: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=800&q=80',
    tag: '🧬 Biomarker Analysis',
    status: 'LAB',
    title: 'When a Report Is Hard to Interpret, Keep the Source Visible',
    desc: 'Extracts printed values, units, dates, and laboratory ranges so you can review changes and questions without losing the original context.',
  },
];

export const BENTO_COL_RIGHT = [
  {
    id: 'bento_right_1',
    type: 'img',
    img: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=800&q=80',
    tag: '📋 Appointment Preparation',
    status: 'WORKFLOW',
    title: 'How HealthChain Helps Bridge Communication Gaps with Clinicians',
    desc: 'Prepare for appointments with an organized summary, evidence gaps, and key discussion questions.',
  },
  {
    id: 'bento_right_2',
    type: 'privacy',
    tag: '🛡️ Private Workspace',
    status: 'USER CONTROLLED',
    title: 'Data Control & Privacy',
    desc: 'Guest drafts remain on device. Signed-in data is stored in the account workspace, and AI processing is disclosed before record review.',
  },
  {
    id: 'bento_right_3',
    type: 'img',
    img: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=800&q=80',
    tag: '🔬 Clinical Trials',
    status: 'SOURCE LINKS',
    title: 'Search Active Trials and Recent Literature',
    desc: 'Uses chosen case topics to retrieve current registry studies and recent papers, with source links and transparent relevance cues.',
  },
];

export const SPECIALIST_TICKER = [
  { name: 'Cardiology', icon: '🫀', tag: 'Arrhythmia & POTS' },
  { name: 'Neurology', icon: '🧠', tag: 'Migraine & Vagus Tone' },
  { name: 'Endocrinology', icon: '🔬', tag: 'Thyroid & Adrenals' },
  { name: 'Immunology', icon: '🧬', tag: 'Autoimmune & MCAS' },
  { name: 'Gastroenterology', icon: '🧪', tag: 'Gut-Brain Axis & SIBO' },
  { name: 'Rheumatology', icon: '🦴', tag: 'Connective Tissue' },
  { name: 'Pulmonology', icon: '🫁', tag: 'Dyspnea & Airway' },
  { name: 'Hematology', icon: '🩸', tag: 'Ferritin & Clotting' },
  { name: 'Nephrology', icon: '⚕️', tag: 'Electrolytes & Renal' },
  { name: 'Infectious Disease', icon: '🦠', tag: 'Post-Viral Fatigue' },
  { name: 'Pharmacology', icon: '💊', tag: 'Drug-Nutrient Interplay' },
  { name: 'Functional Medicine', icon: '🥗', tag: 'Mitochondrial Health' },
];

export const LATEST_ACTIVITIES = [
  {
    icon: '🧪',
    text: 'Organize a dated iron panel and symptom timeline',
    time: 'Example',
    specId: 'endo',
    symptom: 'Iron panel and ferritin check',
  },
  {
    icon: '🧠',
    text: 'Prepare questions about orthostatic symptoms',
    time: 'Example',
    specId: 'neuro',
    symptom: 'POTS tilt and autonomic correlation',
  },
  {
    icon: '🔬',
    text: 'Extract thyroid values with units and ranges',
    time: 'Example',
    specId: 'endo',
    symptom: 'Thyroid panel Free T3/T4 analysis',
  },
  {
    icon: '🩺',
    text: 'Build a food and symptom observation log',
    time: 'Example',
    specId: 'gastro',
    symptom: 'Food and symptom observations',
  },
  {
    icon: '🫀',
    text: 'Summarize ECG and Holter record findings',
    time: 'Example',
    specId: 'cardio',
    symptom: 'Holter monitor and resting ECG',
  },
];

export const landingFaqs = [
  {
    question: 'Is HealthChain360.ai a replacement for my doctor?',
    answer:
      'No. HealthChain360.ai is an AI-assisted record-organization and appointment-preparation tool. It helps you organize your history, spot questions and evidence gaps to discuss, and prepare for clinician visits. It does not diagnose, prescribe, or replace professional medical care.',
  },
  {
    question: 'How is my medical data secured?',
    answer:
      'You control your case information. Guest-mode information stays in your browser on that device; signed-in features use your private account workspace over encrypted connections. AI features explain when selected information is sent for processing. We never sell your medical records.',
  },
  {
    question: 'How do the Deep Collaborative Specialists work?',
    answer:
      'The Deep Collaborative Specialists feature coordinates AI perspective modules (such as cardiology, neurology, endocrinology, and immunology) to organize your information, surface evidence gaps, and prepare prioritized discussion points for a qualified clinician.',
  },
  {
    question: 'Are the AI agents trained on real medical literature?',
    answer:
      'HealthChain can retrieve literature and registry records from sources such as Europe PMC and ClinicalTrials.gov. A source link supports only the statement it is attached to; AI summaries can still be incomplete or wrong and should be checked with the original source and a qualified clinician.',
  },
];
