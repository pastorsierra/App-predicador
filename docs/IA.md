# Asistente de IA: cómo activarlo

Todo está listo en la app. Solo falta la cuenta de Anthropic y el servidor. Se puede hacer desde el iPad en unos 15 minutos.

## Cómo funciona
1. Usted escribe una pregunta, con un pasaje o sin él.
2. La app reúne primero los **textos reales** y los numera: el pasaje en sus versiones, el capítulo como contexto, las referencias cruzadas, las palabras originales (Strong), sus notas y fragmentos de sus documentos de la Biblioteca.
3. La app envía esa pregunta y esas fuentes a **su propia función de servidor** en Supabase. Esa función guarda la clave de Anthropic y le pide la respuesta a Claude.
4. La respuesta vuelve marcada como «Generado por IA». La app la revisa sola:
   - avisa si la respuesta menciona fuentes que no existen, por ejemplo [99];
   - avisa si cita versículos que no existen, por ejemplo Juan 99:1;
   - lista las citas que no estaban entre las fuentes enviadas, para que usted compruebe su texto.
5. Puede guardar la respuesta en el Cuaderno, con la etiqueta IA y la lista de fuentes, o copiarla.

La clave de Anthropic **nunca** está en la app, ni en GitHub, ni en los respaldos. En el iPad solo se guardan la dirección de la función y su código de acceso, y esos datos tampoco van en los respaldos.

## Pasos

### 1. Anthropic (la IA)
1. Entre en **console.anthropic.com** y cree su cuenta. Es distinta de la suscripción de claude.ai.
2. Añada saldo en **Billing**. Se paga por uso.
3. Ponga un **límite de gasto mensual** en **Settings → Limits**. Así nunca gastará más de lo que decida.
4. En **API Keys**, pulse **Create Key** y copie la clave. Empieza por `sk-ant-`. No la comparta con nadie.

### 2. Supabase (el servidor)
1. Entre en **supabase.com** y cree un proyecto gratuito.
2. Abra **Edge Functions** → **Deploy a new function** → **Via Editor**.
3. Nombre de la función: `asistente`.
4. Borre el código de ejemplo. En GitHub abra `App-predicador/supabase/functions/asistente/index.ts`, pulse **Raw**, copie todo y péguelo en el editor. Pulse **Deploy**.
5. En los ajustes de la función, desactive **Enforce JWT Verification** (verificación JWT). La función ya se protege con su código de acceso y con la lista de sitios autorizados.
6. En **Edge Functions → Secrets**, cree estos dos secretos:
   - `ANTHROPIC_API_KEY`: la clave del paso 1.
   - `CODIGO_ACCESO`: una frase larga que usted invente, de 12 letras o más. Por ejemplo, unas palabras que solo usted sepa. No use la contraseña de otras cuentas.
   - Opcional: `MODELO`, para cambiar el modelo sin tocar el código. Por defecto se usa `claude-sonnet-5-5`.
   - Opcional: `ORIGENES`, si algún día publica la app en otra dirección. Por defecto solo se acepta `https://pastorsierra.github.io`.
7. Copie la dirección de la función. Tiene esta forma: `https://XXXX.supabase.co/functions/v1/asistente`.

### 3. En la app
1. Abra **Ajustes → Asistente de IA**.
2. Pegue la dirección de la función y escriba su código de acceso.
3. Pulse **Guardar y probar**. La prueba no gasta dinero, porque no llama a Anthropic.
4. Si sale «Conectado», ya puede usar el asistente:
   - «Asistente IA» aparece en el menú;
   - «Preguntar a la IA» aparece en el panel de cada versículo.
5. Repita este apartado en el iPhone. El código no se copia en los respaldos.

## Modos y profundidad
- **Modos:** estudio personal, exegeta, hermeneuta, teólogo bíblico, investigador, ayudante del predicador, preguntas de estudio y mi biblioteca.
- **Profundidad:** breve, explicativa, profunda e investigación avanzada. A mayor profundidad, respuesta más larga y costo mayor.
- **Perfil doctrinal:** el perfil de Ajustes (IPUC unicitario) y su marco personal se envían como marco de estudio. Nunca cambian el texto bíblico.

## Si algo falla
| Mensaje | Qué hacer |
|---|---|
| Código de acceso incorrecto | Escriba exactamente el mismo `CODIGO_ACCESO` del servidor. |
| El servidor rechazó la petición (… verificación JWT) | Desactive Enforce JWT Verification, o pegue la clave pública «anon» del proyecto en el tercer campo. |
| Falta configurar los secretos | Cree `ANTHROPIC_API_KEY` y `CODIGO_ACCESO` en Secrets. |
| La cuenta de Anthropic no tiene saldo / límite de uso | Revise Billing y Limits en console.anthropic.com. |
| Sitio no autorizado | Añada la dirección de la app en el secreto `ORIGENES`. |

## Pruebas
`node tests/asistente.mjs URL` ejecuta la función real en Node. En lugar de llamar a Anthropic, usa un doble de prueba, así que no gasta dinero. Comprueba:
- el rechazo de códigos y de sitios no autorizados;
- que la prueba de conexión no llame a Anthropic;
- las cabeceras de la petición y que la clave no salga del servidor;
- el envío de textos reales;
- la marca de IA y la verificación de citas;
- que la configuración no vaya en los respaldos;
- que el asistente quede oculto mientras no esté configurado.
