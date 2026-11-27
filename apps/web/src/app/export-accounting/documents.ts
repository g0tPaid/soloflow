import { jsPDF } from 'jspdf';

type Row = Record<string, string | number | boolean>;
export type DocumentKind = 'Proforma Invoice' | 'Commercial Invoice' | 'Packing List';
const names: Record<DocumentKind, string> = {'Proforma Invoice':'形式发票', 'Commercial Invoice':'商业发票', 'Packing List':'装箱单'};
const val = (r: Row, k: string) => String(r[k] ?? '');
const n = (r: Row, k: string) => Number(r[k] || 0);
const amt = (amount:number) => amount.toFixed(2);
export type ExtraItem = {id:string;description:string;model:string;hsCode:string;origin:string;unit:string;qty:number;unitPrice:number;unitCost:number};
export function extraItems(deal:Row):ExtraItem[]{try{const rows=JSON.parse(val(deal,'extraItems')||'[]');return Array.isArray(rows)?rows:[];}catch{return [];}}
export function goodsTotal(deal:Row){return n(deal,'qty')*n(deal,'unitPrice')+extraItems(deal).reduce((s,i)=>s+i.qty*i.unitPrice,0);}
export function purchaseTotal(deal:Row){return n(deal,'qty')*n(deal,'unitCost')+extraItems(deal).reduce((s,i)=>s+i.qty*i.unitCost,0);}
export function requiredDocumentFields(deal: Row, seller: Row, kind:DocumentKind):string[] {
  const missing:string[] = [];
  for(const [r,k,label] of [[seller,'name','Exporter legal name'],[seller,'address','Exporter address'],[seller,'uscc','Exporter USCC'],[deal,'customer','Buyer name'],[deal,'customerAddress','Buyer address'],[deal,'customerCountry','Buyer country'],[deal,'product','Product description'],[deal,'unit','Unit'],[deal,'date','Invoice date']] as const) if(!val(r,k).trim())missing.push(label);
  if(val(seller,'uscc').trim()&&!/^[0-9A-Z]{18}$/.test(val(seller,'uscc').trim().toUpperCase()))missing.push('Valid 18-character exporter USCC');
  if(!val(deal,'number').trim())missing.push('Document reference');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(val(deal,'date')))missing.push('Valid document date');
  if(n(deal,'qty')<=0||!Number.isFinite(n(deal,'qty')))missing.push('Positive quantity');
  if(kind!=='Packing List'&&!/^[A-Z]{3}$/.test(val(deal,'currency')))missing.push('ISO currency code');
  if(kind!=='Packing List'&&['unitPrice','freightCharge','insuranceCharge','otherCharge'].some(k=>!Number.isFinite(n(deal,k))||n(deal,k)<0))missing.push('Non-negative price and charges');
  if(kind!=='Packing List' && n(deal,'unitPrice')<=0)missing.push('Positive unit price');
  if(kind==='Commercial Invoice')for(const [k,label] of [['hsCode','HS code'],['origin','Origin'],['incoterm','Incoterm and named place'],['contractNo','Contract reference'],['portLoading','Port of loading'],['portDestination','Destination'],['paymentTerms','Payment terms']] as const)if(!val(deal,k).trim())missing.push(label);
  if(kind==='Commercial Invoice'||kind==='Proforma Invoice'){
    const term=val(deal,'incoterm').trim();
    if(!/^(EXW|FCA|CPT|CIP|DAP|DPU|DDP|FAS|FOB|CFR|CIF)\s+\S/i.test(term))missing.push('Incoterms 2020 rule and agreed named place');
    if(/^(FAS|FOB|CFR|CIF)\b/i.test(term)&&/air|rail|road|courier|空运|铁路|公路|快递/i.test(val(deal,'transportMethod')))missing.push('Use a transport-appropriate Incoterm (sea rules are sea/inland waterway only)');
  }
  if(kind==='Packing List' && (n(deal,'cartons')<=0||n(deal,'grossWeight')<=0||n(deal,'netWeight')<0||n(deal,'grossWeight')<n(deal,'netWeight')))missing.push('Valid packaging and gross/net weights');
  extraItems(deal).forEach((i,index)=>{if(!i.description.trim()||!i.unit.trim()||i.qty<=0||(kind!=='Packing List'&&i.unitPrice<=0)||(kind==='Commercial Invoice'&&(!i.hsCode.trim()||!i.origin.trim())))missing.push(`Complete additional item ${index+2}`);});
  return missing;
}
export function amountInWords(amount:number,currency:string):string {
  if(!Number.isFinite(amount)||amount<0||amount>1e12)return currency+' '+amt(amount);
  const small=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  const tens=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
  const say=(value:number):string=>{if(value<20)return small[value];if(value<100)return tens[Math.floor(value/10)]+(value%10?' '+small[value%10]:'');if(value<1000)return small[Math.floor(value/100)]+' hundred'+(value%100?' '+say(value%100):'');for(const [scale,name] of [[1e12,'trillion'],[1e9,'billion'],[1e6,'million'],[1000,'thousand']] as const){if(value>=scale)return say(Math.floor(value/scale))+' '+name+(value%scale?' '+say(value%scale):'');}return '';};
  const cents=Math.round(amount*100),whole=Math.floor(cents/100),minor=cents%100;
  return (currency+' '+say(whole)+(minor?' and '+String(minor).padStart(2,'0')+'/100':'')+' only').toUpperCase();
}
export async function downloadExportDocument(deal:Row,seller:Row,kind:DocumentKind) {
  const missing=requiredDocumentFields(deal,seller,kind),packing=kind==='Packing List';
  const pdf=new jsPDF({format:'a4',unit:'mm',compress:true});
  const prefix=kind==='Proforma Invoice'?'PI':kind==='Commercial Invoice'?'CI':'PL';
  const ref=val(deal,kind==='Proforma Invoice'?'piNumber':kind==='Commercial Invoice'?'ciNumber':'plNumber')||val(deal,'number')+'-'+prefix;
  const date=val(deal,kind==='Proforma Invoice'?'piDate':kind==='Commercial Invoice'?'ciDate':'plDate')||val(deal,'date');
  const sample=/SAMPLE/i.test(val(deal,'number'))||/SAMPLE/i.test(val(seller,'name'));
  const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('PDF rendering is unavailable');
  if(document.fonts)await document.fonts.load('12px "Noto Sans SC"',Object.values({...seller,...deal}).join('')+names[kind]+'购买方收货人商品单价金额运输条件银行授权签字公司盖章').catch(()=>undefined);
  const W=210,L=14,R=196,wide=182,scale=3.78*3;
  const accent='#e60046',ink='#142239',muted='#58677c',light='#f1f5f9',border='#dbe2eb',navy='#17263d';
  let y=14;
  const rgb=(hex:string):[number,number,number]=>[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];
  const font=(size:number,bold:boolean)=>`${bold?'600':'400'} ${size*1.333*3}px "Noto Sans SC", "Microsoft YaHei", Arial, sans-serif`;
  const lh=(size:number)=>size*.42+1;
  const wrap=(text:string,width:number,size=9,bold=false)=>{ctx.font=font(size,bold);const rows:string[]=[];let row='';for(const ch of (text||'—')){if(ch==='\n'||ctx.measureText(row+ch).width>width*scale-5){rows.push(row);row=ch==='\n'?'':ch;}else row+=ch;}if(row||!rows.length)rows.push(row);return rows;};
  const drawLine=(text:string,x:number,top:number,width:number,size=9,bold=false,color=ink,align:'left'|'right'|'center'='left')=>{
    if(!text)return;
    if(/^[\x20-\x7e]+$/.test(text)){pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);pdf.setTextColor(...rgb(color));pdf.text(text,align==='right'?x+width:align==='center'?x+width/2:x,top+size*.34,{align});return;}
    ctx.font=font(size,bold);const pixels=Math.max(1,Math.min(Math.ceil(width*scale),Math.ceil(ctx.measureText(text).width+6)));
    canvas.width=pixels;canvas.height=Math.ceil(lh(size)*scale);ctx.font=font(size,bold);ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,2,canvas.height/2);
    const mm=pixels/scale;pdf.addImage(canvas.toDataURL('image/png'),'PNG',align==='right'?x+width-mm:align==='center'?x+(width-mm)/2:x,top,mm,lh(size));
  };
  const draw=(text:string,x:number,top:number,width:number,size=9,bold=false,color=ink,align:'left'|'right'|'center'='left')=>{const lines=wrap(text,width,size,bold);lines.forEach((s,i)=>drawLine(s,x,top+i*lh(size),width,size,bold,color,align));return lines.length*lh(size);};
  const rect=(x:number,top:number,w:number,h:number,fill:string,stroke?:string)=>{pdf.setFillColor(...rgb(fill));if(stroke)pdf.setDrawColor(...rgb(stroke));pdf.roundedRect(x,top,w,h,2,2,stroke?'FD':'F');};
  const rule=(top:number)=>{pdf.setDrawColor(...rgb(border));pdf.setLineWidth(.25);pdf.line(L,top,R,top);};
  const brand=()=>{pdf.setFillColor(...rgb(accent));pdf.rect(0,0,W,3,'F');pdf.setFillColor(...rgb(navy));pdf.rect(0,3,W,1.2,'F');};
  const page=()=>{pdf.addPage();brand();y=12;draw(kind+' / '+names[kind],L,y,100,11,true,navy);draw(ref,124,y,72,9,true,muted,'right');y+=11;};
  const ensure=(height:number)=>{if(y+height>274)page();};
  const section=(caption:string)=>{ensure(12);draw(caption,L,y,wide,10,true,navy);y+=lh(10)+2;};
  const note=(text:string,size=8,color=muted)=>{for(const line of wrap(text,wide,size)){ensure(lh(size)+1);drawLine(line,L,y,wide,size,false,color);y+=lh(size);}};
  brand();
  const branded=/seven\s*color|sourcing[.\s]*center/i.test(val(seller,'name'));
  if(branded){y+=draw('sourcing.center',L,y,wide,21,true,accent,'center')+1;}
  y+=draw(val(seller,'name'),L,y,wide,13,true,navy,'center');
  if(val(seller,'chineseName'))y+=draw(val(seller,'chineseName'),L,y,wide,10,true,navy,'center');
  y+=draw(val(seller,'address'),L,y,wide,8,false,muted,'center');
  y+=draw(['USCC: '+(val(seller,'uscc')||'—'),val(seller,'phone'),val(seller,'email'),branded?'sourcing.center':''].filter(Boolean).join('  |  '),L,y,wide,8,false,muted,'center')+4;
  rule(y);y+=4;
  y+=draw(kind.toUpperCase()+' / '+names[kind],L,y,wide,17,true,navy,'center')+2;
  if(sample||missing.length){const status=sample?'SAMPLE ONLY / 仅供演示 — NOT VALID FOR TRADE':'DRAFT / 草稿 — INCOMPLETE';rect(L,y,wide,8,'#fff1f2');draw(status,L+2,y+1.3,wide-4,9,true,accent,'center');y+=10;}
  const card=(heading:string,lines:string[],x:number,top:number,w:number,height:number)=>{rect(x,top,w,height,'#f8fafc',border);let t=top+3;t+=draw(heading,x+3,t,w-6,9,true,accent)+1;for(const line of lines)t+=draw(line,x+3,t,w-6,8.5,false,ink);};
  const lineCount=(lines:string[],w:number)=>lines.reduce((a,text)=>a+wrap(text,w-6,8.5).length*lh(8.5),0);
  const boxPair=(a:{heading:string;lines:string[]},b:{heading:string;lines:string[]})=>{
    const w=(wide-4)/2;const h=Math.max(lineCount(a.lines,w),lineCount(b.lines,w))+lh(9)+8;
    if(h>205){section(a.heading);a.lines.forEach(x=>note(x,8.5,ink));section(b.heading);b.lines.forEach(x=>note(x,8.5,ink));y+=3;return;}
    ensure(h+3);card(a.heading,a.lines,L,y,w,h);card(b.heading,b.lines,L+w+4,y,w,h);y+=h+4;
  };
  boxPair({heading:'BUYER / 购买方',lines:[val(deal,'customer'),val(deal,'customerAddress'),[val(deal,'customerCountry'),val(deal,'customerTaxId')?'Tax ID: '+val(deal,'customerTaxId'):''].filter(Boolean).join(' | '),[val(deal,'customerContact'),val(deal,'customerPhone'),val(deal,'customerEmail')].filter(Boolean).join(' | ')].filter(Boolean)},{heading:'DOCUMENT DETAILS / 单据资料',lines:['No. / 编号: '+ref,'Date / 日期: '+date,'Contract / 合同: '+(val(deal,'contractNo')||'—'),'Currency / 币种: '+(val(deal,'currency')||'—'),...(val(deal,'validUntil')&&kind==='Proforma Invoice'?['Valid until / 有效期: '+val(deal,'validUntil')]:[])]});
  boxPair({heading:'CONSIGNEE / 收货人',lines:[val(deal,'consigneeName')||val(deal,'customer'),val(deal,'consigneeAddress')||val(deal,'customerAddress'),val(deal,'consigneeContact'),val(deal,'notifyParty')?'Notify party / 通知方: '+val(deal,'notifyParty'):''].filter(Boolean)},{heading:'TRADE TERMS / 贸易条款',lines:['Incoterms® 2020: '+(val(deal,'incoterm')||'—'),'Payment / 付款: '+(val(deal,'paymentTerms')||'—'),'Loading / 装运港: '+(val(deal,'portLoading')||'—'),'Destination / 目的港: '+(val(deal,'portDestination')||'—'),val(deal,'finalDestination')?'Final destination / 最终目的地: '+val(deal,'finalDestination'):''].filter(Boolean)});
  const rows=[{id:'main',description:val(deal,'product'),model:val(deal,'model'),hsCode:val(deal,'hsCode'),origin:val(deal,'origin'),unit:val(deal,'unit'),qty:n(deal,'qty'),unitPrice:n(deal,'unitPrice')},...extraItems(deal)];
  const widths=packing?[10,106,36,30]:[10,82,25,28,37];const xs=widths.map((_,i)=>L+widths.slice(0,i).reduce((a,b)=>a+b,0));
  const headers=packing?['#','DESCRIPTION / 品名','QTY / 数量','UNIT / 单位']:['#','DESCRIPTION & HS / 品名及编码','QTY / 数量','UNIT PRICE / 单价','AMOUNT / 金额'];
  const tableHead=()=>{ensure(12);rect(L,y,wide,10,navy);headers.forEach((h,i)=>draw(h,xs[i]+2,y+1.8,widths[i]-4,7,true,'#ffffff',i>1?'right':'left'));y+=10;};
  section('GOODS DETAILS / 商品明细');tableHead();
  rows.forEach((r,index)=>{
    const primary=r.description||'—',detail=[r.model?'Model / 规格: '+r.model:'',r.hsCode?'HS: '+r.hsCode:'',r.origin?'Origin / 原产地: '+r.origin:''].filter(Boolean).join('  |  ');
    const primaryLines=wrap(primary,widths[1]-5,9,true),detailLines=detail?wrap(detail,widths[1]-5,7.5):[];
    const height=Math.max(13,primaryLines.length*lh(9)+detailLines.length*lh(7.5)+5);
    if(y+height>274){page();tableHead();}
    pdf.setFillColor(...rgb(index%2?'#f8fafc':'#ffffff'));pdf.rect(L,y,wide,height,'F');
    draw(String(index+1),xs[0]+2,y+2,widths[0]-4,8,false,muted);
    let textY=y+2;for(const line of primaryLines){drawLine(line,xs[1]+2,textY,widths[1]-5,9,true,ink);textY+=lh(9);}for(const line of detailLines){drawLine(line,xs[1]+2,textY,widths[1]-5,7.5,false,muted);textY+=lh(7.5);}
    if(packing){draw(String(r.qty),xs[2]+2,y+2,widths[2]-4,8.5,false,ink,'right');draw(r.unit,xs[3]+2,y+2,widths[3]-4,8.5,false,ink,'right');}else{draw(String(r.qty)+' '+r.unit,xs[2]+2,y+2,widths[2]-4,8.5,false,ink,'right');draw(amt(r.unitPrice),xs[3]+2,y+2,widths[3]-4,8.5,false,ink,'right');draw(amt(r.qty*r.unitPrice),xs[4]+2,y+2,widths[4]-4,9,true,ink,'right');}
    y+=height;rule(y);
  });
  y+=4;
  if(!packing){
    const currency=val(deal,'currency'),goods=goodsTotal(deal),total=goods+n(deal,'freightCharge')+n(deal,'insuranceCharge')+n(deal,'otherCharge');
    const items=[['Goods subtotal / 货物小计',goods],['Freight / 运费',n(deal,'freightCharge')],['Insurance / 保险费',n(deal,'insuranceCharge')],['Other charges / 其他费用',n(deal,'otherCharge')]] as const;
    ensure(42);for(const [label,value] of items){draw(label,L+72,y,65,8,false,muted);draw(currency+' '+amt(value),L+138,y,44,8,true,ink,'right');y+=lh(8);}
    rect(L+72,y,110,11,navy);draw('TOTAL / 合计',L+76,y+3,48,9,true,'#ffffff');draw(currency+' '+amt(total),L+125,y+2.5,53,12,true,'#ffffff','right');y+=14;
    note('AMOUNT IN WORDS / 金额大写: '+amountInWords(total,currency),8.5,ink);y+=3;
  }
  section('SHIPMENT & PACKING / 运输及装箱');
  const logistics=[['Shipping marks / 唛头',val(deal,'shippingMarks')],['Package count / 包装件数',String(n(deal,'cartons'))+' '+val(deal,'packageType')],['Net / gross weight / 净重及毛重',n(deal,'netWeight')+' / '+n(deal,'grossWeight')+' kg'],['Volume / 体积',n(deal,'cbm')+' m³'],['Dimensions / 尺寸',val(deal,'dimensions')],['Transport / 运输方式',val(deal,'transportMethod')],['B/L or AWB / 提单或运单号',val(deal,'tracking')],['Vessel / flight / 船名航次',val(deal,'vesselFlight')],['Shipment date / 发货日期',val(deal,'shipmentDate')]].filter(([,v])=>v&&v!=='0 ');
  for(let i=0;i<logistics.length;i+=2){const a=logistics[i],b=logistics[i+1];const height=Math.max(wrap(a[0]+': '+a[1],88,8).length,b?wrap(b[0]+': '+b[1],88,8).length:0)*lh(8)+2;ensure(height);draw(a[0]+': '+a[1],L,y,88,8,false,ink);if(b)draw(b[0]+': '+b[1],L+94,y,88,8,false,ink);y+=height;}y+=3;
  if(!packing){section('BENEFICIARY BANK DETAILS / 收款银行资料');for(const text of [val(deal,'bankInfo'),val(seller,'bankName')?'Bank / 银行: '+val(seller,'bankName'):'',val(seller,'bankAccount')?'Account / 账号: '+val(seller,'bankAccount'):'',val(seller,'bankBranch')?'Branch / 支行: '+val(seller,'bankBranch'):'',val(seller,'swift')?'SWIFT: '+val(seller,'swift'):''].filter(Boolean))note(text,8.5,ink);y+=3;}
  if(val(deal,'notes')){section('REMARKS / 备注');note(val(deal,'notes'),8.5,ink);y+=3;}
  ensure(36);rule(y);y+=3;note(kind==='Proforma Invoice'?'Proforma quotation; not proof of payment.':'Commercial supporting document; reconcile with actual goods and customs declarations.');note('Not an official Chinese VAT fapiao / 非增值税发票。');if(missing.length)note('Draft — missing: '+missing.join('; '),7.5,accent);
  ensure(20);y+=10;pdf.setDrawColor(...rgb(border));pdf.line(117,y,R,y);draw('Authorized signature & company seal / 授权签字及公司盖章',117,y+2,79,7.5,false,muted,'center');
  for(let p=1;p<=pdf.getNumberOfPages();p++){pdf.setPage(p);pdf.setFillColor(...rgb(navy));pdf.rect(0,285,W,12,'F');draw(sample?'SAMPLE ONLY / 仅供演示':(branded?'sourcing.center':val(seller,'name')),L,288,130,8,true,'#ffffff');draw(ref+'  |  '+p+'/'+pdf.getNumberOfPages(),145,288,51,8,false,'#ffffff','right');}
  pdf.save(ref.replace(/[^a-zA-Z0-9_-]/g,'-')+'.pdf');
}

// Reuses the same local font and A4 canvas layout; no customer data leaves the browser.
export async function downloadTradeReport(title:string,ref:string,sections:{title:string;lines:string[]}[]) {
  const pdf=new jsPDF({format:'a4',unit:'mm',compress:true});
  const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('PDF rendering is unavailable');
  if(document.fonts)await document.fonts.load('12px "Noto Sans SC"',[title,...sections.flatMap(s=>[s.title,...s.lines])].join('')).catch(()=>undefined);
  let y=16;
  const line=(text:string,size=10,bold=false)=>{
    const height=size*.48+2, scale=3.78*3, max=176*scale;
    const font=`${bold?'600':'400'} ${size*1.333*3}px "Noto Sans SC", "Microsoft YaHei", Arial, sans-serif`;
    ctx.font=font;const rows:string[]=[];let row='';
    for(const ch of text){if(ch==='\n'||ctx.measureText(row+ch).width>max){rows.push(row);row=ch==='\n'?'':ch;}else row+=ch;}rows.push(row);
    for(const value of rows){if(y+height>275){pdf.addPage();y=16;}if(/^[\x20-\x7e]*$/.test(value)){pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);pdf.setTextColor(25,32,45);pdf.text(value,16,y+size*.35);}else{ctx.font=font;canvas.width=Math.max(1,Math.min(max,Math.ceil(ctx.measureText(value).width+8)));canvas.height=Math.ceil(height*scale);ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.font=font;ctx.textBaseline='middle';ctx.fillStyle='#19202d';ctx.fillText(value,3,canvas.height/2);pdf.addImage(canvas.toDataURL('image/png'),'PNG',16,y,canvas.width/scale,height);}y+=height;}
  };
  line(title,18,true);line('Reference: '+ref);
  for(const section of sections){if(y>260){pdf.addPage();y=16;}y+=3;line(section.title,12,true);for(const value of section.lines)line(value);}
  for(let page=1;page<=pdf.getNumberOfPages();page++){pdf.setPage(page);pdf.setFillColor(230,0,70);pdf.rect(0,0,210,3,'F');pdf.setFontSize(8);pdf.setTextColor(100,116,139);pdf.text(String(page)+' / '+pdf.getNumberOfPages(),194,290,{align:'right'});}
  pdf.save(ref.replace(/[^a-zA-Z0-9_-]/g,'-')+'.pdf');
}
export async function downloadExportPaymentStatement(deal:Row,seller:Row,entries:Row[]) {
  const reference=val(deal,'number');
  const receipts=entries.filter(e=>['self_export','entrusted_export'].includes(val(e,'category'))&&(e.dealId===deal.id||[reference+' deposit',reference+' remaining payment received'].includes(val(e,'description'))));
  const currency=val(deal,'currency');
  const total=goodsTotal(deal)+n(deal,'freightCharge')+n(deal,'insuranceCharge')+n(deal,'otherCharge');
  const paid=receipts.filter(e=>e.currency===currency).reduce((sum,e)=>sum+n(e,'amount'),0);
  const other=receipts.filter(e=>e.currency!==currency);
  await downloadTradeReport((/SAMPLE/i.test(val(seller,'name'))?'SAMPLE — ':'')+'Payment Statement / 收款对账单',reference+'-PS',[
    {title:'Parties / 双方',lines:[val(seller,'name'),val(seller,'address'),'Buyer: '+val(deal,'customer'),val(deal,'customerAddress')]},
    {title:'Recorded receipts / 收款记录',lines:receipts.length?receipts.map(e=>val(e,'date')+' | '+val(e,'currency')+' '+amt(n(e,'amount'))+' | '+val(e,'description')):['No recorded payments']},
    {title:'Invoice balance / 欠款',lines:['Invoice value: '+currency+' '+amt(total),'Recorded in invoice currency: '+currency+' '+amt(paid),'Estimated balance: '+currency+' '+amt(total-paid),...(other.length?['Payments in other currencies require reconciliation; balance excludes them.']:[]),'Internal statement based on recorded receipts. Not a bank receipt or statutory tax invoice.']}
  ]);
}
