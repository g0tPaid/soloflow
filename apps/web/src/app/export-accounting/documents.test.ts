import {describe,expect,it} from 'vitest';
import {amountInWords,requiredDocumentFields} from './documents';
describe('trade document layout data',()=>{
  it('spells invoice amounts with minor units',()=>{
    expect(amountInWords(1200,'USD')).toBe('USD ONE THOUSAND TWO HUNDRED ONLY');
    expect(amountInWords(1234.56,'CNY')).toBe('CNY ONE THOUSAND TWO HUNDRED THIRTY FOUR AND 56/100 ONLY');
    expect(amountInWords(0,'AED')).toBe('AED ZERO ONLY');
  });
  it('requires a named place and transport-appropriate Incoterm',()=>{
    const seller={name:'Sample',address:'Xiamen',uscc:'91350200MAE8W9E67A'};
    const base={id:'sample',number:'SAMPLE-001',date:'2026-11-27',customer:'Sample buyer',customerAddress:'Dubai',customerCountry:'UAE',product:'Sample product',unit:'pcs',qty:10,unitPrice:20,currency:'USD'};
    expect(requiredDocumentFields({...base,incoterm:'FOB Xiamen',transportMethod:'Air freight'},seller,'Proforma Invoice')).toContain('Use a transport-appropriate Incoterm (sea rules are sea/inland waterway only)');
    expect(requiredDocumentFields({...base,incoterm:'FCA Xiamen',transportMethod:'Air freight'},seller,'Proforma Invoice')).toEqual([]);
  });
});
