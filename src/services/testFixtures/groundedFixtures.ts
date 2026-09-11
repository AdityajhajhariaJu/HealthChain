import { normalizeClinicalReview } from '../clinicalReview';
export const facts = [
  {id:'f1',fact:'Knee discomfort started on 2026-01-02.',source:'Patient intake',category:'user_report',timestamp:'2026-01-03T10:00:00Z',eventDate:'2026-01-02'},
  {id:'f2',fact:'Swelling was not present on examination.',source:'Visit.pdf',file:'Visit.pdf',page:2,category:'extracted_finding',reportDate:'2026-01-04'},
];
export const rawReview = {
  executiveSummary:'The reported discomfort and examination describe different observations. Timing and activity remain relevant questions.',
  primaryHypothesis:'Knee discomfort',
  documentedFacts:facts,
  questionsForClinician:['When is the discomfort most noticeable?'],
  uncertainties:['Activity timing is not recorded.'],
  perspectives:[{id:'p1',specialty:'Musculoskeletal',questionAddressed:'How does activity relate to the discomfort?',selectionReason:'The concern is activity-related discomfort.',
    evidenceConsidered:['f1','f2'],interpretation:'Activity timing may clarify the pattern.',evidenceAgainst:[],missingInformation:['Activity timing'],
    questionForAnotherPerspective:{targetSpecialty:'',question:'',clinicalRationale:''},whatWouldChangeInterpretation:'A dated activity log'}],
  alternatives:[{id:'a1',type:'insufficient_evidence',title:'Activity relationship not established',mechanismSummary:'Timing is not documented.',likelihoodAssessment:'uncertain',
    supportingEvidence:[{factId:'f1',description:'The onset is reported, but activity timing is missing.'}],conflictingEvidence:[],missingEvidenceWhatWouldChangeIt:[]}],
};
export const groundedReview = () => normalizeClinicalReview(rawReview,null,undefined,{evidence:facts});
