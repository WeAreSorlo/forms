import * as inputs from '@/inputs'
import { FieldSchema } from '@/types/fields'
import { schemaToTypeScript } from '@/utils/typescript'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const schema: Array<FieldSchema> = [
  { name: 'title', type: 'text', required: true },
  { name: 'summary', type: 'textarea' },
  { name: 'intro', type: 'content', options: { content: 'Shown above the post' } },
  {
    name: 'seo',
    type: 'group',
    options: { fields: [{ name: 'description', type: 'text', required: true }] },
  },
  {
    name: 'authors',
    type: 'repeater',
    required: true,
    options: {
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'role', type: 'select', options: { choices: [{ value: 'editor' }, { value: 'writer' }] } },
      ],
    },
  },
  {
    name: 'blocks',
    type: 'flexible',
    options: {
      layouts: [
        { name: 'hero', fields: [{ name: 'heading', type: 'text', required: true }] },
        {
          name: 'quote',
          fields: [
            { name: 'text', type: 'textarea', required: true },
            { name: 'cite', type: 'text', required: true, conditions: [{ field: 'text', operator: 'notEmpty' }] },
          ],
        },
      ],
    },
  },
  { name: 'map', type: 'plugin-map', required: true },
  { name: 'utm-source', type: 'hidden', options: { value: 'blog' } },
]

// Type check a module with the TypeScript compiler, returning its errors
const typeCheck = (source: string) => {
  const options: ts.CompilerOptions = { strict: true, noEmit: true, lib: ['lib.es5.d.ts'], types: [] }
  const host = ts.createCompilerHost(options)
  const getSourceFile = host.getSourceFile
  host.getSourceFile = (fileName, ...rest) => {
    if (fileName === 'check.ts') return ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest)
    return getSourceFile(fileName, ...rest)
  }

  const program = ts.createProgram(['check.ts'], options, host)
  return ts.getPreEmitDiagnostics(program).map(({ messageText }) => ts.flattenDiagnosticMessageText(messageText, '\n'))
}

describe('schemaToTypeScript', () => {
  it('declares a type for a nested schema', () => {
    expect(schemaToTypeScript(schema, inputs, { name: 'blog_post' })).toBe(`export type BlogPost = {
  title: string
  summary?: string
  seo?: {
    description: string
  }
  authors: Array<{
    name: string
    role?: "editor" | "writer"
  }>
  blocks?: Array<{ _layout: "hero" } & {
    heading: string
  } | { _layout: "quote" } & {
    text: string
    cite?: string
  }>
  map: unknown
  "utm-source"?: "blog"
}`)
  })

  it('declares a type that compiles and narrows blocks by _layout', () => {
    const usage = `
const post: BlogPost = {
  title: 'Hello',
  authors: [{ name: 'Ada', role: 'editor' }],
  blocks: [{ _layout: 'hero', heading: 'Hi' }, { _layout: 'quote', text: 'Quoted' }],
  map: null,
}

post.blocks?.forEach((block) => (block._layout === 'hero' ? block.heading : block.text).toUpperCase())

// @ts-expect-error the title is required
const untitled: BlogPost = { authors: [], map: null }

// @ts-expect-error a hero has no text
const textHero: BlogPost = { ...post, blocks: [{ _layout: 'hero', text: 'Hi' }] }
`
    expect(typeCheck(schemaToTypeScript(schema, inputs, { name: 'blog_post' }) + usage)).toEqual([])
  })

  it('declares an empty type for an empty schema', () => {
    expect(schemaToTypeScript([], inputs, { name: 'nothing' })).toBe('export type Nothing = {}')
  })

  it('rejects a name that makes no type name', () => {
    expect(() => schemaToTypeScript(schema, inputs, { name: '404' })).toThrow("'404' does not make a valid type name")
  })
})
