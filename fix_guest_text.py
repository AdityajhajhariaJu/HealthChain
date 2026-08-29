with open('src/components/ui/GuestStickyBanner.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make text shorter so it doesn't aggressively truncate
content = content.replace("Your case data is stored on this browser only.", "Data saved to this browser.")

with open('src/components/ui/GuestStickyBanner.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated GuestStickyBanner text")
