# @mikesaintsg/[package-name]

> **[One-line description of the package]**

[![npm version](https://img.shields.io/npm/v/@mikesaintsg/[package-name].svg)](https://www.npmjs.com/package/@mikesaintsg/[package-name])
[![bundle size](https://img.shields.io/bundlephobia/minzip/@mikesaintsg/[package-name])](https://bundlephobia.com/package/@mikesaintsg/[package-name])
[![license](https://img.shields.io/npm/l/@mikesaintsg/[package-name].svg)](LICENSE)

---

## Features

- ✅ **[Feature 1]** — [Brief description]
- ✅ **[Feature 2]** — [Brief description]
- ✅ **[Feature 3]** — [Brief description]
- ✅ **Zero dependencies** — Built on native [platform] APIs
- ✅ **TypeScript first** — Full type safety with generics
- ✅ **Tree-shakeable** — ESM-only, import what you need

---

## Installation

```bash
npm install @mikesaintsg/[package-name]
```

---

## Quick Start

```ts
import { create[Main] } from '@mikesaintsg/[package-name]'

// Create instance
const [instance] = create[Main]({
	[option]: [value],
})

// Use the API
[instance].[method]()

// Cleanup when done
[instance].destroy()
```

---

## Documentation

📚 **[Full API Guide](./guides/[package-name].md)** — Comprehensive documentation with examples

### Key Sections

- [Introduction](./guides/[package-name].md#introduction) — Value proposition and use cases
- [Quick Start](./guides/[package-name].md#quick-start) — Get started in minutes
- [Core Concepts](./guides/[package-name].md#core-concepts) — Understand the fundamentals
- [Error Handling](./guides/[package-name].md#error-handling) — Error codes and recovery
- [API Reference](./guides/[package-name].md#api-reference) — Complete API documentation

---

## API Overview

### Factory Functions

| Function                 | Description                     |
|--------------------------|---------------------------------|
| `create[Main](options)`  | Create a [main] instance        |
| `is[Feature]Supported()` | Check if [feature] is supported |

### Main Interface

| Method                | Description          |
|-----------------------|----------------------|
| `[method1]()`         | [Description]        |
| `[method2](param)`    | [Description]        |
| `on[Event](callback)` | Subscribe to [event] |
| `destroy()`           | Cleanup resources    |

---

## Examples

### Basic Usage

```ts
import { create[Main] } from '@mikesaintsg/[package-name]'

const [instance] = create[Main]({
	[option]: [value],
})

// [Example description]
[instance].[method]()
```

### With TypeScript

```ts
import { create[Main] } from '@mikesaintsg/[package-name]'

interface [TypeName] {
	[property]: [type]
}

const [instance] = create[Main]<[TypeName]>({
	[option]: { [property]: [value] },
})

// Full type inference
const result = [instance].[method]()
```

### Error Handling

```ts
import { create[Main], [Package]Error } from '@mikesaintsg/[package-name]'

try {
	const [instance] = create[Main]({ [option]: [value] })
	await [instance].[method]()
} catch (error) {
	if (error instanceof [Package]Error) {
		console.error(`[${error.code}]: ${error.message}`)
	}
}
```

---

## Ecosystem Integration

| Package                          | Integration                |
|----------------------------------|----------------------------|
| `@mikesaintsg/core`              | Shared types and utilities |
| `@mikesaintsg/[related-package]` | [Integration description]  |

See [Integration with Ecosystem](./guides/[package-name].md#integration-with-ecosystem) for details.

---

## Browser Support

| Browser | Minimum Version |
|---------|-----------------|
| Chrome  | [version]+      |
| Firefox | [version]+      |
| Safari  | [version]+      |
| Edge    | [version]+      |

---

## Contributing

Contributions are welcome! Please read the [contributing guidelines](CONTRIBUTING.md) first.

---

## License

MIT © [mikesaintsg](https://github.com/mikesaintsg)

---

<!-- 
Template Usage Notes (delete this section when using):

1. Replace all [bracketed placeholders] with actual content
2. Update badge URLs with correct package name
3. Add or remove Features as needed
4. Ensure Quick Start example is minimal but complete
5. Link to the correct guide file
6. Update browser support based on actual requirements
7. Keep consistent with GUIDE.md template structure

Required Sections:
- Features (bulleted list)
- Installation
- Quick Start
- Documentation (link to full guide)
- API Overview (summary table)
- Examples (2-3 key examples)
- License

Optional Sections:
- Ecosystem Integration
- Browser Support
- Contributing
- Changelog
-->
