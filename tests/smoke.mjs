import assert from 'node:assert/strict';
import {demoState} from '../js/demo.js';
import {migrateState,CURRENT_SCHEMA,validateState} from '../js/migrations.js';
import {completeMaintenance,setSystemParent,setStorageParent,duplicateRecord,archiveRecord,referencesTo,inventoryStatus,adjustInventory,resourceQuantity,applyResourceTransaction,historicalResourceRate,storagePath,captureDepartureBaseline,startWatch,endWatch,acknowledgeHandoff,nextScheduledWatch,updateVoyageObservation,anchorageDeployments,deploymentPositions,portVisitsFor,anchorageExperience,startProcedureExecution,recordProcedureStep,finishProcedureExecution,procedureExecutionSummary,upsertRecord,addRelationship,evidenceForRecord,evidenceRelatedRecords,vesselTimeline,knowledgeSearch,fuelPerformanceHistory,waterPerformanceHistory,energyPerformanceHistory,maintenanceIntervalHistory,historicalIntelligence} from '../js/model.js';
import {maintenanceStatus,readiness,fuelCurvePoint,bestRangePoint,tankQuantityFromCalibration,provisionEndurance,routeDistance,energyStorageSummary,energyProfileProjection,loadSheddingPlan,analyzeVoyageScenario,freshness,anchorPlan,documentCompliance,voyageWindow} from '../js/calc.js';
import {parseGpx,exportGpx} from '../js/gpx.js';

const legacy={schemaVersion:1,vessel:{id:'vessel-legacy',name:'Legacy',engineHours:100},settings:{theme:'dark',limits:{}},energy:{capacityKwh:5,currentPct:70,reservePct:25,loads:[],sources:[]},systems:[{name:'Propulsion'}],equipment:[{name:'Engine',systemId:''}],inventory:[{name:'Filter',qty:1,minimum:2,desired:3,location:'Aft locker'}],resources:[{name:'Water',kind:'water',unit:'gal',current:40,reserve:10,dailyUse:5}],voyages:[{id:'legacy-voy',name:'Legacy passage',distanceNm:100,speedKt:5,status:'planned'}]};
const migrated=migrateState(legacy);
assert.equal(migrated.schemaVersion,CURRENT_SCHEMA);
assert.equal(validateState(migrated).ok,true);
for(const key of ['components','inspections','maintenanceHistory','storageLocations','inventoryTransactions','resourceTransactions','provisions','routeWaypoints','voyageScenarios','energyProfiles','watchSchedules','watchHandoffs','departureBaselines','groundTackle','anchorDeployments','anchorPositions','portVisits','procedureExecutions','energyObservations']) assert.ok(Array.isArray(migrated[key]),`${key} collection exists`);
assert.ok(migrated.inventory[0].storageLocationId,'legacy free-text storage migrated to structured location');
assert.equal(storagePath(migrated,migrated.inventory[0].storageLocationId),'Aft locker');
assert.equal(migrated.energy.banks.length,1,'legacy aggregate energy becomes a bank');
assert.ok(migrated.energyProfiles.length>=6,'default operating profiles are created');
assert.ok(migrated.voyageScenarios.some(x=>x.voyageId==='legacy-voy'),'legacy voyage receives default scenario');

const s=migrateState(demoState());
assert.equal(setSystemParent(s,'sys-elec','sys-prop').ok,true);
assert.equal(setSystemParent(s,'sys-prop','sys-elec').ok,false,'system hierarchy must reject cycles');
assert.equal(setStorageParent(s,'loc-e2','loc-galley').ok,true);
assert.equal(setStorageParent(s,'loc-galley','loc-e2').ok,false,'storage hierarchy must reject cycles');
setStorageParent(s,'loc-e2','loc-engine');

const before=s.inventory.find(i=>i.id==='inv-belt').qty;
const history=completeMaintenance(s,'m3',{completedAt:'2026-08-13T12:00:00.000Z',engineHours:850,performedBy:'Test Crew',notes:'Smoke test',partsConsumed:[{inventoryId:'inv-belt',qty:1}]});
assert.ok(history.id); assert.equal(s.maintenance.find(t=>t.id==='m3').nextDueHours,950); assert.equal(s.inventory.find(i=>i.id==='inv-belt').qty,before-1);
assert.equal(maintenanceStatus(s.maintenance.find(t=>t.id==='m3'),850),'upcoming');

const filter=s.inventory.find(i=>i.id==='inv-oilfilter'); assert.equal(inventoryStatus(filter),'reorder'); const qty0=filter.qty; adjustInventory(s,filter.id,3,{type:'restock',source:'Smoke test'}); assert.equal(filter.qty,qty0+3);
assert.equal(resourceQuantity(s,'r-water'),74); const hist=historicalResourceRate(s,'r-water'); assert.equal(hist.samples,5); assert.ok(Math.abs(hist.rate-5.48)<0.02);
const t=s.tanks.find(x=>x.id==='t1'); assert.equal(tankQuantityFromCalibration(75,t.calibration),61);
const fuelPoint=fuelCurvePoint(s.resources.find(r=>r.id==='r-fuel').fuelCurve,2200); assert.equal(fuelPoint.speedKt,6.2); assert.equal(bestRangePoint(s.resources.find(r=>r.id==='r-fuel').fuelCurve).rpm,1800);
const fuelBefore=resourceQuantity(s,'r-fuel'); applyResourceTransaction(s,'r-fuel',{tankId:'t1',type:'consume',quantity:1,source:'Smoke test'}); assert.equal(resourceQuantity(s,'r-fuel'),fuelBefore-1);
const pe=provisionEndurance(s.provisions,s.crew.length); assert.ok(Number.isFinite(pe.days));


const anch=s.anchorages.find(a=>a.id==='a1'); const deps=anchorageDeployments(s,anch.id); assert.equal(deps.length,1,'demo anchorage has first-class deployment history');
const dep=deps[0]; assert.equal(deploymentPositions(s,dep.id).length,2,'deployment position observations retained');
const ax=anchorageExperience(s,anch.id); assert.equal(ax.maxRecordedWindKt,27); assert.equal(ax.drags,0);
const gt=s.groundTackle.find(t=>t.id===dep.groundTackleId); const ap=anchorPlan({depth:dep.depthM,bowHeight:dep.bowHeightM,tideRise:dep.tideRiseM,scope:dep.scope,availableClearance:dep.nearestHazardM,availableRode:gt.totalRodeM,vesselLengthM:12.8}); assert.ok(ap.requiredRode>0); assert.ok(ap.rodeMargin>0); assert.ok(Number.isFinite(ap.clearanceMargin));
assert.equal(portVisitsFor(s,{portId:'port-horta'}).length,1,'port visit history is independent of port knowledge');
const wps=s.routeWaypoints.filter(w=>w.voyageId==='v1').sort((a,b)=>a.order-b.order); const rd=routeDistance(wps); assert.ok(rd>1000 && rd<2500,'route distance plausible');
const gpx=exportGpx('Smoke route',wps); const parsed=parseGpx(gpx); assert.equal(parsed.points.length,wps.length); assert.equal(parsed.name,'Smoke route');

const es=energyStorageSummary(s.energy); assert.ok(es.capacityKwh>7); assert.ok(es.currentPct>0);
const underway=s.energyProfiles.find(p=>p.id==='enp-underway'),conserve=s.energyProfiles.find(p=>p.id==='enp-conserve');
const ep=energyProfileProjection(s.energy,underway),cp=energyProfileProjection(s.energy,conserve); assert.ok(Number.isFinite(ep.use)); assert.ok(cp.use<ep.use,'conservation profile reduces modeled load');
const shed=loadSheddingPlan(s.energy,underway); assert.ok(shed.length>1); assert.ok(shed.at(-1).use<=shed[0].use);
const sc=s.voyageScenarios.find(x=>x.id==='vsc-normal'); const analysis=analyzeVoyageScenario({distanceNm:rd,speedKt:sc.speedKt,motorHours:sc.motorHours,fuelQuantity:61,fuelReserve:19,fuelBurnPerHour:.68,waterQuantity:74,waterReserve:20,waterDailyUse:5.4,waterDailyProduction:3,provisionDays:14,provisionUseScalePct:100,energyProjection:ep}); assert.ok(analysis.days>0); assert.ok(['pass','watch','fail','unknown'].includes(analysis.overall));

const dup=duplicateRecord(s,'equipment','eq-alt'); assert.notEqual(dup.id,'eq-alt'); archiveRecord(s,'equipment',dup.id,true); assert.ok(referencesTo(s,'equipment','eq-alt').length>0);
const rr=readiness(s); assert.ok(['pass','watch','fail','unknown'].includes(rr.overall)); assert.ok(['PASS','REVIEW','HOLD'].includes(rr.disposition)); assert.ok(rr.results.length>=15); assert.ok(rr.results.every(r=>Array.isArray(r.dependencies)));

const baseline=captureDepartureBaseline(s,{voyageId:'v1',createdBy:'Smoke Crew',notes:'Immutable snapshot smoke test',readinessResult:rr});
const baselineName=baseline.snapshot.vessel.name; s.vessel.name='Changed after baseline'; assert.equal(baseline.snapshot.vessel.name,baselineName,'baseline snapshot remains independent of later state changes');
updateVoyageObservation(s,'v1',{lat:35.1,lon:-42.2,speedKt:6.3,courseDeg:80,progressNm:700,source:'smoke observation',observedAt:'2026-08-13T04:00:00.000Z'}); assert.equal(s.voyages.find(v=>v.id==='v1').positionSource,'smoke observation');

const existing=s.watches.find(w=>w.status==='active'); if(existing){const h=endWatch(s,existing.id,{endedAt:'2026-08-13T04:05:00.000Z',summary:'Smoke handoff',nextWatchkeeper:'Jordan Lee',nextWatchkeeperId:'c3'}); assert.equal(h.status,'pending'); acknowledgeHandoff(s,h.id,{acknowledgedAt:'2026-08-13T04:06:00.000Z',acknowledgedBy:'Jordan Lee'}); assert.equal(h.status,'acknowledged');}
const ws=nextScheduledWatch(s,new Date('2026-08-13T04:10:00.000Z')); assert.ok(ws,'next watch schedule exists'); const nw=startWatch(s,{voyageId:'v1',watchkeeper:'Test Crew',watchkeeperId:'c1',scheduleId:ws.id,start:'2026-08-13T04:10:00.000Z'}); assert.equal(nw.status,'active'); assert.throws(()=>startWatch(s,{voyageId:'v1',watchkeeper:'Second Crew'}),/End the current watch/);

assert.equal(freshness('2026-08-13T03:50:00.000Z',60*60000,new Date('2026-08-13T04:00:00.000Z').getTime()).state,'fresh');
assert.equal(freshness('2026-08-12T20:00:00.000Z',60*60000,new Date('2026-08-13T04:00:00.000Z').getTime()).state,'stale');
const stale=structuredClone(s); stale.weather.forEach(w=>{w.issuedAt='2026-08-11T00:00:00.000Z';}); const staleRR=readiness(stale,new Date('2026-08-13T04:00:00.000Z')); assert.equal(staleRR.results.find(r=>r.name==='Weather').status,'unknown','stale weather must not silently pass readiness');
// v1.3 ship's-papers voyage-window behavior.
const docVoy={id:'doc-voy',status:'planned',plannedDeparture:'2026-08-20',plannedArrival:'2026-09-10',distanceNm:500,speedKt:5};
const during=documentCompliance({name:'Test insurance',expires:'2026-09-01',requiredForDeparture:true,confidence:'high'},docVoy,new Date('2026-08-13T12:00:00Z'));
assert.equal(during.status,'watch','document expiring during voyage window must be surfaced');
assert.ok(voyageWindow(docVoy,new Date('2026-08-13T12:00:00Z')).end,'voyage window has end');
const expired=documentCompliance({name:'Expired permit',expires:'2026-08-01',requiredForDeparture:true},docVoy,new Date('2026-08-13T12:00:00Z'));
assert.equal(expired.status,'fail');

// v1.4 procedure execution lifecycle.
const ex=startProcedureExecution(s,'p3',{voyageId:'v1',crewId:'c1',performedBy:'Alex Morgan',startedAt:'2026-08-13T10:00:00Z'});
assert.equal(ex.status,'in-progress'); assert.equal(procedureExecutionSummary(ex).pending,s.procedures.find(p=>p.id==='p3').steps.length);
recordProcedureStep(s,ex.id,0,{status:'done',at:'2026-08-13T10:01:00Z'});
assert.throws(()=>recordProcedureStep(s,ex.id,1,{status:'skipped',at:'2026-08-13T10:02:00Z'}),/requires a reason/);
recordProcedureStep(s,ex.id,1,{status:'skipped',at:'2026-08-13T10:02:00Z',reason:'Unsafe access in current sea state'});
assert.throws(()=>finishProcedureExecution(s,ex.id,{status:'completed'}),/Complete or skip every step/);
for(const st of ex.steps.filter(st=>st.status==='pending')) recordProcedureStep(s,ex.id,st.index,{status:'done',at:'2026-08-13T10:03:00Z'});
finishProcedureExecution(s,ex.id,{status:'completed',at:'2026-08-13T10:04:00Z',notes:'Smoke complete'});
assert.equal(ex.status,'completed'); assert.equal(procedureExecutionSummary(ex).pending,0);

// v1.5 evidence relationships + v1.6 timeline.
const ev=upsertRecord(s,'evidence',{title:'Smoke inspection photo',kind:'photo',observedAt:'2026-08-13T11:00:00Z',source:'Smoke test',capturedBy:'Tester',notes:'Evidence metadata'});
addRelationship(s,'evidence',ev.id,'inspections','insp1','Supports inspection');
addRelationship(s,'evidence',ev.id,'findings','f1','Supports finding');
assert.equal(evidenceRelatedRecords(s,ev.id).length,2);
assert.ok(evidenceForRecord(s,'inspections','insp1').some(x=>x.id===ev.id));
upsertRecord(s,'timelineEvents',{title:'Smoke milestone',at:'2026-08-13T11:30:00Z',kind:'milestone',detail:'Batch 8 smoke event'});
const tl=vesselTimeline(s,{query:'smoke'});assert.ok(tl.some(x=>x.title.includes('Smoke')),'timeline includes evidence/custom milestones');
const ks=knowledgeSearch(s,'Balmar',{maxDepth:2,limit:60});
assert.ok(ks.some(x=>x.collection==='equipment'&&x.id==='eq-alt'&&x.direct),'manufacturer query finds alternator directly');
assert.ok(ks.some(x=>x.collection==='inventory'&&x.id==='inv-belt'&&x.depth<=1),'knowledge search expands to linked spare');
assert.ok(ks.some(x=>x.collection==='procedures'&&x.id==='p3'&&x.depth<=2),'knowledge search expands from alternator to spare to failure procedure');
assert.ok(ks.find(x=>x.id==='p3').path.length>=2,'connected search result preserves relationship path');

// v1.9 historical vessel intelligence.
const fuelHist=fuelPerformanceHistory(s); assert.ok(fuelHist.samples.length>=7,'fuel history uses explicit engine-hour observations'); assert.ok(fuelHist.target?.burn.n>=4,'planning-RPM bucket has repeated observations'); assert.ok(Number.isFinite(fuelHist.targetDifferencePct));
const waterHist=waterPerformanceHistory(s); assert.ok(waterHist.vessel.n>=5); assert.ok(Number.isFinite(waterHist.vessel.mean)); assert.ok(Number.isFinite(waterHist.conservativeRate));
const energyHist=energyPerformanceHistory(s); assert.ok(energyHist.samples.length>=5); assert.ok(Number.isFinite(energyHist.loadDeltaPct.mean)); assert.ok(Number.isFinite(energyHist.generationDeltaPct.mean));
const maintHist=maintenanceIntervalHistory(s); const beltHist=maintHist.find(x=>x.task.id==='m3'); assert.ok(beltHist?.stats.n>=4,'repeated belt service history produces observed intervals'); assert.ok(Number.isFinite(beltHist.stats.sd));
const intelligence=historicalIntelligence(s); assert.ok(intelligence.observations.length>=4); assert.ok(intelligence.observations.every(x=>x.samples>=2));
applyResourceTransaction(s,'r-fuel',{type:'consume',quantity:1.36,durationHours:2,rpm:2200,distanceNm:12.3,crewCount:3,context:'motoring',source:'Intelligence smoke'}); assert.ok(fuelPerformanceHistory(s).samples.some(x=>x.record.source==='Intelligence smoke'));

console.log('AFLOAT v1.9.0 smoke tests passed.');
