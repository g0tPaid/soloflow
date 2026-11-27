import { createTradeDocument, invoiceCents, validateTradeChange } from './integrity';
const deal={id:'deal1',number:'M2-A',step:3,customer:'Buyer',customerAddress:'Address',customerCountry:'UAE',product:'Motor',unit:'pcs',qty:1,unitPrice:100,unitCost:250,currency:'USD',date:'2026-11-27',incoterm:'FCA Xiamen',paymentTerms:'Advance',invoiceAccepted:true,buyerAccepted:true,hsCode:'SAMPLE',origin:'China',contractNo:'SAMPLE',portLoading:'Xiamen',portDestination:'Dubai'};
const seller={name:'Sample exporter',address:'Sample address',uscc:'91350200MAE8W9E67A',bankAccount:'sample'};
const workspace={deals:[deal],profile:seller,entries:[]};
const payment={id:'p1',dealId:deal.id,category:'self_export',currency:'USD',amount:40,rate:7,paymentReference:'TEST1'};
describe('Module 2 transaction integrity',()=>{
  it('issues sequential, independent immutable document snapshots',()=>{
    const first=createTradeDocument(workspace,deal.id,'Commercial Invoice','owner');
    const second=createTradeDocument({...workspace,documents:[first],deals:[{...deal,unitPrice:120}]},deal.id,'Commercial Invoice','owner');
    expect(first.number).toBe('M2-CI-000001');expect(second.number).toBe('M2-CI-000002');expect(first.deal.unitPrice).toBe(100);
    expect(()=>validateTradeChange({...workspace,documents:[first]},{...workspace,documents:[]},'OWNER')).toThrow('immutable');
  });
  it('protects verified bank settings',()=>expect(()=>validateTradeChange(workspace,{...workspace,profile:{...seller,bankAccount:'changed'}},'MANAGER')).toThrow('Only owners'));
  it('accepts partial receipts and rejects duplicate references and overpayment',()=>{
    expect(invoiceCents(deal)).toBe(10000);
    expect(()=>validateTradeChange(workspace,{...workspace,entries:[payment]},'OWNER')).not.toThrow();
    expect(()=>validateTradeChange({...workspace,entries:[payment]},{...workspace,entries:[payment,{...payment,id:'p2'}]},'OWNER')).toThrow('already been recorded');
    expect(()=>validateTradeChange({...workspace,entries:[payment]},{...workspace,entries:[payment,{...payment,id:'p2',paymentReference:'TEST2',amount:61}]},'OWNER')).toThrow('exceed');
  });
  it('locks posted ledger entries and completed orders',()=>{
    expect(()=>validateTradeChange({...workspace,entries:[payment]},{...workspace,entries:[{...payment,amount:25}]},'OWNER')).toThrow('locked');
    expect(()=>validateTradeChange({...workspace,deals:[{...deal,complete:true}]},{...workspace,deals:[{...deal,complete:true,unitPrice:120}]},'OWNER')).toThrow('locked');
  });
});
