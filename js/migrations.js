import {COLLECTION_META,recordMeta,uuid} from './model.js';

export const CURRENT_SCHEMA=16;

function ensureArrays(s){
  for(const key of Object.keys(COLLECTION_META)) if(!Array.isArray(s[key])) s[key]=[];
  if(!Array.isArray(s.relationships)) s.relationships=[];
  return s;
}

function migrateTo2(s){
  ensureArrays(s);
  for(const [collection,meta] of Object.entries(COLLECTION_META)) s[collection]=s[collection].map(r=>recordMeta(r,meta.prefix));
  s.relationships=s.relationships||[];
  s.schemaVersion=2;
  return s;
}

function migrateTo3(s){
  ensureArrays(s);
  s.systems=s.systems.map((x,i)=>({...x,parentSystemId:x.parentSystemId||'',sortOrder:x.sortOrder??i,description:x.description||''}));
  s.equipment=s.equipment.map(x=>({
    purchaseDate:'',installationDate:'',commissioningDate:'',cycles:0,expectedLifeHours:null,serviceInterval:null,inspectionInterval:null,
    condition:x.status==='fail'?'poor':x.status==='watch'?'fair':'good',failureConsequence:'',manuals:[],photos:[],...x
  }));
  s.maintenance=s.maintenance.map(x=>({
    taskType:x.taskType||((x.intervalHours||x.nextDueHours)?'engine-hours':(x.nextDueDate?'calendar':'one-time')),
    intervalDays:x.intervalDays??null,intervalCycles:x.intervalCycles??null,lastCompletedDate:x.lastCompletedDate||'',lastCompletedCycles:x.lastCompletedCycles??null,
    estimatedMinutes:x.estimatedMinutes??null,procedureId:x.procedureId||'',requiredTools:x.requiredTools||[],requiredConsumables:x.requiredConsumables||[],...x
  }));
  s.measurements=s.measurements.map(x=>({...x,notes:x.notes||'',confidence:x.confidence||'medium'}));
  if(!s.settings) s.settings={};
  s.settings.showArchived=Boolean(s.settings.showArchived);
  s.schemaVersion=3;
  return s;
}


function migrateTo4(s){
  ensureArrays(s);
  s.storageLocations=s.storageLocations||[]; s.inventoryTransactions=s.inventoryTransactions||[]; s.resourceTransactions=s.resourceTransactions||[]; s.provisions=s.provisions||[];
  s.inventory=s.inventory.map(x=>({storageLocationId:x.storageLocationId||'',supplier:x.supplier||'',cost:x.cost??null,notes:x.notes||'',...x}));
  // Preserve legacy free-text locations. Create top-level location records without changing display text.
  const names=[...new Set(s.inventory.map(x=>x.location).filter(Boolean))];
  for(const name of names){ if(!s.storageLocations.some(l=>l.name===name)) s.storageLocations.push(recordMeta({name,parentLocationId:'',description:'Migrated from legacy inventory location text.'},'loc')); }
  for(const item of s.inventory){ if(!item.storageLocationId && item.location){ const loc=s.storageLocations.find(l=>l.name===item.location); if(loc) item.storageLocationId=loc.id; } }
  s.schemaVersion=4; return s;
}

function migrateTo5(s){
  ensureArrays(s);
  s.resources=s.resources.map(x=>({usable:x.usable??x.capacity??null,rateBasis:x.rateBasis||'vessel',useRateSource:x.useRateSource||'entered',uncertaintyPct:x.uncertaintyPct??null,fuelCurve:Array.isArray(x.fuelCurve)?x.fuelCurve:[],planningRpm:x.planningRpm??null,...x}));
  s.tanks=s.tanks.map(x=>({usable:x.usable??x.capacity??null,reserve:x.reserve??0,calibration:Array.isArray(x.calibration)?x.calibration:[],readingUnit:x.readingUnit||'%',lastReadingAt:x.lastReadingAt||'',confidence:x.confidence||'medium',...x}));
  s.provisions=(s.provisions||[]).map(x=>({countsForEndurance:x.countsForEndurance!==false,...x})); s.resourceTransactions=s.resourceTransactions||[]; s.inventoryTransactions=s.inventoryTransactions||[];
  s.schemaVersion=5; return s;
}

function migrateTo6(s){
  ensureArrays(s);
  s.energy=s.energy||{};
  s.energy.loads=Array.isArray(s.energy.loads)?s.energy.loads:[]; s.energy.sources=Array.isArray(s.energy.sources)?s.energy.sources:[];
  s.energy.banks=Array.isArray(s.energy.banks)?s.energy.banks:[];
  if(!s.energy.banks.length && (s.energy.capacityKwh!=null || s.energy.currentPct!=null)){
    s.energy.banks.push({id:'bank-house',name:'House bank',capacityKwh:s.energy.capacityKwh??null,currentPct:s.energy.currentPct??null,reservePct:s.energy.reservePct??20,chemistry:'',notes:'Migrated from aggregate v0.5 energy model.'});
  }
  s.energyProfiles=s.energyProfiles||[];
  if(!s.energyProfiles.length){
    const profiles=[['underway','Underway'],['anchor','At anchor'],['motoring','Motoring'],['overnight','Overnight'],['conservation','Conservation'],['emergency','Emergency']];
    s.energyProfiles=profiles.map(([kind,name],i)=>recordMeta({kind,name,description:'Migrated default operating profile.',sortOrder:i*10,loadOverrides:[],sourceOverrides:[]},'enp'));
  }
  s.settings=s.settings||{}; s.settings.activeEnergyProfileId=s.settings.activeEnergyProfileId||s.energyProfiles.find(p=>p.kind===(s.settings.activeScenario||'underway'))?.id||s.energyProfiles[0]?.id||'';
  s.schemaVersion=6; return s;
}

function migrateTo7(s){
  ensureArrays(s);
  s.routeWaypoints=s.routeWaypoints||[]; s.voyageScenarios=s.voyageScenarios||[];
  s.voyages=s.voyages.map(v=>({distanceSource:v.distanceSource||'entered',routeName:v.routeName||'',...v}));
  for(const v of s.voyages){
    if(!s.voyageScenarios.some(x=>x.voyageId===v.id)){
      s.voyageScenarios.push(recordMeta({voyageId:v.id,name:'Normal',speedKt:v.speedKt??null,motorHours:0,fuelRpm:null,waterUseScalePct:100,provisionUseScalePct:100,energyProfileId:s.settings?.activeEnergyProfileId||'',notes:'Migrated default scenario.'},'vsc'));
    }
  }
  s.schemaVersion=7; return s;
}



function migrateTo8(s){
  ensureArrays(s);
  s.departureBaselines=s.departureBaselines||[];
  s.voyages=s.voyages.map(v=>({positionSource:v.positionSource||((v.position&&'manual')||''),positionUpdatedAt:v.positionUpdatedAt||v.lastObservationAt||'',courseDeg:v.courseDeg??null,lastObservationAt:v.lastObservationAt||'',...v}));
  s.settings=s.settings||{};
  s.settings.freshness={weatherHours:12,positionMinutes:60,resourceHours:48,measurementHours:72,...(s.settings.freshness||{})};
  s.schemaVersion=8; return s;
}

function migrateTo9(s){
  ensureArrays(s);
  s.watchSchedules=s.watchSchedules||[]; s.watchHandoffs=s.watchHandoffs||[];
  s.watches=s.watches.map(w=>({voyageId:w.voyageId||'',watchkeeperId:w.watchkeeperId||'',scheduleId:w.scheduleId||'',startedAt:w.startedAt||w.start||'',endedAt:w.endedAt||'',handoffId:w.handoffId||'',acknowledgedAt:w.acknowledgedAt||'',acknowledgedBy:w.acknowledgedBy||'',...w}));
  if(!s.watchSchedules.length && (s.crew||[]).length){
    const crew=(s.crew||[]).filter(c=>!c.archived);
    const defaults=[['00:00','04:00'],['04:00','08:00'],['08:00','12:00'],['12:00','16:00'],['16:00','20:00'],['20:00','00:00']];
    s.watchSchedules=defaults.map(([startTime,endTime],i)=>recordMeta({name:`Watch ${startTime}–${endTime}`,startTime,endTime,order:(i+1)*10,enabled:true,watchkeeperId:crew[i%Math.max(1,crew.length)]?.id||'',watchkeeper:crew[i%Math.max(1,crew.length)]?.name||''},'ws'));
  }
  s.schemaVersion=9; return s;
}


function migrateTo10(s){
  ensureArrays(s);
  s.groundTackle=s.groundTackle||[]; s.anchorDeployments=s.anchorDeployments||[]; s.anchorPositions=s.anchorPositions||[];
  s.anchorages=s.anchorages.map(a=>({approach:a.approach||'',hazards:a.hazards||'',nightApproach:a.nightApproach||'',shoreAccess:a.shoreAccess||'',dinghyLanding:a.dinghyLanding||'',legacyVisitCount:Number(a.legacyVisitCount??a.visits??0)||0,...a}));
  s.settings=s.settings||{}; s.settings.activeAnchorageId=s.settings.activeAnchorageId||s.anchorages.find(a=>!a.archived)?.id||'';
  s.schemaVersion=10; return s;
}
function migrateTo11(s){
  ensureArrays(s);
  s.portVisits=s.portVisits||[];
  s.ports=s.ports.map(p=>({customs:p.customs||'',immigration:p.immigration||'',harborMaster:p.harborMaster||'',marina:p.marina||'',groceries:p.groceries||'',laundry:p.laundry||'',medical:p.medical||'',transport:p.transport||'',dinghyLanding:p.dinghyLanding||'',internet:p.internet||'',contacts:p.contacts||'',...p}));
  s.schemaVersion=11; return s;
}


function migrateTo12(s){
  ensureArrays(s);
  s.documents=s.documents.map(d=>({
    category:d.category||'other',holder:d.holder||'',crewId:d.crewId||'',authority:d.authority||d.country||'',requiredForDeparture:d.requiredForDeparture!==false,
    sourceDate:d.sourceDate||d.verified||'',verifiedAt:d.verifiedAt||d.verified||'',confidence:d.confidence||'medium',renewalNotes:d.renewalNotes||'',notes:d.notes||'',...d
  }));
  s.voyages=s.voyages.map(v=>({plannedDeparture:v.plannedDeparture||'',plannedArrival:v.plannedArrival||v.eta||'',...v}));
  s.schemaVersion=12; return s;
}
function migrateTo13(s){
  ensureArrays(s);
  s.procedureExecutions=s.procedureExecutions||[];
  s.procedures=s.procedures.map(p=>({prerequisites:p.prerequisites||'',warnings:p.warnings||'',equipmentLocations:p.equipmentLocations||'',requiredTools:Array.isArray(p.requiredTools)?p.requiredTools:[],requiredParts:Array.isArray(p.requiredParts)?p.requiredParts:[],notes:p.notes||'',...p}));
  s.schemaVersion=13; return s;
}


function migrateTo14(s){
  ensureArrays(s);
  s.evidence=(s.evidence||[]).map(e=>({title:e.title||e.name||'Evidence item',kind:e.kind||e.type||'note',observedAt:e.observedAt||e.capturedAt||e.createdAt||'',capturedBy:e.capturedBy||e.creator||'',source:e.source||'manual',originalFilename:e.originalFilename||'',mimeType:e.mimeType||'',sizeBytes:e.sizeBytes??null,dataUrl:e.dataUrl||'',notes:e.notes||e.description||'',...e}));
  s.settings=s.settings||{}; s.settings.evidenceMaxBytes=s.settings.evidenceMaxBytes||5242880;
  s.schemaVersion=14; return s;
}
function migrateTo15(s){
  ensureArrays(s);
  s.timelineEvents=s.timelineEvents||[];
  s.settings=s.settings||{}; s.settings.timelineKind=s.settings.timelineKind||''; s.settings.timelineSystemId=s.settings.timelineSystemId||''; s.settings.timelineVoyageId=s.settings.timelineVoyageId||'';
  s.schemaVersion=15; return s;
}

function migrateTo16(s){
  ensureArrays(s);
  s.energyObservations=(s.energyObservations||[]).map(x=>recordMeta({energyProfileId:x.energyProfileId||'',voyageId:x.voyageId||'',at:x.at||x.date||x.createdAt||new Date().toISOString(),predictedUseKwh:x.predictedUseKwh??null,actualUseKwh:x.actualUseKwh??null,predictedGenerationKwh:x.predictedGenerationKwh??null,actualGenerationKwh:x.actualGenerationKwh??null,source:x.source||'Manual',confidence:x.confidence||'medium',context:x.context||'',notes:x.notes||'',...x},'eobs'));
  s.settings=s.settings||{};s.settings.intelligenceProfileId=s.settings.intelligenceProfileId||'';
  s.schemaVersion=16; return s;
}

export function migrateState(input){
  if(!input || typeof input!=='object') return input;
  let s=structuredClone(input); let from=Number(s.schemaVersion)||1;
  if(from<2) s=migrateTo2(s);
  if((Number(s.schemaVersion)||2)<3) s=migrateTo3(s);
  if((Number(s.schemaVersion)||3)<4) s=migrateTo4(s);
  if((Number(s.schemaVersion)||4)<5) s=migrateTo5(s);
  if((Number(s.schemaVersion)||5)<6) s=migrateTo6(s);
  if((Number(s.schemaVersion)||6)<7) s=migrateTo7(s);
  if((Number(s.schemaVersion)||7)<8) s=migrateTo8(s);
  if((Number(s.schemaVersion)||8)<9) s=migrateTo9(s);
  if((Number(s.schemaVersion)||9)<10) s=migrateTo10(s);
  if((Number(s.schemaVersion)||10)<11) s=migrateTo11(s);
  if((Number(s.schemaVersion)||11)<12) s=migrateTo12(s);
  if((Number(s.schemaVersion)||12)<13) s=migrateTo13(s);
  if((Number(s.schemaVersion)||13)<14) s=migrateTo14(s);
  if((Number(s.schemaVersion)||14)<15) s=migrateTo15(s);
  if((Number(s.schemaVersion)||15)<16) s=migrateTo16(s);
  ensureArrays(s);
  const stamp=new Date().toISOString();
  for(const [collection,meta] of Object.entries(COLLECTION_META)) s[collection]=s[collection].map(r=>({...r,id:r.id||uuid(meta.prefix),createdAt:r.createdAt||stamp,updatedAt:r.updatedAt||r.createdAt||stamp,archived:Boolean(r.archived)}));
  s.schemaVersion=CURRENT_SCHEMA;
  s.migratedAt=from<CURRENT_SCHEMA?new Date().toISOString():(s.migratedAt||null);
  s.migrationSourceSchema=from;
  return s;
}

export function validateState(s){
  const errors=[];
  if(!s || typeof s!=='object') errors.push('Backup must be a JSON object.');
  if(!s?.vessel || typeof s.vessel!=='object') errors.push('Missing vessel record.');
  if(!s?.settings || typeof s.settings!=='object') errors.push('Missing settings record.');
  if(s?.schemaVersion && Number(s.schemaVersion)>CURRENT_SCHEMA) errors.push(`Backup schema v${s.schemaVersion} is newer than this AFLOAT build supports (v${CURRENT_SCHEMA}).`);
  return {ok:errors.length===0,errors};
}
