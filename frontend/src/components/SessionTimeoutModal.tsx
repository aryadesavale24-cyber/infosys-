import React from 'react';
import { AlertTriangle, LogOut, RefreshCw } from 'lucide-react';

interface SessionTimeoutModalProps {
    isOpen: boolean;
    remainingTime: number;
    onExtend: () => void;
    onLogout: () => void;
}

const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
    isOpen,
    remainingTime,
    onExtend,
    onLogout,
}) => {
    if (!isOpen) return null;

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-slideUp">
                {/* Warning Icon */}
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center animate-pulse">
                        <AlertTriangle className="w-12 h-12 text-yellow-600" />
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
                    Session Timeout Warning
                </h2>

                {/* Message */}
                <p className="text-gray-600 text-center mb-6">
                    Your session is about to expire due to inactivity. You will be automatically logged out in:
                </p>

                {/* Countdown Timer */}
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-6 mb-6">
                    <div className="text-center">
                        <div className="text-5xl font-bold text-yellow-600 mb-2 font-mono">
                            {formatTime(remainingTime)}
                        </div>
                        <p className="text-sm text-gray-600">minutes remaining</p>
                    </div>
                </div>

                {/* Info Message */}
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                    <p className="text-sm text-blue-800">
                        💡 <strong>Tip:</strong> Click "Continue Session" to stay logged in, or "Logout Now" to end your session.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={onExtend}
                        className="flex-1 bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-primary-700 hover:to-primary-800 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Continue Session
                    </button>
                    <button
                        onClick={onLogout}
                        className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-all duration-200 flex items-center justify-center gap-2 border border-gray-300"
                    >
                        <LogOut className="w-5 h-5" />
                        Logout Now
                    </button>
                </div>

                {/* Footer Note */}
                <p className="text-xs text-gray-500 text-center mt-4">
                    This is a security feature to protect your account from unauthorized access.
                </p>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                @keyframes slideUp {
                    from {
                        transform: translateY(20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }

                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }

                .animate-slideUp {
                    animation: slideUp 0.4s ease-out;
                }
            `}</style>
        </div>
    );
};

export default SessionTimeoutModal;
