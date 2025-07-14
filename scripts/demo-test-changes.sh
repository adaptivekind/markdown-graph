#!/bin/bash

echo "This script demonstrates live file changes for watch mode testing."
echo "Make sure you have 'npm run demo:watch' running in another terminal first!"
echo ""

datetimestamp=$(date "+%Y%m%d-%H%M%S")

echo "Step 1: Adding a new document..."

cat >target/demo-docs/new-feature-${datetimestamp}.md <<EOF
---
title: New Feature Documentation
status: draft
created: ${datetimestamp}
---

# New Feature

This is a newly added document that should appear in the graph.

## Connection

This feature is related to [[advanced-topics]].
EOF

echo "✓ Created new-feature.md"
echo ""

echo "Step 2: Modifying an existing document to add more links..."

cat >>target/demo-docs/getting-started.md <<'EOF'

## New Section

We've added some new content that references [[new-feature]].

This shows how the graph updates when existing files are modified.
EOF

echo "✓ Modified getting-started.md to add new links"
echo ""

echo "Step 3: Creating a document with multiple sections..."

cat >target/demo-docs/troubleshooting.md <<'EOF'
# Troubleshooting Guide

Common issues and solutions.

## Installation Issues

If you have problems installing, see [[getting-started]].

## Runtime Problems

For runtime issues, check the [[advanced-topics]] guide.

## Performance

For performance optimization tips:
- Use watch mode efficiently
- Check file sizes
- Monitor memory usage

## Getting Help

Still need help? Check the main [[index]] page.
EOF

echo "✓ Created troubleshooting.md with multiple sections and links"
echo ""

echo "Step 4: Adding frontmatter to an existing file..."

# Create a temporary file with frontmatter added to changelog
cat >target/demo-docs/changelog.md <<'EOF'
---
title: Project Changelog
type: history
maintained: true
---

# Changelog

## Version 1.0.0

- Initial release
- Basic graph generation
- Watch mode support

## Version 1.1.0 (Coming Soon)

- Enhanced [[troubleshooting]] support
- Better link detection
- Improved [[getting-started]] experience

## Future Plans

- Enhanced link detection
- Better performance optimizations
- Integration with [[new-feature]]
EOF

echo "✓ Modified changelog.md to add frontmatter and more links"
echo ""

echo "Demo complete! Check your watch terminal to see how the graph updated."
echo "You can also run 'npm run demo:generate' to see the final graph state."

