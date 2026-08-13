export const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));
export const num = v => Number.isFinite(Number(v)) ? Number(v) : null;
export const fmt = (v,d=1,unknown='UNKNOWN') => Number.isFinite(v) ? v.toFixed(d) : unknown;

export function haversineNm(a,b){
  if(!a || !b || !Number.isFinite(+a.lat) || !Number.isFinite(+a.lon) || !Number.isFinite(+b.lat) || !Number.isFinite(+b.lon)) return null;
  const R=3440.065, rad=x=>x*Math.PI/180;
  const dLat=rad(+b.lat-+a.lat), dLon=rad(+b.lon-+a.lon);
  const la1=rad(+a.lat), la2=rad(+b.lat);
  const h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}

export function routeDistance(route=[]){
  let total=0, valid=false;
  for(let i=1;i<route.length;i++){
    const d=haversineNm(route[i-1],route[i]);
    if(Number.isFinite(d)){ total+=d; valid=true; }
  }
  return valid?total:null;
}

export function durationHours(distanceNm,speedKt){
  const d=num(distanceNm), s=num(speedKt);
  return d!==null && s>0 ? d/s : null;
}

export function endurance(quantity,reserve,dailyUse,dailyProduction=0){
  const q=num(quantity), r=num(reserve)??0, use=num(dailyUse), prod=num(dailyProduction)??0;
  if(q===null || use===null) return null;
  const net=use-prod;
  if(net<=0) return Infinity;
  return Math.max(0,q-r)/net;
}

export function fuelRange({usable,current,reserve,burnPerHour,speedKt}){
  const q=num(current ?? usable), r=num(reserve)??0, burn=num(burnPerHour), speed=num(speedKt);
  if(q===null || burn===null || speed===null || burn<=0 || speed<=0) return {hours:null,range:null};
  const hours=Math.max(0,q-r)/burn;
  return {hours,range:hours*speed};
}

export function energyDaily(loads=[]){
  return loads.reduce((sum,l)=>{
    const watts=num(l.watts)??0, duty=(num(l.dutyPct)??100)/100, hours=num(l.hoursPerDay)??0;
    return sum + watts*duty*hours/1000;
  },0);
}
export function generationDaily(sources=[]){
  return sources.reduce((sum,s)=>sum+(num(s.dailyKwh)??0),0);
}

export function energyProjection({capacityKwh,currentPct,reservePct,loads,sources}){
  const cap=num(capacityKwh), soc=num(currentPct), reserve=num(reservePct)??20;
  const use=energyDaily(loads), gen=generationDaily(sources), net=gen-use;
  if(cap===null || soc===null) return {use,gen,net,enduranceHours:null,projectedPct:null};
  const available=cap*Math.max(0,(soc-reserve)/100);
  const deficit=Math.max(0,use-gen);
  const enduranceHours=deficit>0 ? available/deficit*24 : Infinity;
  return {use,gen,net,enduranceHours,projectedPct:clamp(soc+(net/cap*100),0,100)};
}

export function anchorPlan({depth,bowHeight,tideRise,scope,availableClearance,availableRode,vesselLengthM=0}){
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

export function maintenanceStatus(task, engineHours=0, today=new Date(), currentCycles=null){
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

export function ageMs(timestamp,now=Date.now()){
  if(!timestamp) return null; const t=new Date(timestamp).getTime(); return Number.isFinite(t)?Math.max(0,now-t):null;
}
export function freshness(timestamp,maxAgeMs,now=Date.now()){
  const age=ageMs(timestamp,now); if(age===null)return {state:'unknown',ageMs:null,label:'timestamp unknown'};
  if(age>maxAgeMs)return {state:'stale',ageMs:age,label:`stale · ${Math.round(age/3600000)} hr old`};
  if(age<3600000)return {state:'fresh',ageMs:age,label:`${Math.max(0,Math.round(age/60000))} min old`};
  return {state:'fresh',ageMs:age,label:`${Math.round(age/3600000)} hr old`};
}


export function voyageWindow(voyage,nowDate=new Date()){
  if(!voyage) return {start:null,end:null};
  const parse=v=>{if(!v)return null;const d=new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(v))?`${v}T12:00:00`:v);return Number.isFinite(d.getTime())?d:null;};
  const start=parse(voyage.departedAt)||parse(voyage.plannedDeparture)||null;
  let end=parse(voyage.arrivedAt)||parse(voyage.plannedArrival)||parse(voyage.eta)||null;
  if(!end&&start){const dist=num(voyage.distanceNm),speed=num(voyage.speedKt);if(dist!==null&&speed>0)end=new Date(start.getTime()+dist/speed*3600000);}
  return {start:start||((voyage.status==='active'||voyage.status==='planned')?new Date(nowDate):null),end};
}

export function documentCompliance(document,voyage=null,nowDate=new Date()){
  const required=document?.requiredForDeparture!==false, expiry=document?.expires?new Date(`${document.expires}T23:59:59`):null, now=nowDate.getTime(), window=voyageWindow(voyage,nowDate);
  if(expiry&&!Number.isFinite(expiry.getTime())) return {status:'unknown',detail:'Expiration date is invalid',required,window};
  if(expiry&&expiry.getTime()<now) return {status:'fail',detail:`Expired ${document.expires}`,required,window};
  if(expiry&&window.end&&expiry.getTime()<=window.end.getTime()) return {status:'watch',detail:`Expires during voyage window · ${document.expires}`,required,window};
  if(expiry&&expiry.getTime()<now+90*86400000) return {status:'watch',detail:`Expires within 90 days · ${document.expires}`,required,window};
  if(required&&!expiry) return {status:'unknown',detail:'Required document has no expiration / no-expiry confirmation recorded',required,window};
  if(required&&String(document.confidence||'medium').toLowerCase()==='low') return {status:'watch',detail:'Required document record has LOW confidence',required,window};
  return {status:'pass',detail:expiry?`Valid beyond current voyage window · ${document.expires}`:'No expiry recorded; optional for departure review',required,window};
}

export function readiness(state,nowDate=new Date()){
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

export function interpolateCurve(curve=[],x,xKey='rpm',yKey='burnPerHour'){
  const pts=(curve||[]).filter(p=>Number.isFinite(Number(p[xKey]))&&Number.isFinite(Number(p[yKey]))).map(p=>({...p,[xKey]:Number(p[xKey]),[yKey]:Number(p[yKey])})).sort((a,b)=>a[xKey]-b[xKey]);
  const xv=num(x); if(xv===null||!pts.length) return null; if(pts.length===1) return pts[0][yKey];
  if(xv<=pts[0][xKey]) return pts[0][yKey]; if(xv>=pts.at(-1)[xKey]) return pts.at(-1)[yKey];
  for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];if(xv<=b[xKey]){const t=(xv-a[xKey])/(b[xKey]-a[xKey]);return a[yKey]+t*(b[yKey]-a[yKey]);}}
  return null;
}

export function fuelCurvePoint(curve=[],rpm){
  const burn=interpolateCurve(curve,rpm,'rpm','burnPerHour'), speed=interpolateCurve(curve,rpm,'rpm','speedKt');
  return {rpm:num(rpm),burnPerHour:burn,speedKt:speed,nmPerUnit:burn&&speed?speed/burn:null};
}

export function bestRangePoint(curve=[]){
  const pts=(curve||[]).map(p=>({rpm:num(p.rpm),speedKt:num(p.speedKt),burnPerHour:num(p.burnPerHour)})).filter(p=>p.rpm!==null&&p.speedKt>0&&p.burnPerHour>0).map(p=>({...p,nmPerUnit:p.speedKt/p.burnPerHour}));
  return pts.length?pts.sort((a,b)=>b.nmPerUnit-a.nmPerUnit)[0]:null;
}

export function tankQuantityFromCalibration(reading,calibration=[]){
  return interpolateCurve(calibration,reading,'reading','quantity');
}

export function effectiveDailyUse(resource={},crewCount=1,historicalRate=null){
  const entered=num(resource.dailyUse), hist=num(historicalRate);
  const base=resource.useRateSource==='historical'&&hist!==null?hist:entered;
  if(base===null) return null;
  return resource.rateBasis==='per-person'?base*Math.max(1,Number(crewCount)||1):base;
}

export function resourceEndurance({quantity,reserve,dailyUse,dailyProduction=0,passageDays=null}){
  const days=endurance(quantity,reserve,dailyUse,dailyProduction); const pd=num(passageDays);
  return {days,margin:Number.isFinite(days)&&pd!==null?days-pd:null};
}

export function provisionEndurance(provisions=[],crewCount=1){
  const rows=(provisions||[]).filter(p=>!p.archived&&p.countsForEndurance!==false).map(p=>{
    const servings=num(p.servingsRemaining??p.servings), use=num(p.servingsPerPersonDay); const crew=Math.max(1,Number(crewCount)||1);
    const days=servings!==null&&use>0?servings/(use*crew):null; return {...p,days};
  });
  const finite=rows.filter(r=>Number.isFinite(r.days));
  return {days:finite.length?Math.min(...finite.map(r=>r.days)):null,limiting:finite.sort((a,b)=>a.days-b.days)[0]||null,rows};
}

export function energyStorageSummary(energy={}){
  const banks=(energy.banks||[]).filter(b=>!b.archived);
  if(!banks.length){
    const capacity=num(energy.capacityKwh), pct=num(energy.currentPct), reserve=num(energy.reservePct)??20;
    return {capacityKwh:capacity,currentKwh:capacity!==null&&pct!==null?capacity*pct/100:null,reserveKwh:capacity!==null?capacity*reserve/100:null,currentPct:pct,reservePct:reserve,banks:[]};
  }
  let cap=0,current=0,reserve=0,valid=0;
  for(const b of banks){const c=num(b.capacityKwh),p=num(b.currentPct),r=num(b.reservePct)??20;if(c!==null){cap+=c;reserve+=c*r/100;if(p!==null){current+=c*p/100;valid++;}}}
  return {capacityKwh:cap||null,currentKwh:valid?current:null,reserveKwh:cap?reserve:null,currentPct:cap&&valid?current/cap*100:null,reservePct:cap?reserve/cap*100:null,banks};
}

export function applyEnergyProfile(energy={},profile=null){
  const loads=(energy.loads||[]).map(l=>({...l})),sources=(energy.sources||[]).map(s=>({...s}));
  if(profile){
    for(const o of profile.loadOverrides||[]){const l=loads.find(x=>x.id===o.loadId);if(!l)continue;if(o.enabled===false)l.enabled=false;if(o.enabled===true)l.enabled=true;if(num(o.hoursPerDay)!==null)l.hoursPerDay=num(o.hoursPerDay);if(num(o.dutyPct)!==null)l.dutyPct=num(o.dutyPct);}
    for(const o of profile.sourceOverrides||[]){const s=sources.find(x=>x.id===o.sourceId);if(!s)continue;if(o.enabled===false)s.enabled=false;if(o.enabled===true)s.enabled=true;if(num(o.dailyKwh)!==null)s.dailyKwh=num(o.dailyKwh);}
  }
  return {loads:loads.filter(l=>l.enabled!==false),sources:sources.filter(s=>s.enabled!==false)};
}

export function energyProfileProjection(energy={},profile=null){
  const cfg=applyEnergyProfile(energy,profile), storage=energyStorageSummary(energy);
  const use=energyDaily(cfg.loads), gen=generationDaily(cfg.sources), net=gen-use;
  const available=storage.currentKwh!==null&&storage.reserveKwh!==null?Math.max(0,storage.currentKwh-storage.reserveKwh):null;
  const enduranceHours=available===null?null:net<0?available/(-net)*24:Infinity;
  const projectedPct=storage.capacityKwh&&storage.currentKwh!==null?clamp((storage.currentKwh+net)/storage.capacityKwh*100,0,100):null;
  return {...cfg,...storage,use,gen,net,enduranceHours,projectedPct};
}

export function loadSheddingPlan(energy={},profile=null){
  const priorityRank={optional:0,comfort:1,operational:2,essential:3,low:0,medium:1,high:3};
  const base=applyEnergyProfile(energy,profile); const storage=energyStorageSummary(energy); const gen=generationDaily(base.sources);
  const candidates=[...base.loads].sort((a,b)=>(priorityRank[a.priority]??2)-(priorityRank[b.priority]??2));
  const steps=[]; let active=[...base.loads];
  const snapshot=(label,removed='')=>{const use=energyDaily(active),net=gen-use,avail=storage.currentKwh!==null&&storage.reserveKwh!==null?Math.max(0,storage.currentKwh-storage.reserveKwh):null;steps.push({label,removed,use,gen,net,enduranceHours:avail===null?null:net<0?avail/(-net)*24:Infinity});};
  snapshot('Current profile');
  for(const c of candidates){if((priorityRank[c.priority]??2)>=3)continue;active=active.filter(x=>x.id!==c.id);snapshot(`Shed ${c.priority||'load'}`,c.name);}
  return steps;
}

export function analyzeVoyageScenario({distanceNm,speedKt,motorHours=0,fuelQuantity=null,fuelReserve=0,fuelBurnPerHour=null,waterQuantity=null,waterReserve=0,waterDailyUse=null,waterDailyProduction=0,provisionDays=null,provisionUseScalePct=100,energyProjection=null}={}){
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
