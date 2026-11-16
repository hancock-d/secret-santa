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
