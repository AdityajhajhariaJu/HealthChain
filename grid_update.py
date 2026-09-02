import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\DieticianDashboardTracker.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the calculations at the top
calc_find = "const consumed = Array.isArray(foodLogs[currentDate]) \n    ? foodLogs[currentDate].reduce((acc: number, log: any) => acc + (log.calories || 0), 0)\n    : 0;"

calc_replace = """  const consumed = Array.isArray(foodLogs[currentDate]) 
    ? foodLogs[currentDate].reduce((acc: number, log: any) => acc + (log.calories || 0), 0)
    : 0;
    
  const consumedProtein = Array.isArray(foodLogs[currentDate]) 
    ? foodLogs[currentDate].reduce((acc: number, log: any) => acc + (log.protein || 0), 0)
    : 0;
    
  const consumedCarbs = Array.isArray(foodLogs[currentDate]) 
    ? foodLogs[currentDate].reduce((acc: number, log: any) => acc + (log.carbs || 0), 0)
    : 0;
    
  const consumedFats = Array.isArray(foodLogs[currentDate]) 
    ? foodLogs[currentDate].reduce((acc: number, log: any) => acc + (log.fat || log.fats || 0), 0)
    : 0;
    
  const targetProtein = profile?.targetProtein || 135;
  const targetCarbs = profile?.targetCarbs || 200;
  const targetFats = profile?.targetFat || 75;
  
  const CircularProgress = ({ value, max, color, title, subtitle }: any) => {
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const percent = Math.min(value / (max || 1), 1);
    const offset = circumference - percent * circumference;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{title}</div>
        <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="40" cy="40" r={radius} fill="none" stroke={color} strokeWidth="6" strokeOpacity="0.2" />
            <circle cx="40" cy="40" r={radius} fill="none" stroke={color} strokeWidth="6" 
              strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" 
              style={{ transition: 'stroke-dashoffset 0.5s ease' }} 
            />
          </svg>
          <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', lineHeight: '1.2' }}>{Math.round(value)}</span>
            <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 500 }}>{subtitle}</span>
          </div>
        </div>
      </div>
    );
  };
"""

content = content.replace(calc_find, calc_replace)

# 2. Replace the Main Budget Card section
card_start_idx = content.find("{/* 2. Main Budget Card */}")
card_end_idx = content.find("{/* 3. Quick Actions */}")

new_card = """{/* 2. Main Budget Card (2x2 Grid) */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
        justifyItems: 'center'
      }}>
        <CircularProgress value={consumedProtein} max={targetProtein} color="#10B981" title="Protein" subtitle={${targetProtein}g} />
        <CircularProgress value={consumedCarbs} max={targetCarbs} color="#3B82F6" title="Carbs" subtitle={${targetCarbs}g} />
        <CircularProgress value={consumedFats} max={targetFats} color="#F59E0B" title="Fats" subtitle={${targetFats}g} />
        <CircularProgress value={consumed} max={targetCalories} color="#EF4444" title="Calorie Intake" subtitle={${targetCalories} kcal} />
      </div>

      """

if card_start_idx != -1 and card_end_idx != -1:
    content = content[:card_start_idx] + new_card + content[card_end_idx:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated 2x2 grid!")
