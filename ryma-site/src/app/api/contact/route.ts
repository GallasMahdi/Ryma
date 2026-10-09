import { localizeApiError, requestLanguage } from '@/lib/api-i18n';
import { NextRequest, NextResponse } from 'next/server';
import { dbConsumeRateLimit } from '@/lib/db';
import { getClientIp } from '@/lib/validation';
import { isJsonObject } from '@/lib/admin-validation';
import { validateAndNormalizePhone } from '@/lib/phone';
import { verifyRecaptchaToken } from '@/lib/recaptcha';
import { sendContactMessage } from '@/lib/email';

export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    if (Number(request.headers.get('content-length') || 0) > 16_384) return NextResponse.json({error:localizeApiError('Message too large', request)},{status:413});
    if (!await dbConsumeRateLimit(getClientIp(request),'contact',5,3600)) return NextResponse.json({error:localizeApiError('Please try again later', request)},{status:429});
    let body: Record<string,unknown>;
    try {
      // Enforce the limit for chunked bodies as well as declared Content-Length.
      const reader=request.body?.getReader();
      if(!reader)return NextResponse.json({error:localizeApiError('Invalid JSON', request)},{status:400});
      const chunks:Uint8Array[]=[];let size=0;
      for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16_384){await reader.cancel();return NextResponse.json({error:localizeApiError('Message too large', request)},{status:413});}chunks.push(value);}
      body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch { return NextResponse.json({error:localizeApiError('Invalid JSON', request)},{status:400}); }
    if(!isJsonObject(body))return NextResponse.json({error:localizeApiError('JSON object required', request)},{status:400});
    const {name,email,phone,message,subject}=body;
    if(typeof name!=='string'||name.trim().length<2||name.length>100||typeof email!=='string'||email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)||/[\r\n<>]/.test(email)||typeof message!=='string'||message.trim().length<5||message.length>5000||typeof subject!=='string'||!['','rdv','info','devis','other'].includes(subject))return NextResponse.json({error:localizeApiError('Please check your name, email and message', request)},{status:422});
    let normalizedPhone='';
    if(phone){const checked=validateAndNormalizePhone(phone);if(!checked.isValid)return NextResponse.json({error:localizeApiError('Invalid phone number', request)},{status:422});normalizedPhone=checked.normalized;}
    if(body.website)return NextResponse.json({error:localizeApiError('Invalid submission', request)},{status:403});
    if(process.env.NODE_ENV==='production'||body.recaptchaToken){
      const captcha=await verifyRecaptchaToken(typeof body.recaptchaToken==='string'?body.recaptchaToken:null,'contact');
      if(!captcha.valid)return NextResponse.json({error:localizeApiError('Security check failed. Please retry or contact the clinic by phone.', request)},{status:403});
    }
    const delivered=await sendContactMessage({name:name.trim(),email:email.trim(),phone:normalizedPhone,subject,message:message.trim()}, requestLanguage(request));
    if(!delivered)return NextResponse.json({error:localizeApiError('Message delivery is unavailable. Please contact the clinic by phone.', request)},{status:503});
    return NextResponse.json({success:true});
  }catch{return NextResponse.json({error:localizeApiError('Message delivery is unavailable. Please retry later.', request)},{status:503});}
}
