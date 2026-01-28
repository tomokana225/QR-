import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { Student, AppSettings, SubmissionList, GradingList } from '../types';
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon } from './Icons';

const CameraScannerModal: React.FC<{
    isOpen: boolean;
    onClose: () => Promise<void>;
    onScanStudent: (student: Student, isDuplicate?: boolean) => { success: boolean, message: string } | void;
    students: Student[];
    settings: AppSettings;
    onSettingsChange: (newSettings: Partial<AppSettings>) => void;
    scannerId: string;
    title: string;
    activeList: SubmissionList | GradingList | undefined;
}> = ({ isOpen, onClose, onScanStudent, students, settings, onSettingsChange, scannerId, title, activeList }) => {
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
    const lastScanTimeRef = useRef(0);
    const lastScannedCodeRef = useRef<string | null>(null);
    const [zoomCapabilities, setZoomCapabilities] = useState<{ min: number; max: number; step: number; } | null>(null);
    const [currentZoom, setCurrentZoom] = useState(settings.cameraZoom);
    const [scanFeedback, setScanFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);

    const onScanStudentRef = useRef(onScanStudent);
    useEffect(() => { onScanStudentRef.current = onScanStudent; }, [onScanStudent]);
    
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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" onClick={handleClose}>
            <div className={`bg-white rounded-lg shadow-xl w-full m-4 ${modalSizeClasses[settings.cameraViewSize]}`} onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
                    <button onClick={handleClose} className="p-1 text-slate-400 hover:text-slate-600"><XMarkIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-4">
                    <div id={scannerId} className={`w-full rounded-lg overflow-hidden ${settings.isCameraFlipped ? 'camera-flipped' : ''}`}></div>
                    {zoomCapabilities && (
                        <div className="mt-4 flex items-center gap-3">
                            <label className="text-sm font-medium">ズーム倍率:</label>
                            <input
                                type="range"
                                min={zoomCapabilities.min}
                                max={zoomCapabilities.max}
                                step={zoomCapabilities.step}
                                value={currentZoom}
                                onChange={handleZoomChange}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                        </div>
                    )}
                     {scanFeedback && (
                        <div className={`flex items-center gap-3 p-3 mt-4 rounded-md text-sm font-semibold border ${scanFeedback.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                            {scanFeedback.type === 'success' ? <CheckCircleIcon className="w-5 h-5"/> : <ExclamationTriangleIcon className="w-5 h-5"/>}
                            <span>{scanFeedback.message}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CameraScannerModal;