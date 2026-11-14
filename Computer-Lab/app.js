(() => {
  'use strict';
  const backend='https://headless-fmhdvxksmwz-chiispiitas-140b.wix-site-host.com';
  const readSession=()=>decodeURIComponent((document.cookie.split('; ').find(x=>x.startsWith('ueplv_lab_session='))||'').slice('ueplv_lab_session='.length));
  const saveSession=value=>{document.cookie='ueplv_lab_session='+encodeURIComponent(value)+'; Path=/Computer-Lab/; Secure; SameSite=Strict; Max-Age='+(value?2592000:0);};
  const fetch=async(url,options={})=>{const token=readSession(),data=options.body?JSON.parse(options.body):{};const response=await window.fetch(backend+url,{method:'POST',credentials:'omit',cache:'no-store',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({...data,transportMethod:options.method||'GET',...(token?{staffSession:token}:{})})});if(url==='/api/admin/session'&&response.ok){const data=await response.clone().json();saveSession(data.sessionToken);}if((url==='/api/admin/logout'&&response.ok)||response.status===401)saveSession('');return response;};
  window.labFetch=fetch;

  const expectedNames = Array.from({ length: 33 }, (_, i) => `UEPLV-${String(i + 1).padStart(2, '0')}`);
  const allowedActions = new Set(['class', 'class-ai', 'exam', 'free', 'close-apps', 'cleanup', 'reboot', 'maintenance', 'status', 'uwf-status', 'uwf-enable', 'uwf-disable', 'uwf-purge-swap', 'uwf-repair', 'uwf-reset-stage1', 'uwf-reset-stage2', 'windows-update']);
  const confirmationActions = new Set(['close-apps','cleanup','reboot','maintenance','uwf-enable','uwf-disable','uwf-purge-swap','uwf-repair','uwf-reset-stage1','uwf-reset-stage2','windows-update']);
  const actionLabels = { class: 'Modo clase', 'class-ai':'Clase + bloqueo de IA', exam: 'Modo examen', free: 'Modo libre', 'close-apps': 'Cerrar aplicaciones', cleanup:'Limpiar perfil de estudiantes', reboot: 'Reiniciar', maintenance: 'Mantenimiento UWF', status: 'Solicitar estado', 'uwf-status':'Consultar estado UWF', 'uwf-enable':'Activar protección UWF', 'uwf-disable':'Desactivar protección UWF', 'uwf-purge-swap':'Purgar archivo temporal UWF', 'uwf-repair':'Reparar configuración UWF', 'uwf-reset-stage1':'Restablecer UWF · etapa 1', 'uwf-reset-stage2':'Restablecer UWF · etapa 2', 'windows-update':'Actualizar Windows' };
  const descriptions = { class: 'Aplica los bloqueos de navegación de la clase.', 'class-ai':'Aplica los bloqueos de clase y de las páginas de IA configuradas.', exam: 'Aplica los bloqueos de navegación del examen.', free: 'Retira los bloqueos de navegación administrados.', 'close-apps': 'Cierra las aplicaciones de estudiantes y conserva los servicios.', cleanup:'Elimina archivos y datos de los perfiles de estudiantes. Requiere confirmación.', reboot: 'Programa un reinicio con aviso de 60 segundos. Se perderá el trabajo sin guardar.', maintenance: 'Inicia el mantenimiento de Windows en los equipos protegidos con UWF.', status: 'Solicita una actualización del estado informado por cada equipo.', 'uwf-status':'Consulta la protección actual y la del próximo inicio.', 'uwf-enable':'Verifica los requisitos y solicita la activación de UWF.', 'uwf-disable':'Solicita desactivar la protección UWF; revisa el resultado antes de instalar cambios.', 'uwf-purge-swap':'Purga el archivo temporal de UWF únicamente cuando resulte seguro.', 'uwf-repair':'Comprueba y repara la configuración mediante las herramientas admitidas de Windows.', 'uwf-reset-stage1':'Primera etapa del restablecimiento de UWF. Puede requerir reiniciar.', 'uwf-reset-stage2':'Segunda etapa del restablecimiento de UWF, después de completar la etapa 1.', 'windows-update':'Actualiza Windows cuando UWF permite conservar los cambios.' };
  const stageLabels = { Prepare: 'Preparando protección', Updates: 'Actualizando Windows', Readiness: 'Verificando requisitos', ProtectionPending: 'Protección programada', PostBoot: 'Verificando reinicio', Complete: 'Instalación completa', Pending: 'Pendiente', Installed: 'Configuración inicial lista', 'Provisioned-awaiting-protection':'Esperando protección', 'Provisioning-failed':'Revisar instalación' };
  const stateLabels = { queued: 'Pendiente', pending: 'Pendiente', sent: 'Enviada', running: 'En curso', accepted: 'Recibida', completed: 'Completada', failed: 'Falló', expired: 'Caducó', rejected: 'Rechazada', interrupted:'Interrumpida', 'awaiting-restart': 'Esperando reinicio', 'needs-update-review': 'Revisar actualizaciones' };
  const updateLabels = { idle:'Al día', 'preparing-restart':'Preparando reinicio', 'awaiting-normal-restart':'Descargada · espera reinicio', 'backing-up':'Guardando copia anterior', 'rolling-back':'Revirtiendo', 'verifying-protection':'Verificando protección', downloaded:'Descargada · espera reinicio', 'awaiting-restart':'Espera reinicio', 'awaiting-unprotected-boot':'Espera reinicio', 'waiting-restart':'Espera reinicio', installing:'Instalando', applying:'Instalando', verifying:'Verificando', 'restoring-protection':'Restaurando protección', 'awaiting-protected-boot':'Verificando protección', complete:'Actualizada', completed:'Actualizada', deferred:'Pospuesta por mantenimiento', failed:'Revisar actualización', rollback:'Revirtiendo', 'rolled-back':'Versión anterior restaurada', 'rollback-failed':'Revisar recuperación' };
  const $ = (id) => document.getElementById(id);
  const ui = Object.fromEntries(['login','dashboard','loading','login-form','access-token','login-error','login-submit','logout-button','connection-status','refresh-button','page-error','stat-total','stat-online','stat-online-note','stat-protected','stat-waiting','selected-summary','selected-badge','command-select','command-description','send-command','advanced-command-select','advanced-command-description','send-advanced-command','offline-selection-note','clear-selection','device-rows','search-input','select-visible','empty-filter','visible-summary','filter-all-count','filter-online-count','filter-waiting-count','filter-attention-count','last-refresh-label','confirm-dialog','confirm-title','confirm-message','confirm-targets','confirm-submit','device-dialog','device-dialog-close','device-detail-title','device-detail-content','toast'].map(id => [id, $(id)]));
  const state = { authenticated: false, devices: new Map(), selected: new Set(), filter: 'all', query: '', refreshing: false, sending: false, serverOffset: 0, lastRefresh: null, toastTimer: null, detailName: null };
  let pendingConfirmation = null;
  let statusEtag = null;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const plain = (value) => typeof value === 'string' ? value : value == null ? '' : String(value);
  const nullableNumber = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : null;
  const now = () => Date.now() + state.serverOffset;
  const dateMs = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
  const shortTime = (value) => dateMs(value) === null ? 'Sin fecha' : new Intl.DateTimeFormat('es-EC', { hour:'2-digit', minute:'2-digit', hour12:false }).format(new Date(value));
  const fullTime = (value) => dateMs(value) === null ? 'Sin fecha' : new Intl.DateTimeFormat('es-EC', { dateStyle:'medium', timeStyle:'short' }).format(new Date(value));
  function ageLabel(value) {
    const ms = dateMs(value);
    if (ms === null) return 'Sin datos';
    const seconds = Math.floor((now() - ms) / 1000);
    if (seconds < -120) return 'Revisar reloj';
    if (seconds < 60) return 'Ahora';
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} h`;
    return fullTime(value);
  }
  function normalizeDevice(raw) {
    const status = raw.status && typeof raw.status === 'object' ? raw.status : raw.telemetry && typeof raw.telemetry === 'object' ? raw.telemetry : raw;
    const deployment = status.deployment || status.installation || raw.deployment || raw.installation || {};
    const update = status.update && typeof status.update === 'object' ? status.update : {};
    const name = plain(raw.name || raw.computerName || status.name).toUpperCase();
    const lastSeenUtc = raw.lastSeenUtc || raw.lastSuccessUtc || raw.updatedUtc || status.utc || null;
    const enrolled = raw.enrolled !== false && Boolean(raw.deviceId || raw.enrolledUtc || raw.enrollmentUtc || dateMs(lastSeenUtc) !== null);
    const used = nullableNumber(status.overlayMB ?? status.overlayConsumptionMB);
    const available = nullableNumber(status.availableMB ?? status.availableSpaceMB);
    const maximum = nullableNumber(status.maximumOverlayMB ?? status.overlayMaximumMB) ?? (used !== null && available !== null ? used + available : null);
    const warning = nullableNumber(status.overlayWarningMB);
    const critical = nullableNumber(status.overlayCriticalMB);
    return { name, enrolled, lastSeenUtc, installedVersion:plain(update.installedVersion || status.installedReleaseVersion || status.version), availableVersion:plain(update.availableVersion), updatePhase:plain(update.phase), updateError:plain(update.lastError), updateDownloadedUtc:update.downloadedUtc || null, mode:plain(status.mode || raw.mode || 'unknown'), modeApplied:typeof status.modeApplied === 'boolean' ? status.modeApplied : null, policyError:plain(status.policyError), currentEnabled:status.currentEnabled, nextEnabled:status.nextEnabled, currentCProtected:status.currentCProtected, nextCProtected:status.nextCProtected, currentServicing:status.currentServicing === true, nextServicing:status.nextServicing === true, used, available, maximum, overlayWarning:status.overlayWarning === true || status.overlayLevel === 'warning' || (warning > 0 && used !== null && used >= warning), overlayCritical:status.overlayCritical === true || status.overlayLevel === 'critical' || (critical > 0 && used !== null && used >= critical), uwfError:plain(status.uwfError), stage:plain(status.deploymentStage || status.installationStage || deployment.stage || raw.stage), deploymentSuccess:status.deploymentSuccess ?? deployment.success, deploymentDetail:plain(status.deploymentDetail || deployment.detail || raw.deploymentDetail), deploymentUtc:status.deploymentUtc || deployment.utc || null, jobs:Array.isArray(raw.jobs) ? raw.jobs : [], results:Array.isArray(raw.results) ? raw.results : [], raw };
  }
  function deviceFor(name) { return state.devices.get(name) || normalizeDevice({ name }); }
  function connectivity(device) {
    if (!device.enrolled) return 'waiting';
    const seen = dateMs(device.lastSeenUtc);
    if (seen === null) return 'offline';
    const age = now() - seen;
    if (age >= -120000 && age <= 150000) return 'online';
    if (age > 150000 && age <= 600000) return 'stale';
    return 'offline';
  }
  function protectedNow(device) { return device.currentEnabled === true && device.currentCProtected === true && !device.currentServicing; }
  function latestJob(device) {
    const items = [...device.jobs.map(j => ({...j, state:j.state || 'queued'})), ...device.results];
    return items.sort((a,b) => (dateMs(b.utc || b.updatedUtc || b.issuedUtc || b.createdUtc) || 0) - (dateMs(a.utc || a.updatedUtc || a.issuedUtc || a.createdUtc) || 0))[0] || null;
  }
  function needsAttention(device) {
    const last = latestJob(device);
    return device.enrolled && (connectivity(device) !== 'online' || device.modeApplied === false || Boolean(device.policyError) || device.overlayWarning || device.overlayCritical || Boolean(device.uwfError) || Boolean(device.updateError) || ['failed','rolled-back','rollback-failed'].includes(device.updatePhase) || device.deploymentSuccess === false || ['failed','rejected','interrupted','needs-update-review'].includes(last?.state));
  }
  function modeHtml(mode,applied = null,policyError = '') {
    const key = mode === 'unrestrict' ? 'free' : mode;
    const modes = { class:['Clase','mode-class'], 'class-ai':['Clase + bloqueo IA','mode-class'], exam:['Examen','mode-exam'], free:['Libre','mode-free'] };
    const [label, css] = modes[key] || ['Sin informar','mode-unknown'];
    if (css === 'mode-unknown') return `<span class="mode-badge ${css}">${label}</span>`;
    if (applied !== true) return `<span class="mode-badge ${applied === false ? 'mode-exam' : 'mode-unknown'}">${applied === false ? 'Pendiente' : 'Sin confirmar'}</span><span class="cell-note">Solicitado: ${label}</span>${policyError ? `<span class="cell-note status-negative" title="${escapeHtml(policyError)}">${escapeHtml(policyError)}</span>` : ''}`;
    return `<span class="mode-badge ${css}" title="Modo confirmado por el equipo">${label}</span>${policyError ? `<span class="cell-note status-negative" title="${escapeHtml(policyError)}">${escapeHtml(policyError)}</span>` : ''}`;
  }
  function protectionHtml(device, next) {
    const enabled = next ? device.nextEnabled : device.currentEnabled;
    const volume = next ? device.nextCProtected : device.currentCProtected;
    const servicing = next ? device.nextServicing : device.currentServicing;
    if (servicing) return '<span class="status-blue">Mant.</span>';
    if (enabled === true && volume === true) return '<span class="status-positive">Sí</span>';
    if (enabled === false || volume === false) return '<span class="status-negative">No</span>';
    return '<span class="status-muted">—</span>';
  }
  function jobClass(job) {
    return ['completed'].includes(job.state) ? 'status-positive' : ['failed','rejected','interrupted'].includes(job.state) ? 'status-danger' : ['queued','pending','running','accepted','sent','awaiting-restart','needs-update-review'].includes(job.state) ? 'status-negative' : 'status-muted';
  }
  function stageLabel(device) {
    if (!device.enrolled) return 'Por registrar';
    if (device.deploymentSuccess === false) return 'Revisar instalación';
    return stageLabels[device.stage] || device.stage || 'Sin informar';
  }
  function visibleDevices() {
    return expectedNames.map(deviceFor).filter(d => (!state.query || d.name.toLowerCase().includes(state.query)) && (state.filter === 'all' || state.filter === 'online' && connectivity(d) === 'online' || state.filter === 'waiting' && !d.enrolled || state.filter === 'attention' && needsAttention(d)));
  }
  function updatePhaseLabel(device) {
    if (device.updatePhase === 'idle') {
      if (device.updateError) return 'Revisar actualización';
      if (device.availableVersion && device.availableVersion !== device.installedVersion) return device.updateDownloadedUtc ? 'Descargada · pendiente de preparación' : 'Actualización disponible';
    }
    return updateLabels[device.updatePhase] || device.updatePhase;
  }
  function updateHtml(device) {
    const version = device.installedVersion ? 'v' + device.installedVersion : 'Sin informar';
    const phase = updatePhaseLabel(device);
    return `<span class="cell-note">Servicio: ${escapeHtml(version)}</span>${phase ? `<span class="cell-note ${device.updateError ? 'status-negative' : ''}" title="${escapeHtml(device.updateError)}">${escapeHtml(phase)}${device.availableVersion && device.availableVersion !== device.installedVersion ? ' · v'+escapeHtml(device.availableVersion) : ''}</span>` : ''}`;
  }
  function renderRow(device) {
    const connection = connectivity(device);
    const connectionText = connection === 'online' ? 'Conectado' : connection === 'stale' ? 'Sin respuesta reciente' : connection === 'waiting' ? 'Por registrar' : 'Sin conexión';
    const latest = latestJob(device);
    const percentage = device.maximum && device.used !== null ? Math.max(0,Math.min(100, device.used / device.maximum * 100)) : 0;
    const overlayClass = device.overlayCritical ? 'critical' : device.overlayWarning ? 'warning' : '';
    const overlay = device.used !== null ? `<span class="overlay-value ${device.overlayCritical ? 'status-danger' : device.overlayWarning ? 'status-negative' : ''}">${escapeHtml(Math.round(device.used).toLocaleString('es-EC'))} MB</span>${device.maximum ? `<progress class="overlay-track ${overlayClass}" value="${percentage.toFixed(1)}" max="100" aria-label="${Math.round(percentage)} por ciento del espacio temporal utilizado"></progress>` : ''}<span class="cell-note">${device.overlayCritical ? 'Nivel crítico' : device.overlayWarning ? 'Nivel de advertencia' : device.available !== null ? `${Math.round(device.available).toLocaleString('es-EC')} MB disponibles` : 'Consumo informado'}</span>` : '<span class="status-muted">Sin datos</span>';
    const job = latest ? `<span class="job-state ${jobClass(latest)}"><i></i>${escapeHtml(stateLabels[latest.state] || latest.state || 'Sin informar')}</span><span class="cell-note">${escapeHtml(actionLabels[latest.action] || latest.action || '')}</span>` : '<span class="status-muted">Sin órdenes</span>';
    return `<tr class="${state.selected.has(device.name) ? 'selected' : ''}"><td class="select-column"><input type="checkbox" data-select="${device.name}" ${state.selected.has(device.name) ? 'checked' : ''} aria-label="Seleccionar ${device.name}"></td><td><button type="button" class="device-name" data-detail="${device.name}">${device.name}</button><span class="device-connection ${connection === 'waiting' ? 'offline' : connection}"><i></i>${connectionText}</span>${device.enrolled ? `<span class="cell-note" title="${escapeHtml(fullTime(device.lastSeenUtc))}">${escapeHtml(ageLabel(device.lastSeenUtc))}</span>` : ''}</td><td>${modeHtml(device.mode,device.modeApplied,device.policyError)}</td><td><span class="uwf-pair">${protectionHtml(device,false)}<span class="slash">/</span>${protectionHtml(device,true)}</span>${device.uwfError ? '<span class="cell-note status-negative">Revisar UWF</span>' : device.currentServicing || device.nextServicing ? '<span class="cell-note">Mantenimiento</span>' : ''}</td><td>${overlay}</td><td><span class="install-stage ${device.deploymentSuccess === false ? 'failed' : device.stage === 'Complete' ? 'complete' : ''}" title="${escapeHtml(device.deploymentDetail)}">${escapeHtml(stageLabel(device))}</span>${device.enrolled ? updateHtml(device) : ''}</td><td>${job}</td></tr>`;
  }
  function render() {
    const all = expectedNames.map(deviceFor);
    const online = all.filter(d => connectivity(d) === 'online').length;
    const waiting = all.filter(d => !d.enrolled).length;
    const attention = all.filter(needsAttention).length;
    ui['stat-online'].textContent = online;
    ui['stat-protected'].textContent = all.filter(d => connectivity(d) === 'online' && protectedNow(d)).length;
    ui['stat-waiting'].textContent = waiting;
    ui['stat-online-note'].textContent = waiting === 33 ? 'Esperando el primer registro' : 'Con respuesta en los últimos 150 s';
    ui['filter-online-count'].textContent = online;
    ui['filter-waiting-count'].textContent = waiting;
    ui['filter-attention-count'].textContent = attention;
    const visible = visibleDevices();
    ui['device-rows'].innerHTML = visible.map(renderRow).join('');
    ui['empty-filter'].hidden = visible.length !== 0;
    ui['visible-summary'].textContent = `${visible.length} de 33 equipos`;
    const selectedVisible = visible.filter(d => state.selected.has(d.name)).length;
    ui['select-visible'].checked = visible.length > 0 && selectedVisible === visible.length;
    ui['select-visible'].indeterminate = selectedVisible > 0 && selectedVisible < visible.length;
    ui['select-visible'].disabled = !visible.length;
    updateSelection();
    if (state.detailName && ui['device-dialog'].open) renderDetail(state.detailName);
  }
  function updateSelection() {
    const size = state.selected.size;
    ui['selected-badge'].textContent = `${size} seleccionado${size === 1 ? '' : 's'}`;
    ui['selected-summary'].textContent = size ? size === 33 ? 'La orden se enviará a todo el laboratorio.' : `La orden se enviará a ${size} equipo${size === 1 ? '' : 's'}.` : 'Selecciona los equipos de la lista.';
    ui['send-command'].disabled = !state.authenticated || !size || state.sending;
    ui['send-advanced-command'].disabled = !state.authenticated || !size || state.sending;
    document.querySelectorAll('[data-quick]').forEach(button => {button.disabled = !state.authenticated || !size || state.sending;});
    ui['clear-selection'].disabled = !size || state.sending;
    const offline = [...state.selected].filter(name => connectivity(deviceFor(name)) !== 'online').length;
    ui['offline-selection-note'].textContent = offline ? `${offline} seleccionado${offline === 1 ? '' : 's'} sin conexión confirmada. Las órdenes caducan en 5 minutos.` : 'Las órdenes pendientes caducan en 5 minutos.';
  }
  function renderDetail(name) {
    const device = deviceFor(name);
    ui['device-detail-title'].textContent = name;
    const jobs = [...device.jobs.map(j => ({...j,state:j.state || 'queued'})),...device.results].sort((a,b) => (dateMs(b.utc || b.issuedUtc || b.createdUtc) || 0) - (dateMs(a.utc || a.issuedUtc || a.createdUtc) || 0)).slice(0,20);
    ui['device-detail-content'].innerHTML = `<div class="detail-summary"><div class="detail-item"><span>Última comunicación</span><strong>${escapeHtml(device.enrolled ? fullTime(device.lastSeenUtc) : 'Esperando registro')}</strong></div><div class="detail-item"><span>Modo informado</span>${modeHtml(device.mode,device.modeApplied,device.policyError)}</div><div class="detail-item"><span>C: protegido ahora / próximo inicio</span><strong class="uwf-pair">${protectionHtml(device,false)}<span class="slash">/</span>${protectionHtml(device,true)}</strong></div><div class="detail-item"><span>Instalación</span><strong>${escapeHtml(stageLabel(device))}</strong></div></div>${device.deploymentDetail ? `<p class="detail-note">${escapeHtml(device.deploymentDetail)}</p>` : ''}${device.policyError ? `<p class="detail-note status-negative">${escapeHtml(device.policyError)}</p>` : ''}${device.uwfError ? `<p class="detail-note status-negative">${escapeHtml(device.uwfError)}</p>` : ''}<section class="detail-section"><h3>Actualización del servicio</h3><p>Versión instalada: ${escapeHtml(device.installedVersion || 'Sin informar')}. ${escapeHtml(updatePhaseLabel(device) || 'Sin estado informado')}${device.availableVersion ? ' · Disponible: '+escapeHtml(device.availableVersion) : ''}</p>${device.updateDownloadedUtc ? `<p>Descarga: ${escapeHtml(fullTime(device.updateDownloadedUtc))}</p>` : ''}${device.updateError ? `<p class="status-negative">${escapeHtml(device.updateError)}</p>` : ''}</section><section class="detail-section"><h3>Órdenes y resultados</h3>${jobs.length ? `<ol class="result-list">${jobs.map(job => `<li><div class="result-heading"><span>${escapeHtml(actionLabels[job.action] || job.action || 'Orden')} · <span class="${jobClass(job)}">${escapeHtml(stateLabels[job.state] || job.state || 'Sin informar')}</span></span><time>${escapeHtml(shortTime(job.utc || job.issuedUtc || job.createdUtc))}</time></div>${job.detail || job.error ? `<p>${escapeHtml(job.detail || job.error)}</p>` : ''}${job.expiresUtc && ['queued','pending','sent'].includes(job.state) ? `<p>Caduca: ${escapeHtml(fullTime(job.expiresUtc))}</p>` : ''}</li>`).join('')}</ol>` : '<p class="detail-note">Este equipo todavía no ha informado resultados de órdenes.</p>'}</section>`;
  }
  function showLogin(message = '') {
    statusEtag = null;
    state.authenticated = false;
    state.selected.clear();
    state.devices.clear();
    ui.loading.hidden = true;
    ui.dashboard.hidden = true;
    ui.login.hidden = false;
    ui['login-error'].textContent = message;
    ui['login-error'].hidden = !message;
    if (ui['device-dialog'].open) ui['device-dialog'].close();
    if (ui['confirm-dialog'].open) ui['confirm-dialog'].close('cancel');
  }
  function showDashboard() {
    state.authenticated = true;
    ui.loading.hidden = true;
    ui.login.hidden = true;
    ui.dashboard.hidden = false;
    ui['access-token'].value = '';
  }
  function showToast(message, error = false) {
    clearTimeout(state.toastTimer);
    ui.toast.textContent = message;
    ui.toast.classList.toggle('error',error);
    ui.toast.hidden = false;
    state.toastTimer = setTimeout(() => { ui.toast.hidden = true; }, error ? 7000 : 5000);
  }
  async function api(path, method = 'GET', body) {
    const isStatus=path==='/api/admin/status'&&method==='GET';
    const response = await fetch(path, { method, credentials:'same-origin', cache:'no-store', headers:{Accept:'application/json', ...(body !== undefined ? {'Content-Type':'application/json'} : {}), ...(isStatus&&statusEtag?{'If-None-Match':statusEtag}:{}), 'X-UEPLV-Request':'dashboard'}, ...(body !== undefined ? {body:JSON.stringify(body)} : {}) });
    if(isStatus&&response.status===304) return {notModified:true};
    const type = response.headers.get('Content-Type') || '';
    const data = type.includes('json') ? await response.json() : {};
    if (!response.ok) {
      const err = new Error(plain(data.message || data.error) || (response.status === 401 ? 'La sesión terminó. Vuelve a ingresar.' : response.status === 429 ? 'Se alcanzó el límite temporal. Espera un momento y vuelve a intentar.' : `No se pudo completar la solicitud (${response.status}).`));
      err.status = response.status;
      throw err;
    }
    if(isStatus) statusEtag=response.headers.get('ETag')||null;
    return data;
  }
  async function refresh({initial = false, quiet = false} = {}) {
    if (state.refreshing) return;
    state.refreshing = true;
    ui['refresh-button'].disabled = true;
    try {
      const data = await api('/api/admin/status');
      if(!data.notModified) {
      const server = dateMs(data.serverUtc);
      if (server !== null) state.serverOffset = server - Date.now();
      const devices = Array.isArray(data.devices) ? data.devices : data.devices && typeof data.devices === 'object' ? Object.entries(data.devices).map(([name,d]) => ({...d,name})) : [];
      state.devices = new Map(devices.map(normalizeDevice).filter(d => expectedNames.includes(d.name)).map(d => [d.name,d]));
      }
      state.lastRefresh = new Date(now()).toISOString();
      showDashboard();
      ui['page-error'].hidden = true;
      ui['connection-status'].textContent = 'Panel actualizado';
      ui['connection-status'].className = 'connection-status live';
      ui['last-refresh-label'].textContent = `Panel actualizado a las ${shortTime(state.lastRefresh)}`;
      render();
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        showLogin(initial ? '' : error.message);
      } else if (initial && !state.authenticated) {
        showLogin('No se pudo conectar con el panel. Intenta de nuevo en un momento.');
      } else {
        ui['page-error'].textContent = `No se pudo actualizar el panel. Se conserva el último estado recibido. ${error.message || 'Revisa la conexión.'}`;
        ui['page-error'].hidden = false;
        ui['connection-status'].textContent = 'Sin actualizar';
        ui['connection-status'].className = 'connection-status failed';
        render();
        if (!quiet) showToast('No se pudo actualizar el estado.',true);
      }
    } finally { state.refreshing = false; ui['refresh-button'].disabled = false; }
  }
  async function login(token) {
    ui['login-submit'].disabled = true;
    ui['login-submit'].textContent = 'Verificando acceso…';
    ui['login-error'].hidden = true;
    try {
      await api('/api/admin/session','POST',{token});
      token = null;
      showDashboard();
      await refresh({initial:true});
    } catch (error) { showLogin(error.status === 401 || error.status === 403 ? 'La clave de acceso no es válida.' : error.message || 'No se pudo iniciar sesión.'); }
    finally { ui['login-submit'].disabled = false; ui['login-submit'].innerHTML = 'Entrar al panel <span aria-hidden="true">↗</span>'; }
  }
  function requestId() {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
    return [...bytes].map((b,i) => `${[4,6,8,10].includes(i) ? '-' : ''}${b.toString(16).padStart(2,'0')}`).join('');
  }
  async function sendCommand(action,targets) {
    if (state.sending || !state.authenticated || !allowedActions.has(action) || !targets.length || targets.some(n => !expectedNames.includes(n))) return;
    state.sending = true; updateSelection();
    try {
      const response = await api('/api/admin/jobs','POST',{targets,action,requestId:requestId()});
      const count = Array.isArray(response.jobs) ? response.jobs.length : targets.length;
      showToast(`Orden registrada para ${count} equipo${count === 1 ? '' : 's'}. Esperando confirmación.`);
      await refresh({quiet:true});
    } catch (error) {
      if (error.status === 401 || error.status === 403) showLogin(error.message);
      else showToast(error.message || 'No se pudo registrar la orden.',true);
    } finally { state.sending = false; updateSelection(); }
  }
  function confirmCommand(action,targets) {
    const count = targets.length;
    const warnings = {
      'close-apps':'Se cerrarán las aplicaciones de las sesiones de estudiantes. El trabajo sin guardar puede perderse. Windows, Veyon y el servicio de control seguirán funcionando.',
      cleanup:'Se eliminarán archivos y datos de los perfiles de estudiantes. Guarda primero los trabajos que deban conservarse. Los perfiles del personal quedan fuera de esta limpieza. Esta acción no se puede deshacer desde el panel.',
      reboot:'Los equipos se reiniciarán. Asegúrate de que los estudiantes hayan guardado su trabajo.',
      maintenance:'El mantenimiento UWF puede reiniciar los equipos varias veces. Úsalo fuera del horario de clases.',
      'uwf-enable':'El equipo comprobará los requisitos antes de programar la protección. La protección solo estará activa después del reinicio y de su verificación.',
      'uwf-disable':'Se solicitará desactivar UWF. Después del reinicio, los cambios podrán conservarse en el disco. Usa esta acción solo durante el mantenimiento del laboratorio.',
      'uwf-purge-swap':'Se solicitará eliminar el archivo temporal de UWF. El equipo rechazará la acción si el archivo está en uso o la protección no permite eliminarlo con seguridad.',
      'uwf-repair':'Se revisará la configuración de UWF mediante las herramientas admitidas de Windows. Consulta el resultado antes de continuar con otras acciones.',
      'uwf-reset-stage1':'Se iniciará la primera etapa del restablecimiento de UWF. Espera el resultado y el reinicio indicado antes de ejecutar la segunda etapa.',
      'uwf-reset-stage2':'Ejecuta esta segunda etapa solo después de completar la primera y su reinicio. La protección debe verificarse nuevamente al finalizar.',
      'windows-update':'Windows puede necesitar descargar actualizaciones y reiniciar los equipos. El trabajo debe realizarse fuera del horario de clases y con UWF en un estado compatible.'
    };
    ui['confirm-title'].textContent = `${actionLabels[action] || 'Enviar orden'} · ${count} equipo${count === 1 ? '' : 's'}`;
    ui['confirm-message'].textContent = warnings[action] || descriptions[action] || '';
    ui['confirm-targets'].innerHTML = targets.map(n => `<span>${n}</span>`).join('');
    ui['confirm-submit'].textContent = action === 'close-apps' ? 'Cerrar aplicaciones' : action === 'cleanup' ? 'Limpiar perfiles' : action === 'reboot' ? 'Reiniciar' : 'Confirmar acción';
    pendingConfirmation = {action,targets};
    ui['confirm-dialog'].showModal();
  }

  ui['login-form'].addEventListener('submit', event => { event.preventDefault(); const token = ui['access-token'].value.trim(); if (token) login(token); });
  ui['logout-button'].addEventListener('click', async () => {
    ui['logout-button'].disabled = true;
    try { await api('/api/admin/logout','POST',{}); showLogin(); }
    catch { showToast('No se pudo cerrar la sesión. Vuelve a intentar.',true); }
    finally { ui['logout-button'].disabled = false; }
  });
  ui['refresh-button'].addEventListener('click', () => refresh());
  ui['command-select'].addEventListener('change', () => { ui['command-description'].textContent = descriptions[ui['command-select'].value] || ''; });
  ui['advanced-command-select'].addEventListener('change', () => { ui['advanced-command-description'].textContent = descriptions[ui['advanced-command-select'].value] || ''; });
  ui['clear-selection'].addEventListener('click', () => { state.selected.clear(); render(); });
  ui['select-visible'].addEventListener('change', () => { for (const d of visibleDevices()) ui['select-visible'].checked ? state.selected.add(d.name) : state.selected.delete(d.name); render(); });
  ui['device-rows'].addEventListener('change', event => { const name = event.target.dataset.select; if (expectedNames.includes(name)) {event.target.checked ? state.selected.add(name) : state.selected.delete(name); render();} });
  ui['device-rows'].addEventListener('click', event => { const button = event.target.closest('[data-detail]'); if (!button) return; state.detailName = button.dataset.detail; renderDetail(state.detailName); ui['device-dialog'].showModal(); });
  ui['device-dialog-close'].addEventListener('click', () => ui['device-dialog'].close());
  ui['device-dialog'].addEventListener('close', () => {state.detailName = null;});
  ui['search-input'].addEventListener('input', () => {state.query = ui['search-input'].value.trim().toLowerCase();render();});
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(b => { const active = b === button; b.classList.toggle('active',active); b.setAttribute('aria-pressed',String(active)); });
    render();
  }));
  function submitAction(action) {
    const targets = [...state.selected].sort();
    if (!targets.length || state.sending || !allowedActions.has(action)) return;
    if (confirmationActions.has(action)) confirmCommand(action,targets);
    else sendCommand(action,targets);
  }
  ui['send-command'].addEventListener('click', () => submitAction(ui['command-select'].value));
  ui['send-advanced-command'].addEventListener('click', () => submitAction(ui['advanced-command-select'].value));
  document.querySelectorAll('[data-quick]').forEach(button => button.addEventListener('click', () => submitAction(button.dataset.quick)));
  ui['confirm-dialog'].addEventListener('close', () => {
    const confirmed = ui['confirm-dialog'].returnValue === 'confirm' && pendingConfirmation;
    const request = pendingConfirmation; pendingConfirmation = null;
    if (confirmed && request) sendCommand(request.action,request.targets);
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && state.authenticated) refresh({quiet:true}); });
  setInterval(() => { if (state.authenticated && !document.hidden) refresh({quiet:true}); },3000);
  // The access key never enters a query string, localStorage, analytics, or page content.
  const fragment = new URLSearchParams(location.hash.slice(1));
  let access = fragment.get('access');
  if (access) {
    history.replaceState(null,'',location.pathname + location.search);
    showLogin(); ui['access-token'].value = access;
    login(access); access = null;
  } else { refresh({initial:true,quiet:true}); }
})();
