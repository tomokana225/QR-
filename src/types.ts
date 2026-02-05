export interface Student {
    id: string;
    className: string;
    studentNumber: string;
    name: string;
    randomCode: string;
}

export interface Submission {
    studentId: string;
    timestamp: number;
}

export interface SubmissionList {
    id: string;
    name: string;
    createdAt: number;
    submissions: Submission[];
}

export interface GradingList {
    id: string;
    name: string;
    createdAt: number;
    possibleScores: string[];
    scores: Record<string, string>; // studentId -> score
}

export interface LayoutElement {
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
    fontSize?: number;
    textAlign?: 'left' | 'center' | 'right';
}

export interface LayoutSettings {
    columns: number;
    paperSize: 'A4' | 'letter';
    showCuttingLines: boolean;
    cardWidth: number;
    cardHeight: number;
    marginTop: number;
    marginBottom: number;
    marginLeft: number;
    marginRight: number;
    elements: {
        qrCode: LayoutElement;
        name: LayoutElement;
        classInfo: LayoutElement;
        randomCode: LayoutElement;
    };
}

export type SoundEffect = 'ping' | 'chime' | 'click' | 'none';

export interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
}

export interface AppSettings {
    volume: number;
    isCameraFlipped: boolean;
    soundEffect: SoundEffect | 'custom';
    scannerBoxSize: number;
    scannerHighRes: boolean;
    customSound: string | null;
    playSound: boolean;
    cameraViewSize: 'small' | 'medium' | 'large';
    cameraZoom: number;
    scanCooldown: number;
    // Firebase Config
    firebaseConfig: FirebaseConfig;
    // Legacy Sync (Optional to keep or remove, keeping for backward compat if needed)
    syncApiKey: string;
    syncId: string;
    lastSyncTimestamp: number | null;
}

export const SOUNDS: Record<Exclude<SoundEffect, 'none'>, string> = {
    ping: `data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU9vT19O/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/t/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/x/zPg==`,
    chime: `data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAESsAAABAAgAZGF0YAgAAAAAAAAAAAA=`,
    click: `data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAESsAAABAAgAZGF0YAgAAAAAAAAAAAA=`
};