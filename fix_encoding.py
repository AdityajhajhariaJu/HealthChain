import codecs
with codecs.open("src/features/mdt/MDTComponents.tsx", "r", encoding="latin-1") as f:
    content = f.read()
content = content.replace("\x97", "—")
content = content.replace("â€”", "—")
with codecs.open("src/features/mdt/MDTComponents.tsx", "w", encoding="utf-8") as f:
    f.write(content)

