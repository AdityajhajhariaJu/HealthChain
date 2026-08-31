import React from 'react';
import { Camera, Plus, BarChart2, BookOpen, Clock, Activity } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';

export function DieticianDashboardTracker({ 
  profile, 
  foodLogs, 
  currentDate, 
  onLogMeal, 
  onSnap, 
  onOpenSettings,
  onOpenGallery
}: any) {
  const isMobile = useIsMobile();
  
  const targetCalories = profile?.targetCalories || 1850;
  
    const consumed = Array.isArray(foodLogs[currentDate]) 
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
  const targetSugar = profile?.targetSugar || 30;
  const targetFibre = profile?.targetFibre || 25;
  
  const consumedSugar = Array.isArray(foodLogs[currentDate]) 
    ? foodLogs[currentDate].reduce((acc: number, log: any) => acc + (log.sugar || 0), 0)
    : 0;
    
  const consumedFibre = Array.isArray(foodLogs[currentDate]) 
    ? foodLogs[currentDate].reduce((acc: number, log: any) => acc + (log.fibre || log.fiber || 0), 0)
    : 0;
  
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


  const mealConfig = [
    { name: 'Breakfast', percent: 0.25 },
    { name: 'Morning Snack', percent: 0.125 },
    { name: 'Lunch', percent: 0.25 },
    { name: 'Evening Snack', percent: 0.125 },
    { name: 'Dinner', percent: 0.25 }
  ];

  const getConsumedForMeal = (mealName: string) => {
    if (!Array.isArray(foodLogs[currentDate])) return 0;
    return foodLogs[currentDate]
      .filter((l: any) => l.type === mealName || (mealName === 'Morning Snack' && l.type === 'Snack'))
      .reduce((acc: number, l: any) => acc + (l.calories || 0), 0);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '100px', position: 'relative' }}>
      
      {/* 1. Fasting Widget */}
      <div style={{
        background: '#FFF', borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ background: '#F8FAFC', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={20} color="#0F172A" />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '2px' }}>Set up Intermittent Fasting</div>
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>Recommended Plan</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>14 hrs</div>
          </div>
        </div>
        <button style={{ background: '#0F172A', color: '#FFF', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
          Get Started
        </button>
      </div>

      {/* 2. Main Budget Card (2x2 Grid) */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '24px',
        justifyItems: 'center'
      }}>
        <CircularProgress value={consumedProtein} max={targetProtein} color="#10B981" title="Protein" subtitle={`${targetProtein}g`} />
        <CircularProgress value={consumedCarbs} max={targetCarbs} color="#3B82F6" title="Carbs" subtitle={`${targetCarbs}g`} />
        <CircularProgress value={consumedFats} max={targetFats} color="#F59E0B" title="Fats" subtitle={`${targetFats}g`} />
        <CircularProgress value={consumedSugar} max={targetSugar} color="#E879F9" title="Sugar" subtitle={`${targetSugar}g`} />
        <CircularProgress value={consumedFibre} max={targetFibre} color="#8B5CF6" title="Fibre" subtitle={`${targetFibre}g`} />
        <CircularProgress value={consumed} max={targetCalories} color="#EF4444" title="Calories" subtitle={`${targetCalories} kcal`} />
      </div>

      {/* 3. Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <button onClick={onOpenGallery} style={{ background: '#FFF', padding: '16px', borderRadius: '16px', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', cursor: 'pointer', fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>
          <div style={{ background: '#0F172A', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Camera size={16} color="#FFF" />
          </div>
          Snap Gallery
        </button>
        <button onClick={() => onLogMeal('Saved Meal')} style={{ background: '#FFF', padding: '16px', borderRadius: '16px', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', cursor: 'pointer', fontWeight: 700, color: '#0F172A', fontSize: '14px', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            <div style={{ background: '#0F172A', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={16} color="#FFF" />
            </div>
            Saved Meals
          </button>
      </div>

      {/* 4. Vertical Meal Tracker Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', marginTop: '16px' }}>
        {mealConfig.map((meal, idx) => {
          const mealBudget = Math.round(targetCalories * meal.percent);
          const mealConsumed = getConsumedForMeal(meal.name);
          
          return (
            <div key={idx}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>{meal.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 500 }}>{mealConsumed} of {mealBudget} Cal</span>
                  <button onClick={() => onLogMeal(meal.name)} style={{ background: '#F97316', color: '#FFF', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', boxShadow: '0 4px 10px rgba(249, 115, 22, 0.3)' }}>
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              
              {mealConsumed === 0 && (
                <div style={{ background: '#FFF', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', border: '1px dashed #E2E8F0', color: '#94A3B8', fontSize: '13px', fontWeight: 500 }}>
                  {meal.name === 'Breakfast' && 'Hey, here are some Healthy Breakfast Suggestions for you'}
                  {meal.name === 'Morning Snack' && 'Get energized by grabbing a morning snack 🥜'}
                  {meal.name === 'Lunch' && 'Don\'t miss lunch 🍱 It\'s time to get a tasty meal'}
                  {meal.name === 'Evening Snack' && 'Refuel your body with a delicious evening snack 🍐'}
                  {meal.name === 'Dinner' && 'An early dinner can help you sleep better 🍽️😴'}
                </div>
              )}

              {mealConsumed > 0 && Array.isArray(foodLogs[currentDate]) && foodLogs[currentDate].filter((l: any) => l.type === meal.name || (meal.name === 'Morning Snack' && l.type === 'Snack')).map((log: any, idx2: number) => (
                  <div key={idx2} style={{ background: '#FFF', borderRadius: '12px', padding: '16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '15px' }}>{log.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{log.calories} Cal • {log.protein}g Protein</div>
                    </div>
                  </div>
              ))}
            </div>
          );
        })}
      </div>


    </div>
  );
}
