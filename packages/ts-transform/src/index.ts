import {
  JscConfig, JscTarget, transformSync, bundle as swcBundle
} from '@swc/core'
import { readFileSync } from 'fs'
import { join } from 'path'
import { deepMerge } from '@faasjs/deep_merge'

export function transform (code: string, options?: {
  /** default: process.cwd() */
  root?: string
  filename?: string
  /** default: `es2019` */
  target?: JscTarget
  /**
   * swc compilation
   * @see https://swc.rs/docs/configuration/compilation
   */
  jsc?: JscConfig
}) {
  if (!options) options = {}
  if (!options.root) options.root = process.cwd()
  if (!options.target) options.target = 'es2019'

  const tsconfig = JSON.parse(readFileSync(join(options.root, 'tsconfig.json')).toString())

  if (!tsconfig.compilerOptions) tsconfig.compilerOptions = {}

  tsconfig.compilerOptions.baseUrl = tsconfig.compilerOptions.baseUrl?.replace('.', options.root) || options.root

  if (tsconfig.compilerOptions.paths) {
    for (const key of Object.keys(tsconfig.compilerOptions.paths))
      tsconfig.compilerOptions.paths[key] = tsconfig.compilerOptions.paths[key]
        .map((item: string) => item.replace('.', tsconfig.compilerOptions.baseUrl))
  } else
    tsconfig.compilerOptions.paths = {}

  return transformSync(code, {
    filename: options.filename,
    jsc: deepMerge({
      parser: {
        syntax: 'typescript',
        tsx: true
      },
      target: options.target,
      baseUrl: tsconfig.compilerOptions.baseUrl,
      paths: tsconfig.compilerOptions.paths
    }, options.jsc),
    module: { type: 'commonjs' }
  })
}

export async function bundle (options: {
  filename: string
  entry?: {
    [name: string]: string;
  }
  output?: {
    name?: string
    path?: string
  }
}) {
  return swcBundle(deepMerge({
    mode: 'production',
    entry: { index: options.filename },
    module: { type: 'commonjs' },
    options: {
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: true,
          exportDefaultFrom: true,
        },
      }
    }
  }, options)).then(res => res.index)
}
