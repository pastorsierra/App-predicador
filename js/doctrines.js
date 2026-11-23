// Módulo 5 — Doctrina y teología: biblioteca doctrinal que el usuario construye sobre el texto bíblico.
// La app NO redacta doctrina: organiza, muestra los textos reales y relaciona pasajes y enseñanzas.
// Los «pasajes sugeridos» son referencias bíblicas (verificadas) que el usuario puede quitar o ampliar.
import { put, get, all, remove } from './db.js';

export const CATEGORIES = [
  ['dios', 'Dios'], ['unicidad', 'Unicidad de Dios'], ['jesucristo', 'Jesucristo'], ['divinidad', 'Divinidad de Jesucristo'],
  ['humanidad', 'Humanidad de Jesucristo'], ['salvacion', 'Salvación'], ['arrepentimiento', 'Arrepentimiento'],
  ['bautismo-agua', 'Bautismo en agua'], ['bautismo-espiritu', 'Bautismo del Espíritu Santo'], ['santidad', 'Santidad'],
  ['vida-cristiana', 'Vida cristiana'], ['iglesia', 'Iglesia'], ['ministerios', 'Ministerios'], ['dones', 'Dones espirituales'],
  ['evangelismo', 'Evangelismo'], ['misiones', 'Misiones'], ['escatologia', 'Escatología'], ['resurreccion', 'Resurrección'],
  ['juicio', 'Juicio'], ['vida-eterna', 'Vida eterna'],
];

// Referencias verificadas contra la RV1909 (textos clásicos de estudio en la doctrina apostólica)
export const SUGGESTED = {
  unicidad: ['DEU.6.4', 'ISA.43.10-11', 'ISA.44.6', 'ISA.45.5', 'MRK.12.29', 'JHN.10.30', 'JHN.14.9', 'COL.2.9', '1TI.3.16', 'ISA.9.6'],
  divinidad: ['JHN.1.1', 'JHN.1.14', 'JHN.20.28', 'COL.2.9', '1TI.3.16', 'TIT.2.13', 'ISA.9.6', 'REV.1.8'],
  humanidad: ['GAL.4.4', 'HEB.2.14', 'HEB.4.15', 'PHP.2.7-8', '1TI.2.5', 'LUK.2.52'],
  arrepentimiento: ['ACT.2.38', 'ACT.3.19', 'LUK.13.3', 'ACT.17.30', '2CO.7.10', 'LUK.24.47'],
  'bautismo-agua': ['ACT.2.38', 'ACT.8.16', 'ACT.10.48', 'ACT.19.5', 'ACT.22.16', 'MAT.28.19', 'ROM.6.3-4', 'COL.2.12', 'MRK.16.16'],
  'bautismo-espiritu': ['ACT.1.5', 'ACT.2.4', 'ACT.2.38-39', 'ACT.8.17', 'ACT.10.44-46', 'ACT.19.6', 'JHN.3.5', 'JOL.2.28'],
  santidad: ['HEB.12.14', '1PE.1.15-16', '1TH.4.7', '2CO.7.1', 'ROM.12.1-2'],
  resurreccion: ['1CO.15.20-22', 'JHN.11.25', '1TH.4.16', 'ROM.6.5'],
};

export const SECTIONS = [
  ['definicion', 'Definición', 'Defina la doctrina con sus palabras, en una o dos frases.'],
  ['fundamento', 'Fundamento bíblico', 'Qué enseña la Escritura y dónde. Distinga lo que el texto afirma de lo que se infiere.'],
  ['contexto', 'Contexto de los textos', 'Quién habla, a quién y en qué situación, para cada pasaje principal.'],
  ['desarrollo', 'Desarrollo doctrinal', 'Cómo se desarrolla la enseñanza desde el Antiguo hasta el Nuevo Testamento.'],
  ['relacion', 'Relación entre pasajes', 'Cómo se explican y complementan los textos entre sí.'],
  ['ejemplos', 'Ejemplos bíblicos', 'Personas o hechos de la Biblia que muestran la doctrina.'],
  ['preguntas', 'Preguntas frecuentes', 'Preguntas que suelen hacer los hermanos y visitantes.'],
  ['objeciones', 'Objeciones', 'Objeciones que se plantean, expuestas con honestidad.'],
  ['respuestas', 'Respuestas bíblicas', 'Respuesta a cada objeción, con su fundamento y su contexto.'],
  ['aplicaciones', 'Aplicaciones', 'Qué implica para la vida y el ministerio.'],
  ['conclusiones', 'Conclusiones', 'Síntesis de la doctrina.'],
  ['bibliografia', 'Bibliografía', 'Libros y documentos consultados: autor, título, editorial, página.'],
  ['notas', 'Notas personales', 'Ideas, pendientes y observaciones.'],
].map(([id, title, hint]) => ({ id, title, hint }));

export async function getDoctrine(id) {
  const d = await get('doctrines', id);
  if (d) return d;
  const cat = CATEGORIES.find(c => c[0] === id);
  if (!cat) return null;
  return { id, title: cat[1], category: id, sections: {}, principal: [], complementary: [], related: [], isNew: true };
}
export async function saveDoctrine(d) { const { isNew, ...rec } = d; return put('doctrines', rec); }
export async function listDoctrines() { return all('doctrines'); }
export const deleteDoctrine = (id) => remove('doctrines', id);
