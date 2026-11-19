// Pull the prototype's FX code out of its main.js, as is, into one script for the A/B test.
const fs=require('fs'); const src=fs.readFileSync('/home/user/troyskinner3/tuttii-fx-prototype/src/main.js','utf8');
const block=(start)=>{ const i=src.indexOf(start); if(i<0) throw new Error('missing '+start); let j=src.indexOf('{',i), d=0; for(let k=j;k<src.length;k++){ if(src[k]==='{') d++; else if(src[k]==='}'){ d--; if(!d) return src.slice(i,k+1); } } };
const arr=(start)=>{ const i=src.indexOf(start); let j=src.indexOf('[',i), d=0; for(let k=j;k<src.length;k++){ if(src[k]==='[') d++; else if(src[k]===']'){ d--; if(!d) return src.slice(i,k+1)+';'; } } };
const fns=['function fxEffectFor','function fxParamValue','function fxDefaultCurveNodes','function fxCurveValueAtT','function fxCurveFracAt','function fxCurveScheduleBreakpoints','function scheduleFxSweep','function schedulePhaserSweep','function fxDepthEnvelope','function fxBitcrushCurve','function buildFxUnit','function reverbImpulseBuffer','function longNoiseBuffer'];
let out='const PROTO=(()=>{ const PROJECT_BPM=120; const BAR_SECONDS=(60/PROJECT_BPM)*4; function barsToSeconds(b){ return b*BAR_SECONDS; }\n';
out+=src.match(/const FX_CURVE_MIN_NODE_GAP = [^;]+;/)[0]+'\n'+src.match(/const FX_DEFAULT_DROP_SEC = [^;]+;/)[0]+'\n'+src.match(/const FX_BOW_SUBSAMPLES = [^;]+;/)[0]+'\nlet longNoiseBufferCache=null, reverbImpulseCache=null;\n';
out+=arr('const FX_EFFECTS = [')+'\n'+fns.map(block).join('\n')+'\nreturn {FX_EFFECTS, buildFxUnit, fxCurveFracAt}; })();\n';
fs.writeFileSync('srv/proto_fx.js',out); console.log(out.length,'bytes');
