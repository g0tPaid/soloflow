// UN/LOCODE by UNECE: https://unlocode.unece.org/publications/
// The CSV mirror is maintained by datasets/un-locode; we only retain names and codes with port function 1.
import { NextResponse } from 'next/server';

type Port = {code:string;name:string;country:string;subdivision:string};
const source='https://raw.githubusercontent.com/datasets/un-locode/main/data/code-list.csv';
let cache:{expires:number;rows:Port[]}|undefined;
function csvLine(line:string):string[]{
  const fields:string[]=[];let field='',quoted=false;
  for(let j=0;j<line.length;j++){const c=line[j];if(c==='"'){if(quoted&&line[j+1]==='"'){field+='"';j++;}else quoted=!quoted;}else if(c===','&&!quoted){fields.push(field);field='';}else field+=c;}
  fields.push(field);return fields;
}
export async function GET(){
  if(cache&&cache.expires>Date.now())return NextResponse.json({ports:cache.rows,source:'UN/LOCODE'},{headers:{'Cache-Control':'public, max-age=3600'}});
  try{
    const response=await fetch(source,{next:{revalidate:86400},signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error('Directory unavailable');
    const data=await response.text();const rows=new Map<string,Port>();
    for(const line of data.split(/\r?\n/)){
      const [change,country,location,name,,subdivision,,func]=csvLine(line);
      if(!['CN','HK','MO'].includes(country)||change==='X'||!func?.startsWith('1')||!location||!name)continue;
      const code=country+location;rows.set(code,{code,name,country,subdivision});
    }
    if(rows.size<100)throw new Error('Incomplete directory');
    const ports=[...rows.values()].sort((a,b)=>a.name.localeCompare(b.name));
    cache={expires:Date.now()+86400000,rows:ports};
    return NextResponse.json({ports,source:'UN/LOCODE'},{headers:{'Cache-Control':'public, max-age=3600'}});
  }catch{return NextResponse.json({ports:[],source:'fallback'},{status:503});}
}
