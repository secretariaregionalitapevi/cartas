(() => {
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  function set(field,value){
    const aliases={'DO':'Dó','C':'Dó','FA':'Fá','F':'Fá','LA':'Lá','A':'Lá','SI BEMOL':'Sib','SI♭':'Sib','SIB':'Sib','BB':'Sib','MI BEMOL':'Mib','MI♭':'Mib','MIB':'Mib','EB':'Mib'};
    const tone=aliases[norm(value)]||String(value||'');
    if(tone&&![...field.options].some(o=>o.value===tone))field.add(new Option(tone,tone));
    field.value=tone;
  }
  const form=document.querySelector('#letter-form');
  function hint(){
    const name=norm(form.elements.instrumento.value);
    let tones='';
    if(/OBOE.*AMORE/.test(name))tones='Lá';
    else if(/CORNE INGLES/.test(name))tones='Fá';
    else if(/CLARINETE ALTO|SAX.*(ALTO|BARITONO)/.test(name))tones='Mib';
    else if(/CLARINETE.*(BAIXO|CLARONE)|SAX.*(SOPRANO|TENOR)|FLUGEL|BARITONO|EUFON|BOMBARDINO/.test(name))tones='Sib';
    else if(/CLARINETE/.test(name))tones='Sib ou Lá';
    else if(/TROMPETE|CORNET|TROMBONE|TROMBONITO/.test(name))tones='Sib ou Dó';
    else if(/TROMPA/.test(name))tones='Fá ou Sib';
    else if(/TUBA/.test(name))tones='Mib, Fá, Sib ou Dó';
    else if(/VIOLINO|VIOLA|VIOLONCELO|FLAUTA|OBOE|FAGOTE/.test(name))tones='Dó';
    document.querySelector('#tonality-hint').textContent=tones?'Referência para este instrumento: '+tones+'.':'';
  }
  window.CartasTones={set};
  for(const event of ['input','change','click','candidate-changed'])form.addEventListener(event,()=>queueMicrotask(hint));
})();
