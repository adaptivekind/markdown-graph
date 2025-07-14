#!/bin/bash

# Create demo directory if it doesn't exist
mkdir -p target/demo-docs

# Create initial markdown files for demonstration
cat > target/demo-docs/index.md << 'EOF'
# Welcome to the Demo

This is the main page of our demo documentation.

It links to:
- [[getting-started]]
- [[advanced-topics]]

## Overview

This demonstrates the markdown-graph watch functionality.
EOF

cat > target/demo-docs/getting-started.md << 'EOF'
---
title: Getting Started Guide
author: Demo Author
category: tutorial
---

# Getting Started

Welcome to the getting started guide!

This page will help you understand the basics.

## Prerequisites

Before you begin, make sure you have:
- Node.js installed
- Basic knowledge of markdown

## Next Steps

Once you're ready, check out [[advanced-topics]].
EOF

cat > target/demo-docs/advanced-topics.md << 'EOF'
---
title: Advanced Topics
difficulty: intermediate
---

# Advanced Topics

This page covers more complex subjects.

## Topics Covered

1. Graph relationships
2. Watch mode functionality
3. Link resolution

## References

- Back to [[index]]
- See also [[getting-started]]
EOF

cat > target/demo-docs/changelog.md << 'EOF'
# Changelog

## Version 1.0.0

- Initial release
- Basic graph generation
- Watch mode support

## Future Plans

- Enhanced link detection
- Better performance optimizations
EOF

echo "Demo documentation setup complete!"
echo "Files created in target/demo-docs/:"
ls -la target/demo-docs/
echo ""
echo "Next steps:"
echo "1. Build the project: npm run build"
echo "2. Generate initial graph: npm run demo:generate"
echo "3. Start watch mode: npm run demo:watch"
echo "4. In another terminal, edit files in target/demo-docs/ to see live updates"
echo "5. Clean up when done: npm run demo:clean"