"""AI service for Saral Funding — uses GPT-4o via emergentintegrations universal key."""
import os
import json
import logging
from typing import List, Dict, Any
from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi (हिन्दी)",
    "gu": "Gujarati (ગુજરાતી)",
    "mr": "Marathi (मराठी)",
    "bn": "Bengali (বাংলা)",
    "ta": "Tamil (தமிழ்)",
    "te": "Telugu (తెలుగు)",
    "kn": "Kannada (ಕನ್ನಡ)",
    "pa": "Punjabi (ਪੰਜਾਬੀ)",
}


def _build_context(user: Dict, bp: Dict, fa: Dict, schemes: List[Dict]) -> str:
    scheme_brief = [
        {
            "id": s["id"],
            "name": s["name"],
            "description": s.get("description", "")[:200],
            "max_funding": s.get("max_funding", 0),
            "max_subsidy_percent": s.get("max_subsidy_percent", 0),
            "categories": s.get("categories", []),
            "states": s.get("states", []),
            "tags": s.get("tags", []),
        }
        for s in schemes
    ]
    return json.dumps({
        "user": {
            "state": user.get("state"),
            "district": user.get("district"),
            "gender": user.get("gender"),
            "age": user.get("age"),
            "category": user.get("category"),
        },
        "business_profile": bp,
        "assessment": fa,
        "schemes": scheme_brief,
    }, ensure_ascii=False)


async def match_schemes_with_llm(user: Dict, bp: Dict, fa: Dict, schemes: List[Dict]) -> List[Dict[str, Any]]:
    """Combine rule-based scoring with LLM reasoning. Always returns a list sorted by score desc."""
    # ---- Rule-based base score ----
    user_state = (user.get("state") or "").lower()
    is_woman = user.get("gender", "").lower() == "female" or fa.get("woman_entrepreneur") is True
    is_sc_st = (user.get("category", "").lower() in ("sc", "st"))
    funding_req = int(fa.get("funding_requirement") or bp.get("funding_required") or 0)
    industry = (bp.get("industry") or "").lower()
    existing = bool(fa.get("existing_business") or bp.get("business_stage") == "existing")
    has_gst = bool(fa.get("gst_registration") or bp.get("gst_available"))
    has_udyam = bool(fa.get("udyam_registration") or bp.get("udyam_available"))

    matches = []
    for s in schemes:
        score = 50
        # state match
        if "All India" in s.get("states", []) or user_state and user_state.capitalize() in s.get("states", []):
            score += 15
        elif user_state and not any(user_state.capitalize() == st for st in s.get("states", [])):
            if "All India" not in s.get("states", []):
                score -= 30
        # funding amount match
        max_f = s.get("max_funding", 0)
        if funding_req and max_f:
            if funding_req <= max_f:
                score += 15
            else:
                score -= 10
        # industry / categories
        cats_l = [c.lower() for c in s.get("categories", [])]
        if industry and industry in cats_l:
            score += 10
        # tags-based bonuses
        tags = s.get("tags", [])
        if is_woman and "women" in s.get("categories", []):
            score += 10
        if is_woman and s["id"] == "standupindia":
            score += 10
        if is_sc_st and s["id"] == "standupindia":
            score += 15
        if has_udyam and "udyam" in tags:
            score += 5
        if existing and "existing_business" in tags:
            score += 5
        if not existing and "new_business" in tags:
            score += 5
        if has_gst:
            score += 2

        score = max(40, min(99, score))

        # Funding & subsidy estimate
        funding_est = min(int(funding_req or max_f), int(max_f))
        if funding_est <= 0:
            funding_est = int(max_f * 0.4)
        subsidy_pct = s.get("max_subsidy_percent", 0)
        subsidy_est = int(funding_est * subsidy_pct / 100)

        matches.append({
            "scheme_id": s["id"],
            "name": s["name"],
            "score": score,
            "funding_estimate": funding_est,
            "subsidy_estimate": subsidy_est,
            "reason": "",
        })

    # Sort and take top 8
    matches.sort(key=lambda x: x["score"], reverse=True)
    top = matches[:8]

    # ---- LLM reasoning layer ----
    if EMERGENT_LLM_KEY and user.get("state"):
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"match_{user.get('id', 'anon')}",
                system_message=(
                    "You are an expert Indian government funding advisor. Given a user profile and a candidate scheme, "
                    "write ONE short sentence (max 25 words) in English explaining why this scheme is a fit. "
                    "Be concrete: mention the user's state, business, or eligibility criteria."
                ),
            ).with_model("openai", "gpt-4o")

            ctx = _build_context(user, bp, fa, [s for s in schemes if s["id"] in [m["scheme_id"] for m in top]])
            prompt = (
                f"User & schemes context (JSON):\n{ctx}\n\n"
                f"Return a JSON object mapping scheme_id -> reason sentence. Only JSON, no prose."
            )
            response = await chat.send_message(UserMessage(text=prompt))
            text = response.strip()
            if text.startswith("```"):
                text = text.strip("`")
                if text.startswith("json"):
                    text = text[4:]
            reasons = json.loads(text)
            for m in top:
                if m["scheme_id"] in reasons:
                    m["reason"] = reasons[m["scheme_id"]]
        except Exception as e:
            logger.warning(f"LLM reasoning failed: {e}")
            for m in top:
                m["reason"] = f"Matches your profile based on industry, location and funding need."
    else:
        for m in top:
            m["reason"] = "Matches your profile based on industry, location and funding need."

    return top


async def advisor_chat(
    user_id: str,
    user_profile: Dict,
    business_profile: Dict,
    assessment: Dict,
    schemes: List[Dict],
    message: str,
    language: str,
    history: List[Dict],
) -> str:
    """Answer a user query about Indian government schemes using GPT-4o."""
    lang_name = LANGUAGE_NAMES.get(language, "English")
    scheme_brief = [
        {
            "name": s["name"],
            "full_name": s.get("full_name"),
            "description": s.get("description", "")[:300],
            "eligibility": s.get("eligibility", [])[:5],
            "benefits": s.get("benefits", [])[:5],
            "max_funding": s.get("max_funding", 0),
            "max_subsidy_percent": s.get("max_subsidy_percent", 0),
            "states": s.get("states", []),
        }
        for s in schemes
    ]
    system_prompt = (
        f"You are Saral Funding Advisor — an expert on Indian government funding schemes, subsidies and MSME programmes. "
        f"You help Indian entrepreneurs, MSMEs, startups, shopkeepers, farmers and self-employed professionals. "
        f"ALWAYS reply in {lang_name} (script: native if non-English). Keep replies concise (max 180 words), bullet-friendly. "
        f"Use ONLY the schemes provided below. If a scheme is not in the list, say you don't have detailed info on it. "
        f"User profile: {json.dumps({k: user_profile.get(k) for k in ('full_name','state','district','gender','age','category')}, ensure_ascii=False)}. "
        f"Business: {json.dumps(business_profile, ensure_ascii=False, default=str)}. "
        f"Assessment: {json.dumps(assessment, ensure_ascii=False, default=str)}. "
        f"Available schemes: {json.dumps(scheme_brief, ensure_ascii=False)}."
    )

    if not EMERGENT_LLM_KEY:
        return "AI advisor is not configured. Please set EMERGENT_LLM_KEY."

    try:
        # Include recent history (last 6 turns) inline as part of the system prompt
        # so the LLM has context without us issuing extra paid calls per turn.
        if history:
            recent = history[-12:]
            convo_lines = []
            for h in recent:
                role = "User" if h.get("role") == "user" else "Advisor"
                convo_lines.append(f"{role}: {h.get('content', '')}")
            system_prompt_with_history = (
                system_prompt + "\n\nRecent conversation so far:\n" + "\n".join(convo_lines)
            )
        else:
            system_prompt_with_history = system_prompt

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"advisor_{user_id}",
            system_message=system_prompt_with_history,
        ).with_model("openai", "gpt-4o")

        reply = await chat.send_message(UserMessage(text=message))
        return reply.strip()
    except Exception as e:
        logger.exception(f"advisor_chat failed: {e}")
        return "Sorry, I couldn't reach the advisor service right now. Please try again in a moment."
