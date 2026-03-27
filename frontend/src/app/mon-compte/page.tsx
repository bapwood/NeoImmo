import { redirect } from 'next/navigation';

export default function MonComptePage() {
  redirect('/?panel=user');
}
