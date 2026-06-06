# Product Requirement Document (PRD): TribePlan (Group Itinerary App)

## 1. Objective & Core Vibe
A lightweight, mobile-first web application designed for families and small groups to collaboratively plan a holiday itinerary. It eliminates text-message chaos by centralizing shared ideas, day-by-day timelines, and shared expenses in one clean space. The app leverages real-time synchronization so all group members stay instantly updated.

## 2. Target Audience
Families and groups of friends who want an intuitive, unbloated platform to stay aligned on trip activities and group expenses before and during their holiday.

## 3. Tech Stack Preferences
- **Frontend:** React (Clean, responsive, mobile-first UI components utilizing Tailwind CSS).
- **Backend/Database:** Supabase (PostgreSQL) for real-time data persistence, authentication simulation, and hosting.
- **Deployment Platform:** Vercel.

---

## 4. Database Architecture (Supabase Schema)

### 4.1 `trips` Table
Stores high-level data for individual holidays.
| Column Name | Data Type | Properties | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key, Default: gen_random_uuid() | Unique identifier for each trip. |
| `trip_name` | Text | Not Null | Name of the holiday (e.g., "Bali Family Trip"). |
| `leader_name` | Text | Not Null | Name of the person who initialized the trip. |
| `join_password`| Text | Not Null | A simple entry password set by the leader. |
| `created_at` | Timestamp | Default: now() | When the trip was created. |

### 4.2 `members` Table
Tracks the individual roster for each group trip.
| Column Name | Data Type | Properties | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key, Default: gen_random_uuid() | Unique identifier for the member. |
| `trip_id` | UUID | Foreign Key -> `trips.id`, Cascade Delete | Links member to their specific trip. |
| `name` | Text | Not Null | The member's name (e.g., "Mom", "Dad", "Kirana"). |

### 4.3 `timeline_events` Table
Stores fixed itinerary items scheduled for the vacation.
| Column Name | Data Type | Properties | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key, Default: gen_random_uuid() | Unique identifier for the itinerary item. |
| `trip_id` | UUID | Foreign Key -> `trips.id`, Cascade Delete | Links event to the specific trip. |
| `day_number` | Integer | Not Null | The specific trip day index (e.g., 1, 2, 3). |
| `time_slot` | Text | Not Null | The scheduled time (e.g., "09:00 AM", "Evening"). |
| `title` | Text | Not Null | Activity title (e.g., "Tanah Lot Temple Tour"). |
| `notes` | Text | Nullable | Optional contextual notes, location tips, or URLs. |

### 4.4 `idea_bucket` Table
Stores unscheduled brainstorm elements proposed by members.
| Column Name | Data Type | Properties | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key, Default: gen_random_uuid() | Unique identifier for the shared idea. |
| `trip_id` | UUID | Foreign Key -> `trips.id`, Cascade Delete | Links idea to the specific trip. |
| `title` | Text | Not Null | Name of the idea (e.g., "Beachside Seafood Dinner"). |
| `upvotes` | Integer | Default: 0, Not Null | Quantitative interest ticker updated by users. |

---

## 5. Core App Features & Scope

### Feature 1: Trip Setup & Onboarding (The Front Door)
- **Role Hierarchy:** The initial creator assumes the role of **Trip Leader**.
- **Creation Flow:** Leader inputs the Trip Name, their own name, and sets a 4-digit simple **Join Password**.
- **Member Roster Provisioning:** Immediately after creation, the leader enters a list of group names to pre-populate the trip's profile roster.
- **Invitation Share:** App generates a unique URL slug mapping to that `trip_id` (e.g., `/trip/[trip_id]`) along with a native copy button for smooth text sharing.
- **Member Access Gate:** When an invite link is accessed, non-leaders pick their name from the pre-populated dropdown roster, input the corresponding Join Password, and gain dashboard entry.

### Feature 2: Shared Trip Dashboard & Timeline
- A clean, vertical timeline broken down chronologically by trip day toggles (Day 1, Day 2, etc.).
- Each itinerary event card displays a clear time, activity header, location details, and notes.
- Includes an "Add Event" floating button to append new entries directly into the active day view.

### Feature 3: Collaborative "Idea Bucket" (The Sandbox)
- A separate view dedicated to unassigned trip possibilities.
- Any participant can quickly input an idea card.
- Each card possesses a real-time like/upvote counter.
- Features a "Promote to Timeline" macro action button on the card, prompting for Day/Time, moving the data row seamlessly out of the bucket and into `timeline_events`.

### Feature 4: Quick Expense Splitter Light
- A ledger listing group cash outlays incurred during the vacation.
- Add form tracks: Total cost amount, item description, paying member selection, and multi-select checkboxes for members splitting that specific cost.
- A processing logic widget aggregates database balances and reflects exactly who owes what to whom in plain text statements.

---

## 6. User Experience & Navigation Flows

### 6.1 Unauthenticated Entry Flow
1. User lands on `/` -> UI offers two clean options: **"Create New Trip"** or **"Enter Trip ID Link"**.
2. Clicking **Create** leads to a progressive step modal:
   - *Step 1:* Input Trip Name & Leader Identity.
   - *Step 2:* Establish 4-digit Join Password.
   - *Step 3:* Populate initial roster list & copy invite link.
3. User clicks **"Launch Dashboard"** and transitions to the main view state.

### 6.2 Authenticated Dashboard Flow
Once access is granted via the correct password verification step, users navigate via a sticky, mobile-friendly bottom menu or persistent tab structure switching smoothly between:
- 📅 **Timeline Tab** (Active fixed schedules)
- 💡 **Idea Sandbox Tab** (Voting and proposal engine)
- 💰 **Expense Tab** (Live splitting calculus log)