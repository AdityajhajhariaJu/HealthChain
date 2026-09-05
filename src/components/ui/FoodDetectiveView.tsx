import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, AlertTriangle, CheckCircle2, ChevronRight, RefreshCw, Filter, ShieldCheck, ArrowRight } from 'lucide-react';
import { FOOD_DATABASE, CLINICAL_SENSITIVITIES, FoodItem } from '../../services/TriggerEngine';
import { triggerHapticLight } from '../../services/haptics';

interface FoodDetectiveViewProps {
  onSelectSubstitute?: (foodName: string) => void;
}

export const FoodDetectiveView: React.FC<FoodDetectiveViewProps> = ({ onSelectSubstitute }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSensitivity, setSelectedSensitivity] = useState<string>('all');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);

  const categories = ['All', 'Beverage', 'Dairy', 'Protein', 'Grain', 'Vegetable', 'Fruit', 'Snack'];

  const filteredFoods = FOOD_DATABASE.filter((food) => {
    const matchesSearch = food.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      food.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      food.sensitivityFlags.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || food.category === selectedCategory;
    const matchesSensitivity = selectedSensitivity === 'all' || food.sensitivityFlags.includes(selectedSensitivity);
    return matchesSearch && matchesCategory && matchesSensitivity;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Banner / Explanation */}
      <div
        style={{
          background: 'linear-gradient(135deg, #FFF1ED 0%, #FFEBE6 100%)',
          borderRadius: '20px',
          padding: '16px 18px',
          border: '1.5px solid #FCD9C6',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #FF6B4A 0%, #E11D48 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(255, 107, 74, 0.3)',
            flexShrink: 0,
          }}
        >
          <Search size={20} />
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#EA580C', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
            CLINICAL BIOCHEMICAL SCANNER
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#1C1917', lineHeight: 1.2 }}>
            Food Detective & 18 Sensitivity Lenses
          </div>
          <div style={{ fontSize: '12.5px', color: '#78716C', marginTop: '2px' }}>
            Look up any food to uncover hidden biogenic amines, fermentable carbs, and tailored safe substitutes.
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <div style={{ position: 'relative', width: '100%' }}>
        <Search
          size={18}
          color="#94A3B8"
          style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search avocado, sourdough, paneer, red wine..."
          aria-label="Search food database"
          style={{
            width: '100%',
            padding: '14px 16px 14px 44px',
            borderRadius: '999px',
            border: '1.5px solid #FED7C3',
            background: '#FFFFFF',
            fontSize: '14px',
            outline: 'none',
            color: '#1E293B',
            boxShadow: '0 4px 12px rgba(254, 215, 195, 0.25)',
            boxSizing: 'border-box',
          }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '50%',
              width: '22px',
              height: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748B',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Category Pills Bar */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => {
              triggerHapticLight();
              setSelectedCategory(cat);
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              border: selectedCategory === cat ? '1.5px solid #FF6B4A' : '1.5px solid #E2E8F0',
              background: selectedCategory === cat ? 'linear-gradient(135deg, #FF6B4A 0%, #FF8A65 100%)' : '#FFFFFF',
              color: selectedCategory === cat ? '#FFFFFF' : '#64748B',
              boxShadow: selectedCategory === cat ? '0 2px 8px rgba(255, 107, 74, 0.25)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Food Items Grid / List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredFoods.map((food) => {
          const isSelected = selectedFood?.id === food.id;
          const riskColor = food.riskLevel === 'High' ? '#EF4444' : food.riskLevel === 'Moderate' ? '#F59E0B' : '#10B981';
          const riskBg = food.riskLevel === 'High' ? '#FEF2F2' : food.riskLevel === 'Moderate' ? '#FFFBEB' : '#ECFDF5';

          return (
            <motion.div
              key={food.id}
              layout
              onClick={() => {
                triggerHapticLight();
                setSelectedFood(isSelected ? null : food);
              }}
              style={{
                background: '#FFFFFF',
                borderRadius: '18px',
                border: isSelected ? '1.5px solid #FF6B4A' : '1.5px solid #F1F5F9',
                padding: '14px 16px',
                boxShadow: isSelected ? '0 8px 24px rgba(255, 107, 74, 0.12)' : '0 2px 8px rgba(0, 0, 0, 0.03)',
                cursor: 'pointer',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '26px' }}>{food.emoji}</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#1C1917' }}>{food.name}</span>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: riskBg,
                          color: riskColor,
                          border: `1px solid ${riskColor}30`,
                        }}
                      >
                        {food.riskLevel} Risk
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                      {food.category} • Reaction window: <strong style={{ color: '#475569' }}>{food.reactionWindow}</strong>
                    </div>
                  </div>
                </div>

                <ChevronRight
                  size={18}
                  color="#94A3B8"
                  style={{
                    transform: isSelected ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </div>

              {/* Sensitivity Badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                {food.sensitivityFlags.length > 0 ? (
                  food.sensitivityFlags.map((flagId) => {
                    const sens = CLINICAL_SENSITIVITIES[flagId];
                    return (
                      <span
                        key={flagId}
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 9px',
                          borderRadius: '999px',
                          background: '#FFF1F2',
                          color: '#BE123C',
                          border: '1px solid #FECDD3',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>{sens?.icon || '⚠️'}</span>
                        <span>{sens?.name || flagId}</span>
                      </span>
                    );
                  })
                ) : (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 9px',
                      borderRadius: '999px',
                      background: '#ECFDF5',
                      color: '#059669',
                      border: '1px solid #A7F3D0',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>🛡️</span> Clinically Low Flare Risk
                  </span>
                )}
              </div>

              {/* Expanded Clinical Breakdown */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #F1F5F9' }}
                  >
                    {/* Clinical Biological Note */}
                    <div
                      style={{
                        background: '#F8FAFC',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        fontSize: '12.5px',
                        color: '#334155',
                        lineHeight: 1.5,
                        marginBottom: '12px',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <strong style={{ color: '#0F172A', display: 'block', marginBottom: '2px' }}>
                        Biochemical Analysis:
                      </strong>
                      {food.clinicalNote}
                    </div>

                    {/* Safe Substitutes Section */}
                    {food.safeSubstitutes.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                          Evidence-Based Safe Swaps:
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {food.safeSubstitutes.map((swap, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 12px',
                                borderRadius: '10px',
                                background: '#F0FDF4',
                                border: '1px solid #BBF7D0',
                                fontSize: '12.5px',
                                color: '#166534',
                                fontWeight: 600,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle2 size={14} color="#16A34A" />
                                <span>{swap}</span>
                              </div>
                              {onSelectSubstitute && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerHapticLight();
                                    onSelectSubstitute(swap);
                                  }}
                                  style={{
                                    background: '#DCFCE7',
                                    border: 'none',
                                    color: '#15803D',
                                    borderRadius: '6px',
                                    padding: '3px 8px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Use Swap
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {filteredFoods.length === 0 && (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              background: '#FFFFFF',
              borderRadius: '20px',
              border: '1.5px solid #F1F5F9',
              color: '#64748B',
            }}
          >
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔍</div>
            <strong style={{ display: 'block', color: '#1E293B', marginBottom: '4px' }}>
              No exact ingredient match
            </strong>
            <span style={{ fontSize: '13px' }}>
              Ask Ava directly in chat: "Can I eat {searchQuery}?" for immediate real-time AI metabolic analysis.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
