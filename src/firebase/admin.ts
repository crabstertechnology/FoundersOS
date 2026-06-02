import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { firebaseConfig } from './config';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const firestore = getFirestore(app);

// A simple compatibility wrapper for the firebase-admin style chain API used in API routes
export const adminDb = {
  collection: (collectionPath: string) => {
    return {
      doc: (docId: string) => {
        return {
          collection: (subCollectionPath: string) => {
            return {
              doc: (subDocId: string) => {
                const docRef = doc(firestore, collectionPath, docId, subCollectionPath, subDocId);
                return {
                  set: async (data: any) => {
                    await setDoc(docRef, data, { merge: true });
                  },
                  update: async (data: any) => {
                    await updateDoc(docRef, data);
                  },
                  get: async () => {
                    const snap = await getDoc(docRef);
                    return {
                      exists: snap.exists(),
                      data: () => snap.data(),
                    };
                  }
                };
              }
            };
          },
          get: async () => {
            const docRef = doc(firestore, collectionPath, docId);
            const snap = await getDoc(docRef);
            return {
              exists: snap.exists(),
              data: () => snap.data(),
            };
          },
          set: async (data: any) => {
            const docRef = doc(firestore, collectionPath, docId);
            await setDoc(docRef, data, { merge: true });
          },
          update: async (data: any) => {
            const docRef = doc(firestore, collectionPath, docId);
            await updateDoc(docRef, data);
          }
        };
      }
    };
  }
};
