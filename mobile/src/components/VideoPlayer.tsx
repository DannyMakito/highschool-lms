import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as FileSystem from 'expo-file-system/legacy';
import { Download, CheckCircle, Trash2 } from 'lucide-react-native';

interface VideoPlayerProps {
    videoUrl: string;
    lessonId: string;
}

export function VideoPlayer({ videoUrl, lessonId }: VideoPlayerProps) {
    const [localUri, setLocalUri] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isChecking, setIsChecking] = useState(true);

    const fileName = `lesson_${lessonId}.mp4`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    // Check if the video is already downloaded
    useEffect(() => {
        const checkLocalFile = async () => {
            try {
                const fileInfo = await FileSystem.getInfoAsync(fileUri);
                if (fileInfo.exists) {
                    setLocalUri(fileUri);
                }
            } catch (error) {
                console.error("Error checking local file:", error);
            } finally {
                setIsChecking(false);
            }
        };
        checkLocalFile();
    }, [fileUri]);

    // Source is either the downloaded file URI or the remote URL
    const source = localUri || videoUrl;

    const player = useVideoPlayer(source, player => {
        // player.play(); // Optional auto-play
    });

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const downloadResumable = FileSystem.createDownloadResumable(
                videoUrl,
                fileUri,
                {},
                (downloadProgress) => {
                    const prog = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                    setProgress(prog);
                }
            );

            const result = await downloadResumable.downloadAsync();
            if (result && result.uri) {
                setLocalUri(result.uri);
            }
        } catch (error) {
            console.error("Download failed:", error);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleDelete = async () => {
        try {
            await FileSystem.deleteAsync(fileUri);
            setLocalUri(null);
            setProgress(0);
        } catch (error) {
            console.error("Delete failed:", error);
        }
    };

    if (isChecking) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <VideoView
                style={styles.video}
                player={player}
                nativeControls={true}
                contentFit="contain"
            />
            
            <View style={styles.controls}>
                {localUri ? (
                    <View style={styles.downloadedContainer}>
                        <CheckCircle size={20} color="#4ade80" />
                        <Text style={styles.downloadedText}>Available Offline</Text>
                        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
                            <Trash2 size={20} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                ) : isDownloading ? (
                    <View style={styles.downloadingContainer}>
                        <ActivityIndicator size="small" color="#6366f1" />
                        <Text style={styles.downloadingText}>
                            Downloading... {Math.round(progress * 100)}%
                        </Text>
                    </View>
                ) : (
                    <TouchableOpacity onPress={handleDownload} style={styles.downloadButton}>
                        <Download size={20} color="#ffffff" />
                        <Text style={styles.downloadButtonText}>Download for Offline</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: '#0f172a',
        borderRadius: 12,
        overflow: 'hidden',
        marginVertical: 16,
    },
    loadingContainer: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        borderRadius: 12,
    },
    video: {
        width: '100%',
        height: 220,
    },
    controls: {
        padding: 16,
        backgroundColor: '#1e293b',
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
    },
    downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4f46e5',
        padding: 12,
        borderRadius: 8,
        gap: 8,
    },
    downloadButtonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 16,
    },
    downloadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        gap: 8,
    },
    downloadingText: {
        color: '#94a3b8',
        fontWeight: '500',
    },
    downloadedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(74, 222, 128, 0.1)',
        padding: 12,
        borderRadius: 8,
    },
    downloadedText: {
        color: '#4ade80',
        fontWeight: '600',
        flex: 1,
        marginLeft: 8,
    },
    deleteButton: {
        padding: 4,
    }
});
