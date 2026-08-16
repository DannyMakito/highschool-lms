import { supabase } from "./supabase";

export type ParentAccessStudent = {
  id: string;
  fullName: string;
  administrationNumber?: string | null;
  gradeLabel?: string | null;
  classLabel?: string | null;
};

type ParentAccessRow = {
  access_key_id?: string;
  student_id?: string;
  student_full_name?: string;
  full_name?: string;
  administration_number?: string | null;
  grade_label?: string | null;
  class_label?: string | null;
};

export type ParentRegistrationInput = {
  accessKey: string;
  firstName: string;
  surname: string;
  cellphone: string;
  email?: string;
  password: string;
};

type VerifyParentAccessResult =
  | { success: true; accessKey: string; student: ParentAccessStudent }
  | { success: false; message: string };

type ParentRegistrationResult =
  | { success: true; needsConfirmation: boolean }
  | { success: false; message: string };

export function normalizeAccessKey(accessKey: string) {
  return accessKey.trim().replace(/\s+/g, "").toUpperCase();
}

export async function verifyParentAccessKey(accessKey: string): Promise<VerifyParentAccessResult> {
  const normalizedKey = normalizeAccessKey(accessKey);
  if (!normalizedKey) {
    return { success: false, message: "Enter the access key from the school." };
  }

  const { data, error } = await supabase.rpc("verify_parent_access_key", {
    p_access_key: normalizedKey,
  });

  if (error) {
    return { success: false, message: error.message };
  }

  const row = (Array.isArray(data) ? data[0] : data) as ParentAccessRow | null;
  if (!row?.student_id) {
    return { success: false, message: "We could not find an active learner for this key." };
  }

  return {
    success: true,
    accessKey: normalizedKey,
    student: {
      id: row.student_id,
      fullName: row.student_full_name || row.full_name || "Learner",
      administrationNumber: row.administration_number || null,
      gradeLabel: row.grade_label || null,
      classLabel: row.class_label || null,
    } satisfies ParentAccessStudent,
  };
}

export async function registerParentWithAccessKey(input: ParentRegistrationInput): Promise<ParentRegistrationResult> {
  const accessKey = normalizeAccessKey(input.accessKey);
  const firstName = input.firstName.trim();
  const surname = input.surname.trim();
  const cellphone = input.cellphone.trim();
  const email = input.email?.trim().toLowerCase() || undefined;
  const password = input.password.trim();
  const fullName = `${firstName} ${surname}`.trim();

  if (!accessKey || !firstName || !surname || !cellphone || !password) {
    return { success: false, message: "Complete the required fields before continuing." };
  }

  const credentials = email ? { email, password } : { phone: cellphone, password };
  const { data, error } = await supabase.auth.signUp({
    ...credentials,
    options: {
      data: {
        full_name: fullName,
        first_name: firstName,
        surname,
        cellphone,
        role: "parent",
      },
    },
  });

  if (error) {
    return { success: false, message: error.message };
  }

  if (!data.user?.id) {
    return { success: false, message: "Supabase did not return a parent user." };
  }

  const { error: claimError } = await supabase.rpc("claim_parent_access_key", {
    p_access_key: accessKey,
    p_parent_id: data.user.id,
    p_full_name: fullName,
    p_cellphone: cellphone,
    p_email: email || null,
  });

  if (claimError) {
    return { success: false, message: claimError.message };
  }

  return { success: true, needsConfirmation: !data.session };
}
