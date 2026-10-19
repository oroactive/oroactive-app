import test from 'node:test';
import assert from 'node:assert/strict';
import {extractAmicoOroQuotesFromText} from '../services/competitors/extractors/amicoOroExtractor.js';
import {extractBordinQuotesFromText} from '../services/competitors/extractors/bordinExtractor.js';
import {extractProntoGoldQuotesFromText} from '../services/competitors/extractors/prontoGoldExtractor.js';
import {extractGoldStandardQuotesFromText} from '../services/competitors/extractors/goldStandardExtractor.js';
import {extractOroInEuroQuotesFromText} from '../services/competitors/extractors/oroInEuroExtractor.js';
import {extractGruppoOro24kQuotesFromText} from '../services/competitors/extractors/gruppoOro24kExtractor.js';
const fixtures=[
 ['Amico Oro',extractAmicoOroQuotesFromText,'24K al gr = 112,39 €'],
 ['Bordin',extractBordinQuotesFromText,'Quotazione Oro Oro 24kt - 999,9‰ 112,39 € / gr'],
 ['Pronto Gold',extractProntoGoldQuotesFromText,'ORO PURO 24k Acquisto 112,39 Euro/Grammo Vendita 120,65 Euro/Grammo'],
 ['Gold Standard',extractGoldStandardQuotesFromText,'Acquistiamo ORO 24K al prezzo MIN € 112,39 /g'],
 ['Oro in Euro',extractOroInEuroQuotesFromText,'Oro 999/1000 112,39 € /Grammo'],
 ['Gruppo Oro 24K',extractGruppoOro24kQuotesFromText,'ORO 24 Carati 112,39 €/g']
];
for(const [name,parse,text] of fixtures)test(`${name}: malformed numeric strings cannot become verified customer prices`,()=>{
 const current=q=>q.metal==='gold'&&q.purity_code==='24kt'&&q.quote_type==='customer_buyback';
 assert.equal(parse(text).find(current)?.price_per_gram,112.39);
 for(const bad of ['112..39','1.12.39','112,,39','11,2.39','112,39,8']){
  assert.equal(parse(text.replace('112,39',bad)).find(current),undefined,bad);
 }
});
