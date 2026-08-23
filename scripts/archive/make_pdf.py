from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, ListFlowable, ListItem
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.units import mm
import os

OUT = r"C:\Users\adity\Desktop\Businesses\Freelance\HealthChain Scaling Architecture Playbook.pdf"
os.makedirs(os.path.dirname(OUT), exist_ok=True)

styles = getSampleStyleSheet()

styles.add(ParagraphStyle(name='H1X', parent=styles['Heading1'], fontSize=16, spaceAfter=10, spaceBefore=15, textColor=HexColor('#1E3A8A')))
styles.add(ParagraphStyle(name='H2X', parent=styles['Heading2'], fontSize=13, spaceAfter=8, spaceBefore=12, textColor=HexColor('#2563EB')))
styles.add(ParagraphStyle(name='BodyX', parent=styles['Normal'], fontSize=10, spaceAfter=8, leading=14, textColor=HexColor('#374151')))
styles.add(ParagraphStyle(name='CallX', parent=styles['Normal'], fontSize=10, spaceAfter=10, leading=14, textColor=HexColor('#047857'), backColor=HexColor('#D1FAE5'), borderWidth=1, borderColor=HexColor('#10B981'), borderRadius=4, borderPadding=8))
styles.add(ParagraphStyle(name='CodeX', parent=styles['Normal'], fontSize=9, spaceAfter=8, leading=12, textColor=HexColor('#4B5563'), fontName='Courier'))

def P(text, style='BodyX'):
    return Paragraph(text, styles[style])

def B(text):
    return ListItem(Paragraph(text, styles['BodyX']), leftIndent=15, bulletColor=HexColor('#3B82F6'))

def table(data, colWidths):
    t = Table(data, colWidths=colWidths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), HexColor('#F3F4F6')),
        ('TEXTCOLOR', (0,0), (-1,0), HexColor('#111827')),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('BACKGROUND', (0,1), (-1,-1), HexColor('#FFFFFF')),
        ('TEXTCOLOR', (0,1), (-1,-1), HexColor('#374151')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#E5E7EB')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    return t

story = []

story += [P('HealthChain Scaling Architecture Playbook', 'H1X')]
story += [P('This document outlines the architectural patterns and guardrails necessary to safely scale HealthChain from its current foundation.', 'BodyX')]

story += [P('3. AI and Provider Cost Management', 'H1X')]

# Create a list for the first set of bullet points, which the user truncated
list1 = ListFlowable([
    B('Imported Deep Collab: import -> targeted specialist -> one final report. Do not resend the entire old case in every prompt.'),
    B('Case Prep: use deterministic generation by default; reserve AI refinement for an explicit user action.'),
    B('Use fixed input windows and compact evidence packets. Store the complete source for the user, but do not repeatedly send it to Gemini.'),
    B('Add a source fingerprint so identical data returns the saved report rather than creating a new AI request.'),
    B('Apply per-user rate limits, daily quotas, maximum file size, maximum prompt size, maximum output size, and a concurrency limit per account.'),
    B('Record operation name, request ID, input tokens, output tokens, latency, provider model, status, and failure reason.')
], bulletType='bullet', start='circle')
story.append(list1)

story += [P('Illustrative AI budget controls','H2X'),table([['Operation','Output cap','Control'],['Specialist turn','500-700','Maximum questions and recent history only'],['Specialist conclusion','700-900','Structured JSON; save terminal response'],['Lab/document extraction','1,200-1,400','One call per file; cache by file hash'],['Conference','600-700','Compact evidence packets only'],['Final report','1,200-1,800','Fingerprint and idempotency guard'],['Connection map','500-650','Lazy and persisted; never auto-repeat']], [45*mm,35*mm,98*mm])]
story += [P('Important cost distinction','H2X'),P('Output caps limit generated output. The largest savings usually come from reducing repeated input context, avoiding duplicate requests, caching unchanged reports, using deterministic transformations, and processing files once.','CallX')]

story += [P('4. File and document scaling','H1X')]
list2 = ListFlowable([
    B('Upload directly to private Supabase Storage using short-lived signed URLs instead of sending large files through the browser-to-AI request.'),
    B('Validate file size, MIME type, extension, ownership, and upload status. Store a content hash to prevent duplicate processing.'),
    B('Create an analysis job after upload. The UI should show queued/running/succeeded/failed states and recover after refresh.'),
    B('Extract only the required structured metadata into Postgres. Keep the original file separate and do not place base64 data inside case JSON.'),
    B('Use retention and deletion jobs that remove both file objects and derived metadata when the account or case is deleted, subject to the documented policy.'),
    B('For large documents, process pages/chunks with bounded concurrency and combine compact extracted results rather than repeatedly sending the entire document.')
], bulletType='bullet', start='circle')
story.append(list2)

story += [P('5. Frontend and device scaling','H1X')]
list3 = ListFlowable([
    B('Split routes and heavy PDF/file tooling so the first screen does not load every feature.'),
    B('Use a single source of truth for server data. Avoid duplicated local state copies that become stale after navigation.'),
    B('Persist drafts only when appropriate; server-save completed cases and reports before showing completion.'),
    B('Use abort controllers and request IDs so an old screen cannot write results into a newly selected case.'),
    B('Show last saved time, saving state, retry state, and a clear warning when data is still local or unsynced.'),
    B('Test Chrome, Safari, mobile browsers, slow networks, refresh during processing, and device switching.')
], bulletType='bullet', start='circle')
story.append(list3)

story += [P('6. Reliability, queues, and background work','H1X')]
list4 = ListFlowable([
    B('Keep short interactive requests for small operations. Move large file analysis, exports, report generation, and scheduled cleanup to durable jobs.'),
    B('Use one job record per logical operation with an idempotency key. A retry must resume or safely reuse the existing job, not create duplicate reports.'),
    B('Use exponential backoff with a maximum retry count for transient provider failures. Do not retry validation, authorization, or malformed-request errors.'),
    B('Keep the last valid report if regeneration fails. Never replace good data with an error placeholder.'),
    B('Add dead-letter visibility for jobs that exceed retry limits and an owner workflow for safe replay.'),
    B('Make every status transition observable by request ID and user-safe error ID.')
], bulletType='bullet', start='circle')
story.append(list4)

story += [P('7. Security and privacy at scale','H1X')]
list5 = ListFlowable([
    B('RLS must be tested against two different users for every user-owned table and private storage bucket.'),
    B('Provider secrets and service-role keys remain server-side only. The browser may receive only publishable configuration.'),
    B('Redact health data, files, tokens, and payment details from logs. Use structured event names and safe identifiers.'),
    B('Separate production, staging, and development projects, credentials, storage buckets, and AI quotas.'),
    B('Rate-limit by user and IP where appropriate. Add payload limits and abuse detection before growth creates unexpected spend.'),
    B('Document every processor, cross-border transfer, retention period, deletion path, and user right accurately.')
], bulletType='bullet', start='circle')
story.append(list5)

story += [P('8. Payments and entitlements','H1X')]
list6 = ListFlowable([
    B('Keep checkout, webhook verification, entitlement calculation, refunds, cancellations, grace periods, and invoice state on the server.'),
    B('Use provider event IDs as idempotency keys. Duplicate webhooks must not duplicate access or records.'),
    B('Do not unlock paid features based only on a frontend flag or a successful redirect. Reconcile against the server-side entitlement record.'),
    B('Keep payment metadata free of sensitive user content. Separate test and production credentials.'),
    B('If mobile apps sell digital subscriptions, verify Apple/Google billing rules separately from web checkout requirements.'),
    B('Model pending, failed, refunded, cancelled, expired, and disputed states explicitly.')
], bulletType='bullet', start='circle')
story.append(list6)

story += [P('9. Observability and operating targets','H1X')]
story += [P('Recommended initial service-level objectives','H2X'),table([['Area','Initial target','Alert when'],['API availability','99.5%+ monthly','5xx or timeout trend rises'],['Interactive p95 latency','Under 3 seconds excluding AI wait','Sustained breach'],['AI report success','99%+ after safe retry','Failures or malformed output spike'],['Save success','99.9%+','Any repeated write failure'],['Duplicate generation','Near zero','Same fingerprint called repeatedly'],['Data recovery','100% for completed saves','Device/reinstall mismatch'],['AI spend','Within approved monthly budget','Daily spend spike or quota burn']], [47*mm,55*mm,76*mm])]
list7 = ListFlowable([
    B('Dashboard request count, latency, 4xx/5xx, AI calls, input/output tokens, provider errors, database errors, storage errors, job backlog, payment webhook lag, and daily spend.'),
    B('Set alerts for duplicate request rate, unexpected spikes, repeated 429/5xx errors, failed saves, queue age, storage growth, and entitlement mismatches.'),
    B('Create a simple incident runbook: identify, contain, preserve data, communicate, recover, replay safe jobs, and document the root cause.')
], bulletType='bullet', start='circle')
story.append(list7)

story += [P('10. Growth phases','H1X')]
story += [P('Phase 0 - Current hardening','H2X')]
story.append(ListFlowable([B('Complete RLS and cross-user tests; verify production migrations; add request IDs and AI operation labels; fix duplicate calls; add source fingerprints; test refresh, reinstall, and device recovery.')], bulletType='bullet', start='circle'))
story += [P('Phase 1 - Early launch','H2X')]
story.append(ListFlowable([B('Use bounded Postgres queries and pagination; private Storage with signed URLs; daily AI quotas; basic cost dashboard; error monitoring; staging environment; tested account deletion and export.')], bulletType='bullet', start='circle'))
story += [P('Phase 2 - Growth','H2X')]
story.append(ListFlowable([B('Introduce durable jobs for files and long reports; worker concurrency limits; queue visibility; transcript archival; database query review; CDN and route splitting; payment reconciliation; load tests with realistic AI stubs.')], bulletType='bullet', start='circle'))
story += [P('Phase 3 - Scale','H2X')]
story.append(ListFlowable([B('Partition or archive high-volume event/usage tables; separate read-heavy views; tune connection pooling; add multi-region or provider redundancy only when measured need justifies complexity; formal incident response and security review.')], bulletType='bullet', start='circle'))

story += [P('11. Capacity planning formula','H1X'),P('Measure real usage before committing to a server size. A useful planning model is: peak requests per minute = active users x actions per user x peak concentration. AI cost = successful AI calls x average input cost + successful AI calls x average output cost. Storage growth = uploaded bytes + derived metadata + transcript growth - documented deletion/retention. Queue capacity must exceed peak arrival rate while keeping the oldest job within the promised user wait time.','BodyX'),P('Do not estimate scale from total registered users alone. Measure daily active users, concurrent users, workflow mix, average file size, average transcript length, report regeneration rate, and retry rate.','CallX')]

story += [P('12. Owner launch checklist','H1X')]
list8 = ListFlowable([
    B('Confirm the actual production hosting provider, plan limits, regions, build limits, serverless timeouts, and environment variables.'),
    B('Confirm the Supabase plan, database size, storage size, egress, connection limits, backups, point-in-time recovery, and migration process.'),
    B('Confirm Gemini model, quotas, pricing, retention settings, safety configuration, and server-side API-key handling.'),
    B('Confirm whether any payment provider is active, whether web subscriptions or mobile subscriptions are used, and how entitlements are reconciled.'),
    B('Run authenticated two-user RLS tests, multi-device recovery, reinstall recovery, deletion, export, file upload, AI failure, duplicate-click, and webhook replay tests.'),
    B('Record measured p50/p95 latency, AI cost per workflow, daily spend, storage growth, and queue behavior before public launch.'),
    B('Deploy in a staged rollout with rollback instructions and a documented incident contact.')
], bulletType='bullet', start='circle')
story.append(list8)

story += [P('Final principle','H1X'),P('Scale the durable parts first: identity, ownership, persistence, idempotency, observability, and cost controls. Add queues and workers when measurements show long-running work. Keep AI prompts compact, keep user history complete, and make every background operation safe to retry.','BodyX'),P('Unknown configuration must be verified against the live project before launch. This document is an architecture and operations plan, not a certification or legal opinion.','CodeX')]

def footer(c, doc):
    c.saveState(); c.setStrokeColor(HexColor('#D6E4E5')); c.line(18*mm,14*mm,192*mm,14*mm); c.setFont('Helvetica',7.5); c.setFillColor(HexColor('#607983')); c.drawString(18*mm,9*mm,'Scaling architecture playbook'); c.drawRightString(192*mm,9*mm,f'Page {doc.page}'); c.restoreState()

doc=SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=18*mm,leftMargin=18*mm,topMargin=16*mm,bottomMargin=20*mm,title='HealthChain Scaling Architecture Playbook',author='HealthChain')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)
