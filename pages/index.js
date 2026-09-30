import { } from "hatchable";

export const access = "public";

export default async function(req, res) {
  const html = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#f7f2ea">
<title>GLOW AI™ — Your Personal Glow Check</title>
<style>
:root{--cream:#f7f0e5;--ink:#151414;--gold:#b28a4b;--line:#dfd0ba;--muted:#655e55;--white:#fffdf9}
*{box-sizing:border-box}html,body{margin:0;background:#ddd4c8;color:var(--ink);font-family:Inter,Arial,sans-serif}body{min-height:100vh}
.app{width:100%;max-width:430px;margin:0 auto;background:var(--cream);min-height:100vh;overflow:hidden}
.hero{position:relative;min-height:760px;color:#fff;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden}
.hero:before{content:"";position:absolute;inset:0;background-image:url("/assets/diverse-women-portrait.jpg");background-size:cover;background-position:center 28%;transform:scale(1.01)}
.hero:after{content:"";position:absolute;inset:0;background:linear-gradient(to bottom,rgba(20,14,10,.05) 0%,rgba(20,14,10,.02) 30%,rgba(20,14,10,.08) 48%,rgba(20,14,10,.74) 76%,rgba(20,14,10,.9) 100%)}
.top{position:absolute;z-index:3;top:22px;left:22px;right:22px;display:flex;align-items:flex-start;justify-content:space-between}
.brand{font:400 25px/1 Georgia,serif;letter-spacing:.03em}.tm{font:9px Inter,Arial,sans-serif;vertical-align:top;margin-left:2px}.private{margin-top:8px;font-size:8px;letter-spacing:.22em;text-transform:uppercase}.lang{border:0;background:rgba(255,253,249,.94);border-radius:24px;padding:12px 15px;font-size:9px;letter-spacing:.1em;color:var(--ink)}
.hero-copy{position:relative;z-index:2;padding:0 22px 22px}.eyebrow{font-size:9px;letter-spacing:.25em;text-transform:uppercase;margin-bottom:16px}
h1{font:400 43px/.92 Georgia,serif;letter-spacing:-.04em;margin:0 0 17px;max-width:390px}h1 em{font-style:italic;color:#e4c784}.lead{font:400 16px/1.42 Arial,sans-serif;margin:0 0 10px;max-width:385px}.support{font-size:11px;line-height:1.5;margin:0 0 20px;color:rgba(255,255,255,.9);max-width:380px}
.cta{display:block;width:100%;border:0;background:#fff;color:#151515;border-radius:999px;padding:18px 14px;font-size:10px;font-weight:700;letter-spacing:.15em;text-align:center;text-decoration:none;box-shadow:0 10px 24px rgba(0,0,0,.25)}.cta span{font-size:17px;margin-left:8px}
.trustrow{display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin-top:12px;padding:12px 0 0}.trust{text-align:center;font-size:8px;line-height:1.35;color:rgba(255,255,255,.82);padding:0 6px}.trust+.trust{border-left:1px solid rgba(255,255,255,.32)}.trust-icon{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;margin:0 auto 6px;background:rgba(255,250,240,.88);color:#29241e;font-size:14px}.trust strong{display:block;font-size:10px;color:#fff;margin-bottom:2px}
.continue{display:block;width:100%;border:0;text-align:left;cursor:pointer;position:relative;z-index:2;padding:18px 22px;color:#9a7138;background:var(--cream);font:inherit;font-size:9px;letter-spacing:.16em;text-transform:uppercase;border-bottom:1px solid var(--line)}.continue-panel{position:relative;z-index:2;padding:16px 22px 20px;background:var(--cream);border-bottom:1px solid var(--line)}.continue-panel[hidden]{display:none}.continue-panel label{display:block;margin-bottom:8px;font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}.continue-panel-row{display:flex;gap:8px}.continue-panel input{min-width:0;flex:1;border:1px solid var(--line);border-radius:8px;padding:12px;background:var(--white);font-size:14px}.continue-panel button{border:0;border-radius:8px;padding:0 14px;background:var(--ink);color:#fff;font-size:9px;font-weight:700;letter-spacing:.08em}.continue-error{min-height:16px;margin:7px 0 0;color:#9c3025;font-size:12px}
.privatebar{display:flex;justify-content:space-between;gap:14px;padding:17px 22px 7px;background:var(--cream);font-size:8px;letter-spacing:.09em;text-transform:uppercase;color:var(--ink)}.privatebar span:last-child{font-weight:700;text-align:right}
.glowsection{background:var(--cream);padding:0 18px 18px}.glowvisual{height:295px;position:relative;display:grid;place-items:center}.ring{position:absolute;border:1px solid #d7bd91;border-radius:50%}.r1{width:250px;height:250px}.r2{width:205px;height:205px}.r3{width:160px;height:160px;background:rgba(255,253,249,.65);box-shadow:0 12px 34px rgba(80,60,30,.08)}
.core{width:122px;height:122px;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center;text-align:center;z-index:2;font-family:Georgia,serif;font-size:34px;line-height:.82;box-shadow:0 12px 25px rgba(0,0,0,.12)}.core small{display:block;font:7px Inter,Arial,sans-serif;letter-spacing:.2em;color:#d7b77c;margin-bottom:5px}.core .sub{font:7px Inter,Arial,sans-serif;letter-spacing:.15em;color:#d7b77c;margin-top:9px}
.label{position:absolute;background:rgba(255,253,249,.94);border:1px solid #d7bd91;border-radius:5px;padding:7px 9px;font-size:7px;letter-spacing:.02em;z-index:3}.dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#c59a52;margin-right:6px}.l1{top:18px;right:2px}.l2{top:78px;left:0}.l3{top:126px;right:-1px}.l4{bottom:20px;left:43px}.l5{bottom:72px;left:0}.l6{bottom:52px;right:10px}
.card{margin:6px 0 18px;background:var(--white);border:1px solid var(--line);border-radius:20px;padding:24px 18px 21px;box-shadow:0 3px 18px rgba(70,50,30,.04)}.card-eyebrow{font-size:8px;letter-spacing:.2em;color:var(--gold);text-transform:uppercase;margin-bottom:7px}.card h2{font:400 27px/1.02 Georgia,serif;margin:0 0 21px}.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.step{text-align:center;position:relative}.step:not(:last-child):after{content:"›";position:absolute;right:-4px;top:8px;color:var(--gold);font-size:17px}.icon{width:34px;height:34px;border:1px solid #dcc8a8;border-radius:50%;display:grid;place-items:center;margin:0 auto 8px;font-size:13px;background:#f8f0e3}.step b{display:block;font-size:9px;line-height:1.2;margin-bottom:4px}.step p{margin:0;color:var(--muted);font-size:7px;line-height:1.35}
.bottom{padding:4px 22px 30px;text-align:center;color:var(--muted);font-size:8px;line-height:1.5;background:var(--cream)}
@media(min-width:700px){.app{margin:24px auto;border-radius:18px;box-shadow:0 0 50px rgba(0,0,0,.1)}}
</style>
</head>
<body>
<main class="app">
<section class="hero">
<header class="top"><div><div class="brand">GLOW AI<span class="tm">™</span></div><div class="private" id="landingHeaderMicro">PRIVATE — EST. 2024</div></div><select class="lang" id="languageSelect" aria-label="Language"></select></header>
<div class="hero-copy">
<div class="eyebrow" id="landingEyebrow">YOUR PERSONAL GLOW CHECK</div>
<h1 id="landingHeroTitle">Discover your Glow Profile.<br><em>Start with a simple Glow Check.</em></h1>
<p class="lead" id="landingLead">Take a photo and answer a few questions to see your personalised Glow Profile.</p>
<p class="support" id="landingSupport">Your free Glow Snapshot shows six visible dimensions and your three main priorities.</p>
<a class="cta" id="startV3" href="/app?glow_start=1">START MY FREE GLOW CHECK <span>→</span></a>
<div class="trustrow">
<div class="trust" data-root-trust="0"><div class="trust-icon" aria-hidden="true">▣</div><strong>Free</strong><span>No payment</span></div>
<div class="trust" data-root-trust="1"><div class="trust-icon" aria-hidden="true">✦</div><strong>Personalised</strong><span>Built around you</span></div>
<div class="trust" data-root-trust="2"><div class="trust-icon" aria-hidden="true">ϟ</div><strong>One photo</strong><span>Simple to start</span></div>
</div>
</div>
</section>
<button class="continue" id="landingContinueToggle" type="button" aria-expanded="false" aria-controls="landingContinuePanel">CONTINUE YOUR GLOW JOURNEY →</button>
<div class="continue-panel" id="landingContinuePanel" hidden><label id="landingJourneyLabel" for="landingJourneyId">Glow Journey ID</label><div class="continue-panel-row"><input id="landingJourneyId" type="text" inputmode="text" autocomplete="off" autocapitalize="characters" maxlength="23" placeholder="GJ-XXXXXXXX" aria-describedby="landingJourneyError"><button id="landingContinue" type="button">CONTINUE</button></div><p class="continue-error" id="landingJourneyError" role="alert" aria-live="polite"></p></div>
<div class="privatebar"><span id="landingPrivate">PRIVATE · Processed for your<br>Glow Check</span><span id="landingFree">YOUR GLOW CHECK IS FREE</span></div>
<section class="glowsection">
<div class="glowvisual" aria-label="Six visible Glow dimensions">
<i class="ring r1"></i><i class="ring r2"></i><i class="ring r3"></i>
<div class="core"><div><small id="landingYou">YOUR</small>GLOW<div class="sub" id="landingDims">SIX VISIBLE<br>DIMENSIONS</div></div></div>
<span class="label l1"><span class="dot"></span><span data-dimension="vitality">Overall Vitality</span></span><span class="label l2"><span class="dot"></span><span data-dimension="radiance">Radiance</span></span>
<span class="label l3"><span class="dot"></span><span data-dimension="hydration_appearance">Hydration Appearance</span></span><span class="label l4"><span class="dot"></span><span data-dimension="texture">Texture</span></span>
<span class="label l5"><span class="dot"></span><span data-dimension="under_eye">Under-eye Appearance</span></span><span class="label l6"><span class="dot"></span><span data-dimension="evenness">Evenness</span></span>
</div>
<div class="card"><div class="card-eyebrow" id="landingExperience">THE EXPERIENCE</div><h2 id="landingProcessTitle">Your Glow Check, made simple.</h2>
<div class="steps">
<div class="step"><div class="icon">▣</div><b data-step-title="0">1. Take a photo</b><p data-step-copy="0">Start with a clear, front-facing photo in even natural light.</p></div>
<div class="step"><div class="icon">☷</div><b data-step-title="1">2. Answer a few questions</b><p data-step-copy="1">Tell us a little about your current routine and Glow goals.</p></div>
<div class="step"><div class="icon">✦</div><b data-step-title="2">3. See your Glow Profile</b><p data-step-copy="2">Get a personalised view of your visible Glow and what to focus on next.</p></div>
</div></div>
</section>
<div class="bottom" id="landingFooter">PRIVATE · PERSONAL · VISIBLE</div>
<script src="/i18n.js?v=3"></script>
<script>
(function(){const sid=sessionStorage.getItem('glow_session_id')||crypto.randomUUID();sessionStorage.setItem('glow_session_id',sid);const track=(eventName,properties={})=>fetch('/api/track-event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventName,sessionId:sid,properties:{...properties,variant:'curiosity-v3'}})}).catch(()=>{});track('landing_view',{path:location.pathname});document.getElementById('startV3').addEventListener('click',()=>track('start_glow_check',{source:'curiosity-v3'}));const toggle=document.getElementById('landingContinueToggle'),panel=document.getElementById('landingContinuePanel'),input=document.getElementById('landingJourneyId'),error=document.getElementById('landingJourneyError'),continueButton=document.getElementById('landingContinue');const extras={en:{trust:[['Free','No payment'],['Personalised','Built around you'],['One photo','Simple to start']],you:'YOUR',dims:'SIX VISIBLE<br>DIMENSIONS',error:'Please enter a valid Glow Journey ID (for example, GJ-XXXXXXXX).'},de:{trust:[['Kostenlos','Keine Zahlung'],['Persönlich','Auf Sie abgestimmt'],['Ein Foto','Einfacher Start']],you:'IHR',dims:'SECHS SICHTBARE<br>DIMENSIONEN',error:'Bitte geben Sie eine gültige Glow Journey ID ein (zum Beispiel GJ-XXXXXXXX).'},fr:{trust:[['Gratuit','Sans paiement'],['Personnalisé','Adapté à vous'],['Une photo','Pour commencer']],you:'VOTRE',dims:'SIX DIMENSIONS<br>VISIBLES',error:'Veuillez saisir un identifiant Glow Journey valide (par exemple GJ-XXXXXXXX).'},es:{trust:[['Gratis','Sin pago'],['Personalizado','Pensado para ti'],['Una foto','Un comienzo fácil']],you:'TU',dims:'SEIS DIMENSIONES<br>VISIBLES',error:'Introduce un ID de Glow Journey válido (por ejemplo, GJ-XXXXXXXX).'},pt:{trust:[['Grátis','Sem pagamento'],['Personalizado','Feito para si'],['Uma fotografia','Fácil de começar']],you:'SEU',dims:'SEIS DIMENSÕES<br>VISÍVEIS',error:'Introduza um ID de Glow Journey válido (por exemplo, GJ-XXXXXXXX).'},it:{trust:[['Gratis','Senza pagamento'],['Personalizzato','Creato per te'],['Una foto','Per iniziare']],you:'IL TUO',dims:'SEI DIMENSIONI<br>VISIBILI',error:'Inserisci un ID Glow Journey valido (ad esempio GJ-XXXXXXXX).'}};const t=k=>window.GlowI18n?.t(k)||k;const applyLandingLanguage=lang=>{const x=extras[lang]||extras.en;document.documentElement.lang=lang;document.getElementById('landingHeaderMicro').textContent=t('header.micro');document.getElementById('landingEyebrow').textContent=t('s1.eyebrow');document.getElementById('landingHeroTitle').innerHTML=t('s1.title');document.getElementById('landingLead').textContent=t('s1.lead');document.getElementById('landingSupport').innerHTML=t('s1.profilep');document.getElementById('startV3').innerHTML=t('s1.start');toggle.innerHTML=t('s1.continue');document.getElementById('landingJourneyLabel').textContent=t('s1.journeyLabel');input.placeholder=t('s1.continuePlaceholder');continueButton.innerHTML=t('s1.continueSubmit');document.getElementById('landingPrivate').innerHTML=t('s1.private');document.getElementById('landingFree').innerHTML=t('s1.nosub');document.getElementById('landingYou').textContent=x.you;document.getElementById('landingDims').innerHTML=x.dims;document.getElementById('landingExperience').textContent=t('s1.experience');document.getElementById('landingProcessTitle').textContent=t('s1.howTitle');document.getElementById('landingFooter').textContent=t('s1.footer');document.querySelectorAll('[data-root-trust]').forEach((el,i)=>{el.querySelector('strong').textContent=x.trust[i][0];el.querySelector('span').textContent=x.trust[i][1]});document.querySelectorAll('[data-dimension]').forEach(el=>el.textContent=window.GlowI18n?.dimLabel(el.dataset.dimension)||el.textContent);for(let i=0;i<3;i++){const step=window.GlowI18n?.t('s1.step'+(i+1))||'',copy=window.GlowI18n?.t('s1.step'+(i+1)+'p')||'';document.querySelector('[data-step-title="'+i+'"]').textContent=(i+1)+'. '+step;document.querySelector('[data-step-copy="'+i+'"]').textContent=copy}error.textContent='';error.dataset.message=x.error};if(window.GlowI18n){window.GlowI18n.init();applyLandingLanguage(window.GlowI18n.getLanguage());document.addEventListener('glow-language-changed',e=>applyLandingLanguage(e.detail.language))}const openPanel=()=>{panel.hidden=false;toggle.setAttribute('aria-expanded','true');setTimeout(()=>input.focus(),0)};const continueJourney=()=>{const id=String(input.value||'').trim().toUpperCase();error.textContent='';if(!/^GJ-[A-Z0-9]{8,20}$/.test(id)){error.textContent=error.dataset.message||'Please enter a valid Glow Journey ID.';input.focus();return}location.href='/app?glow15=1&journey_id='+encodeURIComponent(id)};toggle.addEventListener('click',openPanel);continueButton.addEventListener('click',continueJourney);input.addEventListener('keydown',e=>{if(e.key==='Enter')continueJourney()})})();
</script>
</main></body>
</html>`;
  res.send(html);
}