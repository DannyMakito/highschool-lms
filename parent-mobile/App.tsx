import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { PasswordField } from "./src/components/PasswordField";
import { useChildDashboard } from "./src/features/children/useChildDashboard";
import { supabase } from "./src/lib/supabase";
import type { ParentAccessStudent } from "./src/lib/parentAccess";
import { registerParentWithAccessKey, verifyParentAccessKey } from "./src/lib/parentAccess";
import { authTextInputProps, brandColors } from "./src/theme/brand";
import type { ChildAssignmentItem, ChildConversationItem, ChildGradeItem, ChildLessonItem, ChildQuizItem, ChildTeacherRecipientItem } from "./src/types/dashboard";

const colors = brandColors;
const spacing = { sm: 8, md: 12, lg: 16 };

type TabId = "home" | "academics" | "attendance" | "messages" | "more";
type AuthMode = "sign-in" | "create";

const tabs: Array<{ id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: "home", label: "Home", icon: "home-outline" },
  { id: "academics", label: "Subjects", icon: "school-outline" },
  { id: "attendance", label: "Attendance", icon: "calendar-outline" },
  { id: "messages", label: "Messages", icon: "chatbubbles-outline" },
  { id: "more", label: "More", icon: "ellipsis-horizontal-circle-outline" },
];

const quickActions: Array<{ id: TabId; label: string }> = [
  { id: "academics", label: "Academics" },
  { id: "attendance", label: "Attendance" },
  { id: "messages", label: "Messages" },
  { id: "more", label: "Profile" },
];

function plainMessageText(value: string | null | undefined) {
  return (value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function App() {
  return <AuthProvider><AppShell /></AuthProvider>;
}

function AppShell() {
  const { loading, session, parent, children, activeChild, logout, forceLogin, setActiveChildId, login } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [subjectPageId, setSubjectPageId] = useState<string | null>(null);
  const [showAbsenceReport, setShowAbsenceReport] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [cellphone, setCellphone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [previewStudent, setPreviewStudent] = useState<ParentAccessStudent | null>(null);

  const dashboard = useChildDashboard(activeChild?.id, parent?.id);

  const averageScore = useMemo(() => {
    const grades = dashboard.data.grades;
    return grades.length ? Math.round(grades.reduce((sum, item) => sum + item.score, 0) / grades.length) : null;
  }, [dashboard.data.grades]);

  const attendanceRate = useMemo(() => {
    const attendance = dashboard.data.attendance;
    return attendance.length
      ? Math.round((attendance.filter((item) => item.mark === "present" || item.mark === "late").length / attendance.length) * 100)
      : null;
  }, [dashboard.data.attendance]);

  const alerts = useMemo(() => {
    const items = [
      ...dashboard.data.assignments.slice(0, 2).map((item) => item.title),
      ...dashboard.data.attendance.slice(0, 2).filter((item) => item.mark !== "present").map((item) => `Attendance ${item.mark} on ${item.date}`),
      ...dashboard.data.announcements.slice(0, 1).map((item) => item.title),
    ];
    return items.slice(0, 3);
  }, [dashboard.data.assignments, dashboard.data.attendance, dashboard.data.announcements]);

  const subjectAverages = useMemo(() => {
    const totals = new Map<string, { sum: number; count: number }>();
    for (const grade of dashboard.data.grades) {
      const current = totals.get(grade.subjectId) || { sum: 0, count: 0 };
      current.sum += grade.score;
      current.count += 1;
      totals.set(grade.subjectId, current);
    }
    return dashboard.data.subjects.map((subject) => {
      const current = totals.get(subject.id);
      return { ...subject, average: current?.count ? Math.round(current.sum / current.count) : null };
    });
  }, [dashboard.data.subjects, dashboard.data.grades]);

  const threads = dashboard.data.conversations.slice(0, 3);

  const signIn = async () => {
    setBusy(true); setMsg(null);
    const result = await login(loginEmail, loginPin);
    setBusy(false);
    if (!result.success) return setMsg(result.message || "Unable to sign in");
    setLoginEmail(""); setLoginPin("");
  };

  const checkKey = async () => {
    setBusy(true); setMsg(null);
    const result = await verifyParentAccessKey(accessKey);
    setBusy(false);
    if (!result.success) { setPreviewStudent(null); return setMsg(result.message); }
    setPreviewStudent(result.student);
  };

  const createAccount = async () => {
    setBusy(true); setMsg(null);
    const result = await registerParentWithAccessKey({ accessKey, firstName, surname, cellphone, email, password });
    setBusy(false);
    if (!result.success) return setMsg(result.message);
    setMsg(result.needsConfirmation ? "Account created. Confirm it, then sign in." : null);
    if (!result.needsConfirmation) {
      setAccessKey(""); setFirstName(""); setSurname(""); setCellphone(""); setEmail(""); setPassword(""); setPreviewStudent(null);
    } else {
      setAuthMode("sign-in");
    }
  };

  if (loading) return <LoadingState onForceLogin={forceLogin} />;
  if (!session || !parent) return <AuthScreen mode={authMode} onModeChange={setAuthMode} loginEmail={loginEmail} loginPin={loginPin} onLoginEmailChange={setLoginEmail} onLoginPinChange={setLoginPin} accessKey={accessKey} onAccessKeyChange={setAccessKey} firstName={firstName} surname={surname} cellphone={cellphone} email={email} password={password} onFirstNameChange={setFirstName} onSurnameChange={setSurname} onCellphoneChange={setCellphone} onEmailChange={setEmail} onPasswordChange={setPassword} previewStudent={previewStudent} busy={busy} message={msg} onCheckKey={checkKey} onCreate={createAccount} onSignIn={signIn} />;

  if (children.length === 0) return <NoChildren parentName={parent.fullName} onStart={() => { void logout(); setAuthMode("create"); }} />;

  if (subjectPageId) {
    return <SubjectRelationshipPage
      childName={activeChild?.fullName || "Learner"}
      subject={subjectAverages.find((subject) => subject.id === subjectPageId) || null}
      assignments={dashboard.data.assignments.filter((item) => item.subjectId === subjectPageId)}
      quizzes={dashboard.data.quizzes.filter((item) => item.subjectId === subjectPageId)}
      lessons={dashboard.data.lessons.filter((item) => item.subjectId === subjectPageId)}
      grades={dashboard.data.grades.filter((item) => item.subjectId === subjectPageId)}
      conversations={dashboard.data.conversations.filter((item) => item.subjectId === subjectPageId)}
      onBack={() => setSubjectPageId(null)}
    />;
  }

  if (showAbsenceReport) {
    return <AbsenceReportPage childId={activeChild?.id || null} childName={activeChild?.fullName || "your child"} parentId={parent.id} onBack={() => setShowAbsenceReport(false)} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <ParentTopBar activeTab={activeTab} onMore={() => setActiveTab("more")} />
        {activeTab === "home" ? <Hero parentName={parent.fullName} childCount={children.length} /> : <View style={styles.pageHeading}><Text style={styles.pageHeadingTitle}>{activeTab === "academics" ? "Subjects" : activeTab === "attendance" ? "Attendance" : activeTab === "messages" ? "Messages" : "More"}</Text><Text style={styles.pageHeadingBody}>{activeTab === "academics" ? "Open a subject to see your child’s learning and progress." : activeTab === "attendance" ? "Review attendance and notify the school about an absence." : activeTab === "messages" ? "Stay in touch with your child’s teachers." : "Your family and account settings."}</Text></View>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.childStrip}>
          {children.map((child) => {
            const active = child.id === activeChild?.id;
            return <Pressable key={child.id} onPress={() => setActiveChildId(child.id)} style={[styles.childChip, active && styles.childChipActive]}><Text style={styles.childName}>{child.fullName}</Text><Text style={styles.childMeta}>{child.gradeLabel || "Grade pending"}{child.classLabel ? ` • ${child.classLabel}` : ""}</Text></Pressable>;
          })}
        </ScrollView>
        <View style={styles.panel}>
          {activeTab === "home" && <HomeTab childName={activeChild?.fullName || "Learner"} childGrade={activeChild?.gradeLabel || "Grade pending"} averageScore={averageScore} attendanceRate={attendanceRate} assignmentsCount={dashboard.data.assignments.length} conversationsCount={dashboard.data.conversations.length} alerts={alerts} loading={dashboard.loading} errorMessage={dashboard.errorMessage} onQuickAction={setActiveTab} onReportAbsence={() => setShowAbsenceReport(true)} />}
          {activeTab === "academics" && <AcademicsTab averageScore={averageScore} subjects={subjectAverages} assignments={dashboard.data.assignments} quizzes={dashboard.data.quizzes} grades={dashboard.data.grades} loading={dashboard.loading} onSelectSubject={(subjectId) => { setSelectedSubjectId(subjectId); setSubjectPageId(subjectId); }} />}
          {activeTab === "attendance" && <AttendanceTab attendanceRate={attendanceRate} attendance={dashboard.data.attendance} loading={dashboard.loading} />}
          {activeTab === "messages" && <MessagesTab childName={activeChild?.fullName || "Learner"} conversations={threads} subjectTeachers={dashboard.data.subjectTeachers} loading={dashboard.loading} errorMessage={dashboard.errorMessage} sessionUserId={session?.user?.id ?? null} onReload={dashboard.reload} />}
          {activeTab === "more" && <MoreTab parentName={parent.fullName} email={parent.email} children={children} onLogout={logout} />}
        </View>
      </ScrollView>
      <View style={styles.tabBar}>{tabs.map((tab) => { const active = tab.id === activeTab; return <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)} style={[styles.tabButton, active && styles.tabButtonActive]}><Ionicons name={tab.icon} size={18} color={active ? colors.text : colors.placeholder} /><Text style={[styles.tabLabel, active && styles.tabLabelActive]} numberOfLines={1}>{tab.label}</Text></Pressable>; })}</View>
    </SafeAreaView>
  );
}

function AuthScreen(props: { mode: AuthMode; onModeChange: (mode: AuthMode) => void; loginEmail: string; loginPin: string; onLoginEmailChange: (value: string) => void; onLoginPinChange: (value: string) => void; accessKey: string; onAccessKeyChange: (value: string) => void; firstName: string; surname: string; cellphone: string; email: string; password: string; onFirstNameChange: (value: string) => void; onSurnameChange: (value: string) => void; onCellphoneChange: (value: string) => void; onEmailChange: (value: string) => void; onPasswordChange: (value: string) => void; previewStudent: ParentAccessStudent | null; busy: boolean; message: string | null; onCheckKey: () => Promise<void>; onCreate: () => Promise<void>; onSignIn: () => Promise<void>; }) {
  const { mode } = props;
  return <SafeAreaView style={styles.safeArea}><StatusBar barStyle="light-content" /><View style={styles.glowOne} /><View style={styles.glowTwo} /><KeyboardAvoidingView behavior="padding" style={styles.flex}><ScrollView contentContainerStyle={styles.authPage} keyboardShouldPersistTaps="handled"><View style={styles.authHero}><Text style={styles.kicker}>Parent Portal</Text><Text style={styles.authTitle}>Connect your child and see school updates fast.</Text><Text style={styles.authSubtitle}>Use your school access key to preview the learner, then create your parent profile or sign in.</Text></View><View style={styles.toggleRow}><Pressable onPress={() => props.onModeChange("sign-in")} style={[styles.toggleButton, mode === "sign-in" && styles.toggleActive]}><Text style={[styles.toggleText, mode === "sign-in" && styles.toggleTextActive]}>Sign in</Text></Pressable><Pressable onPress={() => props.onModeChange("create")} style={[styles.toggleButton, mode === "create" && styles.toggleActive]}><Text style={[styles.toggleText, mode === "create" && styles.toggleTextActive]}>Create + Link</Text></Pressable></View><View style={styles.authCard}>{mode === "sign-in" ? <><Text style={styles.sectionTitle}>Sign in</Text><Text style={styles.sectionBody}>Use the email or cellphone number and PIN you already set up with the school.</Text><TextInput {...authTextInputProps} placeholder="Email or cellphone number" value={props.loginEmail} onChangeText={props.onLoginEmailChange} autoCapitalize="none" keyboardType="email-address" style={styles.input} /><PasswordField {...authTextInputProps} placeholder="Password or PIN" value={props.loginPin} onChangeText={props.onLoginPinChange} style={styles.input} /><Pressable onPress={props.onSignIn} style={styles.primaryButton}>{props.busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>Sign in</Text>}</Pressable></> : <><Text style={styles.sectionTitle}>Create parent profile</Text><Text style={styles.sectionBody}>Enter the school access key to preview the learner before you finish setup.</Text><TextInput {...authTextInputProps} placeholder="Access key" value={props.accessKey} onChangeText={props.onAccessKeyChange} autoCapitalize="characters" style={styles.input} /><Pressable onPress={props.onCheckKey} style={styles.secondaryButton}>{props.busy ? <ActivityIndicator color={colors.text} /> : <Text style={styles.secondaryText}>Check learner</Text>}</Pressable>{props.previewStudent ? <View style={styles.previewCard}><Text style={styles.previewLabel}>Linked learner preview</Text><Text style={styles.previewName}>{props.previewStudent.fullName}</Text><Text style={styles.previewMeta}>{props.previewStudent.gradeLabel || "Grade pending"}</Text><Text style={styles.previewMeta}>{props.previewStudent.classLabel || "Class pending"}</Text></View> : null}<View style={styles.grid}><TextInput {...authTextInputProps} placeholder="First name" value={props.firstName} onChangeText={props.onFirstNameChange} style={styles.input} /><TextInput {...authTextInputProps} placeholder="Surname" value={props.surname} onChangeText={props.onSurnameChange} style={styles.input} /></View><TextInput {...authTextInputProps} placeholder="Cellphone" value={props.cellphone} onChangeText={props.onCellphoneChange} keyboardType="phone-pad" style={styles.input} /><TextInput {...authTextInputProps} placeholder="Email address" value={props.email} onChangeText={props.onEmailChange} autoCapitalize="none" keyboardType="email-address" style={styles.input} /><PasswordField {...authTextInputProps} placeholder="Password or PIN" value={props.password} onChangeText={props.onPasswordChange} style={styles.input} /><Pressable onPress={props.onCreate} style={styles.primaryButton}>{props.busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>Create and link</Text>}</Pressable></>}{props.message ? <Text style={styles.errorText}>{props.message}</Text> : null}</View></ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

function NoChildren({ parentName, onStart }: { parentName: string; onStart: () => void; }) {
  return <SafeAreaView style={styles.safeArea}><StatusBar barStyle="light-content" /><View style={styles.page}><Hero parentName={parentName} childCount={0} /><View style={styles.emptyCard}><Text style={styles.sectionTitle}>No linked children yet</Text><Text style={styles.sectionBody}>Ask the school for your learner access key, then use it to create and connect your parent profile.</Text><Pressable onPress={onStart} style={styles.primaryButton}><Text style={styles.primaryText}>Start access-key setup</Text></Pressable></View></View></SafeAreaView>;
}

function Hero({ parentName, childCount }: { parentName: string; childCount: number }) {
  return <View style={styles.hero}><Text style={styles.kicker}>Parent Portal</Text><Text style={styles.title}>Good morning, {parentName.split(" ")[0]}</Text><Text style={styles.subtitle}>{childCount > 0 ? "Child performance, attendance, and messages at a glance." : "No learners linked yet."}</Text></View>;
}

function ParentTopBar({ activeTab, onMore }: { activeTab: TabId; onMore: () => void }) {
  const title = activeTab === "home" ? "Parent Portal" : activeTab === "academics" ? "Subjects" : activeTab === "attendance" ? "Attendance" : activeTab === "messages" ? "Messages" : "More";
  return <View style={styles.topBar}><Text style={styles.topBarTitle}>{title}</Text><Pressable onPress={onMore} accessibilityLabel="Open more options" style={styles.topBarAction}><Ionicons name="ellipsis-vertical" color={colors.white} size={22} /></Pressable></View>;
}

function HomeTab(props: { childName: string; childGrade: string; averageScore: number | null; attendanceRate: number | null; assignmentsCount: number; conversationsCount: number; alerts: string[]; loading: boolean; errorMessage: string | null; onQuickAction: (tab: TabId) => void; onReportAbsence: () => void; }) {
  return <View style={styles.stack}><View style={styles.card}><Text style={styles.sectionTitle}>{props.childName}</Text><Text style={styles.sectionBody}>{props.childGrade}</Text></View><View style={styles.alertCard}><Text style={styles.sectionTitle}>Needs attention</Text>{props.loading ? <ActivityIndicator color={colors.primary} /> : null}{props.errorMessage ? <Text style={styles.errorText}>{props.errorMessage}</Text> : null}{!props.loading && props.alerts.length === 0 ? <Text style={styles.sectionBody}>No urgent alerts right now.</Text> : null}{props.alerts.map((alert) => <Text key={alert} style={styles.alertText}>{alert}</Text>)}</View><View style={styles.metrics}>{[{ label: "Average", value: props.averageScore != null ? `${props.averageScore}%` : "--" }, { label: "Attendance", value: props.attendanceRate != null ? `${props.attendanceRate}%` : "--" }, { label: "Assignments", value: String(props.assignmentsCount) }, { label: "Messages", value: String(props.conversationsCount) }].map((item) => <View key={item.label} style={styles.metric}><Text style={styles.metricValue}>{item.value}</Text><Text style={styles.metricLabel}>{item.label}</Text></View>)}</View><View style={styles.quickActions}>{quickActions.map((action) => <Pressable key={action.id} onPress={() => props.onQuickAction(action.id)} style={styles.quickButton}><Text style={styles.quickText}>{action.label}</Text></Pressable>)}<Pressable onPress={props.onReportAbsence} style={styles.quickButton}><Text style={styles.quickText}>Report absence</Text></Pressable></View></View>;
}

function AcademicsTab(props: {
  averageScore: number | null;
  subjects: Array<{ id: string; name: string; average: number | null; category?: string | null; gradeTier?: string | null }>;
  assignments: ChildAssignmentItem[];
  quizzes: ChildQuizItem[];
  grades: ChildGradeItem[];
  loading: boolean;
  onSelectSubject: (subjectId: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const overdue = props.assignments.filter((item) => Boolean(item.dueDate && item.dueDate < today && !item.submissionStatus));
  const dueSoon = props.assignments.filter((item) => {
    if (!item.dueDate || item.submissionStatus) return false;
    const days = (new Date(`${item.dueDate}T12:00:00`).getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= 3;
  });
  const submitted = props.assignments.filter((item) => item.submissionStatus === "submitted" || item.submissionStatus === "graded");
  const completedQuizzes = props.quizzes.filter((item) => item.submissionStatus === "completed");

  return (
    <View style={styles.stack}>
      <View style={styles.heroMetric}>
        <Text style={styles.metricValue}>{props.averageScore != null ? `${props.averageScore}%` : "--"}</Text>
        <Text style={styles.metricLabel}>Overall average</Text>
        <Text style={styles.metricNote}>A quick summary of your child’s current academic progress.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Academic follow-through</Text>
        <Text style={styles.sectionBody}>A quiet overview of what is complete and what may need a check-in.</Text>
        <View style={styles.detailGrid}>
          <View style={styles.detailCard}><Text style={styles.detailValue}>{overdue.length}</Text><Text style={styles.detailLabel}>Needs attention</Text></View>
          <View style={styles.detailCard}><Text style={styles.detailValue}>{dueSoon.length}</Text><Text style={styles.detailLabel}>Due soon</Text></View>
          <View style={styles.detailCard}><Text style={styles.detailValue}>{submitted.length}</Text><Text style={styles.detailLabel}>Submitted</Text></View>
          <View style={styles.detailCard}><Text style={styles.detailValue}>{completedQuizzes.length}</Text><Text style={styles.detailLabel}>Quizzes done</Text></View>
        </View>
        {overdue.slice(0, 3).map((item) => <View key={item.id} style={styles.detailRow}><View style={{ flex: 1 }}><Text style={styles.listTitle}>{item.title}</Text><Text style={styles.listMeta}>Past due{item.dueDate ? ` • Due ${item.dueDate}` : ""} · No submission recorded</Text></View><Text style={styles.detailPill}>Check in</Text></View>)}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Subjects</Text>
        <Text style={styles.sectionBody}>Tap a subject to see recent work, marks, and the latest uploaded content.</Text>
        {props.loading ? <ActivityIndicator color={colors.primary} /> : null}
        {props.subjects.length === 0 && !props.loading ? <Text style={styles.sectionBody}>No linked subjects yet.</Text> : null}
        <View style={styles.subjectGrid}>
          {props.subjects.map((subject) => {
            const subjectAssignmentCount = props.assignments.filter((item) => item.subjectId === subject.id).length;
            const subjectGradeCount = props.grades.filter((item) => item.subjectId === subject.id).length;
            return (
              <Pressable
                key={subject.id}
                onPress={() => props.onSelectSubject(subject.id)}
                style={({ pressed }) => [styles.subjectTile, pressed && styles.subjectTilePressed]}
              >
                <View style={styles.subjectTileTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listTitle}>{subject.name}</Text>
                    <Text style={styles.listMeta}>{subject.category || subject.gradeTier || "Subject"}</Text>
                  </View>
                  <Text style={styles.metricValue}>{subject.average != null ? `${subject.average}%` : "--"}</Text>
                </View>
                <View style={styles.subjectStatsRow}>
                  <Text style={styles.subjectStat}>{subjectAssignmentCount} task{subjectAssignmentCount === 1 ? "" : "s"}</Text>
                  <Text style={styles.subjectStat}>{subjectGradeCount} mark{subjectGradeCount === 1 ? "" : "s"}</Text>
                </View>
                <Text style={styles.subjectAction}>Open subject page</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

    </View>
  );
}

function SubjectRelationshipPage(props: { childName: string; subject: { id: string; name: string; average: number | null; category?: string | null; gradeTier?: string | null } | null; assignments: ChildAssignmentItem[]; quizzes: ChildQuizItem[]; lessons: ChildLessonItem[]; grades: ChildGradeItem[]; conversations: ChildConversationItem[]; onBack: () => void; }) {
  const upcoming = props.assignments.slice(0, 4);
  const releasedGrades = props.grades.filter((item) => item.hasScore);
  const hasActivity = props.assignments.length > 0 || props.quizzes.length > 0 || props.lessons.length > 0 || releasedGrades.length > 0;
  return <SafeAreaView style={styles.safeArea}><StatusBar barStyle="light-content" /><ScrollView contentContainerStyle={styles.page}><Pressable onPress={props.onBack} style={styles.secondaryButton}><Text style={styles.secondaryText}>Back to academics</Text></Pressable><View style={styles.hero}><Text style={styles.kicker}>{props.childName}</Text><Text style={styles.title}>{props.subject?.name || "Subject"}</Text><Text style={styles.subtitle}>{props.subject?.category || props.subject?.gradeTier || "Subject progress and teacher updates."}</Text></View><View style={styles.card}><Text style={styles.sectionTitle}>Progress overview</Text>{props.subject?.average != null ? <><Text style={styles.subjectAverage}>{props.subject.average}%</Text><Text style={styles.sectionBody}>Current average from released assessment results.</Text></> : <Text style={styles.sectionBody}>No assessment results have been released yet. The average will appear when the teacher publishes marks.</Text>}</View><View style={styles.card}><Text style={styles.sectionTitle}>Learning content</Text>{props.lessons.length ? props.lessons.slice(0, 5).map((lesson) => <View key={lesson.id} style={styles.msg}><Text style={styles.listMeta}>{lesson.topicTitle}</Text><Text style={styles.listTitle}>{lesson.title}</Text><Text style={styles.sectionBody}>{lesson.preview}</Text></View>) : <Text style={styles.sectionBody}>No lesson content has been published for this subject yet.</Text>}</View>{hasActivity ? <View style={styles.metrics}>{releasedGrades.length > 0 ? <View style={styles.metric}><Text style={styles.metricValue}>{releasedGrades.length}</Text><Text style={styles.metricLabel}>Released marks</Text></View> : null}{props.assignments.length > 0 ? <View style={styles.metric}><Text style={styles.metricValue}>{props.assignments.length}</Text><Text style={styles.metricLabel}>Work items</Text></View> : null}{props.quizzes.length > 0 ? <View style={styles.metric}><Text style={styles.metricValue}>{props.quizzes.length}</Text><Text style={styles.metricLabel}>Quizzes</Text></View> : null}</View> : null}<View style={styles.card}><Text style={styles.sectionTitle}>Upcoming work</Text>{upcoming.length ? upcoming.map((item) => <View key={item.id} style={styles.detailRow}><View style={{ flex: 1 }}><Text style={styles.listTitle}>{item.title || "Assignment"}</Text><Text style={styles.listMeta}>{item.dueDate ? `Due ${item.dueDate.slice(0, 10)}` : "Date to be confirmed"}</Text></View><Text style={styles.detailPill}>{item.submissionStatus || "Open"}</Text></View>) : <Text style={styles.sectionBody}>There is no upcoming work published for this subject right now.</Text>}</View><View style={styles.card}><Text style={styles.sectionTitle}>Results and feedback</Text>{releasedGrades.slice(0, 5).map((item) => <View key={item.id} style={styles.detailRow}><View style={{ flex: 1 }}><Text style={styles.listTitle}>Assessment result</Text><Text style={styles.listMeta}>{item.feedback || "No feedback has been added yet."}</Text></View><Text style={styles.detailPill}>{item.score.toFixed(1)}</Text></View>)}{releasedGrades.length === 0 ? <Text style={styles.sectionBody}>The teacher has not released any marks or feedback yet.</Text> : null}</View><View style={styles.card}><Text style={styles.sectionTitle}>Teacher conversations</Text>{props.conversations.slice(0, 3).map((item) => <View key={item.id} style={styles.msg}><Text style={styles.listTitle}>{item.title || "Subject conversation"}</Text><Text style={styles.sectionBody}>{plainMessageText(item.preview) || "Open Messages to continue this conversation."}</Text></View>)}{props.conversations.length === 0 ? <Text style={styles.sectionBody}>No teacher conversations have started for this subject yet.</Text> : null}</View></ScrollView></SafeAreaView>;
}

function AbsenceReportPage(props: { childId: string | null; childName: string; parentId: string; onBack: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const send = async () => { if (!props.childId || reason.trim().length < 3) return setMessage("Enter a date and a short reason for the absence."); setSending(true); setMessage(null); const { error } = await supabase.from("parent_absence_reports").insert({ parent_id: props.parentId, student_id: props.childId, absence_date: date, reason: reason.trim() }); setSending(false); setMessage(error ? (error.code === "23505" ? "An absence report has already been sent for this date." : error.message) : "Absence report sent. The school has been notified."); if (!error) setReason(""); };
  return <SafeAreaView style={styles.safeArea}><StatusBar barStyle="light-content" /><ScrollView contentContainerStyle={styles.page}><Pressable onPress={props.onBack} style={styles.secondaryButton}><Text style={styles.secondaryText}>Back to dashboard</Text></Pressable><View style={styles.hero}><Text style={styles.kicker}>Attendance</Text><Text style={styles.title}>Report an absence</Text><Text style={styles.subtitle}>Let the school know if {props.childName} will be absent.</Text></View><View style={styles.card}><Text style={styles.sectionTitle}>Absence details</Text><Text style={styles.listMeta}>Date (YYYY-MM-DD)</Text><TextInput style={styles.toolInput} value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" /><Text style={styles.listMeta}>Reason</Text><TextInput style={styles.messageInput} value={reason} onChangeText={setReason} placeholder="For example: medical appointment" placeholderTextColor={colors.placeholder} multiline /><Pressable onPress={send} disabled={sending} style={[styles.primaryButton, sending && styles.primaryButtonDisabled]}><Text style={styles.primaryText}>{sending ? "Sending..." : "Send absence report"}</Text></Pressable>{message ? <Text style={styles.errorText}>{message}</Text> : null}</View></ScrollView></SafeAreaView>;
}

function AttendanceTab(props: { attendanceRate: number | null; attendance: Array<{ id: string; date: string; mark: string; note?: string | null }>; loading: boolean; }) {
  return <View style={styles.stack}><View style={styles.metric}><Text style={styles.metricValue}>{props.attendanceRate != null ? `${props.attendanceRate}%` : "--"}</Text><Text style={styles.metricLabel}>Current rate</Text></View><View style={styles.card}><Text style={styles.sectionTitle}>Recent records</Text>{props.loading ? <ActivityIndicator color={colors.primary} /> : null}{props.attendance.length === 0 && !props.loading ? <Text style={styles.sectionBody}>No attendance records yet.</Text> : null}{props.attendance.slice(0, 6).map((item) => <View key={item.id} style={styles.row}><View style={{ flex: 1 }}><Text style={styles.listTitle}>{item.date}</Text><Text style={styles.listMeta}>{item.note || "School attendance entry"}</Text></View><Text style={styles.listScore}>{item.mark}</Text></View>)}</View></View>;
}

function MessagesTab(props: {
  childName: string;
  conversations: ChildConversationItem[];
  subjectTeachers: ChildTeacherRecipientItem[];
  loading: boolean;
  errorMessage: string | null;
  sessionUserId: string | null;
  onReload: () => void;
}) {
  const [openRecipientId, setOpenRecipientId] = useState<string | null>(null);
  const openRecipient = props.subjectTeachers.find((item) => item.id === openRecipientId) || null;

  if (openRecipient) {
    return <ParentConversation recipient={openRecipient} sessionUserId={props.sessionUserId} onBack={() => setOpenRecipientId(null)} onReload={props.onReload} />;
  }

  return (
    <View style={styles.stack}>
      <View style={styles.metric}>
        <Text style={styles.metricValue}>{props.subjectTeachers.length}</Text>
        <Text style={styles.metricLabel}>Teachers</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Subject teachers</Text>
        <Text style={styles.sectionBody}>Choose a teacher assigned to {props.childName}, then send your message directly.</Text>
        {props.loading ? <ActivityIndicator color={colors.primary} /> : null}
        {props.errorMessage ? <Text style={styles.errorText}>{props.errorMessage}</Text> : null}
        {!props.loading && props.subjectTeachers.length === 0 ? <Text style={styles.sectionBody}>No subject teachers are linked yet.</Text> : null}
        <View style={styles.recipientStack}>
          {props.subjectTeachers.map((teacher) => {
            return (
              <Pressable
                key={teacher.id}
                onPress={() => setOpenRecipientId(teacher.id)}
                style={styles.recipientCard}
              >
                <Text style={styles.msgSubject}>{teacher.subjectName || "Subject"}</Text>
                <Text style={styles.listTitle}>{teacher.teacherName || "Teacher"}</Text>
                <Text style={styles.sectionBody}>{teacher.teacherRole || "Subject teacher"}</Text>
                <Text style={styles.listMeta}>{teacher.discussionId ? `${teacher.replyCount} replies - tap to open conversation` : "Tap to start a conversation"}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recent conversations</Text>
        {props.loading ? <ActivityIndicator color={colors.primary} /> : null}
        {props.conversations.length === 0 && !props.loading ? <Text style={styles.sectionBody}>No conversations yet.</Text> : null}
        {props.conversations.map((thread) => (
          <View key={thread.id} style={styles.msg}>
            <Text style={styles.msgSubject}>{thread.subjectName || "School"}</Text>
            <Text style={styles.listTitle}>{thread.title}</Text>
            <Text style={styles.sectionBody}>{plainMessageText(thread.preview) || "Message unavailable"}</Text>
            <Text style={styles.listMeta}>{thread.replyCount} replies • {thread.authorName || thread.authorRole || "Teacher"}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ParentConversation(props: { recipient: ChildTeacherRecipientItem; sessionUserId: string | null; onBack: () => void; onReload: () => void }) {
  const [replies, setReplies] = useState<Array<{ id: string; content: string; author_id: string; created_at: string }>>([]);
  const [discussionId, setDiscussionId] = useState<string | null>(props.recipient.discussionId);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!discussionId) { setReplies([]); return; }
    void supabase.from("discussion_replies").select("id, content, author_id, created_at").eq("discussion_id", discussionId).order("created_at", { ascending: true }).then(({ data, error: loadError }) => { if (loadError) setError(loadError.message); else setReplies((data || []) as Array<{ id: string; content: string; author_id: string; created_at: string }>); });
  }, [discussionId]);

  const send = async () => {
    const content = draft.trim();
    if (!content || !props.sessionUserId || sending) return;
    setSending(true); setError(null);
    let currentId = discussionId;
    if (!currentId) {
      const { data, error: createError } = await supabase.from("discussions").insert({ subject_id: props.recipient.subjectId, subject_class_id: props.recipient.subjectClassId, author_id: props.sessionUserId, title: `${props.recipient.subjectName || "Subject"} message`, content, read_by_users: [props.sessionUserId], subscribed_user_ids: [props.sessionUserId, props.recipient.teacherId].filter(Boolean) }).select("id").single();
      if (createError || !data) { setError(createError?.message || "Could not start this conversation."); setSending(false); return; }
      currentId = data.id; setDiscussionId(data.id);
    } else {
      const { data, error: replyError } = await supabase.from("discussion_replies").insert({ discussion_id: currentId, author_id: props.sessionUserId, content, read_by_users: [props.sessionUserId] }).select("id, content, author_id, created_at").single();
      if (replyError) { setError(replyError.message); setSending(false); return; }
      if (data) setReplies((current) => [...current, data as { id: string; content: string; author_id: string; created_at: string }]);
    }
    setDraft(""); setSending(false); props.onReload();
  };

  const bubble = (id: string, content: string, authorId: string, createdAt?: string) => { const own = authorId === props.sessionUserId; const message = plainMessageText(content) || "Message unavailable"; return <View key={id} style={[styles.chatBubbleWrap, own ? styles.chatOwn : styles.chatOther]}><View style={[styles.chatBubble, own ? styles.chatBubbleOwn : styles.chatBubbleOther]}><Text style={[styles.chatBubbleText, own && styles.chatBubbleTextOwn]}>{message}</Text></View><Text style={styles.listMeta}>{own ? "You" : props.recipient.teacherName || "Teacher"}{createdAt ? ` • ${new Date(createdAt).toLocaleString()}` : ""}</Text></View>; };
  return <View style={styles.stack}><Pressable onPress={props.onBack} style={styles.secondaryButton}><Text style={styles.secondaryText}>Back to teachers</Text></Pressable><View style={styles.card}><Text style={styles.msgSubject}>{props.recipient.subjectName || "Subject"}</Text><Text style={styles.sectionTitle}>{props.recipient.teacherName || "Teacher"}</Text><Text style={styles.sectionBody}>Private messages about your linked learner.</Text></View><View style={styles.card}>{discussionId && props.recipient.preview ? bubble("opening", props.recipient.preview, props.recipient.teacherId || "teacher") : <Text style={styles.sectionBody}>Start the conversation with a message below.</Text>}{replies.map((reply) => bubble(reply.id, reply.content, reply.author_id, reply.created_at))}</View><View style={styles.card}><TextInput style={styles.messageInput} placeholder="Write a message" placeholderTextColor={colors.placeholder} value={draft} onChangeText={setDraft} multiline /><Pressable onPress={send} disabled={!draft.trim() || sending} style={[styles.primaryButton, (!draft.trim() || sending) && styles.primaryButtonDisabled]}><Text style={styles.primaryText}>{sending ? "Sending..." : "Send"}</Text></Pressable>{error ? <Text style={styles.errorText}>{error}</Text> : null}</View></View>;
}

function MoreTab(props: { parentName: string; email: string; children: Array<{ id: string; fullName: string; gradeLabel?: string | null; classLabel?: string | null }>; onLogout: () => Promise<void>; }) {
  const { parent, updateParentProfile, updateParentPassword } = useAuth();
  const [editingProfile, setEditingProfile] = useState(false);
  const [fullName, setFullName] = useState(parent?.fullName || props.parentName);
  const [email, setEmail] = useState(props.email);
  const [avatarUrl, setAvatarUrl] = useState(parent?.avatarUrl || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    setFullName(parent?.fullName || props.parentName);
    setEmail(props.email);
    setAvatarUrl(parent?.avatarUrl || "");
  }, [parent, props.email, props.parentName]);

  const saveProfile = async () => {
    setSavingProfile(true);
    setStatusMessage(null);
    const result = await updateParentProfile({
      fullName: fullName.trim(),
      email: email.trim(),
      avatarUrl: avatarUrl.trim() || null,
    });
    setSavingProfile(false);
    setStatusMessage(result.success ? "Profile updated." : result.message || "Could not update profile.");
    if (result.success) setEditingProfile(false);
  };

  const savePassword = async () => {
    if (newPassword !== confirmPassword) {
      setStatusMessage("Passwords do not match.");
      return;
    }

    setSavingPassword(true);
    setStatusMessage(null);
    const result = await updateParentPassword(newPassword);
    setSavingPassword(false);
    setStatusMessage(result.success ? "Password updated." : result.message || "Could not update password.");
    if (result.success) {
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <View style={styles.stack}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account tools</Text>
        <Text style={styles.sectionBody}>Simple actions for parents who just need to update details, change a password, or sign out.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Profile</Text>
        {editingProfile ? (
          <View style={styles.toolStack}>
            <TextInput style={styles.toolInput} value={fullName} onChangeText={setFullName} placeholder="Full name" placeholderTextColor={colors.placeholder} />
            <TextInput style={styles.toolInput} value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={colors.placeholder} autoCapitalize="none" keyboardType="email-address" />
            <TextInput style={styles.toolInput} value={avatarUrl} onChangeText={setAvatarUrl} placeholder="Avatar URL" placeholderTextColor={colors.placeholder} autoCapitalize="none" />
            <View style={styles.toolRow}>
              <Pressable onPress={() => setEditingProfile(false)} style={styles.secondaryButton}><Text style={styles.secondaryText}>Cancel</Text></Pressable>
              <Pressable onPress={saveProfile} style={styles.primaryButton} disabled={savingProfile}><Text style={styles.primaryText}>{savingProfile ? "Saving..." : "Save profile"}</Text></Pressable>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.row}><Text style={styles.listTitle}>Name</Text><Text style={styles.listMeta}>{parent?.fullName || props.parentName}</Text></View>
            <View style={styles.row}><Text style={styles.listTitle}>Email</Text><Text style={styles.listMeta}>{props.email}</Text></View>
            <Pressable onPress={() => setEditingProfile(true)} style={styles.secondaryButton}><Text style={styles.secondaryText}>Edit profile</Text></Pressable>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Change password</Text>
        <Text style={styles.sectionBody}>Choose a new password for your parent account.</Text>
        <View style={styles.toolStack}>
          <PasswordField style={styles.toolInput} value={newPassword} onChangeText={setNewPassword} placeholder="New password" placeholderTextColor={colors.placeholder} />
          <PasswordField style={styles.toolInput} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm password" placeholderTextColor={colors.placeholder} />
          <Pressable onPress={savePassword} style={styles.primaryButton} disabled={savingPassword || !newPassword.trim() || !confirmPassword.trim()}>
            <Text style={styles.primaryText}>{savingPassword ? "Updating..." : "Update password"}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Linked profiles</Text>
        {props.children.map((child) => (
          <View key={child.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listTitle}>{child.fullName}</Text>
              <Text style={styles.listMeta}>
                {child.gradeLabel || "Grade pending"}
                {child.classLabel ? ` • ${child.classLabel}` : ""}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {statusMessage ? <Text style={styles.errorText}>{statusMessage}</Text> : null}

      <Pressable onPress={props.onLogout} style={styles.secondaryButton}>
        <Text style={styles.secondaryText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

function LoadingState({ onForceLogin }: { onForceLogin: () => void }) {
  const [showRecovery, setShowRecovery] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setShowRecovery(true), 5000); return () => clearTimeout(timer); }, []);
  return <SafeAreaView style={styles.safeArea}><View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.loadingText}>Loading parent portal...</Text>{showRecovery ? <><Text style={styles.loadingHelp}>Your session may have expired.</Text><Pressable onPress={onForceLogin} style={styles.recoveryButton}><Text style={styles.recoveryText}>Return to sign in</Text></Pressable></> : null}</View></SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  page: { padding: spacing.lg, paddingBottom: 140, gap: spacing.lg },
  topBar: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 },
  topBarTitle: { color: colors.white, fontSize: 24, fontWeight: "800" },
  topBarAction: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 21, backgroundColor: "rgba(255,255,255,0.12)" },
  pageHeading: { gap: 6, paddingTop: 4 },
  pageHeadingTitle: { color: colors.white, fontSize: 30, fontWeight: "800" },
  pageHeadingBody: { color: "#cbd5e1", fontSize: 14, lineHeight: 20 },
  authPage: { flexGrow: 1, padding: spacing.lg, justifyContent: "center", gap: spacing.lg },
  glowOne: { position: "absolute", top: -120, right: -80, width: 240, height: 240, borderRadius: 240, backgroundColor: "rgba(29, 78, 216, 0.10)" },
  glowTwo: { position: "absolute", top: 260, left: -100, width: 200, height: 200, borderRadius: 200, backgroundColor: "rgba(29, 78, 216, 0.06)" },
  hero: { padding: 18, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, gap: 6 },
  authHero: { gap: 8 },
  kicker: { color: colors.primary, fontSize: 12, letterSpacing: 1.3, textTransform: "uppercase", fontWeight: "700" },
  title: { color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: "800" },
  authTitle: { color: colors.text, fontSize: 30, lineHeight: 36, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  authSubtitle: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  childStrip: { gap: 10 },
  childChip: { minWidth: 180, padding: 12, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  childChipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  childName: { color: colors.text, fontWeight: "800", fontSize: 13 },
  childMeta: { color: colors.placeholder, fontSize: 12 },
  panel: { padding: 18, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, gap: 14 },
  stack: { gap: 14 },
  authToggle: { flexDirection: "row", gap: 10 },
  toggleRow: { flexDirection: "row", gap: 10 },
  toggleButton: { flex: 1, paddingVertical: 12, borderRadius: 18, alignItems: "center", backgroundColor: colors.field, borderWidth: 1, borderColor: colors.border },
  toggleActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  toggleText: { color: colors.placeholder, fontSize: 13, fontWeight: "700" },
  toggleTextActive: { color: colors.text },
  authCard: { padding: 18, borderRadius: 26, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, gap: 12 },
  emptyCard: { padding: 18, borderRadius: 26, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, gap: 12 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  sectionBody: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  input: { borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.field, color: colors.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  grid: { flexDirection: "row", gap: 10 },
  previewCard: { padding: 14, borderRadius: 18, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: "rgba(29, 78, 216, 0.18)", gap: 4 },
  previewLabel: { color: colors.primary, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: "700" },
  previewName: { color: colors.text, fontSize: 17, fontWeight: "800" },
  previewMeta: { color: colors.muted, fontSize: 13 },
  primaryButton: { backgroundColor: colors.primary, borderRadius: 16, alignItems: "center", justifyContent: "center", paddingVertical: 14 },
  primaryButtonDisabled: { backgroundColor: colors.placeholder },
  primaryButtonPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  primaryText: { color: colors.white, fontSize: 15, fontWeight: "800" },
  secondaryButton: { backgroundColor: colors.field, borderRadius: 16, alignItems: "center", justifyContent: "center", paddingVertical: 14, borderWidth: 1, borderColor: colors.border },
  secondaryText: { color: colors.text, fontSize: 15, fontWeight: "800" },
  errorText: { color: colors.danger, fontSize: 13, lineHeight: 18 },
  alertCard: { padding: 16, borderRadius: 20, backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", gap: 8 },
  alertText: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metric: { flexBasis: "48%", padding: 14, borderRadius: 20, backgroundColor: colors.field, borderWidth: 1, borderColor: colors.border, gap: 4 },
  heroMetric: { padding: 16, borderRadius: 20, backgroundColor: colors.field, borderWidth: 1, borderColor: colors.border, gap: 4 },
  metricValue: { color: colors.text, fontSize: 22, fontWeight: "800" },
  subjectAverage: { color: colors.primary, fontSize: 36, fontWeight: "800", lineHeight: 42 },
  metricLabel: { color: colors.placeholder, fontSize: 12 },
  metricNote: { color: colors.placeholder, fontSize: 13, lineHeight: 18 },
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickButton: { flexBasis: "48%", paddingVertical: 12, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.field, borderWidth: 1, borderColor: colors.border },
  quickText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  card: { padding: 16, borderRadius: 20, backgroundColor: colors.field, borderWidth: 1, borderColor: colors.border, gap: 10 },
  toolStack: { gap: 10 },
  toolRow: { flexDirection: "row", gap: 10 },
  toolInput: { borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, color: colors.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  subjectGrid: { gap: 10 },
  subjectTile: { padding: 14, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, gap: 8 },
  subjectTileActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  subjectTilePressed: { opacity: 0.96, transform: [{ scale: 0.995 }] },
  subjectTileTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  subjectStatsRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  subjectStat: { color: colors.placeholder, fontSize: 12, fontWeight: "700" },
  subjectAction: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  detailCard: { flexBasis: "48%", padding: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, gap: 4 },
  detailValue: { color: colors.text, fontSize: 18, fontWeight: "800" },
  detailLabel: { color: colors.placeholder, fontSize: 12 },
  detailSection: { gap: 10, marginTop: 4 },
  sectionSubTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  detailPill: { color: colors.primary, backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, fontWeight: "800", overflow: "hidden" },
  recipientStack: { gap: 10 },
  recipientCard: { padding: 14, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, gap: 4 },
  recipientCardActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  messageInput: { minHeight: 104, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, color: colors.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, textAlignVertical: "top" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  listTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  listMeta: { color: colors.placeholder, fontSize: 12 },
  listScore: { color: colors.primary, fontSize: 14, fontWeight: "800" },
  msg: { paddingVertical: 10, gap: 6, borderBottomWidth: 1, borderBottomColor: "rgba(203, 213, 225, 0.45)" },
  msgSubject: { color: colors.primary, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, fontWeight: "700" },
  chatBubbleWrap: { maxWidth: "86%", gap: 4 },
  chatOwn: { alignSelf: "flex-end", alignItems: "flex-end" },
  chatOther: { alignSelf: "flex-start", alignItems: "flex-start" },
  chatBubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 11 },
  chatBubbleOwn: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  chatBubbleOther: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderBottomLeftRadius: 4 },
  chatBubbleText: { color: colors.text, lineHeight: 20 },
  chatBubbleTextOwn: { color: colors.white },
  tabBar: { position: "absolute", left: spacing.lg, right: spacing.lg, bottom: 12, flexDirection: "row", gap: 4, padding: 8, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.98)", borderWidth: 1, borderColor: colors.border },
  tabButton: { flex: 1, minWidth: 0, paddingVertical: 10, alignItems: "center", justifyContent: "center", borderRadius: 16, gap: 4 },
  tabButtonActive: { backgroundColor: colors.primarySoft },
  tabLabel: { color: colors.placeholder, fontSize: 10, lineHeight: 12, fontWeight: "700" },
  tabLabelActive: { color: colors.text },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  loadingText: { color: colors.muted, fontSize: 14 },
  loadingHelp: { color: colors.placeholder, fontSize: 13, textAlign: "center", marginTop: 6 },
  recoveryButton: { backgroundColor: colors.primarySoft, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  recoveryText: { color: colors.primary, fontWeight: "800" },
});
