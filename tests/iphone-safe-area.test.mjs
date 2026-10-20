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

test('Aurum keeps its controls within the viewport left visible by the iPhone keyboard',()=>{
 const panel={getBoundingClientRect:()=>({width:366,height:300})};
 const ctx=vm.createContext({AURUM_SAFE_MARGIN:12,window:{innerWidth:390,innerHeight:844,visualViewport:{width:390,height:350,offsetLeft:0,offsetTop:0}},safeViewportInset:()=>0});
 vm.runInContext(fn('aurumViewportBounds','clampAurumPosition'),ctx);
 const bounds=ctx.aurumViewportBounds(panel);
 assert.equal(bounds.minX,12);assert.equal(bounds.maxX,12);
 assert.equal(bounds.minY,12);assert.equal(bounds.maxY,38);
});

test('Aurum accounts for the visible viewport origin after zoom or keyboard scrolling',()=>{
 const panel={getBoundingClientRect:()=>({width:180,height:180})};
 const ctx=vm.createContext({AURUM_SAFE_MARGIN:12,window:{innerWidth:390,innerHeight:844,visualViewport:{width:250,height:400,offsetLeft:30,offsetTop:100}},safeViewportInset:()=>0});
 vm.runInContext(fn('aurumViewportBounds','clampAurumPosition'),ctx);
 const bounds=ctx.aurumViewportBounds(panel);
 assert.equal(bounds.minX,42);assert.equal(bounds.maxX,88);
 assert.equal(bounds.minY,112);assert.equal(bounds.maxY,308);
});

test('floating UI dimensions follow keyboard opening and closing without changing stored data',()=>{
 const properties={},shortViewport=[];let clamps=0;
 const viewport={width:390,height:350,offsetLeft:0,offsetTop:20};
 const ctx=vm.createContext({window:{innerWidth:390,innerHeight:844,visualViewport:viewport},document:{documentElement:{style:{setProperty:(k,v)=>{properties[k]=v;}},classList:{toggle:(name,on)=>{if(name==='has-short-viewport')shortViewport.push(on);}}}},notificationDropdown:null,restoreAurumFloatingPosition:()=>{},scheduleAurumViewportClamp:()=>{clamps++;},scheduleAurumAvoidance:()=>{}});
 const start=app.indexOf('function syncFloatingViewport(');
 vm.runInContext(app.slice(start,app.indexOf('\nwindow.addEventListener("resize", syncFloatingViewport);',start)),ctx);
 ctx.syncFloatingViewport();
 assert.equal(properties['--oa-visible-height'],'350px');assert.equal(properties['--oa-visible-top'],'20px');assert.equal(properties['--oa-visible-bottom-gap'],'474px');
 viewport.height=180;ctx.syncFloatingViewport();
 assert.equal(properties['--oa-visible-height'],'180px');
 viewport.height=844;viewport.offsetTop=0;ctx.syncFloatingViewport();
 assert.equal(properties['--oa-visible-height'],'844px');assert.equal(properties['--oa-visible-bottom-gap'],'0px');assert.equal(clamps,3);
 assert.deepEqual(shortViewport,[false,true,false]);
});

test('rotation reveals the focused overlay field inside the resized panel',()=>{
 let scrollTop=0;
 const panel={clientHeight:72,querySelector:()=>null,getBoundingClientRect:()=>({top:12,bottom:84}),get scrollTop(){return scrollTop;},set scrollTop(value){scrollTop=value;}};
 const field={matches:()=>true,closest:()=>panel,getBoundingClientRect:()=>({top:168-scrollTop,bottom:212-scrollTop,height:44})};
 const ctx=vm.createContext({document:{activeElement:field}});
 vm.runInContext(fn('revealFocusedOverlayField','syncFloatingViewport'),ctx);
 ctx.revealFocusedOverlayField();
 assert.ok(field.getBoundingClientRect().top>=18);
 assert.ok(field.getBoundingClientRect().bottom<=78);
 const stable=scrollTop;ctx.revealFocusedOverlayField();assert.equal(scrollTop,stable);
});

test('restoring portrait keeps the focused field below a sticky overlay header',()=>{
 let scrollTop=180;
 const header={getBoundingClientRect:()=>({height:80})};
 const panel={clientHeight:400,querySelector:()=>header,getBoundingClientRect:()=>({top:12,bottom:412}),get scrollTop(){return scrollTop;},set scrollTop(value){scrollTop=value;}};
 const field={matches:()=>true,closest:()=>panel,getBoundingClientRect:()=>({top:200-scrollTop,bottom:270-scrollTop,height:70})};
 const ctx=vm.createContext({document:{activeElement:field},getComputedStyle:()=>({position:'sticky'})});
 vm.runInContext(fn('revealFocusedOverlayField','syncFloatingViewport'),ctx);ctx.revealFocusedOverlayField();
 assert.ok(field.getBoundingClientRect().top>=98);assert.ok(field.getBoundingClientRect().bottom<=406);
});

test('viewport changes do not scroll ordinary form fields or change input values',()=>{
 const field={value:'unchanged',matches:()=>true,closest:()=>null,getBoundingClientRect:()=>{throw Error('ordinary form must remain untouched');}};
 const ctx=vm.createContext({document:{activeElement:field}});
 vm.runInContext(fn('revealFocusedOverlayField','syncFloatingViewport'),ctx);ctx.revealFocusedOverlayField();
 assert.equal(field.value,'unchanged');
});
test('competitor source prices retain their published per-kilogram and per-gram decimals',()=>{
 const name=app.includes('function formatCompetitorPrice(')?'formatCompetitorPrice':'formatCompetitorPerGram';
 const ctx=vm.createContext({});vm.runInContext(fn(name,'goldPredictionHorizonLabel'),ctx);
 assert.match(ctx[name](999.87,'EUR','kg'),/999,87.*kg/);assert.match(ctx[name](0.99987,'EUR'),/0,99987.*g/);
});

function notificationPlacement(viewport,insets={}) {
 const properties={};
 const ctx=vm.createContext({document:{documentElement:{clientWidth:390,clientHeight:844}},window:{innerWidth:390,innerHeight:844,visualViewport:viewport},safeViewportInset:side=>insets[side]||0,notificationDropdown:{hidden:false,classList:{add:()=>{}},style:{setProperty:(key,value)=>{properties[key]=value;}}},notificationBell:{getBoundingClientRect:()=>({right:378,bottom:64})}});
 vm.runInContext(fn('positionNotificationDropdown','applyRolePermissions'),ctx);ctx.positionNotificationDropdown();
 return Object.fromEntries(Object.entries(properties).map(([key,value])=>[key,parseFloat(value)]));
}

test('notifications stay within the zoomed and panned iPhone viewport',()=>{
 const viewport={width:250,height:180,offsetLeft:30,offsetTop:100};
 const p=notificationPlacement(viewport);
 const left=p['--notification-dropdown-left'],top=p['--notification-dropdown-top'];
 assert.ok(left>=viewport.offsetLeft+12);assert.ok(left+p['--notification-dropdown-width']<=viewport.offsetLeft+viewport.width-12);
 assert.ok(top>=viewport.offsetTop+12);assert.ok(top+p['--notification-dropdown-max-height']<=viewport.offsetTop+viewport.height-12);
});

test('notifications respect landscape notch and keyboard height instead of a minimum 220px panel',()=>{
 const viewport={width:932,height:120,offsetLeft:0,offsetTop:0};
 const p=notificationPlacement(viewport,{left:47,right:47,bottom:21});
 assert.ok(p['--notification-dropdown-left']>=59);
 assert.ok(p['--notification-dropdown-left']+p['--notification-dropdown-width']<=873);
 assert.ok(p['--notification-dropdown-top']>=12);
 assert.ok(p['--notification-dropdown-top']+p['--notification-dropdown-max-height']<=87);
});

test('GemLab keeps the scrolled tab rail when selecting a section or opening an image',()=>{
 let rail={scrollLeft:560};
 const shell={querySelector:()=>rail,set innerHTML(value){rail={scrollLeft:0};}};
 const material={id:900801};
 const ctx=vm.createContext({gemLabShell:shell,state:{gemLabView:'detail'},gemLabCurrentMaterial:()=>material,renderGemLabDetail:()=>'<detail>',renderGemLabCatalog:()=>'<catalog>',renderGemLabZoomPortal:()=>{},teardownGemLabZoom:()=>{}});
 vm.runInContext(fn('renderGemLab','gemLabFormObject'),ctx);
 ctx.renderGemLab();assert.equal(rail.scrollLeft,560);
 rail=null;ctx.state.gemLabView='catalog';ctx.renderGemLab();assert.equal(rail.scrollLeft,0);
});

test('a 69px landscape keyboard viewport fits the Aurum panel without a fictitious 64px height',()=>{
 const panel={id:'aurumChatPanel',getBoundingClientRect:()=>({width:643,height:61})};
 const ctx=vm.createContext({AURUM_SAFE_MARGIN:12,window:{innerWidth:667,innerHeight:375,visualViewport:{width:667,height:69,offsetLeft:0,offsetTop:0}},safeViewportInset:()=>0});
 vm.runInContext(fn('aurumViewportBounds','clampAurumPosition'),ctx);
 const bounds=ctx.aurumViewportBounds(panel);
 assert.equal(bounds.height,61);assert.equal(bounds.minY,4);assert.equal(bounds.maxY,4);
 assert.ok(bounds.minY+bounds.height<=69-4);
});

test('tiny Aurum viewport still preserves a landscape home-indicator safe area',()=>{
 const panel={id:'aurumChatPanel',getBoundingClientRect:()=>({width:549,height:44})};
 const ctx=vm.createContext({AURUM_SAFE_MARGIN:12,window:{innerWidth:667,innerHeight:375,visualViewport:{width:667,height:69,offsetLeft:0,offsetTop:25}},safeViewportInset:side=>({left:47,right:47,bottom:21}[side]||0)});
 vm.runInContext(fn('aurumViewportBounds','clampAurumPosition'),ctx);
 const bounds=ctx.aurumViewportBounds(panel);
 assert.equal(bounds.minY,29);assert.equal(bounds.maxY,29);
 assert.ok(bounds.maxY+bounds.height<=25+69-21);
});
