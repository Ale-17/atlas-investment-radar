(function(){
  "use strict";

  if(typeof state === "undefined" || typeof computePlan !== "function"){
    console.warn("Atlas Payday: core not ready");
    return;
  }

  const PROFILE_KEY="atlas_payday_profile_v1";
  let session=null;
  let step=1;

  const $=sel=>document.querySelector(sel);
  const fmt=v=>eur.format(Number(v)||0);
  const num=v=>Number.isFinite(Number(v))?Math.max(0,Number(v)):0;

  function loadProfile(){
    try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||"{}");}
    catch{return {};}
  }

  function saveProfile(data){
    localStorage.setItem(PROFILE_KEY,JSON.stringify(data));
  }

  function injectStyles(){
    if($("#atlasPaydayStyles")) return;
    const style=document.createElement("style");
    style.id="atlasPaydayStyles";
    style.textContent=`
      .payday-launch{
        position:relative;overflow:hidden;border:1px solid rgba(117,245,196,.34)!important;
        background:linear-gradient(135deg,#66e6b7 0%,#8ea8ff 100%)!important;color:#07131c!important;
        box-shadow:0 12px 34px rgba(102,230,183,.16);font-weight:950!important
      }
      .payday-launch:before{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 20%,rgba(255,255,255,.32),transparent 78%);transform:translateX(-120%);transition:.55s}
      .payday-launch:hover:before{transform:translateX(120%)}
      .payday-mini{border-color:rgba(102,230,183,.24)!important;color:#9df0cf!important}
      .payday-backdrop{position:fixed;inset:0;z-index:200;background:rgba(2,7,13,.78);backdrop-filter:blur(15px);display:grid;place-items:center;padding:18px;animation:pdFade .18s ease}
      .payday-modal{width:min(720px,100%);max-height:min(880px,92vh);overflow:auto;border:1px solid rgba(148,163,184,.16);border-radius:28px;background:linear-gradient(180deg,#0c1929 0%,#07111e 100%);box-shadow:0 35px 100px rgba(0,0,0,.62);position:relative}
      .payday-head{padding:22px 22px 16px;border-bottom:1px solid rgba(148,163,184,.10);display:flex;align-items:flex-start;justify-content:space-between;gap:16px;position:sticky;top:0;background:rgba(10,23,39,.94);backdrop-filter:blur(14px);z-index:2}
      .payday-head small{display:block;color:#66e6b7;font-size:9px;font-weight:900;letter-spacing:.12em}
      .payday-head h2{font-size:25px;line-height:1.05;margin:5px 0 5px;letter-spacing:-.045em}
      .payday-head p{margin:0;color:#72849b;font-size:10px;line-height:1.45}
      .payday-close{width:34px;height:34px;border-radius:50%;border:1px solid rgba(148,163,184,.14);background:#0a1625;color:#8294aa;font-size:18px;cursor:pointer}
      .payday-progress{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;padding:16px 22px 0}
      .payday-progress span{height:4px;border-radius:99px;background:#16263a;transition:.25s}
      .payday-progress span.on{background:linear-gradient(90deg,#66e6b7,#8ea8ff)}
      .payday-body{padding:22px}
      .payday-step{display:none}.payday-step.active{display:block;animation:pdSlide .22s ease}
      .payday-title{margin-bottom:18px}.payday-title small{color:#657890;font-size:9px;font-weight:850;letter-spacing:.08em}.payday-title h3{font-size:20px;margin:5px 0}.payday-title p{margin:0;color:#71839a;font-size:10px;line-height:1.5}
      .payday-field-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .payday-field{display:block}.payday-field>span{display:block;color:#8a9bb0;font-size:9px;margin:0 0 6px}
      .payday-input{height:54px;border:1px solid rgba(148,163,184,.13);border-radius:15px;background:#071321;display:flex;align-items:center;padding:0 13px;gap:8px}
      .payday-input b{font-size:12px;color:#70839b}.payday-input input{min-width:0;width:100%;border:0;background:transparent;color:white;font-size:17px;font-weight:800;outline:0}
      .payday-input:focus-within{border-color:rgba(142,168,255,.52);box-shadow:0 0 0 4px rgba(142,168,255,.07)}
      .payday-helper{margin-top:13px;padding:12px 13px;border:1px solid rgba(148,163,184,.09);border-radius:14px;background:rgba(5,13,23,.5);display:flex;gap:10px;align-items:flex-start}
      .payday-helper i{font-style:normal;color:#66e6b7}.payday-helper p{margin:0;color:#71839a;font-size:9px;line-height:1.55}
      .payday-known{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:14px 0}
      .payday-known div{border:1px solid rgba(148,163,184,.09);background:rgba(5,13,23,.45);padding:11px 12px;border-radius:13px}
      .payday-known span{display:block;color:#657890;font-size:8px;text-transform:uppercase;letter-spacing:.08em}.payday-known strong{display:block;font-size:13px;margin-top:4px}
      .payday-actions{display:flex;justify-content:space-between;gap:8px;margin-top:22px}
      .payday-actions .btn{min-width:120px;justify-content:center}
      .payday-result-hero{border:1px solid rgba(102,230,183,.15);background:linear-gradient(135deg,rgba(102,230,183,.07),rgba(142,168,255,.06));border-radius:19px;padding:17px;margin-bottom:12px}
      .payday-result-top{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}
      .payday-result-top small{display:block;color:#6e8198;font-size:8px;letter-spacing:.09em}.payday-result-top strong{display:block;font-size:30px;margin-top:4px;letter-spacing:-.055em}
      .payday-regime{font-size:8px;font-weight:900;border:1px solid rgba(102,230,183,.2);color:#8fecc9;padding:5px 7px;border-radius:99px}
      .payday-result-copy{color:#788aa0;font-size:10px;line-height:1.5;margin-top:10px}
      .payday-split{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
      .payday-split article{padding:13px;border-radius:15px;border:1px solid rgba(148,163,184,.09);background:rgba(5,13,23,.52)}
      .payday-split small{display:block;color:#657890;font-size:8px;letter-spacing:.08em}.payday-split strong{display:block;font-size:18px;margin:5px 0 3px}.payday-split p{margin:0;color:#60738b;font-size:8px;line-height:1.4}
      .payday-split .invest strong{color:#8ea8ff}.payday-split .leisure strong{color:#f5c16c}.payday-split .goals strong{color:#ffb86b}.payday-split .reserve strong{color:#66e6b7}.payday-split .debt strong{color:#ff9a7a}
      .payday-transfer{margin-top:12px;padding:13px;border-radius:15px;background:#06111d;border:1px dashed rgba(148,163,184,.15);color:#71849a;font-size:9px;line-height:1.55}
      .payday-transfer strong{color:#c7d4e8}
      .payday-success{display:none;position:absolute;inset:0;z-index:4;background:linear-gradient(180deg,rgba(8,20,33,.98),rgba(5,13,23,.99));place-items:center;text-align:center;padding:30px}
      .payday-success.show{display:grid}.payday-success-mark{width:66px;height:66px;border-radius:50%;display:grid;place-items:center;margin:0 auto 15px;background:rgba(102,230,183,.10);border:1px solid rgba(102,230,183,.22);color:#66e6b7;font-size:28px}
      .payday-success h3{font-size:24px;margin:0 0 7px}.payday-success p{margin:0;color:#71849a;font-size:10px;line-height:1.6;max-width:420px}
      .payday-success .btn{margin-top:20px}
      @keyframes pdFade{from{opacity:0}to{opacity:1}}@keyframes pdSlide{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
      @media(max-width:680px){
        .payday-backdrop{padding:0;place-items:end center}
        .payday-modal{width:100%;max-height:94vh;border-radius:27px 27px 0 0;border-bottom:0}
        .payday-head{padding:18px 17px 14px}.payday-body{padding:18px 17px 26px}.payday-progress{padding:13px 17px 0}
        .payday-field-grid{grid-template-columns:1fr}.payday-known{grid-template-columns:1fr 1fr}
        .payday-actions{position:sticky;bottom:-26px;background:linear-gradient(180deg,rgba(7,17,30,0),#07111e 24%);padding:22px 0 4px}
        .payday-actions .btn{flex:1}
      }
    `;
    document.head.appendChild(style);
  }

  function injectLaunchers(){
    const hero=$(".hero-actions");
    if(hero && !$("#openPayday")){
      const btn=document.createElement("button");
      btn.id="openPayday";
      btn.type="button";
      btn.className="btn primary payday-launch";
      btn.innerHTML="<span>✓</span> He cobrado";
      hero.prepend(btn);
      btn.addEventListener("click",openPayday);
    }

    const sectionActions=$("#presupuesto .section-actions");
    if(sectionActions && !$("#openPaydayMini")){
      const btn=document.createElement("button");
      btn.id="openPaydayMini";
      btn.type="button";
      btn.className="btn ghost small payday-mini";
      btn.textContent="He cobrado";
      sectionActions.prepend(btn);
      btn.addEventListener("click",openPayday);
    }
  }

  function buildModal(){
    if($("#paydayBackdrop")) return;
    const wrap=document.createElement("div");
    wrap.id="paydayBackdrop";
    wrap.className="payday-backdrop";
    wrap.hidden=true;
    wrap.innerHTML=`
      <section class="payday-modal" role="dialog" aria-modal="true" aria-labelledby="paydayHeading">
        <div class="payday-head">
          <div>
            <small>ATLAS · PAYDAY</small>
            <h2 id="paydayHeading">He cobrado</h2>
            <p>Un minuto para decidir qué hacer con el dinero de este mes.</p>
          </div>
          <button type="button" class="payday-close" id="paydayClose" aria-label="Cerrar">×</button>
        </div>
        <div class="payday-progress"><span></span><span></span><span></span></div>
        <div class="payday-body">
          <div class="payday-step" data-step="1">
            <div class="payday-title">
              <small>PASO 1 DE 3 · ENTRADAS</small>
              <h3>¿Cuánto ha entrado este mes?</h3>
              <p>Separamos nómina e ingresos extra para que el mes siguiente no arrastre algo excepcional.</p>
            </div>
            <div class="payday-field-grid">
              <label class="payday-field"><span>Nómina / ingreso principal neto</span><div class="payday-input"><b>€</b><input id="pdSalary" inputmode="decimal" type="number" min="0" step="10"></div></label>
              <label class="payday-field"><span>Ingresos extra este mes</span><div class="payday-input"><b>€</b><input id="pdExtraIncome" inputmode="decimal" type="number" min="0" step="10" placeholder="0"></div></label>
            </div>
            <div class="payday-helper"><i>●</i><p>Atlas usará la suma como ingreso mensual. Los extras no se guardan como “nómina habitual”.</p></div>
            <div class="payday-actions"><span></span><button type="button" class="btn primary" id="pdNext1">Continuar</button></div>
          </div>

          <div class="payday-step" data-step="2">
            <div class="payday-title">
              <small>PASO 2 DE 3 · ESTE MES</small>
              <h3>¿Ha cambiado algo?</h3>
              <p>Los gastos fijos y cuotas que ya tengas registrados se reutilizan automáticamente.</p>
            </div>
            <div class="payday-known">
              <div><span>Fijos detectados</span><strong id="pdKnownFixed">0 €</strong></div>
              <div><span>Cuotas de deuda</span><strong id="pdKnownDebt">0 €</strong></div>
            </div>
            <div class="payday-field-grid">
              <label class="payday-field"><span>Alquiler / hipoteca</span><div class="payday-input"><b>€</b><input id="pdHousing" inputmode="decimal" type="number" min="0" step="10"></div></label>
              <label class="payday-field"><span>Esenciales variables previstos</span><div class="payday-input"><b>€</b><input id="pdEssentials" inputmode="decimal" type="number" min="0" step="10"></div></label>
              <label class="payday-field"><span>Gasto extraordinario este mes</span><div class="payday-input"><b>€</b><input id="pdOneOff" inputmode="decimal" type="number" min="0" step="10" placeholder="0"></div></label>
              <label class="payday-field"><span>Colchón líquido que tienes hoy</span><div class="payday-input"><b>€</b><input id="pdBuffer" inputmode="decimal" type="number" min="0" step="50"></div></label>
            </div>
            <div class="payday-helper"><i>●</i><p>El gasto extraordinario solo afecta a este mes. En el siguiente cobro Atlas volverá a tu previsión normal de esenciales.</p></div>
            <div class="payday-actions"><button type="button" class="btn ghost" id="pdBack2">Atrás</button><button type="button" class="btn primary" id="pdPreview">Calcular reparto</button></div>
          </div>

          <div class="payday-step" data-step="3">
            <div class="payday-title">
              <small>PASO 3 DE 3 · DECISIÓN</small>
              <h3>Tu plan al cobrar</h3>
              <p>Esto es una propuesta. Atlas no mueve dinero ni ejecuta ninguna inversión.</p>
            </div>
            <div id="pdResult"></div>
            <div class="payday-actions"><button type="button" class="btn ghost" id="pdBack3">Ajustar</button><button type="button" class="btn primary payday-launch" id="pdConfirm">Aplicar y guardar mes</button></div>
          </div>
        </div>

        <div class="payday-success" id="pdSuccess">
          <div>
            <div class="payday-success-mark">✓</div>
            <h3>Mes organizado</h3>
            <p id="pdSuccessText">El plan se ha guardado en este dispositivo.</p>
            <button type="button" class="btn primary" id="pdFinish">Ver mi plan</button>
          </div>
        </div>
      </section>
    `;
    document.body.appendChild(wrap);

    $("#paydayClose").addEventListener("click",()=>closePayday(false));
    wrap.addEventListener("click",e=>{if(e.target===wrap) closePayday(false);});
    $("#pdNext1").addEventListener("click",()=>{
      if(num($("#pdSalary").value)+num($("#pdExtraIncome").value)<=0){
        toast("Introduce lo que has cobrado");
        $("#pdSalary").focus();
        return;
      }
      showStep(2);
    });
    $("#pdBack2").addEventListener("click",()=>showStep(1));
    $("#pdPreview").addEventListener("click",previewPlan);
    $("#pdBack3").addEventListener("click",()=>showStep(2));
    $("#pdConfirm").addEventListener("click",confirmPlan);
    $("#pdFinish").addEventListener("click",()=>{
      closePayday(true);
      document.querySelector(".decision-center")?.scrollIntoView({behavior:"smooth",block:"start"});
    });
  }

  function currentBaseline(){
    const profile=loadProfile();
    return {
      salary:num(profile.salary ?? state.finance.income),
      housing:num(profile.housing ?? state.finance.housing),
      essentials:num(profile.essentials ?? state.finance.essentials),
      buffer:num(state.finance.cashBuffer)
    };
  }

  function openPayday(){
    const backdrop=$("#paydayBackdrop");
    if(!backdrop) return;
    const base=currentBaseline();
    session={
      originalFinance:{...state.finance},
      previewApplied:false,
      finalized:false,
      baseline:base
    };

    $("#pdSalary").value=base.salary||"";
    $("#pdExtraIncome").value="";
    $("#pdHousing").value=base.housing||"";
    $("#pdEssentials").value=base.essentials||"";
    $("#pdOneOff").value="";
    $("#pdBuffer").value=base.buffer||"";

    const fixed=state.fixedItems.length?fixedItemsTotal():num(state.finance.fixed);
    const debt=state.debts.length?mandatoryDebtPayment():num(state.finance.debt);
    $("#pdKnownFixed").textContent=fmt(fixed);
    $("#pdKnownDebt").textContent=fmt(debt);
    $("#pdSuccess").classList.remove("show");
    backdrop.hidden=false;
    document.body.style.overflow="hidden";
    showStep(1);
    setTimeout(()=>$("#pdSalary")?.focus(),80);
  }

  function restoreOriginal(){
    if(!session?.previewApplied || session.finalized) return;
    state.finance={...session.originalFinance};
    syncInputs();
    computePlan();
    session.previewApplied=false;
  }

  function closePayday(keep){
    if(!keep) restoreOriginal();
    $("#paydayBackdrop").hidden=true;
    document.body.style.overflow="";
    session=null;
  }

  function showStep(next){
    step=next;
    document.querySelectorAll(".payday-step").forEach(el=>el.classList.toggle("active",Number(el.dataset.step)===step));
    document.querySelectorAll(".payday-progress span").forEach((el,i)=>el.classList.toggle("on",i<step));
    $(".payday-modal")?.scrollTo({top:0,behavior:"smooth"});
  }

  function applyFormToFinance(){
    const salary=num($("#pdSalary").value);
    const extra=num($("#pdExtraIncome").value);
    const housing=num($("#pdHousing").value);
    const essentials=num($("#pdEssentials").value);
    const oneOff=num($("#pdOneOff").value);
    const buffer=num($("#pdBuffer").value);

    state.finance.income=salary+extra;
    state.finance.housing=housing;
    state.finance.essentials=essentials+oneOff;
    state.finance.cashBuffer=buffer;

    $("#income").value=state.finance.income||"";
    $("#housing").value=housing||"";
    $("#essentials").value=state.finance.essentials||"";
    $("#cashBuffer").value=buffer||"";

    return {salary,extra,housing,essentials,oneOff,buffer};
  }

  function previewPlan(){
    const total=num($("#pdSalary").value)+num($("#pdExtraIncome").value);
    if(total<=0){toast("Introduce lo que has cobrado");showStep(1);return;}

    if(session?.previewApplied){
      state.finance={...session.originalFinance};
      syncInputs();
    }

    const form=applyFormToFinance();
    computePlan();
    session.previewApplied=true;
    session.form=form;

    const p=state.plan;
    const recurring=num(p.recurring);
    const regime=state.data?.risk_on===false?"RISK-OFF":state.data?.risk_on===true?"RISK-ON":"MERCADO —";
    const coverage=p.monthlyCore?state.finance.cashBuffer/p.monthlyCore:0;
    const transferNow=num(p.invest)+num(p.goals)+num(p.reserve)+num(p.extraDebt);

    const debtCard=p.extraDebt>0?`
      <article class="debt">
        <small>AMORTIZACIÓN EXTRA</small>
        <strong>${fmt(p.extraDebt)}</strong>
        <p>${escapeHtml(p.extraDebtName||"Deuda prioritaria")}</p>
      </article>`:"";

    $("#pdResult").innerHTML=`
      <div class="payday-result-hero">
        <div class="payday-result-top">
          <div><small>HAS COBRADO</small><strong>${fmt(state.finance.income)}</strong></div>
          <span class="payday-regime">${regime}</span>
        </div>
        <div class="payday-result-copy">
          Deja aproximadamente <strong>${fmt(recurring)}</strong> para obligaciones y esenciales.
          Tu colchón cubre <strong>${coverage.toFixed(1)} meses</strong> de gastos base.
        </div>
      </div>
      <div class="payday-split">
        <article class="invest"><small>INVERTIR</small><strong>${fmt(p.invest)}</strong><p>Presupuesto que pasará al asignador del radar.</p></article>
        <article class="leisure"><small>OCIO</small><strong>${fmt(p.leisure)}</strong><p>Disponible para gastar sin romper el plan.</p></article>
        <article class="goals"><small>OBJETIVOS</small><strong>${fmt(p.goals)}</strong><p>Aparta esta cantidad para tus metas activas.</p></article>
        <article class="reserve"><small>RESERVA</small><strong>${fmt(p.reserve)}</strong><p>Colchón e imprevistos / liquidez táctica.</p></article>
        ${debtCard}
      </div>
      <div class="payday-transfer">
        <strong>Movimiento orientativo al cobrar:</strong> apartar ${fmt(transferNow)} entre inversión, objetivos, reserva${p.extraDebt>0?" y amortización extra":""}. Mantén el presupuesto de ocio separado para saber qué puedes gastar.
      </div>
    `;
    showStep(3);
  }

  function confirmPlan(){
    if(!session?.previewApplied){previewPlan();return;}
    const form=session.form;
    session.finalized=true;

    saveProfile({
      salary:form.salary,
      housing:form.housing,
      essentials:form.essentials,
      lastPayday:new Date().toISOString()
    });

    state.investmentBudget=Math.round(state.plan.invest||0);
    $("#investmentBudget").value=state.investmentBudget||"";
    saveState();
    saveCurrentMonth();

    const p=state.plan;
    $("#pdSuccessText").textContent=`Guardado: ${fmt(p.invest)} para inversión, ${fmt(p.leisure)} para ocio, ${fmt(p.goals)} para objetivos y ${fmt(p.reserve)} para reserva.`;
    $("#pdSuccess").classList.add("show");
  }

  injectStyles();
  injectLaunchers();
  buildModal();
})();