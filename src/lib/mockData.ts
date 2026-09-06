import { DocumentItem, Profile, DocumentPage } from '@/types';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const MOCK_CURRENT_USER: Profile = {
  id: 'usr_priya_sharma_001',
  full_name: 'Priya Sharma',
  year: '3rd Year',
  semester: 'Sem 5',
  department: 'Computer Science & Engineering',
  avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  created_at: '2026-08-15T09:30:00Z',
  updated_at: '2026-09-01T14:20:00Z',
};

export const MOCK_PROFILES: Record<string, Profile> = {
  usr_priya_sharma_001: MOCK_CURRENT_USER,
  usr_arjun_mehta_002: {
    id: 'usr_arjun_mehta_002',
    full_name: 'Arjun Mehta',
    year: '3rd Year',
    semester: 'Sem 5',
    department: 'Computer Science & Engineering',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    created_at: '2026-08-16T11:00:00Z',
    updated_at: '2026-08-25T16:45:00Z',
  },
  usr_sneha_patel_003: {
    id: 'usr_sneha_patel_003',
    full_name: 'Sneha Patel',
    year: '4th Year',
    semester: 'Sem 7',
    department: 'Information Technology',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    created_at: '2026-08-10T08:15:00Z',
    updated_at: '2026-09-02T10:10:00Z',
  },
  usr_rohan_verma_004: {
    id: 'usr_rohan_verma_004',
    full_name: 'Rohan Verma',
    year: '2nd Year',
    semester: 'Sem 3',
    department: 'Electronics & Communication',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    created_at: '2026-08-18T14:40:00Z',
    updated_at: '2026-08-30T12:00:00Z',
  },
  usr_ananya_das_005: {
    id: 'usr_ananya_das_005',
    full_name: 'Ananya Das',
    year: '3rd Year',
    semester: 'Sem 5',
    department: 'Computer Science & Engineering',
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    created_at: '2026-08-20T10:00:00Z',
    updated_at: '2026-09-03T18:30:00Z',
  },
};

export const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc_os_exp5_priya',
    title: 'Operating Systems - Experiment 5: Banker\'s Algorithm & Deadlock Avoidance',
    type: 'Experiment',
    semester: 'Sem 5',
    subject: 'Operating Systems (CSE-501)',
    uploader_id: 'usr_priya_sharma_001',
    deadline: '2026-09-12T23:59:00Z',
    file_path: 'usr_priya_sharma_001/doc_os_exp5_priya.pdf',
    file_name: 'OS_Exp5_Bankers_Algorithm_Priya.pdf',
    file_size: 1420000,
    file_type: 'application/pdf',
    page_count: 5,
    created_at: '2026-09-04T10:15:00Z',
    uploader: MOCK_PROFILES['usr_priya_sharma_001'],
  },
  {
    id: 'doc_os_exp5_arjun',
    title: 'OS Lab Experiment 5 - Banker\'s Deadlock Detection & Safe State Simulation',
    type: 'Experiment',
    semester: 'Sem 5',
    subject: 'Operating Systems (CSE-501)',
    uploader_id: 'usr_arjun_mehta_002',
    deadline: '2026-09-12T23:59:00Z',
    file_path: 'usr_arjun_mehta_002/doc_os_exp5_arjun.pdf',
    file_name: 'OS_Lab_Exp5_Safe_Sequence_Arjun.pdf',
    file_size: 1850000,
    file_type: 'application/pdf',
    page_count: 6,
    created_at: '2026-09-04T14:30:00Z',
    uploader: MOCK_PROFILES['usr_arjun_mehta_002'],
  },
  {
    id: 'doc_dbms_midsem_2025',
    title: 'Database Management Systems Midsem Exam Paper (2025 Autumn with Solutions)',
    type: 'Midsem Paper',
    semester: 'Sem 5',
    subject: 'DBMS (CSE-502)',
    uploader_id: 'usr_priya_sharma_001',
    deadline: null,
    file_path: 'usr_priya_sharma_001/doc_dbms_midsem_2025.pdf',
    file_name: 'DBMS_Midsem_Exam_2025_Solved.pdf',
    file_size: 2150000,
    file_type: 'application/pdf',
    page_count: 4,
    created_at: '2026-09-03T16:20:00Z',
    uploader: MOCK_PROFILES['usr_priya_sharma_001'],
  },
  {
    id: 'doc_cn_assign2_ananya',
    title: 'Computer Networks - Assignment 2: Subnetting & CIDR Calculation Problems',
    type: 'Assignment',
    semester: 'Sem 5',
    subject: 'Computer Networks (CSE-503)',
    uploader_id: 'usr_ananya_das_005',
    deadline: '2026-09-10T18:00:00Z',
    file_path: 'usr_ananya_das_005/doc_cn_assign2_ananya.pdf',
    file_name: 'CN_Assignment_2_Subnetting.pdf',
    file_size: 980000,
    file_type: 'application/pdf',
    page_count: 3,
    created_at: '2026-09-02T11:45:00Z',
    uploader: MOCK_PROFILES['usr_ananya_das_005'],
  },
  {
    id: 'doc_dsa_trees_notes_priya',
    title: 'Data Structures & Algorithms - Complete Notes on AVL Trees & Red-Black Trees',
    type: 'Notes',
    semester: 'Sem 3',
    subject: 'DSA (CSE-301)',
    uploader_id: 'usr_priya_sharma_001',
    deadline: null,
    file_path: 'usr_priya_sharma_001/doc_dsa_trees_notes_priya.pdf',
    file_name: 'DSA_Unit3_Self_Balancing_Trees.pdf',
    file_size: 3400000,
    file_type: 'application/pdf',
    page_count: 8,
    created_at: '2026-09-01T09:10:00Z',
    uploader: MOCK_PROFILES['usr_priya_sharma_001'],
  },
  {
    id: 'doc_cloud_endsem_sneha',
    title: 'Cloud Computing & Distributed Systems - Endsem Question Paper (2024)',
    type: 'End-Sem Exam Paper',
    semester: 'Sem 7',
    subject: 'Cloud Computing (IT-701)',
    uploader_id: 'usr_sneha_patel_003',
    deadline: null,
    file_path: 'usr_sneha_patel_003/doc_cloud_endsem_sneha.pdf',
    file_name: 'Cloud_Endsem_2024_Paper.pdf',
    file_size: 1620000,
    file_type: 'application/pdf',
    page_count: 5,
    created_at: '2026-08-28T15:00:00Z',
    uploader: MOCK_PROFILES['usr_sneha_patel_003'],
  },
  {
    id: 'doc_toc_automata_notes_arjun',
    title: 'Theory of Computation - Pushdown Automata & Turing Machine Lecture Notes',
    type: 'Notes',
    semester: 'Sem 5',
    subject: 'TOC (CSE-504)',
    uploader_id: 'usr_arjun_mehta_002',
    deadline: null,
    file_path: 'usr_arjun_mehta_002/doc_toc_automata_notes_arjun.pdf',
    file_name: 'TOC_PDA_Turing_Machines_Complete.pdf',
    file_size: 2900000,
    file_type: 'application/pdf',
    page_count: 7,
    created_at: '2026-08-27T17:40:00Z',
    uploader: MOCK_PROFILES['usr_arjun_mehta_002'],
  },
  {
    id: 'doc_vlsi_exp3_rohan',
    title: 'Digital VLSI Design - Experiment 3: CMOS Inverter VTC & Delay Characteristics',
    type: 'Experiment',
    semester: 'Sem 5',
    subject: 'VLSI Design (ECE-502)',
    uploader_id: 'usr_rohan_verma_004',
    deadline: '2026-09-15T23:59:00Z',
    file_path: 'usr_rohan_verma_004/doc_vlsi_exp3_rohan.pdf',
    file_name: 'VLSI_Exp3_CMOS_VTC_Report.pdf',
    file_size: 2300000,
    file_type: 'application/pdf',
    page_count: 6,
    created_at: '2026-08-25T13:20:00Z',
    uploader: MOCK_PROFILES['usr_rohan_verma_004'],
  },
  {
    id: 'doc_se_assign1_priya',
    title: 'Software Engineering - Assignment 1: SRS Document & UML Sequence Diagrams',
    type: 'Assignment',
    semester: 'Sem 5',
    subject: 'Software Eng. (CSE-505)',
    uploader_id: 'usr_priya_sharma_001',
    deadline: '2026-09-08T23:59:00Z',
    file_path: 'usr_priya_sharma_001/doc_se_assign1_priya.pdf',
    file_name: 'SE_Assignment1_SRS_Ecommerce.pdf',
    file_size: 1540000,
    file_type: 'application/pdf',
    page_count: 4,
    created_at: '2026-08-24T18:10:00Z',
    uploader: MOCK_PROFILES['usr_priya_sharma_001'],
  },
  {
    id: 'doc_maths3_midsem_rohan',
    title: 'Engineering Mathematics III - Midsem Exam Question Paper (Fourier & Laplace)',
    type: 'Midsem Paper',
    semester: 'Sem 3',
    subject: 'Maths III (BAS-301)',
    uploader_id: 'usr_rohan_verma_004',
    deadline: null,
    file_path: 'usr_rohan_verma_004/doc_maths3_midsem_rohan.pdf',
    file_name: 'Engg_Maths3_Midsem_Paper.pdf',
    file_size: 1200000,
    file_type: 'application/pdf',
    page_count: 3,
    created_at: '2026-08-22T10:00:00Z',
    uploader: MOCK_PROFILES['usr_rohan_verma_004'],
  },
];

export const INITIAL_DOCUMENT_PAGES: DocumentPage[] = [
  // OS Exp 5 - Priya
  {
    id: 'page_os_priya_1',
    document_id: 'doc_os_exp5_priya',
    page_number: 1,
    content: 'Title: Operating Systems Lab Experiment 5. Objective: Implementation of Banker\'s Algorithm for Deadlock Avoidance and Resource Allocation. Theory: Deadlock occurs when processes hold resources and wait for others. The Banker\'s algorithm tests for safety by simulating the allocation for predetermined maximum possible amounts of all resources.',
  },
  {
    id: 'page_os_priya_2',
    document_id: 'doc_os_exp5_priya',
    page_number: 2,
    content: 'Data Structures used in Banker\'s Algorithm: Available Vector of size m, Max Matrix of size n x m, Allocation Matrix of size n x m, Need Matrix of size n x m where Need[i][j] = Max[i][j] - Allocation[i][j]. Safety Algorithm step-by-step logic.',
  },
  {
    id: 'page_os_priya_3',
    document_id: 'doc_os_exp5_priya',
    page_number: 3,
    content: 'Resource Request Algorithm: Let Request_i be the request vector for process P_i. If Request_i <= Need_i and Request_i <= Available, proceed with tentative allocation. Sample problem with 5 processes P0, P1, P2, P3, P4 and 3 resource types A, B, C.',
  },
  {
    id: 'page_os_priya_4',
    document_id: 'doc_os_exp5_priya',
    page_number: 4,
    content: 'C Implementation Code: Detailed source code for finding safe sequence <P1, P3, P4, P0, P2>. Output screenshots displaying safe state verification and request granting.',
  },
  {
    id: 'page_os_priya_5',
    document_id: 'doc_os_exp5_priya',
    page_number: 5,
    content: 'Lab Viva Questions and Answers: 1. Difference between Deadlock Prevention and Deadlock Avoidance. 2. Why is Banker\'s Algorithm called so? 3. Limitations in real-world operating systems.',
  },

  // OS Exp 5 - Arjun
  {
    id: 'page_os_arjun_1',
    document_id: 'doc_os_exp5_arjun',
    page_number: 1,
    content: 'Department of Computer Science & Engineering. Lab Course: OS Lab (CSE-501). Experiment No. 5: Banker\'s Algorithm Deadlock Simulation. Student: Arjun Mehta. Overview of process synchronization, mutual exclusion, hold-and-wait, no preemption, and circular wait.',
  },
  {
    id: 'page_os_arjun_2',
    document_id: 'doc_os_exp5_arjun',
    page_number: 2,
    content: 'Formal definition of Safe State. An OS state is safe if there exists a sequence <P1, P2, ... Pn> such that for each Pi, the resources that Pi can still request can be satisfied by currently available resources plus resources held by all Pj with j < i.',
  },
  {
    id: 'page_os_arjun_3',
    document_id: 'doc_os_exp5_arjun',
    page_number: 3,
    content: 'Input Test Cases: Allocation matrix [[0,1,0],[2,0,0],[3,0,2],[2,1,1],[0,0,2]]. Max matrix [[7,5,3],[3,2,2],[9,0,2],[2,2,2],[4,3,3]]. Available resources [3,3,2]. Step-by-step matrix subtractions to calculate Need matrix.',
  },
  {
    id: 'page_os_arjun_4',
    document_id: 'doc_os_exp5_arjun',
    page_number: 4,
    content: 'Execution trace and safety analysis: Safe sequence confirmed: <P1, P3, P4, P0, P2>. Handling edge cases where resource request cannot be granted immediately and leads to unsafe state.',
  },
  {
    id: 'page_os_arjun_5',
    document_id: 'doc_os_exp5_arjun',
    page_number: 5,
    content: 'Python implementation with NumPy array vectors and interactive CLI for entering custom resource instances and process allocations.',
  },
  {
    id: 'page_os_arjun_6',
    document_id: 'doc_os_exp5_arjun',
    page_number: 6,
    content: 'Conclusion & references: Silberschatz Operating System Concepts, Tanenbaum Modern Operating Systems.',
  },

  // DBMS Midsem Paper
  {
    id: 'page_dbms_1',
    document_id: 'doc_dbms_midsem_2025',
    page_number: 1,
    content: 'Mid-Semester Examination 2025. Subject: Database Management Systems. Section A: Multiple choice questions covering relational algebra operators, entity-relationship models, cardinalities, weak entity sets, and candidate keys.',
  },
  {
    id: 'page_dbms_2',
    document_id: 'doc_dbms_midsem_2025',
    page_number: 2,
    content: 'Section B: Normalization. Question 3: Given relation R(A, B, C, D, E) with Functional Dependencies F = { A -> BC, CD -> E, B -> D, E -> A }. (a) Find candidate keys of R. (b) Determine the highest normal form of R (1NF, 2NF, 3NF, BCNF). (c) Decompose into 3NF lossless join and dependency preserving.',
  },
  {
    id: 'page_dbms_3',
    document_id: 'doc_dbms_midsem_2025',
    page_number: 3,
    content: 'Section C: SQL Queries and Joins. Write SQL queries for Student-Course-Enrollment schema involving correlated subqueries, LEFT OUTER JOIN, GROUP BY with HAVING count > 3, and Window functions (DENSE_RANK).',
  },
  {
    id: 'page_dbms_4',
    document_id: 'doc_dbms_midsem_2025',
    page_number: 4,
    content: 'Detailed Model Solutions: Step-by-step solution for Question 3 Normalization. Candidate keys: {A}, {BC}, {E}. Closure calculation: A+ = {A,B,C,D,E}. Highest normal form is 3NF because in B -> D, neither B is superkey nor D is prime attribute.',
  },

  // Computer Networks Assignment 2
  {
    id: 'page_cn_1',
    document_id: 'doc_cn_assign2_ananya',
    page_number: 1,
    content: 'Computer Networks (CSE-503) - Assignment 2. Subnetting, Supernetting, and Classless Inter-Domain Routing (CIDR). Question 1: An organization is granted the block 130.56.0.0/16. The administrator wants to create 1024 subnets. Find subnet mask, number of addresses per subnet, and first and last usable host address.',
  },
  {
    id: 'page_cn_2',
    document_id: 'doc_cn_assign2_ananya',
    page_number: 2,
    content: 'Question 2: Variable Length Subnet Masking (VLSM) problem. Department A requires 120 hosts, Department B requires 60 hosts, Department C requires 28 hosts, and Point-to-Point WAN links require 2 hosts each. Design an optimal IP allocation scheme minimizing wastage.',
  },
  {
    id: 'page_cn_3',
    document_id: 'doc_cn_assign2_ananya',
    page_number: 3,
    content: 'Question 3: Routing table lookup with Longest Prefix Match rule. Given forwarding table entries with masks /24, /26, /28, determine packet outgoing interface for destination IP 192.168.1.75.',
  },
];

/**
 * Generates an in-memory sample PDF Document for any document item.
 * Used to provide rich in-browser viewing for demo/seeded documents.
 */
export async function generateSamplePdfDocument(item: DocumentItem, pages: DocumentPage[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontTitle = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontBody = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const docPages = pages.filter((p) => p.document_id === item.id);
  const totalPages = Math.max(item.page_count, docPages.length, 1);

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();

    // Top Header Banner - #60B5FF (Sky Blue)
    page.drawRectangle({
      x: 0,
      y: height - 60,
      width,
      height: 60,
      color: rgb(0.376, 0.710, 1.0),
    });

    page.drawText('CAMPUS DOCUMENT HUB • ACADEMIC ARCHIVE', {
      x: 40,
      y: height - 38,
      size: 11,
      font: fontTitle,
      color: rgb(1, 1, 1),
    });

    page.drawText(`${item.type.toUpperCase()} • ${item.semester}`, {
      x: width - 180,
      y: height - 38,
      size: 10,
      font: fontBody,
      color: rgb(0.9, 0.95, 1.0),
    });

    // Document Title - #1C1D1F
    const titleText = item.title.length > 55 ? item.title.substring(0, 52) + '...' : item.title;
    page.drawText(titleText, {
      x: 40,
      y: height - 100,
      size: 16,
      font: fontTitle,
      color: rgb(0.110, 0.114, 0.122),
    });

    // Metadata line - #64666E
    const uploaderName = item.uploader?.full_name || 'Student Contributor';
    const dept = item.uploader?.department || 'Engineering';
    page.drawText(`Uploaded by: ${uploaderName} (${dept})  |  Subject: ${item.subject || 'General'}`, {
      x: 40,
      y: height - 120,
      size: 10,
      font: fontOblique,
      color: rgb(0.392, 0.400, 0.431),
    });

    // Deadline badge if present - #F79D65 (Orange)
    if (item.deadline) {
      page.drawRectangle({
        x: 40,
        y: height - 150,
        width: 320,
        height: 22,
        color: rgb(0.969, 0.616, 0.396),
      });
      page.drawText(`Due Deadline: ${new Date(item.deadline).toLocaleDateString()}`, {
        x: 48,
        y: height - 143,
        size: 9,
        font: fontTitle,
        color: rgb(1, 1, 1),
      });
    }

    // Divider Line - #E8E8E3
    const contentStartY = item.deadline ? height - 170 : height - 145;
    page.drawLine({
      start: { x: 40, y: contentStartY },
      end: { x: width - 40, y: contentStartY },
      thickness: 1,
      color: rgb(0.910, 0.910, 0.890),
    });

    // Page Specific Content
    const pageData = docPages.find((p) => p.page_number === pageNum);
    const content = pageData?.content || `Page ${pageNum} of ${item.title}. Detailed academic diagrams, code listings, mathematical derivations, and reference notes for ${item.semester} students.`;

    // Wrap and draw text - #1C1D1F
    const words = content.split(' ');
    let line = '';
    let currentY = contentStartY - 30;
    const maxCharsPerLine = 75;

    for (const word of words) {
      if ((line + word).length > maxCharsPerLine) {
        page.drawText(line, {
          x: 40,
          y: currentY,
          size: 11,
          font: fontBody,
          color: rgb(0.110, 0.114, 0.122),
        });
        line = word + ' ';
        currentY -= 18;
      } else {
        line += word + ' ';
      }
    }
    if (line) {
      page.drawText(line, {
        x: 40,
        y: currentY,
        size: 11,
        font: fontBody,
        color: rgb(0.110, 0.114, 0.122),
      });
    }

    // Bottom Footer - #E8E8E3
    page.drawLine({
      start: { x: 40, y: 50 },
      end: { x: width - 40, y: 50 },
      thickness: 1,
      color: rgb(0.910, 0.910, 0.890),
    });

    page.drawText(`Verified Campus Academic Hub • Shared for BTech Studies`, {
      x: 40,
      y: 35,
      size: 9,
      font: fontOblique,
      color: rgb(0.392, 0.400, 0.431),
    });

    page.drawText(`Page ${pageNum} of ${totalPages}`, {
      x: width - 110,
      y: 35,
      size: 9,
      font: fontTitle,
      color: rgb(0.376, 0.710, 1.0),
    });
  }

  return await pdfDoc.save();
}
