(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MLLabCore=api;})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
  function regression(w,b){const errors=[w+b-3,2*w+b-5];return {w,b,loss:mean(errors.map(e=>e*e)),dw:errors[0]+2*errors[1],db:errors[0]+errors[1]};}
  function gdStep(state,alpha){const s=regression(state.w,state.b);return {...regression(state.w-alpha*s.dw,state.b-alpha*s.db),step:(state.step||0)+1};}
  function sigmoid(x){return x>=0?1/(1+Math.exp(-x)):Math.exp(x)/(1+Math.exp(x));}
  function softmax(values,temperature=1){if(temperature<=0)throw new Error('positive temperature required');const max=Math.max(...values);const exp=values.map(x=>Math.exp((x-max)/temperature)),sum=exp.reduce((a,b)=>a+b,0);return exp.map(x=>x/sum);}
  const thresholdData=[{p:.9,y:1},{p:.8,y:0},{p:.7,y:1},{p:.4,y:0},{p:.3,y:1},{p:.1,y:0}];
  function confusion(threshold){let tp=0,fp=0,tn=0,fn=0;thresholdData.forEach(d=>{if(d.p>=threshold){d.y?tp++:fp++;}else{d.y?fn++:tn++;}});return {tp,fp,tn,fn,accuracy:(tp+tn)/6,precision:tp+fp?tp/(tp+fp):null,recall:tp/(tp+fn)};}
  const pcaPoints=[[-2,-1.2],[-1,-.3],[0,.2],[1,.4],[2,.9]];
  function projection(degrees){const a=degrees*Math.PI/180,u=[Math.cos(a),Math.sin(a)];const scores=pcaPoints.map(p=>p[0]*u[0]+p[1]*u[1]);return {u,scores,projected:scores.map(t=>[t*u[0],t*u[1]]),variance:mean(scores.map(t=>t*t))};}
  function neuron(w){const x=2,y=1,b=-1,z=w*x+b,a=Math.max(0,z),loss=.5*(a-y)**2;const da=a-y,dz=z>0?da:0,dw=dz*x;return {x,y,b,w,z,a,loss,da,dz,dw};}
  function convolution(position){const signal=[1,2,0,3,1],kernel=[1,-1,2],window=signal.slice(position,position+3),terms=window.map((x,i)=>x*kernel[i]);return {signal,kernel,window,terms,value:terms.reduce((a,b)=>a+b,0)};}
  function attention(position,causal=true){const scores=[1,.5,2,1.5];const available=scores.map((s,i)=>!causal||i<=position?s:-Infinity),weights=softmax(available);const values=[2,4,1,3];return {scores,weights,values,output:weights.reduce((s,w,i)=>s+w*values[i],0)};}
  function lora(rank,din=256,dout=128){return {rank,full:din*dout,trainable:rank*(din+dout),ratio:rank*(din+dout)/(din*dout)};}
  function pairedStats(n){const baseline=[.52,.50,.53,.51,.49,.52,.50,.54];const adapted=[.50,.51,.48,.50,.51,.49,.52,.50];const diff=baseline.slice(0,n).map((x,i)=>x-adapted[i]),avg=mean(diff);const sd=n>1?Math.sqrt(diff.reduce((s,x)=>s+(x-avg)**2,0)/(n-1)):null;return {diff,mean:avg,sd,min:Math.min(...diff),max:Math.max(...diff)};}
  function gini(labels){if(!labels.length)return 0;const p=mean(labels);return 1-p*p-(1-p)*(1-p);}
  function split(threshold){const xs=[1,2,3,4,5,6],ys=[0,0,1,0,1,1];const left=ys.filter((y,i)=>xs[i]<=threshold),right=ys.filter((y,i)=>xs[i]>threshold);return {xs,ys,left,right,impurity:(left.length*gini(left)+right.length*gini(right))/6,parent:gini(ys)};}
  function tradeoff(strength){const s=strength/100;return {newLoss:.8-.5*s+.08*s*s,oldLoss:.4+.22*s*s,strength:s};}
  return {mean,regression,gdStep,sigmoid,softmax,thresholdData,confusion,pcaPoints,projection,neuron,convolution,attention,lora,pairedStats,gini,split,tradeoff};
});
