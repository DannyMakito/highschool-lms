import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export interface CircularProgressProps {
    value: number;
    colorClass?: string;
    size?: number;
    strokeWidth?: number;
}

const colorMap: Record<string, string> = {
    'text-orange-400': '#fbbf24',
    'text-pink-400': '#f472b6',
    'text-green-400': '#4ade80',
};

export const CircularProgress = ({
    value,
    colorClass = 'text-orange-400',
    size = 48,
    strokeWidth = 6,
}: CircularProgressProps) => {
    const color = colorMap[colorClass] || '#6366f1';
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (value / 100) * circumference;

    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="rgba(0,0,0,0.05)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    rotation="-90"
                    origin={`${size / 2}, ${size / 2}`}
                />
            </Svg>
            <View style={{ position: 'absolute' }}>
                <Text style={{ color: '#1e293b', fontSize: size * 0.28, fontWeight: '700' }}>
                    {Math.round(value)}%
                </Text>
            </View>
        </View>
    );
};
