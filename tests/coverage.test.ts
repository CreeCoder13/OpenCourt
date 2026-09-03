import assert from 'node:assert/strict';
import test from 'node:test';
import { connectCatalogs, courtLevels, decade, emptyFilters, filterCases, makeCoverageCase, mergeCases, percent, priority, rowsFor, validDate } from '../lib/coverage/model.ts';
import type { Catalogs } from '../lib/coverage/model.ts';

const now = '2026-09-03T12:00:00Z';
const payload = { id:'one',slug:'case-one',caseName:'One v Crown',officialCitation:'2020 SCC 1',court:'Supreme Court of Canada',courtLevel:'Supreme Court',provinceTerritory:'British Columbia',indigenousGroup:'First Nations',decisionDate:'2020-01-10',status:'Decided',verificationLevel:'Verified',contentStatus:'Published',lastVerified:'2026-08-28',legalTopics:['Treaty Rights'],treaties:[],indigenousCommunities:['Nation One'],sources:[{type:'Primary',url:'https://example.com/judgment'}],relatedCases:[] };
const make = (changes: Record<string,unknown> = {}) => makeCoverageCase({...payload,...changes},now);

test('deduplicates a DB seed by slug and by full citation while preserving curated case data',() => {
  const source = make();
  const seeded = make({slug:'imported-one',categories:[],legalTopics:[],indigenousArgument:''});
  const sameAlias = make({slug:'imported-one',officialCitation:''});
  assert.deepEqual(mergeCases([source],[seeded,sameAlias]),[source]);
  assert.equal(mergeCases([source],[make({slug:'different-decision',officialCitation:'2021 SCC 2'})]).length,2);
});

test('normalizes actual stored discovery fields without marking drafts published',() => {
  const record = makeCoverageCase({slug:'draft',caseName:'Draft',court:'Federal Court of Appeal',provinceTerritory:['BC','Alberta'],IndigenousPeople:['Métis','Inuit'],IndigenousNation:['Nation'],categories:['Section 35'],treaty:['Treaty 6'],currentLegalStatus:'APPEAL_PENDING',officialDecisionUrl:'https://example.com/primary'},now,{id:'row',slug:'draft',title:'Stored title',verification:'PARTIALLY_VERIFIED',published_at:null,created_at:'2026-01-01',last_verified_at:null});
  assert.deepEqual(record.provinces,['British Columbia','Alberta']);
  assert.deepEqual(record.groups,['Métis','Inuit']);
  assert.equal(record.verification,'Secondary Source'); assert.equal(record.contentStatus,'Draft');
  assert.equal(record.level,'Federal Court of Appeal'); assert.equal(record.appeal,true); assert.equal(record.ongoing,true);
  assert.ok(!record.quality.includes('Missing primary source')); assert.ok(record.quality.includes('Missing verification date'));
});

test('multi-jurisdiction membership counts once per category and percentages use distinct cases',() => {
  const records = [make({provinceTerritory:['Ontario','Ontario','Nunavut']}),make({id:'two',slug:'two',provinceTerritory:'Canada'})];
  const rows = rowsFor(records,['Ontario','Nunavut','Yukon'],(record) => record.provinces);
  assert.equal(rows.find((row) => row.name === 'Ontario')?.count,1);
  assert.equal(rows.find((row) => row.name === 'Nunavut')?.share,'50.0%');
  assert.equal(rows.find((row) => row.name === 'Yukon')?.priority,'High Priority');
  assert.equal(rows.find((row) => row.name === 'Canada / national')?.count,1);
});

test('filters intersect, date ranges include bounds and exclude undated records',() => {
  const records = [make(),make({id:'two',slug:'two',decisionDate:''}),make({id:'three',slug:'three',verificationLevel:'Needs Verification'})];
  assert.equal(filterCases(records,{...emptyFilters,province:'British Columbia',verification:'Verified',from:'2020-01-10',to:'2020-01-10'}).length,1);
  assert.equal(filterCases(records,{...emptyFilters,group:'Métis'}).length,0);
  assert.equal(filterCases(records,{...emptyFilters,from:'2021-01-01',to:'2020-01-01'}).length,0);
});

test('catalogue links union both directions and normalize labels without counting twice',() => {
  const catalogs = { communities:[{id:'n1',name:'Nation One',slug:'nation-one',alternateNames:['Old Name'],caseSlugs:['reverse'],treaties:[]}],treaties:[{id:'t6',name:'Treaty 6',slug:'treaty-6',caseSlugs:['case-one']}],topics:[{id:'topic1',name:'Treaty Rights',slug:'treaty-rights',relatedCases:[]}] } as unknown as Catalogs;
  const linked = connectCatalogs([make({indigenousCommunities:['Old Name','nation-one'],legalTopics:['treaty-rights']})],catalogs)[0];
  assert.deepEqual(linked.communities,['Nation One']); assert.deepEqual(linked.treaties,['Treaty 6']);
  assert.deepEqual(linked.topics,['Treaty Rights']); assert.ok(!linked.quality.includes('Treaty association to review'));
  const reverse = connectCatalogs([make({slug:'reverse',indigenousCommunities:[]})],catalogs)[0];
  assert.deepEqual(reverse.communities,['Nation One']); assert.ok(!reverse.quality.includes('Missing community'));
});

test('quality checks distinguish relevant treaty gaps, missing URLs, stale dates, and placeholders',() => {
  const record = make({lastVerified:'2024-01-01',sources:[{type:'Primary',url:'javascript:alert(1)'}],facts:'The Indigenous parties asked the Court to recognize or enforce rights.'});
  for (const flag of ['Missing primary source','Treaty association to review','Placeholder text','Verification older than 365 days']) assert.ok(record.quality.includes(flag as never));
  assert.ok(!make({legalTopics:['Taxation']}).quality.includes('Treaty association to review'));
  const linked = makeCoverageCase(payload,now,{id:'one',verification:'VERIFIED_PRIMARY',published_at:'2026-01-01',has_case_relationship:1});
  assert.ok(!linked.quality.includes('Missing related cases'));
});

test('court levels keep provincial supreme courts distinct from the Supreme Court of Canada',() => {
  assert.equal(make().level,courtLevels[0]);
  assert.equal(make({court:'Supreme Court of Prince Edward Island',courtLevel:'Supreme Court'}).level,'Superior Courts');
  assert.equal(make({court:'Ontario Court of Appeal',courtLevel:''}).level,'Provincial Courts of Appeal');
  assert.equal(make({court:'Unfamiliar court',courtLevel:''}).level,'Unclassified');
});

test('closed proceedings do not inflate ongoing counts and missing dates stay unknown',() => {
  assert.equal(make({caseType:'ongoing',status:'Settled'}).ongoing,false);
  assert.equal(make({status:'Decision reserved'}).ongoing,true);
  assert.equal(decade(make({decisionDate:'1949-01-01'})),'Pre-1950');
  assert.equal(decade(make({decisionDate:''})),'Unknown / no decision');
  assert.equal(validDate('2020-02-31'),'');
  assert.equal(validDate('2020-02-29'),'2020-02-29');
});

test('empty selections avoid NaN and priorities use documented relative thresholds',() => {
  assert.equal(percent(0,0),'—'); assert.equal(priority(0,0),'High Priority');
  assert.equal(priority(2,2),'Medium Priority'); assert.equal(priority(5,100),'Medium Priority');
  assert.equal(priority(25,100),'Healthy');
  assert.equal(rowsFor([],['Inuit'],() => []).at(0)?.share,'—');
});
