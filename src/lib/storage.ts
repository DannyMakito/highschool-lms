import supabase, { supabaseKey, supabaseUrl } from "@/lib/supabase";

type UploadWithProgressOptions = {
    bucket: string;
    filePath: string;
    file: File;
    onProgress?: (progress: number) => void;
};

export async function uploadFileWithProgress({
    bucket,
    filePath,
    file,
    onProgress,
}: UploadWithProgressOptions) {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
        throw sessionError;
    }

    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
        throw new Error("You must be signed in to upload files.");
    }

    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`;

    await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open("POST", uploadUrl);
        xhr.setRequestHeader("apikey", supabaseKey);
        xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
        xhr.setRequestHeader("x-upsert", "false");
        xhr.setRequestHeader("cache-control", "3600");
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

        xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable) return;
            onProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)));
        };

        xhr.onerror = () => reject(new Error("The upload failed before the server could respond."));
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                onProgress?.(100);
                resolve();
                return;
            }

            try {
                const parsedError = JSON.parse(xhr.responseText);
                reject(new Error(parsedError.message || "Upload failed."));
            } catch {
                reject(new Error("Upload failed."));
            }
        };

        xhr.send(file);
    });

    return supabase.storage.from(bucket).getPublicUrl(filePath).data.publicUrl;
}

export async function removeStorageFile(bucket: string, filePath?: string | null) {
    if (!filePath) return;

    const { error } = await supabase.storage.from(bucket).remove([filePath]);
    if (error) {
        throw error;
    }
}
