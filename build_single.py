"""Genera un único archivo HTML (para publicar como artefacto) a partir de index.html, styles.css, solver.js y app.js."""
import re, pathlib
r = pathlib.Path(__file__).parent
html = (r/"index.html").read_text(encoding="utf-8")
css = (r/"styles.css").read_text(encoding="utf-8")
solver = (r/"solver.js").read_text(encoding="utf-8")
app = (r/"app.js").read_text(encoding="utf-8")
title = '<title>Euler en el Espacio</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
fonts = re.search(r'<link rel="stylesheet" href="https://fonts.googleapis.com[^>]*>', html).group(0)
body = re.search(r"<body>(.*)</body>", html, re.S).group(1)
body = re.sub(r'<script src="solver.js"></script>\s*<script src="app.js"></script>', "", body)
out = title + fonts + "\n<style>\n" + css + "\n</style>\n" + body + "\n<script>\n" + solver + "\n</script>\n<script>\n" + app + "\n</script>\n"
(r/"dist").mkdir(exist_ok=True)
(r/"dist"/"euler-en-el-espacio.html").write_text(out, encoding="utf-8")
print("ok", len(out))
