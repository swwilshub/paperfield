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
  // and more colours
  {id:'mint',name:'Mint',base:'#BDEBD6'},
  {id:'lime',name:'Lime',base:'#C8E06A'},
  {id:'tangerine',name:'Tangerine',base:'#F28C38'},
  {id:'rose',name:'Rose',base:'#E8899A'},
  {id:'sky',name:'Sky',base:'#9BD3F2'},
  {id:'aqua',name:'Aqua',base:'#7FDCD3'},
  {id:'sand',name:'Sand',base:'#E4D3B0'},
  {id:'olive',name:'Olive',base:'#6E7438',dark:true},
  {id:'slate',name:'Slate',base:'#5D6B7A',dark:true},
  {id:'navy',name:'Navy',base:'#1F3A68',dark:true},
  {id:'burgundy',name:'Burgundy',base:'#7B2D3A',dark:true},
  {id:'ink',name:'Ink black',base:'#1B1C20',dark:true},
  // and more patterns
  {id:'honeycomb',name:'Honeycomb',base:'#FFE08A',pattern:'honeycomb'},
  {id:'harlequin',name:'Harlequin',base:'#F4E6F0',pattern:'harlequin'},
  {id:'confetti',name:'Confetti',base:'#FFFFFF',pattern:'confetti'},
  {id:'triangles',name:'Triangles',base:'#F6F1E7',pattern:'triangles'},
  {id:'leaves',name:'Leaves',base:'#F1F5E9',pattern:'leaves'},
  {id:'hearts',name:'Hearts',base:'#FFE3EA',pattern:'hearts'},
  {id:'clouds',name:'Clouds',base:'#9FCDF0',pattern:'clouds'},
  {id:'pinstripe',name:'Pinstripe',base:'#22304A',pattern:'pinstripe',dark:true},
  {id:'crosshatch',name:'Crosshatch',base:'#FBF7EE',pattern:'crosshatch'},
  {id:'marble',name:'Marble',base:'#F2F1EE',pattern:'marble'},
  {id:'camo',name:'Camo',base:'#6B7A45',pattern:'camo',dark:true},
  {id:'rainbow',name:'Rainbow',base:'#FFFFFF',pattern:'rainbow'},
];
export const PAPER_IDS=PAPERS.map(p=>p.id);
const BY_ID=new Map(PAPERS.map(p=>[p.id,p]));
// Unknown or missing paper shows as white.
export const paperDef=id=>BY_ID.get(id)||PAPERS[0];

// Paint one seamless tile of `paper` into a size×size 2D context.
// Scattered shapes are drawn at each of `WRAP`'s offsets so anything crossing an edge comes back on the other side.
const WRAP=[[0,0],[40,0],[-40,0],[0,40],[0,-40],[40,40],[-40,-40],[40,-40],[-40,40]];
const seeded=s=>()=>(s=(s*16807)%2147483647)/2147483647;
export function paintTile(x,size,paper){const k=size/TILE_MM,mm=v=>v*k;
  const poly=(pts,fill)=>{x.fillStyle=fill;x.beginPath();pts.forEach(([a,b],i)=>i?x.lineTo(mm(a),mm(b)):x.moveTo(mm(a),mm(b)));x.closePath();x.fill();};
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
    // Hexagons 10 mm across, rows 10 mm apart, every other row shifted half a cell.
    case 'honeycomb':{const R=20/3;line('rgba(190,120,20,.6)',0.35);
      for(let r=-1;r<=4;r++)for(let c=-1;c<=4;c++){const cx=c*10+(r%2?5:0),cy=r*10;x.beginPath();
        [[0,-R],[5,-R/2],[5,R/2],[0,R],[-5,R/2],[-5,-R/2]].forEach(([a,b],i)=>i?x.lineTo(mm(cx+a),mm(cy+b)):x.moveTo(mm(cx+a),mm(cy+b)));x.closePath();x.stroke();}break;}
    case 'harlequin':for(let r=-1;r<=2;r++)for(let c=-1;c<=4;c++){const cx=c*10+5,cy=r*20+10;
        poly([[cx,cy-10],[cx+5,cy],[cx,cy+10],[cx-5,cy]],'rgba(150,70,130,.55)');}break;   // the gaps between are the paper
    case 'confetti':{const r=seeded(17),cols=['#F25F5C','#FFE066','#247BA0','#70C1B3','#B388EB','#FF9F1C'];
      for(let i=0;i<60;i++){const px=r()*40,py=r()*40,w=0.8+r()*1.6,h=0.5+r()*0.6,rot=r()*3.14,c=cols[Math.floor(r()*cols.length)];
        for(const [dx,dy] of WRAP){x.save();x.translate(mm(px+dx),mm(py+dy));x.rotate(rot);x.fillStyle=c;x.fillRect(-mm(w/2),-mm(h/2),mm(w),mm(h));x.restore();}}break;}
    // Rows of triangles; the colour follows the triangle's place in the tile, so edges match.
    case 'triangles':{const cols=['rgba(224,122,95,.75)','rgba(61,90,128,.7)','rgba(242,204,143,.9)','rgba(129,178,154,.8)'];
      for(let r=0;r<4;r++)for(let c=0;c<8;c++){const y=r*10,xx=c*5;const up=(c+r)%2===0;
        poly(up?[[xx-5,y+10],[xx,y],[xx+5,y+10]]:[[xx-5,y],[xx+5,y],[xx,y+10]],cols[(r*3+c)%cols.length]);
        if(c===0)poly(up?[[35,y+10],[40,y],[45,y+10]]:[[35,y],[45,y],[40,y+10]],cols[(r*3+c)%cols.length]);}break;}
    case 'leaves':{const r=seeded(5);
      for(let i=0;i<14;i++){const px=r()*40,py=r()*40,a=r()*6.28,l=2.4+r()*1.4,c=r()<0.5?'rgba(80,140,90,.75)':'rgba(140,175,90,.75)';
        for(const [dx,dy] of WRAP){x.save();x.translate(mm(px+dx),mm(py+dy));x.rotate(a);x.fillStyle=c;x.beginPath();x.ellipse(0,0,mm(l),mm(l*0.42),0,0,7);x.fill();
          x.strokeStyle='rgba(255,255,255,.55)';x.lineWidth=Math.max(1,mm(0.15));x.beginPath();x.moveTo(-mm(l),0);x.lineTo(mm(l),0);x.stroke();x.restore();}}break;}
    case 'hearts':{x.fillStyle='rgba(225,70,100,.65)';const heart=(cx,cy,s)=>{x.beginPath();x.moveTo(mm(cx),mm(cy+s*0.9));
        x.bezierCurveTo(mm(cx-s*1.3),mm(cy),mm(cx-s*0.7),mm(cy-s*1.1),mm(cx),mm(cy-s*0.4));x.bezierCurveTo(mm(cx+s*0.7),mm(cy-s*1.1),mm(cx+s*1.3),mm(cy),mm(cx),mm(cy+s*0.9));x.fill();};
      for(const [cx,cy] of [[5,5],[25,5],[15,15],[35,15],[5,25],[25,25],[15,35],[35,35]])for(const [dx,dy] of WRAP)heart(cx+dx,cy+dy,2.2);break;}
    case 'clouds':{x.fillStyle='rgba(255,255,255,.92)';
      for(const [cx,cy] of [[8,10],[30,24],[16,34]])for(const [dx,dy] of WRAP)for(const [ox,oy,rr] of [[-3,0.6,2.2],[0,-0.8,3],[3.2,0.4,2.4],[0,1.2,2.4]]){x.beginPath();x.arc(mm(cx+dx+ox),mm(cy+dy+oy),mm(rr),0,7);x.fill();}break;}
    case 'pinstripe':line('rgba(220,230,245,.45)',0.2);for(let i=0;i<8;i++){const p=mm(i*5+2.5);x.beginPath();x.moveTo(p,0);x.lineTo(p,size);x.stroke();}break;
    case 'crosshatch':line('rgba(60,80,120,.35)',0.2);x.beginPath();
      for(let i=-8;i<=16;i++){x.moveTo(mm(i*5),0);x.lineTo(mm(i*5+40),size);x.moveTo(mm(i*5),0);x.lineTo(mm(i*5-40),size);}x.stroke();break;
    // Veins as waves whose period divides the tile, so they run on across both edges.
    case 'marble':for(const [y0,amp,per,ph,c,w] of [[8,3,1,0.4,'rgba(120,120,130,.45)',0.35],[22,4,2,1.7,'rgba(150,140,120,.4)',0.25],[33,2.5,1,3.1,'rgba(110,115,125,.35)',0.2]]){
        line(c,w);for(const dy of [-40,0,40]){x.beginPath();for(let t=0;t<=80;t++){const xx=t/2,yy=y0+dy+amp*Math.sin(xx/40*2*Math.PI*per+ph)+0.8*Math.sin(xx/40*2*Math.PI*3*per+ph*2);t?x.lineTo(mm(xx),mm(yy)):x.moveTo(mm(xx),mm(yy));}x.stroke();}}break;
    case 'camo':{const r=seeded(23),cols=['rgba(45,55,30,.8)','rgba(140,130,80,.75)','rgba(85,100,55,.85)'];
      for(let i=0;i<22;i++){const px=r()*40,py=r()*40,rx=2+r()*4,ry=1.5+r()*2.5,rot=r()*3.14,c=cols[i%3];
        for(const [dx,dy] of WRAP){x.fillStyle=c;x.beginPath();x.ellipse(mm(px+dx),mm(py+dy),mm(rx),mm(ry),rot,0,7);x.fill();}}break;}
    // Diagonal bands: x + y repeats every 40 mm, so the bands meet across the edges.
    case 'rainbow':{const cols=['#F25F5C','#FF9F1C','#FFE066','#70C1B3','#247BA0','#8E6CCF'];const d=40/6;
      for(let i=-6;i<12;i++){const a=i*d,b=a+d;poly([[a,0],[b,0],[b-40,40],[a-40,40]],cols[((i%6)+6)%6]);}break;}
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
