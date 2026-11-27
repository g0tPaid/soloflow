import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { ExportAccountingController } from './export-accounting.module';
import type { PrismaService } from '../prisma/prisma.service';

const actor = { user: { sub: 'staff1' } };
const empty = () => ({ entries: [], customers: [], suppliers: [], products: [], deals: [], imports: [], roadmap: [], gates: [], defaultRate: 7.15 });
function fixture(role = 'OWNER', rows: unknown[] = []) {
  const tx = { $queryRaw: jest.fn().mockResolvedValue(rows), $executeRaw: jest.fn().mockResolvedValue(1) };
  const db = { organizationMember: { findUnique: jest.fn().mockResolvedValue({ role, user: { suspendedAt: null } }) }, $queryRaw: jest.fn().mockResolvedValue(rows), $transaction: jest.fn(async (run: (t: typeof tx) => unknown) => run(tx)) };
  const controller = new ExportAccountingController(db as unknown as PrismaService);
  return { controller, db, tx };
}
describe('Exporter Module 2 workspace', () => {
  it('starts empty and reads the requested organization only', async () => {
    const { controller, db } = fixture();
    expect(await controller.get('org1', actor)).toEqual({ revision: 0, data: empty() });
    expect(db.$queryRaw.mock.calls[0][1]).toBe('org1');
  });
  it('rejects disallowed roles before reading or writing', async () => {
    const { controller, db } = fixture('SALES');
    await expect(controller.get('org1', actor)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.save('org1', actor, { revision: 0, data: empty() })).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.$queryRaw).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('stores an initial revision and writes an audit snapshot in the same transaction', async () => {
    const { controller, tx } = fixture('ACCOUNTANT', [{ revision: 1, data: empty() }]);
    await expect(controller.save('org1', actor, { revision: 0, data: empty() })).resolves.toEqual({ revision: 1, data: empty() });
    expect(tx.$queryRaw.mock.calls[0][1]).toBe('org1');
    expect(tx.$executeRaw.mock.calls[0].slice(1,4)).toEqual(['org1',1,'staff1']);
  });
  it('rejects stale revisions without writing history', async () => {
    const { controller, tx } = fixture();
    await expect(controller.save('org1', actor, { revision: 4, data: empty() })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
  it('rejects invalid transaction currency or rate', async () => {
    const { controller, db } = fixture();
    const data = { ...empty(), entries: [{ id:'a', category:'self_export', currency:'CNY', amount:100, rate:7.15, description:'sale', date:'2026-11-27' }] };
    await expect(controller.save('org1', actor, { revision: 0, data })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('accepts a separate company profile and valid multi-item deal data', async () => {
    const data = { ...empty(), profile: { id: 'seller', name: 'Example exporter' }, deals: [{ id:'a', number:'M2-A', step:1, extraItems:JSON.stringify([{ id:'item1', description:'Sample', model:'', hsCode:'1234567890', origin:'China', unit:'pcs', qty:2, unitPrice:12, unitCost:4 }]) }] };
    const { controller } = fixture('OWNER', [{revision:1,data}]);
    await expect(controller.save('org1',actor,{revision:0,data})).resolves.toEqual({revision:1,data});
  });
  it('accepts a valid import purchase and rejects invalid payment or receiving quantities', async () => {
    const purchase = {id:'imp1',number:'IMP-1',date:'2026-11-27',supplier:'Sample supplier',product:'Sample product',currency:'USD',qty:10,unitCost:5,rate:7,freightCny:30,insuranceCny:0,dutyCny:20,importVatCny:10,otherCny:0,paidCny:100,receivedQty:0,status:'Ordered'};
    const data = {...empty(),imports:[purchase]};
    const {controller} = fixture('OWNER',[{revision:1,data}]);
    await expect(controller.save('org1',actor,{revision:0,data})).resolves.toEqual({revision:1,data});
    for (const patch of [{receivedQty:11},{paidCny:411},{rate:0},{status:'Received'}]) {
      await expect(controller.save('org1',actor,{revision:0,data:{...data,imports:[{...purchase,...patch}]}})).rejects.toBeInstanceOf(BadRequestException);
    }
  });
  it('rejects malformed item data', async () => {
    const {controller,db}=fixture();
    await expect(controller.save('org1',actor,{revision:0,data:{...empty(),deals:[{id:'a',number:'M2-A',step:1,extraItems:'[{"qty":-1}]'}]}})).rejects.toBeInstanceOf(BadRequestException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('issues a numbered snapshot and records the audit in the same transaction', async()=>{
    const data={...empty(),profile:{name:'Sample exporter',address:'Sample address',uscc:'91350200MAE8W9E67A'},deals:[{id:'a',number:'M2-A',step:2,customer:'Sample buyer',customerAddress:'Sample address',customerCountry:'UAE',product:'Sample motor',unit:'pcs',qty:1,unitPrice:100,currency:'USD',date:'2026-11-27',incoterm:'FCA Xiamen',paymentTerms:'Advance'}]};
    const {controller,tx}=fixture('OWNER');
    tx.$queryRaw.mockResolvedValueOnce([{revision:1,data}]).mockResolvedValueOnce([{revision:2,data}]);
    const result=await controller.issue('org1',actor,{revision:1,dealId:'a',kind:'Proforma Invoice'});
    expect(result.document.number).toBe('M2-PI-000001');expect(result.document.deal.unitPrice).toBe(100);expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
  });
});

