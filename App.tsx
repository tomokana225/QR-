
import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import RosterManager from './src/components/RosterManager';
import QRGenerator from './src/components/QRGenerator';
import SubmissionChecker from './src/components/SubmissionChecker';
import GradingScanner from './src/components/GradingScanner';
import SettingsPage from './src/components/SettingsPage';
import Dashboard from './src/components/Dashboard';
import StudentReportModal from './src/components/StudentReportModal';
import CreateListModal from './src/components/CreateListModal';
import ConfirmationModal from './src/components/ConfirmationModal';
import { Student, SubmissionList, GradingList, AppSettings, SOUNDS } from './types';
import { ChartBarIcon, UsersIcon, QrCodeIcon, CameraIcon, PencilSquareIcon, Cog6ToothIcon } from './src/components/Icons';

// Helper to generate a random alphanumeric code for students.
const generateRandomCode = (length = 8) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

type MainMode = 'dashboard' | 'roster' | 'qr' | 'submission' | 'grading' | 'settings';

/**
 * Main Application Component for the student management system.
 * Fixes Error: Type '() => void' is not assignable to type 'FC<{}>' by ensuring a valid return.
 */
const App: React.FC = () => {
    const [mainMode, setMainMode] = useState<MainMode>('dashboard');
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
    
    // Submission Check state
    const [submissionLists, setSubmissionLists] = useState<SubmissionList[]>([]);
    const [activeSubmissionListId, setActiveSubmissionListId] = useState<string | null>(null);
    const [isCreateSubmissionListModalOpen, setIsCreateSubmissionListModalOpen] = useState(false);

    // Grading Mode state
    const [gradingLists, setGradingLists] = useState<GradingList[]>([]);
    const [activeGradingListId, setActiveGradingListId] = useState<string | null>(null);
    const [isCreateGradingListModalOpen, setIsCreateGradingListModalOpen] = useState(false);
    
    // Report Modal state
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);

    // Settings state
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

    const audioRef = useRef<HTMLAudioElement | null>(null);

    // --- Data Persistence ---
    useEffect(() => {
        try {
            const savedStudents = localStorage.getItem('students');
            if (savedStudents) setStudents(JSON.parse(savedStudents));

            const savedSubmissionLists = localStorage.getItem('submissionLists');
            if (savedSubmissionLists) {
                const lists: SubmissionList[] = JSON.parse(savedSubmissionLists);
                setSubmissionLists(lists);
                if (lists.length > 0) {
                    setActiveSubmissionListId([...lists].sort((a, b) => b.createdAt - a.createdAt)[0].id);
                }
            }

            const savedGradingLists = localStorage.getItem('gradingLists');
            if(savedGradingLists) {
                const lists: GradingList[] = JSON.parse(savedGradingLists);
                setGradingLists(lists);
                if(lists.length > 0) {
                    setActiveGradingListId([...lists].sort((a, b) => b.createdAt - a.createdAt)[0].id);
                }
            }
            
            const savedSettings = localStorage.getItem('appSettings');
            if (savedSettings) {
                const parsedSettings = JSON.parse(savedSettings);
                setSettings(prev => ({...prev, ...parsedSettings}));
                if (parsedSettings.lastSyncTimestamp) {
                    setSyncStatus(`最終同期: ${new Date(parsedSettings.lastSyncTimestamp).toLocaleString()}`);
                }
            }

        } catch (error) {
            console.error("Failed to load data from localStorage", error);
        }
    }, []);

    useEffect(() => { localStorage.setItem('students', JSON.stringify(students)); }, [students]);
    useEffect(() => { localStorage.setItem('submissionLists', JSON.stringify(submissionLists)); }, [submissionLists]);
    useEffect(() => { localStorage.setItem('gradingLists', JSON.stringify(gradingLists)); }, [gradingLists]);
    useEffect(() => { localStorage.setItem('appSettings', JSON.stringify(settings)); }, [settings]);

    // Initialize audio
    useEffect(() => {
        audioRef.current = new Audio();
    }, []);

    // Update audio settings when they change
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        
        if (settings.soundEffect === 'custom' && settings.customSound) {
            audio.src = settings.customSound;
        } else if (settings.soundEffect !== 'none' && settings.soundEffect !== 'custom') {
            audio.src = SOUNDS[settings.soundEffect];
        }
        audio.volume = settings.volume;
    }, [settings.volume, settings.soundEffect, settings.customSound]);

    const playSuccessSound = useCallback(() => {
        if (settings.playSound && settings.soundEffect !== 'none' && audioRef.current) {
            const audio = audioRef.current;
            audio.currentTime = 0;
            audio.play().catch(e => console.error("Error playing sound:", e));
        }
    }, [settings.playSound, settings.soundEffect]);

    const handleSettingsChange = (newSettings: Partial<AppSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    // --- Student Handlers ---
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
        // Also remove from submission and grading lists
        setSubmissionLists(prev => prev.map(list => ({ ...list, submissions: list.submissions.filter(sub => sub.studentId !== id) })));
        setGradingLists(prev => prev.map(list => {
            const newScores = {...list.scores};
            delete newScores[id];
            return {...list, scores: newScores};
        }));
    };

    const handleDeleteSelectedStudents = () => {
        if (selectedStudentIds.size === 0) return;
        setConfirmation({
            title: '選択した生徒の削除',
            message: `${selectedStudentIds.size}人の生徒を名簿から削除しますか？この操作は関連するすべての記録も削除し、元に戻すことはできません。`,
            onConfirm: () => {
                const idSet = selectedStudentIds;
                setStudents(prev => prev.filter(student => !idSet.has(student.id)));
                setSubmissionLists(prev => prev.map(list => ({ ...list, submissions: list.submissions.filter(sub => !idSet.has(sub.studentId)) })));
                setGradingLists(prev => prev.map(list => {
                    const newScores = {...list.scores};
                    idSet.forEach(id => delete newScores[id]);
                    return {...list, scores: newScores};
                }));
                setSelectedStudentIds(new Set());
                setConfirmation(null);
            },
        });
    };
    
    // --- Submission List Handlers ---
    const handleSetSubmission = useCallback((studentId: string, timestamp: number | null) => {
        setActiveSubmissionListId(activeId => {
            if (!activeId) return null;
            setSubmissionLists(prevLists => prevLists.map(list => {
                if (list.id === activeId) {
                    const newSubmissions = list.submissions.filter(s => s.studentId !== studentId);
                    if (timestamp !== null) newSubmissions.push({ studentId, timestamp });
                    return { ...list, submissions: newSubmissions };
                }
                return list;
            }));
            return activeId;
        });
    }, []);

    const handleCreateSubmissionList = (name: string) => {
        if (!name.trim()) return;
        const newList: SubmissionList = { id: crypto.randomUUID(), name: name.trim(), createdAt: Date.now(), submissions: [] };
        setSubmissionLists(prev => [...prev, newList]);
        setActiveSubmissionListId(newList.id);
        setIsCreateSubmissionListModalOpen(false);
    };
    
    const handleDeleteSubmissionList = (listId: string) => {
        const listToDelete = submissionLists.find(l => l.id === listId);
        if (!listToDelete) return;
        setConfirmation({
            title: '提出リストの削除',
            message: `「${listToDelete.name}」を削除しますか？この操作は元に戻せません。`,
            onConfirm: () => {
                const remaining = submissionLists.filter(list => list.id !== listId);
                setSubmissionLists(remaining);
                if (activeSubmissionListId === listId) {
                    setActiveSubmissionListId(remaining.length > 0 ? [...remaining].sort((a,b) => b.createdAt - a.createdAt)[0].id : null);
                }
                setConfirmation(null);
            }
        });
    };

    const handleResetSubmissionList = () => {
        if (!activeSubmissionListId) return;
        const activeList = submissionLists.find(l => l.id === activeSubmissionListId);
        if (!activeList) return;
        setConfirmation({
            title: '提出状況のリセット',
            message: `「${activeList.name}」のすべての提出状況をリセットしますか？`,
            onConfirm: () => {
                setSubmissionLists(prev => prev.map(list => list.id === activeSubmissionListId ? { ...list, submissions: [] } : list));
                setConfirmation(null);
            }
        });
    };

    // --- Grading List Handlers ---
    const handleCreateGradingList = (name: string) => {
        if (!name.trim()) return;
        const newList: GradingList = { id: crypto.randomUUID(), name: name.trim(), createdAt: Date.now(), possibleScores: [], scores: {} };
        setGradingLists(prev => [...prev, newList]);
        setActiveGradingListId(newList.id);
        setIsCreateGradingListModalOpen(false);
    }

    const handleDeleteGradingList = (listId: string) => {
        const listToDelete = gradingLists.find(l => l.id === listId);
        if (!listToDelete) return;
        setConfirmation({
            title: '採点リストの削除',
            message: `「${listToDelete.name}」を削除しますか？この操作は元に戻せません。`,
            onConfirm: () => {
                const remaining = gradingLists.filter(list => list.id !== listId);
                setGradingLists(remaining);
                if(activeGradingListId === listId) {
                    setActiveGradingListId(remaining.length > 0 ? [...remaining].sort((a,b) => b.createdAt - a.createdAt)[0].id : null);
                }
                setConfirmation(null);
            }
        });
    }

    const handleSetScore = useCallback((listId: string, studentId: string, score: string) => {
        setGradingLists(prevLists =>
            prevLists.map(list => {
                if (list.id === listId) {
                    const newScores = { ...list.scores };
                    if (score === '') {
                        delete newScores[studentId];
                    } else {
                        newScores[studentId] = score;
                    }
                    return { ...list, scores: newScores };
                }
                return list;
            })
        );
    }, []);

    const handleUpdateGradingListDetails = (listId: string, updates: Partial<GradingList>) => {
        setGradingLists(prev => prev.map(list => list.id === listId ? { ...list, ...updates } : list));
    };

    // --- Report Handlers ---
    const handleGenerateReport = (studentId: string) => {
        const student = students.find(s => s.id === studentId);
        if (student) {
            setSelectedStudentForReport(student);
            setIsReportModalOpen(true);
        }
    };

    // --- Data Import/Export ---
    const handleExportData = () => {
        try {
            const dataToExport = {
                students,
                submissionLists,
                gradingLists,
                settings,
            };
            const jsonString = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `qr-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to export data", error);
            alert("データのエクスポートに失敗しました。");
        }
    };
    
    const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("File could not be read");
                const importedData = JSON.parse(text);

                // Basic validation
                if (!importedData.students || !importedData.submissionLists || !importedData.gradingLists || !importedData.settings) {
                    throw new Error("無効なファイル形式です。");
                }
                
                setConfirmation({
                    title: 'データのインポート',
                    message: 'ファイルをインポートすると、現在のすべてのデータが上書きされます。本当によろしいですか？',
                    confirmButtonText: 'インポート実行',
                    confirmButtonClass: 'bg-indigo-600 hover:bg-indigo-700',
                    onConfirm: () => {
                        const defaultSettings: AppSettings = {
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
                        };

                        setStudents(importedData.students || []);
                        setSubmissionLists(importedData.submissionLists || []);
                        setGradingLists(importedData.gradingLists || []);
                        setSettings({ ...defaultSettings, ...(importedData.settings || {}) });
                        
                        // Reset active lists to avoid dangling IDs
                        const sortedSubLists = [...(importedData.submissionLists || [])].sort((a,b) => b.createdAt - a.createdAt);
                        setActiveSubmissionListId(sortedSubLists.length > 0 ? sortedSubLists[0].id : null);
                        const sortedGradeLists = [...(importedData.gradingLists || [])].sort((a,b) => b.createdAt - a.createdAt);
                        setActiveGradingListId(sortedGradeLists.length > 0 ? sortedGradeLists[0].id : null);

                        alert("データのインポートが完了しました。");
                        setConfirmation(null);
                    },
                });

            } catch (error) {
                console.error("Failed to import data", error);
                alert(`データのインポートに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
            } finally {
                // Reset file input value to allow re-uploading the same file
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

     // --- Cloud Sync Handlers ---
    const handleCloudUpload = async () => {
        if (!settings.syncId) {
            alert("同期ID (Bin ID) が設定されていません。");
            return;
        }
        setSyncStatus('アップロード中...');
        try {
            const dataToUpload = {
                students,
                submissionLists,
                gradingLists,
            };

            const response = await fetch(`https://api.jsonbin.io/v3/b/${settings.syncId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': settings.syncApiKey,
                    'X-Bin-Name': `QR-Manager-Backup-${settings.syncId}`
                },
                body: JSON.stringify(dataToUpload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTPエラー: ${response.status}`);
            }

            const newTimestamp = Date.now();
            handleSettingsChange({ lastSyncTimestamp: newTimestamp });
            setSyncStatus(`最終同期 (アップロード): ${new Date(newTimestamp).toLocaleString()}`);
            alert("クラウドへのアップロードが成功しました。");

        } catch (error) {
            console.error("Failed to upload data", error);
            const errorMessage = error instanceof Error ? error.message : '不明なエラー';
            setSyncStatus(`エラー: ${errorMessage}`);
            alert(`アップロードに失敗しました: ${errorMessage}`);
        }
    };
    
    const handleCloudDownload = async () => {
        if (!settings.syncId) {
            alert("同期ID (Bin ID) が設定されていません。");
            return;
        }

        setSyncStatus('ダウンロード中...');
        try {
            const response = await fetch(`https://api.jsonbin.io/v3/b/${settings.syncId}/latest`, {
                method: 'GET',
                headers: {
                    'X-Master-Key': settings.syncApiKey,
                },
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error("指定された同期IDのデータが見つかりませんでした。");
                }
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTPエラー: ${response.status}`);
            }

            const downloadedData = await response.json();

            // Validate downloaded data
            const data = downloadedData.record;
            if (!data || !Array.isArray(data.students) || !Array.isArray(data.submissionLists) || !Array.isArray(data.gradingLists)) {
                throw new Error("クラウドから取得したデータの形式が無効です。");
            }
            
            setConfirmation({
                title: 'クラウドからデータをダウンロード',
                message: 'クラウドからデータをダウンロードすると、現在のローカルデータがすべて上書きされます。本当によろしいですか？',
                confirmButtonText: 'ダウンロード実行',
                onConfirm: () => {
                    setStudents(data.students);
                    setSubmissionLists(data.submissionLists);
                    setGradingLists(data.gradingLists);

                    const sortedSubLists = [...(data.submissionLists)].sort((a,b) => b.createdAt - a.createdAt);
                    setActiveSubmissionListId(sortedSubLists.length > 0 ? sortedSubLists[0].id : null);
                    const sortedGradeLists = [...(data.gradingLists)].sort((a,b) => b.createdAt - a.createdAt);
                    setActiveGradingListId(sortedGradeLists.length > 0 ? sortedGradeLists[0].id : null);

                    const newTimestamp = Date.now();
                    handleSettingsChange({ lastSyncTimestamp: newTimestamp });
                    setSyncStatus(`最終同期 (ダウンロード): ${new Date(newTimestamp).toLocaleString()}`);
                    alert("データのダウンロードが完了しました。");
                    setConfirmation(null);
                },
            });

        } catch (error) {
            console.error("Failed to download data", error);
            const errorMessage = error instanceof Error ? error.message : '不明なエラー';
            setSyncStatus(`エラー: ${errorMessage}`);
            alert(`ダウンロードに失敗しました: ${errorMessage}`);
        }
    };

    // --- Demo Data Handlers ---
    // Added to resolve missing prop errors in Dashboard and SettingsPage.
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

    const MainNav: React.FC<{ activeMode: MainMode, onModeChange: (mode: MainMode) => void }> = ({ activeMode, onModeChange }) => {
        const navItems: { mode: MainMode; label: string; icon: React.ReactNode }[] = [
            { mode: 'dashboard', label: 'ダッシュボード', icon: <ChartBarIcon className="w-5 h-5" /> },
            { mode: 'roster', label: '名簿登録', icon: <UsersIcon className="w-5 h-5" /> },
            { mode: 'qr', label: 'QRコード生成', icon: <QrCodeIcon className="w-5 h-5" /> },
            { mode: 'submission', label: '提出チェック', icon: <CameraIcon className="w-5 h-5" /> },
            { mode: 'grading', label: '採点モード', icon: <PencilSquareIcon className="w-5 h-5" /> },
            { mode: 'settings', label: '詳細設定', icon: <Cog6ToothIcon className="w-5 h-5" /> },
        ];
        return (
            <header className="bg-white shadow-sm print:hidden">
                <div className="container mx-auto px-6 py-3">
                    <h1 className="text-xl font-bold text-slate-900">QRコード学生管理システム</h1>
                    <nav className="mt-3 border-b border-gray-200">
                        <div className="-mb-px flex space-x-6" aria-label="Tabs">
                            {navItems.map(item => (
                                <button key={item.mode} onClick={() => onModeChange(item.mode)} className={`${activeMode === item.mode ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}>
                                    {item.icon}
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </nav>
                </div>
            </header>
        );
    };

    return (
        <div className="min-h-screen font-sans text-slate-800">
            <MainNav activeMode={mainMode} onModeChange={setMainMode} />
            <main className="container mx-auto p-6">
                {mainMode === 'dashboard' && (
                    <Dashboard 
                        students={students} 
                        submissionLists={submissionLists} 
                        gradingLists={gradingLists}
                        onGenerateReport={handleGenerateReport}
                        onLoadMockData={handleLoadMockData}
                    />
                )}
                {mainMode === 'roster' && (
                    <RosterManager students={students} selectedStudentIds={selectedStudentIds} setSelectedStudentIds={setSelectedStudentIds} onAddStudent={handleAddStudent} onBulkAddStudents={handleBulkAddStudents} onDeleteStudent={handleDeleteStudent} onDeleteSelectedStudents={handleDeleteSelectedStudents} />
                )}
                {mainMode === 'qr' && <QRGenerator students={students} />}
                {mainMode === 'submission' && (
                    <SubmissionChecker students={students} submissionLists={submissionLists} activeSubmissionListId={activeSubmissionListId} onSetSubmission={handleSetSubmission} onResetCurrentList={handleResetSubmissionList} onCreateSubmissionList={() => setIsCreateSubmissionListModalOpen(true)} onDeleteSubmissionList={handleDeleteSubmissionList} onSetActiveSubmissionListId={setActiveSubmissionListId} settings={settings} onSettingsChange={handleSettingsChange} playSuccessSound={playSuccessSound} audioRef={audioRef} setConfirmation={setConfirmation} />
                )}
                {mainMode === 'grading' && (
                    <GradingScanner students={students} gradingLists={gradingLists} activeGradingListId={activeGradingListId} onSetActiveGradingListId={setActiveGradingListId} onCreateGradingList={() => setIsCreateGradingListModalOpen(true)} onDeleteGradingList={handleDeleteGradingList} onSetScore={handleSetScore} onUpdateListDetails={handleUpdateGradingListDetails} settings={settings} onSettingsChange={handleSettingsChange} playSuccessSound={playSuccessSound} audioRef={audioRef}/>
                )}
                {mainMode === 'settings' && (
                    <SettingsPage 
                        settings={settings} 
                        onSettingsChange={handleSettingsChange} 
                        onExportData={handleExportData} 
                        onImportData={handleImportData}
                        onCloudUpload={handleCloudUpload}
                        onCloudDownload={handleCloudDownload}
                        syncStatus={syncStatus}
                        onLoadMockData={handleLoadMockData}
                    />
                )}
            </main>
            <CreateListModal isOpen={isCreateSubmissionListModalOpen} onClose={() => setIsCreateSubmissionListModalOpen(false)} onCreate={handleCreateSubmissionList} title="新しい提出リストを作成" defaultNamePrefix="提出物" />
            <CreateListModal isOpen={isCreateGradingListModalOpen} onClose={() => setIsCreateGradingListModalOpen(false)} onCreate={handleCreateGradingList} title="新しい採点リストを作成" defaultNamePrefix="採点" />
            
            {confirmation && <ConfirmationModal isOpen={!!confirmation} onClose={() => setConfirmation(null)} onConfirm={confirmation.onConfirm} title={confirmation.title} message={confirmation.message} confirmButtonText={confirmation.confirmButtonText} cancelButtonText={confirmation.cancelButtonText} confirmButtonClass={confirmation.confirmButtonClass} />}

            <StudentReportModal 
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                student={selectedStudentForReport}
                submissionLists={submissionLists}
                gradingLists={gradingLists}
            />
        </div>
    );
};

export default App;
