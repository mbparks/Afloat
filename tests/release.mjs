import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {demoState,APP_VERSION} from '../js/demo.js';
import {migrateState,validateState,CURRENT_SCHEMA} from '../js/migrations.js';
import {readiness,documentCompliance} from '../js/calc.js';
import {captureDepartureBaseline,startWatch,endWatch,acknowledgeHandoff,updateVoyageObservation,startProcedureExecution,recordProcedureStep,finishProcedureExecution,vesselTimeline,evidenceRelatedRecords,historicalIntelligence} from '../js/model.js';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const index=read('index.html');
const css=read('styles.css');
const app=read('js/app.js');
const sw=read('sw.js');

assert.equal(APP_VERSION,'1.9.0');
assert.equal(CURRENT_SCHEMA,16,'Batch 10 uses schema v16');
assert.ok(index.includes('id="sidebarScrim"'),'mobile navigation scrim exists');
assert.ok(index.includes('id="fileVerify"'),'backup verification input exists');
assert.ok(index.includes('Skip to main content'),'keyboard skip link exists');
assert.ok(index.includes('id="connectionStatus"'),'network status is separate from save status');
assert.ok(css.includes('body.sidebar-collapsed'),'desktop collapsed navigation CSS exists');
assert.ok(css.includes('@media(max-width:780px)'),'phone layout rules exist');
assert.ok(css.includes('prefers-reduced-motion'),'reduced-motion accessibility rule exists');
assert.ok(app.includes("'verify-backup'"),'verify-backup action is handled');
assert.ok(app.includes('verifyBackupFile'),'dry-run backup verification exists');
assert.ok(app.includes('lastBackupAt'),'backup recency is persisted');
assert.ok(sw.includes('afloat-v1.9.0'),'PWA cache namespace updated');
assert.ok(!app.includes("['Alternates',v.alternates||'None recorded']]])"),'Passage Report parser regression remains fixed');

// Direct v13 -> v16 migration regression from a Batch 7-like state.
const legacy=demoState(); legacy.schemaVersion=13; legacy.appVersion='1.4.0'; delete legacy.timelineEvents; delete legacy.energyObservations; legacy.evidence=[{id:'legacy-ev',name:'Legacy evidence note',description:'Old evidence shape',type:'note',source:'legacy'}]; delete legacy.settings.evidenceMaxBytes;
const migratedLegacy=migrateState(legacy); assert.equal(migratedLegacy.schemaVersion,16); assert.ok(Array.isArray(migratedLegacy.timelineEvents)); assert.ok(Array.isArray(migratedLegacy.energyObservations)); assert.equal(migratedLegacy.evidence[0].title,'Legacy evidence note'); assert.equal(migratedLegacy.evidence[0].kind,'note'); assert.equal(migratedLegacy.evidence[0].notes,'Old evidence shape');

// Direct v15 -> v16 migration preserves existing Batch 9 collections while adding energy observations.
const v15=demoState(); v15.schemaVersion=15; v15.appVersion='1.8.0'; delete v15.energyObservations; const v15Counts={systems:v15.systems.length,equipment:v15.equipment.length,maintenance:v15.maintenance.length,inventory:v15.inventory.length,resources:v15.resources.length,voyages:v15.voyages.length,logs:v15.logs.length,findings:v15.findings.length,evidence:v15.evidence.length};
const migratedV15=migrateState(v15); assert.equal(migratedV15.schemaVersion,16); assert.ok(Array.isArray(migratedV15.energyObservations)); for(const [k,n] of Object.entries(v15Counts)) assert.equal(migratedV15[k].length,n,`v15 -> v16 preserves ${k}`);

// End-to-end manual operational-model regression without live sensors/cloud.
const s=migrateState(demoState());
assert.equal(validateState(s).ok,true);
const rr=readiness(s);
const baseline=captureDepartureBaseline(s,{voyageId:'v1',createdBy:'Release Test',readinessResult:rr});
assert.ok(baseline.snapshot?.vessel?.name,'departure snapshot captured');
updateVoyageObservation(s,'v1',{lat:34.8,lon:-43.1,speedKt:6.1,courseDeg:82,progressNm:650,source:'manual release test',observedAt:'2026-08-13T04:00:00.000Z'});
const existing=s.watches.find(w=>w.status==='active');
if(existing){
  const h=endWatch(s,existing.id,{endedAt:'2026-08-13T04:01:00.000Z',summary:'Release handoff',nextWatchkeeper:'Jordan Lee'});
  acknowledgeHandoff(s,h.id,{acknowledgedAt:'2026-08-13T04:02:00.000Z',acknowledgedBy:'Jordan Lee'});
}
const watch=startWatch(s,{voyageId:'v1',watchkeeper:'Release Test',start:'2026-08-13T04:03:00.000Z'});
assert.equal(watch.status,'active');
const handoff=endWatch(s,watch.id,{endedAt:'2026-08-13T08:00:00.000Z',summary:'Normal watch',nextWatchkeeper:'Next Watch'});
assert.equal(handoff.status,'pending');
acknowledgeHandoff(s,handoff.id,{acknowledgedAt:'2026-08-13T08:01:00.000Z',acknowledgedBy:'Next Watch'});
assert.equal(handoff.status,'acknowledged');
assert.equal(validateState(s).ok,true,'state remains valid after manual voyage/watch workflow');

const paper=s.documents.find(d=>d.id==='d4');assert.equal(documentCompliance(paper,s.voyages.find(v=>v.id==='v1')).status,'watch','demo passport is voyage-window WATCH');
const proc=startProcedureExecution(s,'p2',{voyageId:'v1',performedBy:'Release Test'});for(const step of proc.steps)recordProcedureStep(s,proc.id,step.index,{status:'done'});finishProcedureExecution(s,proc.id,{status:'completed'});assert.equal(proc.status,'completed');
assert.ok(s.evidence.length>=3,'demo evidence exists'); assert.ok(evidenceRelatedRecords(s,'ev-rig-photo').length>=1,'demo evidence links survive'); assert.ok(vesselTimeline(s).length>=10,'timeline derives operational history');
assert.ok(app.includes('Vessel Knowledge Search'),'relationship-aware search UI exists');
assert.ok(app.includes("arrival:'Port Arrival Brief'"),'Port Arrival Brief report exists');
assert.ok(app.includes("anchorage:'Anchorage Report'"),'Anchorage Report exists');
assert.ok(app.includes('reportEvidenceRegister'),'reports include evidence register support');
assert.ok(app.includes('Print / Save PDF'),'report preview includes print/PDF control');
assert.ok(app.includes("pageMeta('Intelligence'"),'Historical Intelligence workspace exists');
assert.ok(app.includes("intelligence:'Historical Vessel Intelligence'"),'Historical Intelligence report exists');
const hi=historicalIntelligence(s); assert.ok(hi.fuel.samples.length>=7); assert.ok(hi.water.vessel.n>=5); assert.ok(hi.energy.samples.length>=5); assert.ok(hi.maintenance.some(x=>x.stats.n>=4));
console.log('AFLOAT v1.9.0 release regression checks passed.');
