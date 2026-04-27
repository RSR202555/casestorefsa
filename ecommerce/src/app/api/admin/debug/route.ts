import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { data: null, error: { code: 'NOT_FOUND', message: 'Recurso não encontrado' } },
    { status: 404 }
  )
}
