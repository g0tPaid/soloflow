import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { saveUpload } from '@/lib/upload';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const result = await saveUpload(file);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
