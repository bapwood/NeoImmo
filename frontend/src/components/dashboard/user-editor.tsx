// 'use client';

// import type { ChangeEvent, FormEvent } from 'react';
// import { useEffect, useState } from 'react';
// import Link from 'next/link';
// import { useRouter } from 'next/navigation';
// import { ApiError, requestJson } from '@/src/lib/api';
// import { readStoredSession } from '@/src/lib/auth';
// import { userFields, type FieldConfig } from '@/src/lib/dashboard-resources';
// import type { AuthSession, UserRecord } from '@/src/lib/types';

// type UserEditorProps = {
//   mode: 'create' | 'edit';
//   userId?: number;
// };

// type FormState = Record<string, string>;

// type Notice =
//   | { tone: 'error'; message: string }
//   | null;

// function buildEmptyForm(): FormState {
//   return Object.fromEntries(userFields.map((f) => [f.key, '']));
// }

// function userToFormState(user: UserRecord): FormState {
//   return Object.fromEntries(
//     userFields.map((field) => {
//       const value = user[field.key as keyof UserRecord];

//       if (Array.isArray(value)) {
//         return [field.key, value.join('\n')];
//       }

//       return [field.key, value == null ? '' : String(value)];
//     }),
//   );
// }

// function inputTypeFor(field: FieldConfig) {
//   if (field.kind === 'number') return 'number';
//   if (field.kind === 'email') return 'email';
//   if (field.kind === 'password') return 'password';
//   return 'text';
// }

// function normalizeValue(field: FieldConfig, raw: string) {
//   const v = raw.trim();

//   if (field.kind === 'number') return Number(v);

//   if (field.kind === 'array') {
//     return v.split(/\r?\n|,/).map((x) => x.trim()).filter(Boolean);
//   }

//   return v;
// }

// function buildPayload(state: FormState) {
//   return Object.fromEntries(
//     userFields.map((field) => [
//       field.key,
//       normalizeValue(field, state[field.key] ?? ''),
//     ]),
//   );
// }

// export default function UserEditor({ mode, userId }: UserEditorProps) {
//   const router = useRouter();

//   const [session, setSession] = useState<AuthSession | null>(null);
//   const [formState, setFormState] = useState<FormState>(() => buildEmptyForm());
//   const [loading, setLoading] = useState(mode === 'edit');
//   const [saving, setSaving] = useState(false);
//   const [notice, setNotice] = useState<Notice>(null);

//   useEffect(() => {
//     let cancelled = false;

//     async function init() {
//       const stored = readStoredSession();

//       if (!stored) {
//         router.replace('/signin');
//         return;
//       }

//       setSession(stored);

//       if (mode === 'create') {
//         setLoading(false);
//         return;
//       }

//       if (!userId) {
//         setNotice({ tone: 'error', message: 'Utilisateur introuvable.' });
//         setLoading(false);
//         return;
//       }

//       try {
//         const user = await requestJson<UserRecord>(
//           `/user/${userId}`,
//           undefined,
//           stored,
//         );

//         if (!cancelled) {
//           setFormState(userToFormState(user));
//         }
//       } catch (e) {
//         if (cancelled) return;

//         if (e instanceof ApiError && e.code === 'AUTH_EXPIRED') {
//           router.replace('/signin');
//           return;
//         }

//         setNotice({
//           tone: 'error',
//           message: e instanceof Error ? e.message : 'Erreur chargement user',
//         });
//       } finally {
//         if (!cancelled) setLoading(false);
//       }
//     }

//     void init();

//     return () => {
//       cancelled = true;
//     };
//   }, [mode, userId, router]);

//   function handleChange(
//     e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
//   ) {
//     const { name, value } = e.target;

//     setFormState((s) => ({
//       ...s,
//       [name]: value,
//     }));
//   }

//   async function handleSubmit(e: FormEvent<HTMLFormElement>) {
//     e.preventDefault();

//     if (!session) return;

//     setSaving(true);
//     setNotice(null);

//     try {
//       await requestJson<UserRecord>(
//         mode === 'edit' ? `/user/${userId}` : `/user`,
//         {
//           method: mode === 'edit' ? 'PATCH' : 'POST',
//           body: JSON.stringify(buildPayload(formState)),
//         },
//         session,
//       );

//       router.push('/?panel=user');
//       router.refresh();
//     } catch (err) {
//       if (err instanceof ApiError && err.code === 'AUTH_EXPIRED') {
//         router.replace('/signin');
//         return;
//       }

//       setNotice({
//         tone: 'error',
//         message: err instanceof Error ? err.message : 'Erreur enregistrement',
//       });
//     } finally {
//       setSaving(false);
//     }
//   }

//   return (
//     <main className="editor-page-shell">
//       <header className="panel-surface editor-page-header">
//         <div>
//           <div className="eyebrow">Utilisateurs</div>
//           <h1>{mode === 'edit' ? 'Modifier un utilisateur' : 'Créer un utilisateur'}</h1>
//         </div>

//         <div className="editor-header-actions">
//           <Link href="/?panel=user" className="ghost-button">
//             Retour
//           </Link>
//         </div>
//       </header>

//       <section className="editor-grid">
//         <article className="panel-surface editor-form-card">
//           {notice && (
//             <div className="notice notice-error">{notice.message}</div>
//           )}

//           {loading ? (
//             <div>Chargement...</div>
//           ) : (
//             <form onSubmit={handleSubmit} className="editor-form-grid">
//               {userFields.map((field) => {
//                 const isTextarea =
//                   field.kind === 'textarea' || field.kind === 'array';

//                 return (
//                   <label key={field.key}>
//                     <span>{field.label}</span>

//                     {isTextarea ? (
//                       <textarea
//                         name={field.key}
//                         value={formState[field.key] ?? ''}
//                         onChange={handleChange}
//                       />
//                     ) : (
//                       <input
//                         name={field.key}
//                         type={inputTypeFor(field)}
//                         value={formState[field.key] ?? ''}
//                         onChange={handleChange}
//                       />
//                     )}
//                   </label>
//                 );
//               })}

//               <div className="form-actions">
//                 <button type="submit" disabled={saving}>
//                   {saving
//                     ? 'Enregistrement...'
//                     : mode === 'edit'
//                     ? 'Mettre à jour'
//                     : 'Créer'}
//                 </button>

//                 <Link href="/?panel=user">Annuler</Link>
//               </div>
//             </form>
//           )}
//         </article>
//       </section>
//     </main>
//   );
// }