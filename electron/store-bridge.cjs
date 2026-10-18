// Keep electron-store in the main process. Sandboxed preloads cannot require it.
function handleStoreRequest(store, allowedKeys, request) {
  try {
    if (!request || typeof request !== 'object') throw new Error('Petició de dades invàlida.');
    const { operation, key, value } = request;
    if (operation === 'available') return { success: true, data: true };
    if (operation === 'path') return { success: true, data: store.path };
    if (typeof key !== 'string' || !allowedKeys.has(key)) throw new Error('Clau de dades no permesa.');
    switch (operation) {
      case 'get': return { success: true, data: store.get(key) };
      case 'set': store.set(key, value); return { success: true };
      case 'delete': store.delete(key); return { success: true };
      case 'has': return { success: true, data: store.has(key) };
      default: throw new Error('Operació de dades no permesa.');
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

module.exports = { handleStoreRequest };
