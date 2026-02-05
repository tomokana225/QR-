import { initializeApp, FirebaseApp, getApps, getApp } from 'firebase/app';
import { getAuth, Auth, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirestore, Firestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { AppSettings, Student, SubmissionList, GradingList, FirebaseConfig } from '../types';

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

// Firebase初期化
export const initFirebase = (config: FirebaseConfig) => {
    if (!config.apiKey || !config.projectId) {
        console.warn('Firebase config is missing');
        return null;
    }

    try {
        if (getApps().length === 0) {
            app = initializeApp(config);
        } else {
            app = getApp();
        }
        auth = getAuth(app);
        db = getFirestore(app);
        return { app, auth, db };
    } catch (e) {
        console.error('Firebase initialization failed:', e);
        return null;
    }
};

export const getFirebaseAuth = () => auth;

// ログイン
export const signIn = async (email: string, pass: string) => {
    if (!auth) throw new Error('Firebase not initialized');
    return signInWithEmailAndPassword(auth, email, pass);
};

// ログアウト
export const signOut = async () => {
    if (!auth) throw new Error('Firebase not initialized');
    return firebaseSignOut(auth);
};

// データ保存（クラウド同期）
export const saveToCloud = async (
    userId: string, 
    data: { 
        students: Student[], 
        submissionLists: SubmissionList[], 
        gradingLists: GradingList[],
        settings: AppSettings
    }
) => {
    if (!db) throw new Error('Firebase not initialized');
    
    // settingsからFirebaseConfigなどの機密情報を除外して保存してもよいが、
    // ここでは利便性のためユーザー設定全体を保存します（APIキーはクライアントサイドJSで見えるものなので許容範囲）
    // ただし、セキュリティルールで uid 一致を必須にすること。
    
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
        ...data,
        updatedAt: new Date().toISOString()
    });
};

// データ読み込み（クラウド同期）
export const loadFromCloud = async (userId: string) => {
    if (!db) throw new Error('Firebase not initialized');
    
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    
    if (snap.exists()) {
        return snap.data() as {
            students: Student[];
            submissionLists: SubmissionList[];
            gradingLists: GradingList[];
            settings: AppSettings;
            updatedAt: string;
        };
    } else {
        return null;
    }
};
