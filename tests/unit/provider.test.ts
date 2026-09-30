import { describe, it, expect, vi } from 'vitest';
import { analyze, readBoundedJson, type Provider } from '../../src/server/ai/provider';
const valid={status:'no_issue',comparisons:[],reasoning:'No issue in supplied context.',limitations:[]};
function mock(count=100):Provider {
  return {count:vi.fn().mockResolvedValue({input_tokens:count}),generate:vi.fn().mockResolvedValue({status:'completed',usage:{input_tokens:100,output_tokens:120},output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(valid)}]}]})};
}
describe('consented provider admission',()=>{
  it('counts the exact generation context and fixes server configuration',async()=>{
    const provider=mock();const result=await analyze(provider,'recheck',{rulesText:'reviewed only'});
    const counted=vi.mocked(provider.count).mock.calls[0][0];
    const generated=vi.mocked(provider.generate).mock.calls[0][0];
    for(const key of Object.keys(counted))expect(generated[key as keyof typeof generated]).toEqual(counted[key as keyof typeof counted]);
    expect(generated).toMatchObject({model:'gpt-5.6-sol',store:false,service_tier:'default',max_output_tokens:2000,tools:[],reasoning:{effort:'low'},prompt_cache_options:{mode:'explicit'}});
    expect(result.usage).toEqual({inputTokens:100,outputTokens:120});
  });
  it('fails closed at margin boundary without generation',async()=>{
    await expect(analyze(mock(5714),'recheck',{})).resolves.toMatchObject({generationStarted:true});
    const provider=mock(5715);
    await expect(analyze(provider,'recheck',{})).rejects.toMatchObject({code:'INPUT_TOO_LARGE',generationStarted:false});
    expect(provider.generate).not.toHaveBeenCalled();
  });
  it('rejects invalid count and count failure without fallback or automatic retry',async()=>{
    for(const count of [NaN,-1,1.1]){const p=mock(count);await expect(analyze(p,'recheck',{})).rejects.toMatchObject({code:'COUNT_FAILED',generationStarted:false});expect(p.generate).not.toHaveBeenCalled();}
    const p=mock();vi.mocked(p.count).mockRejectedValue(new Error('secret payload must not leak'));
    await expect(analyze(p,'recheck',{})).rejects.toMatchObject({code:'COUNT_FAILED'});expect(p.count).toHaveBeenCalledTimes(1);
  });
  it('retains unknown generation reservation on transport failure',async()=>{
    const p=mock();vi.mocked(p.generate).mockRejectedValue(new Error('transport'));
    await expect(analyze(p,'recheck',{})).rejects.toMatchObject({code:'GENERATION_FAILED',generationStarted:true,usage:undefined});expect(p.generate).toHaveBeenCalledTimes(1);
  });
  it.each([
    ['PROVIDER_INCOMPLETE',{status:'incomplete',incomplete_details:{reason:'max_output_tokens'},output:[]}],
    ['PROVIDER_REFUSED',{status:'completed',output:[{type:'message',content:[{type:'refusal',refusal:'private'}]}]}],
    ['PROVIDER_OUTPUT_MISSING',{status:'completed',output:[]}],
    ['PROVIDER_JSON_INVALID',{status:'completed',output:[{type:'message',content:[{type:'output_text',text:'private invalid JSON'}]}]}],
    ['PROVIDER_SCHEMA_INVALID',{status:'completed',output:[{type:'message',content:[{type:'output_text',text:'{}'}]}]}],
    ['PROVIDER_SCHEMA_INVALID',{status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({...valid,reasoning:'x'.repeat(501)})}]}]}],
    ['ANALYSIS_CONTRACT_INVALID',{status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({...valid,status:'possible_conflict'})}]}]}],
  ])('preserves usage and fails closed for %s',async(code,output)=>{
    const p=mock();vi.mocked(p.generate).mockResolvedValue({...output,usage:{input_tokens:10,output_tokens:20}});
    await expect(analyze(p,'recheck',{})).rejects.toMatchObject({code,generationStarted:true,usage:{inputTokens:10,outputTokens:20}});
    expect(p.generate).toHaveBeenCalledTimes(1);
  });
  it('logs only allowlisted diagnostic metadata in development',async()=>{
    vi.stubEnv('NODE_ENV','development');const log=vi.spyOn(console,'warn').mockImplementation(()=>{});
    try {
      const p=mock();vi.mocked(p.generate).mockResolvedValue({status:'completed',_request_id:'req_test',usage:{input_tokens:10,output_tokens:20},output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({...valid,reasoning:42,privateSecret:'never log this'})}]}]});
      await expect(analyze(p,'recheck',{})).rejects.toMatchObject({code:'PROVIDER_SCHEMA_INVALID'});
      expect(log).toHaveBeenCalledWith('Prompt Autopsy provider validation',expect.objectContaining({stage:'schema',status:'completed',refused:false,outputTextExists:true,requestId:'req_test',usage:{inputTokens:10,outputTokens:20},issues:expect.arrayContaining([{code:'invalid_type',path:['reasoning']}])}));
      expect(JSON.stringify(log.mock.calls)).not.toMatch(/privateSecret|never log this|No issue in supplied context/);
    } finally {log.mockRestore();vi.unstubAllEnvs();}
  });
  it('rejects unknown semantic references atomically',async()=>{
    const p=mock();vi.mocked(p.generate).mockResolvedValue({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({status:'possible_conflict',comparisons:[{relation:'possible_conflict',ruleIds:['R001'],proposalIds:[],reasoning:'different'}],reasoning:'Conflict',limitations:[]})}]}]});
    await expect(analyze(p,'recheck',{})).rejects.toMatchObject({code:'ANALYSIS_CONTRACT_INVALID'});
  });
});
describe('bounded request parsing',()=>{
  function req(body:string,headers:Record<string,string>={}){return new Request('http://localhost',{method:'POST',body,headers:{'content-type':'application/json',...headers}});}
  it('enforces actual streamed UTF8 bytes not supplied content-length',async()=>{
    await expect(readBoundedJson(req('"é"',{'content-length':'1'}),3)).rejects.toMatchObject({code:'BODY_TOO_LARGE'});
    await expect(readBoundedJson(req('"é"'),4)).resolves.toBe('é');
  });
  it('rejects compression and invalid JSON',async()=>{
    await expect(readBoundedJson(req('{}',{'content-encoding':'gzip'}),100)).rejects.toMatchObject({code:'INVALID_ENCODING'});
    await expect(readBoundedJson(req('{'),100)).rejects.toMatchObject({code:'INVALID_REQUEST'});
  });
});
