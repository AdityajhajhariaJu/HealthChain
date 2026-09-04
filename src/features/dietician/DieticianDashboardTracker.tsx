import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Plus, Minus, BookOpen, Clock, Activity, Sparkles, Droplet, Trash2, ArrowRight } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { triggerHapticLight } from '../../services/haptics';

export function DieticianDashboardTracker({ 
  profile, 
  foodLogs, 
  currentDate, 
  waterGlasses = 0,
  onLogMeal, 
  onDeleteMeal,
  onUpdateHydration,
  onSnap, 
  onOpenSettings,
  onOpenGallery,
  onOpenSavedMeals
}: any) {
  const navigate = useNavigate();
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
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
      
      {/* 1. Fasting & Hydration Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
        {/* Fasting Card */}
        <div style={{
          background: '#FFF', borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', border: '1px solid #F1F5F9'
        }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div style={{ background: '#F8FAFC', width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={20} color="#0F172A" />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '2px' }}>Intermittent Fasting</div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>Target Window</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{profile?.mealSchedule?.includes('16:8') ? '16:8 Protocol' : '14 hrs Active'}</div>
            </div>
          </div>
          <button onClick={onOpenSettings} style={{ background: '#0F172A', color: '#FFF', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
            Configure
          </button>
        </div>

        {/* Daily Hydration Card */}
        <div style={{
          background: '#FFF', borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', border: '1px solid #F1F5F9'
        }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div style={{ background: '#EFF6FF', width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Droplet size={20} color="#0284C7" />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '2px' }}>Cellular Hydration</div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>{waterGlasses * 250}ml of 2,000ml (Target: 8 glasses)</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0284C7' }}>{waterGlasses} / 8 Glasses</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => onUpdateHydration && onUpdateHydration(-1)}
              disabled={waterGlasses <= 0}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '1px solid #E2E8F0',
                background: '#FFF',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: waterGlasses <= 0 ? 'not-allowed' : 'pointer',
                opacity: waterGlasses <= 0 ? 0.4 : 1,
              }}
              title="Remove glass"
              aria-label="Remove 1 glass of water"
            >
              <Minus size={14} />
            </button>
            <button
              onClick={() => onUpdateHydration && onUpdateHydration(1)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
              }}
              title="Add 1 glass (250ml)"
              aria-label="Add 1 glass of water (250ml)"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Budget Card */}
        <div style={{ position: 'relative' }}>
          {/* Aesthetic background blobs so the glassmorphism has something to blur! */}
          <div style={{ position: 'absolute', top: '10%', left: '10%', width: '120px', height: '120px', background: '#A7F3D0', borderRadius: '50%', filter: 'blur(40px)', zIndex: 0 }} />
          <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '150px', height: '150px', background: '#DBEAFE', borderRadius: '50%', filter: 'blur(50px)', zIndex: 0 }} />
          <div style={{ position: 'absolute', top: '40%', right: '30%', width: '100px', height: '100px', background: '#FDE68A', borderRadius: '50%', filter: 'blur(40px)', zIndex: 0 }} />
          
          <div className="hide-scrollbar scrollable-row" style={{background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 100%)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', border: '1px solid rgba(255, 255, 255, 0.8)', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255,255,255,0.7), inset 0 0 30px rgba(255,255,255,0.4)', borderRadius: '32px',
            padding: '24px 16px',
            display: 'flex',
            flexWrap: 'nowrap',
            overflowX: 'auto',
            position: 'relative',
            zIndex: 1,
            gap: '16px',
            paddingBottom: '16px',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch'}}>
          <CircularProgress value={consumedProtein} max={targetProtein} color="#10B981" trackColor="#D1FAE5" title="Protein" subtitle={`${targetProtein}g`} />
          <CircularProgress value={consumedCarbs} max={targetCarbs} color="#3B82F6" trackColor="#DBEAFE" title="Carbs" subtitle={`${targetCarbs}g`} />
          <CircularProgress value={consumedSugar} max={targetSugar} color="#E879F9" trackColor="#FAE8FF" title="Sugar" subtitle={`${targetSugar}g`} />
          <CircularProgress value={consumedFibre} max={targetFibre} color="#8B5CF6" trackColor="#EDE9FE" title="Fibre" subtitle={`${targetFibre}g`} />
          <CircularProgress value={consumedFats} max={targetFats} color="#F59E0B" trackColor="#FEF3C7" title="Fats" subtitle={`${targetFats}g`} />
          <CircularProgress value={consumed} max={targetCalories} color="#EF4444" trackColor="#FEE2E2" title="Calories" subtitle={`${targetCalories} kcal`} />
          </div>
        </div>

      {/* 3. Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px' }}>
        <button onClick={() => navigate('/app/nutrition-log')} style={{ background: '#FFF', padding: '16px', borderRadius: '16px', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', cursor: 'pointer', fontWeight: 700, color: '#0F172A', fontSize: '14px', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
          <div style={{ background: '#8B5CF6', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={16} color="#FFF" />
          </div>
          ⚡ Ambient Log
        </button>
        <button onClick={onOpenGallery} style={{ background: '#FFF', padding: '16px', borderRadius: '16px', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', cursor: 'pointer', fontWeight: 700, color: '#0F172A', fontSize: '14px', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
          <div style={{ background: '#0F172A', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Camera size={16} color="#FFF" />
          </div>
          Snap Gallery
        </button>
        <button onClick={onOpenSavedMeals} style={{ background: '#FFF', padding: '16px', borderRadius: '16px', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', cursor: 'pointer', fontWeight: 700, color: '#0F172A', fontSize: '14px', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
          <div style={{ background: '#0F172A', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={16} color="#FFF" />
          </div>
          Saved Meals
        </button>
        <button onClick={onOpenSettings} style={{ background: '#FFF', padding: '16px', borderRadius: '16px', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', cursor: 'pointer', fontWeight: 700, color: '#0F172A', fontSize: '14px', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
          <div style={{ background: '#059669', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={16} color="#FFF" />
          </div>
          Diet & Goals
        </button>
      </div>

      {/* Ava Clinical Nutritionist Bridge Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        borderRadius: '20px',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: '#FFFFFF',
        boxShadow: '0 4px 15px rgba(15, 23, 42, 0.15)',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sparkles size={20} color="#38BDF8" />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>Ava Clinical Nutritionist</div>
            <div style={{ fontSize: '12px', color: '#94A3B8' }}>
              {consumed === 0
                ? 'Ask for personalized Indian meal suggestions tailored to your biomarkers'
                : `${consumed} / ${targetCalories} kcal logged • Review macro split & glycemic index balance`}
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            triggerHapticLight();
            navigate('/app/ava', {
              state: {
                initialPrompt: `Hi Ava, here is my daily nutrition intake for today: Consumed ${consumed} kcal (Target: ${targetCalories} kcal), Protein: ${Math.round(consumedProtein)}g / ${targetProtein}g, Carbs: ${Math.round(consumedCarbs)}g / ${targetCarbs}g, Fats: ${Math.round(consumedFats)}g / ${targetFats}g, Fibre: ${Math.round(consumedFibre)}g / ${targetFibre}g, Hydration: ${waterGlasses} / 8 glasses. What adjustments should I make for remaining meals according to my health goals?`
              }
            });
          }}
          style={{
            background: 'linear-gradient(135deg, #38BDF8 0%, #0284C7 100%)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '12px',
            padding: '9px 18px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 10px rgba(56, 189, 248, 0.3)',
            whiteSpace: 'nowrap',
            alignSelf: isMobile ? 'stretch' : 'auto',
            justifyContent: 'center'
          }}
        >
          Discuss Nutrition with Ava <ArrowRight size={14} />
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
                <div 
                  onClick={() => onLogMeal(meal.name)} 
                  role="button"
                  tabIndex={0}
                  aria-label={`Log meal for ${meal.name}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onLogMeal(meal.name);
                    }
                  }}
                  style={{ background: '#FFF', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', border: '1px dashed #E2E8F0', color: '#94A3B8', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'background 0.2s, transform 0.1s' }} 
                  onMouseOver={(e) => e.currentTarget.style.background = '#F8FAFC'} 
                  onMouseOut={(e) => e.currentTarget.style.background = '#FFF'} 
                  onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'} 
                  onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {meal.name === 'Breakfast' && 'Hey, here are some Healthy Breakfast Suggestions for you'}
                  {meal.name === 'Morning Snack' && 'Get energized by grabbing a morning snack 🥜'}
                  {meal.name === 'Lunch' && 'Don\'t miss lunch 🍱 It\'s time to get a tasty meal'}
                  {meal.name === 'Evening Snack' && 'Refuel your body with a delicious evening snack 🍐'}
                  {meal.name === 'Dinner' && 'An early dinner can help you sleep better 🍽️😴'}
                </div>
              )}

              {mealConsumed > 0 && Array.isArray(foodLogs[currentDate]) && foodLogs[currentDate].filter((l: any) => l.type === meal.name || (meal.name === 'Morning Snack' && l.type === 'Snack')).map((log: any, idx2: number) => (
                  <div key={idx2} style={{ background: '#FFF', borderRadius: '14px', padding: '14px 16px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', border: '1px solid #F1F5F9', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: '10px' }}>
                    <div style={{ flex: 1, minWidth: '160px' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '15px' }}>{log.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#EF4444' }}>🔥 {log.calories} kcal</span>
                        <span style={{ fontWeight: 600, color: '#10B981' }}>🥩 {log.protein || 0}g P</span>
                        <span style={{ fontWeight: 600, color: '#3B82F6' }}>🍚 {log.carbs || 0}g C</span>
                        <span style={{ fontWeight: 600, color: '#F59E0B' }}>🥑 {log.fat || log.fats || 0}g F</span>
                        {(log.fibre || log.fiber) ? <span style={{ fontWeight: 600, color: '#8B5CF6' }}>🌾 {log.fibre || log.fiber}g Fibre</span> : null}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => {
                          triggerHapticLight();
                          navigate('/app/ava', {
                            state: {
                              initialPrompt: `Hi Ava, I logged "${log.name}" (${log.calories} kcal, ${log.protein || 0}g protein, ${log.carbs || 0}g carbs, ${log.fat || log.fats || 0}g fat). What are its clinical glycemic index impact and micronutrient benefits for my metabolic profile?`
                            }
                          });
                        }}
                        style={{
                          background: '#EEF2FF',
                          color: '#4F46E5',
                          border: '1px solid #C7D2FE',
                          borderRadius: '10px',
                          padding: '6px 12px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.15s'
                        }}
                        title="Discuss this meal with Ava"
                        aria-label={`Discuss ${log.name} with Ava`}
                      >
                        <Sparkles size={13} /> Ava Review
                      </button>
                      {onDeleteMeal && (
                        <button
                          onClick={() => onDeleteMeal(log.id)}
                          style={{
                            background: '#FEF2F2',
                            color: '#EF4444',
                            border: '1px solid #FEE2E2',
                            borderRadius: '10px',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s'
                          }}
                          title="Delete meal log"
                          aria-label={`Delete ${log.name}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
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
