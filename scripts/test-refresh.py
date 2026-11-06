import json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

public=Path(__file__).resolve().parents[1]/'public'
common='BR-21-0840 - ALTO DO BELA VISTA'
person={'id':'00000000-0000-4000-8000-000000000001','nome':'ALUNO TESTE','comum':common,'municipio':'Itapevi','instrumento':'VIOLINO','tonalidade':'Dó','nivel':'CULTO OFICIAL'}
event={'id':'exam','evento':'Avaliação Músicos - Itapevi','data':'2026-11-28','hora':'14:00'}
bootstrap={'cities':['Itapevi'],'commons':[{'comum':common,'municipio':'Itapevi'}],
           'modalities':{'musico':{'culto':'Culto Oficial','oficializacao':'Oficialização'},'organista':{'rjm':'RJM'}},
           'available':{'musico':['culto','oficializacao'],'organista':['rjm']}}
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    def route(request):
        path=urlparse(request.request.url).path
        if path.startswith('/api/'):
            responses={'/api/bootstrap':bootstrap,'/api/events':{'events':[event],'source':'teste'},
                       '/api/people':{'people':[person]},'/api/ministry':{'ministry':[
                           {'id':role,'nome':'RESPONSÁVEL','ministerio':label}
                           for role,label in [('anciao','ANCIÃO'),('cooperador','COOPERADOR DO OFÍCIO'),('encarregado','ENCARREGADO LOCAL'),('regional','ENCARREGADO REGIONAL')]]},
                       '/api/program-assessment':{'assessment':None}}
            request.fulfill(json=responses.get(path,{}));return
        file=public/('index.html' if path=='/' else path.lstrip('/'))
        if file.exists() and file.is_file():request.fulfill(path=str(file))
        else:request.fulfill(status=404,body='')
    page.route('https://cartas.test/**',route)
    page.goto('https://cartas.test/')
    page.select_option('#entry-type','musico')
    page.select_option('#entry-city','Itapevi')
    page.wait_for_function("document.querySelector('#entry-event').disabled===false")
    page.select_option('#entry-event','exam')
    page.fill('#entry-common-search',common)
    page.click('[data-common]')
    page.click('#open-letter')
    page.wait_for_selector('#workspace',state='visible')
    page.wait_for_selector('[name=anciao]')
    page.select_option('#mode','oficializacao')
    page.fill('#person-name','ALUNO')
    page.click('[data-person-option]')
    page.fill('[name=whatsapp]','11999999999')
    page.wait_for_function("JSON.parse(sessionStorage.getItem('cartas:draft:v1')).fields.pessoa_id")
    page.reload()
    page.wait_for_function("document.querySelector('[name=pessoa_id]').value==='00000000-0000-4000-8000-000000000001'")
    assert page.locator('#workspace').is_visible()
    assert not page.locator('#entry').is_visible()
    assert page.input_value('#mode')=='oficializacao'
    assert page.input_value('#event')=='exam'
    assert page.input_value('#common')==common
    assert page.input_value('#person-name')=='ALUNO TESTE'
    assert page.input_value('[name=whatsapp]')=='(11) 99999-9999'
    assert page.locator('#back-selection').inner_text()=='Voltar'
    # The restored candidate must still pass the internal selection guard.
    page.evaluate("document.querySelector('#letter-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))")
    assert page.locator('#review-dialog').is_visible()
    page.click('#cancel-review')
    page.click('#back-selection')
    assert page.locator('#entry').is_visible()
    page.reload()
    page.wait_for_function("document.querySelector('#entry-event').value==='exam'")
    assert page.locator('#entry').is_visible()
    assert not page.locator('#workspace').is_visible()
    assert not errors,errors
    browser.close()
print('OK: refresh preserva tela, seleção, modalidade, candidato e campos; Voltar persiste na seleção inicial.')
