import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Package, User, Mail, Lock, Loader2, Shield, Users, UserCog, UserPlus } from 'lucide-react';
import { Role } from '../types';

const Register: React.FC = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        fullName: '',
    });
    const [selectedRole, setSelectedRole] = useState<Role>(Role.STAFF);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const roles = [
        {
            value: Role.ADMIN,
            label: 'Admin',
            icon: Shield,
            color: 'purple',
            bgColor: 'bg-purple-100',
            borderColor: 'border-purple-500',
            textColor: 'text-purple-700',
            hoverBg: 'hover:bg-purple-50',
            description: 'Full system access'
        },
        {
            value: Role.MANAGER,
            label: 'Manager',
            icon: UserCog,
            color: 'blue',
            bgColor: 'bg-blue-100',
            borderColor: 'border-blue-500',
            textColor: 'text-blue-700',
            hoverBg: 'hover:bg-blue-50',
            description: 'Manage inventory & reports'
        },
        {
            value: Role.STAFF,
            label: 'Staff',
            icon: Users,
            color: 'green',
            bgColor: 'bg-green-100',
            borderColor: 'border-green-500',
            textColor: 'text-green-700',
            hoverBg: 'hover:bg-green-50',
            description: 'Basic operations'
        },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await register({ ...formData, role: selectedRole });
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl mb-4 shadow-lg">
                        <Package className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Electro-Logix</h1>
                    <p className="text-gray-600">Create your account to get started</p>
                </div>

                <div className="card">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <UserPlus className="w-6 h-6" />
                        Create Account
                    </h2>

                    {/* Role Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Select Your Role *
                        </label>
                        <div className="grid grid-cols-3 gap-4">
                            {roles.map((role) => {
                                const Icon = role.icon;
                                const isSelected = selectedRole === role.value;
                                return (
                                    <button
                                        key={role.value}
                                        type="button"
                                        onClick={() => setSelectedRole(role.value)}
                                        className={`
                      p-4 rounded-xl border-2 transition-all duration-200 text-center
                      ${isSelected
                                                ? `${role.bgColor} ${role.borderColor} shadow-lg scale-105`
                                                : `bg-white border-gray-200 ${role.hoverBg} hover:shadow-md`
                                            }
                    `}
                                    >
                                        <Icon className={`w-8 h-8 mx-auto mb-2 ${isSelected ? role.textColor : 'text-gray-400'}`} />
                                        <p className={`text-sm font-bold mb-1 ${isSelected ? role.textColor : 'text-gray-700'}`}>
                                            {role.label}
                                        </p>
                                        <p className={`text-xs ${isSelected ? role.textColor : 'text-gray-500'}`}>
                                            {role.description}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Full Name *
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        className="input pl-10"
                                        placeholder="John Doe"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Username *
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        className="input pl-10"
                                        placeholder="johndoe"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address *
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="input pl-10"
                                    placeholder="john@example.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password *
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="input pl-10"
                                    placeholder="Minimum 6 characters"
                                    required
                                    minLength={6}
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters long</p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Creating account...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5" />
                                    Create Account
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-gray-600">
                        Already have an account?{' '}
                        <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                            Sign in here
                        </Link>
                    </p>
                </div>


            </div>
        </div>
    );
};

export default Register;
