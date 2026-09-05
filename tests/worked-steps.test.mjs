import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
async function compile(name) {
 const url=new URL(`../app/${name}`,import.meta.url);
 const source=await readFile(url,'utf8');
 let {outputText}=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
 const imports=[...outputText.matchAll(/from (["'])([^"']+)\1/gu)];
 for(const [match,,specifier] of imports){
  const resolved=specifier==='./presentation' ? await compile('presentation.tsx') : specifier.startsWith('.') ? new URL(`${specifier}.ts`,url).href : import.meta.resolve(specifier);
  outputText=outputText.replace(match,`from ${JSON.stringify(resolved)}`);
 }
 return `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
}
const {WorkedSteps}=await import(await compile('worked-steps.tsx'));
const base={hints:['Første forklaring','Andre forklaring med \\(2^3\\)','Tredje forklaring'],paths:[],selectedPath:null,revealed:2,resolved:false,solution:'Eksempelsvar',onReveal(){},onChoose(){}};
test('løsningsflaten viser ett aktivt steg og tilgjengelig navigasjon',()=>{
 const html=renderToStaticMarkup(createElement(WorkedSteps,base));
 assert.match(html,/Andre forklaring/);assert.doesNotMatch(html,/Første forklaring|Tredje forklaring|Eksempelsvar/);
 assert.match(html,/aria-current="step"/);assert.match(html,/Åpne neste steg/);assert.match(html,/Se åpnede steg samlet/);assert.match(html,/class="katex"/);
});
test('ingen forklaring eller fasit avsløres før første steg',()=>{
 const html=renderToStaticMarkup(createElement(WorkedSteps,{...base,revealed:0}));
 assert.doesNotMatch(html,/Første forklaring|Andre forklaring|Eksempelsvar/);assert.match(html,/Åpne første steg/);
});
test('løsningsforslaget er sammenfoldet etter siste steg',()=>{
 const html=renderToStaticMarkup(createElement(WorkedSteps,{...base,revealed:3}));
 assert.match(html,/<details class="worked-solution">/);assert.doesNotMatch(html,/Åpne neste steg/);
});
test('løsningssteg har stor brødtekst og sidevisning på brede skjermer',async()=>{
 const css=await readFile(new URL('../app/globals.css',import.meta.url),'utf8');
 assert.match(css,/\.worked-step-body p, \.worked-solution p\s*\{[^}]*font-size: 1\.125rem/);
 assert.match(css,/@media \(min-width: 1100px\)[\s\S]*\.question-workspace \{ display: grid/);
 assert.match(css,/\.worked-step-body p \{ font-size: 1\.0625rem/);
});
