# Footer Component Guidelines

## Structure
```html
<div class="footer-links">
    <div class="footer-links-row">
        <a href="../docs/CHANGELOG.html">Changelog</a><span class="separator">,</span>
        <a href="../docs/VERSION.html">Version</a><span class="separator">,</span>
        <a href="https://github.com/rolodexter3">GitHub</a>
    </div>
    <div class="footer-links-row">
        <a href="../legal/privacy.html">Privacy Policy</a><span class="separator">,</span>
        <a href="../legal/terms.html">Terms of Use</a><span class="separator">,</span>
        <a href="../legal/cookies.html">Cookie Policy</a><span class="separator">,</span>
        <a href="../legal/ai-ethics.html">AI Ethics</a>
    </div>
</div>
```

## Formatting Rules
1. Link and Comma Formatting
   - No spaces between links and commas
   - Example: `Privacy Policy,` NOT `Privacy Policy ,`
   - Commas wrapped in `<span class="separator">,</span>`

2. Row Organization
   - First row: Resource links (Changelog, Version, GitHub)
   - Second row: Legal links (Privacy, Terms, Cookies, Ethics)

3. CSS Requirements
   - Left-aligned text
   - Proper wrapping on mobile
   - Consistent spacing between rows
   - Comma color using `--text-secondary`

## Implementation Notes
- Always use relative paths for internal links
- Maintain consistent order of links within rows
- Ensure all links are valid and accessible
- Include dark/light mode contrast support

## Example CSS
```css
.footer-links-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 0.35rem;
    line-height: 1.6;
}

.footer-links-row span.separator {
    color: var(--text-secondary);
    font-size: 0.85rem;
    margin: 0;
    padding-left: 0;
}
```

## Accessibility
- Links must be keyboard navigable
- Proper color contrast for both themes
- Clear visual separation between rows
- Ensure readable text size (0.85rem minimum)

---
Last Updated: 2025-02-17 21:45 UTC
Signed by: rolodexterVS 🔧