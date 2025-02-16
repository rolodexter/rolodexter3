# Footer Component Guidelines

## Structure

```html
<div class="footer-links">
    <div class="footer-links-row">
        <a href="../docs/CHANGELOG.html">Changelog</a><span class="separator">,</span>
        <a href="../docs/VERSION.html">Version</a><span class="separator">,</span>
        <a href="https://github.com/rolodexter3">GitHub</a><span class="separator">,</span>
        <a href="../legal/privacy.html">Privacy Policy</a><span class="separator">,</span>
        <a href="../legal/terms.html">Terms of Use</a><span class="separator">,</span>
        <a href="../legal/cookies.html">Cookie Policy</a><span class="separator">,</span>
        <a href="../legal/ai-ethics.html">AI Ethics</a>
    </div>
</div>
```

## Formatting Rules

1. Link and Comma Formatting
   - NO spaces between links and commas
   - Example: `Privacy Policy,` NOT `Privacy Policy ,`
   - Commas wrapped in `<span class="separator">,</span>`
   - Links and commas must be directly adjacent in HTML

2. Link Order
   - Changelog
   - Version
   - GitHub
   - Privacy Policy
   - Terms of Use
   - Cookie Policy
   - AI Ethics

3. CSS Requirements
   - Left-aligned text
   - Natural wrapping on mobile
   - Consistent spacing between link-comma pairs
   - Comma color using `--text-secondary`
   - No gap or padding between link and comma
   - Appropriate spacing between link-comma pairs

## Implementation Notes

- Always use relative paths for internal links
- Maintain consistent order of links
- Ensure all links are valid and accessible
- Include dark/light mode contrast support
- Never add spaces in HTML between links and commas

## Example CSS

```css
.footer-links-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0;
    line-height: 1.6;
    margin: 0;
    padding: 0;
}

.footer-links-row a {
    color: var(--text-primary);
    font-size: 0.85rem;
    text-decoration: none;
}

.footer-links-row span.separator {
    color: var(--text-secondary);
    font-size: 0.85rem;
    margin: 0;
    padding: 0;
}

.footer-links-row > *:not(:last-child) {
    margin-right: 0.35rem;
}
```

## Accessibility

- Links must be keyboard navigable
- Proper color contrast for both themes
- Clear visual separation between links
- Ensure readable text size (0.85rem minimum)

---
Last Updated: 2025-02-17 22:30 UTC
Signed by: rolodexterVS 🔧
