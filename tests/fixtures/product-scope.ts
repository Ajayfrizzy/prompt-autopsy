import {readFileSync} from 'node:fs';
import {parseTranscript} from '../../src/domain/transcript';
import type {Snapshot} from '../../src/domain/inputs';
import type {AnalysisWire} from '../../src/server/ai/schemas';

// Authored semantic expectation, NOT a recorded or guaranteed live model result.
// The real public sample is parsed so all evidence is checked against its text.
export const productScopeSnapshot: Snapshot = {
  investigationId:'11111111-1111-4111-8111-111111111111', version:1,
  incident:'Ignoring one product removed all four products sharing its screenshot.',
  messages:parseTranscript(readFileSync('public/samples/transcript.txt','utf8')),
  rulesFilename:'AGENTS.md',rulesBom:false,
  rulesText:'Apply Ignore and Restore to the selected product only. Preserve unrelated products, the source screenshot, bundle identity and actions.',
};
const evidence=(messageId:string)=>({messageId,quote:productScopeSnapshot.messages.find(m=>m.id===messageId)!.body,occurrence:1});
export const productScopeAnalysis: AnalysisWire = {
  summary:'Ignore targeted the shared screenshot instead of the selected product; later messages report a correction and manual validation.',
  coverage:{status:'within_capacity',reason:null},
  findings:[{
    key:'product_scope',title:'Ignore used screenshot scope instead of selected-product scope',evidenceState:'supported',
    documentedRequirement:{text:'Ignore must preserve the other products and bundle identity.',evidence:[evidence('M001')]},
    observations:[
      {text:'The implementation hid the shared screenshot and testing reported all four products disappearing.',evidence:[evidence('M002'),evidence('M003')]},
      {text:'The agent reported changing Ignore and Restore to product IDs.',evidence:[evidence('M004')]},
      {text:'The developer reported manually validating removal and restoration with unrelated content preserved.',evidence:[evidence('M005')]},
    ],hypotheses:[],missingEvidence:[],
    comparisons:[{relation:'equivalent',rules:[{ruleId:'R001',quote:productScopeSnapshot.rulesText,occurrence:1}],reasoning:'The supplied historical instruction already requires product-level actions and preservation.'}],
    recommendation:'no_change',rationale:'No additional rule is warranted; the supplied instruction already covers the failure. Its presence does not establish that the agent loaded it.',proposalKey:null,
  }],
  timeline:[
    {kind:'requirement',description:'Selected-product removal required.',interpretation:'observed',evidence:[evidence('M001')],findingKeys:['product_scope']},
    {kind:'decision',description:'Agent reports screenshot-level implementation.',interpretation:'observed',evidence:[evidence('M002')],findingKeys:['product_scope']},
    {kind:'failure',description:'Developer reports all four products disappearing.',interpretation:'observed',evidence:[evidence('M003')],findingKeys:['product_scope']},
    {kind:'correction',description:'Agent reports item-level correction.',interpretation:'observed',evidence:[evidence('M004')],findingKeys:['product_scope']},
    {kind:'correction',description:'Developer reports manual validation of the correction.',interpretation:'observed',evidence:[evidence('M005')],findingKeys:['product_scope']},
  ],proposals:[],proposalRelations:[],
  limitations:['Manual validation is reported in the transcript, not independently executed by Prompt Autopsy. Historical rules do not prove agent exposure.'],
};
