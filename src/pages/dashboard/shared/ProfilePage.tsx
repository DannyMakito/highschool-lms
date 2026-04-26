import type { ChangeEvent } from "react";
import { Camera, KeyRound, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useRegistrationData } from "@/hooks/useRegistrationData";
import { useSchoolData } from "@/hooks/useSchoolData";
import { uploadFileWithProgress } from "@/lib/storage";
import supabase from "@/lib/supabase";

function initials(name?: string) {
  return (name || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const { students, grades, registerClasses } = useRegistrationData();
  const { teachers } = useSchoolData();
  const [isUploading, setIsUploading] = useState(false);

  const studentProfile = useMemo(() => students.find((student) => student.id === user?.id), [students, user?.id]);
  const teacherProfile = useMemo(() => teachers.find((teacher) => teacher.id === user?.id), [teachers, user?.id]);
  const gradeName = grades.find((grade) => grade.id === studentProfile?.gradeId)?.name;
  const registerClassName = registerClasses.find((registerClass) => registerClass.id === studentProfile?.registerClassId)?.name;

  const details = [
    { label: "Full Name", value: user?.name || "-", icon: UserRound },
    { label: "Email", value: user?.email || "-", icon: Mail },
    { label: "Role", value: user?.role || "-", icon: ShieldCheck },
  ];

  if (studentProfile) {
    details.push(
      { label: "Administration Number", value: studentProfile.administrationNumber || "-", icon: UserRound },
      { label: "Grade", value: gradeName || studentProfile.grade || "-", icon: UserRound },
      { label: "Register Class", value: registerClassName || studentProfile.studentClass || "Not assigned yet", icon: UserRound }
    );
  }

  if (teacherProfile) {
    details.push({
      label: "Assigned Subjects",
      value: `${teacherProfile.subjects.length} linked subject${teacherProfile.subjects.length === 1 ? "" : "s"}`,
      icon: UserRound,
    });
  }

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }

    setIsUploading(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "png";
      const storagePath = `${user.id}/${Date.now()}.${extension}`;
      const avatarUrl = await uploadFileWithProgress({
        bucket: "profile-images",
        filePath: storagePath,
        file,
      });

      const { error } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id);
      if (error) throw error;

      await refreshProfile();
      toast.success("Profile picture updated.");
    } catch (error) {
      console.error(error);
      toast.error("Could not update your profile picture.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">My Profile</h1>
        <p className="text-muted-foreground">Your school identity card across the entire portal. Only the profile picture is editable here.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardContent className="flex flex-col items-center gap-5 p-8">
            <Avatar className="h-36 w-36 ring-4 ring-primary/10">
              <AvatarImage src={user?.avatarUrl || ""} alt={user?.name || "Profile"} />
              <AvatarFallback className="text-3xl font-black">{initials(user?.name)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1 text-center">
              <h2 className="text-2xl font-black text-slate-900">{user?.name}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge variant="outline" className="uppercase tracking-widest">{user?.role}</Badge>
            </div>
            <label className="w-full">
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={isUploading} />
              <Button type="button" className="w-full" disabled={isUploading} asChild>
                <span>
                  <Camera className="mr-2 h-4 w-4" />
                  {isUploading ? "Uploading..." : "Update Profile Picture"}
                </span>
              </Button>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {details.map((detail) => (
              <div key={detail.label} className="rounded-2xl border bg-card/60 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                  <detail.icon className="h-3.5 w-3.5" />
                  {detail.label}
                </div>
                <p className="text-base font-bold text-slate-900">{detail.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
