import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { isDeepStrictEqual } from 'node:util';

type Row = Record<string, unknown>;
export type TradeWorkspace = Record<string, unknown>;
export type TradeDocument = { id: string; dealId: string; kind: string; number: string; issuedAt: string; actorId: string; deal: Row; seller: Row };
const receipts = ['self_export', 'entrusted_export'];
const money = (value: unknown) => Math.round((Number(value || 0) + Number.EPSILON) * 100);
const list = (workspace: TradeWorkspace, key: string): Row[] => Array.isArray(workspace[key]) ? workspace[key] as Row[] : [];
const str = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const reject = (message: string): never => { throw new BadRequestException(message); };
function lines(deal: Row): Row[] { try { return JSON.parse(String(deal.extraItems || '[]')); } catch { return []; } }
export function invoiceCents(deal: Row) {
  return money(Number(deal.qty || 0) * Number(deal.unitPrice || 0)) + lines(deal).reduce((sum, line) => sum + money(Number(line.qty || 0) * Number(line.unitPrice || 0)), 0) + ['freightCharge','insuranceCharge','otherCharge'].reduce((sum,key) => sum + money(deal[key]),0);
}
const linked = (entry: Row, deal: Row) => entry.dealId === deal.id || [String(deal.number)+' deposit',String(deal.number)+' remaining payment received'].includes(String(entry.description));

/** Validate changed records only so historical data is not silently rewritten. */
export function validateTradeChange(previous: TradeWorkspace, next: TradeWorkspace, role: string) {
  if (!isDeepStrictEqual(previous.documents ?? [], next.documents ?? [])) reject('Issued documents are immutable; use Issue document to create a new revision.');
  const oldProfile = (previous.profile || {}) as Row, newProfile = (next.profile || {}) as Row;
  if (!['OWNER','ADMIN'].includes(role) && ['bankName','bankAccount','bankBranch','swift'].some(k => (oldProfile[k] || '') !== (newProfile[k] || ''))) throw new ForbiddenException('Only owners and administrators can change exporter bank details.');
  const oldDeals = list(previous,'deals'), newDeals = list(next,'deals'), oldEntries = list(previous,'entries'), newEntries = list(next,'entries');
  const numbers = new Set<string>();
  for (const deal of newDeals) {
    const number = str(deal.number);
    if (!number || numbers.has(number)) reject('Export order numbers must be unique.');
    numbers.add(number);
    const old = oldDeals.find(r => r.id === deal.id);
    if (isDeepStrictEqual(old,deal)) continue;
    if (old?.complete === true) reject('Completed export orders are locked.');
    if (deal.complete === true && !str(deal.taxReviewer)) reject('Record who confirmed the tax treatment before closing.');
    for (const field of ['qty','unitCost','unitPrice','freightCharge','insuranceCharge','otherCharge','portCost','refundReceived','cartons','grossWeight','netWeight','cbm']) {
      if (deal[field] !== undefined && (typeof deal[field] !== 'number' || Number(deal[field]) < 0)) reject('Export quantities, prices, charges and weights must be non-negative numbers.');
    }
    if (Number(deal.netWeight || 0) > Number(deal.grossWeight || 0) && Number(deal.grossWeight || 0) > 0) reject('Net weight cannot exceed gross weight.');
    const total = invoiceCents(deal);
    if (!Number.isSafeInteger(total) || total < 0) reject('Invalid export order total.');
    const paid = newEntries.filter(e => receipts.includes(String(e.category)) && linked(e,deal));
    if (paid.length && old && deal.currency !== old.currency) reject('Cannot change invoice currency after receiving customer payments.');
    if (paid.filter(e=>e.currency===deal.currency).reduce((sum,e)=>sum+money(e.amount),0)>total) reject('Customer receipts exceed the invoice total.');
    if (old?.purchaseLogged === true && (!isDeepStrictEqual([old.qty,old.unitCost,lines(old).map(l=>[l.id,l.qty,l.unitCost])],[deal.qty,deal.unitCost,lines(deal).map(l=>[l.id,l.qty,l.unitCost])]))) reject('Purchase quantity and cost are locked after posting supplier payment.');
    if (deal.complete === true && (!deal.invoiceAccepted || !deal.piSent || !deal.buyerAccepted || !deal.invoiceSent || !deal.customsConfirmed || !deal.shipmentConfirmed || !str(deal.declaration) || !str(deal.tracking) || !deal.fxMatched || !str(deal.bankReference) || !str(deal.documentLocation) || !str(deal.taxTreatment) || ['Not reviewed','Pending'].includes(String(deal.taxTreatment)) || !deal.purchaseLogged || (Number(deal.portCost)>0&&!deal.freightLogged) || (Number(deal.refundReceived)>0&&!deal.refundLogged) || paid.some(e=>e.currency!==deal.currency) || paid.reduce((sum,e)=>sum+money(e.amount),0)!==total)) reject('Complete the required payment, customs, shipping and tax checks before closing.');
  }
  for (const old of oldDeals) if (!newDeals.some(d=>d.id===old.id) && (old.complete || oldEntries.some(e=>linked(e,old)))) reject('An order with financial records cannot be removed.');
  for (const old of oldEntries) if (old.dealId && !isDeepStrictEqual(old,newEntries.find(e=>e.id===old.id))) reject('Posted order transactions are locked; contact the accountant to reconcile corrections.');
  for (const entry of newEntries) {
    if (oldEntries.some(e=>e.id===entry.id) || !entry.dealId) continue;
    const deal = newDeals.find(d=>d.id===entry.dealId);
    if (!deal) reject('A posted transaction must belong to an existing export order.');
    if (deal!.complete===true) reject('Completed orders cannot receive additional posted transactions.');
    if (receipts.includes(String(entry.category))) {
      if (!deal!.invoiceAccepted || deal!.complete || entry.currency !== deal!.currency) reject('Customer receipts require an accepted, open invoice in its currency.');
      const reference = str(entry.paymentReference);
      if (!reference) reject('Enter the actual bank/payment reference before recording a receipt.');
      if (newEntries.some(e=>e.id!==entry.id && e.dealId===entry.dealId && str(e.paymentReference).toLowerCase()===reference.toLowerCase())) reject('This payment reference has already been recorded on the order.');
      const paid = newEntries.filter(e=>receipts.includes(String(e.category)) && linked(e,deal!) && e.currency===deal!.currency).reduce((sum,e)=>sum+money(e.amount),0);
      if (paid>invoiceCents(deal!)) reject('Customer receipts exceed the invoice total.');
    }
  }
}

export function createTradeDocument(workspace: TradeWorkspace, dealId: string, kind: string, actorId: string): TradeDocument {
  const deal = list(workspace,'deals').find(d=>d.id===dealId), seller = workspace.profile as Row | undefined;
  if (!deal || !seller) return reject('Save the export order and company profile before issuing documents.');
  const codes: Record<string,string> = {'Proforma Invoice':'PI','Commercial Invoice':'CI','Packing List':'PL'};
  const code = codes[kind]; if (!code) return reject('Unknown document type.');
  if (!str(seller.name) || !str(seller.address) || !/^[0-9A-Z]{18}$/.test(str(seller.uscc).toUpperCase()) || !str(deal.customer) || !str(deal.customerAddress) || !str(deal.customerCountry) || !str(deal.product) || !str(deal.unit) || !(Number(deal.qty)>0) || !/^\d{4}-\d{2}-\d{2}$/.test(str(deal.date))) return reject('Complete the exporter, buyer and goods details before issuing.');
  if (code!=='PL' && (!['CNY','USD','EUR','GBP','AED'].includes(str(deal.currency)) || !Number.isSafeInteger(invoiceCents(deal)) || !(Number(deal.unitPrice)>0) || invoiceCents(deal)<=0 || !/^(EXW|FCA|CPT|CIP|DAP|DPU|DDP|FAS|FOB|CFR|CIF)\s+\S/i.test(str(deal.incoterm)) || !str(deal.paymentTerms))) return reject('Complete prices, trade terms and payment details before issuing.');
  if (code!=='PL' && /^(FAS|FOB|CFR|CIF)\b/i.test(str(deal.incoterm)) && /air|rail|road|courier|空运|铁路|公路|快递/i.test(str(deal.transportMethod))) return reject('Select a transport-appropriate Incoterm.');
  if (code==='CI' && (!deal.buyerAccepted || !str(deal.hsCode) || !str(deal.origin) || !str(deal.contractNo) || !str(deal.portLoading) || !str(deal.portDestination))) return reject('Confirm buyer acceptance and complete commercial invoice details.');
  if (code==='PL' && (!(Number(deal.cartons)>0) || !(Number(deal.grossWeight)>0) || !(Number(deal.netWeight)>=0) || Number(deal.netWeight)>Number(deal.grossWeight))) return reject('Complete valid packing details before issuing.');
  if (lines(deal).some(l=>!str(l.description)||Number(l.qty)<=0||!str(l.unit)||(code!=='PL'&&Number(l.unitPrice)<=0)||(code==='CI'&&(!str(l.hsCode)||!str(l.origin))))) return reject('Complete every line item before issuing.');
  const count = list(workspace,'documents').filter(d=>d.kind===kind).length+1;
  const number = `M2-${code}-${String(count).padStart(6,'0')}`;
  const issuedAt = new Date().toISOString();
  const prefix = code.toLowerCase();
  return {id:crypto.randomUUID(),dealId,kind,number,issuedAt,actorId,deal:{...deal,[`${prefix}Number`]:number,[`${prefix}Date`]:issuedAt.slice(0,10)},seller:{...seller}};
}
