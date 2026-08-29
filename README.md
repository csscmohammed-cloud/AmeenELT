# AmeenELT — Modern English Language Teaching & Learning LMS/ Workspace

**AmeenELT** is an interactive, full-stack English Language Teaching (ELT) workspace designed for educators and learners. It combines structured curriculum management with intelligent AI-powered lesson creation, dynamic quizzes, interactive vocabulary practice, and real-time student evaluation.

---

## 🌟 Key Features

### 🎓 For Students & Learners
- **Structured Interactive Courses**: Step-by-step curriculum modules with guided explanations, comprehension activities, and listening practice.
- **Dynamic AI Quizzes**: Multiple-choice, fill-in-the-blank, and sentence reordering questions with instant scoring and detailed feedback.
- **Vocabulary & Grammar Labs**: Interactive word cards with phonetic pronunciation guides, CEFR levels (A1–C2), and contextual usage examples.
- **Pronunciation & Speaking Assessment**: Voice evaluation powered by Speech-to-Text and contextual pronunciation diagnostics.
- **Progress Tracking & Analytics**: Comprehensive dashboard showing mastery percentages, completed lessons, streak counts, and activity logs.

### 👩‍🏫 For Teachers & Educators
- **AI Course & Lesson Generator**: Generate CEFR-aligned lessons, dialogue scripts, and reading comprehension passages in seconds.
- **AI Quiz Builder**: Automatically create balanced assessments with configurable difficulty, question types, and answer explanations.
- **Curriculum & Student Management**: Organize custom course units, inspect individual student submissions, and track learning milestones.
- **Flexible AI Engine Settings**: Integrated with OpenRouter (supporting Gemini 2.5, Claude 3.5, GPT-4o, and DeepSeek) along with configurable backup failover endpoints.

---

## 🚀 Built-In AI Engine & Failover System

AmeenELT includes a resilient AI backend architecture:
- **Primary Engine (OpenRouter)**: High-speed universal inference supporting high-performance models (e.g., `google/gemini-2.5-flash`, `anthropic/claude-3.5-sonnet`, `meta-llama/llama-3.3-70b-instruct`).
- **Custom Backup Failover**: Easily configure any secondary OpenAI-compatible API endpoint (such as direct OpenAI, self-hosted proxies, or custom LLM endpoints) in Teacher Settings to ensure uninterrupted service if primary credits or quotas are exhausted.
- **In-App Diagnostic Benchmark**: Test and verify API connectivity and response latency directly from the interface.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Motion
- **Backend**: Node.js, Express (ESM / TypeScript via TSX & esbuild)
- **AI Integration**: OpenRouter API & Custom OpenAI-compatible endpoints
- **Database & Auth**: Firebase Firestore & Firebase Authentication
- **Build & Tooling**: Vite, TypeScript, ESLint

---

## 📦 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/your-username/ameenelt.git
cd ameenelt
