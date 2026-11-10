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
<link rel="canonical" href="https://stevenpardoo.github.io/ready-check-site/{path}">
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="https://stevenpardoo.github.io/ready-check-site/{path}">
<meta property="og:image" content="https://stevenpardoo.github.io/ready-check-site/assets/og.png">
<meta name="twitter:card" content="summary_large_image">
{jsonld}
<link rel="icon" href="{base}assets/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@600;700&family=Source+Sans+3:wght@400;600&family=JetBrains+Mono:wght@500&display=swap">
<link rel="stylesheet" href="{base}assets/site.css">
</head>
<body>
<header class="top"><div class="top-in">
  <a class="brand" href="{base}"><img src="{base}assets/icon.svg" alt="" width="28" height="28">Ready Check</a>
  <nav class="nav">
    <a href="{base}checker/"{cur_checker}><span class="en">Free story checker</span><span class="es">Revisor gratis</span></a>
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
  'index.html': ('', 'Ready Check: Definition of Ready for Jira', 'Score every Jira user story from 0 to 100 against your Definition of Ready, see what is missing and block stories that are not ready. English and Spanish.', 'home'),
  'checker/index.html': ('../', 'Free User Story Readiness Checker', 'Paste a user story and get a readiness score, missing acceptance criteria, edge cases and the questions QA will ask. Free, in English and Spanish.', 'checker'),
  'guide/index.html': ('../', 'Ready Check Setup Guide', 'How to set up Ready Check in Jira in one minute.', 'guide'),
  'privacy/index.html': ('../', 'Ready Check Privacy Policy', 'What data Ready Check reads and stores.', 'privacy'),
  'terms/index.html': ('../', 'Ready Check Terms of Use', 'End user license agreement for Ready Check.', 'terms'),
  'support/index.html': ('../', 'Ready Check Support', 'How to get help with Ready Check.', 'support'),
}
for out, (base, title, desc, key) in PAGES.items():
    body = (ROOT / '_src' / f'{key}.html').read_text(encoding='utf-8')
    cur = {f'cur_{k}': (' aria-current="page"' if k == key else '') for k in ['checker', 'guide', 'support', 'privacy', 'terms']}
    path = out.replace('index.html', '')
    jsonld = ''
    if key == 'home':
        jsonld = '<script type="application/ld+json">{"@context":"https://schema.org","@type":"SoftwareApplication","name":"Ready Check – Definition of Ready","applicationCategory":"BusinessApplication","operatingSystem":"Jira Cloud","offers":{"@type":"Offer","price":"0","priceCurrency":"USD","description":"Free for up to 10 users"},"inLanguage":["en","es"]}</script>'
    if key == 'checker':
        jsonld = '<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebApplication","name":"User Story Readiness Checker","applicationCategory":"BusinessApplication","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"},"inLanguage":["en","es"]}</script>'
    html = HEAD.format(title=title, desc=desc, base=base, path=path, jsonld=jsonld, **cur) + body + FOOT.format(base=base)
    (ROOT / out).write_text(html, encoding='utf-8')
    print('built', out)
urls = ''.join(f'<url><loc>https://stevenpardoo.github.io/ready-check-site/{o.replace("index.html", "")}</loc></url>' for o in PAGES)
(ROOT / 'sitemap.xml').write_text(f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>', encoding='utf-8')
ROBOTS = """User-agent: *
Allow: /
Sitemap: https://stevenpardoo.github.io/ready-check-site/sitemap.xml
"""
(ROOT / 'robots.txt').write_text(ROBOTS, encoding='utf-8')
