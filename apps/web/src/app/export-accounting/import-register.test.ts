import { describe, expect, it } from 'vitest';
import { importTotals, tradeSummary, type TradeRow } from './import-register';

describe('Module 2 trade reporting',()=>{
  const purchase:TradeRow={id:'i1',qty:10,unitCost:5,rate:7,freightCny:30,dutyCny:20,importVatCny:10,paidCny:100};
  it('calculates gross landed costs and unpaid amounts',()=>{
    expect(importTotals(purchase)).toEqual({goods:350,landed:410,perUnit:41,outstanding:310});
  });
  it('keeps import records separate from export cash and calculates accepted-deal receivables',()=>{
    const deal:TradeRow={id:'e1',number:'M2-A',currency:'USD',qty:10,unitPrice:10,unitCost:20,rate:7,portCost:50,buyerAccepted:true,complete:true};
    const entries:TradeRow[]=[
      {id:'r1',dealId:'e1',category:'self_export',currency:'USD',amount:40,rate:7},
      {id:'r2',category:'procurement',currency:'CNY',amount:200,rate:1},
      {id:'r3',category:'customs_freight',currency:'CNY',amount:50,rate:1},
      {id:'r4',category:'operating',currency:'CNY',amount:25,rate:1},
    ];
    const report=tradeSummary([purchase],entries,[deal]);
    expect(report.exportNetCash).toBe(5);
    expect(report.importOutstanding).toBe(310);
    expect(report.estimatedGrossMargin).toBe(450);
    expect(report.receivables[0].balance).toBe(60);
  });
  it('flags mismatched receipt currencies rather than subtracting unrelated currency',()=>{
    const deal:TradeRow={id:'e1',number:'M2-A',currency:'USD',qty:1,unitPrice:100,buyerAccepted:true};
    const report=tradeSummary([],[{id:'r1',dealId:'e1',category:'self_export',currency:'CNY',amount:700,rate:1}],[deal]);
    expect(report.receivables[0].mixed).toBe(true);
    expect(report.receivables[0].balance).toBe(100);
  });
});
