-- ==============================================================================
-- CAMPUS DOCUMENT HUB - SEED DATA FOR SUPABASE
-- Run this in your Supabase SQL Editor after executing schema.sql
-- ==============================================================================

-- 1. SEED PROFILES (Mock UUIDs can be replaced by real auth.users UUIDs)
INSERT INTO public.profiles (id, full_name, year, semester, department, avatar_url)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Priya Sharma', '3rd Year', 'Sem 5', 'Computer Science & Engineering', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'),
    ('a0000000-0000-0000-0000-000000000002', 'Arjun Mehta', '3rd Year', 'Sem 5', 'Computer Science & Engineering', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'),
    ('a0000000-0000-0000-0000-000000000003', 'Sneha Patel', '4th Year', 'Sem 7', 'Information Technology', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
    ('a0000000-0000-0000-0000-000000000004', 'Rohan Verma', '2nd Year', 'Sem 3', 'Electronics & Communication', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'),
    ('a0000000-0000-0000-0000-000000000005', 'Ananya Das', '3rd Year', 'Sem 5', 'Computer Science & Engineering', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO NOTHING;

-- 2. SEED DOCUMENTS
INSERT INTO public.documents (id, title, type, semester, subject, uploader_id, deadline, file_path, file_name, file_size, file_type, page_count)
VALUES
    ('d0000000-0000-0000-0000-000000000001', 'Operating Systems - Experiment 5: Banker''s Algorithm & Deadlock Avoidance', 'Experiment', 'Sem 5', 'Operating Systems (CSE-501)', 'a0000000-0000-0000-0000-000000000001', NOW() + INTERVAL '6 days', 'a0000000-0000-0000-0000-000000000001/doc_os_exp5_priya.pdf', 'OS_Exp5_Bankers_Algorithm_Priya.pdf', 1420000, 'application/pdf', 5),
    ('d0000000-0000-0000-0000-000000000002', 'OS Lab Experiment 5 - Banker''s Deadlock Detection & Safe State Simulation', 'Experiment', 'Sem 5', 'Operating Systems (CSE-501)', 'a0000000-0000-0000-0000-000000000002', NOW() + INTERVAL '6 days', 'a0000000-0000-0000-0000-000000000002/doc_os_exp5_arjun.pdf', 'OS_Lab_Exp5_Safe_Sequence_Arjun.pdf', 1850000, 'application/pdf', 6),
    ('d0000000-0000-0000-0000-000000000003', 'Database Management Systems Midsem Exam Paper (2025 Autumn with Solutions)', 'Midsem Paper', 'Sem 5', 'DBMS (CSE-502)', 'a0000000-0000-0000-0000-000000000001', NULL, 'a0000000-0000-0000-0000-000000000001/doc_dbms_midsem_2025.pdf', 'DBMS_Midsem_Exam_2025_Solved.pdf', 2150000, 'application/pdf', 4),
    ('d0000000-0000-0000-0000-000000000004', 'Computer Networks - Assignment 2: Subnetting & CIDR Calculation Problems', 'Assignment', 'Sem 5', 'Computer Networks (CSE-503)', 'a0000000-0000-0000-0000-000000000005', NOW() + INTERVAL '4 days', 'a0000000-0000-0000-0000-000000000005/doc_cn_assign2_ananya.pdf', 'CN_Assignment_2_Subnetting.pdf', 980000, 'application/pdf', 3),
    ('d0000000-0000-0000-0000-000000000005', 'Data Structures & Algorithms - Complete Notes on AVL Trees & Red-Black Trees', 'Notes', 'Sem 3', 'DSA (CSE-301)', 'a0000000-0000-0000-0000-000000000001', NULL, 'a0000000-0000-0000-0000-000000000001/doc_dsa_trees_notes_priya.pdf', 'DSA_Unit3_Self_Balancing_Trees.pdf', 3400000, 'application/pdf', 8)
ON CONFLICT (id) DO NOTHING;

-- 3. SEED DOCUMENT PAGES FOR GRANULAR AI SEARCH
INSERT INTO public.document_pages (document_id, page_number, content)
VALUES
    ('d0000000-0000-0000-0000-000000000001', 1, 'Operating Systems Lab Experiment 5. Objective: Implementation of Banker''s Algorithm for Deadlock Avoidance. Theory: Deadlock occurs when processes hold resources and wait for others.'),
    ('d0000000-0000-0000-0000-000000000001', 2, 'Data Structures: Available Vector, Max Matrix, Allocation Matrix, Need Matrix. Need[i][j] = Max[i][j] - Allocation[i][j]. Safety Algorithm step-by-step logic.'),
    ('d0000000-0000-0000-0000-000000000001', 3, 'Resource Request Algorithm: Request_i <= Need_i and Request_i <= Available. Sample problem with 5 processes P0..P4 and 3 resource types A, B, C.'),
    ('d0000000-0000-0000-0000-000000000001', 4, 'C Implementation Code: Safe sequence <P1, P3, P4, P0, P2>. Output screenshots displaying safe state verification and request granting.'),
    ('d0000000-0000-0000-0000-000000000002', 1, 'OS Lab Experiment 5: Banker''s Algorithm Deadlock Simulation by Arjun Mehta. Process synchronization, mutual exclusion, circular wait.'),
    ('d0000000-0000-0000-0000-000000000002', 2, 'Formal definition of Safe State and safe sequence <P1, P2, ... Pn>.'),
    ('d0000000-0000-0000-0000-000000000003', 1, 'DBMS Midsem Exam Paper 2025. Relational algebra operators, ER models, candidate keys.'),
    ('d0000000-0000-0000-0000-000000000003', 2, 'Question 3: Functional Dependencies and Normalization to 3NF and BCNF.'),
    ('d0000000-0000-0000-0000-000000000004', 1, 'Computer Networks Assignment 2: Subnetting, Supernetting, and CIDR prefix allocation.')
ON CONFLICT DO NOTHING;
