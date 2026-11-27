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
  if(n(deal,'qty')<=0)missing.push('Positive quantity');
  if(kind!=='Packing List' && n(deal,'unitPrice')<=0)missing.push('Positive unit price');
  if(kind==='Commercial Invoice')for(const [k,label] of [['hsCode','HS code'],['origin','Origin'],['incoterm','Incoterm'],['contractNo','Contract reference'],['portDestination','Destination'],['paymentTerms','Payment terms']] as const)if(!val(deal,k).trim())missing.push(label);
  if(kind==='Packing List' && (n(deal,'cartons')<=0||n(deal,'grossWeight')<=0||n(deal,'grossWeight')<n(deal,'netWeight')))missing.push('Valid packaging and gross/net weights');
  extraItems(deal).forEach((i,index)=>{if(!i.description.trim()||!i.unit.trim()||i.qty<=0||(kind!=='Packing List'&&i.unitPrice<=0)||(kind==='Commercial Invoice'&&(!i.hsCode.trim()||!i.origin.trim())))missing.push(`Complete additional item ${index+2}`);});
  return missing;
}
export async function downloadExportDocument(deal:Row,seller:Row,kind:DocumentKind) {
  const missing=requiredDocumentFields(deal,seller,kind);
  const pdf=new jsPDF({format:'a4',unit:'mm',compress:true});
  const prefix=kind==='Proforma Invoice'?'PI':kind==='Commercial Invoice'?'CI':'PL';
  const ref=val(deal,'number')+'-'+prefix;
  const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('PDF rendering is unavailable');
  if(document.fonts)await document.fonts.load('12px "Noto Sans SC"',Object.values({...seller,...deal}).join('')+names[kind]).catch(()=>undefined);
  let y=17;
  const line=(text:string,size=10,bold=false)=>{
    const rowHeight=size*.45+2;
    const font=`${bold?'600':'400'} ${size*1.333*3}px "Noto Sans SC", "Microsoft YaHei", Arial, sans-serif`;
    ctx.font=font;const max=178*3.78*3;const rows:string[]=[];let row='';
    for(const ch of text){if(ch==='\n'||ctx.measureText(row+ch).width>max){rows.push(row);row=ch==='\n'?'':ch;}else row+=ch;}rows.push(row);
    for(const value of rows){if(y+rowHeight>275){pdf.addPage();y=17;}if(/^[\x20-\x7e]*$/.test(value)){pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);pdf.setTextColor(25,32,45);pdf.text(value,16,y+size*.35);}else{ctx.font=font;const width=Math.min(max,Math.ceil(ctx.measureText(value).width+8));canvas.width=Math.max(1,width);canvas.height=Math.ceil(rowHeight*3.78*3);ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.font=font;ctx.textBaseline='middle';ctx.fillStyle='#19202d';ctx.fillText(value,3,canvas.height/2);pdf.addImage(canvas.toDataURL('image/png'),'PNG',16,y,canvas.width/(3.78*3),rowHeight);}y+=rowHeight;}
  };
  const section=(t:string)=>{y+=2;if(y>262){pdf.addPage();y=17;}pdf.setDrawColor(220,225,230);pdf.line(16,y,194,y);y+=3;line(t,11,true);};
  line(`${kind} / ${names[kind]}`,19,true);if(missing.length)line('DRAFT - INCOMPLETE / 草稿',12,true);
  line(`Document no. ${ref} | Date: ${val(deal,'date')} | Contract: ${val(deal,'contractNo')||'-'}`);
  section('Exporter / 出口方');line(val(seller,'name'),12,true);if(val(seller,'chineseName'))line(val(seller,'chineseName'));line(`USCC: ${val(seller,'uscc')||'-'} | ${val(seller,'address')}`);line(`${val(seller,'contact')} | ${val(seller,'phone')} | ${val(seller,'email')}`);
  section('Buyer / 购买方');line(val(deal,'customer'),12,true);line(`${val(deal,'customerAddress')} | ${val(deal,'customerCountry')}`);line(`Tax ID: ${val(deal,'customerTaxId')||'-'} | ${val(deal,'customerContact')} | ${val(deal,'customerPhone')} | ${val(deal,'customerEmail')}`);
  section('Goods / 商品');line(`${val(deal,'product')} | Model: ${val(deal,'model')||'-'}`,12,true);line(`HS: ${val(deal,'hsCode')||'-'} | Origin: ${val(deal,'origin')||'-'} | Qty: ${n(deal,'qty')} ${val(deal,'unit')}`);
  const currency=val(deal,'currency');if(kind!=='Packing List')line(`Unit price: ${currency} ${amt(n(deal,'unitPrice'))} | Line amount: ${currency} ${amt(n(deal,'qty')*n(deal,'unitPrice'))}`);
  for(const item of extraItems(deal)){line(`${item.description} | Model: ${item.model}`,11,true);line(`HS: ${item.hsCode} | Origin: ${item.origin} | Qty: ${item.qty} ${item.unit}`);if(kind!=='Packing List')line(`Unit price: ${currency} ${amt(item.unitPrice)} | Line amount: ${currency} ${amt(item.qty*item.unitPrice)}`);}
  if(kind!=='Packing List'){const goods=goodsTotal(deal);const total=goods+n(deal,'freightCharge')+n(deal,'insuranceCharge')+n(deal,'otherCharge');const c=currency;line(`Goods subtotal: ${c} ${amt(goods)}`);line(`Freight: ${c} ${amt(n(deal,'freightCharge'))} | Insurance: ${c} ${amt(n(deal,'insuranceCharge'))} | Other: ${c} ${amt(n(deal,'otherCharge'))}`);line(`TOTAL / 合计: ${c} ${amt(total)}`,14,true);line(`Trade term: ${val(deal,'incoterm')} | Payment: ${val(deal,'paymentTerms')}`);if(val(deal,'bankInfo'))line(`Payment instructions: ${val(deal,'bankInfo')}`);else if(val(seller,'bankName'))line(`Bank: ${val(seller,'bankName')} | Account: ${val(seller,'bankAccount')} | SWIFT: ${val(seller,'swift')}`);}
  section('Shipment / 运输');line(`Packages: ${n(deal,'cartons')} ${val(deal,'packageType')} | Net: ${n(deal,'netWeight')} kg | Gross: ${n(deal,'grossWeight')} kg | CBM: ${n(deal,'cbm')}`);line(`Marks: ${val(deal,'shippingMarks')} | Dimensions: ${val(deal,'dimensions')}`);line(`${val(deal,'portLoading')} to ${val(deal,'portDestination')} | Method: ${val(deal,'transportMethod')} | B/L or AWB: ${val(deal,'tracking')}`);
  if(val(deal,'notes'))line(`Remarks: ${val(deal,'notes')}`);section('Document status / 单据说明');line('Commercial trade document only. Not an official Chinese VAT fapiao, tax certificate or customs declaration.');if(missing.length)line(`Missing information: ${missing.join('; ')}`);line('Authorized signatory: __________________');
  for(let p=1;p<=pdf.getNumberOfPages();p++){pdf.setPage(p);pdf.setFillColor(230,0,70);pdf.rect(0,0,210,3,'F');pdf.setFontSize(8);pdf.setTextColor(100,116,139);pdf.text(ref,16,290);pdf.text(`${p}/${pdf.getNumberOfPages()}`,194,290,{align:'right'});}
  pdf.save(`${ref}.pdf`);
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
  await downloadTradeReport('Payment Statement / 收款对账单',reference+'-PS',[
    {title:'Parties / 双方',lines:[val(seller,'name'),val(seller,'address'),'Buyer: '+val(deal,'customer'),val(deal,'customerAddress')]},
    {title:'Recorded receipts / 收款记录',lines:receipts.length?receipts.map(e=>val(e,'date')+' | '+val(e,'currency')+' '+amt(n(e,'amount'))+' | '+val(e,'description')):['No recorded payments']},
    {title:'Invoice balance / 欠款',lines:['Invoice value: '+currency+' '+amt(total),'Recorded in invoice currency: '+currency+' '+amt(paid),'Estimated balance: '+currency+' '+amt(total-paid),...(other.length?['Payments in other currencies require reconciliation; balance excludes them.']:[]),'Internal statement based on recorded receipts. Not a bank receipt or statutory tax invoice.']}
  ]);
}
