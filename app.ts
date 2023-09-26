import { HookContext, NextFunction, feathers } from '@feathersjs/feathers'
import {
  koa,
  rest,
  bodyParser,
  errorHandler,
  serveStatic,
} from '@feathersjs/koa'
import socketio from '@feathersjs/socketio'
import { hooklessSetup } from './hookless'
import { LowDBService, LowDBAdapter } from 'feathers-lowdb'

// This tells TypeScript what services we are registering
type ServiceTypes = {
  messages: any
}

// Creates an ExpressJS compatible Feathers application
const app = koa<ServiceTypes>(feathers())

// Use the current folder for static file hosting
app.use(serveStatic('.'))
// Register the error handle
app.use(errorHandler())
// Parse JSON request bodies
app.use(bodyParser())

// Register REST service handler
app.configure(rest())
// Configure Socket.io real-time APIs
app.configure(socketio())
const db1Adapter = new LowDBAdapter({
  filename: 'db1.yaml'
})
const db2Adapter = new LowDBAdapter({
  filename: 'db2.yaml'
})
// Create messages adapter, manually
const messagesAdapter = new LowDBAdapter({
  filename: 'messages.yaml'
})
// Register our messages service
app.use(
  'messages',
  new LowDBService({
    Model: messagesAdapter,
    // filename: 'messages.yaml', // to setup adapter automatically
    id: 'id', // todo: https://github.com/feathersjs/feathers/issues/2839
    startId: 1,
    paginate: {
      default: 100,
      max: 500,
    },
  })
)

// Add any new real-time connection to the `everybody` channel
app.on('connection', (connection) => app.channel('everybody').join(connection))
// Publish all events to the `everybody` channel
app.publish((_data) => app.channel('everybody'))

// Start the server
app
  .listen(3030)
  .then(() => console.log('Feathers server listening on localhost:3030'))

// For good measure let's create a message
// So our API doesn't look so empty
app.service('messages').create({
  text: 'Hello world from the server',
})
// context.data.text.toLowerCase().startsWith('sudo')


// ==== START - HOOKLESS CUSTOM ====
const predicate = (c: HookContext) => c.data?.text.startsWith('sudo')
app.service('messages').hooks({
  around: {
    all: [
      ...hooklessSetup<ServiceTypes>(predicate),
      async (context: HookContext, next: NextFunction) => {
        const startTime = Date.now()

        await next()

        console.log(
          `Method ${context.method} on ${context.path} took ${
            Date.now() - startTime
          }ms`
        )
      },
    ],
  },
  before: {
    create: [
      async (context: HookContext) => {
        context.data = {
          text: 'Cabbage',
          createdAt: Date.now(),
        }
      },
    ],
  },
})

// ==== END - HOOKLESS CUSTOM ====
