# Publicación y actualizaciones

- **Aplicación:** https://pastorsierra.github.io/App-predicador/
- **Repositorio:** https://github.com/pastorsierra/App-predicador

(El repositorio se llama «App-predicador» porque se reutilizó uno vacío que ya existía. Si quiere que se llame `escudrinad`: repositorio → **Settings → General → Repository name**. La dirección de la app cambiaría a `https://pastorsierra.github.io/escudrinad/` y habría que volver a agregarla a la pantalla de inicio; los datos guardados en la dirección anterior no pasan solos a la nueva, así que antes haga **Exportar respaldo**.)

## Cómo está publicada
- La app está en la raíz del repositorio (rama `main`): `index.html`, `sw.js`, `css/`, `js/`, `data/`, `icons/`.
- GitHub Pages publica la rama `main`, carpeta raíz (**Settings → Pages → Deploy from a branch → main / (root)**).
- `docs/`, `tools/`, `tests/` y `supabase/` son documentación y herramientas; no contienen datos personales ni secretos.
- `.nojekyll` hace que GitHub sirva los archivos tal cual.

## Cómo hacer una actualización
Lo normal es pedírsela a Claude: «actualiza Escudriñad con…». Claude hace el cambio, ejecuta las pruebas y lo sube. Si se hace a mano desde el iPad:
1. Edite el archivo en github.com (lápiz → *Commit changes*).
2. **Siempre** cambie el número de versión en `sw.js` (`const VERSION = 'v0.1.1'`, luego `v0.1.2`, etc.).
3. Si se agrega un archivo nuevo a `js/`, añádalo también a la lista `SHELL_FILES` de `sw.js` (si no, no funcionará sin conexión).
4. Espere 1–2 minutos (pestaña **Actions** del repositorio: círculo verde = publicado).
5. En el iPhone/iPad, al abrir la app con internet aparece «Se instaló una versión nueva de la aplicación» y se recarga sola. **Ajustes** muestra la versión instalada.

Las notas, estudios, favoritos y demás datos personales **no** se tocan en una actualización: viven en el dispositivo. Los textos bíblicos descargados también se conservan.

## Lo que nunca debe subirse
Respaldos (`escudrinad-respaldo-*.json`), capturas o resultados de pruebas, archivos `.env`, contraseñas o claves. El archivo `.gitignore` ya los excluye.
