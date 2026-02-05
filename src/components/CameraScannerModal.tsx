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
        
        setScanFeedback(null);

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
                setScanFeedback({ type: 'success', message: 'QRコードを読み取りました' });
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

                    if (result && result.message) {
                        setScanFeedback(result.success ? { type: 'success', message: result.message } : { type: 'error', message: result.message });
                    } else {
                        setScanFeedback({ type: 'success', message: `${student.name}さんの情報を読み込みました` });
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
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-0 md:p-4" onClick={handleClose}>
            <div 
                className={`bg-white w-full h-full md:h-auto md:rounded-2xl shadow-xl flex flex-col overflow-hidden relative ${modalSizeClasses[settings.cameraViewSize]}`} 
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b flex justify-between items-center bg-white z-10">
                    <h2 className="text-lg font-bold text-slate-800">{title}</h2>
                    <button onClick={handleClose} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-800 transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="flex-grow flex flex-col justify-center bg-black relative overflow-hidden">
                    <div id={scannerId} className={`w-full h-full object-cover ${settings.isCameraFlipped ? 'camera-flipped' : ''}`}></div>
                    
                    {/* オーバーレイUI */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
                        {scanFeedback && (
                            <div className={`flex items-center gap-3 p-3 mb-4 rounded-xl backdrop-blur-md border ${scanFeedback.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-50' : 'bg-red-500/20 border-red-500/50 text-red-50'}`}>
                                {scanFeedback.type === 'success' ? <CheckCircleIcon className="w-6 h-6 flex-shrink-0"/> : <ExclamationTriangleIcon className="w-6 h-6 flex-shrink-0"/>}
                                <span className="font-bold text-sm shadow-sm">{scanFeedback.message}</span>
                            </div>
                        )}

                        {zoomCapabilities && (
                            <div className="flex items-center gap-3 bg-black/40 p-3 rounded-xl backdrop-blur-sm">
                                <span className="text-xs font-bold whitespace-nowrap">ズーム</span>
                                <input
                                    type="range"
                                    min={zoomCapabilities.min}
                                    max={zoomCapabilities.max}
                                    step={zoomCapabilities.step}
                                    value={currentZoom}
                                    onChange={handleZoomChange}
                                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                                />
                                <span className="text-xs font-mono w-8 text-right">{currentZoom.toFixed(1)}x</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CameraScannerModal;