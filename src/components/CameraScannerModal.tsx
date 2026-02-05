import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { Student, AppSettings, SubmissionList, GradingList } from '../types';
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon } from './Icons';

const CameraScannerModal: React.FC<{
    isOpen: boolean;
    onClose: () => Promise<void>;
    onScanStudent?: (student: Student, isDuplicate?: boolean) => { success: boolean, message: string } | void;
    onScanCode?: (code: string) => void;
    students: Student[];
    settings: AppSettings;
    onSettingsChange: (newSettings: Partial<AppSettings>) => void;
    scannerId: string;
    title: string;
    activeList?: SubmissionList | GradingList | undefined;
}> = ({ isOpen, onClose, onScanStudent, onScanCode, students, settings, onSettingsChange, scannerId, title, activeList }) => {
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
    const lastScanTimeRef = useRef(0);
    const lastScannedCodeRef = useRef<string | null>(null);
    const [zoomCapabilities, setZoomCapabilities] = useState<{ min: number; max: number; step: number; } | null>(null);
    const [currentZoom, setCurrentZoom] = useState(settings.cameraZoom);
    const [scanFeedback, setScanFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);
    // Keep track of recent scans for display
    const [recentScans, setRecentScans] = useState<{name: string, time: string, status: 'success' | 'error'}[]>([]);

    const onScanStudentRef = useRef(onScanStudent);
    useEffect(() => { onScanStudentRef.current = onScanStudent; }, [onScanStudent]);
    
    const onScanCodeRef = useRef(onScanCode);
    useEffect(() => { onScanCodeRef.current = onScanCode; }, [onScanCode]);
    
    const studentsRef = useRef(students);
    useEffect(() => { studentsRef.current = students; }, [students]);
    
    const settingsRef = useRef(settings);
    useEffect(() => { settingsRef.current = settings; }, [settings]);
    
    const activeListRef = useRef(activeList);
    useEffect(() => { activeListRef.current = activeList; }, [activeList]);

    // Reset duplicate check when title changes (e.g., next student in bulk mode)
    useEffect(() => {
        lastScannedCodeRef.current = null;
    }, [title]);

    // Clear recent scans when modal opens
    useEffect(() => {
        if (isOpen) {
            setRecentScans([]);
            setScanFeedback(null);
        }
    }, [isOpen]);

    const handleClose = useCallback(async () => {
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
            try {
                await html5QrCodeRef.current.stop();
            } catch (err) {
                console.error("Scanner failed to stop gracefully.", err);
            }
        }
        onClose();
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }
        
        const html5QrCode = new Html5Qrcode(scannerId, { verbose: false });
        html5QrCodeRef.current = html5QrCode;

        const onScanSuccess = (decodedText: string) => {
            const now = Date.now();
            const cooldown = settingsRef.current.scanCooldown;
            
            if (lastScannedCodeRef.current === decodedText && now - lastScanTimeRef.current < cooldown) {
                return;
            }

            lastScanTimeRef.current = now;
            lastScannedCodeRef.current = decodedText;

            // Rawコードモード（紐付け用）
            if (onScanCodeRef.current) {
                onScanCodeRef.current(decodedText);
                const feedback = { type: 'success' as const, message: 'QRコードを読み取りました' };
                setScanFeedback(feedback);
                // Note: In bulk mode, the parent component might change the 'title' prop quickly after this.
                return;
            }

            // 通常モード（生徒照合）
            if (onScanStudentRef.current) {
                const student = studentsRef.current.find(s => s.randomCode === decodedText);
                if (student) {
                    const list = activeListRef.current;
                    let isDuplicate = false;
                    if(list && 'submissions' in list) { // SubmissionList
                        isDuplicate = list.submissions.some(s => s.studentId === student.id);
                    }
                    
                    const result = onScanStudentRef.current(student, isDuplicate);
                    
                    const timeStr = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    
                    if (result && result.message) {
                        setScanFeedback(result.success ? { type: 'success', message: result.message } : { type: 'error', message: result.message });
                        setRecentScans(prev => [{ name: student.name, time: timeStr, status: (result.success ? 'success' : 'error') as 'success' | 'error' }, ...prev].slice(0, 5));
                    } else {
                        setScanFeedback({ type: 'success', message: `${student.name}さんの情報を読み込みました` });
                        setRecentScans(prev => [{ name: student.name, time: timeStr, status: 'success' as const }, ...prev].slice(0, 5));
                    }

                } else {
                    setScanFeedback({ type: 'error', message: '未登録のQRコードです' });
                }
            }
        };

        const config = { 
            fps: 10, 
            qrbox: { width: settings.scannerBoxSize, height: settings.scannerBoxSize },
            aspectRatio: settings.scannerHighRes ? 1.0 : undefined,
        };
        
        const startScanner = (cameraConfig: any) => {
            return html5QrCode.start(
                cameraConfig,
                config,
                onScanSuccess,
                (errorMessage) => {}
            ).then(() => {
                const videoElement = document.getElementById(scannerId)?.querySelector('video');
                if(videoElement) {
                    // Mobile: Ensure video covers the square container properly
                    videoElement.style.objectFit = 'cover';
                    
                    try {
                        const track = (videoElement.srcObject as MediaStream)?.getVideoTracks()[0];
                        if (track && 'getCapabilities' in track) {
                            const capabilities = track.getCapabilities() as any;
                            if (capabilities.zoom) {
                                setZoomCapabilities({
                                    min: capabilities.zoom.min,
                                    max: capabilities.zoom.max,
                                    step: capabilities.zoom.step,
                                });
                                track.applyConstraints({ advanced: [{ zoom: settingsRef.current.cameraZoom }] as any });
                            }
                        }
                    } catch(e) {
                        console.error("Could not get zoom capabilities", e);
                    }
                }
            });
        };

        if (html5QrCode.getState() !== Html5QrcodeScannerState.SCANNING) {
            startScanner({ facingMode: "environment" }).catch(err => {
                startScanner({ facingMode: "user" }).catch(fallbackErr => {
                    console.error("Failed to start scanner", fallbackErr);
                    let errorMessage = 'カメラを起動できませんでした。';
                    const errStr = String(fallbackErr);
                    if (errStr.includes('NotAllowedError')) {
                        errorMessage = 'カメラの使用が許可されていません。設定を確認してください。';
                    } else if (errStr.includes('NotFoundError')) {
                        errorMessage = '利用可能なカメラが見つかりませんでした。';
                    }
                    setScanFeedback({ type: 'error', message: errorMessage });
                });
            });
        }
        
        return () => {
            if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
                html5QrCodeRef.current.stop().catch(e => console.error("Cleanup stop failed", e));
            }
        };

    }, [isOpen, scannerId, settings.scannerBoxSize, settings.scannerHighRes]);


    const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newZoom = parseFloat(e.target.value);
        setCurrentZoom(newZoom);
        onSettingsChange({ cameraZoom: newZoom });
        const videoElement = document.getElementById(scannerId)?.querySelector('video');
        if (videoElement) {
            try {
                const track = (videoElement.srcObject as MediaStream)?.getVideoTracks()[0];
                if (track && 'applyConstraints' in track) {
                    track.applyConstraints({ advanced: [{ zoom: newZoom }] as any });
                }
            } catch (e) {
                console.error("Zoom failed", e);
            }
        }
    };
    
    if (!isOpen) return null;

    const modalSizeClasses = {
        small: 'max-w-md',
        medium: 'max-w-xl',
        large: 'max-w-3xl',
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-0 md:p-4" onClick={handleClose}>
            <div 
                className={`bg-slate-900 w-full h-full md:h-auto md:bg-white md:rounded-2xl shadow-xl flex flex-col overflow-hidden relative ${modalSizeClasses[settings.cameraViewSize]}`} 
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-slate-700 md:border-slate-100 flex justify-between items-center bg-slate-900 md:bg-white z-10 text-white md:text-slate-800 flex-shrink-0">
                    <h2 className="text-lg font-bold">{title}</h2>
                    <button onClick={handleClose} className="p-2 bg-slate-800 md:bg-slate-100 rounded-full text-slate-400 md:text-slate-500 hover:text-white md:hover:text-slate-800 transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="flex-grow flex flex-col md:block bg-black relative overflow-hidden">
                    {/* Camera Area - Square on mobile, covers on desktop */}
                    <div className="w-full aspect-square md:aspect-auto md:h-96 bg-black relative mx-auto max-w-lg md:max-w-none">
                        <div id={scannerId} className={`w-full h-full ${settings.isCameraFlipped ? 'camera-flipped' : ''}`}></div>
                        
                        {/* Overlay Controls */}
                        <div className="absolute bottom-4 right-4 left-4 flex justify-end pointer-events-none">
                             {zoomCapabilities && (
                                <div className="flex items-center gap-3 bg-black/60 p-2 px-4 rounded-full backdrop-blur-sm pointer-events-auto">
                                    <span className="text-[10px] font-bold text-white whitespace-nowrap">ZOOM</span>
                                    <input
                                        type="range"
                                        min={zoomCapabilities.min}
                                        max={zoomCapabilities.max}
                                        step={zoomCapabilities.step}
                                        value={currentZoom}
                                        onChange={handleZoomChange}
                                        className="w-24 h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Feedback & History Area - Visible below camera on mobile */}
                    <div className="flex-grow bg-slate-900 p-4 overflow-y-auto border-t border-slate-800 md:absolute md:bottom-0 md:left-0 md:right-0 md:bg-gradient-to-t md:from-black/90 md:to-transparent md:border-none md:pointer-events-none">
                        <div className="md:pointer-events-auto max-w-lg mx-auto">
                            {scanFeedback && (
                                <div className={`flex items-center gap-3 p-4 mb-4 rounded-xl backdrop-blur-md border shadow-lg ${scanFeedback.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-50' : 'bg-red-500/20 border-red-500/50 text-red-50'}`}>
                                    {scanFeedback.type === 'success' ? <CheckCircleIcon className="w-6 h-6 flex-shrink-0 text-emerald-400"/> : <ExclamationTriangleIcon className="w-6 h-6 flex-shrink-0 text-red-400"/>}
                                    <span className="font-bold text-base">{scanFeedback.message}</span>
                                </div>
                            )}

                            {recentScans.length > 0 && (
                                <div className="space-y-2 md:hidden">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">最近の履歴</p>
                                    {recentScans.map((scan, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                            <span className={`font-bold ${scan.status === 'success' ? 'text-white' : 'text-red-300'}`}>{scan.name}</span>
                                            <span className="text-xs font-mono text-slate-500">{scan.time}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CameraScannerModal;