"""Render an English, silent 54-second walkthrough from captured app screens."""
from pathlib import Path
import json, math, subprocess, sys, time
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / 'tools'))
import imageio_ffmpeg

W, H, FPS, DURATION = 1920, 1080, 30, 54
SX, SY, SW, SH = 64, 196, 1440, 810
BG, GOLD, WHITE, MUTED = '#171612', '#e2bf69', '#faf6eb', '#bdb7a8'
FONT = Path('C:/Windows/Fonts')
def font(size, bold=False):
    return ImageFont.truetype(str(FONT / ('segoeuib.ttf' if bold else 'segoeui.ttf')), size)
F = {s:font(s) for s in (17,19,21,23,25,28,32,42,48,70)}
B = {s:font(s,True) for s in (19,21,25,28,32,42,48,70)}

chapters = [
 dict(start=0,end=6,title='Need care, but not sure where to start?',label='The challenge',screen='01-home',phase=0,
      callout='Care starts here',body='From finding a treatment to booking a visit, follow one simple journey.',url='Home',target=[708,568,216,60]),
 dict(start=6,end=12,title='Explore treatments that fit your needs.',label='Find a service',screen='02-services',phase=0,
      callout='Explore your options',body='Compare treatments, session lengths and prices in one place.',url='Treatments & Services',target=[208,296,380,340],cursor=[278,587]),
 dict(start=12,end=18,title='Review the treatment. Take the next step.',label='Review treatment',screen='03-detail',phase=0,
      callout='Clear before you book',body='Read about your chosen treatment, then select Book Appointment.',url='Global Postural Reeducation',target=[334,552,210,48]),
 dict(start=18,end=25,title='Choose a day that works for you.',label='Choose a date',screen='04-calendar',after='05-date',switch=3.0,phase=1,
      callout='Pick your day',body='Select an available date. Your treatment stays attached to the booking.',url='Booking / Date',target=[760,513,80,80]),
 dict(start=25,end=31,title='See availability. Pick your time.',label='Choose a time',screen='06-slots',after='07-time',switch=2.6,phase=1,
      callout='Available at a glance',body='Choose 10:00. Unavailable time slots are clearly marked.',url='Booking / Time',target=[980,336,156,53]),
 dict(start=31,end=38,title='Add your details in one simple form.',label='Your information',screen='08-form',after='09-filled',switch=3.0,phase=1,
      callout='Make it yours',body='Enter your contact details and choose your healthcare coverage.',url='Booking / Your Information',target=[491,308,615,195]),
 dict(start=38,end=44,title='Everything looks right? Confirm your visit.',label='Confirm booking',screen='09-filled',phase=1,
      callout='One final check',body='Review the treatment, date and time, then confirm your appointment.',url='Booking / Review',target=[884,789,219,44]),
 dict(start=44,end=50,title='Your appointment, all in one place.',label='Confirmation',screen='10-confirmed',phase=2,
      callout='You are all set',body='Find your appointment details, location and preparation notes together.',url='Booking / Confirmation',target=[344,425,512,77]),
 dict(start=50,end=54,title='From finding care to a visit in your calendar.',label='Ready for your visit',screen='10-confirmed',phase=2,
      callout='Keep the details handy',body='Add the appointment to your calendar and get ready for your visit.',url='Booking / Confirmation',target=[903,297,352,40]),
]
(ROOT/'chapters.json').write_text(json.dumps(chapters,indent=2),encoding='utf-8')
screens = {p.stem:Image.open(p).convert('RGB').resize((SW,SH),Image.Resampling.LANCZOS) for p in (ROOT/'screens').glob('*.png')}

def ease(x):
    x=max(0,min(1,x)); return x*x*(3-2*x)
def wrap(draw,text,x,y,width,ft,fill,spacing=10):
    line=''
    for word in text.split():
        proposed=(line+' '+word).strip()
        if draw.textlength(proposed,font=ft)>width and line:
            draw.text((x,y),line,font=ft,fill=fill); y+=ft.size+spacing; line=word
        else: line=proposed
    if line: draw.text((x,y),line,font=ft,fill=fill); y+=ft.size+spacing
    return y

base=Image.new('RGB',(W,H),BG)
d=ImageDraw.Draw(base)
for y in range(H):
    shade=int(5*(1-y/H)); d.line((0,y,W,y),fill=(23+shade,22+shade,18+shade))
d.rounded_rectangle((56,147,1512,1014),radius=20,fill='#080806')
d.rounded_rectangle((64,154,1504,224),radius=15,fill='#e9e4d9')
for i,c in enumerate(['#c88473','#d5b367','#97ad8a']):
    d.ellipse((85+i*23,169,96+i*23,180),fill=c)
d.rounded_rectangle((402,163,1166,187),radius=8,fill='#f7f4ee')
d.text((64,23),'DIGITAL CLINIC  /  PATIENT JOURNEY',font=B[19],fill=GOLD)
d.text((1669,24),'54 SEC  /  EN',font=F[19],fill=MUTED)
d.line((1550,320,1850,320),fill='#494333',width=1)
d.text((1550,822),'DISCOVER',font=B[19],fill=MUTED)
d.text((1550,861),'SCHEDULE',font=B[19],fill=MUTED)
d.text((1550,900),'CONFIRM',font=B[19],fill=MUTED)
d.text((64,1035),'PRODUCT DEMO  •  Fictional patient and availability. Booking simulated; no email sent.',font=F[17],fill=MUTED)

def frame_scene(idx,local):
    c=chapters[idx]; duration=c['end']-c['start']; p=max(0,min(1,local/duration))
    frame=base.copy(); draw=ImageDraw.Draw(frame)
    draw.text((64,62),c['title'],font=B[42],fill=WHITE)
    draw.text((430,163),'Digital Clinic  /  '+c['url'],font=F[17],fill='#555044')
    shot=screens[c['screen']]
    if 'after' in c and local>=c['switch']:
        shot=Image.blend(shot,screens[c['after']],ease((local-c['switch'])/.35))
    # A gentle camera push keeps static holds alive without obscuring controls.
    z=1+0.009*ease(p)
    if z>1:
        nw,nh=round(SW*z),round(SH*z)
        shot=shot.resize((nw,nh),Image.Resampling.BICUBIC)
        shot=shot.crop(((nw-SW)//2,(nh-SH)//2,(nw+SW)//2,(nh+SH)//2))
    frame.paste(shot,(SX,SY))
    draw=ImageDraw.Draw(frame)
    draw.text((1550,177),f'{idx+1:02}',font=B[70],fill=GOLD)
    draw.text((1553,273),c['label'].upper(),font=B[19],fill=MUTED)
    y=wrap(draw,c['callout'],1550,355,303,B[32],WHITE,8)
    wrap(draw,c['body'],1550,y+26,303,F[25],MUTED,12)
    phase_y=[822,861,900][c['phase']]
    draw.rectangle((1532,phase_y+6,1536,phase_y+23),fill=GOLD)
    draw.text((1550,phase_y),['DISCOVER','SCHEDULE','CONFIRM'][c['phase']],font=B[19],fill=GOLD)
    # Highlight the real control; cursor follows a smooth eased path to it.
    bx,by,bw,bh=c['target']
    tx=lambda x:SX+SW/2+(x*.9-SW/2)*z
    ty=lambda y:SY+SH/2+(y*.9-SH/2)*z
    x1,y1,x2,y2=tx(bx),ty(by),tx(bx+bw),ty(by+bh)
    a=ease((local-.5)/.8)
    overlay=Image.new('RGBA',(W,H)); od=ImageDraw.Draw(overlay)
    od.rounded_rectangle((x1-5,y1-5,x2+5,y2+5),radius=13,outline=(207,162,55,round(235*a)),width=3)
    # Small numbered anchor outside the selected area.
    ax,ay=x2+9,y1-9
    od.ellipse((ax-16,ay-16,ax+16,ay+16),fill=(226,191,105,round(255*a)))
    od.text((ax-6,ay-13),str(idx+1),font=B[19],fill=(30,25,15,round(255*a)))
    cx,cy=c.get('cursor',[bx+bw*.65,by+bh*.6])
    destination=(tx(cx),ty(cy))
    move=ease((local-.7)/1.4)
    px=destination[0]+120*(1-move); py=destination[1]+72*(1-move)
    click=c.get('switch',duration-1.1)
    if 0<local-click<.65:
        q=(local-click)/.65; r=12+32*q
        od.ellipse((px-r,py-r,px+r,py+r),outline=(226,191,105,round(240*(1-q))),width=4)
    if local>.5:
        pts=[(px,py),(px+3,29+py),(px+10,22+py),(px+17,35+py),(px+23,32+py),(px+16,19+py),(px+27,17+py)]
        od.polygon(pts,fill='#fffdf7',outline='#30291d',width=2)
    frame=Image.alpha_composite(frame.convert('RGBA'),overlay).convert('RGB')
    return frame

def render_frame(t):
    idx=next((i for i,c in enumerate(chapters) if c['start']<=t<c['end']),len(chapters)-1)
    local=t-chapters[idx]['start']; result=frame_scene(idx,local)
    if idx and local<.55:
        previous=frame_scene(idx-1,chapters[idx-1]['end']-chapters[idx-1]['start']-.01)
        result=Image.blend(previous,result,ease(local/.55))
    draw=ImageDraw.Draw(result)
    draw.rectangle((64,1018,1856,1022),fill='#494333')
    draw.rectangle((64,1018,64+1792*t/DURATION,1022),fill=GOLD)
    for c in chapters[1:]:
        x=64+1792*c['start']/DURATION; draw.rectangle((x-2,1016,x+2,1024),fill=BG)
    draw.text((1770,1035),f'00:{int(t):02} / 00:54',font=F[17],fill=MUTED)
    return result

if __name__=='__main__':
    if '--stills' in sys.argv:
        for t in [3,9,15,22,29,36,41,47,52]:
            render_frame(t).save(ROOT/f'preview-{t:02}.jpg',quality=92)
        render_frame(3).save(ROOT/'poster.jpg',quality=94)
        print('Preview frames rendered.',flush=True)
    else:
        ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
        cmd=[ffmpeg,'-y','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',str(ROOT/'kine-walkthrough.mp4')]
        with (ROOT/'render.log').open('w') as log:
            proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=log)
            for n in range(DURATION*FPS):
                proc.stdin.write(render_frame(n/FPS).tobytes())
                if n%(FPS*3)==0: print(f'Rendered {n/FPS:.0f} / {DURATION} seconds',flush=True)
            proc.stdin.close(); status=proc.wait()
        if status: raise RuntimeError('FFmpeg failed. See render.log')
        print('Finished: kine-walkthrough.mp4',flush=True)
