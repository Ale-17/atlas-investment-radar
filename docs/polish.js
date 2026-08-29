(function(){
  "use strict";

  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];

  function addVersion(){
    const brand=$(".brand");
    if(!brand||$(".version-chip")) return;
    const chip=document.createElement("span");
    chip.className="version-chip";
    chip.textContent="V6";
    brand.insertAdjacentElement("afterend",chip);
  }

  function activeNavigation(){
    const anchors=$$(".nav-links a,.mobile-bottom-nav a").filter(a=>a.hash);
    if(!anchors.length) return;
    const map=new Map();
    anchors.forEach(a=>{
      const id=a.hash.slice(1);
      if(!map.has(id)) map.set(id,[]);
      map.get(id).push(a);
    });

    const setActive=id=>{
      anchors.forEach(a=>a.classList.remove("active"));
      (map.get(id)||[]).forEach(a=>a.classList.add("active"));
    };

    const sections=[...map.keys()].map(id=>document.getElementById(id)).filter(Boolean);
    if(!sections.length) return;
    const observer=new IntersectionObserver(entries=>{
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(visible) setActive(visible.target.id);
    },{rootMargin:"-22% 0px -58% 0px",threshold:[0,.05,.15,.3]});
    sections.forEach(s=>observer.observe(s));
    setActive(location.hash.slice(1)||"inicio");
  }

  function reveals(){
    const items=$$(".section,.decision-center,.kpi,.hero-console");
    items.forEach((el,i)=>{
      el.classList.add("premium-reveal");
      if(i<7) el.style.transitionDelay=`${Math.min(i*35,140)}ms`;
    });
    if(!("IntersectionObserver" in window)){
      items.forEach(el=>el.classList.add("is-visible"));
      return;
    }
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(e=>{
        if(e.isIntersecting){e.target.classList.add("is-visible");observer.unobserve(e.target);}
      });
    },{threshold:.07,rootMargin:"0px 0px -40px"});
    items.forEach(el=>observer.observe(el));
  }

  function spotlights(){
    if(!matchMedia("(hover:hover) and (pointer:fine)").matches) return;
    $$(".glass").forEach(el=>{
      if(getComputedStyle(el).position==="static") el.style.position="relative";
      el.dataset.spotlight="";
      el.addEventListener("pointermove",e=>{
        const r=el.getBoundingClientRect();
        el.style.setProperty("--mx",`${e.clientX-r.left}px`);
        el.style.setProperty("--my",`${e.clientY-r.top}px`);
      },{passive:true});
    });
  }

  function compactTopbar(){
    const bar=$(".topbar");
    if(!bar) return;
    const sync=()=>bar.classList.toggle("compact",scrollY>36);
    sync();addEventListener("scroll",sync,{passive:true});
  }

  function observeDynamicModules(){
    const main=$("main");
    if(!main||!("MutationObserver" in window)) return;
    let timer;
    new MutationObserver(()=>{
      clearTimeout(timer);
      timer=setTimeout(()=>{
        activeNavigation();
        const news=$("#noticias");
        if(news&&!news.classList.contains("premium-reveal")){
          news.classList.add("premium-reveal");
          requestAnimationFrame(()=>news.classList.add("is-visible"));
        }
      },80);
    }).observe(main,{childList:true,subtree:true});
  }

  function init(){
    document.body.classList.add("atlas-v6");
    addVersion();
    compactTopbar();
    reveals();
    spotlights();
    activeNavigation();
    observeDynamicModules();
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
