# Saral Funding — Product Requirements (MVP)

AI-powered government funding discovery mobile app for Indian entrepreneurs, MSMEs, startups, farmers, traders, women entrepreneurs and self-employed professionals. Answers: **"What funding opportunities am I eligible for?"**

## Stack
- **Mobile**: React Native (Expo Router 6, SDK 54), TypeScript
- **Backend**: FastAPI + Motor (MongoDB)
- **AI**: OpenAI GPT-4o via Emergent Universal LLM key (`emergentintegrations`)
- **Auth**: Mock OTP for MVP (OTP=`123456`), token = `user_id`
- **Vector DB (Qdrant)**: Deferred — current matching uses hybrid rule-based scoring + GPT-4o reasoning over the seeded scheme list
- **Admin Panel (Next.js)**: Deferred — admin APIs not yet exposed
- **Notifications**: In-app feed (read/unread). Push deferred.

## Mobile Screens (15)
1. Splash (`app/index.tsx`) — routes based on auth/onboarding state
2. Language Selection — 9 Indian languages
3. Login (mobile entry)
4. OTP Verification
5. Personal Profile (onboarding/profile)
6. Business Profile (onboarding/business)
7. Funding Assessment (onboarding/assessment)
8. Dashboard tab — Readiness Score, Eligible Funding, Estimated Subsidy, Upcoming Consultation, Top 3 matches
9. Schemes tab — Search + horizontal category chips + list
10. Scheme Detail (`scheme/[id]`) — eligibility, benefits, docs, process, states
11. AI Advisor tab — ChatGPT-style with history, suggestions, clear
12. Consultation Booking (`booking`) — type → date → slot → confirmation
13. Notifications (`notifications`) — in-app feed
14. Profile tab — Personal & business info, action shortcuts
15. Settings (`settings`) — language switch, logout

## Backend Endpoints (`/api`)
- Auth: `POST /auth/send-otp`, `POST /auth/verify-otp`, `GET /auth/me`
- Profile: `POST /profile`
- Business: `POST/GET /business-profile`
- Assessment: `POST/GET /funding-assessment`
- Schemes: `GET /schemes?category&q&state`, `GET /schemes/{id}`
- Matching: `GET /match/me`, `POST /match/recompute`
- Advisor: `POST /advisor/chat`, `GET /advisor/history`, `DELETE /advisor/history`
- Consultations: `POST /consultations`, `GET /consultations/me`
- Notifications: `GET /notifications/me`, `POST /notifications/{nid}/read`
- Language: `POST /language`

## Seeded Schemes (11)
PMEGP, PMMY (Mudra), Stand-Up India, CGTMSE, PM Vishwakarma, PM SVANidhi, Startup India Seed Fund, SIDBI SMILE, Gujarat MSME Capital Subsidy, MP MSME Development, Maharashtra PSI.

## Matching Logic
Hybrid: rule-based base score (state match, funding range fit, industry/category match, women/SC-ST/Udyam/existing-business modifiers) → top 8 schemes → GPT-4o generates one-line personalised reasons in JSON.

## Brand
- Primary `#22C55E`, Dark `#15803D`, Light Gray `#F3F4F6`, Black `#111111`, White
- No blue, no gradients, no glassmorphism. Government-trust feel.
