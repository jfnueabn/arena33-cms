"""Local JSON-lines worker. No HTTP clients or runtime downloads."""
import json
import os
from pathlib import Path
import re
import sys

import ctranslate2
import sentencepiece
from opencc import OpenCC

sys.stdin.reconfigure(encoding='utf-8')
sys.stdout.reconfigure(encoding='utf-8')
model_root = Path(os.environ.get('TRANSLATION_MODEL_DIR') or Path(__file__).resolve().parents[2] / '.translation-runtime' / 'models')
models = {}
simplified = OpenCC('t2s')
protected = re.compile(r'LV55|RM\s*\d[\d,.]*|\d[\d,.]*%?|\{[A-Za-z_]+\}|https?://\S+|[\w.+-]+@[\w.-]+', re.IGNORECASE)

def load(locale):
    if locale not in ('ms', 'zh'):
        raise ValueError('Unsupported target language')
    if locale not in models:
        package = model_root / ('en-' + locale)
        tokenizer_path = next(package.glob('*.model'))
        tokenizer = sentencepiece.SentencePieceProcessor(model_file=str(tokenizer_path))
        engine = ctranslate2.Translator(str(package / 'model'), device='cpu', compute_type='int8', inter_threads=1, intra_threads=min(4, os.cpu_count() or 1))
        models[locale] = (tokenizer, engine)
    return models[locale]

def translate(texts, locale):
    tokenizer, engine = load(locale)
    output = []
    for text in texts:
        pieces = tokenizer.encode(text, out_type=str)
        batches = [pieces[i:i + 320] for i in range(0, len(pieces), 320)]
        if not batches:
            output.append(text)
            continue
        results = engine.translate_batch(batches, beam_size=4, max_decoding_length=640)
        translated = ' '.join(tokenizer.decode(result.hypotheses[0]).replace('▁', ' ').replace('_', ' ').strip() for result in results)
        # Never allow the model to silently change supplied figures, URLs or the brand.
        literals = protected.findall(text)
        if any(translated.count(token) != text.count(token) for token in literals):
            parts, position = [], 0
            for match in protected.finditer(text):
                parts.append((text[position:match.start()], False))
                parts.append((match.group(), True))
                position = match.end()
            parts.append((text[position:], False))
            repaired = []
            for part, literal in parts:
                if literal or not re.search('[A-Za-z]', part):
                    repaired.append(part)
                else:
                    tokens = tokenizer.encode(part.strip(), out_type=str)
                    result = engine.translate_batch([tokens], beam_size=4, max_decoding_length=640)[0]
                    decoded = tokenizer.decode(result.hypotheses[0]).replace('▁', ' ').replace('_', ' ').strip()
                    repaired.append((' ' if part.startswith(' ') else '') + decoded + (' ' if part.endswith(' ') else ''))
            translated = ''.join(repaired)
        if locale == 'zh':
            translated = simplified.convert(translated)
        output.append(translated)
    return output

for line in sys.stdin:
    try:
        request = json.loads(line)
        result = translate(request['texts'], request['locale'])
        print(json.dumps({'id': request['id'], 'translations': result}, ensure_ascii=False), flush=True)
    except Exception as error:
        print(json.dumps({'id': request.get('id') if 'request' in locals() else None, 'error': str(error)}, ensure_ascii=False), flush=True)
