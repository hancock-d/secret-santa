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
  const nodes=Object.fromEntries(['app','wishoutput','json','wishstatus','loadnote','retry','freshchoice','generate'].map(id=>[id,{hidden:true,value:'',textContent:''}]));
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

const logic=vm.runInNewContext(source+';({buildWishlists,contactKind,deliveryTarget,deliveryUrl})');
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
test('kid delivery chooses only an adult in the same household',()=>{
  const kid={id:1,type:'Kid',householdId:1,parent:''};
  const adult={id:2,type:'Adult',householdId:1,contact:'a@example.com'};
  const other={id:3,type:'Adult',householdId:2};
  assert.equal(logic.deliveryTarget(kid,[kid,adult,other]),adult);
  const second={id:4,type:'Adult',householdId:1};
  assert.equal(logic.deliveryTarget(kid,[kid,adult,second]),null);
  assert.equal(logic.deliveryTarget({...kid,parent:'4'},[kid,adult,second]),second);
  assert.equal(logic.deliveryTarget({...kid,parent:'3'},[kid,other]),null);
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
  vm.runInContext(`location={origin:'https://example.com',pathname:'/santa/'};linkFor=()=> 'https://example.com/#/r/test';renderDelivery=()=>{};openMessage(people()[0],people()[0]);`,context);
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
