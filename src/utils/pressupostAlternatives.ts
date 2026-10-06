import type { AlternativaPressupost, Pressupost } from '../types/pressupost';

function snapshot(pressupost: Pressupost): AlternativaPressupost {
  const { alternatives, alternativaAcceptadaId, ...data } = pressupost;
  return structuredClone({ ...data, alternativaId: data.alternativaId || 'A', alternativaNom: data.alternativaNom || 'Opció A' });
}

/** Flush the edited option before switching or saving. Older budgets remain unchanged. */
export function actualitzarAlternatives(pressupost: Pressupost): Pressupost {
  if (!pressupost.alternatives?.length) return pressupost;
  const current = snapshot(pressupost);
  return {
    ...pressupost,
    alternatives: pressupost.alternatives.map(a => a.alternativaId === current.alternativaId ? current : a),
  };
}

/** Existing consumers (projects, invoices, reports) always see the chosen option. */
export function pressupostPerGuardar(pressupost: Pressupost): Pressupost {
  const updated = actualitzarAlternatives(pressupost);
  const canonical = updated.alternatives?.find(a => a.alternativaId === updated.alternativaAcceptadaId)
    || updated.alternatives?.[0];
  return canonical ? { ...canonical, alternatives: updated.alternatives, alternativaAcceptadaId: updated.alternativaAcceptadaId } : updated;
}

export function seleccionarAlternativa(pressupost: Pressupost, id: string): Pressupost {
  const updated = actualitzarAlternatives(pressupost);
  const selected = updated.alternatives?.find(a => a.alternativaId === id);
  if (!selected) return updated;
  return { ...structuredClone(selected), alternatives: updated.alternatives, alternativaAcceptadaId: updated.alternativaAcceptadaId };
}

export function crearAlternativa(pressupost: Pressupost): Pressupost {
  if (pressupost.alternativaAcceptadaId || pressupost.projecteCreat || pressupost.projecteVinculat || pressupost.estat === 'acceptat') return pressupost;
  const updated = actualitzarAlternatives(pressupost);
  const alternatives = updated.alternatives || [snapshot(updated)];
  let index = 1;
  const optionId = (n: number) => n < 26 ? String.fromCharCode(65 + n) : `A${n + 1}`;
  while (alternatives.some(a => a.alternativaId === optionId(index))) index++;
  const newOption: AlternativaPressupost = {
    ...snapshot(updated),
    alternativaId: optionId(index),
    alternativaNom: `Opció ${optionId(index)}`,
    estat: 'esborrany',
    dataAcceptacio: undefined,
    projecteCreat: undefined,
    projecteVinculat: undefined,
    documentsGenerats: [],
  };
  return { ...newOption, alternatives: [...alternatives, newOption] };
}

export function canviarEstatAlternativa(pressupost: Pressupost, estat: Pressupost['estat']): Pressupost {
  if (pressupost.alternativaAcceptadaId || pressupost.projecteCreat || pressupost.projecteVinculat) return pressupost;
  const updated = actualitzarAlternatives({
    ...pressupost,
    estat,
    dataAcceptacio: estat === 'acceptat' ? new Date().toISOString().split('T')[0] : undefined,
  });
  return {
    ...updated,
    alternativaAcceptadaId: estat === 'acceptat' && updated.alternatives?.length ? updated.alternativaId : undefined,
  };
}

export function eliminarAlternativa(pressupost: Pressupost): Pressupost {
  if (!pressupost.alternatives || pressupost.alternatives.length < 2 || pressupost.alternativaAcceptadaId ||
      pressupost.estat !== 'esborrany' || pressupost.projecteCreat || pressupost.projecteVinculat) return pressupost;
  const alternatives = pressupost.alternatives.filter(a => a.alternativaId !== pressupost.alternativaId);
  return { ...structuredClone(alternatives[0]), alternatives };
}

export function referenciaAlternativa(pressupost: Pressupost): string {
  return pressupost.alternativaId ? `${pressupost.codi}_${pressupost.alternativaId}` : pressupost.codi;
}

export function estatProposta(pressupost: Pressupost): Pressupost['estat'] {
  if (!pressupost.alternatives?.length) return pressupost.estat;
  if (pressupost.alternativaAcceptadaId) return 'acceptat';
  if (pressupost.alternatives.every(a => a.estat === 'rebutjat')) return 'rebutjat';
  if (pressupost.alternatives.some(a => a.estat === 'enviat')) return 'enviat';
  return 'esborrany';
}
