const state = { screen:'landing', photoData:null, sessionId:null, analysis:null };
const API = (window.__HATCHABLE__ && window.__HATCHABLE__.api) || '/api';
const screens = ['landing','guidance','review','analysis','score','insight','plan','checkout','confirmation','journey','day30','progress'];
const $ = id => document.getElementById(id);
function show(name){ state.screen=name; screens.forEach(s=>$(s)?.classList.toggle('active',s===name)); window.scrollTo(0,0); }
function setText(id,text){const e=$(id);if(e)e.textContent=text;}
function esc(v){return String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function renderAnalysis(){
 const a=state.analysis;if(!a)return;
 setText('score-value',a.overall_score);setText('score-band',a.band);setText('score-summary',a.overall_summary||'Your Glow Score is based on visible appearance characteristics in this image.');
 const labels={radiance:'Radiance',hydration_appearance:'Hydration Appearance',evenness:'Evenness',texture:'Texture',under_eye:'Under-Eye Appearance',vitality:'Overall Vitality'};
 const list=$('dimension-list');if(list)list.innerHTML=Object.entries(labels).map(([k,l])=>{const x=a.categories[k];return `<div class="dimension-row"><div><span>${esc(l)}</span><small>${esc((x.observations||[])[0]||'Visible appearance observation')}</small></div><strong>${Number(x.score)}</strong></div>`}).join('');
 const ranked=Object.entries(labels).map(([k,l])=>({key:k,label:l,score:Number(a.categories[k].score)})).sort((x,y)=>x.score-y.score||x.label.localeCompare(y.label));
 const p=$('priority-list');if(p)p.innerHTML=ranked.slice(0,3).map((x,i)=>`<div class="priority"><b>${i+1}</b><span>${esc(x.label)}</span><strong>${x.score}</strong></div>`).join('');
 setText('insight-title',`Your biggest opportunity: ${ranked[0].label}`);setText('insight-copy',(a.categories[ranked[0].key].observations||[]).join(' '));
}
async function analyzePhoto(){
 if(!state.photoData)return;show('analysis');setText('analysis-status','Reading your visible glow characteristics…');$('analysis-retry')?.classList.add('hidden');
 try{const r=await fetch(`${API}/analyze`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageData:state.photoData,sessionId:state.sessionId||crypto.randomUUID()})});const d=await r.json();if(!r.ok)throw Error(d.error||'We could not analyse that photo.');state.sessionId=d.sessionId;state.analysis=d.analysis;renderAnalysis();setTimeout(()=>show('score'),450);}
 catch(e){setText('analysis-status',e.message||'We could not analyse that photo. Please try again.');$('analysis-retry')?.classList.remove('hidden');}
}
function previewFile(file){if(!file||!file.type.startsWith('image/'))return;const reader=new FileReader();reader.onload=()=>{state.photoData=reader.result;const p=$('selfie-preview');if(p){p.src=state.photoData;p.classList.remove('hidden');}show('review');};reader.readAsDataURL(file);}
function bind(){
 $('check-glow')?.addEventListener('click',()=>show('guidance'));$('guidance-next')?.addEventListener('click',()=>show('review'));$('photo-input')?.addEventListener('change',e=>previewFile(e.target.files?.[0]));$('choose-photo')?.addEventListener('click',()=>$('photo-input')?.click());$('use-photo')?.addEventListener('click',analyzePhoto);$('analysis-retry')?.addEventListener('click',analyzePhoto);
 $('score-next')?.addEventListener('click',()=>show('insight'));$('insight-next')?.addEventListener('click',()=>show('plan'));$('plan-next')?.addEventListener('click',()=>show('checkout'));
 $('checkout-next')?.addEventListener('click',()=>{const e=$('email-input')?.value.trim();if(!e||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)){setText('checkout-error','Please enter a valid email address.');return;}show('confirmation');});
 $('confirmation-next')?.addEventListener('click',()=>show('journey'));$('journey-next')?.addEventListener('click',()=>show('day30'));$('day30-capture')?.addEventListener('click',()=>show('progress'));$('day30-upload')?.addEventListener('click',()=>$('day30-input')?.click());$('day30-input')?.addEventListener('change',()=>show('progress'));$('restart')?.addEventListener('click',()=>{state.photoData=null;state.analysis=null;state.sessionId=null;show('landing');});
 document.querySelectorAll('[data-back]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.back)));
}
document.addEventListener('DOMContentLoaded',bind);