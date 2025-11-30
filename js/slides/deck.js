// js/deck.js — redesigned story: DC growth → electricity draw → prices + water stress

// Simple formatters (no d3 imports here)
const d3formatYear = v => String(v);
const d3formatDefault = v => {
  if (v == null || isNaN(v)) return '';
  const abs = Math.abs(v);
  if (abs >= 1e9) return (v/1e9).toFixed(1) + 'G';
  if (abs >= 1e6) return (v/1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (v/1e3).toFixed(1) + 'k';
  return String(Math.round(v));
};


import { warmJsons } from '../core/geoWarm.js';

warmJsons([
  'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json',
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
]);

const defaultBasemap = {
  url:'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json',
  object:'states',
  sphereFill:'rgba(255,255,255,.0)',
  stateFill:'rgba(255,255,255,.35)',
  stateStroke:'rgba(255,255,255,.12)',
  stateStrokeWidth:0.6
};

// ---- Data (materialized from datasets) ----
const globalTopCountries = [
  { country:'United States', sites:4214, share:'37.8%' },
  { country:'United Kingdom', sites:514, share:'4.6%' },
  { country:'Germany', sites:490, share:'4.4%' },
  { country:'China', sites:381, share:'3.4%' },
  { country:'France', sites:321, share:'2.9%' },
  { country:'Canada', sites:295, share:'2.6%' },
  { country:'Rest of world', sites:4937, share:'44.3%' }
];

const usTopSites = [
  { name:'Virginia', lon:-79.013672, lat:37.160317, sites:666, share:15.8 },
  { name:'Texas', lon:-99.404297, lat:31.728167, sites:413, share:9.8 },
  { name:'California', lon:-119.970703, lat:36.668419, sites:321, share:7.6 },
  { name:'Illinois', lon:-89.384766, lat:40.178873, sites:244, share:5.8 },
  { name:'Ohio', lon:-83.056641, lat:40.446947, sites:203, share:4.8 },
  { name:'Arizona', lon:-112.236328, lat:34.161818, sites:164, share:3.9 },
  { name:'Georgia', lon:-83.496094, lat:32.472695, sites:163, share:3.9 },
  { name:'New York', lon:-75.234375, lat:42.617791, sites:142, share:3.4 },
  { name:'Oregon', lon:-121.025391, lat:43.707594, sites:137, share:3.3 },
  { name:'Washington', lon:-121.025391, lat:47.100045, sites:134, share:3.2 },
  { name:'Florida', lon:-83.056641, lat:28.613459, sites:126, share:3.0 },
  { name:'North Carolina', lon:-80.068359, lat:35.675147, sites:110, share:2.6 }
];

const estTrend = [
  { x:2015, y:17799 }, { x:2016, y:19493 }, { x:2017, y:21244 }, { x:2018, y:23700 }, { x:2019, y:26397 },
  { x:2020, y:30112 }, { x:2021, y:37164 }, { x:2022, y:46696 }, { x:2023, y:52770 }, { x:2024, y:55259 }
];

const empTrend = [
  { x:2015, y:296699 }, { x:2016, y:301209 }, { x:2017, y:313349 }, { x:2018, y:333499 }, { x:2019, y:344062 },
  { x:2020, y:361636 }, { x:2021, y:388804 }, { x:2022, y:467131 }, { x:2023, y:486212 }, { x:2024, y:483805 }
];

const priceTrendUS = [
  { x:2015, y:13.22 }, { x:2016, y:13.17 }, { x:2017, y:13.52 }, { x:2018, y:13.62 }, { x:2019, y:13.75 },
  { x:2020, y:13.80 }, { x:2021, y:14.23 }, { x:2022, y:15.63 }, { x:2023, y:16.68 }, { x:2024, y:17.05 }
];

const estTrendIndex = [
  { x:2015, y:100.0 }, { x:2016, y:109.5 }, { x:2017, y:119.3 }, { x:2018, y:133.1 }, { x:2019, y:148.4 },
  { x:2020, y:169.2 }, { x:2021, y:208.9 }, { x:2022, y:262.4 }, { x:2023, y:296.6 }, { x:2024, y:310.7 }
];

const priceTrendUSIndex = [
  { x:2015, y:100.0 }, { x:2016, y:99.6 }, { x:2017, y:102.3 }, { x:2018, y:103.0 }, { x:2019, y:104.0 },
  { x:2020, y:104.4 }, { x:2021, y:107.6 }, { x:2022, y:118.2 }, { x:2023, y:126.2 }, { x:2024, y:128.9 }
];

const growthLeaderRows = [
  { state:'Alabama', start:131, end:1420, growth:'+984%' },
  { state:'Connecticut', start:156, end:1583, growth:'+915%' },
  { state:'District of Columbia', start:79, end:614, growth:'+677%' },
  { state:'North Dakota', start:24, end:178, growth:'+642%' },
  { state:'Maine', start:51, end:338, growth:'+563%' }
];

const aiSeries = {
  ai: [
    { x:2025, y:44 }, { x:2026, y:62 }, { x:2027, y:83 },
    { x:2028, y:102 }, { x:2029, y:124 }, { x:2030, y:156 }
  ],
  nonAi: [
    { x:2025, y:38 }, { x:2026, y:40 }, { x:2027, y:45 },
    { x:2028, y:50 }, { x:2029, y:56 }, { x:2030, y:64 }
  ]
};

const capacitySeries = [
  { x:2005, y:21.4 }, { x:2006, y:23.8 }, { x:2007, y:24.8 }, { x:2008, y:25.9 }, { x:2009, y:26.9 },
  { x:2010, y:28.0 }, { x:2011, y:29.0 }, { x:2012, y:29.7 }, { x:2013, y:30.5 }, { x:2014, y:31.3 },
  { x:2015, y:32.9 }, { x:2016, y:35.3 }, { x:2017, y:38.1 }, { x:2018, y:43.5 }, { x:2019, y:51.6 },
  { x:2020, y:59.7 }, { x:2021, y:66.9 }, { x:2022, y:74.1 }, { x:2023, y:83.2 }, { x:2024, y:97.1 },
  { x:2025, y:114.3 }
];

const buildTimelineItems = [
  { name:'Data center shell + fit-out', max:18, color:'var(--brand)' },
  { name:'Battery storage', max:24, color:'var(--brand-2)' },
  { name:'Utility-scale solar', max:30, color:'var(--brand-2)' },
  { name:'Gas-fired (planned)', max:36, color:'var(--accent)' },
  { name:'Wind onshore', max:42, color:'var(--brand-2)' },
  { name:'Coal retrofit/new', max:54, color:'var(--muted)' },
  { name:'Wind offshore', max:60, color:'var(--brand-2)' },
  { name:'Conventional geothermal', max:66, color:'var(--muted)' },
  { name:'Gas-fired (unplanned)', max:78, color:'var(--danger)' },
  { name:'Hydropower plant', max:120, color:'var(--danger)' },
  { name:'Transmission line', max:120, color:'var(--danger)' },
  { name:'Nuclear (traditional fission)', max:120, color:'var(--danger)' }
];

const priceSeries = {
  VA: [
    { x:2015, y:11.37 }, { x:2016, y:11.36 }, { x:2017, y:11.55 }, { x:2018, y:11.73 }, { x:2019, y:12.07 },
    { x:2020, y:12.03 }, { x:2021, y:11.96 }, { x:2022, y:13.34 }, { x:2023, y:14.26 }, { x:2024, y:14.41 }
  ],
  TX: [
    { x:2015, y:11.56 }, { x:2016, y:10.99 }, { x:2017, y:11.01 }, { x:2018, y:11.20 }, { x:2019, y:11.76 },
    { x:2020, y:11.71 }, { x:2021, y:12.11 }, { x:2022, y:13.76 }, { x:2023, y:14.46 }, { x:2024, y:14.94 }
  ],
  CA: [
    { x:2015, y:16.99 }, { x:2016, y:17.39 }, { x:2017, y:18.31 }, { x:2018, y:18.84 }, { x:2019, y:19.15 },
    { x:2020, y:20.45 }, { x:2021, y:22.82 }, { x:2022, y:25.84 }, { x:2023, y:29.51 }, { x:2024, y:31.97 }
  ],
  US: [
    { x:2015, y:13.22 }, { x:2016, y:13.17 }, { x:2017, y:13.52 }, { x:2018, y:13.62 }, { x:2019, y:13.75 },
    { x:2020, y:13.80 }, { x:2021, y:14.23 }, { x:2022, y:15.63 }, { x:2023, y:16.68 }, { x:2024, y:17.05 }
  ]
};

const priceTableRows = [
  { state:'California', share:'3.7%',  p2015:'16.99', p2024:'31.97', delta:'+14.98' },
  { state:'Oregon',     share:'11.4%', p2015:'10.66', p2024:'14.70', delta:'+4.04' },
  { state:'Texas',      share:'4.6%',  p2015:'11.56', p2024:'14.94', delta:'+3.38' },
  { state:'Virginia',   share:'25.6%', p2015:'11.37', p2024:'14.41', delta:'+3.04' },
  { state:'Arizona',    share:'7.4%',  p2015:'12.13', p2024:'14.91', delta:'+2.78' },
  { state:'Nevada',     share:'8.7%',  p2015:'12.76', p2024:'15.00', delta:'+2.24' }
];

const electricityShareMap = {
  "Alabama":0.017,"Arizona":0.074,"California":0.037,"Colorado":0.027,"Connecticut":0.01,"Delaware":0.003,"Florida":0.006,"Georgia":0.022,
  "Idaho":0.052,"Illinois":0.055,"Indiana":0.019,"Iowa":0.114,"Kansas":0.008,"Kentucky":0.01,"Louisiana":0.002,"Maine":0.0,"Maryland":0.021,
  "Massachusetts":0.022,"Michigan":0.019,"Minnesota":0.025,"Missouri":0.011,"Nebraska":0.117,"Nevada":0.087,"New Hampshire":0.0,"New Jersey":0.001,
  "New Mexico":0.006,"New York":0.024,"North Carolina":0.013,"North Dakota":0.0,"Ohio":0.033,"Oklahoma":0.017,"Oregon":0.114,"Pennsylvania":0.004,
  "Rhode Island":0.0,"South Carolina":0.011,"South Dakota":0.004,"Tennessee":0.013,"Texas":0.015,"Utah":0.077,"Vermont":0.0,"Virginia":0.256,
  "Washington":0.057,"West Virginia":0.011,"Wisconsin":0.008,"Wyoming":0.113
};

const electricityCorrPoints = [
  {"name":"Virginia","datacenters":666,"elec_pct":0.256},
  {"name":"Nebraska","datacenters":39,"elec_pct":0.117},
  {"name":"Oregon","datacenters":137,"elec_pct":0.114},
  {"name":"Iowa","datacenters":105,"elec_pct":0.114},
  {"name":"Wyoming","datacenters":15,"elec_pct":0.113},
  {"name":"Nevada","datacenters":62,"elec_pct":0.087},
  {"name":"Utah","datacenters":44,"elec_pct":0.077},
  {"name":"Arizona","datacenters":164,"elec_pct":0.074},
  {"name":"Washington","datacenters":134,"elec_pct":0.057},
  {"name":"Illinois","datacenters":244,"elec_pct":0.055},
  {"name":"New Jersey","datacenters":82,"elec_pct":0.054},
  {"name":"Texas","datacenters":413,"elec_pct":0.046},
  {"name":"North Dakota","datacenters":22,"elec_pct":0.044},
  {"name":"Georgia","datacenters":163,"elec_pct":0.043},
  {"name":"California","datacenters":321,"elec_pct":0.037},
  {"name":"Montana","datacenters":27,"elec_pct":0.036},
  {"name":"Pennsylvania","datacenters":101,"elec_pct":0.032},
  {"name":"New York","datacenters":142,"elec_pct":0.028},
  {"name":"Colorado","datacenters":60,"elec_pct":0.027},
  {"name":"South Carolina","datacenters":30,"elec_pct":0.025},
  {"name":"Massachusetts","datacenters":49,"elec_pct":0.022},
  {"name":"Maryland","datacenters":135,"elec_pct":0.021},
  {"name":"Tennessee","datacenters":75,"elec_pct":0.013},
  {"name":"Ohio","datacenters":203,"elec_pct":0.016},
  {"name":"North Carolina","datacenters":110,"elec_pct":0.019},
  {"name":"Florida","datacenters":126,"elec_pct":0.006},
  {"name":"Michigan","datacenters":58,"elec_pct":0.005}
];

const waterCorrPoints = [
  {"name":"California","datacenters":321,"scarcity":244.9218,"footprint":19.60878},
  {"name":"Texas","datacenters":413,"scarcity":8.936889,"footprint":3.725257},
  {"name":"Florida","datacenters":126,"scarcity":1.525329,"footprint":6.537948},
  {"name":"Virginia","datacenters":666,"scarcity":1.158254,"footprint":3.378927},
  {"name":"Illinois","datacenters":244,"scarcity":0.760778,"footprint":2.469428},
  {"name":"New York","datacenters":142,"scarcity":1.352035,"footprint":2.360777},
  {"name":"Missouri","datacenters":55,"scarcity":0.82114,"footprint":6.049557},
  {"name":"Georgia","datacenters":163,"scarcity":1.152827,"footprint":3.068456},
  {"name":"Oregon","datacenters":137,"scarcity":33.89067,"footprint":8.228881},
  {"name":"Ohio","datacenters":203,"scarcity":0.73454,"footprint":2.996501},
  {"name":"Colorado","datacenters":60,"scarcity":61.51373,"footprint":5.097351},
  {"name":"Washington","datacenters":134,"scarcity":89.1991,"footprint":8.543733},
  {"name":"Arizona","datacenters":164,"scarcity":129.3905,"footprint":19.13328},
  {"name":"Nevada","datacenters":62,"scarcity":159.1618,"footprint":20.54477},
  {"name":"New Jersey","datacenters":82,"scarcity":1.38814,"footprint":7.436839},
  {"name":"North Carolina","datacenters":110,"scarcity":1.077524,"footprint":7.620251},
  {"name":"Iowa","datacenters":105,"scarcity":0.982694,"footprint":5.753424},
  {"name":"Minnesota","datacenters":81,"scarcity":1.440265,"footprint":4.762337},
  {"name":"Massachusetts","datacenters":49,"scarcity":1.217586,"footprint":2.450075},
  {"name":"Michigan","datacenters":58,"scarcity":0.985253,"footprint":4.342229}
];

const waterScarcityByState = {
  "Alabama":0.996,"Arizona":129.391,"Arkansas":0.526,"California":244.922,"Colorado":61.514,"Connecticut":1.069,
  "Delaware":1.343,"District of Columbia":0.388,"Florida":1.525,"Georgia":1.153,"Idaho":13.248,"Illinois":0.761,
  "Indiana":0.682,"Iowa":0.983,"Kansas":10.249,"Kentucky":1.064,"Louisiana":0.598,"Maine":1.124,"Maryland":1.124,
  "Massachusetts":1.218,"Michigan":0.985,"Minnesota":1.440,"Mississippi":1.383,"Missouri":0.821,"Montana":17.899,
  "Nebraska":8.864,"Nevada":159.162,"New Hampshire":1.018,"New Jersey":1.388,"New Mexico":82.157,"New York":1.352,
  "North Carolina":1.078,"North Dakota":5.776,"Ohio":0.735,"Oklahoma":2.327,"Oregon":33.891,"Pennsylvania":1.062,
  "South Carolina":1.102,"South Dakota":4.585,"Tennessee":1.045,"Texas":8.937,"Utah":103.210,"Vermont":1.139,
  "Virginia":1.158,"Washington":89.199,"West Virginia":0.809,"Wisconsin":0.897,"Wyoming":46.151
};

const waterFootprintByState = {
  "Alabama":5.914,"Arizona":19.133,"Arkansas":4.137,"California":19.609,"Colorado":5.097,"Connecticut":1.652,"Delaware":2.475,"Washington, D.C.":3.379,"Florida":6.538,"Georgia":3.068,"Idaho":2.946,"Illinois":2.469,"Indiana":2.954,"Iowa":5.753,"Kansas":2.341,"Kentucky":4.410,"Louisiana":2.274,"Maine":21.299,"Maryland":4.836,"Massachusetts":2.450,"Michigan":4.342,"Minnesota":4.762,"Mississippi":10.746,"Missouri":6.050,"Montana":2.482,"Nebraska":2.254,"Nevada":20.545,"New Hampshire":2.559,"New Jersey":7.437,"New Mexico":13.744,"New York":2.361,"North Carolina":7.620,"North Dakota":6.687,"Ohio":2.997,"Oklahoma":3.858,"Oregon":8.229,"Pennsylvania":3.296,"South Carolina":6.902,"South Dakota":2.539,"Tennessee":4.475,"Texas":3.725,"Utah":20.169,"Vermont":4.866,"Virginia":3.379,"Washington":8.544,"West Virginia":6.452,"Wisconsin":5.274,"Wyoming":3.655
};

const waterUsageRows = [
  { type:'Hyperscale campus', perDay:'550,000', perYear:'200,000,000' },
  { type:'Wholesale/retail avg site', perDay:'18,000', perYear:'6,570,000' },
  { type:'Wholesale/retail high site', perDay:'88,000', perYear:'32,100,000' }
];

const waterSankeyNodes = [
  { name:'DC build' },
  { name:'Cooling water' },
  { name:'Hyperscale sites' },
  { name:'Wholesale sites' },
  { name:'High-stress basins (40%)' },
  { name:'Lower-stress basins (60%)' }
];

const waterSankeyLinks = [
  { source:'DC build', target:'Cooling water', value:100 },
  { source:'Cooling water', target:'Hyperscale sites', value:60 },
  { source:'Cooling water', target:'Wholesale sites', value:40 },
  { source:'Hyperscale sites', target:'High-stress basins (40%)', value:24 },
  { source:'Hyperscale sites', target:'Lower-stress basins (60%)', value:36 },
  { source:'Wholesale sites', target:'High-stress basins (40%)', value:16 },
  { source:'Wholesale sites', target:'Lower-stress basins (60%)', value:24 }
];

const waterBubbleSites = [
  { name:'California', lon:-119.970703, lat:36.668419, footprint:19.61, scarcity:244.92 },
  { name:'Nevada', lon:-116.419389, lat:38.502032, footprint:20.54, scarcity:159.16 },
  { name:'Arizona', lon:-112.236328, lat:34.161818, footprint:19.13, scarcity:129.39 },
  { name:'Utah', lon:-111.888229, lat:39.32155, footprint:20.17, scarcity:103.21 },
  { name:'New Mexico', lon:-106.018066, lat:34.51994, footprint:13.74, scarcity:82.16 },
  { name:'Washington', lon:-121.025391, lat:47.100045, footprint:8.54, scarcity:89.20 }
];

// Panel-driven additions (state-year panel, 2015–2024; employment to 2023)
const panelAttributeGrowthCounts = [
  { attribute:'annual_avg_estabs', meaning:'Annual average number of NAICS 518210 establishments in each state-year', source:'BLS QCEW, NAICS 518210, private, annual state-level averages' },
  { attribute:'dc_count_modeled', meaning:'Modeled number of data center sites derived from establishment counts and external assumptions', source:'Project modeling based on QCEW NAICS 518210 establishments and external assumptions' },
  { attribute:'jobs_per_dc_modeled', meaning:'Modeled jobs per data center site used to impute employment impacts', source:'Project modeling based on QCEW NAICS 518210 establishments and external assumptions' }
];

const panelAttributeGrowthEmployment = [
  { attribute:'annual_avg_emplvl', meaning:'Annual average employment in NAICS 518210 by state-year', source:'BLS QCEW, NAICS 518210, private, annual state-level averages' },
  { attribute:'sector_annual_avg_emplvl', meaning:'Total state employment (industry code 10) used as job-share baseline', source:'BLS QCEW, annual by industry, private ownership, state-wide (area_fips ending in 000)' },
  { attribute:'sector_total_annual_wages', meaning:'Total annual wages for state employment baseline', source:'BLS QCEW, annual by industry, private ownership, state-wide (area_fips ending in 000)' }
];

const panelAttributeElectricity = [
  { attribute:'dc_electricity_mwh_modeled', meaning:'Modeled data center electricity use (MWh) by state-year', source:'Project modeling based on QCEW data-center activity and assumed electricity per data center' },
  { attribute:'res_price_cents_per_kwh', meaning:'Residential retail electricity price (¢/kWh)', source:'EIA-861 Annual Electric Power Industry Report, Total Electric Industry, state-level' },
  { attribute:'total_price_cents_per_kwh', meaning:'All-sector average electricity price (¢/kWh)', source:'EIA-861 Annual Electric Power Industry Report, Total Electric Industry, state-level' }
];

const panelAttributeCarbon = [
  { attribute:'co2_power_metric_tons', meaning:'Power-sector CO₂ emissions (metric tons)', source:'EIA Electric Power Industry Estimated Emissions by State, Total Electric Power Industry' },
  { attribute:'co2_intensity_kg_per_mwh', meaning:'Power-sector CO₂ intensity (kg per MWh generation)', source:'Derived in project from EIA emissions and net generation (kg per MWh)' },
  { attribute:'dc_co2_tons_modeled', meaning:'Modeled DC CO₂ emissions = DC electricity × state CO₂ intensity', source:'Project modeling: data-center electricity times state power-sector emission intensity' },
  { attribute:'share_renewables_gen', meaning:'Share of state generation from renewables', source:'Derived in project from EIA net generation by fuel (share of total MWh)' }
];

const panelAttributeWater = [
  { attribute:'dc_water_total_gallons_modeled', meaning:'Modeled total water use for DC cooling (gallons)', source:'Project modeling: data-center electricity multiplied by technology- and region-specific water-intensity factors' },
  { attribute:'dc_water_scarcity_m3_usaeq_modeled', meaning:'Modeled water use adjusted for scarcity (m³ USA eq.)', source:'Project modeling: data-center electricity multiplied by technology- and region-specific water-intensity factors' },
  { attribute:'water_scarcity_index', meaning:'State-level water stress index used to classify scarcity', source:'Project modeling + WRI Aqueduct stress factors (state-level water stress)' }
];

const panelJobsTrend = [
  { x:2015, y:296699 }, { x:2016, y:301209 }, { x:2017, y:313349 }, { x:2018, y:333499 }, { x:2019, y:344062 },
  { x:2020, y:361636 }, { x:2021, y:388804 }, { x:2022, y:467131 }, { x:2023, y:486212 }
];

const jobShareMap2023 = {
  "Alabama":0.0022068511198945983,"Alaska":0.0005066935830876941,"Arizona":0.004359874403220046,"Arkansas":0.004248132318511991,
  "California":0.0053840035275844154,"Colorado":0.0064672455428248475,"Connecticut":0.0026029583968538036,"Delaware":0.0012643601372733866,
  "District of Columbia":0.0033887727162887522,"Florida":0.0034411081314711925,"Georgia":0.005961384808040321,"Hawaii":0.0011938845067679426,
  "Idaho":0.0016120604975512567,"Illinois":0.0030351033996252595,"Indiana":0.001338880087861748,"Iowa":0.0024850890845775925,
  "Kansas":0.002180313641524073,"Kentucky":0.0024065175375783993,"Louisiana":0.002130056374990278,"Maine":0.0015822814057904846,
  "Maryland":0.0023432915237190386,"Massachusetts":0.0031657255613047296,"Michigan":0.002758761301238023,"Minnesota":0.0027924666353093203,
  "Mississippi":0.0010846161520908634,"Missouri":0.005927171788831452,"Montana":0.0011093044092479964,"Nebraska":0.00257214116856808,
  "Nevada":0.002370285726096543,"New Hampshire":0.002983140509082672,"New Jersey":0.004003448129362414,"New Mexico":0.0014513082401893037,
  "New York":0.0034447160252037835,"North Carolina":0.0028752191190338293,"North Dakota":0.0010623331132102558,"Ohio":0.0025170755004931566,
  "Oklahoma":0.0015272484656774922,"Oregon":0.0045760677295609755,"Pennsylvania":0.0027211454086848792,"Rhode Island":0.0017206224205294838,
  "South Carolina":0.0022501062520733726,"South Dakota":0.0009522723233587893,"Tennessee":0.003070874546360207,"Texas":0.004132437494453154,
  "Utah":0.005189667420173815,"Vermont":0.002008142605633803,"Virginia":0.005533816752039691,"Washington":0.008076350717544506,
  "West Virginia":0.0024592928988824356,"Wisconsin":0.0031637997187471635,"Wyoming":0.0009319577200286613
};

const jobShareLeaderRows = [
  { state:'Washington', dcJobs:'24,254', share:'0.81%' },
  { state:'Colorado', dcJobs:'15,734', share:'0.65%' },
  { state:'Georgia', dcJobs:'24,726', share:'0.60%' },
  { state:'Missouri', dcJobs:'14,646', share:'0.59%' },
  { state:'Virginia', dcJobs:'18,440', share:'0.55%' },
  { state:'California', dcJobs:'83,236', share:'0.54%' }
];

const co2TrendSeries = [
  { x:2015, y:30.918 }, { x:2016, y:32.349 }, { x:2017, y:35.033 }, { x:2018, y:38.342 }, { x:2019, y:40.667 },
  { x:2020, y:43.697 }, { x:2021, y:50.573 }, { x:2022, y:53.970 }, { x:2023, y:57.472 }, { x:2024, y:63.025 }
];

const co2IntensityMap = {
  "Alabama":339.4632676508993,"Alaska":543.4606889224821,"Arizona":288.0186925555316,"Arkansas":436.4173373307454,"California":184.8554103598089,
  "Colorado":435.4192491138576,"Connecticut":245.7830195347725,"Delaware":511.7196323063036,"District of Columbia":426.122492587943,"Florida":347.6077242308031,
  "Georgia":305.5524639572649,"Hawaii":648.1508144489798,"Idaho":173.7866674040268,"Illinois":231.8422006547812,"Indiana":633.290115704224,
  "Iowa":317.885089591944,"Kansas":309.234662171162,"Kentucky":792.913959805259,"Louisiana":421.1683997950872,"Maine":221.4322473599433,
  "Maryland":274.3197593461036,"Massachusetts":425.2944194303676,"Michigan":434.8814159474442,"Minnesota":347.989824153239,"Mississippi":360.9456657531549,
  "Missouri":661.981697091515,"Montana":440.5531032900341,"Nebraska":491.6384963852056,"Nevada":287.0330442121358,"New Hampshire":127.4377852261171,
  "New Jersey":230.3457011267673,"New Mexico":337.6056564460036,"New York":244.2565405691237,"North Carolina":304.7380678229551,"North Dakota":647.4846361640485,
  "Ohio":456.8521952443512,"Oklahoma":305.8239553468887,"Oregon":160.0831898561069,"Pennsylvania":299.4758007920607,"Rhode Island":376.3970376679946,
  "South Carolina":267.6621351699434,"South Dakota":144.5185352199699,"Tennessee":365.5101885250058,"Texas":374.0536743931567,"Utah":601.1315109683507,
  "Vermont":3.679239060229112,"Virginia":286.6561345544923,"Washington":113.3844290718569,"West Virginia":868.9936981293223,"Wisconsin":495.354580520012,
  "Wyoming":783.7339025747283
};

const renewablesVsCo2Points = [
  { state:'California', renewPct:49.64, intensity:184.86, sites:449 },
  { state:'Texas', renewPct:29.27, intensity:374.05, sites:332 },
  { state:'Florida', renewPct:7.71, intensity:347.61, sites:331 },
  { state:'New York', renewPct:29.88, intensity:244.26, sites:242 },
  { state:'Georgia', renewPct:8.88, intensity:305.55, sites:223 },
  { state:'Michigan', renewPct:10.97, intensity:434.88, sites:188 },
  { state:'Ohio', renewPct:5.21, intensity:456.85, sites:188 },
  { state:'North Carolina', renewPct:13.02, intensity:304.74, sites:186 }
];

const waterTrendSeries = [
  { x:2015, y:93.607 }, { x:2016, y:105.895 }, { x:2017, y:119.795 }, { x:2018, y:135.520 }, { x:2019, y:153.310 },
  { x:2020, y:173.434 }, { x:2021, y:196.200 }, { x:2022, y:221.955 }, { x:2023, y:251.090 }, { x:2024, y:284.049 }
];

const waterUseMap2024 = {
  "Alabama":2.2633,"Alaska":0.0687,"Arizona":6.7049,"Arkansas":2.4688,"California":46.5912,"Colorado":7.1488,"Connecticut":0.4712,"Delaware":0.3942,"District of Columbia":0.1358,"Florida":17.4688,"Georgia":14.4029,"Hawaii":0.4355,"Idaho":1.6094,"Illinois":5.3016,"Indiana":2.6499,"Iowa":1.2589,"Kansas":2.1162,"Kentucky":1.5984,"Louisiana":2.5687,"Maine":0.3811,"Maryland":2.5220,"Massachusetts":2.0097,"Michigan":6.8475,"Minnesota":2.6324,"Mississippi":1.0050,"Missouri":7.3348,"Montana":0.2075,"Nebraska":1.0832,"Nevada":4.9511,"New Hampshire":0.2846,"New Jersey":9.6160,"New Mexico":0.8837,"New York":17.0523,"North Carolina":6.9869,"North Dakota":0.1545,"Ohio":6.8473,"Oklahoma":1.0306,"Oregon":2.2921,"Pennsylvania":7.6127,"Rhode Island":0.3724,"South Carolina":3.3870,"South Dakota":0.0970,"Tennessee":2.8836,"Texas":27.9646,"Utah":3.5778,"Vermont":0.0559,"Virginia":11.4485,"Washington":14.1883,"West Virginia":0.6132,"Wisconsin":2.9845,"Wyoming":0.3811
};

// Dummy but topic-specific data for methodology visuals
const methodClusterPoints = [
  { name:'Virginia hub', loadShare:25.6, intensity:286.7, renewables:28, waterPerSite:3.4, cluster:'High-load, mid-intensity' },
  { name:'Texas gas', loadShare:15.0, intensity:374.1, renewables:29, waterPerSite:3.7, cluster:'Fossil-heavy hubs' },
  { name:'California renewables', loadShare:7.0, intensity:184.9, renewables:50, waterPerSite:19.6, cluster:'Green high-load' },
  { name:'Pacific Northwest', loadShare:5.0, intensity:113.4, renewables:65, waterPerSite:8.5, cluster:'Low-intensity hydro' },
  { name:'Midwest coal', loadShare:9.5, intensity:661.9, renewables:18, waterPerSite:6.1, cluster:'Fossil high-load' },
  { name:'Lower-load states', loadShare:2.5, intensity:305.0, renewables:22, waterPerSite:4.0, cluster:'Lower-load mix' }
];

const methodScenarioSeries = {
  baseline:[
    { x:2024, y:100 }, { x:2026, y:112 }, { x:2028, y:128 }, { x:2030, y:145 }
  ],
  efficiency:[
    { x:2024, y:100 }, { x:2026, y:106 }, { x:2028, y:114 }, { x:2030, y:122 }
  ],
  renewables:[
    { x:2024, y:100 }, { x:2026, y:104 }, { x:2028, y:110 }, { x:2030, y:118 }
  ],
  waterSaving:[
    { x:2024, y:100 }, { x:2026, y:103 }, { x:2028, y:107 }, { x:2030, y:112 }
  ]
};

const methodCorrelationRows = [
  { variable:'DC load share', residential_price:'+0.52', co2_intensity:'+0.48', water_stress:'+0.41', job_share:'+0.32' },
  { variable:'CO2 intensity', residential_price:'+0.33', co2_intensity:'—', water_stress:'+0.28', job_share:'-0.12' },
  { variable:'Renewables share', residential_price:'-0.18', co2_intensity:'-0.45', water_stress:'-0.08', job_share:'+0.05' },
  { variable:'Water per site', residential_price:'+0.20', co2_intensity:'+0.22', water_stress:'+0.55', job_share:'+0.07' }
];

if (typeof console !== 'undefined') {
  console.log('[deck tables debug]', {
    growthCountsRows: panelAttributeGrowthCounts?.length,
    growthEmpRows: panelAttributeGrowthEmployment?.length,
    electricityRows: panelAttributeElectricity?.length,
    carbonRows: panelAttributeCarbon?.length,
    waterRows: panelAttributeWater?.length,
    jobShareRows: jobShareLeaderRows?.length,
    priceRows: priceTableRows?.length,
    corrRows: methodCorrelationRows?.length
  });
}

const pcaDummyPoints = [
  { name:'Virginia hub', pc1:2.3, pc2:-1.1, cluster:'High-load' },
  { name:'Texas hub', pc1:1.8, pc2:-0.8, cluster:'High-load' },
  { name:'California green', pc1:2.0, pc2:1.6, cluster:'Green load' },
  { name:'Pacific NW hydro', pc1:0.9, pc2:2.2, cluster:'Green load' },
  { name:'Coal belt', pc1:-1.7, pc2:-2.1, cluster:'Fossil grid' },
  { name:'Lower-load mix', pc1:-0.6, pc2:0.4, cluster:'Mixed' }
];

const deck = {
  themeVars: {
    '--bg': '#0f1115','--ink': '#e6e9ef','--muted': '#9aa4b2',
    '--brand':'#7bdff2','--brand-2':'#f7b267','--accent':'#f79d65','--danger':'#ef5d60','--ok':'#19d97b',
    '--panel':'rgba(17,18,23,.6)',
    '--fs-title-xs':'clamp(1.8rem,3vw,3rem)',
    '--fs-title-sm':'clamp(2.2rem,3.8vw,3.6rem)',
    '--fs-title-md':'clamp(2.8rem,6vw,6rem)',
    '--fs-title-lg':'clamp(3.4rem,7vw,7rem)',
    '--fs-subtitle-xs':'clamp(0.9rem,1.3vw,1.1rem)',
    '--fs-subtitle-sm':'clamp(1.0rem,1.6vw,1.25rem)',
    '--fs-subtitle-md':'clamp(1.15rem,1.9vw,1.4rem)',
    '--fs-subtitle-lg':'clamp(1.3rem,2.2vw,1.6rem)',
    '--fs-body-xs':'clamp(0.95rem,1.2vw,1.05rem)',
    '--fs-body-sm':'clamp(1.0rem,1.4vw,1.15rem)',
    '--fs-body-md':'clamp(1.08rem,1.6vw,1.25rem)',
    '--fs-body-lg':'clamp(1.2rem,1.9vw,1.35rem)'
  },

  mediaGroups: [
    { id:'group-1', media:{ type:'video', src:'media/vid-overview c.mp4', muted:true, loop:true, autoplay:true, opacity:1 }, overlay:{ opacity:.50 } },
    { id:'group-2', media:{ type:'video', src:'media/vid-urban c.mp4',   muted:true, loop:true, autoplay:true, opacity:1 }, overlay:{ opacity:.50 } },
    { id:'group-3', media:{ type:'video', src:'media/vid-impacts c.mp4',  muted:true, loop:true, autoplay:true, opacity:1 }, overlay:{ opacity:.50 } },
    { id:'group-4', media:{ type:'video', src:'media/vid-future c.mp4',   muted:true, loop:true, autoplay:true, opacity:1 }, overlay:{ opacity:.50 } }
  ],

  slides: [
    // Introduction
    {
      id:'scene-cover', group:'group-1', nav:'Cover',
      figures:[{
        type:'text',
        figSel:'#cover-box',
        props:{
          kicker:'BSDS3001 · Group C',
          title:'US Data Center Boom<br/>and<br/>Its **Social Impact**',
          subtitle:'More than two new US sites a week—what that means for power, prices, water, and communities',
          align:'center', halign:'center',
          sizes:{ title:'lg', subtitle:'md', body:'sm' }
        }
      }]
    },
    {
      id:'scene-what-is-dc', group:'group-1', nav:'What is a DC?',
      figures:[{
        type:'text',
        figSel:'#what-is-dc',
        props:{
          kicker:'What is a data center?',
          title:'A warehouse that turns __electricity__ </br>into ==compute==',
          subtitle:'Hundreds of racks, nonstop power, heavy cooling (often water), and fiber routes—big campuses can drink as much water as a small city.',
          align:'center', halign:'center',
          sizes:{ title:'sm', subtitle:'sm', body:'sm' }
        }
      }]
    },
    // NEW: Background opening slide (pure text, start of background section)
    {
      id:'scene-background-intro', group:'group-1', nav:'Background',
      figures:[{
        type:'text',
        figSel:'#background-intro',
        props:{
          kicker:'Background to the boom',
          title:'From digital demand to physical footprints',
          subtitle:'Over the last decade, cloud, streaming, and AI have pushed compute demand sharply higher. Instead of spreading evenly, the physical response—data centers—clusters in a handful of US states with cheap land, strong grids, tax incentives, and good connectivity. This background section links that global capacity boom, the US siting pattern, and emerging pressure points in electricity systems and water-stressed regions, so later results sit in a clear system-wide context.',
          align:'center', halign:'center',
          sizes:{ title:'sm', subtitle:'sm', body:'sm' }
        }
      }]
    },
    {
      id:'scene-global-capacity', group:'group-1', nav:'Global capacity',
      label:'Global DC capacity (GW)',
      figures:[
        {
          type:'text',
          figSel:'#global-capacity-text',
          props:{
            kicker:'Global arc',
            title:'From 21 GW to __114 GW__',
            subtitle:'Capacity accelerates after 2018: 51.6 GW (2019) → 97.1 GW (2024) → 114.3 GW (2025e). Sets the backdrop for the US boom.',
            align:'center', halign:'center',
            sizes:{ title:'xs', subtitle:'xs', body:'xs' }
          }
        },
        {
          type:'line',
          figSel:'#global-capacity-line',
          props:{
            series:[{ id:'Installed capacity (GW)', data: capacitySeries, styles:{ stroke:'var(--accent)', strokeWidth:3 }, marker:{ show:true, r:4, fill:'var(--accent)' } }],
            axes:{ xTicks:8, yTicks:6, grid:true, xFormat:d3formatYear, yFormat:v=> v.toFixed(1), xLabel:'Year', yLabel:'Installed capacity (GW)' },
            curve:'MonotoneX',
            graphOpacity:1
          }
        }
      ],
      caption:'Source: Visual Capitalist (2024) “Charted: The Growth of Global Data Center Capacity, 2005–2025.”'
    },

    // Section 1: Overall growth
    {
      id:'scene-us-share-text', group:'group-1', nav:'US share text',
      caption:'Source: DataCenterMap.com (global and US counts).',
      figures:[{
        type:'text',
        figSel:'#us-share-text',
        props:{
          kicker:'Only the US has this footprint',
          title:'==37.8%== of all known sites sit in the US',
          subtitle:'No federal registry means estimates vary (Business Insider tallied 1,240 built/approved in 2024), but the dominant footprint is here—so the US story matters.',
          align:'center', halign:'center',
          sizes:{ title:'sm', subtitle:'sm', body:'sm' }
        }
      }]
    },
    {
      id:'scene-us-map', group:'group-1', nav:'US map',
      label:'US clusters',
      figures:[
        {
          type:'text',
          figSel:'#us-map-text',
          props:{
            kicker:'Where sites cluster',
            title:'Top 12 states hold **67%** of US sites',
            subtitle:'Northern Virginia alone is **15.8%** (BI also counted 329 built/approved there); Texas 9.8%; California 7.6%.',
            align:'center', halign:'center',
            sizes:{ title:'xs', subtitle:'xs', body:'xs' }
          }
        },
        {
          type:'geo',
          figSel:'#us-map-fig',
          props:{
            basemap:{ ...defaultBasemap },
            layers:{
              bubbles:{
                data: usTopSites,
                r:'sites',
                rRange:[8,60],
                legend:{ values:[100,300,600], title:'Sites' },
                style:{ fill:'rgba(123,223,242,.22)', stroke:'rgba(123,223,242,.95)', strokeWidth:1.6 },
                label:{ show:true, text:d=> `${d.name} · ${d.sites}`, fontSize:'var(--fs-geoLabel, 13px)' },
                tooltip:d=> `<strong>${d.name}</strong><br/>${d.sites.toLocaleString()} sites<br/>${d.share.toFixed(1)}% of US`,
                anim:{ growMs:1400 }
              }
            },
            graphOpacity:1
          }
        }
      ],
      caption:'Source: DataCenterMap.com (US state counts).'
    },
    {
      id:'scene-est-trend', group:'group-1', nav:'Growth trend',
      label:'US establishment trend',
      figures:[
        {
          type:'text',
          figSel:'#est-trend-text',
          props:{
            kicker:'Overall growth',
            title:'Establishments __tripled__ since 2015',
            subtitle:'17,799 → **55,259** (==+210%==); slope steepens after 2020 as AI/cloud accelerates builds.',
            align:'center', halign:'center',
            sizes:{ title:'xs', subtitle:'xs', body:'xs' }
          }
        },
        {
          type:'line',
          figSel:'#est-trend-line',
          props:{
            series:[{ id:'Establishments', data: estTrend, styles:{ stroke:'var(--brand)', strokeWidth:3 }, marker:{ show:true, r:5, fill:'var(--brand)' } }],
            axes:{ xTicks:6, yTicks:6, grid:true, xFormat:d3formatYear, yFormat:d3formatDefault, xLabel:'Year', yLabel:'Establishments' },
            curve:'MonotoneX',
            graphOpacity:1,
            legend:false
          }
        }
      ],
      caption:'Source: US Bureau of Labor Statistics (NAICS 518210 establishments, 2015–2024).'
    },
    {
      id:'scene-ashburn-video', group:'group-1', nav:'Ashburn video',
      label:'Ashburn, VA timelapse',
      figures:[
        {
          type:'text',
          figSel:'#ashburn-video-text',
          props:{
            kicker:'See the ground change',
            title:'Virginia’s build-out over 25 years',
            subtitle:'Satellite timelapse of Ashburn, VA (2000–2025),</br>the heart of a 15.8% share of all US data centers.',
            align:'center', halign:'center',
            sizes:{ title:'xs', subtitle:'xs', body:'xs' }
          }
        },
        {
          type:'video',
          figSel:'#ashburn-video-fig',
          props:{
            src:'media/Ashburn Virginia.mp4',
            muted:true,
            loop:true,
            autoplay:true,
            controls:false,
            style:{ objectFit:'contain' },
            graphOpacity:1
          }
        }
      ],
      caption:'Source: Satellite timelapse, Ashburn, Virginia, 2000–2025.'
    },
    {
      id:'scene-growth-question', group:'group-1', nav:'Why growing?',
      figures:[{
        type:'text',
        figSel:'#growth-question',
        props:{
          kicker:'Driver',
          title:'What is __driving__ this acceleration?',
          subtitle:'Hyperscale cloud, edge buildout, and a swing toward ==AI workloads== push more sites, faster; BI notes hyperscalers are nearly 4× more numerous than in 2010.',
          align:'center', halign:'center',
          sizes:{ title:'sm', subtitle:'sm', body:'sm' }
        }
      }]
    },
    {
      id:'scene-ai-shift', group:'group-1', nav:'AI rise',
      label:'AI workload rise',
      figures:[
        {
          type:'text',
          figSel:'#ai-shift-text',
          props:{
            kicker:'AI share',
            title:'AI overtakes other workloads',
            subtitle:'AI climbs from 54% (2025) to **71%** (2030); incremental AI adds 31 GW in 2030 alone.',
            align:'center', halign:'center',
            sizes:{ title:'xs', subtitle:'xs', body:'xs' }
          }
        },
        {
          type:'line',
          figSel:'#ai-shift-line',
          props:{
            series:[
              { id:'AI workload', data: aiSeries.ai, styles:{ stroke:'var(--accent)', strokeWidth:3 }, marker:{ show:true, r:5, fill:'var(--accent)' } },
              { id:'Non-AI workload', data: aiSeries.nonAi, styles:{ stroke:'var(--brand)', strokeWidth:3 }, marker:{ show:true, r:5, fill:'var(--brand)' } }
            ],
            axes:{ xTicks:6, yTicks:6, grid:true, xFormat:d3formatYear, yFormat:d=> d.toFixed(0), xLabel:'Year', yLabel:'Workload (GW)' },
            curve:'MonotoneX',
            graphOpacity:1,
            legend:true
          }
        }
      ],
      caption:'Source: McKinsey (2024) “The cost of compute: A $7 trillion race to scale data centers.”'
    },

    // Employment impacts
    {
      id:'scene-employment-intro', group:'group-1', nav:'Employment intro',
      figures:[{
        type:'text',
        figSel:'#employment-intro',
        props:{
          kicker:'Section · Jobs and equity',
          title:'Who actually gets the [rise]data center jobs[/rise]?',
          subtitle:'This section tracks where data-center jobs grow, which states benefit most, and how big they are in each labour market.',
          align:'center', halign:'center',
          sizes:{ title:'sm', subtitle:'sm', body:'sm' }
        }
      }]
    },
    {
      id:'scene-emp-trend', group:'group-1', nav:'Jobs trend',
      label:'US establishments and jobs',
      figures:[
        {
          type:'text',
          figSel:'#emp-trend-text',
          props:{
            kicker:'Jobs rise with sites',
            title:'Growth adds headcount alongside sites',
            subtitle:'Establishments 17,799 → 55,259; employment ~297k → ~484k. Headcount peaks in 2023, holding high through 2024.',
            align:'center', halign:'center',
            sizes:{ title:'xs', subtitle:'xs', body:'xs' }
          }
        },
        {
          type:'line',
          figSel:'#emp-trend-line',
          props:{
            series:[
              { id:'Establishments', data: estTrend, styles:{ stroke:'var(--brand)', strokeWidth:3 }, marker:{ show:false } },
              { id:'Employment', data: empTrend, styles:{ stroke:'var(--accent)', strokeWidth:3 }, marker:{ show:false } }
            ],
            axes:{ xTicks:6, yTicks:6, grid:true, xFormat:d3formatYear, yFormat:d3formatDefault, xLabel:'Year', yLabel:'Count (estabs/jobs)' },
            curve:'MonotoneX',
            legend:true,
            graphOpacity:1
          }
        }
      ],
      caption:'Source: US Bureau of Labor Statistics (NAICS 518210 establishments and average employment, 2015–2024).'
    },
    {
      id:'scene-employment-map', group:'group-1', nav:'Job share map',
      label:'Job share (2023)',
      figures:[
        {
          type:'text',
          figSel:'#employment-map-text',
          props:{
            kicker:'Where DC jobs land',
            title:'Highest job shares in hub states',
            subtitle:'WA (**0.81%**), CO (**0.65%**), GA/MO (~0.6%), VA (**0.55%**); most states sit under 0.3%.',
            align:'center', halign:'center',
            sizes:{ title:'xs', subtitle:'xs', body:'xs' }
          }
        },
        {
          type:'geo',
          figSel:'#employment-map-fig',
          props:{
            basemap:{
              ...defaultBasemap,
              choropleth:{
                valueByName: jobShareMap2023,
                color:{ range:['#0d1b2a','#1b4965','#7bdff2','#f79d65'], domain:[0,0.0025,0.005,0.0085] },
                legend:{ title:'Share of state employment', format:'percent' }
              }
            },
            graphOpacity:1
          }
        }
      ],
      caption:'Sources: BLS QCEW NAICS 518210 (modeled site counts/jobs per DC); BLS QCEW state employment (industry_code 10, state-wide).'
    },
    {
      id:'scene-employment-sdgs', group:'group-1', nav:'SDGs (jobs)',
      figures:[{
        type:'text',
        figSel:'#employment-sdgs',
        props:{
          kicker:'Linked SDGs',
          title:'Employment',
          subtitle:'Jobs matter for inclusive growth; ensure benefits reach more communities while managing grid and water impacts.',
          align:'center', halign:'center',
          sizes:{ title:'xs', subtitle:'xs', body:'xs' }
        }
      },
      {
        type:'logos',
        figSel:'#employment-sdgs-logos',
        props:{
          images:[
            { src:'media/sdg8.png', alt:'SDG 8' },
            { src:'media/sdg10.png', alt:'SDG 10' }
          ],
          height:500,
          gap:50,
          flexBasis:90,
          maxWidth:250
        }
      }]
    },
    // Section 2: Electricity use & prices
    {
      id:'scene-electricity-intro', group:'group-2', nav:'Power stress',
      figures:[{
        type:'text',
        figSel:'#electricity-intro',
          props:{
            kicker:'Section · Electricity and prices',
            title:'How much extra ==power== do data centers pull, and where?',
            subtitle:'This section shows how clustered data-center growth turns into local electricity demand and pressure on power bills.',
          align:'center', halign:'center',
          sizes:{ title:'sm', subtitle:'sm', body:'sm' }
        }
      }]
    },
    {
      id:'scene-electricity-map', group:'group-2', nav:'DC load map',
      label:'DC share of power',
      figures:[
        {
          type:'text',
          figSel:'#electricity-map-text',
          props:{
            kicker:'Electricity pull',
            title:'Some states already hit __double digits__',
            subtitle:'Virginia **25.6%**; Nebraska/Iowa/Oregon/Wyoming ~**11%**; Nevada 8.7%; Utah 7.7%; Arizona 7.4%—in a year when US electricity use already hit a record high.',
            align:'center', halign:'center',
            sizes:{ title:'xs', subtitle:'xs', body:'xs' }
          }
        },
        {
          type:'geo',
          figSel:'#electricity-map',
          props:{
            basemap:{
              ...defaultBasemap,
              choropleth:{
                valueByName: electricityShareMap,
                color:{ range:['#0c1c2f','#1d4f7a','#f7b267','#ef5d60'], domain:[0,0.02,0.08,0.26] },
                legend:{ title:'% of state electricity', format:'percent' }
              }
            },
            graphOpacity:1
          }
        }
      ],
      caption:'Source: Visual Capitalist, “Mapped: Data Center Electricity Consumption by State.”'
    },
    {
      id:'scene-electricity-corr', group:'group-2', nav:'Growth→Use',
      label:'Count vs power share',
      figures:[
        {
          type:'text',
          figSel:'#electricity-corr-text',
          props:{
            kicker:'Correlation',
            title:'More sites → higher electricity share (r ≈ **0.62**)',
            subtitle:'Virginia: 666 sites, 25.6% of state load; Oregon/Iowa/Wyoming/Nebraska: ~11% bands.',
            align:'center', halign:'center',
            sizes:{ title:'xs', subtitle:'xs', body:'xs' }
          }
        },
        {
          type:'scatter',
          figSel:'#electricity-corr-fig',
          props:{
            points: electricityCorrPoints.map(p=>({ dist:p.datacenters, cap:p.elec_pct*100, name:p.name })),
            xLabel:'Data center count', yLabel:'% of state electricity consumed',
            xDomain:[0,700], yDomain:[0,30],
            capFmt:v=> v.toFixed(1),
            tooltipFmt:d=> `<strong>${d.name}</strong><br/>${Math.round(d.dist)} sites · ${d.cap.toFixed(1)}% of state electricity`,
            graphOpacity:1
          }
        }
      ],
      caption:'Sources: DataCenterMap (state DC counts); Visual Capitalist (DC electricity share).'
    },
    {
      id:'scene-electricity-question', group:'group-2', nav:'Enough power?',
      figures:[{
        type:'text',
        figSel:'#electricity-question',
        props:{
          kicker:'Challenge',
          title:'Power-on date now depends on **grid queue + hookups**',
          subtitle:'Do we have enough electricity where we need it? Long interconnection queues and permits often set the energization date more than construction speed.',
          align:'center', halign:'center',
          sizes:{ title:'sm', subtitle:'sm', body:'sm' }
        }
      }]
    },
    {
      id:'scene-build-timeline', group:'group-2', nav:'Timelines',
      label:'Time to build vs energy',
      figures:[
        {
          type:'text',
          figSel:'#build-timeline-text',
          props:{
            kicker:'Schedule mismatch',
            title:'Data halls: 18–24 months; wires: ~10 years',
            subtitle:'Storage/solar are the only supply options on similar timelines.',
            align:'center', halign:'center',
            sizes:{ title:'xs', subtitle:'xs', body:'xs' }
          }
        },
        {
          type:'timeline',
          figSel:'#build-timeline-fig',
          props:{ items: buildTimelineItems, xMax:130, graphOpacity:1 }
        }
      ],
      caption:'Source: Deloitte (2023) “Few energy sources align with data center timelines.”'
    },
    {
      id:'scene-affected-question', group:'group-2', nav:'Who pays?',
      figures:[{
        type:'text',
        figSel:'#affected-question',
        props:{
          kicker:'Impact lens',
          title:'==Households== and small businesses feel rate __pressure__ first',
          subtitle:'Who bears the cost when grids stretch?',
          align:'center', halign:'center',
          sizes:{ title:'sm', subtitle:'sm', body:'sm' }
        }
      }]
    },
    {
      id:'scene-price-trend', group:'group-2', nav:'Price trend',
      label:'Residential prices',
      figures:[
        {
          type:'text',
          figSel:'#price-trend-text',
          props:{
            kicker:'Bills over time',
            title:'Hub-state prices rise faster than the US average',
            subtitle:'California **17¢ → 32¢**; Virginia and Texas trend up post-2021. Nationally prices move 13.2¢ → 17.1¢—a post-2020 rise that mirrors the establishment surge.',
            align:'center', halign:'center',
            sizes:{ title:'xs', subtitle:'xs', body:'xs' }
          }
        },
        {
          type:'line',
          figSel:'#price-trend-line',
          props:{
            series:[
              { id:'California', data: priceSeries.CA, styles:{ stroke:'var(--accent)', strokeWidth:3 }, marker:{ show:false } },
              { id:'Virginia', data: priceSeries.VA, styles:{ stroke:'var(--brand-2)', strokeWidth:3 }, marker:{ show:false } },
              { id:'Texas', data: priceSeries.TX, styles:{ stroke:'var(--brand)', strokeWidth:3 }, marker:{ show:false } }
            ],
            axes:{ xTicks:6, yTicks:6, grid:true, xFormat:d3formatYear, yFormat:v=> v.toFixed(1), xLabel:'Year', yLabel:'¢/kWh (residential)' },
            curve:'MonotoneX',
            legend:true,
            graphOpacity:1
          }
        }
      ],
      caption:'Source: US EIA Annual Electric Power Industry Report (residential price, 2015–2024).'
    },
    {
      id:'scene-electricity-sdgs', group:'group-2', nav:'SDGs (power)',
      figures:[{
        type:'text',
        figSel:'#electricity-sdgs',
        props:{
          kicker:'Linked SDGs',
          title:'Electricity',
          subtitle:'Affordable, reliable power (7), resilient infrastructure (9), fair impacts (10), and sustainable cities/communities (11).',
          align:'center', halign:'center',
          sizes:{ title:'sm', subtitle:'xs', body:'xs' }
        }
      },
      {
        type:'logos',
        figSel:'#electricity-sdgs-logos',
        props:{
          images:[
            { src:'media/sdg7.png', alt:'SDG 7' },
            { src:'media/sdg9.png', alt:'SDG 9' },
            { src:'media/sdg10.png', alt:'SDG 10' },
            { src:'media/sdg11.png', alt:'SDG 11' }
          ],
          height:500,
          gap:50,
          flexBasis:90,
          maxWidth:250
        }
      }]
    },

    // Section 2b: Carbon emissions
    {
      id:'scene-co2-text', group:'group-3', nav:'CO₂ context',
      figures:[{
        type:'text',
        figSel:'#co2-text',
        props:{
          kicker:'Section · Carbon impacts',
          title:'Same data center, very different __CO₂__ — it depends on the grid',
          subtitle:'This section shows how the same data-center load can produce very different CO₂ emissions depending on each state’s grid mix.',
          align:'center', halign:'center',
          sizes:{ title:'sm', subtitle:'sm', body:'sm' }
        }
      }]
    },
    {
      id:'scene-co2-trend', group:'group-3', nav:'CO₂ trend',
      label:'Modeled DC CO₂ (million tons)',
      figures:[
        {
          type:'text',
          figSel:'#co2-trend-text',
          props:{
            kicker:'Emissions trend',
            title:'CO₂ tied to DC load nearly **doubles** since 2015',
            subtitle:'30.9 → **63.0** million tons (2015–2024) as modeled DC electricity rides a fossil-heavy grid mix.',
            align:'center', halign:'center',
            sizes:{ title:'xs', subtitle:'xs', body:'xs' }
          }
        },
        {
          type:'line',
          figSel:'#co2-trend-line',
          props:{
            series:[{ id:'CO₂ (M tons)', data: co2TrendSeries, styles:{ stroke:'var(--accent)', strokeWidth:3 }, marker:{ show:true, r:4, fill:'var(--accent)' } }],
            axes:{ xTicks:6, yTicks:6, grid:true, xFormat:d3formatYear, yFormat:v=> v.toFixed(1), xLabel:'Year', yLabel:'Million tons CO₂ (modeled DC load)' },
            curve:'MonotoneX',
            legend:false,
            graphOpacity:1
          }
        }
      ],
      caption:'Sources: EIA emissions with project-modeled DC electricity multiplied by state CO₂ intensity.'
    },
    {
      id:'scene-co2-map', group:'group-3', nav:'CO₂ intensity map',
      label:'CO₂ intensity (2024)',
      figures:[
        {
          type:'text',
          figSel:'#co2-map-text',
          props:{
            kicker:'Where intensity bites',
            title:'CO₂ intensity spans **3–869 kg/MWh**',
            subtitle:'Lowest in VT/WA/OR (<200); highest in WV/WY/KY (>780). DC load in coal/gas states emits far more per MWh.',
            align:'center', halign:'center',
            sizes:{ title:'xs', subtitle:'xs', body:'xs' }
          }
        },
        {
          type:'geo',
          figSel:'#co2-map-fig',
          props:{
            basemap:{
              ...defaultBasemap,
              choropleth:{
                valueByName: co2IntensityMap,
                color:{ range:['#0d1b2a','#1b4965','#f7b267','#ef5d60'], domain:[0,200,500,900] },
                legend:{ title:'CO₂ kg per MWh' }
              }
            },
            graphOpacity:1
          }
        }
      ],
      caption:'Source: EIA emissions and generation-derived CO₂ intensity (2024).'
    },
    {
      id:'scene-co2-scatter', group:'group-3', nav:'CO₂ vs renewables',
      label:'Top DC states: renewables vs CO₂ intensity',
      figures:[
        {
          type:'text',
          figSel:'#co2-scatter-text',
          props:{
            kicker:'Fuel mix matters',
            title:'Higher renewables, lower CO₂ per MWh',
            subtitle:'CA (50% renewables) sits near 185 kg/MWh; fossil-heavy OH/MI hover >430 kg/MWh despite large DC footprints.',
            align:'center', halign:'center',
            sizes:{ title:'xs', subtitle:'xs', body:'xs' }
          }
        },
        {
          type:'scatter',
          figSel:'#co2-scatter-fig',
          props:{
            points: renewablesVsCo2Points.map(p=>({ dist:p.renewPct, cap:p.intensity, name:p.state, size:p.sites })),
            xLabel:'Renewables share of generation (%)', yLabel:'CO₂ intensity (kg/MWh)',
            xDomain:[0,70], yDomain:[0,900],
            distFmt:v=> v.toFixed(1),
            capFmt:v=> v.toFixed(0),
            tooltipFmt:d=> `<strong>${d.name}</strong><br/>Renewables: ${d.dist.toFixed(1)}%<br/>CO₂ intensity: ${d.cap.toFixed(0)} kg/MWh<br/>Modeled sites: ${Math.round(d.size).toLocaleString()}`,
            graphOpacity:1
          }
        }
      ],
      caption:'Sources: EIA generation mix (renewables share) and CO₂ intensity; project-modeled top DC states by site counts.'
    },
    {
      id:'scene-co2-sdgs', group:'group-3', nav:'SDGs (CO₂)',
      figures:[{
        type:'text',
        figSel:'#co2-sdgs',
        props:{
          kicker:'Linked SDGs',
          title:'Carbon Emissions',
          subtitle:'Clean energy (7), sustainable cities (11), and climate action (13) hinge on where DC load plugs in.',
          align:'center', halign:'center',
          sizes:{ title:'xs', subtitle:'xs', body:'xs' }
        }
      },
      {
        type:'logos',
        figSel:'#co2-sdgs-logos',
        props:{
          images:[
            { src:'media/sdg7.png', alt:'SDG 7' },
            { src:'media/sdg11.png', alt:'SDG 11' },
            { src:'media/sdg13.png', alt:'SDG 13' }
          ],
          height:500,
          gap:50,
          flexBasis:90,
          maxWidth:250
        }
      }]
    },
    // Section 3: Water use & impacts
    {
      id:'scene-power-to-water', group:'group-3', nav:'Power → Water',
      figures:[{
        type:'text',
        figSel:'#power-to-water-text',
        props:{
          kicker:'Section · Water and cooling',
          title:'From electricity demand to [glow]cooling water demand[/glow]',
          subtitle:'This section links data-center cooling water use to where it falls on already stressed or safer river basins.',
          align:'center', halign:'center',
          sizes:{ title:'sm', subtitle:'sm', body:'sm' }
        }
      }]
    },
    {
      id:'scene-water-trend', group:'group-3', nav:'Water trend',
      label:'Modeled DC water use (billion gallons)',
      figures:[
        {
          type:'text',
          figSel:'#water-trend-text',
          props:{
            kicker:'Water demand over time',
            title:'DC water draw rises **3×** since 2015',
            subtitle:'~94B gal → **284B gal** (2015–2024) following electricity growth and cooling needs.',
            align:'center', halign:'center',
            sizes:{ title:'xs', subtitle:'xs', body:'xs' }
          }
        },
        {
          type:'line',
          figSel:'#water-trend-line',
          props:{
            series:[{ id:'Water use (B gal)', data: waterTrendSeries, styles:{ stroke:'var(--brand)', strokeWidth:3 }, marker:{ show:true, r:4, fill:'var(--brand)' } }],
            axes:{ xTicks:6, yTicks:6, grid:true, xFormat:d3formatYear, yFormat:v=> v.toFixed(0), xLabel:'Year', yLabel:'Billion gallons (modeled DC cooling)' },
            curve:'MonotoneX',
            legend:false,
            graphOpacity:1
          }
        }
      ],
      caption:'Sources: Project-modeled DC electricity × water-intensity factors; BLS QCEW site activity as driver.'
    },
    {
      id:'scene-water-map', group:'group-3', nav:'Water map',
      label:'Modeled DC water use (2024, B gal)',
      figures:[
        {
          type:'text',
          figSel:'#water-map-text',
          props:{
            kicker:'Geography of water draw',
            title:'Water pull follows the biggest hubs',
            subtitle:'California (46.6B), Texas (28.0B), Florida/New York (~17B), Georgia/Washington (~14B), Virginia (11.4B).',
            align:'center', halign:'center',
            sizes:{ title:'xs', subtitle:'xs', body:'xs' }
          }
        },
        {
          type:'geo',
          figSel:'#water-map-fig',
          props:{
            basemap:{
              ...defaultBasemap,
              choropleth:{
                valueByName: waterUseMap2024,
                color:{ range:['#0d1b2a','#1b4965','#7bdff2','#f7b267','#ef5d60'], domain:[0,5,15,30,50] },
                legend:{ title:'Billion gallons (modeled DC water)' }
              }
            },
            graphOpacity:1
          }
        }
      ],
      caption:'Sources: Project-modeled DC electricity × water-intensity factors; BLS/EIA panel drivers.'
    },
    {
      id:'scene-water-scarcity', group:'group-3', nav:'Scarcity + footprint',
      label:'Scarcity + footprint overlay',
      figures:[
        {
          type:'text',
          figSel:'#water-scarcity-text',
          props:{
            kicker:'Stacked constraints',
            title:'High scarcity and high footprint overlap in the Southwest',
            subtitle:'Choropleth = scarcity index; bubbles = footprint (CA/AZ/NV/UT/Washington up to ~20 gal/unit). BI notes ~40% of US data centers already operate in high-stress basins.',
            align:'center', halign:'center',
            sizes:{ title:'xs', subtitle:'xs', body:'xs' }
          }
        },
        {
          type:'geo',
          figSel:'#water-scarcity-map',
          props:{
            basemap:{
              ...defaultBasemap,
              choropleth:{
                valueByName: waterScarcityByState,
                color:{ range:['#7ac7ff','#f7dda6','#ef946c','#b12a2f'], domain:[0,10,80,245] },
                legend:{ title:'Scarcity index' }
              }
            },
            layers:{
              bubbles:{
                data: waterBubbleSites,
                r:'footprint',
                rRange:[10,52],
                legend:{ values:[8,14,20], title:'Water footprint' },
                style:{ fill:'rgba(64,141,255,.22)', stroke:'rgba(64,141,255,.95)', strokeWidth:1.6 },
                label:{ show:true, text:d=> `${d.name} · ${d.footprint.toFixed(1)}` },
                tooltip:d=> `<strong>${d.name}</strong><br/>Footprint: ${d.footprint.toFixed(2)}<br/>Scarcity: ${d.scarcity.toFixed(1)}`,
                anim:{ growMs:1400 }
              }
            },
            graphOpacity:1
          }
        }
      ],
      caption:'Sources: Lu et al. (2025), Nature Sustainability (water scarcity/footprint); Business Insider (2025) water-stress mapping of US data centers.'
    },
    {
      id:'scene-water-sdgs', group:'group-3', nav:'SDGs (water)',
      figures:[{
        type:'text',
        figSel:'#water-sdgs',
        props:{
          kicker:'Linked SDGs',
          title:'Water Use & Stress',
          subtitle:'Clean water (6), energy demands (7), equitable impacts (10), and resilient communities (11) all intersect when DC cooling draws on scarce basins.',
          align:'center', halign:'center',
          sizes:{ title:'xs', subtitle:'xs', body:'xs' }
        }
      },
      {
        type:'logos',
        figSel:'#water-sdgs-logos',
        props:{
          images:[
            { src:'media/sdg6.png', alt:'SDG 6' },
            { src:'media/sdg7.png', alt:'SDG 7' },
            { src:'media/sdg10.png', alt:'SDG 10' },
            { src:'media/sdg11.png', alt:'SDG 11' }
          ],
          height:500,
          gap:50,
          flexBasis:90,
          maxWidth:250
        }
      }]
    },
    {
      id:'scene-problem', group:'group-4', nav:'Problem',
      figures:[{
        type:'text',
        figSel:'#problem-text',
        props:{
          kicker:'Problem statement',
          title:'Data center booms outpace infrastructure and safeguards',
          subtitle:'Rapid site growth tests grids, raises prices, strains water, and delivers modest local jobs—calling for evidence on where impacts land and how to manage them.',
          align:'center', halign:'center',
          sizes:{ title:'sm', subtitle:'sm', body:'sm' }
        }
      }]
    },
    {
      id:'scene-significance', group:'group-4', nav:'Significance',
      figures:[{
        type:'text',
        figSel:'#significance-text',
        props:{
          kicker:'Why it matters',
          title:'Communities, utilities, and regulators need clarity',
          subtitle:'Understanding growth → electricity/CO₂/water → prices/stress/jobs guides siting, rates, permitting, and mitigation so hubs can grow without eroding affordability or resilience.',
          align:'center', halign:'center',
          sizes:{ title:'sm', subtitle:'sm', body:'sm' }
        }
      }]
    },
    {
      id:'scene-dataset-intro', group:'group-4', nav:'Dataset',
      figures:[{
        type:'text',
        figSel:'#dataset-intro',
        props:{
          kicker:'Section · Constructed Dataset',
          title:'A temporal spatial panel linking</br>growth, electricity, CO₂, water, prices, and jobs',
          subtitle:[
            'Each row of our dataset is: one state × one year, from 2015 to 2024 (50 states × 10 years).',
            '',
            'For every state–year we attach three groups of variables:',
            '• **Data center growth** – establishments, modeled site counts, jobs per site;',
            '• **Energy & environment** – DC electricity use, prices, CO₂, renewables share, water use;',
            '• **Social outcomes** – job shares, water-stress indices, and related context variables.',
            '',
            'This structure lets us ask questions later, such as:',
            '“When DC load share rises in a state, what tends to happen to prices, CO₂, water stress,',
            'and job share in the following years?”'
          ].join('<br/>'),
          align:'center', halign:'center',
          sizes:{ title:'xs', subtitle:'sm', body:'sm' }
        }
      }]
    },
    {
      id:'scene-dataset-growth', group:'group-4', nav:'Growth data',
      label:'Data center counts & modeled sites',
      layout:{ textFrac:0.28, gapFrac:0.05 },
      figures:[
        {
          type:'text',
          figSel:'#dataset-growth-text',
          props:{
            kicker:'Data center baseline',
            title:'Counts, modeled sites, establishments',
            subtitle:'Establishment counts and modeled sites/jobs per site form the growth backbone.',
            align:'center', halign:'center',
            sizes:{ title:'xs', subtitle:'xs', body:'xs' }
          }
        },
        {
          type:'table',
          figSel:'#dataset-growth-table',
          props:{
            columns:[{key:'attribute',title:'Attribute'},{key:'meaning',title:'What it means'},{key:'source',title:'Source'}],
            rows: panelAttributeGrowthCounts,
            staggerMs: 120,
            graphOpacity:1,
            style:{ maxHeight:'45vh', overflowY:'auto', display:'block' },
            bodyStyle:{ maxHeight:'40vh', overflowY:'auto', display:'block' },
            tableStyle:{ display:'block', maxHeight:'40vh', overflowY:'auto' }
          }
        }
      ],
      caption:'Sources: BLS QCEW NAICS 518210 (establishments); project modeling of site counts and per-site staffing.'
    },
    {
      id:'scene-dataset-growth-emp', group:'group-4', nav:'Employment data',
      label:'Employment & wages baselines',
      layout:{ textFrac:0.28, gapFrac:0.05 },
      figures:[
        {
          type:'text',
          figSel:'#dataset-growth-emp-text',
          props:{
            kicker:'Employment baselines',
            title:'Employment and wage context',
            subtitle:'Employment and wage totals set the denominator for job-share impacts.',
            align:'center', halign:'center',
            sizes:{ title:'xs', subtitle:'xs', body:'xs' }
          }
        },
        {
          type:'table',
          figSel:'#dataset-growth-emp-table',
          props:{
            columns:[{key:'attribute',title:'Attribute'},{key:'meaning',title:'What it means'},{key:'source',title:'Source'}],
            rows: panelAttributeGrowthEmployment,
            staggerMs: 120,
            graphOpacity:1,
            style:{ maxHeight:'45vh', overflowY:'auto', display:'block' },
            bodyStyle:{ maxHeight:'40vh', overflowY:'auto', display:'block' },
            tableStyle:{ display:'block', maxHeight:'40vh', overflowY:'auto' }
          }
        }
      ],
      caption:'Sources: BLS QCEW NAICS 518210 employment; BLS QCEW state-wide industry baselines (employment, wages).'
    },
    {
      id:'scene-dataset-environment', group:'group-4', nav:'Electricity data',
      label:'Electricity attributes',
      layout:{ textFrac:0.28, gapFrac:0.05 },
      figures:[
        {
          type:'text',
          figSel:'#dataset-environment-text',
          props:{
            kicker:'Electricity group',
            title:'Prices and DC electricity use',
            subtitle:'Retail prices and modeled DC electricity consumption that connect growth to grid impacts.',
            align:'center', halign:'center',
            sizes:{ title:'xs', subtitle:'xs', body:'xs' }
          }
        },
        {
          type:'table',
          figSel:'#dataset-environment-table',
          props:{
            columns:[{key:'attribute',title:'Attribute'},{key:'meaning',title:'What it means'},{key:'source',title:'Source'}],
            rows: panelAttributeElectricity,
            staggerMs: 120,
            graphOpacity:1,
            style:{ maxHeight:'45vh', overflowY:'auto', display:'block' },
            bodyStyle:{ maxHeight:'40vh', overflowY:'auto', display:'block' },
            tableStyle:{ display:'block', maxHeight:'40vh', overflowY:'auto' }
          }
        }
      ],
      caption:'Sources: EIA-861 retail prices; project-modeled DC electricity use.'
    },
    {
      id:'scene-dataset-carbon', group:'group-4', nav:'Carbon data',
      label:'Carbon attributes',
      layout:{ textFrac:0.28, gapFrac:0.05 },
      figures:[
        {
          type:'text',
          figSel:'#dataset-carbon-text',
          props:{
            kicker:'Carbon group',
            title:'CO₂ emissions and intensity',
            subtitle:'Power-sector emissions and intensity measures plus renewables share to track carbon outcomes of DC load.',
            align:'center', halign:'center',
            sizes:{ title:'xs', subtitle:'xs', body:'xs' }
          }
        },
        {
          type:'table',
          figSel:'#dataset-carbon-table',
          props:{
            columns:[{key:'attribute',title:'Attribute'},{key:'meaning',title:'What it means'},{key:'source',title:'Source'}],
            rows: panelAttributeCarbon,
            staggerMs: 120,
            graphOpacity:1,
            style:{ maxHeight:'45vh', overflowY:'auto', display:'block' },
            bodyStyle:{ maxHeight:'40vh', overflowY:'auto', display:'block' },
            tableStyle:{ display:'block', maxHeight:'40vh', overflowY:'auto' }
          }
        }
      ],
      caption:'Sources: EIA emissions/generation; project-modeled DC CO₂ based on electricity and intensity.'
    },
    {
      id:'scene-dataset-social', group:'group-4', nav:'Water + stress data',
      label:'Water usage + stress attributes',
      layout:{ textFrac:0.28, gapFrac:0.05 },
      figures:[
        {
          type:'text',
          figSel:'#dataset-social-text',
          props:{
            kicker:'Water usage + stress group',
            title:'Cooling draw and scarcity context',
            subtitle:'Water volumes and scarcity-adjusted metrics to show where cooling demand intersects stressed basins.',
            align:'center', halign:'center',
            sizes:{ title:'xs', subtitle:'xs', body:'xs' }
          }
        },
        {
          type:'table',
          figSel:'#dataset-social-table',
          props:{
            columns:[{key:'attribute',title:'Attribute'},{key:'meaning',title:'What it means'},{key:'source',title:'Source'}],
            rows: panelAttributeWater,
            staggerMs: 120,
            graphOpacity:1,
            style:{ maxHeight:'45vh', overflowY:'auto', display:'block' },
            bodyStyle:{ maxHeight:'40vh', overflowY:'auto', display:'block' },
            tableStyle:{ display:'block', maxHeight:'40vh', overflowY:'auto' }
          }
        }
      ],
      caption:'Sources: Project-modeled DC electricity × water-intensity factors; WRI Aqueduct-based water-stress factors.'
    },
        // Section 3b: Methodology (panel-based)
    {
      id:'scene-method-intro', group:'group-4', nav:'Methods overview',
      figures:[{
        type:'text',
        figSel:'#method-intro',
        props:{
          kicker:'Methods roadmap',
          title:'How we link DC growth → energy → prices & jobs',
          subtitle:'We build a state×year panel (50 states, 2015–2024) and apply five layers of analysis: (1) descriptive maps & clusters, (2) correlations & PCA, (3) fixed-effects panel models & SEM, (4) spatial spillovers, and (5) 2030 scenarios.',
          align:'center', halign:'center',
          sizes:{ title:'sm', subtitle:'sm', body:'sm' }
        }
      }],
    },
    {
      id:'scene-method-overview', group:'group-4', nav:'Step 1 · Descriptive',
      figures:[{
        type:'text',
        figSel:'#method-overview',
        props:{
          kicker:'Step 1 – Descriptive maps & clusters',
          title:'See where growth and impacts concentrate',
          subtitle:'What: map DC growth, DC electricity share, prices, CO₂, water use, and job share by state over time. Group states into a few cluster types (e.g. “green high-load”, “fossil high-load”, “lower-load”).</br></br>Why: give an intuitive picture of hubs vs non-hubs before formal modelling and define comparison groups for regressions and scenarios.</br></br>Outputs: maps, time-series plots, and simple clusters that frame the rest of the analysis.',
          align:'left', halign:'center',
          sizes:{ kicker:"lg", title:'xs', subtitle:'md', body:'sm' }
        }
      }],
    },
    {
      id:'scene-method-pca-method', group:'group-4', nav:'Step 2 · Corr + PCA',
      figures:[{
        type:'text',
        figSel:'#method-pca-method',
        props:{
          kicker:'Step 2 – Correlations & PCA',
          title:'Diagnose co-movement and reduce dimensions',
          subtitle:'We compute pairwise correlations and simple diagnostics (e.g. VIFs) among DC load share, prices, CO₂ intensity, renewables share, water use per site, and job share.</br></br>Then we run PCA to build a small set of orthogonal components (e.g. “fossil-heavy grid”, “renewables + water-efficient”) that summarise the system and avoid multicollinearity in later models.',
          align:'left', halign:'center',
          sizes:{ kicker:"lg", title:'xs', subtitle:'md', body:'sm' }
        }
      }],
    },
    {
      id:'scene-method-panel', group:'group-4', nav:'Step 3 · Panel / SEM',
      figures:[{
        type:'text',
        figSel:'#method-panel-text',
        props:{
          kicker:'Step 3 – Fixed-effects panel + SEM',
          title:'Estimate how DC load affects prices, CO₂, water, and jobs',
          subtitle:'Panel FE: regress (a) residential and all-sector electricity prices, (b) CO₂ intensity/levels, (c) water-stress indicators, and (d) DC job share on DC load share, fuel mix/renewables share or PCA components, plus state and year fixed effects and lags.</br></br>SEM: model mediated paths such as DC growth → DC load share → residential price → jobs to see where impacts enter first.</br></br>Key outputs: elasticities of prices, CO₂, water stress, and jobs with respect to DC load, and how much of the effect is mediated through prices or fuel mix.',
          align:'left', halign:'center',
          sizes:{ kicker:"lg", title:'xs', subtitle:'md', body:'sm' }
        }
      }],
    },
    {
      id:'scene-method-spatial', group:'group-4', nav:'Step 4 · Spatial',
      figures:[{
        type:'text',
        figSel:'#method-spatial-text',
        props:{
          kicker:'Step 4 – Spatial spillover models',
          title:'Capture cross-border impacts along corridors',
          subtitle:'We estimate spatial lag/error models for prices and water-stress outcomes using contiguity and distance-based weight matrices.</br></br>This tests whether large DC hubs raise prices or water stress in neighbouring states, not just within their own borders—critical for regional planning and interconnection policy.</br></br>Significant spatial terms would imply that DC siting decisions and safeguards need regional coordination, not only state-by-state rules.',
          align:'left', halign:'center',
          sizes:{ kicker:"lg", title:'xs', subtitle:'md', body:'sm' }
        }
      }],
    },
    {
      id:'scene-method-forecast-method', group:'group-4', nav:'Step 5 · Scenarios',
      figures:[{
        type:'text',
        figSel:'#method-forecast-method',
        props:{
          kicker:'Step 5 – 2030 scenarios & forecasting',
          title:'Stress-test different build and mitigation paths',
          subtitle:'Using the historical panel plus external outlooks (IEA, McKinsey, etc.), we build simple time-series / ARIMAX-style projections for DC electricity, CO₂, and water under four scenarios:</br></br>(1) baseline (current trends),</br></br>(2) efficiency (lower kWh per compute),</br></br>(3) renewables (higher clean share),</br></br>(4) water-saving cooling. We compare 2030 levels and incremental growth, not precise point forecasts.</br></br>Scenarios turn statistical relationships into concrete “what if” pathways for planners and regulators.',
          align:'left', halign:'center',
          sizes:{ kicker:"lg", title:'xs', subtitle:'md', body:'sm' }
        }
      }],
    },
    {
      id:'scene-method-sdgs', group:'group-4', nav:'SDGs (methods)',
      figures:[{
        type:'text',
        figSel:'#method-sdgs',
        props:{
          kicker:'Linked SDGs',
          title:'How the methods support the goals',
          subtitle:'Innovation and infrastructure (9) to deliver cleaner energy (7), resilient cities and communities (11), climate action (13), water stewardship (6), and decent work with fair distribution of benefits (8,10).',
          align:'center', halign:'center',
          sizes:{ title:'xs', subtitle:'xs', body:'xs' }
        }
      },
      {
        type:'logos',
        figSel:'#method-sdgs-logos',
        props:{
          images:[
            { src:'media/sdg9.png', alt:'SDG 9' },
            { src:'media/sdg7.png', alt:'SDG 7' },
            { src:'media/sdg11.png', alt:'SDG 11' },
            { src:'media/sdg13.png', alt:'SDG 13' },
            { src:'media/sdg6.png', alt:'SDG 6' },
            { src:'media/sdg8.png', alt:'SDG 8' },
            { src:'media/sdg10.png', alt:'SDG 10' }
          ],
          height:500,
          gap:10,
          flexBasis:90,
          maxWidth:160
        }
      }],
      caption:'A transparent, step-by-step methodology makes it easier to argue how DC growth can align with these SDGs instead of working against them.'
    },
    // Section 4: Summary
    {
  id:'scene-summary', group:'group-4', nav:'Summary',
  figures:[
    {
      type:'text',
      figSel:'#summary-text',
      props:{
        kicker:'Summary & reflection',
        title:'Bringing the pieces together',
        subtitle:'From DC growth to power, carbon, water, and jobs — and what that means for people and the SDGs.',
        align:'center', halign:'center',
        sizes:{ title:'sm', subtitle:'xs', body:'xs' }
      }
    },
    {
      type:'cards',
      figSel:'#summary-cards',
      props:{
        items:[
          {
            title:'1 · Background, problem & SDGs',
            icon:'fa-globe',
            bullets:[
              'DCs grow fast and cluster in a few US hubs.',
              'This strains grids, raises bills, and adds water stress.',
              'Links directly to SDG 6, 7, 8, 9, 10, 11, and 13.'
            ]
          },
          {
            title:'2 · Literature, data & methods',
            icon:'fa-book',
            bullets:[
              'Builds on work on DC energy use, AI demand, and water-intensive cooling.',
              'Uses a 50-state panel (2015–2024) from BLS, EIA, and modeled DC load/CO₂/water.',
              'Methods: maps + clusters → corr/PCA → panel FE + SEM → spatial models → 2030 scenarios.'
            ]
          },
          {
            title:'3 · Expected results & reflection',
            icon:'fa-lightbulb',
            bullets:[
              'Expect higher DC load in hubs to correlate with higher prices, CO₂, and water stress,',
              'while boosting state job share only modestly.',
              'Goal: give evidence so DC growth supports SDGs instead of undermining affordability and resilience.'
            ]
          }
        ]
      }
    }
  ]
},

    {
      id:'scene-credits', group:'group-4', nav:'Credits',
      label:'',
      figures:[{
        type:'credits',
        figSel:'#credits-fig',
        props:{ items:[
          'DataCenterMap.com (global and US data center counts by country/state)',
          'Bureau of Labor Statistics (NAICS 518210 establishments, 2015–2024)',
          'BLS QCEW (NAICS 518210 establishments/employment; industry totals for state baselines)',
          'EIA-861 Annual Electric Power Industry Report (prices, customers, sales, revenues)',
          'EIA generation and emissions (fuel mix, CO₂ intensity)',
          'Project-modeled DC electricity, CO₂, and water intensity (based on QCEW and EIA inputs)',
          'McKinsey (2024) “The cost of compute: A $7 trillion race to scale data centers” (AI vs non-AI workload)',
          'Deloitte (2023) “Few energy sources align with data center timelines” (build timelines)',
          'Visual Capitalist (2024) “Mapped: Data Center Electricity Consumption by State”',
          'EIA Annual Electric Power Industry Report (Total Electric Industry, residential price)',
          'EESI (2023) “Data Centers and Water Consumption”',
          'Lu et al. (2025), Nature Sustainability, Figure 3h (water scarcity and footprint)',
          'International Energy Agency (2024) estimates of US DC electricity (183 TWh; 45% of global DC use)',
          'Pew Research Center (2025) “What we know about energy use at US data centers amid the AI boom”',
          'Electric Power Research Institute Report 3002028905 (DC grid impacts by state)',
          'Business Insider (Aug 5, 2025) “Where Data Center Construction Is Concentrated: Map”',
          'Business Insider (Jun 25, 2025) “How Data Centers Are Deepening the Water Crisis”',
          'Business Insider (2024) “How BI investigated the true cost of data centers”',
          'Southwest Energy Efficiency Project (2025) data center electricity demand outlook',
          'Stanford “And the West” (2025) “Thirsty for power and water: AI-crunching data centers”',
          'World Resources Institute (2024) “Managing electricity demand growth in the US”',
          'World Resources Institute Aqueduct Water Risk Atlas (water-stress classification)',
          'AWS Sustainability (2024) “Water stewardship and water-positive by 2030”',
          'NPR (Oct 14, 2025) coverage of Google AI data centers and grid strain',
          'Politico (Jul 17, 2023) “NYC grid shortfall as fossil fuel peakers plan to retire”',
          'CalMatters (Feb 2025) “Data center crackdown to protect California electricity rates”',
          'NBC News (2025) on data centers, utility costs, and elections (VA/NJ debates)',
          'Cardinal News (Aug 22, 2025) on Virginia utility disconnections and DC boom',
          'WRI/Aqueduct + EPRI insights on grid and water risk (supporting maps)',
          '“Balancing the trade-off between data center development and its environmental impacts: A comparative analysis of data center policymaking in Singapore, Netherlands, Ireland, Germany, USA, and the UK” (research paper used in this project)',
          '“A critical analysis of global warming potential of data centers in the digital era” (research paper used in this project)'
        ], graphOpacity:1 }
      }]
    }
  ]
};

export default deck;
