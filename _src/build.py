# Builds the static pages: shared header and footer around each page body.
import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="icon" href="{base}assets/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@600;700&family=Source+Sans+3:wght@400;600&family=JetBrains+Mono:wght@500&display=swap">
<link rel="stylesheet" href="{base}assets/site.css">
</head>
<body>
<header class="top"><div class="top-in">
  <a class="brand" href="{base}"><img src="{base}assets/icon.svg" alt="" width="28" height="28">Ready Check</a>
  <nav class="nav">
    <a href="{base}guide/"{cur_guide}><span class="en">Setup guide</span><span class="es">Guía</span></a>
    <a href="{base}support/"{cur_support}><span class="en">Support</span><span class="es">Soporte</span></a>
    <a href="{base}privacy/"{cur_privacy}><span class="en">Privacy</span><span class="es">Privacidad</span></a>
    <a href="{base}terms/"{cur_terms}><span class="en">Terms</span><span class="es">Términos</span></a>
  </nav>
  <div class="lang" role="group" aria-label="Language / Idioma">
    <button type="button" data-set="en" aria-pressed="true">English</button>
    <button type="button" data-set="es" aria-pressed="false">Español</button>
  </div>
</div></header>
"""
FOOT = """<footer><div class="page">
  <span>Ready Check for Jira Cloud</span>
  <a href="{base}privacy/"><span class="en">Privacy</span><span class="es">Privacidad</span></a>
  <a href="{base}terms/"><span class="en">Terms</span><span class="es">Términos</span></a>
  <a href="{base}support/"><span class="en">Support</span><span class="es">Soporte</span></a>
</div></footer>
<script src="{base}assets/lang.js"></script>
</body>
</html>
"""
PAGES = {
  'index.html': ('', 'Ready Check for Jira', 'Definition of Ready for Jira: score every story and block the ones that are not ready.', 'home'),
  'guide/index.html': ('../', 'Ready Check Setup Guide', 'How to set up Ready Check in Jira in one minute.', 'guide'),
  'privacy/index.html': ('../', 'Ready Check Privacy Policy', 'What data Ready Check reads and stores.', 'privacy'),
  'terms/index.html': ('../', 'Ready Check Terms of Use', 'End user license agreement for Ready Check.', 'terms'),
  'support/index.html': ('../', 'Ready Check Support', 'How to get help with Ready Check.', 'support'),
}
for out, (base, title, desc, key) in PAGES.items():
    body = (ROOT / '_src' / f'{key}.html').read_text(encoding='utf-8')
    cur = {f'cur_{k}': (' aria-current="page"' if k == key else '') for k in ['guide', 'support', 'privacy', 'terms']}
    html = HEAD.format(title=title, desc=desc, base=base, **cur) + body + FOOT.format(base=base)
    (ROOT / out).write_text(html, encoding='utf-8')
    print('built', out)
