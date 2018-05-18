'use babel'

import createResolver from './createResolver'
import createCollection from './createCollection'
import createModel from './createModel'
import createResolversGroup from './createResolversGroup'

export default {
  'orionjs:create-resolver': createResolver,
  'orionjs:create-collection': createCollection,
  'orionjs:create-model': createModel,
  'orionjs:create-resolvers-group': createResolversGroup
}
