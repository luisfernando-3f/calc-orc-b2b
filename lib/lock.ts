// Lock de escrita em processo: serializa operações read-modify-write por chave,
// evitando que dois salvamentos concorrentes (auto-save de vendedores diferentes)
// sobrescrevam um ao outro no mesmo arquivo JSON. Como o app roda num único
// processo Node (PM2), uma fila de promessas por chave basta.

const chains = new Map<string, Promise<unknown>>();

export function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = chains.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn); // roda fn depois da anterior (sucesso ou erro)
  // mantém a corrente viva mesmo se fn falhar, sem "unhandled rejection"
  chains.set(
    key,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
}
