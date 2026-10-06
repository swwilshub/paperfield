// The papers a plane can be folded from: a fixed set of colours and printed patterns.
// Nothing here is user-made. `id` is what's saved on the plane doc (firestore.rules lists the same
// ids). The first six keep their original hex ids so planes saved before patterns existed still match.
//
// A pattern is a seamless tile covering TILE_MM × TILE_MM of paper, so it appears at real size on
// every plane (graph squares are 5 mm on a small dart and a big glider alike).

export const TILE_MM=40;
export const PAPERS=[
  {id:'#FFFFFF',name:'White',base:'#FFFFFF'},
  {id:'#FFF3B0',name:'Yellow',base:'#FFF3B0'},
  {id:'#CDE7FF',name:'Blue',base:'#CDE7FF'},
  {id:'#FFD6DE',name:'Pink',base:'#FFD6DE'},
  {id:'#D6F5DF',name:'Green',base:'#D6F5DF'},
  {id:'#E6E0FF',name:'Lilac',base:'#E6E0FF'},
  {id:'cream',name:'Cream',base:'#F5ECD7'},
  {id:'kraft',name:'Kraft',base:'#C49A6C',pattern:'fibres'},
  {id:'red',name:'Origami red',base:'#D8443A'},
  {id:'midnight',name:'Midnight',base:'#23324F',dark:true},
  {id:'graph',name:'Graph paper',base:'#FBFDFF',pattern:'grid'},
  {id:'lined',name:'Notebook',base:'#FFFEF7',pattern:'lined'},
  {id:'dots',name:'Dot grid',base:'#FFFFFF',pattern:'dots'},
  {id:'news',name:'Newsprint',base:'#E8E4DA',pattern:'news'},
  {id:'waves',name:'Waves',base:'#F4ECDD',pattern:'waves'},
  {id:'polka',name:'Polka',base:'#E5534B',pattern:'polka'},
  {id:'contour',name:'Map',base:'#EEF1E0',pattern:'contour'},
  {id:'chevron',name:'Chevron',base:'#FFDFA6',pattern:'chevron'},
  // more colours
  {id:'coral',name:'Coral',base:'#FF8C7A'},
  {id:'peach',name:'Peach',base:'#FFD5B5'},
  {id:'mustard',name:'Mustard',base:'#E6B53D'},
  {id:'sage',name:'Sage',base:'#B8CCAF'},
  {id:'teal',name:'Teal',base:'#3F9D9B'},
  {id:'cornflower',name:'Cornflower',base:'#82A7E6'},
  {id:'plum',name:'Plum',base:'#7A4B7E',dark:true},
  {id:'forest',name:'Forest',base:'#2F5D47',dark:true},
  {id:'charcoal',name:'Charcoal',base:'#3A3E45',dark:true},
  {id:'tracing',name:'Tracing paper',base:'#EEF2F1'},
  // more patterns
  {id:'gingham',name:'Gingham',base:'#FFFFFF',pattern:'gingham'},
  {id:'stripes',name:'Candy stripe',base:'#FFF4F6',pattern:'stripes'},
  {id:'checks',name:'Checks',base:'#F7F1E3',pattern:'checks'},
  {id:'argyle',name:'Argyle',base:'#E9EEF6',pattern:'argyle'},
  {id:'tartan',name:'Tartan',base:'#2E4A3A',pattern:'tartan',dark:true},
  {id:'music',name:'Manuscript',base:'#FFFEF8',pattern:'staves'},
  {id:'blueprint',name:'Blueprint',base:'#21508F',pattern:'blueprint',dark:true},
  {id:'stars',name:'Starry night',base:'#1D2A4D',pattern:'stars',dark:true},
  {id:'terrazzo',name:'Terrazzo',base:'#F3EEE7',pattern:'terrazzo'},
  {id:'sakura',name:'Sakura',base:'#FFF6EE',pattern:'sakura'},
];
export const PAPER_IDS=PAPERS.map(p=>p.id);
const BY_ID=new Map(PAPERS.map(p=>[p.id,p]));
// Unknown or missing paper shows as white.
export const paperDef=id=>BY_ID.get(id)||PAPERS[0];

// Paint one seamless tile of `paper` into a size×size 2D context.
export function paintTile(x,size,paper){const k=size/TILE_MM,mm=v=>v*k;
  x.fillStyle=paper.base;x.fillRect(0,0,size,size);
  const line=(c,w)=>{x.strokeStyle=c;x.lineWidth=Math.max(1,mm(w));};
  switch(paper.pattern){
    case 'grid':line('rgba(64,140,210,.35)',0.18);for(let i=0;i<8;i++){const p=mm(i*5)+0.5;x.beginPath();x.moveTo(p,0);x.lineTo(p,size);x.moveTo(0,p);x.lineTo(size,p);x.stroke();}
      line('rgba(64,140,210,.6)',0.3);x.beginPath();x.moveTo(0.5,0);x.lineTo(0.5,size);x.moveTo(0,0.5);x.lineTo(size,0.5);x.stroke();break;
    case 'lined':line('rgba(70,120,200,.5)',0.3);for(let i=0;i<5;i++){const p=mm(i*8+4);x.beginPath();x.moveTo(0,p);x.lineTo(size,p);x.stroke();}break;
    case 'dots':x.fillStyle='rgba(60,70,90,.45)';for(let i=0;i<8;i++)for(let j=0;j<8;j++){x.beginPath();x.arc(mm(i*5+2.5),mm(j*5+2.5),Math.max(0.8,mm(0.35)),0,7);x.fill();}break;
    case 'news':x.fillStyle='rgba(40,40,40,.28)';for(let col=0;col<2;col++)for(let r=0;r<13;r++){const len=(r*7+col*3)%5===0?10:17;x.fillRect(mm(col*20+1.5),mm(r*3+1),mm(len),Math.max(1,mm(0.9)));}
      x.fillStyle='rgba(40,40,40,.12)';x.fillRect(mm(19.6),0,Math.max(1,mm(0.25)),size);break;
    case 'fibres':{let s=7;const r=()=>(s=(s*16807)%2147483647)/2147483647;for(let i=0;i<220;i++){const a=r()*Math.PI,l=mm(0.6+r()*2),px=r()*size,py=r()*size;
        x.strokeStyle=r()<0.5?'rgba(90,60,30,.22)':'rgba(255,240,215,.25)';x.lineWidth=Math.max(1,mm(0.15));
        for(const [dx,dy] of [[0,0],[size,0],[-size,0],[0,size],[0,-size]]){x.beginPath();x.moveTo(px+dx,py+dy);x.lineTo(px+dx+Math.cos(a)*l,py+dy+Math.sin(a)*l);x.stroke();}}break;}
    case 'waves':{const R=mm(10);line('rgba(40,80,140,.55)',0.5);
      for(let row=-1;row<=4;row++)for(let c=-1;c<=2;c++){const cx=c*2*R+(row%2?R:0),cy=row*R*1;
        x.fillStyle=paper.base;x.beginPath();x.arc(cx,cy,R,Math.PI,0);x.fill();
        for(let q=1;q<=4;q++){x.beginPath();x.arc(cx,cy,R*q/4,Math.PI,0);x.stroke();}}break;}
    case 'polka':x.fillStyle='rgba(255,255,255,.9)';for(const [cx,cy] of [[0,0],[20,0],[40,0],[0,40],[20,40],[40,40],[10,20],[30,20]]){x.beginPath();x.arc(mm(cx),mm(cy),mm(3.2),0,7);x.fill();}break;
    case 'contour':for(let i=0;i<5;i++){line(i%2?'rgba(120,95,60,.45)':'rgba(70,120,80,.45)',0.3);x.beginPath();
        for(let t=0;t<=40;t++){const xx=mm(t),yy=mm(i*8+4+2.2*Math.sin(t/40*2*Math.PI*2+i)+1.2*Math.sin(t/40*2*Math.PI*3));t?x.lineTo(xx,yy):x.moveTo(xx,yy);}x.stroke();}break;
    case 'chevron':x.fillStyle='rgba(225,120,60,.55)';for(let r=0;r<4;r++){const y=mm(r*10);x.beginPath();
        for(let t=0;t<=4;t++)x.lineTo(mm(t*10),y+(t%2?mm(5):0));for(let t=4;t>=0;t--)x.lineTo(mm(t*10),y+(t%2?mm(5):0)+mm(3.5));x.closePath();x.fill();}break;
    case 'gingham':x.fillStyle='rgba(214,70,70,.35)';for(let i=0;i<4;i++){x.fillRect(mm(i*10),0,mm(5),size);x.fillRect(0,mm(i*10),size,mm(5));}break;
    case 'stripes':x.fillStyle='rgba(230,90,120,.55)';for(let i=0;i<5;i++)x.fillRect(mm(i*8),0,mm(4),size);break;
    case 'checks':x.fillStyle='rgba(60,70,90,.85)';for(let i=0;i<4;i++)for(let j=0;j<4;j++)if((i+j)%2)x.fillRect(mm(i*10),mm(j*10),mm(10),mm(10));break;
    case 'argyle':{x.fillStyle='rgba(120,150,200,.55)';for(const [cx,cy] of [[10,10],[30,30],[30,-10],[-10,30],[50,10],[10,50],[50,50],[-10,-10]]){x.beginPath();x.moveTo(mm(cx),mm(cy-10));x.lineTo(mm(cx+10),mm(cy));x.lineTo(mm(cx),mm(cy+10));x.lineTo(mm(cx-10),mm(cy));x.closePath();x.fill();}
      line('rgba(200,80,90,.6)',0.3);x.setLineDash([mm(1.2),mm(1.2)]);x.beginPath();for(let i=-1;i<=2;i++){x.moveTo(mm(i*20),0);x.lineTo(mm(i*20+40),size);x.moveTo(mm(i*20+40),0);x.lineTo(mm(i*20),size);}x.stroke();x.setLineDash([]);break;}
    case 'tartan':for(const [c,w,o] of [['rgba(170,40,40,.55)',6,4],['rgba(240,200,80,.5)',1.2,14],['rgba(20,30,60,.45)',8,24]]){x.fillStyle=c;x.fillRect(mm(o),0,mm(w),size);x.fillRect(0,mm(o),size,mm(w));}break;
    case 'staves':line('rgba(60,60,70,.5)',0.18);for(const g of [4,24])for(let i=0;i<5;i++){const y=mm(g+i*1.6);x.beginPath();x.moveTo(0,y);x.lineTo(size,y);x.stroke();}break;
    case 'blueprint':line('rgba(255,255,255,.22)',0.15);for(let i=0;i<8;i++){const p=mm(i*5)+0.5;x.beginPath();x.moveTo(p,0);x.lineTo(p,size);x.moveTo(0,p);x.lineTo(size,p);x.stroke();}
      line('rgba(255,255,255,.45)',0.3);for(const p of [0.5,mm(20)]){x.beginPath();x.moveTo(p,0);x.lineTo(p,size);x.moveTo(0,p);x.lineTo(size,p);x.stroke();}break;
    case 'stars':{let s=99;const r=()=>(s=(s*16807)%2147483647)/2147483647;x.fillStyle='rgba(255,240,200,.9)';
      for(let i=0;i<26;i++){const px=r()*size,py=r()*size,rad=Math.max(0.6,mm(r()<0.15?0.9:0.35));
        for(const [dx,dy] of [[0,0],[size,0],[-size,0],[0,size],[0,-size]]){x.beginPath();x.arc(px+dx,py+dy,rad,0,7);x.fill();}}break;}
    case 'terrazzo':{let s=31;const r=()=>(s=(s*16807)%2147483647)/2147483647;const cols=['#E07A5F','#3D5A80','#F2CC8F','#81B29A','#2B2D42'];
      for(let i=0;i<70;i++){x.fillStyle=cols[Math.floor(r()*cols.length)];const px=r()*size,py=r()*size,rad=mm(0.4+r()*1.4),rot=r()*3;
        for(const [dx,dy] of [[0,0],[size,0],[-size,0],[0,size],[0,-size]]){x.beginPath();x.ellipse(px+dx,py+dy,rad,rad*0.6,rot,0,7);x.fill();}}break;}
    case 'sakura':{x.fillStyle='rgba(240,140,170,.7)';for(const [cx,cy,a] of [[8,8,0],[28,14,1],[16,30,2],[36,34,0.5],[2,22,1.5]])for(const [dx,dy] of [[0,0],[40,0],[-40,0],[0,40],[0,-40]])
        for(let k=0;k<5;k++){const t=a+k*Math.PI*2/5;x.beginPath();x.ellipse(mm(cx+dx+Math.cos(t)*1.6),mm(cy+dy+Math.sin(t)*1.6),mm(1.5),mm(0.9),t,0,7);x.fill();}break;}
  }}

// Cached tile canvases (browser only).
const tiles=new Map();
export function tileCanvas(paper,size){const key=paper.id+'@'+size;if(tiles.has(key))return tiles.get(key);
  const c=document.createElement('canvas');c.width=c.height=size;paintTile(c.getContext('2d'),size,paper);tiles.set(key,c);return c;}
// A fill for a 2D canvas: plain colour, or the pattern at `pxPerMm` pixels per millimetre.
export function paperFill(ctx,paper,pxPerMm){if(!paper.pattern)return paper.base;
  const size=Math.max(8,Math.round(TILE_MM*pxPerMm));return ctx.createPattern(tileCanvas(paper,size),'repeat');}

// SVG fill for the fold and wing diagrams (whose units are millimetres): plain colour, or a
// pattern definition to put in <defs>.
const svgUrls=new Map();
export function svgPaper(paper,id){if(!paper.pattern)return{defs:'',fill:paper.base};
  if(!svgUrls.has(paper.id))svgUrls.set(paper.id,tileCanvas(paper,160).toDataURL());
  return{defs:`<pattern id="${id}" patternUnits="userSpaceOnUse" width="${TILE_MM}" height="${TILE_MM}"><image href="${svgUrls.get(paper.id)}" width="${TILE_MM}" height="${TILE_MM}"/></pattern>`,fill:`url(#${id})`};}
