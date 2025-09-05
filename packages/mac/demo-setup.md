# Subzilla Mac App Demo Setup

## To Run the Demo

1. **Build Dependencies**:

```bash
# Build types package
cd ../types && yarn build

# Build core package
cd ../core && yarn build

# Build mac package
cd ../mac && yarn build
```

3. **Run the App**:

```bash
cd packages/mac
npx electron .
```
