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

function pageKeyboardContext({height=136,offsetTop=0,scale=1,top=199,fieldHeight=50,panel=null,webkit=false}={}) {
 let position=top;const scrolls=[];
 const field={value:'test value preserved',readOnly:false,disabled:false,matches:()=>true,closest:()=>panel,
  getBoundingClientRect:()=>({top:position,bottom:position+fieldHeight,height:fieldHeight})};
 const viewport={width:956,height,offsetTop,offsetLeft:0,scale};
 const ctx=vm.createContext({document:{activeElement:field},window:{innerWidth:956,innerHeight:440,visualViewport:viewport,CSS:{supports:()=>webkit},
  scrollBy:options=>{scrolls.push(options);position-=options.top;}}});
 vm.runInContext(fn('revealFocusedPageField','syncFloatingViewport'),ctx);
 return {ctx,field,viewport,scrolls};
}

test('physical iPhone landscape keyboard leaves the entire focused page input visible',()=>{
 const {ctx,field,scrolls}=pageKeyboardContext();
 ctx.revealFocusedPageField();
 const rect=field.getBoundingClientRect();
 assert.ok(rect.top>=0);assert.ok(rect.bottom<=136);
 assert.equal(field.value,'test value preserved');assert.equal(scrolls.length,1);
 ctx.revealFocusedPageField();assert.equal(scrolls.length,1,'a visible field must remain stable');
});

test('keyboard panning reveals a page input above the visible viewport without changing its value',()=>{
 const {ctx,field,scrolls}=pageKeyboardContext({offsetTop:60,top:10});
 ctx.revealFocusedPageField();
 assert.ok(field.getBoundingClientRect().top>=60);assert.ok(field.getBoundingClientRect().bottom<=196);
 assert.ok(scrolls[0].top<0);assert.equal(field.value,'test value preserved');
});

test('ordinary viewport changes with no keyboard preserve the page scroll position',()=>{
 const {ctx,field,scrolls}=pageKeyboardContext({height:440});
 field.getBoundingClientRect=()=>{throw Error('no keyboard: do not reposition a form');};
 ctx.revealFocusedPageField();assert.equal(scrolls.length,0);
});

test('pinch zoom does not trigger keyboard scroll correction',()=>{
 const {ctx,field,scrolls}=pageKeyboardContext({scale:2});
 field.getBoundingClientRect=()=>{throw Error('respect user zoom');};
 ctx.revealFocusedPageField();assert.equal(scrolls.length,0);
});

test('focused dialog inputs continue to use their own panel scroll instead of moving the page',()=>{
 const {ctx,field,scrolls}=pageKeyboardContext({panel:{clientHeight:100}});
 field.getBoundingClientRect=()=>{throw Error('overlay must not move the document');};
 ctx.revealFocusedPageField();assert.equal(scrolls.length,0);
});

test('keyboard correction leaves an already visible page field stationary',()=>{
 const {ctx,field,scrolls}=pageKeyboardContext({top:25});
 ctx.revealFocusedPageField();assert.equal(field.getBoundingClientRect().top,25);assert.equal(scrolls.length,0);
});

test('manual viewport scrolling does not pull a focused page field back into view',()=>{
 let pageCorrections=0,overlayCorrections=0;
 const ctx=vm.createContext({window:{innerWidth:956,innerHeight:440,visualViewport:{width:956,height:136,offsetTop:0,offsetLeft:0},requestAnimationFrame:callback=>callback()},
  document:{documentElement:{style:{setProperty(){}},classList:{toggle(){}}}},notificationDropdown:null,
  restoreAurumFloatingPosition(){},scheduleAurumViewportClamp(){},scheduleAurumAvoidance(){},
  keyboardDismissControl:{sync(){}},
  revealFocusedOverlayField:()=>overlayCorrections++,revealFocusedPageField:()=>pageCorrections++});
 const start=app.indexOf('function syncFloatingViewport(');
 vm.runInContext(app.slice(start,app.indexOf('\nwindow.addEventListener("resize", syncFloatingViewport);',start)),ctx);
 ctx.syncFloatingViewport({type:'scroll'});assert.equal(pageCorrections,0);
 ctx.syncFloatingViewport({type:'resize'});assert.equal(pageCorrections,1);assert.equal(overlayCorrections,2);
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


test('Safari keyboard pan is not added twice to ordinary client coordinates',()=>{
 const {ctx,field,scrolls}=pageKeyboardContext({webkit:true,height:164,offsetTop:75,top:179});
 ctx.revealFocusedPageField();
 assert.ok(field.getBoundingClientRect().top>=12);
 assert.ok(field.getBoundingClientRect().bottom<=152);
 assert.equal(scrolls.length,1);assert.equal(field.value,'test value preserved');
 ctx.revealFocusedPageField();assert.equal(scrolls.length,1);
});

test('Safari quote textarea remains above the keyboard after rotation from landscape',()=>{
 const {ctx,field}=pageKeyboardContext({webkit:true,height:164,offsetTop:68,top:91,fieldHeight:102});
 ctx.revealFocusedPageField();
 assert.ok(field.getBoundingClientRect().top>=12);
 assert.ok(field.getBoundingClientRect().bottom<=152);
 assert.equal(field.value,'test value preserved');
});


test('expanded Safari bars leave an 18px composer without subtracting home indicator space twice',()=>{
 const panel={id:'aurumChatPanel',getBoundingClientRect:()=>({width:808,height:18})};
 const ctx=vm.createContext({AURUM_SAFE_MARGIN:12,window:{innerWidth:956,innerHeight:323,visualViewport:{width:956,height:18,offsetLeft:0,offsetTop:117}},safeViewportInset:side=>side==='bottom'?21:0});
 vm.runInContext(fn('aurumViewportBounds','clampAurumPosition'),ctx);
 const bounds=ctx.aurumViewportBounds(panel);
 assert.equal(bounds.minY,117);assert.equal(bounds.maxY,117);
 assert.ok(bounds.maxY+bounds.height<=117+18);
});


test('a composer filling the tiny Safari viewport does not acquire artificial scroll padding',()=>{
 let scrollTop=0;
 const panel={clientHeight:18,querySelector:()=>null,getBoundingClientRect:()=>({top:117,bottom:135}),get scrollTop(){return scrollTop;},set scrollTop(v){scrollTop=v;}};
 const field={matches:()=>true,closest:()=>panel,getBoundingClientRect:()=>({top:220-scrollTop,bottom:238-scrollTop,height:18})};
 const ctx=vm.createContext({document:{activeElement:field}});
 vm.runInContext(fn('revealFocusedOverlayField','syncFloatingViewport'),ctx);
 ctx.revealFocusedOverlayField();
 assert.equal(field.getBoundingClientRect().top,117);assert.equal(field.getBoundingClientRect().bottom,135);
 const stable=scrollTop;ctx.revealFocusedOverlayField();assert.equal(scrollTop,stable);
});

test('CRM notes use the inner portrait scroller after rotation, preserving the entered text',()=>{
 let innerScroll=0,outerScroll=0;
 const panel={clientHeight:463,querySelector:()=>null,getBoundingClientRect:()=>({top:12,bottom:475}),
  get scrollTop(){return outerScroll;},set scrollTop(v){outerScroll=v;}};
 const body={parentElement:panel,clientHeight:390,scrollHeight:1100,getBoundingClientRect:()=>({top:85,bottom:475}),
  get scrollTop(){return innerScroll;},set scrollTop(v){innerScroll=v;}};
 const field={value:'Nota QA non salvata.',parentElement:body,matches:()=>true,closest:()=>panel,
  getBoundingClientRect:()=>({top:740.4375-innerScroll,bottom:850.4375-innerScroll,height:110})};
 const ctx=vm.createContext({document:{activeElement:field},getComputedStyle:()=>({overflowY:'auto'})});
 vm.runInContext(fn('revealFocusedOverlayField','syncFloatingViewport'),ctx);
 ctx.revealFocusedOverlayField();
 assert.ok(field.getBoundingClientRect().bottom<=469,'notes must be entirely above the keyboard');
 assert.ok(field.getBoundingClientRect().top>=91);assert.ok(innerScroll>0);assert.equal(outerScroll,0);
 assert.equal(field.value,'Nota QA non salvata.');
 const stable=innerScroll;ctx.revealFocusedOverlayField();assert.equal(innerScroll,stable);
});

function keyboardCommandContext() {
 const classNames=new Set(),events={},attributes={};
 const host={style:{position:'',removeProperty(key){delete this[key];}},scrollTop:20,scrollLeft:0,clientTop:0,clientLeft:0,
  matches:()=>false,getBoundingClientRect:()=>({left:10,top:100}),appendChild(node){node.parentElement=this;}};
 const label={matches:selector=>selector==='label',parentElement:host};
 const field={value:'Entered text',selectionStart:4,selectionEnd:4,parentElement:label,disabled:false,readOnly:false,matches:()=>true,
  classList:{add:c=>classNames.add(c),remove:c=>classNames.delete(c)},
  getBoundingClientRect:()=>({top:120,right:400,height:44}),blur(){document.activeElement=null;}};
 const button={style:{},setAttribute:(key,value)=>{attributes[key]=value;},
  addEventListener:(name,callback)=>{events[name]=callback;},remove(){this.parentElement=null;}};
 const document={activeElement:field,createElement:()=>button};
 const viewport={width:440,height:487,scale:1};
 const ctx=vm.createContext({document,window:{innerWidth:440,innerHeight:796,visualViewport:viewport},getComputedStyle:()=>({position:'static'})});
 const start=app.indexOf('function createKeyboardDismissControl(');
 assert.notEqual(start,-1,'keyboard dismissal control must exist');
 vm.runInContext(app.slice(start,app.indexOf('\nconst keyboardDismissControl =',start)),ctx);
 return {control:ctx.createKeyboardDismissControl(),field,button,host,document,viewport,events,attributes,classNames,ctx};
}

test('the keyboard command closes focus without submitting, saving or altering the text',()=>{
 const row=keyboardCommandContext();row.control.sync();
 assert.equal(row.button.type,'button');assert.equal(row.attributes['aria-label'],'Chiudi tastiera');
 assert.equal(row.button.hidden,false);assert.equal(row.button.parentElement,row.host,'do not put Fine inside the input label');
 assert.equal(row.host.style.position,'relative');assert.ok(row.classNames.has('has-keyboard-dismiss'));
 let prevented=0;row.events.pointerdown({preventDefault(){prevented++;}});
 assert.equal(row.document.activeElement,row.field,'pointer down must not move focus before the click');
 row.events.click({preventDefault(){prevented++;},stopPropagation(){}});
 assert.equal(prevented,2);assert.equal(row.document.activeElement,null);assert.equal(row.button.hidden,true);
 assert.equal(row.field.value,'Entered text');assert.equal(row.field.selectionStart,4);assert.equal(row.field.selectionEnd,4);
 assert.equal(row.host.style.position,undefined);assert.equal(row.classNames.size,0);
});

test('keyboard dismissal is absent without a keyboard, during zoom, or in read-only fields',()=>{
 const row=keyboardCommandContext();row.viewport.height=796;row.control.sync();assert.equal(row.button.hidden,true);
 row.viewport.height=487;row.viewport.scale=2;row.control.sync();assert.equal(row.button.hidden,true);
 row.viewport.scale=1;row.field.readOnly=true;row.control.sync();assert.equal(row.button.hidden,true);
 row.field.readOnly=false;row.field.disabled=true;row.control.sync();assert.equal(row.button.hidden,true);
 assert.equal(row.field.value,'Entered text');assert.equal(row.host.style.position,'');
});

test('the command fits the 18px Safari viewport and restores its host after focus leaves',()=>{
 const row=keyboardCommandContext();row.viewport.height=18;row.host.style.position='sticky';row.control.sync();
 assert.equal(row.button.style.height,'18px');assert.equal(row.button.hidden,false);
 assert.ok(parseFloat(row.button.style.top)>=40);assert.equal(row.button.style.left,'336px');
 row.document.activeElement=null;row.control.sync();
 assert.equal(row.button.hidden,true);assert.equal(row.host.style.position,'sticky');assert.equal(row.field.value,'Entered text');
});

test('a stale keyboard command cannot blur a different newly focused field',()=>{
 const row=keyboardCommandContext();row.control.sync();
 const next={blur(){throw Error('unrelated field must keep focus');}};row.document.activeElement=next;
 row.events.click({preventDefault(){},stopPropagation(){}});
 assert.equal(row.document.activeElement,next);assert.equal(row.field.value,'Entered text');assert.equal(row.button.hidden,true);
});

test('closing the keyboard keeps search results and the Aurum panel open after the button detaches',()=>{
 for (const scope of ['.main-menu-search-wrap','#aurumChatPanel']) {
  const row=keyboardCommandContext();let outsideDismissals=0,documentClick;
  row.button.closest=selector=>row.button.parentElement && selector===scope ? row.host : null;
  row.document.addEventListener=(name,handler)=>{assert.equal(name,'click');documentClick=handler;};
  Object.assign(row.ctx,{brandDropdown:{hidden:true},mainUserDropdown:null,notificationDropdown:null,
   mainMenuScreen:{hidden:scope!=='.main-menu-search-wrap'},aurumChatPanel:{hidden:scope!=='#aurumChatPanel'},
   closeMainMenuDropdowns(){},
   closeMainMenuSearchResults(){outsideDismissals++;},closeAurumChat(){outsideDismissals++;}});
  const start=app.indexOf('document.addEventListener("click", (event) => {\n  if (!brandDropdown.hidden');
  assert.notEqual(start,-1);
  vm.runInContext(app.slice(start,app.indexOf('\ndocument.addEventListener("keydown"',start)),row.ctx);
  row.control.sync();let stopped=false;
  const event={target:row.button,preventDefault(){},stopPropagation(){stopped=true;}};
  row.events.click(event);
  // The DOM bubble path survives node removal; parent-sensitive outside-click
  // handlers must not receive this dedicated keyboard action afterwards.
  if (!stopped) documentClick(event);
  assert.equal(row.button.parentElement,null);assert.equal(row.document.activeElement,null);
  assert.equal(outsideDismissals,0,'closing the keyboard must preserve '+scope);
  assert.equal(row.field.value,'Entered text');
 }
});


test('compact Safari keyboard leaves room for the full 48px input without a fixed 12px margin',()=>{
 const {ctx,field,scrolls}=pageKeyboardContext({webkit:true,height:57,top:12,fieldHeight:48});
 ctx.revealFocusedPageField();
 assert.ok(field.getBoundingClientRect().top>=0);
 assert.ok(field.getBoundingClientRect().bottom<=57,'the whole input must fit in the available space');
 assert.equal(field.value,'test value preserved');
 assert.equal(scrolls.length,1);
 ctx.revealFocusedPageField();assert.equal(scrolls.length,1,'a settled input must stay still');
});

test('Safari login keyboard reveals the password by scrolling the fixed login panel rather than the document',()=>{
 const {ctx,field,scrolls}=pageKeyboardContext({webkit:true,height:57,top:-67,fieldHeight:48});
 let panelScroll=180,adjustments=0;
 const panel={scrollHeight:574,clientHeight:323,
  get scrollTop(){return panelScroll;},set scrollTop(value){panelScroll=value;adjustments++;}};
 field.closest=selector=>selector==='#loginScreen'?panel:null;
 field.getBoundingClientRect=()=>({top:-67-(panelScroll-180),bottom:-19-(panelScroll-180),height:48});
 ctx.revealFocusedPageField();
 assert.ok(field.getBoundingClientRect().top>=0);
 assert.ok(field.getBoundingClientRect().bottom<=57);
 assert.equal(scrolls.length,0,'the document must not pan independently of its fixed login panel');
 assert.equal(adjustments,1);assert.equal(field.value,'test value preserved');
 ctx.revealFocusedPageField();assert.equal(adjustments,1,'the fixed login must stay stable after reveal');
});


test('Safari automatic login pan can finish revealing the field while manual scrolling stays free',()=>{
 let pageCorrections=0;
 const field={dataset:{keyboardRevealUntil:String(Date.now()+3000)},closest:selector=>selector==='#loginScreen'?{}:null};
 const ctx=vm.createContext({window:{innerWidth:956,innerHeight:173,visualViewport:{width:956,height:47,offsetTop:150,offsetLeft:0},requestAnimationFrame:callback=>callback()},
  document:{activeElement:field,documentElement:{style:{setProperty(){}},classList:{toggle(){}}}},notificationDropdown:null,
  restoreAurumFloatingPosition(){},scheduleAurumViewportClamp(){},scheduleAurumAvoidance(){},keyboardDismissControl:{sync(){}},
  revealFocusedOverlayField(){},revealFocusedPageField:()=>pageCorrections++});
 const start=app.indexOf('function syncFloatingViewport(');
 vm.runInContext(app.slice(start,app.indexOf('\nwindow.addEventListener("resize", syncFloatingViewport);',start)),ctx);
 ctx.syncFloatingViewport({type:'scroll'});assert.equal(pageCorrections,1,'the delayed Safari focus pan must reveal the login field');
 delete field.dataset.keyboardRevealUntil;
 ctx.syncFloatingViewport({type:'scroll'});assert.equal(pageCorrections,1,'a user scroll must not be pulled back after cancellation');
 field.dataset.keyboardRevealUntil=String(Date.now()-1);
 ctx.syncFloatingViewport({type:'scroll'});assert.equal(pageCorrections,1,'the bounded focus settling interval must expire');
 field.closest=()=>null;field.dataset.keyboardRevealUntil=String(Date.now()+3000);
 ctx.syncFloatingViewport({type:'scroll'});assert.equal(pageCorrections,1,'ordinary screens must retain manual scroll freedom');
});


test('typing in a Safari login field renews its bounded keyboard reveal after a later secure-keyboard resize',()=>{
 let handler,pageCorrections=0,keyboardSyncs=0;
 const field={value:'unchanged password',dataset:{keyboardRevealUntil:'1'},closest:selector=>selector==='#loginScreen'?{}:null,matches:selector=>selector==='input'};
 const ctx=vm.createContext({Date:{now:()=>6000},document:{addEventListener:(type,callback)=>{assert.equal(type,'input');handler=callback;}},
  window:{requestAnimationFrame:callback=>callback()},revealFocusedPageField:()=>pageCorrections++,keyboardDismissControl:{sync:()=>keyboardSyncs++},
  AURUM_ACTIVE_FIELD_SELECTOR:'aurum field',dispatchAurumAvoidanceUpdate(){}});
 const start=app.indexOf('document.addEventListener("input", (event) => {',app.indexOf('function syncFloatingViewport('));
 vm.runInContext(app.slice(start,app.indexOf('\ndocument.addEventListener("change", (event) => {',start)),ctx);
 handler({target:field});
 assert.ok(Number(field.dataset.keyboardRevealUntil)>6000,'typing must renew the short reveal window');
 assert.equal(pageCorrections,1);assert.equal(keyboardSyncs,1);assert.equal(field.value,'unchanged password');
 const ordinary={value:'unchanged',dataset:{},closest:()=>null,matches:()=>false};
 handler({target:ordinary});assert.deepEqual(ordinary.dataset,{});assert.equal(pageCorrections,1,'ordinary fields retain their existing behavior');
});


test('Safari collapsed innerHeight still reveals the focused login input using the fixed panel height',()=>{
 const {ctx,field,scrolls}=pageKeyboardContext({webkit:true,height:47,top:-167,fieldHeight:48});
 ctx.window.innerHeight=72;
 let panelScroll=251;
 const panel={clientHeight:323,scrollHeight:574,get scrollTop(){return panelScroll;},set scrollTop(value){panelScroll=value;}};
 field.closest=selector=>selector==='#loginScreen'?panel:null;
 field.getBoundingClientRect=()=>({top:-167-(panelScroll-251),bottom:-119-(panelScroll-251),height:48});
 ctx.revealFocusedPageField();
 assert.equal(field.getBoundingClientRect().top,0,'the focused field must return below the browser bar even when innerHeight also shrinks');
 assert.equal(field.getBoundingClientRect().height,48);assert.equal(scrolls.length,0);assert.equal(field.value,'test value preserved');
 const settled=panelScroll;ctx.revealFocusedPageField();assert.equal(panelScroll,settled);
});

test('Safari keyboard Fine stays available when login panning shrinks innerHeight below the normal keyboard threshold',()=>{
 const row=keyboardCommandContext();row.ctx.window.innerWidth=956;row.ctx.window.innerHeight=72;row.viewport.width=956;row.viewport.height=47;
 row.field.closest=selector=>selector==='#loginScreen'?{clientHeight:323}:null;
 row.control.sync();
 assert.equal(row.button.hidden,false,'the real keyboard must keep an accessible dismissal command');
 assert.equal(row.button.style.height,'44px');assert.equal(row.field.value,'Entered text');
 row.viewport.height=323;row.ctx.window.innerHeight=323;row.control.sync();assert.equal(row.button.hidden,true,'Fine must still disappear when the keyboard closes');
});
