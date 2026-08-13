export const APP_VERSION='1.9.0';
const demoRandomUUID=()=>globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
const now=new Date();
const iso=d=>d.toISOString().slice(0,10);
const days=n=>{const d=new Date(now);d.setDate(d.getDate()+n);return iso(d)};
const ago=n=>{const d=new Date(now);d.setDate(d.getDate()-n);return iso(d)};

export function blankState(name='Untitled Vessel'){
  return {
    schemaVersion:16, appVersion:APP_VERSION, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(),
    vessel:{id:demoRandomUUID(),name,type:'',lengthFt:null,homePort:'',status:'in-port',engineHours:0,cruiseSpeedKt:null,notes:''},
    crew:[], voyages:[], routeWaypoints:[], voyageScenarios:[], energyProfiles:[], systems:[], equipment:[], components:[], maintenance:[], maintenanceHistory:[], inspections:[], measurements:[], resources:[], tanks:[], resourceTransactions:[], provisions:[], energyObservations:[],
    energy:{capacityKwh:null,currentPct:null,reservePct:20,banks:[],loads:[],sources:[]}, inventory:[], inventoryTransactions:[], storageLocations:[], procedures:[], procedureExecutions:[], ports:[], portVisits:[], anchorages:[], groundTackle:[], anchorDeployments:[], anchorPositions:[],
    logs:[], findings:[], assumptions:[], evidence:[], timelineEvents:[], documents:[], weather:[], watches:[], watchSchedules:[], watchHandoffs:[], departureBaselines:[], relationships:[],
    settings:{theme:'dark',mode:'cruising',units:'marine',limits:{maxWindKt:25,maxGustKt:32,maxWaveM:2.5},freshness:{weatherHours:12,positionMinutes:60,resourceHours:48,measurementHours:72},activeScenario:'underway',activeEnergyProfileId:'enp-underway',activeAnchorageId:'a1',showArchived:false,sidebarCollapsed:false,lastBackupAt:'',lastBackupRecordCount:0}
  };
}

export function demoState(){
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
