"""Append the 20 reviewed SVG tasks; never rewrite existing task content."""
import json
from pathlib import Path
from collections import Counter
root=Path(__file__).resolve().parents[1]
p=root/'public/oppgaver-2027.json'
b=json.loads(p.read_text())
if any(q['id']=='2py27-951' for q in b['oppgaver']):
    raise SystemExit('Oppgavene finnes allerede; ingen endring.')
# Pattern, extra geometry settings, polynomial a*n²+b*n+c, description, structural hint.
specs=[
 ('kors',{},(0,4,1),'Et kors består av én rute i midten og fire armer. Hver arm er én rute lang i figur 1 og forlenges med én rute for hver ny figur.','Tell midtruten én gang, og tell deretter de fire like armene.'),
 ('vinkel',{},(0,2,1),'En L-form består av én hjørnerute og to armer. Hver arm er én rute lang i figur 1 og forlenges med én rute for hver ny figur.','Del L-formen i hjørneruten og to like armer.'),
 ('u_form',{},(0,3,1),'En U-form har to ruter langs bunnen i figur 1 og én rute oppover over hvert endepunkt. For hver ny figur blir bunnen én rute lengre og hver side én rute høyere.','Tell bunnen først. Tell bare rutene over bunnen når du teller sidene.'),
 ('dobbeltrapp',{},(1,1,0),'En trapp av ruter har én rad med to ruter i figur 1. Hver ny figur får en ny rad nederst med to flere ruter enn raden over.','Se på radlengdene 2, 4, 6 og videre. Legg sammen radene som hører til figuren.'),
 ('rektangelramme',{},(0,4,6),'En grønn ramme er fire ruter bred og tre ruter høy i figur 1, med hvitt sentrum. For hver ny figur øker både bredden og høyden med én rute.','Tell hele topp- og bunnraden, og deretter sidene uten hjørnene.'),
 ('rektangel',{'kolonnetillegg':2},(1,2,0),'Et rektangel har én rad og tre kolonner i figur 1. Hver ny figur får én ekstra rad og én ekstra kolonne.','Finn antall rader og kolonner fra figurnummeret. Multipliser dem.'),
 ('trekant',{},(.5,.5,0),'En trekant har én prikk i figur 1. Hver ny figur får en ny rad nederst med én prikk mer enn raden over.','Antall prikker er summen av radlengdene 1, 2, 3 og videre.'),
 ('kvadrat_med_tillegg',{'sideforskyvning':0,'tillegg':2},(1,0,2),'Et kvadrat har én grønn rute i figur 1 og øker med én rad og én kolonne for hver ny figur. To ekstra grønne ruter står ved siden av kvadratet i alle figurene.','Tell kvadratet for seg, og legg til de to faste rutene.'),
 ('fyrstikkrad',{},(0,3,1),'Fyrstikker med røde hoder danner en sammenhengende rad av kvadrater. Figur 1 har ett kvadrat. Hver ny figur får ett nytt kvadrat, og nabokvadrater deler én fyrstikk.','Start med det første kvadratet. Finn hvor mange nye fyrstikker som trengs når en side allerede ligger der.'),
 ('ramme',{},(0,4,4),'En grønn kvadratramme er tre ruter bred og tre ruter høy i figur 1, med hvitt sentrum. For hver ny figur øker begge sidelengdene med én rute.','Tell topp og bunn helt, og tell sidene mellom dem. Hjørnene skal telles én gang.'),
]
def calc(c,n):return int(c[0]*n*n+c[1]*n+c[2])
def num(value,label,unit=''):
 return {'type':'tall','verdier':[{'verdi':value,'toleranse':0,'enhet':unit,'etikett':label}]}
def choice(options,index=0):return {'type':'valg','flervalg':False,'alternativer':options,'riktige':[options[index]]}
new=[]
for i,(pattern,config,c,desc,structure) in enumerate(specs):
 unit='fyrstikker' if pattern=='fyrstikkrad' else 'prikker' if pattern=='trekant' else 'grønne ruter'
 for mode in range(2):
  idx=951+2*i+mode
  v={'type':'figurmønster','monster':pattern,**config,'figurer':[{'n':n,'antall':calc(c,n)} for n in (1,2,3)],'tekstalternativ':desc}
  if mode==0:
   target=[6,8,7,5,8,6,7,5,9,7][i]
   value=calc(c,target)
   prompt=f'Hvor mange {unit} er det i figur {target}?'
   key=num(value,f'Antall {unit}',unit)
   h2=f'Bygg videre med den samme regelen helt til figur {target}. Du trenger ikke tegne alle mellomfigurene.'
   solution=f'Figur {target} har {value} {unit}.'
   method='antall'; params={'target':target}; level=1 if c[0]==0 else 2
  elif i in (0,1,4,8):
   target={0:9,1:12,4:11,8:10}[i]; total=calc(c,target)
   prompt=f'En figur har {total} {unit}. Hvilket figurnummer har den?'
   key=num(target,'Figurnummer')
   h2='Trekk først fra den faste delen av antallet. Del deretter på det som hører til hvert trinn i figurnummeret.'
   solution=f'Antallet øker med {int(c[1])} for hvert figurnummer. Vi løser {int(c[1])}n + {int(c[2])} = {total}: n = ({total} − {int(c[2])})/{int(c[1])} = {target}.'
   method='figurnummer'; params={'total':total};level=2
  elif i in (2,3,6):
   target={2:8,3:6,6:9}[i]; value=calc(c,target+1)-calc(c,target)
   prompt=f'Hvor mange nye {unit} kommer til fra figur {target} til figur {target+1}?'
   key=num(value,f'Nye {unit}',unit)
   h2='Se bare på det som legges til i neste figur. Skill dette fra antallet i hele den nye figuren.'
   solution=(f'Bunnen og begge sidene får én ny rute. Det kommer til {value} grønne ruter.' if i==2 else f'Den nye nederste raden i figur {target+1} har {value} {unit}. Derfor øker antallet med {value}.')
   method='tilvekst';params={'target':target};level=2
  elif i in (5,7):
   formulas=['n(n + 2)','n² + 2','2n + 2','(n + 2)²'] if i==5 else ['n² + 2','(n + 2)²','2n + 2','n² + 2n']
   # Rotate the correct position between tasks.
   rotation=(i+1)%4; options=formulas[rotation:]+formulas[:rotation]
   prompt='Hvilken formel gir antallet grønne ruter i figur n?'
   key=choice(options,options.index(formulas[0]))
   h2='Skriv lengdene ved hjelp av n. Skill mellom ekstra kolonner og ruter som står utenfor kvadratet.'
   solution='Det er n rader og n + 2 kolonner, så antallet er n(n + 2).' if i==5 else 'Kvadratet har n² ruter. De to rutene utenfor gir n² + 2.'
   method='formel';params={};level=2
  else:
   prompt='Hvilken forklaring gir riktig antall grønne ruter i figur n uten dobbeltelling?'
   options=['Tell fire hele sider og legg til fire hjørner.','Tell to hele sider med n + 2 ruter og to sider uten hjørnene med n ruter.','Tell fire sider med n + 2 ruter uten å trekke fra noe.']
   key=choice(options,1)
   h2='Undersøk hvor mange ganger hvert hjørne blir med hvis du teller fire hele sider.'
   solution='Topp og bunn gir 2(n + 2). De to sidene mellom disse radene gir 2n. Summen er 4n + 4, og hver hjørnerute er telt én gang.'
   method='dobbeltelling';params={};level=3
  if mode==0:
   a,bb,cc=c
   calculation=(f'{int(bb)} · {target} + {int(cc)} = {value}' if a==0 else f'{target} · ({target} + 1)/2 = {value}' if pattern=='trekant' else f'{target} · ({target} + 1) = {value}' if pattern=='dobbeltrapp' else f'{target} · ({target} + 2) = {value}' if pattern=='rektangel' else f'{target}² + 2 = {value}')
   solution=structure+' '+calculation+'. '+solution
  q={'id':f'2py27-{idx}','del':1,'tema':'variabler_og_monstre','deltema':f'figur-{method}',
    'variantfamilie':f'svg-{method}-'+('kvadratisk' if c[0] else 'lineart'), 'niva':level,'hjelpemidler':'uten',
    'sporsmal':desc+' '+prompt,'hint':[structure,h2,'Kontroller framgangsmåten mot de tre viste figurene før du svarer. Tell bare elementene det spørres etter.'],
    'svar':solution,'fasit':key,'visualisering':v,'ferdighet':['tolke','generalisere'],
    'nivabegrunnelse':'Krever '+('direkte telling eller enkel lineær beregning.' if level==1 else 'vurdering av dobbeltelling i en generell konstruksjon.' if level==3 else 'å bruke konstruksjonen til en beregning eller generalisering.'),
    'laeringsstotte':{'feil':'Skill mellom figurnummer, antall i hele figuren og det som kommer til. Bruk konstruksjonsregelen og kontroller mot figurene.'},
    'kontroll':{'operasjon':'svg_monster','metode':method,'inndata':{'polynom':c,**params}}}
  q['hint'][0]='Hva vet vi? '+q['hint'][0]
  setups=[
   'Skriv antall = 1 + fire ganger armlengden. Midtruten er allerede med i 1.',
   'Skriv antall = 1 + to ganger armlengden. Begge armene har samme lengde.',
   'Skriv antall = ruter i bunnen + ruter over bunnen på venstre side + ruter over bunnen på høyre side.',
   'Radlengdene er 2, 4, 6 og videre. Skriv antall = summen av radlengdene. Neste nye rad er to ruter lengre enn den forrige.',
   'Skriv antall = 2 · bredde + 2 · (høyde − 2). De to hjørnene på hver side er allerede med i topp og bunn.',
   'Skriv antall = rader · kolonner. Sammenlign begge lengdene med figurnummeret før du setter inn et tall.',
   'Skriv antall = 1 + 2 + 3 + … fram til siste rad. Ved vekst til neste figur er det bare den nye raden som legges til.',
   'Skriv antall = side · side + rutene utenfor kvadratet. De faste rutene øker ikke sidelengden.',
   'Skriv antall = 4 + nye fyrstikker per kvadrat · (antall kvadrater − 1). Den delte siden skal ikke legges til en gang til.',
   'Skriv antall = 2 · hel sidelengde + 2 · sidelengde uten hjørnene. Kontroller at hvert hjørne bare telles én gang.'
  ]
  q['hint'][2]=setups[i]+' Kontroller framgangsmåten mot figur 1, 2 og 3.'
  new.append(q)
assert len(new)==20
b['oppgaver'].extend(new)
b['samling'].update(antall=len(b['oppgaver']),versjon='2027.27')
b['eksamensprofil']['del_1']='508 oppgaver uten hjelpemidler.'
qs=b['oppgaver'];stats=b['statistikk'];stats['antall_oppgaver']=len(qs)
for name in ['del','niva','tema','hjelpemidler']:stats['fordeling_'+name]=dict(sorted(Counter(str(q[name]) for q in qs).items()))
stats['fordeling_svarformat']=dict(Counter(q['fasit']['type'] for q in qs))
stats['antall_variantfamilier']=len(set(q['variantfamilie'] for q in qs))
stats['antall_med_visualisering']=sum('visualisering' in q for q in qs)
p.write_text(json.dumps(b,ensure_ascii=False,indent=2)+'\n')
print('Added:',[q['id'] for q in new])
