from pathlib import Path
from pypdf import PdfReader
from PIL import Image, ImageDraw
import json, re

out = Path(__file__).resolve().parents[1] / 'reaudit'
fixture = json.loads((out / 'document-fixtures.json').read_text(encoding='utf-8'))
results, images = [], []
for name in ['invoice', 'invoice-long', 'prescription', 'prescription-long']:
    reader = PdfReader(out / (name + '.pdf'))
    pages = [p.extract_text() or '' for p in reader.pages]
    text = '\n'.join(pages)
    row = {'name': name, 'pages': len(pages), 'accentsPresent': 'São' in text,
           'endMarkers': len(re.findall(r'FIN-\d+', text))}
    if name.startswith('prescription'):
        row['identityOnEveryPage'] = all(fixture['prescription']['patientName'] in p for p in pages)
        row['pageNumbers'] = [bool(re.search(r'Página\s*' + str(i + 1) + r'\s*/\s*' + str(len(pages)), p)) for i, p in enumerate(pages)]
        assert row['identityOnEveryPage'] and all(row['pageNumbers']), row
    if name == 'prescription-long':
        assert row['endMarkers'] == 18, row
    assert row['accentsPresent'], row
    results.append(row)
    (out / (name + '-text.txt')).write_text(text, encoding='utf-8')
    for p in sorted(out.glob(name + '-*.png')):
        if not re.match(re.escape(name) + r'-\d+\.png$', p.name):
            continue
        im = Image.open(p).convert('RGB')
        im.thumbnail((430, 620))
        canvas = Image.new('RGB', (450, 655), '#e4e7eb')
        canvas.paste(im, ((450 - im.width) // 2, 25))
        ImageDraw.Draw(canvas).text((10, 6), p.name, fill='black')
        images.append(canvas)
sheet = Image.new('RGB', (450 * 3, 655 * ((len(images) + 2) // 3)), '#e4e7eb')
for i, im in enumerate(images):
    sheet.paste(im, ((i % 3) * 450, (i // 3) * 655))
sheet.save(out / 'pdf-contact-sheet.png')
(out / 'pdf-inspection.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(results, ensure_ascii=True))
