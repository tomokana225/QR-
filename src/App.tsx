import React, { useState, useEffect, useRef, useCallback } from 'react';
import RosterManager from './components/RosterManager.tsx';
import QRGenerator from './components/QRGenerator.tsx';
import SubmissionChecker from './components/SubmissionChecker.tsx';
import GradingScanner from './components/GradingScanner.tsx';
import SettingsPage from './components/SettingsPage.tsx';
import Dashboard from './components/Dashboard.tsx';
import StudentReportModal from './components/StudentReportModal.tsx';
import CreateListModal from './components/CreateListModal.tsx';
import ConfirmationModal from './components/ConfirmationModal.tsx';
import { Student, SubmissionList, GradingList, AppSettings, SOUNDS } from './types.ts';
import { ChartBarIcon, UsersIcon, QrCodeIcon, CameraIcon, PencilSquareIcon, Cog6ToothIcon } from './components/Icons.tsx';

const generateRandomCode = (length = 8) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

type MainMode = 'dashboard' | 'roster' | 'qr' | 'submission' | 'grading' | 'settings';

const App: React.FC = () => {
    const [mainMode, setMainMode] = useState<MainMode>('dashboard');
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
        syncApiKey: '',
        syncId: '',
        lastSyncTimestamp: null,
    });

    const [confirmation, setConfirmation] = useState<{ title: string; message: string; onConfirm: () => void; confirmButtonText?: string; cancelButtonText?: string; confirmButtonClass?: string; } | null>(null);
    const [syncStatus, setSyncStatus] = useState<string>('未同期');

    const audioRef = useRef<HTMLAudioElement>(new Audio(SOUNDS.ping));

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
                setSettings(prev => ({...prev, ...parsedSettings}));
                if (parsedSettings.lastSyncTimestamp) setSyncStatus(`最終同期: ${new Date(parsedSettings.lastSyncTimestamp).toLocaleString()}`);
            }
        } catch (error) { console.error(error); }
    }, []);

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

    const handleAddStudent = (studentData: Omit<Student, 'id' | 'randomCode'>) => {
        const newStudent: Student = { ...studentData, id: crypto.randomUUID(), randomCode: generateRandomCode() };
        setStudents(prev => [...prev, newStudent]);
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

        const mockSubList: SubmissionList = {
            id: crypto.randomUUID(),
            name: "週報提出(4/1)",
            createdAt: Date.now(),
            submissions: newMockStudents.slice(0, 12).map(s => ({
                studentId: s.id,
                timestamp: Date.now() - Math.random() * 1000000
            }))
        };

        setSubmissionLists(prev => [...prev, mockSubList]);
        setActiveSubmissionListId(mockSubList.id);

        const mockGradingList: GradingList = {
            id: crypto.randomUUID(),
            name: "中間試験(英単語)",
            createdAt: Date.now(),
            possibleScores: ["A", "B", "C", "D"],
            scores: newMockStudents.reduce((acc, s, i) => {
                if (i % 2 === 0) acc[s.id] = ["A", "B", "C"][Math.floor(Math.random() * 3)];
                return acc;
            }, {} as Record<string, string>)
        };

        setGradingLists(prev => [...prev, mockGradingList]);
        setActiveGradingListId(mockGradingList.id);

        alert("デモデータをロードしました。");
        setMainMode('dashboard');
    };

    const navItems: { mode: MainMode; label: string; icon: React.ReactNode }[] = [
        { mode: 'dashboard', label: 'ダッシュボード', icon: <ChartBarIcon className="w-5 h-5" /> },
        { mode: 'roster', label: '名簿管理', icon: <UsersIcon className="w-5 h-5" /> },
        { mode: 'qr', label: 'QR生成・印刷', icon: <QrCodeIcon className="w-5 h-5" /> },
        { mode: 'submission', label: '提出スキャン', icon: <CameraIcon className="w-5 h-5" /> },
        { mode: 'grading', label: '採点スキャン', icon: <PencilSquareIcon className="w-5 h-5" /> },
        { mode: 'settings', label: '設定', icon: <Cog6ToothIcon className="w-5 h-5" /> },
    ];

    return (
        <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
            {/* サイドナビゲーション */}
            <aside className="w-64 bg-slate-900 flex-shrink-0 flex flex-col print:hidden shadow-2xl z-20">
                <div className="p-8">
                    <h1 className="text-white text-2xl font-black tracking-tighter flex items-center gap-2">
                        <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-500/30">
                            <QrCodeIcon className="w-6 h-6" />
                        </div>
                        QR Manager
                    </h1>
                    <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.2em] mt-3">Professional Edition</p>
                </div>
                
                <nav className="flex-grow px-4 space-y-1.5 overflow-y-auto">
                    {navItems.map(item => (
                        <button
                            key={item.mode}
                            onClick={() => setMainMode(item.mode)}
                            className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all duration-300 group ${
                                mainMode === item.mode 
                                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 translate-x-1' 
                                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
                            }`}
                        >
                            <span className={`${mainMode === item.mode ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'} transition-colors`}>
                                {item.icon}
                            </span>
                            <span className="text-sm font-bold tracking-tight">{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="p-6 mt-auto border-t border-slate-800/50">
                    <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/30">
                        <p className="text-slate-500 text-[9px] uppercase font-black tracking-widest mb-2">Sync Status</p>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full animate-pulse ${syncStatus.includes('エラー') ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                            <p className="text-slate-300 text-[11px] font-bold truncate">{syncStatus}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* メインエリア */}
            <main className="flex-grow flex flex-col min-w-0 bg-slate-100 relative overflow-hidden">
                <header className="h-20 bg-transparent flex items-center justify-between px-10 flex-shrink-0 z-10 print:hidden">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                            {navItems.find(i => i.mode === mainMode)?.label}
                        </h2>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Students</span>
                            <span className="text-sm font-black text-indigo-600 bg-white px-4 py-1 rounded-full shadow-sm border border-slate-200/50">{students.length} 名</span>
                        </div>
                    </div>
                </header>

                {/* ホワイトカードコンテナ */}
                <div className="flex-grow overflow-hidden px-10 pb-10">
                    <div className="h-full bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white relative overflow-hidden">
                        <div className="absolute inset-0 p-10 overflow-y-auto scroll-container animate-fade-in">
                            {mainMode === 'dashboard' && <Dashboard students={students} submissionLists={submissionLists} gradingLists={gradingLists} onGenerateReport={(id) => { setSelectedStudentForReport(students.find(s=>s.id===id)!); setIsReportModalOpen(true); }} onLoadMockData={handleLoadMockData} />}
                            {mainMode === 'roster' && <RosterManager students={students} selectedStudentIds={selectedStudentIds} setSelectedStudentIds={setSelectedStudentIds} onAddStudent={handleAddStudent} onBulkAddStudents={handleBulkAddStudents} onDeleteStudent={handleDeleteStudent} onDeleteSelectedStudents={handleDeleteSelectedStudents} />}
                            {mainMode === 'qr' && <QRGenerator students={students} />}
                            {mainMode === 'submission' && <SubmissionChecker students={students} submissionLists={submissionLists} activeSubmissionListId={activeSubmissionListId} onSetSubmission={handleSetSubmission} onResetCurrentList={() => {}} onCreateSubmissionList={() => setIsCreateSubmissionListModalOpen(true)} onDeleteSubmissionList={handleDeleteSubmissionList} onSetActiveSubmissionListId={setActiveSubmissionListId} settings={settings} onSettingsChange={handleSettingsChange} playSuccessSound={playSuccessSound} audioRef={audioRef} setConfirmation={setConfirmation} />}
                            {mainMode === 'grading' && <GradingScanner students={students} gradingLists={gradingLists} activeGradingListId={activeGradingListId} onSetActiveGradingListId={setActiveGradingListId} onCreateGradingList={() => setIsCreateGradingListModalOpen(true)} onDeleteGradingList={() => {}} onSetScore={handleSetScore} onUpdateListDetails={() => {}} settings={settings} onSettingsChange={handleSettingsChange} playSuccessSound={playSuccessSound} audioRef={audioRef}/>}
                            {mainMode === 'settings' && <SettingsPage settings={settings} onSettingsChange={handleSettingsChange} onExportData={() => {}} onImportData={() => {}} onCloudUpload={() => {}} onCloudDownload={() => {}} syncStatus={syncStatus} onLoadMockData={handleLoadMockData} />}
                        </div>
                    </div>
                </div>
            </main>

            <CreateListModal isOpen={isCreateSubmissionListModalOpen} onClose={() => setIsCreateSubmissionListModalOpen(false)} onCreate={handleCreateSubmissionList} title="提出リスト作成" defaultNamePrefix="提出" />
            <ConfirmationModal isOpen={!!confirmation} onClose={() => setConfirmation(null)} onConfirm={confirmation?.onConfirm || (() => {})} title={confirmation?.title || ''} message={confirmation?.message || ''} />
            <StudentReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} student={selectedStudentForReport} submissionLists={submissionLists} gradingLists={gradingLists} />
        </div>
    );
};

export default App;