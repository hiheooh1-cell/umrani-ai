(() => {
  // Execute mutable ad code only in an opaque-origin sandbox, never top-level.
  if (window.top === window.self || window.origin !== 'null') {
    document.body.textContent = 'Advertisements only run in the isolated app frame.';
    return;
  }
  const channel=new URL(location.href).searchParams.get('channel');
  if(!channel || !/^[a-f0-9-]{16,64}$/i.test(channel))return;
  const container=document.getElementById('container-63ea484e1a293480518c8d527b5e81e3');
  let complete=false,timeout;
  const report=(status,height=0)=>{
    if(complete)return;complete=true;clearTimeout(timeout);observer.disconnect();
    // The parent authenticates the actual WindowProxy and per-frame channel.
    parent.postMessage({type:'umrani:ad-status',channel,status,height},'*');
  };
  const rendered=()=>{
    const candidates=[...container.querySelectorAll('a[href],img,iframe,video')];
    const visible=candidates.some(el=>{
      const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
      if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0||rect.width<20||rect.height<12)return false;
      if(el.tagName==='IMG')return el.complete&&el.naturalWidth>20&&el.naturalHeight>12;
      if(el.tagName==='A')return /^https?:/i.test(el.href)&&el.textContent.trim().length>2;
      return true;
    });
    if(visible)report('ready',Math.ceil(Math.max(container.scrollHeight,container.getBoundingClientRect().height)));
  };
  const observer=new MutationObserver(rendered);observer.observe(container,{childList:true,subtree:true,attributes:true});
  container.addEventListener('load',rendered,true);
  timeout=setTimeout(()=>report('no-fill'),8000);
  const script=document.createElement('script');script.async=true;
  script.src='https://bauval.org/21/63ea484e1a293480518c8d527b5e81e3';
  script.onload=rendered;script.onerror=()=>report('error');
  document.body.appendChild(script);
})();
