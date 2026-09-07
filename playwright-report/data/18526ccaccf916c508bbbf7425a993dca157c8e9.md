# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journey.spec.ts >> guest can enter the assessment workspace from the public page
- Location: tests/e2e/journey.spec.ts:3:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Start Your Assessment' })

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Privacy and Terms Preferences" [ref=e3]:
    - generic [ref=e9]:
      - heading "Privacy & Terms" [level=4] [ref=e10]
      - paragraph [ref=e11]: HealthChain uses necessary storage for sign-in and app operation. Optional analytics helps us understand product usage and is loaded only if you accept it. See our Terms of Service and Privacy Policy.
    - generic [ref=e12]:
      - button "Necessary only" [ref=e13] [cursor=pointer]
      - button "I Accept" [ref=e14] [cursor=pointer]
  - generic [ref=e16]:
    - navigation [ref=e17]:
      - generic [ref=e18]:
        - img "HealthChain360.ai" [ref=e19]
        - generic [ref=e20]: HealthChain360.ai
      - generic [ref=e21]:
        - button "Log In" [ref=e22] [cursor=pointer]
        - button "Get Started" [ref=e23] [cursor=pointer]
    - main [ref=e24]:
      - generic [ref=e27]:
        - button "Live AI Board Specialist Ticker - Start Investigation" [ref=e28] [cursor=pointer]:
          - generic [ref=e29]: LIVE AI BOARD
          - generic [ref=e34]:
            - generic [ref=e35]:
              - generic [ref=e36]: 🫀
              - generic [ref=e37]: Cardiology
              - generic [ref=e38]: Arrhythmia & POTS
              - generic [ref=e39]: •
            - generic [ref=e40]:
              - generic [ref=e41]: 🧠
              - generic [ref=e42]: Neurology
              - generic [ref=e43]: Migraine & Vagus Tone
              - generic [ref=e44]: •
            - generic [ref=e45]:
              - generic [ref=e46]: 🔬
              - generic [ref=e47]: Endocrinology
              - generic [ref=e48]: Thyroid & Adrenals
              - generic [ref=e49]: •
            - generic [ref=e50]:
              - generic [ref=e51]: 🧬
              - generic [ref=e52]: Immunology
              - generic [ref=e53]: Autoimmune & MCAS
              - generic [ref=e54]: •
            - generic [ref=e55]:
              - generic [ref=e56]: 🧪
              - generic [ref=e57]: Gastroenterology
              - generic [ref=e58]: Gut-Brain Axis & SIBO
              - generic [ref=e59]: •
            - generic [ref=e60]:
              - generic [ref=e61]: 🦴
              - generic [ref=e62]: Rheumatology
              - generic [ref=e63]: Connective Tissue
              - generic [ref=e64]: •
            - generic [ref=e65]:
              - generic [ref=e66]: 🫁
              - generic [ref=e67]: Pulmonology
              - generic [ref=e68]: Dyspnea & Airway
              - generic [ref=e69]: •
            - generic [ref=e70]:
              - generic [ref=e71]: 🩸
              - generic [ref=e72]: Hematology
              - generic [ref=e73]: Ferritin & Clotting
              - generic [ref=e74]: •
            - generic [ref=e75]:
              - generic [ref=e76]: ⚕️
              - generic [ref=e77]: Nephrology
              - generic [ref=e78]: Electrolytes & Renal
              - generic [ref=e79]: •
            - generic [ref=e80]:
              - generic [ref=e81]: 🦠
              - generic [ref=e82]: Infectious Disease
              - generic [ref=e83]: Post-Viral Fatigue
              - generic [ref=e84]: •
            - generic [ref=e85]:
              - generic [ref=e86]: 💊
              - generic [ref=e87]: Pharmacology
              - generic [ref=e88]: Drug-Nutrient Interplay
              - generic [ref=e89]: •
            - generic [ref=e90]:
              - generic [ref=e91]: 🥗
              - generic [ref=e92]: Functional Medicine
              - generic [ref=e93]: Mitochondrial Health
              - generic [ref=e94]: •
            - generic [ref=e95]:
              - generic [ref=e96]: 🫀
              - generic [ref=e97]: Cardiology
              - generic [ref=e98]: Arrhythmia & POTS
              - generic [ref=e99]: •
            - generic [ref=e100]:
              - generic [ref=e101]: 🧠
              - generic [ref=e102]: Neurology
              - generic [ref=e103]: Migraine & Vagus Tone
              - generic [ref=e104]: •
            - generic [ref=e105]:
              - generic [ref=e106]: 🔬
              - generic [ref=e107]: Endocrinology
              - generic [ref=e108]: Thyroid & Adrenals
              - generic [ref=e109]: •
            - generic [ref=e110]:
              - generic [ref=e111]: 🧬
              - generic [ref=e112]: Immunology
              - generic [ref=e113]: Autoimmune & MCAS
              - generic [ref=e114]: •
            - generic [ref=e115]:
              - generic [ref=e116]: 🧪
              - generic [ref=e117]: Gastroenterology
              - generic [ref=e118]: Gut-Brain Axis & SIBO
              - generic [ref=e119]: •
            - generic [ref=e120]:
              - generic [ref=e121]: 🦴
              - generic [ref=e122]: Rheumatology
              - generic [ref=e123]: Connective Tissue
              - generic [ref=e124]: •
            - generic [ref=e125]:
              - generic [ref=e126]: 🫁
              - generic [ref=e127]: Pulmonology
              - generic [ref=e128]: Dyspnea & Airway
              - generic [ref=e129]: •
            - generic [ref=e130]:
              - generic [ref=e131]: 🩸
              - generic [ref=e132]: Hematology
              - generic [ref=e133]: Ferritin & Clotting
              - generic [ref=e134]: •
            - generic [ref=e135]:
              - generic [ref=e136]: ⚕️
              - generic [ref=e137]: Nephrology
              - generic [ref=e138]: Electrolytes & Renal
              - generic [ref=e139]: •
            - generic [ref=e140]:
              - generic [ref=e141]: 🦠
              - generic [ref=e142]: Infectious Disease
              - generic [ref=e143]: Post-Viral Fatigue
              - generic [ref=e144]: •
            - generic [ref=e145]:
              - generic [ref=e146]: 💊
              - generic [ref=e147]: Pharmacology
              - generic [ref=e148]: Drug-Nutrient Interplay
              - generic [ref=e149]: •
            - generic [ref=e150]:
              - generic [ref=e151]: 🥗
              - generic [ref=e152]: Functional Medicine
              - generic [ref=e153]: Mitochondrial Health
              - generic [ref=e154]: •
        - heading "Your Symptoms. Finally Explained." [level=1] [ref=e155]
        - paragraph [ref=e156]: Been to 5 different doctors with no answers? HealthChain360.ai convenes AI medical specialists to cross-analyze your complex symptoms, blood work, and history—uncovering root-cause connections standard 15-minute visits miss.
        - generic [ref=e158]:
          - textbox "Describe your symptoms or paste blood test results" [ref=e162]:
            - /placeholder: Type your symptoms or paste blood test results (e.g. chronic fatigue, morning headaches)...
          - button "Analyze →" [ref=e163] [cursor=pointer]
        - generic [ref=e165]:
          - generic [ref=e166]: "OR TAP A FREQUENT SYMPTOM TO BEGIN:"
          - generic [ref=e167]:
            - button "⚡ Chronic Fatigue" [ref=e168] [cursor=pointer]
            - button "🤕 Daily Headache" [ref=e170] [cursor=pointer]
            - button "🫀 Palpitations" [ref=e172] [cursor=pointer]
            - button "🧬 Brain Fog" [ref=e174] [cursor=pointer]
            - button "🩺 Gut & Bloating" [ref=e176] [cursor=pointer]
            - button "➕ Other Complex Cases" [ref=e178] [cursor=pointer]
        - generic [ref=e180]:
          - generic [ref=e181]:
            - generic [ref=e182]: MULTI-DISCIPLINARY SPECIALIST CONSENSUS ACTIVE
            - generic [ref=e185]: "Case #4120 • 35-yo Female (Post-Viral Fatigue)"
          - generic [ref=e186]:
            - generic [ref=e187]:
              - generic [ref=e188]: 🩺
              - generic [ref=e189]:
                - generic [ref=e190]:
                  - generic [ref=e191]: Cardiologist
                  - generic [ref=e192]: Specialist perspective
                - paragraph [ref=e193]: "\"Resting tachycardia noted despite normal ECG.\""
            - generic [ref=e194]:
              - generic [ref=e195]: 🧠
              - generic [ref=e196]:
                - generic [ref=e197]:
                  - generic [ref=e198]: Neurologist
                  - generic [ref=e199]: Specialist perspective
                - paragraph [ref=e200]: "\"Possible autonomic / vagal nerve involvement.\""
            - generic [ref=e201]:
              - generic [ref=e202]: 🔬
              - generic [ref=e203]:
                - generic [ref=e204]:
                  - generic [ref=e205]: Endocrinologist
                  - generic [ref=e206]: Specialist perspective
                - paragraph [ref=e207]: "\"Check ferritin and cortisol before next doctor visit.\""
          - generic [ref=e208]:
            - generic [ref=e209]: Synthesizing root-cause differentials & clinician discussion brief...
            - button "Try with your symptoms →" [ref=e213] [cursor=pointer]
      - generic [ref=e216]:
        - generic [ref=e217]:
          - img "HealthChain360.ai" [ref=e218]
          - generic [ref=e219]: HealthChain360.ai
        - heading "Your entire health history. One intelligent view." [level=2] [ref=e220]
        - paragraph [ref=e221]: Blood tests, doctor notes, wearable vitals, and scans—connected to one AI clinical board.
        - generic [ref=e222]:
          - generic [ref=e223]:
            - generic [ref=e224]: 🩸
            - generic [ref=e225]: Lab & Blood Tests
          - generic [ref=e226]:
            - generic [ref=e227]: 🏥
            - generic [ref=e228]: Doctor & Clinic Notes
          - generic [ref=e229]:
            - generic [ref=e230]: ⌚
            - generic [ref=e231]: Wearables & Vitals
          - generic [ref=e232]:
            - generic [ref=e233]: 🧬
            - generic [ref=e234]: Scans & Genetic PDFs
        - generic [ref=e243]:
          - generic [ref=e244]:
            - generic [ref=e245]:
              - img "HealthChain360.ai" [ref=e246]
              - generic [ref=e247]: HealthChain360.ai
            - generic [ref=e248]:
              - generic [ref=e249] [cursor=pointer]: Dashboard
              - generic [ref=e250] [cursor=pointer]: ✨ Multi-Specialist AI
            - generic [ref=e251]: 📅 Full Case History ▾
          - generic [ref=e254]:
            - generic [ref=e255]: 📈
            - generic [ref=e256]:
              - strong [ref=e257]: "Cross-System Insight Identified:"
              - text: Autonomic dysfunction and subclinical ferritin lag correlated across 14 lab flags.
          - generic [ref=e258]:
            - generic [ref=e259]:
              - generic [ref=e260]:
                - generic [ref=e261]: LAB BIOMARKERS
                - generic [ref=e262]: 48 Synced
              - generic [ref=e263]: 48 Markers
              - generic [ref=e264]:
                - generic [ref=e265]: 🟢
                - generic [ref=e266]: 14 Correlated
            - generic [ref=e270]:
              - generic [ref=e271]:
                - generic [ref=e272]: SPECIALIST CONSENSUS
                - generic [ref=e273]: 12 Boards
              - generic [ref=e274]: 94% Match
              - generic [ref=e275]:
                - generic [ref=e276]: 🟢
                - generic [ref=e277]: Board Aligned
            - generic [ref=e281]:
              - generic [ref=e282]:
                - generic [ref=e283]: APPOINTMENT READY
                - generic [ref=e284]: Doctor Brief
              - generic [ref=e285]: < 60s Brief
              - generic [ref=e286]:
                - generic [ref=e287]: 🟢
                - generic [ref=e288]: ICD-10 & NIH Cited
          - generic [ref=e292]:
            - generic [ref=e293]:
              - generic [ref=e298]:
                - generic [ref=e299]: Ava Clinical AI Assistant
                - generic [ref=e300]:
                  - generic [ref=e301]: ●
                  - generic [ref=e302]: Connected to your encrypted health history
              - generic [ref=e303]: "\"Why do my standard blood tests look normal while my fatigue & heart rate spike?\""
            - generic [ref=e304]:
              - generic [ref=e305]: Hyperadrenergic POTS & Subclinical Iron Depletion
              - paragraph [ref=e306]: Cross-analyzed across 14 biomarker flags, sleep history, and postural heart-rate telemetry.
              - generic [ref=e307]:
                - generic [ref=e308]:
                  - generic [ref=e309]: 🩸
                  - generic [ref=e310]:
                    - generic [ref=e311]: "Ferritin: 14 ng/mL"
                    - generic [ref=e312]: Subclinical depletion
                - generic [ref=e313]:
                  - generic [ref=e314]: 🫀
                  - generic [ref=e315]:
                    - generic [ref=e316]: "Orthostatic HR: +38 bpm"
                    - generic [ref=e317]: Autonomic shift
                - generic [ref=e318]:
                  - generic [ref=e319]: ⚠️
                  - generic [ref=e320]:
                    - generic [ref=e321]: Free T3/T4 Ratio
                    - generic [ref=e322]: Conversion lag
              - generic [ref=e323]:
                - generic [ref=e324]: 🟢
                - generic [ref=e325]:
                  - strong [ref=e326]: "Prioritized Action:"
                  - text: Request morning serum ferritin panel & orthostatic tilt-table review at your next GP visit.
        - generic [ref=e327]:
          - button "Check Live Demo →" [ref=e328] [cursor=pointer]
          - generic [ref=e329]: Live in seconds • Client-side encrypted • No credit card required
      - generic [ref=e330]:
        - generic [ref=e331]:
          - generic [ref=e332]: 🎬 MULTI-SPECIALIST AI DEMO
          - heading "See HealthChain360.ai in Action" [level=2] [ref=e333]
          - paragraph [ref=e334]: Watch how our AI clinical specialists cross-analyze contradictory symptoms, lab biomarkers, and medical history.
        - generic [ref=e335]:
          - generic [ref=e336]:
            - button "Play video demonstration" [ref=e337] [cursor=pointer]:
              - img "AI Medical Board Debate Demo" [ref=e339]
            - generic [ref=e340]:
              - generic [ref=e341]: DEMO 1 • OVERVIEW
              - heading "AI Medical Board Debate" [level=3] [ref=e342]
              - paragraph [ref=e343]: Watch how cardiology, neurology, endocrinology, and immunology correlate multi-system symptoms to uncover missed root causes.
              - button "Try this with your symptoms" [ref=e344] [cursor=pointer]
          - generic [ref=e348]:
            - button "Play video demonstration" [ref=e349] [cursor=pointer]:
              - img "From Symptoms to Doctor-Ready Dossier Demo" [ref=e351]
            - generic [ref=e352]:
              - generic [ref=e353]: DEMO 2 • WORKFLOW
              - heading "From Symptoms to Doctor-Ready Dossier" [level=3] [ref=e354]
              - paragraph [ref=e355]: See how blood panels and symptoms synthesize into ranked differentials and doctor-ready discussion points in minutes.
              - button "Generate your clinical brief" [ref=e356] [cursor=pointer]
      - generic [ref=e360]:
        - generic [ref=e361]:
          - heading "Results You Can Measure Clinical Clarity That Delivers" [level=2] [ref=e362]
          - paragraph [ref=e363]: Patients don't just get answers — they get clarity. HealthChain360.ai drives measurable improvements across root-cause discovery, lab synthesis, and clinician appointment preparation.
        - generic [ref=e364]:
          - generic [ref=e365]:
            - generic [ref=e373]:
              - generic [ref=e374]: 94%
              - generic [ref=e375]: ↗
            - heading "Diagnostic Consensus" [level=4] [ref=e376]
            - paragraph [ref=e377]: Multi-specialist AI agreement rate on complex cross-system differential diagnoses and root causes.
            - button "Start Free Review →" [ref=e378] [cursor=pointer]
          - generic [ref=e379]:
            - generic [ref=e382]:
              - generic [ref=e383]: 4.8x
              - generic [ref=e384]: ↗
            - heading "Evidence Breadth" [level=4] [ref=e385]
            - paragraph [ref=e386]: Evaluates 4.8x more multi-system biomarker correlations than standard 15-minute primary care visits.
            - button "Start Free Review →" [ref=e387] [cursor=pointer]
          - generic [ref=e388]:
            - generic [ref=e393]:
              - generic [ref=e394]: < 60s
              - generic [ref=e395]: ↗
            - heading "Synthesized Dossier" [level=4] [ref=e396]
            - paragraph [ref=e397]: Transforms years of fragmented blood tests and symptoms into an actionable clinician brief in seconds.
            - button "Start Free Review →" [ref=e398] [cursor=pointer]
      - generic [ref=e400]:
        - generic [ref=e401]: AUTOMATED CLINICAL INTELLIGENCE
        - generic [ref=e402]:
          - heading "Clinical Campaign & Dossier Preview" [level=2] [ref=e408]
          - paragraph [ref=e409]:
            - strong [ref=e410]: Real-World Intelligence.
            - text: See how HealthChain360.ai structures your scattered medical records into doctor-ready, multi-specialist briefs that get taken seriously.
        - generic [ref=e412]:
          - generic [ref=e414]:
            - generic [ref=e415]:
              - img "What is HealthChain and How Can It Improve Your Doctor Visits?" [ref=e417]
              - generic [ref=e419]:
                - generic [ref=e420]:
                  - generic [ref=e421]: 📖 Patient Guide
                  - generic [ref=e422]: NEWS
                - heading "What is HealthChain and How Can It Improve Your Doctor Visits?" [level=3] [ref=e423]
                - paragraph [ref=e424]: Confused about managing your health records? HealthChain provides a clear, unified timeline so you never repeat your story.
            - generic [ref=e425]:
              - img "HealthChain's Integrated Approach to Patient Data Management" [ref=e427]
              - generic [ref=e429]:
                - generic [ref=e430]:
                  - generic [ref=e431]: 📊 Professional Report
                  - generic [ref=e432]: NEWS
                - heading "HealthChain's Integrated Approach to Patient Data Management" [level=3] [ref=e433]
                - paragraph [ref=e434]: Explore how HealthChain centralizes patient health stories, records, and identifies multi-organ correlations standard visits miss.
            - generic [ref=e435]:
              - img "When Standard Blood Work Shows \"Normal\", AI Examines the Gaps" [ref=e437]
              - generic [ref=e439]:
                - generic [ref=e440]:
                  - generic [ref=e441]: 🧬 Biomarker Matrix
                  - generic [ref=e442]: LAB
                - heading "When Standard Blood Work Shows \"Normal\", AI Examines the Gaps" [level=3] [ref=e443]
                - paragraph [ref=e444]: Cross-checks subclinical ferritin, Free T3/T4 conversion ratios, and electrolyte variances against comprehensive clinical reference ranges.
            - generic [ref=e445]:
              - img "What is HealthChain and How Can It Improve Your Doctor Visits?" [ref=e447]
              - generic [ref=e449]:
                - generic [ref=e450]:
                  - generic [ref=e451]: 📖 Patient Guide
                  - generic [ref=e452]: NEWS
                - heading "What is HealthChain and How Can It Improve Your Doctor Visits?" [level=3] [ref=e453]
                - paragraph [ref=e454]: Confused about managing your health records? HealthChain provides a clear, unified timeline so you never repeat your story.
            - generic [ref=e455]:
              - img "HealthChain's Integrated Approach to Patient Data Management" [ref=e457]
              - generic [ref=e459]:
                - generic [ref=e460]:
                  - generic [ref=e461]: 📊 Professional Report
                  - generic [ref=e462]: NEWS
                - heading "HealthChain's Integrated Approach to Patient Data Management" [level=3] [ref=e463]
                - paragraph [ref=e464]: Explore how HealthChain centralizes patient health stories, records, and identifies multi-organ correlations standard visits miss.
            - generic [ref=e465]:
              - img "When Standard Blood Work Shows \"Normal\", AI Examines the Gaps" [ref=e467]
              - generic [ref=e469]:
                - generic [ref=e470]:
                  - generic [ref=e471]: 🧬 Biomarker Matrix
                  - generic [ref=e472]: LAB
                - heading "When Standard Blood Work Shows \"Normal\", AI Examines the Gaps" [level=3] [ref=e473]
                - paragraph [ref=e474]: Cross-checks subclinical ferritin, Free T3/T4 conversion ratios, and electrolyte variances against comprehensive clinical reference ranges.
          - generic [ref=e476]:
            - generic [ref=e477]:
              - img "How HealthChain Helps Bridge Communication Gaps with Your..." [ref=e479]
              - generic [ref=e481]:
                - generic [ref=e482]:
                  - generic [ref=e483]: 📄 Trade Publication
                  - generic [ref=e484]: NEWS
                - heading "How HealthChain Helps Bridge Communication Gaps with Your..." [level=3] [ref=e485]
                - paragraph [ref=e486]: Ever felt unheard by your doctor? HealthChain equips you with organized health summaries and differential discussion points.
            - generic [ref=e492]:
              - generic [ref=e493]:
                - generic [ref=e494]: 🛡️ Encrypted Vault
                - generic [ref=e495]: 100% PRIVATE
              - heading "Reviewed & Encrypted Before It Goes Live" [level=3] [ref=e496]
              - paragraph [ref=e497]: Every piece is checked and verified client-side so nothing leaves your device without explicit permission.
            - generic [ref=e498]:
              - img "Direct Matching to Active Clinical Trials & NIH Studies" [ref=e500]
              - generic [ref=e502]:
                - generic [ref=e503]:
                  - generic [ref=e504]: 🔬 Clinical Trials
                  - generic [ref=e505]: PEER-REVIEWED
                - heading "Direct Matching to Active Clinical Trials & NIH Studies" [level=3] [ref=e506]
                - paragraph [ref=e507]: Instantly correlates unresolved symptom clusters with current recruiting trials and published landmark breakthroughs.
            - generic [ref=e508]:
              - img "How HealthChain Helps Bridge Communication Gaps with Your..." [ref=e510]
              - generic [ref=e512]:
                - generic [ref=e513]:
                  - generic [ref=e514]: 📄 Trade Publication
                  - generic [ref=e515]: NEWS
                - heading "How HealthChain Helps Bridge Communication Gaps with Your..." [level=3] [ref=e516]
                - paragraph [ref=e517]: Ever felt unheard by your doctor? HealthChain equips you with organized health summaries and differential discussion points.
            - generic [ref=e523]:
              - generic [ref=e524]:
                - generic [ref=e525]: 🛡️ Encrypted Vault
                - generic [ref=e526]: 100% PRIVATE
              - heading "Reviewed & Encrypted Before It Goes Live" [level=3] [ref=e527]
              - paragraph [ref=e528]: Every piece is checked and verified client-side so nothing leaves your device without explicit permission.
            - generic [ref=e529]:
              - img "Direct Matching to Active Clinical Trials & NIH Studies" [ref=e531]
              - generic [ref=e533]:
                - generic [ref=e534]:
                  - generic [ref=e535]: 🔬 Clinical Trials
                  - generic [ref=e536]: PEER-REVIEWED
                - heading "Direct Matching to Active Clinical Trials & NIH Studies" [level=3] [ref=e537]
                - paragraph [ref=e538]: Instantly correlates unresolved symptom clusters with current recruiting trials and published landmark breakthroughs.
        - button "Start Your Free Case Dossier" [ref=e540] [cursor=pointer]
      - generic [ref=e544]:
        - generic [ref=e545]:
          - generic [ref=e546]: REAL-WORLD DIAGNOSTIC RESOLUTIONS
          - heading "When Tests Look Normal, Specialists Connect the Dots" [level=2] [ref=e557]
          - paragraph [ref=e558]: Explore real multi-system cases where standard 15-minute visits stalled, but our AI clinical specialists uncovered hidden root causes.
        - generic [ref=e559]:
          - 'button "Explore case: Subclinical Ferritin Depletion & Post-Viral Autonomic Fatigue. Correlated standard \"normal\" iron (65 μg/dL) with depleted ferritin (18 ng/mL) and blunted morning cortisol curve—explaining severe afternoon brain fog." [ref=e560] [cursor=pointer]':
            - generic [ref=e561]: "#1"
            - generic [ref=e562]:
              - generic [ref=e563]:
                - generic [ref=e564]:
                  - generic [ref=e565]: 🔬
                  - heading "Subclinical Ferritin Depletion & Post-Viral Autonomic Fatigue" [level=3] [ref=e566]
                - generic [ref=e567]: 96% Match
              - paragraph [ref=e568]: Correlated standard "normal" iron (65 μg/dL) with depleted ferritin (18 ng/mL) and blunted morning cortisol curve—explaining severe afternoon brain fog.
              - generic [ref=e569]:
                - generic [ref=e570]:
                  - generic [ref=e571]: 🔬 Endocrinology & Neurology
                  - generic [ref=e572]: •
                  - generic [ref=e573]: "#1 in Endocrinology · 2 days ago · 3,420 matched cases"
                - generic [ref=e574]: Test with your symptoms
          - 'button "Explore case: Histamine-Mediated Neuro-Vascular Migraine with Morning Spikes. Identified gut-brain axis dysbiosis with histamine sensitivity triggering daily throbbing occipital pressure and morning vasomotor blood pressure spikes." [ref=e578] [cursor=pointer]':
            - generic [ref=e579]: "#2"
            - generic [ref=e580]:
              - generic [ref=e581]:
                - generic [ref=e582]:
                  - generic [ref=e583]: 🧠
                  - heading "Histamine-Mediated Neuro-Vascular Migraine with Morning Spikes" [level=3] [ref=e584]
                - generic [ref=e585]: 94% Match
              - paragraph [ref=e586]: Identified gut-brain axis dysbiosis with histamine sensitivity triggering daily throbbing occipital pressure and morning vasomotor blood pressure spikes.
              - generic [ref=e587]:
                - generic [ref=e588]:
                  - generic [ref=e589]: 🔬 Neurology & Gastroenterology
                  - generic [ref=e590]: •
                  - generic [ref=e591]: "#1 in Neurology · 3 days ago · 2,890 matched cases"
                - generic [ref=e592]: Test with your symptoms
          - 'button "Explore case: Gastrocardiac (Roemheld) Post-Meal Palpitations & Vagal Irritation. Traced sinus tachycardia and lightheadedness after meals to splanchnic blood pooling and diaphragmatic vagus nerve compression." [ref=e596] [cursor=pointer]':
            - generic [ref=e597]: "#3"
            - generic [ref=e598]:
              - generic [ref=e599]:
                - generic [ref=e600]:
                  - generic [ref=e601]: 🫀
                  - heading "Gastrocardiac (Roemheld) Post-Meal Palpitations & Vagal Irritation" [level=3] [ref=e602]
                - generic [ref=e603]: 93% Match
              - paragraph [ref=e604]: Traced sinus tachycardia and lightheadedness after meals to splanchnic blood pooling and diaphragmatic vagus nerve compression.
              - generic [ref=e605]:
                - generic [ref=e606]:
                  - generic [ref=e607]: 🔬 Cardiology & Gastroenterology
                  - generic [ref=e608]: •
                  - generic [ref=e609]: "#1 in Cardiology · 4 days ago · 4,110 matched cases"
                - generic [ref=e610]: Test with your symptoms
          - 'button "Explore case: Mast Cell Mediator Release & Postural Tachycardia Overlap. Identified episodic facial flushing, dermographia, and postural heart rate spikes matching hyperadrenergic POTS / MCAS overlap profile." [ref=e614] [cursor=pointer]':
            - generic [ref=e615]: "#4"
            - generic [ref=e616]:
              - generic [ref=e617]:
                - generic [ref=e618]:
                  - generic [ref=e619]: 🛡️
                  - heading "Mast Cell Mediator Release & Postural Tachycardia Overlap" [level=3] [ref=e620]
                - generic [ref=e621]: 91% Match
              - paragraph [ref=e622]: Identified episodic facial flushing, dermographia, and postural heart rate spikes matching hyperadrenergic POTS / MCAS overlap profile.
              - generic [ref=e623]:
                - generic [ref=e624]:
                  - generic [ref=e625]: 🔬 Immunology & Cardiology
                  - generic [ref=e626]: •
                  - generic [ref=e627]: "#1 in Immunology · 5 days ago · 1,940 matched cases"
                - generic [ref=e628]: Test with your symptoms
          - generic [ref=e632]:
            - generic [ref=e633]:
              - generic [ref=e634]: ●
              - generic [ref=e635]: LATEST CLINICAL CONSENSUS ACTIVITY
            - generic [ref=e636]:
              - 'button "Explore case: Iron Panel & Ferritin mapped for patient in Chicago" [ref=e637] [cursor=pointer]':
                - generic [ref=e638]: 🧪
                - generic [ref=e639]: Iron Panel & Ferritin mapped for patient in Chicago
                - generic [ref=e640]: · 1m ago
              - 'button "Explore case: POTS Tilt Correlation for patient in London" [ref=e641] [cursor=pointer]':
                - generic [ref=e642]: 🧠
                - generic [ref=e643]: POTS Tilt Correlation for patient in London
                - generic [ref=e644]: · 4m ago
              - 'button "Explore case: Thyroid Free T3/T4 ratio analyzed" [ref=e645] [cursor=pointer]':
                - generic [ref=e646]: 🔬
                - generic [ref=e647]: Thyroid Free T3/T4 ratio analyzed
                - generic [ref=e648]: · 16m ago
              - 'button "Explore case: Histamine elimination brief generated" [ref=e649] [cursor=pointer]':
                - generic [ref=e650]: 🩺
                - generic [ref=e651]: Histamine elimination brief generated
                - generic [ref=e652]: · 27m ago
              - 'button "Explore case: Resting ECG & Holter cross-analyzed" [ref=e653] [cursor=pointer]':
                - generic [ref=e654]: 🫀
                - generic [ref=e655]: Resting ECG & Holter cross-analyzed
                - generic [ref=e656]: · 33m ago
      - generic [ref=e658]:
        - heading "Tired of hearing \"All your tests are normal\" while you still feel sick?" [level=2] [ref=e659]
        - paragraph [ref=e660]: The average chronic patient spends years visiting 5+ disconnected specialists, repeating expensive blood tests, and receiving contradictory advice. Standard 15-minute doctor appointments simply don't have time to connect the dots across your gut, hormones, nervous system, and history.
        - paragraph [ref=e661]: HealthChain360.ai replaces medical guesswork with autonomous multi-specialist intelligence. We correlate your symptoms, labs, and history into a unified clinical brief with ranked differentials and doctor-ready questions.
      - generic [ref=e662]:
        - generic [ref=e663]:
          - generic [ref=e664]: CLINICAL ARCHITECTURE
          - heading "Engineered for Complex Cases" [level=2] [ref=e665]
          - paragraph [ref=e666]: Why standard medical search engines fail chronic patients and how HealthChain360.ai fixes it.
        - generic [ref=e667]:
          - generic [ref=e668]:
            - heading "Multi-Specialist AI Perspectives" [level=3] [ref=e680]
            - paragraph [ref=e681]: Instead of a single AI giving a generic answer, clinical specialists evaluate your case independently, then debate and cross-examine evidence to uncover multi-system interactions.
          - generic [ref=e682]:
            - heading "Biomarker Synthesis" [level=3] [ref=e688]
            - paragraph [ref=e689]: Upload raw blood test results, PDFs, or photos. The engine spots suboptimal patterns standard "normal ranges" overlook.
          - generic [ref=e690]:
            - heading "Grounded Evidence" [level=3] [ref=e694]
            - paragraph [ref=e695]: Every differential and suggested inquiry cites peer-reviewed PubMed and clinical trial literature.
          - generic [ref=e696]:
            - heading "Doctor-Ready Consultation Dossier" [level=3] [ref=e701]
            - paragraph [ref=e702]: Export an organized 1-page clinical summary formatted specifically for your doctor, complete with prioritized questions and recommended follow-up tests.
      - generic [ref=e703]:
        - generic [ref=e704]:
          - heading "Frequently Asked Questions" [level=2] [ref=e705]
          - paragraph [ref=e706]: Everything you need to know about the platform and your privacy.
        - generic [ref=e707]:
          - button "Is HealthChain360.ai a replacement for my doctor?" [ref=e709] [cursor=pointer]
          - button "How is my medical data secured?" [ref=e714] [cursor=pointer]
          - button "How do the Deep Collaborative Specialists work?" [ref=e719] [cursor=pointer]
          - button "Are the AI agents trained on real medical literature?" [ref=e724] [cursor=pointer]
    - contentinfo [ref=e728]:
      - generic [ref=e729]:
        - generic [ref=e730]:
          - generic [ref=e731]:
            - img "HealthChain360.ai" [ref=e732]
            - generic [ref=e733]: HealthChain360.ai
          - paragraph [ref=e734]: AI-assisted health assessment and clinician-visit preparation, built for clinical clarity and privacy.
        - generic [ref=e735]:
          - heading "Product" [level=4] [ref=e736]
          - link "Health Today" [ref=e737]:
            - /url: /app/today
          - link "Pricing" [ref=e738]:
            - /url: /pricing
          - link "Changelog" [ref=e739]:
            - /url: /changelog
        - generic [ref=e740]:
          - heading "Company" [level=4] [ref=e741]
          - link "Terms of Service" [ref=e742]:
            - /url: /terms
          - link "Privacy Policy" [ref=e743]:
            - /url: /privacy
          - link "Contact Us" [ref=e744]:
            - /url: mailto:healthchain360@gmail.com
      - paragraph [ref=e746]: © 2026 HealthChain360.ai. All rights reserved.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  |
  3  | test('guest can enter the assessment workspace from the public page', async ({ page }) => {
  4  |   await page.goto('/');
  5  |   await expect(page).toHaveTitle(/HealthChain.*Health Assessment/i);
  6  |
  7  |   const consent = page.getByRole('button', { name: 'I Accept' });
  8  |   if (await consent.isVisible().catch(() => false)) {
  9  |     // The banner animates in WebKit; wait for it to render, then use a forced
  10 |     // click so the test does not mistake its entrance animation for a broken
  11 |     // public-to-app transition.
  12 |     await consent.waitFor({ state: 'visible' });
  13 |     await consent.click({ force: true });
  14 |   }
  15 |
  16 |   await expect(page.getByRole('heading', { name: /Your Symptoms\. Finally Explained\./i })).toBeVisible();
> 17 |   await page.getByRole('button', { name: 'Start Your Assessment' }).click();
     |                                                                     ^ Error: locator.click: Test timeout of 30000ms exceeded.
  18 |
  19 |   await expect(page).toHaveURL(/\/app\/collab\?new=true/);
  20 |   await expect(page.locator('.app-shell')).toBeVisible();
  21 |   await expect(page.getByText('Health Today')).toBeVisible();
  22 |   await expect(page.getByText(/Ready to find your root cause/i)).toHaveCount(0);
  23 | });
  24 |
  25 | test('clean unauthenticated browsers cannot open account case routes', async ({ page }) => {
  26 |   await page.goto('/app/my-cases');
  27 |   await expect(page).toHaveURL(/\/login$/);
  28 |   await expect(page.getByRole('heading', { name: /Welcome back|Create your account/i })).toBeVisible();
  29 | });
  30 |
  31 | test('a forged browser auth flag cannot bypass the Supabase session boundary', async ({ page }) => {
  32 |   await page.addInitScript(() => {
  33 |     window.localStorage.setItem('isAuthenticated', 'true');
  34 |   });
  35 |   await page.goto('/app/my-cases');
  36 |   await expect(page).toHaveURL(/\/login$/);
  37 |   await expect(page.getByRole('heading', { name: /Welcome back|Create your account/i })).toBeVisible();
  38 | });
  39 |
```