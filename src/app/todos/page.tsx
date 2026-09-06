import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';

export default async function TodosPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: todos, error } = await supabase.from('todos').select();

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1C1D1F] p-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm border border-[#E8E8E3] p-6">
        <h1 className="text-xl font-bold text-[#1C1D1F] mb-2 font-display">Supabase Server Component</h1>
        <p className="text-sm text-[#64666E] mb-4">
          Rendered server-side using <code className="bg-[#FAFAF8] px-1.5 py-0.5 rounded border border-[#E8E8E3]">@/utils/supabase/server</code>
        </p>

        {error ? (
          <div className="bg-[#FFE588]/30 border border-[#FFE588] text-[#1C1D1F] p-3 rounded-lg text-xs mb-4">
            Supabase connected. The <code>todos</code> table does not exist yet or has RLS enabled (campus tables like <code>documents</code> and <code>profiles</code> are active).
          </div>
        ) : (
          <ul className="divide-y divide-[#E8E8E3] text-sm">
            {todos?.map((todo: { id: string | number; name: string }) => (
              <li key={todo.id} className="py-2">{todo.name}</li>
            ))}
            {(!todos || todos.length === 0) && (
              <li className="py-2 text-[#64666E] italic">No todos found in table.</li>
            )}
          </ul>
        )}

        <div className="mt-6 pt-4 border-t border-[#E8E8E3]">
          <Link
            href="/"
            className="text-sm font-medium text-[#60B5FF] hover:underline"
          >
            &larr; Return to Campus Document Hub
          </Link>
        </div>
      </div>
    </div>
  );
}
