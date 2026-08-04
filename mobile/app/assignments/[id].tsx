import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { ArrowLeft, Upload, CheckCircle2, FileText } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useAssignmentsContext } from '../../src/context/AssignmentsContext';
import { useAuth } from '../../src/context/AuthContext';
import { HtmlContent } from '../../components/ui/html-content';
import { safeGoBack } from '../../src/lib/navigation';
import { useEffect } from 'react';

export default function AssignmentDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const { assignments, submissions, loading, addAssignmentSubmission, getRubric } = useAssignmentsContext();
  const [draftText, setDraftText] = useState('');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileUri, setSelectedFileUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) {
      router.replace('/(tabs)/assignments');
    }
  }, [params.id, router]);

  const assignment = useMemo(() => assignments.find((item) => item.id === params.id), [assignments, params.id]);
  const submission = useMemo(() => submissions.find((item) => item.assignmentId === params.id), [submissions, params.id]);
  const rubric = useMemo(() => (assignment ? getRubric(assignment.rubricId) : undefined), [assignment, getRubric]);

  const isSubmitted = submission?.status === 'submitted' || submission?.status === 'graded';
  const isGraded = submission?.status === 'graded' && submission?.isReleased;
  const allowPdf = assignment?.submissionType === 'pdf' || assignment?.submissionType === 'both';
  const allowText = assignment?.submissionType === 'text' || assignment?.submissionType === 'both';

  const handlePickPdf = async () => {
    setPickerError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setSelectedFileName(asset.name || 'assignment.pdf');
        setSelectedFileUri(asset.uri || null);
      }
    } catch (error) {
      console.error('Failed to pick PDF', error);
      setPickerError('Could not select the PDF. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!assignment || (!draftText.trim() && !selectedFileUri)) return;

    setSubmitting(true);
    let finalContent = draftText;

    try {
      if (selectedFileUri) {
        // Use expo-file-system and base64-arraybuffer to upload file reliably on React Native
        const { decode } = require('base64-arraybuffer');
        const FileSystem = require('expo-file-system/legacy');

        const base64 = await FileSystem.readAsStringAsync(selectedFileUri, {
          encoding: 'base64',
        });

        const fileName = selectedFileName || 'assignment.pdf';
        const cleanFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const filePath = `${assignment.id}/${user?.id || 'student'}/${Date.now()}_${cleanFileName}`;

        const { supabase } = require('../../src/lib/supabase');

        const { error: uploadError } = await supabase.storage
          .from('assignment-submissions')
          .upload(filePath, decode(base64), {
            contentType: 'application/pdf',
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage.from('assignment-submissions').getPublicUrl(filePath);
        if (data?.publicUrl) {
          finalContent = data.publicUrl;
        } else {
          throw new Error('Could not get public URL');
        }
      }

      await addAssignmentSubmission({
        assignmentId: assignment.id,
        studentId: user?.id,
        studentName: user?.name || 'Student',
        content: finalContent,
        fileType: selectedFileUri ? 'pdf' : 'text',
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        rubricGrades: {},
        overallFeedback: '',
        totalGrade: 0,
        isReleased: false,
      });
      setDraftText('');
      setSelectedFileName(null);
      setSelectedFileUri(null);
    } catch (error) {
      console.error('Submit failed', error);
      setPickerError('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ color: '#64748b', marginTop: 12 }}>Loading assignment...</Text>
      </View>
    );
  }

  if (!assignment) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>Assignment not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 }}>
      <TouchableOpacity onPress={() => safeGoBack(router, '/(tabs)/assignments')} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        <ArrowLeft color="#2563eb" size={18} />
        <Text style={{ marginLeft: 8, color: '#2563eb', fontWeight: '600' }}>Back</Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827' }}>{assignment.title}</Text>
      <Text style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
        {assignment.totalMarks} marks • {assignment.assessmentCategory || 'Assignment'}
      </Text>

      <View style={{ marginTop: 16, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, padding: 16, backgroundColor: '#f8fafc' }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 }}>Assignment details</Text>
        <HtmlContent html={assignment.description} />
      </View>

      {!isSubmitted ? (
        <View style={{ marginTop: 18, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, padding: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 }}>Submit your work</Text>

          {allowPdf ? (
            <TouchableOpacity onPress={handlePickPdf} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start' }}>
              <Upload color="#2563eb" size={16} />
              <Text style={{ color: '#2563eb', fontWeight: '600', marginLeft: 8 }}>Upload PDF</Text>
            </TouchableOpacity>
          ) : null}

          {selectedFileName ? (
            <Text style={{ fontSize: 12, color: '#374151', marginTop: 8 }}>Selected file: {selectedFileName}</Text>
          ) : null}

          {allowText ? (
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Text response</Text>
              <TextInput
                multiline
                value={draftText}
                onChangeText={setDraftText}
                placeholder="Type your essay or response here..."
                style={{ minHeight: 140, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, textAlignVertical: 'top', color: '#111827' }}
              />
            </View>
          ) : null}

          {pickerError ? <Text style={{ color: '#dc2626', fontSize: 12, marginTop: 8 }}>{pickerError}</Text> : null}

          {(!allowPdf || selectedFileUri || draftText.trim()) && (
            <TouchableOpacity onPress={handleSubmit} disabled={submitting} style={{ marginTop: 14, backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start' }}>
              {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Submit assignment</Text>}
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={{ marginTop: 18, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <CheckCircle2 color="#22c55e" size={18} />
            <Text style={{ marginLeft: 8, fontSize: 15, fontWeight: '700', color: '#111827' }}>Submission received</Text>
          </View>

          {submission?.fileType === 'pdf' ? (
            <Text style={{ marginTop: 8, color: '#374151' }}>Uploaded file: {decodeURIComponent(submission.content.split('/').pop() || '').split('_').slice(1).join('_') || submission.content}</Text>
          ) : (
            <Text style={{ marginTop: 8, color: '#374151' }}>Submitted text: {submission?.content}</Text>
          )}
        </View>
      )}

      {isGraded ? (
        <View style={{ marginTop: 18, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, padding: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Your result</Text>
          <Text style={{ fontSize: 14, color: '#374151', marginTop: 8 }}>Mark: {submission?.totalGrade ?? 0}/{assignment.totalMarks}</Text>
          {submission?.overallFeedback ? <Text style={{ fontSize: 14, color: '#374151', marginTop: 8 }}>Teacher feedback: {submission.overallFeedback}</Text> : null}

          {rubric ? (
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>Rubric</Text>
              {rubric.criteria.map((criterion) => (
                <View key={criterion.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151' }}>{criterion.title}</Text>
                    {criterion.description ? <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{criterion.description}</Text> : null}
                  </View>
                  <Text style={{ fontSize: 12, color: '#2563eb' }}>{submission?.rubricGrades?.[criterion.id] ?? 0}/{criterion.maxPoints}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}
