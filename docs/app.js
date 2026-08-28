const STORAGE = "atlas_finance_v5";

const defaultState = {
  data: null,
  finance: {
    income: 0,
    housing: 0,
    fixed: 0,
    essentials: 0,
    debt: 0,
    cashBuffer: 0,
    aggression: 70,
    bufferMonths: 3,
  },
  plan: {
    free: 0,
    invest: 0,
    leisure: 0,
    goals: 0,
    reserve: 0,
    recurring: 0,
    bufferTarget: 0,
    bufferGap: 0,
    monthlyCore: 0,
  },
  investmentBudget: 0,
  btcCap: 35,
  stockCap: 15,
  history: [],
  portfolio: [],
  goals: [],
  fixedItems: [],
  debts: [],
};

function migrateLegacy(){
  for(const key of ["atlas_finance_v3","atlas_finance_v2","atlas_finance_v1"]){
    try{
      const raw = localStorage.getItem(key);
      if(raw && !localStorage.getItem(STORAGE)){
        const old = JSON.parse(raw);
        const migrated = {
          ...defaultState,
          ...old,
          finance:{...defaultState.finance,...(old.finance||{})},
          plan:{...defaultState.plan,...(old.plan||{})},
          history:Array.isArray(old.history)?old.history:[],
          portfolio:[],
          goals:Array.isArray(old.goals)?old.goals:[],
          fixedItems:Array.isArray(old.fixedItems)?old.fixedItems:[],
          debts:Array.isArray(old.debts)?old.debts:[],
        };
        localStorage.setItem(STORAGE, JSON.stringify(migrated));
        break;
      }
    }catch{}
  }
}
migrateLegacy();

function loadState(){
  try{
    const saved = JSON.parse(localStorage.getItem(STORAGE) || "{}");
    return {
      ...defaultState,
      ...saved,
      finance:{...defaultState.finance,...(saved.finance||{})},
      plan:{...defaultState.plan,...(saved.plan||{})},
      history:Array.isArray(saved.history)?saved.history:[],
      portfolio:Array.isArray(saved.portfolio)?saved.portfolio:[],
      goals:Array.isArray(saved.goals)?saved.goals:[],
      fixedItems:Array.isArray(saved.fixedItems)?saved.fixedItems:[],
      debts:Array.isArray(saved.debts)?saved.debts:[],
      data:null,
    };
  }catch{
    return structuredClone(defaultState);
  }
}

const state = loadState();

const eur = new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0});
const eur2 = new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:2});
const pct = v => v == null || Number.isNaN(v) ? "—" : `${(v*100).toFixed(1)}%`;
const n1 = v => v == null || Number.isNaN(v) ? "—" : Number(v).toFixed(1);
const q = s => document.querySelector(s);
const qa = s => [...document.querySelectorAll(s)];
const clamp = (v,min,max) => Math.min(max,Math.max(min,v));
const safe = v => Number.isFinite(Number(v)) ? Math.max(0,Number(v)) : 0;
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`;

function saveState(show=false){
  const payload = {
    finance:state.finance,
    plan:state.plan,
    investmentBudget:state.investmentBudget,
    btcCap:state.btcCap,
    stockCap:state.stockCap,
    history:state.history,
    portfolio:state.portfolio,
    goals:state.goals,
    fixedItems:state.fixedItems,
    debts:state.debts,
  };
  localStorage.setItem(STORAGE,JSON.stringify(payload));
  const saveLabel=q("#saveState");
  if(saveLabel) saveLabel.textContent="Guardado local";
  if(show) toast("Guardado en este dispositivo");
}

let toastTimer;
function toast(text){
  const el=q("#toast");
  el.textContent=text;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove("show"),1600);
}

function aggressionLabel(v){
  if(v<=50) return "Equilibrado";
  if(v<=60) return "Dinámico";
  if(v<=75) return "Agresivo";
  return "Muy agresivo";
}

function syncInputs(){
  const f=state.finance;
  ["income","housing","fixed","essentials","debt","cashBuffer"].forEach(id=>{
    q(`#${id}`).value=f[id]||"";
  });
  q("#aggression").value=f.aggression;
  q("#bufferMonths").value=f.bufferMonths;
  q("#aggressionValue").textContent=aggressionLabel(f.aggression);
  q("#bufferMonthsValue").textContent=f.bufferMonths;
  q("#btcCap").value=state.btcCap;
  q("#stockCap").value=state.stockCap;
  q("#btcCapValue").textContent=`${state.btcCap}%`;
  q("#stockCapValue").textContent=`${state.stockCap}%`;
  q("#investmentBudget").value=state.investmentBudget||"";
}

function readFinanceInputs(){
  ["income","housing","fixed","essentials","debt","cashBuffer"].forEach(id=>{
    state.finance[id]=safe(q(`#${id}`).value);
  });
  state.finance.aggression=safe(q("#aggression").value);
  state.finance.bufferMonths=safe(q("#bufferMonths").value);
}

function monthsUntil(dateStr){
  if(!dateStr) return 0;
  const now=new Date();
  const end=new Date(`${dateStr}T12:00:00`);
  if(Number.isNaN(end.getTime()) || end<=now) return 1;
  const months=(end.getFullYear()-now.getFullYear())*12+(end.getMonth()-now.getMonth());
  return Math.max(1,months);
}

function goalNeedDetails(){
  return state.goals.map(g=>{
    const remaining=Math.max(0,safe(g.target)-safe(g.current));
    const months=monthsUntil(g.date);
    const monthly=months?remaining/months:0;
    return {...g,remaining,months,monthly};
  }).filter(g=>g.remaining>0);
}


function fixedItemsTotal(){
  return state.fixedItems.reduce((s,x)=>s+safe(x.amount),0);
}

function mandatoryDebtPayment(){
  return state.debts.reduce((s,x)=>s+safe(x.payment),0);
}

function totalDebtBalance(){
  return state.debts.reduce((s,x)=>s+safe(x.balance),0);
}

function highInterestDebt(){
  return [...state.debts]
    .filter(x=>safe(x.balance)>0)
    .sort((a,b)=>{
      const aScore=(a.priority==="urgent"?4:0)+safe(a.apr);
      const bScore=(b.priority==="urgent"?4:0)+safe(b.apr);
      return bScore-aScore;
    })[0]||null;
}

function suggestedExtraDebt(freeBeforeAllocation, bufferCoverage){
  const debt=highInterestDebt();
  if(!debt||freeBeforeAllocation<=0) return {amount:0,debt:null};
  const apr=safe(debt.apr);

  let share=0;
  if(debt.priority==="urgent") share=.18;
  if(apr>=10) share=Math.max(share,.28);
  else if(apr>=7) share=Math.max(share,.20);
  else if(apr>=4) share=Math.max(share,.10);

  if(bufferCoverage<1) share=Math.min(share,.08);
  else if(bufferCoverage<state.finance.bufferMonths) share=Math.min(share,.15);

  const amount=Math.min(safe(debt.balance),freeBeforeAllocation*share);
  return {amount,debt};
}

function computePlan(){
  readFinanceInputs();
  const f=state.finance;

  const detailedFixed=fixedItemsTotal();
  const detailedDebtPayment=mandatoryDebtPayment();

  if(state.fixedItems.length){
    f.fixed=detailedFixed;
    q("#fixed").value=Math.round(detailedFixed)||"";
  }
  if(state.debts.length){
    f.debt=detailedDebtPayment;
    q("#debt").value=Math.round(detailedDebtPayment)||"";
  }

  const recurring=f.housing+f.fixed+f.essentials+f.debt;
  const freeBeforeExtraDebt=Math.max(0,f.income-recurring);
  const monthlyCore=Math.max(1,recurring);
  const bufferTarget=monthlyCore*f.bufferMonths;
  const bufferGap=Math.max(0,bufferTarget-f.cashBuffer);
  const bufferCoverage=f.cashBuffer/monthlyCore;

  const extraDebtSuggestion=suggestedExtraDebt(freeBeforeExtraDebt,bufferCoverage);
  const extraDebt=extraDebtSuggestion.amount;
  const free=Math.max(0,freeBeforeExtraDebt-extraDebt);

  const goalDetails=goalNeedDetails();
  const theoreticalGoalNeed=goalDetails.reduce((s,g)=>s+g.monthly,0);
  const highPriorityNeed=goalDetails.filter(g=>Number(g.priority)>=3).reduce((s,g)=>s+g.monthly,0);

  let goalCap;
  if(bufferCoverage<1) goalCap=.10;
  else if(bufferCoverage<f.bufferMonths) goalCap=.20;
  else goalCap=f.aggression>=75?.35:.30;

  // High priority goals can claim a little more after one month of emergency cash is covered.
  if(bufferCoverage>=1 && highPriorityNeed>0) goalCap=Math.min(.45,goalCap+.08);

  const goalsAllocation=Math.min(theoreticalGoalNeed,free*goalCap);
  const flexibleAfterGoals=Math.max(0,free-goalsAllocation);

  let investShare=clamp(f.aggression/100,.40,.85);
  let leisureShare=clamp(.22-((f.aggression-45)/100)*.18,.10,.22);

  if(state.data && state.data.risk_on===false){
    investShare=Math.max(.35,investShare-.10);
  }

  let reserveShare;
  if(bufferCoverage<1){
    reserveShare=.45;
    investShare=Math.min(investShare,.40);
    leisureShare=Math.min(leisureShare,.15);
  }else if(bufferCoverage<f.bufferMonths){
    reserveShare=clamp(.28-bufferCoverage*.035,.16,.28);
    investShare=Math.min(investShare,.62);
  }else{
    reserveShare=Math.max(.05,1-investShare-leisureShare);
  }

  let totalShares=investShare+leisureShare+reserveShare;
  if(totalShares>1){
    investShare/=totalShares;
    leisureShare/=totalShares;
    reserveShare/=totalShares;
  }

  const invest=Math.max(0,flexibleAfterGoals*investShare);
  const leisure=Math.max(0,flexibleAfterGoals*leisureShare);
  const reserve=Math.max(0,flexibleAfterGoals-invest-leisure);

  const previousInvest=state.plan.previousInvest||0;
  state.plan={
    free,invest,leisure,goals:goalsAllocation,reserve,recurring,
    extraDebt,extraDebtName:extraDebtSuggestion.debt?.name||null,
    bufferTarget,bufferGap,monthlyCore,theoreticalGoalNeed,
    previousInvest:Math.round(invest)
  };

  if(!state.investmentBudget || Math.abs(state.investmentBudget-previousInvest)<1){
    state.investmentBudget=Math.round(invest);
  }

  saveState();
  renderBudget();
  renderGoals();
  renderDecisionCenter();
  renderStressTest();
  renderAllocation();
}

function renderBudget(){
  const f=state.finance,p=state.plan,income=f.income;
  const invest=p.invest||0,leisure=p.leisure||0,goals=p.goals||0,reserve=p.reserve||0,extraDebt=p.extraDebt||0;
  const housing=f.housing||0;
  const fixedEssential=(f.fixed||0)+(f.essentials||0)+(f.debt||0);
  const total=Math.max(1,income||(housing+fixedEssential+invest+leisure+goals+reserve));

  q("#heroMonth").textContent=new Intl.DateTimeFormat("es-ES",{month:"long",year:"numeric"}).format(new Date());
  q("#heroFree").textContent=eur.format(p.free||0);
  q("#heroInvest").textContent=eur.format(invest);
  q("#heroLeisure").textContent=eur.format(leisure);
  q("#heroGoals").textContent=eur.format(goals);
  q("#heroReserve").textContent=eur.format(reserve);

  const flexible=Math.max(1,p.free||1);
  const seg=q("#heroFlow").querySelectorAll("span");
  [invest,leisure,goals,reserve].forEach((v,i)=>{if(seg[i]) seg[i].style.width=`${v/flexible*100}%`;});

  const savingRate=income?((invest+goals+reserve+extraDebt)/income)*100:0;
  const housingRate=income?housing/income*100:0;
  q("#savingRate").textContent=`${savingRate.toFixed(0)}%`;
  q("#housingRate").textContent=`${housingRate.toFixed(0)}%`;
  q("#housingHint").textContent=!income?"sin datos":housingRate<=35?"peso contenido":housingRate<=45?"peso elevado":"muy exigente";
  q("#bufferMonthsKpi").textContent=`${f.bufferMonths} ${f.bufferMonths===1?"mes":"meses"}`;

  const coverage=p.monthlyCore?f.cashBuffer/p.monthlyCore:0;
  q("#bufferHint").textContent=income?`${coverage.toFixed(1)} meses cubiertos`:"configurable";

  q("#freeCash").textContent=eur.format(p.free||0);
  q("#recommendedInvest").textContent=eur.format(invest);
  q("#recommendedLeisure").textContent=eur.format(leisure);
  q("#recommendedGoals").textContent=eur.format(goals);
  q("#recommendedReserve").textContent=eur.format(reserve);

  const marginRate=income?p.free/income*100:0;
  q("#planScore").innerHTML=`<small>Margen</small><strong>${marginRate.toFixed(0)}%</strong>`;

  let narrative="Añade tus datos para generar una propuesta.";
  if(income>0){
    if(p.free<=0) narrative="Los gastos introducidos consumen todo el ingreso. Atlas no asigna inversión, ocio ni objetivos hasta recuperar margen.";
    else if(coverage<1) narrative="El colchón cubre menos de un mes de gastos base: la liquidez manda y las metas reciben una aportación limitada.";
    else if(coverage<f.bufferMonths) narrative="Hay margen para invertir y avanzar objetivos, pero el colchón aún está por debajo del nivel configurado.";
    else if(goals>0) narrative="Colchón cubierto: Atlas combina inversión agresiva con aportaciones dirigidas a tus objetivos con fecha.";
    else narrative="Colchón cubierto y sin objetivos exigentes: el perfil agresivo puede dedicar más dinero libre al mercado.";
  }
  q("#planNarrative").textContent=narrative;

  q("#investReason").textContent=
    state.data&&state.data.risk_on===false
      ?"Mercado risk-off: Atlas reduce algo la exposición nueva y conserva más liquidez."
      :coverage<f.bufferMonths
        ?"Se mantiene inversión, pero sin sacrificar la construcción del colchón."
        :"Con el colchón cubierto, el perfil agresivo puede trabajar con más capital.";

  q("#goalReason").textContent=
    state.goals.length
      ?`${state.goals.length} objetivo${state.goals.length===1?"":"s"} activo${state.goals.length===1?"":"s"}; necesidad teórica ${eur.format(p.theoreticalGoalNeed||0)}/mes.`
      :"No hay objetivos con fecha. Añádelos para reservar una parte del dinero libre.";

  q("#reserveReason").textContent=
    p.bufferGap>0
      ?`Faltan aprox. ${eur.format(p.bufferGap)} para completar el colchón configurado.`
      :"Colchón cubierto: esta parte funciona como liquidez táctica e imprevistos.";

  const legendData=[
    ["housing","Vivienda",housing,"var(--housing)"],
    ["fixed","Fijos + esenciales",fixedEssential,"var(--fixed)"],
    ["invest","Inversión",invest,"var(--invest)"],
    ["fixed","Amortización extra",extraDebt,"#ff9a7a"],
    ["leisure","Ocio",leisure,"var(--leisure)"],
    ["goals","Objetivos",goals,"var(--goals)"],
    ["reserve","Reserva",reserve,"var(--reserve)"],
  ];
  q("#budgetLegend").innerHTML=legendData.map(([cls,label,val])=>
    `<div><span class="dot ${cls}"></span><span>${label}</span><strong>${eur.format(val)}</strong></div>`
  ).join("");

  let cursor=0,stops=[];
  legendData.forEach(([, ,val,color])=>{
    const width=Math.max(0,val/total*100);
    stops.push(`${color} ${cursor}% ${cursor+width}%`);
    cursor+=width;
  });
  if(cursor<100) stops.push(`#132238 ${cursor}% 100%`);
  q("#budgetDonut").style.background=`conic-gradient(${stops.join(",")})`;
  q("#investmentBudget").value=state.investmentBudget||"";
}

function priorityText(p){
  return Number(p)>=3?"Alta":Number(p)>=2?"Media":"Baja";
}

function renderGoals(){
  const details=goalNeedDetails();
  const theoretical=details.reduce((s,g)=>s+g.monthly,0);
  q("#goalMonthlyNeed").textContent=`${eur.format(theoretical)} / mes`;
  q("#goalMonthlyHint").textContent=details.length
    ?`${details.length} objetivo${details.length===1?"":"s"} pendiente${details.length===1?"":"s"}`
    :"sin objetivos activos";

  const list=q("#goalsList");
  if(!state.goals.length){
    list.innerHTML=`<div class="empty-state" style="grid-column:1/-1">No hay objetivos guardados.</div>`;
    return;
  }

  list.innerHTML=state.goals.map(g=>{
    const target=Math.max(1,safe(g.target));
    const current=safe(g.current);
    const progress=clamp(current/target*100,0,100);
    const remain=Math.max(0,target-current);
    const months=monthsUntil(g.date);
    const monthly=months?remain/months:0;
    const dateLabel=g.date?new Date(`${g.date}T12:00:00`).toLocaleDateString("es-ES",{month:"short",year:"numeric"}):"sin fecha";
    return `
      <article class="goal-card-item">
        <div class="goal-card-top">
          <div><h4>${escapeHtml(g.name)}</h4><small>${dateLabel}</small></div>
          <button class="icon-btn delete-goal" data-id="${g.id}" title="Eliminar">×</button>
        </div>
        <div class="goal-progress"><i style="width:${progress}%"></i></div>
        <small>${progress.toFixed(0)}% completado · faltan ${eur.format(remain)}</small>
        <div class="goal-meta">
          <div><span>Necesidad / mes</span><strong>${eur.format(monthly)}</strong></div>
          <div><span>Prioridad</span><strong>${priorityText(g.priority)}</strong></div>
        </div>
      </article>`;
  }).join("");

  qa(".delete-goal").forEach(btn=>btn.addEventListener("click",()=>{
    state.goals=state.goals.filter(g=>g.id!==btn.dataset.id);
    saveState();computePlan();toast("Objetivo eliminado");
  }));
}

function addGoal(){
  const name=q("#goalName").value.trim();
  const target=safe(q("#goalTarget").value);
  if(!name||!target){toast("Añade nombre e importe objetivo");return;}
  state.goals.push({
    id:uid(),
    name,
    target,
    current:safe(q("#goalCurrent").value),
    date:q("#goalDate").value,
    priority:Number(q("#goalPriority").value||2),
  });
  ["goalName","goalTarget","goalCurrent","goalDate"].forEach(id=>q(`#${id}`).value="");
  q("#goalPriority").value="2";
  saveState();computePlan();toast("Objetivo añadido");
}

function escapeHtml(s){
  return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function portfolioTotals(){
  const total=state.portfolio.reduce((s,h)=>s+safe(h.value),0);
  const cost=state.portfolio.reduce((s,h)=>s+safe(h.cost),0);
  const pnl=cost>0?total-cost:null;
  const pnlPct=cost>0?pnl/cost:null;
  const byType={};
  const byBroker={};
  state.portfolio.forEach(h=>{
    byType[h.type]=(byType[h.type]||0)+safe(h.value);
    byBroker[h.broker]=(byBroker[h.broker]||0)+safe(h.value);
  });
  const largest=[...state.portfolio].sort((a,b)=>safe(b.value)-safe(a.value))[0]||null;
  return {total,cost,pnl,pnlPct,byType,byBroker,largest};
}

function typeLabel(type){
  return {
    index_proxy:"Fondos / ETFs",
    stock:"Acciones",
    crypto:"Cripto",
    cash:"Efectivo / monetario",
    other:"Otros",
  }[type]||"Otros";
}

function typeColor(type){
  return {
    index_proxy:"var(--housing)",
    stock:"var(--leisure)",
    crypto:"var(--goals)",
    cash:"var(--cash)",
    other:"var(--fixed)",
  }[type]||"var(--fixed)";
}

function renderPortfolio(){
  const t=portfolioTotals();
  q("#portfolioValue").textContent=eur.format(t.total);
  q("#portfolioCount").textContent=`${state.portfolio.length} ${state.portfolio.length===1?"posición":"posiciones"}`;
  q("#portfolioKpi").textContent=eur.format(t.total);
  q("#portfolioKpiHint").textContent=state.portfolio.length?`${state.portfolio.length} posiciones registradas`:"sin posiciones";

  if(t.pnl==null){
    q("#portfolioPnl").textContent="—";
    q("#portfolioPnl").className="";
    q("#portfolioPnlPct").textContent="sin coste registrado";
  }else{
    q("#portfolioPnl").textContent=(t.pnl>=0?"+":"")+eur.format(t.pnl);
    q("#portfolioPnl").className=t.pnl>=0?"pnl-positive":"pnl-negative";
    q("#portfolioPnlPct").textContent=`${t.pnlPct>=0?"+":""}${(t.pnlPct*100).toFixed(1)}%`;
  }

  const concentration=t.total&&t.largest?safe(t.largest.value)/t.total:0;
  q("#portfolioConcentration").textContent=`${(concentration*100).toFixed(0)}%`;
  q("#portfolioLargest").textContent=t.largest?escapeHtml(t.largest.name):"sin posiciones";
  const crypto=t.total?(t.byType.crypto||0)/t.total:0;
  q("#portfolioCrypto").textContent=`${(crypto*100).toFixed(0)}%`;

  q("#portfolioDonutTotal").textContent=eur.format(t.total);
  const entries=Object.entries(t.byType).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  let cursor=0,stops=[];
  entries.forEach(([type,value])=>{
    const width=t.total?value/t.total*100:0;
    stops.push(`${typeColor(type)} ${cursor}% ${cursor+width}%`);
    cursor+=width;
  });
  if(!stops.length) stops.push("#132238 0% 100%");
  q("#portfolioDonut").style.background=`conic-gradient(${stops.join(",")})`;
  q("#portfolioExposureLegend").innerHTML=entries.length?entries.map(([type,value])=>`
    <div>
      <span class="dot" style="background:${typeColor(type)}"></span>
      <span>${typeLabel(type)}</span>
      <strong>${(value/t.total*100).toFixed(0)}%</strong>
    </div>`).join("")
    :`<div><span class="dot invest"></span><span>Sin posiciones</span><strong>—</strong></div>`;

  const list=q("#holdingsList");
  if(!state.portfolio.length){
    list.innerHTML=`<div class="empty-state">Añade tu primera posición para que Atlas ajuste las compras nuevas a tu exposición real.</div>`;
  }else{
    list.innerHTML=[...state.portfolio].sort((a,b)=>safe(b.value)-safe(a.value)).map(h=>{
      const value=safe(h.value),cost=safe(h.cost);
      const pnl=cost?value-cost:null;
      const pnlPct=cost?pnl/cost:null;
      const exposure=t.total?value/t.total:0;
      return `
        <div class="holding-row">
          <div class="holding-icon">${escapeHtml((h.name||"?").slice(0,2).toUpperCase())}</div>
          <div class="holding-main">
            <strong>${escapeHtml(h.name)}</strong>
            <span>${escapeHtml(h.broker)} · ${typeLabel(h.type)}${h.proxySymbol?` · proxy ${escapeHtml(h.proxySymbol)}`:""}</span>
          </div>
          <div class="holding-cell"><small>Valor</small><strong>${eur.format(value)}</strong></div>
          <div class="holding-cell"><small>Peso</small><strong>${(exposure*100).toFixed(1)}%</strong></div>
          <div class="holding-cell"><small>P&amp;L</small><strong class="${pnl==null?"":pnl>=0?"pnl-positive":"pnl-negative"}">${pnl==null?"—":`${pnl>=0?"+":""}${eur.format(pnl)} · ${(pnlPct*100).toFixed(1)}%`}</strong></div>
          <button class="icon-btn delete-holding" data-id="${h.id}" title="Eliminar">×</button>
        </div>`;
    }).join("");
  }

  qa(".delete-holding").forEach(btn=>btn.addEventListener("click",()=>{
    state.portfolio=state.portfolio.filter(h=>h.id!==btn.dataset.id);
    saveState();renderPortfolio();renderAllocation();toast("Posición eliminada");
  }));
}

function refreshProxyOptions(){
  const select=q("#holdingProxy");
  if(!select) return;
  const current=select.value;
  const staticAssets=[
    {symbol:"BTC-USD",name:"Bitcoin"},
    {symbol:"URTH",name:"MSCI World proxy"},
    {symbol:"^NDX",name:"Nasdaq 100"},
    {symbol:"^GSPC",name:"S&P 500"},
    {symbol:"NVDA",name:"NVIDIA"},
    {symbol:"MSFT",name:"Microsoft"},
    {symbol:"GOOGL",name:"Alphabet"},
    {symbol:"AMZN",name:"Amazon"},
    {symbol:"META",name:"Meta"},
    {symbol:"AVGO",name:"Broadcom"},
  ];
  const source=state.data?.assets?.length?state.data.assets:staticAssets;
  const unique=new Map(source.map(a=>[a.symbol,a]));
  select.innerHTML=`<option value="">Sin señal / otro</option>`+[...unique.values()].map(a=>`<option value="${escapeHtml(a.symbol)}">${escapeHtml(a.name)} · ${escapeHtml(a.symbol)}</option>`).join("");
  select.value=[...unique.keys()].includes(current)?current:"";
}

function addHolding(){
  const name=q("#holdingName").value.trim();
  const value=safe(q("#holdingValue").value);
  if(!name||!value){toast("Añade nombre y valor actual");return;}
  state.portfolio.push({
    id:uid(),
    name,
    broker:q("#holdingBroker").value,
    type:q("#holdingType").value,
    proxySymbol:q("#holdingProxy").value,
    value,
    cost:safe(q("#holdingCost").value),
  });
  q("#holdingName").value="";
  q("#holdingValue").value="";
  q("#holdingCost").value="";
  q("#holdingProxy").value="";
  saveState();renderPortfolio();renderAllocation();toast("Posición añadida");
}

function tagClass(score){
  if(score>=65) return "good";
  if(score>=50) return "warn";
  return "bad";
}

function contributionCap(asset){
  if(asset.type==="crypto") return state.btcCap/100;
  if(asset.type==="stock") return state.stockCap/100;
  return asset.max_model_weight??.35;
}

function portfolioCap(asset){
  // Overall post-purchase portfolio limits. These are intentionally looser for diversified funds.
  if(asset.type==="crypto") return Math.max(.25,state.btcCap/100);
  if(asset.type==="stock") return Math.max(.12,Math.min(.22,state.stockCap/100+.05));
  return .55;
}

function currentExposureFor(symbol){
  const total=portfolioTotals().total;
  if(!total) return {value:0,weight:0};
  const value=state.portfolio
    .filter(h=>h.proxySymbol===symbol)
    .reduce((s,h)=>s+safe(h.value),0);
  return {value,weight:value/total};
}

function renderAllocation(){
  const box=q("#allocation");
  const budget=safe(state.investmentBudget);

  if(!state.data||!Array.isArray(state.data.assets)||state.data.assets.length===0){
    box.innerHTML=`<div class="empty-state">Cuando GitHub Actions genere las señales, aquí aparecerá el reparto de inversión.</div>`;
    return;
  }
  if(!budget){
    box.innerHTML=`<div class="empty-state">Introduce un presupuesto de inversión o usa el recomendado del plan mensual.</div>`;
    return;
  }

  const portfolioTotal=portfolioTotals().total;
  const finalPortfolio=portfolioTotal+budget;

  const candidates=state.data.assets
    .filter(a=>a.score>=50)
    .map(a=>{
      const exposure=currentExposureFor(a.symbol);
      const pCap=portfolioCap(a);
      const maxPostValue=pCap*finalPortfolio;
      const roomValue=Math.max(0,maxPostValue-exposure.value);
      const roomWeight=budget?Math.min(1,roomValue/budget):0;
      const diversificationBoost=exposure.weight<.03?1.15:clamp(1-exposure.weight*.9,.65,1);
      return {
        ...a,
        existingValue:exposure.value,
        existingWeight:exposure.weight,
        portfolioCap:pCap,
        roomWeight,
        raw:Math.max(1,a.score-45)*diversificationBoost,
        weight:0,
      };
    })
    .filter(a=>a.roomWeight>.003);

  if(!candidates.length){
    box.innerHTML=`<div class="empty-state">Tus exposiciones actuales y los límites del modelo no dejan espacio para aumentar las señales disponibles. Mantener liquidez es válido.</div>`;
    return;
  }

  let remaining=1;
  for(let pass=0;pass<10&&remaining>.001;pass++){
    const pool=candidates.filter(x=>{
      const maxWeight=Math.min(contributionCap(x),x.roomWeight);
      return x.weight<maxWeight-.0001;
    });
    if(!pool.length) break;
    const rawTotal=pool.reduce((s,x)=>s+x.raw,0);
    let consumed=0;
    pool.forEach(x=>{
      const maxWeight=Math.min(contributionCap(x),x.roomWeight);
      const wanted=remaining*(x.raw/rawTotal);
      const room=maxWeight-x.weight;
      const add=Math.min(wanted,room);
      x.weight+=add;consumed+=add;
    });
    if(consumed<.0001) break;
    remaining-=consumed;
  }

  candidates.sort((a,b)=>b.weight-a.weight);
  const rows=candidates.filter(x=>x.weight>.008).map((x,i)=>{
    const postWeight=finalPortfolio?(x.existingValue+budget*x.weight)/finalPortfolio:0;
    return `
      <div class="alloc-row">
        <div class="alloc-rank">${String(i+1).padStart(2,"0")}</div>
        <div>
          <strong>${escapeHtml(x.name)}</strong>
          <div class="micro">${x.label} · score ${x.score} · ahora ${(x.existingWeight*100).toFixed(1)}% → después ${(postWeight*100).toFixed(1)}%</div>
        </div>
        <div class="alloc-amount">
          <strong>${eur.format(budget*x.weight)}</strong>
          <div class="micro">${(x.weight*100).toFixed(0)}% de la aportación</div>
        </div>
        <div class="alloc-bar"><i style="width:${Math.min(100,x.weight*220)}%"></i></div>
      </div>`;
  }).join("");

  const cash=remaining>.005?`
    <div class="alloc-row">
      <div class="alloc-rank">—</div>
      <div><strong>Liquidez</strong><div class="micro">Capital no asignado por límites, concentración o falta de señales</div></div>
      <div class="alloc-amount"><strong>${eur.format(budget*remaining)}</strong><div class="micro">${(remaining*100).toFixed(0)}%</div></div>
      <div class="alloc-bar"><i style="width:${Math.min(100,remaining*220)}%"></i></div>
    </div>`:"";

  const concentrationWarning=portfolioTotal?`
    <div class="alloc-warning">
      Atlas está usando ${state.portfolio.length} posición${state.portfolio.length===1?"":"es"} existente${state.portfolio.length===1?"":"s"} para calcular el reparto.
      Un activo con score alto puede recibir 0 € si ya pesa demasiado en tu cartera.
    </div>`:"";

  box.innerHTML=concentrationWarning+rows+cash;
}

function renderMarket(){
  if(!state.data||!Array.isArray(state.data.assets)) return;
  const d=state.data;

  if(d.assets.length===0){
    q("#regime").innerHTML=`<span class="pulse"></span>SIN DATOS`;
    q("#cards").innerHTML=`<div class="empty-state" style="grid-column:1/-1">El dashboard está listo. Ejecuta GitHub Actions para cargar las primeras señales de mercado.</div>`;
    q("#ranking").innerHTML=`<tr><td colspan="7" class="loading-row">Pendiente de primera actualización de mercado</td></tr>`;
    q("#updated").textContent="Pendiente de primera actualización";
    computePlan();refreshProxyOptions();return;
  }

  q("#regime").innerHTML=`<span class="pulse"></span>${d.risk_on?"RISK-ON":"RISK-OFF"}`;
  const pulse=q("#regime .pulse");
  pulse.style.background=d.risk_on?"var(--green)":"var(--yellow)";

  if(d.generated_at) q("#updated").textContent=`Actualizado ${new Date(d.generated_at).toLocaleString("es-ES")}`;

  const best=d.assets[0];
  if(best){
    q("#bestSignal").textContent=best.name;
    q("#bestSignalScore").textContent=`score ${best.score} · ${best.label.toLowerCase()}`;
  }

  q("#cards").innerHTML=d.assets.slice(0,6).map(a=>`
    <article class="market-card">
      <div class="card-top">
        <div><div class="asset-name">${escapeHtml(a.name)}</div><div class="symbol">${escapeHtml(a.symbol)}</div></div>
        <div class="score-wrap"><div class="score">${a.score}</div><div class="score-label">score</div></div>
      </div>
      <div class="tag ${tagClass(a.score)}">${a.label}</div>
      <div class="metrics">
        <div><small>RSI</small><strong>${n1(a.metrics?.rsi14)}</strong></div>
        <div><small>DD 52W</small><strong>${pct(a.metrics?.drawdown_52w)}</strong></div>
        <div><small>6M</small><strong>${pct(a.metrics?.return_6m)}</strong></div>
        <div><small>12M</small><strong>${pct(a.metrics?.return_12m)}</strong></div>
      </div>
      <div class="reason">${(a.reasons||[]).slice(0,3).map(escapeHtml).join(" · ")||"Sin detalle adicional"}</div>
    </article>`).join("");

  q("#ranking").innerHTML=d.assets.map(a=>`
    <tr>
      <td><strong>${escapeHtml(a.name)}</strong><div class="micro">${escapeHtml(a.symbol)}</div></td>
      <td><strong>${a.score}</strong></td>
      <td><span class="tag ${tagClass(a.score)}">${a.label}</span></td>
      <td>${n1(a.metrics?.rsi14)}</td>
      <td>${pct(a.metrics?.drawdown_52w)}</td>
      <td>${pct(a.metrics?.return_6m)}</td>
      <td>${pct(a.metrics?.return_12m)}</td>
    </tr>`).join("");

  refreshProxyOptions();
  computePlan();
}


function renderDecisionCenter(){
  const box=q("#decisionActions");
  const status=q("#decisionStatus");
  const p=state.plan;
  const f=state.finance;

  if(!f.income){
    status.textContent="SIN DATOS";
    box.innerHTML=`<div class="decision-empty">Añade tus ingresos y gastos para generar el plan de acción.</div>`;
    return;
  }

  const actions=[];
  const coverage=p.monthlyCore?f.cashBuffer/p.monthlyCore:0;

  if(p.extraDebt>0 && p.extraDebtName){
    actions.push({
      cls:"debt",
      label:"AMORTIZAR DEUDA",
      title:`${eur.format(p.extraDebt)} extra a ${escapeHtml(p.extraDebtName)}`,
      reason:"La TAE/prioridad registrada hace que reducir esa deuda compita con nuevas inversiones."
    });
  }

  if(coverage<1){
    actions.push({
      cls:"warn",label:"PRIORIDAD 1",title:`Subir colchón antes de acelerar`,
      reason:`Ahora cubres ${coverage.toFixed(1)} meses de gastos base. Atlas limita riesgo hasta superar aproximadamente 1 mes.`
    });
  }else if(p.invest>0){
    actions.push({
      cls:"good",label:"INVERSIÓN",title:`Invertir ${eur.format(p.invest)}`,
      reason:state.data?.risk_on===false
        ?"El mercado está risk-off, por eso la cifra ya viene rebajada frente a tu perfil normal."
        :"La cifra respeta colchón, objetivos, deuda y tu perfil de asignación."
    });
  }

  if(p.goals>0){
    actions.push({
      cls:"goal",label:"OBJETIVOS",title:`Reservar ${eur.format(p.goals)}`,
      reason:`Tus metas activas requieren ${eur.format(p.theoreticalGoalNeed||0)} al mes teóricamente; Atlas limita esa presión para no bloquear todo lo demás.`
    });
  }

  if(p.leisure>0){
    actions.push({
      cls:"",label:"OCIO",title:`Presupuesto de ocio ${eur.format(p.leisure)}`,
      reason:"Puedes gastar esta cantidad sin tocar el plan de reserva, objetivos o inversión."
    });
  }

  if(p.reserve>0 && coverage<f.bufferMonths){
    actions.push({
      cls:"warn",label:"RESERVA",title:`Añadir ${eur.format(p.reserve)} a liquidez`,
      reason:`El objetivo configurado es ${f.bufferMonths} meses de gastos base.`
    });
  }

  status.textContent=coverage>=f.bufferMonths?"ESTABLE":coverage>=1?"EN CONSTRUCCIÓN":"PROTEGER LIQUIDEZ";
  box.innerHTML=actions.slice(0,3).map((a,i)=>`
    <article class="decision-action ${a.cls}">
      <span class="rank">0${i+1}</span>
      <small>${a.label}</small>
      <strong>${a.title}</strong>
      <p>${a.reason}</p>
    </article>`).join("");
}

function fixedCategoryLabel(c){
  return {
    subscriptions:"Suscripciones",utilities:"Suministros",transport:"Transporte",
    insurance:"Seguros",health:"Salud / deporte",other:"Otros"
  }[c]||"Otros";
}

function renderFixedItems(){
  const total=fixedItemsTotal();
  q("#fixedItemsTotal").textContent=eur.format(total);
  const list=q("#fixedItemsList");

  if(!state.fixedItems.length){
    list.innerHTML=`<div class="empty-state">Sin gastos detallados.</div>`;
    return;
  }

  list.innerHTML=[...state.fixedItems].sort((a,b)=>safe(a.day)-safe(b.day)).map(x=>`
    <div class="compact-row">
      <div>
        <strong>${escapeHtml(x.name)}</strong>
        <small>${fixedCategoryLabel(x.category)}${x.day?` · día ${x.day}`:""}</small>
      </div>
      <span class="amount">${eur2.format(x.amount)}</span>
      <button class="delete-compact delete-fixed" data-id="${x.id}">×</button>
    </div>`).join("");

  qa(".delete-fixed").forEach(btn=>btn.addEventListener("click",()=>{
    state.fixedItems=state.fixedItems.filter(x=>x.id!==btn.dataset.id);
    saveState();renderFixedItems();computePlan();toast("Gasto eliminado");
  }));
}

function addFixedItem(){
  const name=q("#fixedItemName").value.trim();
  const amount=safe(q("#fixedItemAmount").value);
  if(!name||!amount){toast("Añade concepto e importe");return;}
  state.fixedItems.push({
    id:uid(),name,amount,
    category:q("#fixedItemCategory").value,
    day:clamp(safe(q("#fixedItemDay").value)||1,1,31),
  });
  q("#fixedItemName").value="";
  q("#fixedItemAmount").value="";
  q("#fixedItemDay").value="";
  saveState();renderFixedItems();computePlan();toast("Gasto fijo añadido");
}

function debtRiskLabel(x){
  const apr=safe(x.apr);
  if(x.priority==="urgent"||apr>=8) return {text:"Alta prioridad",cls:"high"};
  if(apr>=4) return {text:"Prioridad media",cls:""};
  return {text:"Coste bajo",cls:""};
}

function renderDebts(){
  q("#debtTotal").textContent=`${eur.format(totalDebtBalance())} pendiente`;
  const list=q("#debtItemsList");

  if(!state.debts.length){
    list.innerHTML=`<div class="empty-state">Sin deudas detalladas.</div>`;
    return;
  }

  list.innerHTML=[...state.debts].sort((a,b)=>safe(b.apr)-safe(a.apr)).map(x=>{
    const risk=debtRiskLabel(x);
    return `
      <div class="compact-row">
        <div>
          <strong>${escapeHtml(x.name)}</strong>
          <small>${eur.format(x.balance)} pendiente · cuota ${eur.format(x.payment)} · TAE ${safe(x.apr).toFixed(1)}%</small>
        </div>
        <span class="tag-mini ${risk.cls}">${risk.text}</span>
        <button class="delete-compact delete-debt" data-id="${x.id}">×</button>
      </div>`;
  }).join("");

  qa(".delete-debt").forEach(btn=>btn.addEventListener("click",()=>{
    state.debts=state.debts.filter(x=>x.id!==btn.dataset.id);
    saveState();renderDebts();computePlan();toast("Deuda eliminada");
  }));
}

function addDebtItem(){
  const name=q("#debtName").value.trim();
  const balance=safe(q("#debtBalance").value);
  const payment=safe(q("#debtPayment").value);
  if(!name||!balance){toast("Añade nombre y saldo pendiente");return;}
  state.debts.push({
    id:uid(),name,balance,payment,
    apr:safe(q("#debtApr").value),
    priority:q("#debtPriority").value,
  });
  ["debtName","debtBalance","debtPayment","debtApr"].forEach(id=>q(`#${id}`).value="");
  q("#debtPriority").value="normal";
  saveState();renderDebts();computePlan();toast("Deuda añadida");
}

function renderStressTest(){
  const f=state.finance,p=state.plan;
  const recurring=p.recurring||0;
  const lowerIncome=f.income*.8;
  const lowerFree=Math.max(0,lowerIncome-recurring);
  const shockFree=Math.max(0,f.income-recurring-500);
  const coverage=p.monthlyCore?f.cashBuffer/p.monthlyCore:0;

  q("#stressIncomeFree").textContent=`${eur.format(lowerFree)} libres`;
  q("#stressShockFree").textContent=`${eur.format(shockFree)} libres`;
  q("#stressBuffer").textContent=coverage.toFixed(1);

  q("#stressIncomeHint").textContent=f.income
    ?(lowerFree>0?"seguirías con margen positivo":"te quedarías sin margen mensual")
    :"añade ingresos para simular";
  q("#stressShockHint").textContent=shockFree>0?"el mes seguiría en positivo":"consumiría todo el margen";
  q("#stressBufferHint").textContent=`objetivo: ${f.bufferMonths} meses`;

  let status="ROJO",hint="colchón o margen insuficiente";
  if(coverage>=f.bufferMonths&&lowerFree>0){status="VERDE";hint="plan resistente al escenario simulado";}
  else if(coverage>=1&&f.income>recurring){status="ÁMBAR";hint="aguanta, pero aún hay margen de mejora";}

  q("#stressStatus").textContent=status;
  q("#stressStatus").style.color=status==="VERDE"?"var(--green)":status==="ÁMBAR"?"var(--yellow)":"var(--red)";
  q("#stressStatusHint").textContent=hint;
}

function renderHistory(){
  const box=q("#monthHistory");
  const items=[...state.history].sort((a,b)=>String(b.month).localeCompare(String(a.month)));
  q("#historyCount").textContent=`${items.length} ${items.length===1?"mes":"meses"}`;
  if(!items.length){
    box.innerHTML=`<div class="empty-state" style="grid-column:1/-1">Aún no has guardado ningún mes.</div>`;
    return;
  }
  box.innerHTML=items.slice(0,8).map(x=>`
    <article class="month-card">
      <div class="month-card-head">
        <div><small>Snapshot</small><h4>${escapeHtml(x.label)}</h4></div>
        <button class="delete-month" data-month="${x.month}" title="Eliminar">×</button>
      </div>
      <div class="month-money">${eur.format(x.income)}</div>
      <small>Ingreso neto</small>
      <div class="month-stats">
        <div><span>Invertir</span><strong>${eur.format(x.invest)}</strong></div>
        <div><span>Objetivos</span><strong>${eur.format(x.goals||0)}</strong></div>
        <div><span>Ocio</span><strong>${eur.format(x.leisure)}</strong></div>
        <div><span>Libre</span><strong>${eur.format(x.free)}</strong></div>
      </div>
    </article>`).join("");
  qa(".delete-month").forEach(btn=>btn.addEventListener("click",()=>{
    state.history=state.history.filter(x=>x.month!==btn.dataset.month);
    saveState();renderHistory();toast("Mes eliminado");
  }));
}

function saveCurrentMonth(){
  computePlan();
  if(!state.finance.income){toast("Introduce primero tus ingresos");return;}
  const now=new Date();
  const month=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const label=new Intl.DateTimeFormat("es-ES",{month:"long",year:"numeric"}).format(now);
  const snapshot={
    month,label,savedAt:now.toISOString(),
    income:state.finance.income,housing:state.finance.housing,
    recurring:state.plan.recurring,free:state.plan.free,
    invest:state.plan.invest,goals:state.plan.goals,
    leisure:state.plan.leisure,reserve:state.plan.reserve,
    cashBuffer:state.finance.cashBuffer,
    portfolioValue:portfolioTotals().total,
  };
  state.history=state.history.filter(x=>x.month!==month);
  state.history.push(snapshot);
  saveState();renderHistory();toast("Mes guardado");
}

function exportData(){
  const payload={
    version:3,
    exportedAt:new Date().toISOString(),
    finance:state.finance,
    history:state.history,
    portfolio:state.portfolio,
    goals:state.goals,
    fixedItems:state.fixedItems,
    debts:state.debts,
    settings:{btcCap:state.btcCap,stockCap:state.stockCap},
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=`atlas-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast("Copia exportada");
}


function importDataFile(file){
  if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const payload=JSON.parse(String(reader.result||"{}"));
      if(!payload || typeof payload!=="object") throw new Error("Formato inválido");

      if(payload.finance) state.finance={...defaultState.finance,...payload.finance};
      if(Array.isArray(payload.history)) state.history=payload.history;
      if(Array.isArray(payload.portfolio)) state.portfolio=payload.portfolio;
      if(Array.isArray(payload.goals)) state.goals=payload.goals;
      if(Array.isArray(payload.fixedItems)) state.fixedItems=payload.fixedItems;
      if(Array.isArray(payload.debts)) state.debts=payload.debts;
      if(payload.settings){
        state.btcCap=safe(payload.settings.btcCap||state.btcCap);
        state.stockCap=safe(payload.settings.stockCap||state.stockCap);
      }

      state.plan={...defaultState.plan};
      state.investmentBudget=0;
      saveState();
      syncInputs();
      renderPortfolio();
      renderFixedItems();
      renderDebts();
      renderHistory();
      refreshProxyOptions();
      computePlan();
      toast("Copia importada");
    }catch(err){
      toast("No se pudo importar la copia");
      console.error(err);
    }finally{
      q("#importDataFile").value="";
    }
  };
  reader.readAsText(file);
}

function bind(){
  ["income","housing","fixed","essentials","debt","cashBuffer"].forEach(id=>{
    q(`#${id}`).addEventListener("input",()=>q("#saveState").textContent="Cambios pendientes");
    q(`#${id}`).addEventListener("change",computePlan);
  });

  q("#aggression").addEventListener("input",e=>{
    state.finance.aggression=safe(e.target.value);
    q("#aggressionValue").textContent=aggressionLabel(state.finance.aggression);
    computePlan();
  });
  q("#bufferMonths").addEventListener("input",e=>{
    state.finance.bufferMonths=safe(e.target.value);
    q("#bufferMonthsValue").textContent=state.finance.bufferMonths;
    computePlan();
  });
  q("#calculatePlan").addEventListener("click",()=>{computePlan();toast("Plan mensual actualizado");});
  q("#saveMonth").addEventListener("click",saveCurrentMonth);
  q("#clearMonth").addEventListener("click",()=>{
    state.finance={...defaultState.finance};
    state.plan={...defaultState.plan};
    state.investmentBudget=0;
    syncInputs();computePlan();toast("Datos del mes reiniciados");
  });

  q("#useRecommended").addEventListener("click",()=>{
    state.investmentBudget=Math.round(state.plan.invest||0);
    q("#investmentBudget").value=state.investmentBudget||"";
    saveState();renderAllocation();toast("Presupuesto de inversión aplicado");
  });
  q("#investmentBudget").addEventListener("change",e=>{
    state.investmentBudget=safe(e.target.value);
    saveState();renderAllocation();
  });
  q("#btcCap").addEventListener("input",e=>{
    state.btcCap=safe(e.target.value);q("#btcCapValue").textContent=`${state.btcCap}%`;
    saveState();renderAllocation();
  });
  q("#stockCap").addEventListener("input",e=>{
    state.stockCap=safe(e.target.value);q("#stockCapValue").textContent=`${state.stockCap}%`;
    saveState();renderAllocation();
  });

  q("#addHolding").addEventListener("click",addHolding);
  q("#addGoal").addEventListener("click",addGoal);
  q("#addFixedItem").addEventListener("click",addFixedItem);
  q("#addDebtItem").addEventListener("click",addDebtItem);
  q("#exportData").addEventListener("click",exportData);
  q("#importData").addEventListener("click",()=>q("#importDataFile").click());
  q("#importDataFile").addEventListener("change",e=>importDataFile(e.target.files?.[0]));
}

syncInputs();
bind();
renderPortfolio();
renderGoals();
renderFixedItems();
renderDebts();
renderHistory();
computePlan();
refreshProxyOptions();

fetch("data/latest.json",{cache:"no-store"})
  .then(r=>{if(!r.ok) throw new Error(`HTTP ${r.status}`);return r.json();})
  .then(d=>{state.data=d;renderMarket();renderAllocation();})
  .catch(err=>{
    q("#regime").innerHTML=`<span class="pulse"></span>SIN DATOS`;
    q("#cards").innerHTML=`<div class="empty-state" style="grid-column:1/-1">Aún no hay señales de mercado. Ejecuta el workflow de GitHub Actions o <code>python src/run.py</code>.</div>`;
    q("#ranking").innerHTML=`<tr><td colspan="7" class="loading-row">Sin datos de mercado: ${escapeHtml(String(err))}</td></tr>`;
  });


let deferredInstallPrompt=null;

window.addEventListener("beforeinstallprompt",event=>{
  event.preventDefault();
  deferredInstallPrompt=event;
  q("#installApp").hidden=false;
});

q("#installApp").addEventListener("click",async()=>{
  if(!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  try{ await deferredInstallPrompt.userChoice; }catch{}
  deferredInstallPrompt=null;
  q("#installApp").hidden=true;
});

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(console.error));
}

function renderBacktest(data){
  const assets=Array.isArray(data?.assets)?data.assets:[];
  if(!assets.length){
    q("#backtestCards").innerHTML=`<div class="empty-state" style="grid-column:1/-1">Ejecuta el workflow mensual de backtesting para generar la primera validación histórica.</div>`;
    q("#backtestTable").innerHTML=`<tr><td colspan="7" class="loading-row">Sin resultados de backtesting.</td></tr>`;
    return;
  }

  if(data.generated_at){
    q("#backtestUpdated").textContent=`Backtest actualizado ${new Date(data.generated_at).toLocaleString("es-ES")}`;
  }

  const ranked=[...assets].sort((a,b)=>(b.validation_score||0)-(a.validation_score||0));
  q("#backtestCards").innerHTML=ranked.slice(0,3).map(a=>{
    const edge=(a.atlas_return||0)-(a.buyhold_return||0);
    const ddImprovement=(a.atlas_max_drawdown||0)-(a.buyhold_max_drawdown||0);
    return `
      <article class="backtest-card">
        <div class="backtest-card-head">
          <div><h4>${escapeHtml(a.name)}</h4><small>${escapeHtml(a.symbol)} · ${escapeHtml(a.start_date)} → ${escapeHtml(a.end_date)}</small></div>
          <span class="status-badge">${Math.round((a.time_in_market||0)*100)}% mercado</span>
        </div>
        <div class="bt-edge ${edge>=0?"positive":"negative"}">${edge>=0?"+":""}${(edge*100).toFixed(1)} pp</div>
        <small>ventaja de rentabilidad acumulada frente a Buy &amp; Hold</small>
        <div class="bt-grid">
          <div><span>Atlas</span><strong>${pct(a.atlas_return)}</strong></div>
          <div><span>Buy &amp; Hold</span><strong>${pct(a.buyhold_return)}</strong></div>
          <div><span>Mejora DD</span><strong>${ddImprovement>=0?"+":""}${(ddImprovement*100).toFixed(1)} pp</strong></div>
        </div>
      </article>`;
  }).join("");

  q("#backtestTable").innerHTML=assets.map(a=>`
    <tr>
      <td><strong>${escapeHtml(a.name)}</strong><div class="micro">${escapeHtml(a.symbol)}</div></td>
      <td><strong>${pct(a.atlas_return)}</strong></td>
      <td>${pct(a.buyhold_return)}</td>
      <td>${pct(a.atlas_max_drawdown)}</td>
      <td>${pct(a.buyhold_max_drawdown)}</td>
      <td>${pct(a.time_in_market)}</td>
      <td>${a.switches??"—"}</td>
    </tr>`).join("");
}

fetch("data/backtest.json",{cache:"no-store"})
  .then(r=>{if(!r.ok) throw new Error(`HTTP ${r.status}`);return r.json();})
  .then(renderBacktest)
  .catch(err=>{
    q("#backtestCards").innerHTML=`<div class="empty-state" style="grid-column:1/-1">Backtest no disponible todavía.</div>`;
    q("#backtestTable").innerHTML=`<tr><td colspan="7" class="loading-row">${escapeHtml(String(err))}</td></tr>`;
  });
