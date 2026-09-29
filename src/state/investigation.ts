import {validateSnapshot, type Snapshot} from '../domain/inputs';
import type {Review} from '../domain/review';
import {reserve, settle, type Ledger, type Operation} from '../domain/budget';
export type Stage = 0 | 1 | 2 | 3;
export type State = { stage: Stage; snapshot: Snapshot; originalRules: string; consent: boolean; review: Review|null; ledger: Ledger; active: {id:string;version:number;operation:Operation}|null; error:string; selected:string|null; downloaded:Record<string,string> };
export function initialState(): State {return {stage:0,snapshot:{investigationId:crypto.randomUUID(),version:1,incident:'',messages:[],rulesFilename:'AGENTS.md',rulesText:'',rulesBom:false},originalRules:'',consent:false,review:null,ledger:[],active:null,error:'',selected:null,downloaded:{}};}
export type Event = {type:'input'; patch:Partial<Snapshot>; originalRules?:string}|{type:'consent';value:boolean}|{type:'stage';stage:Stage}|{type:'error';message:string}|{type:'start';id:string;operation:Operation}|{type:'finish';id:string;generationStarted?:boolean;usage?:{inputTokens:number;outputTokens:number};review?:Review;error?:string}|{type:'review';review:Review}|{type:'select';id:string}|{type:'download';name:string;content:string};
export function reducer(s:State,e:Event):State {
 switch(e.type){
 case 'input':return {...s,snapshot:{...s.snapshot,...e.patch,version:s.snapshot.version+1},originalRules:e.originalRules??s.originalRules,consent:false,review:null,downloaded:{},selected:null,error:'',stage:s.stage>1?1:s.stage};
 case 'consent':return {...s,consent:e.value};
 case 'stage':return e.stage>1&&!s.review?s:{...s,stage:e.stage,error:''};
 case 'error':return {...s,error:e.message};
 case 'start':
 if(!s.consent)throw new Error('Consent to the current reviewed inputs is required.');
 validateSnapshot(s.snapshot);
 if(e.operation==='recheck'&&!s.review)throw new Error('A current investigation is required for semantic review.');
 return {...s,ledger:reserve(s.ledger,e.id,e.operation),active:{id:e.id,version:s.snapshot.version,operation:e.operation},error:''};
 case 'finish':{
 const current=s.active?.id===e.id&&s.active.version===s.snapshot.version;
 return {...s,ledger:settle(s.ledger,e.id,e),active:s.active?.id===e.id?null:s.active,...(current?{error:e.error??'',...(e.review?{review:e.review,stage:s.active?.operation==='analysis'?2:s.stage,downloaded:{}}:{})}:{})};}
 case 'review':return {...s,review:e.review,downloaded:{},error:''};
 case 'select':return {...s,selected:e.id};
 case 'download':return {...s,downloaded:{...s.downloaded,[e.name]:e.content}};
 }
}
