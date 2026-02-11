# Online Exam Portal with AI Proctoring (Next.js)

A secure, organization-based online exam platform built with **Next.js**, featuring:
- Ultra-simple exam creation
- Organization-specific exams
- No student login (ID-based validation)
- Fullscreen enforcement
- Periodic camera snapshots
- AI-based face detection & face matching
- Admin result and proctoring dashboard

---

## 🚀 Core Philosophy

> **Keep everything easy**
- Easy for exam providers (admins)
- Easy for students
- Strong security without hurting UX
- Browser-compatible (no plugins)

---

## 🧱 Tech Stack

### Frontend
- **Next.js (App Router)**
- TypeScript
- Tailwind CSS
- Web APIs (Fullscreen, MediaDevices)

### Backend
- Next.js API Routes
- Node.js
- Background jobs (cron / queues)

### Database
- **PostgreSQL (Recommended)**

### AI / Proctoring
- face-api.js
- MediaPipe (face detection)
- TensorFlow.js

### Storage
- S3-compatible object storage
  - Camera snapshots
  - Event-based video clips (optional)

---

## 🗄️ Database Choice: PostgreSQL vs MongoDB

### ✅ PostgreSQL (BEST CHOICE)

**Why PostgreSQL wins for this app**
- Strong relational structure (exams, students, results)
- ACID compliance (important for exams)
- Easy reporting & filtering
- JSON support for AI metadata
- Better admin analytics

**Use JSONB for**
- Snapshot metadata
- Face match scores
- Proctoring events

> ❌ MongoDB is not ideal for relational exam data & analytics.

---

## 🧩 System Flow (3-Step Platform)

---

## 1️⃣ Admin / Exam Provider Flow

### Create Organization
- Name (School / College / Company)
- Auto-generated organization code

### Create Exam
- Exam name
- Duration
- Total marks
- Snapshot interval (10s / 30s)
- Proctoring options (ON/OFF)

### Add Questions
- Upload (CSV / Excel)
- Manual entry

### Publish Exam
- Generates unique exam code
- Exam is locked to organization

---

## 2️⃣ Student Flow (VERY SIMPLE)

### Student Entry Page (No Login)
Required fields:
- Organization name
- Exam code
- Student ID
- Student name (optional)

Click → **Validate & Continue**

---

## 3️⃣ Pre-Exam Identity Verification (IMPORTANT)

### Camera & Face Verification Step
Before exam starts:

1. Camera permission required
2. Capture **3 face images**
3. Run **face matching**
4. Save face embeddings securely
5. Show match confidence

If verification fails:
- Retry allowed
- Exam blocked if repeated failure

> This ensures **who starts the exam is verified**

---

## 📝 Exam Interface

- Fullscreen enforced
- Timer visible
- One question at a time
- Auto-save answers
- Warning system (non-intrusive)

---

## 🛡️ Proctoring & Security Plan

---

## 📸 Camera Snapshots (RECOMMENDED)

### Snapshot Strategy
- Capture image every:
  - **30 seconds (default)**
  - **10 seconds (strict mode)**

Each snapshot includes:
- Image
- Timestamp
- Exam ID
- Student ID
- Face presence result
- Match confidence score

### Why Snapshots (Not Full Video)
- Low bandwidth
- Low storage cost
- Browser-safe
- Legally safer

---

## 👤 Face Recognition (Best Practical Approach)

### ✅ Two-Phase Face Recognition (RECOMMENDED)

---

### Phase 1: Pre-Exam Face Matching
Purpose:
- Confirm who is writing the exam

Process:
1. Capture 3 images
2. Generate face embeddings
3. Store securely
4. Minimum match threshold: **85%**

Failure:
- Retry
- Block exam after threshold

---

### Phase 2: During Exam Face Monitoring

For each snapshot:
- Check if face is present
- Check single face only
- Compare with stored embedding
- Calculate match score

---

### 🚨 Alert Rules
| Condition | Action |
|--------|-------|
| Face not detected | Warning |
| Multiple faces | Warning |
| Match < 70% | Flag |
| Face missing 3 times | Admin flag |
| Camera disabled | Auto-submit / block |

> This ensures **same person continues the exam**

---

## 🖥️ Fullscreen Enforcement

- Fullscreen on exam start
- Detect:
  - ESC key
  - Tab switch
  - Minimize
- Rules:
  - 1st time → warning
  - Repeated → auto-submit / flag

---

## 🧑‍💼 Admin Proctoring Dashboard

Admins can:
- View student timeline
- See:
  - Face presence logs
  - Match confidence graph
  - Screenshot gallery
- Filter flagged attempts
- Download reports
- Export results (Excel / PDF)

---

## 📊 Database Schema (Simplified)

### Organizations
- id
- name
- code

### Exams
- id
- org_id
- exam_code
- duration
- proctoring_settings (JSONB)

### Students
- id
- student_id
- org_id

### FaceData
- student_id
- exam_id
- face_embedding (encrypted)

### Snapshots
- exam_id
- student_id
- image_url
- match_score
- face_present
- timestamp

### Answers
- question_id
- student_id
- answer

### Results
- student_id
- exam_id
- score
- status

---

## 🔒 Privacy & Consent

Mandatory before exam:
- Camera usage consent
- Data usage notice
- Snapshot retention policy

Snapshots auto-delete after configurable days.

---

## 🧠 Easy UX Rules (CRITICAL)

### Students
- Clear instructions
- Camera test before exam
- Soft warnings (not scary)

### Admins
- Proctoring toggles
- No raw AI complexity
- Simple dashboards

---

## 📈 Future Enhancements
- Mobile support
- AI cheating detection
- Certificate generation
- Paid exams
- Role-based admin access

---

## ✅ MVP Recommendation

Start with:
✔ PostgreSQL  
✔ Fullscreen mode  
✔ 30s camera snapshots  
✔ Face detection + matching  
✔ Simple admin dashboard  

Then scale.

---

## 📌 Final Note

This system balances:
- **Security**
- **Performance**
- **Legal safety**
- **User experience**

Perfect for schools, colleges, and companies.

---
