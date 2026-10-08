from pathlib import Path
from pypdf import PdfReader
from PIL import Image, ImageOps, ImageDraw
import json, re
out=Path(__file__).resolve().parents[1]/'evidence'
results=[]
for name in ['invoice','prescription','invoice-long','prescription-long']:
    reader=PdfReader(out/(name+'.pdf'))
    text='\n'.join(p.extract_text() or '' for p in reader.pages)
    results.append({'name':name,'pages':len(reader.pages),'hasAccentName':'São' in text,'characters':len(text),'longItemEndMarkers':len(re.findall(r'FIN-\d+',text)),'lastCharacters':text[-160:]})
    (out/(name+'-text.txt')).write_text(text,encoding='utf-8')
images=[]
for name in ['invoice','prescription','invoice-long','prescription-long']:
    for p in sorted(out.glob(name+'-*.png')):
        if not re.match(re.escape(name)+r'-\d+\.png$',p.name):continue
        im=Image.open(p).convert('RGB');im.thumbnail((430,620))
        canvas=Image.new('RGB',(450,655),'#e4e7eb');canvas.paste(im,((450-im.width)//2,25));ImageDraw.Draw(canvas).text((10,6),p.name,fill='black');images.append(canvas)
sheet=Image.new('RGB',(450*3,655*((len(images)+2)//3)),'#e4e7eb')
for i,im in enumerate(images):sheet.paste(im,((i%3)*450,(i//3)*655))
sheet.save(out/'pdf-contact-sheet.png')
(out/'pdf-inspection.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(results,ensure_ascii=True))
