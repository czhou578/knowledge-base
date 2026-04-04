# AI Music Coaching Consultant - Tech Stack

This document visualizes the proposed technology stack for the AI Music Coaching Consultant system, designed as a lightweight, 2026-ready architecture requiring no DSP setup.

## Architecture & Integration Flow

```mermaid
flowchart TD
    %% Entities
    Cobin([Cobin / User])
    
    %% Frontend Group
    subgraph Frontend Layer
        NextJS[Next.js 15 App Router<br/>React Frontend]
        Media[Browser MediaRecorder API<br/>Audio Capture]
    end
    
    %% Backend Group
    subgraph API Layer
        NextAPI[Next.js API Routes / Server Actions]
        Auth[Clerk / NextAuth]
    end
    
    %% AI Models Group
    subgraph Intelligence
        Gemini[Gemini 2.0 Flash<br/>Native Audio Analysis]
        Claude[Claude Sonnet 4<br/>Consultation Reasoning]
    end
    
    %% Knowledge Group
    subgraph Persistence Layer
        KnowledgeDB[(Curated Knowledge base<br/>Local JSON → Supabase)]
    end

    %% Connections
    Cobin -->|Interacts & Records| NextJS
    NextJS <--> Media
    NextJS -->|Uploads audio / Asks questions| NextAPI
    NextAPI <--> Auth
    
    NextAPI -->|Raw Audio & Base Prompt| Gemini
    Gemini -->|Musical Description| NextAPI
    
    NextAPI -->|Piece ID| KnowledgeDB
    KnowledgeDB -->|Curated Exercises & Annotations| NextAPI
    
    NextAPI -->|Description + Question + Context| Claude
    Claude -->|Consultation Feedback| NextAPI
    
    NextAPI -->|Actionable Output| NextJS
    
    %% Styling
    style NextJS fill:#1e293b,stroke:#38bdf8,color:#fff
    style Media fill:#1e293b,stroke:#38bdf8,color:#fff
    style NextAPI fill:#0f172a,stroke:#38bdf8,color:#fff
    style Auth fill:#0f172a,stroke:#38bdf8,color:#fff
    style Gemini fill:#4338ca,stroke:#818cf8,color:#fff
    style Claude fill:#4338ca,stroke:#818cf8,color:#fff
    style KnowledgeDB fill:#065f46,stroke:#10b981,color:#fff
    style Cobin fill:#334155,stroke:#94a3b8,stroke-width:2px,color:#fff
```

## Stack Details

| Layer | Choice | Rationale |
| --- | --- | --- |
| **Frontend Framework** | Next.js 15 (App Router) | Easy API routes and robust audio/file handling handling at the edge. |
| **Audio Capture** | Web `MediaRecorder` API | Zero dependencies, works natively across all modern browsers. |
| **Audio Understanding** | Gemini 2.0 Flash | Accepts native audio input, removing the need for custom DSP or Whispers. |
| **Consultation Logic**| Claude Sonnet 4 | The best instructable reasoning available for complex musical reflection. |
| **Knowledge Layer** | JSON (Migrating to Supabase) | Starts simple and lightweight, heavily prioritizing curated data over volume. |
| **Authentication** | Clerk or NextAuth | For preserving user state. |
| **Hosting / Deploy** | Vercel | Seamless integration with Next.js architecture. |
