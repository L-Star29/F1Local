import {createGaragePreview} from './garage-preview.js';
import {pitStarts} from './practice-starts.js';
export function createSetupFlow({selectAudience,changeSession,getState}){
 const $=id=>document.getElementById(id),menu=$('menu'),garage=document.querySelector('.garage');
 let stage='circuit',fastJoin=false;
 const showroom=createGaragePreview($('team'));
 const shortcut=document.createElement('button');shortcut.id='joinShortcut';shortcut.className='secondary';shortcut.textContent='Join room ↗';document.querySelector('.menu-top').append(shortcut);
 const nav=document.querySelector('.menu-top nav');
 const audience=document.createElement('div');audience.className='segmented audience';
 $('practiceTab').textContent='Solo';$('multiplayerTab').textContent='With a friend';
 audience.append($('practiceTab'),$('multiplayerTab'));
 nav.setAttribute('aria-label','Setup progress');nav.innerHTML=['circuit','session','garage'].map((s,i)=>`<button data-stage="${s}"><small>0${i+1}</small> ${s[0].toUpperCase()+s.slice(1)}</button>`).join('');
 const panel=document.createElement('section');panel.id='sessionPanel';
 panel.innerHTML=`<div class="section-title">CHOOSE YOUR SESSION</div><div class="session-choices"><button id="choosePractice" class="session-choice"><small>01 / FIND YOUR PACE</small><strong>Practice</strong><span>Open laps. No countdown. Work on your line and personal best.</span></button><button id="chooseRace" class="session-choice"><small>02 / MAKE IT COUNT</small><strong>Race</strong><span>Standing start. A set distance. Bring every lap home.</span></button></div><div id="raceAudience"><div class="section-title second">WHO'S ON THE GRID?</div></div><div id="soloDistance"><label>Race distance<select id="soloLaps"><option value="1">1 lap / Sprint</option><option value="3" selected>3 laps / Short race</option><option value="5">5 laps / Long race</option></select></label><p class="hint"><span id="aiAvailability">Race against AI drivers on Silverstone.</span></p></div><p id="practiceNote" class="hint">Start on the circuit and drive as many laps as you like.</p>`;
 panel.querySelector('#raceAudience').append(audience);
 document.querySelector('.menu-columns').prepend(panel);
 const aiFields=document.createElement('div');aiFields.id='aiFields';aiFields.innerHTML='<label>AI opponents<select id=aiCount><option value=0>0 / race the clock</option><option value=1>1 opponent</option><option value=2 selected>2 opponents</option><option value=3>3 opponents</option></select></label><label>AI skill <output id=aiSkillValue>60%</output><input id=aiDifficulty type=range min=0 max=100 step=1 value=60 aria-label="AI skill percentage"></label><label>AI aggression <output id=aiAggressionValue>50%</output><input id=aiAggression type=range min=0 max=100 step=1 value=50 aria-label="AI aggression percentage"></label>';$('soloDistance').append(aiFields);$('aiDifficulty').oninput=()=>{$('aiSkillValue').textContent=$('aiDifficulty').value+'%';};$('aiAggression').oninput=()=>{$('aiAggressionValue').textContent=$('aiAggression').value+'%';};for(const id of ['aiCount','aiDifficulty','aiAggression'])$(id).onchange=()=>changeSession(getState().kind);
 panel.append($('raceSetup'));
 panel.append(document.querySelector('.setup-details'));
 const practiceStart=document.createElement('div');practiceStart.id='practiceStartFields';practiceStart.innerHTML='<label>Starting position<select id="practiceStart"><option value="track">On circuit</option><option value="pit">Pit-lane exit</option></select></label><p id="pitStartNote" class="hint"></p>';panel.append(practiceStart);
 const trialFields=document.createElement('div');trialFields.id='trialFields';trialFields.innerHTML='<label>Practice format<select id=practiceFormat><option value=free>Free practice</option><option value=trial>Time trial  /  personal best ghost</option></select></label><label class=ghost-toggle><input type=checkbox id=ghostEnabled checked> Show personal-best ghost</label><p class=hint id=trialRecord></p><p class=hint>No login. Records stay in this browser, on this device. Time trials begin with an untimed out-lap. Press T to restart.</p>';panel.append(trialFields);$('practiceFormat').onchange=()=>{changeSession(getState().kind);render();};
 $('practiceStart').onchange=()=>changeSession(getState().kind);
 const actions=document.createElement('div');actions.className='garage-room-actions';actions.append($('createRace'),$('joinRace'));garage.append(actions);
 const status=$('raceStatus');menu.insertBefore(status,menu.querySelector('footer'));
 menu.insertBefore($('assetStatus'),menu.querySelector('footer'));
 const bar=document.createElement('div');bar.className='flow-actions';bar.innerHTML='<button id="setupBack" class="secondary">Back</button><span id="setupSummary"></span><button id="setupNext" class="primary">Session settings →</button>';
 menu.insertBefore(bar,menu.querySelector('footer'));
 const result=document.createElement('div');result.id='soloResult';result.hidden=true;garage.prepend(result);
 const titles={circuit:['Choose your circuit.','Learn the corners. Own the lap.'],session:['Set the session.','Open practice or a race with a finish line.'],garage:['Choose your machine.','Your team. Your view. Ready to drive.']};
 function render(){
  const {kind,screen,race,started,busy,track,mode}=getState(),online=screen==='multiplayer';const aiSupported=track?.id==='gb-1948'&&mode==='formula';aiFields.hidden=!aiSupported;$('aiAvailability').textContent=aiSupported?'AI drivers use the same Formula physics. Contact is enabled. These initial AI pace levels are conservative; competitive pace is still being tuned. Pausing freezes the whole solo race.':'AI racing is currently available with Formula cars at Silverstone. This selection races against the clock.';
  shortcut.hidden=!!race||fastJoin;shortcut.disabled=busy;
  $('hostTab').hidden=fastJoin;panel.querySelector(':scope > .section-title').textContent=fastJoin?'ROOM DETAILS':'CHOOSE YOUR SESSION';
  showroom.update(!race&&stage==='garage'&&(online||mode==='formula'));
  document.body.dataset.stage=race?'lobby':stage;
  $('practicePanel').hidden=!!race||stage!=='circuit';panel.hidden=!!race||stage!=='session';garage.hidden=!!race||stage!=='garage';$('multiplayerPanel').hidden=!race;
  $('raceSetup').hidden=!online;$('raceLobby').hidden=!race;
  $('raceAudience').hidden=kind!=='race'||fastJoin;panel.querySelector('.session-choices').hidden=fastJoin;$('soloDistance').hidden=kind!=='race'||online;$('practiceNote').hidden=kind!=='practice';
  trialFields.hidden=kind!=='practice';$('ghostEnabled').parentElement.hidden=$('practiceFormat').value!=='trial';practiceStart.hidden=kind!=='practice';const pitAvailable=!!pitStarts[track?.id];$('practiceStart').querySelector('[value=pit]').disabled=!pitAvailable;if(!pitAvailable)$('practiceStart').value='track';$('pitStartNote').textContent=pitAvailable?'Pit exit starts on the imported pit lane. The out-lap is not timed.':'Pit-exit placement is not yet verified for this circuit.';
  for(const k of ['practice','race'])$('choose'+k[0].toUpperCase()+k.slice(1)).setAttribute('aria-pressed',kind===k);
  nav.querySelectorAll('[data-stage]').forEach(b=>{b.disabled=!!race||busy||(fastJoin&&b.dataset.stage==='circuit');b.setAttribute('aria-current',b.dataset.stage===stage?'step':'false');});
  nav.querySelector('[data-stage=circuit]').hidden=fastJoin;nav.querySelector('[data-stage=session]').textContent=fastJoin?'01 Room':'02 Session';nav.querySelector('[data-stage=garage]').textContent=fastJoin?'02 Garage':'03 Garage';
  const title=race?['The starting grid.','Share the code. Ready up. Race.']:titles[stage];$('screenTitle').textContent=title[0];$('screenSubtitle').textContent=title[1];document.querySelector('.heading-number').textContent='/0'+(['circuit','session','garage'].indexOf(stage)+1);
  if(fastJoin&&!race&&stage==='session'){$('screenTitle').textContent='Join your friend.';$('screenSubtitle').textContent='Enter the invite code, then choose your team. The room determines the circuit; private rooms currently use Silverstone.';}
  bar.hidden=!!race;$('setupBack').hidden=stage==='circuit';$('setupNext').hidden=stage==='garage';$('setupNext').disabled=busy;$('setupNext').textContent=stage==='circuit'?'Session settings →':'Choose your car →';
  $('setupSummary').textContent=(online?'Silverstone':track?.name||'')+' / '+(kind==='practice'?'Practice':online?'Private race':'Solo race');
  $('drive').hidden=online;$('drive').innerHTML=getState().finished?'RACE AGAIN ↗':started?'RESUME SESSION ↗':kind==='race'?'START RACE ↗':'START PRACTICE ↗';
  $('createRace').hidden=!online||$('hostTab').getAttribute('aria-selected')!=='true';$('joinRace').hidden=!online||!$('createRace').hidden;
  document.querySelectorAll('.practice-setting').forEach(e=>e.hidden=online);
  $('liveMode').textContent=race||online?'PRIVATE RACE':kind==='race'?'SOLO RACE':'PRACTICE';
 }
 function go(next){if(getState().race||getState().busy||(fastJoin&&next==='circuit'))return;if(next==='garage'&&getState().screen==='multiplayer'&&$('joinTab').getAttribute('aria-selected')==='true'&&!/^[A-F0-9]{6}$/.test($('roomCode').value.trim())){$('raceStatus').textContent='Enter the six-character invite code first.';$('roomCode').focus();return;}stage=next;render();menu.scrollTop=0;}
 nav.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>go(b.dataset.stage));
 $('setupNext').onclick=()=>go(stage==='circuit'?'session':'garage');$('setupBack').onclick=()=>{if(fastJoin&&stage==='session'){fastJoin=false;changeSession('practice');selectAudience('practice');}go(stage==='garage'?'session':'circuit');};
 shortcut.onclick=()=>{if(getState().busy)return;changeSession('race');selectAudience('multiplayer');$('joinTab').click();fastJoin=true;go('session');};
 for(const kind of ['practice','race'])$('choose'+kind[0].toUpperCase()+kind.slice(1)).onclick=()=>{changeSession(kind);if(kind==='practice')selectAudience('practice');render();};
 $('soloLaps').onchange=()=>changeSession(getState().kind);
 for(const id of ['hostTab','joinTab'])$(id).addEventListener('click',render);
 return {render,go};
}
