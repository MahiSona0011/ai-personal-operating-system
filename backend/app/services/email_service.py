"""
Email notifications via Resend SDK.
All sends are fire-and-forget — callers should use BackgroundTask.
If RESEND_API_KEY is empty, emails are skipped silently (dev mode).
"""
import logging
from html import escape

import resend

from app.core.areas import AREAS
from app.core.config import settings

logger = logging.getLogger("aipos.email")

AREA_NAME = {a[1]: a[2] for a in AREAS}


def _init():
    if settings.RESEND_API_KEY:
        resend.api_key = settings.RESEND_API_KEY


_init()


def _send(to: str, subject: str, html: str) -> None:
    if not settings.RESEND_API_KEY:
        logger.debug("Email skipped (no RESEND_API_KEY): %s → %s", to, subject)
        return
    try:
        resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": [to],
            "subject": subject,
            "html": html,
        })
        logger.info("Email sent: %s → %s", subject, to)
    except Exception as exc:
        logger.error("Email send failed: %s", exc)


def _action_email(to: str, subject: str, heading: str, body: str, button: str, url: str) -> None:
    html = f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a2e;">
      <h1 style="font-size: 22px; margin-bottom: 8px;">{heading}</h1>
      <p style="color: #475569;">{body}</p>
      <a href="{url}"
         style="display:inline-block; margin-top:16px; padding:10px 24px;
                background:#6366f1; color:white; border-radius:8px; text-decoration:none; font-weight:600;">
        {button}
      </a>
      <p style="margin-top:24px; font-size:12px; color:#94a3b8;">
        Or paste this link into your browser:<br>{url}
      </p>
    </div>
    """
    _send(to, subject, html)


def send_password_reset_email(to: str, raw_token: str) -> None:
    url = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"
    _action_email(
        to, "Reset your Selfstack password", "Reset your password",
        "We got a request to reset your password. This link works once and expires in 1 hour. "
        "If it wasn't you, ignore this email; your password stays the same.",
        "Choose a new password", url,
    )


def send_verification_email(to: str, raw_token: str) -> None:
    url = f"{settings.FRONTEND_URL}/verify-email?token={raw_token}"
    _action_email(
        to, "Verify your Selfstack email", "Confirm your email",
        "Confirm this address to receive your weekly digest. This link expires in 24 hours.",
        "Verify email", url,
    )


def send_welcome_email(to: str, full_name: str) -> None:
    first_name = full_name.split()[0]
    html = f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a2e;">
      <h1 style="font-size: 24px; margin-bottom: 8px;">Welcome to Selfstack, {first_name}! 👋</h1>
      <p style="color: #64748b;">Your life dashboard is ready.</p>
      <p>Here's what to do first:</p>
      <ol>
        <li>Complete your <strong>onboarding</strong> to set up your life areas</li>
        <li>Do your first <strong>daily check-in</strong> to get an AI baseline</li>
        <li>Add one <strong>goal</strong> and one <strong>habit</strong></li>
      </ol>
      <a href="{settings.FRONTEND_URL}/onboarding"
         style="display:inline-block; margin-top:16px; padding:10px 24px;
                background:#6366f1; color:white; border-radius:8px; text-decoration:none; font-weight:600;">
        Get started →
      </a>
      <p style="margin-top:32px; font-size:12px; color:#94a3b8;">
        You're receiving this because you just created a Selfstack account.
      </p>
    </div>
    """
    _send(to, f"Welcome to Selfstack, {first_name}!", html)


def _area_name(slug: str) -> str:
    return AREA_NAME.get(slug, slug.title())


def render_weekly_digest(first_name: str, data: dict) -> str:
    """HTML for the weekly digest. Everything that came from a user or the AI is escaped."""
    score, delta = data.get("life_score"), data.get("life_score_delta")
    if score is None:
        score_html = "<em style='font-size:16px;'>no check-ins this week</em>"
    else:
        score_html = f"<strong>{score:.1f}</strong>"
    delta_html = ""
    if delta is not None:
        arrow, colour = ("▲", "#15803d") if delta > 0 else ("▼", "#b91c1c") if delta < 0 else ("•", "#64748b")
        delta_html = (
            f"<p style='margin:4px 0 0; font-size:13px; color:{colour};'>"
            f"{arrow} {abs(delta):.1f} vs the previous 7 days</p>"
        )

    areas_html = ""
    best, worst = data.get("best_area"), data.get("worst_area")
    if best:
        areas_html += f"<li>Strongest: <strong>{escape(_area_name(best['slug']))}</strong> ({best['score']:.1f})</li>"
    if worst:
        areas_html += f"<li>Needs attention: <strong>{escape(_area_name(worst['slug']))}</strong> ({worst['score']:.1f})</li>"
    areas_html = f"<ul style='padding-left:18px;'>{areas_html}</ul>" if areas_html else ""

    highlights = data.get("highlights") or []
    highlights_html = (
        "<h2 style='font-size:15px; margin-bottom:4px;'>Highlights</h2><ul style='padding-left:18px;'>"
        + "".join(f"<li>{escape(str(h))}</li>" for h in highlights[:3])
        + "</ul>"
        if highlights else ""
    )
    narrative = data.get("narrative")
    narrative_html = (
        f"<blockquote style='border-left:3px solid #6366f1;padding-left:12px;color:#475569;'>{escape(narrative)}</blockquote>"
        if narrative else ""
    )

    return f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a2e;">
      <h1 style="font-size: 22px;">Your weekly review, {escape(first_name)}</h1>
      <p style="color: #64748b;">Here's how your last 7 days went.</p>

      <div style="background:#f8fafc; border-radius:12px; padding:16px; margin:16px 0;">
        <p style="margin:0; font-size:14px; color:#64748b;">Life Score</p>
        <p style="margin:4px 0 0; font-size:32px;">{score_html}</p>
        {delta_html}
      </div>

      {areas_html}
      {highlights_html}
      {narrative_html}

      <a href="{settings.FRONTEND_URL}/reviews"
         style="display:inline-block; margin-top:16px; padding:10px 24px;
                background:#6366f1; color:white; border-radius:8px; text-decoration:none; font-weight:600;">
        View full review
      </a>

      <p style="margin-top:32px; font-size:12px; color:#94a3b8;">
        Selfstack weekly digest · <a href="{settings.FRONTEND_URL}/settings" style="color:#94a3b8;">Manage notifications</a>
      </p>
    </div>
    """


def send_weekly_digest(to: str, full_name: str, data: dict) -> None:
    first_name = (full_name.split() or ["there"])[0]
    _send(to, "Your Selfstack weekly review", render_weekly_digest(first_name, data))
