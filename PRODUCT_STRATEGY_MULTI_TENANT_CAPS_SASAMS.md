# Product strategy: multi-tenant, CAPS-aligned LMS

## Product vision

Build a secure South African school platform that enables many schools to deliver CAPS-aligned teaching, assessment, reporting and parent communication from one product, while producing validated, **SA-SAMS-ready exports**.

The product complements rather than replaces SA-SAMS. SA-SAMS remains the school and education authority's administrative system of record. The LMS should remove duplicate teacher work by managing curriculum delivery, evidence, marking, moderation, attendance workflows and reporting preparation in one place.

> Positioning: **A multi-tenant, CAPS-aligned LMS for teaching, assessment, reporting and SA-SAMS-ready exports.**

Do not describe the product as "SA-SAMS integrated", "SA-SAMS certified" or a replacement for SA-SAMS unless the relevant Provincial Education Department (PED) or DBE has approved a supported interface and that claim.

## Why this product is credible now

The current application already has the core of a single-school LMS:

- Principal, teacher, learner and parent experiences
- Subjects, register classes and subject classes
- Lessons, notes, videos and resources
- Quizzes, formal assessments, submissions, rubrics and grading queues
- Assessment availability windows, categories and contribution weights
- Gradebook, attendance, notifications, discussions and analytics
- A parent mobile client

The gaps are structural rather than conceptual: data access assumes one school, reporting is not yet policy-driven, and the app does not yet have a formal curriculum, Programme of Assessment (PoA), moderation or export layer.

## Target customers and commercial model

### First market

Prioritise independent schools and well-resourced public schools that can procure through their School Governing Body (SGB). They have the fastest sales cycle and can validate the product before a departmental rollout.

### Public-school routes

| Route | Buyer | How it works |
|---|---|---|
| Direct SaaS sale | Independent school | Direct contract, annual school or active-learner price |
| SGB-funded public school | SGB / school | School budget and approved local procurement process |
| Sponsored pilot | NGO, CSI funder or school group | Funder pays, with a documented data-processing and support arrangement |
| District, PED or DBE rollout | Government buyer | Formal tender, framework or approved procurement route |

South African law principally distinguishes public and independent schools; "semi-public" is not a standard national legal category. For public schools, the SGB manages the school fund and must take reasonable measures to supplement state resources to improve education. Procurement authority, thresholds and delegated functions must be confirmed with the individual school and its province.

### Pricing model

- Standard: annual per-active-learner fee with a minimum school fee
- Premium: school branding, SSO, advanced analytics, parent messaging and priority support
- District/PED: volume price, implementation, training, support and data-migration services priced separately
- Enterprise: optional dedicated data environment after the shared-platform model is mature

Use ZAR pricing. Include a transparent VAT position, data/storage allowance, onboarding, training and support terms.

## Multi-tenant product architecture

### Recommended model

Use a **shared Supabase database and shared schema**, with an explicit `organisation_id` (school tenant) on every tenant-owned record. This is the fastest and most economical approach for the current codebase.

It provides a single product to maintain while database Row Level Security (RLS) prevents one school from accessing another school's records.

| Model | Use case | Decision |
|---|---|---|
| Shared schema + `organisation_id` | Standard SaaS schools | Recommended now |
| Schema per school | A limited number of bespoke clients | Avoid initially; upgrade complexity is high |
| Database/project per school | Large, regulated enterprise deployment | Offer later only where commercially justified |
| Hybrid | Standard shared product plus dedicated enterprise option | Future option |

### Tenant data model

Introduce these foundational tables:

```text
organisations
  id, name, slug, emis_number, province, district, status, plan, branding

campuses
  id, organisation_id, name, emis_number, address

organisation_memberships
  id, organisation_id, user_id, role, campus_id, active_from, active_to

subscriptions / feature_entitlements
  organisation_id, plan, billing_status, enabled_features
```

Add `organisation_id` to every school-owned entity, including profiles/memberships, learners, grades, subjects, classes, enrolments, lessons, assessments, submissions, rubrics, attendance, notifications, discussions, analytics and report artefacts.

Use either `schoolname.yourdomain.co.za` or `yourdomain.co.za/s/schoolname` to select the school experience. A person may belong to more than one organisation, so a school should be selected from memberships after sign-in rather than stored as one permanent value on the user record.

### Security rules

1. The browser must never be trusted to authorise an `organisation_id`.
2. RLS must derive access from `auth.uid()` and `organisation_memberships`.
3. Every list, read, update, delete and insert must enforce tenant ownership.
4. Teachers must be restricted further to their assigned subjects/classes; parents to linked learners; learners to themselves and their enrolments.
5. School-level administrative roles must not have platform-super-admin access.
6. Every sensitive change needs an audit event: actor, tenant, timestamp, entity, before/after summary and reason where required.

### Storage and identity

- Use private buckets and paths such as `organisation_id/learner_id/assessment_id/file`.
- Deliver files using short-lived signed URLs after an RLS/membership authorisation check.
- Store passwords only in Supabase Auth. Do not persist or return plaintext PINs in `profiles`, API responses or client state.
- Use password reset, OTP or one-time temporary credentials for account activation.

### Current priority risks to fix

- Several current data queries and policies are single-school/global in character and will leak data if reused for multiple schools.
- Some current RLS policies use broad access patterns such as `USING (true)` and must become organisation-scoped.
- Lesson and attachment storage policies are public and need private, tenant-aware delivery.
- Account creation presently authorises by role only; it must prove that the caller is entitled to create users in the target organisation.
- SQL changes are split between migrations and manually run support scripts. Establish one versioned baseline before production migration.

## CAPS-aligned curriculum and assessment model

CAPS alignment is not a label on a subject. It is a traceable chain from curriculum requirements through teaching, assessment evidence and reporting.

```text
Academic year → Grade → Subject → Term → CAPS topic/skill
→ planned lesson → formal/informal assessment → evidence
→ mark and achievement level → moderation → report result
```

### CAPS library

Create a curated curriculum library that is versioned by academic year:

- Phase: Foundation, Intermediate, Senior or FET
- Grade, subject, subject language/level and curriculum version
- Term, week, topic/content area, skills and required coverage
- Formal assessment requirements and Programme of Assessment (PoA) templates
- Links to the applicable DBE source document and revision date

Teachers select a school-approved template, then tailor teaching activities and task wording. They should not have to reconstruct the PoA in each class.

### Programme of Assessment and SBA

Extend current assessments into formal policy-aware records:

```text
assessment_programmes
  organisation_id, academic_year, grade_id, subject_id, approval_status

assessment_tasks
  programme_id, term, task_type, caps_reference, total_marks, weighting,
  due_date, formal_flag, moderation_required

assessment_results
  learner_id, task_id, raw_mark, percentage, achievement_level,
  result_status, captured_by, captured_at

moderation_records
  task_id, sample/learner_id, moderator_id, outcome, adjustment, comments

learner_evidence
  learner_id, task_id, submission/reference, rubric, teacher_feedback
```

The system should:

- Create the required task structure for a selected grade/subject/year
- Display PoA completeness and flag missing tasks or marks
- Validate totals, weights and task dates before a reporting cycle closes
- Allow absent, exempt, incomplete and irregularity statuses rather than forcing a numeric mark
- Preserve submitted evidence, rubric decisions, teacher comments and moderation records
- Lock approved reporting periods; process any later correction as an auditable amendment

### Teacher workflow

1. Select academic year, grade, subject and approved PoA template.
2. Plan lessons against CAPS topics and mark coverage as taught.
3. Create assessments from the corresponding formal task template.
4. Capture submissions, marks, rubric outcomes and support comments.
5. Complete internal/HOD moderation where the school requires it.
6. Resolve validation errors and submit the term for sign-off.
7. Generate record sheets, learner reports and the SA-SAMS-ready export.

## SA-SAMS-ready reporting and exports

### Principle

Create a stable LMS canonical model, then generate validated export files. Do not couple the application directly to an undocumented SA-SAMS database or promise a direct live interface.

```text
LMS academic records
  → data-quality and policy validation
  → versioned SA-SAMS export adapter
  → CSV/XLSX export for school review/import
```

The export format must be versioned by academic year and, if necessary, province. Validate it with the school SA-SAMS administrator before it is used in a live reporting cycle.

### Outputs to build

- Teacher record sheet: class, subject, assessment dates, activities, marks and support comments
- Subject mark schedule: all learners, task totals, calculated result, achievement level and moderation state
- Learner term report card: subject results, promotion-support comments, attendance summary and authorised sign-off
- Principal/HOD completion dashboard: incomplete PoA tasks, missing marks, failed validations and moderation status
- SA-SAMS-ready export: learner identifiers, grade/class, subject results, rating/level, promotion-related fields and attendance totals as required by the applicable workflow
- Data-quality report: duplicates, missing identifiers, invalid marks, invalid enrolments, incomplete assessment requirements and unexplained attendance

### Attendance

Maintain daily attendance with reasons, late/early flags and audit history. Provide class summaries, monthly/quarterly reporting, parent follow-up and a consecutive-unexplained-absence alert. Attendance totals should flow into term and promotion schedules where required.

## Required public-school master data

Make these structured and tenant-specific, with fields configurable by school/province:

- EMIS number, province, district, circuit, campus and school phase
- Academic year, term calendar, grade, register class and subject class
- Learner legal names, supported identity document type/number, date of birth, sex, citizenship and home language
- Parent/guardian and contact details, addresses and approved communication preferences
- Admission, transfer, grade repetition and exit history
- Educator/staff identifiers, assigned grade/classes/subjects and permissions
- Learner-support and accommodation records with restricted access

Personal information must be handled under POPIA: least-privilege access, logging, retention rules, export/deletion procedures, operator agreements and a documented breach response.

## Product roadmap

### Phase 0 — foundation and safety

- Document the live schema and establish a single migration baseline
- Audit every RLS policy, query and storage policy
- Remove plaintext credential storage and public learning-file access
- Add automated tenant-isolation tests
- Introduce audit events and secure platform administration

### Phase 1 — multi-tenant core

- Add organisations, campuses, memberships, plan and feature models
- Backfill the current school as the first organisation
- Add `organisation_id`, indexes and foreign-key constraints to all tenant data
- Make login, navigation, branding and provisioning tenant aware
- Rewrite RLS and account provisioning around memberships

### Phase 2 — CAPS teaching and assessment

- Build the versioned CAPS library and curriculum coverage planner
- Implement PoA templates and task validation
- Expand assessment outcomes, evidence, moderation and audit trails
- Add principal/HOD CAPS coverage and assessment-completeness dashboards

### Phase 3 — reporting and SA-SAMS-ready exports

- Build record sheets, term reports, schedules and sign-off workflow
- Add attendance summaries and alerts
- Implement versioned export adapters and validation reports
- Pilot with one school, reconcile every result with its SA-SAMS administrator and correct gaps

### Phase 4 — commercial scale

- School self-onboarding and white-label branding
- Subscription/billing and feature entitlements
- Training, support centre, status monitoring and backups
- SSO and selected communications/payment integrations
- Dedicated-environment option for enterprise customers

## Pilot success criteria

Run a term-long pilot at one CAPS school. The pilot succeeds only when:

- Each teacher can plan and record curriculum coverage against an approved template.
- The required PoA is configured and incomplete work is visible before reporting.
- Teachers capture marks once; reports and export data are generated from that source.
- Moderation and any amendment are traceable.
- A SA-SAMS administrator verifies the export and reconciliation process.
- No user from one school can read, modify or download another school's data.
- School leadership signs off on usability, parent communication and support processes.

## Procurement and sales readiness

Maintain a buyer-ready pack containing:

- Company registration, tax compliance, CSD registration and BBBEE documentation where applicable
- POPIA operator/data-processing agreement and privacy notice
- Security architecture, hosting/data-location statement, RLS model, backups and incident process
- CAPS/SA-SAMS-ready capability statement and clear scope limitations
- Service-level agreement, support hours, training plan and escalation path
- Price schedule, VAT treatment, data/storage limits and exit/export policy
- Accessibility, mobile/low-data and offline-resilience approach

## Sources and policy references

- [DBE CAPS documents](https://www.education.gov.za/Curriculum/NCSGradesR12/CAPS/tabid/420/Default.aspx)
- [National Protocol for Assessment Grades R–12](https://www.education.gov.za/Portals/0/Documents/Policies/NatProtAssess.pdf)
- [DBE SA-SAMS modernisation update](https://www.education.gov.za/ArchivedDocuments/ArchivedArticles/Data-DrivenEducationManagement.aspx)
- [DBE description of SA-SAMS learner, attendance and reporting functions](https://www.education.gov.za/Portals/0/Media/Parliamentary%20Questions/2022/NA%201152.pdf)
- [South African Schools Act](https://www.gov.za/nso/documents/south-african-schools-act)
- [SASA school funds and SGB responsibilities](https://www.education.gov.za/Portals/0/Documents/Publications/South%20African%20Schools%20Act.pdf)
- [DBE public procurement opportunities](https://www.education.gov.za/Tenders/AdvertisedTenders.aspx)
- [DBE POPIA guidelines](https://www.education.gov.za/Portals/0/Documents/Manuals/Guidelines%20for%20DBE%20POPIA.pdf)

## Immediate next decision

Approve the shared-schema multi-tenant model and nominate one pilot CAPS school. Then begin Phase 0 and Phase 1 before adding further learning features. Tenant safety and reliable academic data are prerequisites for a credible CAPS/SA-SAMS-ready product.
