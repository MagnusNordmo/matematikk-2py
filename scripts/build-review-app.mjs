import { readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import katex from "katex";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectDir = dirname(scriptDir);
const sourcePath = join(projectDir, "public", "oppgaver-2027.json");
const outputPath = join(projectDir, "public", "oppgaver-og-hint.html");
const katexDir = join(projectDir, "node_modules", "katex", "dist");
const bank = JSON.parse(await readFile(sourcePath, "utf8"));

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function renderMathText(text) {
  return text.split(/(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^$]+?\$|\\\([\s\S]+?\\\))/g).map((part) => {
    const display = (part.startsWith("$$") && part.endsWith("$$")) || (part.startsWith("\\[") && part.endsWith("\\]"));
    const inline = (!display && part.startsWith("$") && part.endsWith("$")) || (part.startsWith("\\(") && part.endsWith("\\)"));
    if (!display && !inline) return escapeHtml(part).replaceAll("\n", "<br>");
    const expression = part.startsWith("\\") ? part.slice(2, -2) : display ? part.slice(2, -2) : part.slice(1, -1);
    return `<span class="${display ? "math-display" : "math-inline"}">${katex.renderToString(expression, {
      displayMode: display, throwOnError: false, strict: "ignore", output: "html",
    })}</span>`;
  }).join("");
}

async function embeddedKatexCss() {
  let css = await readFile(join(katexDir, "katex.min.css"), "utf8");
  const files = [...css.matchAll(/url\((fonts\/[^)]+)\)/g)].map((match) => match[1]);
  for (const relativePath of new Set(files)) {
    const bytes = await readFile(join(katexDir, relativePath));
    const extension = extname(relativePath);
    const mime = extension === ".woff2" ? "font/woff2" : extension === ".woff" ? "font/woff" : "font/ttf";
    css = css.replaceAll(`url(${relativePath})`, `url(data:${mime};base64,${bytes.toString("base64")})`);
  }
  return css;
}

const themeDetails = {
  prosent: ["Prosent og vekst", "Prosent", "%", "Prosentdel, endring, prosentpoeng og vekstfaktor."],
  potenser: ["Potenser og standardform", "Potenser", "aⁿ", "Potensregler, tierpotenser og standardform."],
  variabler: ["Variabler og formler", "Variabler", "x", "Uttrykk, likninger og formler."],
  variabler_og_monstre: ["Variabler og mønstre", "Mønstre", "▦", "Generalisere mønstre med formler."],
  proporsjonalitet: ["Proporsjonalitet", "Proporsjonalitet", "∝", "Direkte og omvendt proporsjonalitet."],
  statistikk: ["Statistikk", "Statistikk", "x̄", "Sentralmål, spredning, tabeller og diagrammer."],
  statistikk_og_samfunn: ["Statistikk og samfunn", "Samfunnsdata", "▥", "Tolke og vurdere statistikk i samfunnet."],
  representasjoner: ["Representasjoner", "Representasjoner", "↔", "Tekst, tabell, formel og graf."],
  lineaere_funksjoner: ["Lineære funksjoner", "Lineære funksjoner", "y", "Stigningstall, konstantledd og praktiske modeller."],
  funksjoner_og_modeller: ["Funksjoner og modeller", "Modeller", "f", "Bruke og vurdere matematiske modeller."],
  programmering: ["Programmering", "Programmering", "</>", "Algoritmer, løkker og matematisk kode."],
};
const themeIds = [...new Set(bank.oppgaver.map((question) => question.tema))];
const groupById = new Map(bank.oppgavegrupper.map((group) => [group.id, group]));
const reviewBank = {
  versjon: bank.samling.id,
  groups: bank.oppgavegrupper.length,
  temaer: themeIds.map((id) => {
    const [navn, kortnavn, symbol, beskrivelse] = themeDetails[id] ?? [id, id, "·", ""];
    return { id, navn, kortnavn, symbol, beskrivelse };
  }),
  oppgaver: bank.oppgaver.map((question) => ({
    ...question,
    hints: question.hint,
    vanskelighetsgrad: ({ 1: "mild", 2: "middels", 3: "utfordrende" })[question.niva],
    group: question.oppgavegruppe ? (() => {
      const group = groupById.get(question.oppgavegruppe.id);
      return group ? { id: group.id, title: group.tittel, renderedIntro: renderMathText(group.innledning), part: question.oppgavegruppe.deloppgave } : null;
    })() : null,
    renderedSporsmal: renderMathText(question.sporsmal),
    renderedHints: question.hint.map(renderMathText),
    renderedLosningsveier: (question.losningsveier ?? []).map((path) => ({
      ...path,
      renderedHints: path.hint.map(renderMathText),
    })),
    renderedSvar: renderMathText(question.svar),
  })),
};
const katexCss = await embeddedKatexCss();
const serializedBank = JSON.stringify(reviewBank).replaceAll("</script", "<\\/script");

const html = `<!doctype html>
<html lang="nb">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Oppgavegjennomgang – Matematikk 2P-Y</title>
  <style>${katexCss}</style>
  <style>
    :root{--canvas:#f5f3ee;--paper:#fffefa;--ink:#18312f;--muted:#667773;--line:#dce2dd;--line2:#c5d0c9;--accent:#19766e;--accent-dark:#105c56;--accent-soft:#dff1ec;--blue-soft:#e7eef8;--blue:#315f92;--amber-soft:#f5ecd6;--amber:#765a1e;--red-soft:#fae8e5;--red:#9b413d;--shadow:0 18px 50px rgba(29,57,53,.08)}
    *{box-sizing:border-box}html{background:var(--canvas);scroll-behavior:smooth}body{min-width:320px;margin:0;background:radial-gradient(circle at 12% 0%,rgba(255,255,255,.9),transparent 29rem),var(--canvas);color:var(--ink);font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}button{font:inherit;color:inherit}button:not(:disabled){cursor:pointer}button:focus-visible,summary:focus-visible{outline:3px solid rgba(25,118,110,.25);outline-offset:3px}
    .site-header{display:flex;width:min(1180px,calc(100% - 48px));min-height:88px;margin:0 auto;align-items:center;justify-content:space-between;gap:24px;border-bottom:1px solid rgba(203,212,206,.75)}.brand{display:inline-flex;align-items:center;gap:12px}.brand-mark{display:grid;width:42px;height:42px;place-items:center;border-radius:13px;background:var(--ink);color:#fff;font-size:1.2rem;font-weight:800;letter-spacing:-.04em}.brand-mark::after{content:"×";margin-left:-1px;color:#9ed8cc;font-size:.83em;font-weight:500}.brand strong,.brand small{display:block}.brand strong{font-size:.94rem;letter-spacing:-.01em}.brand small{margin-top:3px;color:var(--muted);font-size:.75rem}.version{color:var(--muted);font-size:.78rem}
    main{width:min(1080px,calc(100% - 48px));margin:0 auto;padding:62px 0 84px}.hero{max-width:780px}.eyebrow{margin:0 0 14px;color:var(--accent);font-size:.76rem;font-weight:800;letter-spacing:.13em;text-transform:uppercase}h1{margin:0;font-family:Georgia,"Times New Roman",serif;font-size:clamp(2.45rem,6vw,4.55rem);font-weight:500;letter-spacing:-.055em;line-height:1}.lead{max-width:680px;margin:22px 0 0;color:var(--muted);font-size:1.04rem;line-height:1.7}
    .filter-panel{position:sticky;z-index:10;top:0;margin-top:44px;padding:18px;border:1px solid var(--line);border-radius:20px;background:rgba(255,254,250,.94);box-shadow:0 9px 28px rgba(29,57,53,.06);backdrop-filter:blur(15px)}.filter-top{display:flex;align-items:center;justify-content:space-between;gap:18px}.filter-label{margin:0;font-size:.78rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.filter-status{color:var(--muted);font-size:.8rem}.topic-scroll{display:flex;margin-top:14px;gap:8px;overflow-x:auto;padding:3px 3px 8px;scrollbar-width:thin}.filter-pill{flex:0 0 auto;min-height:39px;padding:8px 13px;border:1px solid var(--line);border-radius:999px;background:var(--paper);color:var(--muted);font-size:.8rem;font-weight:700}.filter-pill:hover{border-color:var(--line2);color:var(--ink)}.filter-pill.active{border-color:var(--ink);background:var(--ink);color:#fff}.difficulty-row,.part-row{display:flex;margin-top:9px;align-items:center;flex-wrap:wrap;gap:8px}.difficulty-row .filter-label,.part-row .filter-label{margin-right:4px;color:var(--muted);font-size:.67rem}.filter-pill.small{min-height:34px;padding:6px 11px;font-size:.74rem}.expand-button{margin-left:auto;min-height:34px;padding:6px 10px;border:0;background:transparent;color:var(--accent-dark);font-size:.76rem;font-weight:750}
    #results{margin-top:50px}.theme-section+.theme-section{margin-top:62px}.theme-heading{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:15px;margin-bottom:18px}.theme-symbol{display:grid;width:48px;height:48px;place-items:center;border-radius:14px;background:var(--accent-soft);color:var(--accent-dark);font-family:Georgia,"Times New Roman",serif;font-size:.95rem;font-weight:700}.theme-heading h2{margin:0;font-family:Georgia,"Times New Roman",serif;font-size:clamp(1.55rem,3vw,2.05rem);font-weight:500;letter-spacing:-.035em}.theme-heading p{margin:5px 0 0;color:var(--muted);font-size:.82rem;line-height:1.45}.question-list{display:grid;gap:12px}.question-card{overflow:hidden;border:1px solid var(--line);border-radius:18px;background:rgba(255,254,250,.95);box-shadow:0 2px 0 rgba(29,57,53,.02)}.question-main{display:grid;padding:21px 22px;grid-template-columns:auto minmax(0,1fr);gap:17px}.question-number{display:grid;width:34px;height:34px;place-items:center;border-radius:10px;background:var(--blue-soft);color:var(--blue);font-size:.75rem;font-weight:850}.question-meta{display:flex;align-items:center;flex-wrap:wrap;gap:8px}.question-id{color:var(--muted);font-size:.69rem;font-weight:750;letter-spacing:.05em;text-transform:uppercase}.difficulty-badge,.part-badge{display:inline-flex;padding:4px 8px;border-radius:999px;font-size:.67rem;font-weight:800;text-transform:capitalize}.part-badge{background:var(--blue-soft);color:var(--blue)}.difficulty-badge.lett{background:var(--accent-soft);color:var(--accent-dark)}.difficulty-badge.middels{background:var(--amber-soft);color:var(--amber)}.difficulty-badge.utfordrende{background:var(--red-soft);color:var(--red)}.group-intro{margin-top:10px;padding:10px 12px;border-left:3px solid var(--accent);border-radius:8px;background:#edf6f2;color:#405853;font-size:.82rem;line-height:1.55}.group-intro strong{display:block;margin-bottom:3px;color:var(--accent-dark)}.question-text{margin-top:11px;font-size:1.02rem;font-weight:620;line-height:1.65}.question-details{border-top:1px solid var(--line)}summary{display:flex;min-height:50px;padding:12px 22px 12px 73px;align-items:center;justify-content:space-between;gap:14px;color:var(--accent-dark);font-size:.79rem;font-weight:780;list-style:none;cursor:pointer}summary::-webkit-details-marker{display:none}summary::after{content:"+";font-size:1.15rem;font-weight:500}details[open] summary::after{content:"−"}details[open] summary{border-bottom:1px solid var(--line)}.solution{padding:22px 22px 24px 73px;background:#fbfaf6}.solution-label{margin:0 0 13px;color:var(--muted);font-size:.68rem;font-weight:850;letter-spacing:.1em;text-transform:uppercase}.review-path+.review-path{margin-top:21px;padding-top:21px;border-top:1px solid var(--line)}.review-path h3{margin:0;color:var(--ink);font-size:.9rem}.review-path>p{margin:4px 0 12px;color:var(--muted);font-size:.76rem;line-height:1.5}.hint-list{display:grid;margin:0;padding:0;gap:9px;list-style:none;counter-reset:hints}.hint-item{position:relative;min-height:44px;padding:12px 14px 12px 48px;border:1px solid var(--line);border-radius:12px;background:var(--paper);color:#304744;font-size:.9rem;line-height:1.62;counter-increment:hints}.hint-item::before{position:absolute;top:12px;left:13px;display:grid;width:24px;height:24px;place-items:center;border-radius:7px;background:var(--accent-soft);color:var(--accent-dark);content:counter(hints);font-size:.67rem;font-weight:850}.answer-box{margin-top:13px;padding:15px 16px;border-left:3px solid var(--accent);border-radius:10px;background:var(--accent-soft)}.answer-label{display:block;margin-bottom:5px;color:var(--accent-dark);font-size:.67rem;font-weight:850;letter-spacing:.08em;text-transform:uppercase}.answer-text{font-size:.94rem;font-weight:750;line-height:1.55}.math-display{display:block;max-width:100%;margin:.65rem 0;overflow-x:auto;overflow-y:hidden;padding:.1rem 0}.math-inline{display:inline}.empty-state{padding:55px 24px;border:1px dashed var(--line2);border-radius:18px;color:var(--muted);text-align:center}footer{margin-top:72px;padding-top:24px;border-top:1px solid var(--line);color:var(--muted);font-size:.75rem;line-height:1.6}
    .difficulty-badge.mild{background:var(--accent-soft);color:var(--accent-dark)}
    @media(max-width:700px){.site-header,main{width:min(100% - 28px,1080px)}.site-header{min-height:76px}.version{display:none}main{padding-top:42px}.lead{font-size:.95rem}.filter-panel{margin-right:-4px;margin-left:-4px;padding:14px 12px;border-radius:16px}.filter-top{align-items:flex-start;flex-direction:column;gap:5px}.difficulty-row{align-items:flex-start}.difficulty-row .filter-label{width:100%}.expand-button{margin-left:0}.theme-heading{grid-template-columns:auto 1fr}.question-main{padding:17px 15px;gap:12px}.question-number{width:31px;height:31px}summary{padding:12px 15px 12px 58px}.solution{padding:17px 15px 19px}.hint-item{padding-left:45px;font-size:.86rem}#results{margin-top:38px}.theme-section+.theme-section{margin-top:48px}}
    @media print{body{background:#fff}.site-header,main{width:100%}.site-header{min-height:60px}main{padding:28px 0}.filter-panel{display:none}.question-card{break-inside:avoid;box-shadow:none}.solution{display:block}details:not([open])>.solution{display:block}summary{display:none}.theme-section+.theme-section{margin-top:36px}}
  </style>
</head>
<body>
  <header class="site-header"><div class="brand" aria-label="Matematikk 2P-Y"><span class="brand-mark">2P</span><span><strong>Matematikk 2P-Y</strong><small>Oppgaver og hint</small></span></div><span class="version">Oppgavebank ${escapeHtml(reviewBank.versjon)}</span></header>
  <main>
    <section class="hero"><p class="eyebrow">Kontrollverktøy</p><h1>Se gjennom oppgavene, steg for steg.</h1><p class="lead">Her finner du oppgavene fra elevappen, sortert etter tema. Filtrer på eksamensdel og nivå, og åpne en oppgave for å lese hint og fasit. Felles case-tekst vises ved alle tilhørende deloppgaver.</p></section>
    <section class="filter-panel" aria-label="Filtrer oppgavene"><div class="filter-top"><p class="filter-label">Velg tema</p><span class="filter-status" id="filter-status" aria-live="polite"></span></div><nav class="topic-scroll" id="topic-filters" aria-label="Temaer"></nav><div class="part-row" id="part-filters"><span class="filter-label">Eksamensdel</span></div><div class="difficulty-row" id="difficulty-filters"><span class="filter-label">Vanskelighetsgrad</span></div></section>
    <div id="results"></div>
    <footer>Oppgavene er laget som eksamensnær øving for Del 1 og Del 2 i Matematikk 2P-Y. Vanskelighetsmerkingen er veiledende.</footer>
  </main>
  <script id="question-data" type="application/json">${serializedBank}</script>
  <script>
    (()=>{const bank=JSON.parse(document.getElementById("question-data").textContent),results=document.getElementById("results"),topicFilters=document.getElementById("topic-filters"),partFilters=document.getElementById("part-filters"),difficultyFilters=document.getElementById("difficulty-filters"),status=document.getElementById("filter-status"),levels=["alle","mild","middels","utfordrende"];let activeTopic="alle",activePart="alle",activeLevel="alle";
    function el(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node}
    function filterButton(label,value,type,small=false){const button=el("button","filter-pill"+(small?" small":""),label);button.type="button";button.dataset.value=value;button.dataset.type=type;button.addEventListener("click",()=>{if(type==="topic")activeTopic=value;else if(type==="part")activePart=value;else activeLevel=value;updateActive();render()});return button}
    topicFilters.append(filterButton("Alle temaer","alle","topic"));bank.temaer.forEach(theme=>topicFilters.append(filterButton(theme.kortnavn,theme.id,"topic")));partFilters.append(filterButton("Begge deler","alle","part",true),filterButton("Del 1","1","part",true),filterButton("Del 2","2","part",true));levels.forEach(level=>difficultyFilters.append(filterButton(level==="alle"?"Alle nivåer":level[0].toUpperCase()+level.slice(1),level,"level",true)));
    const expandButton=el("button","expand-button","Åpne alle viste");expandButton.type="button";expandButton.addEventListener("click",()=>{const details=[...results.querySelectorAll("details")],shouldOpen=details.some(item=>!item.open);details.forEach(item=>{item.open=shouldOpen});expandButton.textContent=shouldOpen?"Lukk alle viste":"Åpne alle viste"});difficultyFilters.append(expandButton);
    function updateActive(){document.querySelectorAll(".filter-pill").forEach(button=>{const active=button.dataset.type==="topic"?button.dataset.value===activeTopic:button.dataset.type==="part"?button.dataset.value===activePart:button.dataset.value===activeLevel;button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active))})}
    function hintList(hints){const list=el("ol","hint-list");hints.forEach(hint=>{const item=el("li","hint-item");item.innerHTML=hint;list.append(item)});return list}
    function questionCard(question,number){const article=el("article","question-card"),main=el("div","question-main");main.append(el("span","question-number",String(number)));const content=el("div","question-content"),meta=el("div","question-meta");meta.append(el("span","question-id","Oppgave "+question.id));meta.append(el("span","part-badge","Del "+question.del));meta.append(el("span","difficulty-badge "+question.vanskelighetsgrad,question.vanskelighetsgrad));content.append(meta);if(question.group){const group=el("div","group-intro");group.innerHTML="<strong>"+question.group.title+" · "+question.group.part+")</strong>"+question.group.renderedIntro;content.append(group)}const questionText=el("div","question-text");questionText.innerHTML=question.renderedSporsmal;content.append(questionText);main.append(content);article.append(main);const details=el("details","question-details"),hasPaths=question.renderedLosningsveier.length>0,summary=el("summary","",hasPaths?"Vis "+question.renderedLosningsveier.length+" løsningsveier og fasit":"Vis "+question.hints.length+" hint og fasit");details.append(summary);const solution=el("div","solution");solution.append(el("p","solution-label",hasPaths?"Alternative løsningsveier":"Hint i rekkefølge"));if(hasPaths){question.renderedLosningsveier.forEach(path=>{const section=el("section","review-path");section.append(el("h3","",path.navn));section.append(el("p","",path.forklaring));section.append(hintList(path.renderedHints));solution.append(section)})}else{solution.append(hintList(question.renderedHints))}const answer=el("div","answer-box");answer.append(el("span","answer-label","Fasit"));const answerText=el("div","answer-text");answerText.innerHTML=question.renderedSvar;answer.append(answerText);solution.append(answer);details.append(solution);article.append(details);return article}
    function render(){results.replaceChildren();expandButton.textContent="Åpne alle viste";const visible=bank.oppgaver.filter(question=>(activeTopic==="alle"||question.tema===activeTopic)&&(activePart==="alle"||String(question.del)===activePart)&&(activeLevel==="alle"||question.vanskelighetsgrad===activeLevel));status.textContent="Viser oppgaver som passer filtrene";if(!visible.length){results.append(el("div","empty-state","Ingen oppgaver passer med disse filtrene."));return}bank.temaer.forEach(theme=>{const questions=visible.filter(question=>question.tema===theme.id);if(!questions.length)return;const section=el("section","theme-section");section.id="tema-"+theme.id;const heading=el("header","theme-heading");heading.append(el("span","theme-symbol",theme.symbol));const titleBlock=el("div");titleBlock.append(el("h2","",theme.navn));titleBlock.append(el("p","",theme.beskrivelse));heading.append(titleBlock);section.append(heading);const list=el("div","question-list");questions.forEach((question,index)=>list.append(questionCard(question,index+1)));section.append(list);results.append(section)})}
    updateActive();render()})();
  </script>
</body>
</html>`;

await writeFile(outputPath, html, "utf8");
console.log(JSON.stringify({ output: outputPath, questions: reviewBank.oppgaver.length,
  hints: reviewBank.oppgaver.reduce((sum, question) => sum + question.hints.length, 0),
  difficulty: Object.fromEntries(["mild", "middels", "utfordrende"].map((level) => [level, reviewBank.oppgaver.filter((question) => question.vanskelighetsgrad === level).length])) }));
