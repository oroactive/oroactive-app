import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createCompetitorExtractionTrainer} from '../services/competitors/competitorExtractionTrainer.js';

const sources=[['Amico Oro','amicoOroExtractor','extractAmicoOroQuotes','amico_oro'],['Bordin','bordinExtractor','extractBordinQuotes','bordin'],['Pronto Gold','prontoGoldExtractor','extractProntoGoldQuotes','pronto_gold'],['Gold Standard','goldStandardExtractor','extractGoldStandardQuotes','gold_standard'],['Oro in Euro','oroInEuroExtractor','extractOroInEuroQuotes','oro_in_euro'],['Gruppo Oro 24K','gruppoOro24kExtractor','extractGruppoOro24kQuotes','gruppo_oro_24k']];
for (const [name,option,method,prefix] of sources) {
 test(`${name}: guided and forced-AI refresh preserve exact verified fields and missing prices`,async()=>{
  let calls=0;
  const quote={competitor_name:name,metal:'gold',purity_code:'24kt',quote_type:'reference_market_gold_price',price_per_gram:119,currency:'EUR',evidence_text:'official reference 119 EUR/g',ai_extracted:false,raw_payload:{[prefix+'_key']:prefix+'_reference',verified_official:true}};
  const extractor={ [method]:async()=>{calls++;return {verified_only:true,status:'partial',pages_analyzed:['https://official.example/'],quotes:[quote],missing_fields:[{field_key:prefix+'_buy',metal:'gold',purity_code:'24kt',error:'Official buy price absent'}]};}};
  const trainer=createCompetitorExtractionTrainer({[option]:extractor,fetchImpl:async()=>{throw Error('Must not fetch a guessed field')},openai:{responses:{create:async()=>{throw Error('Must not infer a price')}}}});
  const rules=['reference','buy'].map(k=>({field_key:prefix+'_'+k,label:k,metal:'gold',purity_code:'24kt',active:true}));
  for(const forceAi of [false,true]){
   const r=await trainer.testCompetitorExtraction({id:1,name,website_url:'https://official.example'},rules,{forceAi});
   assert.equal(r.status,'partial');assert.equal(r.pages_analyzed.length,1);assert.equal(r.quotes.length,1);assert.equal(r.quotes[0].quote_type,'reference_market_gold_price');assert.equal(r.results[1].value,null);assert.equal(r.results[1].status,'not_found');assert.match(r.results[1].error,/Official buy/);
  }
  assert.equal(calls,2);
 });
}
test('Amico Oro maps prefixed stored rule keys without relaxing quote identity',async()=>{
 const q={metal:'silver',purity_code:'925',price_per_gram:0.79524,raw_payload:{amico_oro_key:'silver_925',verified_official:true}};
 const trainer=createCompetitorExtractionTrainer({amicoOroExtractor:{extractAmicoOroQuotes:async()=>({status:'success',verified_only:true,quotes:[q]})}});
 const r=await trainer.testCompetitorExtraction({name:'Amico Oro'},[{field_key:'amico_oro_silver_925',metal:'silver',purity_code:'925',active:true}],{forceAi:true});
 assert.equal(r.status,'success');assert.equal(r.quotes[0].price_per_gram,0.79524);
});
test('legacy unverified records remain historical and cannot enter the current client comparison',async()=>{
 const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
 const start=app.indexOf('function isCompetitorBuybackQuote(');const code=app.slice(start,app.indexOf('function competitorSourceTypeLabel(',start));
 const ctx=vm.createContext({isUnsupportedCompetitorBuybackQuote:()=>false});vm.runInContext(code,ctx);
 for(const [name] of sources){
  const historic={competitor_name:name,quote_type:'customer_buyback',price_per_gram:112,raw_payload:{}};
  assert.equal(ctx.isCompetitorBuybackQuote(historic),false,name);
  assert.equal(ctx.isCompetitorBuybackQuote({...historic,raw_payload:{verified_official:true}}),true,name);
  assert.equal(ctx.isCompetitorBuybackQuote({...historic,ai_extracted:true,raw_payload:{verified_official:true}}),false,name);
  assert.equal(historic.price_per_gram,112);
 }
});
