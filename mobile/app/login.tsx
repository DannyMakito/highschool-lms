import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, TouchableWithoutFeedback, Keyboard, Platform } from 'react-native';
import { useAuth } from '../src/context/AuthContext';

export default function LoginScreen() {
    const { login, loading: authLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        Keyboard.dismiss();
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        setLoading(true);
        const { success, message } = await login(email, password);
        setLoading(false);

        if (!success) {
            Alert.alert('Login Failed', message || 'Unknown error occurred');
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-white"
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32, paddingTop: 80, paddingBottom: 40 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <View className="items-center mb-8">
                        <View className="h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mb-6">
                            <Text className="text-2xl font-bold text-slate-800">LMS</Text>
                        </View>
                        
                        <Text className="text-3xl font-black text-black mb-2">Portal Login</Text>
                        <Text className="text-[13px] text-slate-500">
                            Enter your school credentials to continue
                        </Text>
                    </View>

                    <View className="w-full">
                        <View className="mb-5">
                            <Text className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                Email Address
                            </Text>
                            <TextInput
                                className="w-full rounded-lg border border-slate-200 bg-[#f0f4fb] px-4 py-3.5 text-[15px] text-black"
                                placeholder="student@example.com"
                                placeholderTextColor="#94a3b8"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                returnKeyType="next"
                            />
                        </View>

                        <View className="mb-8">
                            <View className="mb-2 flex-row items-center justify-between">
                                <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    Security Pin
                                </Text>
                                <TouchableOpacity>
                                    <Text className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
                                        Forgot Pin?
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <TextInput
                                className="w-full rounded-lg border border-slate-200 bg-[#f0f4fb] px-4 py-3.5 text-[24px] tracking-[8px] text-black font-black"
                                style={{ textAlign: 'center' }}
                                placeholder="••••••"
                                placeholderTextColor="#94a3b8"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                keyboardType="numeric"
                                returnKeyType="done"
                                onSubmitEditing={handleLogin}
                            />
                        </View>

                        <TouchableOpacity
                            className={`w-full flex-row items-center justify-center rounded-xl bg-[#111827] py-4 shadow-lg shadow-black/30 ${loading || authLoading ? 'opacity-70' : ''}`}
                            onPress={handleLogin}
                            disabled={loading || authLoading}
                        >
                            {loading || authLoading ? <ActivityIndicator color="#ffffff" className="mr-2" /> : null}
                            <Text className="text-[15px] font-bold text-white">Sign In to Dashboard</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="mt-12 flex-row items-center justify-center w-full">
                        <View className="flex-1 h-[1px] bg-slate-200" />
                        <Text className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            Secure Access Guaranteed
                        </Text>
                        <View className="flex-1 h-[1px] bg-slate-200" />
                    </View>

                </ScrollView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}
