
import React, { useState, useEffect, useRef, useCallback } from 'react';
import RosterManager from './components/RosterManager';
import QRGenerator from './components/QRGenerator';
import SubmissionChecker from './components/SubmissionChecker';
import GradingScanner from './components/GradingScanner';
import SettingsPage from './components/SettingsPage';
import Dashboard from './components/Dashboard';
import StudentReportModal from './components/StudentReportModal';
import CreateListModal from './components/CreateListModal';
import ConfirmationModal from './components/ConfirmationModal';
import LoginPage from './components/LoginPage'; // Import Login Page
import { Student, SubmissionList, GradingList, AppSettings, SOUNDS, FirebaseConfig } from './types';
import { ChartBarIcon, UsersIcon, QrCodeIcon, CameraIcon, PencilSquareIcon, Cog6ToothIcon, Bars3Icon } from './components/Icons';
import { initFirebase, saveToCloud, loadFromCloud, getFirebaseAuth } from './utils/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

// Declare process.env for TypeScript
declare const process: {
  env: {
    [key: string]: string | undefined;
  }
};

// Declare window extension for injected config
declare global {
  interface Window {
    FIREBASE_ENV?: FirebaseConfig;
  }
}

const generateRandomCode = (length = 8) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

type MainMode = 'login' | 'dashboard' | 'roster' | 'qr' | 'submission' | 'grading' | 'settings';

const App: React.FC = () => {
    // ログインを初期状態の可能性として追加
    const [mainMode, setMainMode] = useState<MainMode>('login'); 
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
    
    const [submissionLists, setSubmissionLists] = useState<SubmissionList[]>([]);
    const [activeSubmissionListId, setActiveSubmissionListId] = useState<string | null>(null);
    const [isCreateSubmissionListModalOpen, setIsCreateSubmissionListModalOpen] = useState(false);

    const [gradingLists, setGradingLists] = useState<GradingList[]>([]);
    const [activeGradingListId, setActiveGradingListId] = useState<string | null>(null);
    const [isCreateGradingListModalOpen, setIsCreateGradingListModalOpen] = useState(false);
    
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);

    // サイドバーの開閉状態（デスクトップ用）
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    // モバイル用メニューの開閉状態
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    
    // アプリ初期化状態
    const [isAppInitializing, setIsAppInitializing] = useState(true);
    const [isFirebaseReady, setIsFirebaseReady] = useState(false);

    // デフォルトのFirebase設定（注入された環境変数 > ビルド時環境変数）
    const defaultFirebaseConfig: FirebaseConfig = window.FIREBASE_ENV || {
        apiKey: process.env.FIREBASE_API_KEY || '',
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
        projectId: process.env.FIREBASE_PROJECT_ID || '',
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
        appId: process.env.FIREBASE_APP_ID || ''
    };

    const [settings, setSettings] = useState<AppSettings>({ 
        volume: 1, 
        isCameraFlipped: false, 
        soundEffect: 'ping',
        scannerBoxSize: 150,
        scannerHighRes: false,
        customSound: null,
        playSound: true,
        cameraViewSize: 'medium',
        cameraZoom: 1,
        scanCooldown: 1000,
        firebaseConfig: defaultFirebaseConfig,
        syncApiKey: '',
        syncId: '',
        lastSyncTimestamp: null,
    });

    const [confirmation, setConfirmation] = useState<{ title: string; message: string; onConfirm: () => void; confirmButtonText?: string; cancelButtonText?: string; confirmButtonClass?: string; } | null>(null);
    const [syncStatus, setSyncStatus] = useState<string>('未同期');
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

    const audioRef = useRef<HTMLAudioElement>(new Audio(SOUNDS.ping));
    // 自動保存のためのRef（最新のStateを保持）
    const stateRef = useRef({ students, submissionLists, gradingLists, settings });
    useEffect(() => { stateRef.current = { students, submissionLists, gradingLists, settings }; }, [students, submissionLists, gradingLists, settings]);

    // 画面サイズ変更時にサイドバーの状態を調整
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setMobileMenuOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize(); // 初期実行
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 初期データ読み込み (LocalStorage)
    useEffect(() => {
        try {
            const savedStudents = localStorage.getItem('students');
            if (savedStudents) setStudents(JSON.parse(savedStudents));
            const savedSubmissionLists = localStorage.getItem('submissionLists');
            if (savedSubmissionLists) {
                const lists: SubmissionList[] = JSON.parse(savedSubmissionLists);
                setSubmissionLists(lists);
                if (lists.length > 0) setActiveSubmissionListId([...lists].sort((a, b) => b.createdAt - a.createdAt)[0].id);
            }
            const savedGradingLists = localStorage.getItem('gradingLists');
            if(savedGradingLists) {
                const lists: GradingList[] = JSON.parse(savedGradingLists);
                setGradingLists(lists);
                if(lists.length > 0) setActiveGradingListId([...lists].sort((a, b) => b.createdAt - a.createdAt)[0].id);
            }
            const savedSettings = localStorage.getItem('appSettings');
            if (savedSettings) {
                const parsedSettings = JSON.parse(savedSettings);
                const mergedSettings = { ...settings, ...parsedSettings };
                // APIキーがない場合のみデフォルトを適用
                if (!mergedSettings.firebaseConfig.apiKey && defaultFirebaseConfig.apiKey) {
                    mergedSettings.firebaseConfig = defaultFirebaseConfig;
                }
                setSettings(mergedSettings);
                if (parsedSettings.lastSyncTimestamp) setSyncStatus(`最終同期: ${new Date(parsedSettings.lastSyncTimestamp).toLocaleString()}`);
            }
        } catch (error) { console.error(error); }
    }, []);

    // Firebase初期化とAuth監視 & クラウドデータロード
    useEffect(() => {
        let unsubscribe: () => void;
        
        // タイムアウト設定: 5秒経っても初期化が終わらなければ強制的にログイン画面へ
        const timeoutId = setTimeout(() => {
            if (isAppInitializing) {
                console.warn("Firebase initialization timed out.");
                setSyncStatus('接続タイムアウト');
                setIsAppInitializing(false);
                setIsFirebaseReady(false);
            }
        }, 5000);

        const fb = initFirebase(settings.firebaseConfig);
        
        if (fb && fb.auth) {
            setIsFirebaseReady(true);
            unsubscribe = onAuthStateChanged(fb.auth, async (user) => {
                clearTimeout(timeoutId); // 接続成功したらタイムアウト解除
                setFirebaseUser(user);
                if (user) {
                    setSyncStatus('データ取得中...');
                    try {
                        // ログイン成功時、クラウドからデータをロード
                        const cloudData = await loadFromCloud(user.uid);
                        if (cloudData) {
                            setStudents(cloudData.students || []);
                            setSubmissionLists(cloudData.submissionLists || []);
                            setGradingLists(cloudData.gradingLists || []);
                            // 設定はクラウドにあるものを優先するが、現在のConfig情報は維持したい場合もある
                            if (cloudData.settings) {
                                setSettings(prev => ({
                                    ...prev,
                                    ...cloudData.settings,
                                    firebaseConfig: prev.firebaseConfig.apiKey ? prev.firebaseConfig : cloudData.settings.firebaseConfig
                                }));
                            }
                            const now = Date.now();
                            setSyncStatus('同期完了: ' + new Date(now).toLocaleTimeString());
                        } else {
                            setSyncStatus('クラウドデータなし (新規)');
                        }
                        setMainMode('dashboard');
                    } catch (e) {
                        console.error("Load failed", e);
                        setSyncStatus('読み込みエラー');
                        // エラーでもログイン状態ならダッシュボードへ（オフライン動作など考慮）
                        setMainMode('dashboard');
                    }
                } else {
                    setSyncStatus('未ログイン');
                    setMainMode('login');
                }
                setIsAppInitializing(false);
            });
        } else {
            // Firebase設定がない場合などはとりあえずログイン画面へ
            clearTimeout(timeoutId);
            setSyncStatus('APIキー未設定');
            setIsAppInitializing(false);
            setIsFirebaseReady(false);
        }

        return () => {
            clearTimeout(timeoutId);
            if (unsubscribe) unsubscribe();
        };
    }, [settings.firebaseConfig.apiKey]); // apiKeyがロードされたら実行

    // 自動保存ロジック (Debounce)
    useEffect(() => {
        if (!firebaseUser || isAppInitializing || mainMode === 'login') return;

        const timer = setTimeout(async () => {
            try {
                setSyncStatus('保存中...');
                await saveToCloud(firebaseUser.uid, stateRef.current);
                const now = Date.now();
                setSettings(prev => ({ ...prev, lastSyncTimestamp: now }));
                setSyncStatus('同期完了: ' + new Date(now).toLocaleTimeString());
            } catch (e) {
                console.error("Auto save failed", e);
                setSyncStatus('保存エラー');
            }
        }, 3000); // 3秒間変更がなければ保存

        return () => clearTimeout(timer);
    }, [students, submissionLists, gradingLists, settings, firebaseUser, isAppInitializing, mainMode]);

    // LocalStorageへは即時保存（既存機能）
    useEffect(() => { localStorage.setItem('students', JSON.stringify(students)); }, [students]);
    useEffect(() => { localStorage.setItem('submissionLists', JSON.stringify(submissionLists)); }, [submissionLists]);
    useEffect(() => { localStorage.setItem('gradingLists', JSON.stringify(gradingLists)); }, [gradingLists]);
    useEffect(() => { localStorage.setItem('appSettings', JSON.stringify(settings)); }, [settings]);

    useEffect(() => {
        const audio = audioRef.current;
        if (settings.soundEffect === 'custom' && settings.customSound) {
            audio.src = settings.customSound;
        } else if (settings.soundEffect !== 'none' && settings.soundEffect !== 'custom') {
            audio.src = SOUNDS[settings.soundEffect];
        }
        audio.volume = settings.volume;
    }, [settings.volume, settings.soundEffect, settings.customSound]);

    const playSuccessSound = useCallback(() => {
        if (settings.playSound && settings.soundEffect !== 'none') {
            const audio = audioRef.current;
            audio.currentTime = 0;
            audio.play().catch(e => console.error("Error playing sound:", e));
        }
    }, [settings.playSound, settings.soundEffect]);

    const handleSettingsChange = (newSettings: Partial<AppSettings>) => setSettings(prev => ({ ...prev, ...newSettings }));

    const handleAddStudent = (studentData: { className: string; studentNumber: string; name: string; randomCode?: string }) => {
        const newStudent: Student = { 
            ...studentData, 
            id: crypto.randomUUID(), 
            randomCode: studentData.randomCode || generateRandomCode() 
        };
        setStudents(prev => [...prev, newStudent]);
    };

    const handleUpdateStudent = (updatedStudent: Student) => {
        setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    };

    const handleBulkAddStudents = (newStudentsData: Omit<Student, 'id' | 'randomCode'>[]) => {
        const newStudents: Student[] = newStudentsData.map(s => ({ ...s, id: crypto.randomUUID(), randomCode: generateRandomCode() }));
        setStudents(prev => [...prev, ...newStudents]);
        return newStudents.length;
    };
    
    const handleDeleteStudent = (id: string) => {
        setStudents(prev => prev.filter(student => student.id !== id));
    };

    const handleDeleteSelectedStudents = () => {
        if (selectedStudentIds.size === 0) return;
        setConfirmation({
            title: '選択した生徒の削除',
            message: `${selectedStudentIds.size}人の生徒を名簿から削除しますか？`,
            onConfirm: () => {
                const idSet = selectedStudentIds;
                setStudents(prev => prev.filter(student => !idSet.has(student.id)));
                setSelectedStudentIds(new Set());
                setConfirmation(null);
            },
        });
    };
    
    const handleSetSubmission = useCallback((studentId: string, timestamp: number | null) => {
        setSubmissionLists(prevLists => prevLists.map(list => {
            if (list.id === activeSubmissionListId) {
                const newSubmissions = list.submissions.filter(s => s.studentId !== studentId);
                if (timestamp !== null) newSubmissions.push({ studentId, timestamp });
                return { ...list, submissions: newSubmissions };
            }
            return list;
        }));
    }, [activeSubmissionListId]);

    const handleCreateSubmissionList = (name: string) => {
        const newList: SubmissionList = { id: crypto.randomUUID(), name: name.trim(), createdAt: Date.now(), submissions: [] };
        setSubmissionLists(prev => [...prev, newList]);
        setActiveSubmissionListId(newList.id);
        setIsCreateSubmissionListModalOpen(false);
    };
    
    const handleDeleteSubmissionList = (listId: string) => {
        const remaining = submissionLists.filter(list => list.id !== listId);
        setSubmissionLists(remaining);
        if (activeSubmissionListId === listId) setActiveSubmissionListId(remaining.length > 0 ? [...remaining].sort((a,b) => b.createdAt - a.createdAt)[0].id : null);
    };

    const handleSetScore = useCallback((listId: string, studentId: string, score: string) => {
        setGradingLists(prevLists => prevLists.map(list => {
            if (list.id === listId) {
                const newScores = { ...list.scores };
                if (score === '') delete newScores[studentId];
                else newScores[studentId] = score;
                return { ...list, scores: newScores };
            }
            return list;
        }));
    }, []);

    const handleExportData = () => {
        const data = {
            version: '1.6',
            exportedAt: new Date().toISOString(),
            students,
            submissionLists,
            gradingLists,
            settings: { ...settings, firebaseConfig: { apiKey: '', authDomain: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: '' } } // Configは除外
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `qr_student_manager_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = e.target?.result as string;
                const data = JSON.parse(json);
                
                setConfirmation({
                    title: 'データのインポート',
                    message: '現在のデータを上書きしてインポートしますか？この操作は取り消せません。',
                    confirmButtonText: 'インポート',
                    confirmButtonClass: 'bg-indigo-600 hover:bg-indigo-700',
                    onConfirm: () => {
                        if (Array.isArray(data.students)) setStudents(data.students);
                        if (Array.isArray(data.submissionLists)) setSubmissionLists(data.submissionLists);
                        if (Array.isArray(data.gradingLists)) setGradingLists(data.gradingLists);
                        if (data.settings) {
                            setSettings(prev => ({
                                ...prev,
                                ...data.settings,
                                firebaseConfig: prev.firebaseConfig.apiKey ? prev.firebaseConfig : data.settings.firebaseConfig
                            }));
                        }
                        setConfirmation(null);
                        alert('データをインポートしました。');
                    }
                });
            } catch (error) {
                console.error('Import Failed:', error);
                alert('ファイルの読み込みに失敗しました。形式が正しいか確認してください。');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    // 手動アップロード（設定画面用）
    const handleCloudUpload = async () => {
        if (!firebaseUser) return;
        setConfirmation({
            title: 'クラウドへアップロード',
            message: '現在のデータでクラウド上のデータを上書きします。よろしいですか？',
            confirmButtonText: 'アップロード',
            onConfirm: async () => {
                try {
                    setSyncStatus('アップロード中...');
                    await saveToCloud(firebaseUser.uid, { students, submissionLists, gradingLists, settings });
                    const now = Date.now();
                    setSettings(prev => ({ ...prev, lastSyncTimestamp: now }));
                    setSyncStatus('同期完了: ' + new Date(now).toLocaleString());
                    alert('アップロードが完了しました。');
                } catch (e: any) {
                    setSyncStatus('エラー: アップロード失敗');
                    alert('アップロードに失敗しました: ' + e.message);
                } finally {
                    setConfirmation(null);
                }
            }
        });
    };

    // 手動ダウンロード（設定画面用）
    const handleCloudDownload = async () => {
        if (!firebaseUser) return;
        setConfirmation({
            title: 'クラウドからダウンロード',
            message: 'クラウド上のデータで現在のデータを上書きします。よろしいですか？',
            confirmButtonText: 'ダウンロード',
            confirmButtonClass: 'bg-orange-600 hover:bg-orange-700',
            onConfirm: async () => {
                try {
                    setSyncStatus('ダウンロード中...');
                    const data = await loadFromCloud(firebaseUser.uid);
                    if (data) {
                        setStudents(data.students || []);
                        setSubmissionLists(data.submissionLists || []);
                        setGradingLists(data.gradingLists || []);
                        if (data.settings) setSettings(prev => ({ ...prev, ...data.settings }));
                        const now = Date.now();
                        setSyncStatus('同期完了: ' + new Date(now).toLocaleString());
                        alert('ダウンロードが完了しました。');
                    } else {
                        alert('クラウドにデータが見つかりませんでした。');
                    }
                } catch (e: any) {
                    setSyncStatus('エラー: ダウンロード失敗');
                    alert('ダウンロードに失敗しました: ' + e.message);
                } finally {
                    setConfirmation(null);
                }
            }
        });
    };

    const handleLoadMockData = () => {
        const mockNames = [
            "佐藤 健", "田中 明日香", "鈴木 一郎", "高橋 結衣", "伊藤 淳", 
            "渡辺 麻衣", "山本 裕太", "中村 美紀", "小林 直樹", "加藤 恵",
            "吉田 拓海", "佐々木 希", "松本 潤", "井上 真央", "木村 拓哉",
            "林 遣都", "斎藤 工", "清水 富美加", "山口 百恵", "岡田 准一"
        ];
        
        const newMockStudents: Student[] = mockNames.map((name, i) => ({
            id: crypto.randomUUID(),
            className: i < 8 ? "1-A" : i < 15 ? "1-B" : "2-A",
            studentNumber: ((i % 10) + 1).toString(),
            name,
            randomCode: generateRandomCode()
        }));

        setStudents(prev => [...prev, ...newMockStudents]);
        // Mock data logic simplified for brevity
        alert("デモデータをロードしました。");
        if (mainMode === 'login') setMainMode('dashboard');
    };

    const toggleSidebar = () => {
        if (window.innerWidth < 1024) {
            setMobileMenuOpen(!mobileMenuOpen);
        } else {
            setIsSidebarOpen(!isSidebarOpen);
        }
    };

    const navItems: { mode: MainMode; label: string; icon: React.ReactNode }[] = [
        { mode: 'dashboard', label: 'ダッシュボード', icon: <ChartBarIcon className="w-5 h-5" /> },
        { mode: 'roster', label: '名簿管理', icon: <UsersIcon className="w-5 h-5" /> },
        { mode: 'qr', label: 'QR生成・印刷', icon: <QrCodeIcon className="w-5 h-5" /> },
        { mode: 'submission', label: '提出スキャン', icon: <CameraIcon className="w-5 h-5" /> },
        { mode: 'grading', label: '採点スキャン', icon: <PencilSquareIcon className="w-5 h-5" /> },
        { mode: 'settings', label: '設定', icon: <Cog6ToothIcon className="w-5 h-5" /> },
    ];

    // ローディング中、またはログイン画面の表示
    if (isAppInitializing) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    <p className="text-slate-500 font-bold text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    if (mainMode === 'login') {
        return (
            <LoginPage 
                onLoginSuccess={() => { /* Effect hook will handle transition */ }} 
                onGoToSettings={() => setMainMode('settings')}
                isFirebaseReady={isFirebaseReady}
            />
        );
    }

    return (
        <div className="flex h-screen bg-slate-100 overflow-hidden font-sans relative">
            {/* モバイル用オーバーレイ */}
            <div 
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 lg:hidden ${
                    mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => setMobileMenuOpen(false)}
            />

            {/* サイドナビゲーション */}
            <aside 
                className={`
                    fixed lg:static inset-y-0 left-0 z-50 bg-slate-900 flex-shrink-0 flex flex-col print:hidden shadow-2xl transition-all duration-300 transform
                    ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                    ${isSidebarOpen ? 'lg:w-64' : 'lg:w-0'}
                    w-64 lg:overflow-hidden
                `}
            >
                <div className="flex flex-col h-full w-64 overflow-hidden">
                    <div className="p-8">
                        <h1 className="text-white text-xl font-black tracking-tighter flex items-center gap-2">
                            <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-500/30">
                                <QrCodeIcon className="w-6 h-6" />
                            </div>
                            <span className="whitespace-nowrap">QR学生管理</span>
                        </h1>
                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.2em] mt-3 whitespace-nowrap">Professional Edition</p>
                    </div>
                    
                    <nav className="flex-grow px-4 space-y-1.5 overflow-y-auto">
                        {navItems.map(item => (
                            <button
                                key={item.mode}
                                onClick={() => {
                                    setMainMode(item.mode);
                                    if (window.innerWidth < 1024) setMobileMenuOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all duration-300 group ${
                                    mainMode === item.mode 
                                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 translate-x-1' 
                                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
                                }`}
                            >
                                <span className={`${mainMode === item.mode ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'} transition-colors`}>
                                    {item.icon}
                                </span>
                                <span className="text-sm font-bold tracking-tight whitespace-nowrap">{item.label}</span>
                            </button>
                        ))}
                    </nav>

                    <div className="p-6 mt-auto border-t border-slate-800/50">
                        <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/30">
                            <p className="text-slate-500 text-[9px] uppercase font-black tracking-widest mb-2 whitespace-nowrap">Sync Status</p>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full animate-pulse ${syncStatus.includes('完了') ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                <p className="text-slate-300 text-[10px] font-bold truncate">{syncStatus}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* メインエリア */}
            <main className="flex-grow flex flex-col min-w-0 bg-slate-100 relative overflow-hidden transition-all duration-300">
                <header className="h-16 lg:h-20 bg-transparent flex items-center justify-between px-4 lg:px-10 flex-shrink-0 z-10 print:hidden">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={toggleSidebar}
                            className="p-2 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
                            aria-label="メニューを切り替え"
                        >
                            <Bars3Icon className="w-6 h-6" />
                        </button>
                        <h2 className="text-lg lg:text-2xl font-black text-slate-800 tracking-tight">
                            {navItems.find(i => i.mode === mainMode)?.label}
                        </h2>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest hidden sm:block">Total Students</span>
                            <span className="text-xs lg:text-sm font-black text-indigo-600 bg-white px-3 py-1 lg:px-4 rounded-full shadow-sm border border-slate-200/50">{students.length} 名</span>
                        </div>
                    </div>
                </header>

                <div className="flex-grow overflow-hidden px-2 pb-2 lg:px-10 lg:pb-10">
                    <div className="h-full bg-white rounded-xl lg:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white relative overflow-hidden">
                        <div className="absolute inset-0 p-3 lg:p-10 overflow-y-auto scroll-container animate-fade-in">
                            {mainMode === 'dashboard' && <Dashboard students={students} submissionLists={submissionLists} gradingLists={gradingLists} onGenerateReport={(id) => { setSelectedStudentForReport(students.find(s=>s.id===id)!); setIsReportModalOpen(true); }} onLoadMockData={handleLoadMockData} />}
                            {mainMode === 'roster' && <RosterManager students={students} selectedStudentIds={selectedStudentIds} setSelectedStudentIds={setSelectedStudentIds} onAddStudent={handleAddStudent} onUpdateStudent={handleUpdateStudent} onBulkAddStudents={handleBulkAddStudents} onDeleteStudent={handleDeleteStudent} onDeleteSelectedStudents={handleDeleteSelectedStudents} />}
                            {mainMode === 'qr' && <QRGenerator students={students} />}
                            {mainMode === 'submission' && <SubmissionChecker students={students} submissionLists={submissionLists} activeSubmissionListId={activeSubmissionListId} onSetSubmission={handleSetSubmission} onResetCurrentList={() => {}} onCreateSubmissionList={() => setIsCreateSubmissionListModalOpen(true)} onDeleteSubmissionList={handleDeleteSubmissionList} onSetActiveSubmissionListId={setActiveSubmissionListId} settings={settings} onSettingsChange={handleSettingsChange} playSuccessSound={playSuccessSound} audioRef={audioRef} setConfirmation={setConfirmation} />}
                            {mainMode === 'grading' && <GradingScanner students={students} gradingLists={gradingLists} activeGradingListId={activeGradingListId} onSetActiveGradingListId={setActiveGradingListId} onCreateGradingList={() => setIsCreateGradingListModalOpen(true)} onDeleteGradingList={() => {}} onSetScore={handleSetScore} onUpdateListDetails={() => {}} settings={settings} onSettingsChange={handleSettingsChange} playSuccessSound={playSuccessSound} audioRef={audioRef}/>}
                            {mainMode === 'settings' && <SettingsPage settings={settings} onSettingsChange={handleSettingsChange} onExportData={handleExportData} onImportData={handleImportData} onCloudUpload={handleCloudUpload} onCloudDownload={handleCloudDownload} syncStatus={syncStatus} onLoadMockData={handleLoadMockData} user={firebaseUser} />}
                        </div>
                    </div>
                </div>
            </main>

            <CreateListModal isOpen={isCreateSubmissionListModalOpen} onClose={() => setIsCreateSubmissionListModalOpen(false)} onCreate={handleCreateSubmissionList} title="提出リスト作成" defaultNamePrefix="提出" />
            <ConfirmationModal isOpen={!!confirmation} onClose={() => setConfirmation(null)} onConfirm={confirmation?.onConfirm || (() => {})} title={confirmation?.title || ''} message={confirmation?.message || ''} confirmButtonText={confirmation?.confirmButtonText} cancelButtonText={confirmation?.cancelButtonText} confirmButtonClass={confirmation?.confirmButtonClass} />
            <StudentReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} student={selectedStudentForReport} submissionLists={submissionLists} gradingLists={gradingLists} />
        </div>
    );
};

export default App;
