import re
with open("src/features/mdt/MDTHub.tsx", "r", encoding="utf-8") as f:
    content = f.read()

replacement = """          } catch (e: any) {
            console.error('Failed to generate MDT report', e);
            if (e.message && e.message.includes('409') && activeCase?.data?.reviews) {
              const latestMDT = activeCase.data.reviews.find((r: any) => r.type === 'mdt');
              if (latestMDT && latestMDT.report) {
                setHistoryReport(latestMDT.report);
                setPhase('report');
                return;
              }
            }
            setPhase('failed');
          } finally {"""

content = re.sub(r"          \} catch \(e\) \{\s*console\.error\('Failed to generate MDT report', e\);\s*setPhase\('failed'\);\s*\} finally \{", replacement, content, flags=re.DOTALL)

with open("src/features/mdt/MDTHub.tsx", "w", encoding="utf-8") as f:
    f.write(content)
