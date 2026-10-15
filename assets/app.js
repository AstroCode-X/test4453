(() => {
  'use strict';
  const A = window.LunarAstro;
  const $ = id => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  const HOUR = A.HOUR;
  const FALLBACK_SITES = [
    {id:'shackleton', name:'Shackleton Crater Rim', lat:-89.9, lon:0, subtitle:'Kraterrand · Südpol', tag:'Polar', note:'Demonstrationskoordinate, nicht verifiziert.'},
    {id:'cabeus', name:'Cabeus Crater Floor', lat:-84.9, lon:-35.5, subtitle:'Kältefalle · Südpol', tag:'PSR', note:'Demonstrationskoordinate, nicht verifiziert.'},
    {id:'madrigal', name:'Madrigal Ridge (Demo)', lat:-88.7, lon:-15.2, subtitle:'Beispielkamm · Südpol', tag:'Demo', note:'Demonstrationskoordinate, nicht verifiziert.'}
  ];
  const COLORS = ['#58e1e0','#74a1ff','#ffbf74'];
  const state = { sites: FALLBACK_SITES, selected: new Set(['shackleton','cabeus','madrigal']), active: 'shackleton', hours: 168, slider: 0, horizons: null, source:'demo', results: [] };
  const escapeHtml = s => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const niceNumber = n => Number.isFinite(n) ? `${n >= 0 ? '+' : ''}${n.toFixed(1)}°` : '—';
  const fmt = d => new Date(d).toLocaleString('de-DE', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'UTC',hour12:false});
  const dayFmt = d => new Date(d).toLocaleString('de-DE', {day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'});
  const percent = (part, total) => part === null || !total ? 'N/A' : `${Math.round(part / total * 100)}%`;
  const isLoaded = () => state.source === 'horizons' && !!state.horizons;
  const activeSite = () => state.sites.find(s => s.id === state.active) || state.sites[0];
  const currentResult = () => state.results.find(x => x.site.id === state.active) || state.results[0];
  const chosen = () => state.sites.filter(s => state.selected.has(s.id));
  const rangeStart = () => {
    const d = new Date(`${$('start-time').value}:00Z`);
    return Number.isFinite(d.getTime()) ? d : new Date('2026-11-14T00:00:00Z');
  };

  function renderChoices() {
    $('site-choices').innerHTML = state.sites.map((site,i) => `<label class="site-choice ${state.selected.has(site.id)?'selected':''}">
      <input type="checkbox" data-site="${escapeHtml(site.id)}" ${state.selected.has(site.id)?'checked':''}>
      <span><strong>${escapeHtml(site.name)}</strong><small>${site.lat.toFixed(1)}° LAT / ${site.lon.toFixed(1)}° LON</small></span>
      <span class="site-color" aria-hidden="true" style="color:${COLORS[i % COLORS.length]}"></span>
    </label>`).join('');
    $('site-choices').querySelectorAll('input[type=checkbox]').forEach(input => input.addEventListener('change', () => {
      const id = input.dataset.site;
      if (input.checked && state.selected.size >= 3) { input.checked = false; announce('Maximal drei Plätze gleichzeitig.'); return; }
      if (!input.checked && state.selected.size <= 1) { input.checked = true; announce('Mindestens ein Platz muss ausgewählt sein.'); return; }
      if (input.checked) state.selected.add(id); else state.selected.delete(id);
      if (!state.selected.has(state.active)) state.active = chosen()[0].id;
      renderChoices(); update();
    }));
  }

  function announce(message) {
    $('data-message').textContent = message;
  }

  function getTimes() { return A.hourlyTimes(rangeStart().toISOString(), state.hours); }
  function update() {
    const times = getTimes();
    const eph = isLoaded() ? state.horizons : null;
    state.results = chosen().map(site => A.analyze(site, times, eph));
    if (!chosen().some(site => site.id === state.active)) state.active = chosen()[0].id;
    state.slider = Math.min(state.slider, state.hours);
    $('time-scrubber').max = String(state.hours);
    $('time-scrubber').value = String(state.slider);
    $('epoch-display').textContent = `${dayFmt(times[0]).toUpperCase()} · ${fmt(times[0]).split(' ').slice(-1)[0]} UTC`;
    $('comparison-range').textContent = `${state.hours} HOUR WINDOW · UTC`;
    $('scrubber-start').textContent = fmt(times[0]);
    $('scrubber-end').textContent = fmt(times[times.length - 1]);
    updateSourceLabel();
    renderCards();
    renderPolarMap();
    renderChart();
    renderInstant();
    renderWindows();
  }

  function updateSourceLabel() {
    const live = isLoaded();
    const pill = $('mode-pill');
    pill.classList.toggle('live', live);
    pill.classList.toggle('demo', !live);
    pill.innerHTML = `<span class="status-ping"></span>${live ? 'JPL HORIZONS' : 'MODELL / DEMO'}`;
    const notice = $('source-notice');
    notice.classList.toggle('live', live);
    notice.querySelector('strong').textContent = live ? 'JPL HORIZONS · ECHTE EPHEMERIDEN' : 'SCHEMATISCHES MODELL';
    notice.querySelector(':scope > div > span').textContent = live
      ? 'Azimut und Elevation aus importierten JPL-Ephemeriden. Geometrischer Horizont (0°), KEINE Geländeabschattung oder reale Energiebilanz. Fehlende Zeitwerte werden nicht ersetzt.'
      : 'Keine echten NASA-Werte. Zur wissenschaftlichen Analyse JPL-Horizons-Daten importieren. Der lokale Horizont ist idealisiert (0°); Geländeabschattung wird nicht berücksichtigt.';
  }

  function renderCards() {
    let markup = state.results.map((r,i) => {
      const color = COLORS[state.sites.findIndex(s => s.id === r.site.id) % COLORS.length];
      const selected = r.site.id === state.active;
      const metrics = [['SUN ↑',r.sunny,'#f8bf73'],['EARTH ↑',r.contact,'#749fff'],['BOTH ↑',r.both,'#58e1e0']];
      return `<button type="button" class="site-card ${selected?'active':''}" data-active="${escapeHtml(r.site.id)}" aria-pressed="${selected}">
        <div class="site-card-top"><div><strong>${escapeHtml(r.site.name)}</strong><small>${escapeHtml(r.site.subtitle)}</small></div><span>${escapeHtml(r.site.tag)}</span></div>
        <div class="site-stats">${metrics.map(([label,num,c])=>`<div><span>${label}</span><b>${percent(num,r.total)}</b><div class="bar"><i style="width:${num===null?0:num/r.total*100}%;background:${c}"></i></div></div>`).join('')}</div>
      </button>`;
    }).join('');
    for (let i = state.results.length; i < 3; i++) markup += `<div class="empty-card">+ Weiteren Standort auswählen</div>`;
    $('comparison-cards').innerHTML = markup;
    $('comparison-cards').querySelectorAll('[data-active]').forEach(btn => btn.addEventListener('click', () => {
      state.active = btn.dataset.active;
      update();
    }));
  }

  function makeSvg(width,height,content, label) {
    return `<svg xmlns="${NS}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(label)}">${content}</svg>`;
  }

  function renderPolarMap() {
    const cx=171,cy=157,r=126;
    let svg=`<defs><radialGradient id="polarBg"><stop stop-color="#203950" stop-opacity=".25"/><stop offset="1" stop-color="#08121f"/></radialGradient></defs>`;
    svg+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#polarBg)" stroke="#2b5670" stroke-width="1.5"/>`;
    for (const lat of [-88,-86,-84,-82,-80]) {
      const rr=(90+lat)/10*r;
      svg+=`<circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="#2c4b63" stroke-dasharray="3 5"/>`;
      svg+=`<text x="${cx+rr+3}" y="${cy-5}" fill="#6e8499" font-size="9">${Math.abs(lat)}°S</text>`;
    }
    for (let lon=0;lon<360;lon+=30) {
      const angle=lon*Math.PI/180;
      const x=cx+Math.sin(angle)*r,y=cy-Math.cos(angle)*r;
      svg+=`<line x1="${cx}" y1="${cy}" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}" stroke="#234357" stroke-width=".8"/>`;
    }
    svg+=`<text x="${cx}" y="${cy-r-12}" text-anchor="middle" font-size="10" fill="#7194af">0°</text><text x="${cx+r+13}" y="${cy+3}" text-anchor="middle" font-size="10" fill="#7194af">90°</text><text x="${cx}" y="${cy+r+15}" text-anchor="middle" font-size="10" fill="#7194af">180°</text><text x="${cx-r-17}" y="${cy+3}" text-anchor="middle" font-size="10" fill="#7194af">270°</text>`;
    svg+=`<text x="305" y="76" fill="#718ea6" font-size="10">SITES</text>`;
    state.sites.forEach((site,i)=>{
      const rr=Math.min(r,Math.max(0,90+site.lat)/10*r),a=site.lon*Math.PI/180;
      const xx=cx+Math.sin(a)*rr,yy=cy-Math.cos(a)*rr;
      const on=state.selected.has(site.id),active=site.id===state.active;
      const col=COLORS[i%COLORS.length];
      svg+=`<g class="map-target" data-map-site="${escapeHtml(site.id)}" tabindex="0" role="button" aria-label="${escapeHtml(site.name)} auswählen" opacity="${on?1:.45}">
        ${active?`<circle cx="${xx}" cy="${yy}" r="13" fill="none" stroke="${col}" stroke-opacity=".5" stroke-width="1.4"/>`:''}
        <circle cx="${xx}" cy="${yy}" r="6" fill="${col}" stroke="#dff7fb" stroke-width="1.2"/>
        <circle cx="307" cy="${97+i*39}" r="5" fill="${col}"/>
        <text x="320" y="${101+i*39}" fill="${on?'#d6ebfc':'#7c91a7'}" font-size="10">${escapeHtml(site.name.replace(' Crater ',' ').replace(' (Demo)',''))}</text>
        <text x="320" y="${114+i*39}" fill="#7794a8" font-size="9">${site.lat.toFixed(1)}° / ${site.lon.toFixed(1)}°</text>
      </g>`;
    });
    svg+=`<circle cx="${cx}" cy="${cy}" r="2" fill="#ffffff"/><text x="${cx+10}" y="${cy+20}" fill="#839fb8" font-size="9">S. POLE</text>`;
    $('polar-map').innerHTML=makeSvg(470,327,svg,'Schematische polare Landestellenkarte');
    $('polar-map').querySelectorAll('[data-map-site]').forEach(node=>{
      const activate=()=>{
        if(!state.selected.has(node.dataset.mapSite)){
          if(state.selected.size>=3)state.selected.delete(chosen().slice(-1)[0].id);
          state.selected.add(node.dataset.mapSite);renderChoices();
        }
        state.active=node.dataset.mapSite;update();
      };
      node.addEventListener('click',activate);
      node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}});
    });
  }

  function renderChart() {
    const result = currentResult();
    if (!result) return;
    $('chart-site-name').textContent = result.site.name;
    const w=780,h=240,L=48,R=13,T=16,B=32,plotW=w-L-R,plotH=h-T-B;
    const values=result.series.flatMap(s => s.data?[s.data.sun.el,s.data.earth.el]:[]);
    const amp = Math.min(90, Math.max(12, Math.ceil((Math.max(0,...values.map(Math.abs))+2)/5)*5));
    const ymin=-amp,ymax=amp;
    const x=i=>L+i/state.hours*plotW;
    const y=e=>T+(ymax-e)/(ymax-ymin)*plotH;
    const horizon=y(0);
    let svg=`<rect x="${L}" y="${T}" width="${plotW}" height="${horizon-T}" fill="#233728" opacity=".20"/><rect x="${L}" y="${horizon}" width="${plotW}" height="${T+plotH-horizon}" fill="#291e32" opacity=".17"/>`;
    for(let j=0;j<=4;j++) {
      const degree=ymax-(ymax-ymin)*j/4,yy=y(degree);
      svg += `<line x1="${L}" y1="${yy}" x2="${w-R}" y2="${yy}" stroke="${Math.abs(degree)<.001?'#6b9a9a':'#294054'}" stroke-dasharray="${Math.abs(degree)<.001?'':'4 6'}"/><text x="${L-10}" y="${yy+3}" font-size="10" text-anchor="end" fill="#7893a8">${degree.toFixed(0)}°</text>`;
    }
    for(let i=0;i<=4;i++){
      const xx=x(i*state.hours/4);
      svg += `<line x1="${xx}" y1="${T}" x2="${xx}" y2="${T+plotH}" stroke="#22384a"/><text x="${xx}" y="${h-9}" font-size="10" text-anchor="middle" fill="#7796a9">+${Math.round(i*state.hours/4)}h</text>`;
    }
    for(const [kind,col] of [['sun','#f8bf73'],['earth','#749fff']]) {
      let path='',wasValid=false;
      result.series.forEach((p,i)=>{
        if(!p.data){wasValid=false;return;}
        path += `${wasValid?'L':'M'}${x(i).toFixed(2)},${y(p.data[kind].el).toFixed(2)} `;
        wasValid=true;
      });
      svg += `<path d="${path}" fill="none" stroke="${col}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    const cursor = result.series[state.slider];
    svg+=`<line x1="${x(state.slider)}" y1="${T}" x2="${x(state.slider)}" y2="${T+plotH}" stroke="#d8fafa" stroke-width="1" stroke-dasharray="3 3" opacity=".8"/>`;
    if(cursor&&cursor.data){for(const [body,col] of [['sun','#f8bf73'],['earth','#749fff']])svg+=`<circle cx="${x(state.slider)}" cy="${y(cursor.data[body].el)}" r="4.2" fill="${col}" stroke="#0a1320" stroke-width="1.5"/>`;}
    svg+=`<text x="${L+8}" y="${horizon-6}" font-size="9" fill="#a0bfbf">0° HORIZON</text>`;
    if(!result.complete)svg+=`<text x="${w/2}" y="${h/2}" fill="#ed8a9b" text-anchor="middle" font-size="12">ZEITBEREICH NICHT VOLLSTÄNDIG IN NASA-DATEN</text>`;
    $('chart-host').innerHTML = makeSvg(w,h,svg,'Sonnen- und Erdhöhe über die Zeit (Grad)');
  }

  function renderInstant() {
    const res=currentResult();if(!res)return;
    const p=res.series[state.slider];
    $('sun-readout').textContent=p&&p.data?niceNumber(p.data.sun.el):'N/A';
    $('earth-readout').textContent=p&&p.data?niceNumber(p.data.earth.el):'N/A';
    $('instant-time').textContent=`${fmt(p.time)} UTC`;
    $('sun-readout').classList.toggle('missing',!p.data);
    $('earth-readout').classList.toggle('missing',!p.data);
    $('horizon-site-name').textContent=res.site.name+' · '+fmt(p.time)+' UTC';
    renderSky(p.data);
  }

  function renderSky(value) {
    const w=650,h=183,L=34,R=18,T=9,B=26,x=az=>L+az/360*(w-L-R),y=el=>T+(20-Math.max(-20,Math.min(20,el)))/40*(h-T-B);
    const y0=y(0),bottom=h-B;
    let svg=`<rect x="${L}" y="${T}" width="${w-L-R}" height="${bottom-T}" rx="3" fill="#102338"/><rect x="${L}" y="${y0}" width="${w-L-R}" height="${bottom-y0}" fill="#132535"/>`;
    for(const el of [-20,-10,0,10,20])svg+=`<line x1="${L}" y1="${y(el)}" x2="${w-R}" y2="${y(el)}" stroke="${el===0?'#5a9b9d':'#2f475d'}" stroke-dasharray="${el===0?'':'3 5'}"/><text x="${L-5}" y="${y(el)+3}" fill="#7a99ad" text-anchor="end" font-size="10">${el}°</text>`;
    for(let az=0;az<=360;az+=45)svg+=`<line x1="${x(az)}" y1="${T}" x2="${x(az)}" y2="${bottom}" stroke="#243c52"/><text x="${x(az)}" y="${h-6}" fill="#7f9bb0" text-anchor="middle" font-size="10">${az}°</text>`;
    if(value){
      for(const [body,col,label] of [['sun','#f8bf73','SUN'],['earth','#749fff','EARTH']]){
        const p=value[body], xx=x(p.az), yy=y(p.el);
        svg+=`<circle cx="${xx}" cy="${yy}" r="7" fill="${col}" fill-opacity=".2" stroke="${col}" stroke-opacity=".4" stroke-width="5"/><circle cx="${xx}" cy="${yy}" r="5" fill="${col}"/><text x="${Math.max(48,Math.min(612,xx+12))}" y="${Math.max(17,yy-12)}" fill="${col}" font-size="11">${label} ${niceNumber(p.el)}</text>`;
      }
    }else svg+=`<text x="${w/2}" y="${y0-15}" text-anchor="middle" fill="#e78a94" font-size="13">Keine Werte für diesen Zeitpunkt</text>`;
    $('sky-host').innerHTML=makeSvg(w,h,svg,'Himmelsrichtungen und Höhenwinkel von Sonne und Erde');
  }

  function renderWindows() {
    const res=currentResult();if(!res)return;
    if(!res.complete){$('windows-host').innerHTML='<div class="no-windows">Keine vollständigen JPL-Daten im gewählten Zeitraum. Bitte Datum oder Importdatei anpassen.</div>';return;}
    if(!res.windows.length){$('windows-host').innerHTML='<div class="no-windows">Keine geometrische Erd-Sicht in den stündlichen Proben gefunden.</div>';return;}
    const parts=res.windows.slice(0,8).map(([start,end],i)=>{
      const len=(end-start)/HOUR;
      return `<div class="window-row"><span class="sequence">${String(i+1).padStart(2,'0')}</span><div><div class="window-title">${fmt(start)} — ${fmt(end)}</div><div class="window-sub">Geometrische DTE-Sicht, ohne Gelände</div></div><span class="window-length">${len.toFixed(0)} h</span></div>`;
    });
    if(res.windows.length>8)parts.push(`<div class="helper-text">+ ${res.windows.length-8} weitere Fenster (siehe CSV).</div>`);
    $('windows-host').innerHTML=parts.join('');
  }

  function exportCsv() {
    const rows=[['# source',isLoaded()?'NASA/JPL Horizons':'DIDACTIC_SIMULATION_NOT_CALIBRATED'],['# horizon','local tangent plane, zero elevation; no terrain'],['# timezone','UTC'],['site_id','site','timestamp_utc','sun_az_deg','sun_el_deg','earth_az_deg','earth_el_deg','sun_above_zero','earth_above_zero']];
    for(const r of state.results){for(const p of r.series){const d=p.data;rows.push([r.site.id,r.site.name,p.time.toISOString(),d?d.sun.az.toFixed(4):'',d?d.sun.el.toFixed(4):'',d?d.earth.az.toFixed(4):'',d?d.earth.el.toFixed(4):'',d?Number(d.sun.el>0):'',d?Number(d.earth.el>0):'']);}}
    const csv=rows.map(row=>row.map(cell=>`"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`lunar-visibility-${rangeStart().toISOString().slice(0,10)}-${isLoaded()?'jpl':'demo'}.csv`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  async function loadEphemeris(doc,label) {
    try {
      state.horizons=A.validateEphemeris(doc);
      const option=$('source-select').querySelector('[value=horizons]');option.disabled=false;option.textContent=`JPL Horizons (${label})`;
      $('source-select').value='horizons';state.source='horizons';
      const range=Object.values(doc.sites)[0].sun;
      const available=`${fmt(range[0].time)} bis ${fmt(range[range.length-1].time)} UTC`;
      announce('JPL-Datensatz geladen · Bereich: '+available+' · fehlende Werte erscheinen als N/A.');
      state.slider=0;update();
    } catch(e) { announce('Horizons-Datei abgelehnt: '+e.message); }
  }

  function bindEvents() {
    $('start-time').addEventListener('change',()=>{state.slider=0;update();});
    $('duration').addEventListener('change',e=>{state.hours=Number(e.target.value);state.slider=0;update();});
    $('time-scrubber').addEventListener('input',e=>{state.slider=Number(e.target.value);renderChart();renderInstant();});
    $('source-select').addEventListener('change',e=>{state.source=e.target.value;state.slider=0;update();});
    $('csv-button').addEventListener('click',exportCsv);
    $('ephemeris-upload').addEventListener('change',async e=>{
      const file=e.target.files&&e.target.files[0];if(!file)return;
      try{await loadEphemeris(JSON.parse(await file.text()),file.name);}catch(err){announce('Datei konnte nicht gelesen werden: '+err.message);}
      e.target.value='';
    });
    $('help-button').addEventListener('click',()=>$('briefing-dialog').showModal());
    $('close-dialog').addEventListener('click',()=>$('briefing-dialog').close());
    $('briefing-dialog').addEventListener('click',e=>{if(e.target===$('briefing-dialog'))$('briefing-dialog').close();});
  }

  async function initialize() {
    bindEvents();
    try{
      const resp=await fetch('data/sites.json',{cache:'no-store'});
      if(resp.ok){const parsed=await resp.json();if(Array.isArray(parsed.sites)&&parsed.sites.length)state.sites=parsed.sites;}
    }catch(_){/* file:// uses a self-contained, identical default catalog */}
    renderChoices();update();
    try{
      const response=await fetch('data/horizons.json',{cache:'no-store'});
      if(response.ok)await loadEphemeris(await response.json(),'data/horizons.json');
    }catch(_){/* optional NASA file; no fallback is misrepresented as real */}
  }
  initialize();
})();
