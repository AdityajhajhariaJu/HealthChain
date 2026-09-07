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
- generic [ref=e4]:
  - navigation [ref=e5]:
    - generic [ref=e6]:
      - img "HealthChain360.ai" [ref=e7]
      - generic [ref=e8]: HealthChain360.ai
    - generic [ref=e9]:
      - button "Log In" [ref=e10] [cursor=pointer]
      - button "Get Started" [ref=e11] [cursor=pointer]
  - main [ref=e12]:
    - generic [ref=e15]:
      - button "Live AI Board Specialist Ticker - Start Investigation" [ref=e16] [cursor=pointer]:
        - generic [ref=e17]: LIVE AI BOARD
        - generic [ref=e22]:
          - generic [ref=e23]:
            - generic [ref=e24]: 🫀
            - generic [ref=e25]: Cardiology
            - generic [ref=e26]: Arrhythmia & POTS
            - generic [ref=e27]: •
          - generic [ref=e28]:
            - generic [ref=e29]: 🧠
            - generic [ref=e30]: Neurology
            - generic [ref=e31]: Migraine & Vagus Tone
            - generic [ref=e32]: •
          - generic [ref=e33]:
            - generic [ref=e34]: 🔬
            - generic [ref=e35]: Endocrinology
            - generic [ref=e36]: Thyroid & Adrenals
            - generic [ref=e37]: •
          - generic [ref=e38]:
            - generic [ref=e39]: 🧬
            - generic [ref=e40]: Immunology
            - generic [ref=e41]: Autoimmune & MCAS
            - generic [ref=e42]: •
          - generic [ref=e43]:
            - generic [ref=e44]: 🧪
            - generic [ref=e45]: Gastroenterology
            - generic [ref=e46]: Gut-Brain Axis & SIBO
            - generic [ref=e47]: •
          - generic [ref=e48]:
            - generic [ref=e49]: 🦴
            - generic [ref=e50]: Rheumatology
            - generic [ref=e51]: Connective Tissue
            - generic [ref=e52]: •
          - generic [ref=e53]:
            - generic [ref=e54]: 🫁
            - generic [ref=e55]: Pulmonology
            - generic [ref=e56]: Dyspnea & Airway
            - generic [ref=e57]: •
          - generic [ref=e58]:
            - generic [ref=e59]: 🩸
            - generic [ref=e60]: Hematology
            - generic [ref=e61]: Ferritin & Clotting
            - generic [ref=e62]: •
          - generic [ref=e63]:
            - generic [ref=e64]: ⚕️
            - generic [ref=e65]: Nephrology
            - generic [ref=e66]: Electrolytes & Renal
            - generic [ref=e67]: •
          - generic [ref=e68]:
            - generic [ref=e69]: 🦠
            - generic [ref=e70]: Infectious Disease
            - generic [ref=e71]: Post-Viral Fatigue
            - generic [ref=e72]: •
          - generic [ref=e73]:
            - generic [ref=e74]: 💊
            - generic [ref=e75]: Pharmacology
            - generic [ref=e76]: Drug-Nutrient Interplay
            - generic [ref=e77]: •
          - generic [ref=e78]:
            - generic [ref=e79]: 🥗
            - generic [ref=e80]: Functional Medicine
            - generic [ref=e81]: Mitochondrial Health
            - generic [ref=e82]: •
          - generic [ref=e83]:
            - generic [ref=e84]: 🫀
            - generic [ref=e85]: Cardiology
            - generic [ref=e86]: Arrhythmia & POTS
            - generic [ref=e87]: •
          - generic [ref=e88]:
            - generic [ref=e89]: 🧠
            - generic [ref=e90]: Neurology
            - generic [ref=e91]: Migraine & Vagus Tone
            - generic [ref=e92]: •
          - generic [ref=e93]:
            - generic [ref=e94]: 🔬
            - generic [ref=e95]: Endocrinology
            - generic [ref=e96]: Thyroid & Adrenals
            - generic [ref=e97]: •
          - generic [ref=e98]:
            - generic [ref=e99]: 🧬
            - generic [ref=e100]: Immunology
            - generic [ref=e101]: Autoimmune & MCAS
            - generic [ref=e102]: •
          - generic [ref=e103]:
            - generic [ref=e104]: 🧪
            - generic [ref=e105]: Gastroenterology
            - generic [ref=e106]: Gut-Brain Axis & SIBO
            - generic [ref=e107]: •
          - generic [ref=e108]:
            - generic [ref=e109]: 🦴
            - generic [ref=e110]: Rheumatology
            - generic [ref=e111]: Connective Tissue
            - generic [ref=e112]: •
          - generic [ref=e113]:
            - generic [ref=e114]: 🫁
            - generic [ref=e115]: Pulmonology
            - generic [ref=e116]: Dyspnea & Airway
            - generic [ref=e117]: •
          - generic [ref=e118]:
            - generic [ref=e119]: 🩸
            - generic [ref=e120]: Hematology
            - generic [ref=e121]: Ferritin & Clotting
            - generic [ref=e122]: •
          - generic [ref=e123]:
            - generic [ref=e124]: ⚕️
            - generic [ref=e125]: Nephrology
            - generic [ref=e126]: Electrolytes & Renal
            - generic [ref=e127]: •
          - generic [ref=e128]:
            - generic [ref=e129]: 🦠
            - generic [ref=e130]: Infectious Disease
            - generic [ref=e131]: Post-Viral Fatigue
            - generic [ref=e132]: •
          - generic [ref=e133]:
            - generic [ref=e134]: 💊
            - generic [ref=e135]: Pharmacology
            - generic [ref=e136]: Drug-Nutrient Interplay
            - generic [ref=e137]: •
          - generic [ref=e138]:
            - generic [ref=e139]: 🥗
            - generic [ref=e140]: Functional Medicine
            - generic [ref=e141]: Mitochondrial Health
            - generic [ref=e142]: •
      - heading "Your Symptoms. Finally Explained." [level=1] [ref=e143]
      - paragraph [ref=e144]: Been to 5 different doctors with no answers? HealthChain360.ai convenes AI medical specialists to cross-analyze your complex symptoms, blood work, and history—uncovering root-cause connections standard 15-minute visits miss.
      - generic [ref=e146]:
        - textbox "Describe your symptoms or paste blood test results" [ref=e150]:
          - /placeholder: Type your symptoms or paste blood test results (e.g. chronic fatigue, morning headaches)...
        - button "Analyze →" [ref=e151] [cursor=pointer]
      - generic [ref=e153]:
        - generic [ref=e154]: "OR TAP A FREQUENT SYMPTOM TO BEGIN:"
        - generic [ref=e155]:
          - button "⚡ Chronic Fatigue" [ref=e156] [cursor=pointer]
          - button "🤕 Daily Headache" [ref=e158] [cursor=pointer]
          - button "🫀 Palpitations" [ref=e160] [cursor=pointer]
          - button "🧬 Brain Fog" [ref=e162] [cursor=pointer]
          - button "🩺 Gut & Bloating" [ref=e164] [cursor=pointer]
          - button "➕ Other Complex Cases" [ref=e166] [cursor=pointer]
      - generic [ref=e168]:
        - generic [ref=e169]:
          - generic [ref=e170]: MULTI-DISCIPLINARY SPECIALIST CONSENSUS ACTIVE
          - generic [ref=e173]: "Case #4120 • 35-yo Female (Post-Viral Fatigue)"
        - generic [ref=e174]:
          - generic [ref=e175]:
            - generic [ref=e176]: 🩺
            - generic [ref=e177]:
              - generic [ref=e178]:
                - generic [ref=e179]: Cardiologist
                - generic [ref=e180]: Specialist perspective
              - paragraph [ref=e181]: "\"Resting tachycardia noted despite normal ECG.\""
          - generic [ref=e182]:
            - generic [ref=e183]: 🧠
            - generic [ref=e184]:
              - generic [ref=e185]:
                - generic [ref=e186]: Neurologist
                - generic [ref=e187]: Specialist perspective
              - paragraph [ref=e188]: "\"Possible autonomic / vagal nerve involvement.\""
          - generic [ref=e189]:
            - generic [ref=e190]: 🔬
            - generic [ref=e191]:
              - generic [ref=e192]:
                - generic [ref=e193]: Endocrinologist
                - generic [ref=e194]: Specialist perspective
              - paragraph [ref=e195]: "\"Check ferritin and cortisol before next doctor visit.\""
        - generic [ref=e196]:
          - generic [ref=e197]: Synthesizing root-cause differentials & clinician discussion brief...
          - button "Try with your symptoms →" [ref=e201] [cursor=pointer]
    - generic [ref=e204]:
      - generic [ref=e205]:
        - img "HealthChain360.ai" [ref=e206]
        - generic [ref=e207]: HealthChain360.ai
      - heading "Your entire health history. One intelligent view." [level=2] [ref=e208]
      - paragraph [ref=e209]: Blood tests, doctor notes, wearable vitals, and scans—connected to one AI clinical board.
      - generic [ref=e210]:
        - generic [ref=e211]:
          - generic [ref=e212]: 🩸
          - generic [ref=e213]: Lab & Blood Tests
        - generic [ref=e214]:
          - generic [ref=e215]: 🏥
          - generic [ref=e216]: Doctor & Clinic Notes
        - generic [ref=e217]:
          - generic [ref=e218]: ⌚
          - generic [ref=e219]: Wearables & Vitals
        - generic [ref=e220]:
          - generic [ref=e221]: 🧬
          - generic [ref=e222]: Scans & Genetic PDFs
      - generic [ref=e231]:
        - generic [ref=e232]:
          - generic [ref=e233]:
            - img "HealthChain360.ai" [ref=e234]
            - generic [ref=e235]: HealthChain360.ai
          - generic [ref=e236]:
            - generic [ref=e237] [cursor=pointer]: Dashboard
            - generic [ref=e238] [cursor=pointer]: ✨ Multi-Specialist AI
          - generic [ref=e239]: 📅 Full Case History ▾
        - generic [ref=e242]:
          - generic [ref=e243]: 📈
          - generic [ref=e244]:
            - strong [ref=e245]: "Cross-System Insight Identified:"
            - text: Autonomic dysfunction and subclinical ferritin lag correlated across 14 lab flags.
        - generic [ref=e246]:
          - generic [ref=e247]:
            - generic [ref=e248]:
              - generic [ref=e249]: LAB BIOMARKERS
              - generic [ref=e250]: 48 Synced
            - generic [ref=e251]: 48 Markers
            - generic [ref=e252]:
              - generic [ref=e253]: 🟢
              - generic [ref=e254]: 14 Correlated
          - generic [ref=e258]:
            - generic [ref=e259]:
              - generic [ref=e260]: SPECIALIST CONSENSUS
              - generic [ref=e261]: 12 Boards
            - generic [ref=e262]: 94% Match
            - generic [ref=e263]:
              - generic [ref=e264]: 🟢
              - generic [ref=e265]: Board Aligned
          - generic [ref=e269]:
            - generic [ref=e270]:
              - generic [ref=e271]: APPOINTMENT READY
              - generic [ref=e272]: Doctor Brief
            - generic [ref=e273]: < 60s Brief
            - generic [ref=e274]:
              - generic [ref=e275]: 🟢
              - generic [ref=e276]: ICD-10 & NIH Cited
        - generic [ref=e280]:
          - generic [ref=e281]:
            - generic [ref=e286]:
              - generic [ref=e287]: Ava Clinical AI Assistant
              - generic [ref=e288]:
                - generic [ref=e289]: ●
                - generic [ref=e290]: Connected to your encrypted health history
            - generic [ref=e291]: "\"Why do my standard blood tests look normal while my fatigue & heart rate spike?\""
          - generic [ref=e292]:
            - generic [ref=e293]: Hyperadrenergic POTS & Subclinical Iron Depletion
            - paragraph [ref=e294]: Cross-analyzed across 14 biomarker flags, sleep history, and postural heart-rate telemetry.
            - generic [ref=e295]:
              - generic [ref=e296]:
                - generic [ref=e297]: 🩸
                - generic [ref=e298]:
                  - generic [ref=e299]: "Ferritin: 14 ng/mL"
                  - generic [ref=e300]: Subclinical depletion
              - generic [ref=e301]:
                - generic [ref=e302]: 🫀
                - generic [ref=e303]:
                  - generic [ref=e304]: "Orthostatic HR: +38 bpm"
                  - generic [ref=e305]: Autonomic shift
              - generic [ref=e306]:
                - generic [ref=e307]: ⚠️
                - generic [ref=e308]:
                  - generic [ref=e309]: Free T3/T4 Ratio
                  - generic [ref=e310]: Conversion lag
            - generic [ref=e311]:
              - generic [ref=e312]: 🟢
              - generic [ref=e313]:
                - strong [ref=e314]: "Prioritized Action:"
                - text: Request morning serum ferritin panel & orthostatic tilt-table review at your next GP visit.
      - generic [ref=e315]:
        - button "Check Live Demo →" [ref=e316] [cursor=pointer]
        - generic [ref=e317]: Live in seconds • Client-side encrypted • No credit card required
    - generic [ref=e318]:
      - generic [ref=e319]:
        - generic [ref=e320]: 🎬 MULTI-SPECIALIST AI DEMO
        - heading "See HealthChain360.ai in Action" [level=2] [ref=e321]
        - paragraph [ref=e322]: Watch how our AI clinical specialists cross-analyze contradictory symptoms, lab biomarkers, and medical history.
      - generic [ref=e323]:
        - generic [ref=e324]:
          - button "Play video demonstration" [ref=e325] [cursor=pointer]:
            - img "AI Medical Board Debate Demo" [ref=e327]
          - generic [ref=e328]:
            - generic [ref=e329]: DEMO 1 • OVERVIEW
            - heading "AI Medical Board Debate" [level=3] [ref=e330]
            - paragraph [ref=e331]: Watch how cardiology, neurology, endocrinology, and immunology correlate multi-system symptoms to uncover missed root causes.
            - button "Try this with your symptoms" [ref=e332] [cursor=pointer]
        - generic [ref=e336]:
          - button "Play video demonstration" [ref=e337] [cursor=pointer]:
            - img "From Symptoms to Doctor-Ready Dossier Demo" [ref=e339]
          - generic [ref=e340]:
            - generic [ref=e341]: DEMO 2 • WORKFLOW
            - heading "From Symptoms to Doctor-Ready Dossier" [level=3] [ref=e342]
            - paragraph [ref=e343]: See how blood panels and symptoms synthesize into ranked differentials and doctor-ready discussion points in minutes.
            - button "Generate your clinical brief" [ref=e344] [cursor=pointer]
    - generic [ref=e348]:
      - generic [ref=e349]:
        - heading "Results You Can Measure Clinical Clarity That Delivers" [level=2] [ref=e350]
        - paragraph [ref=e351]: Patients don't just get answers — they get clarity. HealthChain360.ai drives measurable improvements across root-cause discovery, lab synthesis, and clinician appointment preparation.
      - generic [ref=e352]:
        - generic [ref=e353]:
          - generic [ref=e361]:
            - generic [ref=e362]: 94%
            - generic [ref=e363]: ↗
          - heading "Diagnostic Consensus" [level=4] [ref=e364]
          - paragraph [ref=e365]: Multi-specialist AI agreement rate on complex cross-system differential diagnoses and root causes.
          - button "Start Free Review →" [ref=e366] [cursor=pointer]
        - generic [ref=e367]:
          - generic [ref=e370]:
            - generic [ref=e371]: 4.8x
            - generic [ref=e372]: ↗
          - heading "Evidence Breadth" [level=4] [ref=e373]
          - paragraph [ref=e374]: Evaluates 4.8x more multi-system biomarker correlations than standard 15-minute primary care visits.
          - button "Start Free Review →" [ref=e375] [cursor=pointer]
        - generic [ref=e376]:
          - generic [ref=e381]:
            - generic [ref=e382]: < 60s
            - generic [ref=e383]: ↗
          - heading "Synthesized Dossier" [level=4] [ref=e384]
          - paragraph [ref=e385]: Transforms years of fragmented blood tests and symptoms into an actionable clinician brief in seconds.
          - button "Start Free Review →" [ref=e386] [cursor=pointer]
    - generic [ref=e388]:
      - generic [ref=e389]: AUTOMATED CLINICAL INTELLIGENCE
      - generic [ref=e390]:
        - heading "Clinical Campaign & Dossier Preview" [level=2] [ref=e396]
        - paragraph [ref=e397]:
          - strong [ref=e398]: Real-World Intelligence.
          - text: See how HealthChain360.ai structures your scattered medical records into doctor-ready, multi-specialist briefs that get taken seriously.
      - generic [ref=e400]:
        - generic [ref=e402]:
          - generic [ref=e403]:
            - img "What is HealthChain and How Can It Improve Your Doctor Visits?" [ref=e405]
            - generic [ref=e407]:
              - generic [ref=e408]:
                - generic [ref=e409]: 📖 Patient Guide
                - generic [ref=e410]: NEWS
              - heading "What is HealthChain and How Can It Improve Your Doctor Visits?" [level=3] [ref=e411]
              - paragraph [ref=e412]: Confused about managing your health records? HealthChain provides a clear, unified timeline so you never repeat your story.
          - generic [ref=e413]:
            - img "HealthChain's Integrated Approach to Patient Data Management" [ref=e415]
            - generic [ref=e417]:
              - generic [ref=e418]:
                - generic [ref=e419]: 📊 Professional Report
                - generic [ref=e420]: NEWS
              - heading "HealthChain's Integrated Approach to Patient Data Management" [level=3] [ref=e421]
              - paragraph [ref=e422]: Explore how HealthChain centralizes patient health stories, records, and identifies multi-organ correlations standard visits miss.
          - generic [ref=e423]:
            - img "When Standard Blood Work Shows \"Normal\", AI Examines the Gaps" [ref=e425]
            - generic [ref=e427]:
              - generic [ref=e428]:
                - generic [ref=e429]: 🧬 Biomarker Matrix
                - generic [ref=e430]: LAB
              - heading "When Standard Blood Work Shows \"Normal\", AI Examines the Gaps" [level=3] [ref=e431]
              - paragraph [ref=e432]: Cross-checks subclinical ferritin, Free T3/T4 conversion ratios, and electrolyte variances against comprehensive clinical reference ranges.
          - generic [ref=e433]:
            - img "What is HealthChain and How Can It Improve Your Doctor Visits?" [ref=e435]
            - generic [ref=e437]:
              - generic [ref=e438]:
                - generic [ref=e439]: 📖 Patient Guide
                - generic [ref=e440]: NEWS
              - heading "What is HealthChain and How Can It Improve Your Doctor Visits?" [level=3] [ref=e441]
              - paragraph [ref=e442]: Confused about managing your health records? HealthChain provides a clear, unified timeline so you never repeat your story.
          - generic [ref=e443]:
            - img "HealthChain's Integrated Approach to Patient Data Management" [ref=e445]
            - generic [ref=e447]:
              - generic [ref=e448]:
                - generic [ref=e449]: 📊 Professional Report
                - generic [ref=e450]: NEWS
              - heading "HealthChain's Integrated Approach to Patient Data Management" [level=3] [ref=e451]
              - paragraph [ref=e452]: Explore how HealthChain centralizes patient health stories, records, and identifies multi-organ correlations standard visits miss.
          - generic [ref=e453]:
            - img "When Standard Blood Work Shows \"Normal\", AI Examines the Gaps" [ref=e455]
            - generic [ref=e457]:
              - generic [ref=e458]:
                - generic [ref=e459]: 🧬 Biomarker Matrix
                - generic [ref=e460]: LAB
              - heading "When Standard Blood Work Shows \"Normal\", AI Examines the Gaps" [level=3] [ref=e461]
              - paragraph [ref=e462]: Cross-checks subclinical ferritin, Free T3/T4 conversion ratios, and electrolyte variances against comprehensive clinical reference ranges.
        - generic [ref=e464]:
          - generic [ref=e465]:
            - img "How HealthChain Helps Bridge Communication Gaps with Your..." [ref=e467]
            - generic [ref=e469]:
              - generic [ref=e470]:
                - generic [ref=e471]: 📄 Trade Publication
                - generic [ref=e472]: NEWS
              - heading "How HealthChain Helps Bridge Communication Gaps with Your..." [level=3] [ref=e473]
              - paragraph [ref=e474]: Ever felt unheard by your doctor? HealthChain equips you with organized health summaries and differential discussion points.
          - generic [ref=e480]:
            - generic [ref=e481]:
              - generic [ref=e482]: 🛡️ Encrypted Vault
              - generic [ref=e483]: 100% PRIVATE
            - heading "Reviewed & Encrypted Before It Goes Live" [level=3] [ref=e484]
            - paragraph [ref=e485]: Every piece is checked and verified client-side so nothing leaves your device without explicit permission.
          - generic [ref=e486]:
            - img "Direct Matching to Active Clinical Trials & NIH Studies" [ref=e488]
            - generic [ref=e490]:
              - generic [ref=e491]:
                - generic [ref=e492]: 🔬 Clinical Trials
                - generic [ref=e493]: PEER-REVIEWED
              - heading "Direct Matching to Active Clinical Trials & NIH Studies" [level=3] [ref=e494]
              - paragraph [ref=e495]: Instantly correlates unresolved symptom clusters with current recruiting trials and published landmark breakthroughs.
          - generic [ref=e496]:
            - img "How HealthChain Helps Bridge Communication Gaps with Your..." [ref=e498]
            - generic [ref=e500]:
              - generic [ref=e501]:
                - generic [ref=e502]: 📄 Trade Publication
                - generic [ref=e503]: NEWS
              - heading "How HealthChain Helps Bridge Communication Gaps with Your..." [level=3] [ref=e504]
              - paragraph [ref=e505]: Ever felt unheard by your doctor? HealthChain equips you with organized health summaries and differential discussion points.
          - generic [ref=e511]:
            - generic [ref=e512]:
              - generic [ref=e513]: 🛡️ Encrypted Vault
              - generic [ref=e514]: 100% PRIVATE
            - heading "Reviewed & Encrypted Before It Goes Live" [level=3] [ref=e515]
            - paragraph [ref=e516]: Every piece is checked and verified client-side so nothing leaves your device without explicit permission.
          - generic [ref=e517]:
            - img "Direct Matching to Active Clinical Trials & NIH Studies" [ref=e519]
            - generic [ref=e521]:
              - generic [ref=e522]:
                - generic [ref=e523]: 🔬 Clinical Trials
                - generic [ref=e524]: PEER-REVIEWED
              - heading "Direct Matching to Active Clinical Trials & NIH Studies" [level=3] [ref=e525]
              - paragraph [ref=e526]: Instantly correlates unresolved symptom clusters with current recruiting trials and published landmark breakthroughs.
      - button "Start Your Free Case Dossier" [ref=e528] [cursor=pointer]
    - generic [ref=e532]:
      - generic [ref=e533]:
        - generic [ref=e534]: REAL-WORLD DIAGNOSTIC RESOLUTIONS
        - heading "When Tests Look Normal, Specialists Connect the Dots" [level=2] [ref=e545]
        - paragraph [ref=e546]: Explore real multi-system cases where standard 15-minute visits stalled, but our AI clinical specialists uncovered hidden root causes.
      - generic [ref=e547]:
        - 'button "Explore case: Subclinical Ferritin Depletion & Post-Viral Autonomic Fatigue. Correlated standard \"normal\" iron (65 μg/dL) with depleted ferritin (18 ng/mL) and blunted morning cortisol curve—explaining severe afternoon brain fog." [ref=e548] [cursor=pointer]':
          - generic [ref=e549]: "#1"
          - generic [ref=e550]:
            - generic [ref=e551]:
              - generic [ref=e552]:
                - generic [ref=e553]: 🔬
                - heading "Subclinical Ferritin Depletion & Post-Viral Autonomic Fatigue" [level=3] [ref=e554]
              - generic [ref=e555]: 96% Match
            - paragraph [ref=e556]: Correlated standard "normal" iron (65 μg/dL) with depleted ferritin (18 ng/mL) and blunted morning cortisol curve—explaining severe afternoon brain fog.
            - generic [ref=e557]:
              - generic [ref=e558]:
                - generic [ref=e559]: 🔬 Endocrinology & Neurology
                - generic [ref=e560]: •
                - generic [ref=e561]: "#1 in Endocrinology · 2 days ago · 3,420 matched cases"
              - generic [ref=e562]: Test with your symptoms
        - 'button "Explore case: Histamine-Mediated Neuro-Vascular Migraine with Morning Spikes. Identified gut-brain axis dysbiosis with histamine sensitivity triggering daily throbbing occipital pressure and morning vasomotor blood pressure spikes." [ref=e566] [cursor=pointer]':
          - generic [ref=e567]: "#2"
          - generic [ref=e568]:
            - generic [ref=e569]:
              - generic [ref=e570]:
                - generic [ref=e571]: 🧠
                - heading "Histamine-Mediated Neuro-Vascular Migraine with Morning Spikes" [level=3] [ref=e572]
              - generic [ref=e573]: 94% Match
            - paragraph [ref=e574]: Identified gut-brain axis dysbiosis with histamine sensitivity triggering daily throbbing occipital pressure and morning vasomotor blood pressure spikes.
            - generic [ref=e575]:
              - generic [ref=e576]:
                - generic [ref=e577]: 🔬 Neurology & Gastroenterology
                - generic [ref=e578]: •
                - generic [ref=e579]: "#1 in Neurology · 3 days ago · 2,890 matched cases"
              - generic [ref=e580]: Test with your symptoms
        - 'button "Explore case: Gastrocardiac (Roemheld) Post-Meal Palpitations & Vagal Irritation. Traced sinus tachycardia and lightheadedness after meals to splanchnic blood pooling and diaphragmatic vagus nerve compression." [ref=e584] [cursor=pointer]':
          - generic [ref=e585]: "#3"
          - generic [ref=e586]:
            - generic [ref=e587]:
              - generic [ref=e588]:
                - generic [ref=e589]: 🫀
                - heading "Gastrocardiac (Roemheld) Post-Meal Palpitations & Vagal Irritation" [level=3] [ref=e590]
              - generic [ref=e591]: 93% Match
            - paragraph [ref=e592]: Traced sinus tachycardia and lightheadedness after meals to splanchnic blood pooling and diaphragmatic vagus nerve compression.
            - generic [ref=e593]:
              - generic [ref=e594]:
                - generic [ref=e595]: 🔬 Cardiology & Gastroenterology
                - generic [ref=e596]: •
                - generic [ref=e597]: "#1 in Cardiology · 4 days ago · 4,110 matched cases"
              - generic [ref=e598]: Test with your symptoms
        - 'button "Explore case: Mast Cell Mediator Release & Postural Tachycardia Overlap. Identified episodic facial flushing, dermographia, and postural heart rate spikes matching hyperadrenergic POTS / MCAS overlap profile." [ref=e602] [cursor=pointer]':
          - generic [ref=e603]: "#4"
          - generic [ref=e604]:
            - generic [ref=e605]:
              - generic [ref=e606]:
                - generic [ref=e607]: 🛡️
                - heading "Mast Cell Mediator Release & Postural Tachycardia Overlap" [level=3] [ref=e608]
              - generic [ref=e609]: 91% Match
            - paragraph [ref=e610]: Identified episodic facial flushing, dermographia, and postural heart rate spikes matching hyperadrenergic POTS / MCAS overlap profile.
            - generic [ref=e611]:
              - generic [ref=e612]:
                - generic [ref=e613]: 🔬 Immunology & Cardiology
                - generic [ref=e614]: •
                - generic [ref=e615]: "#1 in Immunology · 5 days ago · 1,940 matched cases"
              - generic [ref=e616]: Test with your symptoms
        - generic [ref=e620]:
          - generic [ref=e621]:
            - generic [ref=e622]: ●
            - generic [ref=e623]: LATEST CLINICAL CONSENSUS ACTIVITY
          - generic [ref=e624]:
            - 'button "Explore case: Iron Panel & Ferritin mapped for patient in Chicago" [ref=e625] [cursor=pointer]':
              - generic [ref=e626]: 🧪
              - generic [ref=e627]: Iron Panel & Ferritin mapped for patient in Chicago
              - generic [ref=e628]: · 1m ago
            - 'button "Explore case: POTS Tilt Correlation for patient in London" [ref=e629] [cursor=pointer]':
              - generic [ref=e630]: 🧠
              - generic [ref=e631]: POTS Tilt Correlation for patient in London
              - generic [ref=e632]: · 4m ago
            - 'button "Explore case: Thyroid Free T3/T4 ratio analyzed" [ref=e633] [cursor=pointer]':
              - generic [ref=e634]: 🔬
              - generic [ref=e635]: Thyroid Free T3/T4 ratio analyzed
              - generic [ref=e636]: · 16m ago
            - 'button "Explore case: Histamine elimination brief generated" [ref=e637] [cursor=pointer]':
              - generic [ref=e638]: 🩺
              - generic [ref=e639]: Histamine elimination brief generated
              - generic [ref=e640]: · 27m ago
            - 'button "Explore case: Resting ECG & Holter cross-analyzed" [ref=e641] [cursor=pointer]':
              - generic [ref=e642]: 🫀
              - generic [ref=e643]: Resting ECG & Holter cross-analyzed
              - generic [ref=e644]: · 33m ago
    - generic [ref=e646]:
      - heading "Tired of hearing \"All your tests are normal\" while you still feel sick?" [level=2] [ref=e647]
      - paragraph [ref=e648]: The average chronic patient spends years visiting 5+ disconnected specialists, repeating expensive blood tests, and receiving contradictory advice. Standard 15-minute doctor appointments simply don't have time to connect the dots across your gut, hormones, nervous system, and history.
      - paragraph [ref=e649]: HealthChain360.ai replaces medical guesswork with autonomous multi-specialist intelligence. We correlate your symptoms, labs, and history into a unified clinical brief with ranked differentials and doctor-ready questions.
    - generic [ref=e650]:
      - generic [ref=e651]:
        - generic [ref=e652]: CLINICAL ARCHITECTURE
        - heading "Engineered for Complex Cases" [level=2] [ref=e653]
        - paragraph [ref=e654]: Why standard medical search engines fail chronic patients and how HealthChain360.ai fixes it.
      - generic [ref=e655]:
        - generic [ref=e656]:
          - heading "Multi-Specialist AI Perspectives" [level=3] [ref=e668]
          - paragraph [ref=e669]: Instead of a single AI giving a generic answer, clinical specialists evaluate your case independently, then debate and cross-examine evidence to uncover multi-system interactions.
        - generic [ref=e670]:
          - heading "Biomarker Synthesis" [level=3] [ref=e676]
          - paragraph [ref=e677]: Upload raw blood test results, PDFs, or photos. The engine spots suboptimal patterns standard "normal ranges" overlook.
        - generic [ref=e678]:
          - heading "Grounded Evidence" [level=3] [ref=e682]
          - paragraph [ref=e683]: Every differential and suggested inquiry cites peer-reviewed PubMed and clinical trial literature.
        - generic [ref=e684]:
          - heading "Doctor-Ready Consultation Dossier" [level=3] [ref=e689]
          - paragraph [ref=e690]: Export an organized 1-page clinical summary formatted specifically for your doctor, complete with prioritized questions and recommended follow-up tests.
    - generic [ref=e691]:
      - generic [ref=e692]:
        - heading "Frequently Asked Questions" [level=2] [ref=e693]
        - paragraph [ref=e694]: Everything you need to know about the platform and your privacy.
      - generic [ref=e695]:
        - button "Is HealthChain360.ai a replacement for my doctor?" [ref=e697] [cursor=pointer]
        - button "How is my medical data secured?" [ref=e702] [cursor=pointer]
        - button "How do the Deep Collaborative Specialists work?" [ref=e707] [cursor=pointer]
        - button "Are the AI agents trained on real medical literature?" [ref=e712] [cursor=pointer]
  - contentinfo [ref=e716]:
    - generic [ref=e717]:
      - generic [ref=e718]:
        - generic [ref=e719]:
          - img "HealthChain360.ai" [ref=e720]
          - generic [ref=e721]: HealthChain360.ai
        - paragraph [ref=e722]: AI-assisted health assessment and clinician-visit preparation, built for clinical clarity and privacy.
      - generic [ref=e723]:
        - heading "Product" [level=4] [ref=e724]
        - link "Health Today" [ref=e725] [cursor=pointer]:
          - /url: /app/today
        - link "Pricing" [ref=e726] [cursor=pointer]:
          - /url: /pricing
        - link "Changelog" [ref=e727] [cursor=pointer]:
          - /url: /changelog
      - generic [ref=e728]:
        - heading "Company" [level=4] [ref=e729]
        - link "Terms of Service" [ref=e730] [cursor=pointer]:
          - /url: /terms
        - link "Privacy Policy" [ref=e731] [cursor=pointer]:
          - /url: /privacy
        - link "Contact Us" [ref=e732] [cursor=pointer]:
          - /url: mailto:healthchain360@gmail.com
    - paragraph [ref=e734]: © 2026 HealthChain360.ai. All rights reserved.
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