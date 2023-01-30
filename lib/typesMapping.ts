import {
  IntrospectionInputType,
  IntrospectionInputTypeRef,
  IntrospectionNamedTypeRef,
  IntrospectionOutputType,
  IntrospectionOutputTypeRef,
  IntrospectionTypeRef,
} from 'graphql'
import { JSONSchema6, JSONSchema6TypeName } from 'json-schema'
import { includes } from 'lodash'
import {
  SUPPORTED_KINDS,
  isIntrospectionListTypeRef,
  isNonNullIntrospectionType,
} from './typeGuards'

export type GraphQLTypeNames = 'String' | 'Int' | 'Float' | 'Boolean' | 'ID'

export const typesMapping: { [k in GraphQLTypeNames]: JSONSchema6TypeName } = {
  Boolean: 'boolean',
  String: 'string',
  Int: 'number',
  Float: 'number',
  ID: 'string',
}

export const scalarNameToJsonType = (
  scalarName: GraphQLTypeNames,
) => typesMapping[scalarName]

// Convert a GraphQL Type to a valid JSON Schema type
export type GraphqlToJSONTypeArg =
  | IntrospectionTypeRef
  | IntrospectionInputTypeRef
  | IntrospectionOutputTypeRef

export type GraphqlToJSONTypeOptions = {
  nullableArrayItems?: boolean
  isArray?: boolean
  isNonNull?: boolean
}

export const graphqlToJSONType = (
  k: GraphqlToJSONTypeArg,
  options: GraphqlToJSONTypeOptions = {}
): JSONSchema6 => {
  if (isIntrospectionListTypeRef(k)) {
    return {
      type: 'array',
      items: graphqlToJSONType(k.ofType, { ...options, isArray: true }),
    }
  } else if (isNonNullIntrospectionType(k)) {
    return graphqlToJSONType(k.ofType, { ...options, isNonNull: true })
  } else {
    const name = (k as IntrospectionNamedTypeRef<
      IntrospectionInputType | IntrospectionOutputType
    >).name

    const { isArray, isNonNull, nullableArrayItems } = options

    const jsonType = {} as JSONSchema6

    if (includes(SUPPORTED_KINDS, k.kind)) {
      jsonType.$ref = `#/definitions/${name}`
    } else {
      jsonType.type = scalarNameToJsonType(name as GraphQLTypeNames)
    }

    // Only if the option allows for it, represent an array with nullable items
    // using the "anyOf"
    if (nullableArrayItems && isArray && !isNonNull) {
      return {
        anyOf: [jsonType, { type: 'null' }],
      }
    }

    return jsonType
  }
}
