import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Stethoscope, 
  ChevronRight, 
  Search, 
  ArrowRight,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { ALL_SPECIALISTS } from '../../data/specialists';
import { SpecialistPanel } from '../mdt/MultiSpecialistComponents';
import { createCaseDraft, saveReviewSnapshot } from '../../services/CaseEngine';

const cachedQuickConsultStreams: any = {};

export default function QuickConsult() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'select' | 'chat' | 'done'>('select');
  const [selectedSpecialist, setSelectedSpecialist] = useState<any>(null);
  const [symptomInput, setSymptomInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [finalTranscripts, setFinalTranscripts] = useState<any>({});
  const [activeCase, setActiveCase] = useState<any>(null);

  const filteredSpecialists = ALL_SPECIALISTS.filter((s) =>
    s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartConsult = async () => {
    if (!selectedSpecialist || !symptomInput.trim()) return;
    
    const caseTitle = symptomInput.split(' ').slice(0, 5).join(' ') + '...';
    const newCase = createCaseDraft({
      title: caseTitle,
      intakeData: { chiefComplaint: symptomInput },
      specialists: [selectedSpecialist.label]
    });
    
    setActiveCase(newCase);
    setPhase('chat');
  };

  const handleComplete = (id: string, messages: any[]) => {
    setFinalTranscripts({ [id]: messages });
    setPhase('done');
    
    if (activeCase) {
      const aiMessages = messages.filter(m => m.role === 'ai' && !m.text.includes('ANALYSIS_COMPLETE'));
      const summaryMessage = aiMessages[aiMessages.length - 1];
      let reportData = {
        executiveSummary: "Assessment completed by " + selectedSpecialist.label,
        topDiagnoses: [],
        recommendedActionPlan: [],
        fullTranscript: messages
      };
      
      try {
         if (summaryMessage && summaryMessage.text.includes('{')) {
             const jsonMatch = summaryMessage.text.match(/\{[\s\S]*\}/);
             if (jsonMatch) {
                 const parsed = JSON.parse(jsonMatch[0]);
                 if (parsed.currentHypotheses) {
                     reportData.executiveSummary = parsed.internalThoughts || reportData.executiveSummary;
                     reportData.topDiagnoses = parsed.currentHypotheses.map(h => ({ condition: h, confidence: 50 }));
                 }
             }
         }
      } catch(e) {}
      
      saveReviewSnapshot({
        caseId: activeCase.id,
        type: 'parallel',
        report: reportData,
        transcripts: { [id]: messages },
        specialists: [selectedSpecialist.label],
        basedOnEvidenceIds: []
      });
    }
  };

  useEffect(() => {
    // Default select GP if available
    if (phase === 'select' && !selectedSpecialist && !searchQuery) {
      const gp = ALL_SPECIALISTS.find(s => s.id === 'gp');
      if (gp) setSelectedSpecialist(gp);
    }
  }, [phase, selectedSpecialist, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-blue-600" />
              Quick Consult
            </h1>
            <p className="text-sm text-gray-500 mt-1">One-on-one specialist assessment</p>
          </div>
          {phase !== 'select' && (
            <button 
              onClick={() => {
                setPhase('select');
                setSymptomInput('');
                setSelectedSpecialist(null);
                setFinalTranscripts({});
              }}
              className="text-sm text-blue-600 font-medium hover:text-blue-700"
            >
              Start New
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {phase === 'select' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">What brings you here today?</h2>
                <textarea
                  value={symptomInput}
                  onChange={(e) => setSymptomInput(e.target.value)}
                  placeholder="Describe your symptoms, how long you've had them, and anything else relevant..."
                  className="w-full h-32 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Select a Specialist</h2>
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-48"
                    />
                  </div>
                </div>

                <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
                  {filteredSpecialists.map((s) => {
                    const Icon = s.icon;
                    const isSelected = selectedSpecialist?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSpecialist(s)}
                        className={`flex-shrink-0 w-40 p-4 rounded-xl text-left border transition-all snap-start ${
                          isSelected 
                            ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/50' 
                            : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                          style={{ backgroundColor: s.bg, color: s.color }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <h3 className="font-medium text-gray-900 text-sm">{s.label}</h3>
                        <p className="text-xs text-gray-500 mt-1">{s.desc}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleStartConsult}
                    disabled={!selectedSpecialist || !symptomInput.trim()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Start Consult
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {phase === 'chat' && selectedSpecialist && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="flex-1 overflow-y-auto mb-4 -mx-6 px-6">
                 <SpecialistPanel
                  specialist={selectedSpecialist}
                  isRunning={true}
                  isPaused={false}
                  index={0}
                  onComplete={handleComplete}
                  allSpecialists={[selectedSpecialist]}
                  intakeData={{ chiefComplaint: symptomInput }}
                  activeDifferentials={[]}
                  cachedSpecialistStreams={cachedQuickConsultStreams}
                />
              </div>
            </motion.div>
          )}

          {phase === 'done' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center max-w-2xl mx-auto"
            >
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Assessment Complete</h2>
              <p className="text-gray-600 mb-8">
                Your consultation with the {selectedSpecialist?.label} has concluded and your case has been saved.
              </p>

              <div className="space-y-4">
                <button 
                  onClick={() => navigate(`/app/cases/${activeCase?.id}`)}
                  className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 flex items-center justify-center gap-2 transition-all"
                >
                  <FileText className="w-5 h-5" />
                  View Case Summary
                </button>
                
                <button 
                  onClick={() => navigate('/app/collab')}
                  className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Escalate to Collaborative Specialists</div>
                      <div className="text-sm text-indigo-100 font-normal">Get a second opinion from multiple doctors</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
