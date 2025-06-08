# ![1749399209751](public/favicon.ico)Action Portal ART3MIS

### *Autonomous Response & Task Efficiency Management Intelligence System*

**Action Portal ART3MIS** is a modern, feature-rich **task management application** designed to streamline your workflow. It's built with **Next.js**, **Supabase**, and **Tailwind CSS**, and features an intelligent AI assistant, **ART3MIS**, powered by **Google's Gemini** model, enabling you to manage tasks using natural language.

Live at : [AgamiIT Product Management Hub](https://prmanagement.agamiit.com/)

## 🚀 Features

### 🐂 Core Task Management

* **CRUD Operations**: Create, read, update, and delete tasks effortlessly.
* **Task Organization**:
  * **Statuses**: Track task progress with customizable statuses (e.g., *New*, *Backlog*, *To Do*, *In Progress*, *In Review*, *Done*, *Completed*).
  * **Priorities**: Assign priority levels (*Highest*, *High*, *Medium*, *Low*) to focus on what matters most.
  * **Assignees**: Delegate tasks to team members.
  * **Dates**: Set *start* and *due dates* for effective scheduling.
  * **Effort Estimation**: Estimate effort required (*XS*, *S*, *M*, *L*, *XL*).
  * **Product Areas**: Categorize tasks by project or product area.
  * **Tags**: Add descriptive tags for better searchability and organization.
  * **Dependencies**: Define basic task dependencies.
  * **Reporter**: Track who reported/created the task.

### 📊 Multiple Views

Visualize and manage your tasks in the way that suits you best:

* **Kanban Board**: Drag-and-drop interface to manage tasks visually across different statuses.
* **Table View**: Sortable and filterable list providing detailed task information.
* **Calendar View**: Visualize tasks on a monthly calendar based on due dates.
* **Timeline View** *(optional/if implemented)*: Gantt-chart-like visualization for durations and dependencies.

### 🤖 ART3MIS - AI Task Assistant

Your intelligent assistant for task management:

* **Powered by Google Gemini**: Utilizes **Google Gemini Pro** model.
* **Natural Language Processing**: Interact using plain English to:
  * Create new tasks.
  * Update existing tasks.
  * Query tasks based on criteria.
* **Smart Suggestions & Confirmation**: Parses your requests, suggests task details, and confirms actions before applying.
* **Real-time Updates**: All views (Kanban, Table, Calendar) update in real-time after ART3MIS creates or modifies a task.

### 🔍 Enhanced Task Detail Page

* **Comprehensive Information**: View all attributes of a task in one place.
* **Copy Task ID**: One-click copy of task’s unique identifier.
* **Clickable Tags**: Click any tag to copy its name (useful for filtering/search).
* **Clear Visual Structure**: Improved layout with visual separators for readability.

### 🛠️ General Features

* **Advanced Filtering**: Powerful filters in all views to narrow down tasks.
* **Sorting**: Sort tasks in Table View by different attributes.
* **Dark Mode**: Light and dark theme toggle for optimal comfort.
* **Responsive Design**: Works seamlessly across desktop and mobile devices.

---

## 🧑‍💻 Tech Stack

* **Framework**: [Next.js](https://nextjs.org/) 14+ (App Router)
* **Language**: TypeScript
* **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
* **AI Model**: [Google Gemini Pro](https://aistudio.google.com/) (via Google Generative AI SDK)
* **Styling**: [Tailwind CSS](https://tailwindcss.com/)
* **UI Components**: [shadcn/ui](), [Lucide React](https://lucide.dev/)
* **State Management**: [Zustand]()
* **Drag & Drop (Kanban)**: `<a href="https://github.com/atlassian/react-beautiful-dnd" disabled="false"><span>react-beautiful-dnd</span></a>`
* **Calendar View**: `<a href="https://github.com/jquense/react-big-calendar" disabled="false"><span>react-big-calendar</span></a>`

---

## ⚙️ Setup Instructions

### 1️️️ Clone the Repository

```
git clone <your_repository_url>
cd action-portal-art3mis
```

### 2️️️ Install Dependencies

Choose your preferred package manager:

```
npm install
# or
yarn install
# or
pnpm install
```

### 3️️️ Set up Supabase

* Go to [Supabase](https://supabase.com/) and create/sign in to an account.
* Create a new project.
* In the **SQL Editor**, run the following scripts **in order**:
  1. `<span>scripts/001-remove-private-tasks.sql</span>` → Removes deprecated column (run only if upgrading).
  2. `<span>scripts/002-initial-schema.sql</span>` → Creates necessary tables and relationships.
  3. `<span>scripts/003-seed-dummy-tasks.sql</span>` *(optional)* → Populates sample tasks for testing.
* Then go to **Project Settings** → **API** to find:
  * **Project URL**
  * **Project API Keys** → *anon* key and *service\_role* key.

### 4️️️ Set up Google Generative AI (Gemini)

* Obtain API key from:
  * [Google AI Studio](https://aistudio.google.com/) → *Get API key*.
  * Or via [Google Cloud Console](https://console.cloud.google.com/) → enable "Generative Language API" and create API key under "Credentials".

### 5️️️ Configure Environment Variables

* Create a `<span>.env.local</span>` file in your project root.
* Add the following variables:

```
# Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL="your_supabase_project_url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key" # Keep this secret (server-side only)

# Google Generative AI (Gemini) API Key
GOOGLE_GENERATIVE_AI_API_KEY="your_gemini_api_key"

# Optional: If using Supabase Auth with JWT
# SUPABASE_JWT_SECRET="your_supabase_jwt_secret_if_needed"
```

### 6️️️ Run the Application

```
npm run dev
# or
yarn dev
# or
pnpm dev
```

Visit: [http://localhost:3000](http://localhost:3000) 🚀

## 🏃 Running the Application

Once the setup is complete, run:

```
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to explore **Action Portal ART3MIS**.

## ✨ Happy Task Managing!

Made by [Arnob Dey](https://github.com/arnob016) , with power of [v0.dev](https://v0.dev) , [Google AI Studio](https://aistudio.google.com/) and [Gemini 2.5 Pro](https://gemini.google.com/app)
