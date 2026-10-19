import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
function fn(name,next){const start=app.indexOf('function '+name+'(');return app.slice(start,app.indexOf('function '+next+'(',start));}
test('Aurum reads computed safe areas and preserves source quote precision',()=>{
 const ctx=vm.createContext({document:{documentElement:{}},getComputedStyle:()=>({getPropertyValue:key=>({'--oa-safe-area-left':'47px','--oa-safe-area-bottom':'21px'}[key]||'')})});
 vm.runInContext(fn('safeViewportInset','loadAurumFloatingPosition'),ctx);
 assert.equal(ctx.safeViewportInset('left'),47);assert.equal(ctx.safeViewportInset('bottom'),21);assert.equal(ctx.safeViewportInset('right'),0);
});
test('dragged Aurum panel stays inside landscape notch and home-indicator margins',()=>{
 const style={},classes=[];
 const panel={getBoundingClientRect:()=>({width:320,height:220,left:0,top:0,right:320,bottom:220}),classList:{add:c=>classes.push(c)},style};
 const ctx=vm.createContext({aurumChatPanel:panel,AURUM_SAFE_MARGIN:12,window:{innerWidth:932,innerHeight:430},safeViewportInset:side=>({left:47,right:47,top:0,bottom:21}[side]||0)});
 vm.runInContext(fn('aurumViewportBounds','clampAurumPosition')+fn('applyAurumPanelPosition','handleAurumPointerDown'),ctx);
 ctx.applyAurumPanelPosition({x:-20,y:500});assert.equal(style.left,'59px');assert.equal(style.top,'177px');
 ctx.applyAurumPanelPosition({x:9999,y:-20});assert.equal(style.left,'553px');assert.equal(style.top,'12px');
});
test('competitor source prices retain their published per-kilogram and per-gram decimals',()=>{
 const name=app.includes('function formatCompetitorPrice(')?'formatCompetitorPrice':'formatCompetitorPerGram';
 const ctx=vm.createContext({});vm.runInContext(fn(name,'goldPredictionHorizonLabel'),ctx);
 assert.match(ctx[name](999.87,'EUR','kg'),/999,87.*kg/);assert.match(ctx[name](0.99987,'EUR'),/0,99987.*g/);
});
