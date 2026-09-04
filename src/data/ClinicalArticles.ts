export interface MedicalArticle {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  role: string;
  readTime: string;
  img: string;
  category: 'Brain & Mind' | 'Cardiometabolic' | 'Sleep & Circadian' | 'Gut Health' | 'Longevity';
  categoryLabel?: string;
  tags?: string[];
  keyTakeaways: string[];
  sections: { heading: string; body: string }[];
}

export const CLINICAL_ARTICLES: MedicalArticle[] = [
  {
    id: 'art-gut-microbiome-axis',
    title: 'The Gut-Brain Axis — Short-Chain Fatty Acids, Serotonin & Microbial Diversity',
    subtitle: 'How Akkermansia Muciniphila & Butyrate Dictate Neuroinflammation and Mood',
    author: 'Dr. Priya Nair, MD, FACG',
    role: 'Gastroenterologist & Microbiome Clinical Investigator',
    readTime: '6 min read',
    img: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80',
    category: 'Gut Health',
    categoryLabel: 'Gastroenterology',
    tags: ['Akkermansia', 'Short-Chain Fatty Acids', 'Serotonin', 'Intestinal Permeability'],
    keyTakeaways: [
      'Over 90% of the body’s serotonin is synthesized by enterochromaffin cells in the gastrointestinal mucosa under microbial regulation.',
      'Butyrate fuels colonocytes, upregulates tight junction claudin proteins, and prevents systemic lipopolysaccharide (LPS) endotoxemia.',
      'Consuming 30 or more distinct plant species each week doubles microbial diversity compared to consuming fewer than 10.'
    ],
    sections: [
      {
        heading: '1. The Vagal Superhighway: Direct Gut-to-Brain Signaling',
        body: 'The enteric nervous system communicates bidirectionally with the central nervous system through 100,000 nerve fibers of the vagus nerve. Bacterial metabolites, including short-chain fatty acids (acetate, propionate, and butyrate), interact with mucosal receptors to modulate neurochemical production, influencing emotional valence, stress tolerance, and cognitive clarity.'
      },
      {
        heading: '2. The Epithelial Mucosal Shield & Akkermansia',
        body: 'A single layer of intestinal epithelial cells separates trillions of gut microbes from systemic circulation. Keystones species like Akkermansia muciniphila graze on the outer mucus layer, stimulating goblet cells to continuously replenish fresh mucin. When microbial starvation occurs due to ultra-processed low-fiber diets, bacteria consume the protective mucus lining, precipitating systemic micro-inflammation.'
      },
      {
        heading: '3. Clinical Dietary Diversity Protocol',
        body: 'Maximize microbiome resilience not through excessive probiotic pills, but through fermentable dietary prebiotics: inulin (garlic, leeks, onions), resistant starch (cooled legumes, cooked and cooled potatoes), and polyphenols (berries, green tea, cocoa). Target 30 unique botanical plants weekly across vegetables, herbs, seeds, and whole legumes.'
      }
    ]
  },
  {
    id: 'art-overthinking',
    title: 'Overcome Overthinking — 10 Evidence-Based Strategies',
    subtitle: 'Clinical Cognitive Restructuring & Somatic Vagal Regulation',
    author: 'Dr. Sarah Jenkins, MD',
    role: 'Board-Certified Neuropsychiatrist & Sleep Specialist',
    readTime: '4 min read',
    img: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&q=80',
    category: 'Brain & Mind',
    categoryLabel: 'Cognitive Health',
    tags: ['Neuroplasticity', 'Default Mode Network', 'Vagal Tone', 'Cortisol'],
    keyTakeaways: [
      'Rumination activates the Default Mode Network (DMN), suppressing executive prefrontal cortex focus.',
      'The 5-4-3-2-1 Sensory Grounding protocol resets acute sympathetic nervous overdrive in under 90 seconds.',
      'Scheduling a designated 20-minute daily "Worry Window" reduces nocturnal cognitive intrusion by 47%.'
    ],
    sections: [
      {
        heading: '1. The Neurobiology of the Overthinking Loop',
        body: 'Overthinking is not a character flaw—it is an evolutionary threat-simulation reflex run amok. When the amygdala senses ambiguity, it triggers the brain’s Default Mode Network (DMN) to repetitively project worst-case scenarios. Without conscious somatic intervention, elevated cortisol and norepinephrine sustain an autonomic feedback loop that impairs sleep latency, increases peripheral muscle tension, and diminishes immune resilience.'
      },
      {
        heading: '2. Somatic Interrupt: The Physiological Vagal Reset',
        body: 'When you notice circular ruminative thoughts, cognitive rationalizing rarely works because blood perfusion has shifted away from Broca’s verbal region. Instead, perform a double nasal inhale followed by an elongated, unforced oral exhale (the physiological sigh). This activates aortic baroreceptor firing, lowers heart rate within three cycles, and restores prefrontal cortical blood perfusion.'
      },
      {
        heading: '3. Cognitive Defusion & The Worry Window',
        body: 'Designate a strict 20-minute window at 4:30 PM each day. When intrusive anxieties surface during work or rest, mentally file them: "I will thoroughly analyze this at 4:30 PM." Clinical trials demonstrate that over 82% of perceived crises dissolve before the scheduled window arrives, preventing emotional escalation.'
      }
    ]
  },
  {
    id: 'art-metabolic-biomarkers',
    title: 'Understanding Your Metabolic Biomarkers — ApoB, Insulin Sensitivity & Glycemic Variability',
    subtitle: 'ApoB Particle Count, Triglyceride-to-HDL Ratio & Endothelial Protection',
    author: 'Dr. Elizabeth Chen, MD, FACC',
    role: 'Board-Certified Preventative Cardiologist & Longevity Researcher',
    readTime: '5 min read',
    img: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&q=80',
    category: 'Cardiometabolic',
    categoryLabel: 'Preventative Cardiology',
    tags: ['ApoB', 'Insulin Resistance', 'Endothelial Health', 'CGM'],
    keyTakeaways: [
      'Apolipoprotein B (ApoB) directly quantifies all circulating atherogenic particles and predicts vascular events far better than standard LDL-C.',
      'A fasting Triglyceride-to-HDL ratio below 1.5 is a reliable clinical surrogate for robust peripheral insulin sensitivity.',
      'Postprandial glycemic variability creates repetitive microvascular endothelial shear stress and oxidative damage.'
    ],
    sections: [
      {
        heading: '1. Why ApoB Outperforms Standard LDL-C',
        body: 'Standard lipid panels calculate LDL-C based on cholesterol concentration, not the actual particle density. Because each atherogenic lipoprotein (LDL, VLDL, IDL) carries exactly one molecule of ApoB, measuring serum ApoB provides an exact particle count. In discordance states such as metabolic syndrome, LDL-C can appear deceptively normal while circulating ApoB remains dangerously elevated.'
      },
      {
        heading: '2. Insulin Sensitivity & The TG/HDL Ratio',
        body: 'Years before fasting blood glucose or HbA1c elevate into prediabetic thresholds, hepatic insulin resistance manifests as elevated fasting triglycerides coupled with reduced HDL particles. A serum Triglyceride-to-HDL ratio less than 1.5 indicates preserved cellular insulin sensitivity, whereas values exceeding 3.0 strongly correlate with subclinical hyperinsulinemia.'
      },
      {
        heading: '3. Glycemic Variability & Endothelial Protection',
        body: 'Continuous glucose monitoring demonstrates that rapid glucose excursions and subsequent steep plunges generate significantly higher reactive oxygen species (ROS) than steady, moderate glucose levels. Minimizing postprandial glycemic amplitude through dietary fiber preloading, whole-food macronutrient pairing, and light post-meal ambulation directly preserves vascular endothelial nitric oxide synthesis.'
      }
    ]
  },
  {
    id: 'art-circadian-sleep-architecture',
    title: 'Mastering Sleep Architecture — Slow-Wave Delta Recovery & REM Consolidation',
    subtitle: 'Adenosine Pressure, Melatonin Meltdowns & The Glymphatic Brain Wash',
    author: 'Dr. Matthew Walker-Vance, PhD',
    role: 'Professor of Neurobiology & Chronobiology Research Lead',
    readTime: '5 min read',
    img: 'https://images.unsplash.com/photo-1511295742362-92c96b124e52?w=800&q=80',
    category: 'Sleep & Circadian',
    categoryLabel: 'Sleep Neuroscience',
    tags: ['Slow-Wave Sleep', 'Glymphatic Clearance', 'Adenosine', 'Melatonin'],
    keyTakeaways: [
      'Glymphatic waste clearance peaks during Stage 3/4 Delta slow-wave sleep, washing beta-amyloid and hyperphosphorylated tau proteins.',
      'Caffeine has an average half-life of 5 to 7 hours, blocking adenosine receptors and truncating restorative deep sleep even when you fall asleep easily.',
      'A core body temperature reduction of approximately 1°C (2°F) is an obligatory physiological requirement for rapid sleep latency.'
    ],
    sections: [
      {
        heading: '1. The Glymphatic System: Nightly Neurotoxin Flushes',
        body: 'During slow-wave non-REM sleep, astrocytic channels in the brain dilate by up to 60%, allowing cerebrospinal fluid to surge through interstitial spaces. This biological sanitation cycle flushes metabolic neurotoxins accumulated during wakefulness, including beta-amyloid peptides. Fragmented deep sleep directly attenuates this clearance mechanism.'
      },
      {
        heading: '2. Adenosine Pressure vs. Caffeine Receptor Antagonism',
        body: 'From the moment you wake, cellular ATP breakdown accumulates adenosine in the basal forebrain, creating healthy homeostatic "sleep pressure." Caffeine competitively binds to adenosine A1 and A2A receptors without activating them. While this blunts perceived fatigue, adenosine continues to build invisibly behind the chemical dam, producing an acute crash once caffeine metabolizes.'
      },
      {
        heading: '3. Thermal & Photobiological Sleep Priming',
        body: 'To trigger endogenous melatonin synthesis and vasodilation, ambient room temperatures should be kept between 18°C and 20°C (65–68°F). Taking a warm bath or shower 90 minutes before bedtime draws blood to the skin’s surface; when you exit, rapid peripheral heat dissipation accelerates the core temperature plunge needed for deep slow-wave entry.'
      }
    ]
  },
  {
    id: 'art-autonomic-vagal-tone',
    title: 'Measuring Autonomic Resilience — Heart Rate Variability (HRV) as a Biomarker',
    subtitle: 'RMSSD Interpretation, Sympathetic Overdrive & Vagus Nerve Stimulation',
    author: 'Dr. Julian Thorne, MD, PhD',
    role: 'Autonomic Neurophysiologist & Critical Care Attending',
    readTime: '4 min read',
    img: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
    category: 'Brain & Mind',
    categoryLabel: 'Autonomic Neurology',
    tags: ['Heart Rate Variability', 'Vagus Nerve', 'RMSSD', 'Sympathetic Balance'],
    keyTakeaways: [
      'Root Mean Square of Successive Differences (RMSSD) reflects parasympathetic vagal brake power on the cardiac sinoatrial node.',
      'Acute drops in your 7-day rolling baseline HRV correlate with subclinical infection or systemic overload 24–48 hours before physical symptoms manifest.',
      'Resonance frequency breathing at approximately 5.5 to 6 breaths per minute maximizes baroreflex sensitivity and cardiac coherence.'
    ],
    sections: [
      {
        heading: '1. Decoding HRV: Beyond Resting Pulse',
        body: 'A healthy heart does not tick like a mechanical metronome. Subtle beat-to-beat millisecond variations demonstrate an adaptable, responsive autonomic nervous system. High HRV indicates that your parasympathetic vagal brake can quickly decelerate the heart during stress, whereas low baseline variability reflects chronic sympathetic dominance.'
      },
      {
        heading: '2. The Early Warning System for Autonomic Strain',
        body: 'Rather than obsessing over raw daily numbers, track your 7-day rolling average. When your waking HRV drops more than 1.5 standard deviations below baseline for two consecutive mornings, your autonomic system is allocating metabolic resources to physiological repair or an incipient immune challenge. Pacing workload during these dips accelerates systemic recovery.'
      },
      {
        heading: '3. Daily Vagal Conditioning Protocol',
        body: 'To strengthen vagal tone, practice 5 minutes of coherent resonance breathing twice daily: inhale smoothly through your nose for 4 seconds, exhale smoothly through unpursed lips for 6 seconds. This 10-second respiratory cycle synchronizes respiratory sinus arrhythmia with blood pressure oscillations, instantly stabilizing autonomic tone.'
      }
    ]
  },
  {
    id: 'art-cellular-autophagy-fasting',
    title: 'Cellular Autophagy & Longevity — The Science of Organelle Clearance',
    subtitle: 'AMPK Activation, mTOR Modulation & Sirtuin Mitochondrial Biogenesis',
    author: 'Dr. David Sinclair-Rhodes, PhD',
    role: 'Director of Cellular Senescence & Longevity Biology',
    readTime: '6 min read',
    img: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=800&q=80',
    category: 'Longevity',
    categoryLabel: 'Geroscience',
    tags: ['Autophagy', 'mTOR', 'AMPK', 'Mitophagy', 'Cellular Senescence'],
    keyTakeaways: [
      'Autophagy is the lysosomal degradation pathway that clears damaged organelles, misfolded protein aggregates, and intracellular pathogens.',
      'AMP-activated protein kinase (AMPK) serves as the master cellular fuel gauge, initiating catabolic recycling when energy reserves dip.',
      'Balancing periodic mTOR suppression with adequate leucine-triggered protein intake prevents sarcopenia while preserving autophagy.'
    ],
    sections: [
      {
        heading: '1. The Intracellular Sanitation Engine',
        body: 'Every cell accumulates damaged macromolecules and dysfunctional mitochondria (which leak damaging reactive oxygen species). Autophagy acts as an internal recycling facility: double-membraned autophagosomes encapsulate cellular debris and fuse with acidic lysosomes, breaking damaged components down into pristine amino acids and fatty acids for cellular repair.'
      },
      {
        heading: '2. Tuning the AMPK / mTOR Equilibrium',
        body: 'The mechanistic Target of Rapamycin (mTOR) promotes cellular growth and protein synthesis in the presence of amino acids and insulin, but completely silences autophagy. Conversely, cellular energetic depletion activates AMPK, which inhibits mTOR and phosphorylates ULK1 to trigger autophagy. Longevity is found not in permanent fasting, but in oscillatory cycling between growth and cellular cleanup.'
      },
      {
        heading: '3. Practical Circadian Nutrient Windows',
        body: 'You do not need extreme multi-day starvation to support autophagy. An evidence-based 12-to-14 hour overnight fasting window aligned with circadian rhythms (e.g. finishing dinner by 7:30 PM and eating breakfast at 9:00 AM) permits hepatic glycogen depletion and initiates mild lysosomal clearance without risking metabolic suppression or lean mass loss.'
      }
    ]
  },
  {
    id: 'art-hydration-electrolyte-dynamics',
    title: 'Beyond Plain Water — Cellular Hydration & Electrolyte Dynamics',
    subtitle: 'Sodium-Potassium ATPase Pumps, Intracellular Fluid & Osmotic Balance',
    author: 'Dr. Aris Thorne, MD, FASN',
    role: 'Board-Certified Nephrologist & Electrolyte Specialist',
    readTime: '4 min read',
    img: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=800&q=80',
    category: 'Cardiometabolic',
    categoryLabel: 'Nephrology & Fluids',
    tags: ['Electrolytes', 'Cellular Hydration', 'Sodium-Potassium Pump', 'Osmolality'],
    keyTakeaways: [
      'Drinking excessive plain demineralized water without minerals can dilute serum sodium, causing compensatory fluid retention and brain fog.',
      'The sodium-potassium ATPase pump consumes up to 30% of baseline cellular ATP to maintain resting membrane potential across all human cells.',
      'Targeting a dietary potassium-to-sodium ratio of approximately 2:1 significantly reduces arterial stiffness and supports endothelial health.'
    ],
    sections: [
      {
        heading: '1. The Myth of "Eight Glasses of Plain Water"',
        body: 'True hydration is not defined by how much water passes through your kidneys into urine; it is defined by intracellular water volume. If you consume large volumes of low-mineral water rapidly, your body downregulates antidiuretic hormone (ADH), flushing electrolytes and leaving cellular tissues parched despite frequent urination.'
      },
      {
        heading: '2. The Sodium-Potassium Osmotic Engine',
        body: 'Sodium is the primary extracellular cation, while potassium is the dominant intracellular cation. Every cell in your body relies on the sodium-potassium pump to generate the electrical gradient that powers nerve conduction, muscle contraction, and cellular nutrient transport. Deficiencies in either mineral disrupt fluid homeostasis.'
      },
      {
        heading: '3. Daily Hydration Architecture Protocol',
        body: 'Start your morning with 400–500ml of room-temperature water containing a small pinch of unrefined mineral salt and a squeeze of fresh lemon (potassium citrate). This restores plasma volume lost through overnight respiratory vapor without spiking blood pressure, establishing steady cellular hydration.'
      }
    ]
  },
  {
    id: 'art-mitochondrial-vitality',
    title: 'Mitochondrial Vitality — Fueling ATP Production & Reducing Cellular Senescence',
    subtitle: 'NAD+ Depletion, CoQ10 Electron Transport & Cold/Heat Hormesis',
    author: 'Dr. Henrik Lindqvist, MD, PhD',
    role: 'Mitochondrial Medicine Researcher & Functional Gerontologist',
    readTime: '5 min read',
    img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
    category: 'Longevity',
    categoryLabel: 'Mitochondrial Biology',
    tags: ['Mitochondria', 'ATP Synthesis', 'NAD+', 'CoQ10', 'Hormesis'],
    keyTakeaways: [
      'Mitochondria generate over 90% of cellular ATP but are also the primary producers and targets of reactive oxygen species.',
      'Intracellular NAD+ levels decline by up to 50% between ages 20 and 50, limiting sirtuin enzymatic activity and mitochondrial biogenesis.',
      'Controlled thermal hormesis (80°C sauna sessions and brief cold showers) activates PGC-1alpha, prompting cells to generate new mitochondria.'
    ],
    sections: [
      {
        heading: '1. The Electron Transport Chain & Metabolic Exhaustion',
        body: 'Inside the mitochondrial inner membrane, four protein complexes pass electrons to create a proton gradient that drives ATP synthase. When fuel supply exceeds cellular expenditure (as in chronic overnutrition), electron leakage increases, causing oxidative damage to mitochondrial DNA (which lacks protective histone proteins).'
      },
      {
        heading: '2. NAD+ Preservation & Coenzyme Q10 Synergy',
        body: 'Nicotinamide Adenine Dinucleotide (NAD+) is an indispensable coenzyme for complex I of the respiratory chain and the fuel for DNA repair enzymes (PARPs) and longevity sirtuins (SIRT1/SIRT3). Supporting the salvage pathway through dietary niacin-rich foods and preserving CoQ10 levels sustains electron flow and reduces mitochondrial fatigue.'
      },
      {
        heading: '3. Hormetic Stimuli for Mitochondrial Renewal',
        body: 'Mitochondria respond to transient, mild environmental stress by multiplying—a process called mitochondrial biogenesis driven by PGC-1alpha. Exposure to thermal variation (such as 15–20 minutes in a dry sauna or 60 seconds of cold water at the end of a shower) stimulates heat shock and cold shock proteins that clear damaged organelles and promote fresh mitochondrial growth.'
      }
    ]
  },
  {
    id: 'art-endocrinology-cortisol-rhythm',
    title: 'Restoring Your Cortisol Awakening Response (CAR) — Endocrine Balance',
    subtitle: 'Adrenal Dynamics, DHEA-to-Cortisol Ratios & Evening Melatonin Rhythms',
    author: 'Dr. Meera Patel, MD, FACE',
    role: 'Board-Certified Endocrinologist & Hormonal Health Specialist',
    readTime: '5 min read',
    img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
    category: 'Cardiometabolic',
    categoryLabel: 'Endocrinology',
    tags: ['Cortisol', 'Circadian Rhythms', 'Adrenal Axis', 'Melatonin'],
    keyTakeaways: [
      'Cortisol should surge 50–75% within 30–45 minutes of waking (CAR), providing daytime metabolic alertness and immune surveillance.',
      'A flattened diurnal cortisol curve—low in the morning, high at night—is clinically associated with chronic systemic inflammation and fatigue.',
      'Viewing morning natural sunlight within 60 minutes of waking sets the hypothalamic suprachiasmatic clock, timing evening melatonin onset.'
    ],
    sections: [
      {
        heading: '1. The Biology of the Cortisol Awakening Curve',
        body: 'Cortisol is frequently mischaracterized as merely a "stress hormone," but in healthy chronobiology, it is your master waking catalyst. The Cortisol Awakening Response (CAR) is a steep hormonal rise driven by the hypothalamic-pituitary-adrenal (HPA) axis that liberates glucose for brain activity, enhances cognitive sharpness, and coordinates the daily immune rhythm.'
      },
      {
        heading: '2. The Danger of the "Wired But Tired" Evening Spike',
        body: 'When chronic psychological stress or excessive blue light exposure delays cortisol clearance, evening levels remain elevated. High cortisol actively suppresses pineal melatonin secretion, producing the familiar sensation of exhaustion combined with an inability to drift off to sleep, fragmenting subsequent sleep architecture.'
      },
      {
        heading: '3. 3-Step Protocol for Circadian Hormonal Harmony',
        body: 'First, step outside into natural daylight for 10–15 minutes within an hour of rising (even on cloudy days, outdoor lux ranges from 5,000 to 20,000 lux). Second, avoid caffeine for the first 60 minutes post-waking to allow natural adenosine clearance. Third, dim overhead artificial lighting 2 hours prior to bed to permit natural melatonin synthesis.'
      }
    ]
  },
  {
    id: 'art-pharmacological-literacy',
    title: 'Pharmacological Literacy — How to Evaluate Drug Interactions & Lab Ranges',
    subtitle: 'Cytochrome P450 Enzymes, Half-Lives & Interpreting "Normal" vs. "Optimal"',
    author: 'Dr. Alan Vance, PharmD, BCPS',
    role: 'Clinical Pharmacologist & Precision Therapeutics Director',
    readTime: '5 min read',
    img: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80',
    category: 'Gut Health',
    categoryLabel: 'Precision Therapeutics',
    tags: ['Pharmacology', 'CYP450', 'Drug Interactions', 'Biomarkers', 'Therapeutics'],
    keyTakeaways: [
      'The hepatic CYP3A4 and CYP2D6 enzyme pathways metabolize over 60% of common medications and can be influenced by common dietary compounds.',
      'Standard diagnostic reference ranges represent statistical averages of a general testing population rather than proactive longevity targets.',
      'Medication administration timing relative to food intake can alter pharmacokinetic bioavailability and gastric absorption by up to 300%.'
    ],
    sections: [
      {
        heading: '1. Cytochrome P450 & The First-Pass Effect',
        body: 'Oral medications pass through the intestinal wall and liver before entering systemic circulation. Hepatic Cytochrome P450 enzymes either activate prodrugs or break active agents down into excretable metabolites. Co-administering enzyme inhibitors (such as naringin in grapefruit juice) or inducers (such as St. John’s Wort) can lead to toxic blood levels or treatment failure.'
      },
      {
        heading: '2. Statistical "Normal" vs. Functional "Optimal" Ranges',
        body: 'A standard lab report marks results with reference intervals calculated as the mean +/- 2 standard deviations of everyone tested at that lab—a cohort that includes patients managing severe metabolic or inflammatory conditions. In functional preventative medicine, optimal biomarker ranges (e.g. fasting insulin < 6 uIU/mL, hs-CRP < 0.5 mg/L) reflect disease prevention, not merely the absence of acute pathology.'
      },
      {
        heading: '3. The Patient-Pharmacist Safety Checklist',
        body: 'Always maintain a centralized digital medication dossier that includes prescription pharmaceuticals, over-the-counter NSAIDs, and botanicals. Before initiating a new compound, review its elimination half-life, required renal or hepatic monitoring, and potential competition for mucosal transporter proteins with your clinical team.'
      }
    ]
  }
];
