(function(){
  "use strict";
  if(typeof state==="undefined") return;

  let data=null,filter="personal";
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const names={"BTC-USD":"Bitcoin","^NDX":"Nasdaq 100","^GSPC":"S&P 500","URTH":"MSCI World","NVDA":"NVIDIA","MSFT":"Microsoft","GOOGL":"Alphabet","AMZN":"Amazon","META":"Meta","AVGO":"Broadcom"};

  function held(){return new Set((state.portfolio||[]).map(x=>x.proxySymbol).filter(Boolean));}
  function mine(a){const h=held();return (a.assets||[]).some(x=>h.has(x));}
  function score(a){return (Number(a.relevance)||0)+(mine(a)?28:0);}
  function age(v){
    if(!v) return "hoy";
    const h=Math.max(0,(Date.now()-new Date(v).getTime())/36e5);
    return h<1?`hace ${Math.max(1,Math.round(h*60))} min`:h<24?`hace ${Math.round(h)} h`:`hace ${Math.round(h/24)} d`;
  }
  function source(a){return (a.domain||"fuente").replace(/^www\./,"");}
  function why(a){
    const assets=(a.assets||[]).map(x=>names[x]||x);
    const own=(a.assets||[]).filter(x=>held().has(x)).map(x=>names[x]||x);
    if(own.length) return `Especialmente relevante porque tienes exposición vinculada a ${own.join(", ")}.`;
    if(assets.length) return `Relacionado con ${assets.join(", ")}.`;
    if((a.macro||[]).length) return `Tema macro: ${(a.macro||[]).join(", ")}.`;
    return "Contexto potencialmente relevante para la sesión.";
  }
  function impact(n){return n>=75?"ALTA":n>=60?"MEDIA":"CONTEXTO";}

  function styles(){
    const s=document.createElement("style");
    s.textContent=`
      .news-radar{scroll-margin-top:90px}.news-filters{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
      .news-filter{border:1px solid var(--line);background:rgba(6,15,27,.6);color:#75879e;border-radius:99px;padding:7px 10px;font-size:9px;font-weight:800}
      .news-filter.active{color:#dce7fb;border-color:rgba(142,168,255,.35);background:rgba(142,168,255,.1)}
      .news-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}.news-kpi{padding:13px;border-radius:16px}
      .news-kpi small{display:block;color:var(--muted);font-size:8px}.news-kpi strong{display:block;font-size:19px;margin-top:4px}
      .news-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:12px}.news-lead{padding:18px;border-radius:21px}.news-list{display:grid;gap:8px}
      .news-lead .meta,.news-item .meta{color:#657890;font-size:8px}.news-lead h3{font-size:23px;line-height:1.1;margin:15px 0 10px}
      .news-lead a,.news-item a{color:inherit;text-decoration:none}.news-lead a:hover,.news-item a:hover{text-decoration:underline}
      .news-why{color:#74869d;font-size:10px;line-height:1.55}.news-tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:13px}
      .news-tag{font-size:8px;border:1px solid var(--line);border-radius:99px;padding:4px 7px;color:#8193aa}.news-tag.mine{color:#8ee9c8}
      .news-item{padding:12px 13px;border-radius:16px;display:grid;grid-template-columns:1fr auto;gap:8px}.news-item a{font-size:11px;font-weight:800;line-height:1.35}
      .news-score{font-size:8px;border:1px solid var(--line);border-radius:8px;padding:5px;color:#8da0b7;height:max-content}
      .news-empty{padding:25px;text-align:center;color:#71849b;border:1px dashed var(--line);border-radius:17px;font-size:10px}
      .news-note{margin-top:10px;color:#596b82;font-size:8px;line-height:1.5}
      @media(max-width:800px){.news-grid{grid-template-columns:1fr}}@media(max-width:680px){.news-kpis{grid-template-columns:1fr 1fr}.news-kpis>*:last-child{grid-column:1/-1}.mobile-bottom-nav.news-on{grid-template-columns:repeat(6,1fr)}.mobile-bottom-nav.news-on small{font-size:7px}}
    `;
    document.head.appendChild(s);
  }

  function mount(){
    styles();
    const nav=$(".nav-links");
    if(nav&&!nav.querySelector('[href="#noticias"]')){
      const a=document.createElement("a");a.href="#noticias";a.textContent="Noticias";
      nav.insertBefore(a,nav.querySelector('[href="#radar"]'));
    }
    const mobile=$(".mobile-bottom-nav");
    if(mobile&&!mobile.querySelector('[href="#noticias"]')){
      const a=document.createElement("a");a.href="#noticias";a.innerHTML="<span>◉</span><small>News</small>";
      mobile.insertBefore(a,mobile.querySelector('[href="#radar"]'));mobile.classList.add("news-on");
    }
    if($("#noticias")) return;
    const sec=document.createElement("section");sec.id="noticias";sec.className="section news-radar";
    sec.innerHTML=`
      <div class="section-heading"><div><div class="eyebrow">NEWS RADAR · HOY</div><h2>Noticias que pueden importar a tus inversiones</h2></div><div class="section-note" id="newsUpdated">Cargando…</div></div>
      <div class="news-filters" id="newsFilters">
        <button class="news-filter active" data-f="personal">Para ti</button><button class="news-filter" data-f="macro">Macro</button>
        <button class="news-filter" data-f="markets">Mercado</button><button class="news-filter" data-f="stocks">Acciones</button>
        <button class="news-filter" data-f="crypto">Crypto</button><button class="news-filter" data-f="all">Todo</button>
      </div>
      <div class="news-kpis" id="newsKpis"></div>
      <div class="news-grid"><article class="glass news-lead" id="newsLead"><div class="news-empty">Cargando noticias…</div></article><div class="news-list" id="newsList"></div></div>
      <div class="news-note">Atlas enlaza a la fuente original. La relevancia de un titular no implica una señal de compra o venta.</div>`;
    const radar=$("#radar");radar.parentNode.insertBefore(sec,radar);
    $$("#newsFilters button").forEach(b=>b.onclick=()=>{filter=b.dataset.f;$$(".news-filter").forEach(x=>x.classList.toggle("active",x===b));render();});
  }

  function rows(){
    let r=[...(data?.articles||[])];
    if(filter==="personal") return r.sort((a,b)=>score(b)-score(a));
    if(filter!=="all") r=r.filter(a=>a.category===filter);
    return r.sort((a,b)=>(b.relevance||0)-(a.relevance||0));
  }

  function render(){
    if(!data) return;
    const all=data.articles||[], h=held();
    $("#newsKpis").innerHTML=`
      <article class="glass news-kpi"><small>RELEVANTES HOY</small><strong>${all.filter(a=>(a.relevance||0)>=70).length}</strong></article>
      <article class="glass news-kpi"><small>DE TU CARTERA</small><strong>${all.filter(mine).length}</strong></article>
      <article class="glass news-kpi"><small>MACRO</small><strong>${all.filter(a=>a.category==="macro").length}</strong></article>`;
    const r=rows();
    if(!r.length){$("#newsLead").innerHTML='<div class="news-empty">No hay titulares en esta categoría.</div>';$("#newsList").innerHTML="";return;}
    const a=r[0], tags=[...(a.assets||[]).map(x=>({t:names[x]||x,m:h.has(x)})),...(a.macro||[]).map(x=>({t:x,m:false}))].slice(0,5);
    $("#newsLead").innerHTML=`
      <div class="meta">${escapeHtml(source(a))} · ${escapeHtml(age(a.published_at))} · ${impact(a.relevance||0)} ${Math.round(a.relevance||0)}</div>
      <h3><a target="_blank" rel="noopener noreferrer" href="${escapeHtml(a.url)}">${escapeHtml(a.title)}</a></h3>
      <p class="news-why">${escapeHtml(why(a))} Atlas no presupone si el impacto será positivo o negativo.</p>
      <div class="news-tags">${tags.map(t=>`<span class="news-tag ${t.m?"mine":""}">${t.m?"● ":""}${escapeHtml(t.t)}</span>`).join("")}</div>`;
    $("#newsList").innerHTML=r.slice(1,9).map(x=>`<article class="glass news-item"><div><a target="_blank" rel="noopener noreferrer" href="${escapeHtml(x.url)}">${escapeHtml(x.title)}</a><div class="meta">${escapeHtml(source(x))} · ${escapeHtml(age(x.published_at))}${mine(x)?" · ● tu cartera":""}</div></div><span class="news-score">${Math.round(x.relevance||0)}</span></article>`).join("");
  }

  mount();
  const obs=$("#holdingsList");
  if(obs&&window.MutationObserver)new MutationObserver(()=>data&&render()).observe(obs,{childList:true,subtree:true});
  fetch("data/news.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error(r.status);return r.json();}).then(d=>{
    data=d;$("#newsUpdated").textContent=d.generated_at?`Actualizado ${new Date(d.generated_at).toLocaleString("es-ES",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}`:"Pendiente de primera actualización";render();
  }).catch(e=>{$("#newsUpdated").textContent="No disponible";$("#newsLead").innerHTML='<div class="news-empty">No se pudo cargar el News Radar. El resto de Atlas sigue funcionando.</div>';console.error(e);});
})();