with open("api/gemini.js", "r") as f:
    content = f.read()
content = content.replace("console.warn('Token validation error:', e);", "console.warn('Token validation error:');")
with open("api/gemini.js", "w") as f:
    f.write(content)
