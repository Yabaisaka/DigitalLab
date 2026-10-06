import { z } from 'zod';
import { writeFileSync,copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { sopDocumentSchema } from '../lib/sop';
const root='public/downloads/lab-sop-generator';
writeFileSync(`${root}/references/schema.json`,JSON.stringify(z.toJSONSchema(sopDocumentSchema,{target:'draft-2020-12',unrepresentable:'any'}),null,2)+'\n');
copyFileSync(`${root}/assets/example.json`,'public/downloads/sop-template.json');
copyFileSync(`${root}/references/format.md`,'public/downloads/sop-format.md');
execFileSync('python3',['-c',`from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
base = Path('${root}')
with ZipFile('public/downloads/lab-sop-generator.zip', 'w', ZIP_DEFLATED) as z:
    for p in sorted(base.rglob('*')):
        if p.is_file() and '__pycache__' not in p.parts:
            z.write(p, str(Path(base.name) / p.relative_to(base)))
`]);
console.log('Built skill ZIP, JSON template and schema.');
