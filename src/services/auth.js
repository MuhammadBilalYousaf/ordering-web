import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export function watchAuth(onUser) {
  return onAuthStateChanged(auth, onUser);
}

export function isGuest(user) {
  return Boolean(user?.isAnonymous);
}

export async function loadCustomer(uid) {
  const snap = await getDoc(doc(db, 'customers', uid));
  return snap.exists() ? snap.data() : null;
}

export async function continueAsGuest() {
  if (auth.currentUser) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
}

async function saveProfile(user, { name, phone }) {
  await setDoc(doc(db, 'customers', user.uid), {
    uid: user.uid,
    name: name || user.displayName || '',
    phone: phone || '',
    email: user.email || '',
    guest: user.isAnonymous,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function signUpCustomer({ name, email, password, phone }) {
  const credential = EmailAuthProvider.credential(email.trim(), password);
  let user = auth.currentUser;
  if (user?.isAnonymous) {
    const linked = await linkWithCredential(user, credential);
    user = linked.user;
  } else {
    const created = await createUserWithEmailAndPassword(auth, email.trim(), password);
    user = created.user;
  }
  if (name) await updateProfile(user, { displayName: name.trim() });
  try {
    await saveProfile(user, { name, phone });
  } catch (error) {
    console.error(error);
  }
  return user;
}

export async function signInCustomer({ email, password }) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

export async function signOutCustomer() {
  await signOut(auth);
}

export { saveProfile };
