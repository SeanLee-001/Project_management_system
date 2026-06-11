import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { locale } = await request.json();
  
  // 验证 locale 值
  if (!['zh', 'en'].includes(locale)) {
    return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
  }

  // 设置 cookie，有效期 1 年
  const response = NextResponse.json({ success: true, locale });
  response.cookies.set('locale', locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
    httpOnly: false, // 允许 JavaScript 访问
    secure: false, // 开发环境允许 HTTP
  });

  return response;
}
