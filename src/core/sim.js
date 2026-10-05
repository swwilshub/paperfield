// Ported verbatim from legacy/one-sheet-game.html (physics core). Do not edit without updating tests/golden.json.
// ---- 3-DOF longitudinal flight: x, z, vx, vz, theta, q ----
export function simulate(G,aero,launch,o){o=o||{};const m=G.mass,I=G.Iyy,S=G.S,c=G.mac,rho=1.2,gr=9.81;const del=launch.delta*Math.PI/180;
  const dt=0.003,tmax=o.tmax||45;const rec=o.record?[]:null;
  const g0=launch.gamma*Math.PI/180;let s=[0,launch.h,launch.V*Math.cos(g0),launch.V*Math.sin(g0),g0+(launch.alpha0||0)*Math.PI/180,0];
  const th0=s[4];let maxZ=launch.h,t=0,thMin=th0,thMax=th0;
  function der(s){const vx=s[2],vz=s[3];const V=Math.hypot(vx,vz)+1e-6;const gam=Math.atan2(vz,vx);let al=s[4]-gam;al=Math.atan2(Math.sin(al),Math.cos(al));
    const qd=0.5*rho*V*V*S;const dE=del/(1+qd/S/aero.qFlex);const k=aero.coeffs(al,V,dE);const L=qd*k.CL,D=qd*k.CD;
    const ux=vx/V,uz=vz/V;const ax=(-D*ux-L*uz)/m,az=(-D*uz+L*ux)/m-gr;
    const aa=Math.abs(al)*180/Math.PI;const xcp=aa<=90?0.25+0.25*aa/90:0.75-0.25*(180-aa)/90;const xcg=0.25-G.SM;
    const Cm=(1-k.sig)*(aero.Cmd*dE-G.SM*(k.CL+aero.CLd*dE))+k.sig*(-(xcp-xcg)*k.CN)+aero.Cmq*s[5]*c/(2*V);
    return[vx,vz,ax,az,s[5],qd*c*Cm/I];}
  let n=0;if(rec)rec.push([0,0,launch.h,s[4]]);
  while(t<tmax){const k1=der(s),s2=s.map((v,i)=>v+0.5*dt*k1[i]),k2=der(s2),s3=s.map((v,i)=>v+0.5*dt*k2[i]),k3=der(s3),s4=s.map((v,i)=>v+dt*k3[i]),k4=der(s4);
    const prev=s;s=s.map((v,i)=>v+dt/6*(k1[i]+2*k2[i]+2*k3[i]+k4[i]));t+=dt;
    if(!isFinite(s[0])||!isFinite(s[4])){s=prev;break;}
    if(s[1]>maxZ)maxZ=s[1];if(s[4]>thMax)thMax=s[4];if(s[4]<thMin)thMin=s[4];
    if(rec&&(++n%17===0))rec.push([t,s[0],s[1],s[4]]);
    if(s[1]<=0){const f=prev[1]/(prev[1]-s[1]);const x=prev[0]+f*(s[0]-prev[0]);t=t-dt+f*dt;if(rec)rec.push([t,x,0,s[4]]);
      return{dist:Math.max(0,x),time:t,maxZ,tr:rec,loops:Math.floor((thMax-thMin)/(2*Math.PI)+0.08)};}}
  return{dist:Math.max(0,s[0]),time:t,maxZ,tr:rec,loops:Math.floor((thMax-thMin)/(2*Math.PI)+0.08)};}
