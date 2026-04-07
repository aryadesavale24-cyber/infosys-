import React, { useState, useEffect } from 'react';
import { Mail, Shield, Clock, X } from 'lucide-react';

interface OtpVerificationModalProps {
    isOpen: boolean;
    maskedEmail: string;
    onVerify: (otp: string) => void;
    onCancel: () => void;
    loading: boolean;
    error: string;
}

const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
    isOpen,
    maskedEmail,
    onVerify,
    onCancel,
    loading,
    error,
}) => {
    const [otp, setOtp] = useState(['', '', '', '', '']);
    const [timeLeft, setTimeLeft] = useState(35);
    const [expired, setExpired] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setOtp(['', '', '', '', '']);
            setTimeLeft(35);
            setExpired(false);
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    setExpired(true);
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen]);

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) return; // Only allow single digit
        if (value && !/^\d$/.test(value)) return; // Only allow numbers

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 4) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 5);
        if (!/^\d+$/.test(pastedData)) return;

        const newOtp = pastedData.split('').concat(['', '', '', '', '']).slice(0, 5);
        setOtp(newOtp);

        // Focus last filled input
        const lastIndex = Math.min(pastedData.length, 4);
        const lastInput = document.getElementById(`otp-${lastIndex}`);
        lastInput?.focus();
    };

    const handleSubmit = () => {
        const otpValue = otp.join('');
        if (otpValue.length === 5) {
            onVerify(otpValue);
        }
    };

    const isComplete = otp.every(digit => digit !== '');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-slideUp">
                {/* Header */}
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                        <Shield className="w-12 h-12 text-blue-600" />
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
                    Verify Your Identity
                </h2>

                {/* Description */}
                <p className="text-gray-600 text-center mb-6">
                    For security reasons, we've sent a 5-digit OTP to:
                </p>

                {/* Email */}
                <div className="flex items-center justify-center gap-2 mb-6 p-3 bg-blue-50 rounded-lg">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-900">{maskedEmail}</span>
                </div>

                {/* Timer */}
                <div className="flex items-center justify-center gap-2 mb-6">
                    <Clock className={`w-5 h-5 ${timeLeft <= 10 ? 'text-red-600' : 'text-gray-600'}`} />
                    <span className={`font-mono text-lg font-bold ${timeLeft <= 10 ? 'text-red-600' : 'text-gray-900'}`}>
                        {timeLeft}s
                    </span>
                    <span className="text-sm text-gray-600">remaining</span>
                </div>

                {expired && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
                        <p className="text-sm text-red-800 font-medium">
                            ⏱️ OTP has expired. Please request a new one by clicking "Force Logout" again.
                        </p>
                    </div>
                )}

                {/* OTP Input */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                        Enter OTP Code
                    </label>
                    <div className="flex justify-center gap-3" onPaste={handlePaste}>
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                id={`otp-${index}`}
                                type="text"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleOtpChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                disabled={expired || loading}
                                className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                        ))}
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
                        <p className="text-sm text-red-800 font-medium">
                            ❌ {error}
                        </p>
                    </div>
                )}

                {/* Info */}
                <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
                    <p className="text-sm text-yellow-800">
                        <strong>⚠️ Security Notice:</strong> This OTP is valid for 35 seconds. After verification, your previous session will be terminated.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={handleSubmit}
                        disabled={!isComplete || expired || loading}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Verifying...
                            </>
                        ) : (
                            <>
                                <Shield className="w-5 h-5" />
                                Verify & Login
                            </>
                        )}
                    </button>
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-all duration-200 flex items-center justify-center gap-2 border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <X className="w-5 h-5" />
                        Cancel
                    </button>
                </div>

                {/* Footer */}
                <p className="text-xs text-gray-500 text-center mt-4">
                    Didn't receive the code? Check your spam folder or try again.
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

export default OtpVerificationModal;
