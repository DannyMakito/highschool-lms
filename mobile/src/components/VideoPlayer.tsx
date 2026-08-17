import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Linking } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { Download, CheckCircle, Trash2, ExternalLink, Play } from 'lucide-react-native';

interface VideoPlayerProps {
    videoUrl: string;
    lessonId: string;
    videoType?: string;
    videoMimeType?: string | null;
}

function getYouTubeEmbedUrl(url: string): string {
    let videoId = "";
    if (url.includes("youtu.be/")) {
        videoId = url.split("youtu.be/")[1]?.split("?")[0]?.split("&")[0] || "";
    } else if (url.includes("youtube.com/watch")) {
        const queryString = url.split("?")[1] || "";
        const searchParams = new URLSearchParams(queryString);
        videoId = searchParams.get("v") || "";
    } else if (url.includes("youtube.com/embed/")) {
        videoId = url.split("youtube.com/embed/")[1]?.split("?")[0]?.split("&")[0] || "";
    }

    if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?playsinline=1&autoplay=0&rel=0`;
    }
    return url;
}

function getVimeoEmbedUrl(url: string): string {
    const videoId = url.split("/").filter(Boolean).pop()?.split("?")[0];
    if (videoId && !isNaN(Number(videoId))) {
        return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
}

function NativeDirectVideoPlayer({ source }: { source: string }) {
    const player = useVideoPlayer(source, (player) => {
        player.loop = false;
    });

    return (
        <VideoView
            style={styles.video}
            player={player}
            nativeControls={true}
            contentFit="contain"
            allowsFullscreen={true}
        />
    );
}

export function VideoPlayer({ videoUrl, lessonId, videoType, videoMimeType }: VideoPlayerProps) {
    const [localUri, setLocalUri] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isChecking, setIsChecking] = useState(true);

    const cleanUrl = (videoUrl || '').trim();
    const fileName = `lesson_${lessonId}.mp4`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    const isYouTube = cleanUrl.includes("youtube.com") || cleanUrl.includes("youtu.be");
    const isVimeo = cleanUrl.includes("vimeo.com");
    const isDirectVideo =
        videoType === "upload" ||
        Boolean(videoMimeType?.startsWith("video/")) ||
        /\.(mp4|webm|ogg|m3u8|mov)(\?|$)/i.test(cleanUrl) ||
        cleanUrl.includes("supabase.co/storage") ||
        cleanUrl.includes("/storage/v1/object/");

    useEffect(() => {
        let isMounted = true;
        const checkLocalFile = async () => {
            try {
                const fileInfo = await FileSystem.getInfoAsync(fileUri);
                if (isMounted && fileInfo.exists) {
                    setLocalUri(fileUri);
                }
            } catch (error) {
                console.error("Error checking local video file:", error);
            } finally {
                if (isMounted) setIsChecking(false);
            }
        };
        checkLocalFile();
        return () => { isMounted = false; };
    }, [fileUri]);

    const handleDownload = async () => {
        if (!cleanUrl) return;
        setIsDownloading(true);
        try {
            const downloadResumable = FileSystem.createDownloadResumable(
                cleanUrl,
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

    if (!cleanUrl) {
        return null;
    }

    if (isChecking) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    // 1. YouTube Video
    if (isYouTube) {
        const embedUrl = getYouTubeEmbedUrl(cleanUrl);
        return (
            <View style={styles.container}>
                <View style={styles.videoWrapper}>
                    <WebView
                        source={{ uri: embedUrl }}
                        style={styles.webView}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        allowsInlineMediaPlayback={true}
                        mediaPlaybackRequiresUserAction={false}
                    />
                </View>
                <View style={styles.controls}>
                    <TouchableOpacity
                        onPress={() => Linking.openURL(cleanUrl)}
                        style={styles.externalButton}
                    >
                        <ExternalLink size={16} color="#6366f1" />
                        <Text style={styles.externalButtonText}>Open in YouTube App</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // 2. Vimeo Video
    if (isVimeo) {
        const embedUrl = getVimeoEmbedUrl(cleanUrl);
        return (
            <View style={styles.container}>
                <View style={styles.videoWrapper}>
                    <WebView
                        source={{ uri: embedUrl }}
                        style={styles.webView}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        allowsInlineMediaPlayback={true}
                    />
                </View>
                <View style={styles.controls}>
                    <TouchableOpacity
                        onPress={() => Linking.openURL(cleanUrl)}
                        style={styles.externalButton}
                    >
                        <ExternalLink size={16} color="#6366f1" />
                        <Text style={styles.externalButtonText}>Open in Vimeo</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // 3. Direct File / Uploaded MP4 / HLS Stream
    const source = localUri || cleanUrl;

    if (isDirectVideo || localUri) {
        return (
            <View style={styles.container}>
                <NativeDirectVideoPlayer source={source} />

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

    // 4. Fallback for generic external video links
    return (
        <View style={styles.container}>
            <View style={styles.videoWrapper}>
                <WebView
                    source={{ uri: cleanUrl }}
                    style={styles.webView}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    allowsInlineMediaPlayback={true}
                />
            </View>
            <View style={styles.controls}>
                <TouchableOpacity
                    onPress={() => Linking.openURL(cleanUrl)}
                    style={styles.externalButton}
                >
                    <ExternalLink size={16} color="#6366f1" />
                    <Text style={styles.externalButtonText}>Open Video in Browser</Text>
                </TouchableOpacity>
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
        height: 220,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        borderRadius: 12,
        marginVertical: 16,
    },
    videoWrapper: {
        width: '100%',
        height: 220,
        backgroundColor: '#000',
    },
    video: {
        width: '100%',
        height: 220,
    },
    webView: {
        flex: 1,
        backgroundColor: '#000',
    },
    controls: {
        padding: 12,
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
        fontSize: 15,
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
    },
    externalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#334155',
        padding: 10,
        borderRadius: 8,
        gap: 8,
    },
    externalButtonText: {
        color: '#818cf8',
        fontWeight: '600',
        fontSize: 14,
    },
});

