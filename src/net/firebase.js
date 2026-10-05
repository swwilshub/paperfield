// Firebase store adapter: implemented in M2. Same interface as src/net/store.js.
export function createFirebaseStore(){
  return{async connect(){throw new Error('Firebase adapter not implemented yet (M2).');}};
}
