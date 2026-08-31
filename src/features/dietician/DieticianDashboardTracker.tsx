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

      {/* 2. Main Budget Card */}
      <div style={{
        background: '#FFF', borderRadius: '16px', padding: '24px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '50%', border: '4px solid #F1F5F9', borderTopColor: '#F97316',
            borderRightColor: consumed > targetCalories * 0.25 ? '#F97316' : '#F1F5F9',
            borderBottomColor: consumed > targetCalories * 0.5 ? '#F97316' : '#F1F5F9',
            borderLeftColor: consumed > targetCalories * 0.75 ? '#F97316' : '#F1F5F9',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Activity size={24} color="#F97316" />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
              {Math.round(consumed)} of {targetCalories}
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>Cal Eaten</div>
          </div>
        </div>
        <button onClick={onOpenSettings} style={{ background: '#FFF7ED', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
          <BarChart2 size={18} color="#F97316" />
        </button>
      </div>

      {/* 3. Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <button onClick={onOpenGallery} style={{ background: '#FFF', padding: '16px', borderRadius: '16px', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', cursor: 'pointer', fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>
          <div style={{ background: '#0F172A', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Camera size={16} color="#FFF" />
          </div>
          Snap Gallery
        </button>
        <button style={{ background: '#FFF', padding: '16px', borderRadius: '16px', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', cursor: 'pointer', fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>
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

      {/* 5. Floating Snap Button */}
      <div style={{ position: 'fixed', bottom: '80px', right: '20px', zIndex: 50 }}>
        <button onClick={onSnap} style={{ background: '#0F172A', color: '#FFF', border: 'none', borderRadius: '100px', padding: '16px 24px', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.3)', cursor: 'pointer', transition: 'transform 0.2s' }}>
          <Camera size={22} /> Snap
        </button>
      </div>
    </div>
  );
}
