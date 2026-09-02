import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import
if 'generateNutritionalGuardrails' not in content:
    content = content.replace("generateDieticianAdvice,", "generateDieticianAdvice,\n  generateNutritionalGuardrails,")

if 'Activity' not in content:
    content = content.replace("Layers,", "Layers,\n  Activity,\n  Droplet,\n  Brain,\n  Flame,")

# 2. Add State Variables
if 'const [guardrails, setGuardrails]' not in content:
    state_vars = """
  const [guardrails, setGuardrails] = useState<any[]>([]);
  const [isGeneratingGuardrails, setIsGeneratingGuardrails] = useState(false);
"""
    content = content.replace("const [mealPlan, setMealPlan] = useState<any>(null);", "const [mealPlan, setMealPlan] = useState<any>(null);" + state_vars)

if 'setGuardrails(featData.guardrails)' not in content:
    init_code = """          if (featData.guardrails) setGuardrails(featData.guardrails);"""
    content = content.replace("if (featData.mealPlan) setMealPlan(featData.mealPlan);", "if (featData.mealPlan) setMealPlan(featData.mealPlan);\n" + init_code)

# 3. Add handleGenerateGuardrails
if 'const handleGenerateGuardrails' not in content:
    handler = """
  const handleGenerateGuardrails = async () => {
    if (isGeneratingGuardrails) return;
    setIsGeneratingGuardrails(true);
    try {
      const data = await generateNutritionalGuardrails(profile);
      if (data && data.guardrails) {
        if (isMounted.current) setGuardrails(data.guardrails);
        updateProfileFeatureData('dietician', { guardrails: data.guardrails });
        awardPoints(2, '🛡️ Shield Activated', 'health', `guardrails_${Date.now()}`);
        triggerHapticSuccess();
      } else {
        toast.error('Generation Failed', 'Could not synthesize medical guardrails. Please try again.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network Error', 'Failed to connect to AI matrix.');
    } finally {
      if (isMounted.current) setIsGeneratingGuardrails(false);
    }
  };
"""
    content = content.replace("const handleGeneratePlan = async () => {", handler + "\n  const handleGeneratePlan = async () => {")

# 4. Replace Tab 4 correctly. We know the old tab ends before `</AnimatePresence>`.
# The original code looks exactly like this at the end:
#             </div>
#           </motion.div>
#         )}
#       </AnimatePresence>

guardrails_jsx = """
          {/* TAB 4: CLINICAL GUARDRAILS */}
          {activeTab === 'guardrails' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : 'row', marginBottom: '20px', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                    Nutritional Guardrails & Bio-Compatibility Matrix
                  </h2>
                  <p style={{ color: '#64748B', margin: 0, fontSize: '14px' }}>
                    Autonomous clinical safety screening configured specifically to your medical profile.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={handleGenerateGuardrails}
                    disabled={isGeneratingGuardrails}
                    style={{
                      background: guardrails.length > 0 ? '#FFFFFF' : '#0F172A',
                      color: guardrails.length > 0 ? '#334155' : '#FFF',
                      border: guardrails.length > 0 ? '1px solid #CBD5E1' : 'none',
                      padding: '10px 16px',
                      borderRadius: '12px',
                      fontWeight: 700,
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: isGeneratingGuardrails ? 'not-allowed' : 'pointer',
                      opacity: isGeneratingGuardrails ? 0.7 : 1,
                    }}
                  >
                    {isGeneratingGuardrails ? (
                      <><Loader2 size={15} className="spin" /> Synthesizing...</>
                    ) : (
                      <><ShieldCheck size={15} /> {guardrails.length > 0 ? 'Recalibrate Guardrails' : 'Initialize Matrix'}</>
                    )}
                  </button>
                </div>
              </div>

              {guardrails.length === 0 && !isGeneratingGuardrails ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FFFFFF', borderRadius: '24px', border: '1px solid #E2E8F0' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px auto' }}>
                    <ShieldCheck size={32} />
                  </div>
                  <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0' }}>Matrix Offline</h3>
                  <p style={{ color: '#64748B', fontSize: '14.5px', maxWidth: '440px', margin: '0 auto 24px auto', lineHeight: 1.6 }}>
                    Generate your personalized safety guardrails to ensure your meal plan strictly adheres to your clinical needs and conditions.
                  </p>
                  <button onClick={handleGenerateGuardrails} style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#FFF', border: 'none', padding: '14px 28px', borderRadius: '14px', fontWeight: 800, fontSize: '15px', cursor: 'pointer' }}>
                    Initialize Matrix
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
                  {guardrails.map((gr: any, idx: number) => {
                    let IconComponent = ShieldCheck;
                    if (gr.icon === 'Zap') IconComponent = Zap;
                    if (gr.icon === 'Heart') IconComponent = Heart;
                    if (gr.icon === 'Layers') IconComponent = Layers;
                    if (gr.icon === 'Activity') IconComponent = Activity;
                    if (gr.icon === 'Droplet') IconComponent = Droplet;
                    if (gr.icon === 'Brain') IconComponent = Brain;
                    if (gr.icon === 'Flame') IconComponent = Flame;

                    let bgColor = '#F1F5F9';
                    let iconColor = '#64748B';
                    let targetColor = '#0F172A';
                    
                    if (gr.color === 'orange') { bgColor = '#FEF3C7'; iconColor = '#D97706'; targetColor = '#D97706'; }
                    if (gr.color === 'blue') { bgColor = '#EFF6FF'; iconColor = '#2563EB'; targetColor = '#2563EB'; }
                    if (gr.color === 'green') { bgColor = '#ECFDF5'; iconColor = '#059669'; targetColor = '#059669'; }
                    if (gr.color === 'purple') { bgColor = '#F3E8FF'; iconColor = '#7E22CE'; targetColor = '#7E22CE'; }
                    if (gr.color === 'red') { bgColor = '#FEE2E2'; iconColor = '#DC2626'; targetColor = '#DC2626'; }

                    return (
                      <div key={idx} style={{ background: '#FFFFFF', borderRadius: '24px', padding: '24px', border: '1px solid #E2E8F0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor }}>
                            <IconComponent size={18} />
                          </div>
                          <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>{gr.title}</h3>
                            <span style={{ fontSize: '12px', color: targetColor, fontWeight: 700 }}>{gr.target}</span>
                          </div>
                        </div>
                        <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, margin: '0 0 12px 0' }}>
                          {gr.description}
                        </p>
                        <div style={{ fontSize: '12px', background: '#F8FAFC', padding: '10px 14px', borderRadius: '10px', color: '#334155' }}>
                          <strong>Key Nutrients:</strong> {gr.keyNutrients}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
"""

start_idx = content.find("{/* TAB 4: CLINICAL GUARDRAILS */}")
end_idx = content.find("</AnimatePresence>", start_idx)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + guardrails_jsx + "        " + content[end_idx:]
else:
    print("Could not find boundaries")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Dietician.tsx guardrails properly")
