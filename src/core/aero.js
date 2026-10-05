// Ported verbatim from legacy/one-sheet-game.html (physics core). Do not edit without updating tests/golden.json.
// ---- aerodynamics ----
export function aeroModel(G,dihDeg){const AR=G.AR;const a=2*Math.PI*AR/(2+Math.sqrt(AR*AR+4));const cd2=Math.cos(dihDeg*Math.PI/180)**2;
  const Kv=Math.PI*Math.max(0,(2.2-AR)/2.2)*0.8;const aS=(12+16*Math.min(1,Math.max(0,(2.5-AR)/2)))*Math.PI/180;const e=0.72;
  const Vcap=Math.max(4,8.5*Math.pow(G.kW,0.75)*Math.sqrt(110/Math.max(20,G.semi))*Math.pow(G.gsm/80,1.0)*1.08);
  const fs=a/(2*Math.PI);const CLd=3.02*0.7*fs,Cmd=0.42*fs*(1-G.wSl)+G.armFlap*CLd;const Cmq=-1.2;const qFlex=0.5*1.2*Math.pow(0.55*Vcap,2);
  return{a,AR,Vcap,CLd,Cmd,Cmq,qFlex,
   coeffs(alpha,V,del){const sa=Math.sin(alpha),ca=Math.cos(alpha);
     const att=a*sa*ca+Kv*sa*Math.abs(sa)*ca;const CN=1.2*sa;const plate=CN*ca;
     const sig=1/(1+Math.exp(-(Math.abs(alpha)-aS)/0.035));
     const CL=((1-sig)*att+sig*plate)*cd2-CLd*del*(1-sig);
     const Re=Math.max(2e4,V*G.mac/1.5e-5);const Cf=1.328/Math.sqrt(Re)+0.0008;
     const CD0=Cf*(2*G.S+2*G.Skeel)/G.S+0.0015+0.0008*G.kLE;
     const CD=CD0+(1-sig)*CL*CL/(Math.PI*e*AR)+sig*CN*sa+0.3*del*del;
     return{CL,CD,CN,sig};}};}
