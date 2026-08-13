export const COLLECTION_META = {
  crew:{prefix:'crew',label:'Crew member'}, voyages:{prefix:'voy',label:'Voyage'}, routeWaypoints:{prefix:'wp',label:'Route waypoint'}, voyageScenarios:{prefix:'vsc',label:'Voyage scenario'}, energyProfiles:{prefix:'enp',label:'Energy profile'}, systems:{prefix:'sys',label:'System'},
  equipment:{prefix:'eq',label:'Equipment'}, components:{prefix:'cmp',label:'Component'}, maintenance:{prefix:'maint',label:'Maintenance task'},
  maintenanceHistory:{prefix:'mh',label:'Maintenance record'}, inspections:{prefix:'insp',label:'Inspection'}, measurements:{prefix:'meas',label:'Measurement'},
  resources:{prefix:'res',label:'Resource'}, tanks:{prefix:'tank',label:'Tank'}, resourceTransactions:{prefix:'rtx',label:'Resource transaction'}, provisions:{prefix:'prov',label:'Provision'}, energyObservations:{prefix:'eobs',label:'Energy observation'},
  inventory:{prefix:'inv',label:'Store item'}, inventoryTransactions:{prefix:'itx',label:'Inventory transaction'}, storageLocations:{prefix:'loc',label:'Storage location'}, procedures:{prefix:'proc',label:'Procedure'}, procedureExecutions:{prefix:'pex',label:'Procedure execution'},
  ports:{prefix:'port',label:'Port'}, portVisits:{prefix:'pv',label:'Port visit'}, anchorages:{prefix:'anchor',label:'Anchorage'}, groundTackle:{prefix:'gt',label:'Ground tackle'}, anchorDeployments:{prefix:'ad',label:'Anchor deployment'}, anchorPositions:{prefix:'apos',label:'Anchor position observation'}, logs:{prefix:'log',label:'Log entry'}, findings:{prefix:'find',label:'Finding'},
  assumptions:{prefix:'as',label:'Assumption'}, evidence:{prefix:'ev',label:'Evidence item'}, timelineEvents:{prefix:'tle',label:'Timeline milestone'}, documents:{prefix:'doc',label:'Document'}, weather:{prefix:'wx',label:'Weather record'}, watches:{prefix:'watch',label:'Watch'},
  watchSchedules:{prefix:'ws',label:'Watch schedule'}, watchHandoffs:{prefix:'wh',label:'Watch handoff'}, departureBaselines:{prefix:'base',label:'Departure baseline'}
};

export const RELATION_FIELDS = {
  systemId:'systems', parentSystemId:'systems', equipmentId:'equipment', componentId:'components', voyageId:'voyages', resourceId:'resources',
  procedureId:'procedures', procedureExecutionId:'procedureExecutions', findingId:'findings', maintenanceId:'maintenance', inspectionId:'inspections', documentId:'documents', portId:'ports', anchorageId:'anchorages',
  tankId:'tanks', inventoryId:'inventory', storageLocationId:'storageLocations', parentLocationId:'storageLocations', fromStorageLocationId:'storageLocations', toStorageLocationId:'storageLocations', energyProfileId:'energyProfiles', watchId:'watches', handoffId:'watchHandoffs', baselineId:'departureBaselines', watchkeeperId:'crew', fromWatchkeeperId:'crew', toWatchkeeperId:'crew', groundTackleId:'groundTackle', anchorDeploymentId:'anchorDeployments', portVisitId:'portVisits', evidenceId:'evidence', timelineEventId:'timelineEvents'
};

export function uuid(prefix='rec'){
  const raw=globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${raw}`;
}

export function recordMeta(record={}, prefix='rec'){
  const now=new Date().toISOString();
  return {
    ...record,
    id:record.id || uuid(prefix),
    createdAt:record.createdAt || now,
    updatedAt:now,
    archived:Boolean(record.archived)
  };
}

export function activeRecords(arr=[]){ return arr.filter(x=>!x.archived); }

export function getRecord(state, collection, id){ return state?.[collection]?.find(x=>x.id===id) || null; }

export function upsertRecord(state, collection, record){
  if(!Array.isArray(state[collection])) state[collection]=[];
  const meta=COLLECTION_META[collection] || {prefix:'rec'};
  const existing=record.id ? getRecord(state,collection,record.id) : null;
  const next=recordMeta({...existing,...record},meta.prefix);
  const i=state[collection].findIndex(x=>x.id===next.id);
  if(i>=0) state[collection][i]=next; else state[collection].push(next);
  return next;
}

export function duplicateRecord(state, collection, id){
  const source=getRecord(state,collection,id); if(!source) return null;
  const meta=COLLECTION_META[collection] || {prefix:'rec'};
  const copy=structuredClone(source);
  delete copy.id; delete copy.createdAt; delete copy.updatedAt;
  copy.archived=false;
  if(copy.name) copy.name=`${copy.name} — Copy`;
  else if(copy.title) copy.title=`${copy.title} — Copy`;
  return upsertRecord(state,collection,recordMeta(copy,meta.prefix));
}

export function archiveRecord(state,collection,id,archived=true){
  const rec=getRecord(state,collection,id); if(!rec) return false;
  rec.archived=archived; rec.updatedAt=new Date().toISOString(); return true;
}

export function referencesTo(state,targetCollection,targetId){
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

export function deleteRecord(state,collection,id,{force=false}={}){
  const refs=referencesTo(state,collection,id);
  if(refs.length && !force) return {ok:false,refs};
  state[collection]=(state[collection]||[]).filter(x=>x.id!==id);
  state.relationships=(state.relationships||[]).filter(r=>!(r.from?.collection===collection&&r.from?.id===id)&&!(r.to?.collection===collection&&r.to?.id===id));
  return {ok:true,refs};
}

export function addRelationship(state,fromCollection,fromId,toCollection,toId,label='Related'){
  if(!Array.isArray(state.relationships)) state.relationships=[];
  const duplicate=state.relationships.find(r=>r.from?.collection===fromCollection&&r.from?.id===fromId&&r.to?.collection===toCollection&&r.to?.id===toId&&r.label===label);
  if(duplicate) return duplicate;
  const rel={id:uuid('rel'),from:{collection:fromCollection,id:fromId},to:{collection:toCollection,id:toId},label,createdAt:new Date().toISOString()};
  state.relationships.push(rel); return rel;
}

export function removeRelationship(state,id){ state.relationships=(state.relationships||[]).filter(r=>r.id!==id); }

export function relatedRecords(state,collection,id){
  const out=[];
  for(const ref of referencesTo(state,collection,id)){
    const rec=getRecord(state,ref.collection,ref.id); if(rec) out.push({...ref,record:rec});
  }
  const unique=new Map(); out.forEach(x=>unique.set(`${x.collection}:${x.id}:${x.field}`,x)); return [...unique.values()];
}

export function recordLabel(rec={}){ return rec.name || rec.title || rec.text?.slice(0,60) || rec.category || rec.id || 'Record'; }


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
export function knowledgeSearch(state,query,{limit=60,maxDepth=2}={}){
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
export function observationStats(values=[]){
  const xs=finiteNumbers(values).sort((a,b)=>a-b), n=xs.length;
  if(!n) return {n:0,mean:null,median:null,sd:null,min:null,max:null};
  const mean=xs.reduce((a,b)=>a+b,0)/n, median=n%2?xs[(n-1)/2]:(xs[n/2-1]+xs[n/2])/2;
  const sd=n>1?Math.sqrt(xs.reduce((sum,x)=>sum+(x-mean)**2,0)/(n-1)):null;
  return {n,mean,median,sd,min:xs[0],max:xs[n-1]};
}
export function observationDateRange(records=[],field='at'){
  const dates=records.map(r=>r?.[field]||r?.completedAt||r?.createdAt||null).filter(Boolean).map(v=>new Date(v)).filter(d=>!Number.isNaN(d.getTime())).sort((a,b)=>a-b);
  return {from:dates.length?dates[0].toISOString():null,to:dates.length?dates.at(-1).toISOString():null};
}
export function observationalConfidence(n){ return n>=8?'high':n>=4?'medium':n>=2?'low':'insufficient'; }
export function percentDifference(actual,reference){
  const a=finiteValue(actual),r=finiteValue(reference); return a!==null&&r!==null&&r!==0?(a-r)/r*100:null;
}

export function fuelPerformanceHistory(state,{resourceId=''}={}){
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

export function waterPerformanceHistory(state,{resourceId=''}={}){
  const resource=activeRecords(state.resources||[]).find(r=>r.id===resourceId)||(activeRecords(state.resources||[]).find(r=>r.kind==='water'))||null;
  if(!resource) return {resource:null,samples:[],vessel:observationStats([]),perPerson:observationStats([])};
  const tx=activeRecords(state.resourceTransactions||[]).filter(t=>t.resourceId===resource.id&&['consume','use','drain'].includes(t.type)&&Number(t.quantity)>0&&Number(t.durationDays)>0);
  const samples=tx.map(t=>{const vesselPerDay=Number(t.quantity)/Number(t.durationDays),crew=Number(t.crewCount);return {id:t.id,at:t.at,vesselPerDay,perPersonPerDay:Number.isFinite(crew)&&crew>0?vesselPerDay/crew:null,crewCount:Number.isFinite(crew)&&crew>0?crew:null,durationDays:Number(t.durationDays),quantity:Number(t.quantity),source:t.source||'unknown',confidence:t.confidence||'unknown',context:t.context||'',record:t};});
  const vessel=observationStats(samples.map(x=>x.vesselPerDay)), perPerson=observationStats(samples.map(x=>x.perPersonPerDay)), range=observationDateRange(samples);
  const plan=finiteValue(resource.dailyUse);
  return {resource,samples,vessel,perPerson,range,planningRate:plan,planningBasis:resource.rateBasis||'vessel',differencePct:percentDifference(vessel.mean,plan),conservativeRate:vessel.mean!==null?(vessel.mean+(vessel.sd||0)):null};
}

export function energyPerformanceHistory(state,{energyProfileId=''}={}){
  const rows=activeRecords(state.energyObservations||[]).filter(x=>!energyProfileId||x.energyProfileId===energyProfileId).map(x=>({
    ...x,
    loadDeltaKwh:finiteValue(x.actualUseKwh)!==null&&finiteValue(x.predictedUseKwh)!==null?finiteValue(x.actualUseKwh)-finiteValue(x.predictedUseKwh):null,
    loadDeltaPct:percentDifference(x.actualUseKwh,x.predictedUseKwh),
    generationDeltaKwh:finiteValue(x.actualGenerationKwh)!==null&&finiteValue(x.predictedGenerationKwh)!==null?finiteValue(x.actualGenerationKwh)-finiteValue(x.predictedGenerationKwh):null,
    generationDeltaPct:percentDifference(x.actualGenerationKwh,x.predictedGenerationKwh)
  })).sort((a,b)=>new Date(a.at||0)-new Date(b.at||0));
  return {samples:rows,range:observationDateRange(rows),actualUse:observationStats(rows.map(x=>x.actualUseKwh)),predictedUse:observationStats(rows.map(x=>x.predictedUseKwh)),loadDeltaPct:observationStats(rows.map(x=>x.loadDeltaPct)),actualGeneration:observationStats(rows.map(x=>x.actualGenerationKwh)),predictedGeneration:observationStats(rows.map(x=>x.predictedGenerationKwh)),generationDeltaPct:observationStats(rows.map(x=>x.generationDeltaPct))};
}

export function maintenanceIntervalHistory(state){
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

export function historicalIntelligence(state){
  const fuel=fuelPerformanceHistory(state),water=waterPerformanceHistory(state),energy=energyPerformanceHistory(state),maintenance=maintenanceIntervalHistory(state),observations=[];
  if(fuel.target?.burn?.n>=2){observations.push({kind:'fuel',title:`Fuel burn near ${fuel.target.rpm??'recorded'} RPM`,text:`${fuel.target.burn.n} observations show ${fuel.target.burn.mean.toFixed(2)} ${fuel.resource?.unit||''}/hr${fuel.target.burn.sd!==null?` ± ${fuel.target.burn.sd.toFixed(2)} (1σ)`:''}.`,confidence:observationalConfidence(fuel.target.burn.n),samples:fuel.target.burn.n,from:fuel.target.range.from,to:fuel.target.range.to,source:'Resource transactions'});}
  if(water.vessel.n>=2){observations.push({kind:'water',title:'Whole-vessel water use',text:`${water.vessel.n} observations show ${water.vessel.mean.toFixed(2)} ${water.resource?.unit||''}/day${water.vessel.sd!==null?` ± ${water.vessel.sd.toFixed(2)} (1σ)`:''}.`,confidence:observationalConfidence(water.vessel.n),samples:water.vessel.n,from:water.range.from,to:water.range.to,source:'Resource transactions'});}
  if(energy.samples.length>=2){const d=energy.loadDeltaPct.mean, comparison=Number.isFinite(d)?`${Math.abs(d).toFixed(1)}% ${d>=0?'above':'below'}`:'UNKNOWN relative to';observations.push({kind:'energy',title:'Observed electrical load vs model',text:`Across ${energy.samples.length} recorded operating days, actual consumption averaged ${comparison} the predicted profile.`,confidence:observationalConfidence(energy.samples.length),samples:energy.samples.length,from:energy.range.from,to:energy.range.to,source:'Energy observations'});}
  for(const m of maintenance.filter(x=>x.stats.n>=2).slice(0,4)){observations.push({kind:'maintenance',title:`Observed interval — ${m.task.name}`,text:`${m.stats.n} ${m.unit} intervals average ${m.stats.mean.toFixed(0)} ${m.unit}${m.stats.sd!==null?` ± ${m.stats.sd.toFixed(0)} (1σ)`:''}${m.planned?`; configured interval ${m.planned} ${m.unit}`:''}.`,confidence:observationalConfidence(m.stats.n),samples:m.stats.n,from:m.range.from,to:m.range.to,source:'Maintenance history',maintenanceId:m.task.id});}
  return {fuel,water,energy,maintenance,observations};
}

export function anchorageDeployments(state,anchorageId){
  return activeRecords(state?.anchorDeployments||[]).filter(x=>x.anchorageId===anchorageId).slice().sort((a,b)=>new Date(b.deployedAt||b.createdAt||0)-new Date(a.deployedAt||a.createdAt||0));
}
export function deploymentPositions(state,deploymentId){
  return activeRecords(state?.anchorPositions||[]).filter(x=>x.anchorDeploymentId===deploymentId).slice().sort((a,b)=>new Date(a.at||a.createdAt||0)-new Date(b.at||b.createdAt||0));
}
export function portVisitsFor(state,{portId='',anchorageId=''}={}){
  return activeRecords(state?.portVisits||[]).filter(v=>(portId&&v.portId===portId)||(anchorageId&&v.anchorageId===anchorageId)).slice().sort((a,b)=>new Date(b.arrivedAt||b.createdAt||0)-new Date(a.arrivedAt||a.createdAt||0));
}
export function anchorageExperience(state,anchorageId){
  const deployments=anchorageDeployments(state,anchorageId), winds=deployments.map(d=>Number(d.maxWindKt)).filter(Number.isFinite);
  const noDrag=deployments.filter(d=>d.dragged===false||d.dragged==='no').length, drags=deployments.filter(d=>d.dragged===true||d.dragged==='yes').length;
  return {deployments:deployments.length,maxRecordedWindKt:winds.length?Math.max(...winds):null,noDrag,drags,resets:deployments.reduce((n,d)=>n+(Number(d.resets)||0),0)};
}

export function systemDepth(state,system){
  let depth=0,current=system,seen=new Set();
  while(current?.parentSystemId && !seen.has(current.parentSystemId) && depth<8){
    seen.add(current.parentSystemId); current=getRecord(state,'systems',current.parentSystemId); if(current) depth++;
  }
  return depth;
}

export function systemTree(state){
  const systems=activeRecords(state.systems||[]); const byParent=new Map();
  systems.forEach(s=>{const key=s.parentSystemId||'';if(!byParent.has(key))byParent.set(key,[]);byParent.get(key).push(s);});
  for(const arr of byParent.values()) arr.sort((a,b)=>(a.sortOrder??999)-(b.sortOrder??999)||String(a.name).localeCompare(String(b.name)));
  const result=[],visit=(parentId,depth)=>{for(const s of byParent.get(parentId)||[]){result.push({record:s,depth});visit(s.id,depth+1);}};
  visit('',0);
  // orphan/cyclic safety
  for(const s of systems) if(!result.some(x=>x.record.id===s.id)) result.push({record:s,depth:0});
  return result;
}

export function setSystemParent(state,systemId,parentSystemId){
  const sys=getRecord(state,'systems',systemId); if(!sys) return {ok:false,reason:'System not found'};
  if(systemId===parentSystemId) return {ok:false,reason:'A system cannot be its own parent'};
  let current=parentSystemId,seen=new Set([systemId]);
  while(current){ if(seen.has(current)) return {ok:false,reason:'That move would create a circular hierarchy'}; seen.add(current); current=getRecord(state,'systems',current)?.parentSystemId||''; }
  sys.parentSystemId=parentSystemId||''; sys.updatedAt=new Date().toISOString(); return {ok:true};
}

export function measurementSeries(state,equipmentId,name){
  return activeRecords(state.measurements||[]).filter(m=>m.equipmentId===equipmentId&&m.name===name).sort((a,b)=>new Date(a.at)-new Date(b.at));
}

export function trend(series=[]){
  if(series.length<2) return 'insufficient';
  const a=Number(series[0].value), b=Number(series[series.length-1].value); if(!Number.isFinite(a)||!Number.isFinite(b)) return 'unknown';
  const delta=b-a, threshold=Math.max(Math.abs(a)*0.02,0.01); return Math.abs(delta)<=threshold?'stable':delta>0?'rising':'falling';
}

export function completeMaintenance(state,taskId,{completedAt=new Date().toISOString(),engineHours=null,cycles=null,performedBy='',notes='',partsConsumed=[]}={}){
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


export function inventoryStatus(item={}, now=new Date()){
  const qty=Number(item.qty); const min=Number(item.minimum); const desired=Number(item.desired);
  const expires=item.expires?new Date(`${item.expires}T12:00:00`):null;
  if(expires && expires<now) return 'expired';
  if(!Number.isFinite(qty)) return 'unknown';
  if(qty<=0 && (Number.isFinite(min)?min>0:true)) return 'missing';
  if(Number.isFinite(min) && qty<min) return 'reorder';
  if(Number.isFinite(desired) && desired>0 && qty<desired) return 'low';
  return 'ok';
}

export function adjustInventory(state,inventoryId,delta,{type='adjust',at=new Date().toISOString(),source='Manual',notes='',maintenanceId='',unitCost=null}={}){
  const item=getRecord(state,'inventory',inventoryId); if(!item) throw new Error('Inventory item not found');
  const before=Number(item.qty)||0, change=Number(delta)||0, after=Math.max(0,before+change);
  item.qty=after; item.updatedAt=new Date().toISOString();
  const tx=upsertRecord(state,'inventoryTransactions',{inventoryId,type,quantity:Math.abs(change),delta:after-before,before,after,unit:item.unit||'ea',at,source,notes,maintenanceId,unitCost});
  return tx;
}

export function storagePath(state,locationId){
  if(!locationId) return '';
  const parts=[],seen=new Set(); let id=locationId;
  while(id && !seen.has(id) && parts.length<12){ seen.add(id); const loc=getRecord(state,'storageLocations',id); if(!loc) break; parts.unshift(loc.name); id=loc.parentLocationId||''; }
  return parts.join(' / ');
}

export function setStorageParent(state,locationId,parentLocationId){
  const loc=getRecord(state,'storageLocations',locationId); if(!loc) return {ok:false,reason:'Storage location not found'};
  if(locationId===parentLocationId) return {ok:false,reason:'A location cannot contain itself'};
  let current=parentLocationId,seen=new Set([locationId]);
  while(current){ if(seen.has(current)) return {ok:false,reason:'That move would create a circular storage hierarchy'}; seen.add(current); current=getRecord(state,'storageLocations',current)?.parentLocationId||''; }
  loc.parentLocationId=parentLocationId||''; loc.updatedAt=new Date().toISOString(); return {ok:true};
}

export function resourceQuantity(state,resourceId){
  const tanks=activeRecords(state.tanks||[]).filter(t=>t.resourceId===resourceId && Number.isFinite(Number(t.current)));
  if(tanks.length) return tanks.reduce((sum,t)=>sum+Number(t.current),0);
  const r=getRecord(state,'resources',resourceId); return Number.isFinite(Number(r?.current))?Number(r.current):null;
}

export function resourceCapacity(state,resourceId){
  const tanks=activeRecords(state.tanks||[]).filter(t=>t.resourceId===resourceId && Number.isFinite(Number(t.capacity)));
  if(tanks.length) return tanks.reduce((sum,t)=>sum+Number(t.capacity),0);
  const r=getRecord(state,'resources',resourceId); return Number.isFinite(Number(r?.capacity))?Number(r.capacity):null;
}

export function syncResourceFromTanks(state,resourceId){
  const r=getRecord(state,'resources',resourceId); if(!r) return null;
  const q=resourceQuantity(state,resourceId), cap=resourceCapacity(state,resourceId);
  if(q!==null) r.current=q; if(cap!==null) r.capacity=cap; r.updatedAt=new Date().toISOString(); return r;
}

export function applyResourceTransaction(state,resourceId,{tankId='',type='adjust',quantity=0,at=new Date().toISOString(),source='Manual',confidence='medium',notes='',durationDays=null,durationHours=null,rpm=null,distanceNm=null,crewCount=null,context='',reading=null}={}){
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

export function historicalResourceRate(state,resourceId,{type='consume',limit=20}={}){
  const tx=activeRecords(state.resourceTransactions||[]).filter(t=>t.resourceId===resourceId&&t.type===type&&Number(t.quantity)>0&&Number(t.durationDays)>0).sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,limit);
  const qty=tx.reduce((s,t)=>s+Number(t.quantity),0), days=tx.reduce((s,t)=>s+Number(t.durationDays),0);
  return {rate:days>0?qty/days:null,samples:tx.length,totalQuantity:qty,totalDays:days,from:tx.length?tx[tx.length-1].at:null,to:tx.length?tx[0].at:null};
}


export function captureDepartureBaseline(state,{voyageId='',createdBy='',notes='',readinessResult=null}={}){
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

export function startWatch(state,{voyageId='',watchkeeper='',watchkeeperId='',scheduleId='',start=new Date().toISOString(),end='',notes=''}={}){
  const voyage=(state.voyages||[]).find(v=>v.id===voyageId) || (state.voyages||[]).find(v=>!v.archived&&v.status==='active') || null;
  const existing=(state.watches||[]).find(w=>!w.archived&&w.status==='active'); if(existing) throw new Error(`End the current watch (${existing.watchkeeper||'unassigned'}) before starting another.`);
  return upsertRecord(state,'watches',{name:`Watch — ${watchkeeper||'Unassigned'}`,voyageId:voyage?.id||voyageId,watchkeeper,watchkeeperId,scheduleId,start,end,status:'active',startedAt:start,notes,handoff:'',acknowledgedAt:'',acknowledgedBy:''});
}

export function endWatch(state,watchId,{endedAt=new Date().toISOString(),summary='',conditions='',traffic='',equipment='',weather='',upcoming='',plan='',notes='',nextWatchkeeper='',nextWatchkeeperId=''}={}){
  const watch=getRecord(state,'watches',watchId); if(!watch) throw new Error('Watch not found');
  watch.status='completed'; watch.endedAt=endedAt; watch.updatedAt=new Date().toISOString();
  const handoff=upsertRecord(state,'watchHandoffs',{name:`Watch handoff — ${watch.watchkeeper||'Outgoing'} → ${nextWatchkeeper||'Incoming'}`,watchId:watch.id,voyageId:watch.voyageId||'',fromWatchkeeper:watch.watchkeeper||'',fromWatchkeeperId:watch.watchkeeperId||'',toWatchkeeper:nextWatchkeeper,toWatchkeeperId:nextWatchkeeperId,createdAt:endedAt,summary,conditions,traffic,equipment,weather,upcoming,plan,notes,status:'pending',acknowledgedAt:'',acknowledgedBy:''});
  watch.handoffId=handoff.id; watch.handoff=summary||plan||notes||'';
  return handoff;
}

export function acknowledgeHandoff(state,handoffId,{acknowledgedAt=new Date().toISOString(),acknowledgedBy=''}={}){
  const h=getRecord(state,'watchHandoffs',handoffId); if(!h) throw new Error('Watch handoff not found');
  h.status='acknowledged';h.acknowledgedAt=acknowledgedAt;h.acknowledgedBy=acknowledgedBy;h.updatedAt=new Date().toISOString();
  const w=getRecord(state,'watches',h.watchId);if(w){w.acknowledgedAt=acknowledgedAt;w.acknowledgedBy=acknowledgedBy;w.updatedAt=new Date().toISOString();}
  return h;
}

export function nextScheduledWatch(state,at=new Date()){
  const schedules=activeRecords(state.watchSchedules||[]).filter(x=>x.enabled!==false).sort((a,b)=>(a.order??999)-(b.order??999));
  if(!schedules.length) return null;
  const mins=at.getHours()*60+at.getMinutes();
  const parse=t=>{const [h,m]=String(t||'00:00').split(':').map(Number);return h*60+m;};
  const upcoming=schedules.map(s=>({s,startMin:parse(s.startTime)})).filter(x=>x.startMin>mins).sort((a,b)=>a.startMin-b.startMin);
  return (upcoming[0]||{s:schedules[0]}).s;
}

export function updateVoyageObservation(state,voyageId,{lat=null,lon=null,speedKt=null,courseDeg=null,progressNm=null,source='manual',observedAt=new Date().toISOString(),notes=''}={}){
  const v=getRecord(state,'voyages',voyageId);if(!v) throw new Error('Voyage not found');
  if(Number.isFinite(Number(lat))&&Number.isFinite(Number(lon))) v.position={lat:Number(lat),lon:Number(lon)};
  if(Number.isFinite(Number(speedKt))) v.speedKt=Number(speedKt);
  if(Number.isFinite(Number(courseDeg))) v.courseDeg=Number(courseDeg);
  if(Number.isFinite(Number(progressNm))) v.progressNm=Number(progressNm);
  v.positionSource=source||'manual';v.positionUpdatedAt=observedAt;v.lastObservationAt=observedAt;v.lastObservationNotes=notes;v.updatedAt=new Date().toISOString();
  return v;
}


export function startProcedureExecution(state,procedureId,{voyageId='',crewId='',performedBy='',startedAt=new Date().toISOString(),notes=''}={}){
  const procedure=getRecord(state,'procedures',procedureId); if(!procedure) throw new Error('Procedure not found');
  const existing=activeRecords(state.procedureExecutions||[]).find(x=>x.procedureId===procedureId&&x.status==='in-progress');
  if(existing) return existing;
  const steps=(procedure.steps||[]).map((text,index)=>({index,text:String(text),status:'pending',at:'',reason:'',notes:''}));
  return upsertRecord(state,'procedureExecutions',{name:`Execution — ${procedure.name}`,procedureId,voyageId,crewId,performedBy:performedBy||'Crew',startedAt,status:'in-progress',category:procedure.category||'normal',procedureName:procedure.name,procedureRevisionAt:procedure.updatedAt||procedure.createdAt||'',steps,notes,completedAt:'',abortedAt:''});
}

export function recordProcedureStep(state,executionId,stepIndex,{status='done',at=new Date().toISOString(),reason='',notes=''}={}){
  const execution=getRecord(state,'procedureExecutions',executionId); if(!execution) throw new Error('Procedure execution not found');
  if(execution.status!=='in-progress') throw new Error('Procedure execution is no longer active');
  const step=(execution.steps||[]).find(x=>Number(x.index)===Number(stepIndex)); if(!step) throw new Error('Procedure step not found');
  if(status==='skipped'&&!String(reason||'').trim()) throw new Error('A skipped step requires a reason');
  if(status==='pending'){step.status='pending';step.at='';step.reason='';step.notes='';}
  else {step.status=status;step.at=at;step.reason=reason||'';step.notes=notes||'';}
  execution.updatedAt=new Date().toISOString(); return execution;
}

export function finishProcedureExecution(state,executionId,{status='completed',at=new Date().toISOString(),notes=''}={}){
  const execution=getRecord(state,'procedureExecutions',executionId); if(!execution) throw new Error('Procedure execution not found');
  if(status==='completed'&&(execution.steps||[]).some(s=>s.status==='pending')) throw new Error('Complete or skip every step before completing the procedure');
  execution.status=status;
  if(status==='aborted') execution.abortedAt=at; else execution.completedAt=at;
  execution.completionNotes=notes||'';execution.updatedAt=new Date().toISOString();
  return execution;
}

export function procedureExecutionSummary(execution){
  const steps=execution?.steps||[],done=steps.filter(s=>s.status==='done').length,skipped=steps.filter(s=>s.status==='skipped').length,pending=steps.filter(s=>s.status==='pending').length;
  return {total:steps.length,done,skipped,pending};
}


export function evidenceRelatedRecords(state,evidenceId){
  return relatedRecords(state,'evidence',evidenceId).filter(x=>x.collection!=='evidence');
}

export function evidenceForRecord(state,collection,id){
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

export function vesselTimeline(state,{kind='',systemId='',voyageId='',query='',limit=500}={}){
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
