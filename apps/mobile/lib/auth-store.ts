import * as SecureStore from 'expo-secure-store';
const KEY='mwahli_session';
export const authStore={get:()=>SecureStore.getItemAsync(KEY),set:(v:string)=>SecureStore.setItemAsync(KEY,v),clear:()=>SecureStore.deleteItemAsync(KEY)};
