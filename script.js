/* ======= STORAGE (multi-user + session) ======= */
const USERS_KEY = 'nasal-astroUquest-users';      // { [email]: {name, pass, points, done} }
const SESSION_KEY = 'nasal-astroUquest-session';  // { email }

function getUsers(){
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {}; } catch { return {}; }
}
function setUsers(obj){ localStorage.setItem(USERS_KEY, JSON.stringify(obj)); }

function getSession(){
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; } catch { return null; }
}
function setSession(email){ localStorage.setItem(SESSION_KEY, JSON.stringify({email})); }
function clearSession(){ localStorage.removeItem(SESSION_KEY); }

// Backward compatibility
(function migrate(){
  try{
    const oldKey = 'nasal-astroUquest-user';
    const old = JSON.parse(localStorage.getItem(oldKey));
    if(old && old.email){
      const users = getUsers();
      users[old.email] = {name: old.name, pass: old.pass, points: old.points||0, done: !!old.done};
      setUsers(users);
      setSession(old.email);
      localStorage.removeItem(oldKey);
    }
  }catch{}
})();

/* ======= QUIZ STATE ======= */
const QuizState = {
  user:null, email:null, idx:0, answered:false, correctThis:false, pointsPerCorrect:2
};
function levelFromPoints(p){ return 1 + Math.floor((p||0) / 10); }

/* ======= QUESTIONS ======= */
const QUESTIONS = [
  {q:"Em qual planeta nós vivemos?", opts:["Marte","Vênus","Terra","Saturno"], a:2},
  {q:"Qual é a estrela mais próxima da Terra?", opts:["Lua","Sol","Sirius","Júpiter"], a:1},
  {q:"Qual é o satélite natural da Terra?", opts:["Marte","Lua","Vênus","Sol"], a:1},
  {q:"O que usamos para observar os planetas de perto?", opts:["Binóculo","Lupa","Telescópio","Óculos"], a:2},
  {q:"Para onde os astronautas sonham viajar no futuro?", opts:["Vênus","Marte","Netuno","Mercúrio"], a:1},
  {q:"Como se chama o caminho que os planetas fazem ao redor do Sol?", opts:["Círculo Solar","Trajeto Espacial","Órbita","Linha do Tempo"], a:2},
  {q:"O que é uma galáxia?", opts:["Um planeta muito grande","Grupo de estrelas, planetas e poeira","Um foguete","Um tipo de estrela"], a:1},
  {q:"Qual é o nome da nossa galáxia?", opts:["Via Láctea","Andrômeda","Galáxia Vermelha","Estrela Azul"], a:0},
  {q:"Qual é o planeta mais frio do Sistema Solar?", opts:["Urano","Netuno","Saturno","Plutão"], a:0},
  {q:"Como se chama quem estuda os planetas e as estrelas?", opts:["Astrólogo","Meteorologista","Astrônomo","Cientista da Lua"], a:2},
];

/* ======= UI ======= */
const authCard = document.getElementById('authCard');
const dashboard = document.getElementById('dashboard');

const tabSignup = document.getElementById('tabSignup');
const tabLogin  = document.getElementById('tabLogin');
const formSignup= document.getElementById('formSignup');
const formLogin = document.getElementById('formLogin');

const pfName   = document.getElementById('pfName');
const pfPoints = document.getElementById('pfPoints');
const pfLevel  = document.getElementById('pfLevel');
const progressBar = document.getElementById('progressBar');

const quizCard = document.getElementById('quizCard');
const qTitle   = document.getElementById('qTitle');
const options  = document.getElementById('options');
const feedback = document.getElementById('feedback');
const counter  = document.getElementById('counter');
const btnNext  = document.getElementById('btnNext');

const certWrap = document.getElementById('certWrap');
const winnerName = document.getElementById('winnerName');
const btnCert  = document.getElementById('btnCert');
const certCanvas = document.getElementById('certCanvas');
const dlLink   = document.getElementById('dlLink');

const btnReset = document.getElementById('btnReset');
const btnLogout= document.getElementById('btnLogout');

/* ======= AUTH TABS ======= */
tabSignup.addEventListener('click',()=>switchTab('su'));
tabLogin.addEventListener('click',()=>switchTab('li'));
function switchTab(kind){
  if(kind==='su'){
    tabSignup.classList.add('active'); tabLogin.classList.remove('active');
    formSignup.style.display='grid'; formLogin.style.display='none';
  }else{
    tabLogin.classList.add('active'); tabSignup.classList.remove('active');
    formLogin.style.display='grid'; formSignup.style.display='none';
  }
}

/* ======= SIGNUP ======= */
formSignup.addEventListener('submit', (e)=>{
  e.preventDefault();
  const name = document.getElementById('suName').value.trim();
  const email= document.getElementById('suEmail').value.trim().toLowerCase();
  const pass = document.getElementById('suPass').value.trim();
  if(!email || !pass || !name){ return alert('Preencha todos os campos.'); }
  const users = getUsers();
  users[email] = users[email] ? {...users[email], name, pass} : {name, pass, points:0, done:false};
  setUsers(users); setSession(email); startSession(email);
});

/* ======= LOGIN ======= */
formLogin.addEventListener('submit', (e)=>{
  e.preventDefault();
  const email= document.getElementById('liEmail').value.trim().toLowerCase();
  const pass = document.getElementById('liPass').value.trim();
  const users = getUsers(); const u = users[email];
  if(u && u.pass === pass){ setSession(email); startSession(email); }
  else alert('E-mail ou senha incorretos. Se preferir, recrie a conta na aba "Criar conta".');
});

/* ======= SESSION ======= */
function startSession(email){
  const users = getUsers(); const u = users[email];
  if(!u){ clearSession(); return; }
  QuizState.user = u; QuizState.email = email;
  authCard.style.display='none'; dashboard.style.display='grid';
  pfName.textContent = u.name; updateHUD();
  if(u.done){ showCertificateArea(); } else { showQuestion(QuizState.idx); }
}
function persistUser(){
  const users = getUsers(); if(QuizState.email){ users[QuizState.email] = QuizState.user; setUsers(users); }
}
function updateHUD(){
  const points = QuizState.user.points||0;
  pfPoints.textContent = points;
  pfLevel.textContent = levelFromPoints(points);
  const prog = Math.round((QuizState.idx/QUESTIONS.length)*100);
  progressBar.style.width = prog + '%';
  counter.textContent = `Questão ${Math.min(QuizState.idx+1, QUESTIONS.length)} / ${QUESTIONS.length}`;
}
btnLogout.addEventListener('click', ()=>{ clearSession(); location.reload(); });
btnReset.addEventListener('click', ()=>{
  if(!confirm('Resetar progresso e pontuação?')) return;
  QuizState.user.points = 0; QuizState.user.done = false; QuizState.idx = 0;
  persistUser(); certWrap.style.display='none'; quizCard.style.display='block'; showQuestion(0); updateHUD();
});

/* ======= QUIZ FLOW ======= */
function showQuestion(i){
  if(i>=QUESTIONS.length){ finishQuiz(); return; }
  const {q,opts,a} = QUESTIONS[i];
  QuizState.answered = false; QuizState.correctThis = false;
  btnNext.disabled = true; feedback.textContent = ''; feedback.className = 'feedback';
  qTitle.textContent = q; options.innerHTML = '';
  opts.forEach((text,idx)=>{
    const b = document.createElement('button'); b.className = 'opt'; b.type='button'; b.textContent = text;
    b.addEventListener('click', ()=>{
      if(QuizState.answered) return;
      QuizState.answered = true;
      const correct = idx===a; QuizState.correctThis = correct;
      if(correct){
        b.classList.add('correct'); feedback.textContent = 'Acertou! +2 pontos ✨'; feedback.classList.add('ok');
        QuizState.user.points = (QuizState.user.points||0) + QuizState.pointsPerCorrect; persistUser();
      }else{
        b.classList.add('wrong'); feedback.textContent = 'Ops! Tente a próxima. 💫'; feedback.classList.add('no');
        [...options.children][a].classList.add('correct');
      }
      btnNext.disabled = false; updateHUD();
    });
    options.appendChild(b);
  });
  updateHUD();
}
btnNext.addEventListener('click', ()=>{ QuizState.idx++; persistUser(); showQuestion(QuizState.idx); });

function finishQuiz(){ QuizState.user.done = true; persistUser(); showCertificateArea(); }
function showCertificateArea(){ quizCard.style.display='none'; certWrap.style.display='block'; winnerName.textContent = QuizState.user.name || 'Explorador'; }

/* ======= CERTIFICATE ======= */
btnCert.addEventListener('click', drawCertificate);

async function drawCertificate(){
  const c = certCanvas;
  const ctx = c.getContext('2d');
  // background
  ctx.fillStyle = '#0b1226'; ctx.fillRect(0,0,c.width,c.height);
  // stars
  for(let i=0;i<200;i++){
    ctx.fillStyle = 'rgba(255,255,255,'+(0.1+Math.random()*0.8)+')';
    const x = Math.random()*c.width, y = Math.random()*c.height; const r = Math.random()*1.6;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  }
  // ring
  const grd = ctx.createLinearGradient(0,0,c.width,0);
  grd.addColorStop(0,'#2ce38f'); grd.addColorStop(1,'#8ad6ff');
  ctx.strokeStyle = grd; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.ellipse(c.width/2, c.height/2, 480, 160, -0.35, 0, Math.PI*2); ctx.stroke();

  // title + brand
  ctx.fillStyle = '#e9f0ff'; ctx.textAlign='center';
  ctx.font = 'bold 56px system-ui, Arial'; ctx.fillText('CERTIFICADO ASTROUQUEST', c.width/2, 150);
  ctx.font = '600 28px system-ui, Arial'; ctx.fillStyle = '#9bb0d3';
  ctx.fillText('Emitido por AstroUQuest • NASAltura', c.width/2, 195);

  // name panel
  ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.strokeStyle = 'rgba(255,255,255,.18)';
  roundRect(ctx, 160, 250, c.width-320, 120, 18, true, true);
  ctx.fillStyle = '#e9f0ff'; ctx.font = '800 44px system-ui, Arial';
  ctx.fillText((QuizState.user?.name||'Explorador Espacial'), c.width/2, 320);

  // points / level
  ctx.font = '600 24px system-ui, Arial'; ctx.fillStyle = '#8ad6ff';
  const pts = QuizState.user?.points || 0; const lvl = levelFromPoints(pts);
  ctx.fillText(`Pontuação: ${pts} • Nível ${lvl}`, c.width/2, 360);

  // event line
  ctx.font = '600 22px system-ui, Arial'; ctx.fillStyle = '#ffd166';
  ctx.fillText('NASA Space Uberlândia 2025 — Equipe NASAltura', c.width/2, 430);

  // signature area
  const sigX = 180, sigY = 480, sigW = 500, sigH = 140;
  ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.strokeStyle = 'rgba(255,255,255,.25)';
  roundRect(ctx, sigX, sigY, sigW, sigH, 12, true, true);
  ctx.fillStyle = '#9bb0d3'; ctx.font = '600 18px system-ui, Arial'; ctx.textAlign='left';
  ctx.fillText('Assinatura', sigX + 16, sigY + 28);

  // signature line
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(sigX + 30, sigY + sigH - 35); ctx.lineTo(sigX + sigW - 30, sigY + sigH - 35); ctx.stroke();
  ctx.fillStyle = '#9bb0d3'; ctx.font = '500 16px system-ui, Arial';
  ctx.fillText('Responsável AstroUQuest • NASAltura', sigX + 16, sigY + sigH - 12);

  // signature image (optional) — file: assinatura.png
  try{
    const sig = await loadImage('assinatura.png');
    const maxW = sigW - 80, maxH = sigH - 80;
    // scale keeping aspect ratio
    let w = sig.width, h = sig.height;
    const ratio = Math.min(maxW / w, maxH / h);
    w = w * ratio; h = h * ratio;
    const sx = sigX + (sigW - w)/2;
    const sy = sigY + (sigH - h)/2 - 6; // a little up from the line
    ctx.globalAlpha = 0.9;
    ctx.drawImage(sig, sx, sy, w, h);
    ctx.globalAlpha = 1;
  }catch(e){ /* if not found, ignore */ }

  // logo (optional)
  try{
    const img = await loadImage(document.querySelector('header img.logo').src);
    const w=120,h=120; ctx.globalAlpha=.95; ctx.drawImage(img, c.width - w - 80, sigY, w, h); ctx.globalAlpha=1;
  }catch(e){}

  // footer
  ctx.textAlign='center'; ctx.fillStyle = '#9bb0d3';
  ctx.font = '600 18px system-ui, Arial'; ctx.fillText('Desenvolvido por NASAltura • 2025', c.width/2, 700);
  ctx.font = '500 16px system-ui, Arial';
  ctx.fillText('Anajara Lucas • Isabela Vieira Carvalho • Isadora Rodrigues Rezende', c.width/2, 728);

  const url = c.toDataURL('image/png'); dlLink.href = url; dlLink.style.display='inline-flex';
}

/* helpers */
function roundRect(ctx, x, y, w, h, r, fill, stroke){
  if (w < 2*r) r = w/2; if (h < 2*r) r = h/2;
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y,   x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x,   y+h, r);
  ctx.arcTo(x,   y+h, x,   y,   r);
  ctx.arcTo(x,   y,   x+w, y,   r);
  if (fill) ctx.fill(); if (stroke) ctx.stroke();
}
function loadImage(src){
  return new Promise((res,rej)=>{ const i = new Image(); i.crossOrigin='anonymous'; i.onload=()=>res(i); i.onerror=(e)=>rej(e); i.src=src; });
}

/* ======= BOOT ======= */
(function init(){
  const session = getSession(); if(session && session.email){ startSession(session.email); }
})();
