/* ===== model.js ===== */
const COLLECTION_META = {
  crew:{prefix:'crew',label:'Crew member'}, voyages:{prefix:'voy',label:'Voyage'}, routeWaypoints:{prefix:'wp',label:'Route waypoint'}, voyageScenarios:{prefix:'vsc',label:'Voyage scenario'}, energyProfiles:{prefix:'enp',label:'Energy profile'}, systems:{prefix:'sys',label:'System'},
  equipment:{prefix:'eq',label:'Equipment'}, components:{prefix:'cmp',label:'Component'}, maintenance:{prefix:'maint',label:'Maintenance task'},
  maintenanceHistory:{prefix:'mh',label:'Maintenance record'}, inspections:{prefix:'insp',label:'Inspection'}, measurements:{prefix:'meas',label:'Measurement'},
  resources:{prefix:'res',label:'Resource'}, tanks:{prefix:'tank',label:'Tank'}, resourceTransactions:{prefix:'rtx',label:'Resource transaction'}, provisions:{prefix:'prov',label:'Provision'}, energyObservations:{prefix:'eobs',label:'Energy observation'},
  inventory:{prefix:'inv',label:'Store item'}, inventoryTransactions:{prefix:'itx',label:'Inventory transaction'}, storageLocations:{prefix:'loc',label:'Storage location'}, procedures:{prefix:'proc',label:'Procedure'}, procedureExecutions:{prefix:'pex',label:'Procedure execution'},
  ports:{prefix:'port',label:'Port'}, portVisits:{prefix:'pv',label:'Port visit'}, anchorages:{prefix:'anchor',label:'Anchorage'}, groundTackle:{prefix:'gt',label:'Ground tackle'}, anchorDeployments:{prefix:'ad',label:'Anchor deployment'}, anchorPositions:{prefix:'apos',label:'Anchor position observation'}, logs:{prefix:'log',label:'Log entry'}, findings:{prefix:'find',label:'Finding'},
  assumptions:{prefix:'as',label:'Assumption'}, evidence:{prefix:'ev',label:'Evidence item'}, timelineEvents:{prefix:'tle',label:'Timeline milestone'}, documents:{prefix:'doc',label:'Document'}, weather:{prefix:'wx',label:'Weather record'}, watches:{prefix:'watch',label:'Watch'},
  watchSchedules:{prefix:'ws',label:'Watch schedule'}, watchHandoffs:{prefix:'wh',label:'Watch handoff'}, departureBaselines:{prefix:'base',label:'Departure baseline'}
};

const RELATION_FIELDS = {
  systemId:'systems', parentSystemId:'systems', equipmentId:'equipment', componentId:'components', voyageId:'voyages', resourceId:'resources',
  procedureId:'procedures', procedureExecutionId:'procedureExecutions', findingId:'findings', maintenanceId:'maintenance', inspectionId:'inspections', documentId:'documents', portId:'ports', anchorageId:'anchorages',
  tankId:'tanks', inventoryId:'inventory', storageLocationId:'storageLocations', parentLocationId:'storageLocations', fromStorageLocationId:'storageLocations', toStorageLocationId:'storageLocations', energyProfileId:'energyProfiles', watchId:'watches', handoffId:'watchHandoffs', baselineId:'departureBaselines', watchkeeperId:'crew', fromWatchkeeperId:'crew', toWatchkeeperId:'crew', groundTackleId:'groundTackle', anchorDeploymentId:'anchorDeployments', portVisitId:'portVisits', evidenceId:'evidence', timelineEventId:'timelineEvents'
};

function uuid(prefix='rec'){
  const raw=globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${raw}`;
}

function recordMeta(record={}, prefix='rec'){
  const now=new Date().toISOString();
  return {
    ...record,
    id:record.id || uuid(prefix),
    createdAt:record.createdAt || now,
    updatedAt:now,
    archived:Boolean(record.archived)
  };
}

function activeRecords(arr=[]){ return arr.filter(x=>!x.archived); }

function getRecord(state, collection, id){ return state?.[collection]?.find(x=>x.id===id) || null; }

function upsertRecord(state, collection, record){
  if(!Array.isArray(state[collection])) state[collection]=[];
  const meta=COLLECTION_META[collection] || {prefix:'rec'};
  const existing=record.id ? getRecord(state,collection,record.id) : null;
  const next=recordMeta({...existing,...record},meta.prefix);
  const i=state[collection].findIndex(x=>x.id===next.id);
  if(i>=0) state[collection][i]=next; else state[collection].push(next);
  return next;
}

function duplicateRecord(state, collection, id){
  const source=getRecord(state,collection,id); if(!source) return null;
  const meta=COLLECTION_META[collection] || {prefix:'rec'};
  const copy=structuredClone(source);
  delete copy.id; delete copy.createdAt; delete copy.updatedAt;
  copy.archived=false;
  if(copy.name) copy.name=`${copy.name} — Copy`;
  else if(copy.title) copy.title=`${copy.title} — Copy`;
  return upsertRecord(state,collection,recordMeta(copy,meta.prefix));
}

function archiveRecord(state,collection,id,archived=true){
  const rec=getRecord(state,collection,id); if(!rec) return false;
  rec.archived=archived; rec.updatedAt=new Date().toISOString(); return true;
}

function referencesTo(state,targetCollection,targetId){
  const refs=[];
  for(const [collection,meta] of Object.entries(COLLECTION_META)){
    for(const rec of state?.[collection]||[]){
      if(rec.id===targetId && collection===targetCollection) continue;
      for(const [field,dest] of Object.entries(RELATION_FIELDS)){
        if(dest===targetCollection && rec[field]===targetId) refs.push({collection,id:rec.id,field,label:recordLabel(rec),type:meta.label});
      }
      for(const [field,val] of Object.entries(rec)){
        if(Array.isArray(val) && val.includes(targetId)) refs.push({collection,id:rec.id,field,label:recordLabel(rec),type:meta.label});
      }
    }
  }
  for(const rel of state.relationships||[]){
    if(rel.from?.collection===targetCollection && rel.from?.id===targetId) refs.push({collection:rel.to.collection,id:rel.to.id,field:'relationship',label:rel.label||'Related record',type:COLLECTION_META[rel.to.collection]?.label||rel.to.collection});
    if(rel.to?.collection===targetCollection && rel.to?.id===targetId) refs.push({collection:rel.from.collection,id:rel.from.id,field:'relationship',label:rel.label||'Related record',type:COLLECTION_META[rel.from.collection]?.label||rel.from.collection});
  }
  return refs;
}

function deleteRecord(state,collection,id,{force=false}={}){
  const refs=referencesTo(state,collection,id);
  if(refs.length && !force) return {ok:false,refs};
  state[collection]=(state[collection]||[]).filter(x=>x.id!==id);
  state.relationships=(state.relationships||[]).filter(r=>!(r.from?.collection===collection&&r.from?.id===id)&&!(r.to?.collection===collection&&r.to?.id===id));
  return {ok:true,refs};
}

function addRelationship(state,fromCollection,fromId,toCollection,toId,label='Related'){
  if(!Array.isArray(state.relationships)) state.relationships=[];
  const duplicate=state.relationships.find(r=>r.from?.collection===fromCollection&&r.from?.id===fromId&&r.to?.collection===toCollection&&r.to?.id===toId&&r.label===label);
  if(duplicate) return duplicate;
  const rel={id:uuid('rel'),from:{collection:fromCollection,id:fromId},to:{collection:toCollection,id:toId},label,createdAt:new Date().toISOString()};
  state.relationships.push(rel); return rel;
}

function removeRelationship(state,id){ state.relationships=(state.relationships||[]).filter(r=>r.id!==id); }

function relatedRecords(state,collection,id){
  const out=[];
  for(const ref of referencesTo(state,collection,id)){
    const rec=getRecord(state,ref.collection,ref.id); if(rec) out.push({...ref,record:rec});
  }
  const unique=new Map(); out.forEach(x=>unique.set(`${x.collection}:${x.id}:${x.field}`,x)); return [...unique.values()];
}

function recordLabel(rec={}){ return rec.name || rec.title || rec.text?.slice(0,60) || rec.category || rec.id || 'Record'; }


function knowledgeValueText(value,depth=0){
  if(value==null || depth>2) return '';
  if(typeof value==='string' || typeof value==='number' || typeof value==='boolean') return String(value);
  if(Array.isArray(value)) return value.slice(0,40).map(v=>knowledgeValueText(v,depth+1)).join(' ');
  if(typeof value==='object') return Object.entries(value).filter(([k])=>!['dataUrl','snapshot'].includes(k)).map(([,v])=>knowledgeValueText(v,depth+1)).join(' ');
  return '';
}
function knowledgeRecordText(rec={},collection=''){
  const meta=COLLECTION_META[collection]?.label||collection;
  const clean=Object.fromEntries(Object.entries(rec).filter(([k])=>!['id','createdAt','updatedAt','archived','dataUrl','snapshot'].includes(k)));
  return `${meta} ${recordLabel(rec)} ${knowledgeValueText(clean)}`.replace(/\s+/g,' ').trim().toLowerCase();
}
function knowledgeDirectScore(rec,collection,query,tokens){
  const label=recordLabel(rec).toLowerCase(), type=(COLLECTION_META[collection]?.label||collection).toLowerCase(), text=knowledgeRecordText(rec,collection);
  if(!tokens.every(t=>text.includes(t))) return 0;
  let score=100;
  if(label===query) score+=80;
  else if(label.startsWith(query)) score+=55;
  else if(label.includes(query)) score+=40;
  if(type.includes(query)) score+=15;
  score+=tokens.reduce((n,t)=>n+(label.includes(t)?8:0),0);
  return score;
}
function knowledgeIndex(state){
  const idx=new Map();
  for(const collection of Object.keys(COLLECTION_META)) for(const rec of activeRecords(state?.[collection]||[])) idx.set(rec.id,{collection,record:rec});
  return idx;
}
function knowledgeNeighbors(state,collection,id,index){
  const out=[];
  const rec=getRecord(state,collection,id);
  if(!rec) return out;
  for(const [field,dest] of Object.entries(RELATION_FIELDS)){
    const val=rec[field];
    if(typeof val==='string' && val){ const target=getRecord(state,dest,val); if(target && !target.archived) out.push({collection:dest,id:val,record:target,via:field}); }
  }
  for(const [field,val] of Object.entries(rec)) if(Array.isArray(val)) for(const rid of val){
    if(typeof rid!=='string') continue; const hit=index.get(rid); if(hit && !hit.record.archived) out.push({collection:hit.collection,id:rid,record:hit.record,via:field});
  }
  for(const ref of referencesTo(state,collection,id)){
    const target=getRecord(state,ref.collection,ref.id); if(target && !target.archived) out.push({collection:ref.collection,id:ref.id,record:target,via:ref.field==='relationship'?(ref.label||'relationship'):ref.field});
  }
  const uniq=new Map(); for(const n of out) if(!(n.collection===collection&&n.id===id)) uniq.set(`${n.collection}:${n.id}`,n); return [...uniq.values()];
}
function knowledgeSearch(state,query,{limit=60,maxDepth=2}={}){
  const q=String(query||'').trim().toLowerCase();
  if(!q) return [];
  const tokens=q.split(/\s+/).filter(Boolean), index=knowledgeIndex(state), roots=[];
  for(const [collection,meta] of Object.entries(COLLECTION_META)) for(const rec of activeRecords(state?.[collection]||[])){
    const score=knowledgeDirectScore(rec,collection,q,tokens); if(score) roots.push({collection,id:rec.id,record:rec,score,type:meta.label});
  }
  roots.sort((a,b)=>b.score-a.score || recordLabel(a.record).localeCompare(recordLabel(b.record)));
  const results=new Map();
  for(const root of roots.slice(0,20)){
    const rootName=recordLabel(root.record), rootKey=`${root.collection}:${root.id}`;
    const existing=results.get(rootKey);
    if(!existing || root.score>existing.score) results.set(rootKey,{...root,depth:0,direct:true,reason:'Direct text match',path:[rootName]});
    const queue=[{collection:root.collection,id:root.id,record:root.record,depth:0,path:[rootName]}], seen=new Set([rootKey]);
    while(queue.length){
      const cur=queue.shift(); if(cur.depth>=maxDepth) continue;
      for(const n of knowledgeNeighbors(state,cur.collection,cur.id,index)){
        const key=`${n.collection}:${n.id}`; if(seen.has(key)) continue; seen.add(key);
        const depth=cur.depth+1, path=[...cur.path,recordLabel(n.record)], directScore=knowledgeDirectScore(n.record,n.collection,q,tokens);
        const score=Math.max(directScore,root.score-(depth*26));
        const candidate={collection:n.collection,id:n.id,record:n.record,type:COLLECTION_META[n.collection]?.label||n.collection,score,depth,direct:Boolean(directScore),reason:directScore?'Direct text match':`Connected to ${rootName}${n.via?` via ${n.via}`:''}`,path};
        const prev=results.get(key); if(!prev || candidate.score>prev.score || candidate.depth<prev.depth) results.set(key,candidate);
        queue.push({collection:n.collection,id:n.id,record:n.record,depth,path});
      }
    }
  }
  return [...results.values()].sort((a,b)=>Number(b.direct)-Number(a.direct)||b.score-a.score||a.depth-b.depth||recordLabel(a.record).localeCompare(recordLabel(b.record))).slice(0,limit);
}

function finiteValue(value){ return value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null; }
function finiteNumbers(values=[]){ return values.map(finiteValue).filter(v=>v!==null); }
function observationStats(values=[]){
  const xs=finiteNumbers(values).sort((a,b)=>a-b), n=xs.length;
  if(!n) return {n:0,mean:null,median:null,sd:null,min:null,max:null};
  const mean=xs.reduce((a,b)=>a+b,0)/n, median=n%2?xs[(n-1)/2]:(xs[n/2-1]+xs[n/2])/2;
  const sd=n>1?Math.sqrt(xs.reduce((sum,x)=>sum+(x-mean)**2,0)/(n-1)):null;
  return {n,mean,median,sd,min:xs[0],max:xs[n-1]};
}
function observationDateRange(records=[],field='at'){
  const dates=records.map(r=>r?.[field]||r?.completedAt||r?.createdAt||null).filter(Boolean).map(v=>new Date(v)).filter(d=>!Number.isNaN(d.getTime())).sort((a,b)=>a-b);
  return {from:dates.length?dates[0].toISOString():null,to:dates.length?dates.at(-1).toISOString():null};
}
function observationalConfidence(n){ return n>=8?'high':n>=4?'medium':n>=2?'low':'insufficient'; }
function percentDifference(actual,reference){
  const a=finiteValue(actual),r=finiteValue(reference); return a!==null&&r!==null&&r!==0?(a-r)/r*100:null;
}

function fuelPerformanceHistory(state,{resourceId=''}={}){
  const resource=activeRecords(state.resources||[]).find(r=>r.id===resourceId)||(activeRecords(state.resources||[]).find(r=>r.kind==='fuel'))||null;
  if(!resource) return {resource:null,samples:[],groups:[],target:null,stats:observationStats([])};
  const tx=activeRecords(state.resourceTransactions||[]).filter(t=>t.resourceId===resource.id&&['consume','use','drain'].includes(t.type)&&Number(t.quantity)>0&&Number(t.durationHours)>0);
  const samples=tx.map(t=>({id:t.id,at:t.at,rpm:finiteValue(t.rpm),burnPerHour:Number(t.quantity)/Number(t.durationHours),speedKt:Number(t.distanceNm)>0?Number(t.distanceNm)/Number(t.durationHours):null,distanceNm:finiteValue(t.distanceNm),durationHours:Number(t.durationHours),quantity:Number(t.quantity),source:t.source||'unknown',confidence:t.confidence||'unknown',context:t.context||'',record:t}));
  const buckets=new Map();
  for(const x of samples){const key=x.rpm===null?'Unspecified':String(Math.round(x.rpm/100)*100);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(x);}
  const groups=[...buckets.entries()].map(([key,rows])=>({rpm:key==='Unspecified'?null:Number(key),samples:rows,burn:observationStats(rows.map(x=>x.burnPerHour)),speed:observationStats(rows.map(x=>x.speedKt)),range:observationDateRange(rows)})).sort((a,b)=>(a.rpm??99999)-(b.rpm??99999));
  const planningRpm=finiteValue(resource.planningRpm);
  let target=null;if(groups.length){target=planningRpm!==null?groups.filter(g=>g.rpm!==null).sort((a,b)=>Math.abs(a.rpm-planningRpm)-Math.abs(b.rpm-planningRpm))[0]||groups[0]:groups[0];}
  const stats=observationStats(samples.map(x=>x.burnPerHour)), range=observationDateRange(samples);
  return {resource,samples,groups,target,stats,range,planningRpm,planningBurn:finiteValue(resource.burnPerHour),targetDifferencePct:target?percentDifference(target.burn.mean,resource.burnPerHour):null};
}

function waterPerformanceHistory(state,{resourceId=''}={}){
  const resource=activeRecords(state.resources||[]).find(r=>r.id===resourceId)||(activeRecords(state.resources||[]).find(r=>r.kind==='water'))||null;
  if(!resource) return {resource:null,samples:[],vessel:observationStats([]),perPerson:observationStats([])};
  const tx=activeRecords(state.resourceTransactions||[]).filter(t=>t.resourceId===resource.id&&['consume','use','drain'].includes(t.type)&&Number(t.quantity)>0&&Number(t.durationDays)>0);
  const samples=tx.map(t=>{const vesselPerDay=Number(t.quantity)/Number(t.durationDays),crew=Number(t.crewCount);return {id:t.id,at:t.at,vesselPerDay,perPersonPerDay:Number.isFinite(crew)&&crew>0?vesselPerDay/crew:null,crewCount:Number.isFinite(crew)&&crew>0?crew:null,durationDays:Number(t.durationDays),quantity:Number(t.quantity),source:t.source||'unknown',confidence:t.confidence||'unknown',context:t.context||'',record:t};});
  const vessel=observationStats(samples.map(x=>x.vesselPerDay)), perPerson=observationStats(samples.map(x=>x.perPersonPerDay)), range=observationDateRange(samples);
  const plan=finiteValue(resource.dailyUse);
  return {resource,samples,vessel,perPerson,range,planningRate:plan,planningBasis:resource.rateBasis||'vessel',differencePct:percentDifference(vessel.mean,plan),conservativeRate:vessel.mean!==null?(vessel.mean+(vessel.sd||0)):null};
}

function energyPerformanceHistory(state,{energyProfileId=''}={}){
  const rows=activeRecords(state.energyObservations||[]).filter(x=>!energyProfileId||x.energyProfileId===energyProfileId).map(x=>({
    ...x,
    loadDeltaKwh:finiteValue(x.actualUseKwh)!==null&&finiteValue(x.predictedUseKwh)!==null?finiteValue(x.actualUseKwh)-finiteValue(x.predictedUseKwh):null,
    loadDeltaPct:percentDifference(x.actualUseKwh,x.predictedUseKwh),
    generationDeltaKwh:finiteValue(x.actualGenerationKwh)!==null&&finiteValue(x.predictedGenerationKwh)!==null?finiteValue(x.actualGenerationKwh)-finiteValue(x.predictedGenerationKwh):null,
    generationDeltaPct:percentDifference(x.actualGenerationKwh,x.predictedGenerationKwh)
  })).sort((a,b)=>new Date(a.at||0)-new Date(b.at||0));
  return {samples:rows,range:observationDateRange(rows),actualUse:observationStats(rows.map(x=>x.actualUseKwh)),predictedUse:observationStats(rows.map(x=>x.predictedUseKwh)),loadDeltaPct:observationStats(rows.map(x=>x.loadDeltaPct)),actualGeneration:observationStats(rows.map(x=>x.actualGenerationKwh)),predictedGeneration:observationStats(rows.map(x=>x.predictedGenerationKwh)),generationDeltaPct:observationStats(rows.map(x=>x.generationDeltaPct))};
}

function maintenanceIntervalHistory(state){
  const out=[];
  for(const task of activeRecords(state.maintenance||[])){
    const rows=activeRecords(state.maintenanceHistory||[]).filter(h=>h.maintenanceId===task.id).slice().sort((a,b)=>new Date(a.completedAt||0)-new Date(b.completedAt||0));
    if(rows.length<2) continue;
    const hours=rows.filter(x=>finiteValue(x.engineHours)!==null).sort((a,b)=>finiteValue(a.engineHours)-finiteValue(b.engineHours));
    let basis='',intervals=[],unit='',planned=null;
    if(hours.length>=2){basis='engine-hours';unit='hr';for(let i=1;i<hours.length;i++){const d=Number(hours[i].engineHours)-Number(hours[i-1].engineHours);if(d>0)intervals.push(d);}planned=finiteValue(task.intervalHours);}
    else {basis='calendar';unit='days';for(let i=1;i<rows.length;i++){const d=(new Date(rows[i].completedAt)-new Date(rows[i-1].completedAt))/86400000;if(d>0)intervals.push(d);}planned=finiteValue(task.intervalDays);}
    if(!intervals.length) continue;
    const stats=observationStats(intervals),range=observationDateRange(rows,'completedAt');
    out.push({task,rows,basis,unit,intervals,stats,range,planned,differencePct:percentDifference(stats.mean,planned)});
  }
  return out.sort((a,b)=>b.stats.n-a.stats.n||String(a.task.name).localeCompare(String(b.task.name)));
}

function historicalIntelligence(state){
  const fuel=fuelPerformanceHistory(state),water=waterPerformanceHistory(state),energy=energyPerformanceHistory(state),maintenance=maintenanceIntervalHistory(state),observations=[];
  if(fuel.target?.burn?.n>=2){observations.push({kind:'fuel',title:`Fuel burn near ${fuel.target.rpm??'recorded'} RPM`,text:`${fuel.target.burn.n} observations show ${fuel.target.burn.mean.toFixed(2)} ${fuel.resource?.unit||''}/hr${fuel.target.burn.sd!==null?` ± ${fuel.target.burn.sd.toFixed(2)} (1σ)`:''}.`,confidence:observationalConfidence(fuel.target.burn.n),samples:fuel.target.burn.n,from:fuel.target.range.from,to:fuel.target.range.to,source:'Resource transactions'});}
  if(water.vessel.n>=2){observations.push({kind:'water',title:'Whole-vessel water use',text:`${water.vessel.n} observations show ${water.vessel.mean.toFixed(2)} ${water.resource?.unit||''}/day${water.vessel.sd!==null?` ± ${water.vessel.sd.toFixed(2)} (1σ)`:''}.`,confidence:observationalConfidence(water.vessel.n),samples:water.vessel.n,from:water.range.from,to:water.range.to,source:'Resource transactions'});}
  if(energy.samples.length>=2){const d=energy.loadDeltaPct.mean, comparison=Number.isFinite(d)?`${Math.abs(d).toFixed(1)}% ${d>=0?'above':'below'}`:'UNKNOWN relative to';observations.push({kind:'energy',title:'Observed electrical load vs model',text:`Across ${energy.samples.length} recorded operating days, actual consumption averaged ${comparison} the predicted profile.`,confidence:observationalConfidence(energy.samples.length),samples:energy.samples.length,from:energy.range.from,to:energy.range.to,source:'Energy observations'});}
  for(const m of maintenance.filter(x=>x.stats.n>=2).slice(0,4)){observations.push({kind:'maintenance',title:`Observed interval — ${m.task.name}`,text:`${m.stats.n} ${m.unit} intervals average ${m.stats.mean.toFixed(0)} ${m.unit}${m.stats.sd!==null?` ± ${m.stats.sd.toFixed(0)} (1σ)`:''}${m.planned?`; configured interval ${m.planned} ${m.unit}`:''}.`,confidence:observationalConfidence(m.stats.n),samples:m.stats.n,from:m.range.from,to:m.range.to,source:'Maintenance history',maintenanceId:m.task.id});}
  return {fuel,water,energy,maintenance,observations};
}

function anchorageDeployments(state,anchorageId){
  return activeRecords(state?.anchorDeployments||[]).filter(x=>x.anchorageId===anchorageId).slice().sort((a,b)=>new Date(b.deployedAt||b.createdAt||0)-new Date(a.deployedAt||a.createdAt||0));
}
function deploymentPositions(state,deploymentId){
  return activeRecords(state?.anchorPositions||[]).filter(x=>x.anchorDeploymentId===deploymentId).slice().sort((a,b)=>new Date(a.at||a.createdAt||0)-new Date(b.at||b.createdAt||0));
}
function portVisitsFor(state,{portId='',anchorageId=''}={}){
  return activeRecords(state?.portVisits||[]).filter(v=>(portId&&v.portId===portId)||(anchorageId&&v.anchorageId===anchorageId)).slice().sort((a,b)=>new Date(b.arrivedAt||b.createdAt||0)-new Date(a.arrivedAt||a.createdAt||0));
}
function anchorageExperience(state,anchorageId){
  const deployments=anchorageDeployments(state,anchorageId), winds=deployments.map(d=>Number(d.maxWindKt)).filter(Number.isFinite);
  const noDrag=deployments.filter(d=>d.dragged===false||d.dragged==='no').length, drags=deployments.filter(d=>d.dragged===true||d.dragged==='yes').length;
  return {deployments:deployments.length,maxRecordedWindKt:winds.length?Math.max(...winds):null,noDrag,drags,resets:deployments.reduce((n,d)=>n+(Number(d.resets)||0),0)};
}

function systemDepth(state,system){
  let depth=0,current=system,seen=new Set();
  while(current?.parentSystemId && !seen.has(current.parentSystemId) && depth<8){
    seen.add(current.parentSystemId); current=getRecord(state,'systems',current.parentSystemId); if(current) depth++;
  }
  return depth;
}

function systemTree(state){
  const systems=activeRecords(state.systems||[]); const byParent=new Map();
  systems.forEach(s=>{const key=s.parentSystemId||'';if(!byParent.has(key))byParent.set(key,[]);byParent.get(key).push(s);});
  for(const arr of byParent.values()) arr.sort((a,b)=>(a.sortOrder??999)-(b.sortOrder??999)||String(a.name).localeCompare(String(b.name)));
  const result=[],visit=(parentId,depth)=>{for(const s of byParent.get(parentId)||[]){result.push({record:s,depth});visit(s.id,depth+1);}};
  visit('',0);
  // orphan/cyclic safety
  for(const s of systems) if(!result.some(x=>x.record.id===s.id)) result.push({record:s,depth:0});
  return result;
}

function setSystemParent(state,systemId,parentSystemId){
  const sys=getRecord(state,'systems',systemId); if(!sys) return {ok:false,reason:'System not found'};
  if(systemId===parentSystemId) return {ok:false,reason:'A system cannot be its own parent'};
  let current=parentSystemId,seen=new Set([systemId]);
  while(current){ if(seen.has(current)) return {ok:false,reason:'That move would create a circular hierarchy'}; seen.add(current); current=getRecord(state,'systems',current)?.parentSystemId||''; }
  sys.parentSystemId=parentSystemId||''; sys.updatedAt=new Date().toISOString(); return {ok:true};
}

function measurementSeries(state,equipmentId,name){
  return activeRecords(state.measurements||[]).filter(m=>m.equipmentId===equipmentId&&m.name===name).sort((a,b)=>new Date(a.at)-new Date(b.at));
}

function trend(series=[]){
  if(series.length<2) return 'insufficient';
  const a=Number(series[0].value), b=Number(series[series.length-1].value); if(!Number.isFinite(a)||!Number.isFinite(b)) return 'unknown';
  const delta=b-a, threshold=Math.max(Math.abs(a)*0.02,0.01); return Math.abs(delta)<=threshold?'stable':delta>0?'rising':'falling';
}

function completeMaintenance(state,taskId,{completedAt=new Date().toISOString(),engineHours=null,cycles=null,performedBy='',notes='',partsConsumed=[]}={}){
  const task=getRecord(state,'maintenance',taskId);
  if(!task) throw new Error('Maintenance task not found');
  const history=upsertRecord(state,'maintenanceHistory',{
    maintenanceId:task.id,equipmentId:task.equipmentId,componentId:task.componentId||'',completedAt,engineHours,cycles,performedBy,notes,partsConsumed
  });
  task.lastCompletedDate=completedAt.slice(0,10);
  if(engineHours!=null) task.lastCompletedHours=Number(engineHours);
  if(cycles!=null) task.lastCompletedCycles=Number(cycles);
  if(task.intervalHours&&engineHours!=null) task.nextDueHours=Number(engineHours)+Number(task.intervalHours);
  if(task.intervalDays){const d=new Date(completedAt);d.setDate(d.getDate()+Number(task.intervalDays));task.nextDueDate=d.toISOString().slice(0,10);}
  if(task.intervalCycles&&cycles!=null) task.nextDueCycles=Number(cycles)+Number(task.intervalCycles);
  if(['corrective','one-time'].includes(task.taskType)){
    task.completed=true;task.status='completed';task.nextDueDate='';task.nextDueHours=null;task.nextDueCycles=null;
  }else{
    task.completed=false;task.status='auto';
  }
  if(engineHours!=null&&Number(engineHours)>(Number(state.vessel?.engineHours)||0)) state.vessel.engineHours=Number(engineHours);
  task.updatedAt=new Date().toISOString();
  for(const c of partsConsumed||[]){ adjustInventory(state,c.inventoryId,-Math.abs(Number(c.qty)||0),{type:'maintenance-use',at:completedAt,source:`Maintenance: ${task.name}`,maintenanceId:task.id,notes}); }
  upsertRecord(state,'logs',{category:'maintenance',author:performedBy||'Crew',title:`Maintenance completed: ${task.name}`,at:completedAt,equipmentId:task.equipmentId,text:`${notes||'Maintenance completion recorded.'}${engineHours!=null?` Engine hours: ${engineHours}.`:''} History ID: ${history.id}`});
  return history;
}


function inventoryStatus(item={}, now=new Date()){
  const qty=Number(item.qty); const min=Number(item.minimum); const desired=Number(item.desired);
  const expires=item.expires?new Date(`${item.expires}T12:00:00`):null;
  if(expires && expires<now) return 'expired';
  if(!Number.isFinite(qty)) return 'unknown';
  if(qty<=0 && (Number.isFinite(min)?min>0:true)) return 'missing';
  if(Number.isFinite(min) && qty<min) return 'reorder';
  if(Number.isFinite(desired) && desired>0 && qty<desired) return 'low';
  return 'ok';
}

function adjustInventory(state,inventoryId,delta,{type='adjust',at=new Date().toISOString(),source='Manual',notes='',maintenanceId='',unitCost=null}={}){
  const item=getRecord(state,'inventory',inventoryId); if(!item) throw new Error('Inventory item not found');
  const before=Number(item.qty)||0, change=Number(delta)||0, after=Math.max(0,before+change);
  item.qty=after; item.updatedAt=new Date().toISOString();
  const tx=upsertRecord(state,'inventoryTransactions',{inventoryId,type,quantity:Math.abs(change),delta:after-before,before,after,unit:item.unit||'ea',at,source,notes,maintenanceId,unitCost});
  return tx;
}

function storagePath(state,locationId){
  if(!locationId) return '';
  const parts=[],seen=new Set(); let id=locationId;
  while(id && !seen.has(id) && parts.length<12){ seen.add(id); const loc=getRecord(state,'storageLocations',id); if(!loc) break; parts.unshift(loc.name); id=loc.parentLocationId||''; }
  return parts.join(' / ');
}

function setStorageParent(state,locationId,parentLocationId){
  const loc=getRecord(state,'storageLocations',locationId); if(!loc) return {ok:false,reason:'Storage location not found'};
  if(locationId===parentLocationId) return {ok:false,reason:'A location cannot contain itself'};
  let current=parentLocationId,seen=new Set([locationId]);
  while(current){ if(seen.has(current)) return {ok:false,reason:'That move would create a circular storage hierarchy'}; seen.add(current); current=getRecord(state,'storageLocations',current)?.parentLocationId||''; }
  loc.parentLocationId=parentLocationId||''; loc.updatedAt=new Date().toISOString(); return {ok:true};
}

function resourceQuantity(state,resourceId){
  const tanks=activeRecords(state.tanks||[]).filter(t=>t.resourceId===resourceId && Number.isFinite(Number(t.current)));
  if(tanks.length) return tanks.reduce((sum,t)=>sum+Number(t.current),0);
  const r=getRecord(state,'resources',resourceId); return Number.isFinite(Number(r?.current))?Number(r.current):null;
}

function resourceCapacity(state,resourceId){
  const tanks=activeRecords(state.tanks||[]).filter(t=>t.resourceId===resourceId && Number.isFinite(Number(t.capacity)));
  if(tanks.length) return tanks.reduce((sum,t)=>sum+Number(t.capacity),0);
  const r=getRecord(state,'resources',resourceId); return Number.isFinite(Number(r?.capacity))?Number(r.capacity):null;
}

function syncResourceFromTanks(state,resourceId){
  const r=getRecord(state,'resources',resourceId); if(!r) return null;
  const q=resourceQuantity(state,resourceId), cap=resourceCapacity(state,resourceId);
  if(q!==null) r.current=q; if(cap!==null) r.capacity=cap; r.updatedAt=new Date().toISOString(); return r;
}

function applyResourceTransaction(state,resourceId,{tankId='',type='adjust',quantity=0,at=new Date().toISOString(),source='Manual',confidence='medium',notes='',durationDays=null,durationHours=null,rpm=null,distanceNm=null,crewCount=null,context='',reading=null}={}){
  const r=getRecord(state,'resources',resourceId); if(!r) throw new Error('Resource not found');
  const q=Math.abs(Number(quantity)||0); const signed=['consume','drain','use'].includes(type)?-q:['fill','produce','add'].includes(type)?q:Number(quantity)||0;
  let before=resourceQuantity(state,resourceId), after=before;
  if(tankId){
    const tank=getRecord(state,'tanks',tankId); if(!tank) throw new Error('Tank not found');
    const tankBefore=Number(tank.current)||0, max=Number.isFinite(Number(tank.usable))?Number(tank.usable):Number.isFinite(Number(tank.capacity))?Number(tank.capacity):Infinity;
    tank.current=type==='reading'?Math.max(0,Math.min(max,q)):Math.max(0,Math.min(max,tankBefore+signed));
    tank.lastReadingAt=at; tank.source=source; tank.confidence=confidence; tank.updatedAt=new Date().toISOString(); syncResourceFromTanks(state,resourceId); after=resourceQuantity(state,resourceId);
  } else if(before!==null){ r.current=type==='reading'?Math.max(0,q):Math.max(0,before+signed); r.updatedAt=new Date().toISOString(); after=r.current; }
  const tx=upsertRecord(state,'resourceTransactions',{resourceId,tankId,type,quantity:q,delta:after!==null&&before!==null?after-before:signed,before,after,unit:r.unit||'',at,source,confidence,notes,durationDays,durationHours,rpm,distanceNm,crewCount,context,reading});
  upsertRecord(state,'logs',{category:'resource',title:`${r.name}: ${type}`,at,author:'Crew',resourceId,text:`${Math.abs(tx.delta??signed)} ${r.unit||''} ${type}. Source: ${source}.${notes?` ${notes}`:''}`});
  return tx;
}

function historicalResourceRate(state,resourceId,{type='consume',limit=20}={}){
  const tx=activeRecords(state.resourceTransactions||[]).filter(t=>t.resourceId===resourceId&&t.type===type&&Number(t.quantity)>0&&Number(t.durationDays)>0).sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,limit);
  const qty=tx.reduce((s,t)=>s+Number(t.quantity),0), days=tx.reduce((s,t)=>s+Number(t.durationDays),0);
  return {rate:days>0?qty/days:null,samples:tx.length,totalQuantity:qty,totalDays:days,from:tx.length?tx[tx.length-1].at:null,to:tx.length?tx[0].at:null};
}


function captureDepartureBaseline(state,{voyageId='',createdBy='',notes='',readinessResult=null}={}){
  const voyage=(state.voyages||[]).find(v=>v.id===voyageId) || (state.voyages||[]).find(v=>!v.archived&&v.status==='active') || (state.voyages||[]).find(v=>!v.archived) || null;
  if(!voyage) throw new Error('No voyage available for departure baseline');
  const rr=readinessResult || {overall:'unknown',results:[]};
  const snapshot={
    vessel:structuredClone(state.vessel||{}),
    voyage:structuredClone(voyage),
    readiness:structuredClone(rr),
    openFindings:structuredClone((state.findings||[]).filter(f=>!f.archived&&!['resolved','accepted'].includes((f.status||'').toLowerCase()))),
    resources:structuredClone((state.resources||[]).filter(r=>!r.archived)),
    tanks:structuredClone((state.tanks||[]).filter(t=>!t.archived)),
    maintenance:structuredClone((state.maintenance||[]).filter(t=>!t.archived)),
    inventory:structuredClone((state.inventory||[]).filter(i=>!i.archived)),
    documents:structuredClone((state.documents||[]).filter(d=>!d.archived)),
    weather:structuredClone((state.weather||[]).filter(w=>!w.archived)),
    crew:structuredClone((state.crew||[]).filter(c=>!c.archived))
  };
  return upsertRecord(state,'departureBaselines',{name:`Departure baseline — ${voyage.name||voyage.id}`,voyageId:voyage.id,capturedAt:new Date().toISOString(),createdBy,notes,disposition:rr.disposition||rr.overall||'unknown',snapshot});
}

function startWatch(state,{voyageId='',watchkeeper='',watchkeeperId='',scheduleId='',start=new Date().toISOString(),end='',notes=''}={}){
  const voyage=(state.voyages||[]).find(v=>v.id===voyageId) || (state.voyages||[]).find(v=>!v.archived&&v.status==='active') || null;
  const existing=(state.watches||[]).find(w=>!w.archived&&w.status==='active'); if(existing) throw new Error(`End the current watch (${existing.watchkeeper||'unassigned'}) before starting another.`);
  return upsertRecord(state,'watches',{name:`Watch — ${watchkeeper||'Unassigned'}`,voyageId:voyage?.id||voyageId,watchkeeper,watchkeeperId,scheduleId,start,end,status:'active',startedAt:start,notes,handoff:'',acknowledgedAt:'',acknowledgedBy:''});
}

function endWatch(state,watchId,{endedAt=new Date().toISOString(),summary='',conditions='',traffic='',equipment='',weather='',upcoming='',plan='',notes='',nextWatchkeeper='',nextWatchkeeperId=''}={}){
  const watch=getRecord(state,'watches',watchId); if(!watch) throw new Error('Watch not found');
  watch.status='completed'; watch.endedAt=endedAt; watch.updatedAt=new Date().toISOString();
  const handoff=upsertRecord(state,'watchHandoffs',{name:`Watch handoff — ${watch.watchkeeper||'Outgoing'} → ${nextWatchkeeper||'Incoming'}`,watchId:watch.id,voyageId:watch.voyageId||'',fromWatchkeeper:watch.watchkeeper||'',fromWatchkeeperId:watch.watchkeeperId||'',toWatchkeeper:nextWatchkeeper,toWatchkeeperId:nextWatchkeeperId,createdAt:endedAt,summary,conditions,traffic,equipment,weather,upcoming,plan,notes,status:'pending',acknowledgedAt:'',acknowledgedBy:''});
  watch.handoffId=handoff.id; watch.handoff=summary||plan||notes||'';
  return handoff;
}

function acknowledgeHandoff(state,handoffId,{acknowledgedAt=new Date().toISOString(),acknowledgedBy=''}={}){
  const h=getRecord(state,'watchHandoffs',handoffId); if(!h) throw new Error('Watch handoff not found');
  h.status='acknowledged';h.acknowledgedAt=acknowledgedAt;h.acknowledgedBy=acknowledgedBy;h.updatedAt=new Date().toISOString();
  const w=getRecord(state,'watches',h.watchId);if(w){w.acknowledgedAt=acknowledgedAt;w.acknowledgedBy=acknowledgedBy;w.updatedAt=new Date().toISOString();}
  return h;
}

function nextScheduledWatch(state,at=new Date()){
  const schedules=activeRecords(state.watchSchedules||[]).filter(x=>x.enabled!==false).sort((a,b)=>(a.order??999)-(b.order??999));
  if(!schedules.length) return null;
  const mins=at.getHours()*60+at.getMinutes();
  const parse=t=>{const [h,m]=String(t||'00:00').split(':').map(Number);return h*60+m;};
  const upcoming=schedules.map(s=>({s,startMin:parse(s.startTime)})).filter(x=>x.startMin>mins).sort((a,b)=>a.startMin-b.startMin);
  return (upcoming[0]||{s:schedules[0]}).s;
}

function updateVoyageObservation(state,voyageId,{lat=null,lon=null,speedKt=null,courseDeg=null,progressNm=null,source='manual',observedAt=new Date().toISOString(),notes=''}={}){
  const v=getRecord(state,'voyages',voyageId);if(!v) throw new Error('Voyage not found');
  if(Number.isFinite(Number(lat))&&Number.isFinite(Number(lon))) v.position={lat:Number(lat),lon:Number(lon)};
  if(Number.isFinite(Number(speedKt))) v.speedKt=Number(speedKt);
  if(Number.isFinite(Number(courseDeg))) v.courseDeg=Number(courseDeg);
  if(Number.isFinite(Number(progressNm))) v.progressNm=Number(progressNm);
  v.positionSource=source||'manual';v.positionUpdatedAt=observedAt;v.lastObservationAt=observedAt;v.lastObservationNotes=notes;v.updatedAt=new Date().toISOString();
  return v;
}


function startProcedureExecution(state,procedureId,{voyageId='',crewId='',performedBy='',startedAt=new Date().toISOString(),notes=''}={}){
  const procedure=getRecord(state,'procedures',procedureId); if(!procedure) throw new Error('Procedure not found');
  const existing=activeRecords(state.procedureExecutions||[]).find(x=>x.procedureId===procedureId&&x.status==='in-progress');
  if(existing) return existing;
  const steps=(procedure.steps||[]).map((text,index)=>({index,text:String(text),status:'pending',at:'',reason:'',notes:''}));
  return upsertRecord(state,'procedureExecutions',{name:`Execution — ${procedure.name}`,procedureId,voyageId,crewId,performedBy:performedBy||'Crew',startedAt,status:'in-progress',category:procedure.category||'normal',procedureName:procedure.name,procedureRevisionAt:procedure.updatedAt||procedure.createdAt||'',steps,notes,completedAt:'',abortedAt:''});
}

function recordProcedureStep(state,executionId,stepIndex,{status='done',at=new Date().toISOString(),reason='',notes=''}={}){
  const execution=getRecord(state,'procedureExecutions',executionId); if(!execution) throw new Error('Procedure execution not found');
  if(execution.status!=='in-progress') throw new Error('Procedure execution is no longer active');
  const step=(execution.steps||[]).find(x=>Number(x.index)===Number(stepIndex)); if(!step) throw new Error('Procedure step not found');
  if(status==='skipped'&&!String(reason||'').trim()) throw new Error('A skipped step requires a reason');
  if(status==='pending'){step.status='pending';step.at='';step.reason='';step.notes='';}
  else {step.status=status;step.at=at;step.reason=reason||'';step.notes=notes||'';}
  execution.updatedAt=new Date().toISOString(); return execution;
}

function finishProcedureExecution(state,executionId,{status='completed',at=new Date().toISOString(),notes=''}={}){
  const execution=getRecord(state,'procedureExecutions',executionId); if(!execution) throw new Error('Procedure execution not found');
  if(status==='completed'&&(execution.steps||[]).some(s=>s.status==='pending')) throw new Error('Complete or skip every step before completing the procedure');
  execution.status=status;
  if(status==='aborted') execution.abortedAt=at; else execution.completedAt=at;
  execution.completionNotes=notes||'';execution.updatedAt=new Date().toISOString();
  return execution;
}

function procedureExecutionSummary(execution){
  const steps=execution?.steps||[],done=steps.filter(s=>s.status==='done').length,skipped=steps.filter(s=>s.status==='skipped').length,pending=steps.filter(s=>s.status==='pending').length;
  return {total:steps.length,done,skipped,pending};
}


function evidenceRelatedRecords(state,evidenceId){
  return relatedRecords(state,'evidence',evidenceId).filter(x=>x.collection!=='evidence');
}

function evidenceForRecord(state,collection,id){
  const ids=new Set();
  for(const rel of state.relationships||[]){
    if(rel.from?.collection==='evidence' && rel.to?.collection===collection && rel.to?.id===id) ids.add(rel.from.id);
    if(rel.to?.collection==='evidence' && rel.from?.collection===collection && rel.from?.id===id) ids.add(rel.to.id);
  }
  return activeRecords(state.evidence||[]).filter(e=>ids.has(e.id));
}

function timelinePush(rows,{at,kind,title,detail='',collection='',id='',systemId='',voyageId='',severity='',icon='•'}={}){
  if(!at) return;
  const d=new Date(at); if(Number.isNaN(d.getTime())) return;
  rows.push({at:d.toISOString(),kind,title,detail,collection,id,systemId,voyageId,severity,icon});
}

function vesselTimeline(state,{kind='',systemId='',voyageId='',query='',limit=500}={}){
  const rows=[];
  for(const v of activeRecords(state.voyages||[])){
    timelinePush(rows,{at:v.departedAt||v.plannedDeparture,kind:'voyage',title:`Departed — ${v.name||v.destination||'Voyage'}`,detail:`${v.origin||'—'} → ${v.destination||'—'}`,collection:'voyages',id:v.id,voyageId:v.id,icon:'◈'});
    if(v.status==='completed'||v.arrivedAt) timelinePush(rows,{at:v.arrivedAt||v.updatedAt,kind:'voyage',title:`Arrived — ${v.name||v.destination||'Voyage'}`,detail:v.destination||'',collection:'voyages',id:v.id,voyageId:v.id,icon:'◆'});
  }
  for(const x of activeRecords(state.maintenanceHistory||[])) timelinePush(rows,{at:x.completedAt,kind:'maintenance',title:`Maintenance — ${getRecord(state,'maintenance',x.maintenanceId)?.name||'Completed task'}`,detail:x.notes||'',collection:'maintenanceHistory',id:x.id,systemId:getRecord(state,'equipment',x.equipmentId)?.systemId||'',icon:'⚙'});
  for(const x of activeRecords(state.inspections||[])) timelinePush(rows,{at:x.at,kind:'inspection',title:`Inspection — ${x.name||recordLabel(x)}`,detail:`${x.result||'unknown'} · ${x.notes||''}`,collection:'inspections',id:x.id,systemId:getRecord(state,'equipment',x.equipmentId)?.systemId||'',severity:x.result,icon:'◇'});
  for(const x of activeRecords(state.findings||[])) timelinePush(rows,{at:x.createdAt||x.updatedAt,kind:'finding',title:`Finding — ${x.title||recordLabel(x)}`,detail:x.description||x.action||'',collection:'findings',id:x.id,systemId:x.systemId||'',voyageId:x.voyageId||'',severity:x.severity||'',icon:'!'});
  for(const x of activeRecords(state.portVisits||[])) timelinePush(rows,{at:x.arrivedAt,kind:'port',title:`Port visit — ${getRecord(state,'ports',x.portId)?.name||'Port'}`,detail:x.berth||x.notes||'',collection:'portVisits',id:x.id,voyageId:x.voyageId||'',icon:'⌖'});
  for(const x of activeRecords(state.procedureExecutions||[])) timelinePush(rows,{at:x.completedAt||x.abortedAt||x.startedAt,kind:'procedure',title:`Procedure — ${x.procedureName||recordLabel(x)}`,detail:`${x.status||'unknown'} · ${x.completionNotes||x.notes||''}`,collection:'procedureExecutions',id:x.id,voyageId:x.voyageId||'',icon:'✓'});
  for(const x of activeRecords(state.anchorDeployments||[])) timelinePush(rows,{at:x.deployedAt,kind:'anchor',title:`Anchor deployed — ${getRecord(state,'anchorages',x.anchorageId)?.name||'Anchorage'}`,detail:`${getRecord(state,'groundTackle',x.groundTackleId)?.name||'Ground tackle'} · ${x.scope||'—'}:1`,collection:'anchorDeployments',id:x.id,voyageId:x.voyageId||'',icon:'⚓'});
  for(const x of activeRecords(state.equipment||[])) if(x.installationDate||x.commissioningDate) timelinePush(rows,{at:x.commissioningDate||x.installationDate,kind:'equipment',title:`Equipment installed — ${x.name}`,detail:`${x.manufacturer||''} ${x.model||''}`.trim(),collection:'equipment',id:x.id,systemId:x.systemId||'',icon:'▣'});
  for(const x of activeRecords(state.evidence||[])) timelinePush(rows,{at:x.observedAt||x.capturedAt||x.createdAt,kind:'evidence',title:`Evidence — ${x.title||x.name||'Evidence item'}`,detail:`${x.kind||'record'} · ${x.source||'unknown source'}`,collection:'evidence',id:x.id,icon:'▱'});
  for(const x of activeRecords(state.timelineEvents||[])) timelinePush(rows,{at:x.at,kind:x.kind||'milestone',title:x.title||'Milestone',detail:x.detail||x.notes||'',collection:'timelineEvents',id:x.id,systemId:x.systemId||'',voyageId:x.voyageId||'',severity:x.severity||'',icon:x.icon||'◆'});
  for(const x of activeRecords(state.logs||[])) if(['incident','repair','lesson learned'].includes(String(x.category||'').toLowerCase())) timelinePush(rows,{at:x.at,kind:x.category==='incident'?'incident':'log',title:x.title||x.category||'Log entry',detail:x.text||'',collection:'logs',id:x.id,systemId:x.systemId||'',voyageId:x.voyageId||'',severity:x.category==='incident'?'watch':'',icon:x.category==='incident'?'▲':'▱'});
  let out=rows.sort((a,b)=>new Date(b.at)-new Date(a.at));
  if(kind) out=out.filter(x=>x.kind===kind);
  if(systemId) out=out.filter(x=>x.systemId===systemId);
  if(voyageId) out=out.filter(x=>x.voyageId===voyageId);
  const q=String(query||'').trim().toLowerCase(); if(q) out=out.filter(x=>`${x.title} ${x.detail} ${x.kind}`.toLowerCase().includes(q));
  return out.slice(0,limit);
}


/* ===== migrations.js ===== */
const CURRENT_SCHEMA=16;

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

function migrateState(input){
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

function validateState(s){
  const errors=[];
  if(!s || typeof s!=='object') errors.push('Backup must be a JSON object.');
  if(!s?.vessel || typeof s.vessel!=='object') errors.push('Missing vessel record.');
  if(!s?.settings || typeof s.settings!=='object') errors.push('Missing settings record.');
  if(s?.schemaVersion && Number(s.schemaVersion)>CURRENT_SCHEMA) errors.push(`Backup schema v${s.schemaVersion} is newer than this AFLOAT build supports (v${CURRENT_SCHEMA}).`);
  return {ok:errors.length===0,errors};
}


/* ===== db.js ===== */
const DB_NAME = 'afloat-db';
const DB_VERSION = 1;
const STORE = 'state';
const KEY = 'current';

let dbPromise;

function openDB(){
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve,reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function loadState(){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(STORE,'readonly');
    const req = tx.objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function saveState(state){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).put(state, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Save aborted'));
  });
}

async function clearState(){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function downloadJSON(filename, data){
  const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}


/* ===== calc.js ===== */
const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));
const num = v => Number.isFinite(Number(v)) ? Number(v) : null;
const fmt = (v,d=1,unknown='UNKNOWN') => Number.isFinite(v) ? v.toFixed(d) : unknown;

function haversineNm(a,b){
  if(!a || !b || !Number.isFinite(+a.lat) || !Number.isFinite(+a.lon) || !Number.isFinite(+b.lat) || !Number.isFinite(+b.lon)) return null;
  const R=3440.065, rad=x=>x*Math.PI/180;
  const dLat=rad(+b.lat-+a.lat), dLon=rad(+b.lon-+a.lon);
  const la1=rad(+a.lat), la2=rad(+b.lat);
  const h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}

function routeDistance(route=[]){
  let total=0, valid=false;
  for(let i=1;i<route.length;i++){
    const d=haversineNm(route[i-1],route[i]);
    if(Number.isFinite(d)){ total+=d; valid=true; }
  }
  return valid?total:null;
}

function durationHours(distanceNm,speedKt){
  const d=num(distanceNm), s=num(speedKt);
  return d!==null && s>0 ? d/s : null;
}

function endurance(quantity,reserve,dailyUse,dailyProduction=0){
  const q=num(quantity), r=num(reserve)??0, use=num(dailyUse), prod=num(dailyProduction)??0;
  if(q===null || use===null) return null;
  const net=use-prod;
  if(net<=0) return Infinity;
  return Math.max(0,q-r)/net;
}

function fuelRange({usable,current,reserve,burnPerHour,speedKt}){
  const q=num(current ?? usable), r=num(reserve)??0, burn=num(burnPerHour), speed=num(speedKt);
  if(q===null || burn===null || speed===null || burn<=0 || speed<=0) return {hours:null,range:null};
  const hours=Math.max(0,q-r)/burn;
  return {hours,range:hours*speed};
}

function energyDaily(loads=[]){
  return loads.reduce((sum,l)=>{
    const watts=num(l.watts)??0, duty=(num(l.dutyPct)??100)/100, hours=num(l.hoursPerDay)??0;
    return sum + watts*duty*hours/1000;
  },0);
}
function generationDaily(sources=[]){
  return sources.reduce((sum,s)=>sum+(num(s.dailyKwh)??0),0);
}

function energyProjection({capacityKwh,currentPct,reservePct,loads,sources}){
  const cap=num(capacityKwh), soc=num(currentPct), reserve=num(reservePct)??20;
  const use=energyDaily(loads), gen=generationDaily(sources), net=gen-use;
  if(cap===null || soc===null) return {use,gen,net,enduranceHours:null,projectedPct:null};
  const available=cap*Math.max(0,(soc-reserve)/100);
  const deficit=Math.max(0,use-gen);
  const enduranceHours=deficit>0 ? available/deficit*24 : Infinity;
  return {use,gen,net,enduranceHours,projectedPct:clamp(soc+(net/cap*100),0,100)};
}

function anchorPlan({depth,bowHeight,tideRise,scope,availableClearance,availableRode,vesselLengthM=0}){
  const d=num(depth), bow=num(bowHeight)??0, tide=num(tideRise)??0, sc=num(scope), loa=num(vesselLengthM)??0;
  if(d===null || sc===null) return {effectiveDepth:null,requiredRode:null,rode:null,swingRadius:null,swing:null,clearanceMargin:null,margin:null,rodeMargin:null};
  const effective=d+bow+tide;
  const requiredRode=effective*sc;
  // Conservative planning circle: required rode plus vessel length from anchor point.
  const swingRadius=requiredRode+Math.max(0,loa);
  const clearance=num(availableClearance), avail=num(availableRode);
  const clearanceMargin=clearance!==null ? clearance-swingRadius : null;
  const rodeMargin=avail!==null ? avail-requiredRode : null;
  return {effectiveDepth:effective,requiredRode,rode:requiredRode,swingRadius,swing:swingRadius,clearanceMargin,margin:clearanceMargin,rodeMargin};
}

function maintenanceStatus(task, engineHours=0, today=new Date(), currentCycles=null){
  if((task.status||'').toLowerCase()==='deferred') return 'deferred';
  if((task.status||'').toLowerCase()==='not-applicable') return 'not-applicable';
  if(task.completed && !task.nextDueDate && task.nextDueHours==null && task.nextDueCycles==null) return 'completed';
  let overdue=false,due=false;
  if(task.nextDueDate){
    const dt=new Date(task.nextDueDate+'T12:00:00');
    const days=(dt-today)/86400000;
    if(days<0) overdue=true; else if(days<=30) due=true;
  }
  if(task.nextDueHours!==null && task.nextDueHours!=='' && Number.isFinite(+task.nextDueHours)){
    const delta=+task.nextDueHours-(+engineHours||0);
    if(delta<0) overdue=true; else if(delta<=25) due=true;
  }
  if(task.nextDueCycles!==null && task.nextDueCycles!=='' && Number.isFinite(+task.nextDueCycles) && Number.isFinite(+currentCycles)){
    const delta=+task.nextDueCycles-(+currentCycles||0);
    if(delta<0) overdue=true; else if(delta<=10) due=true;
  }
  return overdue?'overdue':due?'due':'upcoming';
}

function ageMs(timestamp,now=Date.now()){
  if(!timestamp) return null; const t=new Date(timestamp).getTime(); return Number.isFinite(t)?Math.max(0,now-t):null;
}
function freshness(timestamp,maxAgeMs,now=Date.now()){
  const age=ageMs(timestamp,now); if(age===null)return {state:'unknown',ageMs:null,label:'timestamp unknown'};
  if(age>maxAgeMs)return {state:'stale',ageMs:age,label:`stale · ${Math.round(age/3600000)} hr old`};
  if(age<3600000)return {state:'fresh',ageMs:age,label:`${Math.max(0,Math.round(age/60000))} min old`};
  return {state:'fresh',ageMs:age,label:`${Math.round(age/3600000)} hr old`};
}


function voyageWindow(voyage,nowDate=new Date()){
  if(!voyage) return {start:null,end:null};
  const parse=v=>{if(!v)return null;const d=new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(v))?`${v}T12:00:00`:v);return Number.isFinite(d.getTime())?d:null;};
  const start=parse(voyage.departedAt)||parse(voyage.plannedDeparture)||null;
  let end=parse(voyage.arrivedAt)||parse(voyage.plannedArrival)||parse(voyage.eta)||null;
  if(!end&&start){const dist=num(voyage.distanceNm),speed=num(voyage.speedKt);if(dist!==null&&speed>0)end=new Date(start.getTime()+dist/speed*3600000);}
  return {start:start||((voyage.status==='active'||voyage.status==='planned')?new Date(nowDate):null),end};
}

function documentCompliance(document,voyage=null,nowDate=new Date()){
  const required=document?.requiredForDeparture!==false, expiry=document?.expires?new Date(`${document.expires}T23:59:59`):null, now=nowDate.getTime(), window=voyageWindow(voyage,nowDate);
  if(expiry&&!Number.isFinite(expiry.getTime())) return {status:'unknown',detail:'Expiration date is invalid',required,window};
  if(expiry&&expiry.getTime()<now) return {status:'fail',detail:`Expired ${document.expires}`,required,window};
  if(expiry&&window.end&&expiry.getTime()<=window.end.getTime()) return {status:'watch',detail:`Expires during voyage window · ${document.expires}`,required,window};
  if(expiry&&expiry.getTime()<now+90*86400000) return {status:'watch',detail:`Expires within 90 days · ${document.expires}`,required,window};
  if(required&&!expiry) return {status:'unknown',detail:'Required document has no expiration / no-expiry confirmation recorded',required,window};
  if(required&&String(document.confidence||'medium').toLowerCase()==='low') return {status:'watch',detail:'Required document record has LOW confidence',required,window};
  return {status:'pass',detail:expiry?`Valid beyond current voyage window · ${document.expires}`:'No expiry recorded; optional for departure review',required,window};
}

function readiness(state,nowDate=new Date()){
  const results=[], now=nowDate.getTime();
  const add=(name,status,detail,dependencies=[],freshnessInfo=null)=>results.push({name,status,detail,dependencies,freshness:freshnessInfo});
  const findings=(state.findings||[]).filter(f=>!f.archived&&!['resolved','accepted'].includes((f.status||'').toLowerCase()));
  const resources=(state.resources||[]).filter(r=>!r.archived), tanks=(state.tanks||[]).filter(t=>!t.archived), tx=(state.resourceTransactions||[]).filter(t=>!t.archived);
  const docs=(state.documents||[]).filter(d=>!d.archived), inventory=(state.inventory||[]).filter(i=>!i.archived), maintenance=(state.maintenance||[]).filter(t=>!t.archived);
  const systems=(state.systems||[]).filter(s=>!s.archived), equipment=(state.equipment||[]).filter(e=>!e.archived);
  const vessel=state.vessel||{}, voyage=(state.voyages||[]).find(v=>!v.archived&&v.status==='active') || (state.voyages||[]).find(v=>!v.archived);
  const route=(state.routeWaypoints||[]).filter(w=>!w.archived&&w.voyageId===voyage?.id).sort((a,b)=>(a.order??999)-(b.order??999)); const routeNm=routeDistance(route), voyageDistance=voyage?.distanceSource==='route'&&routeNm!==null?routeNm:num(voyage?.distanceNm)??routeNm;
  const crew=(state.crew||[]).filter(c=>!c.archived),crewCount=Math.max(1,crew.length||1);
  const qty=r=>{const linked=tanks.filter(t=>t.resourceId===r.id&&Number.isFinite(Number(t.current)));return linked.length?linked.reduce((sum,t)=>sum+Number(t.current),0):(num(r.current));};
  const histRate=r=>{const rows=tx.filter(t=>t.resourceId===r.id&&t.type==='consume'&&Number(t.quantity)>0&&Number(t.durationDays)>0);const q=rows.reduce((a,t)=>a+Number(t.quantity),0),d=rows.reduce((a,t)=>a+Number(t.durationDays),0);return {rate:d>0?q/d:null,samples:rows.length};};
  const resourceFreshness=r=>{const linked=tanks.filter(t=>t.resourceId===r.id);const stamps=[...linked.map(t=>t.lastReadingAt),...tx.filter(t=>t.resourceId===r.id).map(t=>t.at)].filter(Boolean).sort();return freshness(stamps.at(-1),Number(state.settings?.freshness?.resourceHours??48)*3600000,now);};
  const highFind=findings.filter(f=>['critical','high'].includes((f.severity||'').toLowerCase())),criticalFind=findings.filter(f=>(f.severity||'').toLowerCase()==='critical');
  add('Vessel',criticalFind.length?'fail':highFind.length?'watch':'pass',criticalFind.length?`${criticalFind.length} unresolved critical finding(s)`:highFind.length?`${highFind.length} unresolved high-priority finding(s)`:'No unresolved high/critical findings',[`${findings.length} unresolved finding(s)`]);

  const systemCategory=(label,matcher)=>{
    const sys=systems.find(s=>matcher.test(String(s.name||''))); if(!sys){add(label,'unknown',`No ${label.toLowerCase()} system defined`,['Vessel system record missing']);return;}
    const sf=findings.filter(f=>f.systemId===sys.id),crit=sf.some(f=>(f.severity||'').toLowerCase()==='critical'),high=sf.some(f=>(f.severity||'').toLowerCase()==='high');
    const ss=String(sys.status||'unknown').toLowerCase(); const st=crit||ss==='fail'?'fail':high||ss==='watch'?'watch':ss==='pass'?'pass':'unknown';
    add(label,st,`${sys.name}: ${String(sys.status||'unknown').toUpperCase()}${sf.length?` · ${sf.length} open finding(s)`:''}`,[`System ${sys.name}`,sf.length?`${sf.length} linked finding(s)`:'No linked findings']);
  };
  systemCategory('Propulsion',/propulsion|engine/i); systemCategory('Steering',/steer/i); systemCategory('Rig',/\brig\b|mast|sail/i); systemCategory('Electrical',/electrical|power/i); systemCategory('Safety',/safety/i); systemCategory('Communications',/communication|radio/i);
  add('Crew',crew.length?'pass':'unknown',crew.length?`${crew.length} crew recorded`:'No crew recorded',[crew.length?crew.map(c=>c.name).join(', '):'Crew roster missing']);

  const fuel=resources.find(r=>r.kind==='fuel');
  if(fuel){
    const rf=resourceFreshness(fuel),pt=fuelCurvePoint(fuel.fuelCurve,fuel.planningRpm),burn=pt.burnPerHour||num(fuel.burnPerHour),speed=pt.speedKt||num(voyage?.speedKt)||num(vessel.cruiseSpeedKt),q=qty(fuel);
    const fr=fuelRange({current:q,reserve:fuel.reserve,burnPerHour:burn,speedKt:speed}),needed=voyageDistance;
    let st=fr.range===null?'unknown':q!==null&&q<=(num(fuel.reserve)??0)?'fail':needed&&fr.range<needed?'watch':'pass'; if(rf.state==='stale'&&st==='pass')st='unknown';
    add('Fuel',st,fr.range===null?'Insufficient quantity/burn/speed data':`${fr.range.toFixed(0)} nm estimated motoring range${fuel.planningRpm?` at ${fuel.planningRpm} RPM`:''} · ${rf.label}`,[`Quantity ${q??'UNKNOWN'} ${fuel.unit||''}`,`Reserve ${fuel.reserve??0} ${fuel.unit||''}`,`Burn ${burn??'UNKNOWN'} ${fuel.unit||''}/hr`,`Speed ${speed??'UNKNOWN'} kt`],rf);
  } else add('Fuel','unknown','No fuel resource defined',['Fuel resource missing']);

  const water=resources.find(r=>r.kind==='water');
  if(water){
    const rf=resourceFreshness(water),h=histRate(water),entered=num(water.dailyUse),selected=water.useRateSource==='historical'&&h.rate!==null?h.rate:entered,use=selected===null?null:water.rateBasis==='per-person'?selected*crewCount:selected,q=qty(water);
    const days=endurance(q,water.reserve,use,water.dailyProduction),voyageDays=voyageDistance&&voyage?.speedKt?durationHours(voyageDistance,voyage.speedKt)/24:null,margin=Number.isFinite(days)&&voyageDays?days-voyageDays:null;
    let st=days===null?'unknown':margin!==null&&margin<0?'fail':margin!==null&&margin<2?'watch':'pass';if(rf.state==='stale'&&st==='pass')st='unknown';
    add('Water',st,days===Infinity?`Net production exceeds use · ${rf.label}`:`${fmt(days,1)} days endurance${margin!==null?`, ${fmt(margin,1)} d margin`:''} · ${rf.label}`,[`Quantity ${q??'UNKNOWN'} ${water.unit||''}`,`Reserve ${water.reserve??0}`,`Daily use ${use??'UNKNOWN'}`,`Daily production ${water.dailyProduction??0}`,voyageDays?`Passage ${fmt(voyageDays,1)} d`:'Passage duration unknown'],rf);
  } else add('Water','unknown','No water resource defined',['Water resource missing']);

  const prov=provisionEndurance(state.provisions||[],crewCount),voyageDays=voyageDistance&&voyage?.speedKt?durationHours(voyageDistance,voyage.speedKt)/24:null;
  if((state.provisions||[]).filter(p=>!p.archived).length){const margin=Number.isFinite(prov.days)&&voyageDays?prov.days-voyageDays:null;add('Provisions',prov.days===null?'unknown':margin!==null&&margin<0?'fail':margin!==null&&margin<2?'watch':'pass',prov.days===null?'Missing serving/rate data':`${fmt(prov.days,1)} days limiting endurance${prov.limiting?` · ${prov.limiting.name}`:''}${margin!==null?` · ${fmt(margin,1)} d margin`:''}`,[prov.limiting?`Limiting provision: ${prov.limiting.name}`:'No limiting provision identified',voyageDays?`Passage ${fmt(voyageDays,1)} d`:'Passage duration unknown']);}
  else add('Provisions','unknown','No endurance-counted provisions defined',['Provision records missing']);

  const energy=state.energy;
  if(energy){const profile=(state.energyProfiles||[]).find(p=>!p.archived&&p.id===state.settings?.activeEnergyProfileId)||(state.energyProfiles||[]).find(p=>!p.archived);const ep=profile?energyProfileProjection(energy,profile):energyProjection(energy);const below=ep.currentKwh!==null&&ep.reserveKwh!==null&&ep.currentKwh<=ep.reserveKwh;add('Power',below?'fail':ep.enduranceHours===null?'unknown':Number.isFinite(ep.enduranceHours)&&ep.enduranceHours<24?'watch':'pass',below?'Current modeled storage is at/below reserve':ep.enduranceHours===Infinity?'Daily generation meets/exceeds load':ep.enduranceHours===null?'Insufficient storage/load data':`${fmt(ep.enduranceHours,0)} hr to reserve at modeled deficit`,[`Profile ${profile?.name||'default'}`,`Load ${fmt(ep.use,2)} kWh/day`,`Generation ${fmt(ep.gen,2)} kWh/day`]);}
  else add('Power','unknown','No energy model configured',['Energy model missing']);

  const requiredDocs=docs.filter(d=>d.requiredForDeparture!==false), docReview=requiredDocs.map(d=>({document:d,...documentCompliance(d,voyage,nowDate)}));
  const docFail=docReview.filter(x=>x.status==='fail'),docWatch=docReview.filter(x=>x.status==='watch'),docUnknown=docReview.filter(x=>x.status==='unknown');
  const docStatus=docFail.length?'fail':docWatch.length?'watch':docUnknown.length?'unknown':requiredDocs.length?'pass':'unknown';
  const docDetail=docFail.length?`${docFail.length} required document(s) expired`:docWatch.length?`${docWatch.length} required document(s) need voyage-window review`:docUnknown.length?`${docUnknown.length} required document(s) have incomplete validity data`:requiredDocs.length?`${requiredDocs.length} required document(s) valid for the entered voyage window`:'No departure-required ship’s papers identified';
  add('Documents',docStatus,docDetail,(docFail.length?docFail:docWatch.length?docWatch:docUnknown).slice(0,6).map(x=>`${x.document.name}: ${x.detail}`));

  const low=inventory.filter(i=>{const q=Number(i.qty)||0,min=Number(i.minimum)||0;return q<min||(i.expires&&new Date(i.expires)<nowDate)});
  const required=new Map(); for(const t of maintenance){for(const raw of t.requiredParts||[]){const [id,qraw]=String(raw).split(':');required.set(id,(required.get(id)||0)+Math.max(1,Number(qraw)||1));}}
  const shortages=inventory.filter(i=>(required.get(i.id)||0)>(Number(i.qty)||0)),criticalShort=shortages.filter(i=>(i.criticality||'').toLowerCase()==='high');
  add('Spares',criticalShort.length?'fail':low.length||shortages.length?'watch':inventory.length?'pass':'unknown',criticalShort.length?`${criticalShort.length} high-criticality maintenance-demand shortfall(s)`:shortages.length?`${shortages.length} maintenance-demand shortfall(s)`:low.length?`${low.length} low/expired item(s)`:inventory.length?'Stock meets minima and modeled maintenance demand':'No inventory records',[...shortages.map(i=>`${i.name}: ${i.qty} aboard / ${required.get(i.id)} needed`)].slice(0,6));

  const overdue=maintenance.filter(t=>{const cycles=equipment.find(e=>e.id===t.equipmentId)?.cycles;return maintenanceStatus(t,vessel.engineHours,nowDate,cycles)==='overdue';}),criticalOverdue=overdue.filter(t=>(equipment.find(e=>e.id===t.equipmentId)?.criticality||'').toLowerCase()==='high');
  add('Maintenance',criticalOverdue.length?'fail':overdue.length?'watch':maintenance.length?'pass':'unknown',criticalOverdue.length?`${criticalOverdue.length} overdue task(s) on high-criticality equipment`:overdue.length?`${overdue.length} overdue task(s)`:maintenance.length?'No overdue maintenance':'No maintenance tasks defined',overdue.slice(0,6).map(t=>t.name));

  const wx=(state.weather||[]).filter(w=>!w.archived).sort((a,b)=>new Date(b.issuedAt||b.forecastAt||0)-new Date(a.issuedAt||a.forecastAt||0))[0];
  if(wx){const wf=freshness(wx.issuedAt||wx.forecastAt,Number(state.settings?.freshness?.weatherHours??12)*3600000,now),lim=state.settings?.limits||{},exceed=(lim.maxWindKt&&+wx.windKt>+lim.maxWindKt)||(lim.maxWaveM&&+wx.waveM>+lim.maxWaveM);add('Weather',wf.state==='stale'?'unknown':exceed?'watch':'pass',wf.state==='stale'?`Latest forecast source is stale · ${wf.label}`:exceed?`Forecast exceeds a vessel preference · ${wf.label}`:`Forecast within entered preferences · ${wf.label}`,[`Source ${wx.source||'unknown'}`,`Wind ${wx.windKt??'UNKNOWN'} kt`,`Seas ${wx.waveM??'UNKNOWN'} m`],wf);} else add('Weather','unknown','No current forecast entered',['Weather record missing']);

  const safetySystem=systems.find(s=>/safety/i.test(s.name||'')),emergency=equipment.filter(e=>e.systemId===safetySystem?.id&&/epirb|life.?raft|flare|emergency|bilge|fire/i.test(`${e.name} ${e.model||''}`));
  if(!safetySystem) add('Emergency equipment','unknown','No safety system defined',['Safety system missing']);
  else if(!emergency.length) add('Emergency equipment','unknown','No emergency-equipment records identified',['Add EPIRB/life raft/fire/flooding equipment records']);
  else {const failed=emergency.filter(e=>(e.status||'unknown')==='fail'),watch=emergency.filter(e=>(e.status||'unknown')==='watch');add('Emergency equipment',failed.length?'fail':watch.length?'watch':'pass',failed.length?`${failed.length} emergency equipment record(s) failed`:watch.length?`${watch.length} emergency equipment record(s) need review`:`${emergency.length} emergency equipment record(s) without fail/watch status`,emergency.map(e=>`${e.name}: ${e.status||'unknown'}`));}

  let overall='pass'; if(results.some(r=>r.status==='fail'))overall='fail';else if(results.some(r=>r.status==='watch'))overall='watch';else if(results.some(r=>r.status==='unknown'))overall='unknown';
  const disposition=overall==='fail'?'HOLD':overall==='pass'?'PASS':'REVIEW';
  const blockers=results.filter(r=>r.status==='fail'),reviews=results.filter(r=>['watch','unknown'].includes(r.status));
  return {overall,disposition,results,blockers,reviews,evaluatedAt:nowDate.toISOString()};
}

function interpolateCurve(curve=[],x,xKey='rpm',yKey='burnPerHour'){
  const pts=(curve||[]).filter(p=>Number.isFinite(Number(p[xKey]))&&Number.isFinite(Number(p[yKey]))).map(p=>({...p,[xKey]:Number(p[xKey]),[yKey]:Number(p[yKey])})).sort((a,b)=>a[xKey]-b[xKey]);
  const xv=num(x); if(xv===null||!pts.length) return null; if(pts.length===1) return pts[0][yKey];
  if(xv<=pts[0][xKey]) return pts[0][yKey]; if(xv>=pts.at(-1)[xKey]) return pts.at(-1)[yKey];
  for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];if(xv<=b[xKey]){const t=(xv-a[xKey])/(b[xKey]-a[xKey]);return a[yKey]+t*(b[yKey]-a[yKey]);}}
  return null;
}

function fuelCurvePoint(curve=[],rpm){
  const burn=interpolateCurve(curve,rpm,'rpm','burnPerHour'), speed=interpolateCurve(curve,rpm,'rpm','speedKt');
  return {rpm:num(rpm),burnPerHour:burn,speedKt:speed,nmPerUnit:burn&&speed?speed/burn:null};
}

function bestRangePoint(curve=[]){
  const pts=(curve||[]).map(p=>({rpm:num(p.rpm),speedKt:num(p.speedKt),burnPerHour:num(p.burnPerHour)})).filter(p=>p.rpm!==null&&p.speedKt>0&&p.burnPerHour>0).map(p=>({...p,nmPerUnit:p.speedKt/p.burnPerHour}));
  return pts.length?pts.sort((a,b)=>b.nmPerUnit-a.nmPerUnit)[0]:null;
}

function tankQuantityFromCalibration(reading,calibration=[]){
  return interpolateCurve(calibration,reading,'reading','quantity');
}

function effectiveDailyUse(resource={},crewCount=1,historicalRate=null){
  const entered=num(resource.dailyUse), hist=num(historicalRate);
  const base=resource.useRateSource==='historical'&&hist!==null?hist:entered;
  if(base===null) return null;
  return resource.rateBasis==='per-person'?base*Math.max(1,Number(crewCount)||1):base;
}

function resourceEndurance({quantity,reserve,dailyUse,dailyProduction=0,passageDays=null}){
  const days=endurance(quantity,reserve,dailyUse,dailyProduction); const pd=num(passageDays);
  return {days,margin:Number.isFinite(days)&&pd!==null?days-pd:null};
}

function provisionEndurance(provisions=[],crewCount=1){
  const rows=(provisions||[]).filter(p=>!p.archived&&p.countsForEndurance!==false).map(p=>{
    const servings=num(p.servingsRemaining??p.servings), use=num(p.servingsPerPersonDay); const crew=Math.max(1,Number(crewCount)||1);
    const days=servings!==null&&use>0?servings/(use*crew):null; return {...p,days};
  });
  const finite=rows.filter(r=>Number.isFinite(r.days));
  return {days:finite.length?Math.min(...finite.map(r=>r.days)):null,limiting:finite.sort((a,b)=>a.days-b.days)[0]||null,rows};
}

function energyStorageSummary(energy={}){
  const banks=(energy.banks||[]).filter(b=>!b.archived);
  if(!banks.length){
    const capacity=num(energy.capacityKwh), pct=num(energy.currentPct), reserve=num(energy.reservePct)??20;
    return {capacityKwh:capacity,currentKwh:capacity!==null&&pct!==null?capacity*pct/100:null,reserveKwh:capacity!==null?capacity*reserve/100:null,currentPct:pct,reservePct:reserve,banks:[]};
  }
  let cap=0,current=0,reserve=0,valid=0;
  for(const b of banks){const c=num(b.capacityKwh),p=num(b.currentPct),r=num(b.reservePct)??20;if(c!==null){cap+=c;reserve+=c*r/100;if(p!==null){current+=c*p/100;valid++;}}}
  return {capacityKwh:cap||null,currentKwh:valid?current:null,reserveKwh:cap?reserve:null,currentPct:cap&&valid?current/cap*100:null,reservePct:cap?reserve/cap*100:null,banks};
}

function applyEnergyProfile(energy={},profile=null){
  const loads=(energy.loads||[]).map(l=>({...l})),sources=(energy.sources||[]).map(s=>({...s}));
  if(profile){
    for(const o of profile.loadOverrides||[]){const l=loads.find(x=>x.id===o.loadId);if(!l)continue;if(o.enabled===false)l.enabled=false;if(o.enabled===true)l.enabled=true;if(num(o.hoursPerDay)!==null)l.hoursPerDay=num(o.hoursPerDay);if(num(o.dutyPct)!==null)l.dutyPct=num(o.dutyPct);}
    for(const o of profile.sourceOverrides||[]){const s=sources.find(x=>x.id===o.sourceId);if(!s)continue;if(o.enabled===false)s.enabled=false;if(o.enabled===true)s.enabled=true;if(num(o.dailyKwh)!==null)s.dailyKwh=num(o.dailyKwh);}
  }
  return {loads:loads.filter(l=>l.enabled!==false),sources:sources.filter(s=>s.enabled!==false)};
}

function energyProfileProjection(energy={},profile=null){
  const cfg=applyEnergyProfile(energy,profile), storage=energyStorageSummary(energy);
  const use=energyDaily(cfg.loads), gen=generationDaily(cfg.sources), net=gen-use;
  const available=storage.currentKwh!==null&&storage.reserveKwh!==null?Math.max(0,storage.currentKwh-storage.reserveKwh):null;
  const enduranceHours=available===null?null:net<0?available/(-net)*24:Infinity;
  const projectedPct=storage.capacityKwh&&storage.currentKwh!==null?clamp((storage.currentKwh+net)/storage.capacityKwh*100,0,100):null;
  return {...cfg,...storage,use,gen,net,enduranceHours,projectedPct};
}

function loadSheddingPlan(energy={},profile=null){
  const priorityRank={optional:0,comfort:1,operational:2,essential:3,low:0,medium:1,high:3};
  const base=applyEnergyProfile(energy,profile); const storage=energyStorageSummary(energy); const gen=generationDaily(base.sources);
  const candidates=[...base.loads].sort((a,b)=>(priorityRank[a.priority]??2)-(priorityRank[b.priority]??2));
  const steps=[]; let active=[...base.loads];
  const snapshot=(label,removed='')=>{const use=energyDaily(active),net=gen-use,avail=storage.currentKwh!==null&&storage.reserveKwh!==null?Math.max(0,storage.currentKwh-storage.reserveKwh):null;steps.push({label,removed,use,gen,net,enduranceHours:avail===null?null:net<0?avail/(-net)*24:Infinity});};
  snapshot('Current profile');
  for(const c of candidates){if((priorityRank[c.priority]??2)>=3)continue;active=active.filter(x=>x.id!==c.id);snapshot(`Shed ${c.priority||'load'}`,c.name);}
  return steps;
}

function analyzeVoyageScenario({distanceNm,speedKt,motorHours=0,fuelQuantity=null,fuelReserve=0,fuelBurnPerHour=null,waterQuantity=null,waterReserve=0,waterDailyUse=null,waterDailyProduction=0,provisionDays=null,provisionUseScalePct=100,energyProjection=null}={}){
  const hours=durationHours(distanceNm,speedKt),days=hours===null?null:hours/24;
  const fuelUsed=num(fuelBurnPerHour)!==null?Math.max(0,num(motorHours)??0)*num(fuelBurnPerHour):null;
  const fuelMargin=fuelUsed!==null&&num(fuelQuantity)!==null?num(fuelQuantity)-(num(fuelReserve)??0)-fuelUsed:null;
  const waterUse=days!==null&&num(waterDailyUse)!==null?days*num(waterDailyUse):null;
  const waterProd=days!==null?(num(waterDailyProduction)??0)*days:null;
  const waterMargin=waterUse!==null&&num(waterQuantity)!==null?num(waterQuantity)-(num(waterReserve)??0)-waterUse+(waterProd||0):null;
  const pDays=num(provisionDays),pScale=(num(provisionUseScalePct)??100)/100,adjustedProvisionDays=pDays!==null&&pScale>0?pDays/pScale:null;
  const provisionMargin=adjustedProvisionDays!==null&&days!==null?adjustedProvisionDays-days:null;
  let energyMarginKwh=null,energyStatus='unknown';
  if(energyProjection&&days!==null&&num(energyProjection.currentKwh)!==null&&num(energyProjection.reserveKwh)!==null){energyMarginKwh=(energyProjection.currentKwh-energyProjection.reserveKwh)+(energyProjection.net||0)*days;energyStatus=energyMarginKwh<0?'fail':energyMarginKwh<Math.max(.25,(energyProjection.capacityKwh||0)*.1)?'watch':'pass';}
  const stat=(m,watch=0)=>m===null?'unknown':m<0?'fail':m<=watch?'watch':'pass';
  const statuses={fuel:stat(fuelMargin,num(fuelQuantity)!==null?Math.max(2,num(fuelQuantity)*.05):0),water:stat(waterMargin,num(waterDailyUse)!==null?num(waterDailyUse)*2:0),provisions:stat(provisionMargin,2),power:energyStatus};
  const overall=Object.values(statuses).includes('fail')?'fail':Object.values(statuses).includes('watch')?'watch':Object.values(statuses).includes('unknown')?'unknown':'pass';
  return {hours,days,fuelUsed,fuelMargin,waterUse,waterProduction:waterProd,waterMargin,adjustedProvisionDays,provisionMargin,energyMarginKwh,statuses,overall};
}


/* ===== gpx.js ===== */
const unesc=s=>String(s||'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
const gpxEsc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
function parseGpx(text){
  const src=String(text||''); const pts=[]; const re=/<(?:rtept|trkpt)\b[^>]*lat=["']([^"']+)["'][^>]*lon=["']([^"']+)["'][^>]*>([\s\S]*?)<\/(?:rtept|trkpt)>/gi; let m,i=0;
  while((m=re.exec(src))){const name=(m[3].match(/<name>([\s\S]*?)<\/name>/i)||[])[1];const lat=Number(m[1]),lon=Number(m[2]);if(Number.isFinite(lat)&&Number.isFinite(lon))pts.push({name:unesc(name)||`Waypoint ${++i}`,lat,lon});}
  if(!pts.length){const self=/<(?:rtept|trkpt)\b[^>]*lat=["']([^"']+)["'][^>]*lon=["']([^"']+)["'][^>]*\/>/gi;while((m=self.exec(src))){const lat=Number(m[1]),lon=Number(m[2]);if(Number.isFinite(lat)&&Number.isFinite(lon))pts.push({name:`Waypoint ${++i}`,lat,lon});}}
  const routeName=unesc((src.match(/<(?:rte|trk)>[\s\S]*?<name>([\s\S]*?)<\/name>/i)||[])[1]||'Imported GPX route');
  return {name:routeName,points:pts};
}
function exportGpx(name,points=[]){
  const rows=points.map(p=>`    <rtept lat="${Number(p.lat).toFixed(6)}" lon="${Number(p.lon).toFixed(6)}"><name>${gpxEsc(p.name||'Waypoint')}</name></rtept>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="AFLOAT" xmlns="http://www.topografix.com/GPX/1/1">\n  <rte><name>${gpxEsc(name||'AFLOAT route')}</name>\n${rows}\n  </rte>\n</gpx>\n`;
}


/* ===== ui.js ===== */
const uiRandomUUID=()=>globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
const esc = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
const id = prefix => `${prefix}-${uiRandomUUID()}`;
const dateTime = value => value ? new Date(value).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
const dateOnly = value => value ? new Date(value+'T12:00:00').toLocaleDateString([], {year:'numeric',month:'short',day:'numeric'}) : '—';
const statusClass = value => String(value||'unknown').toLowerCase().replace(/\s+/g,'-');
function statusBadge(value){ const v=String(value||'UNKNOWN').toUpperCase(); return `<span class="status ${statusClass(value)}">${esc(v)}</span>`; }
function metric(label,value,note=''){ return `<div class="metric"><div class="metric-label">${esc(label)}</div><div class="metric-value">${esc(value)}</div>${note?`<div class="metric-note">${esc(note)}</div>`:''}</div>`; }
function empty(title,detail=''){ return `<div class="empty"><strong>${esc(title)}</strong>${esc(detail)}</div>`; }
function toast(message){
  const root=document.getElementById('toastRoot'); if(!root) return;
  const el=document.createElement('div'); el.className='toast'; el.textContent=message; root.appendChild(el);
  setTimeout(()=>el.remove(),3200);
}
function closeModal(){ const root=document.getElementById('modalRoot'); if(root) root.innerHTML=''; }
function modal({title,body,submitLabel='Save',onSubmit,dangerLabel,onDanger}){
  const root=document.getElementById('modalRoot');
  root.innerHTML=`<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close-modal aria-label="Close">×</button></div><form id="modalForm"><div class="modal-body">${body}</div><div class="modal-foot">${dangerLabel?`<button type="button" class="danger-btn" id="modalDanger">${esc(dangerLabel)}</button>`:''}<button type="button" class="ghost-btn" data-close-modal>Cancel</button>${submitLabel?`<button class="primary-btn" type="submit">${esc(submitLabel)}</button>`:''}</div></form></div></div>`;
  root.querySelectorAll('[data-close-modal]').forEach(b=>b.addEventListener('click',closeModal));
  root.querySelector('.modal-backdrop').addEventListener('click',e=>{if(e.target.classList.contains('modal-backdrop')) closeModal();});
  const form=root.querySelector('#modalForm');
  if(form && onSubmit) form.addEventListener('submit',async e=>{e.preventDefault(); await onSubmit(new FormData(form),form);});
  if(dangerLabel && onDanger) root.querySelector('#modalDanger')?.addEventListener('click',onDanger);
  setTimeout(()=>root.querySelector('input,select,textarea,button')?.focus(),0);
}
function field(label,name,value='',type='text',opts={}){
  const full=opts.full?' full':''; const req=opts.required?' required':''; const step=opts.step?` step="${esc(opts.step)}"`:''; const min=opts.min!==undefined?` min="${esc(opts.min)}"`:''; const max=opts.max!==undefined?` max="${esc(opts.max)}"`:'';
  if(type==='textarea') return `<div class="field${full}"><label>${esc(label)}</label><textarea name="${esc(name)}"${req}>${esc(value)}</textarea>${opts.help?`<small>${esc(opts.help)}</small>`:''}</div>`;
  if(type==='select') return `<div class="field${full}"><label>${esc(label)}</label><select name="${esc(name)}"${req}>${(opts.options||[]).map(o=>{const ov=typeof o==='string'?o:o.value, ot=typeof o==='string'?o:o.label;return `<option value="${esc(ov)}" ${String(ov)===String(value)?'selected':''}>${esc(ot)}</option>`}).join('')}</select></div>`;
  return `<div class="field${full}"><label>${esc(label)}</label><input name="${esc(name)}" type="${esc(type)}" value="${esc(value)}"${req}${step}${min}${max}>${opts.help?`<small>${esc(opts.help)}</small>`:''}</div>`;
}
function formGrid(...items){return `<div class="form-grid">${items.join('')}</div>`;}
function downloadText(filename,text,type='text/plain'){
  const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}


/* ===== demo.js ===== */
const APP_VERSION='1.9.0';
const demoRandomUUID=()=>globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
const now=new Date();
const iso=d=>d.toISOString().slice(0,10);
const days=n=>{const d=new Date(now);d.setDate(d.getDate()+n);return iso(d)};
const ago=n=>{const d=new Date(now);d.setDate(d.getDate()-n);return iso(d)};

function blankState(name='Untitled Vessel'){
  return {
    schemaVersion:16, appVersion:APP_VERSION, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(),
    vessel:{id:demoRandomUUID(),name,type:'',lengthFt:null,homePort:'',status:'in-port',engineHours:0,cruiseSpeedKt:null,notes:''},
    crew:[], voyages:[], routeWaypoints:[], voyageScenarios:[], energyProfiles:[], systems:[], equipment:[], components:[], maintenance:[], maintenanceHistory:[], inspections:[], measurements:[], resources:[], tanks:[], resourceTransactions:[], provisions:[], energyObservations:[],
    energy:{capacityKwh:null,currentPct:null,reservePct:20,banks:[],loads:[],sources:[]}, inventory:[], inventoryTransactions:[], storageLocations:[], procedures:[], procedureExecutions:[], ports:[], portVisits:[], anchorages:[], groundTackle:[], anchorDeployments:[], anchorPositions:[],
    logs:[], findings:[], assumptions:[], evidence:[], timelineEvents:[], documents:[], weather:[], watches:[], watchSchedules:[], watchHandoffs:[], departureBaselines:[], relationships:[],
    settings:{theme:'dark',mode:'cruising',units:'marine',limits:{maxWindKt:25,maxGustKt:32,maxWaveM:2.5},freshness:{weatherHours:12,positionMinutes:60,resourceHours:48,measurementHours:72},activeScenario:'underway',activeEnergyProfileId:'enp-underway',activeAnchorageId:'a1',showArchived:false,sidebarCollapsed:false,lastBackupAt:'',lastBackupRecordCount:0}
  };
}

function demoState(){
  const s=blankState('SV Meridian');
  s.vessel={...s.vessel,type:'42 ft offshore cruising sailboat',lengthFt:42,homePort:'Annapolis, MD',status:'underway',engineHours:842,cruiseSpeedKt:6.2,notes:'Fictional demonstration vessel.'};
  s.crew=[
    {id:'c1',name:'Alex Morgan',role:'Skipper'},
    {id:'c2',name:'Sam Rivera',role:'Watchkeeper'},
    {id:'c3',name:'Jordan Lee',role:'Crew'}
  ];
  s.voyages=[{id:'v1',name:'Bermuda → Horta',origin:'St. George’s, Bermuda',destination:'Horta, Azores',distanceNm:1810,distanceSource:'route',routeName:'Bermuda to Horta demo route',speedKt:6.2,departedAt:ago(6),plannedDeparture:ago(6),plannedArrival:days(8),status:'active',progressNm:686,position:{lat:32.4,lon:-49.8},positionSource:'manual watch observation',positionUpdatedAt:new Date(Date.now()-18*60000).toISOString(),courseDeg:78,eta:days(8),alternates:'Flores; Ponta Delgada',notes:'Demo offshore passage.'}];
  s.routeWaypoints=[
    {id:'wp1',voyageId:'v1',name:'St. George’s departure',lat:32.381,lon:-64.676,order:10,kind:'departure',notes:'Demo coordinate only.'},
    {id:'wp2',voyageId:'v1',name:'Ocean waypoint 1',lat:33.15,lon:-55.0,order:20,kind:'route',notes:'Synthetic demo waypoint.'},
    {id:'wp3',voyageId:'v1',name:'Ocean waypoint 2',lat:35.2,lon:-42.0,order:30,kind:'route',notes:'Synthetic demo waypoint.'},
    {id:'wp4',voyageId:'v1',name:'Horta arrival',lat:38.535,lon:-28.626,order:40,kind:'arrival',notes:'Demo coordinate only.'}
  ];
  s.energyProfiles=[
    {id:'enp-underway',kind:'underway',name:'Underway',description:'Normal sailing passage.',sortOrder:10,loadOverrides:[],sourceOverrides:[]},
    {id:'enp-motoring',kind:'motoring',name:'Motoring',description:'Engine running; alternator available.',sortOrder:20,loadOverrides:[],sourceOverrides:[{sourceId:'src-alt',enabled:true,dailyKwh:3.2}]},
    {id:'enp-anchor',kind:'anchor',name:'At anchor',description:'Anchor loads and higher comfort allowance.',sortOrder:30,loadOverrides:[],sourceOverrides:[]},
    {id:'enp-overnight',kind:'overnight',name:'Overnight',description:'Reduced discretionary loads.',sortOrder:40,loadOverrides:[{loadId:'load-starlink',enabled:false}],sourceOverrides:[]},
    {id:'enp-conserve',kind:'conservation',name:'Conservation',description:'Shed comfort and optional loads.',sortOrder:50,loadOverrides:[{loadId:'load-starlink',enabled:false},{loadId:'load-freezer',hoursPerDay:10,dutyPct:35}],sourceOverrides:[]},
    {id:'enp-emergency',kind:'emergency',name:'Emergency',description:'Essential electrical loads only.',sortOrder:60,loadOverrides:[{loadId:'load-starlink',enabled:false},{loadId:'load-fridge',enabled:false},{loadId:'load-freezer',enabled:false}],sourceOverrides:[]}
  ];
  s.voyageScenarios=[
    {id:'vsc-normal',voyageId:'v1',name:'Normal',speedKt:6.2,motorHours:18,fuelRpm:2200,waterUseScalePct:100,provisionUseScalePct:100,energyProfileId:'enp-underway',notes:'Baseline offshore plan.'},
    {id:'vsc-motor',voyageId:'v1',name:'Motor-heavy',speedKt:6.4,motorHours:60,fuelRpm:2200,waterUseScalePct:100,provisionUseScalePct:100,energyProfileId:'enp-motoring',notes:'Extended motoring allowance.'},
    {id:'vsc-conserve',voyageId:'v1',name:'Conservation',speedKt:5.8,motorHours:12,fuelRpm:2000,waterUseScalePct:80,provisionUseScalePct:90,energyProfileId:'enp-conserve',notes:'Reduced water and discretionary power use.'}
  ];
  s.systems=[
    {id:'sys-prop',name:'Propulsion',status:'pass',parentSystemId:'',sortOrder:10,description:'Primary propulsion and drive systems.'}, {id:'sys-elec',name:'Electrical',status:'pass',parentSystemId:'',sortOrder:20,description:'Generation, storage, and distribution.'},
    {id:'sys-rig',name:'Rig',status:'watch',parentSystemId:'',sortOrder:30,description:'Standing/running rigging and sail systems.'}, {id:'sys-steer',name:'Steering',status:'pass',parentSystemId:'',sortOrder:40},
    {id:'sys-plumb',name:'Plumbing',status:'pass',parentSystemId:'',sortOrder:50}, {id:'sys-nav',name:'Navigation',status:'pass',parentSystemId:'',sortOrder:60},
    {id:'sys-comms',name:'Communications',status:'pass',parentSystemId:'',sortOrder:70}, {id:'sys-safe',name:'Safety',status:'watch',parentSystemId:'',sortOrder:80},
    {id:'sys-tender',name:'Tender',status:'pass',parentSystemId:'',sortOrder:90}
  ];
  s.equipment=[
    {id:'eq-engine',systemId:'sys-prop',name:'Main engine',manufacturer:'Yanmar',model:'4JH45',serial:'DEMO-4JH45',location:'Engine compartment',criticality:'high',status:'pass',hours:842,serviceInterval:250,notes:'Diesel auxiliary.'},
    {id:'eq-pump',systemId:'sys-prop',name:'Raw-water pump',manufacturer:'Yanmar',model:'OEM',location:'Main engine',criticality:'high',status:'pass',notes:'Impeller-driven seawater pump.'},
    {id:'eq-alt',systemId:'sys-elec',name:'House alternator',manufacturer:'Balmar',model:'MC-618 / 170A',location:'Main engine',criticality:'high',status:'watch',notes:'External regulator.'},
    {id:'eq-shroud-stbd',systemId:'sys-rig',name:'Starboard lower shroud',manufacturer:'Demo Rigging',model:'1×19 stainless wire',location:'Starboard lower',criticality:'high',status:'watch',notes:'Standing-rigging item used by the demo inspection/evidence relationship.'},
    {id:'eq-bank',systemId:'sys-elec',name:'House battery bank',manufacturer:'Demo Marine',model:'600 Ah LiFePO₄',location:'Aft settee',criticality:'high',status:'pass',notes:'12.8 V nominal.'},
    {id:'eq-watermaker',systemId:'sys-plumb',name:'Watermaker',manufacturer:'Spectra',model:'Ventura-style demo',location:'Port locker',criticality:'medium',status:'pass',notes:'Demo equipment record.'},
    {id:'eq-epirb',systemId:'sys-safe',name:'EPIRB',manufacturer:'ACR',model:'GlobalFix demo',location:'Companionway',criticality:'high',status:'watch',notes:'Battery service date tracked in documents.'}
  ];
  s.components=[
    {id:'cmp-belt',equipmentId:'eq-alt',name:'Alternator drive belt',partNumber:'DEMO-BELT',location:'Front of engine',condition:'fair',criticality:'high',status:'watch',notes:'Linked to spare belt and recurring inspection task.'},
    {id:'cmp-impeller',equipmentId:'eq-pump',name:'Raw-water impeller',partNumber:'129670-42530',location:'Raw-water pump',condition:'good',criticality:'high',status:'pass',notes:'Wear component; inspect by engine hours.'}
  ];
  s.maintenanceHistory=[
    {id:'mh1',maintenanceId:'m1',equipmentId:'eq-engine',completedAt:new Date(Date.now()-62*86400000).toISOString(),engineHours:650,cycles:null,performedBy:'Alex Morgan',notes:'Oil and filter changed; no abnormal debris observed.',partsConsumed:[{inventoryId:'inv-oilfilter',qty:1}]},
    {id:'mh-belt-1',maintenanceId:'m3',equipmentId:'eq-alt',componentId:'cmp-belt',completedAt:new Date(Date.now()-420*86400000).toISOString(),engineHours:205,cycles:null,performedBy:'Alex Morgan',notes:'Routine belt inspection and tension check.',partsConsumed:[]},
    {id:'mh-belt-2',maintenanceId:'m3',equipmentId:'eq-alt',componentId:'cmp-belt',completedAt:new Date(Date.now()-310*86400000).toISOString(),engineHours:342,cycles:null,performedBy:'Alex Morgan',notes:'Tension adjusted slightly.',partsConsumed:[]},
    {id:'mh-belt-3',maintenanceId:'m3',equipmentId:'eq-alt',componentId:'cmp-belt',completedAt:new Date(Date.now()-205*86400000).toISOString(),engineHours:486,cycles:null,performedBy:'Sam Rivera',notes:'No cracking observed; light dust.',partsConsumed:[]},
    {id:'mh-belt-4',maintenanceId:'m3',equipmentId:'eq-alt',componentId:'cmp-belt',completedAt:new Date(Date.now()-108*86400000).toISOString(),engineHours:615,cycles:null,performedBy:'Sam Rivera',notes:'Belt tension adjusted.',partsConsumed:[]},
    {id:'mh2',maintenanceId:'m3',equipmentId:'eq-alt',componentId:'cmp-belt',completedAt:new Date(Date.now()-44*86400000).toISOString(),engineHours:750,cycles:null,performedBy:'Alex Morgan',notes:'Belt tension adjusted; light dust noted.',partsConsumed:[]}
  ];
  s.inspections=[
    {id:'insp1',equipmentId:'eq-alt',name:'Alternator / belt visual inspection',at:new Date(Date.now()-3*86400000).toISOString(),result:'watch',condition:'fair',inspector:'Sam Rivera',notes:'Fine belt dust; no cord exposure. Recheck at next daylight maintenance opportunity.'},
    {id:'insp-rig',equipmentId:'eq-shroud-stbd',name:'Starboard lower shroud inspection',at:new Date(Date.now()-3*86400000).toISOString(),result:'watch',condition:'fair',inspector:'Sam Rivera',notes:'Synthetic demo rig inspection; service interval review remains open.'},
    {id:'insp2',equipmentId:'eq-engine',name:'Engine compartment pre-watch inspection',at:new Date(Date.now()-8*3600000).toISOString(),result:'pass',condition:'good',inspector:'Jordan Lee',notes:'No leaks or loose items observed.'}
  ];
  s.maintenance=[
    {id:'m1',equipmentId:'eq-engine',name:'Engine oil + filter',taskType:'engine-hours',intervalHours:250,nextDueHours:900,lastCompletedHours:650,status:'upcoming',requiredParts:['inv-oilfilter'],requiredTools:['Oil extractor','Filter wrench'],estimatedMinutes:60,notes:'Use manufacturer procedure.'},
    {id:'m2',equipmentId:'eq-pump',componentId:'cmp-impeller',name:'Inspect raw-water impeller',taskType:'engine-hours',intervalHours:100,nextDueHours:825,lastCompletedHours:725,status:'overdue',requiredParts:['inv-impeller'],requiredTools:['10 mm socket','Impeller puller'],estimatedMinutes:30,notes:'Inspect blades and pump cover.'},
    {id:'m3',equipmentId:'eq-alt',componentId:'cmp-belt',name:'Inspect alternator belt',taskType:'engine-hours',intervalHours:100,nextDueHours:850,lastCompletedHours:750,status:'due',requiredParts:['inv-belt'],requiredTools:['Belt tension gauge'],estimatedMinutes:20,notes:'Check dust, cracking, and tension.'},
    {id:'m4',equipmentId:'eq-epirb',name:'Verify EPIRB registration and battery date',taskType:'calendar',intervalDays:180,nextDueDate:days(7),status:'due',requiredParts:[],estimatedMinutes:10,notes:'Cross-check document record.'}
  ];
  s.measurements=[
    {id:'me0a',equipmentId:'eq-engine',name:'Coolant temperature',value:80,unit:'°C',min:78,max:88,at:new Date(Date.now()-5*86400000).toISOString(),source:'manual',confidence:'medium'},
    {id:'me0b',equipmentId:'eq-engine',name:'Coolant temperature',value:81,unit:'°C',min:78,max:88,at:new Date(Date.now()-2*86400000).toISOString(),source:'manual',confidence:'medium'},
    {id:'me0c',equipmentId:'eq-alt',name:'Alternator temperature',value:84,unit:'°C',min:0,max:100,at:new Date(Date.now()-5*86400000).toISOString(),source:'manual',confidence:'medium'},
    {id:'me0d',equipmentId:'eq-alt',name:'Alternator temperature',value:88,unit:'°C',min:0,max:100,at:new Date(Date.now()-2*86400000).toISOString(),source:'manual',confidence:'medium'},
    {id:'me1',equipmentId:'eq-engine',name:'Coolant temperature',value:82,unit:'°C',min:78,max:88,at:new Date().toISOString(),source:'manual',confidence:'medium'},
    {id:'me2',equipmentId:'eq-engine',name:'Oil pressure',value:52,unit:'psi',min:45,max:65,at:new Date().toISOString(),source:'manual'},
    {id:'me3',equipmentId:'eq-alt',name:'Alternator temperature',value:91,unit:'°C',min:0,max:100,at:new Date().toISOString(),source:'manual'},
    {id:'me4',equipmentId:'eq-bank',name:'State of charge',value:78,unit:'%',min:30,max:100,at:new Date().toISOString(),source:'manual'}
  ];
  s.resources=[
    {id:'r-fuel',kind:'fuel',name:'Diesel',unit:'gal',capacity:86,usable:80,current:61,reserve:19,burnPerHour:0.68,planningRpm:2200,rateBasis:'vessel',useRateSource:'entered',uncertaintyPct:8,fuelCurve:[{rpm:1800,speedKt:5.1,burnPerHour:0.44},{rpm:2000,speedKt:5.7,burnPerHour:0.55},{rpm:2200,speedKt:6.2,burnPerHour:0.68},{rpm:2400,speedKt:6.6,burnPerHour:0.86}],notes:'Historical cruise burn model; demo values only.'},
    {id:'r-water',kind:'water',name:'Fresh water',unit:'gal',capacity:112,usable:110,current:74,reserve:20,dailyUse:5.4,dailyProduction:3.0,rateBasis:'vessel',useRateSource:'historical',uncertaintyPct:10,notes:'Watermaker planned for favorable energy periods.'},
    {id:'r-propane',kind:'propane',name:'Propane',unit:'lb',capacity:40,usable:40,current:31,reserve:5,dailyUse:0.8,dailyProduction:0,rateBasis:'vessel',useRateSource:'entered'},
    {id:'r-food',kind:'provisions',name:'Provisions summary',unit:'day-equivalent',capacity:30,current:24,reserve:3,dailyUse:1,dailyProduction:0,rateBasis:'vessel',useRateSource:'entered'}
  ];
  s.tanks=[
    {id:'t1',resourceId:'r-fuel',name:'Diesel tank',capacity:86,usable:80,current:61,reserve:19,unit:'gal',source:'manual sounding',readingUnit:'%',lastReadingAt:new Date(Date.now()-8*3600000).toISOString(),confidence:'medium',calibration:[{reading:0,quantity:0},{reading:25,quantity:17},{reading:50,quantity:39},{reading:75,quantity:61},{reading:100,quantity:80}]},
    {id:'t2',resourceId:'r-water',name:'Port water tank',capacity:56,usable:55,current:38,reserve:10,unit:'gal',source:'tank gauge',readingUnit:'%',lastReadingAt:new Date(Date.now()-5*3600000).toISOString(),confidence:'medium',calibration:[{reading:0,quantity:0},{reading:25,quantity:11},{reading:50,quantity:25},{reading:75,quantity:40},{reading:100,quantity:55}]},
    {id:'t3',resourceId:'r-water',name:'Starboard water tank',capacity:56,usable:55,current:36,reserve:10,unit:'gal',source:'tank gauge',readingUnit:'%',lastReadingAt:new Date(Date.now()-5*3600000).toISOString(),confidence:'medium',calibration:[{reading:0,quantity:0},{reading:25,quantity:12},{reading:50,quantity:26},{reading:75,quantity:41},{reading:100,quantity:55}]}
  ];
  s.resourceTransactions=[
    {id:'rtx-w1',resourceId:'r-water',type:'consume',quantity:16.2,delta:-16.2,before:90.2,after:74,unit:'gal',at:new Date(Date.now()-3*86400000).toISOString(),durationDays:3,crewCount:3,context:'offshore',source:'Tank gauges + log cross-check',confidence:'medium',notes:'Whole-vessel offshore consumption.'},
    {id:'rtx-w2',resourceId:'r-water',type:'consume',quantity:10.7,delta:-10.7,before:100.9,after:90.2,unit:'gal',at:new Date(Date.now()-5*86400000).toISOString(),durationDays:2,crewCount:3,context:'offshore',source:'Manual estimate',confidence:'medium',notes:'Whole-vessel offshore consumption.'},
    {id:'rtx-w3',resourceId:'r-water',type:'consume',quantity:22.0,delta:-22.0,before:94,after:72,unit:'gal',at:new Date(Date.now()-64*86400000).toISOString(),durationDays:4,crewCount:3,context:'offshore',source:'Tank sounding + log',confidence:'medium',notes:'Historical passage water use.'},
    {id:'rtx-w4',resourceId:'r-water',type:'consume',quantity:27.5,delta:-27.5,before:101,after:73.5,unit:'gal',at:new Date(Date.now()-145*86400000).toISOString(),durationDays:5,crewCount:3,context:'offshore',source:'Tank sounding + log',confidence:'medium',notes:'Historical passage water use.'},
    {id:'rtx-w5',resourceId:'r-water',type:'consume',quantity:16.8,delta:-16.8,before:88,after:71.2,unit:'gal',at:new Date(Date.now()-250*86400000).toISOString(),durationDays:3,crewCount:3,context:'offshore',source:'Tank log',confidence:'low',notes:'Historical passage water use.'},
    {id:'rtx-f1',resourceId:'r-fuel',tankId:'t1',type:'consume',quantity:5.44,delta:-5.44,before:66.44,after:61,unit:'gal',at:new Date(Date.now()-4*86400000).toISOString(),durationHours:8,rpm:2200,distanceNm:49.6,context:'motoring',source:'Engine hours + tank cross-check',confidence:'medium',notes:'2200 RPM observation.'},
    {id:'rtx-f2',resourceId:'r-fuel',type:'consume',quantity:4.83,delta:-4.83,before:72,after:67.17,unit:'gal',at:new Date(Date.now()-72*86400000).toISOString(),durationHours:7,rpm:2200,distanceNm:43.0,context:'motoring',source:'Engine hours + fill log',confidence:'medium',notes:'2200 RPM observation.'},
    {id:'rtx-f3',resourceId:'r-fuel',type:'consume',quantity:4.62,delta:-4.62,before:78,after:73.38,unit:'gal',at:new Date(Date.now()-155*86400000).toISOString(),durationHours:7,rpm:2200,distanceNm:42.7,context:'motoring',source:'Engine log',confidence:'medium',notes:'2200 RPM observation.'},
    {id:'rtx-f4',resourceId:'r-fuel',type:'consume',quantity:5.75,delta:-5.75,before:76,after:70.25,unit:'gal',at:new Date(Date.now()-260*86400000).toISOString(),durationHours:8,rpm:2200,distanceNm:48.8,context:'motoring',source:'Engine log',confidence:'medium',notes:'2200 RPM observation.'},
    {id:'rtx-f5',resourceId:'r-fuel',type:'consume',quantity:4.48,delta:-4.48,before:75,after:70.52,unit:'gal',at:new Date(Date.now()-320*86400000).toISOString(),durationHours:8,rpm:2000,distanceNm:45.2,context:'motoring',source:'Engine log',confidence:'low',notes:'2000 RPM observation.'},
    {id:'rtx-f6',resourceId:'r-fuel',type:'consume',quantity:3.60,delta:-3.60,before:71,after:67.4,unit:'gal',at:new Date(Date.now()-390*86400000).toISOString(),durationHours:8,rpm:1800,distanceNm:40.5,context:'motoring',source:'Engine log',confidence:'low',notes:'1800 RPM observation.'},
    {id:'rtx-f7',resourceId:'r-fuel',type:'consume',quantity:6.92,delta:-6.92,before:79,after:72.08,unit:'gal',at:new Date(Date.now()-450*86400000).toISOString(),durationHours:8,rpm:2400,distanceNm:52.5,context:'motoring',source:'Engine log',confidence:'low',notes:'2400 RPM observation.'}
  ];
  s.provisions=[
    {id:'prov1',name:'Shelf-stable main meals',category:'Dry / canned',servingsRemaining:72,servingsPerPersonDay:1.5,storageLocationId:'loc-dry',expires:days(220),refrigerated:false,countsForEndurance:true,notes:'Practical serving count, not calorie tracking.'},
    {id:'prov2',name:'Breakfast / oats',category:'Dry goods',servingsRemaining:42,servingsPerPersonDay:1,storageLocationId:'loc-dry',expires:days(300),refrigerated:false,countsForEndurance:true,notes:''},
    {id:'prov3',name:'Fresh / refrigerated food',category:'Fresh',servingsRemaining:18,servingsPerPersonDay:1,storageLocationId:'loc-galley',expires:days(6),refrigerated:true,countsForEndurance:false,notes:'Use early in passage.'},
    {id:'prov4',name:'Emergency ration packs',category:'Emergency',servingsRemaining:27,servingsPerPersonDay:1,storageLocationId:'loc-abandon',expires:days(500),refrigerated:false,countsForEndurance:false,notes:'Held as emergency reserve.'}
  ];
  s.energy={capacityKwh:7.68,currentPct:78,reservePct:30,banks:[{id:'bank-house',name:'House bank',capacityKwh:7.68,currentPct:78,reservePct:30,chemistry:'LiFePO₄',notes:'600 Ah nominal 12.8 V demo bank.'}],
    loads:[
      {id:'load-autopilot',name:'Autopilot',watts:55,dutyPct:70,hoursPerDay:24,priority:'essential'},
      {id:'load-nav',name:'Navigation electronics',watts:38,dutyPct:100,hoursPerDay:24,priority:'essential'},
      {id:'load-fridge',name:'Refrigeration',watts:55,dutyPct:40,hoursPerDay:24,priority:'operational'},
      {id:'load-freezer',name:'Freezer',watts:48,dutyPct:35,hoursPerDay:24,priority:'comfort'},
      {id:'load-starlink',name:'Starlink',watts:55,dutyPct:100,hoursPerDay:2,priority:'optional'},
      {id:'load-watermaker',name:'Watermaker',watts:240,dutyPct:100,hoursPerDay:1.5,priority:'operational'},
      {id:'l6',name:'Lighting + misc',watts:20,dutyPct:100,hoursPerDay:6,priority:'optional'}
    ],
    sources:[
      {id:'src-solar',name:'Solar',dailyKwh:2.7},
      {id:'src-alt',name:'Alternator allocation',dailyKwh:0.45}
    ]
  };
  s.energyObservations=[
    {id:'eobs1',energyProfileId:'enp-underway',voyageId:'v1',at:new Date(Date.now()-2*86400000).toISOString(),predictedUseKwh:2.94,actualUseKwh:3.18,predictedGenerationKwh:2.70,actualGenerationKwh:2.31,source:'Daily electrical log',confidence:'medium',context:'underway',notes:'Synthetic demo observation.'},
    {id:'eobs2',energyProfileId:'enp-underway',voyageId:'v1',at:new Date(Date.now()-3*86400000).toISOString(),predictedUseKwh:2.94,actualUseKwh:3.08,predictedGenerationKwh:2.70,actualGenerationKwh:2.48,source:'Daily electrical log',confidence:'medium',context:'underway',notes:'Synthetic demo observation.'},
    {id:'eobs3',energyProfileId:'enp-underway',voyageId:'v1',at:new Date(Date.now()-4*86400000).toISOString(),predictedUseKwh:2.94,actualUseKwh:3.29,predictedGenerationKwh:2.70,actualGenerationKwh:2.18,source:'Daily electrical log',confidence:'medium',context:'underway',notes:'Synthetic demo observation.'},
    {id:'eobs4',energyProfileId:'enp-underway',voyageId:'v1',at:new Date(Date.now()-5*86400000).toISOString(),predictedUseKwh:2.94,actualUseKwh:3.11,predictedGenerationKwh:2.70,actualGenerationKwh:2.44,source:'Daily electrical log',confidence:'medium',context:'underway',notes:'Synthetic demo observation.'},
    {id:'eobs5',energyProfileId:'enp-anchor',voyageId:'',at:new Date(Date.now()-68*86400000).toISOString(),predictedUseKwh:2.18,actualUseKwh:2.05,predictedGenerationKwh:2.70,actualGenerationKwh:3.02,source:'Anchor electrical log',confidence:'medium',context:'anchor',notes:'Synthetic demo observation.'}
  ];
  s.storageLocations=[
    {id:'loc-engine',name:'Engine locker',parentLocationId:'',description:'Primary propulsion spares locker.'},
    {id:'loc-e2',name:'Bin E2',parentLocationId:'loc-engine',description:'Filters and service parts.'},
    {id:'loc-e4',name:'Bin E4',parentLocationId:'loc-engine',description:'Raw-water service parts.'},
    {id:'loc-b1',name:'Bin B1',parentLocationId:'loc-engine',description:'Belts.'},
    {id:'loc-galley',name:'Galley lockers',parentLocationId:'',description:'Daily provisions.'},
    {id:'loc-dry',name:'Dry stores',parentLocationId:'loc-galley',description:'Shelf-stable provisions.'},
    {id:'loc-abandon',name:'Abandon-ship locker',parentLocationId:'',description:'Emergency supplies.'},
    {id:'loc-medical',name:'Medical locker',parentLocationId:'',description:'Medical inventory; preparedness only.'}
  ];
  s.inventory=[
    {id:'inv-impeller',name:'Raw-water impeller',category:'Spare part',qty:2,unit:'ea',minimum:2,desired:3,location:'Engine locker / E4',storageLocationId:'loc-e4',partNumber:'129670-42530',manufacturer:'Yanmar',systemId:'sys-prop',equipmentId:'eq-pump',criticality:'high',expires:'',notes:'Critical propulsion spare.'},
    {id:'inv-oilfilter',name:'Engine oil filter',category:'Spare part',qty:2,unit:'ea',minimum:3,desired:4,location:'Engine locker / E2',storageLocationId:'loc-e2',partNumber:'DEMO-OIL',manufacturer:'Yanmar',systemId:'sys-prop',equipmentId:'eq-engine',criticality:'medium',expires:'',notes:'Below preferred minimum.'},
    {id:'inv-belt',name:'Alternator belt',category:'Spare part',qty:1,unit:'ea',minimum:1,desired:2,location:'Engine locker / B1',storageLocationId:'loc-b1',partNumber:'DEMO-BELT',manufacturer:'Gates',systemId:'sys-elec',equipmentId:'eq-alt',criticality:'high',expires:'',notes:'One aboard.'},
    {id:'inv-flare',name:'Offshore flare pack',category:'Emergency supply',qty:1,unit:'pack',minimum:1,desired:1,location:'Abandon-ship locker',storageLocationId:'loc-abandon',partNumber:'',manufacturer:'Demo',systemId:'sys-safe',criticality:'high',expires:days(45),notes:'Check destination requirements.'},
    {id:'inv-med',name:'Seasickness medication',category:'Medical',qty:18,unit:'tabs',minimum:12,desired:24,location:'Medical locker',storageLocationId:'loc-medical',partNumber:'',manufacturer:'',systemId:'sys-safe',criticality:'medium',expires:days(180),notes:'Inventory only; no diagnostic use.'}
  ];
  s.inventoryTransactions=[
    {id:'itx1',inventoryId:'inv-oilfilter',type:'restock',quantity:3,delta:3,before:0,after:3,unit:'ea',at:new Date(Date.now()-90*86400000).toISOString(),source:'Purchase',notes:'Pre-passage stocking.'},
    {id:'itx2',inventoryId:'inv-oilfilter',type:'maintenance-use',quantity:1,delta:-1,before:3,after:2,unit:'ea',at:new Date(Date.now()-62*86400000).toISOString(),source:'Maintenance: Engine oil + filter',maintenanceId:'m1',notes:''}
  ];
  s.procedures=[
    {id:'p1',category:'normal',name:'Engine start',purpose:'Start main engine using vessel-specific checks.',prerequisites:'Engine compartment accessible; controls available.',warnings:'Follow the engine manufacturer manual for model-specific limitations.',equipmentLocations:'Raw-water seacock: engine compartment; start controls: helm.',requiredTools:[],requiredParts:[],notes:'Demo procedure — replace with the actual vessel procedure.',steps:['Check engine compartment for leaks or loose items','Open raw-water seacock','Confirm battery selector / start bank','Place controls neutral','Start engine','Verify oil pressure','Verify cooling-water discharge','Record start time / engine hours']},
    {id:'p2',category:'normal',name:'Offshore departure',purpose:'Structured departure preparation.',prerequisites:'Voyage plan and crew roster established.',warnings:'AFLOAT readiness is decision support; review official weather, navigation and regulatory sources separately.',equipmentLocations:'Departure documents: nav station; abandon-ship equipment: companionway locker.',requiredTools:[],requiredParts:[],notes:'Demo checklist.',steps:['Review departure readiness findings','Confirm weather sources and timestamps','Verify fuel and water readings','Secure below decks','Confirm safety equipment accessible','Confirm watch plan','Log departure']},
    {id:'p3',category:'abnormal',name:'Alternator failure underway',purpose:'Vessel-specific load-shedding and fault-isolation framework.',prerequisites:'Confirm indication with an independent source where possible.',warnings:'Do not access rotating machinery unless conditions and isolation make it safe.',equipmentLocations:'Alternator: engine compartment; spare belt: engine locker / B1.',requiredTools:['Multimeter','Belt tools'],requiredParts:['inv-belt'],notes:'Demo abnormal procedure.',steps:['Confirm charging failure on independent indication','Reduce nonessential electrical loads','Inspect belt only if conditions allow safe access','Review remaining battery endurance','Select alternate charging source if available','Log finding and actions']},
    {id:'p4',category:'emergency',name:'Flooding response',purpose:'Locate and control water ingress using vessel-specific equipment locations.',prerequisites:'Raise alarm and assign roles.',warnings:'This vessel-specific checklist does not replace emergency training or professional rescue guidance.',equipmentLocations:'Tapered plugs: damage-control locker; emergency pump: aft cockpit locker.',requiredTools:['Flashlight'],requiredParts:[],notes:'Demo emergency procedure.',steps:['Raise alarm / assign roles','Start bilge pumps','Locate source','Close relevant seacocks if appropriate','Deploy collision mat / plugs as appropriate','Prepare emergency communications','Track ingress and pump-out trend']}
  ];
  s.procedureExecutions=[
    {id:'pex-demo-1',name:'Execution — Engine start',procedureId:'p1',voyageId:'v1',crewId:'c1',performedBy:'Alex Morgan',startedAt:new Date(Date.now()-6*86400000-45*60000).toISOString(),completedAt:new Date(Date.now()-6*86400000-38*60000).toISOString(),status:'completed',category:'normal',procedureName:'Engine start',procedureRevisionAt:ago(30),notes:'Demo pre-departure execution.',completionNotes:'Normal start; no anomaly observed.',steps:['Check engine compartment for leaks or loose items','Open raw-water seacock','Confirm battery selector / start bank','Place controls neutral','Start engine','Verify oil pressure','Verify cooling-water discharge','Record start time / engine hours'].map((text,index)=>({index,text,status:'done',at:new Date(Date.now()-6*86400000-(44-index)*60000).toISOString(),reason:'',notes:''}))}
  ];
  s.ports=[
    {id:'port-horta',name:'Horta',country:'Portugal — Azores',lat:38.533,lon:-28.633,vhf:'Marina/harbor channels: verify current official source',fuel:true,water:true,propane:'Verify local cylinder options',chandlery:true,repairs:'Marine services available; verify current vendors',arrival:'Demo notes only. Use current official charts and port guidance.',customs:'Verify current official clearance procedure.',immigration:'Verify current official clearance procedure.',harborMaster:'Verify current contact.',marina:'Demo marina notes only.',groceries:'Crew notes: available ashore; verify current details.',laundry:'Crew notes: available; verify.',medical:'Crew notes only; verify current services.',transport:'Crew notes only.',dinghyLanding:'Record after arrival.',internet:'Crew notes only.',contacts:'No current contacts stored.',source:'Demo vessel notes',verified:ago(120),confidence:'low',notes:'Personal cruising record placeholder.'},
    {id:'port-bermuda',name:'St. George’s',country:'Bermuda',lat:32.381,lon:-64.678,vhf:'Verify current official source',fuel:true,water:true,propane:'Verify',chandlery:true,repairs:'Verify',arrival:'Demo notes only.',customs:'Verify current official clearance procedure.',immigration:'Verify current official clearance procedure.',harborMaster:'Verify current contact.',marina:'Demo departure notes.',groceries:'Available in demo record.',laundry:'Verify.',medical:'Verify.',transport:'Verify.',dinghyLanding:'Verify.',internet:'Verify.',contacts:'',source:'Demo vessel notes',verified:ago(90),confidence:'low',notes:'Departure port.'}
  ];
  s.portVisits=[
    {id:'pv-bermuda-1',portId:'port-bermuda',visitType:'port',arrivedAt:new Date(Date.now()-12*86400000).toISOString(),departedAt:new Date(Date.now()-6*86400000).toISOString(),berth:'Demo berth / verify',servicesUsed:'Fuel, water, groceries',fuelAdded:18,waterAdded:42,notes:'Pre-passage stop. Demo record only.',lessons:'Clearance and provisioning notes should be re-verified next visit.'},
    {id:'pv-horta-old',portId:'port-horta',visitType:'port',arrivedAt:new Date(Date.now()-420*86400000).toISOString(),departedAt:new Date(Date.now()-416*86400000).toISOString(),berth:'Demo marina berth',servicesUsed:'Water, laundry, chandlery',fuelAdded:0,waterAdded:30,notes:'Historical fictional visit for UI demonstration.',lessons:'Keep arrival notes separate from long-lived port knowledge.'}
  ];
  s.anchorages=[
    {id:'a1',name:'Convict Bay demo anchorage',country:'Bermuda',lat:32.38,lon:-64.67,depth:6.5,bowHeight:1.2,tideRise:0.8,scope:6,clearance:95,bottom:'sand / verify locally',holding:'Good in recorded demo deployment',windProtection:'Moderate',approach:'Demo approach note only; verify current official charts.',hazards:'Shoreline and moorings; demo notes only.',nightApproach:'Not assessed.',shoreAccess:'Demo shore-access note.',dinghyLanding:'Demo only; verify.',notes:'Fictionalized demo record; not navigation guidance.',visits:1,legacyVisitCount:1}
  ];
  s.groundTackle=[
    {id:'gt-primary',name:'Primary anchor',anchorType:'Rocna-style demo',weightKg:25,rodeType:'all-chain',chainLengthM:80,ropeLengthM:0,totalRodeM:80,chainDiameterMm:10,ropeDiameterMm:null,primary:true,notes:'Fictional demo ground tackle; enter actual vessel equipment.'},
    {id:'gt-kedge',name:'Kedge / secondary',anchorType:'Fortress-style demo',weightKg:10,rodeType:'chain + rope',chainLengthM:15,ropeLengthM:70,totalRodeM:85,chainDiameterMm:8,ropeDiameterMm:16,primary:false,notes:'Demo secondary anchor.'}
  ];
  s.anchorDeployments=[
    {id:'ad-1',anchorageId:'a1',groundTackleId:'gt-primary',deployedAt:new Date(Date.now()-12*86400000).toISOString(),recoveredAt:new Date(Date.now()-11*86400000).toISOString(),depthM:6.5,tideRiseM:0.8,bowHeightM:1.2,scope:6,nearestHazardM:95,dropLat:32.3801,dropLon:-64.6702,maxWindKt:27,windDirection:'NE',bottom:'sand',holding:'good',dragged:false,resets:0,notes:'Recorded demo deployment; not guidance for future conditions.'}
  ];
  s.anchorPositions=[
    {id:'apos-1',anchorDeploymentId:'ad-1',at:new Date(Date.now()-12*86400000+2*3600000).toISOString(),lat:32.3805,lon:-64.6698,windKt:18,dragging:false,notes:'Position observation.'},
    {id:'apos-2',anchorDeploymentId:'ad-1',at:new Date(Date.now()-12*86400000+8*3600000).toISOString(),lat:32.3804,lon:-64.6699,windKt:27,dragging:false,notes:'No dragging observed in demo record.'}
  ];
  s.logs=[
    {id:'log1',at:new Date(Date.now()-3*3600000).toISOString(),category:'watch',author:'Sam Rivera',title:'Watch 0400–0800',text:'Wind increased from 14 to 18 kt ENE. Barometer slowly falling. No unresolved traffic concern at handoff.',lat:32.4,lon:-49.8},
    {id:'log2',at:new Date(Date.now()-10*3600000).toISOString(),category:'maintenance',author:'Alex Morgan',title:'Alternator belt inspection',text:'Light belt dust noted; no visible cord. Recheck at 850 engine hours.',equipmentId:'eq-alt'},
    {id:'log3',at:new Date(Date.now()-26*3600000).toISOString(),category:'resource',author:'Jordan Lee',title:'Water tank reading',text:'Fresh water estimated 74 gal from gauges and consumption cross-check.'}
  ];
  s.findings=[
    {id:'f1',title:'EPIRB battery service date near voyage window',description:'Battery/service date requires review against expected voyage duration.',severity:'high',confidence:'high',status:'open',source:'Ship’s papers',systemId:'sys-safe',voyageId:'v1',action:'Verify service/expiry date and resolve before next departure decision.',due:days(2)},
    {id:'f2',title:'Starboard lower shroud inspection overdue',description:'Inspection record is outside preferred interval.',severity:'medium',confidence:'medium',status:'open',source:'Rig inspection',systemId:'sys-rig',voyageId:'v1',action:'Inspect at next safe opportunity / port.',due:days(8)},
    {id:'f3',title:'Engine oil filters below preferred stock',description:'Two aboard; preferred minimum is three.',severity:'low',confidence:'high',status:'open',source:'Stores',systemId:'sys-prop',voyageId:'v1',action:'Reorder at next suitable port.',due:days(12)}
  ];
  s.assumptions=[
    {id:'as1',name:'Expected passage speed',value:6.2,unit:'kt',source:'Historical average',confidence:'medium',date:ago(6),notes:'Used for duration estimate.'},
    {id:'as2',name:'Engine cruise fuel burn',value:0.68,unit:'gal/hr',source:'Vessel log history',confidence:'medium',date:ago(15),notes:'Approximate burn near 2200 RPM.'},
    {id:'as3',name:'Offshore water use',value:5.4,unit:'gal/day',source:'Vessel log history',confidence:'medium',date:ago(30),notes:'Whole-vessel daily rate for current crew.'}
  ];
  s.documents=[
    {id:'d1',name:'Vessel registration',category:'registration',number:'DEMO-REG-001',issued:ago(240),expires:days(500),country:'United States',authority:'Demo registry',holder:'SV Meridian',requiredForDeparture:true,source:'Owner record',sourceDate:ago(30),verifiedAt:ago(30),confidence:'high',renewalNotes:'Demo record only.',notes:''},
    {id:'d2',name:'Insurance',category:'insurance',number:'DEMO-INS-001',issued:ago(200),expires:days(140),country:'',authority:'Demo insurer',holder:'SV Meridian',requiredForDeparture:true,source:'Owner record',sourceDate:ago(14),verifiedAt:ago(14),confidence:'high',renewalNotes:'Verify geographic coverage before each major passage.',notes:''},
    {id:'d3',name:'EPIRB battery/service',category:'safety',number:'DEMO-EPIRB',issued:ago(900),expires:days(20),country:'',authority:'Equipment label',holder:'SV Meridian',requiredForDeparture:true,source:'Equipment label',sourceDate:ago(2),verifiedAt:ago(2),confidence:'high',renewalNotes:'Service/replace according to manufacturer requirements.',notes:'Tracked as a ship paper because the service date affects readiness.'},
    {id:'d4',name:'Passport — Alex Morgan',category:'passport',number:'DEMO-PASS-001',issued:ago(1200),expires:days(5),country:'United States',authority:'Demo passport authority',holder:'Alex Morgan',crewId:'c1',requiredForDeparture:true,source:'Crew record',sourceDate:ago(10),verifiedAt:ago(10),confidence:'high',renewalNotes:'Synthetic demo expiry intentionally falls inside the active voyage window.',notes:'Not a real passport record.'},
    {id:'d5',name:'Radio station license',category:'radio',number:'DEMO-RADIO-1',issued:ago(400),expires:'',country:'United States',authority:'Demo licensing authority',holder:'SV Meridian',requiredForDeparture:false,source:'Owner record',sourceDate:ago(40),verifiedAt:ago(40),confidence:'medium',renewalNotes:'No expiry entered — verify current official requirements.',notes:''}
  ];
  s.weather=[
    {id:'w1',source:'Composite demo forecast',issuedAt:new Date(Date.now()-2*3600000).toISOString(),forecastAt:new Date(Date.now()+18*3600000).toISOString(),windKt:27,gustKt:33,direction:'ENE',waveM:2.1,wavePeriodS:8,pressureHpa:1010,confidence:'medium',notes:'Synthetic demo values; not a real forecast.'},
    {id:'w2',source:'Alternate model demo',issuedAt:new Date(Date.now()-3*3600000).toISOString(),forecastAt:new Date(Date.now()+18*3600000).toISOString(),windKt:23,gustKt:29,direction:'NE',waveM:1.9,wavePeriodS:9,pressureHpa:1012,confidence:'medium',notes:'Synthetic demo values.'}
  ];
  s.watchSchedules=[
    {id:'ws1',name:'0000–0400',startTime:'00:00',endTime:'04:00',order:10,enabled:true,watchkeeperId:'c1',watchkeeper:'Alex Morgan'},
    {id:'ws2',name:'0400–0800',startTime:'04:00',endTime:'08:00',order:20,enabled:true,watchkeeperId:'c2',watchkeeper:'Sam Rivera'},
    {id:'ws3',name:'0800–1200',startTime:'08:00',endTime:'12:00',order:30,enabled:true,watchkeeperId:'c3',watchkeeper:'Jordan Lee'},
    {id:'ws4',name:'1200–1600',startTime:'12:00',endTime:'16:00',order:40,enabled:true,watchkeeperId:'c1',watchkeeper:'Alex Morgan'},
    {id:'ws5',name:'1600–2000',startTime:'16:00',endTime:'20:00',order:50,enabled:true,watchkeeperId:'c2',watchkeeper:'Sam Rivera'},
    {id:'ws6',name:'2000–0000',startTime:'20:00',endTime:'00:00',order:60,enabled:true,watchkeeperId:'c3',watchkeeper:'Jordan Lee'}
  ];
  s.watches=[{id:'watch1',voyageId:'v1',watchkeeperId:'c2',watchkeeper:'Sam Rivera',scheduleId:'ws2',start:new Date(Date.now()-3*3600000).toISOString(),startedAt:new Date(Date.now()-3*3600000).toISOString(),end:new Date(Date.now()+3600000).toISOString(),status:'active',notes:'Wind trend increasing; monitor pressure.',handoff:''}];
  s.watchHandoffs=[{id:'wh1',watchId:'watch-prev',voyageId:'v1',fromWatchkeeper:'Alex Morgan',fromWatchkeeperId:'c1',toWatchkeeper:'Sam Rivera',toWatchkeeperId:'c2',createdAt:new Date(Date.now()-3*3600000-10*60000).toISOString(),summary:'Wind building slowly; no unresolved traffic conflicts.',conditions:'Wind 14→18 kt ENE; sea 1.8 m.',traffic:'One tanker passed astern with comfortable CPA.',equipment:'Port navigation light remains an open finding.',weather:'Pressure slowly falling.',upcoming:'Recheck weather model comparison at 0800.',plan:'Consider first reef if sustained wind exceeds vessel preference.',notes:'Synthetic demo handoff.',status:'acknowledged',acknowledgedAt:new Date(Date.now()-3*3600000).toISOString(),acknowledgedBy:'Sam Rivera'}];
  s.departureBaselines=[{id:'base1',voyageId:'v1',capturedAt:new Date(Date.now()-6*86400000).toISOString(),createdBy:'Alex Morgan',notes:'Synthetic demo departure snapshot.',disposition:'REVIEW',snapshot:{vessel:{name:'SV Meridian',status:'underway'},voyage:{id:'v1',name:'Bermuda → Horta'},readiness:{overall:'watch',disposition:'REVIEW',results:[{name:'Weather',status:'watch',detail:'One entered forecast exceeded a vessel preference.'},{name:'Documents',status:'watch',detail:'EPIRB service date required review.'}]}}}];
  s.settings={...s.settings,theme:'dark',mode:'cruising',limits:{maxWindKt:25,maxGustKt:32,maxWaveM:2.5},activeScenario:'underway'};

  s.evidence=[
    {id:'ev-rig-photo',title:'Starboard lower shroud inspection photo',kind:'photo',observedAt:new Date(Date.now()-3*86400000).toISOString(),capturedBy:'Sam Rivera',source:'Crew inspection',originalFilename:'demo-shroud-inspection.jpg',mimeType:'image/jpeg',sizeBytes:null,dataUrl:'',notes:'Synthetic demo evidence metadata; no image bytes embedded.'},
    {id:'ev-impeller-receipt',title:'Raw-water impeller purchase record',kind:'receipt',observedAt:new Date(Date.now()-65*86400000).toISOString(),capturedBy:'Alex Morgan',source:'Vessel records',originalFilename:'demo-impeller-receipt.pdf',mimeType:'application/pdf',sizeBytes:null,dataUrl:'',notes:'Synthetic demo document metadata.'},
    {id:'ev-weather-brief',title:'Departure weather briefing snapshot',kind:'weather',observedAt:new Date(Date.now()-6*86400000).toISOString(),capturedBy:'Alex Morgan',source:'Synthetic demo forecast',originalFilename:'',mimeType:'',sizeBytes:null,dataUrl:'',notes:'Demo weather evidence linked to the active voyage.'}
  ];
  s.timelineEvents=[
    {id:'tle-refit',at:new Date(Date.now()-120*86400000).toISOString(),kind:'milestone',title:'Spring refit complete',detail:'Completed battery-bank commissioning and standing-rigging review.',icon:'◆',systemId:'sys-elec',voyageId:'',severity:'info'}
  ];
  s.relationships.push(
    {id:'rel-ev1',from:{collection:'evidence',id:'ev-rig-photo'},to:{collection:'inspections',id:'insp-rig'},label:'Supports inspection',createdAt:new Date().toISOString()},
    {id:'rel-ev2',from:{collection:'evidence',id:'ev-rig-photo'},to:{collection:'findings',id:'f2'},label:'Supports finding',createdAt:new Date().toISOString()},
    {id:'rel-ev3',from:{collection:'evidence',id:'ev-impeller-receipt'},to:{collection:'inventory',id:'inv-impeller'},label:'Purchase evidence',createdAt:new Date().toISOString()},
    {id:'rel-ev4',from:{collection:'evidence',id:'ev-weather-brief'},to:{collection:'voyages',id:'v1'},label:'Departure evidence',createdAt:new Date().toISOString()}
  );
  return s;
}


/* ===== app.js ===== */
const NAV=[
  ['bridge','◉','Bridge'],['voyage','◈','Voyage'],['anchor','⚓','Anchor'],['vessel','▣','Vessel'],['resources','◫','Resources'],
  ['stores','▤','Stores'],['procedures','✓','Procedures'],['ports','⌖','Ports'],['logbook','▱','Logbook'],['history','◷','History'],['intelligence','∿','Intelligence'],['findings','!','Findings'],['reports','↧','Reports'],['settings','⚙','Settings']
];
let state=null, page='bridge', saveTimer=null, saving=false, shellBound=false;
const $=s=>document.querySelector(s);
const content=()=>$('#content');

async function init(){
  try{ state=await loadState(); }catch(err){ console.error(err); renderFatal('AFLOAT could not open its local database.',err); registerSW(); return; }
  if(!state){ registerSW(); renderFirstLaunch(); return; }
  const priorSchema=Number(state.schemaVersion)||1; normalizeState();
  if(priorSchema!==CURRENT_SCHEMA){try{await saveState(state);toast(`Vessel data migrated from schema v${priorSchema} to v${CURRENT_SCHEMA}.`);}catch(err){console.error('Migration save failed',err);}}
  applySettings(); renderShell(); registerSW();
}

function normalizeState(){
  state=migrateState(state);
  const base=blankState(state?.vessel?.name||'Untitled Vessel');
  state={...base,...state,appVersion:APP_VERSION,schemaVersion:CURRENT_SCHEMA,settings:{...base.settings,...state.settings,limits:{...base.settings.limits,...state.settings?.limits}},energy:{...base.energy,...state.energy,banks:Array.isArray(state.energy?.banks)?state.energy.banks:[],loads:Array.isArray(state.energy?.loads)?state.energy.loads:[],sources:Array.isArray(state.energy?.sources)?state.energy.sources:[]}};
  for(const key of Object.keys(COLLECTION_META)) if(!Array.isArray(state[key])) state[key]=[];
  if(!Array.isArray(state.relationships)) state.relationships=[];
}
function registerSW(){ if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Service worker registration failed',err)); }
function renderFatal(title,err){document.body.innerHTML=`<div class="first-launch"><div class="launch-panel"><div class="launch-logo">AFLOAT</div><div class="callout fail" style="margin-top:18px"><strong>${esc(title)}</strong><br>${esc(err?.message||'Unknown startup error')}</div><div class="launch-note">Your browser/site data has not been intentionally cleared. Try reloading first. If the problem continues, preserve any existing AFLOAT backup before clearing site data.</div></div></div><div id="toastRoot" class="toast-root"></div>`;}
function renderFirstLaunch(){
  document.body.innerHTML=`<div class="first-launch"><div class="launch-panel"><div class="launch-logo">AFLOAT</div><div class="launch-sub">Vessel Operations, Passage Planning & Maintenance Workbench</div><div class="launch-actions"><button id="createVessel">Create Vessel</button><button id="loadDemo">Load Demo Vessel</button><button id="importFirst">Import Backup</button></div><div class="launch-note">Local-first • offline-capable • no account • no telemetry. AFLOAT is decision support and recordkeeping, not a replacement for official charts, certified navigation equipment, current weather guidance, or skipper judgment.</div><input id="firstFile" type="file" accept="application/json,.json" hidden></div></div><div id="inspectorRoot"></div><div id="modalRoot"></div><div id="toastRoot" class="toast-root" aria-live="polite"></div>`;
  $('#createVessel').onclick=()=>createVesselModal(true); $('#loadDemo').onclick=async()=>{state=demoState();normalizeState();await saveState(state);location.reload();};
  $('#importFirst').onclick=()=>$('#firstFile').click(); $('#firstFile').onchange=e=>importFile(e.target.files[0],true);
}
function applySettings(){
  document.body.dataset.theme=state.settings.theme||'dark'; document.body.dataset.mode=state.settings.mode||'cruising';
  document.body.classList.toggle('sidebar-collapsed',Boolean(state.settings.sidebarCollapsed));
  document.querySelectorAll('[data-mode-set]').forEach(b=>b.classList.toggle('active',b.dataset.modeSet===state.settings.mode));
  const toggle=$('#sidebarToggle'); if(toggle) toggle.setAttribute('aria-expanded',String(!state.settings.sidebarCollapsed));
}
function renderShell(){ renderNav(); bindShell(); updateConnectivity(); renderPage(); }
function renderNav(){
  $('#nav').innerHTML=NAV.map(([key,icon,label])=>`<button data-page="${key}" class="${page===key?'active':''}" ${page===key?'aria-current="page"':''} title="${esc(label)}"><span class="nav-icon">${icon}</span><span class="nav-label">${label}</span></button>`).join('');
  $('#vesselMini').innerHTML=`<strong>${esc(state.vessel.name||'Untitled Vessel')}</strong><span>${esc(state.vessel.status?.replace('-',' ')||'status unknown')} · ${esc(state.vessel.homePort||'No home port')}</span>`;
  $('#versionLabel').textContent='v'+APP_VERSION;
}
function bindShell(){
  if(shellBound) return; shellBound=true;
  $('#nav').onclick=e=>{const b=e.target.closest('[data-page]');if(!b)return;page=b.dataset.page;renderNav();renderPage();$('#sidebar').classList.remove('open');$('#content')?.focus({preventScroll:true});};
  $('#sidebarToggle').onclick=toggleSidebar; $('#sidebarScrim').onclick=()=>$('#sidebar').classList.remove('open'); $('#quickLogBtn').onclick=quickLogModal; $('#globalSearchBtn').onclick=searchModal;
  document.querySelectorAll('[data-mode-set]').forEach(b=>b.onclick=()=>{state.settings.mode=b.dataset.modeSet;applySettings();scheduleSave();renderPage();});
  $('#fileImport').onchange=e=>{importFile(e.target.files[0],false);e.target.value='';};
  $('#fileVerify').onchange=e=>{verifyBackupFile(e.target.files[0]);e.target.value='';};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();closeInspector();$('#sidebar')?.classList.remove('open');} if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();searchModal();}});
  window.addEventListener('online',updateConnectivity);window.addEventListener('offline',updateConnectivity);
}
function toggleSidebar(){if(matchMedia('(max-width: 780px)').matches){const sb=$('#sidebar');sb.classList.toggle('open');$('#sidebarToggle')?.setAttribute('aria-expanded',String(sb.classList.contains('open')));}else{state.settings.sidebarCollapsed=!state.settings.sidebarCollapsed;applySettings();scheduleSave();}}
function updateConnectivity(){const el=$('#connectionStatus');if(!el)return;const online=navigator.onLine;el.classList.toggle('offline',!online);el.querySelector('.connection-text').textContent=online?'ONLINE · LOCAL DATA':'OFFLINE · LOCAL DATA';el.title=online?'Network available; AFLOAT continues using local vessel data.':'No network detected; AFLOAT remains available from local storage/cache.';}
function setSaveStatus(kind,label){const el=$('#saveStatus');if(!el)return;el.classList.remove('saving','error');if(kind)el.classList.add(kind);el.querySelector('span:last-child').textContent=label;}
function scheduleSave(){ state.updatedAt=new Date().toISOString(); setSaveStatus('saving','SAVING'); clearTimeout(saveTimer); saveTimer=setTimeout(async()=>{if(saving)return;saving=true;try{await saveState(state);setSaveStatus('','SAVED');}catch(err){console.error(err);setSaveStatus('error','ERROR');toast('Local save failed. Export a backup if possible.');}finally{saving=false;}},220); }
function mutate(fn,msg){fn(state);state.appVersion=APP_VERSION;state.schemaVersion=CURRENT_SCHEMA;scheduleSave();renderNav();renderPage();if(msg)toast(msg);}
function pageMeta(title,eyebrow='CURRENT VESSEL'){ $('#pageTitle').textContent=title;$('#pageEyebrow').textContent=eyebrow;document.title=`${title} · AFLOAT`; }
function renderPage(){
  const renderers={bridge:renderBridge,voyage:renderVoyage,anchor:renderAnchor,vessel:renderVessel,resources:renderResources,stores:renderStores,procedures:renderProcedures,ports:renderPorts,logbook:renderLogbook,history:renderHistory,intelligence:renderIntelligence,findings:renderFindings,reports:renderReports,settings:renderSettings};
  (renderers[page]||renderBridge)(); bindContent();
}
function bindContent(){ content().onclick=e=>{const el=e.target.closest('[data-action]');if(!el)return;handleAction(el.dataset.action,el.dataset.id,el.dataset.kind);}; if(page==='vessel')bindVesselInteractions(); if(page==='voyage'){const f=$('#gpxImport');if(f)f.onchange=e=>importGpxFile(e.target.files?.[0]);} if(page==='history')bindHistoryFilters(); }
function activeVoyage(){const voyages=visible(state.voyages);return voyages.find(v=>v.status==='active')||voyages[0]||null;}
function sysName(idv){return state.systems.find(x=>x.id===idv)?.name||'—';} function eqName(idv){return state.equipment.find(x=>x.id===idv)?.name||'—';}
function statusForResource(r){const days=endurance(r.current,r.reserve,r.dailyUse,r.dailyProduction);if(days===null)return'unknown';if(days<3)return'fail';if(days<7)return'watch';return'pass';}
function remainingVoyage(v){if(!v)return null;return Math.max(0,(plannedVoyageDistance(v)||0)-(+v.progressNm||0));}

function voyageWaypoints(v=activeVoyage()){return v?visible(state.routeWaypoints).filter(w=>w.voyageId===v.id).sort((a,b)=>(a.order??999)-(b.order??999)):[];}
function plannedVoyageDistance(v=activeVoyage()){if(!v)return null;const rd=routeDistance(voyageWaypoints(v));return v.distanceSource==='route'&&rd!==null?rd:(Number.isFinite(Number(v.distanceNm))?Number(v.distanceNm):rd);}
function energyProfileById(pid){return visible(state.energyProfiles).find(p=>p.id===pid)||visible(state.energyProfiles)[0]||null;}
function activeEnergyProfile(){return energyProfileById(state.settings.activeEnergyProfileId);}
function scenarioAnalysis(sc,v=activeVoyage()){if(!v||!sc)return null;const fuel=visible(state.resources).find(r=>r.kind==='fuel'),water=visible(state.resources).find(r=>r.kind==='water'),crew=Math.max(1,visible(state.crew).length||1),hist=water?historicalResourceRate(state,water.id):{rate:null},waterUse=water?effectiveDailyUse(water,crew,hist.rate):null,prov=provisionEndurance(visible(state.provisions),crew),rpm=sc.fuelRpm??fuel?.planningRpm,pt=fuel?fuelCurvePoint(fuel.fuelCurve,rpm):{},profile=energyProfileById(sc.energyProfileId),ep=energyProfileProjection(state.energy,profile);return analyzeVoyageScenario({distanceNm:plannedVoyageDistance(v),speedKt:sc.speedKt||v.speedKt,motorHours:sc.motorHours,fuelQuantity:fuel?resourceQuantity(state,fuel.id):null,fuelReserve:fuel?.reserve,fuelBurnPerHour:pt.burnPerHour??fuel?.burnPerHour,waterQuantity:water?resourceQuantity(state,water.id):null,waterReserve:water?.reserve,waterDailyUse:waterUse===null?null:waterUse*(Number(sc.waterUseScalePct??100)/100),waterDailyProduction:water?.dailyProduction,provisionDays:prov.days,provisionUseScalePct:sc.provisionUseScalePct,energyProjection:ep});}

function visible(arr=[]){return state.settings.showArchived?arr:activeRecords(arr);}
function compName(idv){return state.components.find(x=>x.id===idv)?.name||'—';}
function invName(idv){return state.inventory.find(x=>x.id===idv)?.name||idv||'—';}
function recordCollectionLabel(kind){return COLLECTION_META[kind]?.label||kind;}
function resolveRef(field,value){
  const map={systemId:['systems',sysName],parentSystemId:['systems',sysName],equipmentId:['equipment',eqName],componentId:['components',compName],voyageId:['voyages',x=>state.voyages.find(v=>v.id===x)?.name||'—'],resourceId:['resources',x=>state.resources.find(v=>v.id===x)?.name||'—'],procedureId:['procedures',x=>state.procedures.find(v=>v.id===x)?.name||'—'],tankId:['tanks',x=>state.tanks.find(v=>v.id===x)?.name||'—'],inventoryId:['inventory',invName],storageLocationId:['storageLocations',x=>storagePath(state,x)||'—'],parentLocationId:['storageLocations',x=>storagePath(state,x)||'—'],fromStorageLocationId:['storageLocations',x=>storagePath(state,x)||'—'],toStorageLocationId:['storageLocations',x=>storagePath(state,x)||'—'],resourceId:['resources',x=>state.resources.find(v=>v.id===x)?.name||'—'],watchkeeperId:['crew',x=>state.crew.find(v=>v.id===x)?.name||'—'],fromWatchkeeperId:['crew',x=>state.crew.find(v=>v.id===x)?.name||'—'],toWatchkeeperId:['crew',x=>state.crew.find(v=>v.id===x)?.name||'—'],watchId:['watches',x=>state.watches.find(v=>v.id===x)?.name||v?.watchkeeper||'—'],handoffId:['watchHandoffs',x=>state.watchHandoffs.find(v=>v.id===x)?.name||'—'],baselineId:['departureBaselines',x=>state.departureBaselines.find(v=>v.id===x)?.name||'—'],evidenceId:['evidence',x=>state.evidence.find(v=>v.id===x)?.title||v?.name||'—'],timelineEventId:['timelineEvents',x=>state.timelineEvents.find(v=>v.id===x)?.title||'—']};
  return map[field]?map[field][1](value):value;
}
function displayValue(key,value){
  if(value==null||value==='')return '—';
  if(['createdAt','updatedAt','completedAt','capturedAt','startedAt','endedAt','acknowledgedAt','positionUpdatedAt','lastObservationAt','departedAt','arrivedAt','at','issuedAt','forecastAt'].includes(key)){try{return new Date(value).toLocaleString();}catch{return String(value)}}
  if(Array.isArray(value)) return value.length?value.map(v=>typeof v==='object'?JSON.stringify(v):invName(v)).join(', '):'—';
  if(typeof value==='object') return JSON.stringify(value);
  if(key.endsWith('Id')) return resolveRef(key,value);
  return String(value);
}
function closeInspector(){const root=$('#inspectorRoot');if(root)root.innerHTML='';}
function openInspector(collection,rid){
  const rec=getRecord(state,collection,rid);if(!rec)return;
  const root=$('#inspectorRoot'), related=relatedRecords(state,collection,rid), immutable=['departureBaselines','watchHandoffs','maintenanceHistory','procedureExecutions'].includes(collection);
  const omit=new Set(['id','createdAt','updatedAt','archived']);
  const details=Object.entries(rec).filter(([k,v])=>!omit.has(k)&&typeof v!=='function'&&!(Array.isArray(v)&&v.length>12)).map(([k,v])=>`<div class="detail-key">${esc(k.replace(/([A-Z])/g,' $1'))}</div><div class="detail-value">${esc(displayValue(k,v))}</div>`).join('');
  root.innerHTML=`<div class="inspector-backdrop" data-action="close-inspector"></div><aside class="inspector" aria-label="Record inspector"><div class="inspector-head"><div><div class="inspector-kind">${esc(recordCollectionLabel(collection))}</div><h2>${esc(recordLabel(rec))}</h2><div class="record-id">${esc(rec.id)}</div></div><button class="icon-btn" data-action="close-inspector" aria-label="Close inspector">×</button></div><div class="inspector-body"><div class="section-title"><div><h2>Record</h2><p>Stable ID and shared vessel data.</p></div>${rec.archived?statusBadge('archived'):''}</div><div class="detail-grid">${details||'<div class="detail-key">Record</div><div class="detail-value">No additional fields.</div>'}</div><div class="section-title"><div><h2>Relationships</h2><p>Direct references, evidence, and explicit Related To links.</p></div><div class="action-row">${collection!=='evidence'?`<button class="ghost-btn" data-action="add-evidence-to-record" data-kind="${esc(collection)}" data-id="${esc(rid)}">+ Evidence</button>`:''}${immutable?'':`<button class="ghost-btn" data-action="add-relationship" data-kind="${esc(collection)}" data-id="${esc(rid)}">+ Link</button>`}</div></div><div class="relation-list">${related.length?related.map(r=>`<div class="relation-chip"><div><strong>${esc(r.type)} · ${esc(recordLabel(r.record))}</strong><br><span>${esc(r.field)}</span></div><button class="ghost-btn" data-action="inspect-record" data-kind="${esc(r.collection)}" data-id="${esc(r.id)}">Open</button></div>`).join(''):empty('No linked records','Relationships will appear here as modules become connected.')}</div><div class="section-title"><div><h2>Record history</h2></div></div><div class="callout"><strong>Created:</strong> ${esc(rec.createdAt?dateTime(rec.createdAt):'legacy / unknown')}<br><strong>Updated:</strong> ${esc(rec.updatedAt?dateTime(rec.updatedAt):'legacy / unknown')}<br><strong>Schema:</strong> AFLOAT data model v${CURRENT_SCHEMA}</div></div><div class="inspector-foot">${immutable?`<span class="muted">Historical snapshot — preserved as recorded.</span><button class="primary-btn" data-action="close-inspector">Close</button>`:`<button class="primary-btn" data-action="edit-inspected" data-kind="${esc(collection)}" data-id="${esc(rid)}">Edit</button><button class="ghost-btn" data-action="duplicate-record" data-kind="${esc(collection)}" data-id="${esc(rid)}">Duplicate</button><button class="ghost-btn" data-action="archive-record" data-kind="${esc(collection)}" data-id="${esc(rid)}">${rec.archived?'Restore':'Archive'}</button><button class="danger-btn" data-action="delete-record" data-kind="${esc(collection)}" data-id="${esc(rid)}">Delete</button>`}</div></aside>`;
  root.onclick=e=>{const el=e.target.closest('[data-action]');if(!el)return;handleAction(el.dataset.action,el.dataset.id,el.dataset.kind);};
}
function editRecord(collection,rid){
  const map={systems:systemModal,equipment:equipmentModal,components:componentModal,maintenance:maintenanceModal,inspections:inspectionModal,measurements:measurementModal,resources:resourceModal,tanks:tankModal,provisions:provisionModal,energyObservations:energyObservationModal,inventory:inventoryModal,storageLocations:storageLocationModal,procedures:procedureModal,ports:portModal,portVisits:portVisitModal,anchorages:anchorModal,groundTackle:groundTackleModal,anchorDeployments:anchorDeploymentModal,anchorPositions:anchorPositionModal,logs:logModal,findings:findingModal,documents:documentModal,weather:weatherModal,assumptions:assumptionModal,routeWaypoints:waypointModal,voyageScenarios:voyageScenarioModal,energyProfiles:energyProfileModal,watchSchedules:watchScheduleModal,evidence:evidenceModal,timelineEvents:timelineEventModal};
  closeInspector(); (map[collection]||(()=>toast(`Editing ${recordCollectionLabel(collection)} is not yet exposed from the inspector.`)))(rid);
}
function duplicateAny(collection,rid){mutate(s=>duplicateRecord(s,collection,rid),`${recordCollectionLabel(collection)} duplicated`);closeInspector();}
function archiveAny(collection,rid){const rec=getRecord(state,collection,rid);if(!rec)return;mutate(s=>archiveRecord(s,collection,rid,!rec.archived),rec.archived?'Record restored':'Record archived');closeInspector();}
function deleteAny(collection,rid){
  const rec=getRecord(state,collection,rid);if(!rec)return;const check=deleteRecord(structuredClone(state),collection,rid);
  const refs=check.refs||[];
  modal({title:`Delete ${recordCollectionLabel(collection)}?`,body:`<div class="callout fail"><strong>Permanent local deletion.</strong> Archive is preferred when preserving vessel history matters.</div>${refs.length?`<div class="callout warn" style="margin-top:10px"><strong>${refs.length} linked record(s) reference this item.</strong> Forced deletion can leave historical records without their original parent.</div>`:''}<p class="muted" style="margin-top:12px">${esc(recordLabel(rec))}</p>`,submitLabel:refs.length?'Force delete':'Delete',onSubmit:()=>{mutate(s=>deleteRecord(s,collection,rid,{force:true}),`${recordCollectionLabel(collection)} deleted`);closeModal();closeInspector();}});
}
function relationshipModal(fromCollection,fromId){
  const choices=['systems','equipment','components','maintenance','inspections','measurements','resources','tanks','provisions','energyObservations','inventory','storageLocations','procedures','findings','documents','voyages','ports','portVisits','anchorages','groundTackle','anchorDeployments','evidence','timelineEvents'];
  const body=`<div class="form-grid"><div class="field"><label>Record type</label><select id="relCollection">${choices.filter(c=>c!==fromCollection).map(c=>`<option value="${c}">${esc(recordCollectionLabel(c))}</option>`).join('')}</select></div><div class="field"><label>Record</label><select id="relRecord"></select></div><div class="field full"><label>Relationship label</label><input name="label" value="Related"></div></div>`;
  modal({title:'Related To',body,onSubmit:fd=>{const toCollection=$('#relCollection').value,toId=$('#relRecord').value;if(!toId){toast('Choose a record to link.');return;}mutate(s=>{if(!s.relationships)s.relationships=[];const exists=s.relationships.some(r=>r.from?.collection===fromCollection&&r.from?.id===fromId&&r.to?.collection===toCollection&&r.to?.id===toId&&r.label===fd.get('label'));if(!exists)s.relationships.push({id:id('rel'),from:{collection:fromCollection,id:fromId},to:{collection:toCollection,id:toId},label:fd.get('label')||'Related',createdAt:new Date().toISOString()});},'Relationship added');closeModal();openInspector(fromCollection,fromId);}});
  const col=$('#relCollection'),rec=$('#relRecord');const refresh=()=>{rec.innerHTML=visible(state[col.value]||[]).map(r=>`<option value="${esc(r.id)}">${esc(recordLabel(r))}</option>`).join('');};col.onchange=refresh;refresh();
}
function taskStatus(task){const cycles=state.equipment.find(e=>e.id===task.equipmentId)?.cycles;return maintenanceStatus(task,state.vessel.engineHours||0,new Date(),cycles);}
function maintenanceDueLabel(t){if(t.nextDueHours!=null)return `due ${t.nextDueHours} hr`;if(t.nextDueCycles!=null)return `due ${t.nextDueCycles} cycles`;if(t.nextDueDate)return `due ${dateOnly(t.nextDueDate)}`;return t.completed?'completed':'no next due';}
function partAvailability(task){
  return (task.requiredParts||[]).map(raw=>{const [pid,qraw]=String(raw).split(':');const need=Math.max(1,Number(qraw)||1);const item=state.inventory.find(i=>i.id===pid);return {id:pid,name:item?.name||pid,qty:item?.qty??0,need,ok:Boolean(item&&(+item.qty||0)>=need)};});
}
function latestMeasurementGroups(){
  const groups=new Map();for(const m of visible(state.measurements)){const key=`${m.equipmentId}|${m.name}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);}return [...groups.values()].map(series=>series.sort((a,b)=>new Date(a.at)-new Date(b.at)));
}

function activeWatch(){return visible(state.watches).find(w=>w.status==='active')||null;}
function latestHandoff(){return visible(state.watchHandoffs).slice().sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0))[0]||null;}
function latestWeather(){return visible(state.weather).slice().sort((a,b)=>new Date(b.issuedAt||b.forecastAt||0)-new Date(a.issuedAt||a.forecastAt||0))[0]||null;}
function freshLabel(timestamp,maxMs){const f=freshness(timestamp,maxMs);return {...f,css:f.state==='fresh'?'pass':f.state==='stale'?'watch':'unknown'};}
function readinessCard(r){const deps=(r.dependencies||[]).filter(Boolean);return `<div class="readiness-item ${r.status}"><div class="name">${esc(r.name)}</div><div class="state">${String(r.status||'unknown').toUpperCase()}</div><div class="list-meta">${esc(r.detail)}</div>${deps.length?`<details class="readiness-deps"><summary>Dependencies</summary>${deps.slice(0,8).map(d=>`<div>${esc(d)}</div>`).join('')}</details>`:''}</div>`;}
function watchScheduleLabel(s){return s?`${s.startTime||'—'}–${s.endTime||'—'} · ${s.watchkeeper||'Unassigned'}`:'No watch schedule';}

function selectedAnchorage(){const rows=visible(state.anchorages);return rows.find(a=>a.id===state.settings?.activeAnchorageId)||rows[0]||null;}
function tackleById(rid){return visible(state.groundTackle).find(x=>x.id===rid)||null;}
function deploymentById(rid){return visible(state.anchorDeployments).find(x=>x.id===rid)||null;}
function deploymentPlan(d){if(!d)return null;const tackle=tackleById(d.groundTackleId);return anchorPlan({depth:d.depthM,bowHeight:d.bowHeightM,tideRise:d.tideRiseM,scope:d.scope,availableClearance:d.nearestHazardM,availableRode:tackle?.totalRodeM,vesselLengthM:(Number(state.vessel.lengthFt)||0)*0.3048});}
function portVisitCount(portId){return portVisitsFor(state,{portId}).length;}

function renderBridge(){
  pageMeta('Bridge','WHAT MATTERS RIGHT NOW');
  const context=state.vessel.status||'in-port',v=activeVoyage(),rr=readiness(state),fuel=visible(state.resources).find(r=>r.kind==='fuel'),water=visible(state.resources).find(r=>r.kind==='water'),ep=energyProfileProjection(state.energy,activeEnergyProfile()),wx=latestWeather(),watch=activeWatch(),handoff=latestHandoff(),next=nextScheduledWatch(state),attention=getAttention();
  const fuelR=fuel?fuelRange({current:resourceQuantity(state,fuel.id),reserve:fuel.reserve,burnPerHour:fuelCurvePoint(fuel.fuelCurve,fuel.planningRpm).burnPerHour||fuel.burnPerHour,speedKt:fuelCurvePoint(fuel.fuelCurve,fuel.planningRpm).speedKt||v?.speedKt||state.vessel.cruiseSpeedKt}):{range:null};
  const fuelQty=fuel?resourceQuantity(state,fuel.id):null,waterQty=water?resourceQuantity(state,water.id):null,histWater=water?historicalResourceRate(state,water.id):{rate:null},waterUse=water?effectiveDailyUse(water,state.crew.length,histWater.rate):null,waterD=water?endurance(waterQty,water.reserve,waterUse,water.dailyProduction):null;
  const pf=freshLabel(v?.positionUpdatedAt,Number(state.settings?.freshness?.positionMinutes??60)*60000),wf=freshLabel(wx?.issuedAt||wx?.forecastAt,Number(state.settings?.freshness?.weatherHours??12)*3600000);
  const dueMaint=visible(state.maintenance).filter(t=>['due','overdue'].includes(taskStatus(t))),stockIssues=visible(state.inventory).filter(i=>['missing','reorder','expired'].includes(inventoryStatus(i))),docsSoon=visible(state.documents).filter(d=>d.expires&&(new Date(d.expires+'T12:00:00')-new Date())/86400000<90);
  let operational='';
  if(context==='underway') operational=`
    <div class="section-title"><div><h2>Underway picture</h2><p>Position and watch data are explicitly freshness-aware.</p></div><div class="action-row"><button class="ghost-btn" data-action="update-position">Update position</button><button class="ghost-btn" data-action="complete-passage">Record arrival</button><button class="primary-btn" data-action="quick-log">+ Log observation</button></div></div>
    <div class="grid cols-4">${metric('POSITION',v?.position?`${(+v.position.lat).toFixed(3)}°, ${(+v.position.lon).toFixed(3)}°`:'UNKNOWN',v?.position?`${v.positionSource||'manual'} · ${pf.label}`:'No voyage position')}${metric('COURSE / SPEED',v?.courseDeg!=null?`${fmt(+v.courseDeg,0)}° / ${fmt(+v.speedKt,1)} kt`:v?.speedKt?`${fmt(+v.speedKt,1)} kt`:'UNKNOWN','Entered/current observation')}${metric('DISTANCE TO GO',v?`${fmt(remainingVoyage(v),0)} nm`:'UNKNOWN',v?.eta?`ETA ${dateOnly(v.eta)}`:'ETA unknown')}${metric('WATCH',watch?watch.watchkeeper:'NONE',watch?`${dateTime(watch.start||watch.startedAt)} → ${dateTime(watch.end)}`:watchScheduleLabel(next))}</div>
    <div class="section-title"><div><h2>Watchkeeping</h2><p>Current watch, incoming watch, and handoff acknowledgement.</p></div><div class="action-row"><button class="ghost-btn" data-action="add-watch-schedule">+ Schedule</button>${watch?`<button class="primary-btn" data-action="end-watch" data-id="${watch.id}">End & handoff</button>`:`<button class="primary-btn" data-action="start-watch">Start watch</button>`}</div></div>
    <div class="grid cols-3"><div class="card"><div class="card-head"><div><div class="card-title">Current watch</div><div class="card-sub">${watch?esc(watch.watchkeeper):'None active'}</div></div>${statusBadge(watch?'pass':'unknown')}</div><div class="card-body">${watch?`<div class="list-meta">Started ${dateTime(watch.start||watch.startedAt)}${watch.end?` · planned end ${dateTime(watch.end)}`:''}</div><div style="margin-top:8px">${esc(watch.notes||'No watch notes recorded.')}</div>`:empty('No active watch')}</div></div><div class="card"><div class="card-head"><div><div class="card-title">Next scheduled</div><div class="card-sub">${esc(watchScheduleLabel(next))}</div></div></div><div class="card-body">${next?`<button class="ghost-btn" data-action="start-watch" data-id="${next.id}">Start scheduled watch</button>`:empty('No schedule')}</div></div><div class="card"><div class="card-head"><div><div class="card-title">Latest handoff</div><div class="card-sub">${handoff?dateTime(handoff.createdAt):'None recorded'}</div></div>${handoff?statusBadge(handoff.status==='acknowledged'?'pass':'watch'):''}</div><div class="card-body">${handoff?`<strong>${esc(handoff.fromWatchkeeper||'Previous watch')} → ${esc(handoff.toWatchkeeper||'incoming watch')}</strong><div class="list-meta" style="margin-top:5px">${esc(handoff.summary||handoff.plan||'No summary')}</div>${handoff.status!=='acknowledged'?`<button class="ghost-btn" style="margin-top:9px" data-action="ack-handoff" data-id="${handoff.id}">Acknowledge handoff</button>`:''}`:empty('No handoff history')}</div></div></div>`;
  else if(context==='at-anchor'){
    const a=selectedAnchorage(),dep=a?anchorageDeployments(state,a.id).find(d=>!d.recoveredAt)||anchorageDeployments(state,a.id)[0]:null,ap=dep?deploymentPlan(dep):(a?anchorPlan({depth:a.depth,bowHeight:a.bowHeight,tideRise:a.tideRise,scope:a.scope,availableClearance:a.clearance,vesselLengthM:(Number(state.vessel.lengthFt)||0)*0.3048}):null);
    operational=`<div class="section-title"><div><h2>At anchor</h2><p>Anchor state, weather, endurance, and vessel attention.</p></div><div class="action-row"><button class="ghost-btn" data-action="edit-anchor">Anchor workbench</button><button class="primary-btn" data-action="quick-log">+ Log observation</button></div></div><div class="grid cols-4">${metric('ANCHORAGE',a?.name||'UNKNOWN',a?`${a.bottom||'bottom unknown'} · ${a.scope||'—'}:1 scope`:'No anchorage selected')}${metric('SWING MARGIN',ap?.margin==null?'UNKNOWN':`${fmt(ap.margin,1)} m`,ap?.margin!=null&&ap.margin<0?'Review entered clearance':'Planning estimate')}${metric('WIND',wx?`${wx.windKt??'—'} kt ${wx.direction||''}`:'UNKNOWN',wx?`${wx.source} · ${wf.label}`:'No weather record')}${metric('POWER',ep.projectedPct==null?'UNKNOWN':`${fmt(ep.projectedPct,0)}%`,`${activeEnergyProfile()?.name||'profile'} · net ${fmt(ep.net,2)} kWh/d`)}</div>`;
  }else operational=`<div class="section-title"><div><h2>In port</h2><p>Prioritize work that improves the vessel before the next passage.</p></div><div class="action-row"><button class="ghost-btn" data-action="edit-vessel">Vessel status</button><button class="primary-btn" data-action="go-voyage">Plan passage</button></div></div><div class="grid cols-4">${metric('MAINTENANCE',String(dueMaint.length),`${dueMaint.filter(t=>taskStatus(t)==='overdue').length} overdue`)}${metric('STORES ISSUES',String(stockIssues.length),'Missing / reorder / expired')}${metric('PAPERS <90D',String(docsSoon.length),'Expiring or expired')}${metric('NEXT PASSAGE',v?.name||'NONE',v?`${v.origin||'—'} → ${v.destination||'—'}`:'No planned voyage')}</div>`;
  content().innerHTML=`
    <div class="hero"><div class="hero-top"><div><div class="hero-code">${esc(context.toUpperCase().replace('-',' '))} / ${esc(state.vessel.name)}</div><h2>${context==='underway'?(v?esc(v.name):'Underway — no active voyage'):context==='at-anchor'?'Anchor operations':'Port operations'}</h2><p>AFLOAT adapts the Bridge to vessel context while keeping source age, unknowns, and unresolved dependencies visible.</p></div><div><div class="metric-label">DEPARTURE DISPOSITION</div><div class="big-state ${rr.overall}">${esc(rr.disposition)}</div></div></div></div>
    ${operational}
    <div class="section-title"><div><h2>Environment & endurance</h2><p>Decision support — not certified navigation or weather guidance.</p></div></div>
    <div class="grid cols-4">${metric('WIND',wx?`${wx.windKt??'—'} kt ${wx.direction||''}`:'UNKNOWN',wx?`Source: ${wx.source} · ${wf.label}`:'No weather record')}${metric('SEA STATE',wx?`${wx.waveM??'—'} m / ${wx.wavePeriodS||'—'} s`:'UNKNOWN',wx?`Forecast ${dateTime(wx.forecastAt)}`:'No weather record')}${metric('MOTORING RANGE',Number.isFinite(fuelR.range)?`${fuelR.range.toFixed(0)} nm`:'UNKNOWN',fuel?`${fuelQty??'—'} ${fuel.unit} aboard / reserve ${fuel.reserve}`:'Fuel not configured')}${metric('WATER ENDURANCE',waterD===Infinity?'NET POSITIVE':Number.isFinite(waterD)?`${waterD.toFixed(1)} d`:'UNKNOWN',water?`${waterQty??'—'} ${water.unit} aboard · use ${waterUse==null?'UNKNOWN':fmt(waterUse,1)}/day`:'Water not configured')}</div>
    <div class="section-title"><div><h2>Attention</h2><p>Open conditions that may affect operations.</p></div><button class="ghost-btn" data-action="go-findings">Open findings</button></div>
    <div class="card"><div class="card-body"><div class="list">${attention.length?attention.slice(0,8).map(a=>`<div class="list-item"><div class="list-icon">!</div><div><div class="list-title">${esc(a.title)}</div><div class="list-meta">${esc(a.meta)}</div></div><div class="list-right">${statusBadge(a.status)}</div></div>`).join(''):empty('No current attention items','No unresolved findings, overdue tasks, low stock, or near-term document expirations were detected.')}</div></div></div>
    <div class="section-title"><div><h2>Readiness review</h2><p>${rr.blockers.length} blocker(s) · ${rr.reviews.length} review/unknown category(s). Expand a category to see its dependencies.</p></div><button class="ghost-btn" data-action="go-voyage">Full readiness</button></div>
    <div class="readiness-grid">${rr.results.slice(0,12).map(readinessCard).join('')}</div>
    <div class="section-title"><div><h2>Energy snapshot</h2><p>Current modeled daily generation and loads.</p></div><button class="ghost-btn" data-action="go-resources">Open resources</button></div>
    <div class="grid cols-4">${metric('DAILY LOAD',`${fmt(ep.use,2)} kWh`,'Modeled')}${metric('DAILY GENERATION',`${fmt(ep.gen,2)} kWh`,'Modeled')}${metric('NET',`${ep.net>=0?'+':''}${fmt(ep.net,2)} kWh/day`,ep.net>=0?'Surplus':'Deficit')}${metric('PROJECTED SOC',ep.projectedPct===null?'UNKNOWN':`${fmt(ep.projectedPct,0)}%`,'After one modeled day')}</div>`;
}
function getAttention(){
  const out=[]; state.findings.filter(f=>!['resolved','accepted'].includes((f.status||'').toLowerCase())).forEach(f=>out.push({title:f.title,meta:`Finding · ${f.source||'manual'} · ${f.action||'No action recorded'}`,status:(f.severity||'info').toLowerCase()==='critical'?'fail':(f.severity||'info').toLowerCase()==='high'?'fail':'watch'}));
  state.maintenance.forEach(t=>{const st=taskStatus(t);if(['overdue','due'].includes(st))out.push({title:t.name,meta:`Maintenance · ${eqName(t.equipmentId)} · ${st}`,status:st==='overdue'?'fail':'watch'});});
  state.inventory.forEach(i=>{const st=inventoryStatus(i);if(['missing','reorder','expired'].includes(st))out.push({title:`Stores: ${i.name}`,meta:`${i.qty} ${i.unit||''} aboard / minimum ${i.minimum} · ${st}`,status:i.criticality==='high'?'fail':'watch'});});
  state.documents.forEach(d=>{if(d.expires){const days=(new Date(d.expires+'T12:00:00')-new Date())/86400000;if(days<90)out.push({title:`Document: ${d.name}`,meta:`Expires ${dateOnly(d.expires)}`,status:days<0?'fail':'watch'});}}); return out;
}

function renderVoyage(){
  pageMeta('Voyage','ROUTE → SCENARIOS → ENDURANCE → READINESS'); const v=activeVoyage(),rr=readiness(state),wx=visible(state.weather),wps=voyageWaypoints(v),rd=routeDistance(wps),dist=plannedVoyageDistance(v),rem=v?Math.max(0,(dist||0)-(+v.progressNm||0)):null,hrs=v?durationHours(rem,v.speedKt):null,scs=v?visible(state.voyageScenarios).filter(x=>x.voyageId===v.id):[];
  content().innerHTML=`<div class="section-title"><div><h2>Passage</h2><p>Planning, route geometry, scenario comparison, and GPX interchange. AFLOAT is not a certified chartplotter.</p></div><div class="action-row"><button class="ghost-btn" data-action="import-gpx">Import GPX</button><button class="ghost-btn" data-action="export-gpx">Export GPX</button><button class="ghost-btn" data-action="add-waypoint">+ Waypoint</button><button class="primary-btn" data-action="edit-voyage">${v?'Edit passage':'Create passage'}</button></div></div><input id="gpxImport" type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" hidden>
  ${v?`<div class="hero"><div class="hero-top"><div><div class="hero-code">${esc((v.status||'planned').toUpperCase())}</div><h2>${esc(v.name)}</h2><p>${esc(v.origin)} → ${esc(v.destination)}${v.alternates?` · Alternates: ${esc(v.alternates)}`:''}</p></div><div class="right"><div class="metric-label">DISTANCE REMAINING</div><div class="big-state">${fmt(rem,0)} NM</div></div></div></div><div class="grid cols-4" style="margin-top:14px">${metric('PLANNING DISTANCE',dist===null?'UNKNOWN':`${fmt(dist,0)} nm`,v.distanceSource==='route'?'Route-derived':'Entered estimate')}${metric('ROUTE DISTANCE',rd===null?'UNKNOWN':`${fmt(rd,0)} nm`,`${wps.length} waypoint(s)`)}${metric('SPEED',v.speedKt?`${fmt(+v.speedKt,1)} kt`:'UNKNOWN','Current passage planning speed')}${metric('TIME REMAINING',hrs===null?'UNKNOWN':`${fmt(hrs/24,1)} d`,'Remaining distance / speed')}</div>`:empty('No voyage defined','Create a passage to begin route and scenario analysis.')}
  <div class="section-title"><div><h2>Route legs</h2><p>Great-circle leg distances derived from stored waypoints.</p></div></div><div class="card"><div class="card-body">${wps.length?`<div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Waypoint</th><th>Position</th><th>Leg</th><th></th></tr></thead><tbody>${wps.map((w,i)=>{const leg=i?routeDistance([wps[i-1],w]):null;return `<tr><td>${i+1}</td><td><strong>${esc(w.name)}</strong><div class="list-meta">${esc(w.kind||'route')}</div></td><td>${Number(w.lat).toFixed(4)}, ${Number(w.lon).toFixed(4)}</td><td>${leg===null?'—':fmt(leg,1)+' nm'}</td><td><button class="ghost-btn" data-action="inspect-record" data-kind="routeWaypoints" data-id="${w.id}">Open</button></td></tr>`}).join('')}</tbody></table></div>`:empty('No route waypoints','Add waypoints manually or import a GPX route.')}</div></div>
  <div class="section-title"><div><h2>Passage scenarios</h2><p>Coupled fuel, water, provisions, and electrical analysis using the same voyage distance.</p></div><button class="ghost-btn" data-action="add-voyage-scenario">+ Scenario</button></div><div class="card"><div class="card-body">${scs.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Scenario</th><th>Duration</th><th>Fuel</th><th>Water</th><th>Power</th><th>Provisions</th><th>Overall</th><th></th></tr></thead><tbody>${scs.map(sc=>{const a=scenarioAnalysis(sc,v);return `<tr><td><strong>${esc(sc.name)}</strong><div class="list-meta">${fmt(+sc.speedKt,1)} kt · ${sc.motorHours||0} motor hr · ${esc(energyProfileById(sc.energyProfileId)?.name||'no energy profile')}</div></td><td>${a?.days==null?'UNKNOWN':fmt(a.days,1)+' d'}</td><td>${statusBadge(a?.statuses.fuel||'unknown')}<div class="list-meta">${a?.fuelMargin==null?'':fmt(a.fuelMargin,1)+' margin'}</div></td><td>${statusBadge(a?.statuses.water||'unknown')}<div class="list-meta">${a?.waterMargin==null?'':fmt(a.waterMargin,1)+' margin'}</div></td><td>${statusBadge(a?.statuses.power||'unknown')}<div class="list-meta">${a?.energyMarginKwh==null?'':fmt(a.energyMarginKwh,2)+' kWh above reserve'}</div></td><td>${statusBadge(a?.statuses.provisions||'unknown')}<div class="list-meta">${a?.provisionMargin==null?'':fmt(a.provisionMargin,1)+' d margin'}</div></td><td>${statusBadge(a?.overall||'unknown')}</td><td><button class="ghost-btn" data-action="inspect-record" data-kind="voyageScenarios" data-id="${sc.id}">Open</button></td></tr>`}).join('')}</tbody></table></div>`:empty('No scenarios','Create Normal, Motor-heavy, Conservation, or custom scenarios.')}</div></div>
  <div class="section-title"><div><h2>Departure readiness</h2><p>Dependency-aware review. A departure baseline preserves exactly what AFLOAT knew at a decision point.</p></div><div class="action-row"><button class="ghost-btn" data-action="capture-baseline">Capture baseline</button>${v&&v.status!=='active'?`<button class="primary-btn" data-action="begin-passage">Begin passage</button>`:''}</div></div>
  <div class="hero readiness-summary"><div class="hero-top"><div><div class="hero-code">CURRENT REVIEW</div><h2>${esc(rr.disposition)}</h2><p>${rr.results.filter(r=>r.status==='fail').length} fail · ${rr.results.filter(r=>r.status==='watch').length} watch · ${rr.results.filter(r=>r.status==='unknown').length} unknown. A HOLD means one or more known blockers require review; AFLOAT does not declare a voyage safe.</p></div><div><div class="metric-label">EVALUATED</div><div class="metric-value">${dateTime(rr.evaluatedAt)}</div></div></div></div>
  <div class="readiness-grid" style="margin-top:12px">${rr.results.map(readinessCard).join('')}</div>
  <div class="section-title engineering-only"><div><h2>Departure baselines</h2><p>Immutable snapshots of readiness inputs/results at a decision point.</p></div></div><div class="card engineering-only"><div class="card-body">${visible(state.departureBaselines).filter(b=>!v||b.voyageId===v.id).slice().sort((a,b)=>new Date(b.capturedAt||b.createdAt||0)-new Date(a.capturedAt||a.createdAt||0)).map(b=>`<div class="list-item"><div class="list-icon">▣</div><div><div class="list-title">${esc(b.name||'Departure baseline')}</div><div class="list-meta">${dateTime(b.capturedAt||b.createdAt)} · ${esc(b.createdBy||'Unknown')} · ${esc(b.disposition||'UNKNOWN')}</div></div><button class="ghost-btn" data-action="inspect-record" data-kind="departureBaselines" data-id="${b.id}">Open</button></div>`).join('')||empty('No departure baselines','Capture a baseline before a passage decision to preserve what AFLOAT knew.')}</div></div>
  <div class="section-title"><div><h2>Weather comparison</h2><p>Manually entered/imported sources compared against vessel preferences.</p></div><button class="ghost-btn" data-action="add-weather">+ Weather</button></div><div class="card"><div class="card-body">${wx.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Source</th><th>Forecast</th><th>Wind</th><th>Gust</th><th>Seas</th><th>Pressure</th><th>Confidence</th><th></th></tr></thead><tbody>${wx.map(w=>`<tr><td><strong>${esc(w.source)}</strong></td><td>${dateTime(w.forecastAt)}</td><td>${esc(w.windKt)} kt ${esc(w.direction||'')}</td><td>${esc(w.gustKt??'—')} kt</td><td>${esc(w.waveM??'—')} m / ${esc(w.wavePeriodS??'—')} s</td><td>${esc(w.pressureHpa??'—')} hPa</td><td>${statusBadge(w.confidence||'unknown')}</td><td><button class="ghost-btn" data-action="inspect-record" data-kind="weather" data-id="${w.id}">Open</button></td></tr>`).join('')}</tbody></table></div>`:empty('No weather sources')}</div></div>
  <div class="section-title engineering-only"><div><h2>Assumptions</h2><p>Inputs materially affecting passage analysis.</p></div><button class="ghost-btn" data-action="add-assumption">+ Assumption</button></div><div class="card engineering-only"><div class="card-body">${visible(state.assumptions).map(a=>`<div class="list-item"><div class="list-icon">≈</div><div><div class="list-title">${esc(a.name)} = ${esc(a.value)} ${esc(a.unit||'')}</div><div class="list-meta">Source: ${esc(a.source||'unknown')} · ${esc(a.confidence||'unknown')} confidence</div></div><button class="ghost-btn" data-action="inspect-record" data-kind="assumptions" data-id="${a.id}">Open</button></div>`).join('')||empty('No assumptions')}</div></div>`;
}

function renderAnchor(){
  pageMeta('Anchor','ANCHORAGE → GROUND TACKLE → DEPLOY → WATCH → EXPERIENCE');
  const a=selectedAnchorage(), deployments=a?anchorageDeployments(state,a.id):[], activeDep=deployments.find(d=>!d.recoveredAt)||deployments[0]||null, tackle=activeDep?tackleById(activeDep.groundTackleId):visible(state.groundTackle).find(t=>t.primary)||visible(state.groundTackle)[0]||null;
  const basePlan=activeDep?deploymentPlan(activeDep):(a?anchorPlan({depth:a.depth,bowHeight:a.bowHeight,tideRise:a.tideRise,scope:a.scope,availableClearance:a.clearance,availableRode:tackle?.totalRodeM,vesselLengthM:(Number(state.vessel.lengthFt)||0)*0.3048}):null), xp=a?anchorageExperience(state,a.id):null;
  const planStatus=!basePlan?'unknown':(basePlan.rodeMargin!=null&&basePlan.rodeMargin<0)||(basePlan.clearanceMargin!=null&&basePlan.clearanceMargin<0)?'fail':(basePlan.rodeMargin==null||basePlan.clearanceMargin==null)?'watch':'pass';
  content().innerHTML=`<div class="section-title"><div><h2>Ground tackle workbench</h2><p>Plan from the actual carried anchor/rode configuration and preserve every deployment as vessel history.</p></div><div class="action-row"><button class="ghost-btn" data-action="add-ground-tackle">+ Ground tackle</button><button class="ghost-btn" data-action="add-anchor">+ Anchorage</button><button class="primary-btn" data-action="add-anchor-deployment">+ Deployment</button></div></div>
  ${a?`<div class="hero"><div class="hero-top"><div><div class="hero-code">${activeDep&&!activeDep.recoveredAt?'ANCHOR DOWN':'PLANNING / HISTORY'}</div><h2>${esc(a.name)}</h2><p>${esc(a.country||'')} · ${esc(a.bottom||'bottom unknown')} · ${esc(a.windProtection||'wind protection unknown')}</p></div><div class="right">${statusBadge(planStatus)}</div></div></div>
  <div class="grid cols-4" style="margin-top:14px">${metric('EFFECTIVE DEPTH',basePlan?.effectiveDepth==null?'UNKNOWN':`${fmt(basePlan.effectiveDepth,1)} m`,'Depth + tide allowance + bow height')}${metric('REQUIRED RODE',basePlan?.requiredRode==null?'UNKNOWN':`${fmt(basePlan.requiredRode,1)} m`,`${activeDep?.scope??a.scope??'—'}:1 scope`)}${metric('RODE MARGIN',basePlan?.rodeMargin==null?'UNKNOWN':`${fmt(basePlan.rodeMargin,1)} m`,tackle?`${tackle.name} · ${tackle.totalRodeM??'—'} m aboard`:'No tackle selected')}${metric('CLEARANCE MARGIN',basePlan?.clearanceMargin==null?'UNKNOWN':`${fmt(basePlan.clearanceMargin,1)} m`,'Nearest entered hazard − conservative swing radius')}</div>
  <div class="formula engineering-only" style="margin-top:12px">effective depth = depth + tide allowance + bow height<br>required rode = effective depth × selected scope<br>conservative swing radius = required rode + vessel length<br>clearance margin = nearest entered hazard − conservative swing radius<br><strong>These are planning calculations, not an anchor alarm or navigation guarantee.</strong></div>`:empty('No anchorage selected','Create an anchorage record to begin planning.')}
  <div class="section-title"><div><h2>Ground tackle aboard</h2><p>Actual anchors and rode carried by this vessel.</p></div></div><div class="grid cols-3">${visible(state.groundTackle).map(t=>`<div class="card ${t.primary?'profile-active':''}"><div class="card-head"><div><div class="card-title">${esc(t.name)}</div><div class="card-sub">${esc(t.anchorType||'Anchor type unknown')} · ${t.weightKg??'—'} kg</div></div>${t.primary?statusBadge('pass'):''}</div><div class="card-body"><div class="metric-row">${metric('TOTAL RODE',t.totalRodeM==null?'UNKNOWN':`${t.totalRodeM} m`,t.rodeType||'')}${metric('CHAIN',t.chainLengthM==null?'—':`${t.chainLengthM} m`,t.chainDiameterMm?`${t.chainDiameterMm} mm`:'' )}${metric('ROPE',t.ropeLengthM==null?'—':`${t.ropeLengthM} m`,t.ropeDiameterMm?`${t.ropeDiameterMm} mm`:'')}</div><div class="list-meta" style="margin-top:10px">${esc(t.notes||'')}</div></div><div class="card-foot"><span>${t.primary?'Primary configuration':'Secondary / alternate'}</span><button class="ghost-btn" data-action="inspect-record" data-kind="groundTackle" data-id="${t.id}">Open</button></div></div>`).join('')||empty('No ground tackle configured','Add the anchors and rode actually carried aboard.')}</div>
  <div class="section-title"><div><h2>Anchorages</h2><p>Long-lived local knowledge is separate from individual deployments.</p></div></div><div class="grid cols-2">${visible(state.anchorages).map(x=>{const hist=anchorageExperience(state,x.id),selected=a?.id===x.id;return `<div class="card ${selected?'profile-active':''}"><div class="card-head"><div><div class="card-title">${esc(x.name)}</div><div class="card-sub">${esc(x.country||'')} · ${esc(x.bottom||'bottom unknown')}</div></div>${selected?statusBadge('pass'):''}</div><div class="card-body"><div class="metric-row">${metric('RECORDED DEPLOYMENTS',String(hist.deployments+(Number(x.legacyVisitCount)||0)),hist.deployments?'First-class deployment records':'Legacy visit count may be included')}${metric('MAX RECORDED WIND',hist.maxRecordedWindKt==null?'—':`${hist.maxRecordedWindKt} kt`,'Historical observation only')}${metric('DRAG OBSERVATIONS',String(hist.drags),`${hist.noDrag} deployment(s) with no drag recorded`)}</div><div class="list-meta" style="margin-top:10px">Approach: ${esc(x.approach||'No approach notes')}<br>Hazards: ${esc(x.hazards||'No hazards recorded')}</div></div><div class="card-foot"><div class="action-row"><button class="ghost-btn" data-action="select-anchorage" data-id="${x.id}">${selected?'Selected':'Use in workbench'}</button></div><button class="ghost-btn" data-action="inspect-record" data-kind="anchorages" data-id="${x.id}">Open</button></div></div>`}).join('')||empty('No anchorages')}</div>
  <div class="section-title"><div><h2>Deployment history</h2><p>Conditions and outcomes from actual recorded anchor deployments.</p></div>${activeDep&&!activeDep.recoveredAt?`<button class="ghost-btn" data-action="add-anchor-position" data-id="${activeDep.id}">+ Position observation</button>`:''}</div><div class="card"><div class="card-body">${deployments.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Deployed</th><th>Tackle</th><th>Depth / scope</th><th>Wind</th><th>Holding</th><th>Drag / resets</th><th>Positions</th><th></th></tr></thead><tbody>${deployments.map(d=>`<tr><td>${dateTime(d.deployedAt)}<div class="list-meta">${d.recoveredAt?`Recovered ${dateTime(d.recoveredAt)}`:'ANCHOR DOWN'}</div></td><td>${esc(tackleById(d.groundTackleId)?.name||'Unknown')}</td><td>${d.depthM??'—'} m / ${d.scope??'—'}:1</td><td>${d.maxWindKt??'—'} kt ${esc(d.windDirection||'')}</td><td>${esc(d.holding||'unrated')}</td><td>${d.dragged===true||d.dragged==='yes'?statusBadge('watch'):statusBadge('pass')}<div class="list-meta">${d.resets||0} reset(s)</div></td><td>${deploymentPositions(state,d.id).length}</td><td><div class="action-row"><button class="ghost-btn" data-action="add-anchor-position" data-id="${d.id}">+ Pos</button><button class="ghost-btn" data-action="inspect-record" data-kind="anchorDeployments" data-id="${d.id}">Open</button></div></td></tr>`).join('')}</tbody></table></div>`:empty('No deployments recorded','Record each anchoring event rather than overwriting the anchorage record.')}</div></div>
  <div class="callout warn" style="margin-top:14px"><strong>Navigation boundary:</strong> AFLOAT anchor calculations and stored experience supplement—but do not replace—current official charts, depth/tide verification, dedicated anchor alarms, appropriate ground-tackle practice, or skipper judgment. Past holding is not a prediction of future holding.</div>`;
}

function renderVessel(){
  pageMeta('Vessel','SYSTEMS → EQUIPMENT → CONDITION → MAINTENANCE'); const eng=state.vessel.engineHours||0, tree=systemTree(state), archivedCount=[...state.systems,...state.equipment,...state.components,...state.maintenance,...state.inspections,...state.measurements].filter(x=>x.archived).length;
  const maint=visible(state.maintenance).slice().sort((a,b)=>{const rank={overdue:0,due:1,upcoming:2,completed:3};return (rank[taskStatus(a)]??9)-(rank[taskStatus(b)]??9)||String(a.name).localeCompare(String(b.name));});
  content().innerHTML=`<div class="section-title"><div><h2>${esc(state.vessel.name)}</h2><p>${esc(state.vessel.type||'Vessel type not defined')} · ${esc(state.vessel.homePort||'No home port')}</p></div><div class="action-row"><button class="ghost-btn" data-action="toggle-archived">${state.settings.showArchived?'Hide archived':`Show archived${archivedCount?` (${archivedCount})`:''}`}</button><button class="ghost-btn" data-action="edit-vessel">Edit vessel</button><button class="primary-btn" data-action="add-equipment">+ Equipment</button></div></div>
  <div class="grid cols-4">${metric('STATUS',(state.vessel.status||'unknown').replace('-',' ').toUpperCase(),'Operational context')}${metric('ENGINE HOURS',String(eng),'Entered vessel total')}${metric('CRUISE SPEED',state.vessel.cruiseSpeedKt?`${state.vessel.cruiseSpeedKt} kt`:'UNKNOWN','Planning reference')}${metric('ASSET RECORDS',String(visible(state.equipment).length+visible(state.components).length),`${visible(state.systems).length} systems`)}</div>
  <div class="section-title"><div><h2>System architecture</h2><p>Drag one system onto another to make it a child. Drop on ROOT to move it back to top level.</p></div><button class="ghost-btn" data-action="add-system">+ System</button></div>
  <div class="drop-root" id="systemRootDrop">DROP HERE FOR ROOT LEVEL</div><div class="system-tree">${tree.filter(x=>state.settings.showArchived||!x.record.archived).map(({record:s,depth})=>`<div class="system-row ${s.archived?'record-archived':''}" draggable="true" data-system-drag="${esc(s.id)}" data-system-drop="${esc(s.id)}"><div><span class="system-indent" style="--depth:${depth}"></span><span class="system-name">${depth?'↳ ':''}${esc(s.name)}</span><div class="system-meta" style="padding-left:${depth*20}px">${visible(state.equipment).filter(e=>e.systemId===s.id).length} equipment · ${state.findings.filter(f=>f.systemId===s.id&&!['resolved','accepted'].includes(f.status)).length} open findings${s.description?` · ${esc(s.description)}`:''}</div></div>${statusBadge(s.status)}<button class="ghost-btn" data-action="inspect-record" data-kind="systems" data-id="${s.id}">Open</button></div>`).join('')||empty('No systems','Add a vessel system to begin the topology.')}</div>
  <div class="section-title"><div><h2>Equipment</h2><p>Components, provenance, criticality, condition, and maintenance relationships.</p></div><div class="toolbar"><input id="vesselFilter" placeholder="Filter vessel records…"><button class="ghost-btn" data-action="add-component">+ Component</button></div></div>
  <div class="card"><div class="card-body"><div class="table-wrap"><table class="table" id="equipmentTable"><thead><tr><th>Equipment</th><th>System</th><th>Model</th><th>Condition</th><th>Criticality</th><th>Maintenance</th><th>Location</th><th></th></tr></thead><tbody>${visible(state.equipment).map(e=>{const due=visible(state.maintenance).filter(t=>t.equipmentId===e.id&&['due','overdue'].includes(taskStatus(t))).length,comps=visible(state.components).filter(c=>c.equipmentId===e.id).length;return `<tr class="${e.archived?'record-archived':''}" data-filter-text="${esc([e.name,e.manufacturer,e.model,sysName(e.systemId),e.location,e.condition].join(' ').toLowerCase())}"><td><strong>${esc(e.name)}</strong><div class="list-meta">${esc(e.manufacturer||'')} · ${comps} component(s)</div><div class="record-id">${esc(e.id)}</div></td><td>${esc(sysName(e.systemId))}</td><td>${esc(e.model||'—')}</td><td>${statusBadge(e.condition||e.status||'unknown')}</td><td>${statusBadge(e.criticality||'unknown')}</td><td>${due?`<span class="status watch">${due} DUE</span>`:'—'}</td><td>${esc(e.location||'—')}</td><td><button class="ghost-btn" data-action="inspect-record" data-kind="equipment" data-id="${e.id}">Open</button></td></tr>`}).join('')}</tbody></table></div></div></div>
  <div class="section-title engineering-only"><div><h2>Components</h2><p>Maintainable or replaceable subassemblies linked to parent equipment.</p></div><button class="ghost-btn" data-action="add-component">+ Component</button></div><div class="card engineering-only"><div class="card-body">${visible(state.components).map(c=>`<div class="list-item ${c.archived?'record-archived':''}" data-filter-text="${esc([c.name,eqName(c.equipmentId),c.partNumber,c.location].join(' ').toLowerCase())}"><div class="list-icon">◇</div><div><div class="list-title">${esc(c.name)}</div><div class="list-meta">${esc(eqName(c.equipmentId))} · ${esc(c.partNumber||'no part number')} · ${esc(c.location||'location unknown')}</div></div><div class="list-right">${statusBadge(c.condition||c.status||'unknown')}<br><button class="ghost-btn" style="margin-top:5px" data-action="inspect-record" data-kind="components" data-id="${c.id}">Open</button></div></div>`).join('')||empty('No component records')}</div></div>
  <div class="section-title"><div><h2>Maintenance</h2><p>Calendar, engine-hour, cycle, seasonal, condition-based, and corrective tasks.</p></div><button class="ghost-btn" data-action="add-maintenance">+ Task</button></div><div class="card"><div class="card-body">${maint.map(t=>{const st=taskStatus(t),parts=partAvailability(t);return `<div class="list-item ${t.archived?'record-archived':''}" data-filter-text="${esc([t.name,eqName(t.equipmentId),compName(t.componentId),t.taskType,t.notes].join(' ').toLowerCase())}"><div class="list-icon">◷</div><div><div class="list-title">${esc(t.name)}</div><div class="list-meta">${esc(eqName(t.equipmentId))}${t.componentId?` → ${esc(compName(t.componentId))}`:''} · ${esc(t.taskType||'task')} · ${maintenanceDueLabel(t)}</div>${parts.length?`<div class="maintenance-parts">${parts.map(p=>`<span class="part-tag ${p.ok?'':'missing'}">${esc(p.name)} · ${p.qty} aboard</span>`).join('')}</div>`:''}</div><div class="list-right">${statusBadge(st)}<br><div class="action-row" style="margin-top:5px;justify-content:flex-end"><button class="ghost-btn" data-action="complete-maintenance" data-id="${t.id}">Complete</button><button class="ghost-btn" data-action="inspect-record" data-kind="maintenance" data-id="${t.id}">Open</button></div></div></div>`}).join('')||empty('No maintenance tasks')}</div></div>
  <div class="section-title"><div><h2>Inspections</h2><p>Condition observations that remain distinct from maintenance completion.</p></div><button class="ghost-btn" data-action="add-inspection">+ Inspection</button></div><div class="card"><div class="card-body">${visible(state.inspections).slice().sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,10).map(i=>`<div class="list-item ${i.archived?'record-archived':''}" data-filter-text="${esc([i.name,eqName(i.equipmentId),i.result,i.condition,i.inspector,i.notes].join(' ').toLowerCase())}"><div class="list-icon">⌕</div><div><div class="list-title">${esc(i.name)}</div><div class="list-meta">${esc(eqName(i.equipmentId))} · ${dateTime(i.at)} · ${esc(i.inspector||'inspector unrecorded')} · ${esc(i.notes||'')}</div></div><div class="list-right">${statusBadge(i.result||'unknown')}<br><button class="ghost-btn" style="margin-top:5px" data-action="inspect-record" data-kind="inspections" data-id="${i.id}">Open</button></div></div>`).join('')||empty('No inspection records')}</div></div>
  <div class="section-title engineering-only"><div><h2>Condition measurements</h2><p>Latest values grouped with historical trend and explicit source.</p></div><button class="ghost-btn" data-action="add-measurement">+ Measurement</button></div><div class="card engineering-only"><div class="card-body"><div class="table-wrap"><table class="table"><thead><tr><th>Measurement</th><th>Equipment</th><th>Latest</th><th>Expected</th><th>Trend</th><th>Source</th><th></th></tr></thead><tbody>${latestMeasurementGroups().map(series=>{const m=series[series.length-1],ok=(m.min==null||+m.value>=+m.min)&&(m.max==null||+m.value<=+m.max),tr=trend(series);return `<tr data-filter-text="${esc([m.name,eqName(m.equipmentId),m.source].join(' ').toLowerCase())}"><td><strong>${esc(m.name)}</strong><div class="list-meta">${series.length} sample(s)</div></td><td>${esc(eqName(m.equipmentId))}</td><td>${esc(m.value)} ${esc(m.unit||'')} ${statusBadge(ok?'pass':'watch')}</td><td>${m.min??'—'}–${m.max??'—'} ${esc(m.unit||'')}</td><td><span class="trend ${tr}">${esc(tr)}</span></td><td>${esc(m.source||'unknown')}<div class="list-meta">${dateTime(m.at)}</div></td><td><button class="ghost-btn" data-action="inspect-record" data-kind="measurements" data-id="${m.id}">Latest</button></td></tr>`}).join('')}</tbody></table></div></div></div>
  <div class="section-title engineering-only"><div><h2>Maintenance history</h2><p>Immutable-style service records retained independently from recurring tasks.</p></div></div><div class="card engineering-only"><div class="card-body">${visible(state.maintenanceHistory).slice().sort((a,b)=>new Date(b.completedAt)-new Date(a.completedAt)).map(h=>`<div class="list-item"><div class="list-icon">✓</div><div><div class="list-title">${esc(state.maintenance.find(t=>t.id===h.maintenanceId)?.name||'Maintenance')}</div><div class="list-meta">${esc(eqName(h.equipmentId))} · ${dateTime(h.completedAt)} · ${h.engineHours!=null?`${h.engineHours} hr · `:''}${esc(h.performedBy||'crew unrecorded')}</div><div class="list-meta">${esc(h.notes||'')}</div></div><button class="ghost-btn" data-action="inspect-record" data-kind="maintenanceHistory" data-id="${h.id}">Open</button></div>`).join('')||empty('No completed maintenance history')}</div></div>`;
}

function bindVesselInteractions(){
  const filter=$('#vesselFilter');if(filter)filter.oninput=()=>{const q=filter.value.trim().toLowerCase();content().querySelectorAll('[data-filter-text]').forEach(el=>el.classList.toggle('hidden',q&&!el.dataset.filterText.includes(q)));};
  let dragId='';content().querySelectorAll('[data-system-drag]').forEach(row=>{row.addEventListener('dragstart',e=>{dragId=row.dataset.systemDrag;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',dragId);});row.addEventListener('dragend',()=>{dragId='';content().querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'));});});
  content().querySelectorAll('[data-system-drop]').forEach(row=>{row.addEventListener('dragover',e=>{e.preventDefault();row.classList.add('drag-over');});row.addEventListener('dragleave',()=>row.classList.remove('drag-over'));row.addEventListener('drop',e=>{e.preventDefault();row.classList.remove('drag-over');const moving=dragId||e.dataTransfer.getData('text/plain'),target=row.dataset.systemDrop;if(!moving||moving===target)return;const r=setSystemParent(state,moving,target);if(!r.ok){toast(r.reason);return;}scheduleSave();renderPage();toast('System hierarchy updated.');});});
  const root=$('#systemRootDrop');if(root){root.addEventListener('dragover',e=>{e.preventDefault();root.classList.add('drag-over');});root.addEventListener('dragleave',()=>root.classList.remove('drag-over'));root.addEventListener('drop',e=>{e.preventDefault();root.classList.remove('drag-over');const moving=dragId||e.dataTransfer.getData('text/plain');if(!moving)return;setSystemParent(state,moving,'');scheduleSave();renderPage();toast('System moved to root level.');});}
}

function renderResources(){
  pageMeta('Resources','QUANTITY → RATE → ENDURANCE → MARGIN');
  const v=activeVoyage(), rem=v?remainingVoyage(v):null, passageDays=v?durationHours(rem??plannedVoyageDistance(v),v.speedKt)/24:null, ep=energyProfileProjection(state.energy,activeEnergyProfile()), es=energyStorageSummary(state.energy), crewCount=Math.max(1,state.crew.length||1);
  const cards=visible(state.resources).map(r=>{
    const qty=resourceQuantity(state,r.id), cap=resourceCapacity(state,r.id), hist=historicalResourceRate(state,r.id), use=effectiveDailyUse(r,crewCount,hist.rate);
    let val='UNKNOWN',note='Insufficient rate data',st='unknown';
    if(r.kind==='fuel'){
      const pt=fuelCurvePoint(r.fuelCurve,r.planningRpm), burn=pt.burnPerHour||r.burnPerHour, speed=pt.speedKt||v?.speedKt||state.vessel.cruiseSpeedKt, fr=fuelRange({current:qty,reserve:r.reserve,burnPerHour:burn,speedKt:speed});
      val=Number.isFinite(fr.range)?`${fr.range.toFixed(0)} nm`:'UNKNOWN'; st=fr.range==null?'unknown':passageDays&&v&&fr.range<(rem??v.distanceNm)?'watch':'pass'; note=Number.isFinite(fr.hours)?`${fr.hours.toFixed(1)} hr after reserve · ${burn?fmt(burn,2)+' '+r.unit+'/hr':'burn unknown'}`:'Need burn + speed';
    }else{
      const re=resourceEndurance({quantity:qty,reserve:r.reserve,dailyUse:use,dailyProduction:r.dailyProduction,passageDays}); val=re.days===Infinity?'NET POSITIVE':Number.isFinite(re.days)?`${re.days.toFixed(1)} days`:'UNKNOWN'; st=re.days===null?'unknown':re.margin!==null&&re.margin<2?'watch':'pass'; note=re.margin!==null?`${re.margin>=0?'+':''}${re.margin.toFixed(1)} d vs remaining passage`:`${qty??'—'} ${r.unit||''} aboard`;
    }
    return `<div class="card"><div class="card-head"><div><div class="card-title">${esc(r.name)}</div><div class="card-sub">${esc(r.kind)} · ${hist.samples?`${hist.samples} historical rate samples`:'entered rate'}</div></div>${statusBadge(st)}</div><div class="card-body"><div class="big-state ${st}">${esc(val)}</div><div class="list-meta">${esc(note)}</div><div class="progress ${st}" style="margin-top:12px;--w:${cap?Math.max(0,Math.min(100,(qty??0)/cap*100)):0}%"><span></span></div></div><div class="card-foot"><span>${esc(qty??'—')} / ${esc(cap??'—')} ${esc(r.unit||'')}</span><div class="action-row"><button class="ghost-btn" data-action="record-resource" data-id="${r.id}">Record change</button><button class="ghost-btn" data-action="inspect-record" data-kind="resources" data-id="${r.id}">Open</button></div></div></div>`;
  }).join('');
  const tx=visible(state.resourceTransactions).slice().sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,12);
  const pe=provisionEndurance(visible(state.provisions),crewCount);
  content().innerHTML=`<div class="section-title"><div><h2>Endurance</h2><p>Tank totals, entered or historical consumption, reserves, and remaining-passage margins.</p></div><button class="primary-btn" data-action="add-resource">+ Resource</button></div>
  <div class="grid cols-3">${cards||empty('No resources','Add fuel, water, provisions, propane, or other consumables.')}</div>
  <div class="section-title"><div><h2>Tankage</h2><p>Individual tanks retain calibration, source, confidence, and last-reading provenance.</p></div><button class="ghost-btn" data-action="add-tank">+ Tank</button></div>
  <div class="card"><div class="card-body">${visible(state.tanks).length?`<div class="table-wrap"><table class="table"><thead><tr><th>Tank</th><th>Resource</th><th>Current</th><th>Usable</th><th>Reserve</th><th>Source / freshness</th><th></th></tr></thead><tbody>${visible(state.tanks).map(t=>`<tr><td><strong>${esc(t.name)}</strong><div class="list-meta">${(t.calibration||[]).length} calibration points</div></td><td>${esc(state.resources.find(r=>r.id===t.resourceId)?.name||'—')}</td><td>${esc(t.current??'UNKNOWN')} ${esc(t.unit||'')}</td><td>${esc(t.usable??'—')} ${esc(t.unit||'')}</td><td>${esc(t.reserve??'—')} ${esc(t.unit||'')}</td><td>${esc(t.source||'unknown')}<div class="list-meta">${t.lastReadingAt?dateTime(t.lastReadingAt):'never'} · ${esc(t.confidence||'unknown')} confidence</div></td><td><button class="ghost-btn" data-action="inspect-record" data-kind="tanks" data-id="${t.id}">Open</button></td></tr>`).join('')}</tbody></table></div>`:empty('No tanks','Add individual fuel/water tanks or keep a resource quantity directly.')}</div></div>
  <div class="section-title"><div><h2>Resource history</h2><p>Changes are transactions so quantities and consumption evidence are reconstructable.</p></div></div><div class="card"><div class="card-body">${tx.length?tx.map(t=>{const r=state.resources.find(x=>x.id===t.resourceId);return `<div class="list-item"><div class="list-icon">${t.delta<0?'−':'+'}</div><div><div class="list-title">${esc(r?.name||'Resource')} · ${esc(t.type)}</div><div class="list-meta">${dateTime(t.at)} · ${Math.abs(Number(t.delta??t.quantity)||0)} ${esc(t.unit||r?.unit||'')} · ${esc(t.source||'unknown')}${t.durationDays?` · over ${t.durationDays} d`:''}</div></div><button class="ghost-btn" data-action="inspect-record" data-kind="resourceTransactions" data-id="${t.id}">Open</button></div>`}).join(''):empty('No resource transactions','Record fills, consumption, production, drain, or adjustments.')}</div></div>
  <div class="section-title"><div><h2>Provisions</h2><p>Practical serving endurance by crew size; intentionally not a calorie tracker.</p></div><button class="ghost-btn" data-action="add-provision">+ Provision</button></div>
  <div class="grid cols-4">${metric('CREW',crewCount,'Used for per-person provision rates')}${metric('LIMITING PROVISION',pe.limiting?.name||'UNKNOWN',Number.isFinite(pe.days)?`${fmt(pe.days,1)} days`:'No usable serving-rate data')}${metric('PROVISION RECORDS',visible(state.provisions).length,'Fresh, dry, emergency, refrigerated')}${metric('PASSAGE REMAINING',Number.isFinite(passageDays)?`${fmt(passageDays,1)} days`:'UNKNOWN','Distance remaining / speed')}</div>
  <div class="card" style="margin-top:14px"><div class="card-body">${pe.rows.length?pe.rows.map(pr=>`<div class="list-item"><div class="list-icon">P</div><div><div class="list-title">${esc(pr.name)}</div><div class="list-meta">${esc(pr.category||'')} · ${pr.servingsRemaining??'—'} servings · ${pr.servingsPerPersonDay??'—'} / person-day${pr.countsForEndurance===false?' · supplemental/reserve':''}${pr.expires?` · expires ${dateOnly(pr.expires)}`:''}</div></div><div class="list-right">${Number.isFinite(pr.days)?fmt(pr.days,1)+' d':'UNKNOWN'}<br><button class="ghost-btn" data-action="inspect-record" data-kind="provisions" data-id="${pr.id}">Open</button></div></div>`).join(''):empty('No provision records')}</div></div>
  <div class="section-title"><div><h2>Energy / Powerwatch</h2><p>GENERATION → STORAGE → PROFILE → LOAD SHEDDING → ENDURANCE</p></div><div class="action-row"><button class="ghost-btn" data-action="add-energy-profile">+ Profile</button><button class="ghost-btn" data-action="add-energy-bank">+ Bank</button></div></div>
  <div class="grid cols-4">${metric('HOUSE CAPACITY',es.capacityKwh?`${fmt(es.capacityKwh,2)} kWh`:'UNKNOWN',`${es.banks.length||0} storage bank(s)`)}${metric('CURRENT SOC',es.currentPct!=null?`${fmt(es.currentPct,0)}%`:'UNKNOWN',`Reserve ${es.reservePct!=null?fmt(es.reservePct,0):'—'}%`)}${metric('DAILY LOAD',`${fmt(ep.use,2)} kWh`,'Modeled loads')}${metric('DAILY GENERATION',`${fmt(ep.gen,2)} kWh`,`${ep.net>=0?'+':''}${fmt(ep.net,2)} kWh/day net`)}</div>
  <div class="grid cols-2" style="margin-top:14px"><div class="card"><div class="card-head"><div class="card-title">Loads</div><button class="ghost-btn" data-action="add-load">+ Load</button></div><div class="card-body">${state.energy.loads.map(l=>`<div class="list-item"><div class="list-icon">↓</div><div><div class="list-title">${esc(l.name)}</div><div class="list-meta">${l.watts} W · ${l.dutyPct}% duty · ${l.hoursPerDay} hr/day · ${esc(l.priority||'')}${state.settings.mode==='engineering'?` · ID ${esc(l.id)}`:''}</div></div><button class="ghost-btn" data-action="edit-load" data-id="${l.id}">Edit</button></div>`).join('')||empty('No loads')}</div></div><div class="card"><div class="card-head"><div class="card-title">Generation</div><button class="ghost-btn" data-action="add-source">+ Source</button></div><div class="card-body">${state.energy.sources.map(g=>`<div class="list-item"><div class="list-icon">↑</div><div><div class="list-title">${esc(g.name)}</div><div class="list-meta">${g.dailyKwh} kWh/day expected${state.settings.mode==='engineering'?` · ID ${esc(g.id)}`:''}</div></div><button class="ghost-btn" data-action="edit-source" data-id="${g.id}">Edit</button></div>`).join('')||empty('No generation sources')}</div></div></div>
  <div class="section-title"><div><h2>Operating profiles</h2><p>Switch the modeled vessel between underway, motoring, anchor, overnight, conservation, emergency, or custom states.</p></div></div><div class="grid cols-3">${visible(state.energyProfiles).map(p=>{const x=energyProfileProjection(state.energy,p);return `<div class="card ${state.settings.activeEnergyProfileId===p.id?'profile-active':''}"><div class="card-head"><div><div class="card-title">${esc(p.name)}</div><div class="card-sub">${esc(p.kind||'custom')} · ${fmt(x.use,2)} use / ${fmt(x.gen,2)} gen kWh/day</div></div>${statusBadge(x.net>=0?'pass':Number.isFinite(x.enduranceHours)?(x.enduranceHours<24?'watch':'pass'):'unknown')}</div><div class="card-body"><div class="list-meta">Net ${x.net>=0?'+':''}${fmt(x.net,2)} kWh/day · ${x.enduranceHours===Infinity?'NET POSITIVE':Number.isFinite(x.enduranceHours)?fmt(x.enduranceHours,0)+' hr to reserve':'UNKNOWN'}</div></div><div class="card-foot"><button class="ghost-btn" data-action="activate-energy-profile" data-id="${p.id}">${state.settings.activeEnergyProfileId===p.id?'Active':'Activate'}</button><button class="ghost-btn" data-action="inspect-record" data-kind="energyProfiles" data-id="${p.id}">Open</button></div></div>`}).join('')||empty('No operating profiles')}</div>
  <div class="section-title engineering-only"><div><h2>Storage banks & load shedding</h2><p>Explicit bank reserves plus staged shedding of non-essential loads.</p></div></div><div class="grid cols-2 engineering-only"><div class="card"><div class="card-head"><div class="card-title">Storage banks</div></div><div class="card-body">${(state.energy.banks||[]).map(b=>`<div class="list-item"><div class="list-icon">▰</div><div><div class="list-title">${esc(b.name)}</div><div class="list-meta">${b.capacityKwh??'—'} kWh · ${b.currentPct??'—'}% SOC · ${b.reservePct??'—'}% reserve · ${esc(b.chemistry||'')}</div></div><button class="ghost-btn" data-action="edit-energy-bank" data-id="${b.id}">Edit</button></div>`).join('')||empty('No storage banks')}</div></div><div class="card"><div class="card-head"><div class="card-title">Load shedding — ${esc(activeEnergyProfile()?.name||'profile')}</div></div><div class="card-body">${loadSheddingPlan(state.energy,activeEnergyProfile()).slice(0,6).map((st,i)=>`<div class="list-item"><div class="list-icon">${i}</div><div><div class="list-title">${esc(st.label)}${st.removed?` · ${esc(st.removed)}`:''}</div><div class="list-meta">${fmt(st.use,2)} kWh/day load · net ${st.net>=0?'+':''}${fmt(st.net,2)} · ${st.enduranceHours===Infinity?'net positive':Number.isFinite(st.enduranceHours)?fmt(st.enduranceHours,0)+' hr to reserve':'unknown'}</div></div></div>`).join('')}</div></div></div>
  <div class="card engineering-only" style="margin-top:14px"><div class="card-head"><div class="card-title">Calculation transparency</div></div><div class="card-body"><div class="formula">Resource quantity = Σ linked tank current values when tanks exist; otherwise direct resource quantity.<br>Endurance = (quantity − reserve) / (effective daily use − daily production).<br>Historical rate = Σ consumption / Σ explicitly recorded duration days.<br>daily load = Σ(watts × duty × hours) / 1000 = ${fmt(ep.use,3)} kWh/day<br>net energy = ${fmt(ep.gen,3)} − ${fmt(ep.use,3)} = ${fmt(ep.net,3)} kWh/day</div></div></div>`;
}

function renderStores(){
  pageMeta('Stores','LOCATION → STOCK → DEMAND → REORDER');
  const items=visible(state.inventory), statuses=items.map(i=>inventoryStatus(i));
  const demand=new Map(); for(const t of visible(state.maintenance)){if(!['due','overdue','upcoming'].includes(taskStatus(t)))continue;for(const raw of t.requiredParts||[]){const [pid,qraw]=String(raw).split(':');demand.set(pid,(demand.get(pid)||0)+Math.max(1,Number(qraw)||1));}}
  const reorder=items.filter(i=>['missing','reorder','expired'].includes(inventoryStatus(i)) || (demand.get(i.id)||0)>(Number(i.qty)||0));
  content().innerHTML=`<div class="section-title"><div><h2>Inventory</h2><p>Stock is linked to storage, equipment, maintenance demand, and a permanent adjustment history.</p></div><div class="action-row"><button class="ghost-btn" data-action="add-storage-location">+ Location</button><button class="primary-btn" data-action="add-inventory">+ Item</button></div></div>
  <div class="grid cols-4">${metric('ITEMS',items.length,'Active inventory records')}${metric('REORDER / MISSING',statuses.filter(s=>['reorder','missing'].includes(s)).length,'Below defined minimum')}${metric('MAINTENANCE SHORTFALLS',items.filter(i=>(demand.get(i.id)||0)>(Number(i.qty)||0)).length,'Demand exceeds quantity aboard')}${metric('EXPIRING <90D',items.filter(i=>i.expires && new Date(i.expires+'T12:00:00')<new Date(Date.now()+90*86400000)).length,'Includes expired')}</div>
  <div class="card" style="margin-top:14px"><div class="card-body"><div class="table-wrap"><table class="table"><thead><tr><th>Item</th><th>Qty</th><th>Min / desired</th><th>Maintenance demand</th><th>Supports</th><th>Storage</th><th>Status</th><th></th></tr></thead><tbody>${items.map(i=>{const st=inventoryStatus(i),need=demand.get(i.id)||0,path=storagePath(state,i.storageLocationId)||i.location||'—';return `<tr><td><strong>${esc(i.name)}</strong><div class="list-meta">${esc(i.partNumber||'No part number')} · ${esc(i.category||'')}</div></td><td>${esc(i.qty)} ${esc(i.unit||'')}</td><td>${esc(i.minimum??'—')} / ${esc(i.desired??'—')}</td><td>${need||'—'} ${need>(Number(i.qty)||0)?statusBadge('fail'):need?statusBadge('pass'):''}</td><td>${esc(eqName(i.equipmentId))}<div class="list-meta">${esc(sysName(i.systemId))}</div></td><td>${esc(path)}</td><td>${statusBadge(st)}</td><td><div class="action-row"><button class="ghost-btn" data-action="adjust-inventory" data-id="${i.id}">± Stock</button><button class="ghost-btn" data-action="inspect-record" data-kind="inventory" data-id="${i.id}">Open</button></div></td></tr>`}).join('')}</tbody></table></div></div></div>
  <div class="section-title"><div><h2>Reorder review</h2><p>Combines defined minima, expiry, and quantities required by active maintenance tasks.</p></div></div><div class="card"><div class="card-body">${reorder.length?reorder.map(i=>`<div class="list-item"><div class="list-icon">!</div><div><div class="list-title">${esc(i.name)}</div><div class="list-meta">${i.qty} ${esc(i.unit||'')} aboard · min ${i.minimum??'—'} · maintenance demand ${demand.get(i.id)||0} · desired ${i.desired??'—'}</div></div>${statusBadge(inventoryStatus(i))}</div>`).join(''):empty('No reorder items','Stock meets current minimums and modeled maintenance demand.')}</div></div>
  <div class="section-title"><div><h2>Storage locations</h2><p>Hierarchical locker/bin locations stay reusable across stores and provisions.</p></div></div><div class="grid cols-3">${visible(state.storageLocations).map(l=>`<div class="card"><div class="card-body"><div class="card-title">${esc(storagePath(state,l.id)||l.name)}</div><div class="list-meta">${esc(l.description||'')}</div><div style="margin-top:9px">${state.inventory.filter(i=>i.storageLocationId===l.id&&!i.archived).length} store items · ${state.provisions.filter(i=>i.storageLocationId===l.id&&!i.archived).length} provisions</div></div><div class="card-foot"><span>${esc(l.id)}</span><button class="ghost-btn" data-action="inspect-record" data-kind="storageLocations" data-id="${l.id}">Open</button></div></div>`).join('')||empty('No structured locations','Legacy free-text locations remain visible; add reusable lockers/bins here.')}</div>
  <div class="section-title"><div><h2>Recent stock transactions</h2><p>Restock, consume, maintenance-use, transfer, and adjustment history.</p></div></div><div class="card"><div class="card-body">${visible(state.inventoryTransactions).slice().sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,15).map(t=>{const i=state.inventory.find(x=>x.id===t.inventoryId);return `<div class="list-item"><div class="list-icon">${t.delta<0?'−':'+'}</div><div><div class="list-title">${esc(i?.name||'Inventory')} · ${esc(t.type)}</div><div class="list-meta">${dateTime(t.at)} · ${t.delta>=0?'+':''}${t.delta} ${esc(t.unit||i?.unit||'')} · ${esc(t.source||'manual')}</div></div><button class="ghost-btn" data-action="inspect-record" data-kind="inventoryTransactions" data-id="${t.id}">Open</button></div>`}).join('')||empty('No stock transactions')}</div></div>`;
}

function renderProcedures(){
  pageMeta('Procedures','NORMAL → ABNORMAL → EMERGENCY → EXECUTION HISTORY');
  const procedures=visible(state.procedures), executions=visible(state.procedureExecutions).slice().sort((a,b)=>new Date(b.startedAt||b.createdAt||0)-new Date(a.startedAt||a.createdAt||0)), active=executions.filter(x=>x.status==='in-progress');
  content().innerHTML=`<div class="section-title"><div><h2>Vessel-specific procedures</h2><p>Procedures capture this vessel’s equipment locations, prerequisites, warnings, tools, parts, and steps. Each run preserves a timestamped execution snapshot.</p></div><button class="primary-btn" data-action="add-procedure">+ Procedure</button></div>
  <div class="grid cols-4">${metric('PROCEDURES',String(procedures.length),'Normal / abnormal / emergency')}${metric('ACTIVE EXECUTIONS',String(active.length),'Can be resumed')}${metric('COMPLETED',String(executions.filter(x=>x.status==='completed').length),'Permanent execution history')}${metric('SKIPPED STEPS',String(executions.reduce((n,x)=>n+procedureExecutionSummary(x).skipped,0)),'Each requires a reason')}</div>
  <div class="grid cols-3" style="margin-top:14px">${['normal','abnormal','emergency'].map(cat=>`<div class="card"><div class="card-head"><div><div class="card-title">${cat.toUpperCase()}</div><div class="card-sub">${procedures.filter(p=>p.category===cat).length} procedure(s)</div></div></div><div class="card-body">${procedures.filter(p=>p.category===cat).map(p=>{const run=active.find(x=>x.procedureId===p.id);return `<div class="list-item"><div class="list-icon">${cat==='emergency'?'!':'✓'}</div><div><div class="list-title">${esc(p.name)}</div><div class="list-meta">${esc(p.purpose||'')} · ${(p.steps||[]).length} steps${p.equipmentLocations?` · ${esc(p.equipmentLocations).slice(0,70)}`:''}</div></div><div class="list-right">${run?`<button class="primary-btn" data-action="resume-procedure-execution" data-id="${run.id}">Resume</button>`:`<button class="ghost-btn" data-action="run-procedure" data-id="${p.id}">Run</button>`}<button class="ghost-btn" data-action="inspect-record" data-kind="procedures" data-id="${p.id}">Open</button></div></div>`}).join('')||empty(`No ${cat} procedures`)}</div></div>`).join('')}</div>
  <div class="section-title"><div><h2>Execution history</h2><p>Starting a checklist immediately creates a record. Completion requires every step to be completed or explicitly skipped with a reason.</p></div></div><div class="card"><div class="card-body">${executions.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Started</th><th>Procedure</th><th>Operator</th><th>Progress</th><th>Status</th><th></th></tr></thead><tbody>${executions.slice(0,30).map(x=>{const sum=procedureExecutionSummary(x);return `<tr><td>${dateTime(x.startedAt)}</td><td><strong>${esc(x.procedureName||state.procedures.find(p=>p.id===x.procedureId)?.name||'Procedure')}</strong><div class="list-meta">${esc(x.category||'')}</div></td><td>${esc(x.performedBy||'Crew')}</td><td>${sum.done} done · ${sum.skipped} skipped · ${sum.pending} pending</td><td>${statusBadge(x.status==='completed'?'pass':x.status==='aborted'?'fail':x.status==='in-progress'?'watch':'unknown')}</td><td><div class="action-row">${x.status==='in-progress'?`<button class="ghost-btn" data-action="resume-procedure-execution" data-id="${x.id}">Resume</button>`:''}<button class="ghost-btn" data-action="inspect-record" data-kind="procedureExecutions" data-id="${x.id}">Open</button></div></td></tr>`}).join('')}</tbody></table></div>`:empty('No procedure executions','Run a vessel-specific procedure to create timestamped history.')}</div></div>
  <div class="callout warn" style="margin-top:14px"><strong>Safety boundary:</strong> AFLOAT stores vessel-specific checklists and execution records. It does not replace training, manufacturer procedures, emergency services, COLREGS, official medical guidance, or skipper judgment.</div>`;
}

function renderPorts(){
  pageMeta('Ports','ARRIVAL → SERVICES → VISIT → EXPERIENCE');
  const visits=visible(state.portVisits).slice().sort((a,b)=>new Date(b.arrivedAt||b.createdAt||0)-new Date(a.arrivedAt||a.createdAt||0)), docs=visible(state.documents), v=activeVoyage(), vw=voyageWindow(v), docRows=docs.map(d=>({d,c:documentCompliance(d,v)})), rank={fail:0,watch:1,unknown:2,pass:3}; docRows.sort((a,b)=>(rank[a.c.status]??9)-(rank[b.c.status]??9)||String(a.d.name).localeCompare(String(b.d.name)));
  content().innerHTML=`<div class="section-title"><div><h2>Personal port database</h2><p>Long-lived port knowledge is separated from individual visits. Regulatory notes stay source- and age-aware.</p></div><div class="action-row"><button class="ghost-btn" data-action="add-port-visit">+ Visit</button><button class="primary-btn" data-action="add-port">+ Port</button></div></div><div class="grid cols-2">${visible(state.ports).map(p=>{const age=p.verified?Math.floor((Date.now()-new Date(p.verified+'T12:00:00'))/86400000):null,count=portVisitCount(p.id);return `<div class="card"><div class="card-head"><div><div class="card-title">${esc(p.name)}</div><div class="card-sub">${esc(p.country||'')} · ${count} recorded visit(s)</div></div>${statusBadge(age!==null&&age>90?'watch':p.confidence||'unknown')}</div><div class="card-body"><div class="list"><div class="list-item"><div class="list-icon">V</div><div><div class="list-title">Communications</div><div class="list-meta">${esc(p.vhf||'UNKNOWN')}</div></div></div><div class="list-item"><div class="list-icon">↘</div><div><div class="list-title">Arrival / approach</div><div class="list-meta">${esc(p.arrival||'No notes')}</div></div></div><div class="list-item"><div class="list-icon">⌂</div><div><div class="list-title">Services</div><div class="list-meta">Fuel ${p.fuel?'yes':'unknown'} · Water ${p.water?'yes':'unknown'} · Chandlery ${p.chandlery?'yes':'unknown'} · ${esc(p.repairs||'repair notes unknown')}</div></div></div><div class="list-item"><div class="list-icon">§</div><div><div class="list-title">Clearance</div><div class="list-meta">Customs: ${esc(p.customs||'UNKNOWN')} · Immigration: ${esc(p.immigration||'UNKNOWN')}</div></div></div></div><div class="callout ${age!==null&&age>90?'warn':''}" style="margin-top:10px">Source: ${esc(p.source||'unknown')} · verified ${p.verified?dateOnly(p.verified):'never'}${age!==null?` (${age} days ago)`:''}</div></div><div class="card-foot"><div class="action-row"><button class="ghost-btn" data-action="add-port-visit" data-id="${p.id}">Record visit</button></div><button class="ghost-btn" data-action="inspect-record" data-kind="ports" data-id="${p.id}">Open</button></div></div>`}).join('')||empty('No port records')}</div>
  <div class="section-title"><div><h2>Visit history</h2><p>Arrival/departure, berth or anchorage, services used, quantities taken aboard, and lessons remain historically separate.</p></div></div><div class="card"><div class="card-body">${visits.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Arrival</th><th>Place</th><th>Berth / mode</th><th>Services</th><th>Fuel / water</th><th>Lessons</th><th></th></tr></thead><tbody>${visits.map(v=>{const p=state.ports.find(x=>x.id===v.portId),a=state.anchorages.find(x=>x.id===v.anchorageId);return `<tr><td>${dateTime(v.arrivedAt)}<div class="list-meta">${v.departedAt?`Departed ${dateTime(v.departedAt)}`:'Still present / departure not recorded'}</div></td><td><strong>${esc(p?.name||a?.name||'Unknown place')}</strong><div class="list-meta">${esc(v.visitType||'port')}</div></td><td>${esc(v.berth||'—')}</td><td>${esc(v.servicesUsed||'—')}</td><td>${v.fuelAdded??'—'} / ${v.waterAdded??'—'}</td><td>${esc(v.lessons||v.notes||'—')}</td><td><button class="ghost-btn" data-action="inspect-record" data-kind="portVisits" data-id="${v.id}">Open</button></td></tr>`}).join('')}</tbody></table></div>`:empty('No visit history','Record each actual stop so new knowledge does not overwrite previous experience.')}</div></div>
  <div class="section-title"><div><h2>Anchorage knowledge</h2><p>Anchorages share the same accumulated place-memory concept while deployments remain in the Anchor workspace.</p></div><button class="ghost-btn" data-action="go-anchor">Open Anchor</button></div><div class="grid cols-3">${visible(state.anchorages).map(a=>{const h=anchorageExperience(state,a.id);return `<div class="card"><div class="card-head"><div><div class="card-title">${esc(a.name)}</div><div class="card-sub">${esc(a.country||'')}</div></div></div><div class="card-body"><div class="list-meta">${esc(a.approach||'No approach notes')}<br>${esc(a.shoreAccess||'No shore-access notes')}<br>${esc(a.dinghyLanding||'No dinghy-landing notes')}</div><div class="metric-row" style="margin-top:10px">${metric('DEPLOYMENTS',String(h.deployments+(Number(a.legacyVisitCount)||0)),'Recorded experience')}${metric('MAX WIND',h.maxRecordedWindKt==null?'—':`${h.maxRecordedWindKt} kt`,'Historical observation')}</div></div><div class="card-foot"><span>${esc(a.bottom||'bottom unknown')}</span><button class="ghost-btn" data-action="inspect-record" data-kind="anchorages" data-id="${a.id}">Open</button></div></div>`}).join('')||empty('No anchorages')}</div>
  <div class="section-title"><div><h2>Ship’s papers</h2><p>Required documents are checked against the entered passage window as well as current expiration.</p></div><button class="primary-btn" data-action="add-document">+ Document</button></div>
  <div class="grid cols-4">${metric('REQUIRED',String(docs.filter(d=>d.requiredForDeparture!==false).length),'Included in readiness')}${metric('FAIL',String(docRows.filter(x=>x.c.status==='fail').length),'Expired records')}${metric('WATCH',String(docRows.filter(x=>x.c.status==='watch').length),'Voyage-window / near-term review')}${metric('VOYAGE WINDOW',vw.end?`${vw.start?dateOnly(vw.start.toISOString().slice(0,10)):'Now'} → ${dateOnly(vw.end.toISOString().slice(0,10))}`:'END UNKNOWN',v?v.name:'No voyage selected')}</div>
  <div class="card" style="margin-top:14px"><div class="card-body">${docRows.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Document</th><th>Holder / authority</th><th>Validity</th><th>Departure review</th><th>Source / confidence</th><th></th></tr></thead><tbody>${docRows.map(({d,c})=>`<tr><td><strong>${esc(d.name)}</strong><div class="list-meta">${esc(d.category||'other')} · ${esc(d.number||'No number')} · ${d.requiredForDeparture!==false?'required':'informational'}</div></td><td>${esc(d.holder||'Vessel')}<div class="list-meta">${esc(d.authority||d.country||'Authority unknown')}</div></td><td>${d.expires?dateOnly(d.expires):'No expiry recorded'}<div class="list-meta">Issued ${d.issued?dateOnly(d.issued):'unknown'}</div></td><td>${statusBadge(c.status)}<div class="list-meta" style="margin-top:5px">${esc(c.detail)}</div></td><td>${esc(d.source||'unknown')}<div class="list-meta">${statusBadge(d.confidence||'unknown')} · verified ${d.verifiedAt?dateOnly(d.verifiedAt):'unknown'}</div></td><td><button class="ghost-btn" data-action="inspect-record" data-kind="documents" data-id="${d.id}">Open</button></td></tr>`).join('')}</tbody></table></div>`:empty('No ship’s papers','Add vessel, crew, safety, permit, and qualification records used in departure review.')}</div></div>`;
}

function renderLogbook(){
  pageMeta('Logbook','OBSERVATION → WATCH → HANDOFF → HISTORY');
  const watches=visible(state.watches).slice().sort((a,b)=>new Date(b.start||b.startedAt||0)-new Date(a.start||a.startedAt||0)),handoffs=visible(state.watchHandoffs).slice().sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)),schedules=visible(state.watchSchedules).slice().sort((a,b)=>(a.order??999)-(b.order??999));
  content().innerHTML=`<div class="section-title"><div><h2>Watchkeeping</h2><p>Schedules define the intended rotation; watches and handoffs preserve what actually happened.</p></div><div class="action-row"><button class="ghost-btn" data-action="add-watch-schedule">+ Schedule</button>${activeWatch()?`<button class="primary-btn" data-action="end-watch" data-id="${activeWatch().id}">End current watch</button>`:`<button class="primary-btn" data-action="start-watch">Start watch</button>`}</div></div>
  <div class="grid cols-3">${schedules.map(ws=>`<div class="card"><div class="card-head"><div><div class="card-title">${esc(ws.name||`${ws.startTime}–${ws.endTime}`)}</div><div class="card-sub">${esc(ws.watchkeeper||'Unassigned')} · ${ws.enabled===false?'disabled':'enabled'}</div></div>${statusBadge(ws.enabled===false?'unknown':'pass')}</div><div class="card-foot"><span>${esc(ws.startTime||'—')}–${esc(ws.endTime||'—')}</span><div class="action-row"><button class="ghost-btn" data-action="start-watch" data-id="${ws.id}">Start</button><button class="ghost-btn" data-action="inspect-record" data-kind="watchSchedules" data-id="${ws.id}">Open</button></div></div></div>`).join('')||empty('No watch schedule','Add recurring watch slots for the current crew.')}</div>
  <div class="section-title"><div><h2>Recent watches & handoffs</h2><p>Handoffs are historical records and become immutable once recorded.</p></div></div><div class="grid cols-2"><div class="card"><div class="card-head"><div class="card-title">Watches</div></div><div class="card-body">${watches.slice(0,12).map(w=>`<div class="list-item"><div class="list-icon">◷</div><div><div class="list-title">${esc(w.watchkeeper||'Unassigned')} · ${esc(w.status||'unknown')}</div><div class="list-meta">${dateTime(w.start||w.startedAt)}${w.endedAt?` → ${dateTime(w.endedAt)}`:w.end?` → ${dateTime(w.end)}`:''} · ${esc(w.notes||'')}</div></div><div class="list-right">${statusBadge(w.status==='active'?'pass':'unknown')}<br><button class="ghost-btn" style="margin-top:5px" data-action="inspect-record" data-kind="watches" data-id="${w.id}">Open</button></div></div>`).join('')||empty('No watch records')}</div></div><div class="card"><div class="card-head"><div class="card-title">Handoffs</div></div><div class="card-body">${handoffs.slice(0,12).map(h=>`<div class="list-item"><div class="list-icon">⇄</div><div><div class="list-title">${esc(h.fromWatchkeeper||'Previous')} → ${esc(h.toWatchkeeper||'Incoming')}</div><div class="list-meta">${dateTime(h.createdAt)} · ${esc(h.summary||h.plan||'No summary')}</div></div><div class="list-right">${statusBadge(h.status==='acknowledged'?'pass':'watch')}<br>${h.status!=='acknowledged'?`<button class="ghost-btn" style="margin-top:5px" data-action="ack-handoff" data-id="${h.id}">Acknowledge</button>`:`<button class="ghost-btn" style="margin-top:5px" data-action="inspect-record" data-kind="watchHandoffs" data-id="${h.id}">Open</button>`}</div></div>`).join('')||empty('No handoffs')}</div></div></div>
  <div class="section-title"><div><h2>Permanent operational history</h2><p>Fast entry suitable for underway use.</p></div><button class="primary-btn" data-action="quick-log">+ Log entry</button></div><div class="card"><div class="card-body"><div class="list">${[...visible(state.logs)].sort((a,b)=>new Date(b.at)-new Date(a.at)).map(l=>`<div class="list-item"><div class="list-icon">${esc((l.category||'?').slice(0,1).toUpperCase())}</div><div><div class="list-title">${esc(l.title||l.category)}</div><div class="list-meta">${dateTime(l.at)} · ${esc(l.author||'Unknown')} · ${esc(l.category||'routine')}${l.lat!=null?` · ${(+l.lat).toFixed(2)}°, ${(+l.lon).toFixed(2)}°`:''}</div><div style="margin-top:6px;font-size:11px;line-height:1.5">${esc(l.text||'')}</div></div><button class="ghost-btn" data-action="inspect-record" data-kind="logs" data-id="${l.id}">Open</button></div>`).join('')||empty('No log entries')}</div></div></div>`;
}

function historyIcon(kind){return {voyage:'◈',maintenance:'⚙',inspection:'◇',finding:'!',port:'⌖',procedure:'✓',anchor:'⚓',equipment:'▣',evidence:'▱',incident:'▲',log:'▱',milestone:'◆'}[kind]||'•';}
function evidencePreview(e){
  if(e.dataUrl&&String(e.mimeType||'').startsWith('image/')) return `<div class="evidence-preview"><img src="${esc(e.dataUrl)}" alt="${esc(e.title||'Evidence image')}"></div>`;
  return `<div class="evidence-placeholder">${esc((e.kind||'record').slice(0,1).toUpperCase())}</div>`;
}
function renderHistory(){
  pageMeta('History','EVIDENCE → TIMELINE → VESSEL MEMORY');
  const ev=visible(state.evidence).slice().sort((a,b)=>new Date(b.observedAt||b.capturedAt||b.createdAt||0)-new Date(a.observedAt||a.capturedAt||a.createdAt||0));
  const kinds=[...new Set(vesselTimeline(state).map(x=>x.kind))].sort();
  const rows=vesselTimeline(state,{kind:state.settings.timelineKind||'',systemId:state.settings.timelineSystemId||'',voyageId:state.settings.timelineVoyageId||'',limit:300});
  const linkedCount=ev.filter(x=>evidenceRelatedRecords(state,x.id).length).length, embedded=ev.filter(x=>x.dataUrl).length;
  content().innerHTML=`<div class="section-title"><div><h2>Evidence Cabinet</h2><p>One evidence item can support multiple vessel records without duplicate uploads.</p></div><div class="action-row"><button class="ghost-btn" data-action="add-timeline-event">+ Milestone</button><button class="primary-btn" data-action="add-evidence">+ Evidence</button></div></div>
  <div class="grid cols-4">${metric('EVIDENCE ITEMS',String(ev.length),'Photos, documents, receipts, notes')}${metric('LINKED',String(linkedCount),'Supports one or more records')}${metric('EMBEDDED FILES',String(embedded),'Stored inside local AFLOAT backup')}${metric('TIMELINE EVENTS',String(vesselTimeline(state).length),'Derived + custom vessel history')}</div>
  <div class="evidence-grid" style="margin-top:14px">${ev.map(e=>{const rel=evidenceRelatedRecords(state,e.id);return `<div class="card evidence-card">${evidencePreview(e)}<div class="card-head"><div><div class="card-title">${esc(e.title||e.name||'Evidence')}</div><div class="card-sub">${esc(e.kind||'record')} · ${e.observedAt?dateTime(e.observedAt):dateTime(e.createdAt)}</div></div>${statusBadge(e.dataUrl?'pass':'info')}</div><div class="card-body"><div class="list-meta">${esc(e.source||'unknown source')} · ${esc(e.capturedBy||'unknown creator')}</div><div style="margin-top:7px;font-size:11px;line-height:1.5">${esc(e.notes||'No notes.')}</div><div class="evidence-links">${rel.slice(0,4).map(r=>`<span class="relation-tag">${esc(r.type)} · ${esc(recordLabel(r.record))}</span>`).join('')||'<span class="muted">Not yet linked</span>'}</div></div><div class="card-foot"><span>${e.originalFilename?esc(e.originalFilename):'Metadata record'}${e.sizeBytes?` · ${fmt(e.sizeBytes/1024,0)} KB`:''}</span><div class="action-row">${e.dataUrl?`<button class="ghost-btn" data-action="download-evidence" data-id="${e.id}">Open file</button>`:''}<button class="ghost-btn" data-action="inspect-record" data-kind="evidence" data-id="${e.id}">Open</button></div></div></div>`}).join('')||empty('No evidence yet','Add a photo, document, receipt, measurement file, weather snapshot, or evidence note.')}</div>
  <div class="section-title"><div><h2>Vessel Timeline</h2><p>One chronological view across voyages, repairs, inspections, ports, procedures, findings, anchor events, evidence, incidents, and milestones.</p></div></div>
  <div class="card"><div class="card-body"><div class="history-filters"><div class="field"><label>Event type</label><select id="timelineKind"><option value="">All types</option>${kinds.map(k=>`<option value="${esc(k)}" ${state.settings.timelineKind===k?'selected':''}>${esc(k)}</option>`).join('')}</select></div><div class="field"><label>System</label><select id="timelineSystem"><option value="">All systems</option>${visible(state.systems).map(x=>`<option value="${x.id}" ${state.settings.timelineSystemId===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></div><div class="field"><label>Voyage</label><select id="timelineVoyage"><option value="">All voyages</option>${visible(state.voyages).map(x=>`<option value="${x.id}" ${state.settings.timelineVoyageId===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></div><div class="field"><label>Find in timeline</label><input id="timelineQuery" type="search" placeholder="engine, Horta, rig…"></div></div></div></div>
  <div id="timelineRows" class="timeline">${timelineRowsHtml(rows)}</div>`;
}
function timelineRowsHtml(rows){return rows.length?rows.map(x=>`<div class="timeline-row" data-timeline-text="${esc(`${x.title} ${x.detail} ${x.kind}`.toLowerCase())}"><div class="timeline-date">${dateTime(x.at)}</div><div class="timeline-rail"><span>${esc(x.icon||historyIcon(x.kind))}</span></div><div class="timeline-content"><div class="list-title">${esc(x.title)}</div><div class="list-meta">${esc(x.kind)}${x.systemId?` · ${esc(sysName(x.systemId))}`:''}</div>${x.detail?`<div class="timeline-detail">${esc(x.detail)}</div>`:''}</div><div class="timeline-action">${x.collection&&x.id?`<button class="ghost-btn" data-action="inspect-record" data-kind="${esc(x.collection)}" data-id="${esc(x.id)}">Open</button>`:''}</div></div>`).join(''):empty('No timeline events match the current filters');}
function bindHistoryFilters(){
  const rerender=()=>{state.settings.timelineKind=$('#timelineKind')?.value||'';state.settings.timelineSystemId=$('#timelineSystem')?.value||'';state.settings.timelineVoyageId=$('#timelineVoyage')?.value||'';scheduleSave();const rows=vesselTimeline(state,{kind:state.settings.timelineKind,systemId:state.settings.timelineSystemId,voyageId:state.settings.timelineVoyageId,query:$('#timelineQuery')?.value||'',limit:300});const host=$('#timelineRows');if(host)host.innerHTML=timelineRowsHtml(rows);};
  ['#timelineKind','#timelineSystem','#timelineVoyage'].forEach(sel=>{$(sel)?.addEventListener('change',rerender);}); $('#timelineQuery')?.addEventListener('input',rerender);
}


function intelDateRange(range){return range?.from&&range?.to?`${dateOnly(range.from.slice(0,10))} → ${dateOnly(range.to.slice(0,10))}`:'Insufficient dated observations';}
function intelSpread(stats,d=2,unit=''){if(!stats||!stats.n||!Number.isFinite(stats.mean))return 'UNKNOWN';return `${fmt(stats.mean,d)}${unit?` ${unit}`:''}${Number.isFinite(stats.sd)?` ± ${fmt(stats.sd,d)} (1σ)`:''}`;}
function intelDelta(v){if(!Number.isFinite(v))return '<span class="muted">UNKNOWN</span>';const cls=Math.abs(v)<=5?'pass':Math.abs(v)<=15?'watch':'fail';return `<span class="status ${cls}">${v>=0?'+':''}${fmt(v,1)}%</span>`;}
function renderIntelligence(){
  pageMeta('Intelligence','HISTORY → OBSERVATION → MODEL → CALIBRATION');
  const intel=historicalIntelligence(state),fuel=intel.fuel,water=intel.water,energy=intel.energy,maint=intel.maintenance,profile=activeEnergyProfile();
  const target=fuel.target, fuelUnit=fuel.resource?.unit||'unit', waterUnit=water.resource?.unit||'unit';
  const maintenanceIntervals=maint.reduce((n,x)=>n+x.stats.n,0);
  const fuelRows=fuel.groups.map(g=>`<tr><td>${g.rpm??'Unspecified'}</td><td>${g.burn.n}</td><td>${intelSpread(g.burn,2,`${fuelUnit}/hr`)}</td><td>${g.speed.n?intelSpread(g.speed,2,'kt'):'—'}</td><td>${esc(intelDateRange(g.range))}</td></tr>`).join('');
  const waterRows=water.samples.slice().sort((a,b)=>new Date(b.at)-new Date(a.at)).map(x=>`<tr><td>${dateTime(x.at)}</td><td>${fmt(x.vesselPerDay,2)} ${esc(waterUnit)}/day</td><td>${x.perPersonPerDay!==null?`${fmt(x.perPersonPerDay,2)} ${esc(waterUnit)}/person-day`:'—'}</td><td>${esc(x.context||'unclassified')}</td><td>${esc(x.source)}</td></tr>`).join('');
  const energyRows=energy.samples.slice().sort((a,b)=>new Date(b.at)-new Date(a.at)).map(x=>`<tr><td>${dateTime(x.at)}</td><td>${esc(state.energyProfiles.find(p=>p.id===x.energyProfileId)?.name||x.context||'Unspecified')}</td><td>${fmt(Number(x.predictedUseKwh),2)} → ${fmt(Number(x.actualUseKwh),2)} kWh</td><td>${intelDelta(x.loadDeltaPct)}</td><td>${fmt(Number(x.predictedGenerationKwh),2)} → ${fmt(Number(x.actualGenerationKwh),2)} kWh</td><td>${intelDelta(x.generationDeltaPct)}</td><td><button class="ghost-btn" data-action="inspect-record" data-kind="energyObservations" data-id="${esc(x.id)}">Open</button></td></tr>`).join('');
  const maintRows=maint.map(m=>`<tr><td>${esc(m.task.name)}</td><td>${esc(m.basis)}</td><td>${m.stats.n}</td><td>${intelSpread(m.stats,0,m.unit)}</td><td>${m.planned!==null?`${fmt(m.planned,0)} ${esc(m.unit)}`:'—'}</td><td>${intelDelta(m.differencePct)}</td><td>${esc(intelDateRange(m.range))}</td></tr>`).join('');
  const obs=intel.observations.map(o=>`<div class="intel-observation"><div class="intel-observation-head"><strong>${esc(o.title)}</strong>${statusBadge(o.confidence)}</div><div>${esc(o.text)}</div><div class="list-meta">${o.samples} sample${o.samples===1?'':'s'} · ${esc(intelDateRange({from:o.from,to:o.to}))} · source: ${esc(o.source)}</div></div>`).join('');
  content().innerHTML=`<div class="callout"><strong>Historical observations, not guarantees.</strong> AFLOAT derives these models only from recorded vessel history. Small samples, changing conditions, measurement error, maintenance changes, fouling, sea state, crew behavior, and sensor quality can materially change future performance.</div>
  <div class="grid cols-4" style="margin-top:14px">${metric('FUEL SAMPLES',String(fuel.samples.length),'Explicit hours + quantity')}${metric('WATER SAMPLES',String(water.samples.length),'Known-duration consumption')}${metric('ENERGY DAYS',String(energy.samples.length),'Predicted vs observed')}${metric('MAINT INTERVALS',String(maintenanceIntervals),'Derived between services')}</div>
  <div class="section-title"><div><h2>Vessel-specific observations</h2><p>Plain-language summaries retain sample size, date range, source and observational confidence.</p></div><button class="primary-btn" data-action="add-energy-observation">+ Energy observation</button></div>
  <div class="intel-observations">${obs||empty('Not enough history yet','Record repeated fuel, water, energy and maintenance observations before AFLOAT forms historical summaries.')}</div>
  <div class="section-title"><div><h2>Fuel performance</h2><p>Observed quantity ÷ explicit engine-run hours, grouped by recorded RPM. Speed is derived only when distance is also recorded.</p></div></div>
  <div class="grid cols-4">${metric('PLANNING RPM',fuel.planningRpm??'UNKNOWN','Current resource assumption')}${metric('PLANNING BURN',fuel.planningBurn!==null?`${fmt(fuel.planningBurn,2)} ${fuelUnit}/hr`:'UNKNOWN','Entered planning value')}${metric('OBSERVED NEAR PLAN',target?`${fmt(target.burn.mean,2)}${target.burn.sd!==null?` ± ${fmt(target.burn.sd,2)}`:''}`:'UNKNOWN',target?`${fuelUnit}/hr · ${target.burn.n} sample(s) near ${target.rpm} RPM`:'No RPM samples')}${metric('MODEL DIFFERENCE',Number.isFinite(fuel.targetDifferencePct)?`${fuel.targetDifferencePct>=0?'+':''}${fmt(fuel.targetDifferencePct,1)}%`:'UNKNOWN','Observed vs planning value')}</div>
  <div class="table-wrap" style="margin-top:14px"><table><thead><tr><th>RPM</th><th>N</th><th>Observed burn</th><th>Observed speed</th><th>Date range</th></tr></thead><tbody>${fuelRows||'<tr><td colspan="5">No fuel observations with explicit engine-run hours.</td></tr>'}</tbody></table></div>
  <div class="section-title"><div><h2>Water-use history</h2><p>Consumption records with explicit represented duration. Per-person values are shown only when crew count was recorded for the observation.</p></div></div>
  <div class="grid cols-4">${metric('OBSERVED MEAN',water.vessel.n?`${fmt(water.vessel.mean,2)}${water.vessel.sd!==null?` ± ${fmt(water.vessel.sd,2)}`:''}`:'UNKNOWN',`${waterUnit}/day · ${water.vessel.n} vessel-rate samples`)}${metric('MEDIAN',water.vessel.n?`${fmt(water.vessel.median,2)} ${waterUnit}/day`:'UNKNOWN','Less sensitive to outliers')}${metric('CONSERVATIVE OBS.',Number.isFinite(water.conservativeRate)?`${fmt(water.conservativeRate,2)} ${waterUnit}/day`:'UNKNOWN','Mean + 1σ; observation only')}${metric('PLAN DIFFERENCE',Number.isFinite(water.differencePct)?`${water.differencePct>=0?'+':''}${fmt(water.differencePct,1)}%`:'UNKNOWN','Observed vs entered daily-use assumption')}</div>
  <div class="table-wrap" style="margin-top:14px"><table><thead><tr><th>Date</th><th>Vessel rate</th><th>Per person</th><th>Context</th><th>Source</th></tr></thead><tbody>${waterRows||'<tr><td colspan="5">No water transactions with explicit duration.</td></tr>'}</tbody></table></div>
  <div class="section-title"><div><h2>Energy — predicted vs observed</h2><p>Daily operating observations compare the selected model/profile against what the crew actually recorded.</p></div><div class="action-row"><span class="muted">Active model: ${esc(profile?.name||'none')}</span><button class="ghost-btn" data-action="add-energy-observation">Record day</button></div></div>
  <div class="grid cols-4">${metric('ACTUAL LOAD',intelSpread(energy.actualUse,2,'kWh/day'),`${energy.actualUse.n} observation(s)`)}${metric('LOAD ERROR',Number.isFinite(energy.loadDeltaPct.mean)?`${energy.loadDeltaPct.mean>=0?'+':''}${fmt(energy.loadDeltaPct.mean,1)}%`:'UNKNOWN','Actual vs predicted')}${metric('ACTUAL GENERATION',intelSpread(energy.actualGeneration,2,'kWh/day'),`${energy.actualGeneration.n} observation(s)`)}${metric('GEN ERROR',Number.isFinite(energy.generationDeltaPct.mean)?`${energy.generationDeltaPct.mean>=0?'+':''}${fmt(energy.generationDeltaPct.mean,1)}%`:'UNKNOWN','Actual vs predicted')}</div>
  <div class="table-wrap" style="margin-top:14px"><table><thead><tr><th>Date</th><th>Profile</th><th>Load predicted → actual</th><th>Δ</th><th>Generation predicted → actual</th><th>Δ</th><th></th></tr></thead><tbody>${energyRows||'<tr><td colspan="7">No energy observations recorded.</td></tr>'}</tbody></table></div>
  <div class="section-title"><div><h2>Maintenance interval observations</h2><p>Intervals are derived from repeated completion records. They describe what has happened, not what the maintenance interval should be.</p></div></div>
  <div class="table-wrap"><table><thead><tr><th>Task</th><th>Basis</th><th>N intervals</th><th>Observed interval</th><th>Configured</th><th>Difference</th><th>Date range</th></tr></thead><tbody>${maintRows||'<tr><td colspan="7">Repeated maintenance history is not yet sufficient to calculate intervals.</td></tr>'}</tbody></table></div>`;
}

function renderFindings(){
  pageMeta('Findings','OBSERVATION → SEVERITY → CONFIDENCE → ACTION'); const open=state.findings.filter(f=>!['resolved','accepted'].includes((f.status||'').toLowerCase()));
  content().innerHTML=`<div class="section-title"><div><h2>Central findings register</h2><p>Findings remain traceable to source, system, action, and status.</p></div><button class="primary-btn" data-action="add-finding">+ Finding</button></div><div class="grid cols-4">${metric('OPEN',open.length,'Unresolved')}${metric('HIGH / CRITICAL',open.filter(f=>['high','critical'].includes(f.severity)).length,'Needs attention')}${metric('DEFERRED',state.findings.filter(f=>f.status==='deferred').length,'Explicitly deferred')}${metric('RESOLVED',state.findings.filter(f=>f.status==='resolved').length,'History preserved')}</div><div class="card" style="margin-top:14px"><div class="card-body">${visible(state.findings).map(f=>`<div class="list-item"><div class="list-icon">!</div><div><div class="list-title">${esc(f.title)}</div><div class="list-meta">${esc(sysName(f.systemId))} · source ${esc(f.source||'manual')} · due ${f.due?dateOnly(f.due):'not set'}</div><div style="margin-top:5px;font-size:11px">${esc(f.description||'')}</div><div class="list-meta" style="margin-top:4px">Action: ${esc(f.action||'No recommended action recorded')}</div></div><div class="list-right">${statusBadge(f.severity)} ${statusBadge(f.confidence)}<br><span class="status ${f.status==='resolved'?'pass':'unknown'}" style="margin-top:5px">${esc((f.status||'open').toUpperCase())}</span><br><button class="ghost-btn" data-action="inspect-record" data-kind="findings" data-id="${f.id}" style="margin-top:5px">Open</button></div></div>`).join('')||empty('No findings')}</div></div>`;
}

function renderReports(){
  pageMeta('Reports','PRINT-QUALITY OPERATIONAL EVIDENCE');
  const reports=[
    ['readiness','Departure Readiness Report','Readiness disposition, dependencies, baselines, findings, assumptions and evidence.'],
    ['passage','Passage Plan','Route, passage scenarios, weather records, assumptions and voyage evidence.'],
    ['health','Vessel Health Report','System state, open findings and linked evidence.'],
    ['maintenance','Maintenance Due Report','Task status, due points, required spares and supporting evidence.'],
    ['resources','Resource Endurance Report','Fuel, water and consumable endurance with rate provenance.'],
    ['energy','Energy Budget','Storage, loads, generation and current operating profile.'],
    ['inventory','Spare Parts Inventory','Stock, minimums, locations, supported equipment and evidence.'],
    ['watch','Watch Log','Watch history, handoffs and voyage context.'],
    ['papers','Ship’s Papers & Voyage Compliance','Voyage-window document compliance and source confidence.'],
    ['procedures','Procedure Execution History','Procedure library plus immutable execution history.'],
    ['arrival','Port Arrival Brief','Destination or most-relevant port knowledge, papers and recent visit history.'],
    ['anchorage','Anchorage Report','Active anchorage plan, ground tackle and recorded deployment experience.'],
    ['incident','Incident Report','Incident log entries, findings and available evidence references.'],
    ['history','Evidence & Vessel Timeline','Evidence register and unified chronological vessel history.'],
    ['intelligence','Historical Vessel Intelligence','Fuel, water, energy and maintenance observations with sample size and uncertainty.'],
    ['findings','Findings Register','Severity, confidence, action and evidence references.'],
    ['overview','Vessel Overview','System-of-systems summary, readiness, assumptions and evidence.']
  ];
  const ev=visible(state.evidence).length,unknown=readiness(state).results.filter(r=>r.status==='unknown').length;
  content().innerHTML=`<div class="grid cols-4">${metric('REPORT TYPES',String(reports.length),'Operational and review packages')}${metric('EVIDENCE ITEMS',String(ev),'Available for report references')}${metric('UNKNOWN STATES',String(unknown),'Remain explicit in reports')}${metric('SCHEMA',`v${state.schemaVersion}`,'Report data model')}</div><div class="section-title"><div><h2>Report center</h2><p>Reports open as local print previews with repeating table headers, evidence references, assumptions and explicit UNKNOWN values.</p></div></div><div class="report-grid">${reports.map(([k,n,d])=>`<div class="card report-card"><div class="card-head"><div><div class="card-title">${esc(n)}</div><div class="card-sub">${esc(d)}</div></div></div><div class="card-foot"><span>Local HTML · Print / Save PDF</span><button class="primary-btn" data-action="report" data-kind="${k}">Preview</button></div></div>`).join('')}</div>`;
}

function renderSettings(){
  pageMeta('Settings','LOCAL DATA → PORTABILITY → CONTROL'); const health=dataHealth();
  content().innerHTML=`<div class="grid cols-2"><div class="card"><div class="card-head"><div><div class="card-title">Appearance</div><div class="card-sub">Saved with the vessel backup.</div></div></div><div class="card-body"><div class="form-grid"><div class="field"><label>Theme</label><select id="themeSelect"><option value="light" ${state.settings.theme==='light'?'selected':''}>Light</option><option value="dark" ${state.settings.theme==='dark'?'selected':''}>Dark</option><option value="night" ${state.settings.theme==='night'?'selected':''}>Night / red-preserving</option></select></div><div class="field"><label>Units</label><select id="unitsSelect"><option value="marine" ${state.settings.units==='marine'?'selected':''}>Marine / US customary</option><option value="metric" ${state.settings.units==='metric'?'selected':''}>Metric</option></select></div></div></div></div>
  <div class="card"><div class="card-head"><div><div class="card-title">Vessel preferences</div><div class="card-sub">Review limits, not declarations of safety.</div></div></div><div class="card-body"><div class="form-grid"><div class="field"><label>Preferred max sustained wind (kt)</label><input id="limWind" type="number" value="${esc(state.settings.limits.maxWindKt??'')}"></div><div class="field"><label>Preferred max significant wave (m)</label><input id="limWave" type="number" step="0.1" value="${esc(state.settings.limits.maxWaveM??'')}"></div></div><button class="primary-btn" data-action="save-limits" style="margin-top:10px">Save preferences</button></div></div></div>
  <div class="section-title"><div><h2>Local data health & recovery</h2><p>Verify that the working dataset and a recovery file are structurally usable before you need them.</p></div></div>
  <div class="recovery-health">${metric('DATA MODEL',health.ok?'VALID':'REVIEW',`Schema v${state.schemaVersion||'?'}`)}${metric('SHARED RECORDS',String(health.count),'Across AFLOAT workspaces')}${metric('LAST LOCAL CHANGE',health.updatedLabel,'Autosaved in IndexedDB')}${metric('LAST BACKUP',health.lastBackup,state.settings.lastBackupAt?`${state.settings.lastBackupRecordCount||'—'} records at export`:'Export a recovery copy')}</div>
  <div class="grid cols-3" style="margin-top:12px"><div class="card"><div class="card-head"><div><div class="card-title">Export recovery copy</div><div class="card-sub">Portable JSON snapshot of the entire vessel state.</div></div></div><div class="card-foot"><span>AFLOAT schema v${state.schemaVersion||1}</span><button class="primary-btn" data-action="export-backup">Export</button></div></div><div class="card"><div class="card-head"><div><div class="card-title">Verify backup file</div><div class="card-sub">Dry-run validation and migration without changing local data.</div></div></div><div class="card-foot"><span>Non-destructive</span><button class="ghost-btn" data-action="verify-backup">Verify</button></div></div><div class="card"><div class="card-head"><div><div class="card-title">Restore backup</div><div class="card-sub">Validate, migrate, then replace the current local vessel.</div></div></div><div class="card-foot"><span>Explicit action</span><button class="ghost-btn" data-action="import-backup">Import</button></div></div></div>
  <div class="section-title engineering-only"><div><h2>Data freshness</h2><p>Thresholds control when source-backed operational data becomes stale or UNKNOWN.</p></div></div><div class="card engineering-only"><div class="card-body"><div class="form-grid"><div class="field"><label>Weather stale after (hr)</label><input id="freshWeather" type="number" min="1" value="${esc(state.settings?.freshness?.weatherHours??12)}"></div><div class="field"><label>Position stale after (min)</label><input id="freshPosition" type="number" min="1" value="${esc(state.settings?.freshness?.positionMinutes??60)}"></div><div class="field"><label>Resource readings stale after (hr)</label><input id="freshResource" type="number" min="1" value="${esc(state.settings?.freshness?.resourceHours??48)}"></div><div class="field"><label>Measurements stale after (hr)</label><input id="freshMeasurement" type="number" min="1" value="${esc(state.settings?.freshness?.measurementHours??72)}"></div></div><button class="primary-btn" data-action="save-freshness" style="margin-top:10px">Save freshness thresholds</button></div></div>
  <div class="section-title"><div><h2>Demo / fresh start</h2><p>Destructive actions remain separated from backup and recovery controls.</p></div></div><div class="card"><div class="card-foot"><span>Current vessel: ${esc(state.vessel.name)}</span><div class="action-row"><button class="ghost-btn" data-action="load-demo">Load demo</button><button class="danger-btn" data-action="fresh-start">Fresh start</button></div></div></div>
  <div class="section-title"><div><h2>Privacy & offline behavior</h2></div></div><div class="callout"><strong>Stored locally:</strong> primary AFLOAT data is stored in this browser’s IndexedDB. The service worker caches application assets for offline use. No account, telemetry, advertising, analytics, or background upload is implemented. Export backups before clearing browser/site data.</div>
  <div class="section-title engineering-only"><div><h2>Future integrations</h2><p>Manual entry remains first-class.</p></div></div><div class="card engineering-only"><div class="card-body"><div class="table-wrap" tabindex="0"><table class="table"><thead><tr><th>Adapter</th><th>Status</th><th>Intent</th></tr></thead><tbody><tr><td>Signal K</td><td>${statusBadge('unknown')}</td><td>Planned adapter boundary; not connected in v${APP_VERSION}.</td></tr><tr><td>NMEA 0183 / 2000</td><td>${statusBadge('unknown')}</td><td>Planned optional onboard service; not connected.</td></tr><tr><td>GPX route interchange</td><td>${statusBadge('pass')}</td><td>Local GPX route import/export implemented.</td></tr><tr><td>Live GPS</td><td>${statusBadge('unknown')}</td><td>Manual position supported; live GPS remains a future adapter.</td></tr></tbody></table></div></div></div>`;
  $('#themeSelect').onchange=e=>{state.settings.theme=e.target.value;applySettings();scheduleSave();}; $('#unitsSelect').onchange=e=>{state.settings.units=e.target.value;scheduleSave();toast('Unit preference saved. Detailed automatic conversion remains planned for a later release.');};
}

function handleAction(action,recordId,kind){
  const map={
    'quick-log':quickLogModal,'go-findings':()=>go('findings'),'go-voyage':()=>go('voyage'),'go-resources':()=>go('resources'),
    'edit-vessel':()=>editVesselModal(),'edit-voyage':()=>editVoyageModal(),'add-weather':()=>weatherModal(),'edit-weather':()=>weatherModal(recordId),'add-waypoint':()=>waypointModal(),'import-gpx':()=>$('#gpxImport')?.click(),'export-gpx':exportCurrentGpx,'add-voyage-scenario':()=>voyageScenarioModal(),
    'update-position':positionObservationModal,'capture-baseline':captureBaselineModal,'begin-passage':beginPassageConfirm,'complete-passage':completePassageConfirm,'add-watch-schedule':()=>watchScheduleModal(),'start-watch':()=>startWatchModal(recordId),'end-watch':()=>endWatchModal(recordId),'ack-handoff':()=>ackHandoffModal(recordId),
    'add-assumption':()=>assumptionModal(),'edit-assumption':()=>assumptionModal(recordId),'edit-anchor':()=>anchorModal(selectedAnchorage()?.id),'add-anchor':()=>anchorModal(),'edit-anchor-id':()=>anchorModal(recordId),'select-anchorage':()=>{state.settings.activeAnchorageId=recordId;scheduleSave();renderPage();},'add-ground-tackle':()=>groundTackleModal(),'add-anchor-deployment':()=>anchorDeploymentModal(),'add-anchor-position':()=>anchorPositionModal(null,recordId),'go-anchor':()=>go('anchor'),
    'add-system':()=>systemModal(),'edit-system':()=>systemModal(recordId),'add-equipment':()=>equipmentModal(),'edit-equipment':()=>equipmentModal(recordId),'add-component':()=>componentModal(),
    'add-maintenance':()=>maintenanceModal(),'edit-maintenance':()=>maintenanceModal(recordId),'complete-maintenance':()=>completeMaintenanceModal(recordId),'add-inspection':()=>inspectionModal(),'add-measurement':()=>measurementModal(),
    'inspect-record':()=>openInspector(kind,recordId),'close-inspector':closeInspector,'edit-inspected':()=>editRecord(kind,recordId),'duplicate-record':()=>duplicateAny(kind,recordId),'archive-record':()=>archiveAny(kind,recordId),'delete-record':()=>deleteAny(kind,recordId),'add-relationship':()=>relationshipModal(kind,recordId),'toggle-archived':()=>{state.settings.showArchived=!state.settings.showArchived;scheduleSave();renderPage();},
    'add-resource':()=>resourceModal(),'edit-resource':()=>resourceModal(recordId),'add-tank':()=>tankModal(),'edit-tank':()=>tankModal(recordId),'record-resource':()=>resourceTransactionModal(recordId),'add-provision':()=>provisionModal(),'edit-provision':()=>provisionModal(recordId),'add-energy-observation':()=>energyObservationModal(recordId),'add-energy-bank':()=>energyBankModal(),'edit-energy-bank':()=>energyBankModal(recordId),'add-energy-profile':()=>energyProfileModal(),'activate-energy-profile':()=>{state.settings.activeEnergyProfileId=recordId;scheduleSave();renderPage();},'add-load':()=>loadModal(),'edit-load':()=>loadModal(recordId),'add-source':()=>sourceModal(),'edit-source':()=>sourceModal(recordId),
    'add-inventory':()=>inventoryModal(),'edit-inventory':()=>inventoryModal(recordId),'adjust-inventory':()=>inventoryAdjustModal(recordId),'add-storage-location':()=>storageLocationModal(),'edit-storage-location':()=>storageLocationModal(recordId),'add-procedure':()=>procedureModal(),'edit-procedure':()=>procedureModal(recordId),'run-procedure':()=>runProcedure(recordId),'resume-procedure-execution':()=>procedureExecutionModal(recordId),
    'add-port':()=>portModal(),'edit-port':()=>portModal(recordId),'add-port-visit':()=>portVisitModal(null,recordId),'add-document':()=>documentModal(),'edit-document':()=>documentModal(recordId),
    'edit-log':()=>logModal(recordId),'add-evidence':()=>evidenceModal(),'add-evidence-to-record':()=>evidenceModal('',kind,recordId),'download-evidence':()=>downloadEvidence(recordId),'add-timeline-event':()=>timelineEventModal(),'go-history':()=>go('history'),'add-finding':()=>findingModal(),'edit-finding':()=>findingModal(recordId),'report':()=>generateReport(kind),
    'save-limits':saveLimits,'save-freshness':saveFreshness,'export-backup':exportBackup,'verify-backup':()=>$('#fileVerify').click(),'import-backup':()=>$('#fileImport').click(),'load-demo':loadDemoConfirm,'fresh-start':freshStartConfirm
  }; (map[action]||(()=>{}))();
}
function go(p){page=p;renderNav();renderPage();}

function createVesselModal(reload=false){
  modal({title:'Create Vessel',body:formGrid(field('Vessel name','name','', 'text',{required:true}),field('Type','type',''),field('Home port','homePort',''),field('Length (ft)','lengthFt','','number',{step:'0.1'})),submitLabel:'Create vessel',onSubmit:async fd=>{state=blankState(fd.get('name'));state.vessel.type=fd.get('type');state.vessel.homePort=fd.get('homePort');state.vessel.lengthFt=Number(fd.get('lengthFt'))||null;await saveState(state);closeModal();reload?location.reload():renderShell();}});
}
function editVesselModal(){const v=state.vessel;modal({title:'Vessel',body:formGrid(field('Name','name',v.name,'text',{required:true}),field('Type','type',v.type),field('Home port','homePort',v.homePort),field('Status','status',v.status,'select',{options:[['in-port','In port'],['at-anchor','At anchor'],['underway','Underway']].map(([value,label])=>({value,label}))}),field('Engine hours','engineHours',v.engineHours,'number',{step:'0.1'}),field('Cruise speed (kt)','cruiseSpeedKt',v.cruiseSpeedKt??'','number',{step:'0.1'}),field('Notes','notes',v.notes,'textarea',{full:true})),onSubmit:fd=>{mutate(s=>Object.assign(s.vessel,{name:fd.get('name'),type:fd.get('type'),homePort:fd.get('homePort'),status:fd.get('status'),engineHours:+fd.get('engineHours')||0,cruiseSpeedKt:+fd.get('cruiseSpeedKt')||null,notes:fd.get('notes')}),'Vessel updated');closeModal();}});}
function editVoyageModal(){const v=activeVoyage()||{};modal({title:v.id?'Edit Passage':'Create Passage',body:formGrid(field('Passage name','name',v.name||'', 'text',{required:true}),field('Status','status',v.status||'planned','select',{options:['planned','active','completed']}),field('Origin','origin',v.origin||''),field('Destination','destination',v.destination||''),field('Distance (nm)','distanceNm',v.distanceNm??'','number',{step:'0.1'}),field('Distance source','distanceSource',v.distanceSource||'entered','select',{options:[{value:'entered',label:'Entered estimate'},{value:'route',label:'Route waypoint geometry'}]}),field('Progress (nm)','progressNm',v.progressNm??0,'number',{step:'0.1'}),field('Expected / current speed (kt)','speedKt',v.speedKt??state.vessel.cruiseSpeedKt??'','number',{step:'0.1'}),field('Planned departure','plannedDeparture',v.plannedDeparture||v.departedAt?.slice(0,10)||'','date'),field('Planned arrival','plannedArrival',v.plannedArrival||v.eta||'','date'),field('ETA','eta',v.eta||'','date'),field('Latitude','lat',v.position?.lat??'','number',{step:'0.0001'}),field('Longitude','lon',v.position?.lon??'','number',{step:'0.0001'}),field('Alternates / bailout ports','alternates',v.alternates||'','textarea',{full:true}),field('Notes','notes',v.notes||'','textarea',{full:true})),onSubmit:fd=>{mutate(s=>{const obj={...v,id:v.id||id('voy'),name:fd.get('name'),status:fd.get('status'),origin:fd.get('origin'),destination:fd.get('destination'),distanceNm:+fd.get('distanceNm')||null,distanceSource:fd.get('distanceSource'),progressNm:+fd.get('progressNm')||0,speedKt:+fd.get('speedKt')||null,plannedDeparture:fd.get('plannedDeparture'),plannedArrival:fd.get('plannedArrival'),eta:fd.get('eta'),position:fd.get('lat')!==''&&fd.get('lon')!==''?{lat:+fd.get('lat'),lon:+fd.get('lon')}:v.position||null,alternates:fd.get('alternates'),notes:fd.get('notes')};if(obj.status==='active')s.voyages.forEach(x=>x.status=x.id===obj.id?'active':x.status==='active'?'planned':x.status);const i=s.voyages.findIndex(x=>x.id===obj.id);if(i>=0)s.voyages[i]=obj;else s.voyages.push(obj);},'Passage saved');closeModal();}});}
function localInputDate(d=new Date()){const z=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;}
function scheduleDateTimes(ws,base=new Date()){const parse=t=>String(t||'00:00').split(':').map(Number),[sh,sm]=parse(ws?.startTime),[eh,em]=parse(ws?.endTime);const start=new Date(base),end=new Date(base);start.setHours(sh||0,sm||0,0,0);end.setHours(eh||0,em||0,0,0);if(end<=start)end.setDate(end.getDate()+1);return {start,end};}
function positionObservationModal(){const v=activeVoyage();if(!v){toast('Create or select a voyage first.');return;}modal({title:'Update voyage observation',body:formGrid(field('Latitude','lat',v.position?.lat??'','number',{required:true,step:'0.000001'}),field('Longitude','lon',v.position?.lon??'','number',{required:true,step:'0.000001'}),field('Speed (kt)','speedKt',v.speedKt??'','number',{step:'0.1'}),field('Course (°T)','courseDeg',v.courseDeg??'','number',{step:'1',min:0,max:359}),field('Progress (nm)','progressNm',v.progressNm??0,'number',{step:'0.1'}),field('Source','source',v.positionSource||'manual watch observation','text',{required:true}),field('Observed at','observedAt',localInputDate(),'datetime-local',{required:true}),field('Author','author',state.crew[0]?.name||'Crew'),field('Notes','notes','','textarea',{full:true}),field('Add navigation log entry','addLog','yes','select',{options:[{value:'yes',label:'Yes'},{value:'no',label:'No'}]})),submitLabel:'Record observation',onSubmit:fd=>{const at=new Date(fd.get('observedAt')).toISOString();mutate(s=>{updateVoyageObservation(s,v.id,{lat:+fd.get('lat'),lon:+fd.get('lon'),speedKt:nnull(fd.get('speedKt')),courseDeg:nnull(fd.get('courseDeg')),progressNm:nnull(fd.get('progressNm')),source:fd.get('source'),observedAt:at,notes:fd.get('notes')});if(fd.get('addLog')==='yes')upsertRecord(s,'logs',{category:'navigation',author:fd.get('author')||'Crew',title:'Voyage observation',at,lat:+fd.get('lat'),lon:+fd.get('lon'),voyageId:v.id,text:`Position updated from ${fd.get('source')}. ${fd.get('notes')||''}`});},'Voyage observation recorded');closeModal();}});}
function captureBaselineModal(){const v=activeVoyage();if(!v){toast('Create a voyage first.');return;}const rr=readiness(state);modal({title:'Capture departure baseline',body:`<div class="callout ${rr.overall}"><strong>Current disposition: ${esc(rr.disposition)}</strong><br>${rr.results.filter(r=>r.status==='fail').length} fail · ${rr.results.filter(r=>r.status==='watch').length} watch · ${rr.results.filter(r=>r.status==='unknown').length} unknown.</div>${formGrid(field('Captured by','createdBy',state.crew[0]?.name||'Crew'),field('Notes','notes','','textarea',{full:true}))}`,submitLabel:'Capture immutable snapshot',onSubmit:fd=>{mutate(s=>captureDepartureBaseline(s,{voyageId:v.id,createdBy:fd.get('createdBy'),notes:fd.get('notes'),readinessResult:readiness(s)}),'Departure baseline captured');closeModal();}});}
function beginPassageConfirm(){const v=activeVoyage();if(!v){toast('Create a voyage first.');return;}const rr=readiness(state);modal({title:'Begin passage',body:`<div class="callout ${rr.overall}"><strong>Current disposition: ${esc(rr.disposition)}</strong><br>${rr.disposition==='HOLD'?'Known blockers exist. Beginning the passage records the decision but does not override them.':'Review all WATCH / UNKNOWN categories before departure.'}</div>${formGrid(field('Departure time','departedAt',localInputDate(),'datetime-local',{required:true}),field('Recorded by','author',state.crew[0]?.name||'Crew'),field('Decision notes','notes','','textarea',{full:true}))}`,submitLabel:'Record departure',onSubmit:fd=>{const at=new Date(fd.get('departedAt')).toISOString();mutate(s=>{captureDepartureBaseline(s,{voyageId:v.id,createdBy:fd.get('author'),notes:fd.get('notes')||'Baseline captured with departure.',readinessResult:readiness(s)});s.voyages.forEach(x=>{if(x.id===v.id){x.status='active';x.departedAt=at;x.updatedAt=new Date().toISOString();}else if(x.status==='active')x.status='planned';});s.vessel.status='underway';upsertRecord(s,'logs',{category:'navigation',author:fd.get('author')||'Crew',title:`Departure — ${v.name}`,at,voyageId:v.id,text:`Departure recorded. Disposition at decision: ${rr.disposition}. ${fd.get('notes')||''}`});},'Passage started and departure baseline preserved');closeModal();}});}
function completePassageConfirm(){const v=activeVoyage();if(!v){toast('No voyage available.');return;}if(activeWatch()){toast('End the current watch and record its handoff before recording arrival.');return;}modal({title:'Record arrival / complete passage',body:formGrid(field('Arrival time','arrivedAt',localInputDate(),'datetime-local',{required:true}),field('Recorded by','author',state.crew[0]?.name||'Crew'),field('Arrival notes','notes','','textarea',{full:true})),submitLabel:'Complete passage',onSubmit:fd=>{const at=new Date(fd.get('arrivedAt')).toISOString();mutate(s=>{const x=s.voyages.find(q=>q.id===v.id);if(x){x.status='completed';x.arrivedAt=at;x.completedAt=at;const pd=plannedVoyageDistance(x);if(pd!=null)x.progressNm=pd;x.updatedAt=new Date().toISOString();}s.vessel.status='in-port';upsertRecord(s,'logs',{category:'navigation',author:fd.get('author')||'Crew',title:`Arrival — ${v.name}`,at,voyageId:v.id,text:fd.get('notes')||'Passage completion recorded.'});},'Arrival recorded; vessel returned to in-port context');closeModal();}});}
function watchScheduleModal(rid){const x=state.watchSchedules.find(w=>w.id===rid)||{},crewOpts=[{value:'',label:'— Unassigned —'},...state.crew.map(c=>({value:c.id,label:`${c.name}${c.role?` — ${c.role}`:''}`}))];modal({title:x.id?'Edit watch schedule':'Add watch schedule',body:formGrid(field('Name','name',x.name||''),field('Watchkeeper','watchkeeperId',x.watchkeeperId||'','select',{options:crewOpts}),field('Start time','startTime',x.startTime||'00:00','time',{required:true}),field('End time','endTime',x.endTime||'04:00','time',{required:true}),field('Order','order',x.order??100,'number',{step:'1'}),field('Enabled','enabled',x.enabled===false?'no':'yes','select',{options:[{value:'yes',label:'Enabled'},{value:'no',label:'Disabled'}]}),field('Notes','notes',x.notes||'','textarea',{full:true})),onSubmit:fd=>{const c=state.crew.find(q=>q.id===fd.get('watchkeeperId'));mutate(s=>upsertRecord(s,'watchSchedules',{...x,name:fd.get('name')||`${fd.get('startTime')}–${fd.get('endTime')}`,watchkeeperId:fd.get('watchkeeperId'),watchkeeper:c?.name||'',startTime:fd.get('startTime'),endTime:fd.get('endTime'),order:nnull(fd.get('order'))??100,enabled:fd.get('enabled')==='yes',notes:fd.get('notes')}),'Watch schedule saved');closeModal();}});}
function startWatchModal(scheduleId=''){if(activeWatch()){toast('End the current watch and record its handoff before starting another.');return;}const ws=state.watchSchedules.find(w=>w.id===scheduleId)||nextScheduledWatch(state),times=scheduleDateTimes(ws),crewOpts=state.crew.map(c=>({value:c.id,label:c.name}));modal({title:'Start watch',body:formGrid(field('Schedule','scheduleId',ws?.id||'','select',{options:[{value:'',label:'Ad hoc'},...visible(state.watchSchedules).filter(x=>x.enabled!==false).map(x=>({value:x.id,label:`${x.startTime}–${x.endTime} · ${x.watchkeeper||'Unassigned'}`}))]}),field('Watchkeeper','watchkeeperId',ws?.watchkeeperId||state.crew[0]?.id||'','select',{options:crewOpts}),field('Start','start',localInputDate(times.start),'datetime-local',{required:true}),field('Planned end','end',localInputDate(times.end),'datetime-local'),field('Notes','notes','','textarea',{full:true})),submitLabel:'Start watch',onSubmit:fd=>{const c=state.crew.find(q=>q.id===fd.get('watchkeeperId')),start=new Date(fd.get('start')).toISOString(),end=fd.get('end')?new Date(fd.get('end')).toISOString():'';mutate(s=>{const w=startWatch(s,{voyageId:activeVoyage()?.id||'',watchkeeper:c?.name||'Unassigned',watchkeeperId:c?.id||'',scheduleId:fd.get('scheduleId'),start,end,notes:fd.get('notes')});upsertRecord(s,'logs',{category:'watch',author:c?.name||'Crew',title:'Watch started',at:start,voyageId:w.voyageId,text:`Watch started${end?` with planned end ${dateTime(end)}`:''}. ${fd.get('notes')||''}`});},'Watch started');closeModal();}});}
function endWatchModal(rid){const w=state.watches.find(x=>x.id===rid)||activeWatch();if(!w)return;const next=nextScheduledWatch(state),crewOpts=[{value:'',label:'— Incoming watch unknown —'},...state.crew.map(c=>({value:c.id,label:c.name}))];modal({title:`End watch — ${w.watchkeeper||'Unassigned'}`,body:formGrid(field('Ended at','endedAt',localInputDate(),'datetime-local',{required:true}),field('Incoming watchkeeper','nextWatchkeeperId',next?.watchkeeperId||'','select',{options:crewOpts}),field('Handoff summary','summary','','textarea',{full:true,required:true}),field('Conditions','conditions','','textarea',{full:true}),field('Traffic','traffic','','textarea',{full:true}),field('Equipment / vessel','equipment','','textarea',{full:true}),field('Weather trend','weather','','textarea',{full:true}),field('Upcoming','upcoming','','textarea',{full:true}),field('Plan / next actions','plan','','textarea',{full:true}),field('Additional notes','notes','','textarea',{full:true})),submitLabel:'End watch & record handoff',onSubmit:fd=>{const c=state.crew.find(q=>q.id===fd.get('nextWatchkeeperId')),at=new Date(fd.get('endedAt')).toISOString();mutate(s=>{const h=endWatch(s,w.id,{endedAt:at,summary:fd.get('summary'),conditions:fd.get('conditions'),traffic:fd.get('traffic'),equipment:fd.get('equipment'),weather:fd.get('weather'),upcoming:fd.get('upcoming'),plan:fd.get('plan'),notes:fd.get('notes'),nextWatchkeeper:c?.name||'',nextWatchkeeperId:c?.id||''});upsertRecord(s,'logs',{category:'watch',author:w.watchkeeper||'Crew',title:'Watch handoff',at,voyageId:w.voyageId,text:`${h.summary||''}${h.plan?` Next: ${h.plan}`:''}`});},'Watch ended; handoff recorded');closeModal();}});}
function ackHandoffModal(rid){const h=state.watchHandoffs.find(x=>x.id===rid);if(!h)return;const opts=state.crew.map(c=>({value:c.name,label:c.name}));modal({title:'Acknowledge watch handoff',body:`<div class="callout"><strong>${esc(h.fromWatchkeeper||'Previous')} → ${esc(h.toWatchkeeper||'Incoming')}</strong><br>${esc(h.summary||h.plan||'No handoff summary.')}</div>${formGrid(field('Acknowledged by','acknowledgedBy',h.toWatchkeeper||state.crew[0]?.name||'','select',{options:opts}),field('Acknowledged at','acknowledgedAt',localInputDate(),'datetime-local',{required:true}))}`,submitLabel:'Acknowledge',onSubmit:fd=>{mutate(s=>acknowledgeHandoff(s,h.id,{acknowledgedAt:new Date(fd.get('acknowledgedAt')).toISOString(),acknowledgedBy:fd.get('acknowledgedBy')}),'Handoff acknowledged');closeModal();}});}
function saveFreshness(){state.settings.freshness={...state.settings.freshness,weatherHours:nnull($('#freshWeather').value)??12,positionMinutes:nnull($('#freshPosition').value)??60,resourceHours:nnull($('#freshResource').value)??48,measurementHours:nnull($('#freshMeasurement').value)??72};scheduleSave();toast('Freshness thresholds saved.');renderPage();}

function weatherModal(rid){const w=state.weather.find(x=>x.id===rid)||{};modal({title:w.id?'Edit Weather Record':'Add Weather Record',body:formGrid(field('Source','source',w.source||'','text',{required:true}),field('Confidence','confidence',w.confidence||'medium','select',{options:['low','medium','high']}),field('Issued','issuedAt',w.issuedAt?new Date(w.issuedAt).toISOString().slice(0,16):new Date().toISOString().slice(0,16),'datetime-local'),field('Forecast time','forecastAt',w.forecastAt?new Date(w.forecastAt).toISOString().slice(0,16):'','datetime-local'),field('Wind (kt)','windKt',w.windKt??'','number',{step:'0.1'}),field('Gust (kt)','gustKt',w.gustKt??'','number',{step:'0.1'}),field('Direction','direction',w.direction||''),field('Wave height (m)','waveM',w.waveM??'','number',{step:'0.1'}),field('Wave period (s)','wavePeriodS',w.wavePeriodS??'','number',{step:'0.1'}),field('Pressure (hPa)','pressureHpa',w.pressureHpa??'','number',{step:'0.1'}),field('Notes','notes',w.notes||'','textarea',{full:true})),onSubmit:fd=>{mutate(s=>{const obj={id:w.id||id('wx'),source:fd.get('source'),confidence:fd.get('confidence'),issuedAt:new Date(fd.get('issuedAt')).toISOString(),forecastAt:fd.get('forecastAt')?new Date(fd.get('forecastAt')).toISOString():null,windKt:+fd.get('windKt')||null,gustKt:+fd.get('gustKt')||null,direction:fd.get('direction'),waveM:+fd.get('waveM')||null,wavePeriodS:+fd.get('wavePeriodS')||null,pressureHpa:+fd.get('pressureHpa')||null,notes:fd.get('notes')};const i=s.weather.findIndex(x=>x.id===obj.id);if(i>=0)s.weather[i]=obj;else s.weather.unshift(obj);},'Weather record saved');closeModal();},dangerLabel:w.id?'Delete':null,onDanger:w.id?()=>{mutate(s=>s.weather=s.weather.filter(x=>x.id!==w.id),'Weather record deleted');closeModal();}:null});}
function assumptionModal(rid){const a=state.assumptions.find(x=>x.id===rid)||{};modal({title:'Assumption',body:formGrid(field('Assumption','name',a.name||'','text',{required:true}),field('Value','value',a.value??''),field('Units','unit',a.unit||''),field('Source','source',a.source||''),field('Confidence','confidence',a.confidence||'medium','select',{options:['low','medium','high']}),field('Date','date',a.date||new Date().toISOString().slice(0,10),'date'),field('Notes','notes',a.notes||'','textarea',{full:true})),onSubmit:fd=>{mutate(s=>upsert(s.assumptions,{id:a.id||id('as'),name:fd.get('name'),value:fd.get('value'),unit:fd.get('unit'),source:fd.get('source'),confidence:fd.get('confidence'),date:fd.get('date'),notes:fd.get('notes')}),'Assumption saved');closeModal();}});}
function anchorModal(rid){const a=state.anchorages.find(x=>x.id===rid)||{};modal({title:a.id?'Anchorage Knowledge':'Add Anchorage',body:formGrid(field('Name','name',a.name||'','text',{required:true}),field('Country / region','country',a.country||''),field('Latitude','lat',a.lat??'','number',{step:'0.0001'}),field('Longitude','lon',a.lon??'','number',{step:'0.0001'}),field('Planning depth (m)','depth',a.depth??'','number',{step:'0.1'}),field('Bow height (m)','bowHeight',a.bowHeight??'','number',{step:'0.1'}),field('Tide rise allowance (m)','tideRise',a.tideRise??'','number',{step:'0.1'}),field('Planning scope ratio','scope',a.scope??6,'number',{step:'0.1'}),field('Nearest known hazard (m)','clearance',a.clearance??'','number',{step:'0.1'}),field('Bottom','bottom',a.bottom||''),field('Holding history','holding',a.holding||''),field('Wind / swell protection','windProtection',a.windProtection||''),field('Approach notes','approach',a.approach||'','textarea',{full:true}),field('Hazards','hazards',a.hazards||'','textarea',{full:true}),field('Night approach preference','nightApproach',a.nightApproach||''),field('Shore access','shoreAccess',a.shoreAccess||''),field('Dinghy landing','dinghyLanding',a.dinghyLanding||''),field('Notes','notes',a.notes||'','textarea',{full:true})),onSubmit:fd=>{mutate(st=>{const rec=upsertRecord(st,'anchorages',{...a,name:fd.get('name'),country:fd.get('country'),lat:nnull(fd.get('lat')),lon:nnull(fd.get('lon')),depth:nnull(fd.get('depth')),bowHeight:nnull(fd.get('bowHeight'))??0,tideRise:nnull(fd.get('tideRise'))??0,scope:nnull(fd.get('scope')),clearance:nnull(fd.get('clearance')),bottom:fd.get('bottom'),holding:fd.get('holding'),windProtection:fd.get('windProtection'),approach:fd.get('approach'),hazards:fd.get('hazards'),nightApproach:fd.get('nightApproach'),shoreAccess:fd.get('shoreAccess'),dinghyLanding:fd.get('dinghyLanding'),notes:fd.get('notes'),legacyVisitCount:a.legacyVisitCount??a.visits??0});st.settings.activeAnchorageId=rec.id;},'Anchorage saved');closeModal();}});}
function groundTackleModal(rid){const x=state.groundTackle.find(v=>v.id===rid)||{};modal({title:x.id?'Ground Tackle':'Add Ground Tackle',body:formGrid(field('Name','name',x.name||'','text',{required:true}),field('Anchor type','anchorType',x.anchorType||''),field('Anchor weight (kg)','weightKg',x.weightKg??'','number',{step:'0.1'}),field('Rode type','rodeType',x.rodeType||'all-chain','select',{options:['all-chain','chain + rope','rope + chain leader','other']}),field('Chain length (m)','chainLengthM',x.chainLengthM??'','number',{step:'0.1'}),field('Chain diameter (mm)','chainDiameterMm',x.chainDiameterMm??'','number',{step:'0.1'}),field('Rope length (m)','ropeLengthM',x.ropeLengthM??'','number',{step:'0.1'}),field('Rope diameter (mm)','ropeDiameterMm',x.ropeDiameterMm??'','number',{step:'0.1'}),field('Total usable rode (m)','totalRodeM',x.totalRodeM??'','number',{step:'0.1',help:'Enter the actual usable deployed length, including any operational limit.'}),field('Role','primary',x.primary?'yes':'no','select',{options:[{value:'yes',label:'Primary'},{value:'no',label:'Secondary / alternate'}]}),field('Notes','notes',x.notes||'','textarea',{full:true})),onSubmit:fd=>{mutate(st=>{const primary=fd.get('primary')==='yes';if(primary)st.groundTackle.forEach(t=>t.primary=false);upsertRecord(st,'groundTackle',{...x,name:fd.get('name'),anchorType:fd.get('anchorType'),weightKg:nnull(fd.get('weightKg')),rodeType:fd.get('rodeType'),chainLengthM:nnull(fd.get('chainLengthM')),chainDiameterMm:nnull(fd.get('chainDiameterMm')),ropeLengthM:nnull(fd.get('ropeLengthM')),ropeDiameterMm:nnull(fd.get('ropeDiameterMm')),totalRodeM:nnull(fd.get('totalRodeM')),primary,notes:fd.get('notes')});},'Ground tackle saved');closeModal();}});}
function anchorDeploymentModal(rid){const x=state.anchorDeployments.find(v=>v.id===rid)||{},a=state.anchorages.find(v=>v.id===(x.anchorageId||state.settings.activeAnchorageId))||selectedAnchorage()||{},gt=tackleById(x.groundTackleId)||visible(state.groundTackle).find(t=>t.primary)||visible(state.groundTackle)[0]||{};modal({title:x.id?'Anchor Deployment':'Record Anchor Deployment',body:formGrid(field('Anchorage','anchorageId',x.anchorageId||a.id||'','select',{required:true,options:visible(state.anchorages).map(v=>({value:v.id,label:v.name}))}),field('Ground tackle','groundTackleId',x.groundTackleId||gt.id||'','select',{required:true,options:visible(state.groundTackle).map(v=>({value:v.id,label:v.name}))}),field('Deployed at','deployedAt',x.deployedAt?new Date(x.deployedAt).toISOString().slice(0,16):localInputDate(),'datetime-local'),field('Recovered at','recoveredAt',x.recoveredAt?new Date(x.recoveredAt).toISOString().slice(0,16):'','datetime-local'),field('Depth (m)','depthM',x.depthM??a.depth??'','number',{step:'0.1'}),field('Tide rise allowance (m)','tideRiseM',x.tideRiseM??a.tideRise??0,'number',{step:'0.1'}),field('Bow height (m)','bowHeightM',x.bowHeightM??a.bowHeight??0,'number',{step:'0.1'}),field('Scope ratio','scope',x.scope??a.scope??6,'number',{step:'0.1'}),field('Nearest hazard (m)','nearestHazardM',x.nearestHazardM??a.clearance??'','number',{step:'0.1'}),field('Drop latitude','dropLat',x.dropLat??a.lat??'','number',{step:'0.0001'}),field('Drop longitude','dropLon',x.dropLon??a.lon??'','number',{step:'0.0001'}),field('Maximum recorded wind (kt)','maxWindKt',x.maxWindKt??'','number',{step:'0.1'}),field('Wind direction','windDirection',x.windDirection||''),field('Bottom observed','bottom',x.bottom||a.bottom||''),field('Holding rating','holding',x.holding||'unrated','select',{options:['unrated','excellent','good','fair','poor']}),field('Dragging observed','dragged',x.dragged===true||x.dragged==='yes'?'yes':'no','select',{options:['no','yes']}),field('Reset / re-anchor count','resets',x.resets??0,'number',{step:'1',min:0}),field('Notes','notes',x.notes||'','textarea',{full:true})),onSubmit:fd=>{mutate(st=>upsertRecord(st,'anchorDeployments',{...x,anchorageId:fd.get('anchorageId'),groundTackleId:fd.get('groundTackleId'),deployedAt:new Date(fd.get('deployedAt')).toISOString(),recoveredAt:fd.get('recoveredAt')?new Date(fd.get('recoveredAt')).toISOString():'',depthM:nnull(fd.get('depthM')),tideRiseM:nnull(fd.get('tideRiseM')),bowHeightM:nnull(fd.get('bowHeightM')),scope:nnull(fd.get('scope')),nearestHazardM:nnull(fd.get('nearestHazardM')),dropLat:nnull(fd.get('dropLat')),dropLon:nnull(fd.get('dropLon')),maxWindKt:nnull(fd.get('maxWindKt')),windDirection:fd.get('windDirection'),bottom:fd.get('bottom'),holding:fd.get('holding'),dragged:fd.get('dragged')==='yes',resets:Number(fd.get('resets'))||0,notes:fd.get('notes')}),'Anchor deployment saved');closeModal();}});}
function anchorPositionModal(rid,deploymentId){const x=state.anchorPositions.find(v=>v.id===rid)||{},d=deploymentById(x.anchorDeploymentId||deploymentId)||{};modal({title:x.id?'Anchor Position Observation':'Anchor Position Observation',body:formGrid(field('Deployment','anchorDeploymentId',x.anchorDeploymentId||d.id||'','select',{required:true,options:visible(state.anchorDeployments).map(v=>({value:v.id,label:`${state.anchorages.find(a=>a.id===v.anchorageId)?.name||'Anchorage'} · ${dateTime(v.deployedAt)}`}))}),field('Observed at','at',x.at?new Date(x.at).toISOString().slice(0,16):localInputDate(),'datetime-local'),field('Latitude','lat',x.lat??'','number',{step:'0.00001'}),field('Longitude','lon',x.lon??'','number',{step:'0.00001'}),field('Wind (kt)','windKt',x.windKt??'','number',{step:'0.1'}),field('Dragging observed','dragging',x.dragging===true?'yes':'no','select',{options:['no','yes']}),field('Notes','notes',x.notes||'','textarea',{full:true})),onSubmit:fd=>{mutate(st=>upsertRecord(st,'anchorPositions',{...x,anchorDeploymentId:fd.get('anchorDeploymentId'),at:new Date(fd.get('at')).toISOString(),lat:nnull(fd.get('lat')),lon:nnull(fd.get('lon')),windKt:nnull(fd.get('windKt')),dragging:fd.get('dragging')==='yes',notes:fd.get('notes')}),'Anchor position recorded');closeModal();}});}
function systemModal(rid){
  const x=state.systems.find(v=>v.id===rid)||{};const parentOptions=[{value:'',label:'— Root level —'},...state.systems.filter(s=>s.id!==x.id&&!s.archived).map(s=>({value:s.id,label:s.name}))];
  modal({title:x.id?'Edit Vessel System':'Add Vessel System',body:formGrid(field('Name','name',x.name||'','text',{required:true}),field('Parent system','parentSystemId',x.parentSystemId||'','select',{options:parentOptions}),field('Status','status',x.status||'pass','select',{options:['pass','watch','fail','unknown']}),field('Sort order','sortOrder',x.sortOrder??100,'number',{step:'1'}),field('Description','description',x.description||'','textarea',{full:true})),onSubmit:fd=>{mutate(s=>{const obj=upsertRecord(s,'systems',{...x,name:fd.get('name'),status:fd.get('status'),sortOrder:nnull(fd.get('sortOrder'))??100,description:fd.get('description')});const r=setSystemParent(s,obj.id,fd.get('parentSystemId'));if(!r.ok)toast(r.reason);},'System saved');closeModal();}});
}
function equipmentModal(rid){
  const x=state.equipment.find(v=>v.id===rid)||{};modal({title:x.id?'Equipment':'Add Equipment',body:formGrid(
    field('Name','name',x.name||'','text',{required:true}),field('System','systemId',x.systemId||state.systems[0]?.id||'','select',{options:activeRecords(state.systems).map(s=>({value:s.id,label:s.name}))}),
    field('Manufacturer','manufacturer',x.manufacturer||''),field('Model','model',x.model||''),field('Serial number','serial',x.serial||''),field('Location','location',x.location||''),
    field('Criticality','criticality',x.criticality||'medium','select',{options:['low','medium','high']}),field('Status','status',x.status||'pass','select',{options:['pass','watch','fail','unknown']}),field('Condition','condition',x.condition||'good','select',{options:['excellent','good','fair','poor','failed','unknown']}),
    field('Hours','hours',x.hours??'','number',{step:'0.1'}),field('Cycles','cycles',x.cycles??'','number',{step:'1'}),field('Expected life (hr)','expectedLifeHours',x.expectedLifeHours??'','number',{step:'0.1'}),
    field('Purchase date','purchaseDate',x.purchaseDate||'','date'),field('Installation date','installationDate',x.installationDate||'','date'),field('Commissioning date','commissioningDate',x.commissioningDate||'','date'),
    field('Service interval (hr)','serviceInterval',x.serviceInterval??'','number',{step:'0.1'}),field('Inspection interval (hr)','inspectionInterval',x.inspectionInterval??'','number',{step:'0.1'}),
    field('Failure consequence','failureConsequence',x.failureConsequence||'','textarea',{full:true}),field('Notes','notes',x.notes||'','textarea',{full:true})
  ),onSubmit:fd=>{mutate(s=>upsertRecord(s,'equipment',{...x,name:fd.get('name'),systemId:fd.get('systemId'),manufacturer:fd.get('manufacturer'),model:fd.get('model'),serial:fd.get('serial'),location:fd.get('location'),criticality:fd.get('criticality'),status:fd.get('status'),condition:fd.get('condition'),hours:nnull(fd.get('hours'))??0,cycles:nnull(fd.get('cycles'))??0,expectedLifeHours:nnull(fd.get('expectedLifeHours')),purchaseDate:fd.get('purchaseDate'),installationDate:fd.get('installationDate'),commissioningDate:fd.get('commissioningDate'),serviceInterval:nnull(fd.get('serviceInterval')),inspectionInterval:nnull(fd.get('inspectionInterval')),failureConsequence:fd.get('failureConsequence'),notes:fd.get('notes')}),'Equipment saved');closeModal();}});
}
function componentModal(rid){
  const x=state.components.find(v=>v.id===rid)||{};modal({title:x.id?'Component':'Add Component',body:formGrid(field('Name','name',x.name||'','text',{required:true}),field('Parent equipment','equipmentId',x.equipmentId||state.equipment[0]?.id||'','select',{options:activeRecords(state.equipment).map(e=>({value:e.id,label:`${e.name} — ${sysName(e.systemId)}`}))}),field('Part number','partNumber',x.partNumber||''),field('Location','location',x.location||''),field('Criticality','criticality',x.criticality||'medium','select',{options:['low','medium','high']}),field('Status','status',x.status||'pass','select',{options:['pass','watch','fail','unknown']}),field('Condition','condition',x.condition||'good','select',{options:['excellent','good','fair','poor','failed','unknown']}),field('Expected life (hr)','expectedLifeHours',x.expectedLifeHours??'','number',{step:'0.1'}),field('Notes','notes',x.notes||'','textarea',{full:true})),onSubmit:fd=>{mutate(s=>upsertRecord(s,'components',{...x,name:fd.get('name'),equipmentId:fd.get('equipmentId'),partNumber:fd.get('partNumber'),location:fd.get('location'),criticality:fd.get('criticality'),status:fd.get('status'),condition:fd.get('condition'),expectedLifeHours:nnull(fd.get('expectedLifeHours')),notes:fd.get('notes')}),'Component saved');closeModal();}});
}
function maintenanceModal(rid){
  const x=state.maintenance.find(v=>v.id===rid)||{};const eqId=x.equipmentId||state.equipment[0]?.id||'';modal({title:x.id?'Maintenance Task':'Add Maintenance Task',body:formGrid(
    field('Task','name',x.name||'','text',{required:true}),field('Equipment','equipmentId',eqId,'select',{options:activeRecords(state.equipment).map(e=>({value:e.id,label:e.name}))}),
    field('Component','componentId',x.componentId||'','select',{options:[{value:'',label:'—'},...activeRecords(state.components).map(c=>({value:c.id,label:`${c.name} — ${eqName(c.equipmentId)}`}))]}),field('Task type','taskType',x.taskType||'engine-hours','select',{options:[{value:'engine-hours',label:'Engine hours'},{value:'calendar',label:'Calendar'},{value:'cycles',label:'Cycles'},{value:'seasonal',label:'Seasonal'},{value:'condition',label:'Condition-based'},{value:'corrective',label:'Corrective / one-time'}]}),
    field('Disposition','status',['deferred','not-applicable'].includes(x.status)?x.status:'auto','select',{options:[{value:'auto',label:'Automatic due state'},{value:'deferred',label:'Deferred'},{value:'not-applicable',label:'Not applicable'}]}),
    field('Next due engine hours','nextDueHours',x.nextDueHours??'','number',{step:'0.1'}),field('Next due date','nextDueDate',x.nextDueDate||'','date'),field('Next due cycles','nextDueCycles',x.nextDueCycles??'','number',{step:'1'}),
    field('Interval hours','intervalHours',x.intervalHours??'','number',{step:'0.1'}),field('Interval days','intervalDays',x.intervalDays??'','number',{step:'1'}),field('Interval cycles','intervalCycles',x.intervalCycles??'','number',{step:'1'}),field('Estimated duration (min)','estimatedMinutes',x.estimatedMinutes??'','number',{step:'1'}),
    field('Procedure','procedureId',x.procedureId||'','select',{options:[{value:'',label:'—'},...activeRecords(state.procedures).map(p=>({value:p.id,label:p.name}))]}),field('Required part IDs (optional :qty)','parts',(x.requiredParts||[]).join(',')),field('Required tools — comma separated','tools',(x.requiredTools||[]).join(',')),field('Required consumables — comma separated','consumables',(x.requiredConsumables||[]).join(',')),field('Notes','notes',x.notes||'','textarea',{full:true})
  ),onSubmit:fd=>{mutate(s=>upsertRecord(s,'maintenance',{...x,name:fd.get('name'),equipmentId:fd.get('equipmentId'),componentId:fd.get('componentId'),taskType:fd.get('taskType'),status:fd.get('status'),nextDueHours:nnull(fd.get('nextDueHours')),nextDueDate:fd.get('nextDueDate'),nextDueCycles:nnull(fd.get('nextDueCycles')),intervalHours:nnull(fd.get('intervalHours')),intervalDays:nnull(fd.get('intervalDays')),intervalCycles:nnull(fd.get('intervalCycles')),estimatedMinutes:nnull(fd.get('estimatedMinutes')),procedureId:fd.get('procedureId'),requiredParts:fd.get('parts').split(',').map(v=>v.trim()).filter(Boolean),requiredTools:fd.get('tools').split(',').map(v=>v.trim()).filter(Boolean),requiredConsumables:fd.get('consumables').split(',').map(v=>v.trim()).filter(Boolean),notes:fd.get('notes')}),'Maintenance task saved');closeModal();}});
}
function completeMaintenanceModal(rid){
  const task=state.maintenance.find(x=>x.id===rid);if(!task)return;const parts=partAvailability(task);const crewOptions=[{value:'',label:'—'},...state.crew.map(c=>({value:c.name,label:c.name}))];
  modal({title:`Complete — ${task.name}`,body:`${parts.length?`<div class="callout ${parts.some(p=>!p.ok)?'warn':''}"><strong>Required spares:</strong><br>${parts.map(p=>`${esc(p.name)} — ${p.qty} aboard / ${p.need} needed${p.ok?'':' (SHORTFALL)'}`).join('<br>')}</div>`:''}${formGrid(field('Completed by','performedBy','', 'select',{options:crewOptions}),field('Completion time','completedAt',new Date().toISOString().slice(0,16),'datetime-local'),field('Engine hours','engineHours',state.vessel.engineHours??'','number',{step:'0.1'}),field('Cycles','cycles','','number',{step:'1'}),field('Notes / evidence summary','notes','','textarea',{full:true}),field('Parts to consume — ID:qty, comma separated','consume','', 'text',{full:true,help:'Example: inv-oilfilter:1. Leave blank to preserve inventory quantities.'}))}`,submitLabel:'Record completion',onSubmit:fd=>{
    const completedAt=new Date(fd.get('completedAt')).toISOString(),engineHours=nnull(fd.get('engineHours')),cycles=nnull(fd.get('cycles')),consume=String(fd.get('consume')||'').split(',').map(x=>x.trim()).filter(Boolean).map(x=>{const [inventoryId,q]=x.split(':');return {inventoryId,qty:Number(q)||1};});
    mutate(s=>completeMaintenance(s,rid,{completedAt,engineHours,cycles,performedBy:fd.get('performedBy'),notes:fd.get('notes'),partsConsumed:consume}),'Maintenance completion recorded');closeModal();
  }});
}
function inspectionModal(rid){
  const x=state.inspections.find(v=>v.id===rid)||{};modal({title:x.id?'Inspection':'Record Inspection',body:formGrid(field('Inspection','name',x.name||'','text',{required:true}),field('Equipment','equipmentId',x.equipmentId||state.equipment[0]?.id||'','select',{options:activeRecords(state.equipment).map(e=>({value:e.id,label:e.name}))}),field('Time','at',x.at?new Date(x.at).toISOString().slice(0,16):new Date().toISOString().slice(0,16),'datetime-local'),field('Inspector','inspector',x.inspector||''),field('Result','result',x.result||'pass','select',{options:['pass','watch','fail','unknown']}),field('Condition','condition',x.condition||'good','select',{options:['excellent','good','fair','poor','failed','unknown']}),field('Next inspection date','nextDueDate',x.nextDueDate||'','date'),field('Next inspection hours','nextDueHours',x.nextDueHours??'','number',{step:'0.1'}),field('Notes','notes',x.notes||'','textarea',{full:true})),onSubmit:fd=>{mutate(s=>{const obj=upsertRecord(s,'inspections',{...x,name:fd.get('name'),equipmentId:fd.get('equipmentId'),at:new Date(fd.get('at')).toISOString(),inspector:fd.get('inspector'),result:fd.get('result'),condition:fd.get('condition'),nextDueDate:fd.get('nextDueDate'),nextDueHours:nnull(fd.get('nextDueHours')),notes:fd.get('notes')});const eq=s.equipment.find(e=>e.id===obj.equipmentId);if(eq&&['poor','failed'].includes(obj.condition)){eq.condition=obj.condition;eq.status=obj.condition==='failed'?'fail':'watch';eq.updatedAt=new Date().toISOString();}},'Inspection saved');closeModal();}});
}
function measurementModal(rid){
  const x=state.measurements.find(v=>v.id===rid)||{};modal({title:x.id?'Measurement':'Record Measurement',body:formGrid(field('Equipment','equipmentId',x.equipmentId||state.equipment[0]?.id||'','select',{options:activeRecords(state.equipment).map(e=>({value:e.id,label:e.name}))}),field('Measurement','name',x.name||'', 'text',{required:true}),field('Value','value',x.value??'', 'number',{step:'any'}),field('Unit','unit',x.unit||''),field('Expected minimum','min',x.min??'', 'number',{step:'any'}),field('Expected maximum','max',x.max??'', 'number',{step:'any'}),field('Source','source',x.source||'manual'),field('Confidence','confidence',x.confidence||'medium','select',{options:['low','medium','high']}),field('Time','at',x.at?new Date(x.at).toISOString().slice(0,16):new Date().toISOString().slice(0,16),'datetime-local'),field('Notes','notes',x.notes||'','textarea',{full:true})),onSubmit:fd=>{mutate(s=>upsertRecord(s,'measurements',{...x,equipmentId:fd.get('equipmentId'),name:fd.get('name'),value:nnull(fd.get('value')),unit:fd.get('unit'),min:nnull(fd.get('min')),max:nnull(fd.get('max')),source:fd.get('source'),confidence:fd.get('confidence'),at:new Date(fd.get('at')).toISOString(),notes:fd.get('notes')}),'Measurement saved');closeModal();}});
}


function waypointModal(rid){const v=activeVoyage();if(!v){toast('Create a passage first.');return;}const x=state.routeWaypoints.find(w=>w.id===rid)||{};modal({title:x.id?'Waypoint':'Add Waypoint',body:formGrid(field('Name','name',x.name||'','text',{required:true}),field('Kind','kind',x.kind||'route','select',{options:['departure','route','alternate','arrival']}),field('Latitude','lat',x.lat??'','number',{step:'0.000001',required:true}),field('Longitude','lon',x.lon??'','number',{step:'0.000001',required:true}),field('Order','order',x.order??((voyageWaypoints(v).length+1)*10),'number',{step:'1'}),field('Notes','notes',x.notes||'','textarea',{full:true})),onSubmit:fd=>{mutate(st=>upsertRecord(st,'routeWaypoints',{...x,voyageId:v.id,name:fd.get('name'),kind:fd.get('kind'),lat:Number(fd.get('lat')),lon:Number(fd.get('lon')),order:Number(fd.get('order'))||0,notes:fd.get('notes')}),'Waypoint saved');closeModal();}});}
function voyageScenarioModal(rid){const v=activeVoyage();if(!v){toast('Create a passage first.');return;}const x=state.voyageScenarios.find(w=>w.id===rid)||{};modal({title:x.id?'Passage Scenario':'Add Passage Scenario',body:formGrid(field('Name','name',x.name||'Normal','text',{required:true}),field('Speed (kt)','speedKt',x.speedKt??v.speedKt??'','number',{step:'0.1'}),field('Motor hours','motorHours',x.motorHours??0,'number',{step:'0.1'}),field('Fuel RPM','fuelRpm',x.fuelRpm??state.resources.find(r=>r.kind==='fuel')?.planningRpm??'','number',{step:'1'}),field('Water use (%)','waterUseScalePct',x.waterUseScalePct??100,'number',{step:'1'}),field('Provision use (%)','provisionUseScalePct',x.provisionUseScalePct??100,'number',{step:'1'}),field('Energy profile','energyProfileId',x.energyProfileId||state.settings.activeEnergyProfileId||'','select',{options:visible(state.energyProfiles).map(p=>({value:p.id,label:p.name}))}),field('Notes','notes',x.notes||'','textarea',{full:true})),onSubmit:fd=>{mutate(st=>upsertRecord(st,'voyageScenarios',{...x,voyageId:v.id,name:fd.get('name'),speedKt:nnull(fd.get('speedKt')),motorHours:nnull(fd.get('motorHours'))??0,fuelRpm:nnull(fd.get('fuelRpm')),waterUseScalePct:nnull(fd.get('waterUseScalePct'))??100,provisionUseScalePct:nnull(fd.get('provisionUseScalePct'))??100,energyProfileId:fd.get('energyProfileId'),notes:fd.get('notes')}),'Scenario saved');closeModal();}});}
function energyBankModal(rid){const x=(state.energy.banks||[]).find(b=>b.id===rid)||{};modal({title:x.id?'Storage Bank':'Add Storage Bank',body:formGrid(field('Name','name',x.name||'House bank','text',{required:true}),field('Capacity (kWh)','capacityKwh',x.capacityKwh??'','number',{step:'0.01'}),field('Current SOC (%)','currentPct',x.currentPct??'','number',{step:'0.1'}),field('Reserve SOC (%)','reservePct',x.reservePct??20,'number',{step:'0.1'}),field('Chemistry','chemistry',x.chemistry||''),field('Notes','notes',x.notes||'','textarea',{full:true})),onSubmit:fd=>{mutate(st=>{st.energy.banks=st.energy.banks||[];const rec={...x,id:x.id||id('bank'),name:fd.get('name'),capacityKwh:nnull(fd.get('capacityKwh')),currentPct:nnull(fd.get('currentPct')),reservePct:nnull(fd.get('reservePct')),chemistry:fd.get('chemistry'),notes:fd.get('notes')};const i=st.energy.banks.findIndex(b=>b.id===rec.id);if(i>=0)st.energy.banks[i]=rec;else st.energy.banks.push(rec);const sum=energyStorageSummary(st.energy);st.energy.capacityKwh=sum.capacityKwh;st.energy.currentPct=sum.currentPct;st.energy.reservePct=sum.reservePct;},'Storage bank saved');closeModal();}});}
function loadModal(rid){const x=state.energy.loads.find(l=>l.id===rid)||{};modal({title:x.id?'Electrical Load':'Add Electrical Load',body:formGrid(field('Name','name',x.name||'','text',{required:true}),field('Power (W)','watts',x.watts??'','number',{step:'0.1'}),field('Duty (%)','dutyPct',x.dutyPct??100,'number',{step:'0.1'}),field('Hours/day','hoursPerDay',x.hoursPerDay??24,'number',{step:'0.1'}),field('Priority','priority',x.priority||'operational','select',{options:['essential','operational','comfort','optional']}),field('Notes','notes',x.notes||'','textarea',{full:true})),onSubmit:fd=>{mutate(st=>{const rec={...x,id:x.id||id('load'),name:fd.get('name'),watts:nnull(fd.get('watts')),dutyPct:nnull(fd.get('dutyPct')),hoursPerDay:nnull(fd.get('hoursPerDay')),priority:fd.get('priority'),notes:fd.get('notes')};const i=st.energy.loads.findIndex(l=>l.id===rec.id);if(i>=0)st.energy.loads[i]=rec;else st.energy.loads.push(rec);},'Load saved');closeModal();}});}
function sourceModal(rid){const x=state.energy.sources.find(l=>l.id===rid)||{};modal({title:x.id?'Generation Source':'Add Generation Source',body:formGrid(field('Name','name',x.name||'','text',{required:true}),field('Type','type',x.type||'other','select',{options:['solar','alternator','generator','wind','hydro','shore','other']}),field('Expected generation (kWh/day)','dailyKwh',x.dailyKwh??'','number',{step:'0.01'}),field('Rated power (kW)','ratedKw',x.ratedKw??'','number',{step:'0.01'}),field('Notes','notes',x.notes||'','textarea',{full:true})),onSubmit:fd=>{mutate(st=>{const rec={...x,id:x.id||id('src'),name:fd.get('name'),type:fd.get('type'),dailyKwh:nnull(fd.get('dailyKwh')),ratedKw:nnull(fd.get('ratedKw')),notes:fd.get('notes')};const i=st.energy.sources.findIndex(l=>l.id===rec.id);if(i>=0)st.energy.sources[i]=rec;else st.energy.sources.push(rec);},'Generation source saved');closeModal();}});}
function energyProfileModal(rid){const x=state.energyProfiles.find(p=>p.id===rid)||{};const loadText=(x.loadOverrides||[]).map(o=>`${o.loadId}, ${o.enabled===false?'off':'on'}, ${o.hoursPerDay??''}, ${o.dutyPct??''}`).join('\n'),sourceText=(x.sourceOverrides||[]).map(o=>`${o.sourceId}, ${o.enabled===false?'off':'on'}, ${o.dailyKwh??''}`).join('\n');modal({title:x.id?'Energy Profile':'Add Energy Profile',body:formGrid(field('Name','name',x.name||'Custom','text',{required:true}),field('Kind','kind',x.kind||'custom','select',{options:['underway','motoring','anchor','overnight','conservation','emergency','custom']}),field('Description','description',x.description||'','textarea',{full:true}),field('Load overrides — load ID, on/off, hours/day, duty %','loadOverrides',loadText,'textarea',{full:true,help:'Use load IDs shown in Engineering mode. Omit values to retain baseline.'}),field('Source overrides — source ID, on/off, kWh/day','sourceOverrides',sourceText,'textarea',{full:true})),onSubmit:fd=>{const parseLoads=String(fd.get('loadOverrides')||'').split(/\n+/).map(l=>l.trim()).filter(Boolean).map(l=>{const [loadId,on,h,d]=l.split(',').map(x=>x.trim());return {loadId,enabled:on.toLowerCase()!=='off',hoursPerDay:h===''?null:Number(h),dutyPct:d===''?null:Number(d)}});const parseSources=String(fd.get('sourceOverrides')||'').split(/\n+/).map(l=>l.trim()).filter(Boolean).map(l=>{const [sourceId,on,k]=l.split(',').map(x=>x.trim());return {sourceId,enabled:on.toLowerCase()!=='off',dailyKwh:k===''?null:Number(k)}});mutate(st=>upsertRecord(st,'energyProfiles',{...x,name:fd.get('name'),kind:fd.get('kind'),description:fd.get('description'),loadOverrides:parseLoads,sourceOverrides:parseSources}),'Energy profile saved');closeModal();}});}
async function importGpxFile(file){if(!file)return;const v=activeVoyage();if(!v){toast('Create a passage first.');return;}try{const g=parseGpx(await file.text());if(!g.points.length)throw new Error('No route or track points found.');mutate(st=>{st.routeWaypoints=st.routeWaypoints.filter(w=>w.voyageId!==v.id);g.points.forEach((p,i)=>upsertRecord(st,'routeWaypoints',{voyageId:v.id,name:p.name,lat:p.lat,lon:p.lon,order:(i+1)*10,kind:i===0?'departure':i===g.points.length-1?'arrival':'route',notes:'Imported from GPX.'}));const vv=st.voyages.find(x=>x.id===v.id);vv.routeName=g.name;vv.distanceSource='route';},`${g.points.length} GPX waypoint(s) imported`);}catch(err){toast(`GPX import failed: ${err.message}`);}finally{const el=$('#gpxImport');if(el)el.value='';}}
function exportCurrentGpx(){const v=activeVoyage(),wps=voyageWaypoints(v);if(!v||!wps.length){toast('No route waypoints to export.');return;}downloadText(`${safeFile(v.name||'route')}.gpx`,exportGpx(v.routeName||v.name,wps),'application/gpx+xml');toast('GPX route exported.');}

function parseCurve(text){return String(text||'').split(/\n+/).map(x=>x.trim()).filter(Boolean).map(line=>{const [rpm,speedKt,burnPerHour]=line.split(/[,;\s]+/).map(Number);return {rpm,speedKt,burnPerHour};}).filter(p=>Number.isFinite(p.rpm)&&Number.isFinite(p.speedKt)&&Number.isFinite(p.burnPerHour));}
function parseCalibration(text){return String(text||'').split(/\n+/).map(x=>x.trim()).filter(Boolean).map(line=>{const [reading,quantity]=line.split(/[,;:=\s]+/).map(Number);return {reading,quantity};}).filter(p=>Number.isFinite(p.reading)&&Number.isFinite(p.quantity));}
function resourceModal(rid){
  const x=state.resources.find(v=>v.id===rid)||{}; const curve=(x.fuelCurve||[]).map(p=>`${p.rpm}, ${p.speedKt}, ${p.burnPerHour}`).join('\n');
  modal({title:x.id?'Resource':'Add Resource',body:formGrid(field('Name','name',x.name||'','text',{required:true}),field('Kind','kind',x.kind||'other','select',{options:['fuel','water','provisions','propane','medical','consumable','other']}),field('Unit','unit',x.unit||''),field('Capacity fallback','capacity',x.capacity??'','number',{step:'any',help:'Linked tank capacities override this aggregate when tanks exist.'}),field('Current fallback','current',x.current??'','number',{step:'any',help:'Linked tank quantities override this aggregate when tanks exist.'}),field('Usable','usable',x.usable??'','number',{step:'any'}),field('Reserve','reserve',x.reserve??'','number',{step:'any'}),field('Daily use / rate','dailyUse',x.dailyUse??'','number',{step:'any'}),field('Rate basis','rateBasis',x.rateBasis||'vessel','select',{options:[{value:'vessel',label:'Whole vessel / day'},{value:'per-person',label:'Per person / day'}]}),field('Use rate source','useRateSource',x.useRateSource||'entered','select',{options:[{value:'entered',label:'Entered planning rate'},{value:'historical',label:'Historical transactions when available'}]}),field('Daily production','dailyProduction',x.dailyProduction??'','number',{step:'any'}),field('Uncertainty (%)','uncertaintyPct',x.uncertaintyPct??'','number',{step:'any'}),field('Fuel burn / hr fallback','burnPerHour',x.burnPerHour??'','number',{step:'any'}),field('Planning RPM','planningRpm',x.planningRpm??'','number',{step:'1'}),field('Fuel curve — RPM, speed kt, burn/unit hr','fuelCurve',curve,'textarea',{full:true,help:'One point per line. Example: 2200, 6.2, 0.68'}),field('Notes','notes',x.notes||'','textarea',{full:true})),onSubmit:fd=>{mutate(st=>upsertRecord(st,'resources',{...x,name:fd.get('name'),kind:fd.get('kind'),unit:fd.get('unit'),capacity:nnull(fd.get('capacity')),current:nnull(fd.get('current')),usable:nnull(fd.get('usable')),reserve:nnull(fd.get('reserve')),dailyUse:nnull(fd.get('dailyUse')),rateBasis:fd.get('rateBasis'),useRateSource:fd.get('useRateSource'),dailyProduction:nnull(fd.get('dailyProduction')),uncertaintyPct:nnull(fd.get('uncertaintyPct')),burnPerHour:nnull(fd.get('burnPerHour')),planningRpm:nnull(fd.get('planningRpm')),fuelCurve:parseCurve(fd.get('fuelCurve')),notes:fd.get('notes')}),'Resource saved');closeModal();}});
}
function tankModal(rid){
  const x=state.tanks.find(v=>v.id===rid)||{}, cal=(x.calibration||[]).map(p=>`${p.reading}, ${p.quantity}`).join('\n');
  modal({title:x.id?'Tank':'Add Tank',body:formGrid(field('Name','name',x.name||'','text',{required:true}),field('Resource','resourceId',x.resourceId||state.resources[0]?.id||'','select',{options:activeRecords(state.resources).map(r=>({value:r.id,label:r.name}))}),field('Capacity','capacity',x.capacity??'','number',{step:'any'}),field('Usable','usable',x.usable??'','number',{step:'any'}),field('Current quantity','current',x.current??'','number',{step:'any'}),field('Reserve','reserve',x.reserve??0,'number',{step:'any'}),field('Unit','unit',x.unit||state.resources.find(r=>r.id===x.resourceId)?.unit||''),field('Reading unit','readingUnit',x.readingUnit||'%'),field('Source','source',x.source||'manual'),field('Confidence','confidence',x.confidence||'medium','select',{options:['low','medium','high']}),field('Last reading','lastReadingAt',x.lastReadingAt?new Date(x.lastReadingAt).toISOString().slice(0,16):'','datetime-local'),field('Calibration — reading, quantity','calibration',cal,'textarea',{full:true,help:'For irregular tanks. Example: 50, 39 means gauge reading 50 corresponds to 39 units.'}),field('Notes','notes',x.notes||'','textarea',{full:true})),onSubmit:fd=>{mutate(st=>{const rec=upsertRecord(st,'tanks',{...x,name:fd.get('name'),resourceId:fd.get('resourceId'),capacity:nnull(fd.get('capacity')),usable:nnull(fd.get('usable')),current:nnull(fd.get('current')),reserve:nnull(fd.get('reserve')),unit:fd.get('unit'),readingUnit:fd.get('readingUnit'),source:fd.get('source'),confidence:fd.get('confidence'),lastReadingAt:fd.get('lastReadingAt')?new Date(fd.get('lastReadingAt')).toISOString():'',calibration:parseCalibration(fd.get('calibration')),notes:fd.get('notes')});syncResourceFromTanks(st,rec.resourceId);},'Tank saved');closeModal();}});
}
function resourceTransactionModal(resourceId){
  const r=state.resources.find(x=>x.id===resourceId);if(!r)return;const tanks=state.tanks.filter(t=>t.resourceId===resourceId&&!t.archived);
  modal({title:`Record resource change — ${r.name}`,body:formGrid(field('Tank','tankId','','select',{options:[{value:'',label:'Aggregate / no tank'},...tanks.map(t=>({value:t.id,label:t.name}))]}),field('Type','type','consume','select',{options:['consume','fill','produce','drain','adjust','reading']}),field('Quantity / direct quantity','quantity','','number',{step:'any',help:'Positive magnitude. For adjust, enter signed amount. For reading, leave blank to use calibrated raw reading.'}),field('Duration represented (days)','durationDays','','number',{step:'any',help:'For daily-use history such as water.'}),field('Engine-run duration (hours)','durationHours','','number',{step:'any',help:'For fuel performance observations; use explicit run hours only.'}),field('RPM','rpm','','number',{step:'1'}),field('Distance represented (nm)','distanceNm','','number',{step:'any',help:'Optional; enables observed speed for fuel samples.'}),field('Crew aboard','crewCount',state.crew.length||'','number',{step:'1',min:1}),field('Operating context','context','','text',{help:'Examples: offshore, motoring, anchor, marina.'}),field('Source','source','Manual'),field('Confidence','confidence','medium','select',{options:['low','medium','high']}),field('Time','at',new Date().toISOString().slice(0,16),'datetime-local'),field('Raw reading','reading','','number',{step:'any',help:'Optional gauge/sounding reading for provenance.'}),field('Notes','notes','','textarea',{full:true})),submitLabel:'Record transaction',onSubmit:fd=>{mutate(st=>{const type=fd.get('type'),tankId=fd.get('tankId'),reading=nnull(fd.get('reading'));let quantity=nnull(fd.get('quantity'));if(type==='reading'){const tank=st.tanks.find(t=>t.id===tankId);if(!tank)throw new Error('Choose a tank for a calibrated reading.');const calibrated=reading!==null?tankQuantityFromCalibration(reading,tank.calibration):null;quantity=calibrated!==null?calibrated:quantity!==null?quantity:reading;if(quantity===null)throw new Error('Enter a direct quantity or a raw reading with calibration.');}applyResourceTransaction(st,resourceId,{tankId,type,quantity:quantity??0,durationDays:nnull(fd.get('durationDays')),durationHours:nnull(fd.get('durationHours')),rpm:nnull(fd.get('rpm')),distanceNm:nnull(fd.get('distanceNm')),crewCount:nnull(fd.get('crewCount')),context:fd.get('context'),source:fd.get('source'),confidence:fd.get('confidence'),at:new Date(fd.get('at')).toISOString(),reading,notes:fd.get('notes')});},'Resource transaction recorded');closeModal();}});
}
function energyObservationModal(rid){const x=state.energyObservations.find(v=>v.id===rid)||{},profile=state.energyProfiles.find(p=>p.id===(x.energyProfileId||state.settings.activeEnergyProfileId))||activeEnergyProfile(),projection=profile?energyProfileProjection(state.energy,profile):energyProfileProjection(state.energy,null);modal({title:x.id?'Energy Observation':'Record Energy Observation',body:formGrid(field('Operating profile','energyProfileId',x.energyProfileId||profile?.id||'','select',{options:[{value:'',label:'Unspecified'},...visible(state.energyProfiles).map(p=>({value:p.id,label:p.name}))]}),field('Voyage','voyageId',x.voyageId||activeVoyage()?.id||'','select',{options:[{value:'',label:'—'},...visible(state.voyages).map(v=>({value:v.id,label:v.name}))]}),field('Observed day / time','at',x.at?new Date(x.at).toISOString().slice(0,16):localInputDate(),'datetime-local'),field('Predicted load (kWh/day)','predictedUseKwh',x.predictedUseKwh??projection?.use??'','number',{step:'0.01'}),field('Actual load (kWh/day)','actualUseKwh',x.actualUseKwh??'','number',{step:'0.01',required:true}),field('Predicted generation (kWh/day)','predictedGenerationKwh',x.predictedGenerationKwh??projection?.gen??'','number',{step:'0.01'}),field('Actual generation (kWh/day)','actualGenerationKwh',x.actualGenerationKwh??'','number',{step:'0.01',required:true}),field('Context','context',x.context||profile?.kind||''),field('Source','source',x.source||'Daily electrical log'),field('Confidence','confidence',x.confidence||'medium','select',{options:['low','medium','high']}),field('Notes','notes',x.notes||'','textarea',{full:true,help:'Record meter/source limitations and unusual conditions.'})),onSubmit:fd=>{mutate(st=>upsertRecord(st,'energyObservations',{...x,energyProfileId:fd.get('energyProfileId'),voyageId:fd.get('voyageId'),at:new Date(fd.get('at')).toISOString(),predictedUseKwh:nnull(fd.get('predictedUseKwh')),actualUseKwh:nnull(fd.get('actualUseKwh')),predictedGenerationKwh:nnull(fd.get('predictedGenerationKwh')),actualGenerationKwh:nnull(fd.get('actualGenerationKwh')),context:fd.get('context'),source:fd.get('source'),confidence:fd.get('confidence'),notes:fd.get('notes')}),'Energy observation saved');closeModal();}});}
function provisionModal(rid){const x=state.provisions.find(v=>v.id===rid)||{};modal({title:x.id?'Provision':'Add Provision',body:formGrid(field('Name','name',x.name||'','text',{required:true}),field('Category','category',x.category||'Dry goods'),field('Servings remaining','servingsRemaining',x.servingsRemaining??'','number',{step:'any'}),field('Servings / person-day','servingsPerPersonDay',x.servingsPerPersonDay??1,'number',{step:'any'}),field('Storage','storageLocationId',x.storageLocationId||'','select',{options:[{value:'',label:'—'},...activeRecords(state.storageLocations).map(l=>({value:l.id,label:storagePath(state,l.id)||l.name}))]}),field('Expires','expires',x.expires||'','date'),field('Refrigerated','refrigerated',x.refrigerated?'yes':'no','select',{options:[{value:'no',label:'No'},{value:'yes',label:'Yes'}]}),field('Counts toward passage endurance','countsForEndurance',x.countsForEndurance===false?'no':'yes','select',{options:[{value:'yes',label:'Yes'},{value:'no',label:'No — fresh/reserve/supplemental'}]}),field('Notes','notes',x.notes||'','textarea',{full:true})),onSubmit:fd=>{mutate(st=>upsertRecord(st,'provisions',{...x,name:fd.get('name'),category:fd.get('category'),servingsRemaining:nnull(fd.get('servingsRemaining')),servingsPerPersonDay:nnull(fd.get('servingsPerPersonDay')),storageLocationId:fd.get('storageLocationId'),expires:fd.get('expires'),refrigerated:fd.get('refrigerated')==='yes',countsForEndurance:fd.get('countsForEndurance')==='yes',notes:fd.get('notes')}),'Provision saved');closeModal();}});}
function storageLocationModal(rid){const x=state.storageLocations.find(v=>v.id===rid)||{};modal({title:x.id?'Storage Location':'Add Storage Location',body:formGrid(field('Name','name',x.name||'','text',{required:true}),field('Parent','parentLocationId',x.parentLocationId||'','select',{options:[{value:'',label:'Vessel / root'},...activeRecords(state.storageLocations).filter(l=>l.id!==x.id).map(l=>({value:l.id,label:storagePath(state,l.id)||l.name}))]}),field('Description','description',x.description||'','textarea',{full:true})),onSubmit:fd=>{mutate(st=>{const rec=upsertRecord(st,'storageLocations',{...x,name:fd.get('name'),parentLocationId:x.parentLocationId||'',description:fd.get('description')});const result=setStorageParent(st,rec.id,fd.get('parentLocationId'));if(!result.ok)throw new Error(result.reason);},'Storage location saved');closeModal();}});}
function inventoryModal(rid){const x=state.inventory.find(v=>v.id===rid)||{};modal({title:x.id?'Store Item':'Add Store Item',body:formGrid(field('Name','name',x.name||'','text',{required:true}),field('Category','category',x.category||'Spare part'),field('Quantity','qty',x.qty??0,'number',{step:'any'}),field('Unit','unit',x.unit||'ea'),field('Minimum','minimum',x.minimum??0,'number',{step:'any'}),field('Desired','desired',x.desired??0,'number',{step:'any'}),field('Storage location','storageLocationId',x.storageLocationId||'','select',{options:[{value:'',label:'— / free text'},...activeRecords(state.storageLocations).map(l=>({value:l.id,label:storagePath(state,l.id)||l.name}))]}),field('Legacy / detail location','location',x.location||''),field('Part number','partNumber',x.partNumber||''),field('Manufacturer','manufacturer',x.manufacturer||''),field('Supplier','supplier',x.supplier||''),field('Unit cost','cost',x.cost??'','number',{step:'any'}),field('System','systemId',x.systemId||'','select',{options:[{value:'',label:'—'},...state.systems.map(s=>({value:s.id,label:s.name}))]}),field('Equipment','equipmentId',x.equipmentId||'','select',{options:[{value:'',label:'—'},...state.equipment.map(e=>({value:e.id,label:e.name}))]}),field('Criticality','criticality',x.criticality||'medium','select',{options:['low','medium','high']}),field('Expires','expires',x.expires||'','date'),field('Notes','notes',x.notes||'','textarea',{full:true})),onSubmit:fd=>{mutate(st=>upsertRecord(st,'inventory',{...x,name:fd.get('name'),category:fd.get('category'),qty:Number(fd.get('qty'))||0,unit:fd.get('unit'),minimum:Number(fd.get('minimum'))||0,desired:Number(fd.get('desired'))||0,storageLocationId:fd.get('storageLocationId'),location:fd.get('location'),partNumber:fd.get('partNumber'),manufacturer:fd.get('manufacturer'),supplier:fd.get('supplier'),cost:nnull(fd.get('cost')),systemId:fd.get('systemId'),equipmentId:fd.get('equipmentId'),criticality:fd.get('criticality'),expires:fd.get('expires'),notes:fd.get('notes')}),'Inventory saved');closeModal();}});}
function inventoryAdjustModal(rid){const x=state.inventory.find(v=>v.id===rid);if(!x)return;modal({title:`Adjust stock — ${x.name}`,body:formGrid(field('Action','type','restock','select',{options:['restock','consume','adjust','transfer']}),field('Quantity / signed adjustment','quantity','','number',{step:'any',help:'Restock/consume use a positive quantity. Adjust can be positive or negative. Transfer may be zero.'}),field('Transfer destination','targetLocationId',x.storageLocationId||'','select',{options:[{value:'',label:'—'},...activeRecords(state.storageLocations).map(l=>({value:l.id,label:storagePath(state,l.id)||l.name}))]}),field('Source','source','Manual'),field('Unit cost','unitCost','','number',{step:'any'}),field('Time','at',new Date().toISOString().slice(0,16),'datetime-local'),field('Notes','notes','','textarea',{full:true})),submitLabel:'Record stock change',onSubmit:fd=>{const type=fd.get('type'),raw=Number(fd.get('quantity'))||0,delta=type==='consume'?-Math.abs(raw):type==='restock'?Math.abs(raw):type==='transfer'?0:raw;mutate(st=>{const tx=adjustInventory(st,rid,delta,{type,source:fd.get('source'),unitCost:nnull(fd.get('unitCost')),at:new Date(fd.get('at')).toISOString(),notes:fd.get('notes')});if(type==='transfer'){const item=st.inventory.find(i=>i.id===rid);const from=item.storageLocationId||'';item.storageLocationId=fd.get('targetLocationId');item.updatedAt=new Date().toISOString();tx.fromStorageLocationId=from;tx.toStorageLocationId=item.storageLocationId;}},'Stock transaction recorded');closeModal();}});}
function inventoryTransactionView(rid){openInspector('inventoryTransactions',rid);}
function procedureModal(rid){const x=state.procedures.find(v=>v.id===rid)||{};modal({title:'Procedure',body:formGrid(field('Name','name',x.name||'','text',{required:true}),field('Category','category',x.category||'normal','select',{options:['normal','abnormal','emergency']}),field('Purpose','purpose',x.purpose||'','textarea',{full:true}),field('Prerequisites','prerequisites',x.prerequisites||'','textarea',{full:true}),field('Warnings','warnings',x.warnings||'','textarea',{full:true}),field('Equipment locations','equipmentLocations',x.equipmentLocations||'','textarea',{full:true}),field('Required tools — comma separated','requiredTools',(x.requiredTools||[]).join(', '),'text',{full:true}),field('Required part IDs — comma separated','requiredParts',(x.requiredParts||[]).join(', '),'text',{full:true}),field('Steps — one per line','steps',(x.steps||[]).join('\n'),'textarea',{full:true}),field('Procedure notes','notes',x.notes||'','textarea',{full:true})),onSubmit:fd=>{mutate(s=>upsertRecord(s,'procedures',{...x,name:fd.get('name'),category:fd.get('category'),purpose:fd.get('purpose'),prerequisites:fd.get('prerequisites'),warnings:fd.get('warnings'),equipmentLocations:fd.get('equipmentLocations'),requiredTools:fd.get('requiredTools').split(',').map(v=>v.trim()).filter(Boolean),requiredParts:fd.get('requiredParts').split(',').map(v=>v.trim()).filter(Boolean),steps:fd.get('steps').split('\n').map(v=>v.trim()).filter(Boolean),notes:fd.get('notes')}),'Procedure saved');closeModal();}});}
function runProcedure(rid){const p=state.procedures.find(x=>x.id===rid);if(!p)return;let execution;mutate(s=>{execution=startProcedureExecution(s,p.id,{voyageId:activeVoyage()?.id||'',crewId:state.crew[0]?.id||'',performedBy:state.crew[0]?.name||'Crew',startedAt:new Date().toISOString()});},`Procedure started — ${p.name}`);procedureExecutionModal(execution.id);}
function procedureExecutionModal(executionId){const x=state.procedureExecutions.find(e=>e.id===executionId);if(!x)return;const p=state.procedures.find(q=>q.id===x.procedureId),sum=procedureExecutionSummary(x),active=x.status==='in-progress';const stepRows=(x.steps||[]).map(step=>`<div class="list-item" data-proc-step="${step.index}"><div class="list-icon">${step.status==='done'?'✓':step.status==='skipped'?'↷':step.index+1}</div><div><div class="list-title">${step.index+1}. ${esc(step.text)}</div><div class="list-meta">${step.status==='pending'?'Pending':step.status==='done'?`Completed ${dateTime(step.at)}`:`Skipped ${dateTime(step.at)} · ${esc(step.reason)}`}${step.notes?` · ${esc(step.notes)}`:''}</div></div><div class="list-right">${statusBadge(step.status==='done'?'pass':step.status==='skipped'?'watch':'unknown')}${active?`<div class="action-row" style="margin-top:6px"><button type="button" class="ghost-btn" data-proc-done="${step.index}">Done</button><button type="button" class="ghost-btn" data-proc-skip="${step.index}">Skip</button>${step.status!=='pending'?`<button type="button" class="ghost-btn" data-proc-reset="${step.index}">Reset</button>`:''}</div>`:''}</div></div>`).join('');modal({title:`${active?'Run':'Execution'} — ${x.procedureName||p?.name||'Procedure'}`,body:`<div class="callout ${x.category==='emergency'?'fail':''}"><strong>${esc(p?.purpose||'Procedure execution')}</strong>${p?.warnings?`<br><strong>Warning:</strong> ${esc(p.warnings)}`:''}${p?.prerequisites?`<br><strong>Prerequisites:</strong> ${esc(p.prerequisites)}`:''}${p?.equipmentLocations?`<br><strong>Locations:</strong> ${esc(p.equipmentLocations)}`:''}</div><div class="grid cols-3" style="margin-top:12px">${metric('DONE',String(sum.done),`${sum.total} total`)}${metric('SKIPPED',String(sum.skipped),'Reason required')}${metric('PENDING',String(sum.pending),x.status)}</div><div style="margin-top:14px">${stepRows}</div>${formGrid(field('Execution / completion notes','completionNotes',x.completionNotes||x.notes||'','textarea',{full:true}))}`,submitLabel:active?'Complete execution':'Close',dangerLabel:active?'Abort execution':null,onDanger:active?()=>{const at=new Date().toISOString(),notes=$('#modalForm [name="completionNotes"]')?.value||'';mutate(s=>{finishProcedureExecution(s,x.id,{status:'aborted',at,notes});upsertRecord(s,'logs',{category:'procedure',author:x.performedBy||'Crew',title:`Procedure aborted: ${x.procedureName}`,at,procedureId:x.procedureId,procedureExecutionId:x.id,voyageId:x.voyageId||'',text:`Execution aborted. ${notes}`});},'Procedure execution aborted');closeModal();}:null,onSubmit:fd=>{if(!active){closeModal();return;}try{const at=new Date().toISOString();mutate(s=>{finishProcedureExecution(s,x.id,{status:'completed',at,notes:fd.get('completionNotes')});const done=procedureExecutionSummary(s.procedureExecutions.find(e=>e.id===x.id));upsertRecord(s,'logs',{category:'procedure',author:x.performedBy||'Crew',title:`Procedure completed: ${x.procedureName}`,at,procedureId:x.procedureId,procedureExecutionId:x.id,voyageId:x.voyageId||'',text:`Completed ${done.done}/${done.total} steps; skipped ${done.skipped}. ${fd.get('completionNotes')||''}`});},'Procedure execution completed');closeModal();}catch(err){toast(err.message);}}});if(!active)return;const root=$('#modalRoot');root.querySelectorAll('[data-proc-done]').forEach(b=>b.onclick=()=>{mutate(s=>recordProcedureStep(s,x.id,+b.dataset.procDone,{status:'done'}),'Step completed');procedureExecutionModal(x.id);});root.querySelectorAll('[data-proc-reset]').forEach(b=>b.onclick=()=>{mutate(s=>recordProcedureStep(s,x.id,+b.dataset.procReset,{status:'pending'}),'Step reset');procedureExecutionModal(x.id);});root.querySelectorAll('[data-proc-skip]').forEach(b=>b.onclick=()=>skipProcedureStepModal(x.id,+b.dataset.procSkip));}
function skipProcedureStepModal(executionId,stepIndex){const x=state.procedureExecutions.find(e=>e.id===executionId),step=x?.steps?.find(s=>Number(s.index)===Number(stepIndex));if(!x||!step)return;modal({title:`Skip step ${stepIndex+1}?`,body:`<div class="callout warn"><strong>${esc(step.text)}</strong><br>Skipped steps remain visible in the permanent execution record.</div>${formGrid(field('Reason for skipping','reason','','textarea',{full:true,required:true}),field('Step notes','notes','','textarea',{full:true}))}`,submitLabel:'Record skip',onSubmit:fd=>{try{mutate(s=>recordProcedureStep(s,executionId,stepIndex,{status:'skipped',reason:fd.get('reason'),notes:fd.get('notes')}),'Skipped step recorded');procedureExecutionModal(executionId);}catch(err){toast(err.message);}}});}


function dataUrlToDownload(e){
  if(!e?.dataUrl)return;const a=document.createElement('a');a.href=e.dataUrl;a.download=e.originalFilename||safeFile(e.title||'evidence');a.target='_blank';document.body.appendChild(a);a.click();a.remove();
}
function downloadEvidence(rid){const e=state.evidence.find(x=>x.id===rid);if(!e?.dataUrl){toast('This evidence record has metadata only; no embedded file is stored.');return;}dataUrlToDownload(e);}
function readEvidenceFile(file,maxBytes){return new Promise((resolve,reject)=>{if(!file)return resolve(null);if(file.size>maxBytes)return reject(new Error(`File is ${(file.size/1048576).toFixed(1)} MB; embedded evidence is limited to ${(maxBytes/1048576).toFixed(0)} MB per file in this release.`));const r=new FileReader();r.onerror=()=>reject(new Error('Could not read selected evidence file.'));r.onload=()=>resolve({dataUrl:r.result,originalFilename:file.name,mimeType:file.type||'application/octet-stream',sizeBytes:file.size});r.readAsDataURL(file);});}
function evidenceModal(rid,targetCollection='',targetId=''){
  const x=state.evidence.find(v=>v.id===rid)||{},max=Number(state.settings.evidenceMaxBytes)||5242880;
  const fileControl=`<div class="field full"><label>Embed local file (optional)</label><input name="evidenceFile" type="file" accept="image/*,.pdf,.txt,.csv,.json,.gpx,.md"><small>Stored inside AFLOAT local data/backup. Maximum ${(max/1048576).toFixed(0)} MB per file. ${x.dataUrl?'Selecting a new file replaces the embedded payload.':'Metadata-only evidence is also supported.'}</small></div>`;
  modal({title:x.id?'Evidence Item':'Add Evidence',body:`${formGrid(field('Title','title',x.title||x.name||'','text',{required:true}),field('Kind','kind',x.kind||'photo','select',{options:['photo','document','receipt','manual','inspection','measurement','weather','screenshot','sensor-log','note','other']}),field('Observed / captured at','observedAt',x.observedAt?new Date(x.observedAt).toISOString().slice(0,16):localInputDate(),'datetime-local'),field('Captured by','capturedBy',x.capturedBy||''),field('Source','source',x.source||'manual'),field('Original filename','originalFilename',x.originalFilename||''),field('Notes','notes',x.notes||'','textarea',{full:true}))}${fileControl}<div class="callout"><strong>Multi-record evidence:</strong> save the item, then use <em>Related To</em> from its inspector to link it to inspections, findings, maintenance, equipment, voyages, ports, documents, or other records.</div>`,onSubmit:async(fd,form)=>{try{const file=form.querySelector('[name="evidenceFile"]')?.files?.[0],payload=await readEvidenceFile(file,max);mutate(st=>{const rec=upsertRecord(st,'evidence',{...x,title:fd.get('title'),name:fd.get('title'),kind:fd.get('kind'),observedAt:fd.get('observedAt')?new Date(fd.get('observedAt')).toISOString():'',capturedBy:fd.get('capturedBy'),source:fd.get('source'),originalFilename:payload?.originalFilename||fd.get('originalFilename')||x.originalFilename||'',mimeType:payload?.mimeType||x.mimeType||'',sizeBytes:payload?.sizeBytes??x.sizeBytes??null,dataUrl:payload?.dataUrl||x.dataUrl||'',notes:fd.get('notes')});if(targetCollection&&targetId)addRelationship(st,'evidence',rec.id,targetCollection,targetId,'Supports record');},targetCollection?'Evidence saved and linked':'Evidence saved');closeModal();}catch(err){toast(err.message);}}});
}
function timelineEventModal(rid){const x=state.timelineEvents.find(v=>v.id===rid)||{};modal({title:x.id?'Timeline Milestone':'Add Timeline Milestone',body:formGrid(field('Title','title',x.title||'','text',{required:true}),field('When','at',x.at?new Date(x.at).toISOString().slice(0,16):localInputDate(),'datetime-local',{required:true}),field('Type','kind',x.kind||'milestone','select',{options:['milestone','refit','incident','decision','lesson','other']}),field('System','systemId',x.systemId||'','select',{options:[{value:'',label:'—'},...visible(state.systems).map(v=>({value:v.id,label:v.name}))]}),field('Voyage','voyageId',x.voyageId||'','select',{options:[{value:'',label:'—'},...visible(state.voyages).map(v=>({value:v.id,label:v.name}))]}),field('Severity / importance','severity',x.severity||'info','select',{options:['info','low','medium','high','critical']}),field('Detail','detail',x.detail||x.notes||'','textarea',{full:true})),onSubmit:fd=>{mutate(st=>upsertRecord(st,'timelineEvents',{...x,title:fd.get('title'),at:new Date(fd.get('at')).toISOString(),kind:fd.get('kind'),systemId:fd.get('systemId'),voyageId:fd.get('voyageId'),severity:fd.get('severity'),detail:fd.get('detail')}),'Timeline milestone saved');closeModal();}});}

function portModal(rid){const x=state.ports.find(v=>v.id===rid)||{};modal({title:'Port Record',body:formGrid(field('Port','name',x.name||'','text',{required:true}),field('Country / region','country',x.country||''),field('Latitude','lat',x.lat??'','number',{step:'0.0001'}),field('Longitude','lon',x.lon??'','number',{step:'0.0001'}),field('VHF / communications','vhf',x.vhf||''),field('Harbor master','harborMaster',x.harborMaster||''),field('Marina / mooring notes','marina',x.marina||''),field('Propane notes','propane',x.propane||''),field('Arrival / approach notes','arrival',x.arrival||'','textarea',{full:true}),field('Customs','customs',x.customs||'','textarea',{full:true}),field('Immigration','immigration',x.immigration||'','textarea',{full:true}),field('Repair/services notes','repairs',x.repairs||'','textarea',{full:true}),field('Groceries','groceries',x.groceries||''),field('Laundry','laundry',x.laundry||''),field('Medical','medical',x.medical||''),field('Transport','transport',x.transport||''),field('Dinghy landing','dinghyLanding',x.dinghyLanding||''),field('Internet / cellular','internet',x.internet||''),field('Useful contacts','contacts',x.contacts||'','textarea',{full:true}),field('Fuel available','fuel',x.fuel?'yes':'unknown','select',{options:['yes','no','unknown']}),field('Water available','water',x.water?'yes':'unknown','select',{options:['yes','no','unknown']}),field('Chandlery','chandlery',x.chandlery?'yes':'unknown','select',{options:['yes','no','unknown']}),field('Source','source',x.source||''),field('Verified date','verified',x.verified||'','date'),field('Confidence','confidence',x.confidence||'low','select',{options:['low','medium','high']}),field('Notes','notes',x.notes||'','textarea',{full:true})),onSubmit:fd=>{mutate(st=>upsertRecord(st,'ports',{...x,name:fd.get('name'),country:fd.get('country'),lat:nnull(fd.get('lat')),lon:nnull(fd.get('lon')),vhf:fd.get('vhf'),harborMaster:fd.get('harborMaster'),marina:fd.get('marina'),propane:fd.get('propane'),arrival:fd.get('arrival'),customs:fd.get('customs'),immigration:fd.get('immigration'),repairs:fd.get('repairs'),groceries:fd.get('groceries'),laundry:fd.get('laundry'),medical:fd.get('medical'),transport:fd.get('transport'),dinghyLanding:fd.get('dinghyLanding'),internet:fd.get('internet'),contacts:fd.get('contacts'),fuel:fd.get('fuel')==='yes',water:fd.get('water')==='yes',chandlery:fd.get('chandlery')==='yes',source:fd.get('source'),verified:fd.get('verified'),confidence:fd.get('confidence'),notes:fd.get('notes')}),'Port saved');closeModal();}});}
function portVisitModal(rid,portId){const x=state.portVisits.find(v=>v.id===rid)||{},p=state.ports.find(v=>v.id===(x.portId||portId))||{};modal({title:x.id?'Port Visit':'Record Port Visit',body:formGrid(field('Port','portId',x.portId||p.id||'','select',{options:[{value:'',label:'—'},...visible(state.ports).map(v=>({value:v.id,label:v.name}))]}),field('Visit type','visitType',x.visitType||'port','select',{options:['port','marina','mooring','anchorage','haulout','other']}),field('Arrived','arrivedAt',x.arrivedAt?new Date(x.arrivedAt).toISOString().slice(0,16):localInputDate(),'datetime-local'),field('Departed','departedAt',x.departedAt?new Date(x.departedAt).toISOString().slice(0,16):'','datetime-local'),field('Berth / anchorage / location','berth',x.berth||''),field('Services used','servicesUsed',x.servicesUsed||''),field('Fuel added','fuelAdded',x.fuelAdded??'','number',{step:'any',help:'Keep the unit clear in notes if not the vessel default.'}),field('Water added','waterAdded',x.waterAdded??'','number',{step:'any'}),field('Visit notes','notes',x.notes||'','textarea',{full:true}),field('Lessons learned','lessons',x.lessons||'','textarea',{full:true})),onSubmit:fd=>{mutate(st=>{const rec=upsertRecord(st,'portVisits',{...x,portId:fd.get('portId'),visitType:fd.get('visitType'),arrivedAt:new Date(fd.get('arrivedAt')).toISOString(),departedAt:fd.get('departedAt')?new Date(fd.get('departedAt')).toISOString():'',berth:fd.get('berth'),servicesUsed:fd.get('servicesUsed'),fuelAdded:nnull(fd.get('fuelAdded')),waterAdded:nnull(fd.get('waterAdded')),notes:fd.get('notes'),lessons:fd.get('lessons')});upsertRecord(st,'logs',{category:'port',author:'Crew',title:`Port visit: ${st.ports.find(v=>v.id===rec.portId)?.name||'Port'}`,at:rec.arrivedAt,text:`${rec.notes||'Visit recorded.'}${rec.lessons?` Lessons: ${rec.lessons}`:''}`,portId:rec.portId,portVisitId:rec.id});},'Port visit saved and logged');closeModal();}});}
function documentModal(rid){const x=state.documents.find(v=>v.id===rid)||{};const crewOpts=[{value:'',label:'Vessel / not crew-specific'},...visible(state.crew).map(c=>({value:c.id,label:c.name}))];modal({title:'Ship’s Paper / Document',body:formGrid(field('Name','name',x.name||'','text',{required:true}),field('Category','category',x.category||'other','select',{options:['registration','insurance','passport','visa','radio','safety','permit','qualification','inspection','other']}),field('Document number','number',x.number||''),field('Holder','holder',x.holder||''),field('Crew member','crewId',x.crewId||'','select',{options:crewOpts}),field('Authority / issuer','authority',x.authority||x.country||''),field('Country / jurisdiction','country',x.country||''),field('Issued','issued',x.issued||'','date'),field('Expires','expires',x.expires||'','date'),field('Departure review','requiredForDeparture',x.requiredForDeparture===false?'no':'yes','select',{options:[{value:'yes',label:'Required / include in readiness'},{value:'no',label:'Informational only'}]}),field('Verification source','source',x.source||''),field('Source date','sourceDate',x.sourceDate||'','date'),field('Verified / reviewed','verifiedAt',x.verifiedAt||'','date'),field('Confidence','confidence',x.confidence||'medium','select',{options:['low','medium','high']}),field('Renewal / verification notes','renewalNotes',x.renewalNotes||'','textarea',{full:true}),field('Notes','notes',x.notes||'','textarea',{full:true})),onSubmit:fd=>{mutate(s=>upsertRecord(s,'documents',{...x,name:fd.get('name'),category:fd.get('category'),number:fd.get('number'),holder:fd.get('holder'),crewId:fd.get('crewId'),authority:fd.get('authority'),country:fd.get('country'),issued:fd.get('issued'),expires:fd.get('expires'),requiredForDeparture:fd.get('requiredForDeparture')==='yes',source:fd.get('source'),sourceDate:fd.get('sourceDate'),verifiedAt:fd.get('verifiedAt'),confidence:fd.get('confidence'),renewalNotes:fd.get('renewalNotes'),notes:fd.get('notes')}),'Document saved');closeModal();}});}

function quickLogModal(){logModal();} function logModal(rid){const x=state.logs.find(v=>v.id===rid)||{};modal({title:x.id?'Edit Log Entry':'Quick Log Entry',body:formGrid(field('Category','category',x.category||'routine','select',{options:['routine','navigation','weather','maintenance','inspection','watch','anchoring','port','incident','repair','resource','observation','lesson learned']}),field('Author','author',x.author||''),field('Title','title',x.title||''),field('Time','at',x.at?new Date(x.at).toISOString().slice(0,16):new Date().toISOString().slice(0,16),'datetime-local'),field('Latitude','lat',x.lat??activeVoyage()?.position?.lat??'','number',{step:'0.0001'}),field('Longitude','lon',x.lon??activeVoyage()?.position?.lon??'','number',{step:'0.0001'}),field('Notes','text',x.text||'','textarea',{full:true,required:true})),onSubmit:fd=>{mutate(s=>upsert(s.logs,{id:x.id||id('log'),category:fd.get('category'),author:fd.get('author'),title:fd.get('title'),at:new Date(fd.get('at')).toISOString(),lat:nnull(fd.get('lat')),lon:nnull(fd.get('lon')),text:fd.get('text')}),'Log entry saved');closeModal();}});}
function findingModal(rid){const x=state.findings.find(v=>v.id===rid)||{};modal({title:'Finding',body:formGrid(field('Title','title',x.title||'','text',{required:true}),field('System','systemId',x.systemId||'','select',{options:[{value:'',label:'—'},...state.systems.map(s=>({value:s.id,label:s.name}))]}),field('Severity','severity',x.severity||'medium','select',{options:['info','low','medium','high','critical']}),field('Confidence','confidence',x.confidence||'medium','select',{options:['low','medium','high']}),field('Status','status',x.status||'open','select',{options:['open','reviewed','deferred','resolved','accepted']}),field('Source','source',x.source||'manual'),field('Due','due',x.due||'','date'),field('Description','description',x.description||'','textarea',{full:true}),field('Recommended action','action',x.action||'','textarea',{full:true})),onSubmit:fd=>{mutate(s=>upsert(s.findings,{...x,id:x.id||id('find'),title:fd.get('title'),systemId:fd.get('systemId'),severity:fd.get('severity'),confidence:fd.get('confidence'),status:fd.get('status'),source:fd.get('source'),due:fd.get('due'),description:fd.get('description'),action:fd.get('action')}),'Finding saved');closeModal();}});}

function saveLimits(){state.settings.limits.maxWindKt=nnull($('#limWind').value);state.settings.limits.maxWaveM=nnull($('#limWave').value);scheduleSave();toast('Vessel preferences saved.');renderPage();}
function exportBackup(){const at=new Date().toISOString();state.settings.lastBackupAt=at;state.settings.lastBackupRecordCount=totalRecordCount();state.backupMeta={format:'AFLOAT vessel backup',exportedAt:at,appVersion:APP_VERSION,schemaVersion:state.schemaVersion,recordCount:state.settings.lastBackupRecordCount};state.updatedAt=at;saveState(state).catch(err=>console.warn('Could not persist backup timestamp',err));downloadJSON(`AFLOAT-${safeFile(state.vessel.name)}-${at.slice(0,10)}.json`,state);toast('Recovery copy downloaded and marked as last backup.');renderPage();}
async function importFile(file,reload){if(!file)return;try{const obj=JSON.parse(await file.text()),check=validateState(obj);if(!check.ok)throw new Error(check.errors.join(' '));const migrated=migrateState(obj),post=validateState(migrated);if(!post.ok)throw new Error(post.errors.join(' '));state=migrated;normalizeState();await saveState(state);toast(`Backup restored · schema v${state.schemaVersion} · ${totalRecordCount()} records.`);if(reload)location.reload();else{applySettings();renderShell();}}catch(err){console.error(err);toast(`Import failed: ${err.message}`);}}
function loadDemoConfirm(){modal({title:'Load Demo Vessel?',body:'<div class="callout warn"><strong>This replaces the current local vessel state.</strong> Export a backup first if you need to keep it.</div>',submitLabel:'Load demo',onSubmit:async()=>{state=demoState();normalizeState();await saveState(state);closeModal();applySettings();renderShell();toast('Demo vessel loaded.');}});}
function freshStartConfirm(){modal({title:'Fresh Start',body:'<div class="callout fail"><strong>This replaces the current local vessel with a blank vessel.</strong> Export first if needed.</div>'+formGrid(field('New vessel name','name','Untitled Vessel','text',{required:true})),submitLabel:'Create blank vessel',onSubmit:async fd=>{state=blankState(fd.get('name'));await saveState(state);closeModal();applySettings();renderShell();toast('Blank vessel created.');}});}
function searchModal(){
  const body=`<div class="field"><label>Search vessel knowledge</label><input id="searchInput" type="search" autocomplete="off" placeholder="Try: Balmar, impeller, Horta, watermaker…"><small>Direct matches are expanded through the vessel relationship graph up to two hops.</small></div><div id="searchSummary" class="knowledge-summary"></div><div id="searchResults" class="search-results knowledge-results" style="margin-top:12px"></div>`;
  modal({title:'Vessel Knowledge Search',body,submitLabel:null}); const inp=$('#searchInput'),res=$('#searchResults'),summary=$('#searchSummary');
  const run=()=>{
    const q=inp.value.trim(); if(!q){summary.innerHTML='';res.innerHTML='<div class="empty">Search equipment, parts, procedures, inspections, findings, evidence, ports, voyages and their relationships.</div>';return;}
    const hits=knowledgeSearch(state,q,{limit:60,maxDepth:2}), direct=hits.filter(h=>h.direct), related=hits.filter(h=>!h.direct), types=new Set(hits.map(h=>h.type));
    summary.innerHTML=hits.length?`<strong>${hits.length}</strong> records · <strong>${types.size}</strong> record types · ${direct.length} direct · ${related.length} connected`:'';
    const row=h=>{const rec=h.record,detail=rec.notes||rec.description||rec.text||rec.purpose||rec.action||rec.location||'',path=h.path?.length>1?h.path.join(' → '):'';return `<button class="search-result knowledge-result ${h.direct?'direct':'connected'}" data-search-collection="${esc(h.collection)}" data-search-id="${esc(h.id)}"><div class="knowledge-result-top"><span class="knowledge-type">${esc(h.type)}</span><strong>${esc(recordLabel(rec))}</strong><span class="knowledge-depth">${h.direct?'DIRECT':`${h.depth} HOP${h.depth===1?'':'S'}`}</span></div>${detail?`<div class="knowledge-detail">${esc(detail).slice(0,200)}</div>`:''}${path?`<div class="knowledge-path">${esc(path)}</div>`:''}<div class="knowledge-reason">${esc(h.reason)}</div></button>`;};
    res.innerHTML=hits.length?`${direct.length?`<div class="knowledge-group"><div class="knowledge-heading">Direct matches</div>${direct.map(row).join('')}</div>`:''}${related.length?`<div class="knowledge-group"><div class="knowledge-heading">Connected vessel knowledge</div>${related.map(row).join('')}</div>`:''}`:empty('No vessel knowledge matched','Try a manufacturer, part number, system, place, procedure, finding, or operational term.');
  };
  inp.addEventListener('input',run); res.addEventListener('click',e=>{const b=e.target.closest('[data-search-id]');if(!b)return;closeModal();openInspector(b.dataset.searchCollection,b.dataset.searchId);}); run(); setTimeout(()=>inp.focus(),0);
}

function reportEvidenceText(collection,id){
  const ev=evidenceForRecord(state,collection,id);
  return ev.length?ev.map(e=>`${e.title||e.name||'Evidence'} [${e.id}]`).join(' | '):'—';
}
function reportEvidenceRegister(){
  const ev=visible(state.evidence);
  if(!ev.length)return '<p class="muted">No evidence records are available in the current vessel state.</p>';
  return reportTable(['Reference','Observed','Evidence','Kind','Source','Linked records'],ev.map(e=>[
    e.id,dateTime(e.observedAt||e.createdAt),e.title||e.name||'Evidence',e.kind||'record',e.source||'unknown',evidenceRelatedRecords(state,e.id).map(r=>`${r.type}: ${recordLabel(r.record)}`).join(' | ')||'—'
  ]));
}
function reportAssumptions(){
  const rows=visible(state.assumptions);
  if(!rows.length)return '<p class="muted">No explicit assumptions are recorded.</p>';
  return reportTable(['Assumption','Value','Units','Source','Confidence','Date'],rows.map(a=>[
    a.name||a.title||a.assumption||recordLabel(a),a.value??'UNKNOWN',a.units||a.unit||'',a.source||'unknown',a.confidence||'unknown',a.date||dateOnly(a.updatedAt||a.createdAt)
  ]));
}
function reportAppendices({includeEvidence=true,includeAssumptions=true}={}){
  let out='<section class="report-section"><h2>Data quality</h2><p>UNKNOWN means AFLOAT does not have enough current information to state a result. Values remain estimates where their source data are estimates. This report is a snapshot of local vessel data at generation time.</p></section>';
  if(includeAssumptions)out+=`<section class="report-section"><h2>Assumptions register</h2>${reportAssumptions()}</section>`;
  if(includeEvidence)out+=`<section class="report-section page-break"><h2>Evidence references</h2>${reportEvidenceRegister()}</section>`;
  return out;
}
function reportPortTarget(v){
  const ports=visible(state.ports); if(!ports.length)return null;
  const dest=String(v?.destination||'').toLowerCase();
  return ports.find(p=>dest.includes(String(p.name||'').toLowerCase()))||ports.find(p=>portVisitsFor(state,{portId:p.id}).length)||ports[0];
}
function reportDocument(title,body,subtitle=''){
  const generated=new Date();
  const rid=`${safeFile(state.vessel.name||'vessel').toUpperCase()}-${safeFile(title).toUpperCase()}-${generated.toISOString().replace(/[-:TZ.]/g,'').slice(0,14)}`;
  const voyage=activeVoyage();
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>
  :root{color-scheme:light}*{box-sizing:border-box}body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;margin:0;color:#172027;background:#fff;font-size:11px;line-height:1.45}.report-shell{max-width:1100px;margin:0 auto;padding:28px 34px 50px}.report-header{border-bottom:3px solid #172027;padding-bottom:16px;margin-bottom:22px;display:grid;grid-template-columns:1fr auto;gap:20px;align-items:end}.brand{font-size:11px;font-weight:850;letter-spacing:.22em}.report-header h1{font-size:25px;line-height:1.08;margin:6px 0 3px}.subtitle{color:#59656d;font-size:12px}.report-id{text-align:right;font:10px ui-monospace,SFMono-Regular,Menlo,monospace;color:#59656d}.meta-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:22px}.meta-box{border:1px solid #cad3d8;padding:8px 10px}.meta-label{font-size:8px;text-transform:uppercase;letter-spacing:.12em;color:#68757d;font-weight:800}.meta-value{font-size:11px;font-weight:700;margin-top:3px;overflow-wrap:anywhere}.report-section{margin:22px 0}.report-section h2{font-size:14px;margin:0 0 8px;padding-bottom:5px;border-bottom:1px solid #cbd4d8;break-after:avoid}.lead{font-size:13px}.muted{color:#68757d}.status-line{font:800 15px ui-monospace,SFMono-Regular,Menlo,monospace;padding:10px 12px;border:1px solid #cbd4d8;background:#f5f7f8;margin:8px 0 14px}table{width:100%;border-collapse:collapse;font-size:9.5px;margin:7px 0 14px}thead{display:table-header-group}tr{break-inside:avoid}th,td{border:1px solid #cbd4d8;padding:6px 7px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#edf1f3;font-size:8px;text-transform:uppercase;letter-spacing:.06em}tbody tr:nth-child(even){background:#fafbfb}.report-note{margin-top:28px;padding:10px 12px;border:1px solid #cbd4d8;border-left:4px solid #59656d;background:#f7f8f9;font-size:9px}.report-controls{position:sticky;top:0;background:#172027;color:white;padding:8px 12px;display:flex;justify-content:center;gap:8px;z-index:4}.report-controls button{border:1px solid #88949b;border-radius:5px;background:white;color:#172027;padding:7px 12px;font-weight:750}.page-break{break-before:page}@page{size:auto;margin:13mm 11mm 15mm}@media print{.report-controls{display:none}.report-shell{max-width:none;padding:0}.report-header{margin-top:0}.page-break{break-before:page}a{color:inherit;text-decoration:none}}@media(max-width:720px){.report-shell{padding:18px}.report-header{grid-template-columns:1fr}.report-id{text-align:left}.meta-grid{grid-template-columns:repeat(2,1fr)}table{font-size:9px;display:block;overflow:auto}}
  </style></head><body><div class="report-controls"><button onclick="window.print()">Print / Save PDF</button><button onclick="window.close()">Close</button></div><main class="report-shell"><header class="report-header"><div><div class="brand">AFLOAT · VESSEL OPERATIONS</div><h1>${esc(title)}</h1><div class="subtitle">${esc(subtitle||state.vessel.name||'')}</div></div><div class="report-id">REPORT ${esc(rid)}<br>AFLOAT v${APP_VERSION} · schema v${state.schemaVersion}</div></header><div class="meta-grid"><div class="meta-box"><div class="meta-label">Vessel</div><div class="meta-value">${esc(state.vessel.name||'Untitled Vessel')}</div></div><div class="meta-box"><div class="meta-label">Generated</div><div class="meta-value">${esc(generated.toLocaleString())}</div></div><div class="meta-box"><div class="meta-label">Voyage</div><div class="meta-value">${esc(voyage?.name||'No active voyage')}</div></div><div class="meta-box"><div class="meta-label">Mode</div><div class="meta-value">Local snapshot · ${esc(state.settings.mode||'cruising')}</div></div></div>${body}<div class="report-note"><strong>Decision-support boundary.</strong> AFLOAT is a recordkeeping and analysis instrument. This report does not replace official charts, certified navigation equipment, current weather/routing guidance, manufacturer maintenance documentation, medical advice, regulatory guidance, or skipper judgment.</div></main></body></html>`;
}
function generateReport(kind){
  const titles={readiness:'Departure Readiness Report',passage:'Passage Plan',health:'Vessel Health Report',maintenance:'Maintenance Due Report',resources:'Resource Endurance Report',energy:'Energy Budget',inventory:'Spare Parts Inventory',watch:'Watch Log',papers:'Ship’s Papers & Voyage Compliance',procedures:'Procedure Execution History',arrival:'Port Arrival Brief',anchorage:'Anchorage Report',incident:'Incident Report',history:'Evidence & Vessel Timeline',intelligence:'Historical Vessel Intelligence',findings:'Findings Register',overview:'Vessel Overview'};
  const title=titles[kind]||'AFLOAT Report',rr=readiness(state),v=activeVoyage(),ep=energyProfileProjection(state.energy,activeEnergyProfile());
  let body='';
  if(kind==='readiness'){
    body=`<section class="report-section"><div class="status-line">${rr.disposition} · ${rr.overall.toUpperCase()}</div>${reportTable(['Category','Status','Detail','Dependencies'],rr.results.map(r=>[r.name,r.status.toUpperCase(),r.detail,(r.dependencies||[]).join(' | ')]))}</section><section class="report-section"><h2>Departure baselines</h2>${reportTable(['Captured','By','Disposition','Notes'],visible(state.departureBaselines).map(b=>[dateTime(b.capturedAt||b.createdAt),b.createdBy||'',b.disposition||'',b.notes||'']))}</section><section class="report-section"><h2>Open findings</h2>${reportTable(['Severity','Finding','Action','Evidence'],visible(state.findings).filter(f=>f.status!=='resolved').map(f=>[f.severity,f.title,f.action||'',reportEvidenceText('findings',f.id)]))}</section>${reportAppendices()}`;
  }else if(kind==='passage'){
    body=v?`<section class="report-section"><p class="lead"><strong>${esc(v.origin)} → ${esc(v.destination)}</strong></p>${reportTable(['Field','Value'],[['Planning distance',`${fmt(plannedVoyageDistance(v),1)} nm (${v.distanceSource||'entered'})`],['Progress',`${v.progressNm||0} nm`],['Speed',`${v.speedKt||'UNKNOWN'} kt`],['ETA',v.eta||v.plannedArrival||'UNKNOWN'],['Alternates',v.alternates||'None recorded'],['Voyage evidence',reportEvidenceText('voyages',v.id)]])}</section><section class="report-section"><h2>Route</h2>${reportTable(['#','Waypoint','Position','Leg'],voyageWaypoints(v).map((w,i,a)=>[i+1,w.name,`${Number(w.lat).toFixed(4)}, ${Number(w.lon).toFixed(4)}`,i?`${fmt(routeDistance([a[i-1],w]),1)} nm`:'—']))}</section><section class="report-section"><h2>Scenarios</h2>${reportTable(['Scenario','Duration','Fuel','Water','Power','Provisions','Overall'],visible(state.voyageScenarios).filter(x=>x.voyageId===v.id).map(sc=>{const a=scenarioAnalysis(sc,v);return[sc.name,a?.days==null?'UNKNOWN':`${fmt(a.days,1)} d`,a?.statuses.fuel||'unknown',a?.statuses.water||'unknown',a?.statuses.power||'unknown',a?.statuses.provisions||'unknown',a?.overall||'unknown']}))}</section><section class="report-section"><h2>Weather records</h2>${reportTable(['Source','Issued / forecast','Wind','Seas','Confidence'],visible(state.weather).map(w=>[w.source,`${dateTime(w.issuedAt)} / ${dateTime(w.forecastAt)}`,`${w.windKt??'—'} kt ${w.direction||''}`,`${w.waveM??'—'} m / ${w.wavePeriodS??'—'} s`,w.confidence||'unknown']))}</section>${reportAppendices()}`:'<section class="report-section"><p>No voyage defined.</p></section>';
  }else if(kind==='health'){
    body=`<section class="report-section">${reportTable(['System','Status','Open findings','Evidence'],visible(state.systems).map(s=>[s.name,s.status,visible(state.findings).filter(f=>f.systemId===s.id&&f.status!=='resolved').length,reportEvidenceText('systems',s.id)]))}</section>${reportAppendices()}`;
  }else if(kind==='maintenance'){
    body=`<section class="report-section">${reportTable(['Task','Equipment','Status','Next due','Required parts','Evidence'],visible(state.maintenance).map(t=>[t.name,eqName(t.equipmentId),taskStatus(t),maintenanceDueLabel(t),(t.requiredParts||[]).map(x=>recordLabel(getRecord(state,'inventory',String(x).split(':')[0])||{name:x})).join(' | ')||'—',reportEvidenceText('maintenance',t.id)]))}</section>${reportAppendices()}`;
  }else if(kind==='resources'){
    body=`<section class="report-section">${reportTable(['Resource','Current','Reserve','Endurance / Range','Rate source','Evidence'],visible(state.resources).map(r=>{const q=resourceQuantity(state,r.id),hist=historicalResourceRate(state,r.id),use=effectiveDailyUse(r,Math.max(1,state.crew.length||1),hist.rate);if(r.kind==='fuel'){const pt=fuelCurvePoint(r.fuelCurve,r.planningRpm),fr=fuelRange({current:q,reserve:r.reserve,burnPerHour:pt.burnPerHour||r.burnPerHour,speedKt:pt.speedKt||v?.speedKt||state.vessel.cruiseSpeedKt});return[r.name,`${q??'UNKNOWN'} ${r.unit}`,`${r.reserve??'—'} ${r.unit}`,Number.isFinite(fr.range)?`${fr.range.toFixed(0)} nm`:'UNKNOWN',r.fuelCurve?.length?`curve @ ${r.planningRpm||'—'} RPM`:'entered burn',reportEvidenceText('resources',r.id)];}const d=endurance(q,r.reserve,use,r.dailyProduction);return[r.name,`${q??'UNKNOWN'} ${r.unit}`,`${r.reserve??'—'} ${r.unit}`,d===Infinity?'NET POSITIVE':Number.isFinite(d)?`${d.toFixed(1)} days`:'UNKNOWN',r.useRateSource==='historical'&&hist.samples?`${hist.samples} historical samples`:'entered rate',reportEvidenceText('resources',r.id)];}))}</section>${reportAppendices()}`;
  }else if(kind==='energy'){
    const es=energyStorageSummary(state.energy); body=`<section class="report-section"><div class="status-line">${esc(activeEnergyProfile()?.name||'No active profile')} · NET ${fmt(ep.net,2)} kWh/day</div>${reportTable(['Field','Value'],[['Usable storage capacity',`${fmt(es.capacityKwh,2)} kWh`],['Current state of charge',`${fmt(es.currentPct,0)}%`],['Reserve',`${fmt(es.reservePct,0)}%`],['Daily load',`${fmt(ep.use,2)} kWh`],['Daily generation',`${fmt(ep.gen,2)} kWh`]])}</section><section class="report-section"><h2>Storage banks</h2>${reportTable(['Bank','Capacity','SOC','Reserve','Chemistry'],(state.energy.banks||[]).map(b=>[b.name,`${b.capacityKwh??'—'} kWh`,`${b.currentPct??'—'}%`,`${b.reservePct??'—'}%`,b.chemistry||'']))}</section><section class="report-section"><h2>Loads</h2>${reportTable(['Load','W','Duty','Hours/day','Priority'],state.energy.loads.map(l=>[l.name,l.watts,`${l.dutyPct}%`,l.hoursPerDay,l.priority||'']))}</section><section class="report-section"><h2>Generation</h2>${reportTable(['Source','kWh/day'],state.energy.sources.map(g=>[g.name,g.dailyKwh]))}</section>${reportAppendices({includeEvidence:false})}`;
  }else if(kind==='inventory'){
    body=`<section class="report-section">${reportTable(['Item','Qty','Minimum','Location','Supports','Criticality','Evidence'],visible(state.inventory).map(i=>[i.name,`${i.qty} ${i.unit}`,i.minimum,storagePath(state,i.storageLocationId)||i.location,eqName(i.equipmentId),i.criticality,reportEvidenceText('inventory',i.id)]))}</section>${reportAppendices()}`;
  }else if(kind==='watch'){
    body=`<section class="report-section"><h2>Watches</h2>${reportTable(['Watchkeeper','Start','End','Status','Notes'],visible(state.watches).map(w=>[w.watchkeeper||'',dateTime(w.start||w.startedAt),dateTime(w.endedAt||w.end),w.status||'',w.notes||'']))}</section><section class="report-section"><h2>Handoffs</h2>${reportTable(['From → To','Created','Status','Summary','Plan'],visible(state.watchHandoffs).map(h=>[`${h.fromWatchkeeper||'—'} → ${h.toWatchkeeper||'—'}`,dateTime(h.createdAt),h.status||'',h.summary||'',h.plan||'']))}</section>${reportAppendices({includeEvidence:false})}`;
  }else if(kind==='papers'){
    body=`<section class="report-section">${reportTable(['Document','Category','Holder','Required','Expires','Voyage review','Source / confidence','Evidence'],visible(state.documents).map(d=>{const c=documentCompliance(d,v);return[d.name,d.category||'other',d.holder||'Vessel',d.requiredForDeparture!==false?'yes':'no',d.expires||'No expiry',`${c.status.toUpperCase()} — ${c.detail}`,`${d.source||'unknown'} / ${d.confidence||'unknown'}`,reportEvidenceText('documents',d.id)]}))}</section>${reportAppendices()}`;
  }else if(kind==='procedures'){
    body=`<section class="report-section"><h2>Procedure library</h2>${reportTable(['Procedure','Category','Steps','Purpose','Evidence'],visible(state.procedures).map(p=>[p.name,p.category,(p.steps||[]).length,p.purpose||'',reportEvidenceText('procedures',p.id)]))}</section><section class="report-section"><h2>Execution history</h2>${reportTable(['Started','Procedure','Operator','Status','Done','Skipped','Pending','Completion notes','Evidence'],visible(state.procedureExecutions).slice().sort((a,b)=>new Date(b.startedAt||0)-new Date(a.startedAt||0)).map(x=>{const z=procedureExecutionSummary(x);return[dateTime(x.startedAt),x.procedureName||x.procedureId,x.performedBy||'Crew',x.status,z.done,z.skipped,z.pending,x.completionNotes||'',reportEvidenceText('procedureExecutions',x.id)]}))}</section>${reportAppendices()}`;
  }else if(kind==='arrival'){
    const port=reportPortTarget(v);
    if(!port) body='<section class="report-section"><p>No port knowledge is available.</p></section>';
    else{const visits=portVisitsFor(state,{portId:port.id});body=`<section class="report-section"><div class="status-line">${esc(port.name)} · ${esc(port.country||port.region||'')}</div>${reportTable(['Field','Value'],[['Approach',port.approach||'UNKNOWN'],['Hazards',port.hazards||'UNKNOWN'],['VHF / Communications',port.vhf||port.communications||'UNKNOWN'],['Customs',port.customs||'UNKNOWN'],['Immigration',port.immigration||'UNKNOWN'],['Harbor master',port.harborMaster||'UNKNOWN'],['Fuel',port.fuel||'UNKNOWN'],['Water',port.water||'UNKNOWN'],['Repairs',port.repairs||port.mechanical||'UNKNOWN'],['Medical',port.medical||'UNKNOWN'],['Source',port.source||'unknown'],['Verified',port.verified||port.verifiedAt||'UNKNOWN'],['Port evidence',reportEvidenceText('ports',port.id)]])}</section><section class="report-section"><h2>Recent visits</h2>${reportTable(['Arrival','Departure','Berth / anchorage','Services','Fuel','Water','Lessons'],visits.slice(0,10).map(x=>[dateTime(x.arrivedAt),dateTime(x.departedAt),x.berth||x.mooring||x.anchorage||'',x.services||'',x.fuelAdded??'—',x.waterAdded??'—',x.lessons||x.notes||'']))}</section><section class="report-section"><h2>Voyage papers</h2>${reportTable(['Document','Expires','Review'],visible(state.documents).filter(d=>d.requiredForDeparture!==false).map(d=>{const c=documentCompliance(d,v);return[d.name,d.expires||'UNKNOWN',`${c.status.toUpperCase()} — ${c.detail}`]}))}</section>${reportAppendices()}`;}
  }else if(kind==='anchorage'){
    const anch=getRecord(state,'anchorages',state.settings.activeAnchorageId)||visible(state.anchorages)[0];
    if(!anch) body='<section class="report-section"><p>No anchorage is selected.</p></section>';
    else{const deps=anchorageDeployments(state,anch.id),latest=deps[0],gt=latest?getRecord(state,'groundTackle',latest.groundTackleId):null,experience=anchorageExperience(state,anch.id);body=`<section class="report-section"><div class="status-line">${esc(anch.name)} · ${experience.deployments} recorded deployment${experience.deployments===1?'':'s'}</div>${reportTable(['Field','Value'],[['Approach',anch.approach||'UNKNOWN'],['Hazards',anch.hazards||'UNKNOWN'],['Bottom',anch.bottom||latest?.bottomObserved||'UNKNOWN'],['Night approach',anch.nightApproach||'UNKNOWN'],['Dinghy landing',anch.dinghyLanding||'UNKNOWN'],['Maximum recorded wind',experience.maxRecordedWindKt==null?'UNKNOWN':`${experience.maxRecordedWindKt} kt`],['Recorded drags',experience.drags],['Recorded resets',experience.resets],['Anchorage evidence',reportEvidenceText('anchorages',anch.id)]])}</section><section class="report-section"><h2>Deployment history</h2>${reportTable(['Deployed','Ground tackle','Depth','Tide','Scope','Wind','Holding','Dragged','Resets','Evidence'],deps.map(d=>[dateTime(d.deployedAt),getRecord(state,'groundTackle',d.groundTackleId)?.name||'UNKNOWN',d.depthM??'UNKNOWN',d.tideRiseM??'UNKNOWN',d.scope??'UNKNOWN',d.maxWindKt==null?'UNKNOWN':`${d.maxWindKt} kt`,d.holding||'unknown',String(d.dragged??'unknown'),d.resets??0,reportEvidenceText('anchorDeployments',d.id)]))}</section>${gt?`<section class="report-section"><h2>Latest ground tackle</h2>${reportTable(['Name','Anchor','Chain','Rope','Total rode'],[[gt.name,`${gt.anchorType||'—'} ${gt.weightKg?`${gt.weightKg} kg`:''}`,`${gt.chainLengthM??'—'} m / ${gt.chainDiameterMm??'—'} mm`,`${gt.ropeLengthM??'—'} m / ${gt.ropeDiameterMm??'—'} mm`,`${gt.totalRodeM??'—'} m`]])}</section>`:''}${reportAppendices()}`;}
  }else if(kind==='incident'){
    const incidents=visible(state.logs).filter(l=>String(l.category||'').toLowerCase()==='incident');
    body=`<section class="report-section">${incidents.length?reportTable(['Date','Incident','Location','Description','Related evidence'],incidents.map(l=>[dateTime(l.at),l.title||'Incident',l.location||'',l.text||l.notes||'',reportEvidenceText('logs',l.id)])):'<p>No incident log entries are recorded.</p>'}</section><section class="report-section"><h2>Open findings</h2>${reportTable(['Severity','Finding','Status','Action','Evidence'],visible(state.findings).filter(f=>f.status!=='resolved').map(f=>[f.severity,f.title,f.status,f.action||'',reportEvidenceText('findings',f.id)]))}</section>${reportAppendices()}`;
  }else if(kind==='history'){
    body=`<section class="report-section"><h2>Evidence Cabinet</h2>${reportEvidenceRegister()}</section><section class="report-section page-break"><h2>Vessel Timeline</h2>${reportTable(['Date','Type','Event','Detail'],vesselTimeline(state,{limit:500}).map(x=>[dateTime(x.at),x.kind,x.title,x.detail]))}</section>${reportAppendices({includeEvidence:false})}`;
  }else if(kind==='intelligence'){
    const intel=historicalIntelligence(state),fuel=intel.fuel,water=intel.water,energy=intel.energy;
    body=`<section class="report-section"><p class="lead"><strong>Historical observations are descriptive, not guarantees or prescribed limits.</strong></p>${reportTable(['Model','Samples','Observed','Planning / predicted','Difference'],[
      ['Fuel near planning RPM',fuel.target?.burn?.n??0,fuel.target?.burn?.mean!=null?`${fmt(fuel.target.burn.mean,2)} ${fuel.resource?.unit||''}/hr${fuel.target.burn.sd!=null?` ± ${fmt(fuel.target.burn.sd,2)}`:''}`:'UNKNOWN',fuel.planningBurn!=null?`${fmt(fuel.planningBurn,2)} ${fuel.resource?.unit||''}/hr`:'UNKNOWN',Number.isFinite(fuel.targetDifferencePct)?`${fuel.targetDifferencePct>=0?'+':''}${fmt(fuel.targetDifferencePct,1)}%`:'UNKNOWN'],
      ['Water use',water.vessel.n,water.vessel.mean!=null?`${fmt(water.vessel.mean,2)} ${water.resource?.unit||''}/day${water.vessel.sd!=null?` ± ${fmt(water.vessel.sd,2)}`:''}`:'UNKNOWN',water.planningRate!=null?`${fmt(water.planningRate,2)} ${water.resource?.unit||''}/day`:'UNKNOWN',Number.isFinite(water.differencePct)?`${water.differencePct>=0?'+':''}${fmt(water.differencePct,1)}%`:'UNKNOWN'],
      ['Electrical load',energy.samples.length,energy.actualUse.mean!=null?`${fmt(energy.actualUse.mean,2)} kWh/day`:'UNKNOWN',energy.predictedUse.mean!=null?`${fmt(energy.predictedUse.mean,2)} kWh/day`:'UNKNOWN',Number.isFinite(energy.loadDeltaPct.mean)?`${energy.loadDeltaPct.mean>=0?'+':''}${fmt(energy.loadDeltaPct.mean,1)}%`:'UNKNOWN'],
      ['Electrical generation',energy.samples.length,energy.actualGeneration.mean!=null?`${fmt(energy.actualGeneration.mean,2)} kWh/day`:'UNKNOWN',energy.predictedGeneration.mean!=null?`${fmt(energy.predictedGeneration.mean,2)} kWh/day`:'UNKNOWN',Number.isFinite(energy.generationDeltaPct.mean)?`${energy.generationDeltaPct.mean>=0?'+':''}${fmt(energy.generationDeltaPct.mean,1)}%`:'UNKNOWN']
    ])}</section><section class="report-section"><h2>Fuel model by RPM</h2>${reportTable(['RPM','N','Burn','Speed','Date range'],fuel.groups.map(g=>[g.rpm??'Unspecified',g.burn.n,g.burn.mean!=null?`${fmt(g.burn.mean,2)} ± ${g.burn.sd!=null?fmt(g.burn.sd,2):'—'} ${fuel.resource?.unit||''}/hr`:'UNKNOWN',g.speed.mean!=null?`${fmt(g.speed.mean,2)} kt`:'—',intelDateRange(g.range)]))}</section><section class="report-section"><h2>Maintenance interval observations</h2>${reportTable(['Task','Basis','N intervals','Observed','Configured','Difference'],intel.maintenance.map(m=>[m.task.name,m.basis,m.stats.n,`${fmt(m.stats.mean,0)}${m.stats.sd!=null?` ± ${fmt(m.stats.sd,0)}`:''} ${m.unit}`,m.planned!=null?`${fmt(m.planned,0)} ${m.unit}`:'—',Number.isFinite(m.differencePct)?`${m.differencePct>=0?'+':''}${fmt(m.differencePct,1)}%`:'UNKNOWN']))}</section><section class="report-section"><h2>Derived vessel observations</h2>${reportTable(['Observation','Confidence','Samples','Date range','Source'],intel.observations.map(o=>[`${o.title}: ${o.text}`,o.confidence,o.samples,intelDateRange({from:o.from,to:o.to}),o.source]))}</section>${reportAppendices()}`;
  }else if(kind==='findings'){
    body=`<section class="report-section">${reportTable(['Severity','Confidence','Status','Finding','Action','Evidence'],visible(state.findings).map(f=>[f.severity,f.confidence,f.status,f.title,f.action||'',reportEvidenceText('findings',f.id)]))}</section>${reportAppendices()}`;
  }else{
    body=`<section class="report-section"><p class="lead"><strong>${esc(state.vessel.name)}</strong> · ${esc(state.vessel.type||'')} · ${esc(state.vessel.homePort||'')}</p>${reportTable(['System','Status','Open findings','Evidence'],visible(state.systems).map(s=>[s.name,s.status,visible(state.findings).filter(f=>f.systemId===s.id&&f.status!=='resolved').length,reportEvidenceText('systems',s.id)]))}</section><section class="report-section"><h2>Current readiness</h2>${reportTable(['Category','Status','Detail'],rr.results.map(r=>[r.name,r.status.toUpperCase(),r.detail]))}</section>${reportAppendices()}`;
  }
  const html=reportDocument(title,body,state.vessel.name);
  const win=window.open('','_blank'); if(win){win.document.open();win.document.write(html);win.document.close();} else downloadText(`${safeFile(title)}.html`,html,'text/html');
}
function reportTable(head,rows){
  return `<table><thead><tr>${head.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c??'')}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${head.length}">No records.</td></tr>`}</tbody></table>`;
}

function upsert(arr,obj){const now=new Date().toISOString(),i=arr.findIndex(x=>x.id===obj.id),old=i>=0?arr[i]:null,next={...old,...obj,createdAt:old?.createdAt||obj.createdAt||now,updatedAt:now,archived:obj.archived??old?.archived??false};if(i>=0)arr[i]=next;else arr.push(next);return next;}
function nnull(v){return v===''||v==null?null:Number(v);} function safeFile(s){return String(s||'vessel').replace(/[^a-z0-9-_]+/gi,'-').replace(/^-|-$/g,'');}

window.addEventListener('unhandledrejection',e=>{console.error('Unhandled promise rejection',e.reason);toast(`Unexpected error: ${e.reason?.message||e.reason||'unknown'}`);});
window.addEventListener('error',e=>{console.error('Runtime error',e.error||e.message);});
init();
