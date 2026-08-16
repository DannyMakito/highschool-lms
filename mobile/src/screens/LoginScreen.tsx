import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { supabase } from '../lib/supabase';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Alert.alert('Login Failed', error.message);
      }
    } catch (e) {
      console.error('Login error', e);
      Alert.alert('Login Failed', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#020617', paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 }}>
      <View style={{ marginTop: 32, borderRadius: 28, borderWidth: 1, borderColor: '#1e293b', backgroundColor: '#0f172a', padding: 24, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 }}>
        <View style={{ marginBottom: 24, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ marginRight: 12, height: 48, width: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#2563eb' }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff' }}>L</Text>
          </View>
          <View>
            <Text style={{ fontSize: 20, fontWeight: '600', color: '#fff' }}>HighSchool LMS</Text>
            <Text style={{ fontSize: 13, color: '#94a3b8' }}>Student portal</Text>
          </View>
        </View>

        <Text style={{ marginBottom: 6, fontSize: 28, fontWeight: '600', color: '#fff' }}>Welcome back</Text>
        <Text style={{ marginBottom: 24, fontSize: 13, lineHeight: 20, color: '#94a3b8' }}>Sign in to view lessons, assignments, and your AI tutor in one place.</Text>

        <View style={{ marginBottom: 14 }}>
          <Text style={{ marginBottom: 8, fontSize: 13, fontWeight: '500', color: '#cbd5e1' }}>Email address</Text>
          <TextInput
            style={{ width: '100%', borderRadius: 16, borderWidth: 1, borderColor: '#334155', backgroundColor: '#111827', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#fff' }}
            placeholder="student@example.com"
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={{ marginBottom: 24 }}>
          <Text style={{ marginBottom: 8, fontSize: 13, fontWeight: '500', color: '#cbd5e1' }}>Password</Text>
          <TextInput
            style={{ width: '100%', borderRadius: 16, borderWidth: 1, borderColor: '#334155', backgroundColor: '#111827', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#fff' }}
            placeholder="••••••••"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#2563eb', paddingVertical: 14 }}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#ffffff" style={{ marginRight: 8 }} /> : null}
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
