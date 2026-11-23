# Escudriñad — plataforma personal de estudio bíblico

**Abrir la app:** https://pastorsierra.github.io/App-predicador/

PWA para iPhone y iPad: lectura de la Biblia (RV1909 con números Strong), comparación de traducciones, búsqueda completa, léxico hebreo/griego, referencias cruzadas, notas, resaltados, favoritos, marcadores y un motor de estudio de 22 secciones. Funciona sin conexión.

- Usar: `docs/USO.md`
- Publicar: `docs/PUBLICAR.md`
- Arquitectura: `docs/ARQUITECTURA.md`
- Hoja de ruta: `docs/ROADMAP.md`
- Base de datos: `docs/BASE_DE_DATOS.md` y `supabase/schema.sql`
- Licencias: `docs/LICENCIAS.md`
- Pruebas: `docs/PRUEBAS.md`
- Registro (estado, decisiones, pendientes): `docs/REGISTRO.md`

## Estructura
| Carpeta | Contenido | ¿Se publica en la app? |
|---|---|---|
| raíz: `index.html`, `sw.js`, `css/`, `js/`, `data/`, `icons/` | La aplicación | Sí |
| `docs/` | Documentación del proyecto | No forma parte de la app |
| `supabase/` | Esquema de la base de datos en la nube (fase siguiente) | No |
| `tools/` | Scripts que generan `data/` desde las fuentes originales | No |
| `tests/` | Pruebas automáticas en navegador | No |

## Licencias
- Textos y datos bíblicos: ver `docs/LICENCIAS.md` y `data/LICENCIAS.txt` (RV1909 dominio público; BES CC BY 4.0; referencias OpenBible CC BY; Strong dominio público / edición Open Scriptures CC BY-SA).
- Código: © Antonio Sierra J. Todos los derechos reservados.

## Privacidad
El repositorio no contiene datos personales. Las notas, estudios y respaldos se guardan solo en el dispositivo del usuario.
