import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=html.match(/<script id="draw-logic">([\s\S]*?)<\/script>/)[1];
const {drawPeople}=vm.runInNewContext(source+';({drawPeople})');
function seeded(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function group(counts,type='Adult'){return counts.flatMap((count,h)=>Array.from({length:count},(_,i)=>({name:`${type} ${h} ${i}`,type,household:`Home ${h}`})));}
function check(people,result){assert.equal(result.error,undefined);assert.equal(result.assignments.length,people.length);assert.equal(new Set(result.assignments.map(a=>a.giver)).size,people.length);assert.equal(new Set(result.assignments.map(a=>a.receiver)).size,people.length);for(const a of result.assignments){const giver=people.find(p=>p.name===a.giver),receiver=people.find(p=>p.name===a.receiver);assert.ok(giver&&receiver);assert.notEqual(giver.name,receiver.name);assert.notEqual(giver.household,receiver.household);assert.equal(giver.type,receiver.type);}}
test('valid separate pools across 1000 seeds, without mutation',()=>{const people=[...group([3,2,2,1]),...group([2,2,1,1],'Kid')];const original=JSON.stringify(people);for(let seed=0;seed<1000;seed++)check(people,drawPeople(people,seeded(seed)));assert.equal(JSON.stringify(people),original);});
test('exactly half the pool in one household',()=>{for(let seed=0;seed<100;seed++)check(group([5,3,2]),drawPeople(group([5,3,2]),seeded(seed)));});
test('backtracking without shuffle retries',()=>{for(let seed=0;seed<100;seed++){const people=[...group([4,2,1,1]),...group([2,1,1],'Kid')];check(people,drawPeople(people,seeded(seed),0));}});
test('impossible groups explain the problem',()=>{assert.match(drawPeople([]).error,/Add people/);assert.match(drawPeople(group([1])).error,/Adult.*only one/);assert.match(drawPeople(group([1],'Kid')).error,/Kid.*only one/);assert.match(drawPeople(group([3,1])).error,/Adult.*Home 0.*3 of 4.*more than half/);assert.match(drawPeople(group([3,1],'Kid')).error,/Kid.*more than half/);});
test('two households and an empty age group are valid',()=>check(group([1,1]),drawPeople(group([1,1]))));
test('required and unique names',()=>{assert.match(drawPeople([{name:'',household:'A',type:'Adult'}]).error,/name/);assert.match(drawPeople([{name:'Sam',household:'A',type:'Adult'},{name:' sam ',household:'B',type:'Adult'}]).error,/unique/);});
test('all small household distributions agree with feasibility rule',()=>{for(let a=1;a<=5;a++)for(let b=1;b<=5;b++)for(let c=0;c<=5;c++){const counts=[a,b,c],people=group(counts),result=drawPeople(people,seeded(a*100+b*10+c),0);if(Math.max(...counts)>people.length/2)assert.ok(result.error);else check(people,result);}});

// Run the actual wish list click handler with a minimal document surface.
function wishEditor(setup) {
  const nodes=Object.fromEntries(['app','wishoutput','json','wishstatus','loadnote','retry','freshchoice','generate','checkpublished','messagewarning','status'].map(id=>[id,{hidden:true,value:'',textContent:''}]));
  const context=vm.createContext({document:{getElementById:id=>nodes[id]},window:{addEventListener(){}},confirm:()=>true});
  const scripts=[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  vm.runInContext(scripts[0],context);
  vm.runInContext(scripts[1].replace(/route\(\);\s*$/,''),context);
  vm.runInContext('sourceReady=true;',context);
  vm.runInContext(setup,context);
  vm.runInContext('generateWishlists()',context);
  return {nodes,context};
}
test('wish list generation works with unfinished households and blank extra rows',()=>{
  const {nodes}=wishEditor(`households=[{id:1,name:'',members:[{id:2,name:'Alex',type:'Adult',contact:'private@example.com'},{id:3,name:'',type:'Adult'}]}];wishes={alex:'Books\\n Coffee \\n'};`);
  assert.equal(nodes.wishoutput.hidden,false);
  assert.deepEqual(JSON.parse(nodes.json.value),{people:{alex:{name:'Alex',ideas:['Books','Coffee']}}});
  assert.match(nodes.wishstatus.textContent,/ready/i);
  assert.ok(!nodes.json.value.includes('private@example.com'));
});
test('wish list errors appear beside the button and discard stale output',()=>{
  const {nodes,context}=wishEditor(`households=[{id:1,name:'',members:[{id:2,name:'Alex'}]}];`);
  assert.ok(nodes.json.value);
  vm.runInContext(`households[0].members.push({id:3,name:'Alex!'});generateWishlists();`,context);
  assert.match(nodes.wishstatus.textContent,/too similar/);
  assert.equal(nodes.wishoutput.hidden,true);
  assert.equal(nodes.json.value,'');
});
test('empty wish list setup explains what to do',()=>{
  const {nodes}=wishEditor('households=[];');
  assert.match(nodes.wishstatus.textContent,/Add at least one person/);
  assert.equal(nodes.wishoutput.hidden,true);
});

const logic=vm.runInNewContext(source+';({buildWishlists,contactKind,deliveryTarget,deliveryUrl,sameWishlists,messageTemplateError})');
test('partial updates retain other published lists and omit contacts',()=>{
  const saved={alex:{name:'Alex',ideas:['Old'],contact:'secret'},blair:{name:'Blair',ideas:['Keep this']}};
  const result=logic.buildWishlists([{name:'Alex',ideas:'New'}],saved);
  assert.deepEqual(JSON.parse(JSON.stringify(result.data)),{people:{alex:{name:'Alex',ideas:['New']},blair:{name:'Blair',ideas:['Keep this']}}});
  assert.equal(saved.alex.ideas[0],'Old');
});
test('published people can be edited without household setup',()=>{
  const {nodes}=wishEditor(`fetched={alex:{name:'Alex',ideas:['Old']},blair:{name:'Blair',ideas:['Keep']}};wishes={alex:'New'};`);
  assert.deepEqual(JSON.parse(nodes.json.value),{people:{alex:{name:'Alex',ideas:['New']},blair:{name:'Blair',ideas:['Keep']}}});
});
test('changing ideas invalidates prepared data and keeps exit warning until acknowledged',()=>{
  const {nodes,context}=wishEditor(`extraNames=['Alex'];wishes={alex:'Books'};`);
  assert.equal(vm.runInContext('needsWarning()',context),true);
  vm.runInContext(`wishes.alex='Coffee';ideasDirty=true;invalidateWishOutput();`,context);
  assert.equal(nodes.json.value,'');assert.equal(nodes.wishoutput.hidden,true);
  assert.match(nodes.wishstatus.textContent,/changed.*new update/);
  vm.runInContext('generateWishlists();markUploaded();',context);
  assert.equal(vm.runInContext('needsWarning()',context),false);
  assert.equal(vm.runInContext('fetched.alex.ideas[0]',context),'Coffee');
});
test('saved name collisions cannot overwrite another person',()=>{
  assert.match(logic.buildWishlists([{name:'Anne Marie',ideas:'New'}],{'anne-marie':{name:'Anne-Marie',ideas:['Keep']}}).error,/conflicts/);
});
test('kid delivery accepts an adult from any household and rejects stale choices',()=>{
  const kid={id:1,name:'Jamie',type:'Kid',householdId:1,parent:''};
  const adult={id:2,name:'Alex',type:'Adult',householdId:2,contact:'a@example.com'};
  const other={id:3,name:'Blair',type:'Adult',householdId:3};
  assert.equal(logic.deliveryTarget(kid,[kid,adult]),adult);
  assert.equal(logic.deliveryTarget(kid,[kid,adult,other]),null);
  assert.equal(logic.deliveryTarget({...kid,parent:'3'},[kid,adult,other]),other);
  assert.equal(logic.deliveryTarget({...kid,parent:'2'},[kid,other]),null);
  assert.equal(logic.deliveryTarget({...kid,parent:'1'},[kid,adult]),null);
  assert.equal(logic.deliveryTarget(kid,[kid,{...adult,name:''}]),null);
});
test('delivery URL formats and contact detection',()=>{
  assert.equal(logic.contactKind('555 123 4567'),'sms');
  assert.equal(logic.contactKind('alex@example.com'),'email');
  assert.equal(logic.contactKind('---'),'');
  assert.equal(logic.deliveryUrl('+1 (555) 123-4567','Hello & surprise'),'sms:+15551234567?&body=Hello%20%26%20surprise');
  assert.match(logic.deliveryUrl('alex@example.com','Hello'),/^mailto:alex%40example\.com/);
});
test('opening a message never marks it sent',()=>{
  const {context}=wishEditor(`households=[{id:1,name:'A',members:[{id:2,name:'Alex',type:'Adult',contact:'alex@example.com'}]}];`);
  vm.runInContext(`location={origin:'https://example.com',pathname:'/santa/'};linkFor=()=> 'https://example.com/#/r/test';renderDelivery=()=>{};launchMessageDraft=()=>{};openMessage(people()[0],people()[0]);`,context);
  assert.equal(vm.runInContext('sent.size',context),0);
  assert.equal(vm.runInContext('opened.has(2)',context),true);
});

test('renaming a person preserves their draft through a blank name',()=>{
  const {context}=wishEditor(`households=[{id:1,name:'North',members:[{id:2,name:'Alex'}]}];editIdeas('Alex','Books');`);
  vm.runInContext(`renamePerson(originalPerson(2),'');renamePerson(originalPerson(2),'Alexander');`,context);
  const result=JSON.parse(vm.runInContext('JSON.stringify(wishResult().data)',context));
  assert.deepEqual(result.people.alexander.ideas,['Books']);
});
test('entering an existing name character by character loads saved ideas',()=>{
  const {context}=wishEditor(`fetched={alex:{name:'Alex',ideas:['Saved']}};households=[{id:1,name:'North',members:[{id:2,name:''}]}];`);
  vm.runInContext(`for(const name of ['A','Al','Ale','Alex'])renamePerson(originalPerson(2),name);`,context);
  assert.equal(vm.runInContext(`wishText('Alex')`,context),'Saved');
});
test('renamed published people retain old link ideas and new name drafts',()=>{
  const {context}=wishEditor(`fetched={alex:{name:'Alex',ideas:['Saved']}};households=[{id:1,name:'North',members:[{id:2,name:'Alex'}]}];`);
  vm.runInContext(`renamePerson(originalPerson(2),'Alexander');editIdeas('Alexander','New ideas');`,context);
  const result=JSON.parse(vm.runInContext('JSON.stringify(wishResult().data)',context));
  assert.deepEqual(result.people.alex.ideas,['Saved']);
  assert.deepEqual(result.people.alexander.ideas,['New ideas']);
});
test('clear reloads published lists before permitting an export',async()=>{
  const {context,nodes}=wishEditor(`fetched={blair:{name:'Blair',ideas:['Keep']}};`);
  vm.runInContext(`organizer=()=>{};fetchWishes=()=>new Promise(resolve=>{globalThis.finishLoad=resolve;});`,context);
  const clearing=vm.runInContext('clearAll()',context);
  vm.runInContext(`extraNames=['Alex'];generateWishlists();`,context);
  assert.equal(nodes.json.value,'');assert.match(nodes.wishstatus.textContent,/loading/);
  vm.runInContext(`finishLoad({blair:{name:'Blair',ideas:['Keep']}});`,context);
  await clearing;
  vm.runInContext('generateWishlists()',context);
  assert.deepEqual(JSON.parse(nodes.json.value).people.blair.ideas,['Keep']);
});
test('failed load blocks export and successful retry preserves unrelated people',async()=>{
  const {context,nodes}=wishEditor(`extraNames=['Alex'];editIdeas('Alex','Books');`);
  vm.runInContext('fetchWishes=async()=>null;',context);
  await vm.runInContext('loadSavedWishes()',context);
  vm.runInContext('generateWishlists()',context);
  assert.equal(nodes.json.value,'');assert.equal(nodes.wishoutput.hidden,true);
  assert.match(nodes.wishstatus.textContent,/Load saved ideas/);
  vm.runInContext(`fetchWishes=async()=>({blair:{name:'Blair',ideas:['Keep']}});`,context);
  await vm.runInContext('loadSavedWishes()',context);
  vm.runInContext('generateWishlists()',context);
  const data=JSON.parse(nodes.json.value);
  assert.deepEqual(data.people.alex.ideas,['Books']);assert.deepEqual(data.people.blair.ideas,['Keep']);
});
test('new-file mode requires confirmation and invalidates outstanding loads',async()=>{
  const {context,nodes}=wishEditor(`extraNames=['Alex'];sourceReady=false;loadFailed=true;`);
  vm.runInContext('confirm=()=>false;startNewWishFile();generateWishlists();',context);
  assert.equal(nodes.json.value,'');
  vm.runInContext(`fetchWishes=()=>new Promise(resolve=>{globalThis.finishLoad=resolve;});`,context);
  const loading=vm.runInContext('loadSavedWishes()',context);
  vm.runInContext('confirm=()=>true;startNewWishFile();generateWishlists();',context);
  assert.deepEqual(Object.keys(JSON.parse(nodes.json.value).people),['alex']);
  assert.match(nodes.wishstatus.textContent,/replace all/);
  vm.runInContext(`finishLoad({blair:{name:'Blair',ideas:['Old']}});`,context);
  await loading;
  assert.equal(vm.runInContext('newWishFile && sourceReady',context),true);
  assert.equal(vm.runInContext('Object.keys(fetched).length',context),0);
});
test('later load wins over an older response',async()=>{
  const {context}=wishEditor(`fetchWishes=()=>new Promise(resolve=>{(globalThis.pending??=[]).push(resolve);});`);
  const first=vm.runInContext('loadSavedWishes()',context);
  const second=vm.runInContext('loadSavedWishes()',context);
  vm.runInContext(`pending[1]({blair:{name:'Blair',ideas:['New']}});`,context);await second;
  vm.runInContext(`pending[0]({blair:{name:'Blair',ideas:['Old']}});`,context);await first;
  assert.equal(vm.runInContext('fetched.blair.ideas[0]',context),'New');
});

test('renaming into another published person cannot overwrite their ideas',()=>{
  const {context}=wishEditor(`fetched={blair:{name:'Blair',ideas:['Keep']}};households=[{id:1,name:'North',members:[{id:2,name:'Alex'}]}];editIdeas('Alex','Books');`);
  vm.runInContext(`renamePerson(originalPerson(2),'Blair');`,context);
  assert.equal(vm.runInContext('wishResult().code',context),'RENAME_CONFLICT');
});
test('release version is consistent across app metadata, footer, README and changelog',()=>{
  const version=html.match(/const VERSION = '([^']+)'/)[1];
  assert.ok(html.includes(`name="application-version" content="${version}"`));
  assert.ok(readFileSync(new URL('../README.md',import.meta.url),'utf8').startsWith(`# Family Secret Santa v${version}\n`));
  assert.ok(readFileSync(new URL('../CHANGELOG.md',import.meta.url),'utf8').includes(`## ${version} (`));
});

test('publication comparison ignores object ordering but detects missing or changed ideas',()=>{
  const expected={alex:{name:'Alex',ideas:['Books']},blair:{name:'Blair',ideas:[]}};
  assert.equal(logic.sameWishlists({blair:expected.blair,alex:expected.alex},expected),true);
  assert.equal(logic.sameWishlists({alex:expected.alex},expected),false);
  assert.equal(logic.sameWishlists({...expected,alex:{name:'Alex',ideas:['Coffee']}},expected),false);
});
test('matching published ideas clear the unpublished-edit warning',async()=>{
  const {context,nodes}=wishEditor(`extraNames=['Alex'];editIdeas('Alex','Books');fetchWishes=async()=>({alex:{name:'Alex',ideas:['Books']}});`);
  await vm.runInContext('checkPublishedIdeas()',context);
  assert.match(nodes.wishstatus.textContent,/Verified/);
  assert.equal(vm.runInContext('ideasDirty',context),false);
  assert.equal(nodes.checkpublished.disabled,false);
});
test('mismatch or failed check keeps drafts and warning',async()=>{
  const {context,nodes}=wishEditor(`extraNames=['Alex'];editIdeas('Alex','Books');fetchWishes=async()=>({alex:{name:'Alex',ideas:['Old']}});`);
  await vm.runInContext('checkPublishedIdeas()',context);
  assert.match(nodes.wishstatus.textContent,/does not match/);
  assert.equal(vm.runInContext('ideasDirty',context),true);
  assert.equal(vm.runInContext(`wishText('Alex')`,context),'Books');
  vm.runInContext('fetchWishes=async()=>null;',context);
  await vm.runInContext('checkPublishedIdeas()',context);
  assert.match(nodes.wishstatus.textContent,/Could not check/);
  assert.equal(vm.runInContext('ideasDirty',context),true);
});
test('editing during a publication check cannot mark newer ideas saved',async()=>{
  const {context,nodes}=wishEditor(`extraNames=['Alex'];editIdeas('Alex','Books');fetchWishes=()=>new Promise(resolve=>globalThis.finishCheck=resolve);`);
  const checking=vm.runInContext('checkPublishedIdeas()',context);
  vm.runInContext(`editIdeas('Alex','Coffee');generateWishlists();finishCheck({alex:{name:'Alex',ideas:['Books']}});`,context);
  await checking;
  assert.equal(vm.runInContext('ideasDirty',context),true);
  assert.equal(vm.runInContext(`wishText('Alex')`,context),'Coffee');
  assert.doesNotMatch(nodes.wishstatus.textContent,/Verified/);
});
test('regenerating the same update cancels an earlier publication check',async()=>{
  const {context,nodes}=wishEditor(`extraNames=['Alex'];editIdeas('Alex','Books');fetchWishes=()=>new Promise(resolve=>globalThis.finishCheck=resolve);`);
  const checking=vm.runInContext('checkPublishedIdeas()',context);
  vm.runInContext(`generateWishlists();finishCheck({alex:{name:'Alex',ideas:['Books']}});`,context);
  await checking;
  assert.equal(vm.runInContext('ideasDirty',context),true);
  assert.doesNotMatch(nodes.wishstatus.textContent,/Verified/);
});
test('missing link blocks opening a message and leaves it unsent',()=>{
  const {context,nodes}=wishEditor(`households=[{id:1,name:'A',members:[{id:2,name:'Alex',type:'Adult',contact:'alex@example.com'}]}];adultMessage='Hi {name}!';location={href:'unchanged'};`);
  vm.runInContext('openMessage(people()[0],people()[0]);',context);
  assert.equal(vm.runInContext('location.href',context),'unchanged');
  assert.equal(vm.runInContext('opened.size+sent.size',context),0);
  assert.match(nodes.messagewarning.textContent,/Adult message/);
  assert.match(nodes.status.textContent,/add \{link\}/);
});
test('template warnings are independent and clear when fixed',()=>{
  const {context,nodes}=wishEditor(`kidMessage='Hello';updateMessageWarnings();`);
  assert.match(nodes.messagewarning.textContent,/Kid message/);
  assert.doesNotMatch(nodes.messagewarning.textContent,/Adult message/);
  vm.runInContext(`kidMessage='For {kid}: {link}';updateMessageWarnings();`,context);
  assert.equal(nodes.messagewarning.textContent,'');
  assert.ok(logic.messageTemplateError(''));
  assert.equal(logic.messageTemplateError('{link}'),'');
});

function checkFlexible(people,result,options) {
  assert.equal(result.error,undefined);
  assert.equal(result.assignments.length,people.length);
  assert.equal(new Set(result.assignments.map(a=>a.giver)).size,people.length);
  assert.equal(new Set(result.assignments.map(a=>a.receiver)).size,people.length);
  for(const a of result.assignments){
    const g=people.find(p=>p.name===a.giver),r=people.find(p=>p.name===a.receiver);
    assert.ok(g&&r);assert.notEqual(g.name,r.name);
    if(!options.mixed)assert.equal(g.type,r.type);
    if(!options.allowHousehold)assert.notEqual(g.household,r.household);
  }
}
test('one kid and two adults work in a giant pool with same-household matches enabled',()=>{
  const ps=[{name:'Jamie',type:'Kid',household:'Kids'},{name:'Alex',type:'Adult',household:'Adults'},{name:'Blair',type:'Adult',household:'Adults'}];
  assert.ok(drawPeople(ps).error);
  assert.match(drawPeople(ps,seeded(1),200,{mixed:true}).error,/more than half/);
  for(let seed=0;seed<1000;seed++)checkFlexible(ps,drawPeople(ps,seeded(seed),200,{mixed:true,allowHousehold:true}),{mixed:true,allowHousehold:true});
});
test('all draw configurations preserve their rules across seeds and backtracking',()=>{
  const ps=[...group([2,2,1]),...group([1,1,1],'Kid')];
  const initial=JSON.stringify(ps);
  for(const mixed of [false,true])for(const allowHousehold of [false,true])for(const retries of [0,200])for(let seed=0;seed<100;seed++){
    const options={mixed,allowHousehold};
    checkFlexible(ps,drawPeople(ps,seeded(seed),retries,options),options);
  }
  assert.equal(JSON.stringify(ps),initial);
});
test('a single household is valid only when household matching is enabled',()=>{
  const ps=[...group([2]),...group([2],'Kid')];
  assert.ok(drawPeople(ps).error);
  checkFlexible(ps,drawPeople(ps,seeded(5),0,{allowHousehold:true}),{allowHousehold:true});
  checkFlexible(ps,drawPeople(ps,seeded(5),0,{mixed:true,allowHousehold:true}),{mixed:true,allowHousehold:true});
});
test('mixed single-person pool still fails clearly',()=>{
  assert.match(drawPeople(group([1]),seeded(1),0,{mixed:true,allowHousehold:true}).error,/Everyone.*only one/);
});
// Minimal element surface to exercise setup controls without opening a browser.
class ControlNode {
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.classList={add(){}};}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
  setAttribute(name,value){this[name]=value;}
}
test('kid setup selector lists and selects contacts across households before drawing',()=>{
  const {context}=wishEditor(`households=[{id:1,name:'Kids',members:[{id:1,name:'Jamie',type:'Kid',parent:''}]},{id:2,name:'Adults',members:[{id:2,name:'Alex',type:'Adult',contact:'alex@example.com'},{id:3,name:'Blair',type:'Adult',contact:'5551234567'}]}];`);
  context.makeNode=tag=>new ControlNode(tag);
  const control=vm.runInContext(`document.createElement=makeNode;kidContactControl(people()[0]);`,context);
  const select=control.children[0].children[0];
  assert.deepEqual(select.children.map(o=>o.textContent),['Choose an adult','Alex (Adults)','Blair (Adults)']);
  select.value='3';select.onchange();
  assert.equal(vm.runInContext('originalPerson(1).parent',context),'3');
  assert.equal(vm.runInContext('deliveryTarget(people()[0],people()).contact',context),'5551234567');
  assert.equal(vm.runInContext('matches',context),null);
});
test('setup draw controls configure the actual draw options',()=>{
  const {context,nodes}=wishEditor('');
  nodes.drawsettings=new ControlNode('div');
  context.makeNode=tag=>new ControlNode(tag);
  vm.runInContext(`document.createElement=makeNode;document.createTextNode=text=>text;renderDrawSettings();`,context);
  const [poolLabel,householdLabel]=nodes.drawsettings.children;
  const pool=poolLabel.children[0],checkbox=householdLabel.children[0];
  assert.equal(pool.value,'separate');assert.equal(checkbox.checked,false);
  pool.value='mixed';pool.onchange();checkbox.checked=true;checkbox.onchange();
  assert.equal(vm.runInContext('drawOptions.mixed && drawOptions.allowHousehold',context),true);
  assert.match(vm.runInContext('drawRuleSummary()',context),/Everyone.*allowed.*Nobody draws themselves/);
});
test('organizer draw uses mixed settings and keeps kid reveal identity',()=>{
  const {context,nodes}=wishEditor(`households=[{id:1,name:'Kids',members:[{id:1,name:'Jamie',type:'Kid',parent:'2'}]},{id:2,name:'Adults',members:[{id:2,name:'Alex',type:'Adult'},{id:3,name:'Blair',type:'Adult'}]}];drawOptions={mixed:true,allowHousehold:true};updateDrawView=()=>{};`);
  context.crypto={getRandomValues:a=>a.fill(0)};
  context.TextEncoder=TextEncoder;context.TextDecoder=TextDecoder;context.btoa=btoa;context.atob=atob;
  vm.runInContext(`location={origin:'https://example.com',pathname:'/santa/'};draw();`,context);
  assert.equal(vm.runInContext('matches.length',context),3);
  const data=JSON.parse(vm.runInContext(`JSON.stringify(decode(linkFor(people()[0]).split('#/r/')[1]))`,context));
  assert.equal(data.g,'Jamie');assert.equal(data.k,'Jamie');assert.ok(['Alex','Blair'].includes(data.r));
});

for(const [kind,contact] of [['email','alex@example.com'],['text','5551234567']]) {
  test(`${kind} draft opens separately without navigating or disabling exit warnings`,()=>{
    const {context}=wishEditor(`households=[{id:1,name:'A',members:[{id:2,name:'Alex',type:'Adult',contact:${JSON.stringify(contact)}}]}];matches=[{giver:'Alex',receiver:'Blair'}];`);
    let anchor,attached=false,removed=false,clicked=false;
    context.document.createElement=tag=>{
      assert.equal(tag,'a');
      anchor={click(){assert.equal(attached,true);clicked=true;},remove(){removed=true;}};
      return anchor;
    };
    context.document.body={append(node){assert.equal(node,anchor);attached=true;}};
    vm.runInContext(`location={href:'https://example.com/santa/'};linkFor=()=> 'https://example.com/santa/#/r/test';renderDelivery=()=>{};openMessage(people()[0],people()[0]);`,context);
    assert.equal(clicked,true);assert.equal(removed,true);
    assert.equal(anchor.target,'_blank');assert.equal(anchor.rel,'noopener noreferrer');
    assert.ok(anchor.href.startsWith(kind==='email'?'mailto:':'sms:'));
    assert.ok(decodeURIComponent(anchor.href).includes('https://example.com/santa/#/r/test'));
    assert.equal(vm.runInContext('location.href',context),'https://example.com/santa/');
    assert.equal(vm.runInContext('needsWarning()',context),true);
    assert.equal(vm.runInContext('sent.size',context),0);
    assert.equal(vm.runInContext('opened.has(2)',context),true);
  });
}
test('successful link copy shows confirmation only after clipboard resolves and resets it',async()=>{
  const {context,nodes}=wishEditor('');
  nodes.toast={hidden:true,textContent:''};
  let finish, copied;const timers=new Map();let next=0;
  context.setTimeout=fn=>{timers.set(++next,fn);return next;};
  context.clearTimeout=id=>timers.delete(id);
  context.navigator={clipboard:{writeText:text=>{copied=text;return new Promise(resolve=>finish=resolve);}}};
  context.copyButton={textContent:'Copy link'};
  const copying=vm.runInContext(`copy('https://example.com/#/r/test','status',copyButton)`,context);
  assert.equal(nodes.toast.hidden,true);assert.equal(context.copyButton.textContent,'Copy link');
  finish();await copying;
  assert.equal(copied,'https://example.com/#/r/test');
  assert.equal(nodes.toast.textContent,'Link copied');assert.equal(nodes.toast.hidden,false);
  assert.equal(context.copyButton.textContent,'Link copied');assert.equal(vm.runInContext('sent.size',context),0);
  for(const callback of timers.values())callback();
  assert.equal(nodes.toast.hidden,true);assert.equal(context.copyButton.textContent,'Copy link');
});
test('clipboard failure shows manual-copy fallback without success confirmation',async()=>{
  const {context,nodes}=wishEditor('');nodes.toast={hidden:true,textContent:''};
  context.setTimeout=()=>1;context.clearTimeout=()=>{};
  context.navigator={clipboard:{writeText:async()=>{throw Error('denied');}}};
  let fallback,focused=false,selected=false;
  context.document.createElement=()=>({setAttribute(){},focus(){focused=true;},select(){selected=true;}});
  nodes.status.after=node=>fallback=node;
  context.copyButton={textContent:'Copy link'};
  await vm.runInContext(`copy('test-link','status',copyButton)`,context);
  assert.equal(context.copyButton.textContent,'Copy link');
  assert.equal(nodes.toast.textContent,'Could not copy automatically');
  assert.equal(fallback.value,'test-link');assert.ok(focused&&selected);
  assert.match(nodes.status.textContent,/did not work/);
});
function sharingEditor(setup='') {
  return wishEditor(`households=[{id:1,name:'North',members:[{id:1,name:'Alex',type:'Adult',contact:''},{id:2,name:'Jamie',type:'Kid',parent:'3'}]},{id:2,name:'South',members:[{id:3,name:'Blair',type:'Adult',contact:'private@example.com'}]}];matches=[];drawCode='ABCD';linkFor=()=> 'https://example.com/santa/#/r/opaque';renderDelivery=()=>{};showToast=()=>{};${setup}`);
}
test('native sharing supplies the complete adult invitation and never marks it sent',async()=>{
  const {context}=sharingEditor();let payload;
  context.navigator={share:async data=>payload=data};
  await vm.runInContext('shareInvitation(people()[0],null)',context);
  assert.equal(payload.title,'Secret Santa for Alex');
  assert.match(payload.text,/Hi Alex/);assert.match(payload.text,/#\/r\/opaque/);
  assert.equal(vm.runInContext('sent.size',context),0);
  assert.equal(vm.runInContext('opened.has(1)',context),true);
});
test('kid sharing addresses the selected adult without exposing their contact',async()=>{
  const {context}=sharingEditor();let payload;
  context.navigator={share:async data=>payload=data};
  await vm.runInContext('shareInvitation(people()[1],deliveryTarget(people()[1],people()))',context);
  assert.match(payload.text,/Hi Blair/);assert.match(payload.text,/Jamie.s Secret Santa/);
  assert.ok(!JSON.stringify(payload).includes('private@example.com'));
});
test('unsupported sharing copies the invitation rather than only its link',async()=>{
  const {context,nodes}=sharingEditor();let copied;
  context.navigator={clipboard:{writeText:async text=>copied=text}};
  await vm.runInContext('shareInvitation(people()[0],null)',context);
  assert.match(copied,/Hi Alex/);assert.match(copied,/#\/r\/opaque/);
  assert.equal(nodes.status.textContent,'Invitation copied');
  assert.equal(vm.runInContext('opened.size+sent.size',context),0);
});
test('canceling native sharing does not copy or mark anything sent',async()=>{
  const {context,nodes}=sharingEditor();let copied=false;
  context.navigator={share:async()=>{throw {name:'AbortError'};},clipboard:{writeText:async()=>copied=true}};
  await vm.runInContext('shareInvitation(people()[0],null)',context);
  assert.equal(copied,false);assert.equal(vm.runInContext('opened.size+sent.size',context),0);
  assert.match(nodes.status.textContent,/canceled/);assert.equal(vm.runInContext('shareBusy',context),false);
});
test('blocked sharing falls back to clipboard with accurate feedback',async()=>{
  const {context,nodes}=sharingEditor();let copied;
  context.navigator={share:async()=>{throw {name:'NotAllowedError'};},clipboard:{writeText:async text=>copied=text}};
  await vm.runInContext('shareInvitation(people()[0],null)',context);
  assert.match(copied,/Hi Alex/);assert.equal(nodes.status.textContent,'Invitation copied instead');
  assert.equal(vm.runInContext('sent.size',context),0);
});
test('sharing checks unsupported payloads before opening native share',async()=>{
  const {context}=sharingEditor();let shared=false,copied=false;
  context.navigator={canShare:()=>false,share:async()=>shared=true,clipboard:{writeText:async()=>copied=true}};
  await vm.runInContext('shareInvitation(people()[0],null)',context);
  assert.equal(shared,false);assert.equal(copied,true);
});
test('pending shares cannot duplicate or update a newer draw',async()=>{
  const {context}=sharingEditor();let resolve,count=0;
  context.navigator={share:()=>{count++;return new Promise(done=>resolve=done);}};
  const pending=vm.runInContext('shareInvitation(people()[0],null)',context);
  await vm.runInContext('shareInvitation(people()[1],null)',context);
  assert.equal(count,1);
  vm.runInContext("drawCode='EFGH';matches=[];",context);resolve();await pending;
  assert.equal(vm.runInContext('opened.size+sent.size',context),0);
  assert.equal(vm.runInContext('shareBusy',context),false);
});
