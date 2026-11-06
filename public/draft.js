(() => {
  'use strict';
  const key='cartas:draft:v1';
  function discard(){try{sessionStorage.removeItem(key);}catch{}}
  function reset(){
    discard();
    for(const id of ['selection-form','letter-form'])document.getElementById(id)?.reset();
    for(const id of ['entry-type','entry-city','entry-common','entry-common-search']){const field=document.getElementById(id);if(field)field.value='';}
    document.getElementById('entry-common-search').disabled=true;
    document.getElementById('entry-common-results').classList.remove('active');
    document.getElementById('entry-common-results').replaceChildren();
    document.getElementById('entry-event').innerHTML='<option value="">Selecione o tipo de carta primeiro</option>';
    document.getElementById('entry-event').disabled=true;
    document.getElementById('entry-hint').textContent='';
    document.getElementById('workspace').hidden=true;
    document.getElementById('entry').hidden=false;
  }
  reset();
  window.CartasDraft={save:discard,restore:async()=>{reset();events=[];entryEvents=[];pending=null;existingId=null;window.CartasPeople?.clear();updateSummary();}};
  window.addEventListener('pagehide',discard);
  window.addEventListener('pageshow',event=>{if(event.persisted){discard();location.reload();}});
})();
