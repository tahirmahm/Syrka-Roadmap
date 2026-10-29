import {mkdir,copyFile,readdir,cp} from 'node:fs/promises';
const root=new URL('../',import.meta.url);const src=new URL('node_modules/',root),out=new URL('public/document/',root);
await mkdir(out,{recursive:true});await mkdir(new URL('ocr/lang/',out),{recursive:true});
await copyFile(new URL('pdfjs-dist/build/pdf.worker.min.mjs',src),new URL('pdf.worker.min.mjs',out));
await cp(new URL('pdfjs-dist/standard_fonts/',src),new URL('standard_fonts/',out),{recursive:true});
await cp(new URL('pdfjs-dist/wasm/',src),new URL('wasm/',out),{recursive:true});
await copyFile(new URL('tesseract.js/dist/worker.min.js',src),new URL('ocr/worker.min.js',out));
for(const name of await readdir(new URL('tesseract.js-core/',src)))if(name.endsWith('.wasm')||name.endsWith('.wasm.js'))await copyFile(new URL('tesseract.js-core/'+name,src),new URL('ocr/'+name,out));
await copyFile(new URL('@tesseract.js-data/eng/4.0.0/eng.traineddata.gz',src),new URL('ocr/lang/eng.traineddata.gz',out));
for(const [from,to] of [['pdfjs-dist/LICENSE','PDFJS-LICENSE'],['tesseract.js/LICENSE.md','TESSERACT-LICENSE'],['tesseract.js-core/LICENSE','TESSERACT-CORE-LICENSE']]){try{await copyFile(new URL(from,src),new URL(to,out));}catch{/* Some package distributions name licence files differently. */}}
console.log('Prepared local PDF/OCR workers, fonts, WASM and English language data.');
