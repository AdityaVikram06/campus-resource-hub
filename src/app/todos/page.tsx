'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import Link from 'next/link';

interface Todo {
  id: string | number;
  name?: string;
  title?: string;
}

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function getTodos() {
      setLoading(true);
      try {
        const { data, error: queryErr } = await supabase.from('todos').select();
        if (queryErr) {
          setError(queryErr.message);
        } else if (data) {
          setTodos(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to query todos');
      } finally {
        setLoading(false);
      }
    }

    getTodos();
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1C1D1F] p-8">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-[#E8E8E3] p-6">
        <h1 className="text-xl font-bold text-[#1C1D1F] mb-2 font-poppins">Supabase Client Component</h1>
        <p className="text-xs text-[#64666E] mb-4">
          Fetched via <code className="bg-[#FAFAF8] px-1.5 py-0.5 rounded border border-[#E8E8E3]">@/utils/supabase</code>
        </p>

        {loading ? (
          <p className="text-xs text-[#64666E]">Connecting to Supabase...</p>
        ) : error ? (
          <div className="bg-[#FFE588]/30 border border-[#FFE588] text-[#1C1D1F] p-3 rounded-xl text-xs mb-4">
            Connected to Supabase. Note: <code>{error}</code> (the <code>todos</code> table can be created in Supabase SQL editor; campus tables like <code>documents</code> and <code>profiles</code> are active).
          </div>
        ) : (
          <ul className="divide-y divide-[#E8E8E3] text-sm">
            {todos.map((todo) => (
              <li key={todo.id} className="py-2">{todo.name || todo.title || JSON.stringify(todo)}</li>
            ))}
            {todos.length === 0 && (
              <li className="py-2 text-[#64666E] italic text-xs">No todos found in table.</li>
            )}
          </ul>
        )}

        <div className="mt-6 pt-4 border-t border-[#E8E8E3]">
          <Link
            href="/"
            className="text-xs font-bold text-[#60B5FF] hover:underline"
          >
            &larr; Return to Campus Document Hub
          </Link>
        </div>
      </div>
    </div>
  );
}
