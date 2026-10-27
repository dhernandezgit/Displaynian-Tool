import { mkdirSync, writeFileSync } from "node:fs";

mkdirSync("dist", { recursive: true });
writeFileSync(
  "dist/index.html",
  `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=./web/"><title>Displaynian</title></head>
<body style="font-family:system-ui;background:#f4efe6;color:#24333a;padding:32px">
<p>Abriendo Displaynian… <a href="./web/">Entrar</a></p>
</body></html>`,
);
