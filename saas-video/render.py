from pathlib import Path
import math, json, subprocess, wave, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parent
W=H=1080
FPS=24
BG='#f7f8fa'; NAVY='#11182c'; MUTED='#66768c'; GOLD='#bf9737'
names=['5673ba7f-3ec2-4e90-9e21-407b5fe15656','131d9f77-735e-46ec-bacc-64133c154a85','7d006227-ed0c-4aba-b894-1c1f1ee12ce9','98bbede1-61af-4368-b751-e5a9a84d0209','7c2d95f6-7430-4005-bd31-5f5f62ee50ac','ae4aa358-7584-4bde-9e40-ce934ce6b265','5f1d48a9-fdcb-427a-baea-fbde2699f8f6','4fcfb492-4684-47a1-a8ad-4bbd63ea0059','104e4d4a-b46e-415b-b93c-41c630f1c57c','020c4a40-77a7-413f-8c34-d05d4b19c444']
shots=[Image.open(Path('C:/Users/User/AppData/Local/Temp')/('codex-clipboard-'+n+'.png')).convert('RGB') for n in names]
# Conceal identifying text while retaining the original product interface.
def cover(im,box):
    d=ImageDraw.Draw(im); d.rounded_rectangle(box,radius=4,fill='#e2e8f0')
for box in [(379,637,485,660),(586,637,647,660),(790,637,850,657),(792,745,851,766),(792,800,866,820),(792,855,849,879),(997,639,1050,662),(1203,637,1260,660)]:cover(shots[1],box)
for box in [(1256,635,1379,657),(1532,635,1670,657),(413,826,558,848),(970,846,1147,868)]:cover(shots[3],box)
for box in [(630,261,779,286),(960,262,1111,287)]:cover(shots[5],box)
for yy in [479,543,607,672,735,797,861]:cover(shots[6],(534,yy,770,yy+47))
logo=shots[0].crop((905,235,968,304))
def font(s,b=False):return ImageFont.truetype('C:/Windows/Fonts/'+('segoeuib.ttf' if b else 'segoeui.ttf'),s)
def smooth(v):
    v=max(0,min(1,v));return v*v*(3-2*v)
scenes=[
dict(a=0,b=4,label='CLINIC MANAGEMENT',title=['Still running your clinic','across spreadsheets?'],sub='Appointments. Patient records. Billing.',shot=1,crop=(345,83,1825,912),target=(368,95,1512,212)),
dict(a=4,b=8,label='MEET DIGITAL CLÍNICA',title=['Your clinic, connected.'],sub='Scheduling, patient records and billing in one platform.',shot=1,crop=(345,83,1825,912),target=None),
dict(a=8,b=11.333,label='01 / APPOINTMENTS',title=['Your week at a glance'],sub='See bookings and appointment status together.',shot=1,crop=(356,405,1810,912),target=(779,513,981,903)),
dict(a=11.333,b=14.667,label='02 / AVAILABILITY',title=['Control every available slot'],sub='Open, booked and blocked times in one view.',shot=3,crop=(377,216,1790,766),target=(736,350,1078,439)),
dict(a=14.667,b=18,label='03 / PATIENT RECORDS',title=['Keep patient history connected'],sub='Sessions, clinical notes and invoices together.',shot=4,crop=(871,420,1793,801),target=(1009,563,1152,624)),
dict(a=18,b=21.333,label='04 / RECURRING SESSIONS',title=['Plan recurring sessions together'],sub='Set the days. Check availability.',shot=5,crop=(591,410,1290,765),target=(1005,683,1270,746)),
dict(a=21.333,b=24.667,label='05 / BILLING',title=['Track invoices and collected payments'],sub='A clear view of paid and pending amounts.',shot=6,crop=(365,99,1525,351),target=(655,108,941,274)),
dict(a=24.667,b=28,label='06 / ANALYTICS',title=['See performance in one view'],sub='Revenue, attendance and clinic occupancy.',shot=7,crop=(360,396,1812,905),target=(1232,402,1519,546)),
dict(a=28,b=34,label='ONE CONNECTED VIEW',title=['From appointments','to revenue.'],sub='Keep the operational picture in focus.',shot=8,crop=(369,98,1811,587),target=None),
dict(a=34,b=40,label='DIGITAL CLÍNICA',title=['See it in action.'],sub='Clinic management, connected.',shot=None),
]

def frame(t):
    idx=next((i for i,s in enumerate(scenes) if s['a']<=t<s['b']),len(scenes)-1)
    s=scenes[idx]; local=t-s['a']; p=local/(s['b']-s['a'])
    im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(im)
    d.line((56,94,1024,94),fill='#dde2e9',width=1)
    d.text((58,43),'Digital Clínica',font=font(26,True),fill=NAVY)
    d.text((842,49),'CLINIC OS',font=font(18),fill=MUTED)
    if s['shot'] is None:
        im.paste(logo.resize((110,120),Image.Resampling.LANCZOS),(485,245))
        d=ImageDraw.Draw(im)
        for text,y,size,bold,col in [('Digital Clínica',405,60,True,NAVY),(s['sub'],493,30,False,MUTED)]:
            d.text(((W-d.textlength(text,font=font(size,bold)))/2,y),text,font=font(size,bold),fill=col)
        d.line((480,578,600,578),fill=GOLD,width=3)
        text=s['title'][0];d.text(((W-d.textlength(text,font=font(44,True)))/2,636),text,font=font(44,True),fill=NAVY)
    else:
        layer=Image.new('RGBA',(W,H));ld=ImageDraw.Draw(layer)
        ld.text((58,126),s['label'],font=font(19,True),fill=GOLD)
        size=48 if max(map(len,s['title']))<37 else 43
        for j,txt in enumerate(s['title']):ld.text((54,169+j*58),txt,font=font(size,True),fill=NAVY)
        ld.text((58,295),s['sub'],font=font(25),fill=MUTED)
        layer.putalpha(layer.getchannel('A').point(lambda a:round(a*smooth(local/.45))))
        im=Image.alpha_composite(im.convert('RGBA'),layer).convert('RGB')
        x0,y0,x1,y1=s['crop'];src=shots[s['shot']]
        # Camera push of only 2.5%, with a small lateral drift.
        zoom=1+.025*smooth(p);cw=(x1-x0)/zoom;ch=(y1-y0)/zoom
        cx=(x0+x1)/2+5*(p-.5);cy=(y0+y1)/2
        crop=(cx-cw/2,cy-ch/2,cx+cw/2,cy+ch/2)
        scale=min(950/cw,572/ch);sw=round(cw*scale);sh=round(ch*scale)
        px=(W-sw)//2;py=373+(578-sh)//2
        d=ImageDraw.Draw(im)
        d.rounded_rectangle((46,361,1034,963),radius=20,fill='#e9edf3')
        d.rounded_rectangle((50,357,1030,957),radius=20,fill='white',outline='#dce2eb',width=1)
        tile=src.transform((sw,sh),Image.Transform.EXTENT,crop,Image.Resampling.BICUBIC)
        im.paste(tile,(px,py))
        target=s.get('target')
        if target and local>.7:
            rgba=im.convert('RGBA');over=Image.new('RGBA',im.size);od=ImageDraw.Draw(over)
            bx=[px+(target[0]-crop[0])*scale,py+(target[1]-crop[1])*scale,px+(target[2]-crop[0])*scale,py+(target[3]-crop[1])*scale]
            alpha=round(215*smooth((local-.7)/.6))
            od.rounded_rectangle(bx,radius=9,outline=(191,151,55,alpha),width=3)
            im=Image.alpha_composite(rgba,over).convert('RGB')
    d=ImageDraw.Draw(im)
    d.text((58,999),'DIGITAL CLÍNICA  /  PRODUCT OVERVIEW',font=font(16),fill=MUTED)
    d.line((58,1040,1022,1040),fill='#e0e5ec',width=2)
    d.line((58,1040,58+964*t/40,1040),fill=GOLD,width=3)
    if idx<9:d.text((936,998),f'{idx+1:02} / 09',font=font(16),fill=MUTED)
    return im

def soundtrack():
    sr=48000; dur=40; n=sr*dur; audio=np.zeros((n,2),np.float64)
    # Original sustained major-nine / suspended pad score; no percussion.
    chords=[[48,55,59,62,64],[45,52,55,59,60],[41,48,52,55,57],[43,50,55,57,62],[48,55,59,62,64]]
    for k,notes in enumerate(chords):
        start=max(0,k*8-2);end=min(dur,k*8+10);tt=np.arange(round((end-start)*sr))/sr
        env=np.minimum(1,tt/2.8)*np.minimum(1,(end-start-tt)/3.2);env=np.clip(env,0,1)
        for j,midi in enumerate(notes):
            freq=440*2**((midi-69)/12)
            tone=np.sin(2*np.pi*freq*tt+j*.3)+.18*np.sin(2*np.pi*freq*2*tt+.7)
            tone*=env*(.019 if j else .026)*(1+.06*np.sin(2*np.pi*.13*tt+j))
            audio[round(start*sr):round(end*sr),0]+=tone*(.8+.2*j/len(notes))
            audio[round(start*sr):round(end*sr),1]+=tone*(1-.2*j/len(notes))
    tt=np.arange(n)/sr;audio*= (np.minimum(1,tt/2)*np.minimum(1,(dur-tt)/3))[:,None]
    with wave.open(str(ROOT/'ambient-original.wav'),'wb') as f:
        f.setnchannels(2);f.setsampwidth(2);f.setframerate(sr);f.writeframes((audio*32767).astype('<i2').tobytes())

def tc(t):
    ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
(ROOT/'captions.srt').write_text('\n\n'.join(f"{i+1}\n{tc(s['a'])} --> {tc(s['b'])}\n"+' '.join(s['title'])+'\n'+s['sub'] for i,s in enumerate(scenes)),encoding='utf-8')
(ROOT/'storyboard.json').write_text(json.dumps(scenes,ensure_ascii=False,indent=2),encoding='utf-8')
times=[2,6,9.5,13,16,19.5,23,26,31,37]
for i,t in enumerate(times):frame(t).save(ROOT/f'preview-{i:02}.jpg',quality=92)
sheet=Image.new('RGB',(1350,540),'white')
for i in range(10):sheet.paste(Image.open(ROOT/f'preview-{i:02}.jpg').resize((270,270)),((i%5)*270,(i//5)*270))
sheet.save(ROOT/'contact-sheet.jpg',quality=94)
frame(2).save(ROOT/'poster.jpg',quality=95)
if '--stills' in sys.argv:sys.exit()
soundtrack()
cmd=[str(ROOT/'ffmpeg.exe'),'-y','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s','1080x1080','-r',str(FPS),'-i','-','-i',str(ROOT/'ambient-original.wav'),'-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-t','40','-movflags','+faststart',str(ROOT/'digital-clinica-square.mp4')]
with open(ROOT/'encode.log','w') as log:
    proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=log)
    for i in range(FPS*40):
        proc.stdin.write(frame(i/FPS).tobytes())
        if i%(FPS*4)==0:print(f'Rendered {i/FPS:.0f}/40 seconds',flush=True)
    proc.stdin.close();code=proc.wait()
    if code:raise RuntimeError('FFmpeg export failed; see encode.log')
print('Export complete',flush=True)
